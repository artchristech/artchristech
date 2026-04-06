import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const ROOT = path.resolve(import.meta.dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const MANIFEST_PATH = path.join(ROOT, 'assets/optimized/manifest.json');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
const html = readFileSync(HTML_PATH, 'utf-8');
const $ = cheerio.load(html, { decodeEntities: false });

let updated = 0;

// --- 1. Update image paths with srcset and PhotoSwipe data attributes ---
$('.art-card img').each((i, el) => {
    const $img = $(el);
    const src = $img.attr('src');
    if (!src) return;

    // Parse original path: assets/merch/foo.jpeg or assets/art/bar.jpg
    const match = src.match(/^assets\/(merch|art)\/(.+)\.\w+$/);
    if (!match) return;

    const [, subdir, basename] = match;
    const key = `${subdir}/${basename}`;
    const dims = manifest[key];

    const base = `assets/optimized/${subdir}/${basename}`;

    // Update src to 600w
    $img.attr('src', `${base}-600w.webp`);

    // Add srcset
    $img.attr('srcset', [
        `${base}-300w.webp 300w`,
        `${base}-600w.webp 600w`,
        `${base}-1200w.webp 1200w`,
    ].join(', '));

    // Add sizes
    $img.attr('sizes', '(max-width: 680px) 220px, 280px');

    // Add PhotoSwipe data attributes to parent .art-card
    const $card = $img.closest('.art-card');
    $card.attr('data-full-src', `${base}-1200w.webp`);
    if (dims) {
        $card.attr('data-pswp-width', String(dims.w));
        $card.attr('data-pswp-height', String(dims.h));
    }

    updated++;
});

// --- 2. Wrap art-cards in Splide structure ---
$('.art-row-scroll').each((i, el) => {
    const $scroll = $(el);
    const ariaLabel = $scroll.closest('.art-row').find('h3').first().text() || 'Gallery';

    // Add Splide classes
    $scroll.addClass('splide');
    $scroll.attr('role', 'group');
    $scroll.attr('aria-label', ariaLabel);

    // Get all children (art-cards)
    const children = $scroll.children();

    // Clear and rebuild with Splide structure
    $scroll.empty();
    const $track = $('<div class="splide__track"></div>');
    const $list = $('<div class="splide__list"></div>');

    children.each((j, child) => {
        const $slide = $('<div class="splide__slide"></div>');
        $slide.append($(child));
        $list.append($slide);
    });

    $track.append($list);
    $scroll.append($track);
});

// --- 3. Remove old lightbox HTML ---
$('#lightbox').remove();

// --- 3b. Add scroll animation classes ---
$('.section-header').addClass('fade-in');
$('.art-row-header').addClass('fade-in');
$('.about-content').addClass('fade-in');

// --- 4. Add CDN links (idempotent — safe to run multiple times) ---
// Splide CSS (splide.min.css) is already in the source HTML template.
// Only inject PhotoSwipe CSS here.
if (!$('link[href*="photoswipe.css"]').length) {
    const photoswipeCSS = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.css">';
    $('link[rel="stylesheet"][href="styles.css"]').after('\n    ' + photoswipeCSS);
}

// Splide JS before script.js
if (!$('script[src*="splide.min.js"]').length) {
    const splideJS = '<script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js"></script>';
    $('script[src="script.js"]').before(splideJS + '\n    ');
}

// Convert script.js to module
$('script[src="script.js"]').attr('type', 'module');

// --- 5. Add Open Graph and Twitter meta tags ---
if (!$('meta[property="og:title"]').length) {
    const ogTags = [
        '<meta property="og:title" content="artchristech — Art. Code. Design.">',
        '<meta property="og:description" content="Christopher Harris — Artist, engineer, designer. Original pattern designs, autonomous systems, and editorial AI.">',
        '<meta property="og:image" content="https://artchristech.com/assets/gittimes-screenshot.png">',
        '<meta property="og:url" content="https://artchristech.com/">',
        '<meta property="og:type" content="website">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="artchristech — Art. Code. Design.">',
        '<meta name="twitter:description" content="Christopher Harris — Artist, engineer, designer. Original pattern designs, autonomous systems, and editorial AI.">',
        '<meta name="twitter:image" content="https://artchristech.com/assets/gittimes-screenshot.png">',
    ];
    $('meta[name="description"]').after('\n    ' + ogTags.join('\n    '));
}

// Write output
writeFileSync(HTML_PATH, $.html());
console.log(`Updated ${updated} image tags`);
console.log(`Wrapped ${$('.art-row-scroll').length} scroll rows in Splide structure`);
console.log('Removed old lightbox HTML');
console.log('Added CDN links');
console.log('Done!');
