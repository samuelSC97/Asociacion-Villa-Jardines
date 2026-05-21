const AdminApp = (() => {
  const TABS = ['inicio','asistencia','vecinos','pagos','documentos'];
  const MOD  = { inicio: AdminInicio, asistencia: AdminAsistencia, vecinos: AdminVecinos, pagos: AdminPagos, documentos: AdminDocumentos };
  function tab(name) {
    document.querySelectorAll('#admin-nav .nav-btn').forEach((b,i)=>b.classList.toggle('active',TABS[i]===name));
    MOD[name]?.render();
  }
  return { tab };
})();
