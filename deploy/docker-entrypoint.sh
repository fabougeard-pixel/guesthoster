#!/bin/sh
set -e

mkdir -p \
    /tmp/caddy-data \
    /tmp/caddy-config \
    /tmp/storage/app/private \
    /tmp/storage/app/public \
    /tmp/storage/framework/cache/data \
    /tmp/storage/framework/sessions \
    /tmp/storage/framework/testing \
    /tmp/storage/framework/views \
    /tmp/storage/logs

exec "$@"

