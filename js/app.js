const $=s=>document.querySelector(s);
const MONTH={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12};
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
let data=[],notes=[],inflation=[],periods=[];

function split(line){
  let out=[],s='',q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){
      if(q&&line[i+1]==='"'){s+='"';i++}else q=!q;
    }else if(c===';'&&!q){out.push(s);s=''}else s+=c;
  }
  out.push(s);return out;
}
function parse(text){
  const clean=text.replace(/^\uFEFF/,'').trim();
  if(!clean)return [];
  const lines=clean.split(/\r?\n/),head=split(lines.shift()).map(x=>x.trim());
  return lines.filter(Boolean).map(line=>Object.fromEntries(head.map((h,i)=>[h,(split(line)[i]??'').trim()])));
}
function periodKey(p){
  const m=p.trim().toLowerCase().match(/^([a-záéíóú]{3})-(\d{2}|\d{4})$/);
  if(!m)return [9999,99,p];
  let y=+m[2];if(y<100)y+=2000;
  return [y,MONTH[m[1]]??99,p];
}
function comparePeriod(a,b){const x=periodKey(a),y=periodKey(b);return x[0]-y[0]||x[1]-y[1]||x[2].localeCompare(y[2])}

async function init(){
  try{
    const [m,c,i]=await Promise.all([
      fetch('data/movimientos.csv',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No se encontró movimientos.csv');return r.text()}),
      fetch('data/conclusiones.csv',{cache:'no-store'}).then(r=>r.ok?r.text():''),
      fetch('data/inflacion.csv',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No se encontró inflacion.csv');return r.text()})
    ]);
    data=parse(m).map(x=>({...x,Periodo:(x.Periodo||'').toLowerCase(),Cochera:Number(x.Cochera||0),Unidad:Number(x.Unidad||0),Controlado:(x.Controlado||'').trim()}));
    notes=parse(c);
    inflation=parse(i).map(x=>({Periodo:(x.Periodo||'').trim().toLowerCase(),Inflacion:Number(String(x.Inflacion||0).replace('%','').replace(',','.'))}));
    const required=['Periodo','Proveedor','Concepto','Cochera','Unidad'];
    if(!data.length||required.some(k=>!(k in data[0])))throw Error('El CSV debe contener: '+required.join(';'));
    periods=[...new Set(data.map(x=>x.Periodo).filter(Boolean))].sort(comparePeriod);
    $('#period').innerHTML='<option value="">Todos</option>'+periods.map(x=>`<option value="${x}">${x}</option>`).join('');
    $('#conclusionPeriod').innerHTML=periods.map(x=>`<option value="${x}">${x}</option>`).join('');
    $('#conclusionPeriod').value=periods.at(-1)||'';
    $('#supplier').innerHTML='<option value="">Todos</option>'+[...new Set(data.map(x=>x.Proveedor))].sort().map(x=>`<option>${x}</option>`).join('');
    $('#period').onchange=$('#supplier').onchange=render;
    $('#search').oninput=render;
    document.querySelectorAll('input[name="averageView"],input[name="chartView"],input[name="rankView"]').forEach(x=>x.onchange=render);
    document.querySelectorAll('input[name="conclusionView"]').forEach(x=>x.onchange=renderInsights);
    $('#conclusionPeriod').onchange=renderInsights;
    $('#theme').onclick=()=>document.body.classList.toggle('dark');
    $('#export').onclick=exportCsv;
    render();renderInsights();
  }catch(e){$('#error').hidden=false;$('#error').textContent=e.message}
}
function filtered(){
  const p=$('#period').value,s=$('#supplier').value,q=$('#search').value.toLowerCase();
  return data.filter(x=>(!p||x.Periodo===p)&&(!s||x.Proveedor===s)&&(!q||(x.Proveedor+' '+x.Concepto).toLowerCase().includes(q)));
}
function grouped(rows,key,field){return rows.reduce((a,x)=>(a[key(x)]=(a[key(x)]||0)+x[field],a),{})}
function rank(id,obj,color){
  const top=Object.entries(obj).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,10),max=top[0]?.[1]||1;
  $(id).innerHTML=top.map(([k,v])=>`<div class="rank"><label title="${k}">${k}</label><div class="track"><i style="width:${v/max*100}%;background:${color}"></i></div><b class="num">${money(v)}</b></div>`).join('')||'<p>Sin movimientos.</p>';
}

function render(){
  const r=filtered(),g=grouped(r,x=>x.Proveedor,'Cochera'),u=grouped(r,x=>x.Proveedor,'Unidad');
  const meses=new Set(r.map(x=>x.Periodo)).size||1;
  const averageView=document.querySelector('input[name="averageView"]:checked')?.value||'unit';
  let averageData={};
  if(averageView==='unit')averageData=u;else if(averageView==='garage')averageData=g;else{
    for(const k of new Set([...Object.keys(g),...Object.keys(u)]))averageData[k]=(g[k]||0)+(u[k]||0);
  }
  $('#monthlyAverage').textContent=money(Object.values(averageData).reduce((a,b)=>a+b,0)/meses);
  $('#providerCountText').textContent=`Total proveedores: ${Object.values(averageData).filter(v=>v>0).length}`;

  const rankView=document.querySelector('input[name="rankView"]:checked')?.value||'unit';
  let rankData={},rankColor='var(--mint)';
  if(rankView==='unit')rankData=u;else if(rankView==='garage'){rankData=g;rankColor='var(--blue)'}else{
    for(const k of new Set([...Object.keys(g),...Object.keys(u)]))rankData[k]=(g[k]||0)+(u[k]||0);
    rankColor='#7c3aed';
  }
  rank('#providerRank',rankData,rankColor);

  const gm=grouped(r,x=>x.Periodo,'Cochera'),um=grouped(r,x=>x.Periodo,'Unidad');
  const view=document.querySelector('input[name="chartView"]:checked')?.value||'unit';
  const showGarage=view==='garage'||view==='both',showUnit=view==='unit'||view==='both';
  const visiblePeriods=periods.filter(p=>(gm[p]||0)>0||(um[p]||0)>0);
  const actualValue=p=>view==='unit'?(um[p]||0):view==='garage'?(gm[p]||0):(gm[p]||0)+(um[p]||0);
  const inflationByPeriod=Object.fromEntries(inflation.map(x=>[x.Periodo,Number.isFinite(x.Inflacion)?x.Inflacion:0]));
  const inflationReference=[];
  visiblePeriods.forEach((period,index)=>{
    if(index===0)inflationReference.push(actualValue(period));
    else inflationReference.push(inflationReference[index-1]*(1+(inflationByPeriod[visiblePeriods[index-1]]||0)/100));
  });
  const values=[];
  if(showGarage)values.push(...visiblePeriods.map(p=>gm[p]||0));
  if(showUnit)values.push(...visiblePeriods.map(p=>um[p]||0));
  values.push(...inflationReference);
  const max=Math.max(1,...values),chartWidth=1000,chartHeight=260,topPadding=12,bottomPadding=18,usableHeight=chartHeight-topPadding-bottomPadding;
  const pointCoordinates=inflationReference.map((value,index)=>({x:((index+.5)/visiblePeriods.length)*chartWidth,y:topPadding+(1-value/max)*usableHeight,value,period:visiblePeriods[index]}));
  const polylinePoints=pointCoordinates.map(p=>`${p.x},${p.y}`).join(' ');

  $('#monthly').innerHTML=`<div class="monthly-bars">${visiblePeriods.map((p,index)=>{
    const reference=inflationReference[index]||0,previousPeriod=visiblePeriods[index-1],appliedInflation=index===0?0:inflationByPeriod[previousPeriod]||0,gastoReal=actualValue(p);
    const title=`Gasto real ${money(gastoReal)} - Inflación ${Number(appliedInflation).toFixed(1)}% - Gasto estimado por inflación ${money(reference)}`;
    return `<div class="month" title="${title}">${showGarage?`<i class="bar blue" style="height:${(gm[p]||0)/max*100}%"></i>`:''}${showUnit?`<i class="bar mint" style="height:${(um[p]||0)/max*100}%"></i>`:''}<span>${p}</span></div>`;
  }).join('')}</div>${visiblePeriods.length?`<svg class="inflation-line" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" aria-label="Evolución acumulada por inflación"><polyline points="${polylinePoints}"></polyline>${pointCoordinates.map((point,index)=>{
    const gastoReal=actualValue(point.period),periodoInflacion=index>0?visiblePeriods[index-1]:null,inflacionAplicada=periodoInflacion?inflationByPeriod[periodoInflacion]||0:0;
    return `<circle cx="${point.x}" cy="${point.y}" r="7"><title>Gasto real ${money(gastoReal)} - Inflación ${inflacionAplicada.toFixed(1)}% - Estimado por inflación ${money(point.value)}</title></circle>`;
  }).join('')}</svg>`:''}`;

  $('#rows').innerHTML=r.map(x=>{const controlado=(x.Controlado||'').trim();return `<tr><td>${x.Periodo}</td><td>${x.Proveedor}</td><td>${x.Concepto||'—'}</td><td class="num">${money(x.Cochera)}</td><td class="num">${money(x.Unidad)}</td><td class="${controlado?'controlado-ok':'controlado-no'}">${controlado||'No controlado'}</td></tr>`}).join('');
}

function renderInsights(){
  const selected=($('#conclusionPeriod').value||'').toLowerCase(),n=notes.find(x=>(x.Periodo||'').toLowerCase()===selected);
  if(!n){$('#insights').innerHTML='<p>No hay conclusión generada para este período.</p>';return}
  const garage=document.querySelector('input[name="conclusionView"]:checked')?.value==='garage';
  const type=garage?'cochera':'unidad',trend=garage?n.TendenciaCochera:n.TendenciaUnidad,increases=garage?n.AumentosCochera:n.AumentosUnidad,conclusion=garage?n.ConclusionCochera:n.ConclusionUnidad;
  $('#insights').innerHTML=`<div class="insight-grid"><article><b>Tendencia ${type}</b>${trend||'Sin información'}</article><article class="full"><b>Aumentos ${type}</b>${increases||'Sin información'}</article><article class="full"><b>Conclusión ${type}</b>${conclusion||'Sin información'}</article></div>`;
}
function exportCsv(){
  const h=['Periodo','Proveedor','Concepto','Cochera','Unidad','Controlado'],esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';
  const text=[h,...filtered().map(x=>h.map(k=>x[k]))].map(r=>r.map(esc).join(';')).join('\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv'})),a=document.createElement('a');
  a.href=url;a.download='movimientos-filtrados.csv';a.click();URL.revokeObjectURL(url);
}
init();
