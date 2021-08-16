# IoTtalk2.0 Javascript SDK

[![Build Status](https://travis-ci.com/IoTtalk/iottalk-js.svg?branch=master)](https://travis-ci.com/IoTtalk/iottalk-js)
[![npm version](https://badge.fury.io/js/iottalk-js.svg)](https://badge.fury.io/js/iottalk-js)

Provide DAN of IoTtalk2.0 and some examples.

## Usage

The library will export a global variable `window.iottalkjs`.
We provide minified file served from GitHub pages:

```html
<script src="https://iottalk.github.io/iottalk-js/iottalkjs-v2.3.1.js"></script>
```

There is a pointer for latest master build, it's unstable.
Please use it at your own risk.
```html
<script src="https://iottalk.github.io/iottalk-js/iottalkjs.js"></script>
```

The full build artifacts are here: https://github.com/IoTtalk/iottalk-js/tree/gh-pages

### Examples

- [Dummy_Device](./examples/Dummy_Device/)
- [Dummy_Device_Table](https://github.com/IoTtalk/Dummy_Device_WebVer_for_IoTtalk_v2): A much pretty demo of Dummy_Device.
- [Smartphone DA](./examples/smartphone/): This is a demo of event-driven push.

### Install via NPM or Yarn

```
npm i iottalk-js
```

or

```
yarn add iottalk-js
```

## API Reference

### `class iottalkjs.DAI`

#### constructor `iottalkjs.DAI(option)`

`options` is an `object`:

- `apiUrl` (`string`): The CSM API URL.
- `deviceModel` (`string`)
- `deviceName` (`string`)
- `deviceAddr` (`string`): Should be a valid UUID string.
- `persistentBinding` (`bool`): Default is `false`.
- `username` (`string`): The DA owner.
- `extraSetupWebpage` (`string`)
- `deviceWebpage` (`string`)
- `onRegister` (`function`): A callback function with signature `function (dan)`.
                             The first argument is the instance of `iottalkjs.DAN.Client`.
- `onDeregister` (`function`): A callback function with signature `function (dan)`.
- `onConnect` (`function`): A callback invoked on MQTT broker connected.
                            The signature is `function (dan)`.
- `onDisconnect` (`function`): A callback function with signature `function (dan)`.
- `pushInterval` (`number`): The push interval in second.
- `interval` (`object`): The key is the device feature name in `string`.
- `idfList` (`Array`): Should be a list of `idf, unit` pairs.
                       Where a `idf, unit` pair can be following format:
    - `[<function pointer>, <unit>]`: e.g.: `[Dummy_Sensor, ['dB']]`
    - `[<df name>, <unit>]`: In this case, since the function pointer is not provided,
                             the auto-push won't be applied.
                             Please checkout the Smartphone example.
- `odfList` (`Array`)

Example:

```javascript
const Dummy_Sensor  = () => { ... };
const Dummy_Control = () => { ... };

const da = new iottalkjs.DAI({
  apiUrl: 'https://example.com/csm',
  deviceModel: 'Dummy_Device',
  deviceName: 'MyMagicDevice',
  deviceAddr: '0a14943f-cc88-4f36-a441-dc3f42f03546',
  persistentBinding: true,
  idfList: [[Dummy_Sensor, ['dB']]],
  odfList: [[Dummy_Control, ['dB']]],
});
```

Example of DF name conversion, the valid underscore suffix (_) in function name will be converted to df naming rules (-):

```javascript
const Acceleration_I = () => { ... };

const da = new iottalkjs.DAI({
 ...
 idfList: [Acceleration_I, ['g']],
 inverval: {
   'Acceleration-I': 42,
 },
});
```

#### `run()`

```
const da = new iottalkjs.DAI({ ... });
da.run();
```

## `class iottalkjs.DAN.Client`

### `client.push(idf, data, [qos])`

- `idf` (`string`): Name of outgoing IDF.
- `data`

## Development

The following command will output the build module into dir `build-web` and `build-node`.

```
yarn
yarn run build
```

For nodejs only build, there is a target `build:node`.
For web only build, there is a target `build:web`.

### Publishing NPM package

```
yarn login
yarn run build
rm examples/Dummy_Device/build examples/smartphone/build # the symlinks block the publishing
yarn publish
git checkout -- examples/Dummy_Device/build examples/smartphone/build
```
