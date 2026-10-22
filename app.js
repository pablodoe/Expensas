const $=s=>document.querySelector(s),
MONTH={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12},
money=n=>
  new Intl.NumberFormat(
    'es-AR',
    {
      style:'currency',
      currency:'ARS',
      minimumFractionDigits:2,
      maximumFractionDigits:2
    }
  ).format(n);

let data=[],notes=[],inflation=[],periods=[];

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

const [m,c,i]=await Promise.all([
  fetch('data/movimientos.csv',{cache:'no-store'})
    .then(r=>{
      if(!r.ok)throw Error('No se encontró movimientos.csv');
      return r.text()
    }),

  fetch('data/conclusiones.csv',{cache:'no-store'})
    .then(r=>r.ok?r.text():''),

  fetch('data/inflacion.csv',{cache:'no-store'})
    .then(r=>{
      if(!r.ok)throw Error('No se encontró inflacion.csv');
      return r.text()
    })
]);

    data=parse(m).map(x=>({
      ...x,
      Periodo:x.Periodo.toLowerCase(),
      Cochera:Number(x.Cochera||0),
      Unidad:Number(x.Unidad||0),
      Controlado:(x.Controlado||'').trim()
    }));

    notes=c?parse(c):[];

    inflation=parse(i).map(x=>({
  Periodo:(x.Periodo||'').trim().toLowerCase(),
  Inflacion:Number(
    String(x.Inflacion||0)
      .replace('%','')
      .replace(',','.')
  )
}));

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

    document
  .querySelectorAll('input[name="averageView"]')
  .forEach(x => x.onchange = render);

document
  .querySelectorAll('input[name="chartView"]')
  .forEach(x => x.onchange = render);

document
  .querySelectorAll('input[name="rankView"]')
  .forEach(x => x.onchange = render);
    
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
      (a[key(x)]=(a[key(x)]||0)+x[field],a),
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

const meses = new Set(r.map(x => x.Periodo)).size || 1;

const averageView =
  document.querySelector(
    'input[name="averageView"]:checked'
  ).value;

let promedio = 0;
let proveedores = 0;

if (averageView === 'unit') {

  promedio =
    Object.values(u)
      .reduce((a,b)=>a+b,0) / meses;

  proveedores =
    Object.values(u)
      .filter(v => v > 0)
      .length;

}
else if (averageView === 'garage') {

  promedio =
    Object.values(g)
      .reduce((a,b)=>a+b,0) / meses;

  proveedores =
    Object.values(g)
      .filter(v => v > 0)
      .length;

}
else {

  const keys = new Set([
    ...Object.keys(g),
    ...Object.keys(u)
  ]);

  const ambos = {};

  keys.forEach(k=>{
    ambos[k] =
      (g[k] || 0) +
      (u[k] || 0);
  });

  promedio =
    Object.values(ambos)
      .reduce((a,b)=>a+b,0) / meses;

  proveedores =
    Object.values(ambos)
      .filter(v => v > 0)
      .length;
}

$('#monthlyAverage').textContent =
  money(promedio);

$('#providerCount').textContent =
  proveedores;

const rankView =
  document.querySelector(
    'input[name="rankView"]:checked'
  ).value;

let rankData = {};
let rankColor = 'var(--mint)';

if(rankView === 'unit'){
  rankData = u;
  rankColor = 'var(--mint)';
}
else if(rankView === 'garage'){
  rankData = g;
  rankColor = 'var(--blue)';
}
else{
  const keys = new Set([
    ...Object.keys(g),
    ...Object.keys(u)
  ]);

  keys.forEach(k=>{
    rankData[k] =
      (g[k] || 0) +
      (u[k] || 0);
  });

  rankColor = '#7c3aed';
}

rank(
  '#providerRank',
  rankData,
  rankColor
);

const gm=grouped(r,x=>x.Periodo,'Cochera'),
      um=grouped(r,x=>x.Periodo,'Unidad');

const view =
  document.querySelector(
    'input[name="chartView"]:checked'
  ).value;

const showGarage =
  view === 'garage' || view === 'both';

const showUnit =
  view === 'unit' || view === 'both';

/*
 * Períodos que tienen al menos un movimiento
 * con los filtros actualmente aplicados.
 */
const visiblePeriods = periods.filter(
  p => (gm[p] || 0) > 0 || (um[p] || 0) > 0
);

/*
 * Importe real utilizado como base de la línea.
 *
 * Unidad: importe mensual de unidad.
 * Cochera: importe mensual de cochera.
 * Ambos: suma de unidad y cochera.
 */
const actualValue = p => {
  if(view === 'unit'){
    return um[p] || 0;
  }

  if(view === 'garage'){
    return gm[p] || 0;
  }

  return (gm[p] || 0) + (um[p] || 0);
};

/*
 * Inflación correspondiente a cada período.
 */
const inflationByPeriod =
  Object.fromEntries(
    inflation.map(x=>[
      x.Periodo,
      Number.isFinite(x.Inflacion)
        ? x.Inflacion
        : 0
    ])
  );

/*
 * Construcción de la referencia acumulada.
 *
 * El primer mes toma el importe real.
 * Cada mes siguiente aplica la inflación
 * correspondiente al mes anterior.
 */
const inflationReference = [];

visiblePeriods.forEach((period,index)=>{

  if(index === 0){
    inflationReference.push(
      actualValue(period)
    );

    return;
  }

  const previousPeriod =
    visiblePeriods[index - 1];

  const previousReference =
    inflationReference[index - 1];

  const previousInflation =
    inflationByPeriod[previousPeriod] || 0;

  inflationReference.push(
    previousReference *
    (1 + previousInflation / 100)
  );
});

/*
 * La escala incluye las barras y la línea roja.
 */
const values=[];

if(showGarage){
  values.push(
    ...visiblePeriods.map(p=>gm[p]||0)
  );
}

if(showUnit){
  values.push(
    ...visiblePeriods.map(p=>um[p]||0)
  );
}

values.push(...inflationReference);

const max=Math.max(1,...values);

/*
 * Puntos SVG.
 *
 * Se utiliza una vista de 1000 × 300.
 * La altura deja espacio inferior para
 * los nombres de los períodos.
 */
const chartWidth=1000;
const chartHeight=260;
const topPadding=12;
const bottomPadding=18;
const usableHeight=
  chartHeight-topPadding-bottomPadding;

const pointCoordinates =
  inflationReference.map((value,index)=>{

const x =
  ((index + 0.5) / visiblePeriods.length) *
  chartWidth;

    const y =
      topPadding +
      (
        1 - value / max
      ) * usableHeight;

    return {
      x,
      y,
      value,
      period:visiblePeriods[index]
    };
  });

const polylinePoints =
  pointCoordinates
    .map(point=>`${point.x},${point.y}`)
    .join(' ');

$('#monthly').innerHTML=`

  <div class="monthly-bars">

    ${visiblePeriods.map((p,index)=>{

      const reference =
        inflationReference[index] || 0;

      const previousPeriod =
        visiblePeriods[index - 1];

      const appliedInflation =
        index === 0
          ? null
          : inflationByPeriod[previousPeriod] || 0;

const gastoReal =
  actualValue(p);

const title =
  `Gasto Real ${money(gastoReal)} - ` +
  `Inflación ${Number(appliedInflation || 0).toFixed(1)}% - ` +
  `Gasto estimado x Inf ${money(reference)}`;

      return `
        <div class="month"
             title="${title}">

          ${showGarage
            ? `<i class="bar blue"
                  style="height:${(gm[p]||0)/max*100}%">
               </i>`
            : ''
          }

          ${showUnit
            ? `<i class="bar mint"
                  style="height:${(um[p]||0)/max*100}%">
               </i>`
            : ''
          }

          <span>${p}</span>
        </div>
      `;

    }).join('')}

  </div>

  ${visiblePeriods.length
    ? `
      <svg class="inflation-line"
           viewBox="0 0 ${chartWidth} ${chartHeight}"
           preserveAspectRatio="none"
           aria-label="Evolución acumulada por inflación">

        <polyline
          points="${polylinePoints}">
        </polyline>

${pointCoordinates.map((point,index)=>{

  const gastoReal =
    actualValue(point.period);

  const periodoInflacion =
    index > 0
      ? visiblePeriods[index - 1]
      : null;

  const inflacionAplicada =
    periodoInflacion
      ? inflationByPeriod[periodoInflacion] || 0
      : 0;

  return `
    <circle
      cx="${point.x}"
      cy="${point.y}"
      r="7">

      <title>Gasto Real ${money(gastoReal)} - Inflación ${inflacionAplicada.toFixed(1)}% - Estimado x Inf ${money(point.value)}</title>

    </circle>
  `;

}).join('')}

      </svg>
    `
    : ''
  }
`;

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
