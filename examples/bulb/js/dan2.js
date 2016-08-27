var dan2 = (function () {
    var _url;
    var _id;
    var _mqtt_host;
    var _mqtt_port;
    var _mqtt_client;
    var _i_chans;
    var _o_chans;
    var _on_signal;
    var _on_data;
    var _rev;

    function ChannelPool () {
        this._table = {};
        this._rtable = {};
        this.add = function (df_name, topic_) {
            this._table[df_name] = topic_;
            this._rtable[topic_] = df_name;
        };
        this.topic = function (df_name) {
            return this._table[df_name];
        };
        this.remove_df = function (df_name) {
            delete this._rtable[this._table[df_name]];
            delete this._table[df_name];
        };
        this.df = function (topic_) {
            return this._rtable[topic_];
        };
    }

    function mqtt_message (channel, message, retained) {
        var ret = new Paho.MQTT.Message(message);
        ret.destinationName = channel;
        if (retained) {
            ret.retained = true;
        }
        return ret;
    }

    function publish (channel, message, retained) {
        if (!_mqtt_client) {
            return;
        }
        _mqtt_client.send(mqtt_message(channel, message, retained));
    }

    function subscribe (channel) {
        if (!_mqtt_client) {
            return;
        }
        _mqtt_client.subscribe(channel);
    }

    function unsubscribe (channel) {
        if (!_mqtt_client) {
            return;
        }
        _mqtt_client.unsubscribe(channel);
    }

    function on_message (msg) {
        var topic = msg.destinationName;
        var message = msg.payloadString;
        if (topic == _o_chans.topic('ctrl')) {
            var signal = JSON.parse(message);
            switch (signal['command']) {
            case 'CONNECT':
                if ('idf' in signal) {
                    var idf = signal['idf'];
                    _i_chans.add(idf, signal['topic']);
                    var handling_result = _on_signal(signal['command'], [idf]);

                } else if ('odf' in signal) {
                    var odf = signal['odf'];
                    _o_chans.add(odf, signal['topic']);
                    var handling_result = _on_signal(signal['command'], [odf]);
                    subscribe(_o_chans.topic(odf));
                }
                break;
            case 'DISCONNECT':
                if ('idf' in signal) {
                    var idf = signal['idf'];
                    _i_chans.remove_df(idf);
                    var handling_result = _on_signal(signal['command'], [idf]);

                } else if ('odf' in signal) {
                    var odf = signal['odf'];
                    unsubscribe(_o_chans.topic(odf));
                    _o_chans.remove_df(odf);
                    var handling_result = _on_signal(signal['command'], [odf]);
                }
                break;
            }
            var res_message = {
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
            var odf = _o_chans.df(topic);
            if (!odf) {
                return;
            }
            _on_data(odf, JSON.parse(message));
        }
    }

    function UUID () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    function register (url, params, callback) {
        _url = url;
        _id = ('id' in params) ? params['id'] : UUID();
        _on_signal = params['on_signal'];
        _on_data = params['on_data'];
        _i_chans = new ChannelPool();
        _o_chans = new ChannelPool();

        function on_failure () {
            if (callback) {
                callback(false);
            }
        }

        $.ajax({
            'type': 'PUT',
            'url': _url +'/'+ _id,
            'data': JSON.stringify({
                'idf_list': params['idf_list'],
                'odf_list': params['odf_list'],
                'accept_protos': params['accept_protos'],
            }),
            'contentType': 'application/json',
        }).done(function (metadata) {
            if (typeof metadata === 'string') {
                metadata = JSON.parse(metadata);
            }

            _i_chans.add('ctrl', metadata['ctrl_chans'][0]);
            _o_chans.add('ctrl', metadata['ctrl_chans'][1]);
            _rev = metadata['rev'];

            function on_connect () {
                publish(
                    _i_chans.topic('ctrl'),
                    JSON.stringify({'state': 'online'}),
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

            // TODO: change host:port to received value
            _mqtt_client = new Paho.MQTT.Client(
                '140.113.131.81',
                Number(11883),
                _id
            );
            _mqtt_client.onMessageArrived = on_message;
            _mqtt_client.connect({
                'onSuccess': on_connect,
                'onFailure': on_failure,
                'willMessage': mqtt_message(
                    _i_chans.topic('ctrl'),
                    JSON.stringify({'state': 'broken'}),
                    true
                )
            });
        }).fail(on_failure);
    }

    function push (idf_name, data) {
        if (!_mqtt_client || !_i_chans.topic(idf_name)) {
            return;
        }
        publish(_i_chans.topic(idf_name), JSON.stringify(data));
    }

    return {
        'register': register,
        'push': push,
        'UUID': UUID,
    };
})();
