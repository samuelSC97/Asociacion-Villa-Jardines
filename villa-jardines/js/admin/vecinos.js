// js/admin/vecinos.js
const AdminVecinos = (() => {
  let _todos     = [];
  let _faltasMap = {};
  let _detalle   = null;
  let _apoyoTipo = 'Faena extra';
  let _anioVer   = new Date().getFullYear();

  async function render() {
    if (_detalle) { await _renderDetalle(_detalle); return; }
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: vecinos }, { data: faltas }] = await Promise.all([
      db.from('vecinos').select('*').order('mz').order('lote'),
      db.from('asistencias').select('vecino_id').eq('estado', 'F')
    ]);
    _todos = vecinos || [];
    _faltasMap = {};
    (faltas || []).forEach(f => { _faltasMap[f.vecino_id] = (_faltasMap[f.vecino_id] || 0) + 1; });
    _renderLista('');
  }

  function _renderLista(q) {
    const el = document.getElementById('admin-body');
    const fil = _todos.filter(v => !q ||
      v.nombre.toLowerCase().includes(q.toLowerCase()) ||
      (v.dni && v.dni.includes(q)) ||
      v.mz.toLowerCase() === q.toLowerCase()
    );
    el.innerHTML = `
      <div class="search-bar">
        <input type="text" id="v-filter" placeholder="Buscar nombre, DNI, Mz..."
          oninput="AdminVecinos.filtrar(this.value)" value="${q}">
      </div>
      <div class="card card-flush">
        ${fil.map(v => {
          const nf = _faltasMap[v.id] || 0;
          return `<div class="row" onclick="AdminVecinos.ver(${v.id})">
            <div class="avatar">${initials(v.nombre)}</div>
            <div class="row-info">
              <div class="row-name">${v.nombre}</div>
              <div class="row-sub">Mz ${v.mz}-${v.lote}${v.cargo ? ' · ' + v.cargo : ''}</div>
            </div>
            ${nf > 0
              ? `<span class="pill pill-red">${nf} falta${nf > 1 ? 's' : ''}</span>`
              : `<span class="pill pill-green">Sin faltas</span>`}
          </div>`;
        }).join('')}
      </div>`;
  }

  function filtrar(q) { _renderLista(q); }
  function ver(id)    { _detalle = id; _renderDetalle(id); }

  async function _renderDetalle(id) {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';

    const [{ data: v }, { data: asist }, { data: apoyos }, { data: pagMes }, { data: cuotas }] = await Promise.all([
      db.from('vecinos').select('*').eq('id', id).single(),
      db.from('asistencias').select('*, eventos(*), subsanaciones(*)').eq('vecino_id', id).order('created_at', { ascending: false }),
      db.from('apoyos').select('*').eq('vecino_id', id).order('fecha', { ascending: false }),
      db.from('pagos_cuota_mes').select('*').eq('vecino_id', id),
      db.from('cuotas_sociales').select('*').eq('vecino_id', id)
    ]);

    const faltas     = (asist || []).filter(a => a.estado === 'F');
    const multaTotal = faltas.reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
    const guardadito = (apoyos || []).filter(a => a.estado === 'guardadito').reduce((s, a) => s + parseFloat(a.monto), 0);
    const mesActual  = new Date().getMonth() + 1;

    // cuotas del año actual
    const cuotasAnio = (cuotas || []).filter(c => c.anio === _anioVer);
    const cuotaSocPag = cuotasAnio.reduce((s, c) => s + parseFloat(c.monto), 0);

    el.innerHTML = `
      <button class="back-btn" onclick="AdminVecinos.volver()">← Volver</button>

      <div class="card">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
          <div class="avatar avatar-lg">${initials(v.nombre)}</div>
          <div>
            <div style="font-size:16px;font-weight:600">${v.nombre}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:2px">Mz ${v.mz} — Lote ${v.lote}${v.cargo ? ' · ' + v.cargo : ''}</div>
            ${v.exonerado ? '<span class="pill pill-green" style="margin-top:4px">Exonerado</span>' : ''}
          </div>
        </div>
        <div class="grid-2">
          <div class="field"><label>DNI</label><input type="text" id="ed-dni" value="${v.dni || ''}" placeholder="Sin registro"></div>
          <div class="field"><label>Celular</label><input type="text" id="ed-cel" value="${v.celular || ''}" placeholder="Sin registro"></div>
        </div>
        <div class="field"><label>Cargo</label><input type="text" id="ed-cargo" value="${v.cargo || ''}" placeholder="Ninguno"></div>
        <button class="btn btn-dark btn-sm" onclick="AdminVecinos.guardarDatos(${id})">Guardar datos</button>
      </div>

      <div class="metrics">
        <div class="metric"><div class="metric-val c-red">S/${multaTotal}</div><div class="metric-lbl">Multas</div></div>
        <div class="metric"><div class="metric-val c-gold">S/${guardadito}</div><div class="metric-lbl">Guardadito</div></div>
        <div class="metric"><div class="metric-val">${faltas.length}</div><div class="metric-lbl">Faltas</div></div>
      </div>

      ${guardadito > 0 ? `
      <div class="guardadito-card">
        <div class="guardadito-icon">🪙</div>
        <div>
          <div class="guardadito-val">S/${guardadito}</div>
          <div class="guardadito-lbl">Saldo en guardadito — se aplicará a próximas faltas</div>
        </div>
      </div>` : ''}

      <div class="sec-title">Pago libre / subsanación múltiple</div>
      <div class="card">
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px">
          Si el vecino paga un monto libre, se subsanarán sus faltas de más antigua a más nueva automáticamente. El resto irá al guardadito.
        </div>
        <div class="grid-2">
          <div class="field"><label>Monto S/</label><input type="number" id="pago-libre" placeholder="Ej: 200" min="1" step="1"></div>
          <div class="field"><label>Fecha pago</label><input type="date" id="pago-libre-fecha" value="${today()}"></div>
        </div>
        <div class="field"><label>Nota</label><input type="text" id="pago-libre-nota" placeholder="Ej: Pago en asamblea"></div>
        <button class="btn btn-green" onclick="AdminVecinos.pagoLibre(${id})">💰 Aplicar pago</button>
      </div>

      <div class="sec-title">Registrar cuota social</div>
      <div class="card">
        <div class="year-nav">
          <button onclick="AdminVecinos.cambiarAnio(-1,${id})">‹</button>
          <span>${_anioVer}</span>
          <button onclick="AdminVecinos.cambiarAnio(1,${id})">›</button>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span>Pagado ${_anioVer}:</span>
          <span style="font-weight:600;color:${cuotaSocPag >= 24 ? 'var(--green)' : 'var(--red)'}">S/${cuotaSocPag} / 24</span>
        </div>
        <div class="progress"><div class="progress-fill p-blue" style="width:${Math.min(100, cuotaSocPag / 24 * 100)}%"></div></div>
        <div class="grid-2" style="margin-top:10px">
          <div class="field"><label>Monto S/</label><input type="number" id="cs-monto" value="${Math.max(0, 24 - cuotaSocPag)}" min="1" step="1"></div>
          <div class="field"><label>Fecha</label><input type="date" id="cs-fecha" value="${today()}"></div>
        </div>
        <button class="btn btn-blue" onclick="AdminVecinos.pagarCuotaSocial(${id})">Registrar cuota social</button>
      </div>

      <div class="sec-title">Cuotas mensuales ${_anioVer}</div>
      <div class="card">
        <div class="mes-grid">
          ${MESES.map((m, i) => {
            const mes = i + 1;
            const pag = (pagMes || []).find(p => p.anio === _anioVer && p.mes === mes);
            const fut = mes > mesActual && _anioVer === new Date().getFullYear();
            return `<div class="mes-cell ${fut ? 'mes-fut' : pag ? 'mes-ok' : 'mes-no'}" title="${pag ? 'Pagado S/'+pag.monto : 'Pendiente'}">${m}</div>`;
          }).join('')}
        </div>
      </div>

      <div class="sec-title">Registrar apoyo / guardadito</div>
      <div class="card">
        <div class="field"><label>Tipo de apoyo</label>
          <div class="chip-row">
            ${['Faena extra','Vino con familiar','Pollada','Actividad','Otro'].map(t =>
              `<button class="chip ${_apoyoTipo === t ? 'on' : ''}" onclick="AdminVecinos.setApoyoTipo('${t}',${id})">${t}</button>`
            ).join('')}
          </div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Monto equiv. S/</label><input type="number" id="ap-monto" value="50" min="1" step="1"></div>
          <div class="field"><label>Fecha apoyo</label><input type="date" id="ap-fecha" value="${today()}"></div>
        </div>
        <div class="field"><label>Motivo / descripción</label>
          <input type="text" id="ap-motivo" placeholder="Ej: Apoyó en pollada del 20 de abril, trajo leña">
        </div>
        <button class="btn btn-dark" onclick="AdminVecinos.registrarApoyo(${id})">🪙 Registrar apoyo</button>
      </div>

      <div class="sec-title">Historial de asistencia</div>
      <div class="card card-flush">
        ${(asist || []).map(a => {
          const sub  = a.subsanaciones?.[0];
          const tipo = a.eventos?.tipo;
          return `<div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento">${a.eventos?.nombre || 'Evento'}</div>
              <div class="hist-fecha">${formatFecha(a.eventos?.fecha)} · ${tipo === 'A' ? 'Asamblea' : tipo === 'F' ? 'Faena' : 'Importante'}</div>
              ${a.estado === 'J' && sub ? `<div class="hist-nota">✅ Subsanado el ${formatFecha(sub.fecha_subsanacion)} — ${sub.nota || 'Apoyo registrado'}</div>` : ''}
            </div>
            ${a.estado === 'P'
              ? `<span class="pill pill-green">Presente</span>`
              : a.estado === 'J'
              ? `<span class="pill pill-orange">Subsanado</span>`
              : `<span class="pill pill-red">Falta S/${MULTAS[tipo] || 0}</span>`}
          </div>`;
        }).join('') || '<div style="color:var(--text2);font-size:13px;padding:12px 0">Sin registros</div>'}
      </div>
    `;
  }

  function volver() { _detalle = null; render(); }

  function setApoyoTipo(t, id) { _apoyoTipo = t; _renderDetalle(id); }

  function cambiarAnio(d, id) { _anioVer += d; _renderDetalle(id); }

  async function guardarDatos(id) {
    const { error } = await db.from('vecinos').update({
      dni:    document.getElementById('ed-dni').value,
      celular: document.getElementById('ed-cel').value,
      cargo:  document.getElementById('ed-cargo').value
    }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else { alert('✓ Datos guardados'); _renderDetalle(id); }
  }

  async function pagoLibre(id) {
    const monto = parseFloat(document.getElementById('pago-libre').value);
    const fecha = document.getElementById('pago-libre-fecha').value;
    const nota  = document.getElementById('pago-libre-nota').value;
    if (!monto || !fecha) { alert('Completa monto y fecha'); return; }
    showLoading();

    // Obtener faltas pendientes de más antigua a más nueva
    const { data: faltas } = await db.from('asistencias')
      .select('*, eventos(*)')
      .eq('vecino_id', id)
      .eq('estado', 'F')
      .order('created_at', { ascending: true });

    let resto = monto;
    let subsanadas = 0;

    for (const falta of (faltas || [])) {
      const multa = MULTAS[falta.eventos?.tipo] || 50;
      if (resto >= multa) {
        await db.from('asistencias').update({ estado: 'J' }).eq('id', falta.id);
        const { data: apoyo } = await db.from('apoyos').insert({
          vecino_id: id, fecha, monto: multa, motivo: nota || 'Pago libre', estado: 'aplicado'
        }).select().single();
        await db.from('subsanaciones').insert({
          asistencia_id: falta.id, apoyo_id: apoyo.id,
          fecha_subsanacion: fecha, nota: nota || 'Pago libre'
        });
        resto -= multa;
        subsanadas++;
      } else break;
    }

    // Resto al guardadito
    if (resto > 0) {
      await db.from('apoyos').insert({
        vecino_id: id, fecha, monto: resto,
        motivo: nota ? `Resto de: ${nota}` : 'Pago libre — guardadito',
        estado: 'guardadito'
      });
    }

    hideLoading();
    alert(`✓ Pago de S/${monto} aplicado.\n${subsanadas} faltas subsanadas.${resto > 0 ? `\nS/${resto} quedó en guardadito.` : ''}`);
    _renderDetalle(id);
  }

  async function pagarCuotaSocial(id) {
    const monto = parseFloat(document.getElementById('cs-monto').value);
    const fecha = document.getElementById('cs-fecha').value;
    if (!monto || !fecha) { alert('Completa monto y fecha'); return; }
    showLoading();
    const anio = parseInt(fecha.slice(0, 4));
    await db.from('cuotas_sociales').insert({ vecino_id: id, anio, monto, fecha_pago: fecha, nota: '' });
    hideLoading();
    alert(`✓ Cuota social registrada: S/${monto}`);
    _renderDetalle(id);
  }

  async function registrarApoyo(id) {
    const monto  = parseFloat(document.getElementById('ap-monto').value);
    const fecha  = document.getElementById('ap-fecha').value;
    const motivo = (document.getElementById('ap-motivo').value || '').trim() || _apoyoTipo;
    if (!monto || !fecha) { alert('Completa monto y fecha del apoyo'); return; }
    showLoading();

    const { data: faltas } = await db.from('asistencias')
      .select('*, eventos(*)')
      .eq('vecino_id', id)
      .eq('estado', 'F')
      .order('created_at', { ascending: true });

    if (faltas && faltas.length > 0) {
      const falta = faltas[0];
      const multa = MULTAS[falta.eventos?.tipo] || 50;
      if (monto >= multa) {
        await db.from('asistencias').update({ estado: 'J' }).eq('id', falta.id);
        const { data: apoyo } = await db.from('apoyos').insert({
          vecino_id: id, fecha, monto, motivo, estado: 'aplicado'
        }).select().single();
        await db.from('subsanaciones').insert({
          asistencia_id: falta.id, apoyo_id: apoyo.id, fecha_subsanacion: fecha, nota: motivo
        });
        const resto = monto - multa;
        if (resto > 0) {
          await db.from('apoyos').insert({ vecino_id: id, fecha, monto: resto, motivo: `Resto: ${motivo}`, estado: 'guardadito' });
        }
        hideLoading();
        alert(`✓ Apoyo registrado.\nFalta del ${formatFecha(falta.eventos?.fecha)} subsanada.${resto > 0 ? `\nS/${resto} quedó en guardadito.` : ''}`);
      } else {
        await db.from('apoyos').insert({ vecino_id: id, fecha, monto, motivo, estado: 'guardadito' });
        hideLoading();
        alert(`✓ Guardado en guardadito.\nS/${monto} disponible para subsanar faltas.`);
      }
    } else {
      await db.from('apoyos').insert({ vecino_id: id, fecha, monto, motivo, estado: 'guardadito' });
      hideLoading();
      alert(`✓ Sin faltas pendientes.\nS/${monto} guardado para cuando sea necesario.`);
    }
    _renderDetalle(id);
  }

  return { render, filtrar, ver, volver, setApoyoTipo, cambiarAnio, guardarDatos, pagoLibre, pagarCuotaSocial, registrarApoyo };
})();
