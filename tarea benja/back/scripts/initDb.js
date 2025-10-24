require('dotenv').config();

const { Client } = require('pg');

const sanitizeConfig = (config) =>
  Object.fromEntries(
    Object.entries(config).filter(([key, value]) => {
      if (key === 'password') {
        return value !== undefined;
      }

      return value !== undefined && value !== '';
    })
  );

const createClient = (overrides = {}) => {
  const base = {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  };

  return new Client(sanitizeConfig({ ...base, ...overrides }));
};

const ensureDatabase = async () => {
  if (!process.env.PGDATABASE) {
    throw new Error('PGDATABASE environment variable is required');
  }

  if (!/^\w+$/.test(process.env.PGDATABASE)) {
    throw new Error('PGDATABASE must contain only letters, numbers, and underscores');
  }

  const adminClient = createClient({ database: 'postgres' });

  await adminClient.connect();
  const { rows } = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [process.env.PGDATABASE]);

  if (rows.length === 0) {
    await adminClient.query(`CREATE DATABASE "${process.env.PGDATABASE}"`);
  }

  await adminClient.end();
};

const ensureTable = async () => {
  const client = createClient();

  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS materiales (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      medida VARCHAR(50),
      caracteristicas TEXT,
      stock_actual INTEGER DEFAULT 0,
      salida_material INTEGER DEFAULT 0,
      falta_material BOOLEAN DEFAULT FALSE,
      cantidad_faltante INTEGER DEFAULT 0
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      cargo VARCHAR(50) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `);
  await client.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT 'changeme'
  `);
  await client.query(`
    ALTER TABLE usuarios
    ALTER COLUMN password DROP DEFAULT
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS movimientos_materiales (
      id SERIAL PRIMARY KEY,
      material_id INTEGER NOT NULL REFERENCES materiales(id) ON DELETE CASCADE,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
      cantidad INTEGER NOT NULL CHECK (cantidad > 0),
      tecnico VARCHAR(100),
      proyecto VARCHAR(150),
      numero_movil VARCHAR(50),
      supervisor VARCHAR(100),
      fecha_movimiento DATE DEFAULT CURRENT_DATE,
      creado_en TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.end();
};

const main = async () => {
  try {
    await ensureDatabase();
    await ensureTable();
    console.log('Database and table are ready');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database', error);
    process.exit(1);
  }
};

main();
