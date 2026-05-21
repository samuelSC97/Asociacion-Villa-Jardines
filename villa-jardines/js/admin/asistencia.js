const AdminAsistencia = (() => {
  let _vecinos = [], _estados = {}, _cuotas = {}, _tipo = 'F';
  let _eventos = [];

  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: v }, { data: ev }] = await Promise.all([
      db.from('vecinos').select('*').order('mz').order('lote'),
      db.from('eventos').select('*').order('fecha', { ascending: false }).limit(20)
    ]);
    _vecinos = v || [];
    _eventos = ev || [];
    if (!Object.keys(_estados).length) _vecinos.forEach(v => { _estados[v.id] = 'P'; _cuotas[v.id] = false; });
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
            <button class="btn btn-sm btn-red" onclick="AdminAsistencia.marcarTodos('F')">✗ Todos</button>
          </div>
        </div>
        <div class="search-bar"><input type="text" id="a-filter" placeholder="Filtrar vecino..." oninput="AdminAsistencia.filtrar(this.value)"></div>
        <div id="a-lista"></div>
        <button class="btn btn-green btn-block mt-6" onclick="AdminAsistencia.guardar()">💾 Guardar asistencia</button>
      </div>

      ${_eventos.length ? `
      <div class="sec-title">Eventos registrados</div>
      <div class="card card-flush">
        ${_eventos.map(ev => `
          <div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento">${ev.nombre}</div>
              <div class="hist-fecha">${formatFecha(ev.fecha)} · <span class="${tipoColor(ev.tipo)} pill" style="font-size:10px;padding:1px 6px">${tipoLabel(ev.tipo)} S/${MULTAS[ev.tipo]}</span></div>
            </div>
            <button class="btn btn-sm btn-danger" onclick="AdminAsistencia.pedirEliminar(${ev.id},'${ev.nombre.replace(/'/g,"\\'")}')">Eliminar</button>
          </div>`).join('')}
      </div>` : ''}`;
    _renderLista('');
  }

  function _renderLista(q) {
    const fil = _vecinos.filter(v => !q || v.nombre.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('a-lista').innerHTML = fil.map(v => `
      <div class="asist-item">
        <div class="avatar" style="width:30px;height:30px;font-size:10px">${initials(v.nombre)}</div>
        <div style="flex:1;min-width:0">
          <div class="asist-name">${v.nombre.split(',')[0].trim()}</div>
          <div class="asist-sub">Mz ${v.mz}-${v.lote}</div>
        </div>
        <div class="asist-controls">
          <button class="cuota-toggle ${_cuotas[v.id]?'cuota-pagado':''}" onclick="AdminAsistencia.toggleCuota(${v.id})" id="cuota-${v.id}">${_cuotas[v.id]?'✓ S/2':'S/2'}</button>
          <button class="estado-toggle estado-${_estados[v.id]||'P'}" onclick="AdminAsistencia.toggleEstado(${v.id})" id="est-${v.id}">${_estados[v.id]==='F'?'Falta':'Presente'}</button>
        </div>
      </div>`).join('');
  }

  function setTipo(t) { _tipo = t; _draw(); }
  function filtrar(q) { _renderLista(q); }
  function marcarTodos(est) { _vecinos.forEach(v => _estados[v.id] = est); _renderLista(document.getElementById('a-filter')?.value || ''); }

  function toggleEstado(id) {
    _estados[id] = _estados[id] === 'F' ? 'P' : 'F';
    const b = document.getElementById('est-' + id);
    if (b) { b.className = 'estado-toggle estado-' + _estados[id]; b.textContent = _estados[id] === 'F' ? 'Falta' : 'Presente'; }
  }
  function toggleCuota(id) {
    _cuotas[id] = !_cuotas[id];
    const b = document.getElementById('cuota-' + id);
    if (b) { b.className = 'cuota-toggle ' + (_cuotas[id] ? 'cuota-pagado' : ''); b.textContent = _cuotas[id] ? '✓ S/2' : 'S/2'; }
  }

  async function guardar() {
    const fecha  = document.getElementById('a-fecha').value;
    const nombre = (document.getElementById('a-evento').value || '').trim();
    if (!fecha || !nombre) { alert('Completa la fecha y el nombre del evento'); return; }
    showLoading();
    const { data: ev, error } = await db.from('eventos').insert({ fecha, nombre, tipo: _tipo }).select().single();
    if (error) { hideLoading(); alert('Error: ' + error.message); return; }
    const rows = _vecinos.map(v => ({ vecino_id: v.id, evento_id: ev.id, estado: _estados[v.id] || 'P' }));
    await db.from('asistencias').insert(rows);
    const anio = parseInt(fecha.slice(0, 4)), mes = parseInt(fecha.slice(5, 7));
    const cuotaRows = _vecinos.filter(v => _cuotas[v.id]).map(v => ({ vecino_id: v.id, anio, mes, monto: 2, fecha_pago: fecha, nota: 'Pagado en asistencia' }));
    if (cuotaRows.length) await db.from('pagos_cuota_mes').insert(cuotaRows);
    hideLoading();
    const faltas = _vecinos.filter(v => _estados[v.id] === 'F').length;
    const cuotas = _vecinos.filter(v => _cuotas[v.id]).length;
    _estados = {}; _cuotas = {};
    alert(`✓ Guardado.\n${faltas} faltas · ${cuotas} cuotas S/2 registradas.`);
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
    // Eliminar subsanaciones relacionadas
    const { data: asists } = await db.from('asistencias').select('id').eq('evento_id', id);
    if (asists?.length) {
      const ids = asists.map(a => a.id);
      await db.from('subsanaciones').delete().in('asistencia_id', ids);
      await db.from('asistencias').delete().eq('evento_id', id);
    }
    await db.from('eventos').delete().eq('id', id);
    hideLoading();
    alert('✓ Evento eliminado correctamente.');
    render();
  }

  return { render, setTipo, filtrar, marcarTodos, toggleEstado, toggleCuota, guardar, pedirEliminar };
})();
