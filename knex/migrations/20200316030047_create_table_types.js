exports.up = (knex) => knex.schema.createTable('types', (table) => {
  table.increments()
  table.string('type_name').notNullable()
  table.timestamp('created_at').default(knex.fn.now())
  table.timestamp('updated_at').default(knex.fn.now())
})

exports.down = (knex) => knex.schema.dropTable('types')
