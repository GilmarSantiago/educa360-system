// @ts-expect-error - pg types are handled dynamically
import pg from 'pg';

const { Pool } = pg;

let pool: any = null;

export function getDbPool(): any {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:UMdUoLQmDZlWjiyENdVbcnHkQXHxeJCl@acela.proxy.rlwy.net:45164/railway';

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 8000,
      max: 10,
    });

    pool.on('connect', (client: any) => {
      client.query('SET search_path TO v2, public;');
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const p = getDbPool();
  return p.query(text, params);
}
