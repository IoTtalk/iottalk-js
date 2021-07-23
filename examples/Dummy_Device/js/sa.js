/* global iottalkjs:readonly */
/* eslint camelcase: ["error", {"allow": ["Dummy_Sensor", "Dummy_Control"]}] */

document.addEventListener('DOMContentLoaded', () => {
  const idf = document.querySelector('#idf');
  const odf = document.querySelector('#odf');

  function DummySensor_I() {
    const number = Math.floor((1 + Math.random()) * 0x10000);
    idf.value = number;
    return [number];
  }

  function DummyControl_O(data) {
    [odf.value] = data;
  }

  function onConnect() {
    document.getElementById('deviceName').innerHTML += document.title;
  }

  const option = {
    apiUrl: 'https://iottalk2.tw/csm',
    deviceModel: 'Dummy_Device',
    // deviceName: 'MyDummyDevice',
    idfList: [[DummySensor_I, ['int']]],
    odfList: [[DummyControl_O, ['int']]],
    onConnect: onConnect,
    pushInterval: 0,
    interval: {
      'DummySensor-I': 1,
    },
  };

  const da = new iottalkjs.DAI(option);
  da.run();
});
