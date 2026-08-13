// Lấy Instance ID qua IMDSv2 (token-based, KHÔNG dùng IMDSv1) để minh
// hoạ traffic đang được load balance qua nhiều instance - xem CLAUDE.md
// mục "Nguyên tắc truy cập: SSM Session Manager ONLY".
const IMDS_BASE = 'http://169.254.169.254/latest';
const TIMEOUT_MS = 1000;

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Chạy local (không phải EC2) sẽ không reach được 169.254.169.254 ->
// trả về "local-dev" thay vì throw, để trang chủ vẫn render bình thường.
async function getInstanceId() {
  try {
    const tokenRes = await fetchWithTimeout(`${IMDS_BASE}/api/token`, {
      method: 'PUT',
      headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
    });
    if (!tokenRes.ok) throw new Error(`token fetch failed: ${tokenRes.status}`);
    const token = await tokenRes.text();

    const idRes = await fetchWithTimeout(`${IMDS_BASE}/meta-data/instance-id`, {
      headers: { 'X-aws-ec2-metadata-token': token },
    });
    if (!idRes.ok) throw new Error(`instance-id fetch failed: ${idRes.status}`);
    return await idRes.text();
  } catch (err) {
    return 'local-dev';
  }
}

module.exports = { getInstanceId };
