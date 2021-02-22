import DeviceFeature from './device-feature.js'

export const dai = function (profile, ida) {
    var df_func = {};

    let api_url = profile['api_url'];
    let device_model = profile['device_model'];
    let device_addr = profile['device_addr'];
    let device_name = profile['device_name'];
    let persistent_binding = profile['persistent_binding'];
    let username = profile['username'];
    let extra_setup_webpage = profile['extra_setup_webpage'];
    let device_webpage = profile['device_webpage'];

    let register_callback = profile['register_callback'];
    let on_register = profile['on_register'];
    let on_deregister = profile['on_deregister'];
    let on_connect = profile['on_connect'];
    let on_disconnect = profile['on_disconnect'];

    let push_interval = profile['push_interval'];
    let interval = profile['interval'] ? profile['interval'] : {};

    let device_features = {};
    let flags = {};

    for (let i = 0; i < profile.idf_list.length; i++) {
        df_func[profile['idf_list'][i].name] = profile['idf_list'][i];
        profile['idf_list'][i] = profile['idf_list'][i].name;
    }
    for (let i = 0; i < profile.odf_list.length; i++) {
        df_func[profile.odf_list[i].name] = profile.odf_list[i];
        profile.odf_list[i] = profile.odf_list[i].name;
    }

    function on_data(odf_name, data) {
        df_func[odf_name](data);
    }

    function on_signal(cmd, param) {
        console.log('[cmd]', cmd, param);
        return true;
    }

    function init_callback(result) {
        console.log('register:', result);
        document.title = device_name;
        ida.ida_init();
    }

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
        // 'on_disconnect' : f
    }

    console.log(msg);

    dan2.register(api_url, msg, init_callback);
};

const parse_df_profile = function (profile, typ) {
    let t = `${typ}_list`;
}