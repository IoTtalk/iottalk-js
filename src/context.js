import ChannelPool from './channel-pool';

export default class {
  constructor() {
    this.url = null;
    this.app_id = null;
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
    this.on_data = null;
    this.on_register = null;
    this.on_deregister = null;
    this.on_connect = null;
    this.on_disconnect = null;
  }
}
