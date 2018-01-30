FROM docker.io/node

ADD server.js /app/
WORKDIR /app

EXPOSE 20000/udp
CMD node server.js
