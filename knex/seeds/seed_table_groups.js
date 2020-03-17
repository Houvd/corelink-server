exports.seed = (knex) => knex('groups')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('groups').insert([
    {
      id: 1,
      owner_id: 1,
      groupname: 'Holodeck',
    },
    {
      id: 2,
      owner_id: 1,
      groupname: 'Chalktalk',
    },
  ]))
