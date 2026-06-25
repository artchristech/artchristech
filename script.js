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
            const { initMarbleHero } = await import('./marble.js?v=14');
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
