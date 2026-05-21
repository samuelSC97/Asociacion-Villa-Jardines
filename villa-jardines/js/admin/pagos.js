const AdminPagos = (() => {
  let _anio = new Date().getFullYear(), _seccion = 'almacen', _pagoId = null;

  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    if (_seccion === 'almacen') await _renderAlmacen(el);
    else if (_seccion === 'cuotas') await _renderCuotas(el);
    else await _renderOtros(el);
  }

  function _navBtns() {
    return `<div style="display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn btn-sm ${_seccion==='almacen'?'btn-dark':'btn-outline'}" onclick="AdminPagos.sec('almacen')">Almacén S/2</button>
      <button class="btn btn-sm ${_seccion==='cuotas'?'btn-dark':'btn-outline'}" onclick="AdminPagos.sec('cuotas')">Cuotas sociales</button>
      <button class="btn btn-sm ${_seccion==='otros'?'btn-dark':'btn-outline'}" onclick="AdminPagos.sec('otros')">Otros cobros</button>
    </div>`;
  }

  async function _renderAlmacen(el) {
    const mes = new Date().getMonth() + 1;
    const [{ data: pagMes }, { data: todos }] = await Promise.all([
      db.from('pagos_cuota_mes').select('*,vecinos(nombre,mz,lote)').eq('anio', _anio).eq('mes', mes),
      db.from('vecinos').select('id,nombre,mz,lote,exonerado').order('mz').order('lote')
    ]);
    const pagadosIds = new Set((pagMes || []).map(p => p.vecino_id));
    const totalRec   = (pagMes || []).reduce((s, p) => s + parseFloat(p.monto), 0);
    const pendientes = (todos || []).filter(v => !v.exonerado && !pagadosIds.has(v.id)).length;

    el.innerHTML = _navBtns() + `
      <div class="year-nav">
        <button onclick="AdminPagos.anio(-1)">‹</button>
        <span>Almacén ${MESES[mes-1]} ${_anio}</span>
        <button onclick="AdminPagos.anio(1)">›</button>
      </div>
      <div class="metrics">
        <div class="metric"><div class="metric-val c-green">S/${totalRec}</div><div class="metric-lbl">Cobrado</div></div>
        <div class="metric"><div class="metric-val">${pagadosIds.size}</div><div class="metric-lbl">Pagaron</div></div>
        <div class="metric"><div class="metric-val c-red">${pendientes}</div><div class="metric-lbl">Pendientes</div></div>
      </div>
      <div class="sec-title">Estado por vecino — ${MESES[mes-1]} ${_anio}</div>
      <div class="card card-flush">
        ${(todos||[]).filter(v=>!v.exonerado).map(v=>{
          const pag = (pagMes||[]).find(p=>p.vecino_id===v.id);
          return `<div class="pago-det-row">
            <div><div style="font-weight:500">${v.nombre.split(',')[0].trim()}</div><div style="font-size:11px;color:var(--text2)">Mz ${v.mz}-${v.lote}</div></div>
            ${pag?`<span class="pill pill-green">✓ S/${pag.monto}</span>`:`<span class="pill pill-red">Pendiente</span>`}
          </div>`;
        }).join('')}
      </div>`;
  }

  async function _renderCuotas(el) {
    const [{ data: cuotas }, { data: todos }] = await Promise.all([
      db.from('cuotas_sociales').select('*,vecinos(nombre,mz,lote)').eq('anio', _anio).order('fecha_pago', { ascending: false }),
      db.from('vecinos').select('id,nombre,mz,lote,exonerado').order('mz').order('lote')
    ]);
    const pagMap = {};
    (cuotas||[]).forEach(c => { pagMap[c.vecino_id] = (pagMap[c.vecino_id]||0) + parseFloat(c.monto); });
    const totalRec = Object.values(pagMap).reduce((s,v)=>s+v,0);

    el.innerHTML = _navBtns() + `
      <div class="year-nav">
        <button onclick="AdminPagos.anio(-1)">‹</button>
        <span>Cuotas sociales ${_anio}</span>
        <button onclick="AdminPagos.anio(1)">›</button>
      </div>
      <div class="metrics">
        <div class="metric"><div class="metric-val c-green">S/${totalRec}</div><div class="metric-lbl">Recaudado</div></div>
        <div class="metric"><div class="metric-val">${Object.keys(pagMap).length}</div><div class="metric-lbl">Pagaron</div></div>
        <div class="metric"><div class="metric-val c-red">${(todos||[]).filter(v=>!v.exonerado&&!pagMap[v.id]).length}</div><div class="metric-lbl">Pendientes</div></div>
      </div>
      <div class="card card-flush">
        ${(todos||[]).filter(v=>!v.exonerado).map(v=>{
          const pag = pagMap[v.id]||0;
          return `<div class="pago-det-row">
            <div><div style="font-weight:500">${v.nombre.split(',')[0].trim()}</div><div style="font-size:11px;color:var(--text2)">Mz ${v.mz}-${v.lote}</div></div>
            ${pag>=24?`<span class="pill pill-green">Completo S/${pag}</span>`:pag>0?`<span class="pill pill-orange">Parcial S/${pag}</span>`:`<span class="pill pill-red">Pendiente</span>`}
          </div>`;
        }).join('')}
      </div>
      <div class="sec-title">Pagos registrados</div>
      <div class="card card-flush">
        ${(cuotas||[]).map(c=>`<div class="hist-row">
          <div class="hist-left"><div class="hist-evento">${c.vecinos?.nombre?.split(',')[0].trim()||'?'}</div><div class="hist-fecha">${formatFecha(c.fecha_pago)}${c.nota?' · '+c.nota:''}</div></div>
          <span class="pill pill-blue">S/${c.monto}</span>
        </div>`).join('')||'<div style="color:var(--text2);font-size:13px;padding:12px 0">Sin pagos</div>'}
      </div>`;
  }

  async function _renderOtros(el) {
    if (_pagoId) { await _renderOtroDetalle(el, _pagoId); return; }
    const { data: pagos } = await db.from('otros_pagos').select('*').order('fecha_creacion', { ascending: false });
    el.innerHTML = _navBtns() + `
      <div class="sec-title">Cobros activos</div>
      ${(pagos||[]).filter(p=>p.activo).map(p=>`
        <div class="opago-card" onclick="AdminPagos.verPago(${p.id})">
          <div class="opago-header">
            <div><div style="font-weight:600">${p.nombre}</div><div style="font-size:11px;color:var(--text2)">${formatFecha(p.fecha_creacion)} · S/${p.monto} por vecino${p.descripcion?' · '+p.descripcion:''}</div></div>
            <span class="pill pill-blue">Ver →</span>
          </div>
        </div>`).join('')||'<div class="card" style="color:var(--text2);font-size:13px">Sin cobros activos</div>'}
      <div class="sec-title">Crear nuevo cobro</div>
      <div class="card">
        <div class="field"><label>Nombre del cobro</label><input type="text" id="op-nombre" placeholder="Ej: Agua potable · Globos caravana"></div>
        <div class="field"><label>Descripción</label><input type="text" id="op-desc" placeholder="Opcional"></div>
        <div class="grid-2">
          <div class="field"><label>Monto S/ por vecino</label><input type="number" id="op-monto" value="10" min="1" step="1"></div>
          <div class="field"><label>Fecha</label><input type="date" id="op-fecha" value="${today()}"></div>
        </div>
        <button class="btn btn-dark" onclick="AdminPagos.crearCobro()">+ Crear cobro</button>
      </div>
      ${(pagos||[]).filter(p=>!p.activo).length?`
      <div class="sec-title">Cobros cerrados</div>
      ${(pagos||[]).filter(p=>!p.activo).map(p=>`
        <div class="opago-card" onclick="AdminPagos.verPago(${p.id})">
          <div class="opago-header">
            <div><div style="font-weight:600;color:var(--text2)">${p.nombre}</div><div style="font-size:11px;color:var(--text3)">${formatFecha(p.fecha_creacion)} · S/${p.monto}</div></div>
            <span class="pill pill-gray">Cerrado</span>
          </div>
        </div>`).join('')}`:''}`;
  }

  async function _renderOtroDetalle(el, id) {
    const [{ data: pago }, { data: vecinos }, { data: pagados }] = await Promise.all([
      db.from('otros_pagos').select('*').eq('id', id).single(),
      db.from('vecinos').select('*').order('mz').order('lote'),
      db.from('otros_pagos_vecinos').select('*,vecinos(nombre)').eq('pago_id', id)
    ]);
    const pagadosIds = new Set((pagados||[]).map(p=>p.vecino_id));
    const totalRec   = (pagados||[]).reduce((s,p)=>s+parseFloat(p.monto_pagado),0);
    el.innerHTML = `
      <button class="back-btn" onclick="AdminPagos.volverOtros()">← Volver</button>
      <div class="card">
        <div class="card-title">${pago.nombre}</div>
        ${pago.descripcion?`<div style="font-size:13px;color:var(--text2);margin-bottom:8px">${pago.descripcion}</div>`:''}
        <div class="metrics">
          <div class="metric"><div class="metric-val c-green">S/${totalRec}</div><div class="metric-lbl">Recaudado</div></div>
          <div class="metric"><div class="metric-val">${pagadosIds.size}</div><div class="metric-lbl">Pagaron</div></div>
          <div class="metric"><div class="metric-val c-red">${(vecinos||[]).length-pagadosIds.size}</div><div class="metric-lbl">Pendientes</div></div>
        </div>
        <button class="btn ${pago.activo?'btn-outline':'btn-green'} btn-sm" onclick="AdminPagos.toggleCobro(${id},${pago.activo})">${pago.activo?'Cerrar cobro':'Reabrir cobro'}</button>
      </div>
      <div class="sec-title">Registrar pago</div>
      <div class="card">
        <div class="field"><label>Vecino</label>
          <select id="op-vecino">
            ${(vecinos||[]).filter(v=>!pagadosIds.has(v.id)).map(v=>`<option value="${v.id}">${v.nombre.split(',')[0].trim()} — Mz ${v.mz}-${v.lote}</option>`).join('')}
          </select>
        </div>
        <div class="grid-2">
          <div class="field"><label>Monto S/</label><input type="number" id="op-pago-monto" value="${pago.monto}" min="1" step="1"></div>
          <div class="field"><label>Fecha</label><input type="date" id="op-pago-fecha" value="${today()}"></div>
        </div>
        <button class="btn btn-green" onclick="AdminPagos.registrarOtroPago(${id})">💰 Registrar pago</button>
      </div>
      <div class="sec-title">Estado por vecino</div>
      <div class="card card-flush">
        ${(vecinos||[]).map(v=>{const p=(pagados||[]).find(x=>x.vecino_id===v.id);return`<div class="pago-det-row">
          <div><div style="font-weight:500">${v.nombre.split(',')[0].trim()}</div><div style="font-size:11px;color:var(--text2)">Mz ${v.mz}-${v.lote}${p?' · '+formatFecha(p.fecha_pago):''}</div></div>
          ${p?`<span class="pill pill-green">S/${p.monto_pagado}</span>`:`<span class="pill pill-red">Pendiente</span>`}
        </div>`;}).join('')}
      </div>`;
  }

  function sec(s) { _seccion = s; _pagoId = null; render(); }
  function anio(d) { _anio += d; render(); }
  function verPago(id) { _pagoId = id; render(); }
  function volverOtros() { _pagoId = null; render(); }

  async function crearCobro() {
    const nombre = (document.getElementById('op-nombre').value||'').trim();
    const desc   = document.getElementById('op-desc').value;
    const monto  = parseFloat(document.getElementById('op-monto').value);
    const fecha  = document.getElementById('op-fecha').value;
    if (!nombre||!monto||!fecha) { alert('Completa todos los campos'); return; }
    showLoading();
    await db.from('otros_pagos').insert({ nombre, descripcion: desc, monto, fecha_creacion: fecha, activo: true });
    hideLoading();
    alert('✓ Cobro creado');
    render();
  }

  async function registrarOtroPago(pagoId) {
    const vid   = parseInt(document.getElementById('op-vecino').value);
    const monto = parseFloat(document.getElementById('op-pago-monto').value);
    const fecha = document.getElementById('op-pago-fecha').value;
    if (!vid||!monto||!fecha) { alert('Completa todos los campos'); return; }
    showLoading();
    await db.from('otros_pagos_vecinos').insert({ pago_id: pagoId, vecino_id: vid, monto_pagado: monto, fecha_pago: fecha });
    hideLoading();
    alert('✓ Pago registrado');
    render();
  }

  async function toggleCobro(id, activo) {
    await db.from('otros_pagos').update({ activo: !activo }).eq('id', id);
    _pagoId = null;
    render();
  }

  return { render, sec, anio, verPago, volverOtros, crearCobro, registrarOtroPago, toggleCobro };
})();
