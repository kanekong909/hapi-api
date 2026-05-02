const router = require('express').Router();
const ctrl = require('../controllers/stats.controller');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware); // ← protege todo

router.get('/resumen',    ctrl.getResumen);
router.get('/por-tipo',   ctrl.getPorTipo);
router.get('/por-activo', ctrl.getPorActivo);
router.get('/pnl', ctrl.getPnL);

module.exports = router;