import DeviceFeature from './device-feature';
import { Client } from './dan';
import { RegistrationError, ArgumentError } from './exceptions';

export default class {
  constructor(option) {
    this.apiUrl = option.apiUrl;
    this.deviceModel = option.deviceModel;
    this.deviceAddr = option.deviceAddr;
    this.deviceName = option.deviceName;
    this.persistentBinding = option.persistentBinding || false;
    this.username = option.username;
    this.extraSetupWebpage = option.extraSetupWebpage || '';
    this.deviceWebpage = option.deviceWebpage || '';

    this.onRegister = option.onRegister;
    this.onDeregister = option.onDeregister;
    this.onConnect = option.onConnect;
    this.onDisconnect = option.onDisconnect;

    this.pushInterval = option.pushInterval !== undefined ? option.pushInterval : 1;
    this.interval = option.interval || {};

    this.device_features = {};
    this.flags = {};

    this.onSignal = this.onSignal.bind(this);
    this.onData = this.onData.bind(this);

    this.parseDFProfile(option, 'idf');
    this.parseDFProfile(option, 'odf');
  }

  pushData(DFName) {
    if (this.device_features[DFName].pushData == null) return;
    const interval = this.interval[DFName] !== undefined
      ? this.interval[DFName] : this.pushInterval;
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

    if (this.persistentBinding && !this.deviceAddr) {
      throw new ArgumentError('In case of `persistentBinding` set to `True`, '
                + 'the `deviceAddr` should be set and fixed.');
    }

    if (Object.keys(this.device_features).length === 0) throw new RegistrationError('Neither idfList nor odfList is empty.');
  }

  run() {
    this.checkParameters();

    this.dan = new Client();

    const idfList = [];
    const odfList = [];

    Object.entries(this.device_features).forEach(([DFName, df]) => {
      if (df.DFType === 'idf') {
        idfList.push([DFName, df.DFType]);
      } else {
        odfList.push([DFName, df.DFType]);
      }
    });

    const option = {
      url: this.apiUrl,
      onSignal: this.onSignal,
      onData: this.onData,
      acceptProtos: ['mqtt'],
      id: this.deviceAddr,
      idfList,
      odfList,
      name: this.deviceName,
      profile: {
        model: this.deviceModel,
        u_name: this.username,
        extra_setup_webpage: this.extraSetupWebpage,
        device_webpage: this.deviceWebpage,
      },
      onRegister: this.onRegister,
      onDeregister: this.onDeregister,
      onConnect: this.onConnect,
      onDisconnect: () => {
        Object.keys(this.flags).forEach((i) => { this.flags[i] = false; });
        console.debug(`onDisconnect: _flag = ${this.flags}`);
        if (this.onDisconnect) {
          this.onDisconnect();
        }
      },
    };

    this.dan.register(option);

    // FIXME: window is not defined in node.js
    // eslint-disable-next-line func-names
    window.onbeforeunload = function () {
      try {
        if (!this.persistentBinding) {
          this.dan.deregister();
        }
      } catch (error) {
        console.error(`dai process cleanup exception: ${error}`);
      }
    };
  }

  parseDFProfile(option, typ) {
    const DFList = `${typ}List`;
    if (option[DFList] === undefined) return;

    option[DFList].forEach((x) => {
      let DFName;
      let paramType;
      let onData;
      let pushData;

      if (!Array.isArray(x)) { // `[idf]` or `[idfFunc]`
        if (typeof x === 'string') {
          DFName = x;
          onData = null;
          pushData = null;
        } else { // in case of callable
          DFName = this.constructor.DFNameFromFunc(x.name);
          onData = x;
          pushData = x;
        }
        paramType = null;
      } else if (Array.isArray(x) && x.length === 2) {
        if (typeof x[0] === 'string') {
          [DFName, paramType] = x;
          onData = null;
          pushData = null;
        } else {
          DFName = this.constructor.DFNameFromFunc(x[0].name);
          [onData, paramType] = x;
          [pushData] = x;
        }
      } else {
        throw new RegistrationError(`Invalid ${DFList}, usage: [dfFunc, ...] or [[dfFunc, type], ...]`);
      }

      const df = new DeviceFeature({
        DFName,
        DFType: typ,
        paramType,
        pushData,
        onData,
      });

      this.device_features[DFName] = df;
    });
  }
}
