"""New mounting artifacts only. Run background Blender on untouched aircraft v07.

Split material-merged WEB geometry by original native object spans, preserving
the existing custom normals and ContactOcclusion attributes exactly.
"""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
AIR=OUT.parent/'xag-p150-max'
POSITION=(0,.075,.48375) # Blender Z up; glTF: [0,.48375,-.075]
for name in ('mounting.json','xag-p150-max-v08-configurable-uncompressed.glb','xag-p150-max-revocast-5-mounted-v01.blend','mounting-compare-oblique.png'):
    assert not (OUT/name).exists(), 'Preserve previous artifact: '+name
source_scene=next(s for s in bpy.data.scenes if s.get('revision')=='v07')
bpy.context.window.scene=source_scene
native=bpy.data.collections[source_scene['model_collection']]
original_root=bpy.data.objects[source_scene['model_root']]
source_hashes={str(p.relative_to(OUT.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (AIR/'xag-p150-max-v07.blend',OUT/'revocast-5-v01.blend')}
def removal(o):
    if o.get('component') in ('tank','spray'):return o.get('component')
    if o.name.startswith('Landing |'):return 'landing'
    if ' | Pump |' in o.name:return 'spray'
    return None
groups={}
for o in native.objects:
    if o.type=='MESH':groups.setdefault((o.parent,tuple(o.data.materials),o.get('component')),[]).append(o)
oldweb=next(s for s in bpy.data.scenes if s.get('revision')=='v07-web')
web=bpy.data.scenes.new('P150 MAX | v08 configurable WEB')
wc=bpy.data.collections.new('Mounting | configurable aircraft');web.collection.children.link(wc)
wm={}
for o in oldweb.objects:
    c=o.copy();c.name=o.name.replace('v07 web |','v08 web |')
    wc.objects.link(c);wm[o]=c
for o,c in wm.items():
    c.parent=wm.get(o.parent);c.matrix_parent_inverse=o.matrix_parent_inverse.copy();c.matrix_basis=o.matrix_basis.copy()
dg=bpy.context.evaluated_depsgraph_get()
split_report=[]
for index,(key,objects) in enumerate(groups.items()):
    oldname=f'v07 web | {key[2]} | {index}'
    old=bpy.data.objects[oldname]
    categories={removal(o) or key[2] for o in objects}
    if len(categories)==1:continue
    assert key[2]=='structure'
    data=old.data; vertex_offset=0;polygon_offset=0;spans={}
    for o in objects:
        ev=o.evaluated_get(dg);mesh=ev.to_mesh()
        spans[o]=(vertex_offset,vertex_offset+len(mesh.vertices),polygon_offset,polygon_offset+len(mesh.polygons))
        vertex_offset+=len(mesh.vertices);polygon_offset+=len(mesh.polygons);ev.to_mesh_clear()
    assert vertex_offset==len(data.vertices) and polygon_offset==len(data.polygons),(oldname,vertex_offset,len(data.vertices),polygon_offset,len(data.polygons))
    newnodes=[]
    for category in sorted(categories):
        included=[o for o in objects if (removal(o) or key[2])==category]
        ids=[i for o in included for i in range(spans[o][0],spans[o][1])]
        pids=[i for o in included for i in range(spans[o][2],spans[o][3])]
        indexmap={oldid:newid for newid,oldid in enumerate(ids)}
        mesh=bpy.data.meshes.new(f'v08 split {index} {category}')
        mesh.from_pydata([data.vertices[i].co[:] for i in ids],[],[tuple(indexmap[v] for v in data.polygons[i].vertices) for i in pids]);mesh.update()
        for m in data.materials:mesh.materials.append(m)
        loopids=[]
        for p,oldid in zip(mesh.polygons,pids):
            op=data.polygons[oldid];p.use_smooth=op.use_smooth;p.material_index=op.material_index;loopids.extend(op.loop_indices)
        mesh.normals_split_custom_set([data.corner_normals[i].vector[:] for i in loopids])
        for attr in data.color_attributes:
            assert attr.domain=='CORNER'
            newattr=mesh.color_attributes.new(name=attr.name,type=attr.data_type,domain=attr.domain)
            newattr.data.foreach_set('color',[v for i in loopids for v in attr.data[i].color])
        if data.color_attributes.active_color:mesh.color_attributes.active_color=mesh.color_attributes[data.color_attributes.active_color.name]
        c=old.copy();c.data=mesh;c.name=f'v08 web | {category} | {index}';c['component']=category;c['source_merged_node']=oldname
        wc.objects.link(c);c.parent=wm.get(old.parent);c.matrix_parent_inverse=old.matrix_parent_inverse.copy();c.matrix_basis=old.matrix_basis.copy()
        newnodes.append({'node':c.name,'component':category,'nativeObjects':[o.name for o in included]})
    bpy.data.objects.remove(wm.pop(old),do_unlink=True)
    split_report.append({'originalMergedNode':oldname,'newNodes':newnodes})
bpy.context.window.scene=web;bpy.context.view_layer.update()
rotors=[o for o in wc.objects if o.get('animation_role')=='propeller_spin'];assert len(rotors)==4
bpy.ops.export_scene.gltf(filepath=str(OUT/'xag-p150-max-v08-configurable-uncompressed.glb'),export_format='GLB',use_active_scene=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
print('CONFIGURABLE_EXPORT_COMPLETE',flush=True)

def copy_tree(objects,col,excluded=None):
    mapping={}
    for o in objects:
        if excluded and excluded(o):continue
        c=o.copy();col.objects.link(c);mapping[o]=c
    for o,c in mapping.items():
        c.parent=mapping.get(o.parent);c.matrix_parent_inverse=o.matrix_parent_inverse.copy();c.matrix_basis=o.matrix_basis.copy()
    return mapping
assembled=bpy.data.scenes.new('P150 MAX | RevoCast 5 mounted v01');assembled.unit_settings.system='METRIC'
aircol=bpy.data.collections.new('Mounted | aircraft retained');assembled.collection.children.link(aircol)
am=copy_tree(native.objects,aircol,removal)
with bpy.data.libraries.load(str(OUT/'revocast-5-v01.blend'),link=False) as (available,loaded):
    loaded.collections=['RevoCast 5 | MODEL']
module=loaded.collections[0];assembled.collection.children.link(module)
module_root=next(o for o in module.objects if o.name.startswith('REVOCAST_ATTACHMENT_ROOT'))
module_root.location=POSITION
assembled['mounting_coordinate_space']='Raw Blender scene; (x,y,z) maps to glTF (x,z,-y)'
assembled['mounting_gltf_position']=[0,.48375,-.075]
bpy.context.window.scene=assembled;bpy.context.view_layer.update()
def bbox(o):
    ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh()
    points=[ev.matrix_world@v.co for v in mesh.vertices];ev.to_mesh_clear()
    return ([min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)])
air_boxes={o.name:bbox(o) for o in aircol.objects if o.type=='MESH'}
module_boxes={o.name:bbox(o) for o in module.objects if o.type in ('MESH','CURVE','FONT')}
supports=[o for o in module.objects if o.type in ('MESH','CURVE') and o.parent and o.parent.get('component') in ('frame','landing')]
def overlap(a,b):return [min(a[1][i],b[1][i])-max(a[0][i],b[0][i]) for i in range(3)]
support_candidates=[]
for o in supports:
    for name,b in air_boxes.items():
        amounts=overlap(module_boxes[o.name],b)
        if all(v>=-1e-6 for v in amounts):support_candidates.append({'moduleObject':o.name,'aircraftObject':name,'overlapAxesMm':[round(v*1000,4) for v in amounts],'interpretation':'Nominal mount contact / AABB candidate, not proven surface penetration'})
def union(boxes):return {'min':[min(b[0][i] for b in boxes) for i in range(3)],'max':[max(b[1][i] for b in boxes) for i in range(3)]}
envelope=union(list(air_boxes.values())+list(module_boxes.values()))
clearance={'method':'Evaluated world-space AABB broad phase; ONLY exterior module frame/landing supports versus retained aircraft. No complete interior or rotor-swept collision simulation.','supportObjectsChecked':len(supports),'retainedAircraftMeshObjectsChecked':len(air_boxes),'candidates':support_candidates,'assembledBoundsBlenderMeters':envelope,'assembledDimensionsMm':[(envelope['max'][i]-envelope['min'][i])*1000 for i in range(3)]}
report={'schemaVersion':1,'subject':'P150 Max v07 plus RevoCast 5 v01 exterior mounting','status':'Native assembly and scoped exterior support check; not engineering-certified mounting','sources':source_hashes,'module':{'native':'revocast-5-v01.blend','web':'revocast-5-v01-web.glb','root':'REVOCAST_ATTACHMENT_ROOT','topPlaneMeters':0},'transform':{'coordinateSpace':'RAW aircraft glTF scene, metres, Y up; BEFORE any website recentering or scale normalization','position':[0,.48375,-.075],'quaternion':[0,0,0,1],'quaternionOrder':'xyzw','scale':[1,1,1],'ifParentedUnderAircraftRoot':{'node':'v07 web | P150_V03_ROOT','position':[0,.449,-.075],'quaternion':[0,0,0,1],'scale':[1,1,1]},'blenderPosition':[0,.075,.48375],'rationale':'Module alignment-boss top plane meets underside of native chassis lower equipment tray at world Z=.48375. Module centred on chassis longitudinal rail span (-.195 to .345), at Y=.075. Frame rail X=±.174 near chassis mounting rails X=±.170. No scale distortion.'},'replacements':{'hideComponentsInConfigurableV08':['tank','spray','landing'],'nativeObjects':[{'name':o.name,'component':removal(o)} for o in native.objects if removal(o)],'originalV07WholeNodesSafeToHide':[f'v07 web | {key[2]} | {i}' for i,(key,obs) in enumerate(groups.items()) if key[2] in ('tank','spray')],'originalV07MixedNodesCannotHideWhole':split_report,'warning':'Original v07 glTF has no independently hideable leg nodes. Pumps/supply hoses have structure tags. Use v08; do not remove entire material-merged structure nodes or rely on only tank/spray extras.'},'configurableAircraft':{'uncompressed':'xag-p150-max-v08-configurable-uncompressed.glb','web':'xag-p150-max-v08-configurable-web.glb','separation':'Existing semantic grouping preserved; old landing split to landing, spray pumps and supply hoses split to spray. Original custom normals and contact-occlusion attributes copied by exact original native geometry spans.','rotorPivots':[{'node':o.name,'direction':o.get('spin_direction')} for o in rotors]},'artifacts':{'assembledNative':'xag-p150-max-revocast-5-mounted-v01.blend','comparisonPreview':'mounting-compare-oblique.png'},'clearance':clearance,'limitations':['Both models are photo-reconstructed exteriors, not factory CAD; seating is inferred from native chassis and module top plane.','Alignment bosses nominally meet tray underside; actual holes, locking interfaces, load transfer and latch engagement are not reconstructed or verified.','AABB broad phase only checks exterior frame/landing supports against retained aircraft; touching boxes are not automatically penetration. Hopper/internal/rotating/deflected geometry and operational clearance are not certified.','Lid opening and arm transport motion have not been collision-tested.','No RevoSling geometry invented; cargo remains manufacturer-photo-only.','No browser integration, UI change or physical hardware performance claim.']}
print('MOUNT_RESULT',json.dumps({'transform':report['transform'],'supportCandidates':support_candidates,'dimensions':clearance['assembledDimensionsMm']}),flush=True)

# One modest comparison render: copied source spray setup vs mounted spread setup.
compare=bpy.data.scenes.new('Mounting | oblique comparison');col=bpy.data.collections.new('Mounting | comparison only');compare.collection.children.link(col)
for objects,label,x,ground in [(native.objects,'v07 / RevoSpray 5',-2.1,.002),(list(aircol.objects)+list(module.objects),'v07 + RevoCast 5',2.1,envelope['min'][2])]:
    mapping=copy_tree(objects,col)
    pivot=bpy.data.objects.new('Comparison | '+label,None);col.objects.link(pivot);pivot.location=(x,0,-ground);pivot.rotation_euler.z=.36
    for old,c in mapping.items():
        if old.parent not in mapping:c.parent=pivot
    t=bpy.data.curves.new(label,'FONT');t.body=label;t.align_x='CENTER';t.size=.18
    o=bpy.data.objects.new('Comparison label | '+label,t);col.objects.link(o);o.location=(x,-1.85,.08);o.rotation_euler=(math.pi/2,0,0)
groundmesh=bpy.data.meshes.new('Comparison ground');groundmesh.from_pydata([(-100,-100,-.002),(100,-100,-.002),(100,100,-.002),(-100,100,-.002)],[],[(0,1,2,3)])
floor=bpy.data.objects.new('Comparison | ground',groundmesh);col.objects.link(floor)
mat=bpy.data.materials.new('Comparison | neutral ground');mat.diffuse_color=(.7,.72,.74,1);groundmesh.materials.append(mat)
target=Vector((0,0,.45));camdata=bpy.data.cameras.new('Comparison oblique');cam=bpy.data.objects.new('Comparison oblique',camdata);col.objects.link(cam);cam.location=(0,-10,5.5);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=8.5;compare.camera=cam
for name,loc,energy,size in [('key',(-3,-4,7),2100,5),('fill',(4,-1,5),1300,4),('rim',(0,5,6),1700,4)]:
    d=bpy.data.lights.new('Comparison '+name,'AREA');d.energy=energy;d.size=size;o=bpy.data.objects.new('Comparison '+name,d);col.objects.link(o);o.location=loc;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
compare.world=source_scene.world.copy();compare.render.engine='CYCLES';compare.cycles.samples=12;compare.cycles.use_denoising=True;compare.cycles.max_bounces=4
compare.render.resolution_x=900;compare.render.resolution_y=560;compare.render.resolution_percentage=100;compare.render.image_settings.file_format='PNG';compare.view_settings.view_transform='AgX';compare.render.filepath=str(OUT/'mounting-compare-oblique.png')
assembled.camera=cam
bpy.context.window.scene=assembled
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-revocast-5-mounted-v01.blend'))
(OUT/'mounting.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
bpy.context.window.scene=compare;bpy.ops.render.render(write_still=True)
assert all(hashlib.sha256((OUT.parent/path).read_bytes()).hexdigest()==digest for path,digest in source_hashes.items())
print('MOUNTING_COMPLETE_ORIGINALS_UNCHANGED',flush=True)
