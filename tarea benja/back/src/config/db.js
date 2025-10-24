const { Pool } = require('pg');

const baseConfig = {
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
};

const poolConfig = Object.fromEntries(
  Object.entries(baseConfig).filter(([key, value]) => {
    if (key === 'password') {
      return value !== undefined;
    }

    return value !== undefined && value !== '';
  })
);

const pool = new Pool(poolConfig);

const connectDb = async () => {
  await pool.query('SELECT 1');
  console.log('Database connection established');
};

module.exports = {
  pool,
  connectDb
};
