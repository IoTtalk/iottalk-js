import DeviceFeature from './device-feature';
import { Client } from './dan';
import { RegistrationError, ArgumentError } from './exceptions';

export default class {
  constructor(option) {
    this.apiUrl = option.apiUrl;
    this.deviceModel = option.deviceModel;
    this.device_addr = option.device_addr;
    this.device_name = option.device_name;
    this.persistent_binding = option.persistent_binding || false;
    this.username = option.username;
    this.extra_setup_webpage = option.extra_setup_webpage || '';
    this.device_webpage = option.device_webpage || '';

    this.register_callback = option.register_callback;
    this.on_register = option.on_register;
    this.on_deregister = option.on_deregister;
    this.on_connect = option.on_connect;
    this.on_disconnect = option.on_disconnect;

    this.push_interval = option.push_interval !== undefined ? option.push_interval : 1;
    this.interval = option.interval || {};

    this.device_features = {};
    this.flags = {};

    this.onSignal = this.onSignal.bind(this);
    this.onData = this.onData.bind(this);

    this.parse_df_profile(option, 'idf');
    this.parse_df_profile(option, 'odf');
  }

  pushData(DFName) {
    if (this.device_features[DFName].pushData == null) return;
    const interval = this.interval[DFName] !== undefined ? this.interval[DFName] : this.push_interval;
    console.debug(`${DFName} : ${this.flags[DFName]} [message / ${interval} s]`);
    const pushInterval = setInterval(() => {
      const data = this.device_features[DFName].pushData();
      if (!this.flags[DFName]) {
        clearInterval(pushInterval);
        return;
      }
      if (data === undefined) {
        return;
      }
      this.dan.push(DFName, data);
    }, interval * 1000);
  }

  onSignal(signal, DFList) {
    console.log(`Receive signal: ${signal}, ${DFList}`);
    if (signal === 'CONNECT') {
      DFList.forEach((DFName) => {
        if (this.flags[DFName]) {
          return;
        }
        this.flags[DFName] = true;
        this.pushData(DFName);
      });
    } else if (signal === 'DISCONNECT') {
      DFList.forEach((DFName) => { this.flags[DFName] = false; });
    } else if (signal === 'SUSPEND') {
      // Not use
    } else if (signal === 'RESUME') {
      // Not use
    }
    return true;
  }

  onData(DFName, data) {
    try {
      this.device_features[DFName].onData(data);
    } catch (err) {
      console.error(err);
      return false;
    }
    return true;
  }

  static DFNameFromFunc(DFName) {
    if (DFName.match(/_[A-Z]?(I|O)[0-9]?$/i)) {
      return DFName.replace('_', '-');
    }
    return DFName;
  }

  checkParameters() {
    if (!this.apiUrl) throw new RegistrationError('apiUrl is required.');

    if (!this.deviceModel) throw new RegistrationError('deviceModel not given.');

    if (this.persistent_binding && !this.device_addr) {
      throw new ArgumentError('In case of `persistent_binding` set to `True`, '
                + 'the `device_addr` should be set and fixed.');
    }

    if (Object.keys(this.device_features).length === 0) throw new RegistrationError('Neither idfList nor odfList is empty.');
  }

  run() {
    this.checkParameters();

    this.dan = new Client();

    const idfList = [];
    const odfList = [];

    for (const [DFName, df] of Object.entries(this.device_features)) {
      if (df.df_type === 'idf') idfList.push([DFName, df.df_type]);
      else odfList.push([DFName, df.df_type]);
    }

    const option = {
      url: this.apiUrl,
      onSignal: this.onSignal,
      onData: this.onData,
      accept_protos: ['mqtt'],
      id: this.device_addr,
      idfList,
      odfList,
      name: this.device_name,
      profile: {
        model: this.deviceModel,
        u_name: this.username,
        extra_setup_webpage: this.extra_setup_webpage,
        device_webpage: this.device_webpage,
      },
      register_callback: this.register_callback,
      on_register: this.on_register,
      on_deregister: this.on_deregister,
      on_connect: this.on_connect,
      on_disconnect: () => {
        for (const key in this.flags) {
          this.flags[key] = false;
        }
        console.debug(`on_disconnect: _flag = ${this.flags}`);
        if (on_disconnect) {
          return on_disconnect;
        }
      },
    };

    this.dan.register(option);

    // FIXME: window is not defined in node.js
    window.onbeforeunload = function () {
      try {
        if (!this.persistent_binding) {
          this.dan.deregister();
        }
      } catch (error) {
        console.error(`dai process cleanup exception: ${error}`);
      }
    };
  }

  parse_df_profile(option, typ) {
    const df_list = `${typ}_list`;
    for (let i = 0; i < option[df_list].length; i++) {
      let DFName;
      let param_type;
      let onData;
      let pushData;
      if (!Array.isArray(option[df_list][i])) {
        DFName = this.constructor.DFNameFromFunc(option[df_list][i].name);
        param_type = null;
        onData = pushData = option[df_list][i];
      } else if (Array.isArray(option[df_list][i]) && option[df_list][i].length == 2) {
        DFName = this.constructor.DFNameFromFunc(option[df_list][i][0].name);
        param_type = option[df_list][i][1];
        onData = pushData = option[df_list][i][0];
      } else {
        throw new RegistrationError(`Invalid ${df_list}, usage: [df_func, ...] or [[df_func, type], ...]`);
      }

      const df = new DeviceFeature({
        DFName,
        df_type: typ,
        param_type,
        pushData,
        onData,
      });

      this.device_features[DFName] = df;
    }
  }
}
