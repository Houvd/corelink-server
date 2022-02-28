exports.seed = (knex) => knex('groups')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('groups').insert([
    {
      id: 1,
      owner_id: 1,
      group_name: 'Holodeck',
    },
    {
      id: 2,
      owner_id: 1,
      group_name: 'Chalktalk',
    },
    {
      id: 3,
      owner_id: 1,
      group_name: 'Infinite',
    },
  ]))
