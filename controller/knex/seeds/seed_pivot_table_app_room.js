exports.seed = (knex) => knex('app_workspace')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('app_workspace').insert([
    {
      id: 0,
      owner_id: 1,
      app_id: 0,
      workspace_id: 0,
    },
    {
      id: 1,
      owner_id: 1,
      app_id: 1,
      workspace_id: 1,
    },
    {
      id: 2,
      owner_id: 1,
      app_id: 2,
      workspace_id: 1,
    },
    {
      id: 3,
      owner_id: 1,
      app_id: 3,
      workspace_id: 1,
    },
  ]))
