exports.seed = (knex) => knex('workspaces')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('workspaces').insert([
    {
      id: 0,
      owner_id: 1,
      workspace_name: 'Log',
    },
    {
      id: 1,
      owner_id: 1,
      workspace_name: 'Holodeck',
    },
    {
      id: 2,
      owner_id: 1,
      workspace_name: 'Chalktalk',
    },
    {
      id: 3,
      owner_id: 1,
      workspace_name: 'Infinite',
    },
  ]))
