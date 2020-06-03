import ChannelPool from './channel-pool.js'
import _UUID from './uuid.js'
import mqtt from 'mqtt'
import superagent from 'superagent'

let _url;
let _id;
let _mqtt_host;
let _mqtt_port;
let _mqtt_scheme;
let _mqtt_client;
let _i_chans;
let _o_chans;
let _ctrl_i;
let _ctrl_o;
let _on_signal;
let _on_data;
let _rev;

const publish = function(channel, message, retained, qos) {
  if (!_mqtt_client)
  {
    console.warn('unable to publish without _mqtt_client');
    return;
  }
  if (retained === undefined)
    retained = false;
  if (qos === undefined)
    qos = 2;

  _mqtt_client.publish(channel, message, {
    retain: retained,
    qos: qos,
  });
}

const subscribe = function(channel, qos) {
  if (!_mqtt_client)
    return;
  if (qos === undefined)
    qos = 2;
  return _mqtt_client.subscribe(channel, {qos: qos});
}

const unsubscribe = function(channel) {
  if (!_mqtt_client)
    return;
  return _mqtt_client.unsubscribe(channel);
}

const on_message = function(topic, message) {
  if (topic == _ctrl_o) {
    let signal = JSON.parse(message);
    let handling_result = null;
    switch (signal['command']) {
      case 'CONNECT':
        if ('idf' in signal) {
          let idf = signal['idf'];
          _i_chans.add(idf, signal['topic']);
          handling_result = _on_signal(signal['command'], [idf]);

        } else if ('odf' in signal) {
          let odf = signal['odf'];
          _o_chans.add(odf, signal['topic']);
          handling_result = _on_signal(signal['command'], [odf]);
          subscribe(_o_chans.topic(odf));
        }
        break;
      case 'DISCONNECT':
        if ('idf' in signal) {
          let idf = signal['idf'];
          _i_chans.remove_df(idf);
          handling_result = _on_signal(signal['command'], [idf]);

        } else if ('odf' in signal) {
          let odf = signal['odf'];
          unsubscribe(_o_chans.topic(odf));
          _o_chans.remove_df(odf);
          handling_result = _on_signal(signal['command'], [odf]);
        }
        break;
    }
    let res_message = {
      'msg_id': signal['msg_id'],
    }
    if (typeof handling_result == 'boolean' && handling_result) {
      res_message['state'] = 'ok';
    } else {
      res_message['state'] = 'error';
      res_message['reason'] = handling_result[1];
    }
    publish(_ctrl_i, JSON.stringify(res_message));
    return;
  }
  else {
    let odf = _o_chans.df(topic);
    if (!odf)
      return;
    _on_data(odf, JSON.parse(message));
  }
}

export const register = function(url, params, callback) {
  _url = url;
  _id = ('id' in params) ? params['id'] : _UUID();
  _on_signal = params['on_signal'];
  _on_data = params['on_data'];
  _i_chans = new ChannelPool();
  _o_chans = new ChannelPool();

  const on_failure = function(err) {
    console.error('on_failure', err);
    if (callback)
      callback(false, err);
  };

  let payload = {
    'name': params['name'],
    'idf_list': params['idf_list'],
    'odf_list': params['odf_list'],
    'accept_protos': params['accept_protos'],
    'profile': params['profile'],
  };

  // filter out the empty `df_list`, in case of empty list, server reponsed 403.
  ['idf_list', 'odf_list'].forEach(
    x => {
      if (Array.isArray(payload[x]) && payload[x].length == 0)
        delete payload[x];
    }
  );

  superagent.put(_url + '/' + _id)
    .type('json')
    .accept('json')
    .send(payload)
    .end((err, res) => {
      if(err) {
        on_failure(err);
        return;
      }

      let metadata = res.body;
      console.debug('register metadata', metadata);
      if (typeof metadata === 'string') {
        metadata = JSON.parse(metadata);
      }
      _rev = metadata['rev'];
      _ctrl_i = metadata['ctrl_chans'][0];
      _ctrl_o = metadata['ctrl_chans'][1];
      _mqtt_host = metadata.url['host'];
      _mqtt_port = metadata.url['ws_port'];
      _mqtt_scheme = metadata.url['ws_scheme'];

      function on_connect() {
        console.info('mqtt_connect');
        _i_chans.remove_all_df();
        _o_chans.remove_all_df();
        publish(
          _ctrl_i,
          JSON.stringify({'state': 'online', 'rev': _rev}),
          true // retained message
        );
        subscribe(_ctrl_o);
        if (callback) {
          callback({
            'raproto': _url,
            'mqtt': metadata['url'],
            'id': _id,
            'd_name': metadata['name'],
          });
        }
      }

      _mqtt_client = mqtt.connect(_mqtt_scheme + '://' + _mqtt_host + ':' + _mqtt_port, {
        clientId: 'mqttjs_' + _id,
        will: {
          topic: _ctrl_i,
          // in most case of js DA, it never connect back
          payload: JSON.stringify({'state': 'offline', 'rev': _rev}),
          retain: true,
        },
      });
      _mqtt_client.on('connect', on_connect);
      _mqtt_client.on('reconnect', () => { console.info('mqtt_reconnect'); });
      _mqtt_client.on('error', (err) => { console.error('mqtt_error', err); });
      _mqtt_client.on('message', (topic, message, packet) => {
        // Convert message from Uint8Array to String
        on_message(topic, message.toString());
      });

    });
}

export const deregister = function(callback) {
  if (!_mqtt_client) {
    if (callback)
      return callback(true);
    return;
  }

  publish(
    _ctrl_i,
    JSON.stringify({'state': 'offline', 'rev': _rev})
  );
  _mqtt_client.end();
  superagent.del(_url +'/'+ _id)
    .set('Content-Type', 'application/json')
    .set('Accept', '*/*')
    .send(JSON.stringify({'rev': _rev}))
    .end((err, res) => {
      if(err) {
        console.error('deregister fail', err);
        if (callback)
          return callback(false, err);
      }
    });

  if (callback)
    return callback(true);
}

export const push = function(idf_name, data, qos) {
  if (!_mqtt_client || !_i_chans.topic(idf_name))
    return;
  if(qos === undefined)
    qos = 1;
  publish(_i_chans.topic(idf_name), JSON.stringify(data), false, qos);
}

export const UUID = function() {
  return _id ? _id : _UUID();
}

export const connected = function() {
  if( typeof _mqtt_client !== 'object' ) return false;
  return _mqtt_client.connected;
}

export const reconnecting = function() {
  if( typeof _mqtt_client !== 'object' ) return false;
  return _mqtt_client.reconnecting;
}
