exports.seed = (knex) => knex('group_app')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('group_app').insert([
    {
      id: 1,
      owner_id: 1,
      group_id: 1,
      app_id: 1,
    },
    {
      id: 2,
      owner_id: 1,
      group_id: 1,
      app_id: 2,
    },
    {
      id: 3,
      owner_id: 1,
      group_id: 1,
      app_id: 3,
    },
  ]))
