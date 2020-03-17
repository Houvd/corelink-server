exports.seed = (knex) => knex('app_room')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('app_room').insert([
    {
      id: 1,
      owner_id: 1,
      app_id: 1,
      room_id: 1,
    },
    {
      id: 2,
      owner_id: 1,
      app_id: 2,
      room_id: 1,
    },
    {
      id: 3,
      owner_id: 1,
      app_id: 3,
      room_id: 1,
    },
  ]))
