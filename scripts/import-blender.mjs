import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-blender.mjs <render-folder>');
// Stations the website shows (src/data.js) must all be present; 'discovery' is no longer on the tour
// and is only imported when its render folder exists.
const required = ['entrance','connection','horizon'];
const optional = ['discovery'];
const faces = ['px','nx','py','ny','pz','nz'];
const exists = p => fs.access(p).then(() => true, () => false);
const stations = [...required];
for (const station of optional) if (await exists(path.resolve(input, station))) stations.push(station);
const files = stations.flatMap(station => faces.map(face => ({station,face,source:path.resolve(input,station,`${face}.png`)})));
// Validate the complete render set before replacing any deployed assets.
for (const file of files) {
  if (!await exists(file.source)) throw new Error(`Missing render: ${file.source}`);
  const meta = await sharp(file.source).metadata();
  if (meta.width !== 2048 || meta.height !== 2048) throw new Error(`Expected 2048 square: ${file.source}`);
}
let bytes = 0;
for (const file of files) {
  const target = path.resolve('public/panoramas',file.station,`${file.face}.webp`);
  await fs.mkdir(path.dirname(target), {recursive: true});
  const buffer = await sharp(file.source).webp({quality:92,effort:6}).toBuffer();
  await fs.writeFile(target,buffer);
  bytes += buffer.length;
}
console.log(`Imported ${files.length} Blender faces (${stations.join(', ')}): ${(bytes/1024/1024).toFixed(2)} MiB`);
