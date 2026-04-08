import xlrd, json, os, sys

# Ищем Excel-файл с прайсом Казахстан
search = [
    os.path.join(os.path.expanduser('~'), 'Downloads'),
    os.path.join(os.path.expanduser('~'), 'Desktop'),
]
xls = None
for d in search:
    if not os.path.isdir(d): continue
    for f in os.listdir(d):
        if 'Казахстан' in f and f.endswith('.xls'):
            xls = os.path.join(d, f)
            break
    if xls: break

if not xls:
    print('ERROR: Excel not found'); sys.exit(1)

print(f'Source: {xls}')
wb = xlrd.open_workbook(xls)
sh = wb.sheet_by_index(0)
compact = {}
for r in range(6, sh.nrows):
    art = str(sh.cell_value(r, 0)).strip()
    if not art or len(art) < 3: continue
    if not any(c.isdigit() for c in art): continue
    pp = sh.cell_value(r, 9)
    rp = sh.cell_value(r, 13)
    unit = str(sh.cell_value(r, 3)).strip()
    if not pp and not rp: continue
    entry = {}
    if pp: entry['p'] = round(float(pp))
    if rp: entry['r'] = round(float(rp))
    if unit: entry['u'] = unit
    compact[art.upper()] = entry

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prices_kz.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(compact, f, ensure_ascii=False, separators=(',',':'))
print(f'Done: {len(compact)} articles -> {out}')
