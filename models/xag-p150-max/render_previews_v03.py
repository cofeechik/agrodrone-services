"""Render final exterior QA views; V03_RENDER_VIEW optionally selects one view."""
import bpy
import os
from pathlib import Path
OUT=Path(__file__).resolve().parent
scene=bpy.context.scene
if scene.get('revision')!='v03':
    raise RuntimeError('Activate the P150 revision 03 scene.')
original_camera=scene.camera
views={'side':'camera_side','three-quarter':'camera_three_quarter','front':'camera_front','rear':'camera_rear','top':'camera_top','detail':'camera_detail'}
selected=os.environ.get('V03_RENDER_VIEW')
if selected and selected not in views:
    raise ValueError('Unknown view: '+selected)
try:
    for name,key in views.items():
        if selected and name!=selected: continue
        scene.camera=bpy.data.objects[scene[key]]
        scene.render.filepath=str(OUT/('preview-v03-'+name+'.png'))
        bpy.ops.render.render(write_still=True)
finally:
    scene.camera=original_camera
    scene.render.filepath=str(OUT/'preview-v03-three-quarter.png')
result={'views':[selected] if selected else list(views)}
