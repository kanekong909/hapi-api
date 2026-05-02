const router = require('express').Router();
const ctrl = require('../controllers/stats.controller');

router.get('/resumen',    ctrl.getResumen);
router.get('/por-tipo',   ctrl.getPorTipo);
router.get('/por-activo', ctrl.getPorActivo);

module.exports = router;
