/* ============================================
   Access Gate (كود الدخول)
   ============================================ */
(function () {
    // SHA-256 hash لكود الدخول الحالي
    var ACCESS_HASH = 'c63193f61619ed8a22c04552f76e6e6453982632f6f26d77d63b600f5caf7e20';
    // SHA-256 hash لحساب صاحب الموقع (username + password منفصلين)
    var ADMIN_USER_HASH = '096771b94c4e41db001544503f961369d1dd4268f3d5cb44029c9c46accba476';
    var ADMIN_PASS_HASH = 'd6401d76d7b9e7c57e5e61d44608c498d8e8c3125a2dfebf0dfe5e6ead3c4b5c';
    var STORAGE_KEY = 'asar_access_ok';
    var enterCount = 0;

    function sha256(str) {
        // استخدام Web Crypto API المدمجة (تشغّل على HTTPS تلقائياً)
        var buf = new TextEncoder().encode(str);
        return crypto.subtle.digest('SHA-256', buf).then(function (hash) {
            var hex = '';
            new Uint8Array(hash).forEach(function (b) {
                hex += b.toString(16).padStart(2, '0');
            });
            return hex;
        });
    }

    function unlock() {
        var gate = document.getElementById('accessGate');
        if (gate) gate.classList.add('hidden');
        try {
            sessionStorage.setItem(STORAGE_KEY, '1');
        } catch (e) {}
        document.body.style.overflow = '';
    }

    function tryAutoUnlock() {
        var ok = false;
        try {
            ok = sessionStorage.getItem(STORAGE_KEY) === '1';
        } catch (e) {}
        if (ok) {
            unlock();
            return true;
        }
        return false;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var gate = document.getElementById('accessGate');
        if (!gate) return;

        // منع عمل المحتوى خلف البوابة قبل إدخال الكود
        if (!tryAutoUnlock()) {
            document.body.style.overflow = 'hidden';

            var form = document.getElementById('accessForm');
            var input = document.getElementById('accessCode');
            var error = document.getElementById('accessError');

            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var btn = form.querySelector('.access-gate-btn');
                btn.disabled = true;
                sha256(input.value.trim()).then(function (hash) {
                    if (hash === ACCESS_HASH) {
                        enterCount = 0;
                        error.classList.remove('show');
                        input.value = '';
                        unlock();
                        btn.disabled = false;
                    } else {
                        enterCount++;
                        error.classList.add('show');
                        setTimeout(function () {
                            error.classList.remove('show');
                            input.select();
                            btn.disabled = false;
                        }, entryRate());
                    }
                });
            });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') form.requestSubmit();
            });

            // خانة دخول صاحب الحساب (مخفية)
            var adminToggle = document.getElementById('adminToggle');
            var adminForm = document.getElementById('adminForm');
            var adminUser = document.getElementById('adminUser');
            var adminPass = document.getElementById('adminPass');
            var adminError = document.getElementById('adminError');

            if (adminToggle && adminForm) {
                adminToggle.addEventListener('click', function () {
                    var isHidden = adminForm.classList.toggle('hidden');
                    adminToggle.textContent = isHidden ? 'دخول صاحب الحساب' : 'إغلاق';
                    if (!isHidden) adminUser.focus();
                });

                adminForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    var btn = adminForm.querySelector('.access-gate-btn');
                    btn.disabled = true;
                    Promise.all([
                        sha256(adminUser.value.trim()),
                        sha256(adminPass.value)
                    ]).then(function (hashes) {
                        if (hashes[0] === ADMIN_USER_HASH && hashes[1] === ADMIN_PASS_HASH) {
                            adminError.classList.remove('show');
                            adminUser.value = '';
                            adminPass.value = '';
                            unlock();
                        } else {
                            adminError.classList.add('show');
                            setTimeout(function () {
                                adminError.classList.remove('show');
                                adminPass.select();
                                btn.disabled = false;
                            }, 1500);
                        }
                    });
                });
            }

            window.addEventListener('keydown', function (e) {
                // منع النقر بزر الفأرة الأيمن على البوابة
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
                    e.preventDefault();
                }
            });
        }
    });

    function entryRate() {
        // فاصل زمني يتزايد لتقليل المحاولات التجريبية
        return Math.min(1500 * Math.pow(enterCount, 1.4), 10000);
    }
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