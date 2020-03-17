exports.seed = (knex) => knex('apps')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('apps').insert([
    {
      id: 1,
      owner_id: 1,
      appname: 'Test App',
      description: 'Example plugin',
      token: '!dfshdgs',
    },
    {
      id: 2,
      owner_id: 1,
      appname: 'Vive Avatar',
      description: 'Converting 3 point vive avatar to skeleton',
      token: '!kljhkl',
    },
    {
      id: 3,
      owner_id: 1,
      appname: 'Hanging out on the Holodeck',
      description: 'Quest 2 person experience in 3 different rooms',
      token: '!gfhdgh',
    },
  ]))
