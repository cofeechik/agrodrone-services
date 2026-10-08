"""Photo-led molded tank reconstruction; reuse the validated v04 export pipeline.

Run in a separate Blender background process loading v04.blend. Earlier files
and the user's interactive Blender scene are never overwritten.
"""
import bpy
import bmesh
import sys
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
if (OUT/'xag-p150-max-v05.blend').exists() and '--replace-build' not in sys.argv:
    raise RuntimeError('v05 already exists; refusing to overwrite the saved revision')
scene = next(s for s in bpy.data.scenes if s.get('revision') == 'v04')
bpy.context.window.scene = scene
model = bpy.data.collections[scene['model_collection']]
tank = next(o for o in model.objects if 'Tank | molded planar saddle' in o.name)
stations = [
    (-.525,.323,.456,-.133,.144),(-.502,.308,.478,-.185,.205),
    (-.445,.290,.487,-.216,.249),(-.355,.273,.487,-.237,.277),
    (-.255,.245,.475,-.255,.283),(-.190,.213,.440,-.263,.270),
    (-.115,.158,.387,-.269,.252),(0,.145,.382,-.270,.250),
    (.115,.158,.387,-.269,.252),(.190,.213,.440,-.263,.270),
    (.255,.245,.475,-.255,.283),(.355,.273,.487,-.237,.277),
    (.445,.290,.487,-.216,.249),(.502,.308,.478,-.185,.205),
    (.525,.323,.456,-.133,.144)]

def slope(i, column):
    if i == 0:
        return (stations[1][column]-stations[0][column])/(stations[1][0]-stations[0][0])
    if i == len(stations)-1:
        return (stations[i][column]-stations[i-1][column])/(stations[i][0]-stations[i-1][0])
    a = (stations[i][column]-stations[i-1][column])/(stations[i][0]-stations[i-1][0])
    b = (stations[i+1][column]-stations[i][column])/(stations[i+1][0]-stations[i][0])
    return 0 if a*b <= 0 else 2*a*b/(a+b)

def sample(i, t):
    a,b = stations[i:i+2]
    d = b[0]-a[0]
    values = [a[0]+d*t]
    for c in range(1,5):
        values.append((2*t**3-3*t*t+1)*a[c]+(t**3-2*t*t+t)*d*slope(i,c)
            +(-2*t**3+3*t*t)*b[c]+(t**3-t*t)*d*slope(i+1,c))
    return values

vertices, faces = [], []
profiles = [sample(i,j/6) for i in range(len(stations)-1) for j in range(6)] + [stations[-1]]
for x,bottom,top,front,back in profiles:
    polygon = [Vector(p) for p in [
        (front+.049,bottom),(front+.009,bottom+.031),(front,bottom+.066),
        (front,top-.041),(front+.025,top-.010),(front+.060,top),
        (back-.044,top),(back-.009,top-.018),(back,top-.053),
        (back,bottom+.061),(back-.021,bottom+.015),(back-.062,bottom)]]
    # Local fillets at section corners; retain broad planar molded walls.
    for j,p in enumerate(polygon):
        before = p.lerp(polygon[j-1], .2)
        after = p.lerp(polygon[(j+1)%len(polygon)], .2)
        for k in range(4):
            t=k/3
            q=(1-t)**2*before+2*(1-t)*t*p+t*t*after
            vertices.append((x,q.x,q.y))
n = 48
faces.append(tuple(reversed(range(n))))
for i in range(len(profiles)-1):
    for j in range(n):
        faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
faces.append(tuple(range((len(profiles)-1)*n,len(profiles)*n)))
old = tank.data
data = bpy.data.meshes.new('v05 molded tank continuous tooling surface')
data.from_pydata(vertices,[],faces)
for m in old.materials:
    data.materials.append(m)
data.update()
bm=bmesh.new()
bm.from_mesh(data)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(data)
bm.free()
for p in data.polygons:
    p.use_smooth = len(p.vertices)==4
tank.data = data
for m in list(tank.modifiers):
    tank.modifiers.remove(m)
data.set_sharp_from_angle(angle=math.radians(65))

# Less uniformly shiny housing and softer elastomer response. No invented wear.
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    shader = material.node_tree.nodes.get('Principled BSDF')
    if shader:
        for socket in shader.inputs:
            if 'Anisotropic' in socket.name and 'Rotation' not in socket.name:
                socket.default_value = 0

# Execute the established exporter with a new output revision. The source lives
# untouched; only this process's in-memory pipeline is adapted.
source = (OUT/'refine_model_v04.py').read_text(encoding='utf-8')
source = source.replace("s.get('revision') == 'v03'", "s.get('revision') == 'v04'")
source = source.replace('v04', 'v05').replace('V04','V05')
source = source.replace("if (OUT / 'xag-p150-max-v05.blend').exists():",
    "if (OUT / 'xag-p150-max-v05.blend').exists() and '--replace-build' not in sys.argv:")
# The revision lookup must still select the loaded master, not the new output.
source = source.replace("s.get('revision') == 'v05'", "s.get('revision') == 'v04'")
source = source.replace("'unchanged':'Motor positions, rotor diameters, arms, handles, tank profile and overall scale'",
    "'unchanged':'Motor positions, rotor diameters, arms, handles and overall scale'")
source = source.replace("'38-degree tank normals, 8mm/5-segment tank bevel'",
    "'Continuous monotone tank tooling profile with rounded section corners; unchanged measured motor layout'")
exec(compile(source,str(OUT/'refine_model_v04.py'),'exec'),globals())
