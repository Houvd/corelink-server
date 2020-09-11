exports.up = (knex) => knex.schema.renameTable('app_room', 'app_workspace')

exports.down = (knex) => knex.schema.renameTable('app_workspace', 'app_room')
