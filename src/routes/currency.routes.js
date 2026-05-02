const { Router } = require('express');
const { obtenerTRM, convertir } = require('../controllers/currency.controller');

const router = Router();

router.get('/trm', obtenerTRM);
router.post('/convertir', convertir);

module.exports = router;
