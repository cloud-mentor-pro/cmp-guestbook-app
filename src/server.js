const path = require('path');
const express = require('express');

const config = require('./config');
const db = require('./db');
const s3 = require('./s3');
const imds = require('./imds');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// GET / → Trang chủ: status DB, danh sách guestbook entries (mới nhất trước)
// Luôn trả HTTP 200 (kể cả khi DB down) vì Target Group health check
// dùng path "/" - xem docs/04-target-group.md của repo cmp-guestbook-doc.
app.get('/', async (req, res) => {
  const [dbOk, instanceId] = await Promise.all([db.checkConnection(), imds.getInstanceId()]);

  let entries = [];
  if (dbOk) {
    try {
      entries = await db.getEntries();
    } catch (err) {
      entries = [];
    }
  }

  const entriesWithImageUrl = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      imageUrl: await s3.getPresignedViewUrl(entry.image_key),
    }))
  );

  res.render('index', {
    dbOk,
    instanceId,
    entries: entriesWithImageUrl,
  });
});

// GET /presign → Trả về presigned URL (PUT) để browser upload ảnh trực tiếp lên S3
app.get('/presign', async (req, res) => {
  try {
    const { filename, contentType } = req.query;
    const { uploadUrl, key } = await s3.createPresignedUploadUrl(filename, contentType);
    res.json({ uploadUrl, key });
  } catch (err) {
    console.error('GET /presign lỗi:', err.message);
    res.status(500).json({ error: 'Không tạo được presigned URL' });
  }
});

// POST /submit → Nhận name, message, image_key → INSERT vào RDS
app.post('/submit', async (req, res) => {
  const name = (req.body.name || '').trim();
  const message = (req.body.message || '').trim();
  const image_key = req.body.image_key || null;

  if (!name) {
    return res.status(400).json({ error: 'Thiếu name' });
  }
  if (name.length > 100) {
    return res.status(400).json({ error: 'name tối đa 100 ký tự' });
  }
  if (message.length > 255) {
    return res.status(400).json({ error: 'message tối đa 255 ký tự' });
  }

  try {
    const id = await db.insertEntry({ name, message, image_key });
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error('POST /submit lỗi:', err.message);
    res.status(500).json({ error: 'Không lưu được vào database' });
  }
});

app.listen(config.port, () => {
  console.log(`Cloud Mentor Pro Guestbook đang chạy tại http://localhost:${config.port}`);
});
