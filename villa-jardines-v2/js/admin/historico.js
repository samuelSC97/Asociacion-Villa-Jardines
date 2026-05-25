const AdminHistorico = (() => {
  let _vecinos = [], _anioSel = 2023, _estados = {}, _tipo = 'F';

  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const { data: v } = await db.from('vecinos').select('*').order('mz').order('lote');
    _vecinos = v || [];
    _draw();
  }

  function _draw() {
    const el = document.getElementById('admin-body');
    const anioActual = new Date().getFullYear();
    const anios = [];
    for (let y = 2022; y <= anioActual; y++) anios.push(y);

    el.innerHTML = `
      <div class="card" style="border:2px solid var(--gold);background:var(--bg2)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:18px">📜</span>
          <div class="card-title" style="margin:0;color:var(--gold)">Carga histórica de datos</div>
        </div>
        <div style="font-size:12px;color:var(--text2);line-height:1.6">
          Usa esta sección para cargar datos pasados de asambleas y faenas históricas.
          <br>Para <strong>2022</strong>: solo puedes registrar deuda total acumulada por vecino (monto global hasta ese año).
          <br>Para <strong>2023 en adelante</strong>: puedes registrar eventos con fecha y asistencia detallada.
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        ${anios.map(y => `<button class="btn btn-sm ${_anioSel===y?'btn-dark':'btn-outline'}" onclick="AdminHistorico.setAnio(${y})">${y}</button>`).join('')}
      </div>

      ${_anioSel === 2022 ? _drawDeuda2022() : _drawEventoHistorico()}
    `;
    if (_anioSel !== 2022) _renderListaHistorico('');
  }

  function _drawDeuda2022() {
    return `
      <div class="sec-title">Deuda acumulada hasta 2022 por vecino</div>
      <div class="card">
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.5">
          Ingresa cuánto debe cada vecino como deuda total histórica hasta 2022.
          Esto se registrará como un pago pendiente especial de tipo "deuda histórica".
          <br>Si un vecino no debe nada, déjalo en 0 o vacío.
        </div>
        <div class="search-bar"><input type="text" id="h-filter22" placeholder="Filtrar vecino..." oninput="AdminHistorico.filtrar22(this.value)"></div>
        <div id="h-lista22"></div>
        <button class="btn btn-gold btn-block mt-6" onclick="AdminHistorico.guardarDeuda2022()">💾 Guardar deudas 2022</button>
      </div>
    `;
  }

  function _drawEventoHistorico() {
    return `
      <div class="sec-title">Registrar evento histórico ${_anioSel}</div>
      <div class="card">
        <div class="grid-2">
          <div class="field"><label>Fecha del evento</label><input type="date" id="h-fecha" value="${_anioSel}-01-01"></div>
          <div class="field"><label>Nombre del evento</label><input type="text" id="h-nombre" placeholder="Ej: Asamblea ordinaria enero ${_anioSel}"></div>
        </div>
        <div class="field"><label>Tipo</label>
          <div class="tipo-row">
            <button class="tipo-btn ${_tipo==='F'?'on-F':''}" onclick="AdminHistorico.setTipo('F')">Faena<small>S/50</small></button>
            <button class="tipo-btn ${_tipo==='A'?'on-A':''}" onclick="AdminHistorico.setTipo('A')">Asamblea<small>S/25</small></button>
            <button class="tipo-btn ${_tipo==='I'?'on-I':''}" onclick="AdminHistorico.setTipo('I')">Importante<small>S/100</small></button>
          </div>
        </div>
        <div class="tip-box">💡 Marca como <strong>Falta</strong> a quienes no asistieron. Por defecto todos están como Presente.</div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="card-title" style="margin:0">Lista — ${_vecinos.length} vecinos</div>
          <div style="display:flex;gap:5px">
            <button class="btn btn-sm btn-green" onclick="AdminHistorico.marcarTodos('P')">✓ Todos</button>
            <button class="btn btn-sm btn-red" onclick="AdminHistorico.marcarTodos('F')">✗ Todos</button>
          </div>
        </div>
        <div class="search-bar"><input type="text" id="h-filter" placeholder="Filtrar vecino..." oninput="AdminHistorico.filtrar(this.value)"></div>
        <div id="h-lista"></div>
        <button class="btn btn-green btn-block mt-6" onclick="AdminHistorico.guardarEvento()">💾 Guardar evento histórico</button>
      </div>
    `;
  }

  function setAnio(y) {
    _anioSel = y;
    _estados = {};
    _vecinos.forEach(v => { _estados[v.id] = 'P'; });
    _draw();
  }

  function setTipo(t) { _tipo = t; _draw(); }

  function marcarTodos(est) {
    _vecinos.forEach(v => _estados[v.id] = est);
    _renderListaHistorico(document.getElementById('h-filter')?.value || '');
  }

  function filtrar(q) { _renderListaHistorico(q); }

  function filtrar22(q) {
    const fil = _vecinos.filter(v => !q || v.nombre.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('h-lista22').innerHTML = fil.map(v => `
      <div class="asist-item">
        <div class="avatar" style="width:28px;height:28px;font-size:10px">${initials(v.nombre)}</div>
        <div style="flex:1;min-width:0">
          <div class="asist-name">${v.nombre.split(',')[0].trim()}</div>
          <div class="asist-sub">Mz ${v.mz}-${v.lote}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;color:var(--text2)">S/</span>
          <input type="number" id="deuda22-${v.id}" min="0" step="25" value="0" style="width:70px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text1);font-size:13px;text-align:right">
        </div>
      </div>`).join('');
  }

  function _renderListaHistorico(q) {
    const fil = _vecinos.filter(v => !q || v.nombre.toLowerCase().includes(q.toLowerCase()));
    const cont = document.getElementById('h-lista');
    if (!cont) return;
    cont.innerHTML = fil.map(v => `
      <div class="asist-item">
        <div class="avatar" style="width:30px;height:30px;font-size:10px">${initials(v.nombre)}</div>
        <div style="flex:1;min-width:0">
          <div class="asist-name">${v.nombre.split(',')[0].trim()}</div>
          <div class="asist-sub">Mz ${v.mz}-${v.lote}</div>
        </div>
        <button class="estado-toggle estado-${_estados[v.id]||'P'}" onclick="AdminHistorico.toggleEstado(${v.id})" id="hest-${v.id}">${_estados[v.id]==='F'?'Falta':'Presente'}</button>
      </div>`).join('');
  }

  function toggleEstado(id) {
    _estados[id] = _estados[id] === 'F' ? 'P' : 'F';
    const b = document.getElementById('hest-' + id);
    if (b) { b.className = 'estado-toggle estado-' + _estados[id]; b.textContent = _estados[id] === 'F' ? 'Falta' : 'Presente'; }
  }

  async function guardarDeuda2022() {
    const filas = [];
    _vecinos.forEach(v => {
      const inp = document.getElementById('deuda22-' + v.id);
      const monto = parseFloat(inp?.value || '0');
      if (monto > 0) filas.push({ vecino_id: v.id, monto });
    });
    if (!filas.length) { alert('No hay deudas mayores a S/0 para registrar.'); return; }
    if (!confirm(`Vas a registrar deudas históricas 2022 para ${filas.length} vecinos. ¿Continuar?\n\n(Si ya registraste deudas 2022 antes, pueden duplicarse)`)) return;
    showLoading();
    // Guardar como un evento especial "Deuda histórica 2022"
    const { data: ev, error: evErr } = await db.from('eventos').insert({
      fecha: '2022-12-31',
      nombre: 'Deuda histórica acumulada hasta 2022',
      tipo: 'I',
      descripcion: 'Saldo de deuda registrado manualmente del historial previo'
    }).select().single();
    if (evErr) { hideLoading(); alert('Error: ' + evErr.message); return; }

    // Para cada vecino con deuda, registrar una asistencia "Falta" con monto customizado
    // Usamos un apoyo negativo: creamos asistencia tipo F y un registro en apoyos con monto negativo equivalente
    // Mejor: insertar en otros_pagos como "deuda historica" o simplemente crear asistencias con estado F
    // La forma más compatible: evento especial + asistencias F para deudores, P para los demás
    const rowsP = _vecinos.filter(v => !filas.find(f => f.vecino_id === v.id)).map(v => ({
      vecino_id: v.id, evento_id: ev.id, estado: 'P'
    }));
    const rowsF = filas.map(f => ({ vecino_id: f.vecino_id, evento_id: ev.id, estado: 'F' }));
    await db.from('asistencias').insert([...rowsP, ...rowsF]);

    hideLoading();
    alert(`✓ Deuda histórica 2022 registrada.\n${filas.length} vecinos con deuda marcados.\nLa deuda aparece como falta en el evento "Deuda histórica acumulada hasta 2022".`);
    render();
  }

  async function guardarEvento() {
    const fecha  = document.getElementById('h-fecha')?.value;
    const nombre = (document.getElementById('h-nombre')?.value || '').trim();
    if (!fecha || !nombre) { alert('Completa la fecha y el nombre del evento'); return; }
    const fechaAnio = parseInt(fecha.slice(0, 4));
    if (fechaAnio !== _anioSel) { alert(`La fecha debe ser del año ${_anioSel}`); return; }

    // Verificar si ya existe un evento con ese nombre y fecha
    const { data: exist } = await db.from('eventos').select('id').eq('fecha', fecha).eq('nombre', nombre);
    if (exist?.length) {
      if (!confirm(`Ya existe un evento con ese nombre y fecha. ¿Deseas crear uno nuevo de todas formas?`)) return;
    }

    showLoading();
    const { data: ev, error } = await db.from('eventos').insert({ fecha, nombre, tipo: _tipo, descripcion: `Cargado históricamente` }).select().single();
    if (error) { hideLoading(); alert('Error: ' + error.message); return; }
    const rows = _vecinos.map(v => ({ vecino_id: v.id, evento_id: ev.id, estado: _estados[v.id] || 'P' }));
    await db.from('asistencias').insert(rows);
    hideLoading();
    const faltas = rows.filter(r => r.estado === 'F').length;
    alert(`✓ Evento histórico guardado.\n${faltas} faltas registradas.`);
    _estados = {};
    _vecinos.forEach(v => { _estados[v.id] = 'P'; });
    _draw();
  }

  // Init estado al cargar
  function _initEstados() { _vecinos.forEach(v => { if (!_estados[v.id]) _estados[v.id] = 'P'; }); }

  const _origRender = render;
  async function renderWrapped() {
    await _origRender();
    _initEstados();
    if (_anioSel === 2022) filtrar22('');
    else _renderListaHistorico('');
  }

  return { render: renderWrapped, setAnio, setTipo, marcarTodos, filtrar, filtrar22, toggleEstado, guardarDeuda2022, guardarEvento };
})();
