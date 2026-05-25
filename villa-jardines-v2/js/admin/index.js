const AdminApp = (() => {
  const TABS = ['inicio','asistencia','vecinos','pagos','documentos','historico','reportes'];
  const MOD  = {
    inicio: AdminInicio,
    asistencia: AdminAsistencia,
    vecinos: AdminVecinos,
    pagos: AdminPagos,
    documentos: AdminDocumentos,
    historico: AdminHistorico,
    reportes: AdminReportes
  };
  function tab(name) {
    document.querySelectorAll('#admin-nav .nav-btn').forEach((b,i) => b.classList.toggle('active', TABS[i] === name));
    MOD[name]?.render();
  }
  return { tab };
})();
