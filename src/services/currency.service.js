const axios = require('axios');
const { query } = require('../db');

// TRM de respaldo si falla la API externa
const TRM_FALLBACK = 4120;

/**
 * Obtiene la TRM del día. Primero busca en cache (DB),
 * luego consulta la API externa, y si falla usa el fallback.
 */
const getTRM = async () => {
  const hoy = new Date().toISOString().split('T')[0];

  // 1. Buscar en cache
  try {
    const cache = await query(
      'SELECT valor FROM trm_cache WHERE fecha = $1',
      [hoy]
    );
    if (cache.rows.length > 0) {
      return parseFloat(cache.rows[0].valor);
    }
  } catch (err) {
    console.warn('No se pudo leer el cache de TRM:', err.message);
  }

  // 2. Consultar API externa (ExchangeRate-API, gratuita sin key)
  try {
    const response = await axios.get(
      'https://open.er-api.com/v6/latest/USD',
      { timeout: 5000 }
    );

    if (response.data?.rates?.COP) {
      const trm = parseFloat(response.data.rates.COP.toFixed(2));

      // Guardar en cache
      await query(
        `INSERT INTO trm_cache (valor, fecha, fuente)
         VALUES ($1, $2, 'open.er-api.com')
         ON CONFLICT (fecha) DO UPDATE SET valor = $1`,
        [trm, hoy]
      );

      return trm;
    }
  } catch (err) {
    console.warn('API de TRM no disponible, usando fallback:', err.message);
  }

  // 3. Intentar usar el último valor guardado en la DB
  try {
    const ultimo = await query(
      'SELECT valor FROM trm_cache ORDER BY fecha DESC LIMIT 1'
    );
    if (ultimo.rows.length > 0) {
      return parseFloat(ultimo.rows[0].valor);
    }
  } catch (_) { /* silencioso */ }

  return TRM_FALLBACK;
};

/**
 * Convierte USD a COP usando la TRM dada o la del día
 */
const usdToCop = async (usd, trm = null) => {
  const rate = trm ?? await getTRM();
  return parseFloat((usd * rate).toFixed(2));
};

/**
 * Convierte COP a USD usando la TRM dada o la del día
 */
const copToUsd = async (cop, trm = null) => {
  const rate = trm ?? await getTRM();
  return parseFloat((cop / rate).toFixed(4));
};

module.exports = { getTRM, usdToCop, copToUsd };
