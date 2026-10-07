/* ============================================
   CommentStore — IndexedDB التعليقات
   ============================================ */
var CommentStore = (function () {
    var DB_NAME = 'amahdy_comments';
    var STORE_NAME = 'comments';
    var DB_VERSION = 1;
    var db = null;

    function open() {
        if (db) return Promise.resolve(db);
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                var d = e.target.result;
                if (!d.objectStoreNames.contains(STORE_NAME)) {
                    var store = d.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('by_date', 'date');
                }
            };
            req.onsuccess = function (e) { db = e.target.result; resolve(db); };
            req.onerror = function (e) { reject(e.target.error); };
        });
    }

    function add(name, text) {
        return open().then(function (d) {
            return new Promise(function (resolve, reject) {
                var tx = d.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).add({ name: name, text: text, date: new Date().toISOString() });
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function getAll() {
        return open().then(function (d) {
            return new Promise(function (resolve, reject) {
                var tx = d.transaction(STORE_NAME, 'readonly');
                var req = tx.objectStore(STORE_NAME).index('by_date').getAll();
                req.onsuccess = function (e) { resolve((e.target.result || []).reverse()); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function remove(id) {
        return open().then(function (d) {
            return new Promise(function (resolve, reject) {
                var tx = d.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(id);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function clear() {
        return open().then(function (d) {
            return new Promise(function (resolve, reject) {
                var tx = d.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).clear();
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    return { add: add, getAll: getAll, remove: remove, clear: clear };
})();

/* ============================================
   FileStore — IndexedDB لتخزين الملفات الكبيرة
   ============================================ */
var FileStore = (function () {
    var DB_NAME = 'amahdy_files';
    var STORE_NAME = 'blobs';
    var DB_VERSION = 1;
    var db = null;

    function open() {
        if (db) return Promise.resolve(db);
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                var d = e.target.result;
                if (!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME);
            };
            req.onsuccess = function (e) { db = e.target.result; resolve(db); };
            req.onerror = function (e) { reject(e.target.error); };
        });
    }

    function put(key, blob) {
        return open().then(function (d) {
            return new Promise(function (resolve, reject) {
                var tx = d.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(blob, key);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function get(key) {
        return open().then(function (d) {
            return new Promise(function (resolve, reject) {
                var tx = d.transaction(STORE_NAME, 'readonly');
                var req = tx.objectStore(STORE_NAME).get(key);
                req.onsuccess = function (e) { resolve(e.target.result || null); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function del(key) {
        return open().then(function (d) {
            return new Promise(function (resolve, reject) {
                var tx = d.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(key);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function getURL(key) {
        return get(key).then(function (blob) {
            if (!blob) return null;
            return URL.createObjectURL(blob);
        });
    }

    return { put: put, get: get, del: del, getURL: getURL };
})();

/* ============================================
   Data Manager — حفظ/تحميل من localStorage
   ============================================ */
var DataManager = (function () {
    var DATA_KEY = 'amahdy_site_data';
    var LOGO_KEY = 'amahdy_logo';
    var THEME_KEY = 'amahdy_theme';
    var LAYOUT_KEY = 'amahdy_layout';
    var DIRTY_KEY = 'amahdy_edited_at';
    var remote = null;

    function setRemote(d) { remote = d || null; }
    function getRemote() { return remote; }

    function stampTime(k) {
        try { var v = parseInt(localStorage.getItem(k), 10); return isNaN(v) ? 0 : v; } catch (e) { return 0; }
    }
    function stampSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
    function stampClear(k) { try { localStorage.removeItem(k); } catch (e) {} }

    function notifyChange() {
        if (typeof Publisher !== 'undefined' && Publisher && Publisher.schedule) Publisher.schedule();
    }

    var SITE_BASE = (typeof SITE_DATA !== 'undefined' && SITE_DATA) || {};

    function withDefaults(d) {
        var base = SITE_BASE;
        if (!d || typeof d !== 'object') d = {};
        if (!d.seo || typeof d.seo !== 'object') {
            d.seo = JSON.parse(JSON.stringify(base.seo || { title: '', description: '', keywords: '', ogImage: '' }));
        }
        var fb = base.features || {};
        if (!d.features || typeof d.features !== 'object') d.features = JSON.parse(JSON.stringify(fb));
        else Object.keys(fb).forEach(function (k) { if (typeof d.features[k] !== 'boolean') d.features[k] = fb[k]; });
        return d;
    }

    function getDefault() {
        if (remote && remote.profile) return withDefaults(JSON.parse(JSON.stringify(remote)));
        return typeof SITE_DATA !== 'undefined' ? withDefaults(JSON.parse(JSON.stringify(SITE_DATA))) : null;
    }

    function load() {
        try {
            var raw = localStorage.getItem(DATA_KEY);
            if (raw) return withDefaults(JSON.parse(raw));
        } catch (e) {}
        return getDefault();
    }

    function save(data) {
        if (!lsSet(DATA_KEY, JSON.stringify(data))) {
            alert('خطأ في الحفظ — المساحة المحلية ممتلئة');
            return;
        }
        stampSet(DIRTY_KEY, Date.now());
        notifyChange();
    }

    function markPublished() { stampClear(DIRTY_KEY); }

    /* تعديل محلي لازم يبقى محفوظ—even لو اتنشر من جهاز تاني.
       بنقارن تاريخ آخر تعديل محلي بالتاريخ المنشور على السيرفر:
       لو المنشور أحدث ⇒ النسخة المحلية مجرد snapshot قديم وبنتبنّى المنشور.
       لو في تعديل محلي غير منشور ⇒ نحترمه ونسيبه زي ما هو. */
    function reconcile() {
        if (!remote) return false;
        var edited = stampTime(DIRTY_KEY);
        if (edited) return false;
        var pub = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        if (isNaN(pub)) pub = 0;
        var local = null;
        try {
            var raw = localStorage.getItem(DATA_KEY);
            if (raw) local = JSON.parse(raw);
        } catch (e) {}
        var localPub = local && local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (isNaN(localPub)) localPub = 0;
        if (!pub || localPub >= pub) return false;

        /* المنشور أحدث ⇒ نحدّث النسخة المحلية ونمسح الصور/الثيم المخزّنة محليًا */
        try { lsSet(DATA_KEY, JSON.stringify(remote)); } catch (e) {}
        stampClear(THEME_KEY);
        stampClear(LAYOUT_KEY);
        if (remote.photoUrl) {
            stampClear(LOGO_KEY);
            try {
                if (typeof FileStore !== 'undefined' && FileStore.del) {
                    FileStore.del('profile_logo').catch(function () {});
                }
            } catch (e) {}
        }
        return true;
    }

    /* كتابة آمنة — لو المساحة ممتلئة بتحاول تفضي مكان الصورة الكبيرة */
    function lsSet(key, value) {
        try { localStorage.setItem(key, value); return true; } catch (e) {}
        try {
            var v = localStorage.getItem(LOGO_KEY);
            if (key !== LOGO_KEY && v && v.length > 400000) localStorage.removeItem(LOGO_KEY);
            localStorage.setItem(key, value);
            return true;
        } catch (e2) { return false; }
    }

    /* الصورة محفوظة في IndexedDB — لو localStorage مليان نشيلها من هناك */
    function cleanupOversizedLogo() {
        try {
            var v = localStorage.getItem(LOGO_KEY);
            if (v && v.length > 400000) localStorage.removeItem(LOGO_KEY);
        } catch (e) {}
    }

    function hasLocalLogo() {
        try { return !!localStorage.getItem(LOGO_KEY); } catch (e) { return false; }
    }

    function getLogo() {
        try {
            var v = localStorage.getItem(LOGO_KEY);
            if (v) return v;
        } catch (e) {}
        if (remote && remote.photoUrl) return remote.photoUrl;
        return null;
    }

    function setLogo(dataUrl) {
        if (storeLogo(dataUrl)) {
            if (typeof Publisher !== 'undefined' && Publisher && Publisher.markPhoto) Publisher.markPhoto();
            notifyChange();
            return true;
        }
        return false;
    }

    /* حفظ بدون إشعار (مستخدم أثناء النشر عشان يمنع حلقة) */
    function storeLogo(dataUrl) { return lsSet(LOGO_KEY, dataUrl); }

    function getTheme() {
        try {
            var v = localStorage.getItem(THEME_KEY);
            if (v) return v;
        } catch (e) {}
        if (remote && remote.theme) return remote.theme;
        /* الـfallback لازم يطابق المنشور في data.json، وإلا أول رسم بيختلف
           عن الرسم النهائي = قفزة في الشكل (CLS) لكل زائر جديد */
        return SITE_BASE.theme || null;
    }

    function setTheme(theme) {
        try { localStorage.setItem(THEME_KEY, theme); notifyChange(); } catch (e) {}
    }

    function getLayout() {
        try {
            var raw = localStorage.getItem(LAYOUT_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        if (remote && remote.layout) return JSON.parse(JSON.stringify(remote.layout));
        if (SITE_BASE.layout) return JSON.parse(JSON.stringify(SITE_BASE.layout));
        return { cardStyle: 'rounded', heroStyle: 'split', sectionGap: 'md', animations: 'subtle' };
    }

    function setLayout(layout) {
        try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); notifyChange(); } catch (e) {}
    }

    function reset() {
        try {
            localStorage.removeItem(DATA_KEY);
            localStorage.removeItem(LOGO_KEY);
            localStorage.removeItem(LAYOUT_KEY);
            localStorage.removeItem(THEME_KEY);
        } catch (e) {}
    }

    return { load: load, save: save, reconcile: reconcile, markPublished: markPublished, getDefault: getDefault, setRemote: setRemote, getRemote: getRemote, hasLocalLogo: hasLocalLogo, getLogo: getLogo, setLogo: setLogo, storeLogo: storeLogo, cleanupOversizedLogo: cleanupOversizedLogo, getTheme: getTheme, setTheme: setTheme, getLayout: getLayout, setLayout: setLayout, reset: reset };
})();

/* ============================================
   RemoteData — يجلب data.json المنشور من الموقع
   ============================================ */
var RemoteData = (function () {
    function load() {
        if (!window.fetch || window.location.protocol === 'file:') return Promise.resolve(null);
        return new Promise(function (resolve) {
            var done = false;
            // مهلة 20 ثانية — لأن data.json بقى فيها الصورة وممكن يبطأ على النت البطيء
            var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 20000);
            fetch('data.json', { cache: 'no-cache' })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (d) {
                    clearTimeout(timer);
                    if (!d || !d.profile) { if (!done) { done = true; resolve(null); } return; }
                    DataManager.setRemote(d);
                    var changed = DataManager.reconcile();
                    if (!done) { done = true; resolve(d); if (changed) applyRemoteData(); }
                    else { applyRemoteData(); } // وصلت بعد المهلة — طبّقها على أي حال
                })
                .catch(function () {
                    clearTimeout(timer);
                    if (!done) { done = true; resolve(null); }
                });
        });
    }
    return { load: load };
})();

/* يبدأ جلب data.json المنشور فور تحميل السكربت */
var remoteReady = RemoteData.load();

/* إشارة "اللايوت اتطبق فعلاً" — الـpreloader بيستناها عشان ما يرسمش
   بقسم غلط الأول ويفتكر بعدين يغيّره (ده كان سبب layout shift كبير). */
var layoutReady = { done: false, cbs: [] };
function markLayoutReady() {
    layoutReady.done = true;
    var c = layoutReady.cbs; layoutReady.cbs = [];
    for (var i = 0; i < c.length; i++) { try { c[i](); } catch (e) {} }
}
function whenLayoutReady() {
    return new Promise(function (resolve) {
        if (layoutReady.done) resolve();
        else layoutReady.cbs.push(resolve);
    });
}

var Publisher = (function () {
    var TOKEN_KEY = 'amahdy_gh_token';
    var AUTO_KEY = 'amahdy_auto_publish';
    var REPO = 'ahmedmehdy862-cyber/ahmedmehdy862-cyber.github.io';
    var FILE_PATH = 'data.json';
    var HTML_PATH = 'index.html';
    var BRANCH = 'main';
    var API = 'https://api.github.com/repos/' + REPO + '/contents/' + FILE_PATH;
    var HTML_API = 'https://api.github.com/repos/' + REPO + '/contents/' + HTML_PATH;
    var timer = null;
    var publishing = false;
    var queued = false;
    var lastPublishAt = 0;
    var MIN_PUBLISH_GAP = 20000;

    function getToken() { try { return (localStorage.getItem(TOKEN_KEY) || '').trim(); } catch (e) { return ''; } }
    function setToken(v) { try { if (v) localStorage.setItem(TOKEN_KEY, v.trim()); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
    function isAuto() { try { return localStorage.getItem(AUTO_KEY) !== '0'; } catch (e) { return true; } }
    function setAuto(v) { try { localStorage.setItem(AUTO_KEY, v ? '1' : '0'); } catch (e) {} }

    function statusEl() { return document.getElementById('publishStatus'); }

    /* شارة حالة النشر في أعلى اللوحة (ظاهرة دايمًا) */
    function badgeEl() { return document.getElementById('adminPublishBadge'); }
    function setBadge(text, cls) {
        var b = badgeEl();
        if (!b) return;
        b.textContent = text;
        b.className = 'admin-publish-badge ' + (cls || '');
    }

    function setStatus(state, extra) {
        var badge = {
            noToken: ['النشر التلقائي: مفعّل', 'badge-idle'],
            autoOff: ['النشر التلقائي: متوقف', 'badge-off'],
            publishing: ['جاري النشر…', 'badge-work'],
            ok: ['تم النشر ✓', 'badge-ok'],
            idleReady: ['النشر التلقائي مفعّل', 'badge-ok'],
            photoPending: ['الصورة لم تُنشر بعد', 'badge-warn'],
            error: ['فشل النشر', 'badge-err']
        }[state];
        if (badge) setBadge(badge[0], badge[1]);
        var el = statusEl();
        if (!el) return;
        var map = {
            noToken: ['status-warn', 'أدخل GitHub Token واحفظه — عشان أي تعديل يوصل للجمهور تلقائيًا.'],
            autoOff: ['status-warn', 'النشر التلقائي متوقف — التعديلات محفوظة محليًا فقط.'],
            publishing: ['', 'جاري النشر إلى الموقع...'],
            ok: ['status-ok', 'تم النشر ✓ — الموقع هيتحدث خلال دقيقة تقريبًا.'],
            idleReady: ['status-ok', 'النشر التلقائي مفعّل — أي تعديل تحفظه هيتنشر تلقائيًا.'],
            photoPending: ['status-warn', 'صورتك لسه محليًا بس — اضغط «انشر الآن» عشان تظهر للزوار في كل الأجهزة.'],
            error: ['status-err', 'فشل النشر: ' + (extra || 'خطأ غير معروف')]
        };
        var m = map[state] || ['', extra || ''];
        el.className = 'admin-hint ' + m[0];
        el.textContent = m[1];
    }

    function refreshStatus() {
        if (!getToken()) { setStatus('noToken'); return; }
        if (!isAuto()) { setStatus('autoOff'); return; }
        var rem = DataManager.getRemote();
        var localPhoto = false;
        try { localPhoto = !!localStorage.getItem('amahdy_logo'); } catch (e) {}
        if (localPhoto && !(rem && rem.photoUrl)) { setStatus('photoPending'); return; }
        setStatus('idleReady');
    }

    function b64encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    function headers(extra) {
        var h = {
            'Authorization': 'Bearer ' + getToken(),
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
        if (extra) for (var k in extra) h[k] = extra[k];
        return h;
    }

    function api(url, method, body) {
        return fetch(url, {
            method: method,
            headers: headers(body ? { 'Content-Type': 'application/json' } : null),
            body: body ? JSON.stringify(body) : undefined
        });
    }

    function shrinkImage(src, maxSide, quality, cb) {
        var img = new Image();
        img.onload = function () {
            try {
                var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                var w = Math.max(1, Math.round(img.width * scale));
                var h = Math.max(1, Math.round(img.height * scale));
                var c = document.createElement('canvas');
                c.width = w; c.height = h;
                var ctx = c.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                cb(c.toDataURL('image/jpeg', quality));
            } catch (e) { cb(src); }
        };
        img.onerror = function () { cb(src); };
        img.src = src;
    }

    function withShrink(src, cb) {
        if (src && src.indexOf('data:') === 0 && src.length > 400000) shrinkImage(src, 1024, 0.85, cb);
        else cb(src);
    }

    function buildPayload(cb) {
        var d = DataManager.load() || {};
        var payload = {
            profile: d.profile || {},
            site: d.site || {},
            stats: d.stats || [],
            skills: d.skills || [],
            projects: d.projects || [],
            services: d.services || [],
            sections: d.sections || [],
            seo: d.seo || {},
            features: d.features || {},
            contactNote: d.contactNote || '',
            theme: DataManager.getTheme() || 'neon',
            layout: DataManager.getLayout(),
            photoUrl: null,
            updatedAt: new Date().toISOString()
        };

        function remotePhoto() {
            var rem = DataManager.getRemote();
            return (rem && rem.photoUrl) || null;
        }

        function finish(photo) { payload.photoUrl = photo; cb(payload); }

        // 1) الصورة في localStorage
        var logo = DataManager.getLogo();
        if (DataManager.hasLocalLogo() && logo && logo.indexOf('data:') === 0) {
            withShrink(logo, finish);
            return;
        }
        // 2) لو مش موجودة — جيبها من IndexedDB واحفظها محليًا
        FileStore.get('profile_logo').then(function (blob) {
            if (!blob) { finish(remotePhoto()); return; }
            var reader = new FileReader();
            reader.onload = function (ev) {
                var dataUrl = ev.target.result;
                DataManager.storeLogo(dataUrl);
                withShrink(dataUrl, finish);
            };
            reader.onerror = function () { finish(remotePhoto()); };
            reader.readAsDataURL(blob);
        }).catch(function () { finish(remotePhoto()); });
    }

    /* نسخ من الـSHA المعروف — بتتجدّد من ردّ الـPUT نفسها.
       العميل الوحيد هو اللوحة، والـ409 (حد تاني عدّل) بي force-refresh. */
    var _shaCache = { data: null, html: null, seoSig: null };

    function getSha(force) {
        if (!force && _shaCache.data) return Promise.resolve(_shaCache.data);
        return api(API + '?ref=' + BRANCH, 'GET').then(function (r) {
            if (r.status === 404) return null;
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json().then(function (j) { _shaCache.data = j.sha || null; return _shaCache.data; });
        });
    }

    function put(content, sha, attempt) {
        var body = {
            message: 'publish: تحديث محتوى الموقع ' + new Date().toISOString(),
            content: content,
            branch: BRANCH
        };
        if (sha) body.sha = sha;
        return api(API, 'PUT', body).then(function (r) {
            if (r.status === 409 && !attempt) {
                return getSha(true).then(function (newSha) { return put(content, newSha, true); });
            }
            if (!r.ok) {
                return r.json().catch(function () { return {}; }).then(function (j) {
                    throw new Error((j && j.message) || ('HTTP ' + r.status));
                });
            }
            return r.json().catch(function () { return {}; }).then(function (j) {
                if (j && j.content && j.content.sha) _shaCache.data = j.content.sha;
                return true;
            });
        });
    }

    function ensureRemote(done) {
        if (DataManager.getRemote()) { done(); return; }
        fetch('data.json', { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { if (d && d.profile) DataManager.setRemote(d); })
            .catch(function () {})
            .then(done, done);
    }

    /* ============================================
       مزامنة وسوم الـSEO مع وسوم index.html
       ------------------------------------------------------------
       واتساب/فيسبوك/تويتر **مش بيشغلوا JavaScript** — بيقرا
       الـHTML الستاتيك بس. يعني لو الـtitle متغيّرش في index.html
       الـpreview هيبان بالعنوان القديم.

       الحل: مع كل نشر بنكتب وسوم الـSEO الإضافية جوه index.html
       كمان، عشان اللي بيقرا الملف يلقا نفس الكلام.
       ============================================ */
    function escHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* بيلاقي التاج بالـmarker (زي property="og:title") ويغيّر الـcontent بتاعه */
    function setTag(html, marker, value) {
        var low = html.toLowerCase();
        var i = low.indexOf(marker.toLowerCase());
        if (i < 0) return html;
        var start = html.lastIndexOf('<', i);
        var end = html.indexOf('>', i);
        if (start < 0 || end < 0) return html;
        var tag = html.slice(start, end + 1);
        var next;
        if (/\scontent\s*=\s*["'][^"']*["']/i.test(tag)) {
            next = tag.replace(/\scontent\s*=\s*["'][^"']*["']/i, ' content="' + escHtml(value) + '"');
        } else {
            next = tag.replace(/>$/, ' content="' + escHtml(value) + '">');
        }
        return html.slice(0, start) + next + html.slice(end + 1);
    }

    function setTitleTag(html, title) {
        return html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + escHtml(title) + '</title>');
    }

    function buildHtmlSeo(payload, current) {
        var CFG = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG) || {};
        var base = CFG.siteUrl || '';
        function abs(v) {
            var s = String(v || '').trim();
            if (!s) return '';
            if (/^https?:\/\//i.test(s)) return s;
            if (/^[\w./-]+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(s)) return base.replace(/\/$/, '') + '/' + s.replace(/^\//, '');
            return '';
        }
        var seo = payload.seo || {};
        var title = String(seo.title || '').trim() || String(CFG.defaultTitle || current.title || '').trim();
        var desc = String(seo.description || '').trim();
        var img = abs(seo.ogImage) || abs(CFG.ogImage);
        var alt = String(seo.ogImageAlt || CFG.ogImageAlt || '').trim();
        var out = current.html;
        out = setTitleTag(out, title);
        out = setTag(out, 'name="description"', desc);
        out = setTag(out, 'property="og:title"', title);
        out = setTag(out, 'property="og:description"', desc);
        if (img) {
            out = setTag(out, 'property="og:image"', img);
            out = setTag(out, 'property="og:image:secure_url"', img);
            out = setTag(out, 'name="twitter:image"', img);
        }
        if (alt) {
            out = setTag(out, 'property="og:image:alt"', alt);
            out = setTag(out, 'name="twitter:image:alt"', alt);
        }
        return out;
    }

    function fetchIndexHtml() {
        return api(HTML_API + '?ref=' + BRANCH, 'GET').then(function (r) {
            if (!r.ok) throw new Error('index.html HTTP ' + r.status);
            return r.json();
        }).then(function (j) {
            var bin = String(j.content || '').replace(/\s/g, '');
            var bytes = Uint8Array.from(atob(bin), function (c) { return c.charCodeAt(0); });
            return { html: new TextDecoder('utf-8').decode(bytes), sha: j.sha || null };
        });
    }

    /* لو مش قادر يعدّل الـHTML هنكمل نشر الداتا عادي من غير ما هنشرعتمد */
    function putIndexHtml(html, sha) {
        var body = {
            message: 'publish: تحديث وسوم SEO في index.html ' + new Date().toISOString(),
            content: b64encode(html),
            branch: BRANCH
        };
        if (sha) body.sha = sha;
        return api(HTML_API, 'PUT', body).then(function (r) { return r.ok; });
    }

    /* بصمة وسوم الـSEO — لو مافيش تغيّر فيها مانعملش لا GET ولا PUT للـHTML (أوفر رحلة) */
    function seoSignature(payload) {
        var s = (payload && payload.seo) || {};
        var c = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG) || {};
        return JSON.stringify([
            String(s.title || ''), String(s.description || ''), String(s.keywords || ''),
            String(s.ogImage || ''), String(s.ogImageAlt || ''),
            String(c.defaultTitle || ''), String(c.ogImage || ''), String(c.ogImageAlt || '')
        ]);
    }

    function syncStaticSeo(payload) {
        var sig = seoSignature(payload);
        if (_shaCache.seoSig && _shaCache.seoSig === sig && _shaCache.html) return Promise.resolve(true);
        return fetchIndexHtml().then(function (cur) {
            if (sig === _shaCache.seoSig && cur.sha === _shaCache.html) return true;
            var next = buildHtmlSeo(payload, cur);
            if (next === cur.html) { _shaCache.seoSig = sig; _shaCache.html = cur.sha; return true; }
            return putIndexHtml(next, cur.sha).then(function (ok) {
                if (ok) { _shaCache.seoSig = sig; _shaCache.html = cur.sha; }
                return ok;
            });
        }).catch(function () { return false; });
    }

    /* محاولة مع إعادة محاولة تلقائية (أخطاء الشبكة / 5xx بتتكرر) */
    function attempt(content, tries) {
        tries = tries || 0;
        return getSha().then(function (sha) {
            return put(content, sha, false);
        }).catch(function (err) {
            var msg = (err && err.message) || '';
            var retryable = /network|failed to fetch|HTTP 5|timeout/i.test(msg);
            if (tries < 2 && retryable) {
                setBadge('إعادة محاولة النشر…', 'badge-work');
                return new Promise(function (r) { setTimeout(r, 2500 * (tries + 1)); }).then(function () {
                    return attempt(content, tries + 1);
                });
            }
            throw err;
        });
    }

    function publish() {
        var token = getToken();
        if (!token) { setStatus('noToken'); return Promise.resolve(false); }
        if (publishing) { queued = true; return Promise.resolve(false); }
        publishing = true;
        lastPublishAt = Date.now();
        setStatus('publishing');
        return new Promise(function (resolve) {
            ensureRemote(function () {
                buildPayload(function (payload) {
                    var json = JSON.stringify(payload, null, 2);
                    var content = b64encode(json);
                    attempt(content, 0).then(function () {
                        publishing = false;
                        DataManager.setRemote(payload);
                        DataManager.markPublished();
                        setStatus('ok');
                        setTimeout(refreshStatus, 6000);
                        resolve(true);
                        /* وسوم الـSEO الستاتيك — بعد ما الداتا تتنشر عشان الـcrawlers */
                        syncStaticSeo(payload);
                        if (queued) { queued = false; setTimeout(publish, 800); }
                    }).catch(function (err) {
                        publishing = false;
                        setStatus('error', err && err.message);
                        resolve(false);
                        if (queued) { queued = false; }
                    });
                });
            });
        });
    }

    function schedule() {
        clearTimeout(timer);
        if (!isAuto() || !getToken()) return;
        var wait = 1500;
        // مانعة تكرار: كحد أدنى 20 ثانية بين عملية نشر
        if (lastPublishAt) {
            var since = Date.now() - lastPublishAt;
            if (since < MIN_PUBLISH_GAP) wait = Math.max(wait, MIN_PUBLISH_GAP - since);
        }
        timer = setTimeout(publish, wait);
    }

    /* آخر تعديل اتحفظ — بيقارن بالداتا المنشورة ويقرر يتنشر لو فيه فرق */
    function hasPendingChanges() {
        try {
            var local = DataManager.load();
            var rem = DataManager.getRemote();
            if (!rem) return true;
            var a = JSON.stringify({ p: local.profile, s: local.site, pr: local.projects, sv: local.services, sk: local.skills, st: local.stats, se: local.seo, f: local.features, sec: local.sections });
            var b = JSON.stringify({ p: rem.profile, s: rem.site, pr: rem.projects, sv: rem.services, sk: rem.skills, st: rem.stats, se: rem.seo, f: rem.features, sec: rem.sections });
            return a !== b;
        } catch (e) { return false; }
    }

    /* أي تعديل = حفظ واحد بنفسي + نشر تلقائي بعده */
    function saveAndPublish(data) {
        DataManager.save(data);
        try {
            if (hasPendingChanges()) {
                setBadge('التعديلات جاهزة للنشر…', 'badge-work');
                schedule();
            } else if (!publishing) {
                setBadge('محفوظ — لا حاجة للنشر', 'badge-ok');
            }
        } catch (e) {}
    }

    function markPhoto() { /* الصورة جت مع أي نشر تلقائي */ }

    /* لو الصورة موجودة في IndexedDB بس مش في localStorage — انشرها للجمهور أول ما اللوحة تتفتح */
    function maybeAutoPublishPhoto() {
        if (!getToken() || !isAuto()) return;
        var rem = DataManager.getRemote();
        if (rem && rem.photoUrl) return;
        try {
            if (localStorage.getItem('amahdy_logo')) { schedule(); return; }
        } catch (e) {}
        FileStore.get('profile_logo').then(function (blob) { if (blob) schedule(); }).catch(function () {});
    }

    return {
        getToken: getToken, setToken: setToken, isAuto: isAuto, setAuto: setAuto,
        publish: publish, schedule: schedule, setStatus: setStatus, refreshStatus: refreshStatus,
        markPhoto: markPhoto, maybeAutoPublishPhoto: maybeAutoPublishPhoto,
        saveAndPublish: saveAndPublish, hasPendingChanges: hasPendingChanges, setBadge: setBadge
    };
})();

/* ============================================
   Themes
   ============================================ */
(function () {
    var root = document.documentElement;
    var saved = DataManager.getTheme();
    if (saved) root.setAttribute('data-theme', saved);

    document.addEventListener('DOMContentLoaded', function () {
        function updateDots(theme) {
            document.querySelectorAll('.theme-dot, .admin-theme-btn').forEach(function (el) {
                el.classList.toggle('active', el.getAttribute('data-theme') === theme);
            });
        }
        updateDots(saved || 'neon');

        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.theme-dot, .admin-theme-btn');
            if (!btn) return;
            var theme = btn.getAttribute('data-theme');
            root.setAttribute('data-theme', theme);
            DataManager.setTheme(theme);
            updateDots(theme);
        });
    });
})();

/* ============================================
   Layout Manager — أشكال الموقع
   ============================================ */
var LayoutManager = (function () {
    var layoutKeys = ['cardStyle', 'heroStyle', 'sectionGap', 'animations', 'font', 'bgPattern'];
    var layoutClasses = {
        cardStyle: { rounded: 'cards-rounded', square: 'cards-square', minimal: 'cards-minimal', glass: 'cards-glass', gradient: 'cards-gradient', compact: 'cards-compact', outline: 'cards-outline' },
        heroStyle: { split: 'hero-split', center: 'hero-center', minimal: 'hero-minimal' },
        sectionGap: { sm: 'gap-sm', md: 'gap-md', lg: 'gap-lg' },
        animations: { none: 'anim-none', subtle: 'anim-subtle', strong: 'anim-strong' },
        font: { cairo: 'font-cairo', noto: 'font-noto', tajawal: 'font-tajawal', almarai: 'font-almarai' },
        bgPattern: { none: 'bg-pattern-none', dots: 'bg-pattern-dots', lines: 'bg-pattern-lines', grid: 'bg-pattern-grid' }
    };

    function apply(layout) {
        var body = document.body;
        layoutKeys.forEach(function (key) {
            if (!layoutClasses[key]) return;
            Object.values(layoutClasses[key]).forEach(function (cls) { body.classList.remove(cls); });
            if (layoutClasses[key][layout[key]]) body.classList.add(layoutClasses[key][layout[key]]);
        });
        // custom accent
        if (layout.customAccent) {
            document.documentElement.style.setProperty('--custom-accent', layout.customAccent);
            document.documentElement.setAttribute('data-accent', 'custom');
        } else {
            document.documentElement.removeAttribute('data-accent');
            document.documentElement.style.removeProperty('--custom-accent');
        }
    }

    function init() {
        var saved = DataManager.getLayout();
        apply(saved);

        function setup() {
            // Layout choice buttons
            document.querySelectorAll('.admin-layout-choices').forEach(function (group) {
                var key = group.getAttribute('data-layout-key');
                if (key === 'customAccent') return;
                var btns = group.querySelectorAll('.admin-layout-btn');
                btns.forEach(function (btn) {
                    if (btn.getAttribute('data-value') === saved[key]) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                    btn.addEventListener('click', function () {
                        btns.forEach(function (b) { b.classList.remove('active'); });
                        btn.classList.add('active');
                        var layout = DataManager.getLayout();
                        layout[key] = btn.getAttribute('data-value');
                        DataManager.setLayout(layout);
                        apply(layout);
                    });
                });
            });

            // Custom accent color
            var accentInput = document.getElementById('customAccent');
            var applyBtn = document.getElementById('applyAccent');
            var resetBtn = document.getElementById('resetAccent');
            if (accentInput && applyBtn) {
                if (saved.customAccent) accentInput.value = saved.customAccent;
                applyBtn.addEventListener('click', function () {
                    var layout = DataManager.getLayout();
                    layout.customAccent = accentInput.value;
                    DataManager.setLayout(layout);
                    apply(layout);
                    var orig = applyBtn.textContent;
                    applyBtn.textContent = 'تم التطبيق ✓';
                    applyBtn.classList.add('saved');
                    setTimeout(function () { applyBtn.textContent = orig; applyBtn.classList.remove('saved'); }, 2000);
                });
            }
            if (resetBtn) {
                resetBtn.addEventListener('click', function () {
                    var layout = DataManager.getLayout();
                    delete layout.customAccent;
                    DataManager.setLayout(layout);
                    apply(layout);
                });
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    return { init: init, apply: apply };
})();

/* ============================================
   Scroll Reveal
   ============================================ */
var ScrollReveal = (function () {
    var obs = null;
    function bind() {
        if (!obs) return;
        document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
            if (el.getAttribute('data-reveal-bound')) return;
            el.setAttribute('data-reveal-bound', '1');
            obs.observe(el);
        });
    }
    function init() {
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { el.classList.add('revealed'); });
            return;
        }
        obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        bind();
    }
    /* إعادة رصد بعد أي إعادة رسم للموقع (مثل صورة جديدة) */
    function rescan() { bind(); }
    /* كشف فوري لأي عنصر مرّ بالفعل فوق الشاشة (important عند القفز بالروابط) */
    function forceVisibleUpTo(limitY) {
        document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
            var r = el.getBoundingClientRect();
            if (r.top < limitY) el.classList.add('revealed');
        });
    }

    return { init: init, rescan: rescan, forceVisibleUpTo: forceVisibleUpTo };
})();

/* ============================================
   Counter Animation
   ============================================ */
var CounterAnimation = (function () {
    function animate(el, target) {
        var start = 0;
        var duration = 1200;
        var startTime = null;
        var prefix = '';
        var suffix = '';
        var numStr = String(target).replace(/[^0-9]/g, '');
        var num = parseInt(numStr) || 0;
        prefix = String(target).split(numStr)[0] || '';
        suffix = String(target).split(numStr).slice(1).join('') || '';

        function step(ts) {
            if (!startTime) startTime = ts;
            var progress = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(eased * num);
            el.textContent = prefix + current + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function init() {
        if (!('IntersectionObserver' in window)) return;
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
var nums = entry.target.querySelectorAll('.hero-stat-num');
                    if (!nums.length) { observer.unobserve(entry.target); return; }
                    nums.forEach(function (el) {
                        var val = el.getAttribute('data-value') || el.textContent;
                        animate(el, val);
                    });
                    observer.unobserve(entry.target);
                }
            }, { threshold: 0.3 });

        var heroStats = document.getElementById('heroStats');
        if (heroStats) {
            if (heroStats.__obs) return;   /* مراقب اتربط قبل كده — متكررش */
            heroStats.__obs = 1;
            observer.observe(heroStats);
        }
    });
    }

    return { init: init };
})();

/* ============================================
   Admin Panel
   ============================================ */
(function () {
    var ADMIN_USER_HASH = '096771b94c4e41db001544503f961369d1dd4268f3d5cb44029c9c46accba476';
    var ADMIN_PASS_HASH = 'd6401d76d7b9e7c57e5e61d44608c498d8e8c3125a2dfebf0dfe5e6ead3c4b5c';
    var ADMIN_USER_PLAIN = 'A.Mahdy';
    var ADMIN_PASS_PLAIN = 'XZQ+wt=BM6QtCr';

    /* ا ل دخول مطلوب في كل مرة — مفيش حفظ ولا كوكيز، مجرد ذكرى مؤقتة في الصفحة نفسها */
    var sessionAuthed = false;
    function setAuthed(on) { sessionAuthed = !!on; }
    function isAuthed() { return sessionAuthed; }

    /* ننضّف أي أثر قديم للحفظ */
    function clearLegacyAuth() {
        try { localStorage.removeItem('amahdy_admin_ok'); } catch (e) {}
        try { sessionStorage.removeItem('amahdy_admin_ok'); } catch (e) {}
        try { document.cookie = 'amahdy_admin_ok=; path=/; max-age=0; SameSite=Lax'; } catch (e) {}
    }

    function sha256(str) {
        if (crypto && crypto.subtle) {
            return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (h) {
                return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
            });
        }
        return Promise.resolve(str);
    }

    document.addEventListener('DOMContentLoaded', function () {
        clearLegacyAuth();
        var overlay = document.getElementById('adminOverlay');
        var closeBtn = document.getElementById('adminClose');
        var loginSection = document.getElementById('adminLoginSection');
        var dashboard = document.getElementById('adminDashboard');
        var form = document.getElementById('adminForm');
        var errorEl = document.getElementById('adminError');
        var logoutBtn = document.getElementById('adminLogout');
        if (!overlay || !form) return;

        function showLogin() {
            loginSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
        }

        var lockY = 0;
        function lockScroll() {
            lockY = window.scrollY || 0;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = '-' + lockY + 'px';
            document.body.style.width = '100%';
        }
        function unlockScroll() {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, lockY);
        }

        function openPanel() {
            overlay.classList.remove('hidden');
            lockScroll();
            if (isAuthed()) showDashboard();
            else showLogin();
        }

        /* السر الأول: اكتب "amahdy" في أي مكان بالصفحة (مش جوه خانة كتابة) */
        var typed = '';
        document.addEventListener('keydown', function (e) {
            var t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            var k = (e.key || '').toLowerCase();
            if (k.length === 1) {
                typed = (typed + k).slice(-6);
                if (typed === 'amahdy') { typed = ''; openPanel(); }
            }
        });

        /* السر التاني: 3 لمسات سريعة على اللوجو (في الشريط أو في الهيرو).
           مفيش زر ظاهر، فبنعرض التلميح من أول لمسة عشان الواحد يعرف إن في لوحة تحكم. */
        var taps = [];
        var hintTimer = null;
        function showAdminHint() {
            var hint = document.getElementById('adminTapHint');
            if (!hint) return;
            hint.classList.add('show');
            clearTimeout(hintTimer);
            hintTimer = setTimeout(function () { hint.classList.remove('show'); }, 2600);
        }
        document.addEventListener('click', function (e) {
            var logo = e.target.closest('.nav-logo, .hero-logo');
            if (!logo) return;
            var now = Date.now();
            taps.push(now);
            while (taps.length && now - taps[0] > 3000) taps.shift();
            if (taps.length >= 3) {
                taps = [];
                openPanel();
                setTimeout(function () {
                    var u = document.getElementById('adminUser');
                    if (u && !u.value) u.focus();
                }, 120);
            } else if (taps.length === 1) {
                showAdminHint();
            }
        });

        function closePanel() {
            overlay.classList.add('hidden');
            unlockScroll();
            setAuthed(false); // تسجيل دخول من جديد في كل مرة
            clearLegacyAuth();
        }
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) closePanel(); });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var btn = form.querySelector('.admin-submit-btn');
            var userInput = document.getElementById('adminUser').value.trim();
            var passInput = document.getElementById('adminPass').value;
            btn.disabled = true;

            // Direct comparison first (always works)
            if (userInput === ADMIN_USER_PLAIN && passInput === ADMIN_PASS_PLAIN) {
                errorEl.classList.remove('show');
                setAuthed(true);
                showDashboard();
                btn.disabled = false;
                return;
            }

            // Hash comparison as backup
            Promise.all([sha256(userInput), sha256(passInput)]).then(function (hashes) {
                if (hashes[0] === ADMIN_USER_HASH && hashes[1] === ADMIN_PASS_HASH) {
                    errorEl.classList.remove('show');
                    setAuthed(true);
                    showDashboard();
                } else {
                    errorEl.classList.add('show');
                    setTimeout(function () { errorEl.classList.remove('show'); }, 2000);
                }
                btn.disabled = false;
            }).catch(function () {
                errorEl.classList.add('show');
                setTimeout(function () { errorEl.classList.remove('show'); btn.disabled = false; }, 2000);
            });
        });

        if (logoutBtn) logoutBtn.addEventListener('click', function () {
            setAuthed(false);
            clearLegacyAuth();
            showLogin();
        });

        /* --- Auto publish (GitHub) --- */
        var tokenInput = document.getElementById('ghTokenInput');
        var saveTokenBtn = document.getElementById('saveGhToken');
        var autoChk = document.getElementById('autoPublishChk');
        var publishNowBtn = document.getElementById('publishNowBtn');

        if (tokenInput) tokenInput.value = Publisher.getToken();
        if (autoChk) autoChk.checked = Publisher.isAuto();
        if (saveTokenBtn) saveTokenBtn.addEventListener('click', function () {
            Publisher.setToken(tokenInput.value);
            tokenInput.value = Publisher.getToken();
            Publisher.refreshStatus();
            showSaved(saveTokenBtn);
        });
        if (autoChk) autoChk.addEventListener('change', function () {
            Publisher.setAuto(autoChk.checked);
            Publisher.refreshStatus();
        });
        if (publishNowBtn) publishNowBtn.addEventListener('click', function () {
            Publisher.publish();
        });

        function showDashboard() {
            loginSection.classList.add('hidden');
            dashboard.classList.remove('hidden');
            initTabs();
            initAdminLang();
            loadProfileForm();
            loadStatsForm();
            loadSkillsForm();
            loadProjectsForm();
            loadServicesForm();
            loadPhoto();
            loadLayoutForm();
            loadFeaturesForm();
            loadSeoForm();
            loadContentForm();
            loadAboutForm();
            loadSectionsForm();
            loadCommentsAdmin();
            renderAdminStats();
            if (typeof Publisher !== 'undefined') {
                Publisher.refreshStatus();
                Publisher.maybeAutoPublishPhoto();
            }
        }

        /* --- Sections (أقسام ديناميكية) --- */
        function newSectionId() { return 'sec-' + Date.now().toString(36); }

        function loadSectionsForm() {
            var d = DataManager.load();
            var list = document.getElementById('sectionsList');
            if (!list) return;
            list.innerHTML = '';
            (d.sections || []).forEach(function (sec, i) {
                if (!sec) return;
                var itemsHtml = (sec.items || []).map(function (it, ii) {
                    return '<div class="admin-dynamic-item admin-sec-item">' +
                        '<input class="admin-input admin-input-sm" data-sec="' + i + '" data-item="' + ii + '" data-field="t" value="' + esc(it.t) + '" placeholder="اسم الجزء">' +
                        '<input class="admin-input admin-input-sm" data-sec="' + i + '" data-item="' + ii + '" data-field="d" value="' + esc(it.d || '') + '" placeholder="وصف الجزء">' +
                        '<span class="admin-row-actions"><button class="admin-mini-btn admin-dup-item" data-sec="' + i + '" data-item="' + ii + '" title="تكرار الجزء">⧉</button>' +
                        '<button class="admin-remove-btn admin-remove-item" data-sec="' + i + '" data-item="' + ii + '" title="حذف الجزء">✕</button></span>' +
                    '</div>';
                }).join('');
                var kindGrid = sec.kind !== 'text' ? ' selected' : '';
                var kindText = sec.kind === 'text' ? ' selected' : '';
                list.innerHTML += '<div class="admin-section-card" data-sec="' + i + '" data-secid="' + esc(sec.id || '') + '">' +
                    '<div class="admin-section-title-row"><strong>قسم رقم ' + (i + 1) + '</strong>' +
                    '<span class="admin-row-actions"><button class="admin-mini-btn admin-dup-section" data-sec="' + i + '" title="تكرار القسم">⧉ تكرار</button>' +
                    '<button class="admin-mini-btn admin-move-section" data-sec="' + i + '" data-dir="-1" title="تحريك لأعلى">↑</button>' +
                    '<button class="admin-mini-btn admin-move-section" data-sec="' + i + '" data-dir="1" title="تحريك لأسفل">↓</button>' +
                    '<button class="admin-remove-btn admin-remove-section" data-sec="' + i + '">✕ حذف القسم</button></span></div>' +
                    '<input class="admin-input" data-sec="' + i + '" data-field="title" value="' + esc(sec.title) + '" placeholder="اسم القسم">' +
                    '<input class="admin-input" data-sec="' + i + '" data-field="desc" value="' + esc(sec.desc || '') + '" placeholder="وصف القسم">' +
                    '<select class="admin-input" data-sec="' + i + '" data-field="kind">' +
                    '<option value="grid"' + kindGrid + '>كروت (شبكة)</option>' +
                    '<option value="text"' + kindText + '>نصوص متتالية</option>' +
                    '</select>' +
                    '<div class="admin-sec-items">' + itemsHtml + '</div>' +
                    '<button class="admin-add-btn admin-add-item" data-sec="' + i + '" style="align-self:flex-start;">+ إضافة جزء</button>' +
                '</div>';
            });
        }

        document.getElementById('addSection').addEventListener('click', function () {
            var d = DataManager.load();
            d.sections = d.sections || [];
            d.sections.push({ id: newSectionId(), title: 'قسم جديد', desc: 'اكتب وصف مختصر لهذا القسم', kind: 'grid', items: [{ t: 'اسم الجزء', d: 'وصف الجزء' }] });
            DataManager.save(d);
            loadSectionsForm();
        });

        /* تفويض الأحداث داخل قائمة الأقسام */
        var sectionsListEl = document.getElementById('sectionsList');
        if (sectionsListEl) {
            sectionsListEl.addEventListener('click', function (e) {
                var d, idx, iid;

                var addItem = e.target.closest('.admin-add-item');
                if (addItem) {
                    idx = parseInt(addItem.getAttribute('data-sec'), 10);
                    d = DataManager.load();
                    d.sections = d.sections || [];
                    if (!d.sections[idx]) return;
                    d.sections[idx].items = d.sections[idx].items || [];
                    d.sections[idx].items.push({ t: '', d: '' });
                    DataManager.save(d);
                    loadSectionsForm();
                    return;
                }

                /* تكرار قسم كامل (مع كل أجزائه) */
                var dupSection = e.target.closest('.admin-dup-section');
                if (dupSection) {
                    idx = parseInt(dupSection.getAttribute('data-sec'), 10);
                    d = DataManager.load();
                    d.sections = d.sections || [];
                    if (!d.sections[idx]) return;
                    var src = JSON.parse(JSON.stringify(d.sections[idx]));
                    src.id = newSectionId();
                    src.title = (src.title || 'قسم') + ' (نسخة)';
                    d.sections.splice(idx + 1, 0, src);
                    DataManager.save(d);
                    loadSectionsForm();
                    renderAdminStats();
                    return;
                }

                /* تكرار جزء جوا قسم */
                var dupItem = e.target.closest('.admin-dup-item');
                if (dupItem) {
                    idx = parseInt(dupItem.getAttribute('data-sec'), 10);
                    iid = parseInt(dupItem.getAttribute('data-item'), 10);
                    d = DataManager.load();
                    d.sections = d.sections || [];
                    if (!d.sections[idx] || !d.sections[idx].items[iid]) return;
                    var it = JSON.parse(JSON.stringify(d.sections[idx].items[iid]));
                    d.sections[idx].items.splice(iid + 1, 0, it);
                    DataManager.save(d);
                    loadSectionsForm();
                    return;
                }

                /* تحريك قسم فوق/تحت */
                var moveSection = e.target.closest('.admin-move-section');
                if (moveSection) {
                    idx = parseInt(moveSection.getAttribute('data-sec'), 10);
                    var dir = parseInt(moveSection.getAttribute('data-dir'), 10);
                    d = DataManager.load();
                    d.sections = d.sections || [];
                    var to = idx + dir;
                    if (to < 0 || to >= d.sections.length) return;
                    var moved = d.sections.splice(idx, 1)[0];
                    d.sections.splice(to, 0, moved);
                    DataManager.save(d);
                    loadSectionsForm();
                    return;
                }

                var rmItem = e.target.closest('.admin-remove-item');
                if (rmItem) {
                    idx = parseInt(rmItem.getAttribute('data-sec'), 10);
                    iid = parseInt(rmItem.getAttribute('data-item'), 10);
                    d = DataManager.load();
                    d.sections = d.sections || [];
                    if (d.sections[idx] && d.sections[idx].items) d.sections[idx].items.splice(iid, 1);
                    DataManager.save(d);
                    loadSectionsForm();
                    return;
                }

                var rmSection = e.target.closest('.admin-remove-section');
                if (rmSection) {
                    idx = parseInt(rmSection.getAttribute('data-sec'), 10);
                    d = DataManager.load();
                    d.sections = d.sections || [];
                    d.sections.splice(idx, 1);
                    DataManager.save(d);
                    loadSectionsForm();
                    return;
                }
            });
        }

        document.getElementById('saveSections').addEventListener('click', function () {
            var list = document.getElementById('sectionsList');
            var d = DataManager.load();
            d.sections = [];
            list.querySelectorAll('.admin-section-card').forEach(function (card) {
                var sid = card.getAttribute('data-secid') || newSectionId();
                var sec = { id: sid, title: '', desc: '', kind: 'grid', items: [] };
                var titleEl = card.querySelector('[data-field="title"]');
                var descEl = card.querySelector('[data-field="desc"]');
                var kindEl = card.querySelector('[data-field="kind"]');
                if (titleEl) sec.title = titleEl.value.trim();
                if (descEl) sec.desc = descEl.value.trim();
                if (kindEl) sec.kind = kindEl.value;
                card.querySelectorAll('.admin-sec-item').forEach(function (item) {
                    var tEl = item.querySelector('[data-field="t"]');
                    var dEl = item.querySelector('[data-field="d"]');
                    var t = tEl ? tEl.value.trim() : '';
                    if (t) sec.items.push({ t: t, d: dEl ? dEl.value.trim() : '' });
                });
                if (sec.title) d.sections.push(sec);
            });
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            showSaved(this);
        });

        /* --- Tabs --- */
        /* ===== لغة التحرير =====
           المبدّل في رأس اللوحة = لغة الموقع نفسها؛ أي حقل نصي بيتحفظ بلغة التحرير
           الحالية والغة التانية بتفضل زي ما هي (مفيش أي نص بيضيع). */
        function syncAdminLang() {
            var box = document.getElementById('adminLangSwitch');
            if (box) {
                box.querySelectorAll('.lang-btn').forEach(function (b) {
                    b.classList.toggle('active', b.getAttribute('data-lang') === Lang.get());
                });
            }
            var sub = document.getElementById('adminSidebarSub');
            if (sub) sub.textContent = 'الحقول دي بلغة ' + (Lang.get() === 'ar' ? 'عربي' : 'English') + ' — اختار القسم اللي تعدّله';
        }

        function initAdminLang() {
            var box = document.getElementById('adminLangSwitch');
            if (box && !box.__bound) {
                box.__bound = '1';
                box.addEventListener('click', function (e) {
                    var b = e.target.closest('.lang-btn');
                    if (b) Lang.setLang(b.getAttribute('data-lang'));
                });
            }
            if (!window.__adminLangBound) {
                window.__adminLangBound = '1';
                document.addEventListener('langchange', function () {
                    syncAdminLang();
                    if (!document.getElementById('adminDashboard') || document.getElementById('adminDashboard').classList.contains('hidden')) return;
                    var active = document.querySelector('.admin-tab.active');
                    if (!active) return;
                    var key = active.getAttribute('data-tab');
                    if (typeof TAB_RELOAD[key] === 'function') { try { TAB_RELOAD[key](); } catch (e) {} }
                });
            }
            syncAdminLang();
        }

        function initTabs() {
            document.querySelectorAll('.admin-tab').forEach(function (tab) {
                if (tab.dataset.tabBound) return;
                tab.dataset.tabBound = '1';
                tab.addEventListener('click', function () {
                    document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
                    document.querySelectorAll('.admin-tab-panel').forEach(function (p) { p.classList.remove('active'); });
                    tab.classList.add('active');
                    var key = tab.getAttribute('data-tab');
                    var panel = document.querySelector('[data-panel="' + key + '"]');
                    if (panel) panel.classList.add('active');
                    if (typeof TAB_RELOAD[key] === 'function') { try { TAB_RELOAD[key](); } catch (e) {} }
                    var main = document.querySelector('.admin-main');
                    if (main) main.scrollTop = 0;
                });
            });
        }

        /* إعادة رسم الليستة قبل ما التاب ينعرض (عشان_changes الجديدة تبان فورًا) */
        var TAB_RELOAD = {
            profile: loadProfileForm, stats: loadStatsForm, skills: loadSkillsForm,
            projects: loadProjectsForm, services: loadServicesForm, sections: loadSectionsForm,
            appearance: loadLayoutForm, content: function () { loadContentForm(); loadAboutForm(); }, features: loadFeaturesForm,
            seo: loadSeoForm, comments: loadCommentsAdmin
        };

        /* --- Profile --- */
        function loadProfileForm() {
            var d = DataManager.load();
            if (!d) return;
            setVal('editName', t(d.profile.name));
            setVal('editRole', t(d.profile.role));
            setVal('editTagline', t(d.profile.tagline));
            setVal('editBio', t(d.profile.bio));
            setVal('editLocation', t(d.profile.location));
            setVal('editEmail', d.profile.email);
            setVal('editGithub', d.profile.socials.github);
            setVal('editBehance', d.profile.socials.behance);
            setVal('editInstagram', d.profile.socials.instagram);
            setVal('editLinkedin', d.profile.socials.linkedin);
            setVal('editFacebook', d.profile.socials.facebook);
            setVal('editWhatsapp', d.profile.socials.whatsapp);
            loadSocialList();
        }

        /* روابط التواصل الإضافية — اسم + رابط، وبتظهر في الموقع لو فيها رابط */
        var EXTRA_SOCIALS = ['tiktok', 'telegram', 'youtube', 'twitter', 'dribbble', 'pinterest', 'threads', 'snapchat'];

        function loadSocialList() {
            var box = document.getElementById('adminSocialList');
            if (!box) return;
            var prof = (DataManager.load() || {}).profile || {};
            var s = prof.socials || {};
            var labels = prof.socialLabels || {};
            box.innerHTML = EXTRA_SOCIALS.map(function (key) {
                var name = labels[key] || SOCIAL_NAMES[key] || '';
                return '<div class="admin-social-row"><input class="admin-input admin-input-sm" data-social-name="' + key + '" placeholder="الاسم الظاهر" value="' + esc(name) + '" style="max-width:130px"><input type="url" class="admin-input admin-input-sm" data-social="' + key + '" dir="ltr" placeholder="https://..." value="' + esc(s[key] || '') + '"></div>';
            }).join('');
        }

        var SOCIAL_NAMES = {
            tiktok: 'تيك توك', telegram: 'تيليجرام', youtube: 'يوتيوب', twitter: 'X',
            dribbble: 'دريف ببل', pinterest: 'بنترست', threads: 'ثريدز', snapchat: 'سناب شات'
        };

        document.getElementById('saveProfile').addEventListener('click', function () {
            var d = DataManager.load();
            Lang.set(d.profile, 'name', getVal('editName'));
            d.profile.brand = t(d.profile.name);
            Lang.set(d.profile, 'role', getVal('editRole'));
            Lang.set(d.profile, 'tagline', getVal('editTagline'));
            Lang.set(d.profile, 'bio', getVal('editBio'));
            Lang.set(d.profile, 'location', getVal('editLocation'));
            d.profile.email = getVal('editEmail');
            d.profile.socials.github = getVal('editGithub');
            d.profile.socials.behance = getVal('editBehance');
            d.profile.socials.instagram = getVal('editInstagram');
            d.profile.socials.linkedin = getVal('editLinkedin');
            d.profile.socials.facebook = getVal('editFacebook');
            d.profile.socials.whatsapp = getVal('editWhatsapp');
            // روابط إضافية: الاسم المخصص + الرابط (الفاضي بيتشال)
            document.querySelectorAll('[data-social]').forEach(function (urlEl) {
                var key = urlEl.getAttribute('data-social');
                var url = urlEl.value.trim();
                var nameEl = document.querySelector('[data-social-name="' + key + '"]');
                var custom = nameEl ? nameEl.value.trim() : '';
                if (url) {
                    d.profile.socials[key] = url;
                    if (custom) { d.profile.socialLabels = d.profile.socialLabels || {}; d.profile.socialLabels[key] = custom; }
                    SiteControls.setSocialLabel(key, custom);
                } else {
                    delete d.profile.socials[key];
                    if (d.profile.socialLabels) delete d.profile.socialLabels[key];
                }
            });
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            CounterAnimation.init();
            showSaved(this);
        });

        /* ===== أدوات تكرار/إعادة تسمية لكل القوائم =====
           dupKey: الحقل اللي بيتكرر • nameKey: الحقل اللي بيتغيّر */
        function uniqueName(base, taken) {
            var name = String(base || 'بدون اسم');
            if (taken.indexOf(name) === -1) return name;
            var n = 2;
            while (taken.indexOf(name + ' ' + n) !== -1) n++;
            return name + ' ' + n;
        }

        /* نص واحد للمقارنة سواء الحقل نص أو ثنائي اللغة {en,ar} */
        function biText(v) {
            if (v == null) return '';
            if (typeof v === 'object' && !Array.isArray(v)) return String(v.en || v.ar || '');
            return String(v);
        }
        function dupItem(listName, i, dupKey, nameKey) {
            var d = DataManager.load();
            var arr = d[listName] || [];
            if (!arr[i]) return;
            var copy = JSON.parse(JSON.stringify(arr[i]));
            var src = arr[i][nameKey];
            var taken = arr.map(function (x) { return biText(x[nameKey]); });
            if (src && typeof src === 'object' && !Array.isArray(src)) {
                /* حقل ثنائي اللغة: نضيف الرقم للاتنين مع بعض بدل ما يطلع [object Object] */
                var b = asBi(src);
                var en = String(b.en || '').replace(/\s+\d+$/, '');
                var ar = String(b.ar || '').replace(/\s+\d+$/, '');
                var n = 2;
                while (taken.indexOf((en || 'بدون اسم') + ' ' + n) !== -1 ||
                       taken.indexOf((ar || 'بدون اسم') + ' ' + n) !== -1) n++;
                copy[nameKey] = { en: (en || 'بدون اسم') + ' ' + n, ar: (ar || 'بدون اسم') + ' ' + n };
            } else {
                copy[nameKey] = uniqueName(String(src || 'بدون اسم').replace(/\s+\d+$/, ''), taken);
            }
            arr.splice(i + 1, 0, copy);
            DataManager.save(d);
        }

        /* ضمان اسم فريد: لو الاسم موجود بنضيف رقم (٢، ٣…) */
        function ensureUniqueName(takenNames, next) {
            var taken = takenNames.slice();
            return uniqueName(next, taken);
        }

        /* ملاحظة: الربط بيتم مرة واحدة بس على الحاوية (تفويض الأحداث) —
           عشان إعادة رسم الليستة ما duplicatش المستمعات */
        function bindOnce(container, key, handler) {
            if (!container || container.dataset[key]) return;
            container.dataset[key] = '1';
            container.addEventListener('click', handler);
        }

        /* ✎ =ظهور/تعديل الاسم، ⧉ = تكرار فوري */
        function rowIndexOf(btn) {
            var card = btn.closest('[data-idx]');
            return card ? parseInt(card.getAttribute('data-idx'), 10) : -1;
        }

        function focusNameField(btn, nameKey) {
            var card = btn.closest('[data-idx]');
            /* الزر نفسه عليه data-idx، فالمطلوب الحاوية اللي فيها الحقول */
            while (card && !card.querySelector('[data-field="' + nameKey + '"]')) {
                card = card.parentElement ? card.parentElement.closest('[data-idx]') : null;
            }
            if (!card) return;
            var field = card.querySelector('[data-field="' + nameKey + '"]');
            if (field) { field.focus(); field.select(); field.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        }

        function collectStats() {
            var old = (DataManager.load().stats) || [];
            var out = [];
            document.querySelectorAll('#statsList .admin-dynamic-item').forEach(function (item, i) {
                var vEl = item.querySelector('[data-field="value"]');
                var lEl = item.querySelector('[data-field="label"]');
                var prev = old[i] || {};
                out.push({
                    value: biVal(prev.value, vEl ? vEl.value : ''),
                    label: biVal(prev.label, lEl ? lEl.value : '')
                });
            });
            return out;
        }

        function collectSkills() {
            var old = (DataManager.load().skills) || [];
            var vals = [];
            document.querySelectorAll('#skillsList .admin-dynamic-item input').forEach(function (inp) {
                if (inp.value.trim()) vals.push(inp.value.trim());
            });
            return biList(old, vals);
        }

        /* قراءة DOM → بيانات محفوظة قبل أي عملية صف (تكرار/حذف/تحريك)
           عشان التعديلات اللي لسه ما اتحفظتش ضايشش */
        var LIST_FLUSH = {
            stats: collectStats,
            skills: collectSkills,
            projects: collectProjects,
            services: collectServices
        };
        function flushList(listName) {
            var fn = LIST_FLUSH[listName];
            if (!fn) return;
            try {
                var d = DataManager.load();
                var next = fn();
                if (next) { d[listName] = next; DataManager.save(d); }
            } catch (e) {}
        }

        function bindRowTools(container, listName, dupKey, nameKey, reload, after) {
            if (!container) return;
            bindOnce(container, 'rowTools', function (e) {
                var mv = e.target.closest('[data-move]');
                if (mv) {
                    var mi = rowIndexOf(mv);
                    var to = mv.getAttribute('data-move') === 'up' ? mi - 1 : mi + 1;
                    if (mi > -1) {
                        flushList(listName);
                        var md = DataManager.load();
                        var marr = md[listName] || [];
                        if (to >= 0 && to < marr.length) {
                            var moved = marr.splice(mi, 1)[0];
                            marr.splice(to, 0, moved);
                            DataManager.save(md);
                            reload();
                            if (after) after();
                        }
                    }
                    return;
                }
                var ren = e.target.closest('[data-rename]');
                if (ren) { flushList(listName); focusNameField(ren, nameKey); return; }
                var dup = e.target.closest('[data-dup]');
                if (dup) {
                    var j = rowIndexOf(dup);
                    if (j > -1) {
                        flushList(listName);
                        dupItem(listName, j, dupKey, nameKey);
                        reload();
                        if (after) after();
                    }
                    return;
                }
                var del = e.target.closest('.admin-remove-btn');
                if (del && !del.hasAttribute('data-sec')) {
                    var k = rowIndexOf(del);
                    if (k > -1) {
                        flushList(listName);
                        var dd = DataManager.load();
                        dd[listName].splice(k, 1);
                        DataManager.save(dd);
                        reload();
                        if (after) after();
                    }
                }
            });
        }

        /* --- Stats --- */
        function loadStatsForm() {
            var d = DataManager.load();
            var list = document.getElementById('statsList');
            list.innerHTML = '';
            (d.stats || []).forEach(function (s, i) {
                list.innerHTML += '<div class="admin-dynamic-item" data-idx="' + i + '"><input class="admin-input admin-input-sm" value="' + esc(t(s.value)) + '" data-field="value" placeholder="الرقم"><input class="admin-input admin-input-sm" value="' + esc(t(s.label)) + '" data-field="label" placeholder="التسمية"><button class="admin-mini-btn" data-rename="stats" data-idx="' + i + '" title="تغيير الاسم">✎</button><button class="admin-mini-btn" data-dup="stats" data-idx="' + i + '" title="تكرار">⧉</button><button class="admin-remove-btn" data-idx="' + i + '">✕</button></div>';
            });
            bindRowTools(list, 'stats', 'value', 'label', loadStatsForm, renderAdminStats);
        }

        document.getElementById('addStat').addEventListener('click', function () {
            var d = DataManager.load();
            d.stats.push({ value: asBi(''), label: asBi('') });
            DataManager.save(d);
            loadStatsForm();
        });

        document.getElementById('saveStats').addEventListener('click', function () {
            var d = DataManager.load();
            d.stats = collectStats();
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            CounterAnimation.init();
            showSaved(this);
        });

        /* --- Skills --- */
        function loadSkillsForm() {
            var d = DataManager.load();
            var list = document.getElementById('skillsList');
            list.innerHTML = '';
            (d.skills || []).forEach(function (s, i) {
                list.innerHTML += '<div class="admin-dynamic-item" data-idx="' + i + '"><input class="admin-input admin-input-sm" value="' + esc(t(s)) + '" placeholder="اسم المهارة"><button class="admin-mini-btn" data-rename="skills" data-idx="' + i + '" title="تغيير الاسم">✎</button><button class="admin-mini-btn" data-dup="skills" data-idx="' + i + '" title="تكرار">⧉</button><button class="admin-remove-btn" data-idx="' + i + '">✕</button></div>';
            });
            bindStringListTools(list, 'skills', loadSkillsForm);
        }

        /* قوائم نصوص (المهارات) — تكرار + تحديد الحقل + حذف */
        function bindStringListTools(container, listName, reload) {
            if (!container) return;
            bindOnce(container, 'rowTools', function (e) {
                var ren = e.target.closest('[data-rename]');
                var dup = e.target.closest('[data-dup]');
                var del = e.target.closest('.admin-remove-btn');
                if (!ren && !dup && !del) return;
                var card = e.target.closest('[data-idx]');
                var i = card ? parseInt(card.getAttribute('data-idx'), 10) : -1;
                if (i < 0) return;
                if (ren) {
                    var input = card.querySelector('input');
                    if (input) { input.focus(); input.select(); input.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
                    return;
                }
                var d = DataManager.load();
                var arr = d[listName] || [];
                if (dup) {
                    var base = String(t(arr[i]) || '').replace(/\s+\d+$/, '');
                    var copy = asBi(arr[i]);
                    copy[Lang.get()] = ensureUniqueName(Lang.list(arr), base);
                    arr.splice(i + 1, 0, copy);
                } else {
                    arr.splice(i, 1);
                }
                DataManager.save(d);
                reload();
                renderAdminStats();
            });
        }

        document.getElementById('addSkill').addEventListener('click', function () {
            var d = DataManager.load();
            d.skills.push(asBi(''));
            DataManager.save(d);
            loadSkillsForm();
        });

        document.getElementById('saveSkills').addEventListener('click', function () {
            var d = DataManager.load();
            d.skills = collectSkills();
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            showSaved(this);
        });

        /* --- المشاريع --- */
        function collectProjects() {
            var old = (DataManager.load().projects) || [];
            var out = [];
            document.querySelectorAll('#projectsList .admin-project-item').forEach(function (item, i) {
                var q = function (f) { var el = item.querySelector('[data-field="' + f + '"]'); return el ? el.value : ''; };
                var chk = function (f) { var el = item.querySelector('[data-field="' + f + '"]'); return !!(el && el.checked); };
                var sel = function (f, def) { var el = item.querySelector('[data-field="' + f + '"]'); return el && el.value ? el.value : def; };
                var prev = old[i] || {};
                var base = {};
                Object.keys(prev).forEach(function (k) { base[k] = prev[k]; });
                var categoryLabel = biVal(prev.categoryLabel, q('categoryLabel'));
                base.title = biVal(prev.title, q('title'));
                base.category = q('category');
                base.categoryLabel = categoryLabel;
                base.description = biVal(prev.description, q('description'));
                base.image = q('image');
                base.tools = biVal(prev.tools, q('tools'));
                base.link = q('link');
                base.tags = [t(categoryLabel)];
                base.year = q('year');
                base.featured = chk('featured');
                base.status = sel('status', 'published');
                out.push(base);
            });
            return out;
        }

        function loadProjectsForm() {
            var d = DataManager.load();
            var list = document.getElementById('projectsList');
            if (!list) return;
            list.innerHTML = '';
            (d.projects || []).forEach(function (p, i) {
                var hidden = p.status === 'hidden';
                list.innerHTML += '<div class="admin-dynamic-item admin-project-item" data-idx="' + i + '">' +
                    '<div class="admin-project-header"><strong>' + esc(t(p.title)) + '</strong>' +
                    '<span class="project-tag">' + esc(t(p.categoryLabel)) + '</span>' +
                    '<span class="admin-status-chip' + (hidden ? ' is-hidden' : '') + '">' + (hidden ? 'مخفي' : 'منشور') + '</span></div>' +
                    '<div class="admin-project-fields">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(t(p.title)) + '" data-field="title" placeholder="العنوان">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(p.category) + '" data-field="category" placeholder="التصنيف (identity/social/motion/print)">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(t(p.categoryLabel)) + '" data-field="categoryLabel" placeholder="اسم التصنيف">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(p.year) + '" data-field="year" placeholder="السنة">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(p.image) + '" data-field="image" dir="ltr" placeholder="رابط الصورة (اختياري)">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(t(p.tools)) + '" data-field="tools" placeholder="الأدوات (مفصولة بفاصلة: فوتوشوب، إيليستريتور)">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(p.link) + '" data-field="link" dir="ltr" placeholder="رابط المشروع (اختياري)">' +
                    '<textarea class="admin-input admin-input-sm" data-field="description" rows="2" placeholder="الوصف">' + esc(t(p.description)) + '</textarea>' +
                    '</div>' +
                    '<div class="admin-meta-row">' +
                    '<label class="admin-check-label"><input type="checkbox" data-field="featured"' + (p.featured ? ' checked' : '') + '> ★ مميّز (يظهر بعلامة)</label>' +
                    '<select class="admin-select" data-field="status"><option value="published"' + (hidden ? '' : ' selected') + '>منشور في الموقع</option><option value="hidden"' + (hidden ? ' selected' : '') + '>مخفي</option></select>' +
                    '</div>' +
                    '<div class="admin-item-footer">' +
                    '<button class="admin-mini-btn" data-move="up" data-idx="' + i + '" title="تحريك لأعلى">↑ أعلى</button>' +
                    '<button class="admin-mini-btn" data-move="down" data-idx="' + i + '" title="تحريك لأسفل">↓ أسفل</button>' +
                    '<button class="admin-mini-btn" data-rename="projects" data-idx="' + i + '" title="تغيير الاسم">✎ تغيير الاسم</button>' +
                    '<button class="admin-mini-btn" data-dup="projects" data-idx="' + i + '" title="تكرار">⧉ تكرار</button>' +
                    '<button class="admin-remove-btn" data-idx="' + i + '">✕ حذف المشروع</button>' +
                    '</div></div>';
            });
            bindRowTools(list, 'projects', 'title', 'title', loadProjectsForm, renderAdminStats);
        }

        document.getElementById('addProject').addEventListener('click', function () {
            var d = DataManager.load();
            var isAr = Lang.get() === 'ar';
            d.projects.push({
                title: { en: 'New project', ar: 'مشروع جديد' },
                category: 'social',
                categoryLabel: { ar: 'سوشيال ميديا', en: 'Social Media' },
                description: { en: 'Project description', ar: 'وصف المشروع' },
                image: '', tools: '', link: '', tags: [], year: '2026',
                featured: false, status: 'published'
            });
            DataManager.save(d);
            loadProjectsForm();
            renderAdminStats();
        });

        document.getElementById('saveProjects').addEventListener('click', function () {
            var d = DataManager.load();
            d.projects = collectProjects();
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            renderAdminStats();
            showSaved(this);
        });

        /* --- المزايا (تحكم أدق في أجزاء الموقع) --- */
        function loadFeaturesForm() {
            var f = SiteControls.features(DataManager.load());
            document.querySelectorAll('[data-feature]').forEach(function (chk) {
                chk.checked = !!f[chk.getAttribute('data-feature')];
            });
        }

        document.getElementById('saveFeatures').addEventListener('click', function () {
            var d = DataManager.load();
            d.features = {};
            document.querySelectorAll('[data-feature]').forEach(function (chk) {
                d.features[chk.getAttribute('data-feature')] = chk.checked;
            });
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            SiteControls.applyFeatures(d);
            renderSite();
            showSaved(this);
        });

        document.getElementById('resetFeatures').addEventListener('click', function () {
            var d = DataManager.load();
            d.features = JSON.parse(JSON.stringify(SiteControls.DEFAULTS));
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            loadFeaturesForm();
            SiteControls.applyFeatures(d);
            renderSite();
            showSaved(this);
        });

        /* --- SEO ومشاركة --- */
        function renderSeoPreview() {
            var box = document.getElementById('seoPreview');
            if (!box) return;
            var t = getVal('seoTitle') || 'عنوان الصفحة';
            var desc = getVal('seoDescription') || 'وصف الصفحة سيظهر هنا — اكتب وصفًا واضحًا ١٥٠ حرفًا';
            var img = getVal('seoOgImage');
            box.innerHTML =
                '<div class="seo-prev-head">' + escHtml('ahmedmehdy862-cyber.github.io') + '</div>' +
                '<div class="seo-prev-title">' + escHtml(t) + '</div>' +
                '<div class="seo-prev-desc">' + escHtml(desc) + '</div>' +
                (img ? '<div class="seo-prev-img">' + escHtml(img) + '</div>' : '');
        }

        function loadSeoForm() {
            var s = (DataManager.load() || {}).seo || {};
            setVal('seoTitle', s.title);
            setVal('seoDescription', s.description);
            setVal('seoKeywords', s.keywords);
            setVal('seoOgImage', s.ogImage);
            renderSeoPreview();
        }

        ['seoTitle', 'seoDescription', 'seoKeywords', 'seoOgImage'].forEach(function (id) {
            var node = document.getElementById(id);
            if (node) node.addEventListener('input', renderSeoPreview);
        });

        document.getElementById('saveSeo').addEventListener('click', function () {
            var d = DataManager.load();
            d.seo = {
                title: getVal('seoTitle'),
                description: getVal('seoDescription'),
                keywords: getVal('seoKeywords'),
                ogImage: getVal('seoOgImage')
            };
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            SiteControls.applySeo(d);
            renderSite();
            showSaved(this);
        });

        /* --- عدّادات اللوحة --- */
        function renderAdminStats() {
            var box = document.getElementById('adminStats');
            if (!box) return;
            var d = DataManager.load() || {};
            var rem = DataManager.getRemote() || {};
            var updated = rem.updatedAt ? new Date(rem.updatedAt) : null;
            var cells = [
                { n: (d.projects || []).length, l: 'مشروع' },
                { n: (d.services || []).length, l: 'خدمة' },
                { n: (d.skills || []).length, l: 'مهارة' },
                { n: (d.sections || []).length, l: 'قسم مضاف' },
                { n: (d.projects || []).filter(function (p) { return !!p.image; }).length, l: 'صورة مرفوعة' },
                { n: updated && !isNaN(updated) ? updated.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : '—', l: 'آخر نشر' }
            ];
            box.innerHTML = cells.map(function (c) {
                return '<div class="admin-stat"><b>' + escHtml(String(c.n)) + '</b><span>' + escHtml(c.l) + '</span></div>';
            }).join('');
            CommentStore.getAll().then(function (list) {
                if (!list) return;
                var extra = document.createElement('div');
                extra.className = 'admin-stat';
                extra.innerHTML = '<b>' + list.length + '</b><span>تعليق</span>';
                box.appendChild(extra);
            }).catch(function () {});
        }

        /* --- إجراءات سريعة --- */
        var quickPublish = document.getElementById('quickPublish');
        var quickExport = document.getElementById('quickExport');
        var quickImport = document.getElementById('quickImport');
        var importInput = document.getElementById('importDataInput');

        if (quickPublish) quickPublish.addEventListener('click', function () {
            if (typeof Publisher !== 'undefined') Publisher.publish();
            else showSaved(this);
        });

        if (quickExport) quickExport.addEventListener('click', function () {
            var d = DataManager.load() || {};
            var blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'portfolio-backup-' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
        });

        if (quickImport) quickImport.addEventListener('click', function () { importInput.click(); });

        if (importInput) importInput.addEventListener('change', function () {
            var file = importInput.files && importInput.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                var incoming;
                try { incoming = JSON.parse(ev.target.result); } catch (e) { alert('الملف مش صالح'); return; }
                if (!incoming || !incoming.profile) { alert('الملف ده مش نسخة احتياطية للموقع'); return; }
                if (!confirm('استيراد البيانات دي هيستبدل المحتوى الحالي — متأكد؟')) return;
                DataManager.save(incoming);
                renderSite();
                ScrollReveal.init();
                CounterAnimation.init();
                showDashboard();
                renderAdminStats();
                alert('تم الاستيراد بنجاح');
            };
            reader.readAsText(file);
            importInput.value = '';
        });

        /* --- Services --- */
        function collectServices() {
            var old = (DataManager.load().services) || [];
            var out = [];
            document.querySelectorAll('#servicesList .admin-service-item').forEach(function (item, i) {
                var q = function (f) { var el = item.querySelector('[data-field="' + f + '"]'); return el ? el.value : ''; };
                var chk = function (f) { var el = item.querySelector('[data-field="' + f + '"]'); return !!(el && el.checked); };
                var sel = function (f, def) { var el = item.querySelector('[data-field="' + f + '"]'); return el && el.value ? el.value : def; };
                var prev = old[i] || {};
                var base = {};
                Object.keys(prev).forEach(function (k) { base[k] = prev[k]; });
                base.name = biVal(prev.name, q('name'));
                base.price = biVal(prev.price, q('price'));
                base.features = biList(prev.features, linesOf(q('features')));
                base.delivery = biVal(prev.delivery, q('delivery'));
                base.featured = chk('featured');
                base.kind = sel('kind', 'service');
                base.status = sel('status', 'published');
                out.push(base);
            });
            return out;
        }

        function loadServicesForm() {
            var d = DataManager.load();
            var list = document.getElementById('servicesList');
            if (!list) return;
            list.innerHTML = '';
            (d.services || []).forEach(function (s, i) {
                var hidden = s.status === 'hidden';
                var isPricing = s.kind === 'pricing';
                list.innerHTML += '<div class="admin-dynamic-item admin-service-item" data-idx="' + i + '">' +
                    '<div class="admin-project-header"><strong>' + esc(t(s.name)) + '</strong>' +
                    '<span class="project-tag">' + esc(t(s.price)) + '</span>' +
                    '<span class="admin-status-chip' + (hidden ? ' is-hidden' : '') + '">' + (hidden ? 'مخفي' : 'منشور') + '</span>' +
                    '<span class="admin-kind-chip' + (isPricing ? ' is-pricing' : '') + '">' + (isPricing ? 'باقة' : 'خدمة') + '</span></div>' +
                    '<div class="admin-project-fields">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(t(s.name)) + '" data-field="name" placeholder="اسم الخدمة">' +
                    '<input class="admin-input admin-input-sm" value="' + esc(t(s.price)) + '" data-field="price" placeholder="السعر">' +
                    '<textarea class="admin-input admin-input-sm" data-field="features" rows="3" placeholder="المميزات (كل سطر ميزة)">' + esc(Lang.list(s.features).join('\n')) + '</textarea>' +
                    '<input class="admin-input admin-input-sm" value="' + esc(t(s.delivery)) + '" data-field="delivery" placeholder="مدة التسليم">' +
                    '</div>' +
                    '<div class="admin-meta-row">' +
                    '<label class="admin-check-label"><input type="checkbox" data-field="featured"' + (s.featured ? ' checked' : '') + '> الأكثر طلباً</label>' +
                    '<select class="admin-select" data-field="kind"><option value="service"' + (isPricing ? '' : ' selected') + '>خدمة أساسية</option><option value="pricing"' + (isPricing ? ' selected' : '') + '>باقة تسعير</option></select>' +
                    '<select class="admin-select" data-field="status"><option value="published"' + (hidden ? '' : ' selected') + '>منشور</option><option value="hidden"' + (hidden ? ' selected' : '') + '>مخفي</option></select>' +
                    '</div>' +
                    '<div class="admin-item-footer">' +
                    '<button class="admin-mini-btn" data-move="up" data-idx="' + i + '" title="تحريك لأعلى">↑ أعلى</button>' +
                    '<button class="admin-mini-btn" data-move="down" data-idx="' + i + '" title="تحريك لأسفل">↓ أسفل</button>' +
                    '<button class="admin-mini-btn" data-rename="services" data-idx="' + i + '" title="تغيير الاسم">✎ تغيير الاسم</button>' +
                    '<button class="admin-mini-btn" data-dup="services" data-idx="' + i + '" title="تكرار">⧉ تكرار</button>' +
                    '<button class="admin-remove-btn" data-idx="' + i + '">✕ حذف الخدمة</button>' +
                    '</div></div>';
            });
            bindRowTools(list, 'services', 'name', 'name', loadServicesForm, renderAdminStats);
        }

        document.getElementById('addService').addEventListener('click', function () {
            var d = DataManager.load();
            var isAr = Lang.get() === 'ar';
            d.services.push({
                name: { en: 'New service', ar: 'خدمة جديدة' },
                price: { en: 'From $0', ar: 'ابتداءً من 0$' },
                features: [{ en: 'Feature 1', ar: 'ميزة 1' }, { en: 'Feature 2', ar: 'ميزة 2' }],
                delivery: { en: 'Delivery: 1 week', ar: 'مدة التسليم: أسبوع' },
                featured: false, kind: 'service', status: 'published'
            });
            DataManager.save(d);
            loadServicesForm();
            renderAdminStats();
        });

        document.getElementById('saveServices').addEventListener('click', function () {
            var d = DataManager.load();
            d.services = collectServices();
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            renderAdminStats();
            showSaved(this);
        });

        /* --- Photo --- */
        function shrinkDataUrl(dataUrl, cb) {
            var img = new Image();
            img.onload = function () {
                try {
                    var max = 1024;
                    var scale = Math.min(1, max / Math.max(img.width, img.height));
                    var w = Math.max(1, Math.round(img.width * scale));
                    var h = Math.max(1, Math.round(img.height * scale));
                    var c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    var ctx = c.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    cb(c.toDataURL('image/jpeg', 0.85));
                } catch (e) { cb(dataUrl); }
            };
            img.onerror = function () { cb(dataUrl); };
            img.src = dataUrl;
        }

        function applyPhoto(src) {
            if (!src) return false;
            var preview = document.getElementById('adminLogoPreview');
            var avatar = document.getElementById('aboutAvatar');
            if (preview) preview.innerHTML = '<img src="' + esc(src) + '" alt="Logo">';
            if (avatar) { avatar.innerHTML = '<img src="' + esc(src) + '" alt="A.M">'; avatar.classList.add('has-logo'); }
            return true;
        }

        function loadPhoto() {
            var logo = DataManager.getLogo();
            if (applyPhoto(logo)) return;
            FileStore.getURL('profile_logo').then(function (url) { applyPhoto(url); });
        }

        document.getElementById('logoUpload').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            var progress = document.getElementById('logoProgress');
            var fill = document.getElementById('logoProgressFill');
            if (progress) { progress.classList.remove('hidden'); if (fill) fill.style.width = '30%'; }
            // Store large files in IndexedDB (no size limit)
            FileStore.put('profile_logo', file).then(function () {
                if (fill) fill.style.width = '70%';
                var reader = new FileReader();
                reader.onload = function (ev) {
                    shrinkDataUrl(ev.target.result, function (small) {
                        if (!DataManager.setLogo(small)) DataManager.setLogo(ev.target.result);
                        if (fill) fill.style.width = '100%';
                        loadPhoto();
                        setTimeout(function () { if (progress) progress.classList.add('hidden'); if (fill) fill.style.width = '0%'; }, 800);
                    });
                };
                reader.readAsDataURL(file);
            }).catch(function () {
                if (progress) progress.classList.add('hidden');
                alert('خطأ في رفع الملف');
            });
        });

        /* --- Layout --- */
        function loadLayoutForm() {
            var layout = DataManager.getLayout();
            document.querySelectorAll('.admin-layout-choices').forEach(function (group) {
                var key = group.getAttribute('data-layout-key');
                group.querySelectorAll('.admin-layout-btn').forEach(function (btn) {
                    btn.classList.toggle('active', btn.getAttribute('data-value') === layout[key]);
                });
            });
        }

        /* --- Content --- */
        /* --- نصوص الموقع (ثنائي اللغة) --- */
        var SITE_TEXT_FIELDS = [
            ['badge', 'editBadge'], ['heroBtn1', 'editHeroBtn1'], ['heroBtn2', 'editHeroBtn2'],
            ['aboutTitle', 'editAboutTitle'], ['aboutDesc', 'editAboutDesc'],
            ['projectsTitle', 'editProjectsTitle'], ['projectsDesc', 'editProjectsDesc'],
            ['servicesTitle', 'editServicesTitle'], ['servicesDesc', 'editServicesDesc'],
            ['contactTitle', 'editContactTitle'], ['contactDesc', 'editContactDesc'],
            ['contactCard1', 'editContactCard1'], ['contactCard2', 'editContactCard2'], ['contactCard3', 'editContactCard3'],
            ['footerText', 'editFooterText']
        ];

        function loadContentForm() {
            var d = DataManager.load();
            if (!d || !d.site) return;
            SITE_TEXT_FIELDS.forEach(function (pair) { setVal(pair[1], t(d.site[pair[0]])); });
        }

        document.getElementById('saveContent').addEventListener('click', function () {
            var d = DataManager.load();
            if (!d.site) d.site = {};
            SITE_TEXT_FIELDS.forEach(function (pair) { Lang.set(d.site, pair[0], getVal(pair[1])); });
            d.about = d.about || {};
            Lang.set(d.about, 'lead', getVal('editAboutLead'));
            d.about.steps = collectAboutSteps();
            if (typeof Publisher !== "undefined") Publisher.saveAndPublish(d); else DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            CounterAnimation.init();
            showSaved(this);
        });

        /* --- نبذة + خطوات المنهجية --- */
        function collectAboutSteps() {
            var prev = ((DataManager.load().about) || {}).steps || [];
            var out = [];
            document.querySelectorAll('#aboutStepsList .admin-dynamic-item').forEach(function (item, i) {
                var kEl = item.querySelector('[data-field="key"]');
                var tEl = item.querySelector('[data-field="text"]');
                var p = prev[i] || {};
                out.push({ key: biVal(p.key, kEl ? kEl.value : ''), text: biVal(p.text, tEl ? tEl.value : '') });
            });
            return out;
        }

        function loadAboutForm() {
            var d = DataManager.load();
            var lead = document.getElementById('editAboutLead');
            var list = document.getElementById('aboutStepsList');
            if (lead) lead.value = t((d.about || {}).lead) || '';
            if (!list) return;
            list.innerHTML = '';
            (((d.about || {}).steps) || []).forEach(function (st, i) {
                list.innerHTML += '<div class="admin-dynamic-item admin-step-item" data-idx="' + i + '">' +
                    '<input class="admin-input admin-input-sm" data-field="key" value="' + esc(t(st.key)) + '" placeholder="اسم الخطوة (Think)">' +
                    '<textarea class="admin-input admin-input-sm" data-field="text" rows="2" placeholder="شرح الخطوة">' + esc(t(st.text)) + '</textarea>' +
                    '<div class="admin-item-footer">' +
                    '<button class="admin-mini-btn" data-move="up" data-idx="' + i + '">↑ أعلى</button>' +
                    '<button class="admin-mini-btn" data-move="down" data-idx="' + i + '">↓ أسفل</button>' +
                    '<button class="admin-mini-btn" data-dup-step data-idx="' + i + '">⧉ تكرار</button>' +
                    '<button class="admin-remove-btn" data-idx="' + i + '">✕ حذف</button>' +
                    '</div></div>';
            });
            bindStepTools(list);
        }

        function bindStepTools(container) {
            if (!container || container.dataset.stepTools) return;
            container.dataset.stepTools = '1';
            container.addEventListener('click', function (e) {
                var btn = e.target.closest('button');
                if (!btn) return;
                var card = btn.closest('[data-idx]');
                var i = card ? parseInt(card.getAttribute('data-idx'), 10) : -1;
                if (i < 0) return;
                var d = DataManager.load();
                d.about = d.about || {};
                d.about.lead = biVal((d.about.lead), getVal('editAboutLead'));
                d.about.steps = collectAboutSteps();
                var steps = d.about.steps;
                if (btn.hasAttribute('data-move')) {
                    var to = btn.getAttribute('data-move') === 'up' ? i - 1 : i + 1;
                    if (to >= 0 && to < steps.length) { var m = steps.splice(i, 1)[0]; steps.splice(to, 0, m); }
                } else if (btn.hasAttribute('data-dup-step')) {
                    var copy = JSON.parse(JSON.stringify(steps[i]));
                    steps.splice(i + 1, 0, copy);
                } else if (btn.classList.contains('admin-remove-btn')) {
                    if (steps.length <= 1) { alert('لازم تفضل خطوة واحدة على الأقل'); return; }
                    steps.splice(i, 1);
                } else return;
                DataManager.save(d);
                loadAboutForm();
                renderSite();
                ScrollReveal.init();
            });
        }

        document.getElementById('addAboutStep').addEventListener('click', function () {
            var d = DataManager.load();
            d.about = d.about || {};
            d.about.lead = biVal(d.about.lead, getVal('editAboutLead'));
            d.about.steps = collectAboutSteps();
            d.about.steps.push({ key: { en: 'Step', ar: 'خطوة' }, text: { en: '', ar: '' } });
            DataManager.save(d);
            loadAboutForm();
            renderSite();
            ScrollReveal.init();
        });

        /* --- Comments Admin --- */
        function loadCommentsAdmin() {
            CommentStore.getAll().then(function (comments) {
                var list = document.getElementById('adminCommentsList');
                if (!list) return;
                if (!comments || comments.length === 0) {
                    list.innerHTML = '<p class="admin-hint">لا توجد تعليقات بعد</p>';
                    return;
                }
                list.innerHTML = comments.map(function (c) {
                    var d = new Date(c.date);
                    var dateStr = d.toLocaleDateString('ar-EG') + ' ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                    return '<div class="admin-dynamic-item" style="flex-direction:column;align-items:stretch;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><strong>' + esc(c.name) + '</strong><span style="font-size:11px;color:var(--text-dim);">' + dateStr + '</span></div><p style="font-size:13px;color:var(--text-dim);margin:0 0 8px;">' + esc(c.text) + '</p><button class="admin-remove-btn" data-id="' + c.id + '">✕ حذف</button></div>';
                }).join('');
                list.querySelectorAll('.admin-remove-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var id = parseInt(btn.getAttribute('data-id'));
                        CommentStore.remove(id).then(function () { loadCommentsAdmin(); renderComments(); });
                    });
                });
            });
        }

        document.getElementById('clearAllComments').addEventListener('click', function () {
            if (!confirm('هل أنت متأكد؟ هيتمسح كل التعليقات')) return;
            CommentStore.clear().then(function () { loadCommentsAdmin(); renderComments(); });
        });

        /* --- Download data.js --- */
        document.getElementById('downloadDataJS').addEventListener('click', function () {
            var d = DataManager.load();
            var content = '/* data.js — تم التصدير من لوحة التحكم */\nvar SITE_DATA = ' + JSON.stringify(d, null, 4) + ';\n';
            var blob = new Blob([content], { type: 'application/javascript' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'data.js';
            a.click();
            URL.revokeObjectURL(url);
        });

        /* --- Reset --- */
        document.getElementById('resetAllData').addEventListener('click', function () {
            if (!confirm('هل أنت متأكد؟ هيتمسح كل التغييرات وترجع البيانات الأصلية')) return;
            DataManager.reset();
            DataManager.setRemote(null);
            try { var del = FileStore.del('profile_logo'); if (del && del.catch) del.catch(function () {}); } catch (e) {}
            var t = DataManager.getTheme() || 'neon';
            document.documentElement.setAttribute('data-theme', t);
            document.querySelectorAll('.theme-dot, .admin-theme-btn').forEach(function (el) {
                el.classList.toggle('active', el.getAttribute('data-theme') === t);
            });
            loadProfileForm();
            loadStatsForm();
            loadSkillsForm();
            loadProjectsForm();
            loadServicesForm();
            loadPhoto();
            loadLayoutForm();
            loadContentForm();
            LayoutManager.apply(DataManager.getLayout());
            renderSite();
            ScrollReveal.init();
            CounterAnimation.init();
            if (typeof Publisher !== 'undefined') Publisher.schedule();
        });
    });

    function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
    function getVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

    /* ===== أدوات التعديل ثنائي اللغة =====
       كل حقل نصي بيتحفظ {en, ar} — لغة التحرير الحالية بتتكتب والتانية بتفضل زي ما هي */
    function asBi(oldVal) {
        if (oldVal != null && typeof oldVal === 'object' && !Array.isArray(oldVal)) {
            return { en: oldVal.en == null ? '' : oldVal.en, ar: oldVal.ar == null ? '' : oldVal.ar };
        }
        var s = (oldVal == null) ? '' : String(oldVal);
        return { en: s, ar: s };
    }
    function biVal(oldVal, newVal) {
        var o = asBi(oldVal);
        o[Lang.get()] = newVal;
        return o;
    }
    /* قوائم نصوص (مهارات/مميزات خدمة) — عنصر بعنصر بلغة التحرير */
    function biList(oldArr, newLines) {
        var out = [];
        for (var i = 0; i < newLines.length; i++) {
            var old = (oldArr && i < oldArr.length) ? oldArr[i] : '';
            var o = asBi(old);
            o[Lang.get()] = newLines[i];
            out.push(o);
        }
        return out;
    }
    function linesOf(v) { return String(v == null ? '' : v).split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; }); }
    function esc(s) { return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
    function showSaved(btn) { var orig = btn.textContent; btn.textContent = 'تم الحفظ ✓'; btn.classList.add('saved'); setTimeout(function () { btn.textContent = orig; btn.classList.remove('saved'); }, 2000); }
    function readDynamicList(listId, fields) {
        var items = document.querySelectorAll('#' + listId + ' .admin-dynamic-item');
        var result = [];
        items.forEach(function (item) {
            var obj = {};
            fields.forEach(function (f) { var el = item.querySelector('[data-field="' + f + '"]'); if (el) obj[f] = el.value; });
            result.push(obj);
        });
        return result;
    }
    function readSimpleList(listId) {
        var items = document.querySelectorAll('#' + listId + ' .admin-dynamic-item input');
        var result = [];
        items.forEach(function (inp) { if (inp.value.trim()) result.push(inp.value.trim()); });
        return result;
    }
})();

/* ============================================
   Render Site (من البيانات المحفوظة)
   ============================================ */

/* لو الصورة محفوظة في IndexedDB بس مش في localStorage (المساحة كانت ممتلئة) — رجّعها محليًا */
function hydratePhoto() {
    if (DataManager.hasLocalLogo()) return Promise.resolve(false);
    return FileStore.get('profile_logo').then(function (blob) {
        if (!blob) return false;
        return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (ev) {
                var dataUrl = ev.target.result;
                var img = new Image();
                function done(src) {
                    DataManager.storeLogo(src);
                    resolve(true);
                }
                img.onload = function () {
                    try {
                        var max = 1024;
                        var scale = Math.min(1, max / Math.max(img.width, img.height));
                        var c = document.createElement('canvas');
                        c.width = Math.max(1, Math.round(img.width * scale));
                        c.height = Math.max(1, Math.round(img.height * scale));
                        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                        done(c.toDataURL('image/jpeg', 0.85));
                    } catch (e) { done(dataUrl); }
                };
                img.onerror = function () { done(dataUrl); };
                img.src = dataUrl;
            };
            reader.onerror = function () { resolve(false); };
            reader.readAsDataURL(blob);
        });
    }).catch(function () { return false; });
}

/* يطبّق البيانات المنشورة (data.json) على شكل الموقع — الثيم واللايوت والمحتوى والصورة */
/* ============================================
   i18n — اللغة (إنجليزي افتراضي + عربي)
   القيم ممكن تكون نص عادي أو { en: '...', ar: '...' }
   ============================================ */
var Lang = (function () {
    var KEY = 'amahdy_lang';
    var cur = 'en';
    try { var sv = localStorage.getItem(KEY); if (sv === 'en' || sv === 'ar') cur = sv; } catch (e) {}

    function get() { return cur; }
    function isRTL() { return cur === 'ar'; }

    /* قراءة قيمة مترجمة من أي شكل بيانات */
    function t(v) {
        if (v == null) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (Array.isArray(v)) return v.map(t).join(' · ');
        if (typeof v !== 'object') return String(v);
        var r = v[cur];
        if (r != null && r !== '') return (typeof r === 'object') ? t(r) : String(r);
        var fb = v.ar != null && v.ar !== '' ? v.ar : v.en;
        if (fb == null || fb === '') return '';
        return (typeof fb === 'object') ? t(fb) : String(fb);
    }
    /* مصفوفة عناصر مترجمة → مصفوفة نصوص */
    function list(v) {
        if (!v) return [];
        if (!Array.isArray(v)) return [t(v)];
        return v.map(function (x) { return t(x); }).filter(function (x) { return x !== ''; });
    }
    /* كتابة قيمة بلغة التحرير الحالية مع الحفاظ على اللغة الأخرى */
    function set(obj, key, val) {
        if (!obj) return;
        var cur2 = obj[key];
        if (cur2 == null) cur2 = '';
        if (typeof cur2 !== 'object' || cur2 === null || Array.isArray(cur2)) {
            if (Array.isArray(val)) { obj[key] = val; return; }
            obj[key] = { ar: cur2 === '' ? val : String(cur2), en: cur2 === '' ? val : String(cur2) };
        }
        obj[key][cur] = val;
    }
    /* النصوص الثابتة المكتوبة في HTML (data-en / data-ar / data-ph-* / data-*-label) */
    function applyStatic() {
        var L = cur;
        document.querySelectorAll('[data-en],[data-ar],[data-ph-en],[data-ph-ar],[data-en-label],[data-ar-label]').forEach(function (el) {
            var v = el.getAttribute('data-' + L);
            if (v != null) el.textContent = v;
            var ph = el.getAttribute('data-ph-' + L);
            if (ph != null) el.setAttribute('placeholder', ph);
            var al = el.getAttribute('data-' + L + '-label') || (L === 'ar' ? el.getAttribute('data-ar-label') : null);
            if (al != null) el.setAttribute('aria-label', al);
        });
        var sw = document.getElementById('langSwitch');
        if (sw) sw.querySelectorAll('.lang-btn').forEach(function (b) {
            var on = b.getAttribute('data-lang') === L;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }
    function applyDir() {
        var html = document.documentElement;
        html.setAttribute('lang', cur);
        html.setAttribute('dir', cur === 'ar' ? 'rtl' : 'ltr');
    }
    function setLang(l) {
        if (l !== 'en' && l !== 'ar') return;
        if (l === cur) return;
        cur = l;
        try { localStorage.setItem(KEY, l); } catch (e) {}
        applyDir();
        applyStatic();
        renderSite();
        renderComments();
        document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } }));
    }
    function init() {
        applyDir();
        applyStatic();
        var sw = document.getElementById('langSwitch');
        if (sw && !sw.__bound) {
            sw.__bound = 1;
            sw.addEventListener('click', function (e) {
                var b = e.target.closest('.lang-btn');
                if (b) setLang(b.getAttribute('data-lang'));
            });
        }
    }
    return { get: get, t: t, list: list, set: set, isRTL: isRTL, applyStatic: applyStatic, applyDir: applyDir, setLang: setLang, init: init };
})();
function t(v) { return Lang.t(v); }

function applyRemoteData() {
    if (!DataManager.getRemote()) return;
    var root = document.documentElement;
    var t = DataManager.getTheme() || 'neon';
    root.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-dot, .admin-theme-btn').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-theme') === t);
    });
    LayoutManager.apply(DataManager.getLayout());
    renderSite();
    ScrollReveal.init();
    CounterAnimation.init();
}

function renderSite() {
    var d = DataManager.load();
    if (!d) return;

    function $(id) { return document.getElementById(id); }
    function fill(id, v) { var el = $(id); if (el && v != null && v !== '') { var out = t(v); if (out !== '') el.textContent = out; } }
    /* فقرات متعددة (مفصولة بسطر فاضي) → <p> لكل فقرة */
    function fillRich(id, v) {
        var el = $(id); if (!el) return;
        var out = v ? t(v) : '';
        if (!out) return;
        el.innerHTML = out.split(/\n\s*\n|\n/).map(function (para) {
            para = para.trim();
            return para ? '<p>' + escHtml(para) + '</p>' : '';
        }).join('');
    }

    var p = d.profile;
    var s = d.site || {};
    if (p.socialLabels) SiteControls.applySocialLabels(p.socialLabels);

    fill('heroName', p.name);
    fill('heroRole', p.role);
    fill('heroBadge', s.badge);
    fill('heroBtn1', s.heroBtn1);
    fill('heroBtn2', s.heroBtn2);

    /* إحصائيات الهيرو — بتتبني من d.stats بلغة العرض الحالية */
    var statsBox = $('heroStats');
    if (statsBox) {
        var statHtml = (d.stats || []).map(function (x) {
            var v = t(x.value);
            if (v === '') return '';
            return '<div class="hero-stat"><span class="hero-stat-num" data-value="' + escAttr(v) + '">' + escHtml(v) + '</span>' +
                '<span class="hero-stat-label">' + escHtml(t(x.label)) + '</span></div>';
        }).join('');
        statsBox.innerHTML = statHtml;
        statsBox.style.display = statHtml ? '' : 'none';
        statsBox.__obs = 0;
        if (typeof CounterAnimation !== 'undefined') CounterAnimation.init();
    }

    fillRich('aboutBio', p.bio);
    fill('aboutTitle', s.aboutTitle);
    fill('aboutDesc', s.aboutDesc);
    fill('contactTitle', s.contactTitle);
    fill('contactDesc', s.contactDesc);
    fill('contactCard1Title', s.contactCard1);
    fill('contactCard2Title', s.contactCard2);
    fill('contactCard3Title', s.contactCard3);
    fill('projectsTitle', s.projectsTitle);
    fill('projectsDesc', s.projectsDesc);
    fill('servicesTitle', s.servicesTitle);
    fill('servicesDesc', s.servicesDesc);
    fill('footerText', s.footerText);
    fill('footerYear', String(new Date().getFullYear()));

    // About — هوية + منهجية العمل (Think → Concept → Design → Refine)
    fill('aboutIdentityName', p.name);
    var ab = d.about || {};
    fillRich('aboutLead', ab.lead);
    var stepsEl = $('aboutSteps');
    if (stepsEl && ab.steps && ab.steps.length) {
        stepsEl.innerHTML = ab.steps.map(function (st, i) {
            return '<li class="about-step" data-step="' + (i + 1 < 10 ? '0' : '') + (i + 1) + '">' +
                '<span class="about-step-key">' + escHtml(t(st.key)) + '</span>' +
                '<p>' + escHtml(t(st.text)) + '</p></li>';
        }).join('');
    }

    // Profile photo — from localStorage, else IndexedDB, else published data.json
    var av = $('aboutAvatar');
    if (av) {
        (function () {
            function show(src) {
                if (!src) return;
                var cur = av.querySelector('img');
                if (cur && cur.getAttribute('src') === src) return;
                var img = document.createElement('img');
                img.src = src;
                img.alt = p.name || 'A.M';
                img.decoding = 'async';
                img.loading = 'lazy';
                img.onload = function () {
                    var ratio = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 1;
                    av.style.aspectRatio = ratio.toFixed(4);
                    av.style.width = ratio < 1 ? 'min(300px, 82vw)' : 'min(440px, 90vw)';
                    av.classList.add('has-photo');
                };
                av.innerHTML = '';
                av.appendChild(img);
                av.classList.add('has-logo');
            }
            var logoSrc = DataManager.getLogo();
            if (logoSrc) { show(logoSrc); return; }
            FileStore.getURL('profile_logo').then(show).catch(function () {});
        })();
    }

    var socials = d.profile.socials || {};

    // Make email card clickable
    var ce = $('contactEmail');
    if (ce && p.email) {
        ce.innerHTML = '<a href="mailto:' + escAttr(p.email) + '" class="contact-link">' + escHtml(p.email) + '</a>';
    }

    // Make socials clickable — أي رابط مكتوب في اللوحة بيظهر تلقائيًا
    var cs = $('contactSocials');
    if (cs) {
        var links = Object.keys(socials).map(function (key) {
            var url = String(socials[key] || '').trim();
            if (!url || !isValidURL(url)) return '';
            return '<a href="' + escAttr(url) + '" target="_blank" rel="noopener noreferrer" class="contact-link">' + escHtml(SiteControls.socialLabel(key)) + '</a>';
        }).filter(Boolean);
        cs.innerHTML = links.join(' · ') || '—';
    }

    // Make location card clickable (Google Maps)
    var cl = $('contactLocation');
    if (cl && p.location) {
        cl.innerHTML = '<a href="https://maps.google.com/?q=' + encodeURIComponent(p.location) + '" target="_blank" rel="noopener noreferrer" class="contact-link">' + escHtml(p.location) + '</a>';
    }

    // Skills
    var sk = $('aboutSkills');
    if (sk && d.skills) {
        sk.innerHTML = Lang.list(d.skills).map(function (s) {
            return '<span class="skill-tag">' + escHtml(s) + '</span>';
        }).join('');
    }

    // Filter toolbar
    var cats = {};
    (d.projects || []).forEach(function (p) { if (p.category) cats[p.category] = p.categoryLabel; });
    var tb = $('projectsToolbar');
    if (tb) {
        var fb = '<button type="button" class="filter-btn active" data-filter="all" aria-pressed="true">' + escHtml(t({ en: 'All', ar: 'الكل' })) + '</button>';
        Object.keys(cats).forEach(function (k) {
            fb += '<button type="button" class="filter-btn" data-filter="' + escAttr(k) + '" aria-pressed="false">' + escHtml(t(cats[k])) + '</button>';
        });
        tb.innerHTML = fb;
        tb.querySelectorAll('.filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                tb.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var filter = btn.getAttribute('data-filter');
                document.querySelectorAll('.project-card').forEach(function (card) {
                    card.classList.toggle('hide', filter !== 'all' && card.getAttribute('data-filter') !== filter);
                });
                syncFilters();
            });
        });
    }

    // Projects — كارت قابل للفتح (لايت بوكس) لو الميزة مفعّلة
    var grid = $('projectsGrid');
    if (grid && d.projects) {
        var lb = SiteControls.features(d).lightbox;
        var shown = (d.projects || []).filter(function (pr) { return !pr.status || pr.status === 'published'; });
        grid.innerHTML = shown.map(function (p, i) {
            var label = t(p.categoryLabel) || p.category;
            var img = p.image && isValidURL(p.image)
                ? '<div class="project-cover" style="background-image:url(\'' + escAttr(p.image) + '\')"></div>'
                : '<div class="project-cover project-cover-art"><span class="project-art-label">' + escHtml(label) + '</span></div>';
            var attrs = ' id="project-' + i + '" data-idx="' + i + '"';
            if (lb) attrs += ' role="button" tabindex="0" aria-label="' + escAttr(t({ en: 'Open project: ', ar: 'عرض مشروع: ' }) + (t(p.title) || '')) + '"';
            var meta = '<span class="project-tag">' + escHtml(label) + '</span><span class="project-year">' + escHtml(p.year || '') + '</span>';
            if (p.featured) meta += '<span class="project-featured-flag" title="' + escAttr(t({ en: 'Featured', ar: 'مميّز' })) + '">★</span>';
            return '<article class="project-card reveal' + (p.featured ? ' is-featured' : '') + '"' + attrs + ' data-filter="' + escAttr(p.category) + '">' + img + '<div class="project-body"><div class="project-meta">' + meta + '</div><h3 class="project-title">' + escHtml(t(p.title)) + '</h3><p class="project-desc">' + escHtml(t(p.description)) + '</p></div></article>';
        }).join('');
    }

    // Services — الخدمات الأساسية ثم الباقات
    var sg = $('servicesGrid');
    var pg = document.getElementById('pricingGrid');
    if (sg && d.services) {
        var kinds = (d.services || []).filter(function (x) { return !x.status || x.status === 'published'; });
        var core = kinds.filter(function (x) { return x.kind !== 'pricing'; });
        var packs = kinds.filter(function (x) { return x.kind === 'pricing'; });
        if (!core.length && packs.length) { core = packs; packs = []; }
        sg.innerHTML = core.map(function (s, i) {
            var feats = Lang.list(s.features);
            return '<div class="service-card' + (s.featured ? ' featured' : '') + ' reveal">' +
                (s.featured ? '<div class="service-badge">' + escHtml(t({ en: 'Most requested', ar: 'الأكثر طلباً' })) + '</div>' : '') +
                '<span class="service-index" aria-hidden="true">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</span>' +
                '<h3 class="service-name">' + escHtml(t(s.name)) + '</h3>' +
                (s.price ? '<div class="service-price">' + escHtml(t(s.price)) + '</div>' : '') +
                (s.description ? '<p class="service-desc">' + escHtml(t(s.description)) + '</p>' : '') +
                (feats.length ? '<ul class="service-features">' + feats.map(function (f) { return '<li>' + escHtml(f) + '</li>'; }).join('') + '</ul>' : '') +
                (s.delivery ? '<div class="service-delivery">' + escHtml(t(s.delivery)) + '</div>' : '') +
                '</div>';
        }).join('');
        var pw = document.getElementById('pricingWrap');
        if (pg) {
            pg.innerHTML = packs.map(function (s) {
                var feats = Lang.list(s.features);
                return '<div class="service-card pricing-card' + (s.featured ? ' featured' : '') + '">' +
                    (s.featured ? '<div class="service-badge">' + escHtml(t({ en: 'Most popular', ar: 'الأكثر طلباً' })) + '</div>' : '') +
                    '<h3 class="service-name">' + escHtml(t(s.name)) + '</h3>' +
                    (s.price ? '<div class="service-price">' + escHtml(t(s.price)) + '</div>' : '') +
                    (feats.length ? '<ul class="service-features">' + feats.map(function (f) { return '<li>' + escHtml(f) + '</li>'; }).join('') + '</ul>' : '') +
                    (s.delivery ? '<div class="service-delivery">' + escHtml(t(s.delivery)) + '</div>' : '') +
                    '</div>';
            }).join('');
        }
        if (pw) pw.hidden = !packs.length;
        var pn = document.getElementById('pricingNote');
        if (pn) { var note = t(d.contactNote); pn.textContent = note || ''; if (pn.parentElement) pn.parentElement.hidden = !note; }
    }

    // Add reveal classes to sections
    document.querySelectorAll('.section').forEach(function (sec) {
        if (!sec.classList.contains('reveal')) sec.classList.add('reveal');
    });

    // Dynamic sections + their nav links
    renderDynamicSections();
    renderNavLinks();
    // تحكم(features + SEO + Structured Data) — instant apply
    SiteControls.applyFeatures(d);
    SiteControls.applySeo(d);
    SiteControls.applyStructuredData(d);
    syncFilters();
    if (document.documentElement.getAttribute('data-reveal-ready')) ScrollReveal.rescan();
}

/* يحدّث aria-pressed على أزرار الفلترة عشان قارئات الشاشة تعرف الفلتر الحالي */
function syncFilters() {
    var btns = document.querySelectorAll('#projectsToolbar .filter-btn');
    if (!btns.length) return;
    btns.forEach(function (b) {
        b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true' : 'false');
    });
}

/* ============================================
   SiteControls — تحكم أدق في الموقع: SEO + المزايا
   ============================================ */
var SiteControls = (function () {
    var FEATURE_DEFAULTS = { ticker: true, cursor: true, comments: true, backToTop: true, scrollProgress: true, lightbox: true };
    var root = document.documentElement;
    var CFG = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG) ? SITE_CONFIG : {
        siteUrl: 'https://ahmedmehdy862-cyber.github.io/', siteName: 'A.Mahdy', author: 'أحمد مهدي',
        locale: 'ar_AR', ogImage: 'assets/og-image.png', ogImageAlt: 'شعار A.Mahdy',
        ogImageWidth: 1200, ogImageHeight: 630, ogImageType: 'image/png', twitterCard: 'summary_large_image'
    };
    var SOCIAL_LABELS = {
        behance: 'Behance', github: 'GitHub', linkedin: 'LinkedIn', instagram: 'Instagram',
        facebook: 'Facebook', whatsapp: 'WhatsApp', twitter: 'X', x: 'X', tiktok: 'TikTok',
        dribbble: 'Dribbble', youtube: 'YouTube', telegram: 'Telegram', pinterest: 'Pinterest'
    };

    /* رابط كامل (absolute) لأي مسار داخلي أو رابط خارجي */
    function absoluteUrl(v) {
        var s = String(v || '').trim();
        if (!s) return '';
        if (/^https?:\/\//i.test(s)) return s;
        if (/^\/\//.test(s)) return window.location.protocol + s;
        return String(CFG.siteUrl || '').replace(/\/$/, '') + '/' + s.replace(/^\//, '');
    }

    /* يقبل رابط http(s) أو مسار داخلي بال/assets — ويرفض أي نص تاني */
    function usableImage(v) {
        var s = String(v || '').trim();
        if (!s) return '';
        if (/^https?:\/\//i.test(s)) return s;
        if (/^[\w./-]+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(s)) return s;
        return '';
    }

    function features(d) {
        var f = (d && d.features) || {};
        var out = {};
        Object.keys(FEATURE_DEFAULTS).forEach(function (k) {
            out[k] = typeof f[k] === 'boolean' ? f[k] : FEATURE_DEFAULTS[k];
        });
        return out;
    }

    function applyFeatures(d) {
        var f = features(d);
        root.setAttribute('data-f-ticker', f.ticker ? 'on' : 'off');
        root.setAttribute('data-f-cursor', f.cursor ? 'on' : 'off');
        root.setAttribute('data-f-comments', f.comments ? 'on' : 'off');
        root.setAttribute('data-f-backtotop', f.backToTop ? 'on' : 'off');
        root.setAttribute('data-f-progress', f.scrollProgress ? 'on' : 'off');
        root.setAttribute('data-f-lightbox', f.lightbox ? 'on' : 'off');
        return f;
    }

    function meta(id, value) {
        var el = document.getElementById(id);
        if (el && value) el.setAttribute('content', value);
    }

    function setAttr(sel, name, value) {
        var el = document.querySelector(sel);
        if (el && value) el.setAttribute(name, value);
        }

    /* زي setAttr بس بيمسح القيمة لو فاضية (عشان متقولش رقم غلط) */
    function metaOrClear(id, value) {
        var el = document.getElementById(id);
        if (!el) return;
        if (value) el.setAttribute('content', value);
        else el.removeAttribute('content');
        }


    function applySeo(d) {
        var s = (d && d.seo) || {};
        var title = String(s.title || '').trim();
        var desc = String(s.description || '').trim();
        var keys = String(s.keywords || '').trim();
        var img = absoluteUrl(usableImage(s.ogImage) || CFG.ogImage);
        var isDefault = !usableImage(s.ogImage);
        if (title) document.title = title;
        meta('metaDescription', desc);
        meta('metaKeywords', keys);
        meta('ogTitle', title || document.title);
        meta('ogDesc', desc);
        meta('ogImage', img);
        setAttr('meta[property="og:image:secure_url"]', 'content', /^https:/.test(img) ? img : '');
        /* الأبعاد دي بتاعة الصورة الافتراضية بس — لو اللوحة حطت صورة تانية
           مش عارفين مقاسها، فبنشيل الأبعاد بدل ما نقول رقم غلط. */
        metaOrClear('ogImageType', isDefault ? (CFG.ogImageType || 'image/png') : '');
        metaOrClear('ogImageW', isDefault ? String(CFG.ogImageWidth || '') : '');
        metaOrClear('ogImageH', isDefault ? String(CFG.ogImageHeight || '') : '');
        meta('twTitle', title || document.title);
        meta('twDesc', desc);
        meta('twImage', img);
        /* canonical + og:url دايمًا على الدومين الحقيقي */
        setAttr('link[rel="canonical"]', 'href', CFG.siteUrl);
        setAttr('meta[property="og:url"]', 'content', CFG.siteUrl);
    }

    function socialLabel(key) { return SOCIAL_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1); }
    function setSocialLabel(key, label) { if (label) SOCIAL_LABELS[key] = label; }
    function applySocialLabels(map) {
        if (!map) return;
        Object.keys(map).forEach(function (k) { if (map[k]) SOCIAL_LABELS[k] = map[k]; });
    }

    function imageMeta(url) {
        if (!url) return undefined;
        return { '@type': 'ImageObject', url: url, caption: CFG.ogImageAlt, width: Number(CFG.ogImageWidth) || 1200, height: Number(CFG.ogImageHeight) || 630 };
    }

    /* روابط التواصل موجودة كـobject map (المفتاح = اسم الشبكة) */
    function socialUrls(profile) {
        var out = [];
        var s = profile && profile.socials;
        if (!s) return out;
        if (Array.isArray(s)) {
            s.forEach(function (o) { if (o && o.url && /^https?:\/\//i.test(String(o.url))) out.push(String(o.url)); });
            return out;
        }
        if (typeof s === 'object') {
            Object.keys(s).forEach(function (k) {
                var v = s[k];
                var url = (v && typeof v === 'object') ? v.url : v;
                if (url && /^https?:\/\//i.test(String(url))) out.push(String(url));
            });
        }
        return out;
    }

    /* يبني Structured Data (JSON-LD) من بيانات الموقع الحقيقية */
    function buildStructuredData(d) {
        var p = (d && d.profile) || {};
        var s = (d && d.seo) || {};
        var base = String(CFG.siteUrl || '').replace(/\/$/, '');
        var url = CFG.siteUrl;
        var name = String(p.name || CFG.author || '').trim();
        var desc = String(s.description || CFG.defaultDescription || '').trim();
        var title = String(s.title || document.title || '').trim();
        var img = absoluteUrl(usableImage(s.ogImage) || CFG.ogImage);

        var sameAs = socialUrls(p);
        var skills = Array.isArray(d && d.skills) && d.skills.length ? d.skills
            : (Array.isArray(p.skills) ? p.skills : []);

        var person = {
            '@type': 'Person', '@id': base + '/#person',
            name: name, url: url,
            jobTitle: String(p.role || '').trim() || undefined,
            image: img, description: desc,
            knowsAbout: skills.length ? skills.slice(0, 12) : undefined,
            sameAs: sameAs.length ? sameAs : undefined
        };
        if (p.email) person.email = 'mailto:' + String(p.email).replace(/^mailto:/, '');
        if (p.location) person.address = { '@type': 'Place', name: String(p.location) };

        var website = {
            '@type': 'WebSite', '@id': base + '/#website',
            url: url, name: CFG.siteName, inLanguage: CFG.lang || 'ar',
            publisher: { '@id': base + '/#person' }
        };

        var page = {
            '@type': 'ProfilePage', '@id': base + '/#webpage',
            url: url, name: title, description: desc, inLanguage: CFG.lang || 'ar',
            isPartOf: { '@id': base + '/#website' }, about: { '@id': base + '/#person' },
            primaryImageOfPage: img ? { '@id': base + '/#logo' } : undefined
        };
        if (img) page.image = img;

        var graph = [person, website, page];

        /* قائمة المشاريع كـItemList من CreativeWork — بتتولّد من الداتا الحقيقية */
        var projects = (d && d.projects) || [];
        if (projects.length) {
            var items = projects.map(function (pr, i) {
                return {
                    '@type': 'CreativeWork',
                    position: i + 1,
                    name: String(pr.title || ''),
                    description: String(pr.desc || pr.description || ''),
                    url: url + '#project-' + (pr.id != null ? pr.id : i),
                    creator: { '@id': base + '/#person' },
                    dateCreated: pr.year ? String(pr.year) : undefined,
                    keywords: Array.isArray(pr.tags) && pr.tags.length ? pr.tags.join(', ') : undefined
                };
            });
            graph.push({
                '@type': 'ItemList', '@id': base + '/#projects',
                name: 'أعمالي', numberOfItems: items.length, itemListElement: items
            });
            page.hasPart = { '@id': base + '/#projects' };
        }

        return { '@context': 'https://schema.org', '@graph': graph };
    }

    function applyStructuredData(d) {
        var el = document.getElementById('ldSeo');
        if (!el) return;
        try {
            el.textContent = JSON.stringify(buildStructuredData(d), null, 2);
        } catch (e) { /* Structured data مايلعبش دور في باقي الصفحة */ }
    }

    return {
        features: features, applyFeatures: applyFeatures, applySeo: applySeo,
        buildStructuredData: buildStructuredData, applyStructuredData: applyStructuredData,
        socialLabel: socialLabel, setSocialLabel: setSocialLabel, applySocialLabels: applySocialLabels,
        DEFAULTS: FEATURE_DEFAULTS
    };
})();

/* ============================================
   ProjectLightbox — عرض أي مشروع بالتفصيل
   ============================================ */
var ProjectLightbox = (function () {
    var items = [], idx = 0, lastFocus = null, prevOverflow = '';
    var el = {};

    function cache() {
        el.overlay = document.getElementById('projectLightbox');
        el.media = document.getElementById('lbMedia');
        el.title = document.getElementById('lbTitle');
        el.desc = document.getElementById('lbDesc');
        el.cat = document.getElementById('lbCategory');
        el.year = document.getElementById('lbYear');
        el.tags = document.getElementById('lbTags');
        el.link = document.getElementById('lbLink');
    }

    function enabled() {
        try {
            var d = DataManager.load();
            var f = SiteControls.features(d);
            return !!f.lightbox;
        } catch (e) { return true; }
    }

    function collect() {
        items = ((DataManager.load() || {}).projects || []).filter(function (p) {
            return !p.status || p.status === 'published';
        });
    }

    function render() {
        var p = items[idx];
        if (!p || !el.overlay) return;
        var img = p.image && isValidURL(p.image);
        var fallbackLabel = t({ en: 'Project', ar: 'مشروع' });
        el.media.innerHTML = img
            ? '<div class="lb-img" style="background-image:url(\'' + escAttr(p.image) + '\')"></div>'
            : '<div class="lb-art"><span>' + escHtml(t(p.categoryLabel) || p.category || fallbackLabel) + '</span></div>';
        el.title.textContent = t(p.title) || '';
        el.desc.textContent = t(p.description) || '';
        el.cat.textContent = t(p.categoryLabel) || p.category || '';
        el.year.textContent = p.year || '';
        var chips = [];
        Lang.list(p.tags).forEach(function (tg) { if (tg) chips.push('<span class="lb-chip">' + escHtml(tg) + '</span>'); });
        String(p.tools || '').split(/[,،]/).forEach(function (tool) {
            tool = tool.trim();
            if (tool) chips.push('<span class="lb-chip lb-chip--tool">' + escHtml(tool) + '</span>');
        });
        el.tags.innerHTML = chips.join('');
        if (p.link && isValidURL(p.link)) {
            el.link.href = p.link;
            el.link.classList.remove('hidden');
        } else {
            el.link.classList.add('hidden');
            el.link.removeAttribute('href');
        }
        var multi = items.length > 1;
        el.overlay.querySelector('.lb-counter').textContent = multi ? (idx + 1) + ' / ' + items.length : '';
    }

    function open(i) {
        if (!enabled()) return;
        collect();
        if (!items.length) return;
        idx = (i + items.length) % items.length;
        if (!el.overlay) cache();
        if (!el.overlay) return;
        lastFocus = document.activeElement;
        render();
        el.overlay.classList.remove('hidden');
        prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        try { document.getElementById('lbClose').focus(); } catch (e) {}
    }

    function close() {
        if (!el.overlay) return;
        el.overlay.classList.add('hidden');
        document.body.style.overflow = prevOverflow;
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    }

    function step(dir) {
        if (!items.length) return;
        idx = (idx + dir + items.length) % items.length;
        render();
    }

    function cardIndex(node) {
        var cards = document.querySelectorAll('#projectsGrid .project-card');
        for (var i = 0; i < cards.length; i++) if (cards[i] === node) return i;
        return -1;
    }

    function bind() {
        if (!document.getElementById('projectLightbox')) return;
        cache();
        var counter = document.createElement('span');
        counter.className = 'lb-counter';
        el.overlay.appendChild(counter);
        document.getElementById('lbClose').addEventListener('click', close);
        document.getElementById('lbPrev').addEventListener('click', function () { step(-1); });
        document.getElementById('lbNext').addEventListener('click', function () { step(1); });
        el.overlay.addEventListener('click', function (e) { if (e.target === el.overlay) close(); });
        document.addEventListener('keydown', function (e) {
            if (el.overlay.classList.contains('hidden')) return;
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') step(1);
            else if (e.key === 'ArrowRight') step(-1);
        });
        document.addEventListener('click', function (e) {
            if (!enabled()) return;
            var card = e.target.closest && e.target.closest('#projectsGrid .project-card');
            if (!card) return;
            var i = cardIndex(card);
            if (i > -1) { e.preventDefault(); open(i); }
        });
        document.addEventListener('keydown', function (e) {
            if (!enabled()) return;
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var card = document.activeElement;
            if (!card || !card.classList || !card.classList.contains('project-card')) return;
            e.preventDefault();
            open(cardIndex(card));
        });
    }

    return { bind: bind, open: open, close: close, enabled: enabled };
})();

/* ============================================
   Dynamic Sections (من لوحة التحكم — تبويب الأقسام)
   ============================================ */
function renderDynamicSections() {
    var wrap = document.getElementById('dynamicSections');
    if (!wrap) return;
    var d = DataManager.load();
    var secs = (d && d.sections) || [];
    wrap.innerHTML = '';
    var num = 6;
    secs.forEach(function (sec) {
        if (!sec || !sec.title) return;
        var n = String(num++).padStart(2, '0');
        var bg = '<div class="hero-bg"><div class="hero-pattern"></div></div>';
        var html = '<section class="section" id="' + escAttr(sec.id || '') + '">' + bg +
            '<div class="container">' +
            '<div class="section-header reveal"><span class="section-number">' + n + '</span>' +
            '<h2 class="section-title">' + escHtml(sec.title) + '</h2>' +
            (sec.desc ? '<p class="section-desc">' + escHtml(sec.desc) + '</p>' : '') +
            '</div>';
        var items = sec.items || [];
        if (sec.kind === 'text') {
            html += '<div class="dynamic-text-blocks">' + (items.map(function (it) {
                return '<div class="dynamic-text-block reveal"><h3 class="dynamic-text-title">' + escHtml(it.t) + '</h3>' + (it.d ? '<p class="dynamic-text-desc">' + escHtml(it.d) + '</p>' : '') + '</div>';
            }).join('') || '<p class="admin-hint">لا توجد أجزاء بعد — أضف أجزاء من لوحة التحكم.</p>') + '</div>';
        } else {
            html += '<div class="dynamic-card-grid">' + (items.map(function (it) {
                return '<div class="dynamic-card reveal"><h3 class="dynamic-card-title">' + escHtml(it.t) + '</h3>' + (it.d ? '<p class="dynamic-card-desc">' + escHtml(it.d) + '</p>' : '') + '</div>';
            }).join('') || '<p class="admin-hint">لا توجد أجزاء بعد — أضف أجزاء من لوحة التحكم.</p>') + '</div>';
        }
        html += '</div></section>';
        wrap.innerHTML += html;
    });
}

function renderNavLinks() {
    var links = document.getElementById('navLinks');
    if (!links) return;
    var d = DataManager.load();
    var secs = (d && d.sections) || [];
    links.querySelectorAll('li.nav-custom').forEach(function (li) {
        if (li.parentNode) li.parentNode.removeChild(li);
    });
    secs.forEach(function (sec) {
        if (!sec || !sec.title) return;
        var li = document.createElement('li');
        li.className = 'nav-custom';
        var a = document.createElement('a');
        a.href = '#' + escAttr(sec.id || '');
        a.className = 'nav-link';
        a.setAttribute('data-section', sec.id || '');
        a.textContent = sec.title;
        li.appendChild(a);
        links.appendChild(li);
    });
}

/* ============================================
   Preloader — opening shot of the site
   ============================================ */
(function () {
    var pre = document.getElementById('preloader');
    if (!pre) return;
    var bar = document.getElementById('preBar');
    var pct = document.getElementById('prePct');
    var v = 0, done = false;
    var winReady = false, dataReady = false;
    function finish() {
        if (done) return;
        done = true;
        clearInterval(iv);
        if (bar) bar.style.width = '100%';
        if (pct) pct.textContent = '100';
        setTimeout(function () {
            pre.classList.add('hide');
            setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 700);
        }, 300);
    }
    /* ماينفعش الستار ينزل قبل ما اللايوت المنشور يتطبق — غير كده الهيرو
       بيرسم بنسخة غلط وبعدين بيتحوّل للقسم كله وبيعمل layout shift كبير.
       بنستنى الـload واللايوت، بس مع سقف زمني قصير حفاظًا على سرعة الفتح. */
    function settle() { if (winReady && dataReady) finish(); }
    var iv = setInterval(function () {
        v += Math.random() * 13 + 4;
        if (v > 96) v = 96;
        if (bar) bar.style.width = v + '%';
        if (pct) pct.textContent = String(Math.round(v));
    }, 120);

    function markWin() { winReady = true; setTimeout(settle, 250); }
    if (document.readyState === 'complete') markWin();
    else window.addEventListener('load', markWin);

    if (typeof whenLayoutReady === 'function') {
        whenLayoutReady().then(function () { dataReady = true; settle(); }, function () { dataReady = true; settle(); });
    } else dataReady = true;
    settle();

    setTimeout(function () { clearInterval(iv); finish(); }, 2600); // أمان: سقف أقصى عشان ما نفضلش مستنيين
})();

/* ============================================
   Motion UI — خلفية موشن + تفاعلات
   ============================================ */
var MotionUI = (function () {
    function reduced() { try { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
    function enabled() { try { var l = DataManager.getLayout(); return !(l && l.animations === 'none'); } catch (e) { return true; } }

    function hexA(hex, al) {
        if (!hex) return 'rgba(0,0,0,0)';
        var h = String(hex).replace('#', '');
        if (h.length === 3) h = h.split('').map(function (ch) { return ch + ch; }).join('');
        var n = parseInt(h, 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + al + ')';
    }

    /* خلفية كانفس متحركة مستمرة ورا كل الأقسام */
    function initBackground() {
        var c = document.getElementById('bgCanvas');
        if (!c || !c.getContext) return;
        if (reduced() || !enabled()) { c.style.display = 'none'; return; }
        var ctx = c.getContext('2d');
        var W = 0, H = 0, DPR = 1, pts = [], orbs = [], raf = null, running = true;

        function colors() {
            var cs = getComputedStyle(document.documentElement);
            return [cs.getPropertyValue('--accent').trim() || '#8b5cf6', cs.getPropertyValue('--accent-2').trim() || '#06b6d4'];
        }

        function resize() {
            DPR = Math.min(window.devicePixelRatio || 1, 1.25);
            W = window.innerWidth; H = window.innerHeight;
            c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
            c.style.width = W + 'px'; c.style.height = H + 'px';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            var count = Math.min(40, Math.floor(W * H / 38000));
            pts = [];
            for (var i = 0; i < count; i++) {
                pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.6 + 0.6 });
            }
            var m = Math.max(W, H);
            orbs = [
                { x: W * 0.22, y: H * 0.22, r: m * 0.34, vx: 0.16, vy: 0.12, a: 0.13, col: 0 },
                { x: W * 0.8, y: H * 0.68, r: m * 0.4, vx: -0.13, vy: -0.1, a: 0.1, col: 1 }
            ];
        }

        function step() {
            if (!running) return;
            raf = requestAnimationFrame(step);
            ctx.clearRect(0, 0, W, H);
            var cols = colors();
            var i, j, o, p;
            for (i = 0; i < orbs.length; i++) {
                o = orbs[i];
                o.x += o.vx; o.y += o.vy;
                if (o.x < -o.r) o.x = W + o.r; if (o.x > W + o.r) o.x = -o.r;
                if (o.y < -o.r) o.y = H + o.r; if (o.y > H + o.r) o.y = -o.r;
                var g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
                g.addColorStop(0, hexA(cols[o.col], o.a));
                g.addColorStop(1, hexA(cols[o.col], 0));
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.2832); ctx.fill();
            }
            for (i = 0; i < pts.length; i++) {
                p = pts[i];
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
            }
            // خطوط وصل الجزيئات = الأقسام متصلة ببعضها
            ctx.lineWidth = 1;
            var max2 = 120 * 120;
            for (i = 0; i < pts.length; i++) {
                for (j = i + 1; j < pts.length; j++) {
                    var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < max2) {
                        ctx.strokeStyle = hexA(cols[0], (1 - d2 / max2) * 0.14);
                        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
                    }
                }
            }
            ctx.fillStyle = hexA(cols[1], 0.55);
            for (i = 0; i < pts.length; i++) { p = pts[i]; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
        }

        window.addEventListener('resize', resize, { passive: true });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { running = false; }
            else { running = true; resize(); requestAnimationFrame(step); }
        });
        resize();
        step();
    }

    /* ميلان 3D + توهج على الكروت (بالماوس فقط) */
    function initTilt() {
        var sel = '.project-card, .service-card, .contact-card, .dynamic-card, .about-card';
        document.addEventListener('pointermove', function (e) {
            var el = e.target.closest(sel);
            if (!el || e.pointerType !== 'mouse') { if (el) el.style.transform = ''; return; }
            var r = el.getBoundingClientRect();
            var px = (e.clientX - r.left) / r.width - 0.5;
            var py = (e.clientY - r.top) / r.height - 0.5;
            el.style.transform = 'perspective(900px) rotateY(' + (px * 8).toFixed(2) + 'deg) rotateX(' + (-py * 8).toFixed(2) + 'deg) translateY(-3px)';
            el.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
            el.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
        });
        document.addEventListener('pointerout', function (e) {
            var el = e.target.closest(sel);
            if (el) { el.style.transform = ''; }
        });
    }

    /* تموجة على الأزرار عند الضغط */
    function initRipple() {
        var sel = '.btn, .filter-btn, .nav-toggle';
        document.addEventListener('click', function (e) {
            var btn = e.target.closest(sel);
            if (!btn) return;
            var r = btn.getBoundingClientRect();
            var s = document.createElement('span');
            s.className = 'btn-ripple';
            var d = Math.max(r.width, r.height);
            s.style.width = s.style.height = d + 'px';
            s.style.left = (e.clientX - r.left - d / 2) + 'px';
            s.style.top = (e.clientY - r.top - d / 2) + 'px';
            btn.appendChild(s);
            setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 620);
        });
    }

    /* بارالاكس بسيط على كرات الهيرو */
    function initParallax() {
        var a = document.querySelector('.orb-a'), b = document.querySelector('.orb-b');
        if (!a && !b) return;
        var on = function () {
            var y = window.scrollY || 0;
            if (a) a.style.transform = 'translate3d(0,' + (-y * 0.06).toFixed(1) + 'px,0)';
            if (b) b.style.transform = 'translate3d(0,' + (y * 0.05).toFixed(1) + 'px,0)';
        };
        window.addEventListener('scroll', on, { passive: true });
        on();
    }

    /* شريط التقدم + زر الرجوع لأعلى */
    function featureOn(key) {
        try { return SiteControls.features(DataManager.load())[key]; } catch (e) { return true; }
    }

    function initScrollChrome() {
        var bar = document.getElementById('scrollProgress');
        var btn = document.getElementById('backToTop');
        if (bar && !featureOn('scrollProgress')) bar = null;
        if (btn && !featureOn('backToTop')) btn = null;
        var on = function () {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            var y = window.scrollY || document.documentElement.scrollTop || 0;
            if (bar) bar.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
            if (btn) btn.classList.toggle('show', y > 420);
        };
        window.addEventListener('scroll', on, { passive: true });
        on();
        if (btn) btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    /* أزرار مغناطيسية — تتبع المؤشر بخفة */
    function initMagnetic() {
        if (!(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches)) return;
        document.addEventListener('pointermove', function (e) {
            var b = e.target && e.target.closest && e.target.closest('.btn');
            if (!b || e.pointerType !== 'mouse') return;
            var r = b.getBoundingClientRect();
            var dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
            var dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
            var tx = (dx * 7).toFixed(1);
            var ty = (dy * 4 - 3).toFixed(1);
            b.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
        });
        document.addEventListener('pointerout', function (e) {
            var b = e.target && e.target.closest && e.target.closest('.btn');
            if (!b || e.pointerType !== 'mouse') return;
            var rt = e.relatedTarget;
            if (!rt || !b.contains(rt)) b.style.transform = '';
        });
    }

    /* كيرسور مخصص: نقطة فورية + حلقة بتتابع بنعومة، تكبر فوق العناصر التفاعلية */
    function initCursor() {
        if (reduced()) return;
        if (!featureOn('cursor')) return;
        if (!(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches)) return;
        var dot = document.getElementById('curDot'), ring = document.getElementById('curRing');
        if (!dot || !ring) return;
        var x = window.innerWidth / 2, y = window.innerHeight / 2, rx = x, ry = y;
        document.documentElement.classList.add('cur-on');
        window.addEventListener('pointermove', function (e) {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            x = e.clientX; y = e.clientY;
            dot.style.transform = 'translate(-50%,-50%) translate(' + x + 'px,' + y + 'px)';
            var hover = e.target && e.target.closest && e.target.closest('a, button, .btn, .nav-link, .filter-btn, .project-card, .service-card, .contact-card, .dynamic-card, .about-card, .back-to-top');
            if (hover) document.documentElement.classList.add('cur-hover');
            else document.documentElement.classList.remove('cur-hover');
        }, { passive: true });
        (function loop() {
            rx += (x - rx) * 0.16;
            ry += (y - ry) * 0.16;
            ring.style.transform = 'translate(-50%,-50%) translate(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px)';
            requestAnimationFrame(loop);
        })();
    }

    /* أمان: أي عنصر عدّى فوق الشاشة يتكشف فورًا (خصوصًا بعد القفز بالروابط) */
    function initRevealSafety() {
        var t = null;
        function run() {
            t = null;
            try { ScrollReveal.forceVisibleUpTo(window.innerHeight * 0.98); } catch (e) {}
        }
        window.addEventListener('scroll', function () { if (!t) t = setTimeout(run, 180); }, { passive: true });
        window.addEventListener('hashchange', function () { setTimeout(run, 80); });
        setTimeout(run, 500);
    }

    function init() {
        initBackground();
        initScrollChrome();
        initCursor();
        initRevealSafety();
        if (reduced() || !enabled()) return;
        try { if (window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches) initTilt(); } catch (e) {}
        initMagnetic();
        initRipple();
        initParallax();
    }

    return { init: init };
})();

/* ============================================
   Navigation + Init
   ============================================ */
document.addEventListener('DOMContentLoaded', function () {
    // فضّي أي صورة كبيرة من localStorage (موجودة في IndexedDB أصلًا) عشان المساحة تكفي لباقي البيانات
    try { DataManager.cleanupOversizedLogo(); } catch (e) {}

    // Init layout
    LayoutManager.init();

    // اللغة (إنجليزي افتراضي) — قبل أي رسم
    Lang.init();

    // Render site
    renderSite();

    // لو الصورة في IndexedDB بس — رجّعها للـ localStorage ثم ارسم الموقع تاني
    hydratePhoto().then(function (changed) {
        if (changed) renderSite();
    });

    // Init scroll reveal & counters
    ScrollReveal.init();
    document.documentElement.setAttribute('data-reveal-ready', '1');
    CounterAnimation.init();

    // Motion background + interactive elements
    MotionUI.init();

    // لايت بوكس المشاريع
    ProjectLightbox.bind();

    // لو وصل data.json المنشور بعدها — طبّق الثيم واللايوت والبيانات وارسم من جديد
    // نطبّق الثيم/اللايوت في أبكر وقت ممكن (وقت ما الـfetch يخلص) عشان
    // ما يحصلش قفزة في الشكل (CLS) قدام المستخدم.
    remoteReady.then(function (d) {
        if (!d) { markLayoutReady(); return; }
        if (document.body) {
            document.documentElement.setAttribute('data-theme', DataManager.getTheme() || 'neon');
            LayoutManager.apply(DataManager.getLayout());
        }
        applyRemoteData();
        markLayoutReady();
    }, function () { markLayoutReady(); });

    var nav = document.getElementById('mainNav');
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');

    if (toggle && links) {
        function navLabel(open) {
            return t(open
                ? { en: 'Close navigation menu', ar: 'إغلاق قائمة التنقل' }
                : { en: 'Open navigation menu', ar: 'فتح قائمة التنقل' });
        }
        toggle.addEventListener('click', function () {
            var open = links.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', navLabel(open));
        });
        links.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                links.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-label', navLabel(false));
            }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !links.classList.contains('open')) return;
            links.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'فتح قائمة التنقل');
            toggle.focus();
        });
    }

    if (nav) {
        window.addEventListener('scroll', function () {
            nav.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });
    }

    // Active nav on scroll
    var sections = document.querySelectorAll('.hero, .section');
    window.addEventListener('scroll', function () {
        var scrollPos = window.scrollY + 100;
        sections.forEach(function (sec) {
            if (sec.offsetTop <= scrollPos && sec.offsetTop + sec.offsetHeight > scrollPos) {
                var id = sec.getAttribute('id');
                document.querySelectorAll('.nav-link').forEach(function (l) {
                    l.classList.toggle('active', l.getAttribute('data-section') === id);
                });
            }
        });
    }, { passive: true });

    // Comment form
    var commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('commentName').value.trim();
            var text = document.getElementById('commentText').value.trim();
            if (!name || !text) return;
            CommentStore.add(name, text).then(function () {
                document.getElementById('commentName').value = '';
                document.getElementById('commentText').value = '';
                renderComments();
            });
        });
    }

    renderComments();
});

    function renderComments() {
        var list = document.getElementById('commentsList');
        if (!list) return;
        CommentStore.getAll().then(function (comments) {
            if (!comments || comments.length === 0) {
                list.innerHTML = '<div class="comments-empty">' + escHtml(t({ en: 'No comments yet — be the first to leave one!', ar: 'لا توجد تعليقات بعد — كن أول من يعلّق!' })) + '</div>';
                return;
            }
            var loc = t({ en: 'en-GB', ar: 'ar-EG' });
            list.innerHTML = comments.map(function (c) {
                var initial = (c.name || '?')[0];
                var d = new Date(c.date);
                var dateStr = d.toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric' });
                return '<div class="comment-card"><div class="comment-header"><div class="comment-avatar">' + initial + '</div><div class="comment-name">' + escHtml(c.name) + '</div><div class="comment-date">' + escHtml(dateStr) + '</div></div><div class="comment-text">' + escHtml(c.text) + '</div></div>';
            }).join('');
        });
    }

function escHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sanitizeInput(str) {
    return String(str || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<iframe[\s\S]*?<\/iframe>/gi, '').replace(/on\w+="[^"]*"/gi, '').replace(/on\w+='[^']*'/gi, '').trim();
}

function isValidURL(str) {
    try { var u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; }
}
