import {formatPercent,formatNumber} from '../domain/statistics.js';
export const PALETTES = {
  textbook:['#326b62','#7eab91','#d7b45a','#cc8264','#7195b5','#a48cab','#a6bb7b','#d49cba','#7eaaa6','#b6a089','#d9ded8'],
  blue:['#214f80','#4276a4','#6795bf','#8fb2d1','#b5cde1','#6f82ae','#8098b2','#a3b2c4','#bec9d4','#d2dae2','#e0e5eb'],
  contrast:['#0072b2','#e69f00','#009e73','#cc79a7','#56b4e9','#d55e00','#a98f00','#7764a0','#684835','#8c9b69','#d5d9dd']
};
const font = size => `${size}px "Noto Sans CJK JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif`;
function wrap(ctx,text,maxWidth) {
  const result=[];let line='';
  for(const c of text) {if(ctx.measureText(line+c).width>maxWidth&&line){result.push(line);line='';}line+=c;}
  if(line)result.push(line); return result;
}
export function renderPie(canvas, data, series, options={}) {
  const {title=`${data.item}の収穫量`,palette='textbook',fontSize=28,background='white',scale=1}=options;
  const colors=PALETTES[palette]||PALETTES.textbook;
  const width=1600, margin=80, legendX=940, legendWidth=580;
  const scratch=canvas.getContext('2d'); scratch.font=font(fontSize*1.7);
  const titles=wrap(scratch,title,width-margin*2);
  scratch.font=font(fontSize);
  const subtitleLines=wrap(scratch,`${data.year}年産  ·  ${data.publicationStatus}  ·  単位：${data.unit}  ·  全国 ${formatNumber(data.national)} ${data.unit}`,width-margin*2);
  const headerHeight=80+titles.length*fontSize*2+(subtitleLines.length-1)*fontSize*1.4;
  const source=`出典：${data.publisher}「${data.statistic}」／表ID：${data.tableId}`;
  scratch.font=font(fontSize*.65);
  const footLines=[...wrap(scratch,source,width-margin*2),...wrap(scratch,data.sourceUrl,width-margin*2),...wrap(scratch,'割合は全国値を分母に小数第1位で四捨五入。「その他」＝全国値−表示した都道府県の収穫量合計。',width-margin*2)];
  const bodyHeight=Math.max(720,series.length*(fontSize*2.1)+60);
  const height=headerHeight+bodyHeight+footLines.length*fontSize*.95+110;
  canvas.width=Math.round(width*scale); canvas.height=Math.round(height*scale);
  const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
  ctx.clearRect(0,0,width,height);
  if(background==='white'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);}
  ctx.fillStyle='#20352e';ctx.font=font(fontSize*1.7);
  titles.forEach((line,i)=>ctx.fillText(line,margin,80+i*fontSize*2));
  ctx.font=font(fontSize);ctx.fillStyle='#52645c';
  subtitleLines.forEach((line,i)=>ctx.fillText(line,margin,80+titles.length*fontSize*2-20+i*fontSize*1.4));
  const cx=450,cy=headerHeight+bodyHeight/2,r=310;
  let angle=-Math.PI/2;
  series.forEach((row,i)=>{
    const end=angle+row.value/data.national*Math.PI*2;
    if(row.value>0){ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,angle,end);ctx.closePath();ctx.fillStyle=row.name==='その他'?colors.at(-1):colors[i];ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();}
    angle=end;
  });
  // Labels in a separate column: narrow slices never collide with text.
  const lineHeight=fontSize*2.1,top=headerHeight+(bodyHeight-series.length*lineHeight)/2;
  series.forEach((row,i)=>{
    const y=top+i*lineHeight;
    ctx.fillStyle=row.name==='その他'?colors.at(-1):colors[i];ctx.fillRect(legendX,y-fontSize*.8,fontSize*.7,fontSize*.7);
    ctx.fillStyle='#20352e';ctx.font=font(fontSize);ctx.textAlign='left';ctx.fillText(row.name,legendX+fontSize*1.15,y);
    ctx.textAlign='right';ctx.fillText(formatPercent(row.percent),legendX+legendWidth,y);
    ctx.textAlign='left';ctx.font=font(fontSize*.65);ctx.fillStyle='#52645c';ctx.fillText(`${formatNumber(row.value)} ${data.unit}`,legendX+fontSize*1.15,y+fontSize*.9);
  });
  ctx.textAlign='left';ctx.font=font(fontSize*.65);ctx.fillStyle='#52645c';
  footLines.forEach((line,i)=>ctx.fillText(line,margin,headerHeight+bodyHeight+45+i*fontSize*.95));
  return {width:canvas.width,height:canvas.height};
}
