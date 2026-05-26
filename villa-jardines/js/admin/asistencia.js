const AdminAsistencia = (() => {
  let _vecinos = [], _estados = {}, _cuotaAmts = {}, _tipo = 'A', _nombreSel = 'Asamblea Ordinaria', _nombreCustom = '', _fecha = '';
  let _eventos = [];
  const CUOTA_MIN_MES = 2, CUOTA_MIN_ANIO = 2025;
  let _cuotaMes  = new Date().getMonth() + 1;
  let _cuotaAnio = new Date().getFullYear();
  let _cuotaPagados = new Set();
  let _eventoActual = null, _eventoVecinos = [], _eventoAsists = [];
  let _editandoAsistId = null;
  let _tablaAnio = new Date().getFullYear();

  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: v }, { data: ev }, { data: pagMes }] = await Promise.all([
      db.from('vecinos').select('*').eq('activo', true).order('mz').order('lote'),
      db.from('eventos').select('*').order('fecha', { ascending: false }).limit(20),
      db.from('pagos_cuota_mes').select('vecino_id').eq('anio', _cuotaAnio).eq('mes', _cuotaMes)
    ]);
    _vecinos = v || [];
    _eventos = ev || [];
    _cuotaPagados = new Set((pagMes || []).map(p => p.vecino_id));
    if (!Object.keys(_estados).length) {
      _vecinos.forEach(v => { _estados[v.id] = 'P'; _cuotaAmts[v.id] = 0; });
    }
    _draw();
  }

  function _draw() {
    const el = document.getElementById('admin-body');
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Nuevo evento</div>
        <div class="field"><label>Fecha</label><input type="date" id="a-fecha" value="${_fecha || today()}"></div>
        <div class="field"><label>Evento</label>
          <select id="a-nombre-sel" onchange="AdminAsistencia.onNombreChange()">
            <option value="Asamblea Ordinaria"      ${_nombreSel==='Asamblea Ordinaria'     ?'selected':''}>Asamblea Ordinaria</option>
            <option value="Asamblea Extraordinaria" ${_nombreSel==='Asamblea Extraordinaria'?'selected':''}>Asamblea Extraordinaria</option>
            <option value="Faena"                   ${_nombreSel==='Faena'                  ?'selected':''}>Faena</option>
            <option value="otro"                    ${_nombreSel==='otro'                   ?'selected':''}>Otro (escribir nombre)…</option>
          </select>
        </div>
        <div id="a-custom-wrap" style="display:${_nombreSel==='otro'?'block':'none'}">
          <div class="field"><label>Nombre del evento</label><input type="text" id="a-nombre-custom" value="${esc(_nombreCustom)}" placeholder="Escribe el nombre del evento..."></div>
        </div>
        <div id="a-desc-wrap" style="display:${_nombreSel==='otro'?'none':'block'}">
          <div class="field"><label>Descripción opcional</label><input type="text" id="a-desc" placeholder="Ej: 2ª convocatoria, elección de junta..."></div>
        </div>
        <div class="field"><label>Multa por inasistencia</label>
          <div class="tipo-row">
            <button class="tipo-btn ${_tipo==='A'?'on-A':''}" onclick="AdminAsistencia.setTipo('A')">Asamblea<small>S/25</small></button>
            <button class="tipo-btn ${_tipo==='F'?'on-F':''}" onclick="AdminAsistencia.setTipo('F')">Faena<small>S/50</small></button>
            <button class="tipo-btn ${_tipo==='I'?'on-I':''}" onclick="AdminAsistencia.setTipo('I')">Importante<small>S/100</small></button>
          </div>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="card-title" style="margin:0">Lista — ${_vecinos.length} vecinos</div>
          <div style="display:flex;gap:5px">
            <button class="btn btn-sm btn-green" onclick="AdminAsistencia.marcarTodos('P')">✓ Todos</button>
            <button class="btn btn-sm btn-red"   onclick="AdminAsistencia.marcarTodos('F')">✗ Todos</button>
          </div>
        </div>
        <div class="search-bar"><input type="text" id="a-filter" placeholder="Filtrar vecino..." oninput="AdminAsistencia.filtrar(this.value)"></div>
        <div class="cuota-mes-row">
          <span style="font-size:11px;color:var(--text2);font-weight:500">Almacén:</span>
          <button onclick="AdminAsistencia.navMes(-1)">‹</button>
          <span id="cuota-mes-label" style="font-size:12px;font-weight:600;min-width:96px;text-align:center">${MESES_L[_cuotaMes-1]} ${_cuotaAnio}</span>
          <button onclick="AdminAsistencia.navMes(1)">›</button>
          <span style="font-size:10px;color:var(--text3);margin-left:2px">S/2 por mes</span>
        </div>
        <div id="a-lista"></div>
        <button class="btn btn-green btn-block mt-6" onclick="AdminAsistencia.guardar()">💾 Guardar asistencia</button>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 6px">
        <div class="sec-title" style="margin:0">Eventos registrados</div>
        <button class="btn btn-sm btn-outline" onclick="AdminAsistencia.verTabla()">📊 Ver faltas</button>
      </div>
      ${_eventos.length ? `
      <div class="card card-flush">
        ${_eventos.map(ev => `
          <div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento">${esc(ev.nombre)}</div>
              <div class="hist-fecha">${formatFecha(ev.fecha)} · <span class="${tipoColor(ev.tipo)} pill" style="font-size:10px;padding:1px 6px">${tipoLabel(ev.tipo)} S/${MULTAS[ev.tipo]}</span></div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0">
              <button class="btn btn-sm btn-outline" onclick="AdminAsistencia.verEvento(${ev.id})">Ver</button>
              <button class="btn btn-sm btn-danger"  onclick="AdminAsistencia.pedirEliminar(${ev.id},'${ev.nombre.replace(/'/g,"\\'")}')">✕</button>
            </div>
          </div>`).join('')}
      </div>` : '<div class="card" style="color:var(--text2);font-size:13px;text-align:center;padding:16px">Sin eventos registrados aún</div>'}`;
    _renderLista('');
  }

  function _renderLista(q) {
    const fil = _vecinos.filter(v => !q || v.nombre.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('a-lista').innerHTML = fil.map(v => {
      const pagado    = _cuotaPagados.has(v.id);
      const amt       = _cuotaAmts[v.id] || 0;
      const exonTotal  = v.exonerado === 'total';
      const exonFaena  = (v.exonerado === 'faena' || v.exonerado === 'asamblea') && _tipo === 'F';
      const exonCuota = v.mz?.toUpperCase() === 'C' && (v.lote === 4 || v.lote === '4');
      const est       = _estados[v.id] || 'P';
      return `
      <div class="asist-item">
        <div style="flex:1;min-width:0">
          <div class="asist-name">${esc(v.nombre.split(',')[0].trim())}</div>
          <div class="asist-sub">Mz ${esc(v.mz)}-${esc(v.lote)}${exonTotal ? ' · Exonerado' : exonFaena ? ' · Exon.faena' : ''}</div>
        </div>
        <div class="asist-controls">
          <button class="estado-toggle estado-${est}" onclick="AdminAsistencia.toggleEstado(${v.id})" id="est-${v.id}">${est==='F'?'Falta':'Presente'}</button>
          ${exonCuota
            ? `<span style="font-size:10px;color:var(--blue)">Cobrador</span>`
            : !exonTotal
              ? (pagado
                  ? `<span class="pill pill-green" style="font-size:10px;padding:1px 6px">✓ S/2</span>`
                  : `<div style="display:flex;align-items:center;gap:3px">
                      <button class="cuota-toggle ${amt>0?'cuota-pagado':''}" onclick="AdminAsistencia.toggleCuota(${v.id})" id="cuota-${v.id}">${amt>0?'✓ S/'+amt:'S/2'}</button>
                      ${amt>0?`<input type="number" id="cuota-amt-${v.id}" value="${amt}" min="2" step="2" style="width:40px;font-size:12px;padding:2px 3px;border:1px solid var(--border);border-radius:4px;text-align:center;background:var(--card)" oninput="AdminAsistencia.setCuotaAmt(${v.id},this.value)">`:''}
                    </div>`)
              : `<span style="font-size:10px;color:var(--text3)">—</span>`
          }
        </div>
      </div>`;
    }).join('');
  }

  function setTipo(t) {
    _nombreCustom = document.getElementById('a-nombre-custom')?.value || _nombreCustom;
    _fecha = document.getElementById('a-fecha')?.value || _fecha;
    _tipo = t; _draw();
  }
  function filtrar(q) { _renderLista(q); }
  function marcarTodos(est) {
    _vecinos.forEach(v => _estados[v.id] = est);
    _renderLista(document.getElementById('a-filter')?.value || '');
  }

  async function navMes(d) {
    _cuotaMes += d;
    if (_cuotaMes > 12) { _cuotaMes = 1;  _cuotaAnio++; }
    if (_cuotaMes < 1)  { _cuotaMes = 12; _cuotaAnio--; }
    if (_cuotaAnio < CUOTA_MIN_ANIO || (_cuotaAnio === CUOTA_MIN_ANIO && _cuotaMes < CUOTA_MIN_MES)) {
      _cuotaMes = CUOTA_MIN_MES; _cuotaAnio = CUOTA_MIN_ANIO;
    }
    const { data: pagMes } = await db.from('pagos_cuota_mes')
      .select('vecino_id').eq('anio', _cuotaAnio).eq('mes', _cuotaMes);
    _cuotaPagados = new Set((pagMes || []).map(p => p.vecino_id));
    const lbl = document.getElementById('cuota-mes-label');
    if (lbl) lbl.textContent = `${MESES_L[_cuotaMes-1]} ${_cuotaAnio}`;
    _renderLista(document.getElementById('a-filter')?.value || '');
  }

  function toggleEstado(id) {
    _estados[id] = _estados[id] === 'F' ? 'P' : 'F';
    const b = document.getElementById('est-' + id);
    if (b) { b.className = 'estado-toggle estado-' + _estados[id]; b.textContent = _estados[id] === 'F' ? 'Falta' : 'Presente'; }
  }

  function toggleCuota(id) {
    _cuotaAmts[id] = (_cuotaAmts[id] || 0) > 0 ? 0 : 2;
    _renderLista(document.getElementById('a-filter')?.value || '');
  }

  function setCuotaAmt(id, val) {
    _cuotaAmts[id] = Math.max(0, parseInt(val) || 0);
  }

  async function guardar() {
    const fecha     = document.getElementById('a-fecha').value;
    const nombreSel = document.getElementById('a-nombre-sel')?.value || _nombreSel;
    const custom    = (document.getElementById('a-nombre-custom')?.value || '').trim();
    const desc      = (document.getElementById('a-desc')?.value || '').trim();
    if (!fecha) { showToast('Completa la fecha del evento', 'err'); return; }
    if (nombreSel === 'otro' && !custom) { showToast('Escribe el nombre del evento', 'err'); return; }
    const nombreBase = nombreSel === 'otro' ? custom : nombreSel;
    const nombre     = desc ? `${nombreBase} — ${desc}` : nombreBase;
    showLoading();

    const { data: ev, error } = await db.from('eventos').insert({ fecha, nombre, tipo: _tipo }).select().single();
    if (error) { hideLoading(); showToast('Error: ' + error.message, 'err'); return; }
    const rows = _vecinos.map(v => {
      let estado = _estados[v.id] || 'P';
      const esExon = v.exonerado === 'total' || ((v.exonerado === 'faena' || v.exonerado === 'asamblea') && _tipo === 'F');
      if (esExon) estado = 'E';
      return { vecino_id: v.id, evento_id: ev.id, estado };
    });
    const { error: errAsist } = await db.from('asistencias').insert(rows);
    if (errAsist) {
      await db.from('eventos').delete().eq('id', ev.id);
      hideLoading();
      showToast('Error al guardar asistencias: ' + errAsist.message, 'err');
      return;
    }

    const pagando = _vecinos.filter(v => (_cuotaAmts[v.id] || 0) > 0);
    let mesesTotal = 0;
    if (pagando.length > 0) {
      const payingIds = pagando.map(v => v.id);
      const { data: historial } = await db.from('pagos_cuota_mes')
        .select('vecino_id,anio,mes').in('vecino_id', payingIds);
      const paidByVecino = {};
      (historial || []).forEach(p => {
        if (!paidByVecino[p.vecino_id]) paidByVecino[p.vecino_id] = new Set();
        paidByVecino[p.vecino_id].add(`${p.anio}-${p.mes}`);
      });

      const cuotaRows = [];
      for (const v of pagando) {
        const paid      = paidByVecino[v.id] || new Set();
        const amount    = _cuotaAmts[v.id] || 0;
        const numMonths = Math.max(1, Math.floor(amount / 2));

        // Oldest unpaid first: 11 months back → selected month → 11 months ahead
        const candidates = [];
        for (let i = 11; i >= 0; i--) {
          let m = _cuotaMes - i, y = _cuotaAnio;
          while (m < 1) { m += 12; y--; }
          if (!paid.has(`${y}-${m}`)) candidates.push({ anio: y, mes: m });
        }
        for (let i = 1; i <= 11; i++) {
          let m = _cuotaMes + i, y = _cuotaAnio;
          while (m > 12) { m -= 12; y++; }
          if (!paid.has(`${y}-${m}`)) candidates.push({ anio: y, mes: m });
        }

        for (let i = 0; i < Math.min(numMonths, candidates.length); i++) {
          cuotaRows.push({ vecino_id: v.id, anio: candidates[i].anio, mes: candidates[i].mes, monto: 2, fecha_pago: fecha, nota: 'Pagado en asistencia' });
          mesesTotal++;
        }
      }
      if (cuotaRows.length) await db.from('pagos_cuota_mes').insert(cuotaRows);
    }

    hideLoading();
    const faltas = _vecinos.filter(v => _estados[v.id] === 'F').length;
    _estados = {}; _cuotaAmts = {}; _nombreSel = 'Asamblea Ordinaria'; _nombreCustom = ''; _fecha = ''; _tipo = 'A';
    showToast(`✓ Guardado — ${faltas} faltas · ${pagando.length} cobros almacén (${mesesTotal} mes${mesesTotal !== 1 ? 'es' : ''})`);
    AdminApp.tab('inicio');
  }

  function pedirEliminar(id, nombre) {
    Modal.pedir(
      `Vas a eliminar el evento "${nombre}" y TODAS sus asistencias. Esta acción no se puede deshacer.`,
      () => eliminarEvento(id)
    );
  }

  async function eliminarEvento(id) {
    showLoading();
    const { data: asists } = await db.from('asistencias').select('id').eq('evento_id', id);
    if (asists?.length) {
      const ids = asists.map(a => a.id);
      await db.from('subsanaciones').delete().in('asistencia_id', ids);
      await db.from('asistencias').delete().eq('evento_id', id);
    }
    const { error: errDel } = await db.from('eventos').delete().eq('id', id);
    hideLoading();
    if (errDel) { showToast('Error al eliminar: ' + errDel.message, 'err'); return; }
    showToast('✓ Evento eliminado');
    render();
  }

  function onNombreChange() {
    const sel = document.getElementById('a-nombre-sel');
    if (!sel) return;
    _nombreSel = sel.value;
    _nombreCustom = document.getElementById('a-nombre-custom')?.value || _nombreCustom;

    const customWrap = document.getElementById('a-custom-wrap');
    const descWrap   = document.getElementById('a-desc-wrap');
    if (customWrap) customWrap.style.display = _nombreSel === 'otro' ? 'block' : 'none';
    if (descWrap)   descWrap.style.display   = _nombreSel === 'otro' ? 'none'  : 'block';

    if (_nombreSel !== 'otro') {
      const nuevoTipo = _nombreSel === 'Faena' ? 'F' : 'A';
      if (nuevoTipo !== _tipo) {
        _tipo = nuevoTipo;
        document.querySelectorAll('#admin-body .tipo-btn').forEach(b => {
          const m = b.getAttribute('onclick')?.match(/setTipo\('(\w)'\)/);
          if (m) b.className = `tipo-btn${_tipo === m[1] ? ' on-' + m[1] : ''}`;
        });
      }
    }
  }

  // ── Event detail view ──────────────────────────────────────────────
  function _estadoPill(est) {
    if (est === 'P') return '<span class="pill pill-green">Presente</span>';
    if (est === 'F') return '<span class="pill pill-red">Falta</span>';
    if (est === 'J') return '<span class="pill pill-orange">Subsanado</span>';
    if (est === 'E') return '<span class="pill pill-blue">Exonerado</span>';
    return '<span class="pill pill-gray">—</span>';
  }

  async function verEvento(eventoId) {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    let ev = _eventos.find(e => e.id === eventoId);
    if (!ev) {
      const { data } = await db.from('eventos').select('*').eq('id', eventoId).single();
      ev = data || {};
    }
    const [{ data: asists }, { data: vecinos }] = await Promise.all([
      db.from('asistencias').select('*,subsanaciones(*)').eq('evento_id', eventoId),
      db.from('vecinos').select('*').eq('activo', true).order('mz').order('lote')
    ]);
    _eventoActual    = ev;
    _editandoAsistId = null;
    _eventoVecinos   = vecinos || [];
    _eventoAsists    = asists  || [];
    _drawEvento();
  }

  function _drawEvento() {
    const el = document.getElementById('admin-body');
    const ev = _eventoActual || {};
    const presentes = _eventoAsists.filter(a => a.estado === 'P').length;
    const faltas    = _eventoAsists.filter(a => a.estado === 'F').length;
    const subsan    = _eventoAsists.filter(a => a.estado === 'J').length;
    const exon      = _eventoAsists.filter(a => a.estado === 'E').length;
    const asistMap  = {};
    _eventoAsists.forEach(a => { asistMap[a.vecino_id] = a; });
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <button class="btn btn-sm btn-outline" onclick="AdminAsistencia.volverForm()">← Volver</button>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${esc(ev.nombre || '')}</div>
          <div style="font-size:12px;color:var(--text2)">${formatFecha(ev.fecha)} · <span class="${tipoColor(ev.tipo)} pill" style="font-size:10px;padding:1px 5px">${tipoLabel(ev.tipo)} S/${MULTAS[ev.tipo]}</span></div>
        </div>
      </div>
      <div class="metrics" style="margin-bottom:12px" id="ev-metrics">
        <div class="metric"><div class="metric-val c-green">${presentes}</div><div class="metric-lbl">Presentes</div></div>
        <div class="metric"><div class="metric-val c-red">${faltas}</div><div class="metric-lbl">Faltas</div></div>
        ${subsan ? `<div class="metric"><div class="metric-val c-orange">${subsan}</div><div class="metric-lbl">Subsanados</div></div>` : ''}
        ${exon   ? `<div class="metric"><div class="metric-val" style="color:var(--blue)">${exon}</div><div class="metric-lbl">Exonerados</div></div>` : ''}
      </div>
      <div class="card card-flush" id="ev-asist-lista">
        ${_eventoVecinos.map(v => { const a = asistMap[v.id]; return a ? _rowEvento(v, a) : ''; }).join('')}
      </div>`;
  }

  function _rowEvento(v, a) {
    const sub      = a.subsanaciones?.[0];
    const editando = _editandoAsistId === a.id;
    return `<div class="hist-row" id="ev-row-${a.id}">
      <div class="hist-left" style="flex:1">
        <div style="font-weight:500;font-size:13px">${esc(v.nombre)}</div>
        <div style="font-size:11px;color:var(--text2)">Mz ${esc(v.mz)}-${esc(v.lote)}</div>
        ${a.estado === 'J' && sub ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">✅ Sub. ${formatFecha(sub.fecha_subsanacion)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        ${editando
          ? `<button class="btn btn-sm btn-green"   onclick="AdminAsistencia.confirmarEditEnEvento(${a.id},'P')">P</button>
             <button class="btn btn-sm btn-red"     onclick="AdminAsistencia.confirmarEditEnEvento(${a.id},'F')">F</button>
             <button class="btn btn-sm" style="background:var(--blue);color:#fff;border-color:var(--blue)" onclick="AdminAsistencia.confirmarEditEnEvento(${a.id},'E')">E</button>
             <button class="btn btn-sm btn-outline"  onclick="AdminAsistencia.cancelarEditEnEvento()">✕</button>`
          : `${_estadoPill(a.estado)}<button class="btn btn-sm btn-outline" style="margin-left:4px" onclick="AdminAsistencia.editarEnEvento(${a.id})">Editar</button>`
        }
      </div>
    </div>`;
  }

  function _reDrawEventoLista() {
    const asistMap = {};
    _eventoAsists.forEach(a => { asistMap[a.vecino_id] = a; });
    const presentes = _eventoAsists.filter(a => a.estado === 'P').length;
    const faltas    = _eventoAsists.filter(a => a.estado === 'F').length;
    const subsan    = _eventoAsists.filter(a => a.estado === 'J').length;
    const exon      = _eventoAsists.filter(a => a.estado === 'E').length;
    const metricsEl = document.getElementById('ev-metrics');
    if (metricsEl) metricsEl.innerHTML = `
      <div class="metric"><div class="metric-val c-green">${presentes}</div><div class="metric-lbl">Presentes</div></div>
      <div class="metric"><div class="metric-val c-red">${faltas}</div><div class="metric-lbl">Faltas</div></div>
      ${subsan ? `<div class="metric"><div class="metric-val c-orange">${subsan}</div><div class="metric-lbl">Subsanados</div></div>` : ''}
      ${exon   ? `<div class="metric"><div class="metric-val" style="color:var(--blue)">${exon}</div><div class="metric-lbl">Exonerados</div></div>` : ''}`;
    const listaEl = document.getElementById('ev-asist-lista');
    if (!listaEl) return;
    listaEl.innerHTML = _eventoVecinos.map(v => {
      const a = asistMap[v.id];
      return a ? _rowEvento(v, a) : '';
    }).join('');
  }

  function editarEnEvento(asistId) {
    _editandoAsistId = asistId;
    _reDrawEventoLista();
  }

  function cancelarEditEnEvento() {
    _editandoAsistId = null;
    _reDrawEventoLista();
  }

  function confirmarEditEnEvento(asistId, nuevoEstado) {
    const labels = { P: 'Presente', F: 'Falta', E: 'Exonerado', J: 'Subsanado' };
    Modal.pedir(
      `Confirmar: cambiar asistencia a "${labels[nuevoEstado] || nuevoEstado}"`,
      async () => {
        showLoading();
        await db.from('asistencias').update({ estado: nuevoEstado }).eq('id', asistId);
        const idx = _eventoAsists.findIndex(a => a.id === asistId);
        if (idx >= 0) _eventoAsists[idx] = { ..._eventoAsists[idx], estado: nuevoEstado };
        _editandoAsistId = null;
        hideLoading();
        _reDrawEventoLista();
        showToast('✓ Asistencia actualizada');
      }
    );
  }

  function volverForm() {
    _editandoAsistId = null;
    render();
  }

  // ── Faltas matrix table ────────────────────────────────────────────
  async function verTabla() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: eventos }, { data: asists }, { data: vecinos }] = await Promise.all([
      db.from('eventos').select('*').order('fecha', { ascending: true }),
      db.from('asistencias').select('vecino_id,evento_id,estado'),
      db.from('vecinos').select('id,nombre,mz,lote').eq('activo', true).order('mz').order('lote')
    ]);
    const anioStr      = String(_tablaAnio);
    const evsFiltrados = (eventos || []).filter(e => e.fecha.slice(0, 4) === anioStr);
    const map = {};
    (asists || []).forEach(a => {
      if (!map[a.vecino_id]) map[a.vecino_id] = {};
      map[a.vecino_id][a.evento_id] = a.estado;
    });
    const anios = (eventos || []).map(e => parseInt(e.fecha.slice(0, 4)));
    const minAnio = anios.length ? Math.min(...anios) : _tablaAnio;
    const maxAnio = new Date().getFullYear();
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="AdminAsistencia.volverForm()">← Volver</button>
        <div style="font-weight:600;font-size:15px;flex:1">Faltas ${_tablaAnio}</div>
        <div style="display:flex;gap:4px">
          ${_tablaAnio > minAnio ? `<button class="btn btn-sm btn-outline" onclick="AdminAsistencia.navTablaAnio(-1)">‹</button>` : ''}
          ${_tablaAnio < maxAnio ? `<button class="btn btn-sm btn-outline" onclick="AdminAsistencia.navTablaAnio(1)">›</button>`  : ''}
        </div>
      </div>
      ${evsFiltrados.length === 0
        ? `<div class="card" style="color:var(--text2);font-size:13px;text-align:center;padding:20px">Sin eventos registrados en ${_tablaAnio}</div>`
        : `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
            <table class="tabla-faltas">
              <thead><tr>
                <th class="tf-col-name">Vecino</th>
                ${evsFiltrados.map(e => {
                  const mm = parseInt(e.fecha.slice(5, 7));
                  const dd = parseInt(e.fecha.slice(8, 10));
                  return `<th class="tf-col-ev" title="${esc(e.nombre)}"><div>${dd} ${MESES[mm-1]}</div><div style="font-size:8px;opacity:.7">${tipoLabel(e.tipo)[0]}</div></th>`;
                }).join('')}
                <th class="tf-col-tot">F</th>
              </tr></thead>
              <tbody>
                ${(vecinos || []).map(v => {
                  const faltas = evsFiltrados.filter(e => map[v.id]?.[e.id] === 'F').length;
                  return `<tr>
                    <td class="tf-col-name">${esc(v.nombre.split(',')[0].trim())}<span style="font-size:9px;color:var(--text3);display:block">Mz${v.mz}-${v.lote}</span></td>
                    ${evsFiltrados.map(e => {
                      const est = map[v.id]?.[e.id];
                      if (!est) return '<td></td>';
                      const color = est==='P'?'var(--green)':est==='F'?'var(--red)':est==='J'?'var(--orange)':est==='E'?'var(--blue)':'var(--text3)';
                      return `<td style="text-align:center;font-size:11px;font-weight:700;color:${color}">${est}</td>`;
                    }).join('')}
                    <td style="text-align:center;font-weight:700;${faltas > 0 ? 'color:var(--red)' : 'color:var(--text3)'}">${faltas || '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`}`;
  }

  async function navTablaAnio(d) {
    _tablaAnio += d;
    await verTabla();
  }

  return { render, setTipo, onNombreChange, filtrar, marcarTodos, toggleEstado, toggleCuota, setCuotaAmt, navMes, guardar, pedirEliminar, verEvento, editarEnEvento, cancelarEditEnEvento, confirmarEditEnEvento, volverForm, verTabla, navTablaAnio };
})();
