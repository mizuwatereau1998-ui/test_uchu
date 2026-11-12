import test from 'node:test';
import assert from 'node:assert/strict';
import {PREFECTURES,validateDataset,makePieSeries,formatPercent} from '../src/domain/statistics.js';
import {parseCSV,parseOfficialNumber} from '../src/data/csv.js';
import {importOfficialCSV} from '../src/data/import.js';
// Synthetic unit-test inputs ONLY. These are not official statistics or shipped samples.
export const fixture=()=>({item:'単体テスト用合成データ',year:'2000',unit:'t',tableId:'synthetic-test-only',sourceUrl:'https://www.maff.go.jp/',publicationStatus:'確報',statistic:'合成テスト（統計ではない）',metric:'収穫量',publisher:'農林水産省',national:1200,rows:PREFECTURES.map((name,i)=>({name,value:47-i}))});
test('national denominator, exact remainder and descending order for all supported top counts',()=>{
  const data=fixture();
  for(const n of [3,5,10]) {
    const s=makePieSeries(data,n);
    assert.equal(s.length,n+1);assert.equal(s[0].name,'北海道');
    assert.equal(s[0].percent,47/1200*100);
    assert.equal(s.at(-1).value,1200-data.rows.slice(0,n).reduce((a,r)=>a+r.value,0));
    assert.equal(s.reduce((a,r)=>a+r.value,0),data.national);
    assert.ok(Math.abs(s.reduce((a,r)=>a+r.percent,0)-100)<1e-10);
  }
  assert.equal(formatPercent(0.15),'0.2%');assert.equal(formatPercent(12.35),'12.4%');assert.equal(formatPercent(12.345),'12.3%');assert.equal(formatPercent(12.36),'12.4%');
});
test('rejects missing values, missing prefectures, duplicates, wrong metric and invalid totals',()=>{
  for(const change of [d=>d.rows.pop(),d=>d.rows[0].value=null,d=>d.rows[0].value=-1,d=>d.rows[1].name=d.rows[0].name,d=>d.metric='出荷量',d=>d.national=1,d=>d.national=0,d=>d.publisher='その他',d=>d.sourceUrl='https://www.maff.go.jp.evil.example/']){
    const d=fixture();change(d);assert.throws(()=>validateDataset(d));
  }
});
test('CSV import uses explicitly selected harvest column and preserves every raw value',()=>{
  const data=fixture();
  const csv='都道府県,収穫量,出荷量\r\n全国,1200,1\r\n'+data.rows.map(r=>`${r.name},${r.value},0`).join('\r\n');
  const imported=importOfficialCSV(csv,data,{headerRow:0,areaColumn:0,valueColumn:1});
  assert.deepEqual(imported.rows,data.rows);assert.equal(imported.national,1200);
  assert.deepEqual(makePieSeries(imported,5),makePieSeries(data,5));
  assert.throws(()=>importOfficialCSV(csv+'\n全国,1200,1',data,{headerRow:0,areaColumn:0,valueColumn:1}),/全国行が重複/);
});
test('BOM, commas, CRLF and quoted newline; missing/suppression symbols are never zero',()=>{
  assert.deepEqual(parseCSV('\uFEFF都道府県,収穫量\r\n全国,"1,200"\r\n"複数\n行",0'),[['都道府県','収穫量'],['全国','1,200'],['複数\n行','0']]);
  assert.equal(parseOfficialNumber('1,200'),1200);assert.equal(parseOfficialNumber('0'),0);
  for(const s of ['','-','…','x','X','***','1,20','1e3','NaN'])assert.throws(()=>parseOfficialNumber(s));
  assert.throws(()=>parseCSV('"not closed'));
});
