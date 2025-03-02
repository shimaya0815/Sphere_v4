FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# 依存関係のインストール時にピア依存関係の警告を無視
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "start"]