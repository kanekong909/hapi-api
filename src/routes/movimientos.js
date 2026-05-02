const router = require('express').Router();
const ctrl = require('../controllers/movimientos.controller');
const { validateMovimiento } = require('../middleware/validate');

router.get('/',     ctrl.getAll);
router.get('/:id',  ctrl.getById);
router.post('/',    validateMovimiento, ctrl.create);
router.put('/:id',  validateMovimiento, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
