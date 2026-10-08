"""Read both native revisions in a separate background Blender process."""
import bpy, json, struct
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
AIR=OUT.parent/'xag-p150-max'
def bounds(o):
    pts=[o.matrix_world@Vector(p) for p in o.bound_box]
    return {'min':[min(p[i] for p in pts) for i in range(3)],'max':[max(p[i] for p in pts) for i in range(3)]}
def listing(scene):
    bpy.context.window.scene=scene
    bpy.context.view_layer.update()
    model=bpy.data.collections[scene['model_collection']]
    return {'scene':scene.name,'root':scene['model_root'],'rootMatrix':[list(r) for r in bpy.data.objects[scene['model_root']].matrix_world],'objects':[dict(name=o.name,type=o.type,parent=o.parent.name if o.parent else None,component=o.get('component'),bounds=bounds(o) if o.type in ('MESH','CURVE','FONT') else None) for o in model.objects]}
airscene=next(s for s in bpy.data.scenes if s.get('revision')=='v07')
report={'aircraft':listing(airscene)}
bpy.ops.wm.open_mainfile(filepath=str(OUT/'revocast-5-v01.blend'))
modscene=next(s for s in bpy.data.scenes if s.get('revision')=='revocast-5-v01')
report['module']=listing(modscene)
f=(AIR/'xag-p150-max-v07-web-uncompressed.glb').read_bytes()
n=struct.unpack_from('<I',f,12)[0]; g=json.loads(f[20:20+n])
report['rawGltf']={'scenes':g.get('scenes'),'nodes':g['nodes']}
assert not (OUT/'mounting-inspection.json').exists()
(OUT/'mounting-inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
for subject in ['aircraft','module']:
    data=report[subject]
    print(subject,data['root'],data['rootMatrix'],flush=True)
    for o in data['objects']:
        if any(s in o['name'].lower() for s in ('chassis','upper rail','transverse rail','alignment boss','shoulder','mounting rail','arm','tank | molded')) and not any(s in o['name'].lower() for s in ('bolt','screw','blade','fin','chevron')):
            print(json.dumps(o),flush=True)
