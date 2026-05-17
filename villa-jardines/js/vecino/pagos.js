// js/vecino/pagos.js
const VecinoPagos = (() => {
  let _anio = new Date().getFullYear();

  async function render() {
    const el = document.getElementById('vecino-body');
    const v  = Auth.getVecino();
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';

    const mesActual = new Date().getMonth() + 1;
    const [{ data: pagMes }, { data: cuotas }, { data: otrosPagos }, { data: otrosPagadosPor }] = await Promise.all([
      db.from('pagos_cuota_mes').select('*').eq('vecino_id', v.id).eq('anio', _anio),
      db.from('cuotas_sociales').select('*').eq('vecino_id', v.id).order('fecha_pago', { ascending: false }),
      db.from('otros_pagos').select('*').order('fecha_creacion', { ascending: false }),
      db.from('otros_pagos_vecinos').select('*, otros_pagos(nombre,monto,fecha_creacion)').eq('vecino_id', v.id)
    ]);

    const cuotasSocAnio = (cuotas || []).filter(c => c.anio === _anio);
    const cuotaSocPag   = cuotasSocAnio.reduce((s, c) => s + parseFloat(c.monto), 0);
    const pagadosIds    = new Set((otrosPagadosPor || []).map(p => p.pago_id));

    el.innerHTML = `
      <!-- CUOTAS MENSUALES -->
      <div class="year-nav">
        <button onclick="VecinoPagos.cambiarAnio(-1)">‹</button>
        <span>Cuotas mensuales ${_anio}</span>
        <button onclick="VecinoPagos.cambiarAnio(1)">›</button>
      </div>
      <div class="card">
        <div style="display:flex;gap:12px;font-size:11px;color:var(--text2);margin-bottom:8px">
          <span><span style="background:var(--green-bg);color:var(--green);padding:1px 6px;border-radius:3px;font-weight:700">■</span> Pagado</span>
          <span><span style="background:var(--red-bg);color:var(--red);padding:1px 6px;border-radius:3px;font-weight:700">■</span> Pendiente</span>
          <span><span style="background:var(--bg2);padding:1px 6px;border-radius:3px">■</span> Futuro</span>
        </div>
        <div class="mes-grid">
          ${MESES.map((m, i) => {
            const mes = i + 1;
            const pag = (pagMes || []).find(p => p.mes === mes);
            const fut = mes > mesActual && _anio === new Date().getFullYear();
            return `<div class="mes-cell ${fut ? 'mes-fut' : pag ? 'mes-ok' : 'mes-no'}" title="${pag ? 'S/'+pag.monto+' — '+formatFecha(pag.fecha_pago) : fut ? 'Aún no' : 'Pendiente'}">${m}</div>`;
          }).join('')}
        </div>
      </div>

      <!-- CUOTA SOCIAL -->
      <div class="sec-title">Cuota social ${_anio}</div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span>Pagado:</span>
          <span style="font-weight:600;color:${cuotaSocPag >= 24 ? 'var(--green)' : 'var(--red)'}">S/${cuotaSocPag} / 24</span>
        </div>
        <div class="progress"><div class="progress-fill p-blue" style="width:${Math.min(100, cuotaSocPag / 24 * 100)}%"></div></div>
        ${cuotaSocPag < 24
          ? `<div style="font-size:11px;color:var(--text2);margin-top:5px">Falta S/${24 - cuotaSocPag} — puedes pagar en partes</div>`
          : `<div style="font-size:11px;color:var(--green);margin-top:5px">✓ Cuota social completa</div>`}
        ${cuotasSocAnio.length ? `
        <hr>
        ${cuotasSocAnio.map(c => `
          <div class="hist-row">
            <div class="hist-left"><div class="hist-evento">Cuota social ${c.anio}</div><div class="hist-fecha">${formatFecha(c.fecha_pago)}${c.nota ? ' · '+c.nota : ''}</div></div>
            <span class="pill pill-blue">S/${c.monto}</span>
          </div>`).join('')}` : ''}
      </div>

      <!-- OTROS PAGOS -->
      <div class="sec-title">Otros cobros</div>
      ${(otrosPagos || []).length ? (otrosPagos || []).map(p => {
        const miPago = (otrosPagadosPor || []).find(op => op.pago_id === p.id);
        return `<div class="card" style="border-left:3px solid ${miPago ? 'var(--green)' : p.activo ? 'var(--red)' : 'var(--border)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:600">${p.nombre}</div>
              ${p.descripcion ? `<div style="font-size:12px;color:var(--text2);margin-top:2px">${p.descripcion}</div>` : ''}
              <div style="font-size:11px;color:var(--text2);margin-top:3px">Monto: S/${p.monto}</div>
            </div>
            ${miPago
              ? `<span class="pill pill-green">✓ Pagado</span>`
              : p.activo
              ? `<span class="pill pill-red">Pendiente</span>`
              : `<span class="pill pill-gray">Cerrado</span>`}
          </div>
          ${miPago ? `<div style="font-size:11px;color:var(--green);margin-top:6px">Pagado S/${miPago.monto_pagado} el ${formatFecha(miPago.fecha_pago)}</div>` : ''}
        </div>`;
      }).join('') : '<div class="card" style="color:var(--text2);font-size:13px">Sin otros cobros activos</div>'}
    `;
  }

  function cambiarAnio(d) { _anio += d; render(); }
  return { render, cambiarAnio };
})();
