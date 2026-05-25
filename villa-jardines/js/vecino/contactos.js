const VecinoContactos = (() => {
  const DEFAULTS = [
    { titulo: 'Junta directiva', items: [
      { nombre: 'Presidente',     persona: 'Dember',        telefono: '958370579' },
      { nombre: 'Vicepresidente', persona: 'Marco Antonio', telefono: '983803603' },
      { nombre: 'Tesorera',       persona: 'Sara',          telefono: '952610005' },
      { nombre: 'Secretario',     persona: 'Samuel',        telefono: '989234106' },
      { nombre: 'Fiscal',         persona: 'Graciela',      telefono: '945430579' }
    ]},
    { titulo: 'Servicios', items: [
      { nombre: 'Agua',  persona: '', telefono: '982025175' },
      { nombre: 'Silo',  persona: '', telefono: '958691953' }
    ]}
  ];

  async function cargar() {
    try {
      const { data } = await db.from('config_app').select('valor').eq('clave', 'directorio').maybeSingle();
      if (data?.valor) return JSON.parse(data.valor);
    } catch (e) {}
    return DEFAULTS;
  }

  async function render() {
    const el = document.getElementById('vecino-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const grupos = await cargar();

    el.innerHTML = `
      <button class="back-btn" onclick="VecinoApp.tab('inicio')">← Volver</button>
      <div class="sec-title" style="margin-top:0">📞 Directorio</div>
      ${grupos.map(g => `
        <div class="card card-flush" style="margin-bottom:10px">
          <div style="font-weight:600;font-size:11px;color:var(--text2);padding:7px 12px;border-bottom:1px solid var(--bg2);text-transform:uppercase;letter-spacing:.5px">${esc(g.titulo)}</div>
          ${g.items.map(item => `
            <div class="pago-det-row">
              <div>
                <div style="font-size:13px;font-weight:500">${esc(item.nombre)}${item.persona ? ' — ' + esc(item.persona) : ''}</div>
              </div>
              <a href="tel:${esc(item.telefono)}" style="text-decoration:none">
                <span class="pill pill-blue" style="font-family:var(--mono)">📞 ${esc(item.telefono)}</span>
              </a>
            </div>`).join('')}
        </div>`).join('')}`;
  }

  return { render, cargar, DEFAULTS };
})();
