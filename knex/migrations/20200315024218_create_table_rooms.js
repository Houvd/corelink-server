exports.up = (knex) => knex.schema.createTable('rooms', (table) => {
  table.increments()
  table.integer('owner_id').notNullable().unsigned()
  table.foreign('owner_id').references('id').inTable('users')
    .onUpdate('CASCADE')
    .onDelete('RESTRICT')
  table.string('roomname').notNullable()
  table.unique('roomname')
  table.timestamp('created_at').default(knex.fn.now())
  table.timestamp('updated_at').default(knex.fn.now())
})

exports.down = (knex) => knex.schema.dropTable('rooms')
