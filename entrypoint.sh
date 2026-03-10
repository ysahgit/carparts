#!/bin/sh

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting with PUID=$PUID and PGID=$PGID"

# Create group if it doesn't exist
if ! getent group "$PGID" > /dev/null 2>&1; then
  addgroup -g "$PGID" appgroup
fi

# Create user if it doesn't exist
if ! getent passwd "$PUID" > /dev/null 2>&1; then
  adduser -D -u "$PUID" -G "$(getent group $PGID | cut -d: -f1)" appuser
fi

# Fix ownership of data directory
chown -R "$PUID:$PGID" /app/data

# Run as the specified UID/GID directly
exec su-exec "$PUID:$PGID" "$@"