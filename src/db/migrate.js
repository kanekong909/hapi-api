require('dotenv').config();
const { pool } = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Ejecutando migraciones...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS movimientos (
        id          SERIAL PRIMARY KEY,
        orden       VARCHAR(10)  NOT NULL CHECK (orden IN ('COMPRA', 'VENTA')),
        nombre      VARCHAR(100) NOT NULL,
        simbolo     VARCHAR(20)  NOT NULL,
        tipo        VARCHAR(20)  NOT NULL CHECK (tipo IN ('ACCION', 'CRIPTO', 'ETF')),
        valor_usd   NUMERIC(18, 4) NOT NULL,
        valor_cop   NUMERIC(18, 2) NOT NULL,
        trm         NUMERIC(10, 2) NOT NULL,
        fecha       DATE NOT NULL,
        notas       TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_movimientos_orden   ON movimientos(orden);
      CREATE INDEX IF NOT EXISTS idx_movimientos_tipo    ON movimientos(tipo);
      CREATE INDEX IF NOT EXISTS idx_movimientos_simbolo ON movimientos(simbolo);
      CREATE INDEX IF NOT EXISTS idx_movimientos_fecha   ON movimientos(fecha DESC);
    `);

    // Trigger para updated_at automático
    await client.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_movimientos_updated_at ON movimientos;
      CREATE TRIGGER trg_movimientos_updated_at
        BEFORE UPDATE ON movimientos
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);

    console.log('Migraciones completadas exitosamente');
  } catch (err) {
    console.error('Error en migración:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
