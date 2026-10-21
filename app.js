const $=s=>document.querySelector(s),
MONTH={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12},
money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);

let data=[],notes=[],periods=[];

function split(line){
  let out=[],s='',q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){
      if(q&&line[i+1]==='"'){s+='"';i++}
      else q=!q
    }else if(c===';'&&!q){
      out.push(s);
      s=''
    }else s+=c
  }
  out.push(s);
  return out
}

function parse(text){
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/),
  head=split(lines.shift()).map(x=>x.trim());

  return lines
    .filter(Boolean)
    .map(line=>
      Object.fromEntries(
        head.map((h,i)=>[h,(split(line)[i]??'').trim()])
      )
    )
}

function periodKey(p){
  const m=p.trim().toLowerCase().match(/^([a-záéíóú]{3})-(\d{2}|\d{4})$/);
  if(!m)return [9999,99,p];
  let y=+m[2];
  if(y<100)y+=2000;
  return [y,MONTH[m[1]]??99,p]
}

function comparePeriod(a,b){
  const x=periodKey(a),y=periodKey(b);
  return x[0]-y[0]||x[1]-y[1]||x[2].localeCompare(y[2])
}

async function init(){
  try{

    const [m,c]=await Promise.all([
      fetch('data/movimientos.csv',{cache:'no-store'})
        .then(r=>{
          if(!r.ok)throw Error('No se encontró movimientos.csv');
          return r.text()
        }),
      fetch('data/conclusiones.csv',{cache:'no-store'})
        .then(r=>r.ok?r.text():'')
    ]);

    data=parse(m).map(x=>({
      ...x,
      Periodo:x.Periodo.toLowerCase(),
      Cochera:Number(x.Cochera||0),
      Unidad:Number(x.Unidad||0),
      Controlado:(x.Controlado||'').trim()
    }));

    notes=c?parse(c):[];

    const required=[
      'Periodo',
      'Proveedor',
      'Concepto',
      'Cochera',
      'Unidad'
    ];

    if(!data.length||required.some(k=>!(k in data[0])))
      throw Error('El CSV debe contener: '+required.join(';'));

    periods=[
      ...new Set(
        data.map(x=>x.Periodo).filter(Boolean)
      )
    ].sort(comparePeriod);

    $('#period').innerHTML=
      '<option value="">Todos</option>'+
      periods.map(x=>`<option value="${x}">${x}</option>`).join('');

    $('#conclusionPeriod').innerHTML=
      periods.map(x=>`<option value="${x}">${x}</option>`).join('');

    $('#conclusionPeriod').value=periods.at(-1)||'';

    $('#supplier').innerHTML=
      '<option value="">Todos</option>'+
      [...new Set(data.map(x=>x.Proveedor))]
        .sort()
        .map(x=>`<option>${x}</option>`)
        .join('');

    $('#period').onchange=
    $('#supplier').onchange=
      render;

    $('#search').oninput=render;
    $('#conclusionPeriod').onchange=renderInsights;

    $('#theme').onclick=()=>
      document.body.classList.toggle('dark');

    $('#export').onclick=exportCsv;

    render();
    renderInsights();

  }catch(e){
    $('#error').hidden=false;
    $('#error').textContent=e.message
  }
}

function filtered(){
  const p=$('#period').value,
        s=$('#supplier').value,
        q=$('#search').value.toLowerCase();

  return data.filter(x=>
    (!p||x.Periodo===p) &&
    (!s||x.Proveedor===s) &&
    (!q||(x.Proveedor+' '+x.Concepto)
      .toLowerCase()
      .includes(q))
  )
}

function grouped(rows,key,field){
  return rows.reduce(
    (a,x)=>
      (a[key(x)]=(a[key(x)]||0)+Math.max(0,x[field]),a),
    {}
  )
}

function rank(id,obj,color){
  const top=Object.entries(obj)
    .filter(x=>x[1]>0)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10);

  const max=top[0]?.[1]||1;

  $(id).innerHTML=
    top.map(([k,v])=>
      `<div class="rank">
        <label title="${k}">${k}</label>
        <div class="track">
          <i style="width:${v/max*100}%;background:${color}"></i>
        </div>
        <b class="num">${money(v)}</b>
      </div>`
    ).join('')
    ||'<p>Sin movimientos.</p>'
}

function render(){

  const r=filtered(),
        g=grouped(r,x=>x.Proveedor,'Cochera'),
        u=grouped(r,x=>x.Proveedor,'Unidad');

  $('#garage').textContent=
    money(Object.values(g).reduce((a,b)=>a+b,0));

  $('#unit').textContent=
    money(Object.values(u).reduce((a,b)=>a+b,0));

  $('#garageProviders').textContent=
    Object.values(g).filter(v=>v>0).length;

  $('#unitProviders').textContent=
    Object.values(u).filter(v=>v>0).length;

  rank('#garageRank',g,'var(--blue)');
  rank('#unitRank',u,'var(--mint)');

  const gm=grouped(r,x=>x.Periodo,'Cochera'),
        um=grouped(r,x=>x.Periodo,'Unidad'),
        max=Math.max(1,...Object.values(gm),...Object.values(um));

  $('#monthly').innerHTML=
    periods
      .filter(p=>gm[p]||um[p])
      .map(p=>
        `<div class="month" title="${p} · Cochera ${money(gm[p]||0)} · Unidad ${money(um[p]||0)}">
          <i class="bar blue" style="height:${(gm[p]||0)/max*100}%"></i>
          <i class="bar mint" style="height:${(um[p]||0)/max*100}%"></i>
          <span>${p}</span>
        </div>`
      )
      .join('');

  $('#rows').innerHTML=r.map(x=>{

    const controlado=(x.Controlado||'').trim();

    return `
      <tr>
        <td>${x.Periodo}</td>
        <td>${x.Proveedor}</td>
        <td>${x.Concepto||'—'}</td>
        <td class="num">${money(x.Cochera)}</td>
        <td class="num">${money(x.Unidad)}</td>
        <td class="${controlado ? 'controlado-ok' : 'controlado-no'}">
          ${controlado || 'No controlado'}
        </td>
      </tr>
    `;

  }).join('');
}

function renderInsights(){

  const n=notes.find(
    x=>x.Periodo.toLowerCase()===$('#conclusionPeriod').value
  );

  $('#insights').innerHTML=n
    ? `<div class="insight-grid">
        <article>
          <b>Tendencia cochera</b>
          ${n.TendenciaCochera}
        </article>

        <article>
          <b>Tendencia unidad</b>
          ${n.TendenciaUnidad}
        </article>

        <article>
          <b>Ranking anual cochera</b>
          ${n.RankingAnualCochera}
        </article>

        <article>
          <b>Ranking anual unidad</b>
          ${n.RankingAnualUnidad}
        </article>

        <article class="full">
          <b>Detección de aumentos</b>
          ${n.DeteccionAumentos}
        </article>

        <article class="full">
          <b>Conclusión</b>
          ${n.Conclusion}
        </article>
      </div>`
    : '<p>No hay conclusión generada para este período.</p>'
}

function exportCsv(){

  const h=[
    'Periodo',
    'Proveedor',
    'Concepto',
    'Cochera',
    'Unidad',
    'Controlado'
  ];

  const esc=x=>
    '"'+String(x??'').replaceAll('"','""')+'"';

  const text=[h,...filtered().map(x=>h.map(k=>x[k]))]
    .map(r=>r.map(esc).join(';'))
    .join('\n');

  const a=document.createElement('a');

  a.href=URL.createObjectURL(
    new Blob(
      ['\ufeff'+text],
      {type:'text/csv'}
    )
  );

  a.download='movimientos-filtrados.csv';
  a.click()
}

init();
