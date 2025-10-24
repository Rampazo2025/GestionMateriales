const { pool } = require('../config/db');

const getUsuarios = async () => {
  const query = 'SELECT id, nombre, cargo, email FROM usuarios ORDER BY nombre ASC';
  const { rows } = await pool.query(query);
  return rows;
};

module.exports = {
  getUsuarios
};
