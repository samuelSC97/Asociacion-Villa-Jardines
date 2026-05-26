const VecinoFaltas = (() => {
  async function render() {
    const el = document.getElementById('vecino-body');
    const v  = Auth.getVecino();
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: asist }, { data: deudasAnt }] = await Promise.all([
      db.from('asistencias').select('*,eventos(*),subsanaciones(*)').eq('vecino_id', v.id).order('created_at', { ascending: false }),
      db.from('deudas_anteriores').select('*').eq('vecino_id', v.id).eq('pagado', false).order('anio', { ascending: true })
    ]);

    const presentes   = (asist||[]).filter(a=>a.estado==='P').length;
    const faltas      = (asist||[]).filter(a=>a.estado==='F');
    const subsanadas  = (asist||[]).filter(a=>a.estado==='J').length;
    const exoneradas  = (asist||[]).filter(a=>a.estado==='E').length;
    const multaFaltas = faltas.reduce((s,a)=>s+(MULTAS[a.eventos?.tipo]||0),0);
    const multaDeudas = (deudasAnt||[]).reduce((s,d)=>s+parseFloat(d.monto),0);
    const multaTotal  = multaFaltas + multaDeudas;

    el.innerHTML = `
      <div class="metrics">
        <div class="metric"><div class="metric-val c-green">${presentes}</div><div class="metric-lbl">Presentes</div></div>
        <div class="metric"><div class="metric-val c-red">${faltas.length}</div><div class="metric-lbl">Faltas</div></div>
        <div class="metric"><div class="metric-val c-orange">${subsanadas}</div><div class="metric-lbl">Subsanadas</div></div>
        ${exoneradas > 0 ? `<div class="metric"><div class="metric-val" style="color:var(--blue)">${exoneradas}</div><div class="metric-lbl">Exoneradas</div></div>` : ''}
      </div>

      ${multaTotal>0?`<div class="card" style="border-left:3px solid var(--red);background:var(--red-bg)">
        <div style="font-weight:600;color:var(--red)">Deuda total pendiente: S/${multaTotal}</div>
        ${multaDeudas>0&&multaFaltas>0?`<div style="font-size:12px;color:var(--red);margin-top:2px">Faltas S/${multaFaltas} · Deudas anteriores S/${multaDeudas}</div>`:''}
        <div style="font-size:12px;color:var(--red);margin-top:3px">${faltas.length>0?`${faltas.length} falta${faltas.length>1?'s':''} sin subsanar · `:''}Acércate al presidente para ponerte al día.</div>
      </div>`:'<div class="card" style="border-left:3px solid var(--green);background:var(--green-bg)"><div style="font-weight:600;color:var(--green)">✓ Sin deudas pendientes</div></div>'}

      ${(deudasAnt||[]).length?`
      <div class="sec-title">Deudas anteriores</div>
      <div class="card card-flush">
        ${(deudasAnt||[]).map(d=>`<div class="pago-det-row">
          <div><div style="font-size:13px;font-weight:500">Deuda ${d.anio}${d.nota?' — '+esc(d.nota):''}</div></div>
          <span class="pill pill-red">S/${d.monto}</span>
        </div>`).join('')}
      </div>`:'' }

      <div class="sec-title">Historial completo de asistencia</div>
      <div class="card card-flush">
        ${(asist||[]).length?(asist||[]).map(a=>{
          const sub  = a.subsanaciones?.[0];
          const tipo = a.eventos?.tipo;
          const multa = MULTAS[tipo]||0;
          return `<div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento" style="font-weight:600">${a.eventos?.nombre||'Evento'}</div>
              <div class="hist-fecha">
                📅 ${formatFecha(a.eventos?.fecha)}
                &nbsp;·&nbsp;
                <span class="pill ${tipoColor(tipo)}" style="font-size:10px;padding:1px 6px">${tipoLabel(tipo)}</span>
                &nbsp;·&nbsp;
                <span style="font-family:var(--mono);font-size:11px">S/${multa}</span>
              </div>
              ${a.estado==='F'?`<div style="font-size:11px;color:var(--red);margin-top:3px;font-weight:500">⚠️ Falta sin subsanar — multa S/${multa}</div>`:''}
              ${a.estado==='J'&&sub?`<div class="hist-nota">✅ Subsanado el ${formatFecha(sub.fecha_subsanacion)}<br>📝 ${sub.nota||'Apoyo registrado'}</div>`:''}
              ${a.estado==='E'?`<div style="font-size:11px;color:var(--blue);margin-top:3px">Exonerado de este evento</div>`:''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              ${a.estado==='P'?`<span class="pill pill-green">Presente</span>`
                :a.estado==='J'?`<span class="pill pill-orange">Subsanado</span>`
                :a.estado==='E'?`<span class="pill pill-blue">Exonerado</span>`
                :`<span class="pill pill-red">Falta</span>`}
            </div>
          </div>`;
        }).join(''):'<div style="color:var(--text2);font-size:13px;padding:14px 0">Sin registros de asistencia aún.</div>'}
      </div>`;
  }
  return { render };
})();
