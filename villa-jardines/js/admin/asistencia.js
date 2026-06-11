const AdminAsistencia = (() => {
  let _vecinos = [], _estados = {}, _cuotaAmts = {}, _tipo = 'A', _nombreSel = 'Asamblea Ordinaria', _nombreCustom = '', _fecha = '';
  let _eventos = [];
  let _cobrarAsistencia = true;
  let _cobrarCuota = true;
  const CUOTA_MIN_MES = 2, CUOTA_MIN_ANIO = 2025;
  let _cuotaMes  = new Date().getMonth() + 1;
  let _cuotaAnio = new Date().getFullYear();
  let _cuotaPagados = new Set();
  let _eventoActual = null, _eventoVecinos = [], _eventoAsists = [];
  let _editandoAsistId = null;
  let _tablaAnio = new Date().getFullYear();
  let _vecinoExpand = null;
  let _vecinoHistMap = {};

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

    const modoRow = `
      <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:10px;color:var(--text2);font-weight:700;letter-spacing:.4px;text-transform:uppercase">Registrar:</span>
        <button class="btn btn-sm ${_cobrarAsistencia ? 'btn-green' : 'btn-outline'}" onclick="AdminAsistencia.toggleModoAsist()">📋 Asistencia</button>
        <button class="btn btn-sm ${_cobrarCuota ? 'btn-blue' : 'btn-outline'}" onclick="AdminAsistencia.toggleModoCuota()">🏪 Almacén S/2</button>
      </div>`;

    const cuotaNav = _cobrarCuota ? `
      <div style="display:flex;align-items:center;gap:4px;margin-top:4px">
        <button onclick="AdminAsistencia.navMes(-1)">‹</button>
        <span id="cuota-mes-label" style="font-size:12px;font-weight:600;min-width:100px;text-align:center">${MESES_L[_cuotaMes-1]} ${_cuotaAnio}</span>
        <button onclick="AdminAsistencia.navMes(1)">›</button>
        <span style="font-size:10px;color:var(--text3);margin-left:2px">S/2 por mes</span>
      </div>` : '';

    const eventFields = _cobrarAsistencia ? `
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
      </div>` : '';

    const cardTitle = _cobrarAsistencia ? 'Nuevo evento' : 'Cobro almacén S/2';
    const btnLabel  = !_cobrarAsistencia
      ? '💾 Guardar cobro S/2'
      : _cobrarCuota ? '💾 Guardar asistencia y S/2' : '💾 Guardar asistencia';

    el.innerHTML = `
      <div class="card">
        <div class="card-title">${cardTitle}</div>
        ${modoRow}
        <div class="field"><label>Fecha</label><input type="date" id="a-fecha" value="${_fecha || today()}"></div>
        ${eventFields}
        ${cuotaNav}
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="card-title" style="margin:0">Lista — ${_vecinos.length} vecinos</div>
          ${_cobrarAsistencia ? `<div style="display:flex;gap:5px">
            <button class="btn btn-sm btn-green" onclick="AdminAsistencia.marcarTodos('P')">✓ Todos</button>
            <button class="btn btn-sm btn-red"   onclick="AdminAsistencia.marcarTodos('F')">✗ Todos</button>
          </div>` : ''}
        </div>
        <div class="search-bar"><input type="text" id="a-filter" placeholder="Filtrar vecino..." oninput="AdminAsistencia.filtrar(this.value)"></div>
        <div id="a-lista"></div>
        <button class="btn btn-green btn-block mt-6" onclick="AdminAsistencia.guardar()">${btnLabel}</button>
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
      const exonTotal = v.exonerado === 'total';
      const exonFaena = (v.exonerado === 'faena' || v.exonerado === 'asamblea') && _tipo === 'F';
      const exonCuota = v.mz?.toUpperCase() === 'C' && (v.lote === 4 || v.lote === '4');
      const est       = _estados[v.id] || 'P';
      const expanded  = _vecinoExpand === v.id;
      const name      = v.nombre.split(',')[0].trim();

      const asistBtn = _cobrarAsistencia
        ? `<button class="estado-toggle estado-${est}" onclick="AdminAsistencia.toggleEstado(${v.id})" id="est-${v.id}">${est==='F'?'Falta':'Presente'}</button>`
        : '';

      const cuotaCtrl = _cobrarCuota
        ? (exonCuota
            ? `<span style="font-size:10px;color:var(--blue)">Cobrador</span>`
            : !exonTotal
              ? (pagado
                  ? `<span class="pill pill-green" style="font-size:10px;padding:1px 6px">✓ S/2</span>`
                  : `<div style="display:flex;align-items:center;gap:3px">
                      <button class="cuota-toggle ${amt>0?'cuota-pagado':''}" onclick="AdminAsistencia.toggleCuota(${v.id})" id="cuota-${v.id}">${amt>0?'✓ S/'+amt:'S/2'}</button>
                      ${amt>0?`<input type="number" id="cuota-amt-${v.id}" value="${amt}" min="2" step="2" style="width:40px;font-size:12px;padding:2px 3px;border:1px solid var(--border);border-radius:4px;text-align:center;background:var(--card)" oninput="AdminAsistencia.setCuotaAmt(${v.id},this.value)">`:''}
                    </div>`)
              : `<span style="font-size:10px;color:var(--text3)">—</span>`)
        : '';

      return `
      <div style="border-bottom:1px solid var(--bg2)">
        <div class="asist-item" style="border-bottom:none">
          <div style="flex:1;min-width:0;cursor:pointer" onclick="AdminAsistencia.verVecinoHist(${v.id})">
            <div class="asist-name">${esc(name)}<span style="font-size:9px;color:var(--blue);margin-left:3px">ℹ</span></div>
            <div class="asist-sub">Mz ${esc(v.mz)}-${esc(v.lote)}${exonTotal ? ' · Exonerado' : exonFaena ? ' · Exon.faena' : ''}</div>
          </div>
          <div class="asist-controls">
            ${asistBtn}
            ${cuotaCtrl}
          </div>
        </div>
        ${expanded ? _renderHistPanel(v.id) : ''}
      </div>`;
    }).join('');
  }

  function _renderHistPanel(vId) {
    const paid = _vecinoHistMap[vId];
    if (!paid) return `<div style="padding:8px 10px;background:var(--bg2);font-size:11px;color:var(--text2)">Cargando historial...</div>`;

    const now   = new Date();
    const nowYr = now.getFullYear(), nowMo = now.getMonth() + 1;
    let pending = 0;
    const rows  = [];

    for (let yr = CUOTA_MIN_ANIO; yr <= nowYr; yr++) {
      const startMo = yr === CUOTA_MIN_ANIO ? CUOTA_MIN_MES : 1;
      const endMo   = yr === nowYr ? nowMo : 12;
      const cells   = [];
      for (let mo = startMo; mo <= endMo; mo++) {
        const ok = paid.has(`${yr}-${mo}`);
        if (!ok) pending++;
        cells.push(`<span style="display:inline-block;width:22px;text-align:center;font-size:9px;padding:2px 0;border-radius:3px;font-weight:600;margin:1px;background:${ok?'var(--green-bg)':'var(--red-bg)'};color:${ok?'var(--green)':'var(--red)'}" title="${MESES_L[mo-1]} ${yr}">${MESES[mo-1]}</span>`);
      }
      rows.push(`<div style="margin-bottom:3px"><span style="font-size:9px;color:var(--text2);font-weight:600;display:inline-block;width:30px">${yr}:</span>${cells.join('')}</div>`);
    }

    return `<div style="padding:8px 10px;background:var(--bg2);border-top:1px solid var(--border)">
      <div style="font-size:11px;margin-bottom:5px;font-weight:600">
        Almacén: ${pending > 0
          ? `<span style="color:var(--red)">${pending} mes${pending>1?'es':''} pendiente${pending>1?'s':''}</span>`
          : '<span style="color:var(--green)">Al día ✓</span>'}
      </div>
      ${rows.join('')}
    </div>`;
  }

  async function verVecinoHist(vId) {
    if (_vecinoExpand === vId) {
      _vecinoExpand = null;
      _renderLista(document.getElementById('a-filter')?.value || '');
      return;
    }
    _vecinoExpand = vId;
    if (!_vecinoHistMap[vId]) {
      _renderLista(document.getElementById('a-filter')?.value || '');
      const { data } = await db.from('pagos_cuota_mes').select('anio,mes').eq('vecino_id', vId);
      _vecinoHistMap[vId] = new Set((data || []).map(p => `${p.anio}-${p.mes}`));
    }
    _renderLista(document.getElementById('a-filter')?.value || '');
  }

  function toggleModoAsist() {
    if (_cobrarAsistencia && !_cobrarCuota) {
      showToast('Activa almacén S/2 antes de desactivar asistencia', 'err');
      return;
    }
    _cobrarAsistencia = !_cobrarAsistencia;
    if (!_cobrarAsistencia) _estados = {};
    _draw();
  }

  function toggleModoCuota() {
    if (_cobrarCuota && !_cobrarAsistencia) {
      showToast('Activa asistencia antes de desactivar S/2', 'err');
      return;
    }
    _cobrarCuota = !_cobrarCuota;
    if (!_cobrarCuota) _cuotaAmts = {};
    _draw();
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
    const fecha = document.getElementById('a-fecha').value;
    if (!fecha) { showToast('Completa la fecha', 'err'); return; }

    if (_cobrarAsistencia) {
      const nombreSel = document.getElementById('a-nombre-sel')?.value || _nombreSel;
      const custom    = (document.getElementById('a-nombre-custom')?.value || '').trim();
      if (nombreSel === 'otro' && !custom) { showToast('Escribe el nombre del evento', 'err'); return; }
    }

    showLoading();
    let faltas = 0;

    if (_cobrarAsistencia) {
      const nombreSel  = document.getElementById('a-nombre-sel')?.value || _nombreSel;
      const custom     = (document.getElementById('a-nombre-custom')?.value || '').trim();
      const desc       = (document.getElementById('a-desc')?.value || '').trim();
      const nombreBase = nombreSel === 'otro' ? custom : nombreSel;
      const nombre     = desc ? `${nombreBase} — ${desc}` : nombreBase;

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
      faltas = _vecinos.filter(v => _estados[v.id] === 'F').length;
    }

    const pagando = _cobrarCuota ? _vecinos.filter(v => (_cuotaAmts[v.id] || 0) > 0) : [];
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

      const nota = _cobrarAsistencia ? 'En asistencia' : 'Cobro S/2';
      const cuotaRows = [];
      for (const v of pagando) {
        const paid      = paidByVecino[v.id] || new Set();
        const amount    = _cuotaAmts[v.id] || 0;
        const numMonths = Math.max(1, Math.floor(amount / 2));

        const candidates = [];
        // 1. Mes seleccionado primero
        if (!paid.has(`${_cuotaAnio}-${_cuotaMes}`)) {
          candidates.push({ anio: _cuotaAnio, mes: _cuotaMes });
        }
        // 2. Meses anteriores al seleccionado, del más antiguo al más reciente
        for (let i = 24; i >= 1; i--) {
          let m = _cuotaMes - i, y = _cuotaAnio;
          while (m < 1) { m += 12; y--; }
          if (y < CUOTA_MIN_ANIO || (y === CUOTA_MIN_ANIO && m < CUOTA_MIN_MES)) continue;
          if (!paid.has(`${y}-${m}`)) candidates.push({ anio: y, mes: m });
        }
        // 3. Meses futuros (adelanto), del más próximo al más lejano
        for (let i = 1; i <= 11; i++) {
          let m = _cuotaMes + i, y = _cuotaAnio;
          while (m > 12) { m -= 12; y++; }
          if (!paid.has(`${y}-${m}`)) candidates.push({ anio: y, mes: m });
        }

        for (let i = 0; i < Math.min(numMonths, candidates.length); i++) {
          cuotaRows.push({ vecino_id: v.id, anio: candidates[i].anio, mes: candidates[i].mes, monto: 2, fecha_pago: fecha, nota });
          mesesTotal++;
        }
      }
      if (cuotaRows.length) await db.from('pagos_cuota_mes').insert(cuotaRows);
    }

    const asistMsg  = _cobrarAsistencia ? `${faltas} falta${faltas !== 1 ? 's' : ''}` : '';
    const cobrosMsg = pagando.length > 0 ? `${pagando.length} cobros S/2 (${mesesTotal} mes${mesesTotal !== 1 ? 'es' : ''})` : '';
    const toastMsg  = [asistMsg, cobrosMsg].filter(Boolean).join(' · ');

    hideLoading();
    _estados = {}; _cuotaAmts = {};
    _cobrarAsistencia = true; _cobrarCuota = true;
    _nombreSel = 'Asamblea Ordinaria'; _nombreCustom = ''; _fecha = ''; _tipo = 'A';
    _vecinoExpand = null; _vecinoHistMap = {};

    showToast('✓ Guardado' + (toastMsg ? ' — ' + toastMsg : ''));
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
      const { error: errSub } = await db.from('subsanaciones').delete().in('asistencia_id', ids);
      if (errSub) { hideLoading(); showToast('Error (subsanaciones): ' + errSub.message, 'err'); return; }
      const { error: errAsis } = await db.from('asistencias').delete().eq('evento_id', id);
      if (errAsis) { hideLoading(); showToast('Error (asistencias): ' + errAsis.message, 'err'); return; }
    }
    const { error: errDel } = await db.from('eventos').delete().eq('id', id);
    hideLoading();
    if (errDel) { showToast('Error (evento): ' + errDel.message, 'err'); return; }
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

  return {
    render, setTipo, onNombreChange, filtrar, marcarTodos, toggleEstado, toggleCuota, setCuotaAmt,
    navMes, toggleModoAsist, toggleModoCuota, guardar, pedirEliminar, verEvento, editarEnEvento,
    cancelarEditEnEvento, confirmarEditEnEvento, volverForm, verTabla, navTablaAnio, verVecinoHist
  };
})();
