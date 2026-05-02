const { pool } = require('../db/pool');

async function getAll(req, res, next) {
  try {
    const uid = req.usuarioId;
    const { tipo, fecha_desde, fecha_hasta, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['usuario_id = $1'];
    const params = [uid];
    let i = 2;

    if (tipo)        { conditions.push(`tipo = $${i++}`);    params.push(tipo.toUpperCase()); }
    if (fecha_desde) { conditions.push(`fecha >= $${i++}`);  params.push(fecha_desde); }
    if (fecha_hasta) { conditions.push(`fecha <= $${i++}`);  params.push(fecha_hasta); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM transacciones ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT * FROM transacciones ${where}
       ORDER BY fecha DESC, hora DESC, created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM transacciones WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuarioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { tipo, descripcion, simbolo, monto_bruto, impuesto = 0, valor_cop, trm, fecha, hora, notas } = req.body;

    if (!tipo || !['DEPOSITO','RETIRO','DIVIDENDO'].includes(tipo.toUpperCase())) {
      return res.status(400).json({ error: 'tipo debe ser DEPOSITO, RETIRO o DIVIDENDO' });
    }
    if (!monto_bruto || isNaN(parseFloat(monto_bruto))) {
      return res.status(400).json({ error: 'monto_bruto es requerido' });
    }
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida' });

    const montoNeto = parseFloat(monto_bruto) - parseFloat(impuesto || 0);

    const { rows } = await pool.query(
      `INSERT INTO transacciones
        (usuario_id, tipo, descripcion, simbolo, monto_bruto, impuesto, monto_neto, valor_cop, trm, fecha, hora, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [req.usuarioId, tipo.toUpperCase(),
       descripcion || null,
       simbolo ? simbolo.toUpperCase() : null,
       parseFloat(monto_bruto), parseFloat(impuesto || 0), montoNeto,
       valor_cop ? parseFloat(valor_cop) : null,
       trm ? parseFloat(trm) : null,
       fecha, hora || '00:00:00', notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { tipo, descripcion, simbolo, monto_bruto, impuesto = 0, valor_cop, trm, fecha, hora, notas } = req.body;
    const montoNeto = parseFloat(monto_bruto) - parseFloat(impuesto || 0);

    const { rows } = await pool.query(
      `UPDATE transacciones
       SET tipo=$1, descripcion=$2, simbolo=$3, monto_bruto=$4, impuesto=$5,
           monto_neto=$6, valor_cop=$7, trm=$8, fecha=$9, hora=$10, notas=$11
       WHERE id=$12 AND usuario_id=$13
       RETURNING *`,
      [tipo.toUpperCase(), descripcion || null,
       simbolo ? simbolo.toUpperCase() : null,
       parseFloat(monto_bruto), parseFloat(impuesto || 0), montoNeto,
       valor_cop ? parseFloat(valor_cop) : null,
       trm ? parseFloat(trm) : null,
       fecha, hora || '00:00:00', notas || null,
       req.params.id, req.usuarioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { rows } = await pool.query(
      'DELETE FROM transacciones WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [req.params.id, req.usuarioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.json({ message: 'Transacción eliminada', id: rows[0].id });
  } catch (err) { next(err); }
}

async function getResumen(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(monto_neto) FILTER (WHERE tipo = 'DEPOSITO'),  0) AS total_depositos,
        COALESCE(SUM(monto_neto) FILTER (WHERE tipo = 'RETIRO'),    0) AS total_retiros,
        COALESCE(SUM(monto_neto) FILTER (WHERE tipo = 'DIVIDENDO'), 0) AS total_dividendos,
        COALESCE(SUM(impuesto)   FILTER (WHERE tipo = 'DIVIDENDO'), 0) AS total_impuestos,
        COUNT(*)                 FILTER (WHERE tipo = 'DEPOSITO')      AS num_depositos,
        COUNT(*)                 FILTER (WHERE tipo = 'RETIRO')        AS num_retiros,
        COUNT(*)                 FILTER (WHERE tipo = 'DIVIDENDO')     AS num_dividendos
      FROM transacciones
      WHERE usuario_id = $1
    `, [req.usuarioId]);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove, getResumen };