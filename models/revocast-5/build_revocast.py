"""RevoCast 5 M4RCP115BH photo-reconstructed exterior. Metres, front -Y.
Fresh scene; no earlier drone overwritten. Small dimensions inferred, not CAD.
"""
import bpy,bmesh,math,json,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
OUT.mkdir(exist_ok=True)
assert '--replace' in sys.argv or not (OUT/'revocast-5-v01.blend').exists()
scene=bpy.data.scenes.new('RevoCast 5 | exterior v01');bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
model=bpy.data.collections.new('RevoCast 5 | MODEL');studio=bpy.data.collections.new('RevoCast 5 | STUDIO')
scene.collection.children.link(model);scene.collection.children.link(studio)
root=bpy.data.objects.new('REVOCAST_ATTACHMENT_ROOT',None);model.objects.link(root)
root['component']='revocast';root['model']='M4RCP115BH'
root['accuracy']='Exterior photo reconstruction; small dimensions inferred, not factory CAD'
datum=bpy.data.objects.new('RevoCast | ground datum',None);model.objects.link(datum);datum.parent=root;datum.location.z=-.743
parts={}
for name in ('hopper','frame','landing','feeder','disc','wiring'):
    o=bpy.data.objects.new('RevoCast | '+name.upper(),None);model.objects.link(o);o.parent=datum;o['component']=name;parts[name]=o
def mat(name,color,metal=0,rough=.45,micro=False):
    m=bpy.data.materials.new('RevoCast | '+name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if micro:
        n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=350
        b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.12;b.inputs['Distance'].default_value=.00009
        m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    return m
white=mat('Molded HDPE',(.72,.735,.70),micro=True);lid=mat('Graphite lids',(.035,.039,.041),rough=.51,micro=True)
black=mat('Polymer mechanism',(.009,.011,.013),rough=.55,micro=True);carbon=mat('Composite tubes',(.010,.012,.014),0,.48)
rubber=mat('Rubber feet',(.01,.012,.013),rough=.76);alloy=mat('Coated cast aluminium',(.017,.020,.023),.12,.44)
steel=mat('Stainless hardware',(.43,.46,.48),1,.28);ink=mat('Printed markings',(.025,.03,.032),rough=.6)
ivory=mat('White print',(.78,.80,.78));yellow=mat('Warning label',(.9,.53,.01))
def mesh(name,vs,fs,m,parent=None,bevel=0,smooth=False):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update()
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new('RevoCast | '+name,d);model.objects.link(o);o.parent=parent or parts['frame'];d.materials.append(m)
    for p in d.polygons:p.use_smooth=smooth
    if bevel:
        b=o.modifiers.new('Manufactured fillet','BEVEL');b.width=bevel;b.segments=4
        n=o.modifiers.new('Face-weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True
    return o
def box(name,loc,dims,m=black,parent=None,bevel=.002):
    vs=[(x*dims[0]/2,y*dims[1]/2,z*dims[2]/2) for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    o=mesh(name,vs,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],m,parent,bevel);o.location=loc;return o
def cylinder(name,loc,r,depth,m=black,axis=(0,0,1),parent=None,sides=40,bevel=.001):
    vs=[(r*math.cos(i*math.tau/sides),r*math.sin(i*math.tau/sides),z) for z in (-depth/2,depth/2) for i in range(sides)]
    fs=[tuple(reversed(range(sides))),tuple(range(sides,2*sides))]+[(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    o=mesh(name,vs,fs,m,parent,bevel,True);o.location=loc;o.rotation_mode='QUATERNION'
    o.rotation_quaternion=Vector((0,0,1)).rotation_difference(Vector(axis).normalized())
    o.data.polygons[0].use_smooth=o.data.polygons[1].use_smooth=False;return o
def beam(name,a,b,r,m=carbon,parent=None):
    a,b=Vector(a),Vector(b);return cylinder(name,(a+b)/2,r,(b-a).length,m,b-a,parent)
def bolt(name,loc,axis=(0,0,1),parent=None):
    cylinder(name+' washer',loc,.0042,.0008,steel,axis,parent,24,.0003)
    cylinder(name+' hex',Vector(loc)+Vector(axis)*.0015,.0031,.0025,steel,axis,parent,6,.0003)
def cable(name,points,r=.003,parent=None,m=rubber):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=8;d.bevel_depth=r;d.bevel_resolution=3
    s=d.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,v in zip(s.bezier_points,points):p.co=v;p.handle_left_type=p.handle_right_type='AUTO'
    o=bpy.data.objects.new('RevoCast | '+name,d);model.objects.link(o);o.parent=parent or parts['wiring'];d.materials.append(m);return o
def text(name,body,loc,size,m=ink):
    d=bpy.data.curves.new(name,'FONT');d.body=body;d.align_x='CENTER';d.size=size;d.extrude=.00005
    o=bpy.data.objects.new('RevoCast | '+name,d);model.objects.link(o);o.parent=parts['hopper'];o.location=loc;o.rotation_euler=(math.pi/2,0,0);d.materials.append(m)
def ring(hx,hy,z,notch=0,n=96):
    out=[]
    for i in range(n):
        a=i*math.tau/n;c,s=math.cos(a),math.sin(a)
        x=hx*math.copysign(abs(c)**.40,c);y=hy*math.copysign(abs(s)**.40,s)
        t=max(0,min(1,(abs(x)-.105)/.070));transition=t*t*(3-2*t)
        zz=z-notch*(1-transition)
        y+=math.copysign(.004*math.exp(-((abs(x)-.14)/.045)**2)*abs(s)**6,y)
        out.append((x,y,zz))
    return out
# Continuous wide-shouldered molded hopper, central recess and narrow outlet.
profiles=[(.180,.173,.280,0),(.194,.189,.292,0),(.235,.218,.340,0),(.313,.262,.415,0),(.402,.307,.500,0),(.478,.342,.575,0),(.514,.358,.628,.038),(.520,.361,.646,.056)]
rings=[ring(x,y,z,d) for x,y,z,d in profiles];n=len(rings[0]);vs=[p for rr in rings for p in rr]
fs=[tuple(reversed(range(n)))]+[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(rings)-1) for i in range(n)]
hopper=mesh('continuous molded granule hopper',vs,fs,white,parts['hopper'],.003,True)
s=hopper.modifiers.new('Exterior wall','SOLIDIFY');s.thickness=.004;s.offset=-1
hopper['capacity_l']=115;hopper['capacity_verified_by_geometry']=False
lid_roots=[]
for sx in (-1,1):
    tag='left' if sx<0 else 'right'
    pivot=bpy.data.objects.new('RevoCast | '+tag+' LID_HINGE',None);model.objects.link(pivot);pivot.parent=parts['hopper'];pivot.location=(sx*.105,0,.654)
    pivot['animation_role']='lid_open';pivot['axis_in_blender']='Y';lid_roots.append(pivot)
    outline=[(.108,-.295),(.21,-.361),(.482,-.354),(.520,-.286),(.520,.286),(.482,.354),(.21,.361),(.108,.295)]
    pts=[(sx*x,y,.653+.033*(1-(x-.108)/.412)) for x,y in outline]
    v=[(x-sx*.105,y,z-.654) for x,y,z in pts];v += [(x,y,z-.010) for x,y,z in v]
    f=[tuple(range(8)),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
    mesh(tag+' shallow loading lid',v,f,lid,pivot,.005)
    cable(tag+' rim gasket',[(x-sx*.105,y,z-.654) for x,y,z in pts+[pts[0]]],.004,pivot,black)
    for sy in (-1,1):
        cylinder(tag+' lid hinge '+str(sy),(sx*.112,sy*.205,.671),.007,.055,alloy,(0,1,0),parts['hopper'])
        box(tag+' buckle '+str(sy),(sx*.438,sy*.343,.651),(.036,.018,.034),black,parts['hopper'])
        bolt(tag+' buckle '+str(sy),(sx*.438,sy*.355,.649),(0,sy,0),parts['hopper'])
    for i in range(5):
        y=-.14+i*.07;box(tag+' lower tab '+str(i),(sx*.193,y,.286),(.027,.040,.035),black,parts['feeder'],.006)
        bolt(tag+' lower fastening '+str(i),(sx*.211,y,.291),(sx,0,0),parts['feeder'])
for sy in (-1,1):
    panel=box('recessed service cover '+str(sy),(0,sy*.333,.544),(.152,.009,.067),white,parts['hopper'],.005)
    panel.rotation_euler.x=-sy*.437
    for xx in (-.059,.059):bolt('service cover screw '+str((sy,xx)),(xx,sy*.345,.568),(0,sy,0),parts['hopper'])
# Open rectangular mount frame, locking hooks, alignment bosses.
for sx in (-1,1):box('upper rail '+str(sx),(sx*.174,0,.716),(.033,.57,.033),alloy)
for sy in (-1,1):
    box('transverse rail '+str(sy),(0,sy*.268,.716),(.38,.032,.033),alloy)
    for sx in (-1,1):
        cylinder('alignment boss '+str((sx,sy)),(sx*.174,sy*.268,.733),.012,.020,black)
        bolt('rail set screw '+str((sx,sy)),(sx*.174,sy*.225,.735))
        beam('cast leg socket shoulder '+str((sx,sy)),(sx*.174,sy*.268,.707),(sx*.185,sy*.395,.688),.027,alloy)
        box('hook seat '+str((sx,sy)),(sx*.202,sy*.203,.711),(.024,.049,.035),alloy)
        cable('locking hook '+str((sx,sy)),[(sx*.215,sy*.190,.716),(sx*.232,sy*.190,.731),(sx*.232,sy*.223,.731),(sx*.215,sy*.225,.722)],.0025,parts['frame'],steel)
# Four exterior splayed legs; feet define the sourced overall footprint.
legs={}
for sx in (-1,1):
    for sy in (-1,1):
        tag=f'{sx}_{sy}';a=Vector((sx*.185,sy*.395,.688));b=Vector((sx*.5345,sy*.449,.025));legs[sx,sy]=(a,b)
        beam(tag+' landing tube',a,b,.019,carbon,parts['landing'])
        for t in (.04,.42,.85):
            p=a.lerp(b,t);cylinder(tag+' clamp '+str(t),p,.024,.043,black,b-a,parts['landing'])
            bolt(tag+' clamp '+str(t),p+Vector((sx*.025,0,0)),(sx,0,0),parts['landing'])
        beam(tag+' sole',(b.x,b.y-.032,b.z),(b.x,b.y+.032,b.z),.025,rubber,parts['landing'])
        for yy in (-.032,.032):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.025)
            o=bpy.context.object;o.name='RevoCast | '+tag+' foot end'
            for c in list(o.users_collection):c.objects.unlink(o)
            model.objects.link(o);o.parent=parts['landing'];o.location=b+Vector((0,yy,0));o.data.materials.append(rubber)
            for p in o.data.polygons:p.use_smooth=True
        cylinder(tag+' foot fitting',b+Vector((-sx*.014,0,.035)),.023,.045,black,b-a,parts['landing'])
    a=legs[sx,-1][0].lerp(legs[sx,-1][1],.45);b=legs[sx,1][0].lerp(legs[sx,1][1],.45)
    beam('side crossbar '+str(sx),a,b,.013,carbon,parts['landing'])
    for p in (a,b):
        cylinder('T clamp '+str((sx,p.y)),p,.022,.050,black,(0,1,0),parts['landing'])
        bolt('T clamp pin '+str((sx,p.y)),p+Vector((sx*.023,0,0)),(sx,0,0),parts['landing'])
    box('container U bracket '+str(sx),(sx*.333,0,.385),(.036,.112,.036),black,parts['landing'],.006)
    for yy in (-.044,.044):bolt('U bracket fastening '+str((sx,yy)),(sx*.350,yy,.387),(sx,0,0),parts['landing'])
# One closed longitudinal screw-feed housing; motor forward, disc backward.
feed=parts['feeder'];box('feed throat',(0,0,.239),(.35,.34,.104),black,feed,.012)
cylinder('longitudinal screw shell',(0,.005,.212),.092,.50,black,(0,1,0),feed,64,.003)
for sy in (-1,1):
    cylinder('feed end flange '+str(sy),(0,sy*.245,.212),.098,.024,alloy,(0,1,0),feed,64)
    for i in range(8):
        a=i*math.tau/8;bolt('feed flange '+str((sy,i)),(.084*math.cos(a),sy*.260,.212+.084*math.sin(a)),(0,sy,0),feed)
for i in range(11):box('molded shell rib '+str(i),(0,-.18+i*.035,.269),(.355,.006,.040),black,feed,.0015)
cylinder('front screw drive',(0,-.320,.211),.042,.125,black,(0,1,0),feed)
for i in range(12):
    a=i*math.tau/12;beam('drive flute '+str(i),(.042*math.cos(a),-.37,.211+.042*math.sin(a)),(.042*math.cos(a),-.280,.211+.042*math.sin(a)),.003,alloy,feed)
cylinder('drive socket',(0,-.389,.211),.020,.023,alloy,(0,1,0),feed)
disc=parts['disc'];disc.location=(0,.350,.214);disc['animation_role']='spreader_spin';disc['axis_in_blender']='Y';disc['axis_in_gltf']=[0,0,-1]
cylinder('vertical broadcast disc',(0,0,0),.138,.015,black,(0,1,0),disc,96)
cylinder('disc motor',(0,.392,.214),.042,.081,black,(0,1,0),feed,48,.002)
cylinder('disc motor cap',(0,.437,.214),.030,.012,alloy,(0,1,0),feed)
for i in range(12):
    a=i*math.tau/12
    o=box('radial vane '+str(i),(.105*math.cos(a),.012,.105*math.sin(a)),(.058,.019,.006),black,disc,.001);o.rotation_euler.y=-a
    bolt('disc vane '+str(i),(.122*math.cos(a),.025,.122*math.sin(a)),(0,1,0),disc)
    o=box('disc cooling rib '+str(i),(.043*math.cos(a),.400,.214+.043*math.sin(a)),(.008,.063,.002),alloy,feed,.0004);o.rotation_euler.y=-a
for sx in (-1,1):
    o=mesh('outlet baffle '+str(sx),[(sx*.06,.315,.34),(sx*.148,.323,.32),(sx*.159,.370,.255),(sx*.105,.417,.23)],[(0,1,2,3)],black,feed,.001)
    s=o.modifiers.new('Baffle thickness','SOLIDIFY');s.thickness=.004
# Exterior connector hub, radar sensor and service leads.
wire=parts['wiring'];hub=box('connector hub',(0,.339,.544),(.101,.030,.059),black,wire,.005);hub.rotation_euler.x=-.437
for xx in (-.035,0,.035):cylinder('hub connector '+str(xx),(xx,.361,.549),.006,.010,alloy,(0,1,0),wire)
for xx in (-.042,.042):bolt('hub mount '+str(xx),(xx,.366,.566),(0,1,0),wire)
cable('disc cable',[(.035,.361,.549),(.080,.357,.410),(.067,.355,.285),(.045,.402,.235)],.003,wire)
cable('feeder cable',[(-.035,.361,.549),(-.09,.343,.35),(-.15,.25,.30),(-.15,-.25,.27),(0,-.32,.25)],.003,wire)
cable('payload cable',[(0,.363,.56),(.07,.36,.605),(.09,.24,.68),(.11,.06,.718)],.0035,wire)
box('radar level sensor',(0,.127,.562),(.047,.044,.019),black,wire,.005)
box('service-warning label',(.073,.322,.537),(.018,.001,.035),yellow,wire,.001)
# Identification plate lies on the broad side, following the local hopper slope.
plate=box('identification plate',(.445,-.15,.54),(.001,.090,.034),ink,parts['hopper'],.001)
plate.rotation_euler.y=.795
def camera(name,loc,target,scale):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=scale;return o
target=(0,0,-.38)
for view,loc,scale in [('oblique',(1.7,-2.6,1.04),1.65),('front',(0,-3,.02),1.48),('rear',(0,3,.02),1.48),('side',(3,0,.02),1.48),('top',(0,0,3),1.48)]:
    o=camera('RevoCast | camera '+view,loc,target,scale);scene['camera_'+view]=o.name
scene.camera=bpy.data.objects[scene['camera_oblique']]
floor=mat('Studio white',(.86,.88,.89),rough=.7)
d=bpy.data.meshes.new('Studio ground');d.from_pydata([(-200,-200,-.744),(200,-200,-.744),(200,200,-.744),(-200,200,-.744)],[],[(0,1,2,3)])
o=bpy.data.objects.new('RevoCast | studio floor',d);studio.objects.link(o);d.materials.append(floor)
for name,loc,power,size in [('key',(-2,-3,4),650,3),('fill',(3,-1,2),300,2.5),('rim',(0,3,3),600,2)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new('RevoCast | '+name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('RevoCast | neutral world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.80,.83,.86,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.25
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2;scene.cycles.glossy_bounces=2
scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene['revision']='revocast-5-v01';scene['model_collection']=model.name;scene['model_root']=root.name
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();points=[];triangles=0
for o in model.objects:
    if o.type not in ('MESH','CURVE','FONT'):continue
    ev=o.evaluated_get(dg);data=ev.to_mesh();data.calc_loop_triangles();triangles+=len(data.loop_triangles)
    points.extend(o.matrix_world@v.co for v in data.vertices);ev.to_mesh_clear()
lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)];dims=[(hi[i]-lo[i])*1000 for i in range(3)]
assert all(abs(a-b)<1 for a,b in zip(dims,[1119,1012,743])),dims
# Separate web copy; editable master curves and labels are retained.
web=bpy.data.scenes.new('RevoCast 5 | WEB');wc=bpy.data.collections.new('RevoCast 5 | WEB MODEL');web.collection.children.link(wc);mapping={}
for o in model.objects:
    c=o.copy()
    if o.data:c.data=o.data.copy()
    wc.objects.link(c);mapping[o]=c
for a,c in mapping.items():c.parent=mapping.get(a.parent);c.matrix_parent_inverse=a.matrix_parent_inverse.copy();c.matrix_basis=a.matrix_basis.copy()
bpy.context.window.scene=web;bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=mapping[root]
bpy.ops.object.convert(target='MESH')
# Join only static siblings of the same material; keep all lid/disc pivots intact.
groups={}
for o in list(wc.objects):
    if o.type=='MESH':groups.setdefault((o.parent,tuple(o.data.materials)),[]).append(o)
for (parent,materials),objects in groups.items():
    if len(objects)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    objects[0].name=(parent.name if parent else 'RevoCast')+' | '+materials[0].name
bpy.ops.export_scene.gltf(filepath=str(OUT/'revocast-5-v01-uncompressed.glb'),export_format='GLB',use_active_scene=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
bpy.context.window.scene=scene;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'revocast-5-v01.blend'))
report={'revision':'v01','model':'M4RCP115BH','dimensions_mm':dims,'nominal_dimensions_mm':[1119,1012,743],'triangles_before_compression':triangles,'objects':len(model.objects),'lid_pivots':[o.name for o in lid_roots],'spreader_pivot':disc.name,'spreader_axis_blender':[0,1,0],'spreader_axis_gltf':[0,0,-1],'attachment_root':root.name,'origin':'Top alignment plane at Z=0; front -Y; geometry below plane','limitations':['Exterior photo reconstruction, not factory CAD','Small coordinates estimated','No verified useful internal volume','Aircraft fit and clearance need separate mounting QA','No operational animation or RPM simulation shipped']}
(OUT/'model-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('REVOCAST_RESULT',json.dumps(report),flush=True)
if '--render' in sys.argv:
    for view in ('oblique','front','rear','side','top'):
        scene.camera=bpy.data.objects[scene['camera_'+view]];scene.render.filepath=str(OUT/f'preview-{view}.png');bpy.ops.render.render(write_still=True)
    scene.camera=bpy.data.objects[scene['camera_oblique']]
