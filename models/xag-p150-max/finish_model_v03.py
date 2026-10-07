"""Validate and export master + merged web model without changing older revisions.

Web meshes are merged by parent and material set; all animation pivots survive.
Evaluated modifiers and corner normals are preserved. No studio or cameras exported.
"""
import bpy
import bmesh
import math
import json
import io
import contextlib
from pathlib import Path
from mathutils import Vector, Quaternion

OUT=Path(__file__).resolve().parent
scene=bpy.context.scene
if scene.get('revision')!='v03':
    raise RuntimeError('Activate the final v03 scene.')
model=bpy.data.collections[scene['model_collection']]
root=bpy.data.objects[scene['model_root']]
if any(s.get('revision')=='v03-web' for s in bpy.data.scenes):
    raise RuntimeError('Web scene already exists; do not overwrite it implicitly.')
for obj in list(model.objects):
    if obj.type in {'FONT','CURVE'}:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
bpy.context.view_layer.update()
dg=bpy.context.evaluated_depsgraph_get()
rotors=[o for o in model.objects if o.get('animation_role')=='propeller_spin']
assert len(rotors)==4
points=[]
triangles=0
for obj in model.objects:
    if obj.type!='MESH': continue
    evaluated=obj.evaluated_get(dg)
    data=evaluated.to_mesh()
    points.extend(evaluated.matrix_world@v.co for v in data.vertices)
    data.calc_loop_triangles()
    triangles+=len(data.loop_triangles)
    evaluated.to_mesh_clear()
centres=[r.matrix_world.translation.copy() for r in rotors]
diagonal=max((a-b).length for a in centres for b in centres)
assert abs(diagonal-2.335)<.00001
height=max(v.z for v in points)-min(v.z for v in points)
diameters=[]
for rotor in rotors:
    descendants=[o for o in rotor.children_recursive if 'swept carbon blade' in o.name]
    radii=[(rotor.matrix_world.inverted()@o.matrix_world@v.co).xy.length for o in descendants for v in o.data.vertices]
    diameters.append(2*max(radii))
assert max(abs(d-1.6) for d in diameters)<.001
# Test every spin axis. The complete hub/blade subtree moves; stator stays still.
spin_tests=[]
for rotor in rotors:
    blade=next(o for o in rotor.children_recursive if 'swept carbon blade' in o.name)
    vertex=max(blade.data.vertices,key=lambda v:v.co.length)
    before=blade.matrix_world@vertex.co
    stator=next(o for o in model.objects if rotor.name.split(' | ')[1]+' | motor bell' in o.name)
    stator_before=stator.matrix_world.copy()
    assert rotor.rotation_mode=='QUATERNION'
    original=rotor.rotation_quaternion.copy()
    try:
        rotor.rotation_quaternion=original@Quaternion((0,0,1),math.pi/2)
        bpy.context.view_layer.update()
        moved=(blade.matrix_world@vertex.co-before).length
        assert moved>.5
        assert all(abs(a-b)<1e-9 for ra,rb in zip(stator.matrix_world,stator_before) for a,b in zip(ra,rb))
    finally:
        rotor.rotation_quaternion=original
        bpy.context.view_layer.update()
    restored=(blade.matrix_world@vertex.co-before).length
    assert restored<1e-7
    spin_tests.append({'node':rotor.name,'quarter_turn_tip_travel_mm':round(moved*1000,3),'restore_error_mm':round(restored*1000,6)})
tank=next(o for o in model.objects if 'Tank | molded planar' in o.name)
evaluated=tank.evaluated_get(dg)
data=evaluated.to_mesh()
bm=bmesh.new(); bm.from_mesh(data)
tank_volume=abs(bm.calc_volume(signed=True))*1000
tank_non_manifold_edges=sum(not edge.is_manifold for edge in bm.edges)
assert tank_non_manifold_edges==0, 'Tank exterior must be closed.'
bm.free(); evaluated.to_mesh_clear()

def export(collection,path):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=next(o for o in collection.objects if o.parent is None)
    with contextlib.redirect_stdout(io.StringIO()):
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,
            export_apply=True,export_animations=False,export_cameras=False,export_lights=False,
            export_extras=True)

export(model,OUT/'xag-p150-max-v03.glb')
# A separate scene prevents web geometry from appearing in master renders.
web_scene=bpy.data.scenes.new('P150 MAX | v03 WEB')
web_scene['revision']='v03-web'
web_scene.unit_settings.system='METRIC'
web=bpy.data.collections.new('P150 v03 | WEB MODEL')
web_scene.collection.children.link(web)
mapping={}
for obj in model.objects:
    if obj.type=='EMPTY':
        copied=obj.copy()
        copied.name='web | '+obj.name
        web.objects.link(copied)
        mapping[obj]=copied
for original,copied in mapping.items():
    copied.parent=mapping.get(original.parent)
    copied.matrix_parent_inverse=original.matrix_parent_inverse.copy()
    copied.matrix_basis=original.matrix_basis.copy()

groups={}
for obj in model.objects:
    if obj.type!='MESH': continue
    assert obj.parent in mapping
    evaluated=obj.evaluated_get(dg)
    data=evaluated.to_mesh()
    key=(obj.parent,tuple(data.materials))
    group=groups.setdefault(key,{'vs':[],'fs':[],'smooth':[],'indices':[],'normals':[]})
    transform=obj.parent.matrix_world.inverted()@evaluated.matrix_world
    normal_transform=transform.to_3x3().inverted().transposed()
    offset=len(group['vs'])
    group['vs'].extend(tuple(transform@v.co) for v in data.vertices)
    for polygon in data.polygons:
        group['fs'].append(tuple(offset+v for v in polygon.vertices))
        group['smooth'].append(polygon.use_smooth)
        group['indices'].append(polygon.material_index)
        group['normals'].extend(tuple((normal_transform@data.corner_normals[i].vector).normalized()) for i in polygon.loop_indices)
    evaluated.to_mesh_clear()
for index,((parent,materials),group) in enumerate(groups.items()):
    data=bpy.data.meshes.new('v03 web merged '+str(index))
    data.from_pydata(group['vs'],[],group['fs'])
    data.update()
    for material in materials: data.materials.append(material)
    for polygon,smooth,material_index in zip(data.polygons,group['smooth'],group['indices']):
        polygon.use_smooth=smooth
        polygon.material_index=material_index
    data.normals_split_custom_set(group['normals'])
    obj=bpy.data.objects.new('web | merged '+str(index),data)
    web.objects.link(obj)
    obj.parent=mapping[parent]

bpy.context.window.scene=web_scene
bpy.context.view_layer.update()
export(web,OUT/'xag-p150-max-v03-web-uncompressed.glb')
manifest={'revision':'v03','model':'xag-p150-max-v03-web.glb',
    'animation':{'type':'runtime rotation, no baked clips','axis_in_gltf':[0,1,0],
        'units':'radians per second','directions_note':'Alternating presentation directions, not verified flight control data.',
        'rotors':[{'node':mapping[r].name,'direction':r['spin_direction']} for r in rotors],
        'behaviour':'Keep initial quaternion; multiply by a local-axis spin quaternion. Rotate hubs and blades only.',
        'accessibility':'Stop for reduced motion and while the canvas is off-screen or document hidden.'},
    'fallback':'preview-v03-three-quarter.png',
    'limitations':['No verified transport folding','No operational rotor RPM','Microtextures are Blender-only; browser PBR appearance requires lighting QA']}
(OUT/'web-model-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
report={'revision':'v03','motor_diagonal_mm':round(diagonal*1000,3),
    'rotor_diameters_mm':[round(d*1000,3) for d in diameters],'height_mm':round(height*1000,3),
    'tank_outer_volume_l_not_useful_capacity':round(tank_volume,3),'master_triangles':triangles,
    'tank_non_manifold_edges':tank_non_manifold_edges,
    'master_objects':len(model.objects),'web_objects':len(web.objects),'web_meshes':len(groups),
    'rotor_spin_tests':spin_tests,'master_glb_bytes':(OUT/'xag-p150-max-v03.glb').stat().st_size,
    'web_uncompressed_glb_bytes':(OUT/'xag-p150-max-v03-web-uncompressed.glb').stat().st_size,
    'web_qa':'Geometry and pivots checked; browser/mobile frame rate not yet tested.'}
(OUT/'validation-v03.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
bpy.context.window.scene=scene
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-v03.blend'))
result=report
