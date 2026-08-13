(function () {
  const form = document.getElementById('guestbook-form');
  const submitBtn = document.getElementById('submit-btn');
  const msgEl = document.getElementById('form-msg');

  function setMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = 'form-msg' + (type ? ' ' + type : '');
  }

  // Upload thẳng file lên S3 bằng presigned URL (PUT) — browser -> S3,
  // KHÔNG đi qua server. Trả về object key để lưu vào RDS.
  async function uploadImageAndGetKey(file) {
    const presignRes = await fetch(
      `/presign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
    );
    if (!presignRes.ok) {
      throw new Error('Không lấy được presigned URL');
    }
    const { uploadUrl, key } = await presignRes.json();

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error('Upload ảnh lên S3 thất bại');
    }
    return key;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    setMsg('', '');
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true'); // Pico.css: hiện spinner cạnh text
    submitBtn.textContent = 'Đang gửi...';

    try {
      const name = document.getElementById('name').value.trim();
      const message = document.getElementById('message').value.trim();
      const fileInput = document.getElementById('image');
      const file = fileInput.files[0];

      let image_key = null;
      if (file) {
        submitBtn.textContent = 'Đang upload ảnh...';
        image_key = await uploadImageAndGetKey(file);
      }

      submitBtn.textContent = 'Đang lưu...';
      const submitRes = await fetch('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message, image_key }),
      });

      if (!submitRes.ok) {
        const body = await submitRes.json().catch(() => ({}));
        throw new Error(body.error || 'Lưu lời nhắn thất bại');
      }

      setMsg('✅ Đã lưu lời nhắn! Đang tải lại...', 'ok');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setMsg('❌ ' + err.message, 'err');
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Gửi lời nhắn';
    }
  });
})();
