#!/bin/sh
set -eu

cd /app

# Keep dev startup resilient when bind-mounts or empty named volumes drop node_modules.
if [ ! -f /app/node_modules/next/dist/bin/next ]; then
  echo "[frontend] 'next' not found, hydrating node_modules from image cache..."

  SRC_NODE_MODULES="/opt/devdeps/node_modules"
  if [ ! -d "$SRC_NODE_MODULES" ]; then
    SRC_NODE_MODULES="/opt/node_modules"
    if [ -d /opt/node_modules/node_modules ] && [ ! -d /opt/node_modules/next ]; then
      SRC_NODE_MODULES="/opt/node_modules/node_modules"
    fi
  fi

  mkdir -p /app/node_modules
  # Ensure stale/incomplete content does not break symlink copies.
  rm -rf /app/node_modules/*
  cp -a "${SRC_NODE_MODULES}/." /app/node_modules/
fi

if [ ! -f /app/node_modules/next/dist/bin/next ]; then
  echo "[frontend] ERROR: next is still missing after cache hydration."
  exit 1
fi

# Launch through node to avoid shell exec-bit/path issues on mounted volumes.
exec node /app/node_modules/next/dist/bin/next dev -H 0.0.0.0 -p 3000
