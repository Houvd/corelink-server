
exports.up = (knex) => knex.schema.table('targets', (table) => {
  table.renameColumn('room_id', 'workspace_id')
})

exports.down = (knex) => knex.schema.table('targets', (table) => {
  table.renameColumn('workspace_id', 'room_id')
})
