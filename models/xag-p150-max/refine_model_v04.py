"""Refine v03 in a separate background process; never overwrite earlier revisions.

Run: blender --background xag-p150-max-v03.blend --python refine_model_v04.py
The generated web scene keeps rotor pivots, split normals and semantic assemblies.
Short-range vertex occlusion is geometry-derived, not painted wear or fake detail.
"""
import bpy
import math
import json
import time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT = Path(__file__).resolve().parent
if (OUT / 'xag-p150-max-v04.blend').exists():
    raise RuntimeError('v04 already exists; preserve it rather than overwrite implicitly.')
scene = next(s for s in bpy.data.scenes if s.get('revision') == 'v03')
bpy.context.window.scene = scene
model = bpy.data.collections[scene['model_collection']]
root = bpy.data.objects[scene['model_root']]
scene.name = 'P150 MAX | v04 surface refinement'
scene['revision'] = 'v04'

# Smooth shallow molded transitions, retaining the real tank's broad planar walls.
tank = next(o for o in model.objects if 'Tank | molded planar saddle' in o.name)
for polygon in tank.data.polygons:
    polygon.use_smooth = True
tank.data.set_sharp_from_angle(angle=math.radians(38))
for modifier in tank.modifiers:
    if modifier.type == 'BEVEL':
        modifier.width = .008
        modifier.segments = 5
        modifier.harden_normals = True
    elif modifier.type == 'WEIGHTED_NORMAL':
        modifier.keep_sharp = True
        modifier.weight = 25
for obj in model.objects:
    if obj.type != 'MESH':
        continue
    for modifier in obj.modifiers:
        if modifier.type == 'BEVEL':
            modifier.segments = max(modifier.segments, 4)
            modifier.harden_normals = True

# Linear values: blacks still reflect light; HDPE is off-white, not emissive white.
surface = {
    'Anodised graphite': ((.022, .026, .030, 1), .65, .34),
    'Injection molded black': ((.014, .017, .019, 1), 0, .49),
    'Brushed aluminium edges': ((.56, .59, .61, 1), 1, .32),
    'Steel hardware': ((.32, .35, .37, 1), 1, .28),
    'Rubber feet and grips': ((.009, .011, .012, 1), 0, .78),
    'XAG red painted shell': ((.55, .008, .012, 1), .05, .28),
    'Molded HDPE tank': ((.66, .68, .63, 1), 0, .46),
    'Tank relief lettering': ((.66, .68, .63, 1), 0, .46),
    'Dark translucent filler caps': ((.012, .017, .014, 1), 0, .38),
    'Light grey equipment enclosure': ((.48, .51, .52, 1), .18, .4),
    'Carbon composite blades': ((.012, .014, .016, 1), .12, .44),
}
for material in {m for o in model.objects if o.type == 'MESH' for m in o.data.materials if m}:
    shader = material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
    if not shader:
        continue
    name = material.name.split(' | ', 1)[-1]
    if name not in surface:
        continue
    color, metal, rough = surface[name]
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Specular IOR Level'].default_value = .5
    shader.inputs['Transmission Weight'].default_value = 0
    shader.inputs['Coat Weight'].default_value = .22 if 'red painted' in name else 0
    shader.inputs['Coat Roughness'].default_value = .24
    material.diffuse_color = color

def component(obj):
    if 'Tank |' in obj.name:
        return 'tank'
    if any(s in obj.name for s in ('pale upper equipment housing', 'silver upper cover',
            'silver heat sink fin', 'upper service bridge', 'upper XAG marking', 'cover screw')):
        return 'battery'
    return 'structure'

bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
evaluated_meshes = []
global_vertices, global_faces = [], []
for obj in model.objects:
    if obj.type != 'MESH':
        continue
    obj['component'] = component(obj)
    evaluated = obj.evaluated_get(dg)
    data = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=dg)
    data.calc_loop_triangles()
    start = len(global_vertices)
    global_vertices.extend(obj.matrix_world @ v.co for v in data.vertices)
    global_faces.extend(tuple(start + i for i in t.vertices) for t in data.loop_triangles)
    evaluated_meshes.append((obj, data))
tree = BVHTree.FromPolygons(global_vertices, global_faces, all_triangles=True)

web_scene = bpy.data.scenes.new('P150 MAX | v04 WEB')
web_scene['revision'] = 'v04-web'
web = bpy.data.collections.new('P150 v04 | WEB MODEL')
web_scene.collection.children.link(web)
mapping = {}
for obj in model.objects:
    if obj.type == 'EMPTY':
        copied = obj.copy()
        copied.name = 'v04 web | ' + obj.name
        web.objects.link(copied)
        mapping[obj] = copied
for original, copied in mapping.items():
    copied.parent = mapping.get(original.parent)
    copied.matrix_parent_inverse = original.matrix_parent_inverse.copy()
    copied.matrix_basis = original.matrix_basis.copy()

# Fibonacci hemisphere; only local crevices darken, not whole faces.
samples = 10
directions = [Vector((math.sqrt(1-((i+.5)/samples)**2)*math.cos(i*2.399963),
                      math.sqrt(1-((i+.5)/samples)**2)*math.sin(i*2.399963),
                      (i+.5)/samples)) for i in range(samples)]
groups = {}
cache = {}
started = time.monotonic()
for index, (obj, data) in enumerate(evaluated_meshes):
    materials = tuple(data.materials)
    key = (obj.parent, materials, component(obj))
    group = groups.setdefault(key, {'vs': [], 'fs': [], 'smooth': [], 'indices': [], 'normals': [], 'ao': []})
    transform = obj.parent.matrix_world.inverted() @ obj.matrix_world
    normal_transform = transform.to_3x3().inverted().transposed()
    world_normal_transform = obj.matrix_world.to_3x3().inverted().transposed()
    offset = len(group['vs'])
    group['vs'].extend(tuple(transform @ v.co) for v in data.vertices)
    for polygon in data.polygons:
        group['fs'].append(tuple(offset + v for v in polygon.vertices))
        group['smooth'].append(polygon.use_smooth)
        group['indices'].append(polygon.material_index)
        for loop_index in polygon.loop_indices:
            normal = data.corner_normals[loop_index].vector
            group['normals'].append(tuple((normal_transform @ normal).normalized()))
            point = obj.matrix_world @ data.vertices[data.loops[loop_index].vertex_index].co
            n = (world_normal_transform @ normal).normalized()
            cache_key = tuple(round(v, 5) for v in (*point, *n))
            value = cache.get(cache_key)
            if value is None:
                rotation = Vector((0, 0, 1)).rotation_difference(n)
                origin = point + n * .0008
                occlusion = 0
                for d in directions:
                    hit = tree.ray_cast(origin, rotation @ d, .075)
                    if hit[0] is not None:
                        occlusion += max(0, 1 - hit[3]/.075)
                value = 1 - .42 * occlusion/samples
                cache[cache_key] = value
            group['ao'].append((value, value, value, 1))
    if index % 100 == 0:
        print('V04 geometry', index, '/', len(evaluated_meshes), flush=True)
    bpy.data.meshes.remove(data)

for index, ((parent, materials, part), group) in enumerate(groups.items()):
    data = bpy.data.meshes.new('v04 merged ' + str(index))
    data.from_pydata(group['vs'], [], group['fs'])
    data.update()
    for material in materials:
        data.materials.append(material)
    for polygon, smooth, material_index in zip(data.polygons, group['smooth'], group['indices']):
        polygon.use_smooth = smooth
        polygon.material_index = material_index
    data.normals_split_custom_set(group['normals'])
    ao = data.color_attributes.new(name='ContactOcclusion', type='FLOAT_COLOR', domain='CORNER')
    ao.data.foreach_set('color', [v for color in group['ao'] for v in color])
    data.color_attributes.active_color = ao
    obj = bpy.data.objects.new('v04 web | ' + part + ' | ' + str(index), data)
    obj['component'] = part
    web.objects.link(obj)
    obj.parent = mapping[parent]

bpy.context.window.scene = web_scene
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for obj in web.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = mapping[root]
bpy.ops.export_scene.gltf(filepath=str(OUT/'xag-p150-max-v04-web-uncompressed.glb'),
    export_format='GLB', use_selection=True, use_active_scene=True, export_apply=True,
    export_animations=False, export_cameras=False, export_lights=False, export_extras=True,
    export_vertex_color='ACTIVE', export_all_vertex_colors=False)
rotors = [o for o in model.objects if o.get('animation_role') == 'propeller_spin']
assert len(rotors) == 4
diagonal = max((a.matrix_world.translation-b.matrix_world.translation).length for a in rotors for b in rotors)
assert abs(diagonal-2.335) < .00001
manifest = {'revision':'v04', 'model':'xag-p150-max-v04-web.glb',
    'fallback':'preview-v04-browser.png',
    'animation': {'axis_in_gltf':[0,1,0], 'rotors':[{'node':mapping[r].name,'direction':r['spin_direction']} for r in rotors]},
    'components':'node extras.component: tank / battery (upper enclosure) / structure; rotors by pivot subtree',
    'limitations':['Exterior photo reconstruction, not factory CAD', 'No verified operational RPM',
                   'Short-range vertex occlusion approximates local contact shading; it is not dynamic shadowing']}
(OUT/'web-model-manifest-v04.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
bpy.context.window.scene = scene
scene.camera = bpy.data.objects[scene['camera_three_quarter']]
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-v04.blend'))
report = {'revision':'v04','motor_diagonal_mm':diagonal*1000,'web_meshes':len(groups),
    'height_mm':(max(v.z for v in global_vertices)-min(v.z for v in global_vertices))*1000,
    'web_triangles':len(global_faces),'occlusion_samples':samples,'occlusion_cache_entries':len(cache),
    'build_seconds':round(time.monotonic()-started,2),'rotor_pivots':len(rotors),
    'changes':['38-degree tank normals, 8mm/5-segment tank bevel','PBR surface separation',
               'geometry-derived short-range contact occlusion','semantic component exports'],
    'unchanged':'Motor positions, rotor diameters, arms, handles, tank profile and overall scale'}
(OUT/'validation-v04.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('V04_RESULT',json.dumps(report),flush=True)
