// Upgrade existing SQLite databases without resetting users or workspaces.
const fs = require('fs')
const path = require('path')
const environment = process.env.ENVIRONMENT || 'development'
const config = require('../config/knexfile')[environment]
if (!config || config.client !== 'sqlite3' || typeof config.connection.filename !== 'string') {
  throw new Error('Automatic setup supports SQLite only; migrate other database backends explicitly.')
}
const filename = config.connection.filename
const existing = fs.existsSync(filename)
if (existing) {
  const backup = `${filename}.backup-${Date.now()}`
  // With the server stopped, preserve the database and any remaining WAL files.
  for (const suffix of ['', '-wal', '-shm']) {
    if (fs.existsSync(filename + suffix)) fs.copyFileSync(filename + suffix, backup + suffix)
  }
  console.log(`Existing database backed up to ${backup}; seeds will not run.`)
} else {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
}
const knex = require('knex')(config)
async function main() {
  try {
    await knex.migrate.latest()
    if (!existing) {
      await knex.seed.run()
      console.log('New database initialized with the upstream example users/workspaces.')
    }
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await knex.destroy()
  }
}
main()
