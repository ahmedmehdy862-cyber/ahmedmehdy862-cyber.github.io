/* ============================================
   إعدادات الموقع المركزية (SEO + الإعدادات الثابتة)
   ------------------------------------------------------------
   كل بيانات الـSEO الثابتة lives هنا — عدّل هذا الملف فقط.
   القيم مستخرجة من الموقع المنشور فعليًا، من غير أي اختراع.

   ملاحظة مهمة:
   - siteUrl لازم يكون رابط الموقع الحقيقي بـ HTTPS وبلا slash في الآخر.
   - googleVerification: سيبه فاضي لحد ما تضيف كود Google Search Console،
     وبعدها Website → HTML tag هيتولّد معاك الكود نفسه.
   ============================================ */
var SITE_CONFIG = {
    /* هوية الموقع */
    siteName: 'A.Mahdy',
    siteUrl: 'https://ahmedmehdy862-cyber.github.io/',
    author: 'أحمد مهدي',
    locale: 'ar_AR',
    lang: 'ar',

    /* نصوص SEO الافتراضية (لو data.json مافيش seo) */
    defaultTitle: 'A.Mahdy — أحمد مهدي | جرافيك ديزاينر ومصمم محتوى',
    defaultDescription: 'جرافيك ديزاينر ومصمم محتوى — هوية بصرية، سوشيال ميديا، موشن جرافيك ومطبوعات. شوف أعمالي المختارة وابدأ مشروعك.',

    /* صورة المشاركة — نفس لوجو الموقع الحالي (absolute URL) */
    ogImage: 'assets/Asset-1.png',
    ogImageAlt: 'شعار A.Mahdy',
    twitterCard: 'summary_large_image',

    /* Google Search Console — سيب الكود فاضي لحد ما تاخده من جوجل */
    googleVerification: '',

    /* ألوان وأبعاد المتصفح */
    themeColor: '#0a0a12',
    defaultLang: 'ar',
    defaultDir: 'rtl'
};
if (typeof module !== 'undefined' && module.exports) module.exports = SITE_CONFIG;
