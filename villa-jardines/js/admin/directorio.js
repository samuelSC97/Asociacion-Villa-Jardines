const AdminDirectorio = (() => {
  let _estructura = [];

  async function render() {
    const el = document.getElementById('admin-body');
    el.innerHTML = '<div class="loading-inline">Cargando...</div>';
    const grupos = await VecinoContactos.cargar();
    _estructura = grupos.map(g => ({ titulo: g.titulo, count: g.items.length }));

    el.innerHTML = `
      <div class="sec-title" style="margin-top:0">Directorio de contactos</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Los cambios se guardan en la base de datos y son visibles para todos los vecinos.</div>
      ${grupos.map((g, gi) => `
        <div class="card" style="margin-bottom:10px">
          <div class="card-title">${esc(g.titulo)}</div>
          ${g.items.map((item, ii) => `
            <div class="grid-3" style="margin-bottom:8px;gap:6px">
              <div class="field" style="margin:0"><label style="font-size:10px">Cargo/Servicio</label><input type="text" id="dir-${gi}-${ii}-n" value="${esc(item.nombre)}" placeholder="Cargo"></div>
              <div class="field" style="margin:0"><label style="font-size:10px">Nombre</label><input type="text" id="dir-${gi}-${ii}-p" value="${esc(item.persona)}" placeholder="Opcional"></div>
              <div class="field" style="margin:0"><label style="font-size:10px">Teléfono</label><input type="text" id="dir-${gi}-${ii}-t" value="${esc(item.telefono)}" placeholder="9XXXXXXXX"></div>
            </div>`).join('')}
        </div>`).join('')}
      <button class="btn btn-dark" onclick="AdminDirectorio.guardar()">💾 Guardar cambios</button>`;
  }

  async function guardar() {
    const grupos = _estructura.map((g, gi) => ({
      titulo: g.titulo,
      items: Array.from({ length: g.count }, (_, ii) => ({
        nombre:   (document.getElementById(`dir-${gi}-${ii}-n`)?.value || '').trim(),
        persona:  (document.getElementById(`dir-${gi}-${ii}-p`)?.value || '').trim(),
        telefono: (document.getElementById(`dir-${gi}-${ii}-t`)?.value || '').trim()
      }))
    }));
    showLoading();
    const { error } = await db.from('config_app')
      .upsert({ clave: 'directorio', valor: JSON.stringify(grupos) });
    hideLoading();
    if (error) showToast('Error: ' + error.message, 'err');
    else showToast('✓ Directorio actualizado');
  }

  return { render, guardar };
})();
