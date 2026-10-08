"""XAG RevoSling exterior from manufacturer manual diagrams, not CAD.
Nominal landing envelope 859 x 595 x 532 mm; hook 300 x 76 x 59 mm.
Suspension shortened for web inspection, NOT an operating configuration.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
scene=bpy.data.scenes.new('RevoSling | exterior v01');bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
root=bpy.data.objects.new('REVOSLING_ATTACHMENT_ROOT',None);scene.collection.objects.link(root)
root['component']='cargo';root['accuracy']='Exterior reconstruction; suspension shortened for display'
def mat(name,c,metal=0,rough=.45):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
carbon=mat('RevoSling | Carbon composite',(.025,.028,.03));alloy=mat('RevoSling | Anodised frame',(.055,.062,.065),.65,.34)
rubber=mat('RevoSling | Rubber feet',(.015,.018,.020),0,.8);steel=mat('RevoSling | Stainless hardware',(.38,.42,.44),1,.25)
grey=mat('RevoSling | Smart hook housing',(.20,.22,.23),.1,.4);rope=mat('RevoSling | Braided rope',(.50,.52,.48),0,.9)
green=mat('RevoSling | Indicator',(.10,.55,.22));red=mat('RevoSling | Release button',(.52,.03,.025))
def finish(o,name,m,bevel=.002):
    o.name='RevoSling | '+name;o.parent=root;o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('Manufactured edge','BEVEL');mod.width=bevel;mod.segments=3
        mod=o.modifiers.new('Weighted normal','WEIGHTED_NORMAL');mod.keep_sharp=True
    return o
def box(name,p,s,m=alloy):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m)
def beam(name,a,b,r=.013,m=carbon):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=(b-a).length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(b-a)
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,m,.001)
def curve(name,pts,r,m):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('POLY');s.points.add(len(pts)-1)
    for v,p in zip(s.points,pts):v.co=(*p,1)
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.parent=root;c.materials.append(m);return o
# Frame attached below aircraft at Z=0. Exterior proportions inferred from diagrams.
for sx in [-1,1]:
    box('long attachment rail',(sx*.172,0,-.019),(.028,.414,.032))
for sy in [-1,1]:box('cross member',(0,sy*.194,-.019),(.372,.027,.032))
for sx in [-1,1]:
    for sy in [-1,1]:
        a=(sx*.172,sy*.194,-.024);b=(sx*.274,sy*.345,-.49)
        beam('inclined landing tube',a,b,.014)
        beam('foot',(sx*.274,sy*.345-.072,-.515),(sx*.274,sy*.345+.072,-.515),.017,rubber)
        for t in [.04,.43,.88]:
            p=Vector(a).lerp(Vector(b),t);beam('split fixing collar',p-Vector((0,0,.015)),p+Vector((0,0,.015)),.020,alloy)
        box('alignment boss',(sx*.17,sy*.19,.004),(.038,.038,.024))
        for dx in [-.009,.009]:beam('rail screw',(sx*.17+dx,sy*.19,.004),(sx*.17+dx,sy*.19,.012),.003,steel)
    beam('lower side cross tie',(sx*.246,-.303,-.37),(sx*.246,.303,-.37),.010)
    # Open triangular truss, not a filled block, matching the manual silhouette.
    for sy in [-1,1]:beam('lifting A bracket',(sx*.172,sy*.15,-.048),(sx*.085,sy*.075,-.24),.012,alloy)
    beam('bracket upright',(sx*.085,-.075,-.24),(sx*.085,.075,-.24),.011,alloy)
box('rope saddle tube',(0,0,-.255),(.22,.026,.026))
beam('rope exit guide',(0,0,-.25),(0,0,-.31),.018,alloy)
box('rear cable holder',(0,.17,-.07),(.11,.035,.026))
beam('anti entanglement vertical bar',(.246,.20,-.37),(.246,.20,-.13),.008)
curve('display rope',[(0,0,-.30),(.002,0,-.50),(0,0,-.67)],.003,rope)
# Hook's known outside envelope is 300 x 76 x 59 mm. No internal mechanism.
box('smart hook enclosure',(0,0,-.785),(.076,.059,.20),grey)
box('cover seam',(0,-.030,-.785),(.070,.001,.185),alloy)
beam('upper rope eye',(-.025,0,-.680),(.025,0,-.680),.007,steel)
box('release button',(0,-.032,-.824),(.017,.004,.017),red)
box('status indicator',(.020,-.032,-.834),(.007,.003,.005),green)
box('charging port',(-.022,-.031,-.848),(.010,.004,.004),rubber)
curve('cargo safety hook',[(.013,0,-.88),(.032,0,-.906),(.032,0,-.953),(.010,0,-.971),(-.025,0,-.966),(-.032,0,-.940),(-.032,0,-.895)],.007,steel)
beam('safety latch',(-.032,0,-.895),(.013,0,-.882),.004,steel)
for sx in [-1,1]:
    for zz in [-.72,-.85]:beam('hook casing screw',(sx*.028,-.032,zz),(sx*.028,-.035,zz),.0025,steel)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','CURVE']:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in scene.objects if o.type=='MESH')
bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=str(OUT/'revosling-v01-web.glb'),export_format='GLB',use_active_scene=True,export_apply=True,export_extras=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'revosling-v01.blend'))
(OUT/'manifest.json').write_text(json.dumps({'source':'https://static.wixstatic.com/ugd/984a86_0583ee73fadc4ae6960273040ea8f071.pdf','pages':[6,8,9,10,20],'nominal_gear_mm':[859,595,532],'hook_mm':[300,76,59],'mount_gltf':[0,.48375,-.075],'limitations':['Exterior only; small dimensions inferred','Rope shortened for inspection; operational rope must be 5–15 m','No verified engineering fit or factory CAD']},indent=2),encoding='utf8')
print('REVOSLING_SAVED',len(scene.objects),flush=True)
