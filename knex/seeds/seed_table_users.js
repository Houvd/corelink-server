
exports.seed = (knex) => knex('users')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('users').insert([
    {
      id: 1,
      username: 'admin',
      password: 'x',
      salt: 'x',
      email: 'admin@example.com',
      first: 'admin',
      last: 'admin',
      admin: true,
    },
  ]))
