"""Bounded reviewer correction: continuous tank and visible cast connections.
Load v05.blend in background. Previous saved revisions remain untouched.
Exterior photo reconstruction only, not engineering geometry.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector, Matrix
OUT=Path(__file__).resolve().parent
if (OUT/'xag-p150-max-v06.blend').exists() and '--replace-build' not in sys.argv:
    raise RuntimeError('Preserve the existing v06 revision')
scene=next(s for s in bpy.data.scenes if s.get('revision')=='v05')
bpy.context.window.scene=scene
model=bpy.data.collections[scene['model_collection']]
tank=next(o for o in model.objects if 'Tank | molded planar saddle' in o.name)
for m in list(tank.modifiers):
    tank.modifiers.remove(m)
sharp=tank.data.attributes.get('sharp_edge')
if sharp:
    tank.data.attributes.remove(sharp)
for p in tank.data.polygons:
    p.use_smooth=True
sub=tank.modifiers.new('Continuous molded tooling surface','SUBSURF')
sub.levels=1
sub.render_levels=1

def boolean_cut(obj,kind,offset,size,radius=0):
    # Cut in the existing object's unscaled local frame. Preserve its hierarchy.
    rotation=obj.matrix_world.to_quaternion()
    centre=obj.matrix_world.translation+rotation@Vector(offset)
    if kind=='box':
        bpy.ops.mesh.primitive_cube_add(size=1,location=centre)
        cutter=bpy.context.object
        cutter.rotation_mode='QUATERNION';cutter.rotation_quaternion=rotation
        cutter.scale=size
    else:
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=radius,depth=size[1],location=centre)
        cutter=bpy.context.object
        cutter.rotation_mode='QUATERNION'
        cutter.rotation_quaternion=rotation@Vector((0,0,1)).rotation_difference(Vector((0,1,0)))
    bpy.context.view_layer.update()
    modifier=obj.modifiers.new('Photo-led cast opening','BOOLEAN')
    modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)

# Motor castings are open supporting forks in the references, not solid blocks.
# Existing fasteners/pins stay at their validated positions.
motor_count=joint_count=0
for obj in list(model.objects):
    if obj.type!='MESH':
        continue
    if 'motor pedestal' in obj.name:
        boolean_cut(obj,'box',(0,0,-.018),(.038,.13,.043))
        motor_count+=1
    elif 'hinge fork cheek' in obj.name:
        boolean_cut(obj,'cylinder',(-.011,0,0),(0,.09,0),.016)
        joint_count+=1
    elif 'side service panel' in obj.name:
        # Recessed service-panel face with a retained outer mounting lip. This
        # is visible exterior layering, not an invented internal mechanism.
        sx=1 if obj.matrix_world.translation.x>0 else -1
        boolean_cut(obj,'box',(sx*.008,0,0),(.006,.360,.063))
        for m in obj.modifiers:
            if m.type=='BEVEL':
                m.width=.0015;m.segments=3
assert motor_count==4 and joint_count==8

# Physical fastener sockets in the upper plate, observed on product photographs.
# All holes are within the existing cover; their locations are exterior estimates.
cover=next(o for o in model.objects if 'silver upper cover' in o.name)
for yy in [-.075,.25]:
    # The thin cover's default rotation is world aligned; these holes surround
    # its existing screws and do not suggest a changed internal configuration.
    for xx in [-.096,.096]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.0042,depth=.02,location=(xx,yy,.660))
        cutter=bpy.context.object
        modifier=cover.modifiers.new('Recessed cover fastener seat','BOOLEAN')
        modifier.operation='DIFFERENCE';modifier.object=cutter
        bpy.context.view_layer.objects.active=cover
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.data.objects.remove(cutter,do_unlink=True)

source=(OUT/'refine_model_v04.py').read_text(encoding='utf-8')
source=source.replace('v04','v06').replace('V04','V06')
source=source.replace("if (OUT / 'xag-p150-max-v06.blend').exists():",
    "if (OUT / 'xag-p150-max-v06.blend').exists() and '--replace-build' not in sys.argv:")
source=source.replace("s.get('revision') == 'v03'", "s.get('revision') == 'v05'")
source=source.replace('tank.data.set_sharp_from_angle(angle=math.radians(38))',
    '# v06 tank continuity is supplied by its subdivision surface, no forced sharp split')
source=source.replace("'38-degree tank normals, 8mm/5-segment tank bevel'",
    "'Continuous tank tooling surface, four open motor forks, eight recessed folding cheeks, recessed service panels and cover fastener seats'")
source=source.replace("'unchanged':'Motor positions, rotor diameters, arms, handles, tank profile and overall scale'",
    "'unchanged':'Motor positions, rotor diameters, arm endpoints, handles and overall scale'")
exec(compile(source,str(OUT/'refine_model_v04.py'),'exec'),globals())
