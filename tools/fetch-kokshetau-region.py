"""Small bounded regional DEM mosaic and OSM vectors, not raster tile scraping."""
import io,json,math,urllib.request
from urllib.parse import quote
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'assets'/'kokschetau'
bounds=[69.26,53.245,69.58,53.43]
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'AGRODRON-local-prototype/1.0'}),timeout=60).read()
def xy(lon,lat,z=11):
    n=2**z
    return (lon+180)/360*n,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
tiles={};elev=[];size=129;sources=[]
for j in range(size):
    for i in range(size):
        lon=bounds[0]+i/(size-1)*(bounds[2]-bounds[0]);lat=bounds[3]-j/(size-1)*(bounds[3]-bounds[1])
        x,y=xy(lon,lat);tx,ty=int(x),int(y)
        if (tx,ty) not in tiles:
            url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/11/{tx}/{ty}.png'
            tiles[tx,ty]=Image.open(io.BytesIO(get(url))).convert('RGB');sources.append(url)
        r,g,b=tiles[tx,ty].getpixel((int((x-tx)*256),int((y-ty)*256)))
        elev.append(round(r*256+g+b/256-32768,2))
(root/'region-terrain.json').write_text(json.dumps({'bounds':bounds,'size':size,'elevations':elev,'source':sources,'encoding':'Terrarium','attribution':'Mapzen / USGS SRTM/GMTED2010','sampled_grid_m':round((bounds[2]-bounds[0])*111320*math.cos(math.radians(53.33))/128)},separators=(',',':')),encoding='utf8')
w,s,e,n=bounds;box=f'{s},{w},{n},{e}'
query=f'[out:json][timeout:40];(way[highway~"^(trunk|primary|secondary|tertiary)$"]({box});way[landuse~"^(residential|farmland|forest)$"]({box});way[natural~"^(water|wood)$"]({box});relation[natural=water]({box}););out geom;'
data=None
for endpoint in ['https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
    try:data=json.loads(get(endpoint+'?data='+quote(query)));break
    except Exception as ex:print('Endpoint unavailable',str(ex),flush=True)
if data is None:
    import xml.etree.ElementTree as ET
    from concurrent.futures import ThreadPoolExecutor
    boxes=[(w+(e-w)*i/4,s+(n-s)*j/4,w+(e-w)*(i+1)/4,s+(n-s)*(j+1)/4) for j in range(4) for i in range(4)]
    def fetchbox(box):return ET.fromstring(get('https://api.openstreetmap.org/api/0.6/map?bbox='+','.join(map(str,box))))
    unique={}
    with ThreadPoolExecutor(max_workers=2) as pool:
        for part in pool.map(fetchbox,boxes):
            for element in part:unique[element.tag,element.attrib.get('id')]=element
    xml=ET.Element('osm');xml.extend(unique.values())
    nodes={v.attrib['id']:{'lat':float(v.attrib['lat']),'lon':float(v.attrib['lon'])} for v in xml.findall('node')}
    allways={v.attrib['id']:[nodes[a.attrib['ref']] for a in v.findall('nd') if a.attrib['ref'] in nodes] for v in xml.findall('way')}
    elements=[]
    for v in xml.findall('way'):
        tags={a.attrib['k']:a.attrib['v'] for a in v.findall('tag')}
        if tags.get('highway') in ['trunk','primary','secondary','tertiary'] or tags.get('landuse') in ['residential','farmland','forest'] or tags.get('natural') in ['water','wood']:
            elements.append({'type':'way','id':int(v.attrib['id']),'tags':tags,'geometry':allways[v.attrib['id']]})
    for v in xml.findall('relation'):
        tags={a.attrib['k']:a.attrib['v'] for a in v.findall('tag')}
        if tags.get('natural')=='water':elements.append({'type':'relation','id':int(v.attrib['id']),'tags':tags,'members':[{'role':a.attrib['role'],'geometry':allways[a.attrib['ref']]} for a in v.findall('member') if a.attrib['type']=='way' and a.attrib['ref'] in allways]})
    data={'elements':elements}
ways=[]
for item in data['elements']:
    if item['type']=='way':ways.append(item)
    elif item['type']=='relation':
        segments=[m['geometry'][:] for m in item.get('members',[]) if m.get('role')=='outer' and m.get('geometry')]
        while segments:
            ring=segments.pop(0)
            for _ in range(len(segments)+1):
                if ring[0]==ring[-1]:break
                found=False
                for k,seg in enumerate(segments):
                    if ring[-1]==seg[0]:ring+=seg[1:];found=True
                    elif ring[-1]==seg[-1]:ring+=list(reversed(seg))[1:];found=True
                    if found:segments.pop(k);break
                if not found:break
            if len(ring)>3:ways.append({'id':item['id'],'tags':item.get('tags',{}),'geometry':ring,'type':'relation-outline'})
(root/'region-features.json').write_text(json.dumps({'bounds':bounds,'elements':ways,'source':'OpenStreetMap / Overpass','licence':'ODbL'},separators=(',',':')),encoding='utf8')
print(json.dumps({'tiles':len(tiles),'features':len(ways),'range':[min(elev),max(elev)],'water':[x['tags'].get('name') for x in ways if x['tags'].get('natural')=='water']}),flush=True)
