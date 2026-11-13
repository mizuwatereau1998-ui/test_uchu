import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {importVerifiedMikanCSV} from '../src/data/mikan.js';
import {makePieSeries,formatPercent,validateDataset} from '../src/domain/statistics.js';
const meta=JSON.parse(await readFile(new URL('../data/mikan-2024.json',import.meta.url),'utf8'));
const csv=await readFile(new URL('../data/mikan-2024.csv',import.meta.url),'utf8');
test('real official mikan: national, all 20 source values, publication scope; no zero-filled missing prefectures',async()=>{
  const d=await importVerifiedMikanCSV(csv,meta);
  const expected=[753,9340,88500,19600,12200,10300,141700,11100,4620,7940,9090,76100,4650,13400,29400,29100,63800,7880,5970,9500];
  assert.deepEqual(d.rows.map(r=>r.value),expected);assert.equal(d.national,559600);assert.equal(d.rows.length,20);
  assert.equal(d.rows.reduce((s,r)=>s+r.value,0),554943);
  assert.equal(d.rows.find(r=>r.name==='愛媛県').value,76100);
  for(const row of d.rows){
    // Independently round an exact integer fraction, without binary float formatting.
    const tenths=(BigInt(row.value)*1000n*2n+559600n)/(559600n*2n);
    assert.equal(formatPercent(row.value/d.national*100),`${(Number(tenths)/10).toFixed(1)}%`);
  }
  const bad=structuredClone(d);bad.rows.pop();assert.throws(()=>validateDataset(bad));
  const unknown=structuredClone(d);delete unknown.coverage;assert.throws(()=>validateDataset(unknown));
});
test('real official mikan: upper 3/5/10 plus Other match independently calculated reference totals',async()=>{
  const d=await importVerifiedMikanCSV(csv,meta);
  const names=['和歌山県','静岡県','愛媛県','熊本県','佐賀県','長崎県','愛知県','福岡県','三重県','広島県'];
  for(const [top,other,share] of [[3,253300,'45.3%'],[5,160100,'28.6%'],[10,74700,'13.3%']]){
    const s=makePieSeries(d,top);
    assert.deepEqual(s.slice(0,-1).map(r=>r.name),names.slice(0,top));
    assert.equal(s.at(-1).value,other);assert.equal(formatPercent(s.at(-1).percent),share);
    assert.equal(s.reduce((sum,r)=>sum+r.value,0),559600);
    assert.equal(s[0].value,141700);assert.equal(formatPercent(s[0].percent),'25.3%');
  }
});
test('modified official CSV or shipment values cannot masquerade as verified harvest data',async()=>{
  await assert.rejects(importVerifiedMikanCSV(csv.replace('141700','130600'),meta),/SHA-256/);
  await assert.rejects(importVerifiedMikanCSV(csv,{...meta,metric:'出荷量'}),/項目/);
});
