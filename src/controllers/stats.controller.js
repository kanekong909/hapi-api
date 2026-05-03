const { pool } = require('../db/pool');

// GET /api/stats/resumen
async function getResumen(req, res, next) {
  try {
    const uid = req.usuarioId;

    const { rows } = await pool.query(`
      SELECT
        COUNT(*) AS total_movimientos,
        COUNT(*) FILTER (WHERE orden = 'COMPRA') AS total_compras,
        COUNT(*) FILTER (WHERE orden = 'VENTA')  AS total_ventas,

        COALESCE(SUM(valor_usd) FILTER (WHERE orden = 'COMPRA'), 0) AS invertido_usd,
        COALESCE(SUM(valor_cop) FILTER (WHERE orden = 'COMPRA'), 0) AS invertido_cop,

        COALESCE(SUM(valor_usd) FILTER (WHERE orden = 'VENTA'), 0) AS vendido_usd,
        COALESCE(SUM(valor_cop) FILTER (WHERE orden = 'VENTA'), 0) AS vendido_cop

      FROM movimientos
      WHERE usuario_id = $1
    `, [uid]);

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/por-tipo
async function getPorTipo(req, res, next) {
  try {
    const uid = req.usuarioId;

    const { rows } = await pool.query(`
      SELECT
        tipo,
        COUNT(*) AS cantidad,
        COALESCE(SUM(valor_usd) FILTER (WHERE orden = 'COMPRA'),0) AS total_usd_compras,
        COALESCE(SUM(valor_usd) FILTER (WHERE orden = 'VENTA'),0)  AS total_usd_ventas
      FROM movimientos
      WHERE usuario_id = $1
      GROUP BY tipo
      ORDER BY cantidad DESC
    `, [uid]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/por-activo
async function getPorActivo(req, res, next) {
  try {
    const uid = req.usuarioId;

    const { rows } = await pool.query(`
      SELECT
        simbolo,
        nombre,
        tipo,
        COUNT(*) AS movimientos,
        COALESCE(SUM(valor_usd) FILTER (WHERE orden = 'COMPRA'),0) AS comprado_usd,
        COALESCE(SUM(valor_usd) FILTER (WHERE orden = 'VENTA'),0)  AS vendido_usd
      FROM movimientos
      WHERE usuario_id = $1
      GROUP BY simbolo, nombre, tipo
      ORDER BY comprado_usd DESC NULLS LAST
    `, [uid]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/pnl
async function getPnL(req, res, next) {
  try {
    const uid = req.usuarioId;

    const { rows } = await pool.query(`
      SELECT simbolo, nombre, tipo, orden, cantidad, valor_usd, fecha, hora
      FROM movimientos
      WHERE usuario_id = $1
      ORDER BY simbolo, fecha ASC, hora ASC, created_at ASC
    `, [uid]);

    const { rows: divRows } = await pool.query(`
      SELECT simbolo, SUM(monto_neto) as total_dividendos
      FROM transacciones
      WHERE usuario_id = $1 AND tipo = 'DIVIDENDO' AND simbolo IS NOT NULL
      GROUP BY simbolo
    `, [uid]);

    const dividendosPorSimbolo = {};
    for (const d of divRows) {
      dividendosPorSimbolo[d.simbolo] = parseFloat(d.total_dividendos);
    }

    const porSimbolo = {};
    for (const m of rows) {
      if (!porSimbolo[m.simbolo]) {
        porSimbolo[m.simbolo] = { nombre: m.nombre, tipo: m.tipo, movimientos: [] };
      }
      porSimbolo[m.simbolo].movimientos.push(m);
    }

    const resultado = [];

    for (const [simbolo, data] of Object.entries(porSimbolo)) {
      let totalInvertido   = 0;
      let totalVendido     = 0;
      let cantidadComprada = 0;
      let cantidadVendida  = 0;

      for (const m of data.movimientos) {
        const cantidad = parseFloat(m.cantidad);
        const valor    = parseFloat(m.valor_usd);

        if (m.orden === 'COMPRA') {
          totalInvertido   += valor;
          cantidadComprada += cantidad;
        } else {
          totalVendido     += valor;
          cantidadVendida  += cantidad;
        }
      }

      const cantidadEnMano    = cantidadComprada - cantidadVendida;
      const ganancia          = totalVendido - totalInvertido;
      const pnlPorcentaje     = totalInvertido > 0 ? (ganancia / totalInvertido) * 100 : 0;
      const precioPromedio    = cantidadEnMano > 0
        ? (totalInvertido - totalVendido) / cantidadEnMano  // costo neto restante / unidades en mano
        : 0;
      const dividendos        = dividendosPorSimbolo[simbolo] || 0;

      resultado.push({
        simbolo,
        nombre:                 data.nombre,
        tipo:                   data.tipo,
        cantidad_comprada:      parseFloat(cantidadComprada.toFixed(8)),
        cantidad_vendida:       parseFloat(cantidadVendida.toFixed(8)),
        cantidad_en_mano:       parseFloat(cantidadEnMano.toFixed(8)),
        total_invertido_usd:    parseFloat(totalInvertido.toFixed(4)),
        total_vendido_usd:      parseFloat(totalVendido.toFixed(4)),
        ganancia_realizada_usd: parseFloat(ganancia.toFixed(4)),
        ganancia_total_usd:     parseFloat((ganancia + dividendos).toFixed(4)),
        precio_promedio_usd:    parseFloat(precioPromedio.toFixed(4)),
        pnl_porcentaje:         parseFloat(pnlPorcentaje.toFixed(2)),
        dividendos_usd:         parseFloat(dividendos.toFixed(4)),
        movimientos: data.movimientos.map(m => ({
          orden:     m.orden,
          cantidad:  parseFloat(m.cantidad),
          valor_usd: parseFloat(m.valor_usd),
          fecha:     m.fecha,
          hora:      m.hora,
        })),
      });
    }

    resultado.sort((a, b) => b.ganancia_total_usd - a.ganancia_total_usd);
    res.json(resultado);
  } catch (err) { next(err); }
}

module.exports = {
  getResumen,
  getPorTipo,
  getPorActivo,
  getPnL
};