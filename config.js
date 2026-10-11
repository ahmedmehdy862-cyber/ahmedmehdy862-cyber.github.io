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
    siteUrl: 'https://ahmedmahdyportofolio.vercel.app/',
    author: 'أحمد مهدي',
    locale: 'en_US',
    lang: 'en',

    /* نصوص SEO الافتراضية (لو data.json مافيش seo) */
    defaultTitle: 'أحمد مهدي | مصمم جرافيك سوشيال ميديا — A.Mahdy',
    defaultDescription: 'مصمم جرافيك سوشيال ميديا في مصر — هوية بصرية، تصميم بوسترات، وحملات إعلانية. شاهد أعمالي المختارة وابدأ مشروعك.',

    /* صورة المشاركة — 1200x630 (المقاس المعياري لـ OG) */
    ogImage: 'assets/og-image.png',
    ogImageAlt: 'شعار A.Mahdy',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    twitterCard: 'summary_large_image',

    /* Google Search Console — تم التحقق بملف HTML على root:
       https://ahmedmahdyportofolio.vercel.app/google81932fd24b44f03c.html */
    googleVerification: 'google81932fd24b44f03c',

    /* ألوان وأبعاد المتصفح */
    themeColor: '#0a0a12',
    defaultLang: 'en',
    defaultDir: 'ltr'
};
if (typeof module !== 'undefined' && module.exports) module.exports = SITE_CONFIG;
