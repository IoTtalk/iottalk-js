#!/bin/sh

TOPIC='iottalk/api/req/gui/graph/1'
DA_ID='df682f01-7c3a-49fd-8f5f-72ce0b6e68c0'

IDF_FUNC='def run(x): return int(x)\\n'
IDF_FUNC_SIG='f87d5c678bdd9e4b1b5f278c29cdf9a0fd01198060d8c6f3a34a6a05ae536e50'

JOIN_FUNC='def run(x): return x ** 2\\n'
JOIN_FUNC_SIG='70e3d32f1c6abde67d607e3ce77dc286ecf5d0f42fcd18e6336fac5e19a6e07c'


alias pub="mosquitto_pub -h 192.168.1.2 -t $TOPIC"

pub -m '{"op": "attach"}'

ADD_FUNC='{"op":"add_funcs", "codes":["'$IDF_FUNC'","'$JOIN_FUNC'"], "digests":["'$IDF_FUNC_SIG'", "'$JOIN_FUNC_SIG'"]}'

echo "$ADD_FUNC" | pub -l

pub -m '{"op": "add_link", "da_id": "'$DA_ID'", "idf": "meow", "func": "'$IDF_FUNC_SIG'"}'

pub -m '{"op": "add_link", "da_id": "'$DA_ID'", "odf": "meow", "func": null}'

pub -m '{"op": "set_join", "prev": null, "new": "'$JOIN_FUNC_SIG'"}'
