FROM node:12.18.4-alpine
WORKDIR /usr/src/app
RUN apk --no-cache add \
  bash \
  nano
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 8000
EXPOSE 47128
EXPOSE 47129
EXPOSE 47130
EXPOSE 47131

# EXPOSE 5353/udp

# CMD [ "node", "dummy-app.js" ]
CMD [ "node", "app.js" ]