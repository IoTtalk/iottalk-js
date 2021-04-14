/* global iottalkjs:readonly */

document.addEventListener('DOMContentLoaded', () => {
  const idf = document.querySelector('#idf');
  const odf = document.querySelector('#odf');

  const DummySensor_I = () => {
    const number = Math.floor((1 + Math.random()) * 0x10000);
    idf.value = number;
    return [number];
  }

  const DummyControl_O = (data) => { [odf.value] = data; }

  const option = {
    apiUrl: 'https://iottalk2.tw/csm',
    deviceModel: 'Dummy_Device',
    deviceName: 'MyDummyDevice',
    idfList: [[DummySensor_I, ['int']]],
    odfList: [[DummyControl_O, ['int']]],
    pushInterval: 10,
    interval: {
      'DummySensor-I': 1,
    },
  };

  const da = new iottalkjs.DAI(option);
  da.run();
});
