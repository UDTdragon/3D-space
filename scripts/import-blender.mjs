import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-blender.mjs <render-folder>');
const stations = ['entrance','discovery','connection','horizon'];
const faces = ['px','nx','py','ny','pz','nz'];
const files = stations.flatMap(station => faces.map(face => ({station,face,source:path.resolve(input,station,`${face}.png`)})));
// Validate the complete render set before replacing any deployed assets.
for (const file of files) {
  const meta = await sharp(file.source).metadata();
  if (meta.width !== 2048 || meta.height !== 2048) throw new Error(`Expected 2048 square: ${file.source}`);
}
let bytes = 0;
for (const file of files) {
  const target = path.resolve('public/panoramas',file.station,`${file.face}.webp`);
  const buffer = await sharp(file.source).webp({quality:92,effort:6}).toBuffer();
  await fs.writeFile(target,buffer);
  bytes += buffer.length;
}
console.log(`Imported ${files.length} Blender faces: ${(bytes/1024/1024).toFixed(2)} MiB`);