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

if [ "${RUN_MIGRATIONS:-true}" = "true" ] && [ "${DB_CONNECTION:-pgsql}" = "pgsql" ] && { [ -n "${DB_URL:-}" ] || [ -n "${DB_HOST:-}" ]; }; then
    php artisan app:bootstrap-database --no-interaction || true
fi

exec "$@"

