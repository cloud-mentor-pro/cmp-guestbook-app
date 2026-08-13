const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('./config');

// Trên EC2: dùng Instance Profile (s3:PutObject/GetObject - xem
// CloudFormation của repo cmp-guestbook-doc). Local dev: dùng AWS
// credentials cá nhân (~/.aws/credentials hoặc biến môi trường).
// Không cần truyền credentials tường minh - SDK v3 tự resolve theo
// default credential provider chain.
const s3 = new S3Client({ region: config.awsRegion });

const PRESIGN_UPLOAD_EXPIRES_SECONDS = 300; // 5 phút - đủ cho browser upload 1 ảnh
const PRESIGN_VIEW_EXPIRES_SECONDS = 3600; // 1 giờ - đủ thời gian xem trang chủ đã render

// Object key trong S3, KHÔNG lưu full URL (đúng data model đã chốt).
function buildObjectKey(originalFilename) {
  const ext =
    originalFilename && originalFilename.includes('.')
      ? originalFilename.split('.').pop().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      : '';
  const safeExt = ext || 'jpg';
  return `guestbook/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
}

async function createPresignedUploadUrl(originalFilename, contentType) {
  if (!config.s3.bucket) {
    throw new Error('S3_BUCKET chưa được cấu hình');
  }
  const key = buildObjectKey(originalFilename);
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_UPLOAD_EXPIRES_SECONDS });
  return { uploadUrl, key };
}

// Presigned GET URL để hiển thị ảnh trên trang chủ. Bucket giữ PRIVATE
// hoàn toàn (Block Public Access mặc định, không cần Bucket Policy
// public-read) — nhất quán với nguyên tắc "S3 chỉ truy cập qua presigned
// URL" của lab, áp dụng cho cả chiều upload lẫn chiều xem ảnh.
async function getPresignedViewUrl(key) {
  if (!key || !config.s3.bucket) return null;
  const command = new GetObjectCommand({ Bucket: config.s3.bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: PRESIGN_VIEW_EXPIRES_SECONDS });
}

module.exports = { createPresignedUploadUrl, getPresignedViewUrl };
