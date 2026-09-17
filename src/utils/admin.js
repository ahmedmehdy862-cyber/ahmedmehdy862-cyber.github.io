const REPO = 'ahmedmehdy862-cyber/ahmedmehdy862-cyber.github.io';
const FILE_PATH = 'public/site.json';
const API = 'https://api.github.com';

const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

export function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function fromBase64(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function verifyToken(token) {
  const res = await fetch(`${API}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error('الرمز غير صحيح أو منتهي');
  return res.json();
}

export async function getSiteFile(token) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${FILE_PATH}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error('تعذر جلب ملف الإعدادات');
  const data = await res.json();
  return {
    sha: data.sha,
    content: JSON.parse(fromBase64(data.content)),
  };
}

export async function updateSiteFile(token, content, sha) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      message: 'تحديث إعدادات الموقع من لوحة الإدارة',
      content: toBase64(JSON.stringify(content, null, 2)),
      sha,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'فشل الحفظ على GitHub');
  }
  return res.json();
}