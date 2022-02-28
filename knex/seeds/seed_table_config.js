exports.seed = (knex) => knex('config')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('config').insert([
    {
      id: 0,
      app_id: null,
      user_id: null,
      updated_by_id: 1,
      name: 'debug',
      description: 'Debug setting for the server.',
      context: 'global',
      type: 'boolean',
      value: 'false',
    },
  ]))
