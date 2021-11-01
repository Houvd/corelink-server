process.env.NODE_CONFIG_DIR = __dirname.replace(/\\/g, '/')
const fs = require('fs')

if (!fs.existsSync(`${process.env.NODE_CONFIG_DIR}/default.json5`)) {
  let file = fs.readFileSync(`${process.env.NODE_CONFIG_DIR}/default.json5.sample`).toString()
  file = file.replace(/server-key.pem/g, `${process.env.NODE_CONFIG_DIR}/server-key.pem`)
  file = file.replace(/server-crt.pem/g, `${process.env.NODE_CONFIG_DIR}/server-crt.pem`)
  file = file.replace(/ca-crt.pem/g, `${process.env.NODE_CONFIG_DIR}/ca-crt.pem`)
  fs.writeFileSync(`${process.env.NODE_CONFIG_DIR}/default.json5`, file)
}
const config = require('config')

module.exports = config
