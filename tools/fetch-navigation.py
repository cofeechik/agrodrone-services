"""Bounded open geodata acquisition; no raster OSM tile scraping."""
import io,json,math,urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'kokschetau';OUT.mkdir(parents=True,exist_ok=True)
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'AGRODRON-local-prototype/1.0 (+https://github.com/cofeechik/agrodrone-services)'})
    return urllib.request.urlopen(req,timeout=90).read()
z=13;n=2**z;lon,lat=69.42,53.40
x=int((lon+180)/360*n);y=int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n)
def latitude(y):return math.degrees(math.atan(math.sinh(math.pi*(1-2*y/n))))
bounds=[x/n*360-180,latitude(y+1),(x+1)/n*360-180,latitude(y)]
terrain_url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
img=Image.open(io.BytesIO(get(terrain_url))).convert('RGB')
grid=[]
for j in range(65):
    for i in range(65):
        r,g,b=img.getpixel((min(255,round(i*255/64)),min(255,round(j*255/64))))
        grid.append(round(r*256+g+b/256-32768,2))
(OUT/'terrain.json').write_text(json.dumps({'bounds':bounds,'size':65,'elevations':grid,'source':terrain_url,'encoding':'Terrarium','attribution':'Mapzen / Tilezen, SRTM and other open elevation sources','sampled_grid_m':round(40075016.686/n*math.cos(math.radians(lat))/64,1)},separators=(',',':')),encoding='utf8')
west,south,east,north=bounds
query=f'[out:json][timeout:40];(way[highway]({south},{west},{north},{east});way[natural]({south},{west},{north},{east});way[landuse]({south},{west},{north},{east}););out geom;'
from urllib.parse import quote
for host in ['https://overpass.private.coffee/api/interpreter']:
    try:
        data=json.loads(get(host+'?data='+quote(query)))
        (OUT/'features.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf8');break
    except Exception as e:print('OSM endpoint:',str(e))
else:
    import xml.etree.ElementTree as ET
    xml=ET.fromstring(get(f'https://api.openstreetmap.org/api/0.6/map?bbox={west},{south},{east},{north}'))
    nodes={e.attrib['id']:{'lat':float(e.attrib['lat']),'lon':float(e.attrib['lon'])} for e in xml.findall('node')}
    ways=[]
    for e in xml.findall('way'):
        tags={t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
        if any(k in tags for k in ['highway','natural','landuse','waterway']):
            ways.append({'id':int(e.attrib['id']),'tags':tags,'geometry':[nodes[t.attrib['ref']] for t in e.findall('nd') if t.attrib['ref'] in nodes]})
    data={'elements':ways,'source':'OpenStreetMap API 0.6'}
    (OUT/'features.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf8')
print(json.dumps({'bounds':bounds,'height_min':min(grid),'height_max':max(grid),'features':len(data['elements'])}))
