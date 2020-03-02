FROM docker.io/node

RUN apt update -y && apt install mc htop net-tools git -y
ADD corelink.js /app/
WORKDIR /app/
RUN cd /app && npm install ws


EXPOSE 20010/tcp 20011/udp 20011/tcp 20012/tcp 20013/tcp 80/tcp 443/tcp
CMD node corelink.js
#CMD node --version
