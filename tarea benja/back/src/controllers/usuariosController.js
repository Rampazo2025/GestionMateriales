const { getUsuarios } = require('../models/usuariosModel');

const listUsuarios = async (req, res) => {
  try {
    const usuarios = await getUsuarios();
    res.json(usuarios);
  } catch (error) {
    console.error('Error querying usuarios', error);
    res.status(500).json({ message: 'Error loading usuarios data' });
  }
};

module.exports = {
  listUsuarios
};
