/* global $:readonly iottalkjs:readonly */

/* this example demo the event driven push */

$(() => {
  let deviceName;
  while (!(deviceName = prompt('請輸入裝置名稱', 'My-Phone'))) ;
  const accur = 10;

  const acc = {};
  const AxDom = $('#Ax > span');
  const AyDom = $('#Ay > span');
  const AzDom = $('#Az > span');

  const onRegister = (dan) => {
    window.ondevicemotion = (event) => {
      const ax = event.accelerationIncludingGravity.x || 0;
      const ay = event.accelerationIncludingGravity.y || 0;
      const az = event.accelerationIncludingGravity.z || 0;

      acc.x = Math.round(ax * accur) / accur;
      acc.y = Math.round(ay * accur) / accur;
      acc.z = Math.round(az * accur) / accur;

      AxDom.text(acc.x);
      AyDom.text(acc.y);
      AzDom.text(acc.z);

      dan.push('Acceleration-I', [acc.x, acc.y, acc.z]);
    };
  };

  const da = new iottalkjs.DAI({
    apiUrl: 'https://iottalk2.tw/csm',
    deviceModel: 'Smartphone',
    deviceName,
    idfList: [['Acceleration-I', ['g', 'g', 'g']]],
    onRegister,
  });

  da.run();
});
