import DeviceFeature from './device-feature.js';
import { Client } from './dan.js';
import { RegistrationError, ArgumentError } from './exceptions.js';

export default class {

    constructor(option) {
        this.api_url = option['api_url'];
        this.device_model = option['device_model'];
        this.device_addr = option['device_addr'];
        this.device_name = option['device_name'];
        this.persistent_binding = option['persistent_binding'] || false;
        this.username = option['username'];
        this.extra_setup_webpage = option['extra_setup_webpage'] || '';
        this.device_webpage = option['device_webpage'] || '';

        this.register_callback = option['register_callback'];
        this.on_register = option['on_register'];
        this.on_deregister = option['on_deregister'];
        this.on_connect = option['on_connect'];
        this.on_disconnect = option['on_disconnect'];

        this.push_interval = option['push_interval'] != undefined ? option['push_interval'] : 1;
        this.interval = option['interval'] || {};

        this.device_features = {};
        this.flags = {};

        this.on_signal = this.on_signal.bind(this);
        this.on_data = this.on_data.bind(this);

        this.parse_df_profile(option, 'idf');
        this.parse_df_profile(option, 'odf');
    }

    push_data(df_name) {
        if (this.device_features[df_name].push_data == null)
            return;
        let _df_interval = this.interval[df_name] != undefined ? this.interval[df_name] : this.push_interval;
        console.debug(`${df_name} : ${this.flags[df_name]} [message / ${_df_interval} s]`);
        let _push_interval = setInterval(() => {
            let _data = this.device_features[df_name].push_data();
            if (!this.flags[df_name]) {
                clearInterval(_push_interval);
                return;
            }
            if (_data === undefined) {
                return;
            }
            this.dan.push(df_name, _data);

        }, _df_interval * 1000);
    }

    on_signal(signal, df_list) {
        console.log(`Receive signal: ${signal}, ${df_list}`);
        if ('CONNECT' == signal) {
            df_list.forEach(df_name => {
                if (this.flags[df_name]) {
                    return;
                }
                this.flags[df_name] = true;
                this.push_data(df_name);
            });
        }
        else if ('DISCONNECT' == signal) {
            df_list.forEach(df_name => {
                this.flags[df_name] = false;
            });
        }
        else if ('SUSPEND' == signal) {
            // Not use
        }
        else if ('RESUME' == signal) {
            // Not use
        }
        return true;
    }

    on_data(df_name, data) {
        try {
            this.device_features[df_name].on_data(data);
        } catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }

    df_func_name(df_name) {
        if (df_name.match(/-[A-Z]?(I|O)[0-9]?$/i)) {
            return df_name.replace('-', '_');
        }
        return df_name;
    }

    _check_parameter() {
        if (!this.api_url)
            throw new RegistrationError('api_url is required.');

        if (!this.device_model)
            throw new RegistrationError('device_model not given.');

        if (this.persistent_binding && !this.device_addr)
            throw new ArgumentError('In case of `persistent_binding` set to `True`, ' +
                'the `device_addr` should be set and fixed.');

        if (Object.keys(this.device_features).length === 0)
            throw new RegistrationError('Neither idf_list nor odf_list is empty.');
    }

    run() {
        this._check_parameter();

        this.dan = new Client();

        let idf_list = [];
        let odf_list = [];

        for (const [df_name, df] of Object.entries(this.device_features)) {
            if (df.df_type == 'idf')
                idf_list.push([df_name, df.df_type]);
            else
                odf_list.push([df_name, df.df_type]);
        }

        let msg = {
            'on_signal': this.on_signal,
            'on_data': this.on_data,
            'accept_protos': ['mqtt'],
            'id': this.device_addr,
            'idf_list': idf_list,
            'odf_list': odf_list,
            'name': this.device_name,
            'profile': {
                'model': this.device_model,
                'u_name': this.username,
                'extra_setup_webpage': this.extra_setup_webpage,
                'device_webpage': this.device_webpage,
            },
            'register_callback': this.register_callback,
            'on_register': this.on_register,
            'on_deregister': this.on_deregister,
            'on_connect': this.on_connect,
            'on_disconnect': () => {
                for (const key in this.flags) {
                    this.flags[key] = false;
                }
                console.debug(`on_disconnect: _flag = ${this.flags}`);
                if (on_disconnect) {
                    return on_disconnect;
                }
            }
        };

        this.dan.register(this.api_url, msg);

        window.onbeforeunload = function () {
            try {
                if (!this.persistent_binding) {
                    this.dan.deregister();
                }
            } catch (error) {
                console.error(`dai process cleanup exception: ${error}`);
            }
        };
    }

    parse_df_profile(option, typ) {
        for (let i = 0; i < option[`${typ}_list`].length; i++) {
            let df_name;
            let param_type;
            let on_data;
            let push_data;
            if (typeof option[`${typ}_list`][i] === 'string') {
                df_name = option[`${typ}_list`][i];
                param_type = null;
            }
            else if (typeof option[`${typ}_list`][i] === 'object' && option[`${typ}_list`][i].length == 2) {
                df_name = option[`${typ}_list`][i][0];
                param_type = option[`${typ}_list`][i][1];
            }
            else {
                throw new RegistrationError(`Invalid ${typ}_list, usage: [df_name, ...] or [[df_name, type], ...]`);
            }

            option['df_function_list'].forEach(df_function => {
                if (this.df_func_name(df_name) == df_function.name) {
                    on_data = push_data = df_function;
                }
            });

            let df = new DeviceFeature({
                'df_name': df_name,
                'df_type': typ,
                'param_type': param_type,
                'push_data': push_data,
                'on_data': on_data
            });

            this.device_features[df_name] = df;
        }
    }
}
