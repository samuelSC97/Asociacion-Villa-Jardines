// js/admin/index.js — Controlador principal del panel admin
const AdminApp = (() => {
  const TABS = ['inicio', 'asistencia', 'vecinos', 'pagos', 'documentos'];
  const MODULES = {
    inicio:      AdminInicio,
    asistencia:  AdminAsistencia,
    vecinos:     AdminVecinos,
    pagos:       AdminPagos,
    documentos:  AdminDocumentos
  };

  function tab(name) {
    // Actualizar nav
    document.querySelectorAll('#admin-nav .nav-btn').forEach((btn, i) => {
      btn.classList.toggle('active', TABS[i] === name);
    });
    // Renderizar módulo
    MODULES[name]?.render();
  }

  return { tab };
})();
