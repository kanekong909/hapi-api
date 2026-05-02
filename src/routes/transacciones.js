const router = require('express').Router();
const ctrl = require('../controllers/transacciones.controller');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/resumen', ctrl.getResumen);
router.get('/',        ctrl.getAll);
router.get('/:id',     ctrl.getById);
router.post('/',       ctrl.create);
router.put('/:id',     ctrl.update);
router.delete('/:id',  ctrl.remove);

module.exports = router;