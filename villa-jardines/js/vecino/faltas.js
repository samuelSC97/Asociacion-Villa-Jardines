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
    _generarPdf(v, asist, deudasAnt);
  }

  function _generarPdf(v, asist, deudasAnt) {
    const faltas      = asist.filter(a => a.estado === 'F');
    const presentes   = asist.filter(a => a.estado === 'P').length;
    const subsanadas  = asist.filter(a => a.estado === 'J').length;
    const exoneradas  = asist.filter(a => a.estado === 'E').length;
    const multaFaltas = faltas.reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
    const multaDeudas = deudasAnt.reduce((s, d) => s + parseFloat(d.monto), 0);
    const multaTotal  = multaFaltas + multaDeudas;

    const cfg = {
      P: { label: 'Presente',  bg: '#dcfce7', fg: '#166534' },
      F: { label: 'Falta',     bg: '#fee2e2', fg: '#b91c1c' },
      J: { label: 'Subsanado', bg: '#fef9c3', fg: '#854d0e' },
      E: { label: 'Exonerado', bg: '#ffedd5', fg: '#c2410c' }
    };

    const deudasHtml = deudasAnt.length ? `
      <div class="sec-lbl">Deudas anteriores al sistema</div>
      <table class="dt"><tbody>
        ${deudasAnt.map(d => `<tr>
          <td>${d.anio}${d.nota ? ' — ' + d.nota : ''}</td>
          <td style="text-align:right;color:#b91c1c;font-weight:700">S/${parseFloat(d.monto).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody></table>` : '';

    const byYear = {};
    asist.forEach(a => {
      const yr = (a.eventos?.fecha || '').slice(0, 4);
      if (!yr) return;
      (byYear[yr] = byYear[yr] || []).push(a);
    });
    Object.values(byYear).forEach(arr => arr.sort((a, b) => (a.eventos?.fecha || '').localeCompare(b.eventos?.fecha || '')));

    const yearTables = Object.keys(byYear).sort().map(yr => {
      const evs = byYear[yr];
      const faltasAnio = evs.filter(a => a.estado === 'F').length;
      const multaAnio  = evs.filter(a => a.estado === 'F').reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
      const heads = evs.map(a => {
        const f = a.eventos?.fecha || '';
        const dd = parseInt(f.slice(8, 10));
        const mm = parseInt(f.slice(5, 7));
        const nom = a.eventos?.nombre || '';
        const corto = nom.length > 22 ? nom.slice(0, 20) + '…' : nom;
        return `<th><div class="ed">${dd} ${MESES[mm - 1] || ''}</div><div class="en">${corto}</div></th>`;
      }).join('');
      const cells = evs.map(a => {
        const c = cfg[a.estado] || { label: a.estado, bg: '#f3f4f6', fg: '#374151' };
        return `<td style="background:${c.bg};color:${c.fg};font-weight:700;text-align:center">${c.label}</td>`;
      }).join('');
      return `
        <div class="yr-block">
          <div class="yr-lbl">${yr}</div>
          <div class="tw">
            <table class="yt">
              <thead><tr>${heads}<th class="tot">Total F</th><th class="tot">S/</th></tr></thead>
              <tbody><tr>${cells}
                <td class="tot" style="${faltasAnio > 0 ? 'color:#b91c1c;font-weight:700' : 'color:#6b7280'}">${faltasAnio || '—'}</td>
                <td class="tot" style="${multaAnio > 0 ? 'color:#b91c1c;font-weight:700' : 'color:#6b7280'}">${multaAnio > 0 ? multaAnio : '—'}</td>
              </tr></tbody>
            </table>
          </div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Historial — ${v.nombre}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#111}
.aso{font-size:15px;font-weight:700;margin-bottom:2px}
.cab{font-size:11px;color:#555;margin-bottom:14px}
.inf p{margin-bottom:3px}.inf{margin-bottom:14px}
.res{display:flex;gap:22px;margin-bottom:18px;padding:10px 14px;background:#f4f4f4;border-radius:6px;flex-wrap:wrap}
.rv{font-size:18px;font-weight:700}.rl{font-size:10px;color:#666}
.sec-lbl{font-size:12px;font-weight:700;margin:16px 0 5px;color:#333;border-bottom:1px solid #e5e7eb;padding-bottom:3px}
.dt{border-collapse:collapse;width:auto;margin-bottom:4px}
.dt td{padding:3px 10px 3px 0;font-size:11px;border:none}
.yr-block{margin-bottom:22px}
.yr-lbl{font-size:13px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:3px;margin-bottom:6px}
.tw{overflow-x:auto}
.yt{border-collapse:collapse;white-space:nowrap}
.yt th,.yt td{border:1px solid #d1d5db;padding:5px 8px;font-size:11px}
.yt thead th{background:#f0f4f8;text-align:center;font-weight:600}
.ed{font-weight:700;font-size:12px;text-align:center}
.en{font-size:9px;color:#555;margin-top:1px;text-align:center;max-width:90px;overflow:hidden;text-overflow:ellipsis}
.tot{background:#f0f0f0;font-weight:700;text-align:center;min-width:44px}
@media print{body{padding:8px}.tw{overflow:visible}}
</style></head><body>
<div class="aso">Asociación de Vecinos Villa Jardines</div>
<div class="cab">Arequipa, Perú &nbsp;·&nbsp; Emitido el ${formatFecha(today())}</div>
<div class="inf">
  <p><strong>Vecino:</strong> ${v.nombre}</p>
  <p><strong>Mz:</strong> ${v.mz} &nbsp;·&nbsp; <strong>Lote:</strong> ${v.lote}${v.cargo ? ' &nbsp;·&nbsp; <strong>Cargo:</strong> ' + v.cargo : ''}</p>
</div>
<div class="res">
  <div><div class="rv" style="color:#b91c1c">S/${multaTotal.toFixed(2)}</div><div class="rl">Deuda total</div></div>
  <div><div class="rv" style="color:#166534">${presentes}</div><div class="rl">Presentes</div></div>
  <div><div class="rv" style="color:#b91c1c">${faltas.length}</div><div class="rl">Faltas</div></div>
  <div><div class="rv" style="color:#854d0e">${subsanadas}</div><div class="rl">Subsanadas</div></div>
  ${exoneradas > 0 ? `<div><div class="rv" style="color:#c2410c">${exoneradas}</div><div class="rl">Exoneradas</div></div>` : ''}
</div>
${deudasHtml}
${yearTables || '<div style="color:#6b7280;padding:12px 0">Sin registros de asistencia.</div>'}
</body></html>`;
    const w = window.open('', '_blank', 'width=820,height=720');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  return { render, exportar };
})();
