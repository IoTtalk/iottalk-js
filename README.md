# IoTtalk2.0 Javascript SDK

[![Build Status](https://travis-ci.com/IoTtalk/iottalk-js.svg?branch=master)](https://travis-ci.com/IoTtalk/iottalk-js)
[![npm version](https://badge.fury.io/js/iottalk-js.svg)](https://badge.fury.io/js/iottalk-js)

Provide DAN of IoTtalk2.0 and some examples.

## Usage

_dan2.js_ provide you with the ability to connect with IoTtalk v2.
The library will export a global variable `window.iottalkjs`.
We provide minified file served from GitHub pages:

```html
<script src="https://iottalk.github.io/iottalk-js/iottalkjs-v2.3.0.js"></script>
```

There is a pointer for latest master build, it's unstable.
Please use it at your own risk.
```html
<script src="https://iottalk.github.io/iottalk-js/iottalkjs.js"></script>
```

The full build artifacts are here: https://github.com/IoTtalk/iottalk-js/tree/gh-pages

### Examples

- [Dummy_Device](./examples/Dummy_Device/)
- [Smartphone DA](./examples/smartphone/): this is a demo of event-driven push.

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

### constructor `iottalkjs.DAI(option)`

`options` is a `Object`:
    - `apiUrl` (`string`): The CSM API URL.
    - `deviceModel` (`string`)
    - `deviceName` (`string`)
    - `deviceAddr` (`string`): Should be a valid UUID string.
    - `persistentBinding` (`bool`): Default is `false`.
    - `username` (`string`): The DA owner.
    - `extraSetupWebpage` (`string`)
    - `deviceWebpage` (`string`)
    - `onRegister` (`function`): A callback function with signature `function (dan)`.
                                 the first argument is the instance of ``iottalkjs.DAN.Client`.
    - `onDeregister` (`function`): A callback function with signature `function ()`.
    - `onConnect` (`function`): A callback invoked on MQTT broker connected.
    - `onDisconnect` (`function`)
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

### `iottalkjs.DAN.register(url, params, init_callback)`

- url (`string`): IoTtalk 2.0 server.
- param (`object`):
    - port (`number`, optional): MQTT websocket server's port. Default set to 1994.
    - id (`string`, optional): The UUID of your app. Randomly generate one if not given. It should be in valid UUID format.
    - on_signal (`function`): Invoked when receiving control signal from server. More detail are described at below.
    - on_data (`function`): Invoked when odf data coming. More detail are described at below.
    - idf_list (`array`, optional): list of idf description. ex: `[['Position', ['lat', 'long']]]`. Skip this field if you don't have.
    - odf_list (`array`, optional): list of odf description. ex: `[['Meow', ['dB']]]`. Skip this field if you don't have.
    - accept_protos (`array`): The accepted protocols list of the device application. ex: `['mqtt']`.
- init_callback (`function`): Invoke after registering to IoTtalk server.

#### `on_signal`
The purpose of each signal is specify at [here](http://iottalk-spec.readthedocs.io/en/latest/protos/res_control_proto.html#control-signal).
Handler for incoming control signal from server, received two parameter:
- command (`string`): specify which signal it is. For now, only `CONNECT`, `DISCONNECT` are implemented.
- param (`array`): An array containing parameter for this command. ex: `['Meow']`

You must ALWAYS return `true` or `[false, 'reason']` indicate the result after handling this signal.

#### `on_data`
Handler for incoming odf data signal, received two parameter:
- odf_name (`string`): Name of incoming odf data.
- data: Data of the odf.

### `dan2.push(idf_name, data, [qos])`

- idf_name (`string`): Name of outgoing idf data.
- data: Data of the idf.

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
yarn publish
```
