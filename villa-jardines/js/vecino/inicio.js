// js/vecino/inicio.js
const VecinoInicio = (() => {
  async function render() {
    const el  = document.getElementById('vecino-body');
    const v   = Auth.getVecino();
    el.innerHTML = '<div class="loading-inline">Cargando tu información...</div>';

    const [{ data: faltas }, { data: apoyos }, { data: cuotas }, { data: agenda }, { data: otrosPagos }, { data: otrosPagadosPor }] = await Promise.all([
      db.from('asistencias').select('*, eventos(tipo)').eq('vecino_id', v.id).eq('estado', 'F'),
      db.from('apoyos').select('monto').eq('vecino_id', v.id).eq('estado', 'guardadito'),
      db.from('cuotas_sociales').select('monto,anio').eq('vecino_id', v.id),
      db.from('agenda_proxima').select('*').eq('activa', true).lte('fecha_inicio_mostrar', today()).gte('fecha_fin_mostrar', today()).maybeSingle(),
      db.from('otros_pagos').select('*').eq('activo', true),
      db.from('otros_pagos_vecinos').select('pago_id').eq('vecino_id', v.id)
    ]);

    const multaTotal  = (faltas || []).reduce((s, f) => s + (MULTAS[f.eventos?.tipo] || 0), 0);
    const guardadito  = (apoyos || []).reduce((s, a) => s + parseFloat(a.monto), 0);
    const anio        = new Date().getFullYear();
    const cuotaSocPag = (cuotas || []).filter(c => c.anio === anio).reduce((s, c) => s + parseFloat(c.monto), 0);
    const cuotaPend   = Math.max(0, 24 - cuotaSocPag);
    const pagadosIds  = new Set((otrosPagadosPor || []).map(p => p.pago_id));
    const otrasPend   = (otrosPagos || []).filter(p => !pagadosIds.has(p.id));

    el.innerHTML = `
      <div style="margin-bottom:14px">
        <div style="font-size:18px;font-weight:700;letter-spacing:-.3px">Hola, ${v.nombre.split(',')[0].trim()} 👋</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">Mz ${v.mz} — Lote ${v.lote}${v.cargo ? ' · ' + v.cargo : ''}</div>
      </div>

      ${multaTotal > 0 || cuotaPend > 0 || otrasPend.length > 0 ? `
      <div class="alert-card alert-red">
        <div class="alert-title">Tienes pagos pendientes</div>
        <div class="alert-sub">
          ${multaTotal > 0 ? `• Multas: <strong>S/${multaTotal}</strong><br>` : ''}
          ${cuotaPend > 0  ? `• Cuota social ${anio}: <strong>S/${cuotaPend} pendiente</strong><br>` : ''}
          ${otrasPend.map(p => `• ${p.nombre}: <strong>S/${p.monto}</strong><br>`).join('')}
        </div>
        <div style="font-size:12px;margin-top:8px;font-weight:500">Acércate al presidente o un encargado para ponerte al día.</div>
      </div>` : `
      <div class="alert-card alert-green">
        <div class="alert-title">✓ Estás al día</div>
        <div class="alert-sub">No tienes deudas pendientes.</div>
      </div>`}

      <div class="metrics">
        <div class="metric"><div class="metric-val c-red">S/${multaTotal}</div><div class="metric-lbl">Multas</div></div>
        <div class="metric"><div class="metric-val c-gold">S/${guardadito}</div><div class="metric-lbl">Guardadito</div></div>
        <div class="metric"><div class="metric-val">${(faltas||[]).length}</div><div class="metric-lbl">Faltas</div></div>
      </div>

      ${guardadito > 0 ? `
      <div class="guardadito-card">
        <div class="guardadito-icon">🪙</div>
        <div>
          <div class="guardadito-val">S/${guardadito}</div>
          <div class="guardadito-lbl">Tienes saldo a favor — se aplicará automáticamente a tu próxima falta</div>
        </div>
      </div>` : ''}

      ${agenda ? `
      <div class="agenda-card" style="margin-top:4px">
        <div class="agenda-label">📋 Próxima reunión</div>
        <div class="agenda-title">${agenda.titulo}</div>
        <div class="agenda-meta">📍 ${agenda.lugar} &nbsp;·&nbsp; 🕐 ${agenda.hora} &nbsp;·&nbsp; 📅 ${formatFecha(agenda.fecha_evento)}</div>
        <div class="agenda-puntos">${agenda.puntos_agenda}</div>
      </div>` : ''}
    `;
  }

  return { render };
})();
