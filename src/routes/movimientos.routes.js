const { Router } = require('express');
const {
  listar, obtener, crear, actualizar, eliminar, resumen
} = require('../controllers/movimientos.controller');

const router = Router();

// Resumen primero para que no colisione con /:id
router.get('/resumen', resumen);

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', crear);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

module.exports = router;
