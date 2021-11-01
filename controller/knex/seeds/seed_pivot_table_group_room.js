exports.seed = (knex) => knex('group_workspace')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('group_workspace').insert([
    {
      id: 1,
      owner_id: 1,
      group_id: 1,
      workspace_id: 1,
    },
    {
      id: 2,
      owner_id: 1,
      group_id: 2,
      workspace_id: 2,
    },
    {
      id: 3,
      owner_id: 1,
      group_id: 3,
      workspace_id: 3,
    },
  ]))
