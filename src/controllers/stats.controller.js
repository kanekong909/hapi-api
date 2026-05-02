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

    // Movimientos del usuario
    const { rows } = await pool.query(`
      SELECT *
      FROM movimientos
      WHERE usuario_id = $1
      ORDER BY fecha ASC, hora ASC, id ASC
    `, [uid]);

    // Dividendos
    const { rows: divRows } = await pool.query(`
      SELECT
        simbolo,
        SUM(monto_neto) AS total_dividendos
      FROM transacciones
      WHERE usuario_id = $1
        AND tipo = 'DIVIDENDO'
        AND simbolo IS NOT NULL
      GROUP BY simbolo
    `, [uid]);

    const dividendosPorSimbolo = {};

    for (const d of divRows) {
      dividendosPorSimbolo[d.simbolo] = parseFloat(d.total_dividendos);
    }

    // Agrupar por símbolo
    const porSimbolo = {};

    for (const m of rows) {
      if (!porSimbolo[m.simbolo]) {
        porSimbolo[m.simbolo] = {
          nombre: m.nombre,
          tipo: m.tipo,
          movimientos: []
        };
      }

      porSimbolo[m.simbolo].movimientos.push(m);
    }

    const resultado = [];

    for (const [simbolo, data] of Object.entries(porSimbolo)) {
      const movimientos = data.movimientos;

      const colaCompras = [];

      let gananciaRealizada = 0;
      let cantidadEnMano = 0;
      let totalInvertido = 0;
      let totalVendido = 0;
      let cantidadComprada = 0;
      let cantidadVendida = 0;

      for (const m of movimientos) {
        const cantidad = parseFloat(m.cantidad || 1);
        const valorUsd = parseFloat(m.valor_usd || 0);

        const precioPorUnidad =
          cantidad > 0 ? valorUsd / cantidad : valorUsd;

        if (m.orden === 'COMPRA') {
          colaCompras.push({
            cantidad,
            precioPorUnidad
          });

          cantidadEnMano += cantidad;
          totalInvertido += valorUsd;
          cantidadComprada += cantidad;
        }

        if (m.orden === 'VENTA') {
          let cantidadPorVender = cantidad;
          let costoBaseFIFO = 0;

          totalVendido += valorUsd;
          cantidadVendida += cantidad;
          cantidadEnMano -= cantidad;

          while (
            cantidadPorVender > 0 &&
            colaCompras.length > 0
          ) {
            const lote = colaCompras[0];

            if (lote.cantidad <= cantidadPorVender) {
              costoBaseFIFO +=
                lote.cantidad * lote.precioPorUnidad;

              cantidadPorVender -= lote.cantidad;
              colaCompras.shift();
            } else {
              costoBaseFIFO +=
                cantidadPorVender * lote.precioPorUnidad;

              lote.cantidad -= cantidadPorVender;
              cantidadPorVender = 0;
            }
          }

          gananciaRealizada += valorUsd - costoBaseFIFO;
        }
      }

      const costoRestante = colaCompras.reduce(
        (sum, lote) =>
          sum + lote.cantidad * lote.precioPorUnidad,
        0
      );

      const precioPromedio =
        cantidadEnMano > 0
          ? costoRestante / cantidadEnMano
          : 0;

      const dividendos =
        dividendosPorSimbolo[simbolo] || 0;

      const gananciaTotal =
        gananciaRealizada + dividendos;

      const pnlPorcentaje =
        totalInvertido > 0
          ? (gananciaTotal / totalInvertido) * 100
          : 0;

      resultado.push({
        simbolo,
        nombre: data.nombre,
        tipo: data.tipo,

        cantidad_comprada: parseFloat(
          cantidadComprada.toFixed(8)
        ),

        cantidad_vendida: parseFloat(
          cantidadVendida.toFixed(8)
        ),

        cantidad_en_mano: parseFloat(
          cantidadEnMano.toFixed(8)
        ),

        total_invertido_usd: parseFloat(
          totalInvertido.toFixed(4)
        ),

        total_vendido_usd: parseFloat(
          totalVendido.toFixed(4)
        ),

        ganancia_realizada_usd: parseFloat(
          gananciaRealizada.toFixed(4)
        ),

        dividendos_usd: parseFloat(
          dividendos.toFixed(4)
        ),

        ganancia_total_usd: parseFloat(
          gananciaTotal.toFixed(4)
        ),

        precio_promedio_usd: parseFloat(
          precioPromedio.toFixed(4)
        ),

        pnl_porcentaje: parseFloat(
          pnlPorcentaje.toFixed(2)
        ),

        movimientos: movimientos.map(m => ({
          orden: m.orden,
          cantidad: parseFloat(m.cantidad || 1),
          valor_usd: parseFloat(m.valor_usd || 0),
          fecha: m.fecha,
          hora: m.hora
        }))
      });
    }

    resultado.sort(
      (a, b) =>
        b.ganancia_total_usd -
        a.ganancia_total_usd
    );

    res.json(resultado);

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getResumen,
  getPorTipo,
  getPorActivo,
  getPnL
};