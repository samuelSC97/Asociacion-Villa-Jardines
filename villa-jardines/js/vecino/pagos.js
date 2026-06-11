const VecinoPagos = (() => {
  const ANO_MIN_ALMACEN = 2025;
  const ANO_MIN_CUOTAS  = 2016;
  let _anioAlmacen  = new Date().getFullYear();
  let _anioCuotas   = new Date().getFullYear();
  let _pagMesAll    = [];
  let _cuotasAll    = [];
  let _otrosPagos   = [];
  let _misPagosOtros = [];

  async function render() {
    const el = document.getElementById('vecino-body');
    const v  = Auth.getVecino();
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: pagMes }, { data: cuotas }, { data: otrosPagos }, { data: misPagosOtros }] = await Promise.all([
      db.from('pagos_cuota_mes').select('*').eq('vecino_id', v.id),
      db.from('cuotas_sociales').select('*').eq('vecino_id', v.id).order('fecha_pago', { ascending: false }),
      db.from('otros_pagos').select('*').order('fecha_creacion', { ascending: false }),
      db.from('otros_pagos_vecinos').select('*,otros_pagos(nombre,monto)').eq('vecino_id', v.id)
    ]);
    _pagMesAll     = pagMes     || [];
    _cuotasAll     = cuotas     || [];
    _otrosPagos    = otrosPagos || [];
    _misPagosOtros = misPagosOtros || [];

    el.innerHTML = `
      <div id="v-almacen-section"></div>
      <div id="v-cuotas-section"></div>
      <div id="v-otros-section"></div>`;
    _drawAlmacen();
    _drawCuotas();
    _drawOtros();
  }

  function _drawAlmacen() {
    const el = document.getElementById('v-almacen-section');
    if (!el) return;
    const anio      = _anioAlmacen;
    const yearNow   = new Date().getFullYear();
    const mesActual = new Date().getMonth() + 1;
    const pagMesAnio = _pagMesAll.filter(p => p.anio === anio);

    // Detect furthest future paid month (adelanto)
    const futurePaid = _pagMesAll.filter(p =>
      p.anio > yearNow || (p.anio === yearNow && p.mes > mesActual)
    );
    let advUntilMo = null, advUntilYr = null;
    if (futurePaid.length > 0) {
      futurePaid.sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);
      const last = futurePaid[futurePaid.length - 1];
      advUntilMo = last.mes; advUntilYr = last.anio;
    }

    el.innerHTML = `
      <div class="year-nav">
        <button onclick="VecinoPagos.anioAlmacen(-1)" ${anio <= ANO_MIN_ALMACEN ? 'disabled' : ''}>‹</button>
        <span>Almacén (S/2 mensual) — ${anio}</span>
        <button onclick="VecinoPagos.anioAlmacen(1)" ${anio >= yearNow ? 'disabled' : ''}>›</button>
      </div>
      ${advUntilMo ? `<div style="font-size:11px;color:var(--blue);background:var(--blue-bg);padding:6px 10px;border-radius:var(--r-sm);margin-bottom:8px;font-weight:500">✓ Pagado por adelanto hasta ${MESES_L[advUntilMo-1]} ${advUntilYr}</div>` : ''}
      <div class="card">
        <div style="display:flex;gap:10px;font-size:11px;color:var(--text2);margin-bottom:8px;flex-wrap:wrap">
          <span><span style="background:var(--green-bg);color:var(--green);padding:1px 6px;border-radius:3px;font-weight:700">■</span> Pagado</span>
          <span><span style="background:var(--blue-bg);color:var(--blue);padding:1px 6px;border-radius:3px;font-weight:700">■</span> Adelanto</span>
          <span><span style="background:var(--red-bg);color:var(--red);padding:1px 6px;border-radius:3px;font-weight:700">■</span> Pendiente</span>
          <span><span style="background:var(--bg2);padding:1px 6px;border-radius:3px">■</span> N/A</span>
        </div>
        <div class="mes-grid">
          ${MESES.map((m, i) => {
            const mes = i + 1;
            const pag = pagMesAnio.find(p => p.mes === mes);
            const beforeStart = (anio === 2025 && mes < 2) || anio < 2025;
            const isInFuture  = anio > yearNow || (anio === yearNow && mes > mesActual);
            const cls   = beforeStart ? 'mes-fut'
              : pag ? (isInFuture ? 'mes-adelanto' : 'mes-ok')
              : isInFuture ? 'mes-fut' : 'mes-no';
            const ttip  = beforeStart ? 'Sin cobro'
              : pag ? (isInFuture ? `Adelanto S/${pag.monto} — ${formatFecha(pag.fecha_pago)}` : `Pagado S/${pag.monto} — ${formatFecha(pag.fecha_pago)}`)
              : isInFuture ? 'Aún no corresponde' : 'Pendiente';
            return `<div class="mes-cell ${cls}" title="${ttip}">${m}</div>`;
          }).join('')}
        </div>
        ${pagMesAnio.length ? `<div style="margin-top:10px;border-top:1px solid var(--bg2);padding-top:10px">
          ${pagMesAnio.map(p => {
            const isFut = p.anio > yearNow || (p.anio === yearNow && p.mes > mesActual);
            return `<div class="pago-det-row">
              <div>${MESES_L[p.mes-1]} ${p.anio}${isFut ? ' <span style="font-size:10px;color:var(--blue)">(adelanto)</span>' : ''}${p.nota ? ' · <span style="color:var(--text2)">' + esc(p.nota) + '</span>' : ''}</div>
              <span class="pill ${isFut ? 'pill-blue' : 'pill-green'}">S/${p.monto}</span>
            </div>`;
          }).join('')}
        </div>` : ''}
      </div>`;
  }

  function _drawCuotas() {
    const el = document.getElementById('v-cuotas-section');
    if (!el) return;
    const anio       = _anioCuotas;
    const yearNow    = new Date().getFullYear();
    const cuotasAnio = _cuotasAll.filter(c => c.anio === anio);
    const cuotaSocPag = cuotasAnio.reduce((s, c) => s + parseFloat(c.monto), 0);

    el.innerHTML = `
      <div class="year-nav">
        <button onclick="VecinoPagos.anioCuotas(-1)" ${anio <= ANO_MIN_CUOTAS ? 'disabled' : ''}>‹</button>
        <span>Cuota social (S/24 anual) — ${anio}</span>
        <button onclick="VecinoPagos.anioCuotas(1)" ${anio >= yearNow ? 'disabled' : ''}>›</button>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span>Pagado ${anio}:</span>
          <span style="font-weight:600;color:${cuotaSocPag>=24?'var(--green)':'var(--red)'}">S/${cuotaSocPag} / 24</span>
        </div>
        <div class="progress"><div class="progress-fill p-blue" style="width:${Math.min(100,cuotaSocPag/24*100)}%"></div></div>
        ${cuotaSocPag<24?`<div style="font-size:11px;color:var(--text2);margin-top:5px">Falta S/${24-cuotaSocPag} — puedes pagar en partes</div>`:`<div style="font-size:11px;color:var(--green);margin-top:5px">✓ Cuota social completa ${anio}</div>`}
        ${cuotasAnio.length?`<div style="margin-top:10px;border-top:1px solid var(--bg2);padding-top:10px">
          ${cuotasAnio.map(c=>`<div class="pago-det-row"><div>${formatFecha(c.fecha_pago)}${c.nota?' · <span style="color:var(--text2)">'+esc(c.nota)+'</span>':''}</div><span class="pill pill-blue">S/${c.monto}</span></div>`).join('')}
        </div>`:''}
      </div>`;
  }

  function _drawOtros() {
    const el = document.getElementById('v-otros-section');
    if (!el) return;
    el.innerHTML = `
      <div class="sec-title">Otros cobros</div>
      ${(_otrosPagos||[]).length?(_otrosPagos||[]).map(p=>{
        const miPago=(_misPagosOtros||[]).find(op=>op.pago_id===p.id);
        return `<div class="card" style="border-left:3px solid ${miPago?'var(--green)':p.activo?'var(--red)':'var(--border)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600">${esc(p.nombre)}</div>
              ${p.descripcion?`<div style="font-size:12px;color:var(--text2);margin-top:2px">${esc(p.descripcion)}</div>`:''}
              <div style="font-size:11px;color:var(--text2);margin-top:3px">Monto: S/${p.monto}</div>
            </div>
            ${miPago?`<span class="pill pill-green">✓ Pagado</span>`:p.activo?`<span class="pill pill-red">Pendiente</span>`:`<span class="pill pill-gray">Cerrado</span>`}
          </div>
          ${miPago?`<div style="font-size:11px;color:var(--green);margin-top:8px;padding-top:8px;border-top:1px solid var(--bg2)">Pagado S/${miPago.monto_pagado} el ${formatFecha(miPago.fecha_pago)}</div>`:''}
          ${!miPago&&p.activo?`<div style="font-size:11px;color:var(--red);margin-top:8px;font-weight:500">Acércate al presidente para pagar.</div>`:''}
        </div>`;
      }).join(''):'<div class="card" style="color:var(--text2);font-size:13px;text-align:center;padding:16px">Sin otros cobros activos</div>'}`;
  }

  function anioAlmacen(d) {
    const yearNow = new Date().getFullYear();
    _anioAlmacen = Math.max(ANO_MIN_ALMACEN, Math.min(yearNow, _anioAlmacen + d));
    _drawAlmacen();
  }

  function anioCuotas(d) {
    const yearNow = new Date().getFullYear();
    _anioCuotas = Math.max(ANO_MIN_CUOTAS, Math.min(yearNow, _anioCuotas + d));
    _drawCuotas();
  }

  return { render, anioAlmacen, anioCuotas };
})();
