# Builds the panel's starting content (seed.json) from the current site defaults.
import json, re, subprocess, html
from bs4 import BeautifulSoup
OUT='/home/claude/site/fortyfour-web'; D='https://thisisfortyfour.com'
ab=lambda u: (D+u) if u and u.startswith('/assets/') else u
texts={}; images={}
for page in ['index','servicios','nosotros','contacto','404']:
    soup=BeautifulSoup(open(f'{OUT}/{page}.html').read(),'html.parser')
    tpl=BeautifulSoup(soup.find('template',id='dc-tpl').decode_contents(),'html.parser')
    for el in tpl.select('[data-cms]'):
        k=el['data-cms']
        if el.name=='img': images[k]={'src':ab(el['src']),'alt':el.get('alt','')}
        else:
            h=el.decode_contents(); h=re.sub(r'<br\s*/?>','\n',h); h=re.sub(r'<[^>]+>','',h)
            texts.setdefault(k, re.sub(r'[ \t]+',' ',html.unescape(h)).strip())
    for el in tpl.select('[data-cms-href]'): texts.setdefault(el['data-cms-href'], el['href'])
js=r'''
const fs=require('fs');global.window={};
function load(p){const s=fs.readFileSync(p,'utf8');const code=s.match(/<script id="dc-code" type="text\/plain">([\s\S]*?)<\/script>/)[1];
 class DCLogic{constructor(){this.state={};this.props={}}setState(){}};return new Function('DCLogic',code+';return Component')(DCLogic);}
const M=new (load(process.argv[2]+'/index.html'))();M.setup();
const S=new (load(process.argv[2]+'/servicios.html'))();S.setup();
const brands=[];const seen=new Set();S.brands.forEach(b=>{if(!seen.has(b.src)){seen.add(b.src);brands.push({name:b.name,src:b.src,height:+b.style.match(/\d+/)[0]})}});
const ratio=r=>Math.round(r*10000)/10000;
console.log(JSON.stringify({
 projects:M.projects.map(p=>({name:p.name,title1:p.words[0],title2:p.words[1],tag:p.photos[0]?p.photos[0].cat:'',cat:p.cat,desc:p.desc,
   media:p.photos.map(ph=>({src:ph.src,video:ph.video||'',ratio:ratio(ph.ratio)}))})),
 services:S.data.map(d=>({name:d.name,detail:d.detail,inc:d.inc,media:d.photos.map(ph=>!ph?{src:'',video:''}:(typeof ph==='object'?{src:ph.poster,video:ph.video}:{src:ph,video:''}))})),
 brands}));
'''
open('/tmp/seed.js','w').write(js)
lists=json.loads(subprocess.check_output(['node','/tmp/seed.js',OUT]))
def fix(o):
    if isinstance(o,dict): return {k:fix(v) for k,v in o.items()}
    if isinstance(o,list): return [fix(v) for v in o]
    if isinstance(o,str): return ab(o)
    return o
lists=fix(lists)
seed={'version':1,'texts':texts,'images':images,**lists}
json.dump(seed,open('/home/claude/build/seed.json','w'),ensure_ascii=False,indent=1)
print(len(texts),'texts',len(images),'images',len(lists['projects']),'projects',len(lists['services']),'services',len(lists['brands']),'brands')
print(json.dumps(texts,ensure_ascii=False,indent=0)[:1800])
