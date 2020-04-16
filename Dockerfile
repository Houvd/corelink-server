FROM docker.io/node

RUN apt update -y && apt install mc htop net-tools git -y
ADD config/ /app/config/
ADD knex/ /app/knex/
ADD corelink.js /app/
RUN touch /app/dockerlog
WORKDIR /app/
RUN cd /app && npm install ws config https knex sqlite3


#ADD shell.sh /shell.sh
#RUN chmod 777 /shell.sh

EXPOSE 20010/tcp 20011/udp 20011/tcp 20012/tcp 20013/tcp 80/tcp 443/tcp
CMD node corelink.js
#CMD /shell.sh
#CMD node --version
