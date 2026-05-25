const Auth = (() => {
  let _vecino = null;
  function getVecino() { return _vecino; }

  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('login-admin-form').style.display  = tab === 'admin'  ? 'block' : 'none';
    document.getElementById('login-vecino-form').style.display = tab === 'vecino' ? 'block' : 'none';
    document.getElementById('l-msg').innerHTML        = '';
    document.getElementById('l-resultados').innerHTML = '';
  }

  async function doLogin() {
    const pass = document.getElementById('l-pass').value;
    const msg  = document.getElementById('l-msg');
    if (!pass) { msg.innerHTML = '<div class="msg msg-err">Ingresa tu contraseña</div>'; return; }
    showLoading();
    const { error } = await db.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pass });
    hideLoading();
    if (error) {
      msg.innerHTML = '<div class="msg msg-err">Contraseña incorrecta</div>';
    } else {
      showScreen('s-admin');
      AdminApp.tab('inicio');
    }
  }

  async function buscarPorDni() {
    const dni = (document.getElementById('l-dni').value || '').trim();
    const res = document.getElementById('l-resultados');
    if (dni.length < 8) { res.innerHTML = '<div class="msg msg-err">Ingresa tu DNI completo (8 dígitos)</div>'; return; }
    showLoading();
    const { data } = await db.from('vecinos').select('*').eq('dni', dni).eq('activo', true).single();
    hideLoading();
    if (!data) { res.innerHTML = '<div class="msg msg-err">DNI no encontrado. Solicita al administrador que registre tu DNI.</div>'; return; }
    res.innerHTML = `
      <div class="search-res">
        <div class="search-item" onclick="Auth.loginVecino(${data.id})">
          <div class="avatar">${initials(data.nombre)}</div>
          <div>
            <div style="font-size:13px;font-weight:600">${esc(data.nombre)}</div>
            <div style="font-size:11px;color:var(--text2)">Mz ${esc(data.mz)} — Lote ${esc(data.lote)}</div>
          </div>
          <span class="pill pill-green" style="margin-left:auto">Entrar →</span>
        </div>
      </div>`;
  }

  async function loginVecino(id) {
    showLoading();
    const { data: v } = await db.from('vecinos').select('*').eq('id', id).single();
    hideLoading();
    if (!v) return;
    _vecino = v;
    document.getElementById('v-nombre').textContent = v.nombre.split(',')[0].trim();
    document.getElementById('v-sub').textContent    = `Mz ${v.mz} — Lote ${v.lote}`;
    showScreen('s-vecino');
    VecinoApp.tab('inicio');
  }

  async function logout() {
    if (!_vecino) await db.auth.signOut();
    _vecino = null;
    document.getElementById('l-pass').value          = '';
    document.getElementById('l-dni').value           = '';
    document.getElementById('l-resultados').innerHTML = '';
    document.getElementById('l-msg').innerHTML        = '';
    showScreen('s-login');
  }

  async function checkSession() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
      hideLoading();
      showScreen('s-admin');
      AdminApp.tab('inicio');
    } else {
      hideLoading();
      showScreen('s-login');
    }
  }

  return { switchTab, doLogin, buscarPorDni, loginVecino, logout, getVecino, checkSession };
})();
