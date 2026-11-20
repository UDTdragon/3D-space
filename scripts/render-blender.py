"""Render the web panoramas: every station x six cube faces, as PNG files the web import script reads.

Terminal (from this blender/ folder):
    blender -b neoize-gallery-reference-look.blend --python render_panoramas.py -- --output renders-reference

The defaults are tuned for speed with no visible difference after denoising (see FAST SETTINGS).
Pass --quality full to keep the .blend file's own sampling settings (use with --samples 64 or more).
"""
import argparse
import os
import sys
import time

import bpy

# Stations shown on the website (src/data.js). 'discovery' was removed from the tour but can still be rendered
# with --station discovery.
WEB_STATIONS = ["entrance", "connection", "horizon"]
FACES = ["px", "nx", "py", "ny", "pz", "nz"]


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--size", type=int, default=2048)
    parser.add_argument("--samples", type=int, default=32)
    parser.add_argument("--quality", choices=("fast", "full"), default="fast")
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
scene.render.image_settings.color_depth = "8"
scene.render.film_transparent = False
scene.render.use_file_extension = True

# Cycles preserves the authored indirect illumination and glass transmission.
# Output uses the same camera coordinates as the web viewer.
if hasattr(scene, "eevee"):
    scene.eevee.taa_render_samples = args.samples
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True

# FAST SETTINGS: these cut render time without a visible change once the denoiser has run.
# Measured on this scene (3 faces, same camera): 32 samples + threshold 0.03 + persistent data rendered 2.3x faster
# than 64 samples + threshold 0.01, with an average pixel difference under 2/255 and no brightness shift.
# Caustics and light bounces are left as authored: turning them off darkened the walls, because sunlight
# reflected by the glossy floor is a caustic path.
if args.engine == "cycles" and args.quality == "fast":
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.03     # was 0.01: clean pixels stop early, the denoiser smooths the rest
    scene.render.use_persistent_data = True    # prepare the scene once and reuse it for every face

if args.engine == "cycles":
    try:
        preferences = bpy.context.preferences.addons["cycles"].preferences
        preferences.compute_device_type = "OPTIX"
        preferences.get_devices()
        for device in preferences.devices:
            device.use = device.type == "OPTIX"
        scene.cycles.device = "GPU" if any(d.use for d in preferences.devices) else "CPU"
    except (KeyError, TypeError, ValueError):   # no NVIDIA GPU: fall back to the CPU
        scene.cycles.device = "CPU"
    print(f"DEVICE {scene.cycles.device}", flush=True)

# Eevee headless renders do not resolve the thin transmission shader reliably.
# Keep the architectural frames and hide only the panes to reveal the exterior.
for obj in bpy.data.objects if args.engine == "eevee" else []:
    if obj.type == "MESH" and any(
        slot.material and slot.material.name == "MAT_Window_Clear_Glass"
        for slot in obj.material_slots
    ):
        obj.hide_render = True

stations = args.station or WEB_STATIONS
faces = args.face or FACES

os.makedirs(args.output, exist_ok=True)
started = time.time()
rendered = 0

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
        rendered += 1
        print(f"RENDERED {camera_name} {time.time() - face_started:.1f}s", flush=True)

scene.render.use_persistent_data = False
print(f"COMPLETE {rendered} of {len(stations) * len(faces)} faces rendered in {time.time() - started:.1f}s", flush=True)
