import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      'postgresql://postgres:UMdUoLQmDZlWjiyENdVbcnHkQXHxeJCl@acela.proxy.rlwy.net:45164/railway';

    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      console.warn('[Educa360 DB] Advertencia: DATABASE_URL no está definida en las variables de entorno.');
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 8000,
      max: 10,
    });

    pool.on('connect', (client: pg.PoolClient) => {
      client.query('SET search_path TO v2, public;');
    });
  }
  return pool;
}

export type QueryFn = <T = any>(text: string, params?: any[]) => Promise<{ rows: T[] }>;

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const p = getDbPool();
  const res = await p.query(text, params);
  return res as unknown as { rows: T[] };
}

/**
 * Ejecuta un bloque de operaciones dentro de una transacción SQL atómica (BEGIN / COMMIT / ROLLBACK).
 * Si la función lanza una excepción o retorna un Response HTTP con status >= 400, revierte todos los cambios.
 */
export async function withTransaction<R>(fn: (txQuery: QueryFn) => Promise<R>): Promise<R> {
  const p = getDbPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL search_path TO v2, public;');
    const txQuery: QueryFn = async <T = any>(text: string, params?: any[]) => {
      const res = await client.query(text, params);
      return res as unknown as { rows: T[] };
    };
    const result = await fn(txQuery);
    if (result instanceof Response && result.status >= 400) {
      await client.query('ROLLBACK');
      return result;
    }
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
