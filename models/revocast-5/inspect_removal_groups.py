import bpy,json
scene=next(s for s in bpy.data.scenes if s.get('revision')=='v07');bpy.context.window.scene=scene
model=bpy.data.collections[scene['model_collection']]
groups={}
for o in model.objects:
    if o.type=='MESH':groups.setdefault((o.parent,tuple(o.data.materials),o.get('component')),[]).append(o)
def reason(o):
    if o.get('component') in ('tank','spray'):return o.get('component')
    if o.name.startswith('Landing |'):return 'landing'
    if ' | Pump |' in o.name:return 'spray_pump_and_hose'
for i,(key,objects) in enumerate(groups.items()):
    replaced=[o.name for o in objects if reason(o)]
    if replaced:print(json.dumps({'node':f'v07 web | {key[2]} | {i}','replaced':replaced,'retained':[o.name for o in objects if not reason(o)]}),flush=True)
