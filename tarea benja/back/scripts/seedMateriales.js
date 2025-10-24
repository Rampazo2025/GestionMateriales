require('dotenv').config();

const fs = require('fs');
const path = require('path');
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

const createClient = () => {
  const base = {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  };

  return new Client(sanitizeConfig(base));
};

const loadMateriales = () => {
  const materialesPath = path.join(__dirname, '..', 'materiales.json');
  const raw = fs.readFileSync(materialesPath, 'utf-8');
  return JSON.parse(raw);
};

const seedMateriales = async () => {
  const client = createClient();
  const materiales = loadMateriales();

  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE movimientos_materiales RESTART IDENTITY');

    await client.query('TRUNCATE TABLE materiales RESTART IDENTITY');

    const insertQuery = `
      INSERT INTO materiales (
        nombre,
        medida,
        caracteristicas,
        stock_actual,
        salida_material,
        falta_material,
        cantidad_faltante
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    for (const material of materiales) {
      const {
        nombre,
        medida = null,
        caracteristicas = null,
        stock_actual = 0,
        salida_material = 0,
        falta_material = false,
        cantidad_faltante = 0
      } = material;

      await client.query(insertQuery, [
        nombre,
        medida,
        caracteristicas,
        stock_actual,
        salida_material,
        falta_material,
        cantidad_faltante
      ]);
    }

    await client.query('COMMIT');
    console.log(`Seeded ${materiales.length} materiales`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed materiales', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

seedMateriales();
