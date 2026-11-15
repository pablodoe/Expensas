const $=s=>document.querySelector(s);let headers=[],rows=[],version='',dirty=false;
function message(text,type=''){const el=$('#state');el.textContent=text;el.className=type}
async function api(url, options = {}) {
    const r = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    const body = await r.json().catch(() => ({}));

    if (!r.ok) {
        // Solo interpretar 401 como sesión vencida
        // cuando NO estamos intentando iniciar sesión.
        if (r.status === 401 && url !== '/api/auth/login') {
            showLogin();
        }

        throw new Error(body.error || `Error HTTP ${r.status}`);
    }

    return body;
}
function parseCsv(text){const out=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){field+='"';i++}else if(c==='"')quoted=!quoted;else if(c===';'&&!quoted){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(field);field='';if(row.some(v=>v!==''))out.push(row);row=[]}else field+=c}if(field||row.length){row.push(field);out.push(row)}return out}
function quote(v){v=String(v??'');return /[;"\r\n]/.test(v)?`"${v.replaceAll('"','""')}"`:v}
function csv(){return [headers,...rows].map(r=>r.map(quote).join(';')).join('\n')+'\n'}
function render(){const t=$('#table');t.innerHTML='';const head=document.createElement('thead'),tr=document.createElement('tr');headers.forEach(h=>{const th=document.createElement('th');th.textContent=h;tr.append(th)});tr.append(document.createElement('th'));head.append(tr);t.append(head);const body=document.createElement('tbody');rows.forEach((row,ri)=>{const tr=document.createElement('tr');headers.forEach((_,ci)=>{const td=document.createElement('td'),input=document.createElement('input');input.value=row[ci]??'';input.addEventListener('input',()=>{rows[ri][ci]=input.value;dirty=true;message('Cambios sin guardar')});td.append(input);tr.append(td)});const td=document.createElement('td'),b=document.createElement('button');b.className='row-delete';b.textContent='Eliminar';b.onclick=()=>{rows.splice(ri,1);dirty=true;render();message('Cambios sin guardar')};td.append(b);tr.append(td);body.append(tr)});t.append(body)}
async function load(){const name=$('#file').value;message('Cargando…');try{const data=await api(`/api/admin/data?file=${name}`);const parsed=parseCsv(data.content);headers=parsed.shift()||[];rows=parsed;version=data.version;dirty=false;render();message(`${rows.length} filas`,'success');await loadHistory()}catch(e){headers=[];rows=[];render();message(e.message,'error');await loadHistory().catch(()=>{})}}
async function loadHistory(){const name=$('#file').value,data=await api(`/api/admin/history?file=${name}`),box=$('#history');box.innerHTML='';if(!data.items.length){box.textContent='Todavía no hay versiones anteriores.';return}data.items.forEach(item=>{const row=document.createElement('div');row.className='history-row';const span=document.createElement('span');span.textContent=`${new Date(item.uploadedAt).toLocaleString()} · ${item.size} bytes`;const b=document.createElement('button');b.className='secondary';b.textContent='Restaurar';b.onclick=()=>restore(item.pathname);row.append(span,b);box.append(row)})}
async function restore(pathname){if(!confirm('¿Restaurar esta versión? El archivo actual se guardará en el historial.'))return;try{await api('/api/admin/restore',{method:'POST',body:JSON.stringify({file:$('#file').value,pathname,expectedVersion:version})});await load()}catch(e){message(e.message,'error')}}
function showApp(){$('#loginCard').classList.add('hidden');$('#app').classList.remove('hidden');$('#logout').classList.remove('hidden');load()}
function showLogin(){$('#loginCard').classList.remove('hidden');$('#app').classList.add('hidden');$('#logout').classList.add('hidden')}
$('#login').onsubmit=async e=>{e.preventDefault();$('#loginError').textContent='';try{await api('/api/auth/login',{method:'POST',body:JSON.stringify({password:$('#password').value})});$('#password').value='';showApp()}catch(err){$('#loginError').textContent=err.message}}
$('#logout').onclick=async()=>{await api('/api/auth/logout',{method:'POST'});showLogin()};$('#file').onchange=()=>{if(!dirty||confirm('Hay cambios sin guardar. ¿Descartarlos?'))load();else $('#file').value=$('#file').dataset.previous||'movimientos';$('#file').dataset.previous=$('#file').value};$('#reload').onclick=load;
$('#add').onclick=()=>{rows.push(headers.map(()=>''));dirty=true;render();message('Cambios sin guardar')};
$('#save').onclick=async()=>{if(!headers.length)return message('No hay archivo cargado','error');message('Guardando…');try{const data=await api(`/api/admin/data?file=${$('#file').value}`,{method:'PUT',body:JSON.stringify({content:csv(),expectedVersion:version})});version=data.version;dirty=false;message('Guardado correctamente','success');await loadHistory()}catch(e){message(e.message,'error')}};
$('#bootstrap').onclick=async()=>{if(!confirm('Esto cargará desde /data solamente los archivos que todavía no existan en Blob. ¿Continuar?'))return;try{const d=await api('/api/admin/bootstrap',{method:'POST'});message(d.results.map(x=>`${x.name}: ${x.status}`).join(' · '),'success');await load()}catch(e){message(e.message,'error')}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});api('/api/auth/status').then(x=>x.authenticated?showApp():showLogin()).catch(showLogin);
