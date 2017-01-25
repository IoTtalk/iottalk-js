#!/bin/sh

HOST='140.113.123.218'
SEQ='77'
PUB_TOPIC='iottalk/api/req/gui/graph/'$SEQ
SUB_TOPIC='iottalk/api/res/gui/graph/'$SEQ
DEBUGCAT_DA_ID='fbb5368a-ab6a-4504-b7bb-4ed9a372a3d7'
SMARTPHONE_DA_ID='d72d6b4d-e5ef-4bd7-a37f-e63ee97f96ea'

JOIN_FUNC='def run(x): return x\\n'
JOIN_FUNC_SIG='defd11b9c5d9b6cee6370d4012011b03ebee186c13379b517aba972489be1c6e'

alias pub="mosquitto_pub -h $HOST -t $PUB_TOPIC"
alias sub="mosquitto_sub -h $HOST -t $SUB_TOPIC"

sub &

sleep 1

pub -m '{"op": "attach"}'

ADD_FUNC='{"op":"add_funcs", "codes":["'$JOIN_FUNC'"], "digests":["'$JOIN_FUNC_SIG'"]}'
echo "$ADD_FUNC" | pub -l

pub -m '{"op": "add_link", "da_id": "'$DEBUGCAT_DA_ID'", "odf": "meowA", "func": null}'

pub -m '{"op": "add_link", "da_id": "'$SMARTPHONE_DA_ID'", "idf": "Acceleration", "func": null}'

pub -m '{"op": "set_join", "prev": null, "new": "'$JOIN_FUNC_SIG'"}'

sleep 1
kill %1
