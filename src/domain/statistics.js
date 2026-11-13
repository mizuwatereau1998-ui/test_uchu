export const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
export function validateDataset(data) {
  const fail = message => { throw new Error(message); };
  if (!data || typeof data !== 'object') fail('データの形式が正しくありません。');
  for (const key of ['item','year','unit','tableId','sourceUrl','publicationStatus','statistic','metric']) {
    if (typeof data[key] !== 'string' || !data[key].trim()) fail(`出典情報が不足しています：${key}`);
  }
  const url = new URL(data.sourceUrl);
  if (url.username || url.password || url.protocol !== 'https:' || !['www.e-stat.go.jp','api.e-stat.go.jp','www.maff.go.jp'].includes(url.hostname)) fail('出典URLには e-Stat または農林水産省の HTTPS URL を指定してください。');
  if (!/^[0-9]{4}$/.test(data.year)) fail('統計年は西暦4桁で指定してください。');
  if (data.publisher !== '農林水産省') fail('農林水産省が公表した統計のみ対応しています。');
  if (data.metric !== '収穫量') fail('この試作品では「収穫量」のみ対応しています。出荷量・産出額は使用できません。');
  if (!['確報','速報'].includes(data.publicationStatus)) fail('確報・速報の区分を確認してください。');
  if (!Number.isFinite(data.national) || data.national <= 0) fail('正の全国値が必要です。都道府県の合計による代用はしません。');
  if (!Array.isArray(data.rows) || !data.rows.length) fail('都道府県のデータがありません。');
  const names = new Set();
  for (const row of data.rows) {
    if (!PREFECTURES.includes(row.name)) fail(`不明な都道府県：${row.name}`);
    if (names.has(row.name)) fail(`都道府県が重複しています：${row.name}`);
    names.add(row.name);
    if (!Number.isFinite(row.value) || row.value < 0) fail(`${row.name} の収穫量が欠測または非数値です。推測による補完はしません。`);
  }
  if (data.coverage?.type === 'published-subset') {
    if (!Number.isInteger(data.coverage.count) || names.size !== data.coverage.count || names.size < 10 || !data.coverage.note?.trim()) fail('公表地域の件数・範囲情報が不正です。');
  } else if (names.size !== 47) fail(`都道府県データは ${names.size}/47 件です。欠測の順位を推測できないため描画しません。`);
  const sum = data.rows.reduce((s,r)=>s+r.value,0);
  if (sum > data.national) fail('都道府県合計が全国値を超えています。単位・項目・年次を確認してください。');
  return data;
}
export function makePieSeries(data, topN = 5) {
  validateDataset(data);
  if (![3,5,10].includes(topN)) throw new Error('上位数は3・5・10から選択してください。');
  const ranked = [...data.rows].sort((a,b) => b.value-a.value || PREFECTURES.indexOf(a.name)-PREFECTURES.indexOf(b.name));
  const selected = ranked.slice(0,topN);
  const rest = data.national - selected.reduce((s,r)=>s+r.value,0);
  return [...selected,{name:'その他',value:rest}].map(row=>({...row, percent:row.value/data.national*100}));
}
export const formatPercent = value => `${(Math.round((value + Number.EPSILON * Math.max(1,value)) * 10) / 10).toFixed(1)}%`;
export const formatNumber = value => new Intl.NumberFormat('ja-JP',{maximumFractionDigits:20}).format(value);

export const coverageLabel = data => data.coverage?.type === 'published-subset' ? `公表${data.rows.length}地域内の上位。未掲載地域・丸め差はその他に含む（未掲載を0にしない）。` : '47都道府県の収穫量';
