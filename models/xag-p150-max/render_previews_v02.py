"""Render v02 from its scene-owned cameras; preserve the user's active camera."""
import bpy
from pathlib import Path

OUT=Path(__file__).resolve().parent
scene=bpy.context.scene
if scene.get('revision')!='v02':
    raise RuntimeError('Activate the P150 revision 02 scene.')
original_camera=scene.camera
try:
    for key,filename in [('camera_three_quarter','preview-v02-three-quarter.png'),('camera_front','preview-v02-front.png')]:
        scene.camera=bpy.data.objects[scene[key]]
        scene.render.filepath=str(OUT/filename)
        bpy.ops.render.render(write_still=True)
finally:
    scene.camera=original_camera
    scene.render.filepath=str(OUT/'preview-v02-three-quarter.png')
result={'previews':['preview-v02-three-quarter.png','preview-v02-front.png']}
