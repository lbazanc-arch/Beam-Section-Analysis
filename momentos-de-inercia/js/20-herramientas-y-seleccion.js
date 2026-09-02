// ═══════════════════════════════════════════════════════════
//  HERRAMIENTAS Y SELECCIÓN MÚLTIPLE
// ═══════════════════════════════════════════════════════════
// Mismo sistema excluyente que en los Cap. 6, 7 y 9: 'pan' desplaza la vista,
// 'sel' permite marcar varias figuras para Transformar y Replicar.

function setHerramienta(t){
  herramienta = t;
  ['pan','sel'].forEach(k=>{
    const b = document.getElementById('t' + k.charAt(0).toUpperCase() + k.slice(1));
    if(b) b.classList.toggle('active', k === t);
  });
  // El botón Eliminar no sigue el patrón de id 't'+Nombre: se marca aparte.
  const bd = document.getElementById('btnDel');
  if(bd) bd.classList.toggle('active', t === 'borrar');
  // Un cambio de herramienta cancela cualquier gesto a medias.
  if(gesto){
    if(gesto.tEsperaId) clearTimeout(gesto.tEsperaId);
    gesto = null;
  }
  ocultarRecuadroSeleccion();
  // Al salir de Mover / editar se limpia TODA la selección, no solo la marca
  // múltiple: antes la figura activa seguía resaltada y su panel abierto.
  if(t !== 'sel'){
    selFiguras = [];
    if(selectedFigId !== null) selectFigure(null);
  }
  const c = document.getElementById('mainCanvas');
  if(c) c.style.cursor = (t === 'pan') ? 'grab' : 'default';
  const hint = document.getElementById('canvasHint');
  const textos = {
    pan: 'Arrastra el lienzo para desplazar la vista.',
    sel: 'Toca para marcar varias figuras \u00b7 arr\u00e1strala para moverla \u00b7 doble clic para editarla \u00b7 mant\u00e9n presionado en vac\u00edo y arrastra para encerrar varias.',
    borrar: 'Toca una figura para borrarla \u00b7 sobre zona vac\u00eda, mant\u00e9n presionado y luego arrastra para encerrar y borrar varias.'
  };
  if(hint && textos[t]) hint.textContent = textos[t];
  actualizarInfoSel();
  render();
}

// togglePanTool solo alternaba una clase CSS: el botón se pintaba de activo
// pero no cambiaba ninguna herramienta. Ahora entra en el sistema excluyente.
function togglePanTool(){ setHerramienta('pan'); }

function alternarSelFigura(id){
  const i = selFiguras.indexOf(id);
  if(i >= 0) selFiguras.splice(i, 1); else selFiguras.push(id);
  actualizarInfoSel();
}
