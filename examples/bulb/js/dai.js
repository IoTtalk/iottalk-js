const dai = function (profile, ida) {
    var df_func = {};
    var app_id = 'b5c5fc70-6169-449d-a99c-a4ad9bcfffe1';

    for (var i = 0; i < profile.idf_list.length; i++) {
        df_func[profile['idf_list'][i][0].name] = profile['idf_list'][i][0];
        profile['idf_list'][i][0] = profile['idf_list'][i][0].name;
    }
    for (var i = 0; i < profile.odf_list.length; i++) {
        df_func[profile.odf_list[i][0].name] = profile.odf_list[i][0];
        profile.odf_list[i][0] = profile.odf_list[i][0].name;
    }

    function on_data (odf_name, data) {
        df_func[odf_name](data);
    }

    function on_signal (cmd, param) {
        console.log('[cmd]', cmd, param);
        return true;
    }

    function init_callback (result) {
        console.log('register:', result);
        document.title = profile.d_name;
        ida.iot_app();
    }

    dan2.register('http://140.113.131.81:9992', {
        'id': app_id,
        'on_signal': on_signal,
        'on_data': on_data,
        'idf_list': profile['idf_list'],
        'odf_list': profile['odf_list'],
        'accept_protos': ['mqtt'],
    }, init_callback);
};
