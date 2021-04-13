$(() => {
  function color(data) {
    $('.bulb-top, .bulb-middle-1, .bulb-middle-2, .bulb-middle-3, .bulb-bottom').css(
      { background: `rgb(${data.join(', ')})` },
    );
  }

  function coord(x, y) {
    dan2.push('coord', [x, y]);
  }

  function iot_app() {
    // $('.bulb-top, .bulb-middle-1, .bulb-middle-2, .bulb-middle-3, .bulb-bottom').css(
    //     {'background': 'rgb(255, 255, 255)'}
    // );
  }

  const profile = {
    idf_list: [
      [coord, ['int', 'int']],
    ],
    odf_list: [
      [color, ['rgb', 'rgb', 'rgb']],
    ],
    model: 'Bulb',
  };

  const ida = {
    iot_app,
  };

  $(window).mousemove((evt) => {
    console.debug('mousemove triggered');
    coord(evt.clientX, evt.clientY);
  });

  dai(profile, ida);
});
