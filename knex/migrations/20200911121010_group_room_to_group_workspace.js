
exports.up = (knex) => knex.schema.table('group_workspace', (table) => {
  table.renameColumn('room_id', 'workspace_id')
})

exports.down = (knex) => knex.schema.table('group_workspace', (table) => {
  table.renameColumn('workspace_id', 'room_id')
})
