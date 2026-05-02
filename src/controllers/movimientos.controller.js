const { pool } = require('../db/pool');

async function getAll(req, res, next) {
  try {
    const { orden, tipo, simbolo, fecha_desde, fecha_hasta, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const uid = req.usuarioId;

    const conditions = ['usuario_id = $1'];
    const params = [uid];
    let i = 2;

    if (orden)       { conditions.push(`orden = $${i++}`);        params.push(orden.toUpperCase()); }
    if (tipo)        { conditions.push(`tipo = $${i++}`);         params.push(tipo.toUpperCase()); }
    if (simbolo)     { conditions.push(`simbolo ILIKE $${i++}`);  params.push(`%${simbolo}%`); }
    if (fecha_desde) { conditions.push(`fecha >= $${i++}`);       params.push(fecha_desde); }
    if (fecha_hasta) { conditions.push(`fecha <= $${i++}`);       params.push(fecha_hasta); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM movimientos ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT * FROM movimientos ${where}
       ORDER BY fecha DESC, hora DESC, created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: dataResult.rows, meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM movimientos WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuarioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { orden, nombre, simbolo, tipo, valor_usd, valor_cop, trm, fecha, hora, cantidad, notas } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO movimientos (usuario_id, orden, nombre, simbolo, tipo, valor_usd, valor_cop, trm, fecha, hora, cantidad, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.usuarioId, orden, nombre, simbolo, tipo,
      parseFloat(valor_usd), parseFloat(valor_cop), parseFloat(trm),
      fecha, hora || '00:00:00', parseFloat(cantidad) || 1, notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { orden, nombre, simbolo, tipo, valor_usd, valor_cop, trm, fecha, hora, cantidad, notas } = req.body;
    const { rows } = await pool.query(
      `UPDATE movimientos
      SET orden=$1, nombre=$2, simbolo=$3, tipo=$4,
          valor_usd=$5, valor_cop=$6, trm=$7, fecha=$8, hora=$9, cantidad=$10, notas=$11
      WHERE id=$12 AND usuario_id=$13 RETURNING *`,
      [orden, nombre, simbolo, tipo,
      parseFloat(valor_usd), parseFloat(valor_cop), parseFloat(trm),
      fecha, hora || '00:00:00', parseFloat(cantidad) || 1, notas || null,
      req.params.id, req.usuarioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { rows } = await pool.query(
      'DELETE FROM movimientos WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [req.params.id, req.usuarioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json({ message: 'Movimiento eliminado', id: rows[0].id });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };