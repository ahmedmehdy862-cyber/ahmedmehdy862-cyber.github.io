import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getSiteConfig } from '../utils/config';
import { verifyToken, getSiteFile, updateSiteFile } from '../utils/admin';

const TOKEN_KEY = 'gh_admin_token';
const REPO = 'ahmedmehdy862-cyber';
const REPO_NAME = 'ahmedmehdy862-cyber.github.io';
const FILE_PATH = 'public/site.json';
const EDIT_URL = `https://github.com/${REPO}/${REPO_NAME}/edit/main/${FILE_PATH}`;

function Field({ label, value, onChange, type = 'text', hint, textarea }) {
  return (
    <div className="mb-4">
      <label className="block text-text-primary font-medium mb-2">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-dark border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-dark border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
        />
      )}
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="glass rounded-2xl p-6 mb-6">
      <h2 className="text-xl font-bold text-accent mb-6">{title}</h2>
      {children}
    </div>
  );
}

export default function Admin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');

  useEffect(() => {
    getSiteConfig()
      .then((data) => {
        if (Object.keys(data).length) setConfig(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (section, key) => (value) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleOpenInGitHub = async () => {
    const json = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setMessage('تم نسخ الإعدادات! الصقها في المحرر ثم اضغط Commit changes.');
      setTimeout(() => {
        setCopied(false);
        setMessage('');
      }, 8000);
    } catch {
      setMessage('');
    }
    window.open(EDIT_URL, '_blank');
  };

  const handleSaveWithToken = async () => {
    if (!token) {
      setError('اكتب الرمز أولاً في الأسفل');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const user = await verifyToken(token);
      const file = await getSiteFile(token);
      await updateSiteFile(token, config, file.sha);
      sessionStorage.setItem(TOKEN_KEY, token);
      setMessage(`تم الحفظ تلقائياً كـ ${user.login}! الموقع هيتحدّث خلال دقيقة.`);
      setTimeout(() => setMessage(''), 6000);
    } catch (err) {
      setError(err.message || 'فشل الحفظ التلقائي');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-center text-text-secondary">جارِ تحميل الإعدادات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            لوحة <span className="gradient-text">الإدارة</span>
          </h1>
          <p className="text-text-secondary text-sm">
            عدّل بياناتك بالنموذج التالي — لا يوجد رمز مطلوب للدخول
          </p>
        </div>

        <Section title="إعدادات الموقع">
          <Field label="اسم الموقع" value={config?.site?.name || ''} onChange={update('site', 'name')} />
          <Field label="الشعار" value={config?.site?.tagline || ''} onChange={update('site', 'tagline')} />
        </Section>

        <Section title="القسم الرئيسي (Hero)">
          <Field
            label="الاسم الأول"
            value={config?.hero?.firstName || ''}
            onChange={update('hero', 'firstName')}
          />
          <Field
            label="الاسم الثاني"
            value={config?.hero?.lastName || ''}
            onChange={update('hero', 'lastName')}
          />
          <Field
            label="الوصف"
            value={config?.hero?.description || ''}
            onChange={update('hero', 'description')}
            textarea
          />
        </Section>

        <Section title="بيانات التواصل">
          <Field
            label="البريد الإلكتروني"
            value={config?.contact?.email || ''}
            onChange={update('contact', 'email')}
            hint="البريد اللي هيتعرض في صفحة التواصل"
          />
          <Field
            label="رابط GitHub"
            value={config?.contact?.github || ''}
            onChange={update('contact', 'github')}
            hint="مثال: https://github.com/username"
          />
          <Field
            label="اسم مستخدم GitHub"
            value={config?.contact?.githubUsername || ''}
            onChange={update('contact', 'githubUsername')}
            hint="اسم المستخدم لسحب المشاريع والإحصائيات"
          />
          <Field
            label="رابط LinkedIn"
            value={config?.contact?.linkedin || ''}
            onChange={update('contact', 'linkedin')}
            hint="مثال: https://linkedin.com/in/username"
          />
          <Field
            label="رابط Twitter/X"
            value={config?.contact?.twitter || ''}
            onChange={update('contact', 'twitter')}
          />
        </Section>

        <Section title="عنّي">
          <Field
            label="النبذة"
            value={config?.about?.bio || ''}
            onChange={update('about', 'bio')}
            textarea
          />
        </Section>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-center">
            {message}
          </div>
        )}

        <button
          onClick={handleOpenInGitHub}
          className="w-full py-3 bg-accent hover:bg-accent-light text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-accent/30 mb-4"
        >
          {copied ? '✓ تم النسخ — افتح المحرر والصق و Commit' : 'حفظ عبر محرر GitHub (بدون رمز)'}
        </button>

        <div className="text-center">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-text-secondary hover:text-accent text-sm transition-colors"
          >
            {showAdvanced ? 'إخفاء الحفظ التلقائي المتقدم' : 'حفظ تلقائي بالكامل (للخبراء)'}
          </button>
        </div>

        {showAdvanced && (
          <div className="glass rounded-2xl p-6 mt-4">
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">
              ادخل رمز GitHub الشخصي مرة واحدة، وسيحفظ الموقع تعديلاتك تلقائياً ويشغّل
              النشر بدون ما تفتح GitHub إطلاقاً. لإنشاء الرمز:{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
                dir="ltr"
              >
                github.com/settings/tokens
              </a>{' '}
              (فعّل صلاحية {`repo`}).
            </p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
              dir="ltr"
              className="w-full px-4 py-3 mb-4 bg-dark border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={handleSaveWithToken}
              disabled={saving}
              className="w-full py-3 bg-dark border border-accent text-accent hover:bg-accent hover:text-white rounded-lg font-medium transition-all duration-300"
            >
              {saving ? 'جارِ الحفظ...' : 'حفظ تلقائي'}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-text-secondary leading-relaxed">
          بغض النظر عن الطريقة، التغييرات بتتسجل على فرع main وتشغّل نشراً تلقائياً للموقع خلال دقيقة.
        </p>
      </div>
    </div>
  );
}