"""Make the new assembly independently viewable; no render or source edits."""
import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
scene=bpy.data.scenes['P150 MAX | RevoCast 5 mounted v01']
bpy.context.window.scene=scene
studio=bpy.data.collections.new('Mounted | presentation studio');scene.collection.children.link(studio)
target=Vector((0,.075,.25))
d=bpy.data.cameras.new('Mounted | camera');o=bpy.data.objects.new('Mounted | camera',d);studio.objects.link(o);o.location=(3.2,-4.6,2.8);o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=4.2;scene.camera=o
for name,loc,power,size in [('key',(-2,-3,5),1000,4),('fill',(3,-1,3),650,3),('rim',(0,3,4),950,3)]:
    d=bpy.data.lights.new('Mounted | '+name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new('Mounted | '+name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
bpy.context.preferences.filepaths.save_version=0
bpy.context.preferences.filepaths.file_preview_type='NONE'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'xag-p150-max-revocast-5-mounted-v01.blend'))
print('NEW_ASSEMBLY_PRESENTATION_READY',flush=True)
