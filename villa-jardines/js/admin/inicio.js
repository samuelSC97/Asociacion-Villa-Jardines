const AdminInicio = (() => {
  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: vecinos }, { data: faltas }, { data: guard }, { data: agenda }, { data: prevDebts }] = await Promise.all([
      db.from('vecinos').select('id,nombre,mz,lote').eq('activo', true),
      db.from('asistencias').select('vecino_id,eventos(tipo)').eq('estado', 'F'),
      db.from('apoyos').select('monto').eq('estado', 'guardadito'),
      db.from('agenda_proxima').select('*').eq('activa', true).lte('fecha_inicio_mostrar', today()).gte('fecha_fin_mostrar', today()).maybeSingle(),
      db.from('deudas_anteriores').select('vecino_id,monto').eq('pagado', false)
    ]);
    const total     = vecinos?.length || 0;
    const conFaltas = new Set((faltas || []).map(f => f.vecino_id)).size;
    const multas    = (faltas || []).reduce((s, f) => s + (MULTAS[f.eventos?.tipo] || 0), 0);
    const guardado  = (guard  || []).reduce((s, a) => s + parseFloat(a.monto), 0);
    const totalDeudaAnt = (prevDebts || []).reduce((s, d) => s + parseFloat(d.monto), 0);

    const deudaMap = {};
    (faltas || []).forEach(f => {
      deudaMap[f.vecino_id] = (deudaMap[f.vecino_id] || 0) + (MULTAS[f.eventos?.tipo] || 0);
    });
    (prevDebts || []).forEach(d => {
      deudaMap[d.vecino_id] = (deudaMap[d.vecino_id] || 0) + parseFloat(d.monto);
    });

    const vecinoMap = {};
    (vecinos || []).forEach(v => { vecinoMap[v.id] = v; });
    const deudores = Object.entries(deudaMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, monto]) => ({ ...vecinoMap[id], deuda: monto }))
      .filter(v => v.nombre);

    const deudaTotal = multas + totalDeudaAnt;

    el.innerHTML = `
      ${agenda ? `<div class="agenda-card">
        <div class="agenda-label">📋 Próxima reunión</div>
        <div class="agenda-title">${esc(agenda.titulo)}</div>
        <div class="agenda-meta">📍 ${esc(agenda.lugar)} &nbsp;·&nbsp; 🕐 ${esc(agenda.hora)} &nbsp;·&nbsp; 📅 ${formatFecha(agenda.fecha_evento)}</div>
        <div class="agenda-puntos">${esc(agenda.puntos_agenda)}</div>
      </div>` : ''}
      <div class="metrics">
        <div class="metric"><div class="metric-val">${total}</div><div class="metric-lbl">Vecinos</div></div>
        <div class="metric"><div class="metric-val c-red">${conFaltas}</div><div class="metric-lbl">Con faltas</div></div>
        <div class="metric"><div class="metric-val c-gold">S/${guardado}</div><div class="metric-lbl">Guardadito</div></div>
      </div>
      <div class="card">
        <div class="card-title">Deuda total pendiente</div>
        <div style="font-size:26px;font-weight:700;color:var(--red);font-family:var(--mono)">S/ ${deudaTotal.toLocaleString()}</div>
        ${totalDeudaAnt > 0 ? `<div style="font-size:11px;color:var(--text2);margin-top:3px">Multas S/${multas} · Deudas anteriores S/${totalDeudaAnt}</div>` : ''}
        <div class="progress" style="margin-top:8px"><div class="progress-fill p-red" style="width:${Math.min(100, conFaltas / total * 100)}%"></div></div>
        <div style="font-size:11px;color:var(--text2);margin-top:5px">${conFaltas} de ${total} vecinos tienen faltas sin subsanar</div>
      </div>

      ${deudores.length ? `
      <div class="sec-title">Vecinos con mayor deuda pendiente</div>
      <div class="card card-flush">
        ${deudores.map(v => `<div class="row" onclick="AdminVecinos.ir(${v.id})">
          <div class="avatar">${initials(v.nombre)}</div>
          <div class="row-info">
            <div class="row-name">${esc(v.nombre.split(',')[0].trim())}</div>
            <div class="row-sub">Mz ${esc(v.mz)}-${esc(v.lote)}</div>
          </div>
          <span class="pill pill-red">S/${v.deuda}</span>
        </div>`).join('')}
      </div>` : ''}

      <div class="sec-title">Acciones rápidas</div>
      <button class="btn btn-dark btn-block" style="margin-bottom:8px" onclick="AdminApp.tab('asistencia')">📋 Tomar asistencia</button>
      <button class="btn btn-outline btn-block" onclick="AdminApp.tab('vecinos')">👥 Ver todos los vecinos</button>`;
  }
  return { render };
})();
