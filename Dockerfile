FROM node:12.18.4-alpine
WORKDIR /usr/src/app
RUN apk --no-cache add \
  bash \
  nano
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000
# CMD [ "node", "dummy-app.js" ]
CMD [ "node", "app.js" ]