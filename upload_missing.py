import urllib.request, json, base64, os, time, sys

BASE = 'https://script.google.com/macros/s/AKfycbyDEwJXSJR7REj4JC4BSIPJn_wMVrmWQ1ZmHKCCaRv3FweWfJSbd2sfOH4SG50V6PMo/exec'
TEX = r'C:\Users\baronova_sa\Desktop\App Corona 1.3\catalog\textures'

local_files = [f for f in os.listdir(TEX) if f.lower().endswith(('.jpg','.jpeg','.png'))]
print(f"Local files: {len(local_files)}")

uploaded = 0
existed = 0
errors = 0
for i, fname in enumerate(local_files):
    fpath = os.path.join(TEX, fname)
    fsize = os.path.getsize(fpath)
    if fsize > 4*1024*1024:
        print(f"  [{i+1}/{len(local_files)}] SKIP {fname} (too large)")
        continue
    with open(fpath, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    payload = json.dumps({'action':'upload','name':fname,'data':b64}).encode('utf-8')
    try:
        req = urllib.request.Request(BASE, data=payload,
              headers={'Content-Type':'application/json'}, method='POST')
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        st = result.get('status','?')
        if st == 'uploaded':
            uploaded += 1
            print(f"  [{i+1}] UPLOADED {fname}")
        elif st == 'exists':
            existed += 1
        else:
            errors += 1
            print(f"  [{i+1}] FAIL {fname}: {result}")
    except Exception as e:
        errors += 1
        print(f"  [{i+1}] ERROR {fname}: {e}")
    if (i+1) % 50 == 0:
        print(f"  --- Progress: {i+1}/{len(local_files)} | uploaded={uploaded} exists={existed} errors={errors}")
        time.sleep(1)

print(f"\nDONE: uploaded={uploaded}, already existed={existed}, errors={errors}")
