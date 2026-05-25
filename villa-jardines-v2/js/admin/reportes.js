const AdminReportes = (() => {
  let _anio = new Date().getFullYear();

  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando reporte...</div>';
    await _renderReporte(el);
  }

  async function _renderReporte(el) {
    const anioActual = new Date().getFullYear();
    const anios = [];
    for (let y = 2022; y <= anioActual; y++) anios.push(y);

    // Cargar todos los datos en paralelo
    const [
      { data: vecinos },
      { data: asistencias },
      { data: pagMes },
      { data: cuotas },
      { data: otrosPagos },
      { data: otrosPagosVec },
      { data: apoyos }
    ] = await Promise.all([
      db.from('vecinos').select('*').order('mz').order('lote'),
      db.from('asistencias').select('*,eventos(*)').eq('estado', 'F'),
      db.from('pagos_cuota_mes').select('*').eq('anio', _anio),
      db.from('cuotas_sociales').select('*').eq('anio', _anio),
      db.from('otros_pagos').select('*').eq('activo', true),
      db.from('otros_pagos_vecinos').select('*'),
      db.from('apoyos').select('*').eq('estado', 'guardadito')
    ]);

    const mesActual = new Date().getMonth() + 1;
    const vList = vecinos || [];
    const aList = asistencias || [];
    const pmList = pagMes || [];
    const csList = cuotas || [];
    const opList = otrosPagos || [];
    const opvList = otrosPagosVec || [];
    const apList = apoyos || [];

    // Calcular deuda por asistencias (multas)
    const multaMap = {};
    aList.forEach(a => {
      if (!multaMap[a.vecino_id]) multaMap[a.vecino_id] = 0;
      multaMap[a.vecino_id] += MULTAS[a.eventos?.tipo] || 0;
    });

    // Meses pagados almacén este año
    const mesMap = {};
    pmList.forEach(p => { if (!mesMap[p.vecino_id]) mesMap[p.vecino_id] = []; mesMap[p.vecino_id].push(p.mes); });

    // Cuota social pagada este año
    const csMap = {};
    csList.forEach(c => { csMap[c.vecino_id] = (csMap[c.vecino_id] || 0) + parseFloat(c.monto); });

    // Otros pagos: quién pagó qué
    const opvMap = {};
    opvList.forEach(p => { if (!opvMap[p.vecino_id]) opvMap[p.vecino_id] = []; opvMap[p.vecino_id].push(p.pago_id); });

    // Guardadito por vecino
    const guardMap = {};
    apList.forEach(a => { guardMap[a.vecino_id] = (guardMap[a.vecino_id] || 0) + parseFloat(a.monto); });

    // Asistencia por evento
    const faltsAll = await db.from('asistencias').select('*,eventos(*)').neq('estado', 'P');
    const faltasPorEvento = {};

    // Totales generales
    const totalMultas = Object.values(multaMap).reduce((s, v) => s + v, 0);
    const morosos = vList.filter(v => !v.exonerado && (multaMap[v.id] || 0) > 0);
    const pendAlmacen = vList.filter(v => !v.exonerado && !(mesMap[v.id]||[]).includes(mesActual)).length;
    const pendCuotas = vList.filter(v => !v.exonerado && (csMap[v.id] || 0) < 24).length;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div class="card-title" style="margin:0">📊 Reporte de deudas</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <div class="year-nav" style="margin:0">
            <button onclick="AdminReportes.anio(-1)">‹</button>
            <span>Año ${_anio}</span>
            <button onclick="AdminReportes.anio(1)">›</button>
          </div>
          <button class="btn btn-sm btn-dark" onclick="AdminReportes.imprimir()">🖨 Imprimir</button>
        </div>
      </div>

      <!-- MÉTRICAS GLOBALES -->
      <div class="metrics">
        <div class="metric"><div class="metric-val c-red">S/${totalMultas.toLocaleString()}</div><div class="metric-lbl">Total multas</div></div>
        <div class="metric"><div class="metric-val c-red">${morosos.length}</div><div class="metric-lbl">Morosos</div></div>
        <div class="metric"><div class="metric-val">${pendAlmacen}</div><div class="metric-lbl">Sin S/2 este mes</div></div>
      </div>

      <!-- SECCIÓN 1: DEUDAS POR ASISTENCIAS -->
      <div class="sec-title rpt-section" id="rpt-asistencias">📋 Deudas por faltas de asistencia</div>
      <div class="card card-flush" id="rpt-asist-body">
        ${morosos.length ? morosos.sort((a,b)=>(multaMap[b.id]||0)-(multaMap[a.id]||0)).map(v => `
          <div class="pago-det-row">
            <div>
              <div style="font-weight:600">${v.nombre.split(',')[0].trim()}</div>
              <div style="font-size:11px;color:var(--text2)">Mz ${v.mz}-${v.lote}${v.cargo?' · '+v.cargo:''}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;color:var(--red);font-family:var(--mono)">S/${(multaMap[v.id]||0).toLocaleString()}</div>
              ${(guardMap[v.id]||0)>0?`<div style="font-size:10px;color:var(--gold)">Guardadito: S/${guardMap[v.id]}</div>`:''}
            </div>
          </div>`).join('')
        : '<div style="color:var(--text2);font-size:13px;padding:12px 0;text-align:center">🎉 Sin morosos en asistencias</div>'}
        ${morosos.length ? `<div style="padding:10px 12px;font-size:12px;color:var(--text2);border-top:1px solid var(--border)">Total: <strong>S/${totalMultas.toLocaleString()}</strong> pendiente en ${morosos.length} vecinos</div>` : ''}
      </div>

      <!-- SECCIÓN 2: CUOTAS ALMACÉN -->
      <div class="sec-title rpt-section">🏪 Cuotas almacén S/2 — ${MESES[mesActual-1]} ${_anio}</div>
      <div class="card card-flush">
        ${vList.filter(v=>!v.exonerado).map(v => {
          const pagado = (mesMap[v.id]||[]).includes(mesActual);
          return `<div class="pago-det-row">
            <div><div style="font-weight:500">${v.nombre.split(',')[0].trim()}</div>
            <div style="font-size:11px;color:var(--text2)">Mz ${v.mz}-${v.lote}</div></div>
            ${pagado ? `<span class="pill pill-green">✓ Pagado</span>` : `<span class="pill pill-red">Pendiente S/2</span>`}
          </div>`;
        }).join('')}
        <div style="padding:10px 12px;font-size:12px;color:var(--text2);border-top:1px solid var(--border)">${pendAlmacen} vecinos pendientes este mes</div>
      </div>

      <!-- SECCIÓN 3: CUOTAS SOCIALES -->
      <div class="sec-title rpt-section">💳 Cuotas sociales S/24 — ${_anio}</div>
      <div class="card card-flush">
        ${vList.filter(v=>!v.exonerado).map(v => {
          const pag = csMap[v.id] || 0;
          const est = pag >= 24 ? 'pill-green' : pag > 0 ? 'pill-orange' : 'pill-red';
          const label = pag >= 24 ? 'Completo' : pag > 0 ? `Parcial S/${pag}/24` : 'Pendiente';
          return `<div class="pago-det-row">
            <div><div style="font-weight:500">${v.nombre.split(',')[0].trim()}</div>
            <div style="font-size:11px;color:var(--text2)">Mz ${v.mz}-${v.lote}</div></div>
            <span class="pill ${est}">${label}</span>
          </div>`;
        }).join('')}
        <div style="padding:10px 12px;font-size:12px;color:var(--text2);border-top:1px solid var(--border)">${pendCuotas} vecinos sin cuota social completa en ${_anio}</div>
      </div>

      <!-- SECCIÓN 4: OTROS COBROS -->
      ${opList.length ? `
      <div class="sec-title rpt-section">📦 Otros cobros activos</div>
      ${opList.map(op => {
        const pagadosIds = new Set(opvList.filter(p=>p.pago_id===op.id).map(p=>p.vecino_id));
        const pendOp = vList.filter(v=>!pagadosIds.has(v.id));
        return `
        <div class="card card-flush" style="margin-bottom:8px">
          <div style="padding:10px 12px;font-weight:600;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
            <span>${op.nombre}</span>
            <span style="font-size:12px;color:var(--text2)">S/${op.monto} c/u · ${pendOp.length} pendientes</span>
          </div>
          ${pendOp.slice(0,20).map(v=>`
            <div class="pago-det-row">
              <div><div style="font-weight:500">${v.nombre.split(',')[0].trim()}</div>
              <div style="font-size:11px;color:var(--text2)">Mz ${v.mz}-${v.lote}</div></div>
              <span class="pill pill-red">Pendiente</span>
            </div>`).join('')}
          ${pendOp.length > 20 ? `<div style="padding:8px 12px;font-size:12px;color:var(--text2)">... y ${pendOp.length-20} más</div>` : ''}
        </div>`;
      }).join('')}` : ''}

      <!-- SECCIÓN 5: RESUMEN GENERAL -->
      <div class="sec-title rpt-section">📊 Resumen general por vecino — ${_anio}</div>
      <div style="overflow-x:auto">
        <table class="rpt-table" id="rpt-tabla-general">
          <thead>
            <tr>
              <th>Vecino</th>
              <th>Mz-Lote</th>
              <th>Multas</th>
              <th>Guardadito</th>
              <th>S/2 ${MESES[mesActual-1]}</th>
              <th>Cuota Social</th>
              ${opList.map(op=>`<th style="max-width:80px;font-size:10px">${op.nombre.slice(0,12)}${op.nombre.length>12?'…':''}</th>`).join('')}
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${vList.map(v => {
              const multa = multaMap[v.id] || 0;
              const guard = guardMap[v.id] || 0;
              const almM = (mesMap[v.id]||[]).includes(mesActual);
              const csP = csMap[v.id] || 0;
              const tieneDeuda = !v.exonerado && (multa > 0 || !almM || csP < 24 || opList.some(op=>!new Set(opvList.filter(p=>p.pago_id===op.id).map(p=>p.vecino_id)).has(v.id)));
              return `<tr class="${tieneDeuda?'rpt-row-deuda':''}">
                <td style="font-weight:${tieneDeuda?'600':'400'}">${v.nombre.split(',')[0].trim()}</td>
                <td style="font-size:11px;color:var(--text2)">${v.mz}-${v.lote}</td>
                <td style="font-family:var(--mono);color:${multa>0?'var(--red)':'var(--green)'};text-align:right">${multa>0?'S/'+multa:'✓'}</td>
                <td style="font-family:var(--mono);color:${guard>0?'var(--gold)':'var(--text3)'};text-align:right">${guard>0?'S/'+guard:'—'}</td>
                <td style="text-align:center">${v.exonerado?'<span style="color:var(--text3)">Exon.</span>':almM?'<span style="color:var(--green)">✓</span>':'<span style="color:var(--red)">✗</span>'}</td>
                <td style="text-align:center;font-size:12px">${v.exonerado?'<span style="color:var(--text3)">Exon.</span>':csP>=24?'<span style="color:var(--green)">✓</span>':csP>0?`<span style="color:var(--gold)">S/${csP}</span>`:'<span style="color:var(--red)">✗</span>'}</td>
                ${opList.map(op=>{const pagado=new Set(opvList.filter(p=>p.pago_id===op.id).map(p=>p.vecino_id)).has(v.id);return`<td style="text-align:center">${pagado?'<span style="color:var(--green)">✓</span>':'<span style="color:var(--red)">✗</span>'}</td>`;}).join('')}
                <td>${tieneDeuda&&!v.exonerado?'<span class="pill pill-red" style="font-size:10px">Deuda</span>':'<span class="pill pill-green" style="font-size:10px">Al día</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:11px;color:var(--text2);margin-top:6px;margin-bottom:20px">
        Generado el ${new Date().toLocaleDateString('es-PE')} · Villa Jardines — Sasa
      </div>
    `;
  }

  function anio(d) { _anio += d; render(); }

  function imprimir() {
    window.print();
  }

  return { render, anio, imprimir };
})();
