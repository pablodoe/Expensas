const $=s=>document.querySelector(s);let headers=[],rows=[],version='',dirty=false;
const importDialog = $('#importDialog');
const importText = $('#importText');
const importInfo = $('#importInfo');
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
function parseCsv(text) {
    const result = [];
    let row = [];
    let field = '';
    let quoted = false;

    // Elimina BOM UTF-8 si estuviera presente
    text = text.replace(/^\uFEFF/, '');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        // Comillas
        if (char === '"') {

            // "" dentro de un campo entre comillas representa una comilla literal
            if (quoted && next === '"') {
                field += '"';
                i++;
            } else {
                quoted = !quoted;
            }

            continue;
        }

        // Separador ;
        if (char === ';' && !quoted) {
            row.push(field);
            field = '';
            continue;
        }

        // Fin de línea
        if ((char === '\n' || char === '\r') && !quoted) {

            // En Windows el salto es \r\n
            if (char === '\r' && next === '\n') {
                i++;
            }

            row.push(field);
            field = '';

            // Ignorar líneas totalmente vacías
            if (row.some(value => value !== '')) {
                result.push(row);
            }

            row = [];
            continue;
        }

        // Cualquier otro carácter
        field += char;
    }

    // Última fila si el texto no termina con salto de línea
    if (field !== '' || row.length > 0) {
        row.push(field);

        if (row.some(value => value !== '')) {
            result.push(row);
        }
    }

    return result;
}
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
$('#import').onclick = () => {
    importText.value = '';
    importInfo.textContent = '';
    importDialog.showModal();
};
$('#cancelImport').onclick = () => {
    importDialog.close();
};
$('#confirmImport').onclick = () => {
    const text = importText.value.trim();

    if (!text) {
        importInfo.textContent = 'No hay registros para importar.';
        return;
    }

    const parsed = parseCsv(text);

    if (!parsed.length) {
        importInfo.textContent = 'No se encontraron registros.';
        return;
    }

    const expectedHeaders = [
        'Periodo',
        'Proveedor',
        'Concepto',
        'Cochera',
        'Unidad',
        'Controlado'
    ];

    // Si el texto pegado contiene encabezado, lo eliminamos.
    const firstRow = parsed[0].map(value => value.trim());

    const hasHeader =
        firstRow.length === expectedHeaders.length &&
        firstRow.every(
            (value, index) =>
                value.toLowerCase() ===
                expectedHeaders[index].toLowerCase()
        );

    if (hasHeader) {
        parsed.shift();
    }

    if (!parsed.length) {
        importInfo.textContent =
            'No hay movimientos para agregar.';
        return;
    }

    // Verificamos solamente la estructura.
    // NO buscamos duplicados.
    const invalidIndex =
        parsed.findIndex(row => row.length !== expectedHeaders.length);

    if (invalidIndex !== -1) {
        importInfo.textContent =
            `La fila ${invalidIndex + 1} no contiene las 6 columnas esperadas.`;
        return;
    }

    // Agregar todos los movimientos a la tabla en memoria.
    // Todavía NO se guarda nada en Blob.
    parsed.forEach(row => {
        rows.push(row);
    });

    dirty = true;

    render();

    message(
        `${parsed.length} registros agregados. Revisalos antes de guardar.`,
        'success'
    );

    importDialog.close();
};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});api('/api/auth/status').then(x=>x.authenticated?showApp():showLogin()).catch(showLogin);
