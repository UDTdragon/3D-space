import fs from 'node:fs/promises';
import sharp from 'sharp';
if(!process.argv[2])throw new Error('Usage: node scripts/prepare-exterior.mjs <high-resolution image>');
const source=await fs.readFile(process.argv[2]);const info=await sharp(source).metadata();
await sharp(source).rotate().resize({width:8192,withoutEnlargement:true}).webp({quality:95}).toFile('public/assets/autumn.webp');
console.log(`Exterior saved from ${info.width} x ${info.height}. Run npm run bake with the dev server running, then npm run build.`);
