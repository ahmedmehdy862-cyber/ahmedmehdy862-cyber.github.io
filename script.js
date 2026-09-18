/* ============================================
   Admin Panel (لوحة تحكم صاحب الحساب)
   ============================================ */
(function () {
    // SHA-256 hash لحساب صاحب الموقع (username + password منفصلين)
    var ADMIN_USER_HASH = '096771b94c4e41db001544503f961369d1dd4268f3d5cb44029c9c46accba476';
    var ADMIN_PASS_HASH = 'd6401d76d7b9e7c57e5e61d44608c498d8e8c3125a2dfebf0dfe5e6ead3c4b5c';
    var ADMIN_KEY = 'amahdy_admin_ok';
    var LOGO_KEY = 'amahdy_logo';

    function sha256(str) {
        var buf = new TextEncoder().encode(str);
        return crypto.subtle.digest('SHA-256', buf).then(function (hash) {
            var hex = '';
            new Uint8Array(hash).forEach(function (b) {
                hex += b.toString(16).padStart(2, '0');
            });
            return hex;
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var overlay = document.getElementById('adminOverlay');
        var navBtn = document.getElementById('adminNavBtn');
        var closeBtn = document.getElementById('adminClose');
        var loginSection = document.getElementById('adminLoginSection');
        var dashboard = document.getElementById('adminDashboard');
        var form = document.getElementById('adminForm');
        var userInput = document.getElementById('adminUser');
        var passInput = document.getElementById('adminPass');
        var errorEl = document.getElementById('adminError');
        var logoutBtn = document.getElementById('adminLogout');
        var logoUpload = document.getElementById('logoUpload');
        var logoPreview = document.getElementById('adminLogoPreview');
        var aboutAvatar = document.getElementById('aboutAvatar');

        if (!overlay || !navBtn) return;

        // تحميل اللوجو المحفوظ
        loadSavedLogo(logoPreview, aboutAvatar);

        // تحميل الثيم المحفوظ وتحديث الأزرار
        var savedTheme = null;
        try {
            savedTheme = localStorage.getItem('amahdy_theme');
        } catch (e) {}
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        updateAdminThemeButtons(savedTheme || 'neon');

        // فتح لوحة التحكم
        navBtn.addEventListener('click', function () {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            // لو مسجل دخول بالفعل
            if (localStorage.getItem(ADMIN_KEY) === '1') {
                showDashboard();
            }
        });

        // إغلاق لوحة التحكم
        function closePanel() {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }

        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closePanel();
        });

        // تسجيل الدخول
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var btn = form.querySelector('.admin-submit-btn');
            btn.disabled = true;
            Promise.all([
                sha256(userInput.value.trim()),
                sha256(passInput.value)
            ]).then(function (hashes) {
                if (hashes[0] === ADMIN_USER_HASH && hashes[1] === ADMIN_PASS_HASH) {
                    errorEl.classList.remove('show');
                    localStorage.setItem(ADMIN_KEY, '1');
                    showDashboard();
                    btn.disabled = false;
                } else {
                    errorEl.classList.add('show');
                    setTimeout(function () {
                        errorEl.classList.remove('show');
                        passInput.select();
                        btn.disabled = false;
                    }, 1500);
                }
            });
        });

        // تسجيل الخروج
        logoutBtn.addEventListener('click', function () {
            localStorage.removeItem(ADMIN_KEY);
            loginSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
            userInput.value = '';
            passInput.value = '';
        });

        // رفع اللوجو
        logoUpload.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                alert('الملف أكبر من 2MB');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (ev) {
                var dataUrl = ev.target.result;
                try {
                    localStorage.setItem(LOGO_KEY, dataUrl);
                } catch (err) {
                    alert('الملف كبير جداً للحفظ في المتصفح');
                    return;
                }
                loadSavedLogo(logoPreview, aboutAvatar);
            };
            reader.readAsDataURL(file);
        });

        // التحكم بالثيمات من لوحة التحكم
        var adminThemeBtns = document.querySelectorAll('.admin-theme-btn');
        adminThemeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var theme = btn.getAttribute('data-theme');
                document.documentElement.setAttribute('data-theme', theme);
                try {
                    localStorage.setItem('amahdy_theme', theme);
                } catch (e) {}
                updateAdminThemeButtons(theme);
                // تحديث أزرار الناف
                document.querySelectorAll('.theme-dot').forEach(function (dot) {
                    dot.classList.toggle('active', dot.getAttribute('data-theme') === theme);
                });
            });
        });

        function updateAdminThemeButtons(active) {
            adminThemeBtns.forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-theme') === active);
            });
        }

        function showDashboard() {
            loginSection.classList.add('hidden');
            dashboard.classList.remove('hidden');
        }

        function loadSavedLogo(previewEl, avatarEl) {
            var saved = null;
            try {
                saved = localStorage.getItem(LOGO_KEY);
            } catch (e) {}
            if (saved) {
                if (previewEl) {
                    previewEl.innerHTML = '<img src="' + saved + '" alt="Logo">';
                }
                if (avatarEl) {
                    avatarEl.innerHTML = '<img src="' + saved + '" alt="A.Mahdy">';
                    avatarEl.classList.add('has-logo');
                }
            }
        }
    });
})();

/* ============================================
   Themes (تغيير الثيم مع حفظ الاختيار)
   ============================================ */
(function () {
    var THEME_KEY = 'amahdy_theme';
    var root = document.documentElement;

    var savedTheme = null;
    try {
        savedTheme = localStorage.getItem(THEME_KEY);
    } catch (e) {}

    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var dots = document.querySelectorAll('.theme-dot');
        if (!dots.length) return;
        highlightCurrent();

        dots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                var theme = dot.getAttribute('data-theme');
                root.setAttribute('data-theme', theme);
                try {
                    localStorage.setItem(THEME_KEY, theme);
                } catch (e) {}
                highlightCurrent();
            });
        });
    });

    function highlightCurrent() {
        var current = root.getAttribute('data-theme');
        document.querySelectorAll('.theme-dot').forEach(function (dot) {
            if (dot.getAttribute('data-theme') === current) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
})();

/* ============================================
   Portfolio Data Rendering (من data.js)
   ============================================ */
(function () {
    var data = typeof SITE_DATA !== 'undefined' ? SITE_DATA : null;

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fillText(id, value) {
        var el = $(id);
        if (el && value) el.textContent = value;
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (!data) return;

        // Hero
        fillText('heroName', data.profile.name);
        fillText('heroRole', data.profile.role);
        fillText('heroTagline', data.profile.tagline);

        // About
        fillText('aboutBio', data.profile.bio);
        var skillsWrap = $('aboutSkills');
        if (skillsWrap) {
            skillsWrap.innerHTML = (data.skills || [])
                .map(function (s) {
                    return '<span class="skill-tag">' + escapeHtml(s) + '</span>';
                })
                .join('');
        }

        // Hero Stats
        var heroStats = $('heroStats');
        if (heroStats && data.stats && data.stats.length) {
            heroStats.innerHTML = data.stats.map(function (stat) {
                return '<div class="hero-stat">' +
                    '<div class="hero-stat-num">' + escapeHtml(stat.value) + '</div>' +
                    '<div class="hero-stat-label">' + escapeHtml(stat.label) + '</div>' +
                    '</div>';
            }).join('');
        }

        // Projects Grid
        var grid = $('projectsGrid');
        if (grid && data.projects && data.projects.length) {
            grid.innerHTML = data.projects.map(function (p, i) {
                var img = p.image
                    ? '<div class="project-cover" style="background-image:url(\'' + escapeHtml(p.image) + '\')"></div>'
                    : '<div class="project-cover project-cover-art" data-index="' + i + '">' + '<span class="project-art-label">' + escapeHtml(p.categoryLabel || p.category) + '</span></div>';
                return '<article class="project-card" data-filter="' + escapeHtml(p.category) + '">' +
                    img +
                    '<div class="project-body">' +
                    '<div class="project-meta"><span class="project-tag">' + escapeHtml(p.categoryLabel || p.category) + '</span><span class="project-year">' + escapeHtml(p.year) + '</span></div>' +
                    '<h3 class="project-title">' + escapeHtml(p.title) + '</h3>' +
                    '<p class="project-desc">' + escapeHtml(p.description) + '</p>' +
                    '<div class="project-tags">' + (p.tags || []).map(function (t) {
                        return '<span class="project-tag-mini">' + escapeHtml(t) + '</span>';
                    }).join('') + '</div>' +
                    '</div>' +
                    '</article>';
            }).join('');
        }

        // Services Grid
        var services = $('servicesGrid');
        if (services && data.services && data.services.length) {
            services.innerHTML = data.services.map(function (s) {
                var featured = s.featured ? ' featured' : '';
                return '<div class="service-card' + featured + '">' +
                    (s.featured ? '<div class="service-badge">الأكثر طلباً</div>' : '') +
                    '<h3 class="service-name">' + escapeHtml(s.name) + '</h3>' +
                    '<div class="service-price">' + escapeHtml(s.price) + '</div>' +
                    '<ul class="service-features">' + (s.features || []).map(function (f) {
                        return '<li>' + escapeHtml(f) + '</li>';
                    }).join('') + '</ul>' +
                    '<div class="service-delivery">' + escapeHtml(s.delivery || '') + '</div>' +
                    '</div>';
            }).join('');
        }

        // Contact
        fillText('contactEmail', data.profile.email);
        fillText('contactLocation', data.profile.location);

        var socials = data.profile.socials || {};
        var socialNames = [];
        if (socials.behance) socialNames.push('Behance');
        if (socials.github) socialNames.push('GitHub');
        if (socials.linkedin) socialNames.push('LinkedIn');
        if (socials.instagram) socialNames.push('Instagram');
        var contactSocials = $('contactSocials');
        if (contactSocials && socialNames.length) {
            contactSocials.textContent = socialNames.join(' · ');
        }

        // Footer Year
        fillText('footerYear', String(new Date().getFullYear()));

        // Filters
        var filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                filterBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var filter = btn.getAttribute('data-filter');
                document.querySelectorAll('.project-card').forEach(function (card) {
                    if (filter === 'all') {
                        card.classList.remove('hide');
                    } else {
                        card.classList.toggle('hide', card.getAttribute('data-filter') !== filter);
                    }
                });
            });
        });
    });
})();

/* ============================================
   Navigation
   ============================================ */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var nav = document.getElementById('mainNav');
        var toggle = document.getElementById('navToggle');
        var links = document.getElementById('navLinks');

        if (toggle && links) {
            toggle.addEventListener('click', function () {
                links.classList.toggle('open');
            });

            links.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    links.classList.remove('open');
                });
            });
        }

        if (nav) {
            window.addEventListener('scroll', function () {
                if (window.scrollY > 50) {
                    nav.classList.add('scrolled');
                } else {
                    nav.classList.remove('scrolled');
                }
            }, { passive: true });
        }
    });
})();