/* ============================================
   artchristech — script.js (ESM)
   Showcase, Splide carousels, PhotoSwipe lightbox
   ============================================ */

import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.min.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Seed of Life ASCII Animation ---
    (() => {
        const canvas = document.getElementById('seed-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const label = document.querySelector('.seed-label');

        const CHAR_W = 7;
        const CHAR_H = 14;
        const COLS = Math.min(120, Math.floor(window.innerWidth / CHAR_W));
        const ROWS = Math.floor(Math.min(window.innerHeight, 800) / CHAR_H);
        canvas.width = COLS * CHAR_W;
        canvas.height = ROWS * CHAR_H;

        const cx = COLS / 2;
        const cy = ROWS / 2;
        const aspect = CHAR_H / CHAR_W;
        const R = Math.min(COLS * aspect, ROWS) * 0.17;

        // 7 circles: center + 6 surrounding at 60° intervals
        // Seed of Life: surrounding centers are exactly 1 radius away
        const circles = [{ x: cx, y: cy }];
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
            circles.push({
                x: cx + R * Math.cos(a) / aspect,
                y: cy + R * Math.sin(a)
            });
        }

        // Character palette from dim to bright
        const PALETTE = ['.', ':', '-', '~', '=', '+', '*', '#', '@'];
        const THICKNESS = 1.4;

        // Build the grid for a given set of active circles
        function buildGrid(activeCount) {
            const grid = [];
            for (let row = 0; row < ROWS; row++) {
                grid[row] = [];
                for (let col = 0; col < COLS; col++) {
                    let intensity = 0;
                    for (let ci = 0; ci < activeCount; ci++) {
                        const c = circles[ci];
                        const dx = (col - c.x) * aspect;
                        const dy = row - c.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const diff = Math.abs(dist - R);
                        if (diff < THICKNESS) {
                            intensity = Math.max(intensity, 1.0 - diff / THICKNESS);
                        }
                        // Intersection glow — brighter where circles cross
                        if (diff < THICKNESS * 0.5 && activeCount > 1) {
                            for (let cj = ci + 1; cj < activeCount; cj++) {
                                const c2 = circles[cj];
                                const dx2 = (col - c2.x) * aspect;
                                const dy2 = row - c2.y;
                                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                                const diff2 = Math.abs(dist2 - R);
                                if (diff2 < THICKNESS) {
                                    intensity = Math.min(1.0, intensity + 0.5);
                                }
                            }
                        }
                    }
                    grid[row][col] = intensity;
                }
            }
            return grid;
        }

        function render(grid, progress) {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = `${CHAR_H}px monospace`;
            ctx.textBaseline = 'top';

            for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                    const v = grid[row][col];
                    if (v <= 0.01) continue;
                    const idx = Math.min(PALETTE.length - 1, Math.floor(v * (PALETTE.length - 1)));
                    const ch = PALETTE[idx];
                    // Gold-to-cyan color based on intensity
                    const r = Math.floor(140 + v * 56);
                    const g = Math.floor(120 + v * 80);
                    const b = Math.floor(60 + v * 160);
                    const alpha = Math.min(1, v * 1.2) * progress;
                    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                    ctx.fillText(ch, col * CHAR_W, row * CHAR_H);
                }
            }
        }

        let started = false;
        let startTime = 0;
        const CIRCLE_DURATION = 600;   // ms per circle reveal
        const CIRCLE_OVERLAP = 300;    // overlap between reveals
        const TOTAL_CIRCLES = 7;

        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            // How many circles are fully revealed
            const activeFloat = Math.min(TOTAL_CIRCLES, 1 + elapsed / (CIRCLE_DURATION - CIRCLE_OVERLAP));
            const activeCount = Math.min(TOTAL_CIRCLES, Math.ceil(activeFloat));

            // Progress of the current circle fading in (0-1)
            const currentProgress = activeFloat - Math.floor(activeFloat - 0.001);

            const grid = buildGrid(activeCount);

            // Fade in the latest circle's contribution
            if (activeCount > 1 && activeFloat < TOTAL_CIRCLES) {
                const prevGrid = buildGrid(activeCount - 1);
                for (let row = 0; row < ROWS; row++) {
                    for (let col = 0; col < COLS; col++) {
                        const newVal = grid[row][col];
                        const oldVal = prevGrid[row][col];
                        grid[row][col] = oldVal + (newVal - oldVal) * Math.min(1, currentProgress);
                    }
                }
            }

            const globalFade = Math.min(1, elapsed / 800);
            render(grid, globalFade);

            if (activeFloat < TOTAL_CIRCLES) {
                requestAnimationFrame(animate);
            } else {
                // Final render at full, then start idle pulse
                render(grid, 1);
                if (label) label.classList.add('visible');
                idlePulse(grid);
            }
        }

        function idlePulse(baseGrid) {
            function tick(timestamp) {
                const t = timestamp * 0.001;
                const pulse = 0.85 + 0.15 * Math.sin(t * 0.8);
                render(baseGrid, pulse);
                requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        }

        // Trigger on scroll into view
        const seedObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !started) {
                    started = true;
                    requestAnimationFrame(animate);
                    seedObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        seedObserver.observe(canvas);
    })();

    // --- Navigation scroll behavior ---
    const nav = document.getElementById('nav');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });

    // --- Mobile menu ---
    const navToggle = document.getElementById('nav-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            navToggle.classList.toggle('active');
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                navToggle.classList.remove('active');
            });
        });
    }

    // --- Showcase ---
    const showcaseThumbs = document.querySelectorAll('.showcase-thumb');
    const showcaseBrowser = document.getElementById('showcase-browser');
    const showcaseProductImg = document.getElementById('showcase-product-img');
    const showcaseMain = document.getElementById('showcase-main');
    const showcaseItemLabel = document.getElementById('showcase-item-label');
    const showcaseItemName = document.getElementById('showcase-item-name');
    const showcaseItemDesc = document.getElementById('showcase-item-desc');
    const showcaseItemLink = document.getElementById('showcase-item-link');

    function clearPlaceholder() {
        const existing = showcaseMain.querySelector('.showcase-placeholder');
        if (existing) existing.remove();
    }

    showcaseThumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            showcaseThumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');

            const type = thumb.dataset.type;
            const src = thumb.dataset.src;
            const label = thumb.dataset.label;
            const name = thumb.dataset.name;
            const desc = thumb.dataset.desc;
            const link = thumb.dataset.link || '';
            const linkText = thumb.dataset.linkText || '';
            const tech = thumb.dataset.tech || '';

            showcaseItemLabel.textContent = label;
            showcaseItemName.textContent = name;
            showcaseItemDesc.textContent = desc;

            if (link) {
                showcaseItemLink.href = link;
                showcaseItemLink.textContent = linkText;
                showcaseItemLink.style.display = 'inline-block';
            } else {
                showcaseItemLink.style.display = 'none';
            }

            clearPlaceholder();

            if (type === 'browser') {
                showcaseBrowser.style.display = 'block';
                showcaseProductImg.style.display = 'none';
                showcaseBrowser.querySelector('.browser-viewport img').src = src;
                showcaseBrowser.querySelector('.browser-url').textContent = thumb.dataset.url || 'gittimes.com';
            } else if (type === 'placeholder') {
                showcaseBrowser.style.display = 'none';
                showcaseProductImg.style.display = 'none';
                const svgHTML = thumb.querySelector('svg')
                    ? thumb.querySelector('svg').outerHTML.replace(/width="20"/g, 'width="48"').replace(/height="20"/g, 'height="48"')
                    : '';
                const placeholder = document.createElement('div');
                placeholder.className = 'showcase-placeholder';
                placeholder.innerHTML = svgHTML + (tech ? '<span>' + tech + '</span>' : '<span>Coming soon</span>');
                showcaseMain.appendChild(placeholder);
            } else {
                showcaseBrowser.style.display = 'none';
                showcaseProductImg.style.display = 'block';
                showcaseProductImg.src = src;
                showcaseProductImg.alt = name;
            }
        });
    });

    // --- Splide Carousels ---
    document.querySelectorAll('.art-row-scroll.splide').forEach(el => {
        new Splide(el, {
            type: 'slide',
            perPage: 4,
            perMove: 1,
            gap: '1rem',
            padding: { left: '2.5rem', right: '2.5rem' },
            pagination: false,
            arrows: true,
            drag: 'free',
            snap: true,
            breakpoints: {
                900: {
                    perPage: 3,
                    padding: { left: '1.5rem', right: '1.5rem' },
                },
                680: {
                    perPage: 2,
                    padding: { left: '1rem', right: '1rem' },
                },
                400: {
                    perPage: 1,
                },
            },
        }).mount();
    });

    // --- PhotoSwipe Lightbox ---
    const lightbox = new PhotoSwipeLightbox({
        gallery: '#gallery',
        children: '.art-card',
        pswpModule: PhotoSwipe,
    });

    lightbox.addFilter('itemData', (itemData, index) => {
        const card = itemData.element;
        if (card) {
            itemData.src = card.dataset.fullSrc || card.querySelector('img').src;
            itemData.w = parseInt(card.dataset.pswpWidth, 10) || 1200;
            itemData.h = parseInt(card.dataset.pswpHeight, 10) || 1200;
            itemData.alt = card.dataset.name || '';
            const name = card.dataset.name || '';
            const type = card.dataset.type || '';
            itemData.caption = type ? `${name} — ${type}` : name;
        }
        return itemData;
    });

    lightbox.on('uiRegister', function () {
        lightbox.pswp.ui.registerElement({
            name: 'custom-caption',
            order: 9,
            isButton: false,
            appendTo: 'root',
            html: '',
            onInit: (el, pswp) => {
                el.className = 'pswp-caption';
                pswp.on('change', () => {
                    el.textContent = pswp.currSlide.data.caption || '';
                });
            },
        });
    });

    lightbox.init();

    // --- Smooth scroll for nav links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Scroll Animations ---
    const fadeEls = document.querySelectorAll('.fade-in');
    if (fadeEls.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        fadeEls.forEach(el => observer.observe(el));
    }

    // --- Scan Line Reveal for Art Cards ---
    const artCards = document.querySelectorAll('.art-card');
    if (artCards.length) {
        const scanObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    card.classList.add('scan-reveal');
                    scanObserver.unobserve(card);
                }
            });
        }, { threshold: 0.2 });

        // Set stagger delay per card within each row
        document.querySelectorAll('.art-row').forEach(row => {
            const cards = row.querySelectorAll('.art-card');
            cards.forEach((card, i) => {
                card.style.setProperty('--reveal-delay', (i * 0.08).toFixed(2));
                scanObserver.observe(card);
            });
        });
    }

});
