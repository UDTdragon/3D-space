"""Run using Blender --background --python build_gallery.py. Creates a new scene."""
import bpy, json, math
from pathlib import Path
from mathutils import Matrix, Vector

ROOT=Path(__file__).resolve().parent
data=json.loads((ROOT/'scene.json').read_text(encoding='utf-8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def point(p):return C.to_3x3()@Vector(p)
collections={}
def collection(name):
    if name not in collections:
        c=bpy.data.collections.new(name);scene.collection.children.link(c);collections[name]=c
    return collections[name]
def move(obj,name):
    for c in list(obj.users_collection):c.objects.unlink(obj)
    collection(name).objects.link(obj)
def material(name,color,rough=.6,metal=0):
    if name in bpy.data.materials:return bpy.data.materials[name]
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m
for i,item in enumerate(data['meshes']):
    p=item['params'];kind=item['type'];tex=item.get('texture')
    if kind=='BoxGeometry':
        bpy.ops.mesh.primitive_cube_add(size=1)
        obj=bpy.context.object
        obj.data.transform(Matrix.Diagonal((p['width'],p['height'],p['depth'],1)))
    elif kind=='CylinderGeometry':
        bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=p['radiusTop'],depth=p['height'])
        obj=bpy.context.object;obj.data.transform(Matrix.Rotation(math.pi/2,4,'X'))
    elif kind=='PlaneGeometry':
        bpy.ops.mesh.primitive_plane_add(size=1)
        obj=bpy.context.object;obj.data.transform(Matrix.Diagonal((p['width'],p['height'],1,1)))
    else:raise ValueError(kind)
    raw=item['matrix'];M=Matrix([[raw[c*4+r] for c in range(4)] for r in range(4)])
    obj.matrix_world=C@M
    if tex:group='06_Exterior' if 'autumn' in tex else '07_Signage'
    elif item['opacity']<1:group='04_Door_Glass'
    elif item['metalness']>.1:group='03_Window_Frames_and_Metal'
    elif kind=='BoxGeometry' and p['height']==.1:group='02_Floor_Tiles'
    elif item['roughness']>.8:group='01_Walls_and_Ceiling'
    else:group='05_Trim_Beams_and_Bench'
    obj.name=f'{group[3:]}_{i:03d}';move(obj,group)
    m=material('MAT_'+group[3:],item['color'],item['roughness'],item['metalness'])
    obj.data.materials.append(m)
    bs=m.node_tree.nodes.get('Principled BSDF')
    if group=='04_Door_Glass':
        bs.inputs['Transmission Weight'].default_value=.95;bs.inputs['IOR'].default_value=1.45
    if tex and not m.node_tree.nodes.get('Source_Image'):
        nodes=m.node_tree.nodes;links=m.node_tree.links
        img=nodes.new('ShaderNodeTexImage');img.name='Source_Image';img.image=bpy.data.images.load(str(ROOT/'textures'/Path(tex).name));img.image.pack()
        if 'autumn' in tex:
            emission=nodes.new('ShaderNodeEmission');links.new(img.outputs['Color'],emission.inputs['Color'])
            links.new(emission.outputs[0],nodes.get('Material Output').inputs['Surface'])
            obj.visible_shadow=False;obj.visible_diffuse=False;obj.visible_glossy=True
        else:
            links.new(img.outputs['Color'],bs.inputs['Base Color']);links.new(img.outputs['Alpha'],bs.inputs['Alpha'])
    if kind=='BoxGeometry' and not tex:
        bevel=obj.modifiers.new('Optional edge softness','BEVEL');bevel.width=.004;bevel.segments=2

# Optional window panes: absent from source geometry, disabled until user enables them.
glass=material('MAT_Optional_Window_Glass',(.93,.97,1),.08)
glass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=1
for z,width in [(-6.75,4),(-2.25,4),(2.25,4),(6.75,4),(12.5,6.4)]:
    bpy.ops.mesh.primitive_plane_add(size=1,location=point((-4.025,2.41,z)))
    obj=bpy.context.object;obj.name=f'Optional_Glass_{z}';obj.rotation_euler=(math.pi/2,0,math.pi/2);obj.scale=(width,3.55,1)
    obj.data.materials.append(glass);move(obj,'08_Optional_Window_Glass')
collection('08_Optional_Window_Glass').hide_render=True
collection('08_Optional_Window_Glass').hide_viewport=True

def camera(name,pos,direction,up=(0,1,0),fov=90):
    cam=bpy.data.cameras.new(name);obj=bpy.data.objects.new(name,cam);collection('10_Cameras').objects.link(obj)
    obj.location=point(pos);forward=point(direction).normalized();u=point(up).normalized();right=forward.cross(u).normalized();u=right.cross(forward)
    obj.rotation_euler=Matrix((right,u,-forward)).transposed().to_euler()
    cam.type='PERSP';cam.lens_unit='FOV';cam.angle=math.radians(fov);cam.clip_start=.05;cam.clip_end=150
    return obj
faces=[('px',(-1,0,0),(0,1,0)),('nx',(1,0,0),(0,1,0)),('py',(0,1,0),(0,0,-1)),('ny',(0,-1,0),(0,0,1)),('pz',(0,0,1),(0,1,0)),('nz',(0,0,-1),(0,1,0))]
for st in data['stations']:
    for name,d,u in faces:camera(st['id']+'_'+name,st['position'],d,u)
    camera(st['id']+'_Preview',st['position'],(1,.025,0),fov=72)
scene.camera=bpy.data.objects['entrance_Preview']

# Guides are editable but never included in final background renders.
for art in data['artworks']+[{'id':'Introduction','position':data['intro']}]:
    obj=bpy.data.objects.new('GUIDE_'+art['id'],None);obj.empty_display_type='CUBE';obj.empty_display_size=.5;obj.location=point(art['position']);collection('11_Web_Content_Guides').objects.link(obj)

for light in data['lights']:
    if light['type'] not in ('DirectionalLight','SpotLight'):continue
    sun=light['type']=='DirectionalLight'
    l=bpy.data.lights.new('Sun' if sun else 'Track_Spot','SUN' if sun else 'SPOT');l.energy=2 if sun else 90;l.color=(1,.94,.83)
    if sun:l.angle=math.radians(1)
    else:l.spot_size=1.12;l.spot_blend=.85;l.shadow_soft_size=.08
    obj=bpy.data.objects.new(l.name,l);collection('09_Lighting').objects.link(obj);obj.location=point(light['position'])
    direction=point(light['target'])-obj.location;obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
world=bpy.data.worlds.new('Environment_Adjust_Strength_or_Add_HDRI');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.78,1,1);world.node_tree.nodes['Background'].inputs[1].default_value=.25;scene.world=world
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.cycles.diffuse_bounces=4
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene['source_commit']='7a98753';scene['coordinate_mapping']='Three.js (x,y,z) -> Blender (x,-z,y)'
scene['notes']='Editable conversion. Web artworks are guides only. Optional window glass disabled. Lighting is a Cycles starting point, not an exact Three.js match.'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.clip_end=200
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'neoize-gallery.blend'))
print('SAVED',len(scene.objects),'objects',len(bpy.data.cameras),'cameras')
