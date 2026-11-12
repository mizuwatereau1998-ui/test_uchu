// RFC 4180 quoting, CRLF, UTF-8 BOM. No numeric inference for missing/suppressed cells.
export function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/,'');
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (c==='"') {
      if (quoted && text[i+1]==='"') {cell+='"';i++;}
      else if (!quoted && cell) throw new Error('CSVの引用符の位置が不正です。');
      else quoted=!quoted;
    } else if (c===',' && !quoted) {row.push(cell);cell='';}
    else if ((c==='\n'||c==='\r')&&!quoted) {
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);if(row.some(v=>v.trim()))rows.push(row); row=[];cell='';
    } else cell+=c;
  }
  if(quoted)throw new Error('CSVの引用符が閉じていません。');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
export function parseOfficialNumber(raw) {
  const text=String(raw??'').trim();
  if (!/^(\d+|\d{1,3}(,\d{3})+)(\.\d+)?$/.test(text)) throw new Error(`数値として扱えない値「${text}」があります。欠測・秘匿・「-」は0に置き換えません。`);
  const value=Number(text.replaceAll(',',''));
  if(!Number.isFinite(value))throw new Error('数値が範囲を超えています。');
  return value;
}
