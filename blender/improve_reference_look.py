"""Move the gallery look closer to the reference: glossy floor, stronger light contrast, a spotlight per artwork.

Opens neoize-gallery-clear-daylight.blend and saves the result as neoize-gallery-reference-look.blend.
The original file is never overwritten.

Run in a terminal (from this blender/ folder):
    blender -b neoize-gallery-clear-daylight.blend --python improve_reference_look.py
or open the .blend in Blender, load this file in the Scripting tab and press Run Script.

Every value below can be changed and the script run again; it always starts from the original file.
"""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
if not (ROOT / "neoize-gallery-clear-daylight.blend").exists():  # running from Blender's text editor
    ROOT = Path(bpy.data.filepath).resolve().parent
SOURCE = ROOT / "neoize-gallery-clear-daylight.blend"
OUTPUT = ROOT / "neoize-gallery-reference-look.blend"

# 1. Floor: polished tile that reflects artworks and window light.
FLOOR_COLOR = (0.26, 0.265, 0.275)   # was (0.40, 0.43, 0.48): darker and less blue, so reflections show
FLOOR_COLOR_VARIATION = 0.04          # small brightness difference from tile to tile
FLOOR_ROUGHNESS = (0.03, 0.10)        # was 0.32; lower = sharper reflections. Varies across the floor.
FLOOR_SPECULAR = 0.5                  # was 0.35

# 2. Light contrast: less even fill light, brighter sun and outside view.
SUN_STRENGTH = 7.0                    # was 5.0
WINDOW_SKY_POWER = 70.0               # was 110 (each of 4)
WINDOW_SKY_COLOR = (0.82, 0.9, 1.0)   # was (0.75, 0.86, 1.0): slightly less blue
CEILING_FILL_POWER = 10.0             # was 28: the main reason the room looked flat
WORLD_STRENGTH = 0.10                 # was 0.14
EXTERIOR_BRIGHTNESS = 2.4             # was 1.65: outside should read brighter than inside
EXPOSURE = 1.0                        # was 0.35; raised to bring back bright white walls with less fill light

# 3. Spotlights: one per artwork, with a visible edge on the wall.
SPOT_POWER = 1100.0                   # was 460 (the beam is narrower now, so it needs more power)
SPOT_SIZE_DEG = 40.0                  # was 57
SPOT_BLEND = 0.3                      # was 0.72; lower = sharper edge of the light pool
SPOT_RADIUS = 0.04                    # was 0.10; smaller = crisper edge
SPOT_HEIGHT = 4.17                    # just below the track rail
TRACK_X = 2.6                         # the two ceiling rails run along x = +2.6 and x = -2.6
AIM_ABOVE_CENTER = 0.15               # aim slightly above the artwork centre, like the reference
BACK_WALL_MOUNT_Y = 7.5               # back-wall spots hang straight in front of each artwork, under the last ceiling beam
BACK_WALL_SPOT_HEIGHT = 4.42          # the beam's underside is at about 4.52 m

if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene


def principled(material):
    return next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


# ---------- 1. floor ----------
floor = bpy.data.materials["MAT_Floor_Tiles"]
nodes, links = floor.node_tree.nodes, floor.node_tree.links
bsdf = principled(floor)
for name in ("REF_TileRandom", "REF_TileColor", "REF_RoughNoise", "REF_RoughRange", "REF_Coord"):
    if name in nodes:
        nodes.remove(nodes[name])
info = nodes.new("ShaderNodeObjectInfo"); info.name = "REF_TileRandom"; info.location = (-700, 200)
tint = nodes.new("ShaderNodeMapRange"); tint.name = "REF_TileColor"; tint.location = (-450, 200)
tint.data_type = "FLOAT_VECTOR"
tint.inputs[9].default_value = [c * (1 - FLOOR_COLOR_VARIATION) for c in FLOOR_COLOR]   # To Min (vector)
tint.inputs[10].default_value = [c * (1 + FLOOR_COLOR_VARIATION) for c in FLOOR_COLOR]  # To Max (vector)
links.new(info.outputs["Random"], tint.inputs[6])                                       # Vector input
links.new(tint.outputs[1], bsdf.inputs["Base Color"])
coord = nodes.new("ShaderNodeTexCoord"); coord.name = "REF_Coord"; coord.location = (-950, -150)
noise = nodes.new("ShaderNodeTexNoise"); noise.name = "REF_RoughNoise"; noise.location = (-700, -150)
noise.inputs["Scale"].default_value = 1.6
noise.inputs["Detail"].default_value = 4.0
links.new(coord.outputs["Object"], noise.inputs["Vector"])
rough = nodes.new("ShaderNodeMapRange"); rough.name = "REF_RoughRange"; rough.location = (-450, -150)
rough.inputs["From Min"].default_value = 0.3
rough.inputs["From Max"].default_value = 0.7
rough.inputs["To Min"].default_value, rough.inputs["To Max"].default_value = FLOOR_ROUGHNESS
links.new(noise.outputs["Fac"], rough.inputs["Value"])
links.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
bsdf.inputs["Specular IOR Level"].default_value = FLOOR_SPECULAR
floor["note"] = "Polished tile: per-tile colour variation and roughness varying across the floor."

# ---------- 2. light contrast ----------
bpy.data.objects["Daylight_Sun"].data.energy = SUN_STRENGTH
for obj in bpy.data.objects:
    if obj.name.startswith("Window_Sky_Area"):
        obj.data.energy = WINDOW_SKY_POWER
        obj.data.color = WINDOW_SKY_COLOR
bpy.data.objects["Ceiling_Indirect_Fill"].data.energy = CEILING_FILL_POWER
background = next(n for n in scene.world.node_tree.nodes if n.type == "BACKGROUND")
background.inputs["Strength"].default_value = WORLD_STRENGTH
emission = next(n for n in bpy.data.materials["MAT_Exterior"].node_tree.nodes if n.type == "EMISSION")
emission.inputs["Strength"].default_value = EXTERIOR_BRIGHTNESS
scene.view_settings.exposure = EXPOSURE

# ---------- 3. a spotlight above every artwork ----------
lighting = bpy.data.collections["09_Lighting"]
fixtures = bpy.data.collections["05_Trim_Beams_and_Bench"]
old_spots = [o for o in bpy.data.objects if o.type == "LIGHT" and o.name.startswith(("Gallery_Track_Spot", "Gallery_Art_Spot"))]
template_light = next((o.data for o in old_spots if o.name.startswith("Gallery_Track_Spot")), None)
light_color = tuple(template_light.color) if template_light else (1.0, 0.88, 0.73)
for obj in old_spots:
    bpy.data.objects.remove(obj, do_unlink=True)
for obj in [o for o in bpy.data.objects if o.name.startswith("REF_Fixture_")]:
    bpy.data.objects.remove(obj, do_unlink=True)

# The lamp housings on the artwork-side rail sat between the artworks; hide them and hang one per artwork instead.
lamp_housings = [o for o in fixtures.objects
                 if o.type == "MESH" and abs(o.location.z - 4.27) < 0.05 and abs(abs(o.location.x) - TRACK_X) < 0.05]
template_housing = next(o for o in lamp_housings if o.location.x > 0)
for obj in lamp_housings:
    if obj.location.x > 0:
        obj.hide_render = obj.hide_viewport = True

guides = sorted((o for o in bpy.data.objects if o.name.startswith("GUIDE_")), key=lambda o: o.name)
for guide in guides:
    target = guide.location + Vector((0, 0, AIM_ABOVE_CENTER))
    on_side_wall = abs(target.x) > 3.0           # artwork wall; otherwise the back wall
    if on_side_wall:
        mount = Vector((TRACK_X, target.y, SPOT_HEIGHT))
    else:
        mount = Vector((target.x, BACK_WALL_MOUNT_Y, BACK_WALL_SPOT_HEIGHT))
    name = guide.name.replace("GUIDE_", "")
    data = bpy.data.lights.new(f"Gallery_Art_Spot_{name}", "SPOT")
    data.energy, data.color = SPOT_POWER, light_color
    data.spot_size = SPOT_SIZE_DEG * 3.14159265 / 180
    data.spot_blend, data.shadow_soft_size = SPOT_BLEND, SPOT_RADIUS
    light = bpy.data.objects.new(f"Gallery_Art_Spot_{name}", data)
    light.location = mount
    light.rotation_mode = "QUATERNION"
    light.rotation_quaternion = (target - mount).to_track_quat("-Z", "Y")
    lighting.objects.link(light)
    housing = template_housing.copy()
    housing.name = f"REF_Fixture_{name}"
    housing.hide_render = housing.hide_viewport = False
    housing.location = mount + Vector((0, 0, 0.1))
    housing.rotation_mode = "QUATERNION"
    housing.rotation_quaternion = (target - mount).to_track_quat("Y", "Z")
    fixtures.objects.link(housing)

scene["reference_look"] = "improve_reference_look.py: glossy floor, stronger contrast, one spotlight per artwork"
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print(f"Saved {OUTPUT.name}: {len(guides)} artwork spotlights", flush=True)
