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

const loadUsuarios = () => {
  const usuariosPath = path.join(__dirname, '..', 'usuarios.json');
  const raw = fs.readFileSync(usuariosPath, 'utf-8');
  return JSON.parse(raw);
};

const seedUsuarios = async () => {
  const client = createClient();
  const usuarios = loadUsuarios();

  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE usuarios RESTART IDENTITY');

    const insertQuery = `
      INSERT INTO usuarios (
        nombre,
        cargo,
        email,
        password
      )
      VALUES ($1, $2, $3, $4)
    `;

    for (const usuario of usuarios) {
      const { nombre, cargo, email, password } = usuario;
      await client.query(insertQuery, [nombre, cargo, email, password]);
    }

    await client.query('COMMIT');
    console.log(`Seeded ${usuarios.length} usuarios`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed usuarios', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

seedUsuarios();
