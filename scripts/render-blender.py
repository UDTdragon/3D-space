import argparse
import os
import time

import bpy


def parse_args():
    argv = []
    if "--" in __import__("sys").argv:
        argv = __import__("sys").argv[__import__("sys").argv.index("--") + 1 :]
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--size", type=int, default=2048)
    parser.add_argument("--samples", type=int, default=128)
    parser.add_argument("--engine", choices=("eevee", "cycles"), default="cycles")
    parser.add_argument("--station", action="append")
    parser.add_argument("--face", action="append")
    return parser.parse_args(argv)


args = parse_args()
scene = bpy.context.scene
scene.render.engine = "CYCLES" if args.engine == "cycles" else "BLENDER_EEVEE"
scene.render.resolution_x = args.size
scene.render.resolution_y = args.size
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.film_transparent = False
scene.render.use_file_extension = True
scene.render.image_settings.color_depth = "8"
scene.render.resolution_percentage = 100

# Cycles preserves the authored indirect illumination and glass transmission.
# Output uses the same camera coordinates as the web viewer.
if hasattr(scene, "eevee"):
    scene.eevee.taa_render_samples = args.samples
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
if args.engine == "cycles":
    preferences = bpy.context.preferences.addons["cycles"].preferences
    preferences.compute_device_type = "OPTIX"
    preferences.get_devices()
    for device in preferences.devices:
        device.use = device.type == "OPTIX"
    scene.cycles.device = "GPU"

# Eevee headless renders do not resolve the thin transmission shader reliably.
# Keep the architectural frames and hide only the panes to reveal the exterior.
for obj in bpy.data.objects if args.engine == "eevee" else []:
    if obj.type == "MESH" and any(
        slot.material and slot.material.name == "MAT_Window_Clear_Glass"
        for slot in obj.material_slots
    ):
        obj.hide_render = True

stations = args.station or ["entrance", "discovery", "connection", "horizon"]
faces = args.face or ["px", "nx", "py", "ny", "pz", "nz"]

os.makedirs(args.output, exist_ok=True)
started = time.time()

for station in stations:
    station_dir = os.path.join(args.output, station)
    os.makedirs(station_dir, exist_ok=True)
    for face in faces:
        camera_name = f"{station}_{face}"
        camera = bpy.data.objects.get(camera_name)
        if camera is None:
            raise RuntimeError(f"Missing camera: {camera_name}")
        scene.camera = camera
        scene.render.filepath = os.path.join(station_dir, f"{face}.png")
        if os.path.exists(scene.render.filepath):
            print(f"SKIPPED {camera_name}: already rendered", flush=True)
            continue
        face_started = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED {camera_name} {time.time() - face_started:.1f}s", flush=True)

print(f"COMPLETE {len(stations) * len(faces)} faces {time.time() - started:.1f}s", flush=True)




