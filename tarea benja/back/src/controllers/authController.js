const { pool } = require('../config/db');

const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Debes proporcionar correo y contraseña.' });
  }

  try {
    const query = `
      SELECT id, nombre, cargo, email, password
      FROM usuarios
      WHERE email = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const usuario = rows[0];
    if (usuario.password !== password) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const { password: _password, ...userData } = usuario;
    res.json(userData);
  } catch (error) {
    console.error('Error intentando iniciar sesión', error);
    res.status(500).json({ message: 'No se pudo iniciar sesión en este momento.' });
  }
};

module.exports = {
  login
};
