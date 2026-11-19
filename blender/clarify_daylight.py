import bpy
from pathlib import Path

root = Path(__file__).resolve().parent
scene = bpy.context.scene
glass = bpy.data.materials['MAT_Window_Clear_Glass']
nodes = glass.node_tree.nodes
nodes.clear()
out = nodes.new('ShaderNodeOutputMaterial')
clear = nodes.new('ShaderNodeBsdfTransparent')
reflection = nodes.new('ShaderNodeBsdfGlass')
reflection.inputs['Roughness'].default_value = 0.0
reflection.inputs['IOR'].default_value = 1.45
mix = nodes.new('ShaderNodeMixShader')
mix.inputs[0].default_value = 0.025
glass.node_tree.links.new(clear.outputs[0], mix.inputs[1])
glass.node_tree.links.new(reflection.outputs[0], mix.inputs[2])
glass.node_tree.links.new(mix.outputs[0], out.inputs['Surface'])
glass['note'] = '97.5% clear transmission with 2.5% polished glass; no frosted roughness.'
for obj in bpy.data.objects:
    if obj.type == 'MESH' and any(s.material == glass for s in obj.material_slots):
        obj.visible_shadow = False
sun = bpy.data.objects['Daylight_Sun'].data
sun.energy = 5.0
sun.color = (1.0, 0.92, 0.80)
sun.angle = 0.009
for obj in bpy.data.objects:
    if obj.type != 'LIGHT':
        continue
    if obj.name.startswith('Window_Sky_Area'):
        obj.data.energy = 110
        obj.data.color = (0.75, 0.86, 1.0)
    elif obj.name.startswith('Gallery_Track_Spot'):
        obj.data.energy = 460
        obj.data.color = (1.0, 0.88, 0.73)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.14
for node in bpy.data.materials['MAT_Exterior'].node_tree.nodes:
    if node.type == 'EMISSION':
        node.inputs['Strength'].default_value = 1.65
floor = bpy.data.materials['MAT_Floor_Tiles'].node_tree.nodes.get('Principled BSDF')
floor.inputs['Base Color'].default_value = (0.40, 0.43, 0.48, 1.0)
floor.inputs['Roughness'].default_value = 0.32
floor.inputs['Specular IOR Level'].default_value = 0.35
wall = bpy.data.materials['MAT_Wall_Fine_Plaster']
for node in wall.node_tree.nodes:
    if node.type == 'TEX_NOISE':
        node.inputs['Scale'].default_value = 220
    elif node.type == 'VALTORGB':
        node.color_ramp.elements[0].color = (0.84, 0.83, 0.80, 1)
        node.color_ramp.elements[1].color = (0.89, 0.88, 0.85, 1)
    elif node.type == 'BUMP':
        node.inputs['Distance'].default_value = 0.003
scene.view_settings.exposure = 0.35
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene['daylight_revision'] = '2026-09-09 clear windows and stronger directional daylight'
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'neoize-gallery-clear-daylight.blend'))
