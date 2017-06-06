import ChannelPool from './channel-pool.js'
import UUID from './uuid.js'
import mqtt from 'mqtt'
import superagent from 'superagent'

let _url;
let _id;
let _mqtt_host;
let _mqtt_port;
let _mqtt_client;
let _i_chans;
let _o_chans;
let _on_signal;
let _on_data;
let _rev;

const publish = function(channel, message, retained) {
    if (!_mqtt_client)
        return;
    _mqtt_client.publish(channel, message, { 'retain': retained });
}

const subscribe = function(channel) {
    if (!_mqtt_client)
        return;
    _mqtt_client.subscribe(channel);
}

const unsubscribe = function(channel) {
    if (!_mqtt_client)
        return;
    _mqtt_client.unsubscribe(channel);
}

const on_message = function(topic, message) {
    if (topic == _o_chans.topic('ctrl')) {
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
        publish(_i_chans.topic('ctrl'), JSON.stringify(res_message));
    } else {
        let odf = _o_chans.df(topic);
        if (!odf)
            return;
        _on_data(odf, JSON.parse(message));
    }
}

const register = function(url, params, callback) {
    _url = url;
    _id = ('id' in params) ? params['id'] : UUID();
    _on_signal = params['on_signal'];
    _on_data = params['on_data'];
    _i_chans = new ChannelPool();
    _o_chans = new ChannelPool();

    const on_failure = function(err) {
        console.error('on_failure', err);
        if (callback)
            callback(false, err);
    }

    superagent.put(_url +'/'+ _id)
        .set('Content-Type', 'application/json')
        .set('Accept', '*/*')
        .send(JSON.stringify({
            'name': params['name'],
            'idf_list': params['df_list'] ? params['df_list'] : params['idf_list'],
            'odf_list': params['df_list'] ? params['df_list'] : params['odf_list'],
            'accept_protos': params['accept_protos'],
            'profile': params['profile'],
        }))
        .end((err, res) => {
            if(err) {
                on_failure(err);
                return;
            }

            let metadata = res.body;
            if (typeof metadata === 'string') {
                metadata = JSON.parse(metadata);
            }

            _i_chans.add('ctrl', metadata['ctrl_chans'][0]);
            _o_chans.add('ctrl', metadata['ctrl_chans'][1]);
            _rev = metadata['rev'];
            _mqtt_host = metadata.url['host'];
            _mqtt_port = metadata.url['ws_port'];

            function on_connect() {
                console.info('mqtt_connect');
                publish(
                    _i_chans.topic('ctrl'),
                    JSON.stringify({'state': 'online', 'rev': _rev}),
                    true
                );
                subscribe(_o_chans.topic('ctrl'));
                if (callback) {
                    callback({
                        'raproto': _url,
                        'mqtt': metadata['url'],
                        'id': _id,
                    });
                }
            }

            _mqtt_client = mqtt.connect('mqtt://'+_mqtt_host+':'+_mqtt_port, {
                'clientId': _id,
                'will': {
                    'topic': _i_chans.topic('ctrl'),
                    'payload': JSON.stringify({'state': 'broken', 'rev': _rev}),
                    'retain': true,
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

const push = function(idf_name, data) {
    if (!_mqtt_client || !_i_chans.topic(idf_name))
        return;
    publish(_i_chans.topic(idf_name), JSON.stringify(data));
}

window.dan2 = {
    'register': register,
    'push': push,
    get connected() {
        if( typeof _mqtt_client !== 'object' ) return false;
        return _mqtt_client.connected;
    },
    get reconnecting() {
        if( typeof _mqtt_client !== 'object' ) return false;
        return _mqtt_client.reconnecting;
    },
    'UUID': function() {
        return _id ? _id : UUID();
    },
};

window.dan = { //for 1
    'register': register,
    'push': push,
    'init': function(pull, endpoint, mac_addr, profile, callback) {
        function on_data (odf_name, data) {
            if (!(Object.prototype.toString.call(data) === "[object Array]")) {
                data = [data];
            }
            pull(odf_name, data);
        }

        function on_signal (cmd, param) {
            console.log('[cmd]', cmd, param);
            return true;
        }

        profile['on_signal'] = on_signal;
        profile['on_data'] = on_data;
        profile['accept_protos'] = ['mqtt'];
        profile['profile'] = {'model': profile['dm_name']};

        if (!profile['name']){
            profile['name'] = profile['dm_name'] + '_' + Math.floor(Math.random() * 100);
        }

        register(endpoint, profile, callback);
    },
    'deregister': function(callback) {
        _mqtt_client.disconnect();
        callback();
    },
    get connected() {
        if( typeof _mqtt_client !== 'object' ) return false;
        return _mqtt_client.connected;
    },
    get reconnecting() {
        if( typeof _mqtt_client !== 'object' ) return false;
        return _mqtt_client.reconnecting;
    },
    'UUID': function() {
        return _id ? _id : UUID();
    },
};
