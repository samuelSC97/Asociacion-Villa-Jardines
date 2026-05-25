const AdminAsistencia = (() => {
  let _vecinos = [], _estados = {}, _cuotaAmts = {}, _tipo = 'F';
  let _eventos = [];
  let _cuotaMes  = new Date().getMonth() + 1;
  let _cuotaAnio = new Date().getFullYear();
  let _cuotaPagados = new Set();

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
        <div class="field"><label>Fecha</label><input type="date" id="a-fecha" value="${today()}"></div>
        <div class="field"><label>Nombre del evento</label><input type="text" id="a-evento" placeholder="Ej: Asamblea ordinaria mayo 2025"></div>
        <div class="field"><label>Tipo</label>
          <div class="tipo-row">
            <button class="tipo-btn ${_tipo==='F'?'on-F':''}" onclick="AdminAsistencia.setTipo('F')">Faena<small>S/50</small></button>
            <button class="tipo-btn ${_tipo==='A'?'on-A':''}" onclick="AdminAsistencia.setTipo('A')">Asamblea<small>S/25</small></button>
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

      ${_eventos.length ? `
      <div class="sec-title">Eventos registrados</div>
      <div class="card card-flush">
        ${_eventos.map(ev => `
          <div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento">${esc(ev.nombre)}</div>
              <div class="hist-fecha">${formatFecha(ev.fecha)} · <span class="${tipoColor(ev.tipo)} pill" style="font-size:10px;padding:1px 6px">${tipoLabel(ev.tipo)} S/${MULTAS[ev.tipo]}</span></div>
            </div>
            <button class="btn btn-sm btn-danger" onclick="AdminAsistencia.pedirEliminar(${ev.id},'${ev.nombre.replace(/'/g,"\\'")}')">Eliminar</button>
          </div>`).join('')}
      </div>` : ''}`;
    _renderLista('');
  }

  function _renderLista(q) {
    const fil = _vecinos.filter(v => !q || v.nombre.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('a-lista').innerHTML = fil.map(v => {
      const pagado    = _cuotaPagados.has(v.id);
      const amt       = _cuotaAmts[v.id] || 0;
      const exonTotal = v.exonerado === 'total';
      const exonAsam  = v.exonerado === 'asamblea' && _tipo === 'A';
      return `
      <div class="asist-item">
        <div class="avatar" style="width:30px;height:30px;font-size:10px">${initials(v.nombre)}</div>
        <div style="flex:1;min-width:0">
          <div class="asist-name">${esc(v.nombre.split(',')[0].trim())}</div>
          <div class="asist-sub">Mz ${esc(v.mz)}-${esc(v.lote)}${exonTotal ? ' · Exonerado' : exonAsam ? ' · Exon. asamblea' : ''}</div>
        </div>
        <div class="asist-controls">
          ${!exonTotal
            ? (pagado
                ? `<span class="pill pill-green" style="font-size:10px;padding:1px 6px">✓ Pagó</span>`
                : `<div style="display:flex;align-items:center;gap:3px">
                    <button class="cuota-toggle ${amt>0?'cuota-pagado':''}" onclick="AdminAsistencia.toggleCuota(${v.id})" id="cuota-${v.id}">${amt>0?'✓':'S/2'}</button>
                    ${amt>0?`<input type="number" id="cuota-amt-${v.id}" value="${amt}" min="2" step="2" style="width:44px;font-size:12px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;text-align:center;background:var(--card)" oninput="AdminAsistencia.setCuotaAmt(${v.id},this.value)">`:''}
                  </div>`)
            : `<span style="font-size:10px;color:var(--text3)">—</span>`
          }
          <button class="estado-toggle estado-${_estados[v.id]||'P'}" onclick="AdminAsistencia.toggleEstado(${v.id})" id="est-${v.id}">${_estados[v.id]==='F'?'Falta':'Presente'}</button>
        </div>
      </div>`;
    }).join('');
  }

  function setTipo(t) { _tipo = t; _draw(); }
  function filtrar(q) { _renderLista(q); }
  function marcarTodos(est) {
    _vecinos.forEach(v => _estados[v.id] = est);
    _renderLista(document.getElementById('a-filter')?.value || '');
  }

  async function navMes(d) {
    _cuotaMes += d;
    if (_cuotaMes > 12) { _cuotaMes = 1;  _cuotaAnio++; }
    if (_cuotaMes < 1)  { _cuotaMes = 12; _cuotaAnio--; }
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
    const fecha  = document.getElementById('a-fecha').value;
    const nombre = (document.getElementById('a-evento').value || '').trim();
    if (!fecha || !nombre) { showToast('Completa la fecha y el nombre del evento', 'err'); return; }
    showLoading();

    const { data: ev, error } = await db.from('eventos').insert({ fecha, nombre, tipo: _tipo }).select().single();
    if (error) { hideLoading(); showToast('Error: ' + error.message, 'err'); return; }
    const rows = _vecinos.map(v => {
      let estado = _estados[v.id] || 'P';
      if (v.exonerado === 'total' || (v.exonerado === 'asamblea' && _tipo === 'A')) estado = 'P';
      return { vecino_id: v.id, evento_id: ev.id, estado };
    });
    await db.from('asistencias').insert(rows);

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
    _estados = {}; _cuotaAmts = {};
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
    await db.from('eventos').delete().eq('id', id);
    hideLoading();
    showToast('✓ Evento eliminado');
    render();
  }

  return { render, setTipo, filtrar, marcarTodos, toggleEstado, toggleCuota, setCuotaAmt, navMes, guardar, pedirEliminar };
})();
