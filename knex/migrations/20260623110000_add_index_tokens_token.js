exports.up = async (knex) => {
  await knex.schema.alterTable('tokens', (table) => {
    table.index(['token'], 'tokens_token_idx')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('tokens', (table) => {
    table.dropIndex(['token'], 'tokens_token_idx')
  })
}
