"""P150 MAX RevoSpray exterior reconstruction, revision 02.

Run in Blender. Creates an independent scene and preserves revision 01.
Metres; motor diagonal and rotor diameter follow the XAG specification.
Other dimensions remain photo estimates, not production CAD measurements.
"""
import bpy
import bmesh
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
if bpy.context.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')
scene = bpy.data.scenes.new('P150 MAX | v02 refined RevoSpray')
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
model = bpy.data.collections.new('P150 v02 | MODEL')
studio = bpy.data.collections.new('P150 v02 | STUDIO')
scene.collection.children.link(model)
scene.collection.children.link(studio)
root = bpy.data.objects.new('P150_V02_ROOT', None)
model.objects.link(root)
root['revision'] = '02 — refined photo reconstruction'
root['motor_diagonal_m'] = 2.335
root['nominal_rotor_diameter_m'] = 1.600
root['reference_height_m'] = .767
root['tank_capacity_verified'] = False
root['accuracy'] = 'Photo-based exterior; estimated small dimensions and internal construction.'

def mat(name, rgb, metal=0, rough=.4):
    m=bpy.data.materials.new('v02 | '+name)
    m.diffuse_color=(*rgb,1)
    m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Metallic'].default_value=metal
    p.inputs['Roughness'].default_value=rough
    return m

alloy=mat('Anodised graphite',(.012,.016,.021),.72,.3)
polymer=mat('Injection molded black',(.009,.012,.014),.02,.4)
rubber=mat('Rubber feet and grips',(.008,.009,.011),0,.65)
red=mat('XAG red painted shell',(.47,.003,.006),.05,.25)
red.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value=.18
white=mat('Molded HDPE tank',(.73,.755,.70),0,.34)
white.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value=.025
silver=mat('Brushed aluminium edges',(.38,.40,.43),.86,.3)
steel=mat('Steel hardware',(.15,.17,.19),.85,.26)
carbon=mat('Carbon composite blades',(.008,.011,.013),.035,.48)
carbon.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.12
anisotropy=carbon.node_tree.nodes['Principled BSDF'].inputs.get('Anisotropic IOR Level') or carbon.node_tree.nodes['Principled BSDF'].inputs.get('Anisotropic')
if anisotropy is not None:
    anisotropy.default_value=.3
ivory=mat('White print',(.82,.84,.8),0,.4)
yellow=mat('Warning labels',(.95,.66,.025),0,.48)
glass=mat('FPV optical glass',(.006,.021,.032),.6,.1)
lid=mat('Dark translucent filler caps',(.014,.018,.014),0,.45)
lid.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value=.05
lid.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.2
emboss=mat('Tank relief lettering',(.65,.68,.625),0,.4)
for material,scale,strength,distance in [(white,190,.13,.00015),(carbon,380,.10,.00006),(rubber,100,.18,.0002)]:
    nodes=material.node_tree.nodes
    noise=nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value=scale
    noise.inputs['Detail'].default_value=2
    bump=nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value=strength
    bump.inputs['Distance'].default_value=distance
    material.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
    material.node_tree.links.new(bump.outputs['Normal'],nodes['Principled BSDF'].inputs['Normal'])

def mesh(name, vs, fs, material, bevel=0, smooth=False, collection=model, parent=root):
    d=bpy.data.meshes.new('v02 '+name)
    d.from_pydata(vs,[],fs)
    d.update()
    bm=bmesh.new()
    bm.from_mesh(d)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(d)
    bm.free()
    o=bpy.data.objects.new('v02 | '+name,d)
    collection.objects.link(o)
    o.parent=parent
    d.materials.append(material)
    for p in d.polygons:
        p.use_smooth=smooth
    if bevel:
        m=o.modifiers.new('Manufactured edge radius','BEVEL')
        m.width=bevel
        m.segments=3
        m=o.modifiers.new('Weighted hard surface normals','WEIGHTED_NORMAL')
        m.keep_sharp=True
    return o

def box(name,loc,dims,material=alloy,bevel=.004):
    vs=[(sx*dims[0]/2,sy*dims[1]/2,sz*dims[2]/2) for sx,sy,sz in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    fs=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    o=mesh(name,vs,fs,material,bevel)
    o.location=loc
    return o

def cylinder(name,loc,radius,depth,material=alloy,direction=(0,0,1),sides=40):
    vs=[(radius*math.cos(i*math.tau/sides),radius*math.sin(i*math.tau/sides),z) for z in [-depth/2,depth/2] for i in range(sides)]
    fs=[tuple(reversed(range(sides))),tuple(range(sides,2*sides))]
    fs += [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    o=mesh(name,vs,fs,material,.0012,True)
    o.data.polygons[0].use_smooth=o.data.polygons[1].use_smooth=False
    o.location=loc
    o.rotation_mode='QUATERNION'
    o.rotation_quaternion=Vector(direction).to_track_quat('Z','Y')
    return o

def beam(name,a,b,r,material=alloy):
    a,b=Vector(a),Vector(b)
    return cylinder(name,(a+b)/2,r,(b-a).length,material,b-a)

def tube(name,points,r,material=rubber,curved=True):
    d=bpy.data.curves.new('v02 '+name,'CURVE')
    d.dimensions='3D'
    d.resolution_u=6
    d.bevel_depth=r
    d.bevel_resolution=3
    s=d.splines.new('BEZIER' if curved else 'POLY')
    if curved:
        s.bezier_points.add(len(points)-1)
        for p,v in zip(s.bezier_points,points):
            p.co=v
            p.handle_left_type=p.handle_right_type='AUTO'
    else:
        s.points.add(len(points)-1)
        for p,v in zip(s.points,points):
            p.co=(*v,1)
    o=bpy.data.objects.new('v02 | '+name,d)
    model.objects.link(o)
    o.parent=root
    d.materials.append(material)
    return o

def text(name,body,loc,size,material=ivory,rotation=(math.pi/2,0,0),parent=root):
    d=bpy.data.curves.new('v02 '+name,'FONT')
    d.body=body
    d.align_x='CENTER'
    d.size=size
    d.extrude=.00015
    o=bpy.data.objects.new('v02 | '+name,d)
    model.objects.link(o)
    o.parent=parent
    o.location=loc
    o.rotation_euler=rotation
    d.materials.append(material)
    return o

def bolt(name,loc,direction=(0,0,1),r=.0035):
    return cylinder(name,loc,r,.003,steel,direction,sides=6)

def loft(name,rings,material,bevel=.005,smooth=False):
    n=len(rings[0])
    vs=[v for ring in rings for v in ring]
    fs=[tuple(reversed(range(n)))]
    for j in range(len(rings)-1):
        fs += [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for i in range(n)]
    fs.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
    return mesh(name,vs,fs,material,bevel,smooth)

def hollow_bracket(name,cx,cy,z,material=alloy):
    outer=[(-.034,0),(.034,0),(.019,-.076),(-.019,-.076)]
    inner=[(-.022,-.018),(.022,-.018),(.011,-.058),(-.011,-.058)]
    vs=[(cx+x,cy+y,z+zz) for y in [-.007,.007] for ring in [outer,inner] for x,zz in ring]
    fs=[]
    for i in range(4):
        j=(i+1)%4
        fs.extend([(i,j,j+4,i+4),(i+8,i+12,j+12,j+8),(i,i+8,j+8,j),(i+4,j+4,j+12,i+12)])
    return mesh(name,vs,fs,material,.002)

# A connected saddle tank with raised lobes, low centre channel and deep front sump.
stations=[(-.525,.325,.421,-.14,.13),(-.50,.29,.455,-.20,.20),(-.44,.275,.478,-.245,.245),(-.355,.252,.482,-.27,.265),(-.25,.222,.474,-.29,.25),(-.175,.19,.444,-.305,.24),(-.12,.17,.386,-.316,.23),(0,.155,.38,-.32,.23),(.12,.17,.386,-.316,.23),(.175,.19,.444,-.305,.24),(.25,.222,.474,-.29,.25),(.355,.252,.482,-.27,.265),(.44,.275,.478,-.245,.245),(.50,.29,.455,-.20,.20),(.525,.325,.421,-.14,.13)]
rings=[]
for x,bottom,top,front,back in stations:
    rings.append([(x,y,z) for y,z in [(front+.065,bottom),(front+.018,bottom+.035),(front,bottom+.08),(front,top-.065),(front+.022,top-.025),(front+.07,top),(back-.06,top),(back-.015,top-.025),(back,top-.065),(back,bottom+.075),(back-.035,bottom+.025),(back-.09,bottom)]])
tank=loft('Tank | stepped saddle with centre recess',rings,white,.009,True)
for vertex in tank.data.vertices:
    vertex.co.y *= .8
text('Tank | raised XAG relief','XAG',(0,-.257,.26),.065,emboss)
for sx in [-1,1]:
    x=sx*.355
    cylinder('Tank | molded filler shoulder',(x,-.012,.481),.117,.014,white)
    cylinder('Tank | neck seam',(x,-.012,.49),.106,.009,emboss)
    cylinder('Tank | translucent cap rim',(x,-.012,.506),.105,.025,lid)
    cylinder('Tank | cap top plate',(x,-.012,.519),.102,.006,lid)
    cylinder('Tank | nested red cap',(x,-.012,.526),.031,.008,red)
    box('Tank | cap release grip',(x,-.012,.534),(.042,.011,.009),red,.003)
    for i in range(16):
        t=i*math.tau/16
        o=box('Tank | cap perimeter rib',(x+.103*math.cos(t),-.012+.103*math.sin(t),.507),(.009,.012,.022),polymer,.0015)
        o.rotation_euler.z=t
    tube('Tank | shoulder crease',[(sx*.17,-.2448,.33),(sx*.27,-.232,.377),(sx*.41,-.2048,.434)],.003,white)
    tube('Tank | bottom molded seam',[(sx*.03,-.204,.159),(sx*.16,-.2056,.185),(sx*.31,-.168,.255),(sx*.49,-.1144,.302)],.0028,white)
    cylinder('Tank | outlet neck',(sx*.14,.02,.177),.019,.029,polymer)

# Low, mechanically exposed centre chassis instead of a monolithic battery cube.
box('Chassis | lower equipment tray',(0,.025,.465),(.337,.37,.032),alloy,.004)
box('Chassis | battery',(0,.045,.601),(.235,.315,.122),polymer,.009)
box('Chassis | upper alloy plate',(0,.047,.668),(.26,.313,.013),alloy,.004)
for sx in [-1,1]:
    box('Chassis | side service panel',(sx*.128,.05,.596),(.018,.287,.115),polymer,.004)
    box('Chassis | exposed silver rail',(sx*.141,.052,.659),(.012,.27,.022),silver,.002)
    box('Chassis | lower mounting rail',(sx*.17,.045,.49),(.018,.365,.029),alloy,.003)
    for yy in [-.097,.015,.185]:
        for zz in [.562,.635]:
            bolt('Chassis | side panel screw',(sx*.139,yy,zz),(sx,0,0))
    tube('Chassis | contoured carry handle',[(sx*.154,-.095,.635),(sx*.154,-.015,.723),(sx*.154,.08,.747),(sx*.154,.206,.721),(sx*.154,.241,.698)],.018,polymer,False)
    tube('Chassis | grip sleeve',[(sx*.154,.082,.747),(sx*.154,.20,.722)],.022,rubber,False)
    cylinder('Chassis | GNSS antenna',(sx*.201,-.10,.655),.019,.161,polymer)
    cylinder('Chassis | antenna collar',(sx*.201,-.10,.582),.027,.024,alloy)
    for yy in [-.13,.19]:
        bolt('Chassis | mounting screw',(sx*.173,yy,.509),r=.005)
for i in range(22):
    box('Chassis | fine cooling fin',(0,-.065+i*.010,.68),(.18,.0038,.013),alloy,.0007)
text('Chassis | side product marking','XAG P150 MAX',(.14,.045,.599),.012,ivory,(math.pi/2,0,math.pi/2))
for sx in [-1,1]:
    tube('Chassis | exposed power cable',[(sx*.12,.19,.60),(sx*.18,.16,.55),(sx*.16,.05,.474)],.0045,rubber)

# Rounded, long red cowling, visible longitudinal spine and front face.
nose=[]
for y,w,lo,hi in [(-.365,.045,.566,.607),(-.348,.053,.565,.626),(-.29,.066,.57,.651),(-.19,.069,.584,.674),(-.11,.058,.602,.681),(-.075,.044,.615,.674)]:
    nose.append([(-w,y,lo),(-w,y,hi-.018),(-w*.7,y,hi-.004),(0,y,hi),(w*.7,y,hi-.004),(w,y,hi-.018),(w,y,lo)])
loft('Nose | sculpted red aerodynamic shell',nose,red,.004,True)
tube('Nose | narrow centre ridge',[(0,-.347,.627),(0,-.29,.653),(0,-.19,.676),(0,-.11,.683)],.0012,red)
for sx in [-1,1]:
    tube('Nose | side contour',[(sx*.048,-.348,.599),(sx*.064,-.29,.623),(sx*.062,-.19,.652)],.0015,red)
box('Nose | inset badge face',(0,-.367,.588),(.074,.004,.028),polymer,.003)
text('Nose | XAG badge','XAG',(0,-.3695,.582),.012)
cylinder('Nose | transverse radar barrel',(0,-.31,.522),.042,.248,polymer,(1,0,0))
for sx in [-1,1]:
    cylinder('Nose | radar rounded end',(sx*.124,-.31,.522),.040,.014,polymer,(1,0,0))
    box('Nose | radar mount',(sx*.079,-.272,.52),(.025,.071,.018),alloy,.003)
bolt('Nose | sensor mounting screw',(-.105,-.348,.51),(0,-1,0),.0026)
cylinder('Nose | camera bezel',(-.091,-.350,.537),.010,.012,yellow,(0,-1,0))
cylinder('Nose | camera lens',(-.091,-.357,.537),.0075,.007,glass,(0,-1,0))
cylinder('Nose | camera status LED',(-.091,-.350,.514),.003,.01,ivory,(0,-1,0))

station=2.335/(2*math.sqrt(2))
arm_roots=[]
rotor_roots=[]
for sx in [-1,1]:
    for sy in [-1,1]:
        tag=('L' if sx<0 else 'R')+('_FRONT' if sy<0 else '_REAR')
        a=Vector((sx*.168,sy*.137,.537))
        b=Vector((sx*station,sy*station,.558))
        delta=b-a
        u=delta.normalized()
        tangent=Vector((-u.y,u.x,0)).normalized()
        angle=math.atan2(delta.y,delta.x)
        hinge=a+delta*.32
        beam(tag+' | inner arm',a,hinge,.026)
        cylinder(tag+' | root casting',a+delta*.022,.039,.068,alloy,delta)
        cylinder(tag+' | root ring',a+delta*.073,.032,.014,polymer,delta)
        cylinder(tag+' | inner hinge flange',hinge-u*.018,.040,.03,alloy,delta)
        cylinder(tag+' | hinge pin',hinge,.010,.093,steel,tangent)
        for direction in [-1,1]:
            bolt(tag+' | hinge axle head',hinge+tangent*direction*.048,tangent*direction,.006)
        before=set(model.objects)
        beam(tag+' | outer aluminium tube',hinge,b-u*.062,.0255)
        cylinder(tag+' | folding socket',hinge+u*.017,.035,.07,polymer,delta)
        for direction in [-1,1]:
            p=hinge+u*.011+tangent*direction*.036
            block=box(tag+' | hinge fork cheek',p,(.08,.015,.065),alloy,.005)
            block.rotation_euler.z=angle
        # A curved over-centre latch with metal pivot and independent red grip.
        latch_points=[hinge-u*.036+Vector((0,0,.030)),hinge-u*.018+Vector((0,0,.052)),hinge+u*.036+Vector((0,0,.054)),hinge+u*.053+Vector((0,0,.037))]
        tube(tag+' | red over-centre lever',latch_points,.009,red,False)
        grip=box(tag+' | folding lever grip',hinge+u*.027+Vector((0,0,.055)),(.043,.023,.012),red,.004)
        grip.rotation_euler.z=angle
        bolt(tag+' | lever pivot',hinge-u*.026+Vector((0,0,.037)),r=.004)
        esc=a+delta*.81+Vector((0,0,.042))
        block=box(tag+' | ESC electronics',esc,(.146,.077,.050),polymer,.005)
        block.rotation_euler.z=angle
        for j in range(17):
            p=esc+u*(j-8)*.007+Vector((0,0,.029))
            fin=box(tag+' | fine ESC fin',p,(.0028,.067,.012),alloy,.0006)
            fin.rotation_euler.z=angle
        for direction in [-1,1]:
            for along in [-.052,.052]:
                bolt(tag+' | ESC fixing',esc+u*along+tangent*direction*.042+Vector((0,0,-.002)),tangent*direction)
        warning=box(tag+' | yellow caution',a+delta*.53+Vector((0,0,.027)),(.074,.018,.001),yellow,.0001)
        warning.rotation_euler.z=angle
        text(tag+' | warning symbols','!  !  !',a+delta*.53+Vector((0,0,.028)),.009,polymer,(0,0,angle))
        tube(tag+' | arm cable loom',[hinge+Vector((0,0,-.015)),a+delta*.62+Vector((0,0,-.019)),b-u*.055+Vector((0,0,-.024))],.0035,rubber)
        pedestal=box(tag+' | motor pedestal',(b.x,b.y,.568),(.069,.088,.10),alloy,.006)
        pedestal.rotation_euler.z=angle
        cylinder(tag+' | motor lower gasket',(b.x,b.y,.599),.066,.008,polymer)
        cylinder(tag+' | motor bell',(b.x,b.y,.626),.066,.046,alloy)
        cylinder(tag+' | motor upper rim',(b.x,b.y,.651),.069,.006,polymer)
        for j in range(18):
            t=j*math.tau/18
            bolt(tag+' | motor rim screw',(b.x+.06*math.cos(t),b.y+.06*math.sin(t),.655),r=.0018)
        for zz in [.614,.627,.640]:
            cylinder(tag+' | motor casing seam',(b.x,b.y,zz),.0665,.0016,polymer)
        hollow_bracket(tag+' | slotted lower guard',b.x,b.y-sy*.023,.527)
        guard=box(tag+' | guard backing',(b.x+sx*.056,b.y,.537),(.019,.063,.063),polymer,.006)
        cover=box(tag+' | red end cap',(b.x+sx*.067,b.y,.537),(.016,.052,.056),red,.007)
        for yy in [-.018,.018]:
            for zz in [.519,.555]:
                bolt(tag+' | red cap screw',(b.x+sx*.077,b.y+yy,zz),(sx,0,0),.002)
        rotor=bpy.data.objects.new('v02 | '+tag+' | ROTOR_ANIMATION_ROOT',None)
        model.objects.link(rotor)
        rotor.parent=root
        rotor.location=(b.x,b.y,.669)
        rotor.rotation_euler.z=math.radians(-45 if sx*sy>0 else 45)
        rotor_roots.append(rotor)
        hub=box(tag+' | propeller bridge',(0,0,0),(.107,.044,.021),alloy,.004)
        hub.parent=rotor
        hub.location=(0,0,0)
        for sign in [-1,1]:
            lug=box(tag+' | folding blade lug',(sign*.036,0,.013),(.023,.039,.031),polymer,.004)
            lug.parent=rotor
            pin=cylinder(tag+' | blade pivot bolt',(sign*.036,0,.017),.0045,.046,steel,(0,1,0),sides=6)
            pin.parent=rotor
            # Closed airfoil mesh with rounded leading edge, thin trailing edge,
            # radial twist, tip rake and a true 0.800 m maximum tip radius.
            blade_before=set(model.objects)
            sections=[(.049,.018,0,.008),(.10,.049,-.004,.009),(.20,.088,-.009,.008),(.32,.100,-.005,.0065),(.48,.080,.003,.005),(.64,.056,.014,.0035),(.756,.030,.020,.0022),(.79,.019,.021,.0015),(.79965,.008,.020,.001)]
            profiles=[(0,0),(.08,.32),(.22,.47),(.4,.5),(.62,.38),(.82,.2),(1,0),(.82,-.13),(.62,-.22),(.4,-.27),(.22,-.25),(.08,-.15)]
            rings=[]
            for radial,chord,sweep,thick in sections:
                twist=math.radians(14-9*radial/.8)
                ring=[]
                for chord_fraction,h in profiles:
                    yy=(chord_fraction-.45)*chord+sweep
                    zz=h*thick+(chord_fraction-.45)*chord*math.sin(twist)+.013*(radial/.8)**2
                    ring.append((sign*radial,sign*yy,zz))
                rings.append(ring)
            blade=loft(tag+' | swept carbon blade '+str(sign),rings,carbon,0,True)
            blade.parent=rotor
            blade.data.materials.append(red if sx*sy<0 else ivory)
            for p in blade.data.polygons:
                if min(p.vertices)>=7*len(profiles):
                    p.material_index=1
            # Printed chevron at the root is geometry, so it survives GLB export.
            def surface_z(radial,yy):
                for left,right in zip(sections,sections[1:]):
                    if left[0]<=radial<=right[0]:
                        factor=(radial-left[0])/(right[0]-left[0])
                        chord,sweep,thick=[left[i]+factor*(right[i]-left[i]) for i in range(1,4)]
                        fraction=(yy-sweep)/chord+.45
                        h=0
                        for p,q in zip(profiles[:7],profiles[1:7]):
                            if p[0]<=fraction<=q[0]:
                                h=p[1]+(fraction-p[0])/(q[0]-p[0])*(q[1]-p[1])
                                break
                        return h*thick+(yy-sweep)*math.sin(math.radians(14-9*radial/.8))+.013*(radial/.8)**2+.0003
                return .005
            stripe=mesh(tag+' | blade root chevron '+str(sign),[(sign*r,sign*y,surface_z(r,y)) for r,y in [(.186,-.032),(.198,-.032),(.238,.025),(.224,.025)]],[(0,1,2,3)],red if sx*sy<0 else ivory)
            stripe.parent=rotor
            marking=text(tag+' | propeller XAG print '+str(sign),'XAG',(sign*.25,sign*.010,surface_z(.25,.010)),.010,red if sx*sy<0 else ivory,(0,0,0 if sign>0 else math.pi),rotor)
            blade_pivot=bpy.data.objects.new('v02 | '+tag+' | BLADE_FOLD_ROOT '+str(sign),None)
            model.objects.link(blade_pivot)
            blade_pivot.parent=rotor
            blade_pivot.location=(sign*.036,0,.017)
            blade_pivot['fold_axis']='local Y; hinge pivot, transport limits not verified'
            for obj in set(model.objects)-blade_before:
                if obj!=blade_pivot and obj.parent==rotor:
                    obj.parent=blade_pivot
                    obj.location-=blade_pivot.location
        # Rear centrifugal atomizers: visible support, casing, disc and hoses.
        if sy>0:
            cylinder(tag+' | atomizer hinge',(b.x,b.y,.526),.022,.065,alloy,(1,0,0))
            beam(tag+' | atomizer stem',(b.x,b.y,.518),(b.x,b.y,.286),.016,polymer)
            for zz in [.485,.371,.305]:
                cylinder(tag+' | atomizer stem collar',(b.x,b.y,zz),.019,.022,alloy)
            cylinder(tag+' | atomizer motor',(b.x,b.y,.286),.024,.046,polymer)
            cylinder(tag+' | atomizer disc',(b.x,b.y,.258),.031,.006,steel)
            cylinder(tag+' | disc centre',(b.x,b.y,.252),.012,.008,polymer)
            tube(tag+' | outer spray hose',[hinge+Vector((0,0,-.02)),a+delta*.67+Vector((0,0,-.025)),b+Vector((-.022,0,-.04)),(b.x-.025,b.y,.292)],.0045,rubber)
        # Every outer arm assembly pivots at its actual folding station.
        arm=bpy.data.objects.new('v02 | '+tag+' | ARM_FOLD_ROOT',None)
        model.objects.link(arm)
        arm.parent=root
        arm.location=hinge
        arm.rotation_mode='QUATERNION'
        arm.rotation_quaternion=tangent.to_track_quat('Z','Y')
        arm['fold_axis']='local Z; prototype pivot, transport limits not verified'
        bpy.context.view_layer.update()
        for obj in set(model.objects)-before:
            if obj!=arm and obj.parent==root:
                world=obj.matrix_world.copy()
                obj.parent=arm
                obj.matrix_world=world
        arm_roots.append(arm)

# Landing frame: stronger upper mounts, clamps, side crossbars, rounded feet.
legs={}
for sx in [-1,1]:
    for sy in [-1,1]:
        tag=('L' if sx<0 else 'R')+('_FRONT' if sy<0 else '_REAR')
        top=Vector((sx*.19,sy*.151,.499))
        foot=Vector((sx*.325,sy*.343,.027))
        legs[sx,sy]=(top,foot)
        beam(tag+' | landing strut',top,foot,.022)
        cylinder(tag+' | upper leg casting',top.lerp(foot,.065),.029,.091,polymer,foot-top)
        for t in [.54,.78]:
            cylinder(tag+' | leg clamp',top.lerp(foot,t),.026,.032,polymer,foot-top)
            bolt(tag+' | clamp screw',top.lerp(foot,t)+Vector((0,-.026,0)),(0,-1,0),.003)
        tube(tag+' | rubber capsule foot',[(foot.x,foot.y-.036,.027),(foot.x,foot.y+.036,.027)],.025,rubber)
        for along in [-.026,.026]:
            bolt(tag+' | foot fitting',(foot.x,foot.y+along,.053),r=.003)
for sx in [-1,1]:
    a=legs[sx,-1][0].lerp(legs[sx,-1][1],.61)
    b=legs[sx,1][0].lerp(legs[sx,1][1],.61)
    beam('Landing | side crossbar '+str(sx),a,b,.013)
    for point in [a,b]:
        cylinder('Landing | crossbar joint',point,.025,.035,polymer,(0,1,0))
        bolt('Landing | crossbar pin',point+Vector((sx*.026,0,0)),(sx,0,0),.004)
for sx in [-1,1]:
    box('Pump | impeller housing',(sx*.116,.065,.201),(.078,.095,.069),polymer,.009)
    cylinder('Pump | side motor',(sx*.116,.101,.198),.023,.055,alloy,(0,1,0))
    tube('Pump | lower supply loop',[(sx*.14,.02,.18),(sx*.17,-.035,.124),(sx*.09,-.053,.124),(sx*.09,.052,.196)],.006,rubber)
    tube('Pump | arm supply line',[(sx*.116,.087,.216),(sx*.16,.12,.38),(sx*.19,.18,.518),(sx*.365,.35,.531)],.0045,rubber)
    cylinder('Pump | hose coupling',(sx*.14,.02,.182),.011,.014,silver)

# Neutral product studio with a ground shadow; none of this enters the GLB.
def camera(name,loc,target,scale):
    d=bpy.data.cameras.new('v02 | '+name)
    o=bpy.data.objects.new(d.name,d)
    studio.objects.link(o)
    o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    d.type='ORTHO'
    d.ortho_scale=scale
    return o
scene.camera=camera('Camera three-quarter',(3.5,-5.8,2.95),(0,0,.39),3.55)
scene['camera_three_quarter']=scene.camera.name
scene['camera_front']=camera('Camera front',(0,-6,2.48),(0,0,.38),3.45).name
scene['camera_side']=camera('Camera side',(6,0,1.35),(0,0,.39),3.45).name
scene['camera_top']=camera('Camera top',(0,0,7),(0,0,.39),3.6).name
floor=mat('Studio porcelain backdrop',(.79,.805,.81),0,.7)
mesh('Studio ground',[(-200,-200,-.003),(200,-200,-.003),(200,200,-.003),(-200,200,-.003)],[(0,1,2,3)],floor,collection=studio,parent=None)
for name,loc,power,size in [('Key',(-3,-4,5),1050,4),('Fill',(4,-1,3),500,3),('Rim',(0,4,4),1400,3)]:
    d=bpy.data.lights.new('v02 | Studio '+name,'AREA')
    d.energy=power
    d.shape='DISK'
    d.size=size
    o=bpy.data.objects.new(d.name,d)
    studio.objects.link(o)
    o.location=loc
    o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('v02 | neutral studio')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.76,.79,.83,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.20
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1500
scene.render.resolution_y=1100
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
try:
    scene.view_settings.look='AgX - Medium High Contrast'
except TypeError:
    pass
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
bpy.context.view_layer.objects.active=root
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=4.0
        area.spaces.active.region_3d.view_location=(0,0,.38)
        area.spaces.active.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion()
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.overlay.show_extras=False
        area.spaces.active.overlay.show_floor=False
        area.spaces.active.overlay.show_relationship_lines=False
        area.spaces.active.region_3d.view_perspective='CAMERA'
scene['model_collection']=model.name
scene['model_root']=root.name
scene['revision']='v02'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-v02.blend'))
result={'scene':scene.name,'model_objects':len(model.objects),'arm_pivots':len(arm_roots),'rotor_pivots':len(rotor_roots),'blend':str(OUT/'xag-p150-max-v02.blend')}
