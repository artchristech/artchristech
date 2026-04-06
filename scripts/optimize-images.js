import sharp from 'sharp';
import { readdir, stat, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ASSET_DIRS = ['assets/merch', 'assets/art'];
const OUT_BASE = path.join(ROOT, 'assets/optimized');
const SIZES = [
    { suffix: '300w', width: 300, quality: 80 },
    { suffix: '600w', width: 600, quality: 80 },
    { suffix: '1200w', width: 1200, quality: 85 },
];
const EXTENSIONS = new Set(['.jpeg', '.jpg', '.png', '.webp']);
const CONCURRENCY = 4;

async function getImages() {
    const images = [];
    for (const dir of ASSET_DIRS) {
        const absDir = path.join(ROOT, dir);
        if (!existsSync(absDir)) continue;
        const files = await readdir(absDir);
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!EXTENSIONS.has(ext)) continue;
            images.push({ dir, file, absPath: path.join(absDir, file) });
        }
    }
    return images;
}

async function processImage(img, manifest) {
    const basename = path.parse(img.file).name;
    const subdir = path.basename(img.dir); // 'merch' or 'art'
    const outDir = path.join(OUT_BASE, subdir);
    await mkdir(outDir, { recursive: true });

    for (const size of SIZES) {
        const outFile = `${basename}-${size.suffix}.webp`;
        const outPath = path.join(outDir, outFile);

        // Skip if already exists and newer than source
        if (existsSync(outPath)) {
            const srcStat = await stat(img.absPath);
            const outStat = await stat(outPath);
            if (outStat.mtimeMs > srcStat.mtimeMs) {
                // Read dimensions from existing file for manifest
                const meta = await sharp(outPath).metadata();
                if (size.suffix === '1200w') {
                    manifest[`${subdir}/${basename}`] = { w: meta.width, h: meta.height };
                }
                continue;
            }
        }

        const result = await sharp(img.absPath, { sequentialRead: true })
            .resize({ width: size.width, withoutEnlargement: true })
            .webp({ quality: size.quality })
            .toFile(outPath);

        if (size.suffix === '1200w') {
            manifest[`${subdir}/${basename}`] = { w: result.width, h: result.height };
        }
    }
}

async function run() {
    console.log('Scanning for images...');
    const images = await getImages();
    console.log(`Found ${images.length} images to process`);

    const manifest = {};
    let done = 0;

    // Process in batches for concurrency control
    for (let i = 0; i < images.length; i += CONCURRENCY) {
        const batch = images.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (img) => {
            try {
                await processImage(img, manifest);
                done++;
                if (done % 10 === 0 || done === images.length) {
                    process.stdout.write(`\r  Processed ${done}/${images.length}`);
                }
            } catch (err) {
                console.error(`\nError processing ${img.file}: ${err.message}`);
            }
        }));
    }

    console.log('\n\nWriting manifest...');
    await writeFile(
        path.join(OUT_BASE, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    // Size report
    let totalSize = 0;
    for (const subdir of ['merch', 'art']) {
        const dir = path.join(OUT_BASE, subdir);
        if (!existsSync(dir)) continue;
        const files = await readdir(dir);
        for (const f of files) {
            const s = await stat(path.join(dir, f));
            totalSize += s.size;
        }
    }
    console.log(`\nOptimized output: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`Manifest entries: ${Object.keys(manifest).length}`);
    console.log('Done!');
}

run().catch(console.error);
