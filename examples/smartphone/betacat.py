import json
import random

from threading import Thread

import requests

from paho.mqtt.client import Client

betacat_id = 'df682f01-7c3a-49fd-8f5f-72ce0b6e68c0'
betacat = {
    'name': 'BetaCat',
    'idf_list': [['meow', ['dB']]],
    'odf_list': [['meow', ['dB']]],
    'accept_protos': ['mqtt'],
}

response = requests.put(
    'http://192.168.1.2:9992/{}'.format(betacat_id),
    headers={'Content-Type': 'application/json'},
    json=betacat)

assert response.status_code == 200

response = response.json()

uplink_topic, downlink_topic = response['ctrl_chans']
revision = response['rev']  # the token of online/offline msg


def on_connect(client, userdata, return_code):
    print('[on_message]')
    print('\t userdata', userdata)
    print('\t return_code', return_code)
    client.publish(
        uplink_topic,
        json.dumps({
            'state': 'online',
            'rev': revision,
        }),
        retain=True)

    client.subscribe(downlink_topic)


def rnd_gen(client, topic):
    print('rnd_gen idf topic:', topic)
    while True:
        p = client.publish(topic, int(random.random()*100))
        p.wait_for_publish()


def on_message(client, userdata, msg):
    payload = json.loads(msg.payload.decode())
    print('[on_message]')
    print('\t payload', payload)

    if payload['command'] == 'CONNECT' and payload.get('idf'):
        print('start rnd_gen')
        t = Thread(target=rnd_gen, args=(client, payload['topic']))
        t.daemon = True
        t.start()

        # reponse of `CONNECT`
        payload['state'] = 'ok'
        client.publish(uplink_topic, json.dumps(payload))

    elif payload['command'] == 'CONNECT' and payload.get('odf'):
        print('subscribe', payload['topic'])
        client.subscribe(payload['topic'])

    elif payload['command'] == 'DISCONNECT':
        pass


client = Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect('192.168.1.2', port=1883)
client.loop_forever()
