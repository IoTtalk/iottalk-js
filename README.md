# IoTtalk2.0 Javascript SDK

Provide DAN of IoTtalk2.0 and some examples.  


## Docuement

_dan2.js_ provide you with the ability to connect with IoTtalk2.0. The library will export a global variable `window.dan2`. Download it from our github page or save as your local file.
```html
<script src="https://iottalk.github.io/iottalk-js/dan2.js"></script>
```

### dan2.register(url, params, init_callback)
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

#### on_signal
The purpose of each signal is specify at [here](http://iottalk-spec.readthedocs.io/en/latest/protos/res_control_proto.html#control-signal).  
Handler for incoming control signal from server, received two parameter:  
- command (`string`): specify which signal it is. For now, only `CONNECT`, `DISCONNECT` are implemented.
- param (`array`): An array containing parameter for this command. ex: `['Meow']`  

You must ALWAYS return `true` or `[false, 'reason']` indicate the result after handling this signal.  

#### on_data
Handler for incoming odf data signal, received two parameter:  
- odf_name (`string`): Name of incoming odf data.
- data: Data of the odf.

### dan2.push(idf_name, data)
- idf_name (`string`): Name of outgoing idf data.
- data: Data of the idf.

## Development
All source codes of _dan2.js_ are located in directory _src/_. Make sure you have installed `npm`.  
Run `npm install` in order to install dependency.  
Run `webpack` to build _dan2.js_ to _build/dan2.js_.
