import { useState } from 'react';
import { motion } from 'framer-motion';
import { verifyToken, getSiteFile, updateSiteFile } from '../utils/admin';

const TOKEN_KEY = 'gh_admin_token';

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
  const [token, setToken] = useState('');
  const [storedToken, setStoredToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await verifyToken(token.trim());
      const file = await getSiteFile(token.trim());
      setUser(user);
      setConfig(file.content);
      sessionStorage.setItem(TOKEN_KEY, token.trim());
      setStoredToken(token.trim());
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setStoredToken('');
    setUser(null);
    setConfig(null);
    setToken('');
  };

  const update = (section, key) => (value) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleSave = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const file = await getSiteFile(storedToken);
      await updateSiteFile(storedToken, config, file.sha);
      setMessage('تم حفظ التغييرات بنجاح! الموقع هيتحدّث تلقائياً بعد قليل.');
      setTimeout(() => setMessage(''), 6000);
    } catch (err) {
      setError(err.message || 'فشل حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  if (storedToken && !user) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-center text-text-secondary">جارِ التحقق من الجلسة...</p>
          </div>
        </div>
      </div>
    );
  }

  if (storedToken && user && config) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                لوحة <span className="gradient-text">الإدارة</span>
              </h1>
              <p className="text-text-secondary text-sm">
                مرحباً {user.login} — عدّل البيانات واضغط حفظ
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-dark-border rounded-lg text-sm text-text-secondary hover:border-red-500/50 hover:text-red-400 transition-all"
            >
              تسجيل الخروج
            </button>
          </div>

          <Section title="إعدادات الموقع">
            <Field label="اسم الموقع" value={config.site.name} onChange={update('site', 'name')} />
            <Field label="الشعار" value={config.site.tagline} onChange={update('site', 'tagline')} />
          </Section>

          <Section title="القسم الرئيسي (Hero)">
            <Field
              label="الاسم الأول"
              value={config.hero.firstName}
              onChange={update('hero', 'firstName')}
            />
            <Field
              label="الاسم الثاني"
              value={config.hero.lastName}
              onChange={update('hero', 'lastName')}
            />
            <Field
              label="الوصف"
              value={config.hero.description}
              onChange={update('hero', 'description')}
              textarea
            />
          </Section>

          <Section title="بيانات التواصل">
            <Field
              label="البريد الإلكتروني"
              value={config.contact.email}
              onChange={update('contact', 'email')}
              hint="البريد اللي هيتعرض في صفحة التواصل"
            />
            <Field
              label="رابط GitHub"
              value={config.contact.github}
              onChange={update('contact', 'github')}
              hint="مثال: https://github.com/username"
            />
            <Field
              label="اسم مستخدم GitHub"
              value={config.contact.githubUsername}
              onChange={update('contact', 'githubUsername')}
              hint="اسم المستخدم لسحب المشاريع والإحصائيات"
            />
            <Field
              label="رابط LinkedIn"
              value={config.contact.linkedin}
              onChange={update('contact', 'linkedin')}
              hint="مثال: https://linkedin.com/in/username"
            />
            <Field
              label="رابط Twitter/X"
              value={config.contact.twitter}
              onChange={update('contact', 'twitter')}
            />
          </Section>

          <Section title="عنّي">
            <Field label="النبذة" value={config.about.bio} onChange={update('about', 'bio')} textarea />
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
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-accent hover:bg-accent-light disabled:opacity-50 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-accent/30"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جارِ الحفظ على GitHub...
              </span>
            ) : (
              'حفظ التغييرات'
            )}
          </button>
          <p className="mt-4 text-center text-xs text-text-secondary">
            التغييرات بتتسجل مباشرة على GitHub وتشغّل نشراً تلقائياً للموقع.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl p-8"
        >
          <h1 className="text-3xl font-bold mb-2 text-center">
            لوحة <span className="gradient-text">الإدارة</span>
          </h1>
          <p className="text-text-secondary text-center mb-8">
            ادخل رمز GitHub الشخصي للدخول وإدارة بيانات الموقع
          </p>

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-text-primary font-medium mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="w-full px-4 py-3 bg-dark border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
                placeholder="ghp_..."
                dir="ltr"
              />
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-light disabled:opacity-50 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-accent/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جارِ الدخول...
                </span>
              ) : (
                'دخول'
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-dark rounded-lg border border-dark-border text-xs text-text-secondary leading-relaxed">
            <p className="font-bold text-text-primary mb-1">كيفية إنشاء الرمز:</p>
            <p dir="rtl">
              1. ادخل على{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
                dir="ltr"
              >
                github.com/settings/tokens
              </a>
            </p>
            <p>2. اضغط Generate new token</p>
            <p>3. فعّل صلاحية {`repo`}</p>
            <p>4. انسخ الرمز وهنا الصقُه. الرمز بيتخزن بأمان على جهازك فقط.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}