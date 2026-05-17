// js/vecino/index.js — Controlador vista vecino
const VecinoApp = (() => {
  const TABS = ['inicio', 'faltas', 'pagos', 'documentos'];
  const MODULES = {
    inicio:      VecinoInicio,
    faltas:      VecinoFaltas,
    pagos:       VecinoPagos,
    documentos:  VecinoDocumentos
  };

  function tab(name) {
    document.querySelectorAll('#vecino-nav .nav-btn').forEach((btn, i) => {
      btn.classList.toggle('active', TABS[i] === name);
    });
    MODULES[name]?.render();
  }

  return { tab };
})();
