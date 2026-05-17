// js/auth.js — Login, logout, sesión
const Auth = (() => {
  let _vecinoActual = null;

  function getVecino() { return _vecinoActual; }

  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b, i) =>
      b.classList.toggle('active', (tab === 'admin' && i === 0) || (tab === 'vecino' && i === 1))
    );
    document.getElementById('login-admin-form').style.display = tab === 'admin' ? 'block' : 'none';
    document.getElementById('login-vecino-form').style.display = tab === 'vecino' ? 'block' : 'none';
    document.getElementById('l-msg').innerHTML = '';
  }

  async function doLogin() {
    const user = (document.getElementById('l-user').value || '').trim();
    const pass = document.getElementById('l-pass').value;
    showLoading();
    const { data, error } = await db
      .from('usuarios')
      .select('*')
      .eq('username', user)
      .eq('password_hash', pass)
      .eq('rol', 'admin')
      .single();
    hideLoading();
    if (data) {
      showScreen('s-admin');
      AdminApp.tab('inicio');
    } else {
      document.getElementById('l-msg').innerHTML =
        '<div class="msg msg-err">Usuario o contraseña incorrecta</div>';
    }
  }

  async function buscarVecino() {
    const q = (document.getElementById('l-busca').value || '').trim();
    const res = document.getElementById('l-resultados');
    if (q.length < 2) { res.innerHTML = ''; return; }
    const { data } = await db
      .from('vecinos')
      .select('*')
      .or(`nombre.ilike.%${q}%,dni.ilike.%${q}%`)
      .limit(6);
    if (!data || !data.length) {
      res.innerHTML = '<div class="msg msg-err">No encontrado. Pide al administrador que registre tu DNI.</div>';
      return;
    }
    res.innerHTML = '<div class="search-res">' +
      data.map(v => `
        <div class="search-item" onclick="Auth.loginVecino(${v.id})">
          <div class="avatar">${initials(v.nombre)}</div>
          <div>
            <div style="font-size:13px;font-weight:500">${v.nombre}</div>
            <div style="font-size:11px;color:var(--text2)">Mz ${v.mz} — Lote ${v.lote}</div>
          </div>
        </div>`).join('') + '</div>';
  }

  async function loginVecino(id) {
    showLoading();
    const { data: v } = await db.from('vecinos').select('*').eq('id', id).single();
    hideLoading();
    if (!v) return;
    _vecinoActual = v;
    document.getElementById('v-nombre').textContent = v.nombre.split(',')[0].trim();
    document.getElementById('v-sub').textContent = `Mz ${v.mz} — Lote ${v.lote}`;
    showScreen('s-vecino');
    VecinoApp.tab('inicio');
  }

  function logout() {
    _vecinoActual = null;
    document.getElementById('l-pass').value = '';
    document.getElementById('l-busca').value = '';
    document.getElementById('l-resultados').innerHTML = '';
    document.getElementById('l-msg').innerHTML = '';
    showScreen('s-login');
  }

  return { switchTab, doLogin, buscarVecino, loginVecino, logout, getVecino };
})();
