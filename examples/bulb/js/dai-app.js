$(function () {
    function color (data) {
        $('.bulb-top, .bulb-middle-1, .bulb-middle-2, .bulb-middle-3, .bulb-bottom').css(
            {'background': 'rgb('+ data.join(', ') +')'}
        );
    }

    function coord (x, y) {
        dan2.push('coord', [x, y]);
    }

    function iot_app () {
        // $('.bulb-top, .bulb-middle-1, .bulb-middle-2, .bulb-middle-3, .bulb-bottom').css(
        //     {'background': 'rgb(255, 255, 255)'}
        // );
    }

    var profile = {
        'idf_list': [
            [coord, ['int', 'int']]
        ],
        'odf_list': [
            [color, ['rgb', 'rgb', 'rgb']]
        ],
    }

    var ida = {
        'iot_app': iot_app,
    };

    $(window).mousemove(function (evt) {
        coord(evt.clientX, evt.clientY);
    });

    dai(profile, ida);
});
