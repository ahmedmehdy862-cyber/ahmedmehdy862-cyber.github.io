/* ============================================
   أسر صناع الحياة — تقرير إنجازات الميديا
   Interactions & Animations
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initScrollAnimations();
    initCounters();
    initBarFills();
    initActiveNav();
    initCharts();
});

/* ============================================
   Sticky Navigation
   ============================================ */
function initNavigation() {
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });

    toggle.addEventListener('click', function () {
        links.classList.toggle('open');
        const isOpen = links.classList.contains('open');
        toggle.setAttribute('aria-label', isOpen ? 'إغلاق القائمة' : 'فتح القائمة');
    });

    // Close nav when a link is clicked
    links.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            links.classList.remove('open');
        });
    });
}

/* ============================================
   Scroll Reveal Animations
   ============================================ */
function initScrollAnimations() {
    const animateElements = document.querySelectorAll('[data-animate]');
    const windowHeight = window.innerHeight;

    function checkVisibility() {
        animateElements.forEach(function (el) {
            const rect = el.getBoundingClientRect();
            const revealPoint = 150;

            if (rect.top < windowHeight - revealPoint && rect.bottom > 0) {
                if (!el.classList.contains('visible')) {
                    el.classList.add('visible');
                    // Trigger counter animations if this element contains counters
                    initCountersInElement(el);
                    // Trigger bar fills if this element contains bars
                    initBarFillsInElement(el);
                }
            }
        });
    }

    // Check initial state
    checkVisibility();

    // Listen for scroll
    window.addEventListener('scroll', function () {
        checkVisibility();
    }, { passive: true });

    // Handle window resize
    window.addEventListener('resize', function () {
        requestAnimationFrame(checkVisibility);
    });
}

/* ============================================
   Counter Animations
   ============================================ */
function initCounters() {
    const counterElements = document.querySelectorAll('[data-count]');

    function checkCounters() {
        counterElements.forEach(function (el) {
            if (el.classList.contains('counted')) return;

            const rect = el.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            if (rect.top < windowHeight - 50 && rect.bottom > 0) {
                el.classList.add('counted');
                animateCounter(el);
            }
        });
    }

    // Check on load and scroll
    checkCounters();
    window.addEventListener('scroll', checkCounters, { passive: true });
}

function initCountersInElement(el) {
    const counters = el.querySelectorAll('[data-count]:not(.counted)');
    counters.forEach(function (counter) {
        counter.classList.add('counted');
        animateCounter(counter);
    });
}

function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    function formatNumber(num) {
        if (target >= 1000000) {
            return num.toLocaleString('en-US').replace(/\.\d+/, '');
        }
        return Math.round(num).toLocaleString('en-US');
    }

    const timer = setInterval(function () {
        step++;
        current += increment;

        if (step >= steps) {
            current = target;
            clearInterval(timer);
        }

        el.textContent = prefix + formatNumber(current) + suffix;
    }, duration / steps);
}

/* ============================================
   Bar Fill Animations
   ============================================ */
function initBarFills() {
    const barElements = document.querySelectorAll('.bar-fill');

    function checkBars() {
        barElements.forEach(function (bar) {
            if (bar.classList.contains('filled')) return;

            const rect = bar.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            if (rect.top < windowHeight - 50 && rect.bottom > 0) {
                bar.classList.add('filled');
                const width = bar.getAttribute('data-width') + '%';
                bar.style.width = width;
            }
        });
    }

    checkBars();
    window.addEventListener('scroll', checkBars, { passive: true });
}

function initBarFillsInElement(el) {
    const bars = el.querySelectorAll('.bar-fill:not(.filled)');
    bars.forEach(function (bar) {
        bar.classList.add('filled');
        const width = bar.getAttribute('data-width') + '%';
        bar.style.width = width;
    });
}

/* ============================================
   Active Navigation Link on Scroll
   ============================================ */
function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateActiveLink() {
        let current = 'hero';
        const scrollPosition = window.scrollY + 200;

        sections.forEach(function (section) {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;

            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(function (link) {
            if (link.getAttribute('data-section') === current) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();
}

/* ============================================
   Interactive Charts (Chart.js)
   ============================================ */
function initCharts() {
    const months = ['نوف', 'ديس', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر'];

    const blue = '#014976';
    const blueLight = 'rgba(1, 73, 118, 0.12)';
    const orange = '#FBAE42';

    function createChart(id, data, color, fillColor) {
        var ctx = document.getElementById(id);
        if (!ctx) return;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    data: data,
                    borderColor: color || blue,
                    backgroundColor: fillColor || blueLight,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: color || blue,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(1, 73, 118, 0.9)',
                        titleFont: { family: "'Noto Kufi Arabic', sans-serif", size: 12 },
                        bodyFont: { family: "'Noto Kufi Arabic', sans-serif", size: 13, weight: '700' },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(ctx) {
                                var val = ctx.parsed.y;
                                if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                                if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
                                return val.toLocaleString('en-US');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Noto Kufi Arabic', sans-serif", size: 10 },
                            color: '#999',
                            maxRotation: 0
                        }
                    },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                        ticks: {
                            font: { family: "'Noto Kufi Arabic', sans-serif", size: 10 },
                            color: '#999',
                            maxTicksLimit: 5,
                            callback: function(val) {
                                if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                                if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                                return val;
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Facebook Charts — data based on Meta Insights screenshots
    createChart('fb-views',       [30000, 110000, 130000, 100000, 120000, 110000, 100000, 130000, 100000, 90000, 70000], blue);
    createChart('fb-viewers',     [8000, 18000, 20000, 16000, 22000, 18000, 17000, 16000, 12000, 8000, 4500], blue);
    createChart('fb-interactions',[800, 3500, 4200, 3000, 4500, 3500, 3200, 3500, 2500, 2500, 2300], blue);
    createChart('fb-clicks',      [50, 200, 250, 180, 280, 200, 180, 170, 120, 100, 70], blue);
    createChart('fb-pagevisits',  [1500, 4500, 5000, 4000, 5500, 4500, 4000, 4300, 3000, 3000, 3000], blue);
    createChart('fb-follows',     [100, 400, 500, 350, 500, 350, 300, 300, 200, 100, 100], blue);

    // Instagram Charts — data based on Meta Insights screenshots
    createChart('ig-reach',        [5, 15, 20, 15, 25, 20, 30, 50, 200, 180, 149], orange);
    createChart('ig-views',        [500, 1200, 1000, 1500, 1500, 1000, 1500, 6000, 4500, 4000, 3600], orange);
    createChart('ig-interactions', [2, 5, 8, 6, 10, 8, 10, 15, 25, 12, 7], orange);
    createChart('ig-profile',      [1, 3, 5, 4, 8, 6, 8, 15, 20, 14, 8], orange);
    createChart('ig-follows',      [1, 2, 3, 2, 4, 3, 4, 6, 8, 12, 5], orange);
    createChart('ig-clicks',       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], orange, 'rgba(251, 174, 66, 0.08)');
}