### Installations instructions for the Corelink Server

# Clone the repository and go into repository folder
```bash
git clone https://dev.nyu-x.org/holodeck/networktest.git
cd networktest
```

# Install dependencies and fix potential bugs
```bash
npm install
npm audit fix
```

# Install dependencies
```bash
npm install
```

# Enable config file for the database
```bash
cd server/config/
mv knexfile.js.sample knexfile.js
```

# Create database with latest tables
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:up
```

# Seed database with basic data

> `Warning: All existing data inside the database will be deleted.`

```bash
cd server/config
node ../../node_modules/knex/bin/cli.js seed:run
```

# Start server
```bash
cd server
node corelink.js
```

### Upgrade instructions for the Corelink Server

# Pull latest version
```bash
cd networktest
git pull
```

# Update database to latest table version 
```bash
cd server/config
node ../../node_modules/knex/bin/cli.js migrate:up
```
