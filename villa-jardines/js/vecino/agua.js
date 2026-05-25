const VecinoAgua = (() => {
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const REF  = new Date(2026, 0, 1); // Jan 1, 2026 = día 1 del ciclo

  let _mes  = new Date().getMonth() + 1;
  let _anio = new Date().getFullYear();

  // ciclo perpetuo: 1=nadie, 2=CD, 3=nadie, 0=AB — domingos siguen el mismo ciclo
  function _turno(date) {
    const n   = Math.round((date - REF) / 86400000) + 1;
    const pos = n % 4;
    if (pos === 2) return 'CD';
    if (pos === 0) return 'AB';
    return null;
  }

  function render() {
    const el       = document.getElementById('vecino-body');
    const hoy      = new Date();
    const currMes  = hoy.getMonth() + 1;
    const currAnio = hoy.getFullYear();
    const daysInMonth    = new Date(_anio, _mes, 0).getDate();
    const isPrev         = !(_anio === 2026 && _mes === 1);
    const isCurrentMonth = _anio === currAnio && _mes === currMes;
    const isNext         = !isCurrentMonth;
    const todayDay       = hoy.getDate();

    const rows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(_anio, _mes - 1, d);
      rows.push({ day: d, dow: date.getDay(), turno: _turno(date) });
    }

    el.innerHTML = `
      <button class="back-btn" onclick="VecinoApp.tab('inicio')">← Volver</button>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="sec-title" style="margin:0">💧 Rol de Agua</div>
        <div style="display:flex;gap:5px;align-items:center">
          <button class="btn btn-sm btn-outline" onclick="VecinoAgua.navMes(-1)" ${!isPrev?'disabled':''}>‹</button>
          <span style="font-size:13px;font-weight:600;min-width:96px;text-align:center">${MESES_L[_mes-1]} ${_anio}</span>
          <button class="btn btn-sm btn-outline" onclick="VecinoAgua.navMes(1)" ${!isNext?'disabled':''}>›</button>
        </div>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div style="display:flex;gap:14px;padding:7px 12px;font-size:11px;color:var(--text2);border-bottom:1px solid var(--bg2)">
          <span><span style="display:inline-block;width:10px;height:10px;background:#d4edda;border-radius:2px;margin-right:3px;vertical-align:middle"></span>AB</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:#ffecd2;border-radius:2px;margin-right:3px;vertical-align:middle"></span>CD</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--bg2);border-radius:2px;margin-right:3px;vertical-align:middle"></span>Sin agua</span>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:var(--bg2)">
              <th style="padding:5px 12px;text-align:left;font-size:11px;color:var(--text2);font-weight:600">FECHA</th>
              <th style="padding:5px 8px;text-align:left;font-size:11px;color:var(--text2);font-weight:600">DÍA</th>
              <th style="padding:5px 12px;text-align:center;font-size:11px;color:var(--text2);font-weight:600">TURNO</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => {
              const isSun = r.dow === 0;
              const isHoy = isCurrentMonth && r.day === todayDay;
              const bg    = r.turno === 'AB' ? '#d4edda'
                          : r.turno === 'CD' ? '#ffecd2'
                          : isSun ? 'var(--bg2)' : 'var(--card)';
              const clr   = r.turno === 'AB' ? '#28a745' : '#e67e00';
              return `<tr style="background:${bg}" ${isHoy ? 'id="agua-hoy"' : ''}>
                <td style="padding:5px 12px;font-size:13px;font-weight:${isHoy?'700':'400'};color:${isHoy?'var(--blue)':'inherit'}">${r.day}${isHoy?' ◀':''}</td>
                <td style="padding:5px 8px;font-size:12px;color:var(--text2)">${DIAS[r.dow]}</td>
                <td style="padding:5px 12px;text-align:center">
                  ${r.turno ? `<span style="font-weight:700;color:${clr};font-size:13px">${r.turno}</span>`
                             : `<span style="color:var(--text3)">—</span>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="card" style="margin-top:10px">
        <div class="card-title" style="margin-bottom:8px">Encargados</div>
        <div style="font-size:13px;line-height:1.9">
          <div><strong>Control de llaves:</strong> Sra. Lucía y Sra. Norma</div>
          <div><strong>Regado de árboles:</strong> Sr. Fausto Mamani</div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bg2)">
            <div style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Cobros por manzana</div>
            <div><strong>Mz A:</strong> Judith A-05 · <span style="font-family:var(--mono)">984522351</span> <span style="font-size:12px;color:var(--text2)">(Yape o efectivo)</span></div>
            <div><strong>Mz B:</strong> Roxana B-05 · <span style="font-family:var(--mono)">950365626</span> <span style="font-size:12px;color:var(--text2)">(Yape o efectivo)</span></div>
            <div><strong>Mz C-D:</strong> Yesica D-15 &amp; Norma D-09 <span style="font-size:12px;color:var(--text2)">(solo efectivo)</span></div>
          </div>
        </div>
      </div>`;

    if (isCurrentMonth) {
      setTimeout(() => {
        const el = document.getElementById('agua-hoy');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    }
  }

  function navMes(d) {
    const hoy = new Date();
    _mes += d;
    if (_mes > 12) { _mes = 1;  _anio++; }
    if (_mes < 1)  { _mes = 12; _anio--; }
    if (_anio < 2026 || (_anio === 2026 && _mes < 1)) { _mes = 1; _anio = 2026; }
    const currMes  = hoy.getMonth() + 1;
    const currAnio = hoy.getFullYear();
    if (_anio > currAnio || (_anio === currAnio && _mes > currMes)) {
      _mes = currMes; _anio = currAnio;
    }
    render();
  }

  return { render, navMes };
})();
