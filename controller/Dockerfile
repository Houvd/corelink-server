FROM docker.io/node

RUN apt update -y && apt install mc htop net-tools git -y
ADD config/ /app/config/
ADD knex/ /app/knex/
RUN touch /app/dockerlog
WORKDIR /app/
RUN cd /app && npm install ws config https knex sqlite3 node-static

EXPOSE 20010/tcp 20012/tcp 80/tcp 443/tcp
CMD node corelink-controller.js
ADD corelink-controller.js /app/
#CMD bash -c ?? needs to run continuously
#CMD node --version
