# IoTtalk2.0 Javascript SDK

[![Build Status](https://travis-ci.com/IoTtalk/iottalk-js.svg?branch=master)](https://travis-ci.com/IoTtalk/iottalk-js)
[![npm version](https://badge.fury.io/js/iottalk-js.svg)](https://badge.fury.io/js/iottalk-js)

Provide DAN of IoTtalk2.0 and some examples.


## Usage

_dan2.js_ provide you with the ability to connect with IoTtalk v2.
The library will export a global variable `window.dan2`.
We provide minified file served from GitHub pages:

```html
<script src="https://iottalk.github.io/iottalk-js/dan2-v2.0.4.js"></script>
```

There is a pointer for latest master build, it's unstable.
Please use it at your own risk.
```html
<script src="https://iottalk.github.io/iottalk-js/dan2.js"></script>
```

The build artifacts are here: https://github.com/IoTtalk/iottalk-js/tree/gh-pages

### Install via NPM or Yarn

```
npm i iottalk-js
```

or

```
yarn add iottalk-js
```

### `dan2.register(url, params, init_callback)`

- url (`string`): IoTtalk 2.0 server.
- param (`object`):
    - port (`number`, optional): MQTT websocket server's port. Default set to 1994.
    - id (`string`, optional): Your app uuid. Randomly generate one if not given.
    - on_signal (`function`): Invoked when receiving control signal from server. More detail are described at below.
    - on_data (`function`): Invoked when odf data coming. More detail are described at below.
    - idf_list (`array`, optional): list of idf description. ex: `[['Position', ['lat', 'long']]]`. Skip this field if you don't have. __Empty list will get 403 error__.
    - odf_list (`array`, optional): list of odf description. ex: `[['Meow', ['dB']]]`. Skip this field if you don't have. __Empty list will get 403 error__.
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

### `dan2.push(idf_name, data)`

- idf_name (`string`): Name of outgoing idf data.
- data: Data of the idf.

## Development

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
