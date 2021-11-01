const fs = require('fs')
const path = require('path')

const knexpath = path.join(__dirname, '../config/knexfile.js')

const environment = process.env.ENVIRONMENT || 'development'
if (!fs.existsSync(knexpath)) {
  fs.copyFileSync(`${knexpath}.sample`, knexpath)
}
// eslint-disable-next-line import/no-dynamic-require
const config = require(knexpath)[environment]
module.exports = require('knex')(config)
