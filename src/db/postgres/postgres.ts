import { Pool, QueryResult } from 'pg'

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  idleTimeoutMillis: 30000,
  port: Number(process.env.POSTGRES_PORT)
})

pool.on('error', (err: Error) => {
  console.error('idle client error', err.message, err.stack)
})

const query = (plainSQL: string, params: string[]): Promise<QueryResult> =>
  pool.query(plainSQL, params)

export { pool, query }
