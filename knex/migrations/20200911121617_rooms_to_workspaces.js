exports.up = (knex) => knex.schema.renameTable('rooms', 'workspaces')

exports.down = (knex) => knex.schema.renameTable('workspaces', 'rooms')
