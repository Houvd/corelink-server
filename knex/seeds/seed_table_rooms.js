exports.seed = (knex) => knex('rooms')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('rooms').insert([
    {
      id: 0,
      owner_id: 1,
      roomname: 'Log',
    },
    {
      id: 1,
      owner_id: 1,
      roomname: 'Holodeck',
    },
    {
      id: 2,
      owner_id: 1,
      roomname: 'Chalktalk',
    },
    {
      id: 3,
      owner_id: 1,
      roomname: 'Infinite',
    },
  ]))
