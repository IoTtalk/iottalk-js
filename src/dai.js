import DeviceFeature from './device-feature.js'

let api_url;
let device_model;
let device_addr;
let device_name;
let persistent_binding;
let username;
let extra_setup_webpage;
let device_webpage;

let register_callback;
let on_register;
let on_deregister;
let on_connect;
let on_disconnect;

let push_interval;
let interval;

let device_features = {};
let flags = {};

export const dai = function (profile, ida) {
    api_url = profile['api_url'];
    device_model = profile['device_model'];
    device_addr = profile['device_addr'];
    device_name = profile['device_name'];
    persistent_binding = profile['persistent_binding'] ? profile['persistent_binding'] : false;
    username = profile['username'];
    extra_setup_webpage = profile['extra_setup_webpage'] ? profile['extra_setup_webpage'] : '';
    device_webpage = profile['device_webpage'] ? profile['device_webpage'] : '';

    register_callback = profile['register_callback'];
    on_register = profile['on_register'];
    on_deregister = profile['on_deregister'];
    on_connect = profile['on_connect'];
    on_disconnect = profile['on_disconnect'];

    push_interval = profile['push_interval'] ? profile['push_interval'] : 1;
    interval = profile['interval'] ? profile['interval'] : {};

    parse_df_profile(profile, 'idf');
    parse_df_profile(profile, 'odf');


    function push_data(df_name) {
        if (device_features[df_name].push_data == null)
            return;
        let _df_interval = interval[df_name] ? interval[df_name] : push_interval;
        console.debug('%s : %s [message / %s ms]', df_name, flags[df_name], _df_interval);
        let intervalID = setInterval(
            (() => {
                if (flags[df_name]) {
                    let _data = device_features[df_name].push_data();
                    dan2.push(df_name, _data);
                }
                else {
                    clearInterval(intervalID)
                }
            }), _df_interval
        )
    }

    function on_signal(signal, df_list) {
        console.log('Receive signal : ', signal, df_list);
        if ('CONNECT' == signal) {
            df_list.forEach(df_name => {
                if (!flags[df_name]) {
                    flags[df_name] = true;
                    push_data(df_name);
                }
            });
        }
        else if ('DISCONNECT' == signal) {
            df_list.forEach(df_name => {
                flags[df_name] = false;
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

    function on_data(df_name, data) {
        try {
            device_features[df_name].on_data(data);
        } catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }

    function init_callback(result) {
        console.log('register:', result);
        document.title = device_name;
        ida.ida_init();
    }

    if (!api_url)
        throw 'api_url is required';

    if (!device_model)
        throw 'device_model not given.';

    if (persistent_binding && !device_addr)
        throw 'In case of `persistent_binding` set to `True`, ' +
        'the `device_addr` should be set and fixed.'

    if (Object.keys(device_features).length === 0)
        throw 'Neither idf_list nor odf_list is empty.';

    let msg = {
        'on_signal': on_signal,
        'on_data': on_data,
        'accept_protos': ['mqtt'],
        'id': device_addr,
        'idf_list': profile['idf_list'],
        'odf_list': profile['odf_list'],
        'name': device_name,
        'profile': {
            'model': device_model,
            'u_name': username,
            'extra_setup_webpage': extra_setup_webpage,
            'device_webpage': device_webpage,
        },
        'register_callback': register_callback,
        'on_register': on_register,
        'on_deregister': on_deregister,
        'on_connect': on_connect,
        'on_disconnect': () => {
            df_list.forEach(df_name => {
                flags[df_name] = false;
            });
            console.debug('on_disconnect: _flag = %s', flags);
            if (on_disconnect) {
                return on_disconnect;
            }
        }
    }

    console.log(msg);

    dan2.register(api_url, msg, init_callback);

    window.onbeforeunload = function () {
        try {
            if (!persistent_binding) {
                dan2.deregister();
            }
        } catch (error) {
            console.error('dai process cleanup exception: %s', error);
        }
    };
};

const parse_df_profile = function (profile, typ) {
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
            throw `Invalid ${typ}_list, usage: [df_name, ...] or [[df_name, type], ...]`;
        }

        let df = new DeviceFeature({
            'df_name': df_name,
            'df_type': typ,
            'param_type': param_type,
            'push_data': push_data,
            'on_data': on_data
        });

        device_features[df_name] = df;
    }
}
