"""Save and export the active v02 collection, with fonts/curves converted for glTF."""
import bpy
import contextlib
import io
from pathlib import Path

OUT=Path(__file__).resolve().parent
scene=bpy.context.scene
if scene.get('revision')!='v02':
    raise RuntimeError('The active scene is not P150 revision 02.')
model=bpy.data.collections[scene['model_collection']]
root=bpy.data.objects[scene['model_root']]
for obj in list(model.objects):
    if obj.type in {'FONT','CURVE'}:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active=root
with contextlib.redirect_stdout(io.StringIO()):
    bpy.ops.export_scene.gltf(filepath=str(OUT/'xag-p150-max-v02.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-v02.blend'))
result={'blend':str(OUT/'xag-p150-max-v02.blend'),'glb':str(OUT/'xag-p150-max-v02.glb'),'model_objects':len(model.objects)}
