"""Photo-based P150 MAX visual study, in metres. Run inside Blender.

Creates a separate scene; never clears the user's existing scene.
Official motor diagonal: 2.335 m. Propellers: 1.600 m.
Other dimensions are visual estimates, not manufacturing measurements.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)
if bpy.context.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')
scene = bpy.data.scenes.new('XAG P150 MAX — RevoSpray study')
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
model = bpy.data.collections.new('P150 MAX | MODEL')
studio = bpy.data.collections.new('STUDIO | excluded from GLB')
scene.collection.children.link(model)
scene.collection.children.link(studio)
root = bpy.data.objects.new('P150_MAX_ROOT', None)
model.objects.link(root)
root['revision'] = '01 — photo-based visual study'
root['motor_diagonal_m'] = 2.335
root['propeller_diameter_m'] = 1.6
root['accuracy'] = 'Exterior reconstructed from photos; small dimensions estimated.'

def material(name, rgb, metallic=0, roughness=.4):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    return m

black = material('01 | Graphite aluminium', (.022,.026,.031), .62,.32)
rubber = material('02 | Rubber & matte housings', (.012,.015,.018), .05,.56)
red = material('03 | XAG red shell & latches', (.48,.006,.011), .13,.27)
white = material('04 | Off-white molded tank', (.79,.81,.78), .0,.36)
silver = material('05 | Stainless fasteners', (.36,.39,.42), .88,.23)
carbon = material('06 | Carbon propellers', (.019,.023,.026), .35,.29)
labelmat = material('07 | Ivory markings', (.84,.87,.85), .0,.42)
yellow = material('08 | Safety yellow labels', (.94,.64,.025), .0,.4)
lens = material('09 | Optical glass', (.012,.035,.051), .65,.12)
emboss = material('10 | Tank embossed lettering', (.57,.59,.57), .0,.5)

def finish(o, name, mat, bevel=0, smooth=True, parent=root):
    o.name = name
    for c in list(o.users_collection):
        c.objects.unlink(o)
    model.objects.link(o)
    o.parent = parent
    if mat:
        o.data.materials.append(mat)
    if o.type == 'MESH':
        for p in o.data.polygons:
            p.use_smooth = smooth
        if bevel:
            mod = o.modifiers.new('Manufactured edge radii', 'BEVEL')
            mod.width = bevel
            mod.segments = 3
        if bevel:
            n = o.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
            n.keep_sharp = True
    return o

def box(name, loc, dims, mat=black, bevel=.009):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o,name,mat,bevel,smooth=False)

def cylinder(name, loc, radius, depth, mat=black, direction=(0,0,1), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector(direction).to_track_quat('Z','Y')
    return finish(o,name,mat,.0018)

def beam(name, a, b, radius, mat=black):
    a,b = Vector(a),Vector(b)
    return cylinder(name,(a+b)/2,radius,(b-a).length,mat,b-a)

def mesh(name, verts, faces, mat, bevel=0, smooth=False):
    data = bpy.data.meshes.new(name+' mesh')
    data.from_pydata(verts,[],faces)
    data.update()
    o = bpy.data.objects.new(name,data)
    model.objects.link(o)
    o.parent = root
    o.data.materials.append(mat)
    for p in data.polygons:
        p.use_smooth = smooth
    if bevel:
        m = o.modifiers.new('Soft molded corners','BEVEL')
        m.width = bevel
        m.segments = 3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def tube(name, points, radius, mat=rubber):
    d = bpy.data.curves.new(name,'CURVE')
    d.dimensions = '3D'
    d.bevel_depth = radius
    d.bevel_resolution = 3
    s = d.splines.new('BEZIER')
    s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name,d)
    model.objects.link(o)
    o.parent = root
    d.materials.append(mat)
    return o

def text(name, body, loc, size, mat, rotation=(math.pi/2,0,0)):
    d = bpy.data.curves.new(name,'FONT')
    d.body = body
    d.size = size
    d.align_x = 'CENTER'
    d.extrude = .00035
    o = bpy.data.objects.new(name,d)
    model.objects.link(o)
    o.parent = root
    o.location = loc
    o.rotation_euler = rotation
    d.materials.append(mat)
    return o

# Molded saddle tank: broad shoulders, stepped sloping walls, deeper central sump.
outline = [(-.20,-.37),(.20,-.37),(.30,-.30),(.46,-.24),(.52,-.10),(.51,.18),(.37,.29),(.20,.28),(-.20,.28),(-.37,.29),(-.51,.18),(-.52,-.10),(-.46,-.24),(-.30,-.30)]
verts=[]
rings=[(.21,.16),(.38,.19),(.79,.25),(.98,.34),(1,.43),(.96,.47)]
for scale,z in rings:
    verts.extend([(x*scale,y*scale,z) for x,y in outline])
n=len(outline)
faces=[tuple(reversed(range(n)))]
for r in range(len(rings)-1):
    for i in range(n):
        j=(i+1)%n
        faces.append((r*n+i,r*n+j,(r+1)*n+j,(r+1)*n+i))
faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
mesh('Tank | one-piece 80L saddle exterior',verts,faces,white,.011)
text('Tank | embossed XAG','XAG',(0,-.297,.257),.079,emboss)
for sx in [-1,1]:
    cylinder('Tank | filler neck', (sx*.366,-.04,.478), .119,.024,white)
    cylinder('Tank | black screw lid',(sx*.366,-.04,.495),.116,.023,rubber)
    cylinder('Tank | red cap release',(sx*.366,-.04,.511),.035,.009,red)
    for i in range(12):
        t=i*math.tau/12
        o=box('Tank | lid grip',(sx*.366+.11*math.cos(t),-.04+.11*math.sin(t),.497),(.012,.012,.015),rubber,.002)
    tube('Tank | side molding rib',[(sx*.18,-.334,.275),(sx*.31,-.265,.33),(sx*.46,-.20,.409)],.0045,white)
    cylinder('Tank | bottom drain',(sx*.19,.05,.195),.019,.045,rubber)

# Compact central spine, exposed battery, carry handles and red front cowling.
box('Chassis | lower bridge',(0,0,.486),(.45,.44,.061),black)
box('Battery | main pack',(0,.075,.605),(.285,.30,.175),rubber,.018)
box('Battery | top plate',(0,.075,.697),(.28,.29,.016),black,.006)
for i in range(17):
    box('Battery | cooling rib',(0,-.041+i*.014,.709),(.225,.005,.009),black,.001)
for sx in [-1,1]:
    box('Battery | silver side rail',(sx*.148,.065,.612),(.012,.24,.09),silver,.004)
    for yy in [-.035,.19]:
        beam('Battery | handle upright',(sx*.155,yy,.633),(sx*.155,yy,.739),.014,rubber)
    beam('Battery | carry grip',(sx*.155,-.035,.739),(sx*.155,.19,.739),.015,rubber)
    cylinder('Chassis | RTK mast',(sx*.214,-.02,.643),.020,.17,rubber)
    cylinder('Chassis | RTK base',(sx*.214,-.02,.563),.03,.018,black)
    for yy in [-.12,.16]:
        cylinder('Chassis | mount bolt',(sx*.20,yy,.525),.009,.008,silver,vertices=6)

# Faceted red nose follows the tapered front housing in the product photographs.
profile=[(-.076,-.345,.58),(.076,-.345,.58),(-.088,-.30,.659),(.088,-.30,.659),(-.063,-.115,.69),(.063,-.115,.69),(-.065,-.10,.565),(.065,-.10,.565)]
mesh('Nose | red tapered cover',profile,[(0,1,3,2),(2,3,5,4),(4,5,7,6),(0,6,7,1),(0,2,4,6),(1,7,5,3)],red,.009)
box('Nose | black face',(0,-.35,.611),(.123,.009,.044),rubber,.009)
text('Nose | XAG badge','XAG',(0,-.356,.603),.015,labelmat)
box('Nose | radar enclosure',(0,-.294,.524),(.266,.119,.075),rubber,.015)
cylinder('Nose | FPV gold bezel',(-.094,-.356,.531),.013,.008,yellow,(0,-1,0))
cylinder('Nose | FPV lens',(-.094,-.361,.531),.009,.008,lens,(0,-1,0))
cylinder('Nose | status indicator',(-.094,-.357,.505),.004,.009,labelmat,(0,-1,0))

# Four 2.335 m diagonal motor stations, adjustable independent rotor roots.
station=2.335/(2*math.sqrt(2))
for sx in [-1,1]:
    for sy in [-1,1]:
        tag=('L' if sx<0 else 'R')+('_FRONT' if sy<0 else '_REAR')
        a=Vector((sx*.17,sy*.14,.527))
        b=Vector((sx*station,sy*station,.552))
        delta=b-a
        beam(tag+' | aluminium tubular arm',a,b,.026)
        # Root mount and folding hinge collars; visible red over-centre locks.
        for t,r,length in [(0.03,.04,.078),(.32,.037,.06),(.38,.034,.026),(.86,.034,.04)]:
            cylinder(tag+' | folding collar',a+delta*t,r,length,rubber,delta)
        hinge=a+delta*.33
        latch=box(tag+' | red folding latch',hinge+Vector((0,0,.041)),(.067,.027,.019),red,.005)
        latch.rotation_euler.z=math.atan2(delta.y,delta.x)
        cylinder(tag+' | latch bolt',hinge+Vector((0,0,.053)),.006,.009,silver,vertices=6)
        esc=a+delta*.82+Vector((0,0,.038))
        o=box(tag+' | ESC body',esc,(.13,.065,.03),rubber,.005)
        o.rotation_euler.z=math.atan2(delta.y,delta.x)
        for j in range(9):
            p=esc+delta.normalized()*((j-4)*.011)+Vector((0,0,.018))
            fin=box(tag+' | ESC cooling fin',p,(.005,.059,.014),black,.001)
            fin.rotation_euler.z=o.rotation_euler.z
        warn=a+delta*.56+Vector((0,0,.026))
        sticker=box(tag+' | caution label',warn,(.060,.021,.001),yellow,.0003)
        sticker.rotation_euler.z=o.rotation_euler.z
        box(tag+' | motor pedestal',(b.x,b.y,.559),(.073,.093,.105),black,.009)
        cylinder(tag+' | outrunner motor',(b.x,b.y,.615),.069,.055,black)
        cylinder(tag+' | motor top lip',(b.x,b.y,.645),.072,.008,rubber)
        cylinder(tag+' | propeller hub',(b.x,b.y,.661),.036,.026,black)
        for j in range(6):
            t=j*math.tau/6
            cylinder(tag+' | hub screw',(b.x+.026*math.cos(t),b.y+.026*math.sin(t),.677),.003,.004,silver,vertices=6)
        box(tag+' | red motor end guard',(b.x+sx*.056,b.y,.534),(.030,.07,.07),red,.009)
        beam(tag+' | under-motor bracket',(b.x-sx*.023,b.y,.515),(b.x,b.y,.46),.011,rubber)
        beam(tag+' | under-motor bracket',(b.x+sx*.023,b.y,.515),(b.x,b.y,.46),.011,rubber)
        pivot=bpy.data.objects.new(tag+' | ROTOR_ANIMATION_ROOT',None)
        model.objects.link(pivot)
        pivot.parent=root
        pivot.location=(b.x,b.y,.674)
        angle=(.21 if sx==sy else -.21)
        pivot.rotation_euler.z=angle
        # Two separate tapered, swept, twisted airfoil blades, 1.6 m tip-to-tip.
        for sign in [-1,1]:
            sections=[(.027,.021,0,.010),(.09,.045,.005,.009),(.24,.062,.025,.007),(.47,.052,.044,.005),(.69,.034,.057,.003),(.8,.008,.06,.0017)]
            vs=[]
            for radial,chord,sweep,thick in sections:
                twist=math.radians(13-9*radial/.8)
                for c,h in [(-.5,-.5),(.5,-.5),(.5,.5),(-.5,.5)]:
                    yy=c*chord*1.35
                    zz=h*thick+yy*math.sin(twist)
                    vs.append((sign*radial,sign*(sweep+yy),zz))
            fs=[(3,2,1,0)]
            for j in range(len(sections)-1):
                for k in range(4):
                    fs.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
            fs.append(tuple(range((len(sections)-1)*4,len(sections)*4)))
            blade=mesh(tag+' | airfoil '+str(sign),vs,fs,carbon,.001,True)
            blade.parent=pivot
            blade.data.materials.append(red if sx==sy else labelmat)
            for poly in blade.data.polygons:
                if all(v>=16 for v in poly.vertices):
                    poly.material_index=1
        # Rear spray droppers and centrifugal discs.
        if sy>0:
            beam(tag+' | spray drop tube',(b.x,b.y,.527),(b.x,b.y,.282),.014,rubber)
            cylinder(tag+' | atomizer housing',(b.x,b.y,.284),.025,.04,black)
            cylinder(tag+' | spray disc',(b.x,b.y,.26),.032,.005,silver)
            tube(tag+' | spray supply hose',[(sx*.18,.12,.23),(sx*.35,.40,.43),(b.x,b.y,.49),(b.x,b.y,.29)],.004,rubber)

# Four splayed landing legs and rubber foot pads, never a generic sled frame.
for sx in [-1,1]:
    for sy in [-1,1]:
        tag=('L' if sx<0 else 'R')+('_FRONT' if sy<0 else '_REAR')
        top=Vector((sx*.20,sy*.18,.49))
        foot=Vector((sx*.335,sy*.355,.024))
        beam(tag+' | landing leg',top,foot,.018,black)
        for t in [.10,.63,.86]:
            cylinder(tag+' | landing sleeve',top.lerp(foot,t),.023,.028,rubber,foot-top)
        pad=box(tag+' | rubber landing foot',foot,(.054,.10,.03),rubber,.014)
        pad.rotation_euler.x=sy*.10
        for t in [.28,.69]:
            p=top.lerp(foot,t)
            cylinder(tag+' | leg fastener',p+Vector((0,-.017,0)),.004,.006,silver,(0,-1,0),vertices=6)
for sx in [-1,1]:
    box('Pump | pump enclosure',(sx*.145,.04,.187),(.10,.13,.065),rubber,.01)
    tube('Pump | loop hose',[(sx*.19,.04,.19),(sx*.24,-.015,.13),(sx*.12,-.065,.13),(sx*.10,.02,.20)],.006,rubber)

# Separate studio rig: export only the model collection.
def studio_link(o):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    studio.objects.link(o)

def camera(name, loc, target, ortho):
    d=bpy.data.cameras.new(name)
    o=bpy.data.objects.new(name,d)
    studio.objects.link(o)
    o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    d.type='ORTHO'
    d.ortho_scale=ortho
    d.lens=45
    return o

scene.camera=camera('Camera | three-quarter product',(3.5,-5.8,3.0),(0,0,.39),4.1)
camera('Camera | front',(0,-6,2.45),(0,0,.39),3.8)
camera('Camera | top',(0,0,7),(0,0,.39),3.9)
for name,loc,power,size in [('Key',(-3,-4,5),700,4),('Fill',(4,-1,3),500,3),('Rim',(0,4,4),1100,3)]:
    d=bpy.data.lights.new('Studio | '+name,'AREA')
    d.energy=power
    d.shape='DISK'
    d.size=size
    o=bpy.data.objects.new(d.name,d)
    studio.objects.link(o)
    o.location=loc
    o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('Studio | neutral soft world')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.76,.79,.83,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.25
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1500
scene.render.resolution_y=1125
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'

bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
bpy.context.view_layer.objects.active=root
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=4.5
        area.spaces.active.region_3d.view_location=(0,0,.39)
        area.spaces.active.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion()
        area.spaces.active.clip_end=100
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.overlay.show_extras=False
        area.spaces.active.overlay.show_floor=False

bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-v01.blend'))
result={'scene':scene.name,'model_objects':len(model.objects),'blend':str(OUT/'xag-p150-max-v01.blend'),'status':'geometry created; render/export next'}
