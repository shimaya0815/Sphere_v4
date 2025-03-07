FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# 依存関係のインストール時にピア依存関係の警告を無視
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

# 起動前に環境変数を注入するスクリプトを追加
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "start"]