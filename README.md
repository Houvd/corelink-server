### Installations instructions for the Corelink Server

# Install dependencies
```bash
npm install
```

# Create database with latest 
```bash
cd config
node ../../node_modules/knex/bin/cli.js migrate:up
```

# Seed database with basic data
!Important: All existing data inside the database will be deleted
```bash
cd config
node ../../node_modules/knex/bin/cli.js seed:run
```
