const { pool } = require('../db/pool');

// GET /api/stats/resumen
async function getResumen(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                              AS total_movimientos,
        COUNT(*) FILTER (WHERE orden = 'COMPRA')             AS total_compras,
        COUNT(*) FILTER (WHERE orden = 'VENTA')              AS total_ventas,
        COALESCE(SUM(valor_usd) FILTER (WHERE orden = 'COMPRA'), 0) AS invertido_usd,
        COALESCE(SUM(valor_cop) FILTER (WHERE orden = 'COMPRA'), 0) AS invertido_cop,
        COALESCE(SUM(valor_usd) FILTER (WHERE orden = 'VENTA'),  0) AS vendido_usd,
        COALESCE(SUM(valor_cop) FILTER (WHERE orden = 'VENTA'),  0) AS vendido_cop
      FROM movimientos
    `);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/por-tipo
async function getPorTipo(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        tipo,
        COUNT(*)                                        AS cantidad,
        SUM(valor_usd) FILTER (WHERE orden = 'COMPRA') AS total_usd_compras,
        SUM(valor_usd) FILTER (WHERE orden = 'VENTA')  AS total_usd_ventas
      FROM movimientos
      GROUP BY tipo
      ORDER BY cantidad DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/por-activo
async function getPorActivo(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        simbolo,
        nombre,
        tipo,
        COUNT(*) AS movimientos,
        SUM(valor_usd) FILTER (WHERE orden = 'COMPRA') AS comprado_usd,
        SUM(valor_usd) FILTER (WHERE orden = 'VENTA')  AS vendido_usd
      FROM movimientos
      GROUP BY simbolo, nombre, tipo
      ORDER BY comprado_usd DESC NULLS LAST
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { getResumen, getPorTipo, getPorActivo };
