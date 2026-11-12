import {parseCSV,parseOfficialNumber} from './csv.js';
import {validateDataset,PREFECTURES} from '../domain/statistics.js';
export async function readCSVFile(file,encoding='utf-8') {
  const buffer=await file.arrayBuffer();
  return new TextDecoder(encoding,{fatal:true}).decode(buffer);
}
// A mapping is explicit: never guess which column represents harvest rather than shipment.
export function importOfficialCSV(text,metadata,mapping) {
  const rows=parseCSV(text);
  const {headerRow=0,areaColumn,valueColumn}=mapping;
  if(!Number.isInteger(headerRow)||headerRow<0||headerRow>=rows.length)throw new Error('見出し行が正しくありません。');
  if(!Number.isInteger(areaColumn)||!Number.isInteger(valueColumn)||areaColumn<0||valueColumn<0||areaColumn===valueColumn)throw new Error('都道府県列と収穫量列を別々に選択してください。');
  let national;const values=[];
  for(const row of rows.slice(headerRow+1)) {
    const name=(row[areaColumn]||'').replace(/[\s　]/g,'');
    if(name==='全国') {
      if(national!==undefined)throw new Error('全国行が重複しています。年次・品目・項目を1種類に絞ってください。');
      national=parseOfficialNumber(row[valueColumn]);
    } else if(PREFECTURES.includes(name)) values.push({name,value:parseOfficialNumber(row[valueColumn])});
  }
  return validateDataset({...metadata,national,rows:values});
}
