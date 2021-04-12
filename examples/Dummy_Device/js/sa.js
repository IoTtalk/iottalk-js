$(() => {
  function Dummy_Sensor() {
    const number = Math.floor((1 + Math.random()) * 0x10000);
    $('.IDF_value')[0].innerText = number;
    return [number];
  }

  function Dummy_Control(data) {
    $('.ODF_value')[0].innerText = data[0];
  }

  const option = {
    apiUrl: 'https://iottalk2.tw/csm',
    deviceModel: 'Dummy_Device',
    deviceAddr: 'c96ca71c-9e48-2a23-2868-acb420a2f105',
    deviceName: 'MyDummyDevice',
    persistentBinding: true,
    idfList: [[Dummy_Sensor, ['int']]],
    odfList: [Dummy_Control],
    push_interval: 0,
    interval: {
      Dummy_Sensor: 1.5,
    },
  };

  new iottalkjs.dai(option).run();
});
