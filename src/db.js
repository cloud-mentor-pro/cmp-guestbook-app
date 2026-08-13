const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
});

// Dùng cho badge trạng thái ✅/❌ trên trang chủ. Trang chủ vẫn phải trả
// về HTTP 200 dù DB down (health check Target Group dùng path "/" -
// xem docs/04-target-group.md), nên hàm này KHÔNG throw ra ngoài.
async function checkConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch (err) {
    return false;
  }
}

async function getEntries(limit = 50) {
  // created_at chỉ có độ chính xác đến giây, nên 2 entry insert cùng
  // giây cần tie-break bằng id DESC để thứ tự "mới nhất trước" ổn định.
  const [rows] = await pool.query(
    'SELECT id, name, message, image_key, created_at FROM guestbook ORDER BY created_at DESC, id DESC LIMIT ?',
    [limit]
  );
  return rows;
}

async function insertEntry({ name, message, image_key }) {
  const [result] = await pool.execute(
    'INSERT INTO guestbook (name, message, image_key) VALUES (?, ?, ?)',
    [name, message || null, image_key || null]
  );
  return result.insertId;
}

module.exports = { pool, checkConnection, getEntries, insertEntry };
