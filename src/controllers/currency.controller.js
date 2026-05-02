const { getTRM, usdToCop, copToUsd } = require('../services/currency.service');

// GET /currency/trm
const obtenerTRM = async (req, res) => {
  try {
    const trm = await getTRM();
    res.json({
      data: {
        trm,
        fecha: new Date().toISOString().split('T')[0],
        moneda_base: 'USD',
        moneda_destino: 'COP',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener la TRM' });
  }
};

// POST /currency/convertir
// Body: { valor, de: 'USD'|'COP', trm? }
const convertir = async (req, res) => {
  try {
    const { valor, de, trm } = req.body;

    if (!valor || isNaN(parseFloat(valor)))
      return res.status(400).json({ error: "'valor' debe ser un número" });
    if (!de || !['USD', 'COP'].includes(de.toUpperCase()))
      return res.status(400).json({ error: "'de' debe ser USD o COP" });

    const moneda = de.toUpperCase();
    const trmFinal = trm ? parseFloat(trm) : await getTRM();
    const n = parseFloat(valor);

    const resultado = moneda === 'USD'
      ? { usd: n, cop: await usdToCop(n, trmFinal) }
      : { usd: await copToUsd(n, trmFinal), cop: n };

    res.json({
      data: {
        ...resultado,
        trm: trmFinal,
        fecha: new Date().toISOString().split('T')[0],
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en la conversión' });
  }
};

module.exports = { obtenerTRM, convertir };
