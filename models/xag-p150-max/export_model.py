"""Export the generated model collection only; run after build_model.py."""
import bpy
from pathlib import Path

OUT = Path(__file__).resolve().parent
scene = bpy.context.scene
model = bpy.data.collections.get('P150 MAX | MODEL')
if model is None or model not in list(scene.collection.children):
    raise RuntimeError('Activate the generated P150 MAX scene before exporting.')

# glTF does not support FONT datablocks. Convert our generated markings only.
for obj in list(model.objects):
    if obj.type == 'FONT':
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')

bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects['P150_MAX_ROOT']
bpy.ops.export_scene.gltf(
    filepath=str(OUT/'xag-p150-max-v01.glb'),
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
)
bpy.ops.object.select_all(action='DESELECT')
root = bpy.data.objects['P150_MAX_ROOT']
root.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-v01.blend'))
result = {'blend':str(OUT/'xag-p150-max-v01.blend'), 'glb':str(OUT/'xag-p150-max-v01.glb'), 'objects':len(model.objects)}
