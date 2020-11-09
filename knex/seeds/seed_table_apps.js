exports.seed = (knex) => knex('apps')
  // Deletes ALL existing entries
  .del()
  // Inserts seed entries
  .then(() => knex('apps').insert([
    {
      id: 0,
      owner_id: 1,
      app_name: 'LogStream',
      description: 'Provides one stream with the current log data of the server',
      token: '!log',
    },
    {
      id: 1,
      owner_id: 1,
      app_name: 'Test App',
      description: 'Example plugin',
      token: '!dfshdgs',
    },
    {
      id: 2,
      owner_id: 1,
      app_name: 'Vive Avatar',
      description: 'Converting 3 point vive avatar to skeleton',
      token: '!kljhkl',
    },
    {
      id: 3,
      owner_id: 1,
      app_name: 'Hanging out on the Holodeck',
      description: 'Quest 2 person experience in 3 different workspaces',
      token: '!gfhdgh',
    },
  ]))
