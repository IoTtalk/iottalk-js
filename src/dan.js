import request from 'request-promise';
import Paho from 'paho-mqtt';
import uuid from './uuid.js';
import ChannelPool from './ChannelPool.js';

let i_channel = new ChannelPool();
let o_channel = new ChannelPool();

i_channel.add('ctrl', 'good');
console.log(i_channel.topic('ctrl'));
console.log(i_channel.topic('good'));
