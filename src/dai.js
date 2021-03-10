import DeviceFeature from './device-feature.js';
import { push, register, deregister } from './dan2.js';
import { RegistrationError, ArgumentError } from './exceptions.js';

export default class {
    constructor(profile) {
        this.api_url = profile['api_url'];
        this.device_model = profile['device_model'];
        this.device_addr = profile['device_addr'];
        this.device_name = profile['device_name'];
        this.persistent_binding = profile['persistent_binding'] || false;
        this.username = profile['username'];
        this.extra_setup_webpage = profile['extra_setup_webpage'] || '';
        this.device_webpage = profile['device_webpage'] || '';

        this.register_callback = profile['register_callback'];
        this.on_register = profile['on_register'];
        this.on_deregister = profile['on_deregister'];
        this.on_connect = profile['on_connect'];
        this.on_disconnect = profile['on_disconnect'];

        this.push_interval = profile['push_interval'] || 1;
        this.interval = profile['interval'] || {};

        this.device_features = {};
        this.flags = {};

        this.on_signal = this.on_signal.bind(this);
        this.on_data = this.on_data.bind(this);

        this.parse_df_profile(profile, 'idf');
        this.parse_df_profile(profile, 'odf');
    }

    push_data(df_name) {
        if (this.device_features[df_name].push_data == null)
            return;
        let _df_interval = this.interval[df_name] || this.push_interval;
        console.debug(`${df_name} : ${this.flags[df_name]} [message / ${_df_interval} ms]`);
        let _push_interval = setInterval(() => {
            if (this.flags[df_name]) {
                let _data = this.device_features[df_name].push_data();
                push(df_name, _data);
            }
            else {
                clearInterval(_push_interval);
            }
        }, _df_interval);
    }

    on_signal(signal, df_list) {
        console.log(`Receive signal : ${signal}, ${df_list}`);
        if ('CONNECT' == signal) {
            df_list.forEach(df_name => {
                if (!this.flags[df_name]) {
                    this.flags[df_name] = true;
                    this.push_data(df_name);
                }
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

    run(ida) {
        this._check_parameter();

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

        console.log('dai', msg);

        register(this.api_url, msg, (result) => {
            console.log('register', result);
            document.title = this.device_name;
            ida.ida_init();
        });

        window.onbeforeunload = function () {
            try {
                if (!this.persistent_binding) {
                    deregister();
                }
            } catch (error) {
                console.error(`dai process cleanup exception: ${error}`);
            }
        };
    }

    parse_df_profile(profile, typ) {
        for (let i = 0; i < profile[`${typ}_list`].length; i++) {
            let df_name;
            let param_type;
            let on_data;
            let push_data;
            if (typeof profile[`${typ}_list`][i] == 'function') {
                df_name = profile[`${typ}_list`][i].name;
                param_type = null;
                on_data = push_data = profile[`${typ}_list`][i];
                profile[`${typ}_list`][i] = profile[`${typ}_list`][i].name;
            }
            else if (typeof profile[`${typ}_list`][i] == 'object' && profile[`${typ}_list`][i].length == 2) {
                df_name = profile[`${typ}_list`][i][0].name;
                param_type = profile[`${typ}_list`][i][1];
                on_data = push_data = profile[`${typ}_list`][i][0];
                profile[`${typ}_list`][i][0] = profile[`${typ}_list`][i][0].name;
            }
            else {
                throw new RegistrationError(`Invalid ${typ}_list, usage: [df_name, ...] or [[df_name, type], ...]`);
            }

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
