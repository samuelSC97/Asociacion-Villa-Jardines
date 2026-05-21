const AdminVecinos = (() => {
  let _todos = [], _faltasMap = {}, _detalle = null, _apoyoTipo = 'Faena extra', _anio = new Date().getFullYear();

  async function render() {
    if (_detalle) { await _renderDetalle(_detalle); return; }
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: v }, { data: f }] = await Promise.all([
      db.from('vecinos').select('*').order('mz').order('lote'),
      db.from('asistencias').select('vecino_id').eq('estado', 'F')
    ]);
    _todos = v || [];
    _faltasMap = {};
    (f || []).forEach(x => { _faltasMap[x.vecino_id] = (_faltasMap[x.vecino_id] || 0) + 1; });
    _renderLista('');
  }

  function _renderLista(q) {
    const el = document.getElementById('admin-body');
    const fil = _todos.filter(v => !q || v.nombre.toLowerCase().includes(q.toLowerCase()) || (v.dni && v.dni.includes(q)) || v.mz.toLowerCase() === q.toLowerCase());
    el.innerHTML = `
      <div class="search-bar"><input type="text" id="v-filter" placeholder="Buscar nombre, DNI, Manzana..." oninput="AdminVecinos.filtrar(this.value)" value="${q}"></div>
      <div class="card card-flush">
        ${fil.map(v => {
          const nf = _faltasMap[v.id] || 0;
          return `<div class="row" onclick="AdminVecinos.ver(${v.id})">
            <div class="avatar">${initials(v.nombre)}</div>
            <div class="row-info"><div class="row-name">${v.nombre}</div><div class="row-sub">Mz ${v.mz}-${v.lote}${v.cargo?' · '+v.cargo:''}</div></div>
            ${nf > 0 ? `<span class="pill pill-red">${nf} falta${nf>1?'s':''}</span>` : `<span class="pill pill-green">Sin faltas</span>`}
          </div>`;
        }).join('')}
      </div>`;
  }

  function filtrar(q) { _renderLista(q); }
  function ver(id) { _detalle = id; _renderDetalle(id); }

  async function _renderDetalle(id) {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: v }, { data: asist }, { data: apoyos }, { data: pagMes }, { data: cuotas }] = await Promise.all([
      db.from('vecinos').select('*').eq('id', id).single(),
      db.from('asistencias').select('*,eventos(*),subsanaciones(*)').eq('vecino_id', id).order('created_at', { ascending: false }),
      db.from('apoyos').select('*').eq('vecino_id', id).order('fecha', { ascending: false }),
      db.from('pagos_cuota_mes').select('*').eq('vecino_id', id),
      db.from('cuotas_sociales').select('*').eq('vecino_id', id)
    ]);
    const faltas     = (asist || []).filter(a => a.estado === 'F');
    const multaTotal = faltas.reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
    const guardadito = (apoyos || []).filter(a => a.estado === 'guardadito').reduce((s, a) => s + parseFloat(a.monto), 0);
    const mesActual  = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    const cuotasAnio = (cuotas || []).filter(c => c.anio === _anio);
    const cuotaSocPag = cuotasAnio.reduce((s, c) => s + parseFloat(c.monto), 0);

    el.innerHTML = `
      <button class="back-btn" onclick="AdminVecinos.volver()">← Volver</button>
      <div class="card">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <div class="avatar avatar-lg">${initials(v.nombre)}</div>
          <div><div style="font-size:15px;font-weight:600">${v.nombre}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">Mz ${v.mz} — Lote ${v.lote}${v.cargo?' · '+v.cargo:''}</div>
          ${v.exonerado?'<span class="pill pill-green" style="margin-top:4px">Exonerado</span>':''}
          </div>
        </div>
        <div class="grid-2">
          <div class="field"><label>DNI</label><input type="text" id="ed-dni" value="${v.dni||''}" placeholder="Sin registro"></div>
          <div class="field"><label>Celular</label><input type="text" id="ed-cel" value="${v.celular||''}" placeholder="Sin registro"></div>
        </div>
        <div class="field"><label>Cargo</label><input type="text" id="ed-cargo" value="${v.cargo||''}" placeholder="Ninguno"></div>
        <button class="btn btn-dark btn-sm" onclick="AdminVecinos.guardarDatos(${id})">Guardar datos</button>
      </div>
      <div class="metrics">
        <div class="metric"><div class="metric-val c-red">S/${multaTotal}</div><div class="metric-lbl">Multas</div></div>
        <div class="metric"><div class="metric-val c-gold">S/${guardadito}</div><div class="metric-lbl">Guardadito</div></div>
        <div class="metric"><div class="metric-val">${faltas.length}</div><div class="metric-lbl">Faltas</div></div>
      </div>
      ${guardadito > 0 ? `<div class="guardadito-card"><div class="guardadito-icon">🪙</div><div><div class="guardadito-val">S/${guardadito}</div><div class="guardadito-lbl">Saldo a favor — se aplicará a próximas faltas</div></div></div>` : ''}

      <div class="sec-title">Pago libre / subsanación</div>
      <div class="card">
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px">Si el vecino paga un monto libre, se subsanarán sus faltas de más antigua a más nueva. El resto irá a guardadito.</div>
        <div class="grid-2">
          <div class="field"><label>Monto S/</label><input type="number" id="pago-libre" placeholder="Ej: 200" min="1" step="1"></div>
          <div class="field"><label>Fecha</label><input type="date" id="pago-libre-fecha" value="${today()}"></div>
        </div>
        <div class="field"><label>Nota</label><input type="text" id="pago-libre-nota" placeholder="Ej: Pago en asamblea"></div>
        <button class="btn btn-green" onclick="AdminVecinos.pagoLibre(${id})">💰 Aplicar pago</button>
      </div>

      <div class="sec-title">Registrar apoyo / guardadito</div>
      <div class="card">
        <div class="field"><label>Tipo de apoyo</label>
          <div class="chip-row">${['Faena extra','Vino con familiar','Pollada','Actividad','Otro'].map(t=>`<button class="chip ${_apoyoTipo===t?'on':''}" onclick="AdminVecinos.setApoyoTipo('${t}',${id})">${t}</button>`).join('')}</div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Monto equiv. S/</label><input type="number" id="ap-monto" value="50" min="1" step="1"></div>
          <div class="field"><label>Fecha apoyo</label><input type="date" id="ap-fecha" value="${today()}"></div>
        </div>
        <div class="field"><label>Motivo / descripción</label><input type="text" id="ap-motivo" placeholder="Ej: Apoyó en pollada del 20 de abril"></div>
        <button class="btn btn-dark" onclick="AdminVecinos.registrarApoyo(${id})">🪙 Registrar apoyo</button>
      </div>

      <div class="sec-title">Cuotas mensuales ${_anio}</div>
      <div class="card">
        <div class="year-nav">
          <button onclick="AdminVecinos.cambiarAnio(-1,${id})">‹</button>
          <span>${_anio}</span>
          <button onclick="AdminVecinos.cambiarAnio(1,${id})">›</button>
        </div>
        <div class="mes-grid">
          ${MESES.map((m,i)=>{const mes=i+1;const pag=(pagMes||[]).find(p=>p.anio===_anio&&p.mes===mes);const fut=mes>mesActual&&_anio===anioActual;return`<div class="mes-cell ${fut?'mes-fut':pag?'mes-ok':'mes-no'}">${m}</div>`;}).join('')}
        </div>
      </div>

      <div class="sec-title">Cuota social ${_anio}</div>
      <div class="card">
        <div class="year-nav">
          <button onclick="AdminVecinos.cambiarAnio(-1,${id})">‹</button><span>${_anio}</span><button onclick="AdminVecinos.cambiarAnio(1,${id})">›</button>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span>Pagado:</span><span style="font-weight:600;color:${cuotaSocPag>=24?'var(--green)':'var(--red)'}">S/${cuotaSocPag} / 24</span>
        </div>
        <div class="progress"><div class="progress-fill p-blue" style="width:${Math.min(100,cuotaSocPag/24*100)}%"></div></div>
        <div class="grid-2" style="margin-top:10px">
          <div class="field"><label>Monto S/</label><input type="number" id="cs-monto" value="${Math.max(0,24-cuotaSocPag)}" min="1" step="1"></div>
          <div class="field"><label>Fecha</label><input type="date" id="cs-fecha" value="${today()}"></div>
        </div>
        <button class="btn btn-blue" onclick="AdminVecinos.pagarCuotaSocial(${id})">Registrar cuota social</button>
      </div>

      <div class="sec-title">Historial de asistencia</div>
      <div class="card card-flush">
        ${(asist||[]).map(a=>{const sub=a.subsanaciones?.[0];const tipo=a.eventos?.tipo;return`<div class="hist-row">
          <div class="hist-left">
            <div class="hist-evento">${a.eventos?.nombre||'Evento'}</div>
            <div class="hist-fecha">${formatFecha(a.eventos?.fecha)} · ${tipoLabel(tipo)}</div>
            ${a.estado==='J'&&sub?`<div class="hist-nota">✅ Subsanado el ${formatFecha(sub.fecha_subsanacion)} — ${sub.nota||'Apoyo registrado'}</div>`:''}
          </div>
          ${a.estado==='P'?`<span class="pill pill-green">Presente</span>`:a.estado==='J'?`<span class="pill pill-orange">Subsanado</span>`:`<span class="pill pill-red">Falta S/${MULTAS[tipo]||0}</span>`}
        </div>`;}).join('')||'<div style="color:var(--text2);font-size:13px;padding:12px 0">Sin registros</div>'}
      </div>`;
  }

  function volver() { _detalle = null; render(); }
  function setApoyoTipo(t, id) { _apoyoTipo = t; _renderDetalle(id); }
  function cambiarAnio(d, id) { _anio += d; _renderDetalle(id); }

  async function guardarDatos(id) {
    const { error } = await db.from('vecinos').update({ dni: document.getElementById('ed-dni').value, celular: document.getElementById('ed-cel').value, cargo: document.getElementById('ed-cargo').value }).eq('id', id);
    if (error) alert('Error: ' + error.message); else { alert('✓ Datos guardados'); _renderDetalle(id); }
  }

  async function pagoLibre(id) {
    const monto = parseFloat(document.getElementById('pago-libre').value);
    const fecha = document.getElementById('pago-libre-fecha').value;
    const nota  = document.getElementById('pago-libre-nota').value;
    if (!monto || !fecha) { alert('Completa monto y fecha'); return; }
    showLoading();
    const { data: faltas } = await db.from('asistencias').select('*,eventos(*)').eq('vecino_id', id).eq('estado', 'F').order('created_at', { ascending: true });
    let resto = monto, subsanadas = 0;
    for (const falta of (faltas || [])) {
      const multa = MULTAS[falta.eventos?.tipo] || 50;
      if (resto >= multa) {
        await db.from('asistencias').update({ estado: 'J' }).eq('id', falta.id);
        const { data: ap } = await db.from('apoyos').insert({ vecino_id: id, fecha, monto: multa, motivo: nota || 'Pago libre', estado: 'aplicado' }).select().single();
        await db.from('subsanaciones').insert({ asistencia_id: falta.id, apoyo_id: ap.id, fecha_subsanacion: fecha, nota: nota || 'Pago libre' });
        resto -= multa; subsanadas++;
      } else break;
    }
    if (resto > 0) await db.from('apoyos').insert({ vecino_id: id, fecha, monto: resto, motivo: nota ? `Resto: ${nota}` : 'Guardadito', estado: 'guardadito' });
    hideLoading();
    alert(`✓ S/${monto} aplicado.\n${subsanadas} faltas subsanadas.${resto > 0 ? `\nS/${resto} en guardadito.` : ''}`);
    _renderDetalle(id);
  }

  async function pagarCuotaSocial(id) {
    const monto = parseFloat(document.getElementById('cs-monto').value);
    const fecha = document.getElementById('cs-fecha').value;
    if (!monto || !fecha) { alert('Completa monto y fecha'); return; }
    showLoading();
    await db.from('cuotas_sociales').insert({ vecino_id: id, anio: parseInt(fecha.slice(0,4)), monto, fecha_pago: fecha });
    hideLoading();
    alert(`✓ Cuota social S/${monto} registrada`);
    _renderDetalle(id);
  }

  async function registrarApoyo(id) {
    const monto  = parseFloat(document.getElementById('ap-monto').value);
    const fecha  = document.getElementById('ap-fecha').value;
    const motivo = (document.getElementById('ap-motivo').value || '').trim() || _apoyoTipo;
    if (!monto || !fecha) { alert('Completa monto y fecha'); return; }
    showLoading();
    const { data: faltas } = await db.from('asistencias').select('*,eventos(*)').eq('vecino_id', id).eq('estado', 'F').order('created_at', { ascending: true });
    if (faltas && faltas.length > 0) {
      const falta = faltas[0];
      const multa = MULTAS[falta.eventos?.tipo] || 50;
      if (monto >= multa) {
        await db.from('asistencias').update({ estado: 'J' }).eq('id', falta.id);
        const { data: ap } = await db.from('apoyos').insert({ vecino_id: id, fecha, monto, motivo, estado: 'aplicado' }).select().single();
        await db.from('subsanaciones').insert({ asistencia_id: falta.id, apoyo_id: ap.id, fecha_subsanacion: fecha, nota: motivo });
        const resto = monto - multa;
        if (resto > 0) await db.from('apoyos').insert({ vecino_id: id, fecha, monto: resto, motivo: `Resto: ${motivo}`, estado: 'guardadito' });
        hideLoading();
        alert(`✓ Falta del ${formatFecha(falta.eventos?.fecha)} subsanada.${resto > 0 ? `\nS/${resto} en guardadito.` : ''}`);
      } else {
        await db.from('apoyos').insert({ vecino_id: id, fecha, monto, motivo, estado: 'guardadito' });
        hideLoading();
        alert(`✓ S/${monto} en guardadito.`);
      }
    } else {
      await db.from('apoyos').insert({ vecino_id: id, fecha, monto, motivo, estado: 'guardadito' });
      hideLoading();
      alert(`✓ Sin faltas pendientes. S/${monto} en guardadito.`);
    }
    _renderDetalle(id);
  }

  return { render, filtrar, ver, volver, setApoyoTipo, cambiarAnio, guardarDatos, pagoLibre, pagarCuotaSocial, registrarApoyo };
})();
