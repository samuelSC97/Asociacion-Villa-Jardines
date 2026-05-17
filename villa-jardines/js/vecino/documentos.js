// js/vecino/documentos.js
const VecinoDocumentos = (() => {
  async function render() {
    const el = document.getElementById('vecino-body');
    el.innerHTML = '<div class="loading-inline">Cargando documentos...</div>';

    const [{ data: docs }, { data: agenda }] = await Promise.all([
      db.from('documentos').select('*').eq('visible', true).order('fecha', { ascending: false }),
      db.from('agenda_proxima').select('*').eq('activa', true).lte('fecha_inicio_mostrar', today()).gte('fecha_fin_mostrar', today()).maybeSingle()
    ]);

    const actas  = (docs || []).filter(d => d.categoria === 'acta');
    const otros  = (docs || []).filter(d => d.categoria === 'otro');

    el.innerHTML = `
      ${agenda ? `
      <div class="agenda-card" style="margin-bottom:14px">
        <div class="agenda-label">📋 Próxima reunión</div>
        <div class="agenda-title">${agenda.titulo}</div>
        <div class="agenda-meta">📍 ${agenda.lugar} &nbsp;·&nbsp; 🕐 ${agenda.hora} &nbsp;·&nbsp; 📅 ${formatFecha(agenda.fecha_evento)}</div>
        <div class="agenda-puntos">${agenda.puntos_agenda}</div>
      </div>` : `
      <div class="card" style="color:var(--text2);font-size:13px;text-align:center;padding:20px">
        No hay reunión convocada próximamente.
      </div>`}

      ${actas.length ? `
      <div class="sec-title">📋 Actas de asambleas</div>
      <div class="card card-flush">
        ${actas.map(d => `
          <div class="pdf-item">
            <div class="pdf-icon">📄</div>
            <div class="pdf-info">
              <div class="pdf-name">${d.titulo}</div>
              <div class="pdf-date">${formatFecha(d.fecha)}</div>
            </div>
            ${d.url_pdf ? `<a href="${d.url_pdf}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none">Ver PDF</a>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${otros.length ? `
      <div class="sec-title">📄 Otros documentos</div>
      <div class="card card-flush">
        ${otros.map(d => `
          <div class="pdf-item">
            <div class="pdf-icon">📄</div>
            <div class="pdf-info">
              <div class="pdf-name">${d.titulo}</div>
              <div class="pdf-date">${formatFecha(d.fecha)}</div>
            </div>
            ${d.url_pdf ? `<a href="${d.url_pdf}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none">Ver PDF</a>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${!actas.length && !otros.length && !agenda ? `
      <div class="card" style="color:var(--text2);font-size:13px;text-align:center;padding:20px">
        No hay documentos disponibles por el momento.
      </div>` : ''}
    `;
  }

  return { render };
})();
