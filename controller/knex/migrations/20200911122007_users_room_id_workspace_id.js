
exports.up = (knex) => knex.schema.table('users', (table) => {
  table.renameColumn('room_id', 'workspace_id')
})

exports.down = (knex) => knex.schema.table('users', (table) => {
  table.renameColumn('workspace_id', 'room_id')
})
