import mqtt from 'mqtt';
import superagent from 'superagent';
import Context from './context.js';
import _UUID from './uuid.js';
import { RegistrationError } from './exceptions.js';

export class Client {
  constructor() {
    this.ctx = new Context();
    this._first_publish = false;
    this._is_reconnect = false;
    this.on_connect = this.on_connect.bind(this);
    this.on_disconnect = this.on_disconnect.bind(this);
  }

  publish(channel, message, retained, qos) {
    if (!this.ctx.mqtt_client) throw 'unable to publish without ctx.mqtt_client';

    if (retained === undefined) retained = false;

    if (qos === undefined) qos = 2;

    return new Promise((resolve, reject) => {
      this.ctx.mqtt_client.publish(channel,
        JSON.stringify(message),
        { retain: retained, qos },
        (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
    });
  }

  subscribe(channel, qos) {
    if (!this.ctx.mqtt_client) return;

    if (qos === undefined) qos = 2;

    return new Promise((resolve, reject) => {
      this.ctx.mqtt_client.subscribe(channel,
        { qos },
        (err, granted) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
    });
  }

  unsubscribe(channel) {
    if (!this.ctx.mqtt_client) return;

    return new Promise((resolve, reject) => {
      this.ctx.mqtt_client.unsubscribe(channel,
        (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
    });
  }

  on_connect() {
    console.info('mqtt_connect');

    let promise_thing;

    if (!this._is_reconnect) {
      promise_thing = this.subscribe(this.ctx.o_chans.ctrl)
        .then(() => {
          console.log(`Successfully connect to ${this.ctx.url}`);
          console.log(`Device ID: ${this.ctx.app_id}`);
          console.log(`Device name: ${this.ctx.name}.`);
          if (typeof (document) !== 'undefined') {
            document.title = this.ctx.name;
          }
        })
        .catch((err) => {
          throw 'Subscribe to control channel failed';
        });
    } else {
      console.info(`Reconnect: ${this.ctx.name}.`);
      promise_thing = this.publish(
        this.ctx.i_chans.ctrl,
        { state: 'offline', rev: this.ctx.rev },
        true, // retained message
      );
    }

    promise_thing.then(() => {
      this.ctx.i_chans.removeAllDF();
      this.ctx.o_chans.removeAllDF();

      this.publish(
        this.ctx.i_chans.ctrl,
        { state: 'online', rev: this.ctx.rev },
        true, // retained message
      ).then(() => {
        this._first_publish = true;
      });

      this._is_reconnect = true;

      if (this.ctx.on_connect) {
        this.ctx.on_connect();
      }
    }).catch((err) => {
      console.error(err);
    });
  }

  on_message(topic, message) {
    if (topic == this.ctx.o_chans.ctrl) {
      const signal = JSON.parse(message);
      let handling_result = null;
      switch (signal.command) {
        case 'CONNECT':
          if ('idf' in signal) {
            const { idf } = signal;
            this.ctx.i_chans.add(idf, signal.topic);
            handling_result = this.ctx.onSignal(signal.command, [idf]);
          } else if ('odf' in signal) {
            const { odf } = signal;
            this.ctx.o_chans.add(odf, signal.topic);
            handling_result = this.ctx.onSignal(signal.command, [odf]);
            this.subscribe(this.ctx.o_chans.topic(odf));
          }
          break;
        case 'DISCONNECT':
          if ('idf' in signal) {
            const { idf } = signal;
            this.ctx.i_chans.removeDF(idf);
            handling_result = this.ctx.onSignal(signal.command, [idf]);
          } else if ('odf' in signal) {
            const { odf } = signal;
            this.unsubscribe(this.ctx.o_chans.topic(odf));
            this.ctx.o_chans.removeDF(odf);
            handling_result = this.ctx.onSignal(signal.command, [odf]);
          }
          break;
      }
      const res_message = {
        msg_id: signal.msg_id,
      };
      if (typeof handling_result === 'boolean' && handling_result) {
        res_message.state = 'ok';
      } else {
        res_message.state = 'error';
        res_message.reason = handling_result[1];
      }
      this.publish(this.ctx.i_chans.ctrl, res_message);
    } else {
      const odf = this.ctx.o_chans.df(topic);
      if (!odf) return;
      this.ctx.onData(odf, JSON.parse(message));
    }
  }

  on_disconnect() {
    console.info(`${this.ctx.name} (${this.ctx.app_id}) disconnected from ${this.ctx.url}.`);
    if (this.ctx.on_disconnect) {
      this.ctx.on_disconnect();
    }
  }

  register(params) {
    if (this.ctx.mqtt_client) {
      throw new RegistrationError('Already registered');
    }

    this.ctx.url = params.url;
    if (!this.ctx.url || this.ctx.url == '') {
      throw new RegistrationError(`Invalid url: ${this.ctx.url}`);
    }

    this.ctx.app_id = params.id || _UUID();

    const body = {
      name: params.name,
      idf_list: params.idfList,
      odf_list: params.odfList,
      accept_protos: params.acceptProtos || 'mqtt',
      profile: params.profile,
    };

    // other callbacks
    this.ctx.onRegister = params.onRegister;
    this.ctx.on_deregister = params.on_deregister;
    this.ctx.on_connect = params.on_connect;
    this.ctx.on_disconnect = params.on_disconnect;

    // filter out the empty `df_list`, in case of empty list, server reponsed 403.
    ['idf_list', 'odf_list'].forEach(
      (x) => {
        if (Array.isArray(body[x]) && body[x].length == 0) delete body[x];
      },
    );

    superagent.put(`${this.ctx.url}/${this.ctx.app_id}`)
      .type('json')
      .accept('json')
      .send(body)
      .then((res) => {
        let metadata = res.body;
        if (typeof metadata === 'string') {
          metadata = JSON.parse(metadata);
        }

        this.ctx.name = metadata.name;
        this.ctx.mqtt_host = metadata.url.host;
        this.ctx.mqtt_port = metadata.url.ws_port;
        this.ctx.mqtt_username = metadata.username || '';
        this.ctx.mqtt_password = metadata.password || '';
        this.ctx.i_chans.ctrl = metadata.ctrl_chans[0];
        this.ctx.o_chans.ctrl = metadata.ctrl_chans[1];
        this.ctx.rev = metadata.rev;

        this.ctx.mqtt_client = mqtt.connect(`${metadata.url.ws_scheme}://${this.ctx.mqtt_host}:${this.ctx.mqtt_port}`, {
          clientId: `iottalk-js-${this.ctx.app_id}`,
          username: this.ctx.mqtt_username,
          password: this.ctx.mqtt_password,
          will: {
            topic: this.ctx.i_chans.ctrl,
            // in most case of js DA, it never connect back
            payload: JSON.stringify({ state: 'offline', rev: this.ctx.rev }),
            retain: true,
          },
          keepalive: 30, // seems 60 is problematic for default mosquitto setup
        });

        this.ctx.mqtt_client.on('connect', this.on_connect);
        this.ctx.mqtt_client.on('reconnect', () => {
          console.info('mqtt_reconnect');
        });
        this.ctx.mqtt_client.on('disconnect', this.on_disconnect);
        this.ctx.mqtt_client.on('error', (error) => {
          console.error('mqtt_error', error);
        });
        this.ctx.mqtt_client.on('message', (topic, message, packet) => {
          this.on_message(topic, message.toString()); // Convert message from Uint8Array to String
        });

        this.ctx.onSignal = params.onSignal;
        this.ctx.onData = params.onData;

        setTimeout(() => {
          if (!this._first_publish) {
            throw new RegistrationError('MQTT connection timeout');
          }
        }, 5000);

        if (this.ctx.onRegister) {
          this.ctx.onRegister();
        }
      })
      .catch((err) => {
        console.error('on_failure', err);
      });
  }

  deregister() {
    if (!this.ctx.mqtt_client) {
      throw new RegistrationError('Not registered');
    }

    this.publish(
      this.ctx.i_chans.ctrl,
      { state: 'offline', rev: this.ctx.rev },
      true,
    );
    this.ctx.mqtt_client.end();

    superagent.del(`${this.ctx.url}/${this.ctx.app_id}`)
      .type('json')
      .accept('json')
      .send(JSON.stringify({ rev: this.ctx.rev }))
      .then((res) => {
        this.ctx.mqtt_client = null;
        if (this.ctx.on_deregister) {
          this.ctx.on_deregister();
        }
      }, (err) => {
        console.error('deregister fail', err);
      });
  }

  push(idf_name, data, qos) {
    if (!this.ctx.mqtt_client || !this._first_publish) {
      throw new RegistrationError('Not registered');
    }
    if (!this.ctx.i_chans.topic(idf_name)) {
      return;
    }
    if (qos === undefined) qos = 1;

    if (!Array.isArray(data)) {
      data = [data];
    }

    this.publish(this.ctx.i_chans.topic(idf_name), data, false, qos);
  }
}

const _default_client = new Client();

export function register(...args) {
  return _default_client.register(...args);
}

export function deregister() {
  return _default_client.deregister();
}

export function push(...args) {
  return _default_client.push(...args);
}
