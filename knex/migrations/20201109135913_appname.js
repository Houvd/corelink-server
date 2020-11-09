exports.up = (knex) => knex.schema.table('apps', (table) => {
    table.renameColumn('appname', 'app_name')
  })
  
  exports.down = (knex) => knex.schema.table('apps', (table) => {
    table.renameColumn('app_name', 'appname')
  })