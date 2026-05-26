const VecinoInicio = (() => {
  async function render() {
    const el = document.getElementById('vecino-body');
    const v  = Auth.getVecino();
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: faltas }, { data: guard }, { data: agenda }, { data: otrosPagos }, { data: misPagosOtros }, { data: deudasAnt }] = await Promise.all([
      db.from('asistencias').select('*,eventos(tipo)').eq('vecino_id', v.id).eq('estado', 'F'),
      db.from('apoyos').select('monto').eq('vecino_id', v.id).eq('estado', 'guardadito'),
      db.from('agenda_proxima').select('*').eq('activa', true).lte('fecha_inicio_mostrar', today()).gte('fecha_fin_mostrar', today()).maybeSingle(),
      db.from('otros_pagos').select('*').eq('activo', true),
      db.from('otros_pagos_vecinos').select('pago_id').eq('vecino_id', v.id),
      db.from('deudas_anteriores').select('monto').eq('vecino_id', v.id).eq('pagado', false)
    ]);
    const multaFaltas = (faltas || []).reduce((s, f) => s + (MULTAS[f.eventos?.tipo] || 0), 0);
    const multaDeudas = (deudasAnt || []).reduce((s, d) => s + parseFloat(d.monto), 0);
    const multaTotal  = multaFaltas + multaDeudas;
    const guardadito = (guard  || []).reduce((s, a) => s + parseFloat(a.monto), 0);
    const pagadosIds = new Set((misPagosOtros || []).map(p => p.pago_id));
    const otrasPend  = (otrosPagos || []).filter(p => !pagadosIds.has(p.id));
    const hayDeuda   = multaTotal > 0 || otrasPend.length > 0;

    el.innerHTML = `
      <div style="margin-bottom:14px">
        <div style="font-size:17px;font-weight:700;letter-spacing:-.3px">Hola 👋</div>
        <div style="font-size:13px;font-weight:600;margin-top:2px">${esc(v.nombre)}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:1px">Mz ${esc(v.mz)} — Lote ${esc(v.lote)}${v.cargo ? ' · ' + esc(v.cargo) : ''}</div>
      </div>

      <div class="alert-card ${hayDeuda ? 'alert-red' : 'alert-green'}">
        <div class="alert-title" style="color:${hayDeuda ? 'var(--red)' : 'var(--green)'}">
          ${hayDeuda ? 'Tienes pagos pendientes' : '✓ Estás al día'}
        </div>
        <div class="alert-sub" style="color:${hayDeuda ? 'var(--red)' : 'var(--green)'}">
          ${multaTotal > 0 ? `• Multas pendientes: <strong>S/${multaTotal}</strong><br>` : ''}
          ${otrasPend.map(p => `• ${esc(p.nombre)}: <strong>S/${p.monto}</strong><br>`).join('')}
          ${hayDeuda ? '' : 'No tienes deudas pendientes.'}
        </div>
        ${hayDeuda ? '<div style="font-size:12px;margin-top:8px;font-weight:600;color:var(--red)">Acércate al presidente o un encargado para ponerte al día.</div>' : ''}
      </div>

      <div class="metrics">
        <div class="metric"><div class="metric-val c-red">S/${multaTotal}</div><div class="metric-lbl">Multas</div></div>
        <div class="metric"><div class="metric-val c-gold">S/${guardadito}</div><div class="metric-lbl">Guardadito</div></div>
        <div class="metric"><div class="metric-val">${(faltas || []).length}</div><div class="metric-lbl">Faltas</div></div>
      </div>

      ${guardadito > 0 ? `<div class="guardadito-card"><div class="guardadito-icon">🪙</div><div><div class="guardadito-val">S/${guardadito}</div><div class="guardadito-lbl">Saldo a tu favor — se aplicará a tu próxima falta</div></div></div>` : ''}

      ${agenda ? `<div class="agenda-card">
        <div class="agenda-label">📋 Próxima reunión</div>
        <div class="agenda-title">${esc(agenda.titulo)}</div>
        <div class="agenda-meta">📍 ${esc(agenda.lugar)} &nbsp;·&nbsp; 🕐 ${esc(agenda.hora)} &nbsp;·&nbsp; 📅 ${formatFecha(agenda.fecha_evento)}</div>
        <div class="agenda-puntos">${esc(agenda.puntos_agenda)}</div>
      </div>` : ''}

      <div class="sec-title">Accesos rápidos</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-outline" onclick="VecinoApp.tab('faltas')">📋 Mis faltas</button>
        <button class="btn btn-outline" onclick="VecinoApp.tab('pagos')">💰 Mis pagos</button>
        <button class="btn btn-outline" onclick="VecinoAgua.render()">💧 Rol de Agua</button>
        <button class="btn btn-outline" onclick="VecinoContactos.render()">📞 Directorio</button>
      </div>`;
  }
  return { render };
})();
