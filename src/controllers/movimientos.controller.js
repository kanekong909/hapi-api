const { pool } = require('../db/pool');

// GET /api/movimientos
async function getAll(req, res, next) {
  try {
    const { orden, tipo, simbolo, fecha_desde, fecha_hasta, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    let i = 1;

    if (orden)       { conditions.push(`orden = $${i++}`);              params.push(orden.toUpperCase()); }
    if (tipo)        { conditions.push(`tipo = $${i++}`);               params.push(tipo.toUpperCase()); }
    if (simbolo)     { conditions.push(`simbolo ILIKE $${i++}`);        params.push(`%${simbolo}%`); }
    if (fecha_desde) { conditions.push(`fecha >= $${i++}`);             params.push(fecha_desde); }
    if (fecha_hasta) { conditions.push(`fecha <= $${i++}`);             params.push(fecha_hasta); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM movimientos ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT * FROM movimientos ${where}
       ORDER BY fecha DESC, created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: dataResult.rows,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/movimientos/:id
async function getById(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM movimientos WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/movimientos
async function create(req, res, next) {
  try {
    const { orden, nombre, simbolo, tipo, valor_usd, valor_cop, trm, fecha, notas } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO movimientos (orden, nombre, simbolo, tipo, valor_usd, valor_cop, trm, fecha, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [orden, nombre, simbolo, tipo, parseFloat(valor_usd), parseFloat(valor_cop),
       parseFloat(trm), fecha, notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /api/movimientos/:id
async function update(req, res, next) {
  try {
    const { orden, nombre, simbolo, tipo, valor_usd, valor_cop, trm, fecha, notas } = req.body;
    const { rows } = await pool.query(
      `UPDATE movimientos
       SET orden=$1, nombre=$2, simbolo=$3, tipo=$4,
           valor_usd=$5, valor_cop=$6, trm=$7, fecha=$8, notas=$9
       WHERE id=$10
       RETURNING *`,
      [orden, nombre, simbolo, tipo, parseFloat(valor_usd), parseFloat(valor_cop),
       parseFloat(trm), fecha, notas || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/movimientos/:id
async function remove(req, res, next) {
  try {
    const { rows } = await pool.query(
      'DELETE FROM movimientos WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json({ message: 'Movimiento eliminado', id: rows[0].id });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
