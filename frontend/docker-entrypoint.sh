#!/bin/sh
set -e

# HTML環境変数プレースホルダを実際の環境変数で置換
if [ -f "/app/public/index.html.template" ]; then
  cp /app/public/index.html.template /app/public/index.html
else
  cp /app/public/index.html /app/public/index.html.template
fi

# 環境変数を置換
sed -i "s|%REACT_APP_API_URL%|${REACT_APP_API_URL:-http://backend:8000}|g" /app/public/index.html
sed -i "s|%REACT_APP_WS_URL%|${REACT_APP_WS_URL:-http://websocket:8001}|g" /app/public/index.html
sed -i "s|%NODE_ENV%|${NODE_ENV:-development}|g" /app/public/index.html

echo "frontend環境変数:"
echo "NODE_ENV: ${NODE_ENV}"
echo "REACT_APP_API_URL: ${REACT_APP_API_URL:-http://backend:8000}"
echo "REACT_APP_WS_URL: ${REACT_APP_WS_URL:-http://websocket:8001}"

# 引数のコマンドを実行
exec "$@"