import ChannelPool from './channel-pool';

export default class {
  constructor() {
    this.url = null;
    this.appID = null;
    this.name = null;
    this.mqttHost = null;
    this.mqttPort = null;
    this.mqttUsername = null;
    this.mqttPassword = null;
    this.mqttClient = null;
    this.IChans = new ChannelPool(); // input channel
    this.OChans = new ChannelPool(); // output channel
    this.rev = null;
    this.onSignal = null;
    this.onData = null;
    this.onRegister = null;
    this.onDeregister = null;
    this.onConnect = null;
    this.onDisconnect = null;
  }
}
