# corelink-server

=======
# Installations instructions for the Corelink Server

### Required Software
- Git
- NodeJS (please install the current version and enable compilation support)
- Python (required by NPM)

### Clone the repository and go into repository folder
```bash
git clone https://dev.nyu-x.org/holodeck/networktest.git
cd networktest
```

### Install dependencies and fix potential bugs
```bash
npm install
npm audit fix
```

### Enable config file for the database
Linux/Mac:
```bash
cd server/config/
cp knexfile.js.sample knexfile.js
```

Windows:
```
cd server\config\
copy knexfile.js.sample knexfile.js
```



### Create database with latest tables
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:latest
```

### Seed database with basic data

> `Warning: All existing data inside the database will be deleted.`

```bash
cd server/config
node ../../node_modules/knex/bin/cli.js seed:run
```

### Start server
```bash
cd server
node corelink.js
```

### Test sending and receiving packages

After starting the server the sender and receiver scripts can be used to test the server
In separate terminals next to the server start both applications.
First start the sender:
```bash
cd tools/sender
node senderUDP-lib.js
```
When the sender starts the first time it will ask for the IP address to connect to the server. In this example use 127.0.0.1, then press enter twice to use the preset username and password.

Then start the listener:
```bash
cd tools/listener
node listenerUDP-lib.js
```
It should not ask for the IP adresses again. Just press enter twice to start the appliaction.


# Upgrade instructions for the Corelink Server

### Pull latest version
```bash
cd networktest
git pull
```

### Update database to latest table version 
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:latest
```

# Upgrade instructions for the Corelink Server DURING DEVELOPMENT
simply run from within networktest
> `Warning: All existing data inside the database will be deleted.`
```bash
npm run devinstall
```

you can also use separate commands to do the migrations:
run the rollback until you are at the beginning of the migrations
> `Warning: All existing data inside the database will be deleted.`
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:rollback
```

then migrate and seed
> `Warning: All existing data inside the database will be deleted.`
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:latest
node ../../node_modules/knex/bin/cli.js seed:run
```