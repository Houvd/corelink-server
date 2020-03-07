const environment = process.env.ENVIRONMENT || 'development'
const config = require('../config/knexfile.js')[environment]
module.exports = require('knex')(config)
