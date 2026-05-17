// js/admin/pagos.js
const AdminPagos = (() => {
  let _anio = new Date().getFullYear();
  let _seccion = 'cuotas'; // 'cuotas' | 'otros'
  let _pagoDetalleId = null;

  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    if (_seccion === 'cuotas') await _renderCuotas(el);
    else await _renderOtros(el);
  }

  async function _renderCuotas(el) {
    const { data: cuotas } = await db.from('cuotas_sociales').select('*, vecinos(nombre,mz,lote)').eq('anio', _anio).order('fecha_pago', { ascending: false });
    const { data: todos } = await db.from('vecinos').select('id,nombre,mz,lote,exonerado');

    const pagadosPorVecino = {};
    (cuotas || []).forEach(c => {
      pagadosPorVecino[c.vecino_id] = (pagadosPorVecino[c.vecino_id] || 0) + parseFloat(c.monto);
    });
    const totalRecaudado = Object.values(pagadosPorVecino).reduce((s, v) => s + v, 0);

    el.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:12px">
        <button class="btn ${_seccion==='cuotas'?'btn-dark':'btn-outline'} btn-sm" onclick="AdminPagos.setSeccion('cuotas')">Cuotas sociales</button>
        <button class="btn ${_seccion==='otros'?'btn-dark':'btn-outline'} btn-sm" onclick="AdminPagos.setSeccion('otros')">Otros pagos</button>
      </div>

      <div class="year-nav">
        <button onclick="AdminPagos.cambiarAnio(-1)">‹</button>
        <span>Cuotas Sociales ${_anio}</span>
        <button onclick="AdminPagos.cambiarAnio(1)">›</button>
      </div>

      <div class="metrics">
        <div class="metric"><div class="metric-val c-green">S/${totalRecaudado}</div><div class="metric-lbl">Recaudado</div></div>
        <div class="metric"><div class="metric-val">${Object.keys(pagadosPorVecino).length}</div><div class="metric-lbl">Pagaron</div></div>
        <div class="metric"><div class="metric-val c-red">${(todos||[]).filter(v=>!v.exonerado&&!pagadosPorVecino[v.id]).length}</div><div class="metric-lbl">Pendientes</div></div>
      </div>

      <div class="card">
        <div class="card-title">Estado por vecino — ${_anio}</div>
        <table class="tabla">
          <thead><tr><th>Vecino</th><th>Pagado</th><th>Estado</th></tr></thead>
          <tbody>
            ${(todos||[]).filter(v=>!v.exonerado).map(v => {
              const pag = pagadosPorVecino[v.id] || 0;
              return `<tr>
                <td>
                  <div style="font-weight:500">${v.nombre.split(',')[0].trim()}</div>
                  <div style="font-size:11px;color:var(--text2)">Mz ${v.mz}-${v.lote}</div>
                </td>
                <td style="font-family:var(--mono);font-weight:500">S/${pag}</td>
                <td>${pag >= 24
                  ? '<span class="pill pill-green">Completo</span>'
                  : pag > 0
                  ? `<span class="pill pill-orange">Parcial S/${24-pag} pend.</span>`
                  : '<span class="pill pill-red">Pendiente</span>'}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="sec-title">Pagos registrados ${_anio}</div>
      <div class="card card-flush">
        ${(cuotas||[]).map(c => `
          <div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento">${c.vecinos?.nombre?.split(',')[0].trim() || '?'} — Mz${c.vecinos?.mz}-${c.vecinos?.lote}</div>
              <div class="hist-fecha">${formatFecha(c.fecha_pago)}${c.nota ? ' · ' + c.nota : ''}</div>
            </div>
            <span class="pill pill-green">S/${c.monto}</span>
          </div>`).join('') || '<div style="color:var(--text2);font-size:13px;padding:12px 0">Sin pagos registrados</div>'}
      </div>`;
  }

  async function _renderOtros(el) {
    if (_pagoDetalleId) { await _renderOtroDetalle(el, _pagoDetalleId); return; }

    const { data: pagos } = await db.from('otros_pagos').select('*').order('fecha_creacion', { ascending: false });
    el.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:12px">
        <button class="btn ${_seccion==='cuotas'?'btn-dark':'btn-outline'} btn-sm" onclick="AdminPagos.setSeccion('cuotas')">Cuotas sociales</button>
        <button class="btn ${_seccion==='otros'?'btn-dark':'btn-outline'} btn-sm" onclick="AdminPagos.setSeccion('otros')">Otros pagos</button>
      </div>

      <div class="sec-title">Cobros activos</div>
      ${(pagos||[]).filter(p=>p.activo).map(p => `
        <div class="opago-card" onclick="AdminPagos.verOtroPago(${p.id})">
          <div class="opago-header">
            <div>
              <div style="font-weight:600">${p.nombre}</div>
              <div style="font-size:11px;color:var(--text2)">${formatFecha(p.fecha_creacion)} · S/${p.monto} por vecino</div>
            </div>
            <span class="pill pill-blue">Ver →</span>
          </div>
        </div>`).join('') || '<div class="card" style="color:var(--text2);font-size:13px">Sin cobros activos</div>'}

      <div class="sec-title">Crear nuevo cobro</div>
      <div class="card">
        <div class="field"><label>Nombre del cobro</label><input type="text" id="op-nombre" placeholder="Ej: Decoración caravana"></div>
        <div class="field"><label>Descripción</label><input type="text" id="op-desc" placeholder="Ej: Para decorar la caravana de aniversario"></div>
        <div class="grid-2">
          <div class="field"><label>Monto S/ por vecino</label><input type="number" id="op-monto" value="10" min="1" step="1"></div>
          <div class="field"><label>Fecha</label><input type="date" id="op-fecha" value="${today()}"></div>
        </div>
        <button class="btn btn-dark" onclick="AdminPagos.crearOtroCobro()">+ Crear cobro</button>
      </div>

      ${(pagos||[]).filter(p=>!p.activo).length ? `
      <div class="sec-title">Cobros cerrados</div>
      ${(pagos||[]).filter(p=>!p.activo).map(p => `
        <div class="opago-card" onclick="AdminPagos.verOtroPago(${p.id})">
          <div class="opago-header">
            <div>
              <div style="font-weight:600;color:var(--text2)">${p.nombre}</div>
              <div style="font-size:11px;color:var(--text3)">${formatFecha(p.fecha_creacion)} · S/${p.monto}</div>
            </div>
            <span class="pill pill-gray">Cerrado</span>
          </div>
        </div>`).join('')}` : ''}`;
  }

  async function _renderOtroDetalle(el, id) {
    const [{ data: pago }, { data: vecinos }, { data: pagados }] = await Promise.all([
      db.from('otros_pagos').select('*').eq('id', id).single(),
      db.from('vecinos').select('*').order('mz').order('lote'),
      db.from('otros_pagos_vecinos').select('*, vecinos(nombre)').eq('pago_id', id)
    ]);
    const pagadosIds = new Set((pagados||[]).map(p => p.vecino_id));
    const totalRec = (pagados||[]).reduce((s,p) => s + parseFloat(p.monto_pagado), 0);

    el.innerHTML = `
      <button class="back-btn" onclick="AdminPagos.volverOtros()">← Volver</button>
      <div class="card">
        <div class="card-title">${pago.nombre}</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">${pago.descripcion || ''}</div>
        <div class="metrics">
          <div class="metric"><div class="metric-val c-green">S/${totalRec}</div><div class="metric-lbl">Recaudado</div></div>
          <div class="metric"><div class="metric-val">${pagadosIds.size}</div><div class="metric-lbl">Pagaron</div></div>
          <div class="metric"><div class="metric-val c-red">${(vecinos||[]).length - pagadosIds.size}</div><div class="metric-lbl">Pendientes</div></div>
        </div>
        <button class="btn ${pago.activo ? 'btn-outline' : 'btn-green'} btn-sm" onclick="AdminPagos.toggleEstadoCobro(${id},${pago.activo})">
          ${pago.activo ? 'Cerrar cobro' : 'Reabrir cobro'}
        </button>
      </div>

      <div class="sec-title">Registrar pago individual</div>
      <div class="card">
        <div class="field"><label>Vecino</label>
          <select id="op-vecino">
            ${(vecinos||[]).filter(v=>!pagadosIds.has(v.id)).map(v =>
              `<option value="${v.id}">${v.nombre.split(',')[0].trim()} — Mz ${v.mz}-${v.lote}</option>`
            ).join('')}
          </select>
        </div>
        <div class="grid-2">
          <div class="field"><label>Monto S/</label><input type="number" id="op-pago-monto" value="${pago.monto}" min="1" step="1"></div>
          <div class="field"><label>Fecha pago</label><input type="date" id="op-pago-fecha" value="${today()}"></div>
        </div>
        <button class="btn btn-green" onclick="AdminPagos.registrarOtroPago(${id})">💰 Registrar pago</button>
      </div>

      <div class="sec-title">Estado por vecino</div>
      <div class="card card-flush">
        ${(vecinos||[]).map(v => {
          const pag = (pagados||[]).find(p => p.vecino_id === v.id);
          return `<div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento">${v.nombre.split(',')[0].trim()}</div>
              <div class="hist-fecha">Mz ${v.mz}-${v.lote}${pag ? ' · ' + formatFecha(pag.fecha_pago) : ''}</div>
            </div>
            ${pag ? '<span class="pill pill-green">Pagado S/'+pag.monto_pagado+'</span>' : '<span class="pill pill-red">Pendiente</span>'}
          </div>`;
        }).join('')}
      </div>`;
  }

  function setSeccion(s) { _seccion = s; _pagoDetalleId = null; render(); }
  function cambiarAnio(d) { _anio += d; render(); }
  function verOtroPago(id) { _pagoDetalleId = id; render(); }
  function volverOtros()   { _pagoDetalleId = null; render(); }

  async function crearOtroCobro() {
    const nombre = (document.getElementById('op-nombre').value || '').trim();
    const desc   = document.getElementById('op-desc').value;
    const monto  = parseFloat(document.getElementById('op-monto').value);
    const fecha  = document.getElementById('op-fecha').value;
    if (!nombre || !monto || !fecha) { alert('Completa todos los campos'); return; }
    showLoading();
    await db.from('otros_pagos').insert({ nombre, descripcion: desc, monto, fecha_creacion: fecha, activo: true });
    hideLoading();
    alert('✓ Cobro creado');
    render();
  }

  async function registrarOtroPago(pagoId) {
    const vecinoId = parseInt(document.getElementById('op-vecino').value);
    const monto    = parseFloat(document.getElementById('op-pago-monto').value);
    const fecha    = document.getElementById('op-pago-fecha').value;
    if (!vecinoId || !monto || !fecha) { alert('Completa todos los campos'); return; }
    showLoading();
    await db.from('otros_pagos_vecinos').insert({ pago_id: pagoId, vecino_id: vecinoId, monto_pagado: monto, fecha_pago: fecha });
    hideLoading();
    alert('✓ Pago registrado');
    render();
  }

  async function toggleEstadoCobro(id, activo) {
    await db.from('otros_pagos').update({ activo: !activo }).eq('id', id);
    _pagoDetalleId = null;
    render();
  }

  return { render, setSeccion, cambiarAnio, verOtroPago, volverOtros, crearOtroCobro, registrarOtroPago, toggleEstadoCobro };
})();
