# Git//Fault Portfolio

بورتفوليو شخصي ديناميكي متصل ببيانات GitHub.

## الميزات

- تصميم Dark Theme عصري
- دعم كامل للعربية (RTL)
- ربط تلقائي مع GitHub API
- عرض المشاريع والإحصائيات
- تصميم متجاوب لجميع الأجهزة
- حركات سلسة (Animations)

## التقنيات

- React 19
- Vite
- Tailwind CSS
- React Router
- Axios
- Framer Motion

## التثبيت

```bash
# استنساخ المستودع
git clone https://github.com/your-username/portfolio.git

# الدخول للمجلد
cd portfolio

# تثبيت الاعتماديات
npm install

# تشغيل وضع التطوير
npm run dev
```

## الإعداد

1. افتح ملف `src/utils/github.js`
2. غيّر `GITHUB_USERNAME` باسم المستخدم الخاص بك على GitHub

## النشر

### على GitHub Pages:

1. أنشئ مستودعاً على GitHub
2. ارفع الكود
3. اذهب إلى Settings > Pages
4. اختر GitHub Actions كمصدر

النشر将会 تلقائياً عند كل push للـ main branch.

## التخصيص

### تغيير الألوان

عدّل المتغيرات في `src/index.css`:

```css
@theme {
  --color-accent: #6c63ff;
  --color-accent-light: #8b83ff;
}
```

### إضافة صفحات

أنشئ ملف جديد في `src/pages/` وأضف route في `src/App.jsx`

## الترخيص

MIT License
