-- Schema khớp CLAUDE.md của repo cmp-guestbook-doc.
-- File này chỉ dùng cho local dev (docker-compose tự chạy khi khởi tạo
-- container lần đầu, mount vào /docker-entrypoint-initdb.d). Trên AWS,
-- bảng này tạo thủ công trên RDS thật (xem docs/03-tao-rds.md).

CREATE TABLE IF NOT EXISTS guestbook (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    message VARCHAR(255),
    image_key VARCHAR(255),      -- object key trong S3, KHÔNG lưu full URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
