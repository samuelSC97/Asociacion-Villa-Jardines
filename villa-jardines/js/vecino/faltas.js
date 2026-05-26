const VecinoFaltas = (() => {
  let _data = null;

  async function render() {
    const el = document.getElementById('vecino-body');
    const v  = Auth.getVecino();
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: asist }, { data: deudasAnt }] = await Promise.all([
      db.from('asistencias').select('*,eventos(*),subsanaciones(*)').eq('vecino_id', v.id).order('created_at', { ascending: false }),
      db.from('deudas_anteriores').select('*').eq('vecino_id', v.id).eq('pagado', false).order('anio', { ascending: true })
    ]);
    _data = { asist: asist || [], deudasAnt: deudasAnt || [] };

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

      <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 7px">
        <div class="sec-title" style="margin:0">Historial de asistencia</div>
        <button class="btn btn-sm btn-outline" onclick="VecinoFaltas.exportar()">🖨️ Exportar PDF</button>
      </div>
      <div class="card card-flush">
        ${(deudasAnt||[]).map(d=>`
          <div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento" style="color:var(--red);font-weight:600">Deuda acumulada ${d.anio}${d.nota?' — '+esc(d.nota):''}</div>
              <div class="hist-fecha" style="color:var(--text2)">Pendiente de pago · anterior al sistema</div>
            </div>
            <div style="flex-shrink:0"><span class="pill pill-red">S/${d.monto}</span></div>
          </div>`).join('')}
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
        }).join(''):(!(deudasAnt||[]).length?'<div style="color:var(--text2);font-size:13px;padding:14px 0">Sin registros de asistencia aún.</div>':'')}
      </div>`;
  }

  function exportar() {
    if (!_data) return;
    const v = Auth.getVecino();
    const { asist, deudasAnt } = _data;
    const faltas      = asist.filter(a => a.estado === 'F');
    const presentes   = asist.filter(a => a.estado === 'P').length;
    const subsanadas  = asist.filter(a => a.estado === 'J').length;
    const multaFaltas = faltas.reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
    const multaDeudas = deudasAnt.reduce((s, d) => s + parseFloat(d.monto), 0);
    const multaTotal  = multaFaltas + multaDeudas;
    let n = 0;
    const filas = [
      ...deudasAnt.map(d => {
        n++;
        return `<tr style="background:#fff0f0">
          <td>${n}</td>
          <td>Deuda acumulada ${d.anio}${d.nota ? ' — ' + d.nota : ''}</td>
          <td>—</td>
          <td style="color:#b91c1c;font-weight:600">Pendiente</td>
          <td style="color:#b91c1c;font-weight:600">S/${parseFloat(d.monto).toFixed(2)}</td>
        </tr>`;
      }),
      ...asist.map(a => {
        n++;
        const tipo   = a.eventos?.tipo;
        const multa  = a.estado === 'F' ? (MULTAS[tipo] || 0) : 0;
        const labels = { P: 'Presente', F: 'Falta', J: 'Subsanado', E: 'Exonerado' };
        const color  = a.estado === 'F' ? '#b91c1c' : a.estado === 'J' ? '#b45309' : a.estado === 'E' ? '#1d4ed8' : '#166534';
        return `<tr>
          <td>${n}</td>
          <td>${a.eventos?.nombre || 'Evento'}</td>
          <td>${formatFecha(a.eventos?.fecha)}</td>
          <td style="color:${color};font-weight:600">${labels[a.estado] || a.estado}</td>
          <td style="color:${color}">${multa > 0 ? 'S/' + multa.toFixed(2) : '—'}</td>
        </tr>`;
      })
    ].join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Historial — ${v.nombre}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#111}
.aso{font-size:15px;font-weight:700;margin-bottom:2px}
.sub{font-size:11px;color:#555;margin-bottom:16px}
.info p{margin-bottom:3px}
.info{margin-bottom:14px}
.resumen{display:flex;gap:24px;margin-bottom:16px;padding:10px 14px;background:#f4f4f4;border-radius:6px}
.rv{font-size:18px;font-weight:700}.rl{font-size:10px;color:#666}
table{width:100%;border-collapse:collapse;margin-top:4px}
th,td{border:1px solid #ddd;padding:6px 9px;text-align:left;font-size:11px}
th{background:#f0f0f0;font-weight:700}
tr:nth-child(even){background:#fafafa}
tfoot td{font-weight:700;background:#f0f0f0}
@media print{body{padding:0}}
</style></head><body>
<div class="aso">Asociación de Vecinos Villa Jardines</div>
<div class="sub">Arequipa, Perú &nbsp;·&nbsp; Emitido el ${formatFecha(today())}</div>
<div class="info">
  <p><strong>Vecino:</strong> ${v.nombre}</p>
  <p><strong>Manzana:</strong> ${v.mz} &nbsp;·&nbsp; <strong>Lote:</strong> ${v.lote}${v.cargo ? ' &nbsp;·&nbsp; <strong>Cargo:</strong> ' + v.cargo : ''}</p>
</div>
<div class="resumen">
  <div><div class="rv" style="color:#b91c1c">S/${multaTotal.toFixed(2)}</div><div class="rl">Deuda total</div></div>
  <div><div class="rv" style="color:#166534">${presentes}</div><div class="rl">Presentes</div></div>
  <div><div class="rv" style="color:#b91c1c">${faltas.length}</div><div class="rl">Faltas</div></div>
  <div><div class="rv" style="color:#b45309">${subsanadas}</div><div class="rl">Subsanadas</div></div>
</div>
<table>
  <thead><tr><th>N°</th><th>Evento / Descripción</th><th>Fecha</th><th>Estado</th><th>Multa S/</th></tr></thead>
  <tbody>${filas || '<tr><td colspan="5" style="text-align:center;color:#666;padding:12px">Sin registros</td></tr>'}</tbody>
  <tfoot><tr><td colspan="4" style="text-align:right">Total deuda pendiente:</td><td>S/${multaTotal.toFixed(2)}</td></tr></tfoot>
</table>
</body></html>`;
    const w = window.open('', '_blank', 'width=750,height=650');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  return { render, exportar };
})();
