#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  npm install
fi

is_port_open() {
  node -e "const net=require('net'); const socket=net.connect(Number(process.argv[1]), '127.0.0.1'); socket.on('connect', () => process.exit(0)); socket.on('error', () => process.exit(1)); socket.setTimeout(500, () => process.exit(1));" "$1" >/dev/null 2>&1
}

if command -v docker >/dev/null 2>&1; then
  docker compose up -d postgres || true
fi

backend_pid=""

if ! is_port_open 4000; then
  node server/index.js &
  backend_pid=$!
fi

cleanup() {
  if [ -n "$backend_pid" ]; then
    kill "$backend_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if is_port_open 3000; then
  wait
else
  npm start
fi
