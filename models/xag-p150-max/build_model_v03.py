"""Final exterior study. Reuses the preserved v02 builder, then rebuilds audited forms.

Independent v03 scene; dimensions other than rotor layout are photographic estimates.
Run in Blender. Does not modify existing v01/v02 scenes or the website.
"""
from pathlib import Path
import bpy
import math
from mathutils import Vector

OUT = Path(__file__).resolve().parent
if any(s.get('revision') == 'v03' for s in bpy.data.scenes):
    raise RuntimeError('A v03 scene already exists. Keep it safe; use a fresh file to rebuild.')
source = (OUT / 'build_model_v02.py').read_text(encoding='utf-8')
source = source.replace('v02', 'v03').replace('V02', 'V03')
source = source.replace('revision 02', 'revision 03').replace('revision 01', 'earlier revisions')
source = source.replace('02 — refined photo reconstruction', '03 — final exterior study')
namespace = {'__file__': str(OUT / 'build_model_v03.py')}
exec(compile(source, str(OUT / 'build_model_v02.py'), 'exec'), namespace)
globals().update({k: v for k, v in namespace.items() if k not in {'__file__', '__builtins__'}})

def remove_named(*parts):
    # Only newly generated v03 objects, never objects from older scenes.
    for obj in list(model.objects):
        if any(part in obj.name for part in parts):
            bpy.data.objects.remove(obj, do_unlink=True)

def capsule(name, centre, half_length, radius, material):
    # Fully closed rounded rubber foot; tube end caps would remain flat/open.
    profile=[]
    for i in range(7):
        angle=i*math.pi/12
        profile.append((-half_length-radius*math.cos(angle),max(.0001,radius*math.sin(angle))))
    for i in range(6,-1,-1):
        angle=i*math.pi/12
        profile.append((half_length+radius*math.cos(angle),max(.0001,radius*math.sin(angle))))
    rings=[[(centre.x+r*math.cos(j*math.tau/32),centre.y+y,centre.z+r*math.sin(j*math.tau/32)) for j in range(32)] for y,r in profile]
    return loft(name,rings,material,0,True)

remove_named('Tank |', 'Chassis | contoured carry handle', 'Chassis | grip sleeve',
             'Chassis | fine cooling fin', 'Chassis | upper alloy plate')

# Flatter molded sidewalls, distinct shoulders, centre recess and lower front sump.
# Front of aircraft is -Y. Broad panels deliberately retain molded planar transitions.
stations = [
    (-.525,.323,.456,-.133,.144),(-.502,.308,.478,-.185,.205),
    (-.445,.290,.487,-.216,.249),(-.355,.273,.487,-.237,.277),
    (-.255,.245,.475,-.255,.283),(-.190,.213,.440,-.263,.270),
    (-.115,.158,.387,-.269,.252),(0,.145,.382,-.270,.250),
    (.115,.158,.387,-.269,.252),(.190,.213,.440,-.263,.270),
    (.255,.245,.475,-.255,.283),(.355,.273,.487,-.237,.277),
    (.445,.290,.487,-.216,.249),(.502,.308,.478,-.185,.205),
    (.525,.323,.456,-.133,.144)]
rings = []
for x, bottom, top, front, back in stations:
    assert top-bottom>.114, 'Tank shoulder profile must not cross itself.'
    rings.append([(x,y,z) for y,z in [
        (front+.049,bottom),(front+.009,bottom+.031),
        (front,bottom+.066),(front,top-.041),(front+.025,top-.010),
        (front+.060,top),(back-.044,top),(back-.009,top-.018),
        (back,top-.053),(back,bottom+.061),(back-.021,bottom+.015),
        (back-.062,bottom)]])
tank = loft('Tank | molded planar saddle and sump',rings,white,.006,False)
text('Tank | raised XAG relief','XAG',(0,-.271,.247),.069,emboss)
white.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.66,.685,.645,1)
white.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.43
lid.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.004,.006,.005,1)
lid.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.48
lid.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value=.08
lid.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.025
for sx in [-1,1]:
    x, y = sx*.355, .008
    cylinder('Tank | molded neck shoulder',(x,y,.487),.113,.012,white)
    cylinder('Tank | neck seating ring',(x,y,.495),.104,.010,polymer)
    cylinder('Tank | smoked cap barrel',(x,y,.507),.103,.018,lid)
    cylinder('Tank | recessed smoked cap face',(x,y,.517),.098,.004,lid)
    # An open ring, not an opaque disc obscuring the smoked lid.
    points=[(x+.102*math.cos(i*math.tau/64),y+.102*math.sin(i*math.tau/64),.519) for i in range(65)]
    tube('Tank | raised cap outer rim',points,.0022,polymer,False)
    cylinder('Tank | red bayonet release',(x,y,.522),.030,.007,red)
    box('Tank | red release grip',(x,y,.529),(.044,.012,.008),red,.002)
    for t in [math.pi/4,3*math.pi/4,5*math.pi/4,7*math.pi/4]:
        tube('Tank | cap reinforcement spoke',[(x+r*math.cos(t),y+r*math.sin(t),.520) for r in [.035,.080,.098]],.0018,polymer,False)
    for i in range(20):
        t=i*math.tau/20
        rib=box('Tank | cap rim molded grip',(x+.102*math.cos(t),y+.102*math.sin(t),.507),(.006,.009,.014),polymer,.001)
        rib.rotation_euler.z=t
    cylinder('Tank | outlet neck',(sx*.14,.025,.174),.019,.025,polymer)

# Lengthen the central assembly ONLY; keep motor stations/arm endpoints unchanged.
for obj in model.objects:
    if 'Chassis |' not in obj.name:
        continue
    if obj.type == 'MESH':
        obj.location.y = .045+(obj.location.y-.045)*1.30
        obj.scale.y *= 1.30
    if 'battery' in obj.name or 'side service panel' in obj.name:
        obj.location.z -= .015
        obj.scale.z *= .88
    if 'exposed silver rail' in obj.name:
        obj.location.z -= .022
    for name, centre_y, length, original_length in [
        ('battery',.087,.460,.315),('side service panel',.090,.460,.287),
        ('lower equipment tray',.070,.570,.370),
        ('exposed silver rail',.100,.440,.270),('lower mounting rail',.075,.540,.365)]:
        if name in obj.name:
            obj.location.y=centre_y
            obj.scale.y=length/original_length

light_panel=mat('Light grey equipment enclosure',(.59,.615,.62),.22,.39)
box('Chassis | pale upper equipment housing',(0,.098,.638),(.244,.460,.038),light_panel,.005)
box('Chassis | silver upper cover',(0,.098,.660),(.241,.455,.007),silver,.002)
for sx in [-1,1]:
    box('Chassis | black longitudinal top rail',(sx*.108,.098,.668),(.019,.438,.014),polymer,.002)
for centre in [-.029,.155]:
    for i in range(12):
        box('Chassis | silver heat sink fin',(0,centre+(i-5.5)*.007,.672),(.154,.0025,.015),silver,.0005)
box('Chassis | upper service bridge',(0,.065,.678),(.181,.030,.012),light_panel,.003)
text('Chassis | upper XAG marking','XAG',(0,.057,.685),.017,polymer,(0,0,0))
for sx in [-1,1]:
    for yy in [-.080,.25]:
        bolt('Chassis | cover screw',(sx*.096,yy,.665),r=.0026)
    # Extruded angular molded profile, not a bent round metal tube.
    outline=[(-.125,.596),(-.098,.641),(.005,.725),(.053,.731),
             (.318,.695),(.365,.675),(.357,.650),(.310,.672),
             (.053,.707),(.020,.703),(-.076,.622),(-.099,.580)]
    width=.028
    vs=[(sx*.157+xx,y,z) for xx in [-width/2,width/2] for y,z in outline]
    n=len(outline)
    fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    fs += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh('Chassis | angular long carry handle',vs,fs,polymer,.004)
    beam('Chassis | long rubber handle grip',(sx*.157,.095,.710),(sx*.157,.301,.683),.019,rubber)
    box('Chassis | rear handle foot',(sx*.157,.337,.640),(.046,.050,.041),polymer,.004)
    for yy, zz in [(-.104,.616),(.337,.650)]:
        bolt('Chassis | handle mounting pin',(sx*.175,yy,zz),(sx,0,0),.004)

# Narrow the swollen front shell while preserving its distinctive long ridge.
for obj in model.objects:
    if 'Nose | sculpted red' in obj.name:
        for v in obj.data.vertices:
            v.co.x *= .94
            v.co.z = .565+(v.co.z-.565)*.86
    elif 'Nose | narrow centre ridge' in obj.name or 'Nose | side contour' in obj.name:
        for spline in obj.data.splines:
            for p in spline.bezier_points:
                p.co.z=.565+(p.co.z-.565)*.86
                p.handle_left.z=.565+(p.handle_left.z-.565)*.86
                p.handle_right.z=.565+(p.handle_right.z-.565)*.86

# Dark low-gloss composite; alternate blade handedness for counter-rotating pairs.
carbon.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.003,.004,.005,1)
carbon.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.59
carbon.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.055
alloy.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.35
alloy.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.42
polymer.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.50
polymer.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.15
for rotor in rotor_roots:
    orientation=rotor.rotation_euler.to_quaternion()
    rotor.rotation_mode='QUATERNION'
    rotor.rotation_quaternion=orientation
    direction=1 if ('L_FRONT' in rotor.name or 'R_REAR' in rotor.name) else -1
    rotor['animation_role']='propeller_spin'
    rotor['spin_direction']=direction
    rotor['blender_local_spin_axis']='Z'
    rotor['gltf_local_spin_axis']='Y'
    rotor['speed_note']='Presentation animation only; not verified operational RPM.'
    if direction<0:
        for obj in model.objects:
            ancestor=obj.parent
            while ancestor and ancestor!=rotor:
                ancestor=ancestor.parent
            if ancestor==rotor and ('swept carbon blade' in obj.name or 'blade root chevron' in obj.name):
                for v in obj.data.vertices:
                    v.co.y *= -1
                bm=bmesh.new(); bm.from_mesh(obj.data)
                bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
                bm.to_mesh(obj.data); bm.free()

# Keep the specified overall height after lowering the central upper assembly.
# Extend landing struts, not antennas or rotors. Ground contact stays at the same Z.
remove_named('landing strut','upper leg casting','leg clamp','clamp screw',
             'rubber capsule foot','foot fitting','Landing |')
root.location.z=.03475
legs={}
for sx in [-1,1]:
    for sy in [-1,1]:
        tag=('L' if sx<0 else 'R')+('_FRONT' if sy<0 else '_REAR')
        top=Vector((sx*.19,sy*.151,.499))
        foot=Vector((sx*.325,sy*.343,-.00775))
        legs[sx,sy]=(top,foot)
        beam(tag+' | landing strut',top,foot,.021)
        cylinder(tag+' | upper leg casting',top.lerp(foot,.065),.027,.086,polymer,foot-top)
        for t in [.54,.78]:
            cylinder(tag+' | leg clamp',top.lerp(foot,t),.024,.027,polymer,foot-top)
            bolt(tag+' | clamp screw',top.lerp(foot,t)+Vector((0,-.024,0)),(0,-1,0),.003)
        capsule(tag+' | rubber capsule foot',foot,.036,.025,rubber)
        for along in [-.026,.026]:
            bolt(tag+' | foot fitting',(foot.x,foot.y+along,foot.z+.026),r=.003)
for sx in [-1,1]:
    a=legs[sx,-1][0].lerp(legs[sx,-1][1],.61)
    b=legs[sx,1][0].lerp(legs[sx,1][1],.61)
    beam('Landing | side crossbar '+str(sx),a,b,.013)
    for point in [a,b]:
        cylinder('Landing | crossbar joint',point,.024,.030,polymer,(0,1,0))
        bolt('Landing | crossbar pin',point+Vector((sx*.025,0,0)),(sx,0,0),.004)

# Reposition cameras to a product-view angle and reduce bleaching reflections.
camera_main=bpy.data.objects[scene['camera_three_quarter']]
camera_main.location=(3.6,-6,3.0)
camera_main.rotation_euler=(Vector((0,0,.38))-camera_main.location).to_track_quat('-Z','Y').to_euler()
camera_main.data.ortho_scale=3.48
camera_front=bpy.data.objects[scene['camera_front']]
camera_front.location=(0,-6,2.12)
camera_front.rotation_euler=(Vector((0,0,.38))-camera_front.location).to_track_quat('-Z','Y').to_euler()
bpy.data.objects[scene['camera_top']].data.ortho_scale=4.35
scene['camera_rear']=camera('Camera rear',(-3.8,6,2.4),(0,0,.38),3.5).name
scene['camera_detail']=camera('Camera centre detail',(1.1,-1.7,1.15),(0,.025,.47),1.35).name
for obj in studio.objects:
    if obj.type=='LIGHT':
        if 'Key' in obj.name: obj.data.energy=850; obj.data.size=3.2
        if 'Fill' in obj.name: obj.data.energy=260
        if 'Rim' in obj.name: obj.data.energy=850
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.14
scene.render.resolution_x=1400
scene.render.resolution_y=1050
scene.cycles.samples=40
scene['revision']='v03'
root['revision']='03 — final photo-based exterior'
root['model_status']='Final exterior for website preparation; not factory CAD.'
scene.name='P150 MAX | v03 final RevoSpray'
for material in bpy.data.materials:
    if material.name.startswith('v03 |') and material.use_nodes:
        shader=material.node_tree.nodes.get('Principled BSDF')
        if shader: material.diffuse_color=shader.inputs['Base Color'].default_value
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-v03.blend'))
result={'scene':scene.name,'model_objects':len(model.objects),'rotor_pivots':len(rotor_roots),'blend':str(OUT/'xag-p150-max-v03.blend')}
