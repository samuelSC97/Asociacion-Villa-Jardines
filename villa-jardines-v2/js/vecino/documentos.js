const VecinoDocumentos = (() => {
  async function render() {
    const el = document.getElementById('vecino-body');
    el.innerHTML = '<div class="loading-inline">Cargando documentos...</div>';
    const { data: docs } = await db.from('documentos').select('*').eq('visible', true).order('fecha', { ascending: false });
    const actas = (docs||[]).filter(d=>d.categoria==='acta');
    const otros  = (docs||[]).filter(d=>d.categoria==='otro');

    el.innerHTML = `
      ${actas.length?`
      <div class="sec-title">📋 Actas de asambleas</div>
      <div class="card card-flush">
        ${actas.map(d=>`<div class="pdf-item">
          <div class="pdf-icon">📄</div>
          <div class="pdf-info"><div class="pdf-name">${d.titulo}</div><div class="pdf-date">${formatFecha(d.fecha)}</div></div>
          ${d.url_pdf?`<a href="${d.url_pdf}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none">Ver PDF</a>`:''}
        </div>`).join('')}
      </div>`:''}

      ${otros.length?`
      <div class="sec-title">📄 Otros documentos</div>
      <div class="card card-flush">
        ${otros.map(d=>`<div class="pdf-item">
          <div class="pdf-icon">📄</div>
          <div class="pdf-info"><div class="pdf-name">${d.titulo}</div><div class="pdf-date">${formatFecha(d.fecha)}</div></div>
          ${d.url_pdf?`<a href="${d.url_pdf}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration:none">Ver PDF</a>`:''}
        </div>`).join('')}
      </div>`:''}

      ${!actas.length&&!otros.length?`<div class="card" style="color:var(--text2);font-size:13px;text-align:center;padding:24px">
        <div style="font-size:24px;margin-bottom:8px">📁</div>
        No hay documentos disponibles por el momento.
      </div>`:''}`;
  }
  return { render };
})();
