/* global iottalkjs:readonly */
/* eslint camelcase: ["error", {"allow": ["Dummy_Sensor", "Dummy_Control"]}] */

document.addEventListener('DOMContentLoaded', () => {
  function createRow(id, number) {
    const row = document.createElement('tr');
    const block1 = document.createElement('td');
    const block2 = document.createElement('td');
    const value = document.createTextNode(number);
    const timeStr = new Date().toLocaleTimeString(
      'zh-TW',
      {
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        fractionalSecondDigits: 3,
      },
    );

    const time = document.createTextNode(timeStr);

    block1.appendChild(time);
    block2.appendChild(value);
    row.appendChild(block1);
    row.appendChild(block2);

    const table = document.getElementById(id);
    table.appendChild(row);

    if (table.rows.length > 10 + 1) {
      table.deleteRow(1);
    }
  }

  function Dummy_Sensor() {
    const number = Math.floor((1 + Math.random()) * 0x10000);
    createRow('dummy-sensor', number);
    return [number];
  }

  function Dummy_Control(data) {
    createRow('dummy-control', data);
  }

  const option = {
    apiUrl: 'https://iottalk2.tw/csm',
    deviceModel: 'Dummy_Device',
    deviceName: 'MyDummyDevice2',
    idfList: [[Dummy_Sensor, ['int']]],
    odfList: [Dummy_Control],
    pushInterval: 0,
    interval: {
      Dummy_Sensor: 1/24,
    },
  };

  const da = new iottalkjs.DAI(option);
  da.run();
});
