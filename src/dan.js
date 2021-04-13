import mqtt from 'mqtt';
import superagent from 'superagent';
import Context from './context';
import UUID from './uuid';
import { RegistrationError } from './exceptions';

export class Client {
  constructor() {
    this.ctx = new Context();
    this.firstPub = false;
    this.IsReconnect = false;
    this.onConnect = this.onConnect.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
  }

  publish(channel, message, retain, qos) {
    if (!this.ctx.mqttClient) throw new Error('unable to publish without ctx.mqttClient');

    if (retain === undefined) retain = false;

    if (qos === undefined) qos = 2;

    return new Promise((resolve, reject) => {
      this.ctx.mqttClient.publish(channel,
        JSON.stringify(message),
        { retain, qos },
        (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
    });
  }

  subscribe(channel, qos) {
    if (!this.ctx.mqttClient) throw new Error('unable to publish without ctx.mqttClient');

    if (qos === undefined) qos = 2;

    return new Promise((resolve, reject) => {
      this.ctx.mqttClient.subscribe(channel,
        { qos },
        (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
    });
  }

  unsubscribe(channel) {
    if (!this.ctx.mqttClient) throw new Error('unable to publish without ctx.mqttClient');

    return new Promise((resolve, reject) => {
      this.ctx.mqttClient.unsubscribe(channel,
        (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
    });
  }

  onConnect() {
    console.info('mqtt_connect');

    let pub;

    if (!this.IsReconnect) {
      pub = this.subscribe(this.ctx.OChans.ctrl)
        .then(() => {
          console.log(`Successfully connect to ${this.ctx.url}`);
          console.log(`Device ID: ${this.ctx.appID}`);
          console.log(`Device name: ${this.ctx.name}.`);
          if (typeof (document) !== 'undefined') {
            document.title = this.ctx.name;
          }
        })
        .catch(() => {
          throw new Error('Subscribe to control channel failed');
        });
    } else {
      console.info(`Reconnect: ${this.ctx.name}.`);
      pub = this.publish(
        this.ctx.IChans.ctrl,
        { state: 'offline', rev: this.ctx.rev },
        true, // retained message
      );
    }

    pub.then(() => {
      this.ctx.IChans.removeAllDF();
      this.ctx.OChans.removeAllDF();

      this.publish(
        this.ctx.IChans.ctrl,
        { state: 'online', rev: this.ctx.rev },
        true, // retained message
      ).then(() => {
        this.firstPub = true;
      });

      this.IsReconnect = true;

      if (this.ctx.onConnect) {
        this.ctx.onConnect();
      }
    }).catch((err) => {
      console.error(err);
    });
  }

  onMessage(topic, message) {
    if (topic === this.ctx.OChans.ctrl) {
      const signal = JSON.parse(message);
      let handlingResult = null;
      switch (signal.command) {
        case 'CONNECT':
          if ('idf' in signal) {
            const { idf } = signal;
            this.ctx.IChans.add(idf, signal.topic);
            handlingResult = this.ctx.onSignal(signal.command, [idf]);
          } else if ('odf' in signal) {
            const { odf } = signal;
            this.ctx.OChans.add(odf, signal.topic);
            handlingResult = this.ctx.onSignal(signal.command, [odf]);
            this.subscribe(this.ctx.OChans.topic(odf));
          }
          break;
        case 'DISCONNECT':
          if ('idf' in signal) {
            const { idf } = signal;
            this.ctx.IChans.removeDF(idf);
            handlingResult = this.ctx.onSignal(signal.command, [idf]);
          } else if ('odf' in signal) {
            const { odf } = signal;
            this.unsubscribe(this.ctx.OChans.topic(odf));
            this.ctx.OChans.removeDF(odf);
            handlingResult = this.ctx.onSignal(signal.command, [odf]);
          }
          break;
        default:
          throw new Error('unknown signal');
      }
      const resMsg = {
        msg_id: signal.msg_id,
      };
      if (typeof handlingResult === 'boolean' && handlingResult) {
        resMsg.state = 'ok';
      } else {
        resMsg.state = 'error';
        [, resMsg.reason] = handlingResult;
      }
      this.publish(this.ctx.IChans.ctrl, resMsg);
    } else {
      const odf = this.ctx.OChans.df(topic);
      if (!odf) return;
      this.ctx.onData(odf, JSON.parse(message));
    }
  }

  onDisconnect() {
    console.info(`${this.ctx.name} (${this.ctx.appID}) disconnected from ${this.ctx.url}.`);
    if (this.ctx.onDisconnect) {
      this.ctx.onDisconnect();
    }
  }

  register(params) {
    if (this.ctx.mqttClient) {
      throw new RegistrationError('Already registered');
    }

    this.ctx.url = params.url;
    if (!this.ctx.url || this.ctx.url === '') {
      throw new RegistrationError(`Invalid url: ${this.ctx.url}`);
    }

    this.ctx.appID = params.id || UUID();

    const body = {
      name: params.name,
      idf_list: params.idfList,
      odf_list: params.odfList,
      accept_protos: params.acceptProtos || 'mqtt',
      profile: params.profile,
    };

    // other callbacks
    this.ctx.onRegister = params.onRegister;
    this.ctx.onDeregister = params.onDeregister;
    this.ctx.onConnect = params.onConnect;
    this.ctx.onDisconnect = params.onDisconnect;

    // filter out the empty `df_list`, in case of empty list, server reponsed 403.
    ['idf_list', 'odf_list'].forEach(
      (x) => {
        if (Array.isArray(body[x]) && body[x].length === 0) delete body[x];
      },
    );

    superagent.put(`${this.ctx.url}/${this.ctx.appID}`)
      .type('json')
      .accept('json')
      .send(body)
      .then((res) => {
        let metadata = res.body;
        if (typeof metadata === 'string') {
          metadata = JSON.parse(metadata);
        }

        this.ctx.name = metadata.name;
        this.ctx.mqttHost = metadata.url.host;
        this.ctx.mqttPort = metadata.url.ws_port;
        this.ctx.mqttUsername = metadata.username || '';
        this.ctx.mqttPassword = metadata.password || '';
        [this.ctx.IChans.ctrl, this.ctx.OChans.ctrl] = metadata.ctrl_chans;
        this.ctx.rev = metadata.rev;

        this.ctx.mqttClient = mqtt.connect(`${metadata.url.ws_scheme}://${this.ctx.mqttHost}:${this.ctx.mqttPort}`, {
          clientId: `iottalk-js-${this.ctx.appID}`,
          username: this.ctx.mqttUsername,
          password: this.ctx.mqttPassword,
          will: {
            topic: this.ctx.IChans.ctrl,
            // in most case of js DA, it never connect back
            payload: JSON.stringify({ state: 'offline', rev: this.ctx.rev }),
            retain: true,
          },
          keepalive: 30, // seems 60 is problematic for default mosquitto setup
        });

        this.ctx.mqttClient.on('connect', this.onConnect);
        this.ctx.mqttClient.on('reconnect', () => {
          console.info('mqtt_reconnect');
        });
        this.ctx.mqttClient.on('disconnect', this.onDisconnect);
        this.ctx.mqttClient.on('error', (error) => {
          console.error('mqtt_error', error);
        });
        this.ctx.mqttClient.on('message', (topic, message, packet) => {
          // Convert message from Uint8Array to String
          this.onMessage(topic, message.toString(), packet);
        });

        this.ctx.onSignal = params.onSignal;
        this.ctx.onData = params.onData;

        setTimeout(() => {
          if (!this.firstPub) {
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
    if (!this.ctx.mqttClient) {
      throw new RegistrationError('Not registered');
    }

    this.publish(
      this.ctx.IChans.ctrl,
      { state: 'offline', rev: this.ctx.rev },
      true,
    );
    this.ctx.mqttClient.end();

    superagent.del(`${this.ctx.url}/${this.ctx.appID}`)
      .type('json')
      .accept('json')
      .send(JSON.stringify({ rev: this.ctx.rev }))
      .then(() => {
        this.ctx.mqttClient = null;
        if (this.ctx.onDeregister) {
          this.ctx.onDeregister();
        }
      }, (err) => {
        console.error('deregister fail', err);
      });
  }

  push(idf, data, qos) {
    if (!this.ctx.mqttClient || !this.firstPub) {
      throw new RegistrationError('Not registered');
    }
    if (!this.ctx.IChans.topic(idf)) {
      return;
    }
    if (qos === undefined) qos = 1;

    if (!Array.isArray(data)) {
      data = [data];
    }

    this.publish(this.ctx.IChans.topic(idf), data, false, qos);
  }
}

const defaultClient = new Client();

export function register(...args) {
  return defaultClient.register(...args);
}

export function deregister(...args) {
  return defaultClient.deregister(...args);
}

export function push(...args) {
  return defaultClient.push(...args);
}
