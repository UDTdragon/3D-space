"""Add architectural window assemblies to neoize-gallery-edited.blend."""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "neoize-gallery-edited.blend"
OUTPUT = ROOT / "neoize-gallery-window-edited.blend"

if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))


def ensure_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    collection.hide_viewport = False
    collection.hide_render = False
    return collection


def move_to_collection(obj, collection):
    for source_collection in list(obj.users_collection):
        source_collection.objects.unlink(obj)
    collection.objects.link(obj)


def principled_material(name, color, metallic, roughness):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return material


def glass_material():
    material = bpy.data.materials.get("MAT_Window_Clear_Glass") or bpy.data.materials.new("MAT_Window_Clear_Glass")
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (0.82, 0.92, 0.96, 1.0)
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Roughness"].default_value = 0.075
    shader.inputs["IOR"].default_value = 1.45
    shader.inputs["Transmission Weight"].default_value = 1.0
    return material


frame_collection = ensure_collection("03_Window_Frames_and_Metal")
glass_collection = ensure_collection("08_Window_Glass")

# Remove only the generated side-window grids. Door metal and ceiling rails remain untouched.
old_grid_ranges = list(range(15, 57)) + list(range(288, 301))
for index in old_grid_ranges:
    obj = bpy.data.objects.get(f"Window_Frames_and_Metal_{index:03d}")
    if obj is not None:
        bpy.data.objects.remove(obj, do_unlink=True)

# Remove the optional prototype panes; correctly sized glass is created below.
optional_collection = bpy.data.collections.get("08_Optional_Window_Glass")
if optional_collection is not None:
    for obj in list(optional_collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(optional_collection)

frame_material = principled_material(
    "MAT_Window_Architectural_Frame",
    (0.045, 0.060, 0.055),
    metallic=0.62,
    roughness=0.27,
)
glass = glass_material()


def add_box(name, location, dimensions, material, collection, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    move_to_collection(obj, collection)
    if bevel:
        modifier = obj.modifiers.new("Soft edge highlight", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
    return obj


def add_window(name, center_y, width, height=3.55, bottom=0.635, columns=4, rows=3):
    center_z = bottom + height / 2
    frame_depth = 0.16
    outer = 0.14
    muntin = 0.060
    center_mullion = 0.095
    x = -3.965

    # A substantial perimeter frame gives the opening visible depth and catches sunlight.
    add_box(f"{name}_Frame_Left", (x, center_y + width / 2, center_z), (frame_depth, outer, height + outer), frame_material, frame_collection, 0.012)
    add_box(f"{name}_Frame_Right", (x, center_y - width / 2, center_z), (frame_depth, outer, height + outer), frame_material, frame_collection, 0.012)
    add_box(f"{name}_Frame_Top", (x, center_y, bottom + height), (frame_depth, width, outer), frame_material, frame_collection, 0.012)
    add_box(f"{name}_Frame_Bottom", (x, center_y, bottom), (frame_depth, width, outer), frame_material, frame_collection, 0.012)

    # Four broad panes across, with a stronger centre mullion.
    for divider in range(1, columns):
        y = center_y + width / 2 - width * divider / columns
        thickness = center_mullion if divider == columns / 2 else muntin
        add_box(f"{name}_Mullion_{divider}", (x - 0.012, y, center_z), (frame_depth + 0.025, thickness, height - outer), frame_material, frame_collection, 0.008)

    # Three rows keep the view open while retaining the reference's industrial character.
    for divider in range(1, rows):
        z = bottom + height * divider / rows
        add_box(f"{name}_Transom_{divider}", (x - 0.012, center_y, z), (frame_depth + 0.025, width - outer, muntin), frame_material, frame_collection, 0.008)

    # Thin real geometry makes reflections editable without blocking the exterior plate.
    add_box(f"{name}_Glass", (-4.055, center_y, center_z), (0.012, width - 0.18, height - 0.18), glass, glass_collection, 0.0)


for number, center in enumerate((6.75, 2.25, -2.25, -6.75), start=1):
    add_window(f"Gallery_Window_{number:02d}", center, 4.10)

# The vestibule uses the same frame language but keeps more vertical divisions.
add_window("Vestibule_Window", -12.50, 6.50, columns=6, rows=3)

# Make the collection names and purpose visible to the user in Blender.
frame_collection["editing_note"] = "Dark outer frames, mullions and transoms. Edit MAT_Window_Architectural_Frame."
glass_collection["editing_note"] = "Clear panes. Edit MAT_Window_Clear_Glass for reflection, roughness and transmission."
bpy.context.scene["window_revision"] = "Architectural four-column, three-row windows based on supplied reference"
bpy.context.scene["window_source_file"] = SOURCE.name

bpy.ops.object.select_all(action="DESELECT")
bpy.context.scene.camera = bpy.data.objects.get("entrance_px") or bpy.context.scene.camera
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
print(f"WINDOW_FILE_SAVED {OUTPUT}")
