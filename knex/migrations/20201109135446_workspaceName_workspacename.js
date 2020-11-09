
exports.up = (knex) => knex.schema.table('workspaces', (table) => {
    table.renameColumn('workspaceName', 'workspace_name')
  })
  
  exports.down = (knex) => knex.schema.table('workspaces', (table) => {
    table.renameColumn('workspace_name', 'workspaceName')
  })