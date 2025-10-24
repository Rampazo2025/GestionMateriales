const { Router } = require('express');
const { listMateriales, listMovimientos, registerMovimientos, generateReporteExcel } = require('../controllers/materialesController');

const router = Router();

router.get('/', listMateriales);
router.get('/movimientos', listMovimientos);
router.post('/movimientos', registerMovimientos);
router.get('/reporte', generateReporteExcel);

module.exports = router;
