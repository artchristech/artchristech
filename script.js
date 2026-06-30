/* ============================================
   artchristech — script.js (ESM)
   Showcase, Splide carousels, PhotoSwipe lightbox
   ============================================ */

import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.min.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Marble hero (domain-warped FBM, scroll-revealed) ---
    // Wrapped so it can never halt the rest of the page (nav/Splide/PhotoSwipe).
    (async () => {
        try {
            const canvas = document.getElementById('seed-canvas');
            if (!canvas) return;
            const label = document.querySelector('.seed-label');
            const { initMarbleHero } = await import('./marble.js?v=23');
            initMarbleHero(canvas, label);
        } catch (err) {
            console.warn('[hero] marble hero init failed:', err && err.message);
        }
    })();

    // --- DK SKI arcade (sandboxed iframe, loaded on demand) ---
    // The game is a self-contained Three.js page (dkski.html). We don't load its
    // heavy WebGL/CDN payload until the visitor clicks "Press to play". Playing
    // enters "theater" mode: the page scroll is locked (so arrow keys can't move
    // it) and the stage floats over a dimmed page, with an option for fullscreen.
    (() => {
        try {
            const frame = document.getElementById('dkski-frame');
            const stage = document.getElementById('arcade-stage');
            const overlay = document.getElementById('arcade-overlay');
            const playBtn = document.getElementById('arcade-play');
            const backdrop = document.getElementById('arcade-backdrop');
            const fsBtn = document.getElementById('arcade-fs');
            const exitBtn = document.getElementById('arcade-exit');
            if (!frame || !stage) return;

            let loaded = false;

            const enterTheater = () => {
                document.body.classList.add('arcade-theater');
                if (backdrop) backdrop.classList.add('is-open');
                stage.classList.add('is-theater');
                frame.focus(); // arrows drive the game, not the page
            };

            const exitTheater = () => {
                if (document.fullscreenElement) {
                    (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
                }
                document.body.classList.remove('arcade-theater');
                if (backdrop) backdrop.classList.remove('is-open');
                stage.classList.remove('is-theater');
                if (overlay) overlay.classList.remove('is-hidden'); // offer "Press to play" again
            };

            const launch = () => {
                if (!loaded) {
                    frame.src = frame.dataset.src;
                    loaded = true;
                }
                if (overlay) overlay.classList.add('is-hidden');
                enterTheater();
            };

            const toggleFullscreen = () => {
                if (document.fullscreenElement) {
                    (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
                } else {
                    const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
                    if (req) req.call(stage);
                }
                frame.focus();
            };

            if (playBtn) playBtn.addEventListener('click', launch);
            if (exitBtn) exitBtn.addEventListener('click', exitTheater);
            if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
            if (backdrop) backdrop.addEventListener('click', exitTheater);

            // Esc leaves theater (only when not in native fullscreen — the browser
            // consumes Esc itself to exit fullscreen first).
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && stage.classList.contains('is-theater') && !document.fullscreenElement) {
                    exitTheater();
                }
            });
        } catch (err) {
            console.warn('[arcade] dkski setup failed:', err && err.message);
        }
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
    const showcaseLive = document.getElementById('showcase-live');

    function clearPlaceholder() {
        const existing = showcaseMain.querySelector('.showcase-placeholder');
        if (existing) existing.remove();
    }

    // --- Curdle live flow field ---------------------------------------------
    // A divergence-free (incompressible) velocity field advects particles that
    // warm from blue to gold as they cross the frame — "video in, fluid out".
    // The field is the curl of a scalar potential, so the flow never sources or
    // sinks: physically-plausible, exactly what Curdle returns.
    const curdleFlow = (() => {
        const canvas = document.getElementById('curdle-canvas');
        if (!canvas) return { start() {}, stop() {} };
        const ctx = canvas.getContext('2d');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let W = 0, H = 0, dpr = 1, particles = [], raf = 0, t = 0, running = false;

        // Scalar potential P(x,y,t); velocity = (∂P/∂y, -∂P/∂x) via finite diff.
        const baseFlow = 0.95; // net rightward drift
        const waves = [
            { amp: 26, kx: 0.0050, ky: 0.0092, sp: 0.20, ph: 0.0 },
            { amp: 18, kx: 0.0082, ky: 0.0044, sp: -0.16, ph: 2.1 },
            { amp: 12, kx: 0.0131, ky: 0.0152, sp: 0.30, ph: 4.0 },
        ];
        const P = (x, y) => {
            let p = baseFlow * y;
            for (const w of waves) p += w.amp * Math.sin(w.kx * x + w.ky * y + w.sp * t + w.ph);
            return p;
        };
        const E = 1.0; // finite-difference step
        const vel = (x, y) => ({
            x: (P(x, y + E) - P(x, y - E)) / (2 * E),
            y: -(P(x + E, y) - P(x - E, y)) / (2 * E),
        });

        const lerp = (a, b, t) => a + (b - a) * t;
        // blue #78c8ff → gold #c4a265, keyed to horizontal progress
        const colorAt = (nx) => {
            const k = Math.min(1, Math.max(0, nx));
            return `rgb(${Math.round(lerp(0x78, 0xc4, k))},${Math.round(lerp(0xc8, 0xa2, k))},${Math.round(lerp(0xff, 0x65, k))})`;
        };

        const seed = (p, atLeft) => {
            p.x = atLeft ? -20 - Math.random() * 60 : Math.random() * W;
            p.y = Math.random() * H;
            p.life = 0;
            p.max = 220 + Math.random() * 260;
            p.trail.length = 0;
        };

        function resize() {
            const r = canvas.getBoundingClientRect();
            if (!r.width) return;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = r.width; H = r.height;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const target = Math.round((W * H) / 1500);
            particles = [];
            for (let i = 0; i < target; i++) {
                const p = { trail: [] };
                seed(p, false);
                particles.push(p);
            }
            drawBackground();
        }

        function drawBackground() {
            const g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, '#0a0f14');
            g.addColorStop(1, '#05080b');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            const glows = [
                [W * 0.37, H * 0.40, Math.max(W, H) * 0.55, 'rgba(120,200,255,0.20)'],
                [W * 0.66, H * 0.63, Math.max(W, H) * 0.60, 'rgba(196,162,101,0.26)'],
                [W * 0.88, H * 0.33, Math.max(W, H) * 0.45, 'rgba(196,162,101,0.22)'],
            ];
            for (const [cx, cy, rr, col] of glows) {
                const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
                rg.addColorStop(0, col);
                rg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
            }
        }

        function frame() {
            if (!running) return;
            t += 1;
            drawBackground();
            ctx.lineCap = 'round';
            for (const p of particles) {
                const v = vel(p.x, p.y);
                p.x += v.x * 1.7;
                p.y += v.y * 1.7;
                p.life++;
                p.trail.push(p.x, p.y);
                if (p.trail.length > 80) p.trail.splice(0, 2);
                if (p.x > W + 30 || p.life > p.max || p.y < -40 || p.y > H + 40) {
                    seed(p, true);
                    continue;
                }
                const col = colorAt(p.x / W);
                const tr = p.trail;
                if (tr.length >= 6) {
                    // faint full-length filament
                    ctx.beginPath();
                    ctx.moveTo(tr[0], tr[1]);
                    for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]);
                    ctx.strokeStyle = col;
                    ctx.globalAlpha = 0.20;
                    ctx.lineWidth = 0.9;
                    ctx.stroke();
                    // bright leading head segment
                    const h = Math.max(0, tr.length - 14);
                    ctx.beginPath();
                    ctx.moveTo(tr[h], tr[h + 1]);
                    for (let i = h + 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]);
                    ctx.globalAlpha = 0.6;
                    ctx.lineWidth = 1.3;
                    ctx.stroke();
                }
                // bright head dot
                ctx.globalAlpha = 0.95;
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(frame);
        }

        function start() {
            if (running) return;
            running = true;
            if (!W) resize();
            if (reduced) {
                // Lay down a static streamline frame, no animation.
                for (let s = 0; s < 200; s++) {
                    for (const p of particles) {
                        const v = vel(p.x, p.y);
                        p.x += v.x * 1.7; p.y += v.y * 1.7;
                        p.trail.push(p.x, p.y);
                        if (p.trail.length > 120) p.trail.splice(0, 2);
                    }
                }
                drawBackground();
                ctx.lineCap = 'round';
                for (const p of particles) {
                    const tr = p.trail;
                    if (tr.length < 4) continue;
                    ctx.beginPath();
                    ctx.moveTo(tr[0], tr[1]);
                    for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]);
                    ctx.strokeStyle = colorAt(p.x / W);
                    ctx.globalAlpha = 0.5; ctx.lineWidth = 1.1; ctx.stroke();
                }
                ctx.globalAlpha = 1;
                running = false;
                return;
            }
            raf = requestAnimationFrame(frame);
        }

        function stop() {
            running = false;
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
        }

        window.addEventListener('resize', () => { if (running || reduced) resize(); });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
            else if (showcaseLive.style.display !== 'none' && !reduced) start();
        });

        return { start, stop };
    })();

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
            curdleFlow.stop();
            showcaseLive.style.display = 'none';

            if (type === 'live') {
                showcaseBrowser.style.display = 'none';
                showcaseProductImg.style.display = 'none';
                showcaseLive.style.display = 'block';
                curdleFlow.start();
            } else if (type === 'browser') {
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

    // --- Runway lookbook (was Splide carousels) ---
    // Each category becomes an auto-scrolling editorial band. We curate each
    // band to a strong subset, number the cards, then duplicate the track so
    // the CSS marquee loops seamlessly. Splide is NOT mounted — pure CSS.
    const RUNWAY_CAP = 26;
    const HERO_ROWS = ['Patterns'];

    document.querySelectorAll('.art-row-scroll').forEach((scroll, rowIdx) => {
        // curate: keep the first N of each band
        [...scroll.querySelectorAll('.splide__slide')]
            .slice(RUNWAY_CAP)
            .forEach(s => s.remove());
        const label = scroll.getAttribute('aria-label') || '';
        if (HERO_ROWS.includes(label)) scroll.setAttribute('data-hero', '');
        scroll.dataset.dir = rowIdx % 2 ? 'rtl' : 'ltr';  // alternate flow
    });

    // Number every (original) card — editorial index + a stable PhotoSwipe ref
    [...document.querySelectorAll('#gallery .art-card')].forEach((card, i) => {
        card.dataset.pswpIndex = i;
        const num = document.createElement('span');
        num.className = 'art-card-num';
        num.textContent = String(i + 1).padStart(3, '0');
        card.appendChild(num);
    });

    // Duplicate each band for a seamless loop; pace the scroll by item count
    document.querySelectorAll('.art-row-scroll .splide__list').forEach(list => {
        const slides = [...list.querySelectorAll('.splide__slide')];
        const isHero = list.closest('.art-row-scroll').hasAttribute('data-hero');
        list.style.setProperty('--runway-dur', (slides.length * (isHero ? 6 : 4.2)) + 's');
        slides.forEach(s => {
            const clone = s.cloneNode(true);
            clone.classList.add('is-clone');
            clone.setAttribute('aria-hidden', 'true');
            // mark the inner card too, so PhotoSwipe's :not(.is-clone) excludes it
            const card = clone.querySelector('.art-card');
            if (card) card.classList.add('is-clone');
            list.appendChild(clone);
        });
    });

    // --- PhotoSwipe Lightbox ---
    const lightbox = new PhotoSwipeLightbox({
        gallery: '#gallery',
        children: '.art-card:not(.is-clone)',
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

    // Cloned runway cards aren't in PhotoSwipe's set — forward their clicks
    // to the matching original via the index copied by cloneNode.
    document.querySelectorAll('#gallery .art-card.is-clone').forEach(clone => {
        clone.addEventListener('click', () => {
            const i = parseInt(clone.dataset.pswpIndex, 10);
            if (!Number.isNaN(i)) lightbox.loadAndOpen(i);
        });
    });

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

});
