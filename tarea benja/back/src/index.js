require('dotenv').config();

const express = require('express');
const { connectDb } = require('./config/db');
const materialesRouter = require('./routes/materiales');
const usuariosRouter = require('./routes/usuarios');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

app.use(express.json());

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (allowedOrigins.length === 0) {
    
  res.header('Access-Control-Allow-Origin', '*');
      } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use('/materiales', materialesRouter);
app.use('/usuarios', usuariosRouter);
app.use('/auth', authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to the database', error);
    process.exit(1);
  });
