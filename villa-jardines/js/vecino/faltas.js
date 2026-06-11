const VecinoFaltas = (() => {
  let _data = null;

  function _isVirtualFalta(a, pagMesSet) {
    if (a.estado !== 'P') return false;
    const fecha = a.eventos?.fecha || '';
    if (!fecha) return false;
    const yr = parseInt(fecha.slice(0, 4));
    const mo = parseInt(fecha.slice(5, 7));
    if (yr < 2025 || (yr === 2025 && mo < 2)) return false;
    return !pagMesSet.has(`${yr}-${mo}`);
  }

  async function render() {
    const el = document.getElementById('vecino-body');
    const v  = Auth.getVecino();
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: asist }, { data: deudasAnt }, { data: guard }, { data: pagMes }] = await Promise.all([
      db.from('asistencias').select('*,eventos(*),subsanaciones(*)').eq('vecino_id', v.id).order('created_at', { ascending: false }),
      db.from('deudas_anteriores').select('*').eq('vecino_id', v.id).eq('pagado', false).order('anio', { ascending: true }),
      db.from('apoyos').select('monto').eq('vecino_id', v.id).eq('estado', 'guardadito'),
      db.from('pagos_cuota_mes').select('anio,mes').eq('vecino_id', v.id)
    ]);
    const guardadito = (guard || []).reduce((s, a) => s + parseFloat(a.monto), 0);
    const pagMesSet  = new Set((pagMes || []).map(p => `${p.anio}-${p.mes}`));
    _data = { asist: asist || [], deudasAnt: deudasAnt || [], guardadito, pagMesSet };

    const asistData   = asist || [];
    const presentes   = asistData.filter(a => a.estado === 'P' && !_isVirtualFalta(a, pagMesSet)).length;
    const faltas      = asistData.filter(a => a.estado === 'F' || _isVirtualFalta(a, pagMesSet));
    const exoneradas  = asistData.filter(a => a.estado === 'E').length;
    const multaFaltas = faltas.reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
    const multaDeudas = (deudasAnt || []).reduce((s, d) => s + parseFloat(d.monto), 0);
    const multaTotal  = multaFaltas + multaDeudas;

    el.innerHTML = `
      <div class="metrics">
        <div class="metric"><div class="metric-val c-green">${presentes}</div><div class="metric-lbl">Presentes</div></div>
        <div class="metric"><div class="metric-val c-red">${faltas.length}</div><div class="metric-lbl">Faltas</div></div>
        ${exoneradas > 0 ? `<div class="metric"><div class="metric-val" style="color:var(--blue)">${exoneradas}</div><div class="metric-lbl">Exoneradas</div></div>` : ''}
      </div>

      ${multaTotal > 0
        ? `<div class="card" style="border-left:3px solid var(--red);background:var(--red-bg)">
            <div style="font-weight:600;color:var(--red)">Deuda total pendiente: S/${multaTotal}</div>
            ${multaDeudas > 0 && multaFaltas > 0 ? `<div style="font-size:12px;color:var(--red);margin-top:2px">Faltas S/${multaFaltas} · Deudas anteriores S/${multaDeudas}</div>` : ''}
            <div style="font-size:12px;color:var(--red);margin-top:3px">${faltas.length > 0 ? `${faltas.length} falta${faltas.length > 1 ? 's' : ''} sin subsanar · ` : ''}Acércate al presidente para ponerte al día.</div>
          </div>`
        : '<div class="card" style="border-left:3px solid var(--green);background:var(--green-bg)"><div style="font-weight:600;color:var(--green)">✓ Sin deudas pendientes</div></div>'}

      <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 7px">
        <div class="sec-title" style="margin:0">Historial de asistencia</div>
        <button class="btn btn-sm btn-outline" onclick="VecinoFaltas.exportar()">🖨️ Exportar PDF</button>
      </div>
      <div class="card card-flush">
        ${(deudasAnt || []).map(d => `
          <div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento" style="color:var(--red);font-weight:600">Deuda acumulada ${d.anio}${d.nota ? ' — ' + esc(d.nota) : ''}</div>
              <div class="hist-fecha" style="color:var(--text2)">Pendiente de pago · anterior al sistema</div>
            </div>
            <div style="flex-shrink:0"><span class="pill pill-red">S/${d.monto}</span></div>
          </div>`).join('')}
        ${asistData.length
          ? asistData.map(a => {
              const sub    = a.subsanaciones?.[0];
              const tipo   = a.eventos?.tipo;
              const multa  = MULTAS[tipo] || 0;
              const vfalta = _isVirtualFalta(a, pagMesSet);
              const esFalta = a.estado === 'F' || vfalta;
              const fecha  = a.eventos?.fecha || '';
              const yr     = fecha.slice(0, 4);
              const mo     = parseInt(fecha.slice(5, 7));
              const mesNom = MESES_L[mo - 1] || '';
              return `<div class="hist-row">
                <div class="hist-left">
                  <div class="hist-evento" style="font-weight:600">${a.eventos?.nombre || 'Evento'}</div>
                  <div class="hist-fecha">
                    📅 ${formatFecha(fecha)}
                    &nbsp;·&nbsp;
                    <span class="pill ${tipoColor(tipo)}" style="font-size:10px;padding:1px 6px">${tipoLabel(tipo)}</span>
                    &nbsp;·&nbsp;
                    <span style="font-family:var(--mono);font-size:11px">S/${multa}</span>
                  </div>
                  ${esFalta && !vfalta ? `<div style="font-size:11px;color:var(--red);margin-top:3px;font-weight:500">⚠️ Falta sin subsanar — multa S/${multa}</div>` : ''}
                  ${vfalta ? `<div style="font-size:11px;color:var(--red);margin-top:3px;font-weight:500">⚠️ No se consideró — falta de pago de almacén S/2 (${mesNom} ${yr}) · multa S/${multa}</div>` : ''}
                  ${a.estado === 'J' && sub ? `<div class="hist-nota">✅ Subsanado el ${formatFecha(sub.fecha_subsanacion)}<br>📝 ${sub.nota || 'Apoyo registrado'}</div>` : ''}
                  ${a.estado === 'E' ? `<div style="font-size:11px;color:var(--blue);margin-top:3px">Exonerado de este evento</div>` : ''}
                </div>
                <div style="text-align:right;flex-shrink:0">
                  ${esFalta
                    ? `<span class="pill pill-red">Falta</span>`
                    : a.estado === 'J'
                      ? `<span class="pill pill-orange">Subsanado</span>`
                      : a.estado === 'E'
                        ? `<span class="pill pill-blue">Exonerado</span>`
                        : `<span class="pill pill-green">Presente</span>`}
                </div>
              </div>`;
            }).join('')
          : (!(deudasAnt || []).length ? '<div style="color:var(--text2);font-size:13px;padding:14px 0">Sin registros de asistencia aún.</div>' : '')}
      </div>`;
  }

  function exportar() {
    if (!_data) return;
    const v = Auth.getVecino();
    const { asist, deudasAnt, guardadito, pagMesSet } = _data;
    _generarPdf(v, asist, deudasAnt, guardadito, pagMesSet);
  }

  function _generarPdf(v, asist, deudasAnt, guardadito, pagMesSet) {
    const vFn         = a => _isVirtualFalta(a, pagMesSet);
    const faltas      = asist.filter(a => a.estado === 'F' || vFn(a));
    const presentes   = asist.filter(a => a.estado === 'P' && !vFn(a)).length;
    const exoneradas  = asist.filter(a => a.estado === 'E').length;
    const multaFaltas = faltas.reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
    const multaDeudas = deudasAnt.reduce((s, d) => s + parseFloat(d.monto), 0);
    const multaTotal  = multaFaltas + multaDeudas;

    const cfg = {
      P: { letra: 'A', bg: '#dcfce7', fg: '#166534' },
      F: { letra: 'F', bg: '#fee2e2', fg: '#b91c1c' },
      J: { letra: 'S', bg: '#dcfce7', fg: '#166534' },
      E: { letra: 'E', bg: '#ffedd5', fg: '#c2410c' }
    };
    const tipoNom = { A: 'Asamblea', F: 'Faena', I: 'Importante' };

    const byYear = {};
    asist.forEach(a => {
      const yr = (a.eventos?.fecha || '').slice(0, 4);
      if (!yr) return;
      (byYear[yr] = byYear[yr] || []).push(a);
    });
    Object.values(byYear).forEach(arr => arr.sort((a, b) => (a.eventos?.fecha || '').localeCompare(b.eventos?.fecha || '')));

    const yearTables = Object.keys(byYear).sort().reverse().map(yr => {
      const evs = byYear[yr];
      const multaAnio = evs.filter(a => a.estado === 'F' || vFn(a)).reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);
      const n = evs.length + 1;
      const thPad = n > 10 ? '3px 3px' : n > 7 ? '4px 5px' : '5px 8px';
      const edSz  = n > 10 ? '9px'  : n > 7 ? '10px' : '11px';
      const enSz  = n > 10 ? '7px'  : '8px';
      const tdSz  = n > 10 ? '11px' : '13px';
      const tdPad = n > 10 ? '5px 3px' : '6px 8px';
      const heads = evs.map(a => {
        const f  = a.eventos?.fecha || '';
        const dd = parseInt(f.slice(8, 10));
        const mm = parseInt(f.slice(5, 7));
        return `<th style="padding:${thPad}"><div class="ed" style="font-size:${edSz}">${dd} ${MESES[mm - 1] || ''}</div><div class="en" style="font-size:${enSz}">${tipoNom[a.eventos?.tipo] || ''}</div></th>`;
      }).join('');
      const cells = evs.map(a => {
        const vf = vFn(a);
        const c  = vf ? { letra: 'F', bg: '#fee2e2', fg: '#b91c1c' } : (cfg[a.estado] || { letra: a.estado, bg: '#f3f4f6', fg: '#374151' });
        return `<td style="background:${c.bg};color:${c.fg};font-weight:700;text-align:center;font-size:${tdSz};padding:${tdPad}">${c.letra}</td>`;
      }).join('');
      const subsanados = evs.filter(a => a.estado === 'J');
      const virtFaltas = evs.filter(vFn);
      const subsDetalle = subsanados.length ? `
        <div style="margin-top:5px;padding:5px 8px;background:#f0fdf4;border-left:3px solid #86efac;font-size:10px;color:#166534;line-height:1.7">
          ${subsanados.map(a => {
            const f  = a.eventos?.fecha || '';
            const dd = parseInt(f.slice(8, 10));
            const mm = parseInt(f.slice(5, 7));
            const nota = a.subsanaciones?.[0]?.nota || 'apoyo registrado';
            return `✓ ${dd} ${MESES[mm - 1] || ''} — ${tipoNom[a.eventos?.tipo] || 'Evento'}: ${nota}`;
          }).join('<br>')}
        </div>` : '';
      const virtDetalle = virtFaltas.length ? `
        <div style="margin-top:5px;padding:5px 8px;background:#fff7ed;border-left:3px solid #fca5a5;font-size:10px;color:#9a3412;line-height:1.7">
          <strong>Observación — pago de almacén S/2:</strong><br>
          ${virtFaltas.map(a => {
            const f  = a.eventos?.fecha || '';
            const dd = parseInt(f.slice(8, 10));
            const mm = parseInt(f.slice(5, 7));
            return `⚠ ${dd} ${MESES[mm - 1] || ''} (${tipoNom[a.eventos?.tipo] || ''}) — No considerado por pago pendiente de almacén S/2 (${MESES_L[mm - 1] || ''} ${f.slice(0, 4)})`;
          }).join('<br>')}
        </div>` : '';
      return `
        <div class="yr-block">
          <div class="yr-lbl">${yr}</div>
          <div class="tw"><table class="yt">
            <thead><tr>${heads}<th class="tot" style="padding:${thPad};font-size:${edSz}">S/ año</th></tr></thead>
            <tbody><tr>${cells}
              <td class="tot" style="${multaAnio > 0 ? 'color:#b91c1c;font-weight:700' : 'color:#6b7280'};font-size:${tdSz};padding:${tdPad}">${multaAnio > 0 ? multaAnio : '—'}</td>
            </tr></tbody>
          </table></div>
          ${subsDetalle}
          ${virtDetalle}
        </div>`;
    }).join('');

    const deudasBlock = deudasAnt.length ? `
      <div class="yr-block">
        <div class="yr-lbl" style="color:#991b1b;border-bottom-color:#991b1b">Deudas anteriores al sistema</div>
        <div class="tw"><table class="yt">
          <thead><tr><th style="text-align:left;min-width:160px;padding:5px 8px">Año / Descripción</th><th class="tot">S/</th></tr></thead>
          <tbody>
            ${deudasAnt.map(d => `<tr>
              <td style="padding:5px 8px">${d.anio}${d.nota ? ' — ' + d.nota : ''}</td>
              <td class="tot" style="color:#b91c1c;font-weight:700">${parseFloat(d.monto).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody>
          ${deudasAnt.length > 1 ? `<tfoot><tr>
            <td style="text-align:right;font-weight:700;background:#fef2f2;padding:5px 8px">Total:</td>
            <td class="tot" style="color:#b91c1c;font-weight:700;background:#fef2f2">${multaDeudas.toFixed(2)}</td>
          </tr></tfoot>` : ''}
        </table></div>
      </div>` : '';

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Historial — ${v.nombre}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#111}
.aso{font-size:15px;font-weight:700;margin-bottom:2px}
.cab{font-size:11px;color:#555;margin-bottom:14px}
.inf p{margin-bottom:3px}.inf{margin-bottom:14px}
.res{display:flex;gap:16px;margin-bottom:18px;padding:10px 14px;background:#f4f4f4;border-radius:6px;flex-wrap:wrap}
.rv{font-size:18px;font-weight:700}.rl{font-size:10px;color:#666}
.yr-block{margin-bottom:20px;break-inside:avoid;page-break-inside:avoid}
.yr-lbl{font-size:13px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:3px;margin-bottom:6px}
.tw{overflow-x:auto}
.yt{border-collapse:collapse;table-layout:fixed;width:100%}
.yt th,.yt td{border:1px solid #bfdbfe;overflow:hidden}
.yt thead th{background:#dbeafe;color:#1e3a8a;text-align:center;font-weight:600}
.ed{font-weight:700;text-align:center}
.en{color:#1e40af;margin-top:2px;text-align:center;word-break:break-word}
.tot{background:#f0f0f0;font-weight:700;text-align:center;width:48px;border-color:#d1d5db!important}
tfoot td{background:#f9fafb}
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
  ${guardadito > 0 ? `<div><div class="rv" style="color:#b45309">S/${guardadito.toFixed(2)}</div><div class="rl">Guardadito ↑</div></div>` : ''}
  <div><div class="rv" style="color:#166534">${presentes}</div><div class="rl">Presentes</div></div>
  <div><div class="rv" style="color:#b91c1c">${faltas.length}</div><div class="rl">Faltas</div></div>
  ${exoneradas > 0 ? `<div><div class="rv" style="color:#c2410c">${exoneradas}</div><div class="rl">Exoneradas</div></div>` : ''}
</div>
${yearTables || '<div style="color:#6b7280;padding:12px 0">Sin registros de asistencia.</div>'}
${deudasBlock}
</body></html>`;
    const w = window.open('', '_blank', 'width=820,height=720');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  return { render, exportar };
})();
