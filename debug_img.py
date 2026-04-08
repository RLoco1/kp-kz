import urllib.request, json

BASE = 'https://script.google.com/macros/s/AKfycbyDEwJXSJR7REj4JC4BSIPJn_wMVrmWQ1ZmHKCCaRv3FweWfJSbd2sfOH4SG50V6PMo/exec'

r = urllib.request.urlopen(BASE + '?action=tiles', timeout=15)
raw = r.read().decode('utf-8')
print(f"Response length: {len(raw)}")
print(f"First 500 chars: {raw[:500]}")
print(f"Last 100 chars: {raw[-100:]}")

data = json.loads(raw)
print(f"Type: {type(data)}")
if isinstance(data, dict):
    print(f"Keys: {list(data.keys())}")
    for k,v in data.items():
        if isinstance(v, list):
            print(f"  {k}: list of {len(v)}")
        elif isinstance(v, str):
            print(f"  {k}: str len={len(v)}")
        else:
            print(f"  {k}: {type(v).__name__} = {v}")
elif isinstance(data, list):
    print(f"List length: {len(data)}")
    if data:
        print(f"First item keys: {list(data[0].keys())}")
