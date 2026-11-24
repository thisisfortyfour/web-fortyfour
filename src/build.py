import re, os, shutil, json, hashlib, subprocess
from PIL import Image
SRC='/home/claude/fortyfour/project'; OUT='/home/claude/site/fortyfour-web'; DOMAIN='https://thisisfortyfour.com'
GA='G-568Q2SNV3Z'
SB_URL=os.environ.get('SB_URL',''); SB_KEY=os.environ.get('SB_KEY','')
BOOT=('window.__FF_SITE=true;(function(){var U=%s,K=%s,done=false;function go(c){if(done)return;done=true;if(c)window.__FF_CONTENT=c;'
 'DCLite.mount(document.getElementById("dc-tpl"),document.getElementById("dc-code").textContent,document.getElementById("dc"));}'
 'if(!U||!K){go(null);return;}var cached=null;try{cached=JSON.parse(localStorage.getItem("ff-content")||"null")}catch(e){}'
 'setTimeout(function(){go(cached)},2500);'
 'fetch(U+"/rest/v1/web_content?id=eq.site&select=data",{headers:{apikey:K}}).then(function(r){return r.json()}).then(function(rows){'
 'var c=rows&&rows[0]&&rows[0].data;if(c){try{localStorage.setItem("ff-content",JSON.stringify(c))}catch(e){}}go(c||cached)}).catch(function(){go(cached)});})();') % (json.dumps(SB_URL), json.dumps(SB_KEY))
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT+'/assets/img'); os.makedirs(OUT+'/assets/video'); os.makedirs(OUT+'/assets/fonts'); os.makedirs(OUT+'/assets/meta')
# --- assets: blob id -> local file
loc={}
for l in open('/tmp/local.txt'):
    hh,p=l.split(None,1); loc.setdefault(hh,p.strip())
blob={}
for l in open('/tmp/assets.txt'):
    i,hh,e=l.split(); src=loc[hh]; base=os.path.basename(src).replace('_','-').lower()
    if base.startswith('a80a5322-'): base='AlteHaasGroteskRegular.ttf'
    if base=='logo-44.png':
        im=Image.open(src); im=im.resize((round(im.width*480/im.height),480),Image.LANCZOS); im.save(OUT+'/assets/img/logo-44.png',optimize=True); blob[i]='/assets/img/logo-44.png'; continue
    if base=='w3-9.jpg': base='wedding-3.jpg'
    sub='video' if e=='mp4' else 'fonts' if e=='ttf' else 'img'
    shutil.copy(src, f'{OUT}/assets/{sub}/{base}'); blob[i]=f'/assets/{sub}/{base}'
for f in ['favicon-32.png','apple-touch-icon.png','icon-512.png','og-image.jpg']: shutil.copy('/home/claude/imgs/'+f, OUT+'/assets/meta/'+f)
# Lighter files: recompress large photos, use the re-encoded videos (same names, so saved links keep working)
for f in os.listdir(OUT+'/assets/img'):
    p=OUT+'/assets/img/'+f
    if f.endswith('.jpg') and os.path.getsize(p)>100*1024:
        im=Image.open(p).convert('RGB'); im.save(p,'JPEG',quality=80,optimize=True,progressive=True)
for f in os.listdir('optimized'):
    if f.endswith('.mp4') and os.path.exists(OUT+'/assets/video/'+f) and os.path.getsize('optimized/'+f) < os.path.getsize(OUT+'/assets/video/'+f):
        shutil.copy('optimized/'+f, OUT+'/assets/video/'+f)
shutil.copy('dc-lite.min.js', OUT+'/assets/dc-lite.js')
ROUTES={'Main.dc.html':'/','Servicios.dc.html':'/servicios','Estudio.dc.html':'/nosotros','Contacto.dc.html':'/contacto','Error404.dc.html':'/404','Legales.dc.html':'/legales'}
PAGES=[('Main.dc.html','index.html','/','FORTYFOUR — Agencia creativa','FORTYFOUR es una agencia creativa: fotografía, diseño, gestión de redes, PR, wedding content y brand content. Pensamos, creamos, movemos.'),
 ('Servicios.dc.html','servicios.html','/servicios','Servicios — FORTYFOUR','Fotografía, diseño, gestión de redes, PR, wedding content y brand content para marcas que quieren comunicar mejor.'),
 ('Estudio.dc.html','nosotros.html','/nosotros','Sobre nosotros — FORTYFOUR','Quiénes somos, cómo trabajamos y en qué creemos en FORTYFOUR.'),
 ('Contacto.dc.html','contacto.html','/contacto','Contacto — FORTYFOUR','Contanos tu proyecto: marcas, wedding content u otro proyecto. Te respondemos a la brevedad.'),
 ('Legales.dc.html','legales.html','/legales','Legales — FORTYFOUR','Términos y condiciones, propiedad intelectual, política de privacidad y cookies de FORTYFOUR.'),
 ('Error404.dc.html','404.html',None,'Página no encontrada — FORTYFOUR','Esta página no existe o cambió de lugar.')]
def esc(s): return s.replace('&','&amp;').replace('"','&quot;').replace('<','&lt;')
for src,out,path,title,desc in PAGES:
    s=open(f'{SRC}/{src}').read()
    for k,v in ROUTES.items(): s=s.replace(k,v)
    s=s.replace("src: '/_blob/' + id","src: id")
    s=re.sub(r"B\('([0-9a-f]{32})'", lambda m: "B('"+blob[m.group(1)]+"'", s)
    s=re.sub(r'/_blob/([0-9a-f]{32})', lambda m: blob[m.group(1)], s)
    assert '_blob' not in s, src
    helmet=re.search(r'<helmet>(.*?)</helmet>', s, re.S).group(1)
    body=re.search(r'<x-dc>(.*?)</x-dc>', s, re.S).group(1)
    body=re.sub(r'<helmet>.*?</helmet>','',body,flags=re.S)
    code=re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', s, re.S).group(1)
    if src=='Contacto.dc.html':
        old="this.setState({ errors: errors, sent: Object.keys(errors).length === 0 });"
        assert old in code
        code=code.replace(old,"const ok = Object.keys(errors).length === 0;\n      if (ok && window.__ffSend) window.__ffSend(f, v);\n      this.setState({ errors: errors, sent: ok });")
    assert '</script' not in code and '</template' not in body
    url=DOMAIN+(path or '/')
    head=f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{'' if path else '<meta name="robots" content="noindex">'}
{f'<link rel="canonical" href="{url}">' if path else ''}
<meta name="theme-color" content="#f8f8f6">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FORTYFOUR">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{DOMAIN}/assets/meta/og-image.jpg">
<meta property="og:locale" content="es_AR">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/meta/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/meta/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/AlteHaasGroteskRegular.ttf" as="font" type="font/ttf" crossorigin>
<script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA}');</script>
{helmet.strip()}
<style>
html{{background:#f8f8f6}}
@keyframes ff-in{{from{{opacity:0}}to{{opacity:1}}}}
#dc{{animation:ff-in .45s ease both}}
html.ff-leave #dc{{opacity:0;transition:opacity .3s ease}}
@media (prefers-reduced-motion: reduce){{#dc{{animation:none}}}}
</style>
</head>
<body>
<div id="dc"></div>
<noscript><p style="font-family:sans-serif;padding:24px">FORTYFOUR — agencia creativa. Para ver la web activá JavaScript, o escribinos a <a href="mailto:federico@thisisfortyfour.com">federico@thisisfortyfour.com</a>.</p></noscript>
<template id="dc-tpl">{body}</template>
<script id="dc-code" type="text/plain">{code}</script>
<script src="/assets/dc-lite.js"></script>
<script src="/assets/site.js"></script>
<script>{BOOT}</script>
</body>
</html>
'''
    open(f'{OUT}/{out}','w').write(head)
open(OUT+'/robots.txt','w').write(f'User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n')
open(OUT+'/sitemap.xml','w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{DOMAIN}{p[2]}</loc></url>\n' for p in PAGES if p[2])+'</urlset>\n')
open(OUT+'/netlify.toml','w').write('''[[redirects]]
  from = "/proyectos/*"
  to = "/index.html"
  status = 200

[[redirects]]
  from = "https://www.thisisfortyfour.com/*"
  to = "https://thisisfortyfour.com/:splat"
  status = 301
  force = true

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=604800"
''')
print('ok', sum(os.path.getsize(os.path.join(d,f)) for d,_,fs in os.walk(OUT) for f in fs)//1024,'KB')
