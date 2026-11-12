import {parseCSV} from './data/csv.js';
import {readCSVFile,importOfficialCSV} from './data/import.js';
import {makePieSeries,formatPercent,formatNumber,PREFECTURES} from './domain/statistics.js';
import {renderPie,PALETTES} from './charts/pie.js';
const $=id=>document.getElementById(id);
let dataset=null,topN=5,rawText='',fileSequence=0;
function options() {return {title:$('title').value.trim()||`${dataset.item}の都道府県別収穫量`,palette:$('palette').value,fontSize:Number($('font-size').value),background:$('background').value,scale:1};}
function message(text){$('notice').textContent=text;}
function render() {
  $('swatches').replaceChildren(...PALETTES[$('palette').value].slice(0,6).map(color=>{const el=document.createElement('span');el.style.background=color;return el;}));
  $('font-value').value=`${$('font-size').value} px`;
  if(!dataset)return;
  const series=makePieSeries(dataset,topN);
  renderPie($('preview'),dataset,series,options());
  const dimensions=renderPie(document.createElement('canvas'),dataset,series,{...options(),scale:Number($('resolution').value)});
  $('dimensions').textContent=`${dimensions.width} × ${dimensions.height} px`;
  $('export-info').textContent=`出典・統計年・単位を含む / ${dimensions.width} × ${dimensions.height} px`;
  $('preview').hidden=false;$('empty-state').hidden=true;
  $('download').disabled=false;$('save-data').disabled=false;
  $('validation-status').textContent='全国値・47都道府県の数値を検証済み';
  $('display-year').value=`${dataset.year}年産`;
  $('item').replaceChildren(new Option(dataset.item,dataset.item));
  $('metadata').replaceChildren();
  for(const text of [`${dataset.year}年産`,dataset.publicationStatus,`${dataset.metric}（${dataset.unit}）`,`全国 ${formatNumber(dataset.national)} ${dataset.unit}`,`表ID：${dataset.tableId}`]) {
    const span=document.createElement('span');span.textContent=text;$('metadata').append(span);
  }
  const source=document.createElement('a');source.href=dataset.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';source.textContent='公式の出典を開く ↗';$('metadata').append(source);
  const sorted=[...dataset.rows].sort((a,b)=>b.value-a.value||PREFECTURES.indexOf(a.name)-PREFECTURES.indexOf(b.name));
  $('data-body').replaceChildren(...sorted.map((row,index)=>{
    const tr=document.createElement('tr');if(index<topN)tr.className='shown';
    for(const text of [String(index+1),row.name,formatNumber(row.value),formatPercent(row.value/dataset.national*100),index<topN?'個別表示':'その他に集計']){const td=document.createElement('td');td.textContent=text;tr.append(td);}return tr;
  }));
  const other=series.at(-1),tr=document.createElement('tr');
  for(const text of ['—','その他（グラフの集約値）',formatNumber(other.value),formatPercent(other.percent),'全国 − 上位合計']){const td=document.createElement('td');td.textContent=text;tr.append(td);}
  $('data-body').append(tr);$('quantity-header').textContent=`収穫量（${dataset.unit}）`;
  $('data-table').hidden=false;$('data-empty').hidden=true;
  const sum=dataset.rows.reduce((s,r)=>s+r.value,0);
  $('sum-note').textContent=`都道府県合計：${formatNumber(sum)} ${dataset.unit} ／ 全国値との差：${formatNumber(dataset.national-sum)} ${dataset.unit}。ファイルの出典・選択項目は取り込み時の利用者確認に基づきます。`;
}
$('top-controls').addEventListener('click',e=>{
  const button=e.target.closest('[data-top]');if(!button)return;topN=Number(button.dataset.top);
  for(const el of $('top-controls').querySelectorAll('button')){el.classList.toggle('selected',el===button);el.setAttribute('aria-pressed',String(el===button));}render();
});
for(const id of ['title','palette','font-size','background','resolution'])$(id).addEventListener('input',render);
function download(blob,name){const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('download').addEventListener('click',()=>{
  if(!dataset)return;
  try{const canvas=document.createElement('canvas');renderPie(canvas,dataset,makePieSeries(dataset,topN),{...options(),scale:Number($('resolution').value)});canvas.toBlob(blob=>{if(!blob){message('PNGの生成に失敗しました。出力サイズを下げて再試行してください。');return;}download(blob,`${dataset.item}_${dataset.year}_収穫量_上位${topN}.png`);},'image/png');}catch(error){message(`PNGを保存できません：${error.message}`);}
});
$('save-data').addEventListener('click',()=>{if(dataset)download(new Blob([JSON.stringify({...dataset,chart:{topN,series:makePieSeries(dataset,topN),options:options()}},null,2)],{type:'application/json'}),`${dataset.item}_${dataset.year}_検証.json`);});
function updateColumns(){
  if(!rawText)return;
  try {
    const rows=parseCSV(rawText),idx=Number($('header-row').value)-1;
    if(!Number.isInteger(idx)||!rows[idx])throw new Error('見出し行がファイル内にありません。');
    for(const id of ['area-column','value-column']){
      $(id).replaceChildren(new Option('列を選択',''),...rows[idx].map((header,i)=>new Option(`${i+1}: ${header||'（空欄）'}`,String(i))));
    }
    const table=document.createElement('table');
    for(const values of rows.slice(0,Math.min(8,rows.length))) {const tr=document.createElement('tr');for(const text of values){const td=document.createElement('td');td.textContent=text;tr.append(td);}table.append(tr);}
    $('raw-preview').replaceChildren(table);$('import-error').textContent='';
  }catch(error){$('import-error').textContent=error.message;}
}
async function readFile(){
  const sequence=++fileSequence,file=$('csv-file').files[0];rawText='';$('raw-preview').replaceChildren();
  for(const id of ['area-column','value-column'])$(id).replaceChildren(new Option('ファイルを選択',''));
  if(!file)return;
  try{if(file.size>10*1024*1024)throw new Error('10MB以下のCSVを指定してください。');const text=await readCSVFile(file,$('encoding').value);if(sequence!==fileSequence)return;rawText=text;updateColumns();}catch(error){$('import-error').textContent=`CSVを読み込めません：${error.message} 文字コードも確認してください。`;}
}
$('csv-file').addEventListener('change',readFile);$('encoding').addEventListener('change',readFile);$('header-row').addEventListener('change',updateColumns);
$('import-form').addEventListener('submit',async e=>{
  e.preventDefault();$('import-error').textContent='';
  try {
    if(!rawText)throw new Error('公式CSVを読み込んでください。');
    const file=$('csv-file').files[0],text=rawText;
    const metadata=Object.fromEntries(new FormData(e.target));
    const mapping={headerRow:Number($('header-row').value)-1,areaColumn:Number($('area-column').value),valueColumn:Number($('value-column').value)};
    const candidate=importOfficialCSV(text,{...metadata,publisher:'農林水産省',metric:'収穫量'},mapping);
    const bytes=await file.arrayBuffer();
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    candidate.import={fileName:file.name,sha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),encoding:$('encoding').value,mapping,importedAt:new Date().toISOString(),verification:'利用者が原表と照合'};
    dataset=candidate;$('title').value=`${dataset.item}の都道府県別収穫量`;
    render();message(`${dataset.item}・${dataset.year}年産（${dataset.publicationStatus}）を取り込みました。出典と選択項目は利用者の原表確認に基づきます。`);
    $('studio').scrollIntoView({behavior:'smooth'});
  } catch(error) {$('import-error').textContent=`取り込めません：${error.message}${dataset?' 現在の図版は前回成功した取り込みのままです。':''}`;}
});
render();
