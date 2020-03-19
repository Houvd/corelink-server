# Installations instructions for the Corelink Server

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
node ../../node_modules/knex/bin/cli.js migrate:up
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

# Upgrade instructions for the Corelink Server

### Pull latest version
```bash
cd networktest
git pull
```

### Update database to latest table version 
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:up
```
# Upgrade instructions for the Corelink Server DURING DEVELOPMENT
run the rollback until you are at the beginning of the migrations
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:rollback
```
then migrate and seed
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:latest
node ../../node_modules/knex/bin/cli.js seed:run
```


