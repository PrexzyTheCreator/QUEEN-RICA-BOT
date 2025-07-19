FROM node:lts-buster

RUN apt-get update && \
apt-get install -y \
ffmpeg \
imagemagick \
webp && \
apt-get upgrade -y && \
npm i pm2 -g && \
rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/PrexzyTheCreator/QUEEN-RICA-BOT_  /root/PrexzyTheCreator
WORKDIR /root/PrexzyTheCreator/

COPY package.json .
RUN npm install pm2 -g
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 7860

CMD ["npm","start" ]