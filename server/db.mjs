
import pg from 'pg';



const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

export const query = (text, params) => {
  return pool.query(text, params);
};


export async function getProducts() {
  const result = await query(
    'SELECT data FROM products ORDER BY updated_at DESC'
  );

  return result.rows.map((row) => row.data);
}

export async function getProduct(id) {
  const result = await query(
    'SELECT data FROM products WHERE id = $1',
    [id]
  );

  return result.rows[0]?.data ?? null;
}

export async function insertProduct(product) {
  await query(
    `INSERT INTO products (id, data)
     VALUES ($1, $2::jsonb)`,
    [product.id, JSON.stringify(product)]
  );

  return product;
}

export async function updateProduct(product) {
  await query(
    `UPDATE products
     SET data = $2::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [product.id, JSON.stringify(product)]
  );

  return product;
}

export async function deleteProduct(id) {
  const result = await query(
    'DELETE FROM products WHERE id = $1',
    [id]
  );

  return result.rowCount > 0;
}


export async function getSettings() {
  const result = await query(
    'SELECT data FROM settings WHERE key = $1',
    ['main']
  );

  return result.rows[0]?.data ?? null;
}

export async function saveSettingsToDb(settings) {
  await query(
    `INSERT INTO settings (key, data)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key)
     DO UPDATE SET
       data = EXCLUDED.data,
       updated_at = NOW()`,
    ['main', JSON.stringify(settings)]
  );

  return settings;
}

export async function getOrders() {
  const result = await query(
    'SELECT data FROM orders ORDER BY created_at DESC'
  );

  return result.rows.map((row) => row.data);
}

export async function getOrderRefs() {
  const result = await query('SELECT ref FROM orders');
  return result.rows.map((row) => row.ref);
}

export async function getOrder(ref) {
  const result = await query(
    'SELECT data FROM orders WHERE ref = $1',
    [ref]
  );

  return result.rows[0]?.data ?? null;
}

export async function insertOrder(order) {
  await query(
    `INSERT INTO orders (ref, status, data)
     VALUES ($1, $2, $3::jsonb)`,
    [order.ref, order.status, JSON.stringify(order)]
  );

  return order;
}

export async function updateOrder(order) {
  await query(
    `UPDATE orders
     SET status = $2,
         data = $3::jsonb,
         updated_at = NOW()
     WHERE ref = $1`,
    [order.ref, order.status, JSON.stringify(order)]
  );

  return order;
}