import * as T from 'three';

// Walk mode draws src/room.js live. room.js predates the Blender work, so this file brings the
// live room closer to blender/neoize-gallery-reference-look.blend, the scene the panoramas are rendered from.
// room.js itself stays unchanged (npm run bake still uses it).
// Blender coordinates convert to web coordinates as (x, y, z) -> (x, z, -y).

// Values taken from the .blend (see blender/improve_reference_look.py and blender/modify_windows.py).
const LOOK = {
 exposure: 1.5,                       // renderer exposure with AgX (the .blend uses 1.0; the live room has no bounced light to make up for)
 hemisphere: 2.0, ambient: 0.3,       // room.js: 2.8 and 0.4. Slightly lower for more contrast; this also stands in for bounced light.
 sun: 4.2,                            // room.js: 2.8
 bounce: {color: '#fff6ea', intensity: 1.6},  // stands in for sunlight bouncing off the floor onto ceiling and window wall
 wallColor: '#f3f2ee',                // room.js '#e9e5db' read beige next to the rendered white plaster
 floorColor: [0.26, 0.265, 0.275],    // MAT_Floor_Tiles (linear RGB)
 floorVariation: 0.04,                // per-tile brightness difference
 floorRoughness: 0.08,                // Blender varies 0.03-0.10 across the floor
 floorReflection: 0.9,                // strength of the panorama reflected in the floor
 exteriorBrightness: 1.45,            // MAT_Exterior is brighter than the room
 spot: {color: '#ffe1ba', intensity: 26, angle: 20, penumbra: 0.3, aimAbove: 0.15},
 frame: {color: [0.045, 0.06, 0.055], metalness: 0.62, roughness: 0.27},   // MAT_Window_Architectural_Frame
};
const TRACK_X = 2.6, SPOT_Y = 4.17, BACK_WALL_Z = -7.5, BACK_WALL_SPOT_Y = 4.42;
const WINDOWS = [{z: -6.75, width: 4.1}, {z: -2.25, width: 4.1}, {z: 2.25, width: 4.1}, {z: 6.75, width: 4.1}, {z: 12.5, width: 6.5, columns: 6}];

/**
 * Restyle a freshly built room.js scene. Call before its meshes are merged.
 * targets: artwork positions ([x, y, z]) plus the introduction panel.
 * Returns setEnvironment(cubeTexture) to swap the panorama reflected by floor and glass.
 */
export function applyBlenderLook(room, targets) {
 let sun = null;
 const remove = [];
 room.traverse(o => {
  if (o.isHemisphereLight) o.intensity = LOOK.hemisphere;
  else if (o.isAmbientLight) o.intensity = LOOK.ambient;
  else if (o.isDirectionalLight) { o.intensity = LOOK.sun; sun = o; }
  else if (o.isSpotLight) remove.push(o, o.target);  // room.js spots point between the artworks
 });
 for (const o of remove) o.parent?.remove(o);
 remove.length = 0;
 // The live room has no bounced light, so a soft light from below brightens the ceiling and the window wall.
 const bounce = new T.DirectionalLight(LOOK.bounce.color, LOOK.bounce.intensity);
 bounce.position.set(4, -6, 0); bounce.target.position.set(0, 0, 0);
 room.add(bounce, bounce.target);

 // Floor: polished, darker and less blue, so the reflection shows.
 const envMaterials = [];
 let trim = null, metal = null;
 room.traverse(o => {
  if (!o.isMesh) return;
  const m = o.material, p = o.geometry.parameters || {};
  if (o.geometry.type === 'BoxGeometry' && Math.abs(p.width - 0.997) < 1e-3 && Math.abs(p.depth - 0.997) < 1e-3 && o.position.y < 0) {
   const k = 1 + (Math.random() * 2 - 1) * LOOK.floorVariation;
   m.color.setRGB(LOOK.floorColor[0] * k, LOOK.floorColor[1] * k, LOOK.floorColor[2] * k);
   m.roughness = LOOK.floorRoughness;
   m.bumpScale = 0.0015;
   m.envMapIntensity = LOOK.floorReflection;
   envMaterials.push(m);
  }
  if (m?.isMeshStandardMaterial && m.roughness === 0.91) m.color.set(LOOK.wallColor);  // plaster walls and ceiling
  if (m?.isMeshStandardMaterial && m.color.getHexString() === 'f1eee5') trim = m;
  if (m?.isMeshStandardMaterial && m.metalness === 0.35 && m.color.getHexString() === '515953') metal = m;
  if (m?.isMeshBasicMaterial && m.map && p.width === 40) m.color.setScalar(LOOK.exteriorBrightness);  // outside photo
 });

 // Windows: replace the dense mullion grid with Blender's four-by-three frames and thin glass.
 room.traverse(o => {
  if (o.isMesh && o.material === metal && Math.abs(o.position.x + 4.015) < 0.01) remove.push(o);
 });
 for (const o of remove) o.parent?.remove(o);
 const frameMat = new T.MeshStandardMaterial({color: new T.Color().setRGB(...LOOK.frame.color), metalness: LOOK.frame.metalness, roughness: LOOK.frame.roughness});
 const glassMat = new T.MeshStandardMaterial({color: '#e8f2f6', transparent: true, opacity: 0.06, roughness: 0.04, metalness: 0, depthWrite: false, envMapIntensity: 1.2});
 envMaterials.push(glassMat);
 const box = (w, h, d, x, y, z, mat) => {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z); mesh.castShadow = mat !== glassMat; mesh.receiveShadow = true; room.add(mesh); return mesh;
 };
 for (const {z, width, columns = 4, rows = 3} of WINDOWS) {
  const height = 3.55, bottom = 0.635, cy = bottom + height / 2, depth = 0.16, outer = 0.14, muntin = 0.06, centre = 0.095, x = -3.965;
  box(depth, height + outer, outer, x, cy, z - width / 2, frameMat);
  box(depth, height + outer, outer, x, cy, z + width / 2, frameMat);
  box(depth, outer, width, x, bottom + height, z, frameMat);
  box(depth, outer, width, x, bottom, z, frameMat);
  for (let i = 1; i < columns; i++) box(depth + 0.025, height - outer, i === columns / 2 ? centre : muntin, x - 0.012, cy, z - width / 2 + width * i / columns, frameMat);
  for (let i = 1; i < rows; i++) box(depth + 0.025, muntin, width - outer, x - 0.012, bottom + height * i / rows, z, frameMat);
  box(0.012, height - 0.18, width - 0.18, -4.055, cy, z, glassMat);
 }

 // Spotlights: one above every artwork, as in the .blend. The lamp housings move with them.
 const housings = [];
 room.traverse(o => {
  if (o.isMesh && o.geometry.type === 'CylinderGeometry' && Math.abs(o.position.y - 4.27) < 0.01 && o.position.x > 0) housings.push(o);
 });
 const housingGeo = housings[0]?.geometry, housingMat = housings[0]?.material || trim;
 for (const h of housings) h.parent.remove(h);
 const up = new T.Vector3(0, 1, 0);
 for (const [tx, ty, tz] of targets) {
  const target = new T.Vector3(tx, ty + LOOK.spot.aimAbove, tz);
  const mount = tx > 3 ? new T.Vector3(TRACK_X, SPOT_Y, tz) : new T.Vector3(tx, BACK_WALL_SPOT_Y, BACK_WALL_Z);
  const light = new T.SpotLight(LOOK.spot.color, LOOK.spot.intensity, 0, T.MathUtils.degToRad(LOOK.spot.angle), LOOK.spot.penumbra, 2);
  light.position.copy(mount); light.target.position.copy(target);
  room.add(light, light.target);
  if (housingGeo) {
   const lamp = new T.Mesh(housingGeo, housingMat);
   lamp.position.copy(mount).add(new T.Vector3(0, 0.1, 0));
   lamp.quaternion.setFromUnitVectors(up, target.clone().sub(mount).normalize());
   room.add(lamp);
  }
 }

 return {
  exposure: LOOK.exposure,
  sun,
  setEnvironment(texture) { for (const m of envMaterials) { m.envMap = texture; m.needsUpdate = true; } },
  // The floor materials are merged after this call; keep the merged copies in sync too.
  track(material) { if (material.envMapIntensity === LOOK.floorReflection) envMaterials.push(material); },
 };
}
