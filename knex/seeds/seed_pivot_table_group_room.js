exports.seed = (knex) => knex('group_room')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('group_room').insert([
    {
      id: 1,
      owner_id: 1,
      group_id: 1,
      room_id: 1,
    },
    {
      id: 2,
      owner_id: 1,
      group_id: 2,
      room_id: 2,
    },
  ]))
