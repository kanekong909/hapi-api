require('dotenv').config();
const { pool } = require('./index');

const seed = async () => {
  const client = await pool.connect();

  try {
    console.log('Insertando datos de ejemplo...');

    await client.query('BEGIN');

    // Limpiar datos existentes de ejemplo
    await client.query('TRUNCATE movimientos RESTART IDENTITY CASCADE');

    const movimientos = [
      { orden: 'COMPRA', nombre: 'Apple Inc.', simbolo: 'AAPL', tipo: 'ACCION', valor_usd: 182.50, trm: 4120, fecha: '2025-04-28', notas: 'Primera compra de AAPL' },
      { orden: 'VENTA', nombre: 'Bitcoin', simbolo: 'BTC', tipo: 'CRIPTO', valor_usd: 1240.00, trm: 4115, fecha: '2025-04-15', notas: 'Venta parcial' },
      { orden: 'COMPRA', nombre: 'Vanguard S&P 500 ETF', simbolo: 'VOO', tipo: 'ETF', valor_usd: 450.00, trm: 4098, fecha: '2025-03-10', notas: null },
      { orden: 'COMPRA', nombre: 'Oracle Corporation', simbolo: 'ORCL', tipo: 'ACCION', valor_usd: 135.80, trm: 4105, fecha: '2025-03-02', notas: null },
      { orden: 'COMPRA', nombre: 'Ethereum', simbolo: 'ETH', tipo: 'CRIPTO', valor_usd: 320.00, trm: 4090, fecha: '2025-02-20', notas: 'DCA mensual' },
      { orden: 'VENTA', nombre: 'Microsoft Corp.', simbolo: 'MSFT', tipo: 'ACCION', valor_usd: 415.00, trm: 4080, fecha: '2025-02-14', notas: 'Toma de ganancias' },
      { orden: 'COMPRA', nombre: 'iShares MSCI Colombia ETF', simbolo: 'ICOL', tipo: 'ETF', valor_usd: 89.40, trm: 4075, fecha: '2025-01-30', notas: null },
      { orden: 'VENTA', nombre: 'Tesla Inc.', simbolo: 'TSLA', tipo: 'ACCION', valor_usd: 210.60, trm: 4060, fecha: '2025-01-15', notas: 'Stop loss activado' },
    ];

    for (const m of movimientos) {
      const valor_cop = (m.valor_usd * m.trm).toFixed(2);
      await client.query(
        `INSERT INTO movimientos (orden, nombre, simbolo, tipo, valor_usd, valor_cop, trm, fecha, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [m.orden, m.nombre, m.simbolo, m.tipo, m.valor_usd, valor_cop, m.trm, m.fecha, m.notas]
      );
    }

    await client.query('COMMIT');
    console.log(`✓ ${movimientos.length} movimientos insertados`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Error en seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
