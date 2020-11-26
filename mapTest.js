const crypto = require('crypto')
const dgram = require('dgram')
const net = require('net')
const Ws = require('ws').Server
const fs = require('fs')
const https = require('https')
const httpStatic = require('node-static')
const { where, reject } = require('underscore')
const config = require('./config/configure')
const knex = require('./knex/knex.js')

async function run() {
  async function results() {
    const content = await knex('users')
      .select({
        userId: 'id',
        username: 'username',
      })
      .orderBy('id')
      .catch((err) => console.log(err))
    console.log(content[0].username)
  }

  await results()
  process.exit()
}

run()
