#!/bin/sh

PUID=${PUID:-1000}
PGID=${PGID:-100}

echo "Starting with PUID=$PUID and PGID=$PGID"

# Create group and user with specified IDs if they don't exist
addgroup -g "$PGID" appgroup 2>/dev/null || true
adduser -D -u "$PUID" -G appgroup appuser 2>/dev/null || true

# Fix ownership of data directory
chown -R appuser:appgroup /app/data

# Run the app as the specified user
exec su-exec appuser "$@"
