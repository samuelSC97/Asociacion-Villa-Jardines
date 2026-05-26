const Modal = (() => {
  let _callback = null;

  function pedir(mensaje, callback) {
    _callback = callback;
    document.getElementById('modal-msg').textContent  = mensaje;
    document.getElementById('modal-pass').value       = '';
    document.getElementById('modal-err').textContent  = '';
    const ov = document.getElementById('modal-overlay');
    ov.style.display = 'flex';
    setTimeout(() => document.getElementById('modal-pass').focus(), 100);
  }

  async function confirmar() {
    const pass = document.getElementById('modal-pass').value;
    if (!pass) { document.getElementById('modal-err').textContent = 'Ingresa la contraseña'; return; }
    showLoading();
    const { error } = await db.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pass });
    hideLoading();
    if (error) { document.getElementById('modal-err').textContent = 'Contraseña incorrecta'; return; }
    const cb = _callback;
    cancelar();
    if (cb) cb();
  }

  function cancelar() {
    document.getElementById('modal-overlay').style.display = 'none';
    _callback = null;
  }

  return { pedir, confirmar, cancelar };
})();
