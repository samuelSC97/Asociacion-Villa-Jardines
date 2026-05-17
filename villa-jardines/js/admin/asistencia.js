// js/admin/asistencia.js
const AdminAsistencia = (() => {
  let _vecinos   = [];
  let _estados   = {};   // vecino_id -> 'P' | 'F'
  let _cuotas    = {};   // vecino_id -> bool (pagó S/2 este mes)
  let _tipo      = 'F';

  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando vecinos...</div>';
    const { data: vecinos } = await db.from('vecinos').select('*').order('mz').order('lote');
    _vecinos = vecinos || [];
    if (!Object.keys(_estados).length) _vecinos.forEach(v => { _estados[v.id] = 'P'; _cuotas[v.id] = false; });
    _draw();
  }

  function _draw() {
    const el = document.getElementById('admin-body');
    const hoy = today();
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Datos del evento</div>
        <div class="field"><label>Fecha</label><input type="date" id="a-fecha" value="${hoy}"></div>
        <div class="field"><label>Nombre del evento</label>
          <input type="text" id="a-evento" placeholder="Ej: Asamblea ordinaria mayo 2025">
        </div>
        <div class="field"><label>Tipo</label>
          <div class="tipo-row">
            <button class="tipo-btn ${_tipo==='F'?'on-F':''}" onclick="AdminAsistencia.setTipo('F')">Faena<br><small>S/50</small></button>
            <button class="tipo-btn ${_tipo==='A'?'on-A':''}" onclick="AdminAsistencia.setTipo('A')">Asamblea<br><small>S/25</small></button>
            <button class="tipo-btn ${_tipo==='I'?'on-I':''}" onclick="AdminAsistencia.setTipo('I')">Importante<br><small>S/100</small></button>
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="card-title" style="margin:0">Lista — ${_vecinos.length} vecinos</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-green" onclick="AdminAsistencia.marcarTodos('P')">✓ Todos</button>
            <button class="btn btn-sm btn-red"   onclick="AdminAsistencia.marcarTodos('F')">✗ Todos</button>
          </div>
        </div>
        <div class="search-bar">
          <input type="text" id="a-filter" placeholder="Filtrar vecino..." oninput="AdminAsistencia.filtrar(this.value)">
        </div>
        <div id="a-lista"></div>
        <button class="btn btn-green btn-block" onclick="AdminAsistencia.guardar()" style="margin-top:12px">
          💾 Guardar asistencia
        </button>
      </div>`;
    _renderLista('');
  }

  function _renderLista(q) {
    const fil = _vecinos.filter(v => !q || v.nombre.toLowerCase().includes(q.toLowerCase()));
    document.getElementById('a-lista').innerHTML = fil.map(v => `
      <div class="asist-item">
        <div class="avatar">${initials(v.nombre)}</div>
        <div style="flex:1;min-width:0">
          <div class="asist-name">${v.nombre.split(',')[0].trim()}</div>
          <div class="asist-sub">Mz ${v.mz}-${v.lote}</div>
        </div>
        <div class="asist-actions">
          <button class="cuota-toggle ${_cuotas[v.id] ? 'cuota-pagado' : ''}"
            onclick="AdminAsistencia.toggleCuota(${v.id})" id="cuota-${v.id}">
            ${_cuotas[v.id] ? '✓ S/2' : 'S/2'}
          </button>
          <button class="estado-toggle estado-${_estados[v.id] || 'P'}"
            onclick="AdminAsistencia.toggleEstado(${v.id})" id="est-${v.id}">
            ${_estados[v.id] === 'F' ? 'Falta' : 'Presente'}
          </button>
        </div>
      </div>`).join('');
  }

  function setTipo(t) { _tipo = t; _draw(); }
  function filtrar(q) { _renderLista(q); }

  function marcarTodos(est) {
    _vecinos.forEach(v => _estados[v.id] = est);
    _renderLista(document.getElementById('a-filter')?.value || '');
  }

  function toggleEstado(id) {
    _estados[id] = _estados[id] === 'F' ? 'P' : 'F';
    const btn = document.getElementById('est-' + id);
    if (btn) { btn.className = 'estado-toggle estado-' + _estados[id]; btn.textContent = _estados[id] === 'F' ? 'Falta' : 'Presente'; }
  }

  function toggleCuota(id) {
    _cuotas[id] = !_cuotas[id];
    const btn = document.getElementById('cuota-' + id);
    if (btn) { btn.className = 'cuota-toggle ' + (_cuotas[id] ? 'cuota-pagado' : ''); btn.textContent = _cuotas[id] ? '✓ S/2' : 'S/2'; }
  }

  async function guardar() {
    const fecha  = document.getElementById('a-fecha').value;
    const nombre = (document.getElementById('a-evento').value || '').trim();
    if (!fecha || !nombre) { alert('Completa la fecha y el nombre del evento'); return; }
    showLoading();

    // Crear evento
    const { data: ev, error: evErr } = await db.from('eventos').insert({ fecha, nombre, tipo: _tipo }).select().single();
    if (evErr) { hideLoading(); alert('Error al crear evento: ' + evErr.message); return; }

    // Insertar asistencias
    const asistRows = _vecinos.map(v => ({ vecino_id: v.id, evento_id: ev.id, estado: _estados[v.id] || 'P' }));
    await db.from('asistencias').insert(asistRows);

    // Registrar cuotas S/2 de quienes pagaron
    const anio = parseInt(fecha.slice(0, 4));
    const mes  = parseInt(fecha.slice(5, 7));
    const cuotaRows = _vecinos
      .filter(v => _cuotas[v.id])
      .map(v => ({ vecino_id: v.id, anio, mes, monto: 2, fecha_pago: fecha, nota: 'Pagado en asistencia' }));
    if (cuotaRows.length) await db.from('pagos_cuota_mes').insert(cuotaRows);

    hideLoading();
    const faltas  = _vecinos.filter(v => _estados[v.id] === 'F').length;
    const cuotas  = _vecinos.filter(v => _cuotas[v.id]).length;
    _estados = {}; _cuotas = {};
    alert(`✓ Asistencia guardada.\n${faltas} faltas registradas.\n${cuotas} cuotas de S/2 registradas.`);
    AdminApp.tab('inicio');
  }

  return { render, setTipo, filtrar, marcarTodos, toggleEstado, toggleCuota, guardar };
})();
