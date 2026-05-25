const AdminInicio = (() => {
  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const [{ data: vecinos }, { data: faltas }, { data: guard }, { data: agenda }] = await Promise.all([
      db.from('vecinos').select('id'),
      db.from('asistencias').select('vecino_id,eventos(tipo)').eq('estado', 'F'),
      db.from('apoyos').select('monto').eq('estado', 'guardadito'),
      db.from('agenda_proxima').select('*').eq('activa', true).lte('fecha_inicio_mostrar', today()).gte('fecha_fin_mostrar', today()).maybeSingle()
    ]);
    const total     = vecinos?.length || 0;
    const conFaltas = new Set((faltas || []).map(f => f.vecino_id)).size;
    const multas    = (faltas || []).reduce((s, f) => s + (MULTAS[f.eventos?.tipo] || 0), 0);
    const guardado  = (guard  || []).reduce((s, a) => s + parseFloat(a.monto), 0);

    el.innerHTML = `
      ${agenda ? `<div class="agenda-card">
        <div class="agenda-label">📋 Próxima reunión</div>
        <div class="agenda-title">${agenda.titulo}</div>
        <div class="agenda-meta">📍 ${agenda.lugar} &nbsp;·&nbsp; 🕐 ${agenda.hora} &nbsp;·&nbsp; 📅 ${formatFecha(agenda.fecha_evento)}</div>
        <div class="agenda-puntos">${agenda.puntos_agenda}</div>
      </div>` : ''}
      <div class="metrics">
        <div class="metric"><div class="metric-val">${total}</div><div class="metric-lbl">Vecinos</div></div>
        <div class="metric"><div class="metric-val c-red">${conFaltas}</div><div class="metric-lbl">Con faltas</div></div>
        <div class="metric"><div class="metric-val c-gold">S/${guardado}</div><div class="metric-lbl">Guardadito</div></div>
      </div>
      <div class="card">
        <div class="card-title">Multas pendientes total</div>
        <div style="font-size:26px;font-weight:700;color:var(--red);font-family:var(--mono)">S/ ${multas.toLocaleString()}</div>
        <div class="progress" style="margin-top:8px"><div class="progress-fill p-red" style="width:${Math.min(100,conFaltas/total*100)}%"></div></div>
        <div style="font-size:11px;color:var(--text2);margin-top:5px">${conFaltas} de ${total} vecinos tienen faltas sin subsanar</div>
      </div>
      <div class="sec-title">Acciones rápidas</div>
      <button class="btn btn-dark btn-block" style="margin-bottom:8px" onclick="AdminApp.tab('asistencia')">📋 Tomar asistencia</button>
      <button class="btn btn-outline btn-block" style="margin-bottom:8px" onclick="AdminApp.tab('vecinos')">👥 Ver todos los vecinos</button>
      <button class="btn btn-outline btn-block" style="margin-bottom:8px" onclick="AdminApp.tab('reportes')">📊 Ver reportes de deuda</button>
      <button class="btn btn-outline btn-block" onclick="AdminApp.tab('historico')">📜 Carga histórica</button>`;
    AdminCambiarPass.renderForm();
  }
  return { render };
})();

const AdminCambiarPass = (() => {
  function renderForm() {
    const el = document.getElementById('admin-body');
    el.innerHTML += `
      <div class="sec-title">🔐 Cambiar contraseña</div>
      <div class="card" id="card-cambiar-pass">
        <div class="field"><label>Contraseña actual</label><input type="password" id="cp-actual" placeholder="••••••"></div>
        <div class="field"><label>Nueva contraseña</label><input type="password" id="cp-nueva" placeholder="Mínimo 6 caracteres"></div>
        <div class="field"><label>Confirmar nueva contraseña</label><input type="password" id="cp-confirmar" placeholder="Repite la nueva contraseña"></div>
        <div id="cp-msg"></div>
        <button class="btn btn-dark" onclick="AdminCambiarPass.cambiar()">🔒 Cambiar contraseña</button>
      </div>`;
  }

  async function cambiar() {
    const actual = document.getElementById('cp-actual')?.value;
    const nueva  = document.getElementById('cp-nueva')?.value;
    const conf   = document.getElementById('cp-confirmar')?.value;
    const msg    = document.getElementById('cp-msg');
    if (!actual || !nueva || !conf) { msg.innerHTML = '<div class="msg msg-err">Completa todos los campos</div>'; return; }
    if (nueva.length < 6) { msg.innerHTML = '<div class="msg msg-err">La nueva contraseña debe tener al menos 6 caracteres</div>'; return; }
    if (nueva !== conf) { msg.innerHTML = '<div class="msg msg-err">Las contraseñas nuevas no coinciden</div>'; return; }
    showLoading();
    const { data } = await db.from('usuarios').select('id').eq('rol', 'admin').eq('password_hash', actual).single();
    if (!data) { hideLoading(); msg.innerHTML = '<div class="msg msg-err">Contraseña actual incorrecta</div>'; return; }
    await db.from('usuarios').update({ password_hash: nueva }).eq('id', data.id);
    hideLoading();
    msg.innerHTML = '<div class="msg msg-ok">✓ Contraseña actualizada correctamente</div>';
    document.getElementById('cp-actual').value = '';
    document.getElementById('cp-nueva').value = '';
    document.getElementById('cp-confirmar').value = '';
  }

  return { renderForm, cambiar };
})();
