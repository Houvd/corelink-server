
exports.up = (knex) => knex.schema.createTable('users', (table) => {
  table.increments()
  table.string('username').notNullable()
  table.unique('username')
  table.string('password').notNullable()
  table.string('salt').notNullable()
  table.string('email').notNullable()
  table.unique('email')
  table.string('first').notNullable()
  table.string('last').notNullable()
  table.boolean('admin').default(false)
  table.timestamp('created_at').default(knex.fn.now())
  table.timestamp('updated_at').default(knex.fn.now())
})

exports.down = (knex) => knex.schema.dropTable('users')
