exports.up = (knex) => knex.schema.table('groups', (table) => {
    table.renameColumn('groupname', 'group_name')
  })
  
  exports.down = (knex) => knex.schema.table('groups', (table) => {
    table.renameColumn('group_name', 'groupname')
  })