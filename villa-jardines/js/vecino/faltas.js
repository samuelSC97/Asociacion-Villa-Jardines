// js/vecino/faltas.js
const VecinoFaltas = (() => {
  async function render() {
    const el = document.getElementById('vecino-body');
    const v  = Auth.getVecino();
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';

    const { data: asist } = await db
      .from('asistencias')
      .select('*, eventos(*), subsanaciones(*)')
      .eq('vecino_id', v.id)
      .order('created_at', { ascending: false });

    const total     = (asist || []).length;
    const presentes = (asist || []).filter(a => a.estado === 'P').length;
    const faltas    = (asist || []).filter(a => a.estado === 'F').length;
    const subsanadas= (asist || []).filter(a => a.estado === 'J').length;
    const multas    = (asist || []).filter(a => a.estado === 'F').reduce((s, a) => s + (MULTAS[a.eventos?.tipo] || 0), 0);

    el.innerHTML = `
      <div class="metrics">
        <div class="metric"><div class="metric-val c-green">${presentes}</div><div class="metric-lbl">Presentes</div></div>
        <div class="metric"><div class="metric-val c-red">${faltas}</div><div class="metric-lbl">Faltas</div></div>
        <div class="metric"><div class="metric-val c-orange">${subsanadas}</div><div class="metric-lbl">Subsanadas</div></div>
      </div>

      ${faltas > 0 ? `
      <div class="card" style="border-color:#D9A0A0;background:var(--red-bg)">
        <div style="font-weight:600;color:var(--red)">Multas pendientes: S/${multas}</div>
        <div style="font-size:12px;color:var(--red);margin-top:3px">Tienes ${faltas} falta${faltas>1?'s':''} sin subsanar</div>
      </div>` : ''}

      <div class="sec-title">Historial completo</div>
      <div class="card card-flush">
        ${(asist || []).map(a => {
          const sub  = a.subsanaciones?.[0];
          const tipo = a.eventos?.tipo;
          const tipoLabel = tipo === 'A' ? 'Asamblea' : tipo === 'F' ? 'Faena' : 'Importante';
          return `<div class="hist-row">
            <div class="hist-left">
              <div class="hist-evento">${a.eventos?.nombre || 'Evento'}</div>
              <div class="hist-fecha">${formatFecha(a.eventos?.fecha)} · ${tipoLabel}</div>
              ${a.estado === 'J' && sub
                ? `<div class="hist-nota">✅ Subsanado el ${formatFecha(sub.fecha_subsanacion)} — ${sub.nota || 'Apoyo registrado'}</div>`
                : ''}
            </div>
            ${a.estado === 'P'
              ? `<span class="pill pill-green">Presente</span>`
              : a.estado === 'J'
              ? `<span class="pill pill-orange">Subsanado</span>`
              : `<span class="pill pill-red">Falta<br>S/${MULTAS[tipo]||0}</span>`}
          </div>`;
        }).join('') || '<div style="color:var(--text2);font-size:13px;padding:12px 0">Sin registros de asistencia aún</div>'}
      </div>
    `;
  }

  return { render };
})();
