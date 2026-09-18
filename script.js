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

    function getDefault() {
        return typeof SITE_DATA !== 'undefined' ? JSON.parse(JSON.stringify(SITE_DATA)) : null;
    }

    function load() {
        try {
            var raw = localStorage.getItem(DATA_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return getDefault();
    }

    function save(data) {
        try {
            localStorage.setItem(DATA_KEY, JSON.stringify(data));
        } catch (e) {
            alert('خطأ في الحفظ — تأكد من تفعيل التخزين المحلي');
        }
    }

    function getLogo() {
        try { return localStorage.getItem(LOGO_KEY); } catch (e) { return null; }
    }

    function setLogo(dataUrl) {
        try { localStorage.setItem(LOGO_KEY, dataUrl); } catch (e) {}
    }

    function getTheme() {
        try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
    }

    function setTheme(theme) {
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }

    function getLayout() {
        try {
            var raw = localStorage.getItem(LAYOUT_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return { cardStyle: 'rounded', heroStyle: 'split', sectionGap: 'md', animations: 'subtle' };
    }

    function setLayout(layout) {
        try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch (e) {}
    }

    function reset() {
        try {
            localStorage.removeItem(DATA_KEY);
            localStorage.removeItem(LOGO_KEY);
            localStorage.removeItem(LAYOUT_KEY);
        } catch (e) {}
    }

    return { load: load, save: save, getDefault: getDefault, getLogo: getLogo, setLogo: setLogo, getTheme: getTheme, setTheme: setTheme, getLayout: getLayout, setLayout: setLayout, reset: reset };
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

        document.addEventListener('DOMContentLoaded', function () {
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
        });
    }

    return { init: init, apply: apply };
})();

/* ============================================
   Scroll Reveal
   ============================================ */
var ScrollReveal = (function () {
    function init() {
        if (!('IntersectionObserver' in window)) return;
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
            observer.observe(el);
        });
    }

    return { init: init };
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
                    nums.forEach(function (el) {
                        var val = el.getAttribute('data-value') || el.textContent;
                        animate(el, val);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        var heroStats = document.getElementById('heroStats');
        if (heroStats) observer.observe(heroStats);
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
    var ADMIN_KEY = 'amahdy_admin_ok';

    function sha256(str) {
        if (crypto && crypto.subtle) {
            return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (h) {
                return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
            });
        }
        return Promise.resolve(str);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var overlay = document.getElementById('adminOverlay');
        var navBtn = document.getElementById('adminNavBtn');
        var closeBtn = document.getElementById('adminClose');
        var loginSection = document.getElementById('adminLoginSection');
        var dashboard = document.getElementById('adminDashboard');
        var form = document.getElementById('adminForm');
        var errorEl = document.getElementById('adminError');
        var logoutBtn = document.getElementById('adminLogout');
        if (!overlay || !navBtn) return;

        navBtn.addEventListener('click', function () {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (localStorage.getItem(ADMIN_KEY) === '1') showDashboard();
        });

        function closePanel() { overlay.classList.add('hidden'); document.body.style.overflow = ''; }
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
                localStorage.setItem(ADMIN_KEY, '1');
                showDashboard();
                btn.disabled = false;
                return;
            }

            // Hash comparison as backup
            Promise.all([sha256(userInput), sha256(passInput)]).then(function (hashes) {
                if (hashes[0] === ADMIN_USER_HASH && hashes[1] === ADMIN_PASS_HASH) {
                    errorEl.classList.remove('show');
                    localStorage.setItem(ADMIN_KEY, '1');
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
            localStorage.removeItem(ADMIN_KEY);
            loginSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
        });

        function showDashboard() {
            loginSection.classList.add('hidden');
            dashboard.classList.remove('hidden');
            initTabs();
            loadProfileForm();
            loadStatsForm();
            loadSkillsForm();
            loadProjectsForm();
            loadServicesForm();
            loadPhoto();
            loadLayoutForm();
            loadContentForm();
            loadCommentsAdmin();
        }

        /* --- Tabs --- */
        function initTabs() {
            document.querySelectorAll('.admin-tab').forEach(function (tab) {
                tab.addEventListener('click', function () {
                    document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
                    document.querySelectorAll('.admin-tab-panel').forEach(function (p) { p.classList.remove('active'); });
                    tab.classList.add('active');
                    var panel = document.querySelector('[data-panel="' + tab.getAttribute('data-tab') + '"]');
                    if (panel) panel.classList.add('active');
                });
            });
        }

        /* --- Profile --- */
        function loadProfileForm() {
            var d = DataManager.load();
            if (!d) return;
            setVal('editName', d.profile.name);
            setVal('editRole', d.profile.role);
            setVal('editTagline', d.profile.tagline);
            setVal('editBio', d.profile.bio);
            setVal('editLocation', d.profile.location);
            setVal('editEmail', d.profile.email);
            setVal('editGithub', d.profile.socials.github);
            setVal('editBehance', d.profile.socials.behance);
            setVal('editInstagram', d.profile.socials.instagram);
            setVal('editLinkedin', d.profile.socials.linkedin);
        }

        document.getElementById('saveProfile').addEventListener('click', function () {
            var d = DataManager.load();
            d.profile.name = getVal('editName');
            d.profile.brand = d.profile.name;
            d.profile.role = getVal('editRole');
            d.profile.tagline = getVal('editTagline');
            d.profile.bio = getVal('editBio');
            d.profile.location = getVal('editLocation');
            d.profile.email = getVal('editEmail');
            d.profile.socials.github = getVal('editGithub');
            d.profile.socials.behance = getVal('editBehance');
            d.profile.socials.instagram = getVal('editInstagram');
            d.profile.socials.linkedin = getVal('editLinkedin');
            DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            CounterAnimation.init();
            showSaved(this);
        });

        /* --- Stats --- */
        function loadStatsForm() {
            var d = DataManager.load();
            var list = document.getElementById('statsList');
            list.innerHTML = '';
            (d.stats || []).forEach(function (s, i) {
                list.innerHTML += '<div class="admin-dynamic-item"><input class="admin-input admin-input-sm" value="' + esc(s.value) + '" data-field="value" placeholder="الرقم"><input class="admin-input admin-input-sm" value="' + esc(s.label) + '" data-field="label" placeholder="التسمية"><button class="admin-remove-btn" data-idx="' + i + '">✕</button></div>';
            });
            list.querySelectorAll('.admin-remove-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var d2 = DataManager.load();
                    d2.stats.splice(parseInt(btn.getAttribute('data-idx')), 1);
                    DataManager.save(d2);
                    loadStatsForm();
                });
            });
        }

        document.getElementById('addStat').addEventListener('click', function () {
            var d = DataManager.load();
            d.stats.push({ value: '', label: '' });
            DataManager.save(d);
            loadStatsForm();
        });

        document.getElementById('saveStats').addEventListener('click', function () {
            var d = DataManager.load();
            d.stats = readDynamicList('statsList', ['value', 'label']);
            DataManager.save(d);
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
                list.innerHTML += '<div class="admin-dynamic-item"><input class="admin-input admin-input-sm" value="' + esc(s) + '" placeholder="اسم المهارة"><button class="admin-remove-btn" data-idx="' + i + '">✕</button></div>';
            });
            list.querySelectorAll('.admin-remove-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var d2 = DataManager.load();
                    d2.skills.splice(parseInt(btn.getAttribute('data-idx')), 1);
                    DataManager.save(d2);
                    loadSkillsForm();
                });
            });
        }

        document.getElementById('addSkill').addEventListener('click', function () {
            var d = DataManager.load();
            d.skills.push('');
            DataManager.save(d);
            loadSkillsForm();
        });

        document.getElementById('saveSkills').addEventListener('click', function () {
            var d = DataManager.load();
            d.skills = readSimpleList('skillsList');
            DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            showSaved(this);
        });

        /* --- Projects --- */
        function loadProjectsForm() {
            var d = DataManager.load();
            var list = document.getElementById('projectsList');
            list.innerHTML = '';
            (d.projects || []).forEach(function (p, i) {
                list.innerHTML += '<div class="admin-dynamic-item admin-project-item"><div class="admin-project-header"><strong>' + esc(p.title) + '</strong><span class="project-tag">' + esc(p.categoryLabel) + '</span></div><div class="admin-project-fields"><input class="admin-input admin-input-sm" value="' + esc(p.title) + '" data-field="title" placeholder="العنوان"><input class="admin-input admin-input-sm" value="' + esc(p.category) + '" data-field="category" placeholder="التصنيف (identity/social/motion/print)"><input class="admin-input admin-input-sm" value="' + esc(p.categoryLabel) + '" data-field="categoryLabel" placeholder="اسم التصنيف"><input class="admin-input admin-input-sm" value="' + esc(p.year) + '" data-field="year" placeholder="السنة"><input class="admin-input admin-input-sm" value="' + esc(p.image) + '" data-field="image" dir="ltr" placeholder="رابط الصورة (اختياري)"><textarea class="admin-input admin-input-sm" data-field="description" rows="2" placeholder="الوصف">' + esc(p.description) + '</textarea></div><button class="admin-remove-btn" data-idx="' + i + '">✕ حذف المشروع</button></div>';
            });
            list.querySelectorAll('.admin-remove-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var d2 = DataManager.load();
                    d2.projects.splice(parseInt(btn.getAttribute('data-idx')), 1);
                    DataManager.save(d2);
                    loadProjectsForm();
                });
            });
        }

        document.getElementById('addProject').addEventListener('click', function () {
            var d = DataManager.load();
            d.projects.push({ title: 'مشروع جديد', category: 'social', categoryLabel: 'سوشيال ميديا', description: 'وصف المشروع', image: '', tags: [], year: '2026' });
            DataManager.save(d);
            loadProjectsForm();
        });

        document.getElementById('saveProjects').addEventListener('click', function () {
            var d = DataManager.load();
            var items = document.querySelectorAll('#projectsList .admin-project-item');
            d.projects = [];
            items.forEach(function (item) {
                d.projects.push({
                    title: item.querySelector('[data-field="title"]').value,
                    category: item.querySelector('[data-field="category"]').value,
                    categoryLabel: item.querySelector('[data-field="categoryLabel"]').value,
                    description: item.querySelector('[data-field="description"]').value,
                    image: item.querySelector('[data-field="image"]').value,
                    tags: [item.querySelector('[data-field="categoryLabel"]').value],
                    year: item.querySelector('[data-field="year"]').value
                });
            });
            DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            showSaved(this);
        });

        /* --- Services --- */
        function loadServicesForm() {
            var d = DataManager.load();
            var list = document.getElementById('servicesList');
            list.innerHTML = '';
            (d.services || []).forEach(function (s, i) {
                list.innerHTML += '<div class="admin-dynamic-item admin-service-item"><div class="admin-project-header"><strong>' + esc(s.name) + '</strong><span class="project-tag">' + esc(s.price) + '</span></div><div class="admin-project-fields"><input class="admin-input admin-input-sm" value="' + esc(s.name) + '" data-field="name" placeholder="اسم الخدمة"><input class="admin-input admin-input-sm" value="' + esc(s.price) + '" data-field="price" placeholder="السعر"><textarea class="admin-input admin-input-sm" data-field="features" rows="3" placeholder="المميزات (كل سطر ميزة)">' + (s.features || []).join('\n') + '</textarea><input class="admin-input admin-input-sm" value="' + esc(s.delivery) + '" data-field="delivery" placeholder="مدة التسليم"></div><label class="admin-check-label"><input type="checkbox" data-field="featured"' + (s.featured ? ' checked' : '') + '> الأكثر طلباً</label><button class="admin-remove-btn" data-idx="' + i + '">✕ حذف الخدمة</button></div>';
            });
            list.querySelectorAll('.admin-remove-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var d2 = DataManager.load();
                    d2.services.splice(parseInt(btn.getAttribute('data-idx')), 1);
                    DataManager.save(d2);
                    loadServicesForm();
                });
            });
        }

        document.getElementById('addService').addEventListener('click', function () {
            var d = DataManager.load();
            d.services.push({ name: 'خدمة جديدة', price: 'ابتداءً من 0$', features: ['ميزة 1', 'ميزة 2'], delivery: 'مدة التسليم: أسبوع', featured: false });
            DataManager.save(d);
            loadServicesForm();
        });

        document.getElementById('saveServices').addEventListener('click', function () {
            var d = DataManager.load();
            var items = document.querySelectorAll('#servicesList .admin-service-item');
            d.services = [];
            items.forEach(function (item) {
                d.services.push({
                    name: item.querySelector('[data-field="name"]').value,
                    price: item.querySelector('[data-field="price"]').value,
                    features: item.querySelector('[data-field="features"]').value.split('\n').filter(function (l) { return l.trim(); }),
                    delivery: item.querySelector('[data-field="delivery"]').value,
                    featured: item.querySelector('[data-field="featured"]').checked
                });
            });
            DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            showSaved(this);
        });

        /* --- Photo --- */
        function loadPhoto() {
            var logo = DataManager.getLogo();
            var preview = document.getElementById('adminLogoPreview');
            var avatar = document.getElementById('aboutAvatar');
            if (logo) {
                if (preview) preview.innerHTML = '<img src="' + logo + '" alt="Logo">';
                if (avatar) { avatar.innerHTML = '<img src="' + logo + '" alt="A.M">'; avatar.classList.add('has-logo'); }
            }
        }

        document.getElementById('logoUpload').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file || file.size > 2 * 1024 * 1024) { alert('الملف أكبر من 2MB'); return; }
            var reader = new FileReader();
            reader.onload = function (ev) {
                DataManager.setLogo(ev.target.result);
                loadPhoto();
            };
            reader.readAsDataURL(file);
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
        function loadContentForm() {
            var d = DataManager.load();
            if (!d || !d.site) return;
            setVal('editBadge', d.site.badge);
            setVal('editHeroBtn1', d.site.heroBtn1);
            setVal('editHeroBtn2', d.site.heroBtn2);
            setVal('editAboutTitle', d.site.aboutTitle);
            setVal('editAboutDesc', d.site.aboutDesc);
            setVal('editProjectsTitle', d.site.projectsTitle);
            setVal('editProjectsDesc', d.site.projectsDesc);
            setVal('editServicesTitle', d.site.servicesTitle);
            setVal('editServicesDesc', d.site.servicesDesc);
            setVal('editContactTitle', d.site.contactTitle);
            setVal('editContactDesc', d.site.contactDesc);
            setVal('editContactCard1', d.site.contactCard1);
            setVal('editContactCard2', d.site.contactCard2);
            setVal('editContactCard3', d.site.contactCard3);
            setVal('editFooterText', d.site.footerText);
        }

        document.getElementById('saveContent').addEventListener('click', function () {
            var d = DataManager.load();
            if (!d.site) d.site = {};
            d.site.badge = getVal('editBadge');
            d.site.heroBtn1 = getVal('editHeroBtn1');
            d.site.heroBtn2 = getVal('editHeroBtn2');
            d.site.aboutTitle = getVal('editAboutTitle');
            d.site.aboutDesc = getVal('editAboutDesc');
            d.site.projectsTitle = getVal('editProjectsTitle');
            d.site.projectsDesc = getVal('editProjectsDesc');
            d.site.servicesTitle = getVal('editServicesTitle');
            d.site.servicesDesc = getVal('editServicesDesc');
            d.site.contactTitle = getVal('editContactTitle');
            d.site.contactDesc = getVal('editContactDesc');
            d.site.contactCard1 = getVal('editContactCard1');
            d.site.contactCard2 = getVal('editContactCard2');
            d.site.contactCard3 = getVal('editContactCard3');
            d.site.footerText = getVal('editFooterText');
            DataManager.save(d);
            renderSite();
            ScrollReveal.init();
            CounterAnimation.init();
            showSaved(this);
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
        });
    });

    function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
    function getVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
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
function renderSite() {
    var d = DataManager.load();
    if (!d) return;

    function $(id) { return document.getElementById(id); }
    function fill(id, v) { var el = $(id); if (el && v) el.textContent = v; }

    var p = d.profile;
    var s = d.site || {};

    fill('heroName', p.name);
    fill('heroRole', p.role);
    fill('heroTagline', p.tagline);
    fill('heroBadge', s.badge);
    fill('heroBtn1', s.heroBtn1);
    fill('heroBtn2', s.heroBtn2);
    fill('aboutBio', p.bio);
    fill('aboutTitle', s.aboutTitle);
    fill('aboutDesc', s.aboutDesc);
    fill('contactEmail', p.email);
    fill('contactLocation', p.location);
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

    var socials = d.profile.socials || {};
    var names = [];
    if (socials.behance) names.push('Behance');
    if (socials.github) names.push('GitHub');
    if (socials.linkedin) names.push('LinkedIn');
    if (socials.instagram) names.push('Instagram');
    var cs = $('contactSocials');
    if (cs) cs.textContent = names.join(' · ') || '—';

    // Stats
    var hs = $('heroStats');
    if (hs && d.stats) {
        hs.innerHTML = d.stats.map(function (s) {
            return '<div class="hero-stat"><div class="hero-stat-num" data-value="' + s.value + '">' + s.value + '</div><div class="hero-stat-label">' + s.label + '</div></div>';
        }).join('');
    }

    // Skills
    var sk = $('aboutSkills');
    if (sk && d.skills) {
        sk.innerHTML = d.skills.map(function (s) {
            return '<span class="skill-tag">' + s + '</span>';
        }).join('');
    }

    // Filter toolbar
    var cats = {};
    (d.projects || []).forEach(function (p) { cats[p.category] = p.categoryLabel; });
    var tb = $('projectsToolbar');
    if (tb) {
        tb.innerHTML = '<button class="filter-btn active" data-filter="all">الكل</button>';
        Object.keys(cats).forEach(function (k) {
            tb.innerHTML += '<button class="filter-btn" data-filter="' + k + '">' + cats[k] + '</button>';
        });
        tb.querySelectorAll('.filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                tb.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var filter = btn.getAttribute('data-filter');
                document.querySelectorAll('.project-card').forEach(function (card) {
                    card.classList.toggle('hide', filter !== 'all' && card.getAttribute('data-filter') !== filter);
                });
            });
        });
    }

    // Projects
    var grid = $('projectsGrid');
    if (grid && d.projects) {
        grid.innerHTML = d.projects.map(function (p, i) {
            var img = p.image && isValidURL(p.image)
                ? '<div class="project-cover" style="background-image:url(\'' + escAttr(p.image) + '\')"></div>'
                : '<div class="project-cover project-cover-art"><span class="project-art-label">' + escHtml(p.categoryLabel || p.category) + '</span></div>';
            return '<article class="project-card reveal" data-filter="' + escAttr(p.category) + '">' + img + '<div class="project-body"><div class="project-meta"><span class="project-tag">' + escHtml(p.categoryLabel || p.category) + '</span><span class="project-year">' + escHtml(p.year || '') + '</span></div><h3 class="project-title">' + escHtml(p.title) + '</h3><p class="project-desc">' + escHtml(p.description) + '</p></div></article>';
        }).join('');
    }

    // Services
    var sg = $('servicesGrid');
    if (sg && d.services) {
        sg.innerHTML = d.services.map(function (s) {
            return '<div class="service-card' + (s.featured ? ' featured' : '') + ' reveal">' + (s.featured ? '<div class="service-badge">الأكثر طلباً</div>' : '') + '<h3 class="service-name">' + escHtml(s.name) + '</h3><div class="service-price">' + escHtml(s.price) + '</div><ul class="service-features">' + (s.features || []).map(function (f) { return '<li>' + escHtml(f) + '</li>'; }).join('') + '</ul><div class="service-delivery">' + escHtml(s.delivery || '') + '</div></div>';
        }).join('');
    }

    // Add reveal classes to sections
    document.querySelectorAll('.section').forEach(function (sec) {
        if (!sec.classList.contains('reveal')) sec.classList.add('reveal');
    });
}

/* ============================================
   Navigation + Init
   ============================================ */
document.addEventListener('DOMContentLoaded', function () {
    // Init layout
    LayoutManager.init();

    // Render site
    renderSite();

    // Init scroll reveal & counters
    ScrollReveal.init();
    CounterAnimation.init();

    var nav = document.getElementById('mainNav');
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');

    if (toggle && links) {
        toggle.addEventListener('click', function () { links.classList.toggle('open'); });
        links.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () { links.classList.remove('open'); });
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
            list.innerHTML = '<div class="comments-empty">لا توجد تعليقات بعد — كن أول من يعلّق!</div>';
            return;
        }
        list.innerHTML = comments.map(function (c) {
            var initial = (c.name || '?')[0];
            var d = new Date(c.date);
            var dateStr = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
            return '<div class="comment-card"><div class="comment-header"><div class="comment-avatar">' + initial + '</div><div class="comment-name">' + escHtml(c.name) + '</div><div class="comment-date">' + dateStr + '</div></div><div class="comment-text">' + escHtml(c.text) + '</div></div>';
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
