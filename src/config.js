require('dotenv').config();

// Trong lab thật, các biến này được set trong User Data của Launch
// Template (KHÔNG dùng Parameter Store/Secrets Manager - xem CLAUDE.md
// của repo cmp-guestbook-doc). Local dev thì lấy từ file .env.
//
// Lưu ý PORT: production (User Data) set PORT=80 vì Express lắng nghe
// thẳng port 80 (App SG chỉ mở 80 từ ALB SG). Local dev mặc định 3000
// để không cần chạy bằng sudo/root.
module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'guestbook',
    password: process.env.DB_PASS || 'guestbook_password',
    database: process.env.DB_NAME || 'guestbook',
  },

  s3: {
    bucket: process.env.S3_BUCKET || '',
  },

  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
};
