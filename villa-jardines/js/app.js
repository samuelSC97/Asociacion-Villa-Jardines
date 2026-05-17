// js/app.js — Inicialización
window.addEventListener('DOMContentLoaded', () => {
  hideLoading();
  showScreen('s-login');

  // Actualizar login.css inline si no está en el head
  const style = document.createElement('style');
  style.textContent = `
    #s-login { align-items:center; justify-content:center; padding:24px; background:var(--bg); }
    .login-wrap { width:100%; max-width:360px; }
    .login-logo { text-align:center; margin-bottom:28px; }
    .login-icon { width:56px;height:56px;background:var(--text);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:10px; }
    .login-logo h1 { font-size:22px;font-weight:700;letter-spacing:-.4px; }
    .login-logo p  { color:var(--text2);font-size:13px;margin-top:3px; }
    .login-card { background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:20px;box-shadow:var(--shadow-md); }
    .tab-row { display:flex;background:var(--bg2);border-radius:var(--r-sm);padding:3px;margin-bottom:18px; }
    .tab-btn { flex:1;padding:7px;border:none;background:transparent;border-radius:5px;font-family:var(--font);font-size:13px;font-weight:500;cursor:pointer;color:var(--text2);transition:all .15s; }
    .tab-btn.active { background:var(--card);color:var(--text);font-weight:600;box-shadow:var(--shadow); }
    .login-hint { text-align:center;font-size:11px;color:var(--text3);margin-top:16px; }
    .loading-inline { color:var(--text2);font-size:13px;padding:24px 0;text-align:center; }
  `;
  document.head.appendChild(style);
});
