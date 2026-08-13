# Cloud Mentor Pro Guestbook (cmp-guestbook-app)

Source code ứng dụng demo "Guestbook" dùng cho bài lab **cmp-guestbook-doc**
(AWS SAA — Load Balancer & Auto Scaling Group, Cloud Mentor Pro). Repo
này độc lập với repo lab — App instance trong lab sẽ `git clone`/`git
pull` trực tiếp từ repo GitHub này lúc khởi động.

## Tính năng

- Form ghi lưu bút (name, message) → lưu **RDS**
- Upload ảnh qua **S3 Presigned URL** (browser upload trực tiếp, không qua EC2)
- Hiển thị trạng thái kết nối DB ngay trên trang chủ (✅ / ❌)
- Hiển thị Instance ID (lấy qua **IMDSv2**) để minh họa traffic đang được load balance qua nhiều instance

Source code (Node.js + Express) đặt trong `src/`:

```
src/
├── server.js       # Express app, 3 route: GET / , GET /presign , POST /submit
├── config.js       # Đọc biến môi trường (.env local / User Data trên EC2)
├── db.js           # MySQL pool (mysql2), check connection + query guestbook
├── s3.js           # Presigned PUT URL (AWS SDK v3)
├── imds.js         # Lấy Instance ID qua IMDSv2 (fallback "local-dev" khi chạy local)
├── views/index.ejs # Trang chủ (server-rendered)
└── public/          # CSS (brand color Cloud Mentor Pro) + JS client (upload flow)
```

**Bảng màu thương hiệu** dùng trong `public/css/style.css`:
navy `#151035` (nền header/footer), teal `#32EFB9` (nhấn trên nền tối),
purple `#5F56D9` (nhấn trên nền sáng — nút, focus input), nền trang
xám nhẹ `#F5F5F7` với card trắng.

## Cách app này được deploy trong lab

- **AMI (runtime)** và **code app (repo này)** tách biệt hoàn toàn: Golden
  AMI chỉ chứa OS + runtime + `git`, **không** chứa code ứng dụng.
- Code trong `src/` của repo này được `git clone`/`git pull` xuống App
  instance lúc khởi động, qua User Data trong Launch Template (biến
  `APP_REPO_URL` trỏ vào repo này, `APP_REF` chỉ định branch/tag/commit).
- S3 trong lab **không** dùng để chứa code ứng dụng — S3 chỉ phục vụ
  upload ảnh guestbook qua presigned URL.
- 2 chiến lược deploy demo trong lab: đổi code (push lên repo này +
  Instance Refresh) và đổi AMI (rebuild Golden AMI + Launch Template
  version mới + Instance Refresh) — xem chi tiết trong repo lab
  `cmp-guestbook-doc`, thư mục `docs/08` và `docs/09`.

## API endpoints (dự kiến)

```
GET  /          → Trang chủ: status DB, danh sách guestbook entries (mới nhất trước)
GET  /presign    → Trả về presigned URL (PUT) để browser upload ảnh trực tiếp lên S3
POST /submit     → Nhận name, message, image_key → INSERT vào RDS
```

## Data model (RDS)

```sql
CREATE TABLE guestbook (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    message VARCHAR(255),
    image_key VARCHAR(255),      -- object key trong S3, KHÔNG lưu full URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Biến môi trường (set qua User Data của Launch Template trong lab)

```
DB_HOST=<rds-endpoint>
DB_USER=<username>
DB_PASS=<password>
DB_NAME=guestbook
S3_BUCKET=<tên-bucket-từ-cloudformation-output>   # chỉ dùng cho ảnh guestbook
AWS_REGION=<region>
```

## Chạy local (dev)

1. **MySQL:**
   ```bash
   docker compose up -d
   ```
   Container `mysql:8.0` sẽ tự tạo database `guestbook` + bảng
   `guestbook` (từ `db/init.sql`) khi khởi tạo lần đầu — chỉ dùng cho
   local, KHÔNG dùng khi deploy AWS (trên đó là RDS thật).

2. **S3 (tuỳ chọn — chỉ cần nếu muốn test upload ảnh):** tạo thủ công 1
   bucket dev thật trên AWS (tách biệt bucket của CloudFormation lab,
   đặt tên theo convention `local-guestbook-s3-{your-aws-account-id}`
   — xem `.env.example`). Vào bucket → tab **Permissions** → mục
   **Cross-origin resource sharing (CORS)** → dán nguyên văn:
   ```json
   [
       {
           "AllowedHeaders": ["*"],
           "AllowedMethods": ["GET", "PUT"],
           "AllowedOrigins": ["http://localhost:3000"],
           "ExposeHeaders": ["ETag"],
           "MaxAgeSeconds": 3000
       }
   ]
   ```
   Xác thực bằng AWS credentials cá nhân (`~/.aws/credentials` hoặc biến
   môi trường `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) — máy local
   không có EC2 Instance Profile. Nếu bỏ qua bước này, app vẫn chạy
   bình thường (form guestbook không kèm ảnh), chỉ `GET /presign` sẽ
   báo lỗi vì thiếu `S3_BUCKET`.

3. **Biến môi trường:**
   ```bash
   cp .env.example .env
   ```
   Sửa `S3_BUCKET`/`AWS_REGION` nếu có test upload ảnh ở bước 2. Giá
   trị mặc định của `DB_*` đã khớp sẵn với `docker-compose.yml`.

4. **Cài dependency & chạy:**
   ```bash
   npm install
   npm run dev      # nodemon, tự reload khi sửa code
   # hoặc: npm start
   ```
   Mở `http://localhost:3000` — badge "Database: Connected" và
   "Instance: local-dev" (vì không có IMDS khi chạy ngoài EC2) sẽ hiện
   trên header.
