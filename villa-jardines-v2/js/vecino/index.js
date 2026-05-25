const VecinoApp = (() => {
  const TABS = ['inicio','faltas','pagos','documentos'];
  const MOD  = { inicio: VecinoInicio, faltas: VecinoFaltas, pagos: VecinoPagos, documentos: VecinoDocumentos };
  function tab(name) {
    document.querySelectorAll('#vecino-nav .nav-btn').forEach((b,i)=>b.classList.toggle('active',TABS[i]===name));
    MOD[name]?.render();
  }
  return { tab };
})();
