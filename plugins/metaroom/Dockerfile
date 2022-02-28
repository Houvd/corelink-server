FROM docker.io/node

RUN apt update -y && apt install mc htop net-tools git -y
ADD hangingHolodeckPlugin.js /app/
ADD config.json /app/
ADD corelink.lib.js app/
WORKDIR /app/
RUN cd /app &&  npm install underscore math3d promise-socket
RUN sed -i 's/127.0.0.1/10.0.1.200/g' config.json
RUN sed -i 's/..\/..\/..\/config\/configure/.\/config.json/g' /app/hangingHolodeckPlugin.js 
RUN sed -i 's/..\/..\/..\/lib\/corelink.lib/.\/corelink.lib/g' /app/hangingHolodeckPlugin.js

CMD node hangingHolodeckPlugin.js
