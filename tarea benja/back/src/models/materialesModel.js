const { pool } = require('../config/db');

const insertMaterial = async (materialData) => {
  const {
    nombre,
    medida = null,
    caracteristicas = null,
    stock_actual = 0,
    salida_material = 0,
    falta_material = false,
    cantidad_faltante = 0
  } = materialData;

  const query = `
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
    RETURNING *
  `;

  const values = [
    nombre,
    medida,
    caracteristicas,
    stock_actual,
    salida_material,
    falta_material,
    cantidad_faltante
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

module.exports = {
  insertMaterial
};
