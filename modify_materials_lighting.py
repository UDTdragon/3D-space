"""Add editable plaster materials and a Cycles daylight/indirect-light setup."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "neoize-gallery-window-edited.blend"
OUTPUT = ROOT / "neoize-gallery-material-lighting-edited.blend"

if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))

scene = bpy.context.scene


def collection(name):
    value = bpy.data.collections.get(name)
    if value is None:
        value = bpy.data.collections.new(name)
        scene.collection.children.link(value)
    value.hide_viewport = False
    value.hide_render = False
    return value


def clear_nodes(material):
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    return nodes, material.node_tree.links


def plaster_material(name, dark, light, roughness, bump_strength):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    nodes, links = clear_nodes(material)
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (620, 40)
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (340, 40)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Specular IOR Level"].default_value = 0.28

    coordinates = nodes.new("ShaderNodeTexCoord")
    coordinates.location = (-900, 40)
    noise = nodes.new("ShaderNodeTexNoise")
    noise.location = (-680, 100)
    noise.inputs["Scale"].default_value = 78.0
    noise.inputs["Detail"].default_value = 3.0
    noise.inputs["Roughness"].default_value = 0.64
    noise.inputs["Lacunarity"].default_value = 2.1
    noise.inputs["Distortion"].default_value = 0.06

    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.location = (-400, 180)
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (*dark, 1.0)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (*light, 1.0)

    bump = nodes.new("ShaderNodeBump")
    bump.location = (80, -150)
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.010

    roughness_map = nodes.new("ShaderNodeMapRange")
    roughness_map.location = (60, 160)
    roughness_map.inputs["From Min"].default_value = 0.0
    roughness_map.inputs["From Max"].default_value = 1.0
    roughness_map.inputs["To Min"].default_value = max(0.0, roughness - 0.08)
    roughness_map.inputs["To Max"].default_value = min(1.0, roughness + 0.08)

    links.new(coordinates.outputs["Generated"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], shader.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    links.new(noise.outputs["Fac"], roughness_map.inputs["Value"])
    links.new(roughness_map.outputs["Result"], shader.inputs["Roughness"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    material.diffuse_color = (*light, 1.0)
    return material


wall = plaster_material(
    "MAT_Wall_Fine_Plaster",
    (0.80, 0.78, 0.73),
    (0.91, 0.89, 0.85),
    roughness=0.86,
    bump_strength=0.050,
)
ceiling = plaster_material(
    "MAT_Ceiling_Soft_Plaster",
    (0.86, 0.85, 0.81),
    (0.95, 0.94, 0.90),
    roughness=0.88,
    bump_strength=0.030,
)

# The largest high object is the ceiling slab; smaller upper elements remain wall plaster.
wall_collection = bpy.data.collections.get("01_Walls_and_Ceiling")
for obj in wall_collection.objects:
    is_ceiling = obj.dimensions.z < 0.45 and obj.location.z > 4.5
    obj.data.materials.clear()
    obj.data.materials.append(ceiling if is_ceiling else wall)

# Give the pale architectural trim a slightly smoother finish so it separates from the wall.
trim = bpy.data.materials.get("MAT_Trim_Satin") or bpy.data.materials.new("MAT_Trim_Satin")
trim.use_nodes = True
trim_shader = trim.node_tree.nodes.get("Principled BSDF")
trim_shader.inputs["Base Color"].default_value = (0.90, 0.89, 0.85, 1.0)
trim_shader.inputs["Roughness"].default_value = 0.58
trim_shader.inputs["Specular IOR Level"].default_value = 0.10
for obj in bpy.data.collections.get("05_Trim_Beams_and_Bench").objects:
    # Keep the dark bench legs on their existing material.
    if obj.name.endswith("_279") or obj.name.endswith("_280"):
        continue
    obj.data.materials.clear()
    obj.data.materials.append(trim)

# Glass stays visible but does not block the daylight rig's shadow rays.
for obj in bpy.data.collections.get("08_Window_Glass").objects:
    obj.visible_shadow = False

lighting = collection("09_Lighting")
for obj in list(lighting.objects):
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_light(name, light_type, location, color, energy, target=None, size=None):
    light_data = bpy.data.lights.new(name, light_type)
    light_data.color = color
    light_data.energy = energy
    obj = bpy.data.objects.new(name, light_data)
    lighting.objects.link(obj)
    obj.location = location
    if size is not None:
        light_data.shape = "RECTANGLE"
        light_data.size = size[0]
        light_data.size_y = size[1]
    if target is not None:
        aim(obj, target)
    return obj


sun_obj = add_light(
    "Daylight_Sun",
    "SUN",
    (-10.0, 2.0, 11.0),
    (1.0, 0.79, 0.60),
    3.4,
    target=(0.0, 0.0, 0.5),
)
sun_obj.data.angle = 0.045
sun_obj.data.use_shadow = True

# Window-sized sources mimic bright sky and create a gentle light falloff into the room.
for number, y in enumerate((6.75, 2.25, -2.25, -6.75), start=1):
    add_light(
        f"Window_Sky_Area_{number:02d}",
        "AREA",
        (-3.78, y, 2.45),
        (0.70, 0.84, 1.0),
        95.0,
        target=(1.6, y, 1.8),
        size=(3.55, 3.0),
    )

# Warm track spots retain the gallery pools of light on the artwork wall.
for number, y in enumerate((7.0, 3.5, 0.0, -3.5, -7.0), start=1):
    spot = add_light(
        f"Gallery_Track_Spot_{number:02d}",
        "SPOT",
        (2.6, -y, 4.17),
        (1.0, 0.76, 0.50),
        310.0,
        target=(3.98, -y, 2.0),
    )
    spot.data.spot_size = 1.0
    spot.data.spot_blend = 0.72
    spot.data.shadow_soft_size = 0.10

# A broad, very soft ceiling bounce prevents the far end from dropping to black.
add_light(
    "Ceiling_Indirect_Fill",
    "AREA",
    (0.0, 0.0, 4.55),
    (1.0, 0.88, 0.72),
    28.0,
    target=(0.0, 0.0, 0.0),
    size=(7.0, 14.0),
)

world = scene.world or bpy.data.worlds.new("Gallery_World")
world.use_nodes = True
scene.world = world
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.36, 0.48, 0.66, 1.0)
background.inputs["Strength"].default_value = 0.10

scene.render.engine = "CYCLES"
scene.cycles.samples = 256
scene.cycles.use_denoising = True
scene.cycles.diffuse_bounces = 6
scene.cycles.glossy_bounces = 4
scene.cycles.transmission_bounces = 6
scene.cycles.transparent_max_bounces = 8
scene.cycles.use_light_tree = True
scene.render.image_settings.file_format = "PNG"
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "AgX"
for look in ("AgX - Medium High Contrast", "AgX - Medium High Contrast Look"):
    try:
        scene.view_settings.look = look
        break
    except TypeError:
        pass
scene.view_settings.exposure = 0.0

scene["material_revision"] = "Fine warm plaster with procedural color, roughness and micro-bump"
scene["lighting_revision"] = "Cycles daylight, window sky areas, warm track spots and soft ceiling bounce"
scene["lighting_edit_note"] = "Adjust Daylight_Sun, Window_Sky_Area objects, Ceiling_Indirect_Fill and World Background strength."
bpy.ops.object.select_all(action="DESELECT")
bpy.context.scene.camera = bpy.data.objects.get("entrance_px") or bpy.context.scene.camera
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print(f"MATERIAL_LIGHTING_FILE_SAVED {OUTPUT}")
