import Context from './context.js';
import _UUID from './uuid.js';
import mqtt from 'mqtt';
import superagent from 'superagent';
import { RegistrationError } from './exceptions.js'

let ctx;
let _first_publish = false;
let _is_reconnect = false;

const publish = function (channel, message, retained, qos) {
    if (!ctx.mqtt_client) {
        throw 'unable to publish without ctx.mqtt_client';
    }
    if (retained === undefined)
        retained = false;

    if (qos === undefined)
        qos = 2;

    ctx.mqtt_client.publish(channel, message, {
        retain: retained,
        qos: qos,
    });
}

const subscribe = function (channel, callback, qos) {
    if (!ctx.mqtt_client)
        return;
    if (qos === undefined)
        qos = 2;
    return ctx.mqtt_client.subscribe(channel, { qos: qos }, callback);
}

const unsubscribe = function (channel) {
    if (!ctx.mqtt_client)
        return;
    return ctx.mqtt_client.unsubscribe(channel);
}

const on_connect = function () {
    if (!_is_reconnect) {
        console.log('Successfully connect to %s', ctx.url);
        console.log('Device ID: %s.', ctx.app_id);
        console.log('Device name: %s.', ctx.name);
        subscribe(ctx.o_chans['ctrl'], (err, granted) => {
            if (err) {
                throw 'Subscribe to control channel failed';
            }
        });
    }
    else {
        console.info('Reconnect: %s.', ctx.name);
        publish(
            ctx.i_chans['ctrl'],
            JSON.stringify({ 'state': 'offline', 'rev': ctx.rev }),
            true // retained message
        );
    }
    ctx.i_chans.remove_all_df();
    ctx.o_chans.remove_all_df();

    ctx.mqtt_client.publish(
        ctx.i_chans['ctrl'],
        JSON.stringify({ 'state': 'online', 'rev': ctx.rev }),
        { retain: true, qos: 2, },
        (err) => {
            if (!err) {
                _first_publish = true;
            }
        });

    _is_reconnect = true;

    if (ctx.on_connect) {
        ctx.on_connect();
    }
}

const on_message = function (topic, message) {
    if (topic == ctx.o_chans['ctrl']) {
        let signal = JSON.parse(message);
        let handling_result = null;
        switch (signal['command']) {
            case 'CONNECT':
                if ('idf' in signal) {
                    let idf = signal['idf'];
                    ctx.i_chans.add(idf, signal['topic']);
                    handling_result = ctx.on_signal(signal['command'], [idf]);

                } else if ('odf' in signal) {
                    let odf = signal['odf'];
                    ctx.o_chans.add(odf, signal['topic']);
                    handling_result = ctx.on_signal(signal['command'], [odf]);
                    subscribe(ctx.o_chans.topic(odf));
                }
                break;
            case 'DISCONNECT':
                if ('idf' in signal) {
                    let idf = signal['idf'];
                    ctx.i_chans.remove_df(idf);
                    handling_result = ctx.on_signal(signal['command'], [idf]);

                } else if ('odf' in signal) {
                    let odf = signal['odf'];
                    unsubscribe(ctx.o_chans.topic(odf));
                    ctx.o_chans.remove_df(odf);
                    handling_result = ctx.on_signal(signal['command'], [odf]);
                }
                break;
        }
        let res_message = {
            'msg_id': signal['msg_id'],
        };
        if (typeof handling_result == 'boolean' && handling_result) {
            res_message['state'] = 'ok';
        } else {
            res_message['state'] = 'error';
            res_message['reason'] = handling_result[1];
        }
        publish(ctx.i_chans['ctrl'], JSON.stringify(res_message));
        return;
    }
    else {
        let odf = ctx.o_chans.df(topic);
        if (!odf)
            return;
        ctx.on_data(odf, JSON.parse(message));
    }
}

const on_disconnect = function () {
    console.info('%s (%s) disconnected from  %s.', ctx.name, ctx.app_id, ctx.url);
    if (ctx.on_disconnect) {
        ctx.on_disconnect();
    }
}

export const register = function (url, params, callback) {
    ctx = new Context();

    if (ctx.mqtt_client) {
        throw new RegistrationError('Already registered');
    }

    ctx.url = url;
    if (!ctx.url || ctx.url == '') {
        throw new RegistrationError(`Invalid url: ${ctx.url}`);
    }

    ctx.app_id = params['id'] || _UUID();

    let body = {
        'name': params['name'],
        'idf_list': params['idf_list'],
        'odf_list': params['odf_list'],
        'accept_protos': params['accept_protos'] || 'mqtt',
        'profile': params['profile'],
    };

    let _reg_msg = 'register_callback is deprecated, please use `on_register` instead.';
    if (typeof params['on_register'] != 'undefined' && typeof params['register_callback'] != 'undefined') {
        throw new RegistrationError(_reg_msg);
    }
    else if (typeof params['on_register'] != 'undefined') {
        ctx.on_register = params['on_register'];
    }
    else if (typeof params['register_callback'] != 'undefined') {
        console.warning(_reg_msg);
        ctx.on_register = params['register_callback'];
    }

    // other callbacks
    ctx.on_deregister = params['on_deregister'];
    ctx.on_connect = params['on_connect'];
    ctx.on_disconnect = params['on_disconnect'];


    // filter out the empty `df_list`, in case of empty list, server reponsed 403.
    ['idf_list', 'odf_list'].forEach(
        x => {
            if (Array.isArray(body[x]) && body[x].length == 0)
                delete body[x];
        }
    );

    new Promise(
        (resolve, reject) => {
            superagent.put(ctx.url + '/' + ctx.app_id)
                .type('json')
                .accept('json')
                .send(body)
                .then(res => {
                    resolve(res);
                }, err => {
                    reject(err);
                });
        })
        .then(res => {
            let metadata = res.body;
            if (typeof metadata === 'string') {
                metadata = JSON.parse(metadata);
            }

            ctx.name = metadata['name'];
            ctx.mqtt_host = metadata['url']['host'];
            ctx.mqtt_port = metadata['url']['ws_port'];
            ctx.mqtt_username = metadata['username'] || '';
            ctx.mqtt_password = metadata['password'] || '';
            ctx.i_chans['ctrl'] = metadata['ctrl_chans'][0];
            ctx.o_chans['ctrl'] = metadata['ctrl_chans'][1];
            ctx.rev = metadata['rev'];

            ctx.mqtt_client = mqtt.connect(metadata.url['ws_scheme'] + '://' + ctx.mqtt_host + ':' + ctx.mqtt_port, {
                clientId: 'iottalk-js-' + ctx.app_id,
                username: ctx.mqtt_username,
                password: ctx.mqtt_password,
                will: {
                    topic: ctx.i_chans['ctrl'],
                    // in most case of js DA, it never connect back
                    payload: JSON.stringify({ 'state': 'offline', 'rev': ctx.rev }),
                    retain: true,
                },
                keepalive: 30,  // seems 60 is problematic for default mosquitto setup
            });

            ctx.mqtt_client.on('connect', (connack) => {
                console.info('mqtt_connect');
                on_connect();
                if (callback) {
                    callback({
                        'metadata': metadata,
                        'dan': ctx
                    });
                }
            });
            ctx.mqtt_client.on('reconnect', () => {
                console.info('mqtt_reconnect');
            });
            ctx.mqtt_client.on('disconnect', (packet) => {
                console.info('mqtt_disconnect');
                on_disconnect();
            });
            ctx.mqtt_client.on('error', (error) => {
                console.error('mqtt_error', error);
            });
            ctx.mqtt_client.on('message', (topic, message, packet) => {
                on_message(topic, message.toString()); // Convert message from Uint8Array to String
            });

            ctx.on_signal = params['on_signal'];
            ctx.on_data = params['on_data'];

            setTimeout(() => {
                if (!_first_publish) {
                    throw new RegistrationError('MQTT connection timeout');
                }
            }, 5000);

            if (ctx.on_register) {
                ctx.on_register();
            }
        }, err => {
            console.error('on_failure', err);
            if (callback)
                callback(false, err);
            return;
        });
}

export const deregister = function (callback) {
    if (!ctx.mqtt_client) {
        if (callback)
            callback(false);
        throw new RegistrationError('Not registered');
    }

    publish(
        ctx.i_chans['ctrl'],
        JSON.stringify({ 'state': 'offline', 'rev': ctx.rev }),
        true
    );
    ctx.mqtt_client.end();

    superagent.del(ctx.url + '/' + ctx.app_id)
        .type('json')
        .accept('json')
        .send(JSON.stringify({ 'rev': ctx.rev }))
        .then(res => {
            ctx.mqtt_client = null;
            if (ctx.on_deregister) {
                ctx.on_deregister();
            }
            if (callback)
                return callback(true);
        }, err => {
            console.error('deregister fail', err);
            if (callback)
                return callback(false);
        });
}

export const push = function (idf_name, data, qos) {
    if (!ctx.mqtt_client || !_first_publish) {
        throw new RegistrationError('Not registered');
    }
    if (!ctx.i_chans.topic(idf_name)) {
        return;
    }
    if (qos === undefined)
        qos = 1;

    if (typeof data != 'object') {
        data = [data];
    }

    publish(ctx.i_chans.topic(idf_name), JSON.stringify(data), false, qos);
}

export const UUID = function () {
    return ctx.app_id || _UUID();
}

export const connected = function () {
    if (typeof ctx.mqtt_client !== 'object') return false;
    return ctx.mqtt_client.connected;
}

export const reconnecting = function () {
    if (typeof ctx.mqtt_client !== 'object') return false;
    return ctx.mqtt_client.reconnecting;
}
