const AdminVecinos = (() => {
  let _todos = [], _faltasMap = {}, _detalle = null, _apoyoTipo = 'Faena extra', _anio = new Date().getFullYear();
  let _archivadosCount = 0, _creandoNuevo = false;

  async function render() {
    if (_detalle)     { await _renderDetalle(_detalle); return; }
    if (_creandoNuevo){ await _renderNuevo();            return; }
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: v }, { data: f }, { count: archCount }] = await Promise.all([
      db.from('vecinos').select('*').eq('activo', true).order('mz').order('lote'),
      db.from('asistencias').select('vecino_id').eq('estado', 'F'),
      db.from('vecinos').select('*', { count: 'exact', head: true }).eq('activo', false)
    ]);
    _todos = v || [];
    _archivadosCount = archCount || 0;
    _faltasMap = {};
    (f || []).forEach(x => { _faltasMap[x.vecino_id] = (_faltasMap[x.vecino_id] || 0) + 1; });
    _renderLista('');
  }

  function _renderLista(q) {
    const el = document.getElementById('admin-body');
    const fil = _todos.filter(v => !q || v.nombre.toLowerCase().includes(q.toLowerCase()) || (v.dni && v.dni.includes(q)) || v.mz.toLowerCase() === q.toLowerCase());
    el.innerHTML = `
      <div class="search-bar"><input type="text" id="v-filter" placeholder="Buscar nombre, DNI, Manzana..." oninput="AdminVecinos.filtrar(this.value)" value="${esc(q)}"></div>
      <button class="btn btn-dark btn-sm" style="margin-bottom:8px;width:auto" onclick="AdminVecinos.nuevoVecino()">+ Registrar nuevo vecino</button>
      <div class="card card-flush">
        ${fil.map(v => {
          const nf = _faltasMap[v.id] || 0;
          return `<div class="row" onclick="AdminVecinos.ver(${v.id})">
            <div class="avatar">${initials(v.nombre)}</div>
            <div class="row-info">
              <div class="row-name">${esc(v.nombre)}</div>
              <div class="row-sub">Mz ${esc(v.mz)}-${esc(v.lote)}${v.cargo ? ' · ' + esc(v.cargo) : ''}</div>
            </div>
            ${nf > 0 ? `<span class="pill pill-red">${nf} falta${nf > 1 ? 's' : ''}</span>` : `<span class="pill pill-green">Sin faltas</span>`}
          </div>`;
        }).join('')}
      </div>
      ${_archivadosCount > 0 ? `
      <button class="btn btn-outline btn-sm" style="margin-top:4px" onclick="AdminVecinos.verArchivados()">
        📦 Ver archivados (${_archivadosCount})
      </button>` : ''}`;
  }

  async function _renderNuevo() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const { data: last } = await db.from('vecinos').select('nro').order('nro', { ascending: false }).limit(1).maybeSingle();
    const nextNro = (last?.nro || 0) + 1;
    el.innerHTML = `
      <button class="back-btn" onclick="AdminVecinos.cancelarNuevo()">← Volver</button>
      <div class="sec-title" style="margin-top:0">Registrar nuevo vecino</div>
      <div class="card">
        <div class="field">
          <label>Nombre completo</label>
          <input type="text" id="nv-nombre" placeholder="APELLIDO, Nombre  (ej: QUISPE, Juan Carlos)">
        </div>
        <div class="grid-3">
          <div class="field"><label>Nro</label><input type="number" id="nv-nro" value="${nextNro}" min="1" step="1"></div>
          <div class="field"><label>Manzana</label><input type="text" id="nv-mz" placeholder="A" style="text-transform:uppercase"></div>
          <div class="field"><label>Lote</label><input type="number" id="nv-lote" placeholder="1" min="1" step="1"></div>
        </div>
        <div class="grid-2">
          <div class="field"><label>DNI</label><input type="text" id="nv-dni" placeholder="Opcional" maxlength="8" inputmode="numeric"></div>
          <div class="field"><label>Celular</label><input type="text" id="nv-cel" placeholder="Opcional" inputmode="numeric"></div>
        </div>
        <div class="field"><label>Cargo</label><input type="text" id="nv-cargo" placeholder="Presidente, Tesorero… (opcional)"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
          <input type="checkbox" id="nv-exonerado">
          <label for="nv-exonerado" style="text-transform:none;font-size:13px;font-weight:400;letter-spacing:0;cursor:pointer">Exonerado de cuotas y almacén</label>
        </div>
        <button class="btn btn-dark" onclick="AdminVecinos.guardarNuevo()">✓ Registrar vecino</button>
      </div>`;
  }

  async function guardarNuevo() {
    const nombre    = (document.getElementById('nv-nombre').value || '').trim().toUpperCase();
    const nro       = parseInt(document.getElementById('nv-nro').value);
    const mz        = (document.getElementById('nv-mz').value || '').trim().toUpperCase();
    const lote      = parseInt(document.getElementById('nv-lote').value);
    const dni       = (document.getElementById('nv-dni').value || '').trim();
    const celular   = (document.getElementById('nv-cel').value || '').trim();
    const cargo     = (document.getElementById('nv-cargo').value || '').trim();
    const exonerado = document.getElementById('nv-exonerado').checked;
    if (!nombre)      { showToast('El nombre es obligatorio', 'err'); return; }
    if (!mz || !lote) { showToast('Manzana y Lote son obligatorios', 'err'); return; }
    if (!nro)         { showToast('El número de vecino es obligatorio', 'err'); return; }
    showLoading();
    const { error } = await db.from('vecinos').insert({ nro, nombre, mz, lote, dni, celular, cargo, exonerado, activo: true });
    hideLoading();
    if (error) { showToast('Error: ' + error.message, 'err'); return; }
    showToast(`✓ ${nombre.split(',')[0].trim()} registrado`);
    _creandoNuevo = false;
    render();
  }

  function nuevoVecino()   { _creandoNuevo = true; _renderNuevo(); }
  function cancelarNuevo() { _creandoNuevo = false; render(); }

  async function verArchivados() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando archivados...</div>';
    const { data: arch } = await db.from('vecinos').select('*').eq('activo', false).order('mz').order('lote');
    el.innerHTML = `
      <button class="back-btn" onclick="AdminVecinos.render()">← Activos</button>
      <div class="sec-title" style="margin-top:0">Vecinos archivados (${(arch || []).length})</div>
      <div class="card card-flush">
        ${(arch || []).length ? (arch || []).map(v => `
          <div class="row">
            <div class="avatar" style="opacity:.5">${initials(v.nombre)}</div>
            <div class="row-info">
              <div class="row-name" style="color:var(--text2)">${esc(v.nombre)}</div>
              <div class="row-sub">Mz ${esc(v.mz)}-${esc(v.lote)}</div>
            </div>
            <button class="btn btn-sm btn-green" onclick="AdminVecinos.reactivar(${v.id})">Reactivar</button>
          </div>`).join('')
        : '<div style="color:var(--text2);font-size:13px;padding:14px 0">No hay vecinos archivados</div>'}
      </div>`;
  }

  async function reactivar(id) {
    showLoading();
    await db.from('vecinos').update({ activo: true }).eq('id', id);
    hideLoading();
    showToast('✓ Vecino reactivado');
    render();
  }

  function filtrar(q) { _renderLista(q); }
  function ver(id)    { _detalle = id; _renderDetalle(id); }
  function ir(id)     { _detalle = id; AdminApp.tab('vecinos'); }

  async function _renderDetalle(id) {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: v }, { data: asist }, { data: apoyos }] = await Promise.all([
      db.from('vecinos').select('*').eq('id', id).single(),
      db.from('asistencias').select('*,eventos(*),subsanaciones(*)').eq('vecino_id', id).order('created_at', { ascending: false }),
      db.from('apoyos').select('*').eq('vecino_id', id).order('fecha', { ascending: false })
    ]);
    const faltas     = (asist || []).filter(a => a.estado === 'F');
    const multaTotal = faltas.reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
    const guardadito = (apoyos || []).filter(a => a.estado === 'guardadito').reduce((s, a) => s + parseFloat(a.monto), 0);
    const apoyosHist = (apoyos || []).filter(a => a.estado !== 'guardadito');

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <button class="back-btn" style="margin:0" onclick="AdminVecinos.volver()">← Volver</button>
        ${v.activo
          ? `<button class="btn btn-sm btn-danger no-print" onclick="AdminVecinos.archivar(${id})">Archivar vecino</button>`
          : `<span class="pill pill-gray" style="font-size:12px">Archivado</span>`}
      </div>

      ${!v.activo ? `<div class="card" style="border-left:3px solid var(--text2);background:var(--bg2);margin-bottom:10px"><div style="font-size:13px;color:var(--text2);font-weight:500">Este vecino está archivado y no aparece en listas activas.</div><button class="btn btn-sm btn-green" style="margin-top:8px;width:auto" onclick="AdminVecinos.reactivar(${id})">Reactivar</button></div>` : ''}

      <div class="card no-print">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <div class="avatar avatar-lg">${initials(v.nombre)}</div>
          <div>
            <div style="font-size:15px;font-weight:600">${esc(v.nombre)}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:2px">Mz ${esc(v.mz)} — Lote ${esc(v.lote)}${v.cargo ? ' · ' + esc(v.cargo) : ''}</div>
            ${v.exonerado ? '<span class="pill pill-green" style="margin-top:4px">Exonerado</span>' : ''}
          </div>
        </div>
        <div class="grid-2">
          <div class="field"><label>DNI</label><input type="text" id="ed-dni" value="${esc(v.dni || '')}" placeholder="Sin registro"></div>
          <div class="field"><label>Celular</label><input type="text" id="ed-cel" value="${esc(v.celular || '')}" placeholder="Sin registro"></div>
        </div>
        <div class="field"><label>Cargo</label><input type="text" id="ed-cargo" value="${esc(v.cargo || '')}" placeholder="Ninguno"></div>
        <button class="btn btn-dark btn-sm" onclick="AdminVecinos.guardarDatos(${id})">Guardar datos</button>
      </div>

      <div class="metrics">
        <div class="metric"><div class="metric-val c-red">S/${multaTotal}</div><div class="metric-lbl">Multas</div></div>
        <div class="metric"><div class="metric-val c-gold">S/${guardadito}</div><div class="metric-lbl">Guardadito</div></div>
        <div class="metric"><div class="metric-val">${faltas.length}</div><div class="metric-lbl">Faltas</div></div>
      </div>
      ${guardadito > 0 ? `<div class="guardadito-card"><div class="guardadito-icon">🪙</div><div><div class="guardadito-val">S/${guardadito}</div><div class="guardadito-lbl">Saldo a favor — se aplicará a próximas faltas</div></div></div>` : ''}

      <div class="sec-title no-print">Registrar pago en efectivo</div>
      <div class="card no-print">
        <div class="grid-2">
          <div class="field"><label>Monto S/ cobrado</label><input type="number" id="pago-libre" placeholder="Ej: 75" min="1" step="1"></div>
          <div class="field"><label>Fecha de pago</label><input type="date" id="pago-libre-fecha" value="${today()}"></div>
        </div>
        <div class="field"><label>Nota (queda en el historial)</label><input type="text" id="pago-libre-nota" placeholder="Ej: Pagó faena 25/03/25 en asamblea"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <input type="checkbox" id="amnistia-chk" style="width:auto">
          <label for="amnistia-chk" style="text-transform:none;font-size:13px;font-weight:400;letter-spacing:0;cursor:pointer;color:var(--text)">Amnistía 50% — cobra la mitad, condona el total de cada falta</label>
        </div>
        <button class="btn btn-green" onclick="AdminVecinos.pagoLibre(${id})">💰 Aplicar pago</button>
      </div>

      <div class="sec-title no-print">Registrar apoyo / guardadito</div>
      <div class="card no-print">
        <div class="field"><label>Tipo de apoyo</label>
          <div class="chip-row">${['Faena extra', 'Vino con familiar', 'Pollada', 'Actividad', 'Otro'].map(t => `<button class="chip ${_apoyoTipo === t ? 'on' : ''}" onclick="AdminVecinos.setApoyoTipo('${t}')">${esc(t)}</button>`).join('')}</div>
        </div>
        <div class="grid-3">
          <div class="field"><label>Monto S/ c/u</label><input type="number" id="ap-monto" value="50" min="1" step="1" oninput="AdminVecinos.updateApoyoTotal()"></div>
          <div class="field"><label>Cantidad</label><input type="number" id="ap-cant" value="1" min="1" step="1" oninput="AdminVecinos.updateApoyoTotal()"></div>
          <div class="field"><label>Fecha apoyo</label><input type="date" id="ap-fecha" value="${today()}"></div>
        </div>
        <div class="field"><label>Motivo / descripción</label><input type="text" id="ap-motivo" placeholder="Ej: Apoyó en pollada del 20 de abril"></div>
        <div id="apoyo-total" style="font-size:12px;color:var(--blue);font-weight:500;margin-bottom:8px"></div>
        <button class="btn btn-dark" onclick="AdminVecinos.registrarApoyo(${id})">🪙 Registrar apoyo</button>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 7px">
        <div class="sec-title" style="margin:0">Historial de asistencia</div>
        <button class="btn btn-sm btn-outline no-print" onclick="window.print()">🖨️ Exportar PDF</button>
      </div>
      <div class="card card-flush">
        ${(asist || []).map(a => {
          const sub  = a.subsanaciones?.[0];
          const tipo = a.eventos?.tipo;
          return `<div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento">${esc(a.eventos?.nombre || 'Evento')}</div>
              <div class="hist-fecha">${formatFecha(a.eventos?.fecha)} · <span class="pill ${tipoColor(tipo)}" style="font-size:10px;padding:1px 6px">${tipoLabel(tipo)}</span></div>
              ${a.estado === 'J' && sub ? `<div class="hist-nota">✅ Subsanado ${formatFecha(sub.fecha_subsanacion)} — <em>${esc(sub.nota || 'Apoyo registrado')}</em></div>` : ''}
              ${a.estado === 'F' ? `<div style="font-size:11px;color:var(--red);margin-top:2px">⚠️ Multa pendiente: S/${MULTAS[tipo] || 0}</div>` : ''}
            </div>
            ${a.estado === 'P' ? `<span class="pill pill-green">Presente</span>` : a.estado === 'J' ? `<span class="pill pill-orange">Subsanado</span>` : `<span class="pill pill-red">Falta</span>`}
          </div>`;
        }).join('') || '<div style="color:var(--text2);font-size:13px;padding:12px 0">Sin registros de asistencia</div>'}
      </div>

      ${apoyosHist.length ? `
      <div class="sec-title">Pagos y apoyos registrados</div>
      <div class="card card-flush">
        ${apoyosHist.map(a => `<div class="pago-det-row">
          <div>
            <div style="font-size:13px;font-weight:500">${esc(a.motivo || a.estado)}</div>
            <div style="font-size:11px;color:var(--text2)">${formatFecha(a.fecha)}</div>
          </div>
          <span class="pill pill-green">S/${a.monto}</span>
        </div>`).join('')}
      </div>` : ''}`;
  }

  function volver()     { _detalle = null; render(); }
  function setApoyoTipo(t) {
    _apoyoTipo = t;
    document.querySelectorAll('#admin-body .chip-row .chip').forEach(c => c.classList.toggle('on', c.textContent.trim() === t));
  }
  function updateApoyoTotal() {
    const monto = parseFloat(document.getElementById('ap-monto')?.value) || 0;
    const cant  = parseInt(document.getElementById('ap-cant')?.value)  || 1;
    const el    = document.getElementById('apoyo-total');
    if (el) el.textContent = cant > 1 ? `Total: S/${monto * cant} (${cant} personas × S/${monto})` : '';
  }

  function archivar(id) {
    Modal.pedir(
      'Archivar a este vecino lo ocultará de todas las listas. Su historial se conserva intacto. Puedes reactivarlo en cualquier momento.',
      async () => {
        showLoading();
        await db.from('vecinos').update({ activo: false }).eq('id', id);
        hideLoading();
        showToast('✓ Vecino archivado');
        _detalle = null;
        render();
      }
    );
  }

  async function guardarDatos(id) {
    const { error } = await db.from('vecinos').update({
      dni:     document.getElementById('ed-dni').value,
      celular: document.getElementById('ed-cel').value,
      cargo:   document.getElementById('ed-cargo').value
    }).eq('id', id);
    if (error) showToast('Error: ' + error.message, 'err');
    else { showToast('✓ Datos guardados'); _renderDetalle(id); }
  }

  async function pagoLibre(id) {
    const monto    = parseFloat(document.getElementById('pago-libre').value);
    const fecha    = document.getElementById('pago-libre-fecha').value;
    const nota     = (document.getElementById('pago-libre-nota').value || '').trim();
    const amnistia = document.getElementById('amnistia-chk')?.checked || false;
    if (!monto || !fecha) { showToast('Completa monto y fecha', 'err'); return; }
    showLoading();
    const { data: faltas } = await db.from('asistencias').select('*,eventos(*)').eq('vecino_id', id).eq('estado', 'F').order('created_at', { ascending: true });
    let resto = monto, subsanadas = 0;
    for (const falta of (faltas || [])) {
      const multa    = MULTAS[falta.eventos?.tipo] || 50;
      const cobro    = amnistia ? multa / 2 : multa;
      if (resto >= cobro) {
        const notaFinal = nota || (amnistia ? 'Amnistía 50%' : 'Pago en efectivo');
        await db.from('asistencias').update({ estado: 'J' }).eq('id', falta.id);
        const { data: ap } = await db.from('apoyos').insert({ vecino_id: id, fecha, monto: cobro, motivo: notaFinal, estado: 'aplicado' }).select().single();
        await db.from('subsanaciones').insert({ asistencia_id: falta.id, apoyo_id: ap?.id, fecha_subsanacion: fecha, nota: notaFinal });
        resto -= cobro; subsanadas++;
      } else break;
    }
    if (resto > 0) await db.from('apoyos').insert({ vecino_id: id, fecha, monto: resto, motivo: nota ? `Guardadito (${nota})` : 'Guardadito', estado: 'guardadito' });
    hideLoading();
    const tag = amnistia ? 'Amnistía 50%' : `S/${monto}`;
    showToast(`✓ ${tag} — ${subsanadas} falta${subsanadas!==1?'s':''} subsanada${subsanadas!==1?'s':''}${resto>0?' · S/'+resto+' guardadito':''}`);
    _renderDetalle(id);
  }

  async function registrarApoyo(id) {
    const montoUnit = parseFloat(document.getElementById('ap-monto').value);
    const cant      = parseInt(document.getElementById('ap-cant').value) || 1;
    const monto     = montoUnit * cant;
    const fecha     = document.getElementById('ap-fecha').value;
    const motivoBase = (document.getElementById('ap-motivo').value || '').trim() || _apoyoTipo;
    const motivo    = cant > 1 ? `${motivoBase} (${cant} personas)` : motivoBase;
    if (!monto || !fecha) { showToast('Completa monto y fecha', 'err'); return; }
    showLoading();
    const { data: faltas } = await db.from('asistencias').select('*,eventos(*)').eq('vecino_id', id).eq('estado', 'F').order('created_at', { ascending: true });
    if (faltas && faltas.length > 0) {
      const falta = faltas[0];
      const multa = MULTAS[falta.eventos?.tipo] || 50;
      if (monto >= multa) {
        await db.from('asistencias').update({ estado: 'J' }).eq('id', falta.id);
        const { data: ap } = await db.from('apoyos').insert({ vecino_id: id, fecha, monto, motivo, estado: 'aplicado' }).select().single();
        await db.from('subsanaciones').insert({ asistencia_id: falta.id, apoyo_id: ap?.id, fecha_subsanacion: fecha, nota: motivo });
        const resto = monto - multa;
        if (resto > 0) await db.from('apoyos').insert({ vecino_id: id, fecha, monto: resto, motivo: `Guardadito (${motivo})`, estado: 'guardadito' });
        hideLoading();
        showToast(`✓ Falta del ${formatFecha(falta.eventos?.fecha)} subsanada${resto > 0 ? ` — S/${resto} en guardadito` : ''}`);
      } else {
        await db.from('apoyos').insert({ vecino_id: id, fecha, monto, motivo, estado: 'guardadito' });
        hideLoading();
        showToast(`✓ S/${monto} en guardadito (monto menor a la multa S/${MULTAS[faltas[0].eventos?.tipo] || 50})`);
      }
    } else {
      await db.from('apoyos').insert({ vecino_id: id, fecha, monto, motivo, estado: 'guardadito' });
      hideLoading();
      showToast(`✓ Sin faltas pendientes — S/${monto} en guardadito`);
    }
    _renderDetalle(id);
  }

  return { render, filtrar, ver, ir, volver, nuevoVecino, cancelarNuevo, guardarNuevo,
           verArchivados, reactivar, archivar, setApoyoTipo, updateApoyoTotal,
           guardarDatos, pagoLibre, registrarApoyo };
})();
