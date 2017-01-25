import json
import random

from threading import Thread

import requests

from paho.mqtt.client import Client

host = '140.113.123.218'
debugcat_id = 'fbb5368a-ab6a-4504-b7bb-4ed9a372a3d7'
debugcat = {
    'name': 'DebugCat',
    'odf_list': [
        ['meowA', ['dB']],
        ['meowG', ['dB']],
        ['meowO', ['dB']],
    ],
    'accept_protos': ['mqtt'],
}

response = requests.put(
    'http://{}:9992/{}'.format(host, debugcat_id),
    headers={'Content-Type': 'application/json'},
    json=debugcat)

assert response.status_code == 200

response = response.json()

uplink_topic, downlink_topic = response['ctrl_chans']
revision = response['rev']  # the token of online/offline msg


def on_connect(client, userdata, return_code):
    print('[on_message]')
    print('=============================================================')
    client.publish(
        uplink_topic,
        json.dumps({
            'state': 'online',
            'rev': revision,
        }),
        retain=True)

    client.subscribe(downlink_topic)


def on_message(client, userdata, msg):
    payload = json.loads(msg.payload.decode())
    print('[on_message]')
    print('\t payload', payload)
    print('=============================================================')

    if not isinstance(payload, dict) or 'command' not in payload:
        return

    if payload['command'] == 'CONNECT' and payload.get('odf'):
        print('subscribe', payload['topic'])
        client.subscribe(payload['topic'])

    payload['state'] = 'ok'
    client.publish(uplink_topic, json.dumps(payload))


client = Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(host, port=1883)
client.loop_forever()
