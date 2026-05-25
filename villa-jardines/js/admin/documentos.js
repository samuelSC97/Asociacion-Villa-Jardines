const AdminDocumentos = (() => {
  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: docs }, { data: agenda }] = await Promise.all([
      db.from('documentos').select('*').order('fecha', { ascending: false }),
      db.from('agenda_proxima').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
    ]);
    _draw(el, docs || [], agenda);
  }

  function _draw(el, docs, agenda) {
    const a = agenda || {};
    const actas = docs.filter(d => d.categoria === 'acta');
    const otros  = docs.filter(d => d.categoria === 'otro');

    el.innerHTML = `
      <div class="sec-title">Próxima agenda para vecinos</div>
      <div class="card">
        <div class="card-title">Convocatoria visible en la app</div>
        <div class="field"><label>Título</label><input type="text" id="ag-titulo" value="${a.titulo||''}" placeholder="Ej: Asamblea ordinaria junio 2025"></div>
        <div class="grid-2">
          <div class="field"><label>Lugar</label><input type="text" id="ag-lugar" value="${a.lugar||''}" placeholder="Salón comunal"></div>
          <div class="field"><label>Hora</label><input type="text" id="ag-hora" value="${a.hora||''}" placeholder="7:00 PM"></div>
        </div>
        <div class="field"><label>Fecha del evento</label><input type="date" id="ag-fecha-ev" value="${a.fecha_evento||today()}"></div>
        <div class="field"><label>Puntos de agenda (uno por línea)</label>
          <textarea id="ag-puntos" rows="5" placeholder="1. Informe económico&#10;2. Elección de comité&#10;3. Varios">${a.puntos_agenda||''}</textarea>
        </div>
        <div class="grid-2">
          <div class="field"><label>Mostrar desde</label><input type="date" id="ag-ini" value="${a.fecha_inicio_mostrar||today()}"></div>
          <div class="field"><label>Mostrar hasta</label><input type="date" id="ag-fin" value="${a.fecha_fin_mostrar||''}"></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <input type="checkbox" id="ag-activa" ${a.activa?'checked':''}>
          <label for="ag-activa" style="text-transform:none;font-size:13px;font-weight:400;letter-spacing:0;cursor:pointer">Activa (visible para vecinos)</label>
        </div>
        <button class="btn btn-dark" onclick="AdminDocumentos.guardarAgenda(${a.id||0})">💾 Guardar agenda</button>
      </div>

      <div class="sec-title">Subir documento PDF</div>
      <div class="card">
        <div class="field"><label>Título</label><input type="text" id="doc-titulo" placeholder="Ej: Acta asamblea marzo 2025"></div>
        <div class="grid-2">
          <div class="field"><label>Categoría</label>
            <select id="doc-cat"><option value="acta">Acta de asamblea</option><option value="otro">Otro documento</option></select>
          </div>
          <div class="field"><label>Fecha</label><input type="date" id="doc-fecha" value="${today()}"></div>
        </div>
        <div class="field"><label>Archivo PDF</label><input type="file" id="doc-file" accept=".pdf"></div>
        <button class="btn btn-blue" onclick="AdminDocumentos.subirPDF()">📎 Subir PDF</button>
        <div id="upload-msg"></div>
      </div>

      ${actas.length ? `
      <div class="sec-title">📋 Actas de asambleas (${actas.length})</div>
      <div class="card card-flush">
        ${actas.map(d=>`<div class="pdf-item">
          <div class="pdf-icon">📄</div>
          <div class="pdf-info"><div class="pdf-name">${d.titulo}</div><div class="pdf-date">${formatFecha(d.fecha)}</div></div>
          <div style="display:flex;gap:5px">
            ${d.url_pdf?`<a href="${d.url_pdf}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none">Ver</a>`:''}
            <button class="btn btn-sm btn-danger" onclick="AdminDocumentos.pedirEliminar(${d.id},'${d.titulo.replace(/'/g,"\\'")}')">✕</button>
          </div>
        </div>`).join('')}
      </div>` : ''}

      ${otros.length ? `
      <div class="sec-title">📄 Otros documentos (${otros.length})</div>
      <div class="card card-flush">
        ${otros.map(d=>`<div class="pdf-item">
          <div class="pdf-icon">📄</div>
          <div class="pdf-info"><div class="pdf-name">${d.titulo}</div><div class="pdf-date">${formatFecha(d.fecha)}</div></div>
          <div style="display:flex;gap:5px">
            ${d.url_pdf?`<a href="${d.url_pdf}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none">Ver</a>`:''}
            <button class="btn btn-sm btn-danger" onclick="AdminDocumentos.pedirEliminar(${d.id},'${d.titulo.replace(/'/g,"\\'")}')">✕</button>
          </div>
        </div>`).join('')}
      </div>` : ''}

      ${!actas.length&&!otros.length?'<div class="card" style="color:var(--text2);font-size:13px;text-align:center;padding:20px">Sin documentos subidos aún</div>':''}`;
  }

  async function guardarAgenda(id) {
    const datos = {
      titulo: document.getElementById('ag-titulo').value.trim(),
      lugar:  document.getElementById('ag-lugar').value.trim(),
      hora:   document.getElementById('ag-hora').value.trim(),
      fecha_evento: document.getElementById('ag-fecha-ev').value,
      puntos_agenda: document.getElementById('ag-puntos').value.trim(),
      fecha_inicio_mostrar: document.getElementById('ag-ini').value,
      fecha_fin_mostrar: document.getElementById('ag-fin').value,
      activa: document.getElementById('ag-activa').checked
    };
    if (!datos.titulo || !datos.fecha_evento || !datos.fecha_fin_mostrar) { showToast('Completa título, fecha del evento y fecha fin', 'err'); return; }
    showLoading();
    if (id) await db.from('agenda_proxima').update(datos).eq('id', id);
    else    await db.from('agenda_proxima').insert(datos);
    hideLoading();
    showToast('✓ Agenda guardada');
    render();
  }

  async function subirPDF() {
    const titulo = (document.getElementById('doc-titulo').value||'').trim();
    const cat    = document.getElementById('doc-cat').value;
    const fecha  = document.getElementById('doc-fecha').value;
    const file   = document.getElementById('doc-file').files[0];
    const msgEl  = document.getElementById('upload-msg');
    if (!titulo||!fecha) { msgEl.innerHTML='<div class="msg msg-err">Completa título y fecha</div>'; return; }
    if (!file)           { msgEl.innerHTML='<div class="msg msg-err">Selecciona un archivo PDF</div>'; return; }
    msgEl.innerHTML='<div class="msg">Subiendo archivo...</div>';
    const filename = `${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
    const { error: upErr } = await db.storage.from('documentos').upload(filename, file, { contentType: 'application/pdf' });
    if (upErr) { msgEl.innerHTML=`<div class="msg msg-err">Error: ${upErr.message}</div>`; return; }
    const { data: urlData } = db.storage.from('documentos').getPublicUrl(filename);
    await db.from('documentos').insert({ titulo, categoria: cat, fecha, url_pdf: urlData.publicUrl, visible: true });
    msgEl.innerHTML='<div class="msg msg-ok">✓ Documento subido</div>';
    setTimeout(() => render(), 1200);
  }

  function pedirEliminar(id, titulo) {
    Modal.pedir(`Vas a eliminar el documento "${titulo}". Esta acción no se puede deshacer.`, () => eliminar(id));
  }

  async function eliminar(id) {
    showLoading();
    await db.from('documentos').delete().eq('id', id);
    hideLoading();
    render();
  }

  return { render, guardarAgenda, subirPDF, pedirEliminar };
})();
