"""Photo-led exterior landing frame and genuine semantic assemblies.
Run in background on v06; previous revisions and the user's open scene stay intact.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT = Path(__file__).resolve().parent
assert not (OUT/'xag-p150-max-v07.blend').exists(), 'Preserve existing revision'
scene = next(s for s in bpy.data.scenes if s.get('revision') == 'v06')
bpy.context.window.scene = scene
model = bpy.data.collections[scene['model_collection']]
root = bpy.data.objects[scene['model_root']]
old = next(o for o in model.objects if 'landing strut' in o.name)
carbon = old.data.materials[0]
metal = next(o.data.materials[0] for o in model.objects if 'upper leg casting' in o.name)
rubber = next(o.data.materials[0] for o in model.objects if 'rubber capsule foot' in o.name)
remove = ('landing strut', 'upper leg casting', 'leg clamp', 'clamp screw',
          'rubber capsule foot', 'foot fitting', 'Landing |')
for obj in list(model.objects):
    if any(s in obj.name for s in remove):
        bpy.data.objects.remove(obj, do_unlink=True)

def tube(name, a, b, radius, material):
    a,b = Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=(b-a).length)
    obj = bpy.context.object
    obj.name = 'Landing | ' + name
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    model.objects.link(obj)
    obj.parent = root
    obj.location = (a+b)/2
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0,0,1)).rotation_difference(b-a)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    bevel = obj.modifiers.new('Machined edge', 'BEVEL')
    bevel.width = min(.0015, radius/6)
    bevel.segments = 3
    return obj

# Reference: 04-agrifuture-top-front.jpg / 06-agrifuture-top-oblique.jpg.
# A short upper shoulder routes forward/back before descending: the tank is
# behind the struts, not pierced by them. Lower ties run below the molded body.
segments = []
for sx in (-1,1):
    for sy in (-1,1):
        label = f'{sx}_{sy}'
        top = Vector((sx*.17,sy*.18,.535))
        knee = Vector((sx*.19,sy*.33,.495))
        foot = Vector((sx*.34,sy*.40,-.00775))
        tube(label+' upper shoulder', top, knee, .027, metal)
        tube(label+' landing strut', knee, foot, .021, carbon)
        segments.extend([(top,knee,.027),(knee,foot,.021)])
        for t in (.12,.73):
            p = knee.lerp(foot,t)
            axis = (foot-knee).normalized()
            tube(label+' split clamp '+str(t),p-axis*.014,p+axis*.014,.024,metal)
            tube(label+' clamp pin '+str(t),p+Vector((-.029,0,0)),p+Vector((.029,0,0)),.004,metal)
        tube(label+' rubber foot',foot-Vector((0,.029,0)),foot+Vector((0,.029,0)),.025,rubber)
        tube(label+' shoulder pivot',knee-Vector((.033,0,0)),knee+Vector((.033,0,0)),.006,metal)
    a = Vector((sx*.307,-.385,.103))
    b = Vector((sx*.307,.385,.103))
    tube(str(sx)+' lower frame tie',a,b,.013,carbon)
    segments.append((a,b,.013))

bpy.context.view_layer.update()
tank = next(o for o in model.objects if 'Tank | molded planar saddle' in o.name)
dg = bpy.context.evaluated_depsgraph_get()
evaluated = tank.evaluated_get(dg)
data = evaluated.to_mesh()
data.calc_loop_triangles()
vertices = [root.matrix_world.inverted() @ tank.matrix_world @ v.co for v in data.vertices]
tree = BVHTree.FromPolygons(vertices,[t.vertices for t in data.loop_triangles],all_triangles=True)
minimum = float('inf')
for a,b,radius in segments:
    for i in range(101):
        p = a.lerp(b,i/100)
        distance = tree.find_nearest(p)[3]
        minimum = min(minimum,distance-radius)
        assert distance > radius+.004, f'Landing frame touches tank: {distance-radius}'
evaluated.to_mesh_clear()
(OUT/'landing-clearance-v07.json').write_text(json.dumps({
    'sampled_segments':len(segments),'samples_per_segment':101,
    'minimum_surface_clearance_mm':round(minimum*1000,2),
    'method':'Evaluated molded tank BVH nearest surface; exterior forward/back routing; tubes sampled at 101 points.',
    'reference':'04-agrifuture-top-front.jpg; 06-agrifuture-top-oblique.jpg',
    'limitation':'Photo reconstruction, not a verified factory frame or engineering clearance.'
},indent=2),encoding='utf-8')

source = (OUT/'refine_model_v04.py').read_text(encoding='utf-8')
source = source.replace('v04','v07').replace('V04','V07')
source = source.replace("s.get('revision') == 'v03'", "s.get('revision') == 'v06'")
source = source.replace('tank.data.set_sharp_from_angle(angle=math.radians(38))','# Preserve continuous v06 tooling surface')
start = source.index('def component(obj):')
end = source.index('bpy.context.view_layer.update()', start)
source = source[:start] + '''def component(obj):
    name = obj.name.lower()
    if 'tank |' in name:
        return 'tank'
    if any(s in name for s in ('atomizer', 'spray hose', 'disc centre')):
        return 'spray'
    if any(s in name for s in ('gnss antenna', 'antenna collar', 'radar')):
        return 'navigation'
    if any(s in name for s in ('battery', 'silver heat sink fin', 'silver upper cover',
                               'pale upper equipment housing', 'upper xag marking', 'cover screw')):
        return 'battery'
    return 'structure'

''' + source[end:]
source = source.replace('tank / battery (upper enclosure) / structure','tank / spray / battery / navigation / structure')
source = source.replace('38-degree tank normals, 8mm/5-segment tank bevel','Exterior routed landing frame; separate spray and navigation assemblies')
exec(compile(source,str(OUT/'refine_model_v04.py'),'exec'),globals())
