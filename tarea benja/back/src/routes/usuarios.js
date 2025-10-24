const { Router } = require('express');
const { listUsuarios } = require('../controllers/usuariosController');

const router = Router();

router.get('/', listUsuarios);

module.exports = router;
