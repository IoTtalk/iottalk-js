import ChannelPool from './channel-pool';

export default class {
  constructor() {
    this.url = null;
    this.appID = null;
    this.name = null;
    this.mqtt_host = null;
    this.mqtt_port = null;
    this.mqtt_username = null;
    this.mqtt_password = null;
    this.mqtt_client = null;
    this.i_chans = new ChannelPool();
    this.o_chans = new ChannelPool();
    this.rev = null;
    this.onSignal = null;
    this.onData = null;
    this.onRegister = null;
    this.onDeregister = null;
    this.onConnect = null;
    this.onDisconnect = null;
  }
}
