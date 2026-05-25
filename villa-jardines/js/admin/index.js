const AdminApp = (() => {
  const MOD = { inicio: AdminInicio, asistencia: AdminAsistencia, vecinos: AdminVecinos, pagos: AdminPagos, documentos: AdminDocumentos, directorio: AdminDirectorio };

  function tab(name) {
    document.querySelectorAll('#admin-nav .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    const subBar = document.getElementById('nav-sub-pagos');
    if (subBar) {
      const show = name === 'pagos';
      subBar.classList.toggle('visible', show);
      if (show) {
        const sec = AdminPagos.getSec();
        subBar.querySelectorAll('.sub-btn').forEach(b => b.classList.toggle('active', b.dataset.sec === sec));
      }
    }
    MOD[name]?.render();
  }

  function navPago(sec) {
    document.querySelectorAll('#admin-nav .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'pagos'));
    const subBar = document.getElementById('nav-sub-pagos');
    if (subBar) {
      subBar.classList.add('visible');
      subBar.querySelectorAll('.sub-btn').forEach(b => b.classList.toggle('active', b.dataset.sec === sec));
    }
    AdminPagos.sec(sec);
  }

  return { tab, navPago };
})();
