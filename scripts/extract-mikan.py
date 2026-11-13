"""Reproduce the CSV from the original official XLSX; no external dependencies.
Default: verify the committed derived CSV. --write: regenerate it from verified XLSX.
"""
import csv, hashlib, io, json, pathlib, sys, xml.etree.ElementTree as ET, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'data/mikan-2024.json').read_text())
raw = (ROOT / 'data/mikan-2024-source.xlsx').read_bytes()
assert hashlib.sha256(raw).hexdigest() == manifest['provenance']['originalSha256'], 'Original XLSX checksum mismatch'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(io.BytesIO(raw)) as z:
    # Exclude phonetic/ruby annotations (rPh), e.g. 愛媛 / エヒメ.
    strings = [''.join(t.text or '' for t in si.findall('m:t', NS) + si.findall('m:r/m:t', NS)) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    cells = {}
    for c in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:c', NS):
        v = c.find('m:v', NS)
        value = v.text if v is not None else ''
        cells[c.get('r')] = strings[int(value)] if c.get('t') == 's' else value
assert '令和６年産' in cells['A3'] and 'みかん' in cells['A5'] and '計' in cells['A6']
assert cells['G8'] == '収穫量' and cells['H8'] == '出荷量' and cells['G11'] == 'ｔ'
output = io.StringIO(newline='')
writer = csv.writer(output, lineterminator='\n')
writer.writerow(['都道府県', '収穫量(t)', '原表セル'])
for row in [12] + list(range(14, 34)):
    name = (cells.get(f'B{row}', '') if row == 12 else cells[f'C{row}']).strip()
    if name != '全国':
        name = name + ('府' if name == '大阪' else '県')
    value = cells[f'G{row}']
    assert value.isdecimal(), f'Missing or suppressed value at G{row}'
    writer.writerow([name, value, f'G{row}'])
result = output.getvalue().encode('utf-8')
path = ROOT / 'data/mikan-2024.csv'
if '--write' in sys.argv:
    path.write_bytes(result)
else:
    assert path.read_bytes() == result, 'Derived CSV differs from original source cells'
    assert hashlib.sha256(result).hexdigest() == manifest['provenance']['csvSha256']
    print('PASS: official XLSX SHA-256, identity/harvest/unit headers, national + all 20 published prefectures equal CSV.')
