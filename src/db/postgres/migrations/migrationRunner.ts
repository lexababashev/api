import { migrate } from 'postgres-migrations'
import { pool, query } from '../postgres'
import fs from 'fs'

const path = 'src/db/postgres/migrations'

const runMigrations = async () => {
  try {
    console.log('Running migrations...')
    await migrate({ client: pool }, `${path}/migrations-list`)
  } catch (error) {
    console.error('Error running migrations', error)
  } finally {
    console.log('Migrations finished!')
  }
}

const seedTables = async (pathToSQL: string) => {
  if (!pathToSQL) {
    console.error('Path to SQL file is required')
    return
  }
  const files = fs.readdirSync(pathToSQL)
  if (!files.length) {
    console.error('No seed files found in the directory')
    return
  }
  try {
    for (const file of files) {
      const sql = fs.readFileSync(`${pathToSQL}/${file}`, 'utf8')
      await query(sql, [])
    }
  } catch (error) {
    console.error('Error seeding tables', error)
  } finally {
    console.log('Seeding finished!')
  }
}

const run = async () => {
  const env = process.env.ENV
  if (!env) {
    console.error('Environment is required')
    return
  }

  await runMigrations()

  if (env === 'cicd' || env === 'local') {
    await seedTables(`${path}/seeds-test`)
  }
}

run().catch((error) => {
  console.error('Error in migration runner', error)
})
