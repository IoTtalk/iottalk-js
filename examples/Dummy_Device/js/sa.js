/* global iottalkjs:readonly */
/* eslint camelcase: ["error", {"allow": ["Dummy_Sensor", "Dummy_Control"]}] */

document.addEventListener('DOMContentLoaded', () => {

  function create_row(id, number){
    var row = document.createElement('tr');
    var block1 = document.createElement('td');
    var block2 = document.createElement('td');
    var value = document.createTextNode(number);
    var _time = new Date().toLocaleTimeString(
                  'en-US', 
                  { 
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric"
                  }
                );

    var time = document.createTextNode(_time);

    block1.appendChild(time);
    block2.appendChild(value);
    row.appendChild(block1);
    row.appendChild(block2);

    var table = document.getElementById(id);
    table.appendChild(row);

    if (table.rows.length > 5){
        table.deleteRow(1);
    }

  }

  function Dummy_Sensor() {
    const number = Math.floor((1 + Math.random()) * 0x10000);
    create_row('dummy-sensor', number);
    return [number];
  }

  function Dummy_Control(data) {
    create_row('dummy-control', data);
  }

  const option = {
    apiUrl: 'https://iottalk2.tw/csm',
    deviceModel: 'Dummy_Device',
    deviceName: 'MyDummyDevice2',
    idfList: [[Dummy_Sensor, ['int']]],
    odfList: [Dummy_Control],
    pushInterval: 0,
    interval: {
      Dummy_Sensor: 1,
    },
  };

  const da = new iottalkjs.DAI(option);
  da.run();
});
