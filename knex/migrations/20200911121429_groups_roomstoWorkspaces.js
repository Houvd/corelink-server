
exports.up = (knex) => knex.schema.table('rooms', (table) => {
  table.renameColumn('roomname', 'workspaceName')
})

exports.down = (knex) => knex.schema.table('rooms', (table) => {
  table.renameColumn('workspaceName', 'roomname')
})
