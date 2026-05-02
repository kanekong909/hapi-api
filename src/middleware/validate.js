const ORDENES_VALIDAS = ['COMPRA', 'VENTA'];
const TIPOS_VALIDOS  = ['ACCION', 'CRIPTO', 'ETF'];

function validateMovimiento(req, res, next) {
  const { orden, nombre, simbolo, tipo, valor_usd, valor_cop, trm, fecha } = req.body;
  const errors = [];

  if (!orden || !ORDENES_VALIDAS.includes(orden.toUpperCase())) {
    errors.push('orden debe ser COMPRA o VENTA');
  }
  if (!nombre || nombre.trim().length < 1) {
    errors.push('nombre es requerido');
  }
  if (!simbolo || simbolo.trim().length < 1) {
    errors.push('simbolo es requerido');
  }
  if (!tipo || !TIPOS_VALIDOS.includes(tipo.toUpperCase())) {
    errors.push('tipo debe ser ACCION, CRIPTO o ETF');
  }
  if (valor_usd === undefined || isNaN(parseFloat(valor_usd)) || parseFloat(valor_usd) <= 0) {
    errors.push('valor_usd debe ser un número positivo');
  }
  if (valor_cop === undefined || isNaN(parseFloat(valor_cop)) || parseFloat(valor_cop) <= 0) {
    errors.push('valor_cop debe ser un número positivo');
  }
  if (trm === undefined || isNaN(parseFloat(trm)) || parseFloat(trm) <= 0) {
    errors.push('trm debe ser un número positivo');
  }
  if (!fecha || isNaN(Date.parse(fecha))) {
    errors.push('fecha debe ser una fecha válida (YYYY-MM-DD)');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validación fallida', details: errors });
  }

  // Normalizar a mayúsculas
  req.body.orden   = orden.toUpperCase();
  req.body.tipo    = tipo.toUpperCase();
  req.body.simbolo = simbolo.toUpperCase().trim();
  req.body.nombre  = nombre.trim();

  next();
}

module.exports = { validateMovimiento };
