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
            const { initMarbleHero } = await import('./marble.js?v=8');
            initMarbleHero(canvas, label);
        } catch (err) {
            console.warn('[hero] marble hero init failed:', err && err.message);
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
