import {importOfficialCSV} from './import.js';
// Adapter boundary: an eventual server-side API job must produce the same domain model.
// The static browser only loads public artifacts; it never holds an API application ID.
export async function importVerifiedMikanCSV(text, metadata) {
  if(metadata.tableId!=='0004046674'||metadata.year!=='2024'||metadata.metric!=='収穫量'||metadata.unit!=='t')throw new Error('対応するみかんの統計表・年次・項目ではありません。');
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  const sha256=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  if(sha256!==metadata.provenance.csvSha256)throw new Error('検証済みCSVのSHA-256と一致しません。ファイルを加工せず選択してください。別のCSVは通常の取り込みを使用してください。');
  const data=importOfficialCSV(text,metadata,{headerRow:0,areaColumn:0,valueColumn:1});
  return {...data,import:{sha256,verification:'公式Excel原本の全公表収穫量と照合済み（同梱CSV）'}};
}
export async function loadMikan(fetcher=fetch) {
  const [meta,csv]=await Promise.all([fetcher('./data/mikan-2024.json'),fetcher('./data/mikan-2024.csv')]);
  if(!meta.ok||!csv.ok)throw new Error('同梱のみかんデータを読み込めません。静的サーバーから起動してください。');
  return importVerifiedMikanCSV(await csv.text(),await meta.json());
}
