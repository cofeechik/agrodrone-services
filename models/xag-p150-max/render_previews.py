"""Render two inspection views and return to the three-quarter camera."""
import bpy
from pathlib import Path

OUT = Path(__file__).resolve().parent
scene = bpy.context.scene
original_camera = scene.camera
for camera_name, filename in [
    ('Camera | three-quarter product', 'preview-three-quarter.png'),
    ('Camera | front', 'preview-front.png'),
]:
    scene.camera = bpy.data.objects[camera_name]
    scene.render.filepath = str(OUT/filename)
    bpy.ops.render.render(write_still=True)
scene.camera = original_camera
scene.render.filepath = str(OUT/'preview-three-quarter.png')
result = {'previews': ['preview-three-quarter.png', 'preview-front.png']}
