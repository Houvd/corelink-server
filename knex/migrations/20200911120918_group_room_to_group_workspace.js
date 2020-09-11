exports.up = (knex) => knex.schema.renameTable('group_room', 'group_workspace')

exports.down = (knex) => knex.schema.renameTable('group_workspace', 'group_room')
