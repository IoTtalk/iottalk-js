/* global iottalkjs:readonly */
/* eslint camelcase: ["error", {"allow": ["Dummy_Sensor", "Dummy_Control"]}] */

document.addEventListener('DOMContentLoaded', () => {
  const idf = document.querySelector('#idf');
  const odf = document.querySelector('#odf');

  function Dummy_Sensor() {
    const number = Math.floor((1 + Math.random()) * 0x10000);
    idf.value = number;
    return [number];
  }

  function Dummy_Control(data) {
    [odf.value] = data;
  }

  const option = {
    apiUrl: 'https://iottalk2.tw/csm',
    deviceModel: 'Dummy_Device',
    deviceName: 'MyDummyDevice',
    idfList: [[Dummy_Sensor, ['int']]],
    odfList: [[Dummy_Control, ['int']]],
    pushInterval: 0,
    interval: {
      Dummy_Sensor: 1,
    },
  };

  const da = new iottalkjs.DAI(option);
  da.run();
});
