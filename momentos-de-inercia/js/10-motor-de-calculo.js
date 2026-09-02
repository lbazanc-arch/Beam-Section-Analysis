// ═══════════════════════════════════════════════════════════
//  CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════

// ── Panel de control estándar BSA (dos niveles) ──
const SECCIONES = {
  conf:{titulo:'Configuración', btn:'rbConf'},
  fig:{titulo:'Figuras', btn:'rbFig'}
};
let seccionAbierta = null;

function posicionarToggle(){
  const p = document.getElementById('leftPanel');
  const f = document.getElementById('panelFlyout');
  const b = document.getElementById('panelToggle');
  if(!p || !b) return;
  const rail = !p.classList.contains('plegado');
  const fly  = f && !f.classList.contains('plegado');
  b.classList.toggle('corrido', rail);
  b.classList.toggle('expandido', rail && fly);
}
function togglePanel(){
  const p = document.getElementById('leftPanel');
  if(!p) return;
  const seCierra = !p.classList.contains('plegado');
  p.classList.toggle('plegado');
  if(seCierra) cerrarSeccion();
  posicionarToggle();
  setTimeout(()=>{ try{ resizeCanvas(); }catch(e){} }, 240);
}
function abrirSeccion(id){
  const f = document.getElementById('panelFlyout');
  if(!f || !SECCIONES[id]) return;
  if(seccionAbierta === id && !f.classList.contains('plegado')){ cerrarSeccion(); return; }
  seccionAbierta = id;
  Object.keys(SECCIONES).forEach(k=>{
    const c = document.getElementById('sec_' + k);
    if(c) c.style.display = (k===id) ? '' : 'none';
    const b = document.getElementById(SECCIONES[k].btn);
    if(b) b.classList.toggle('active', k===id);
  });
  document.getElementById('flyoutTitulo').textContent = SECCIONES[id].titulo;
  f.classList.remove('plegado');
  posicionarToggle();
  setTimeout(()=>{ try{ resizeCanvas(); }catch(e){} }, 240);
}
function cerrarSeccion(){
  const f = document.getElementById('panelFlyout');
  if(f) f.classList.add('plegado');
  seccionAbierta = null;
  Object.keys(SECCIONES).forEach(k=>{
    const b = document.getElementById(SECCIONES[k].btn);
    if(b) b.classList.remove('active');
  });
  posicionarToggle();
  setTimeout(()=>{ try{ resizeCanvas(); }catch(e){} }, 240);
}


// El lienzo del Cap. 10 ya se desplaza arrastrando; el botón solo lo recuerda.
// ── Guardar el ejercicio con nombre (máx. 10) ──
const MAX_PROYECTOS = 10;




// Elimina la figura seleccionada en el panel de dibujo.
function eliminarFiguraSel(){
  // Si hay varias marcadas con Mover / editar se borran todas de una vez, en
  // un solo paso de historial. Si no, se borra la figura activa.
  if(selFiguras.length){
    registrarCambio();
    const aBorrar = selFiguras.slice();
    figures = figures.filter(f=>aBorrar.indexOf(f.id) < 0);
    selFiguras = [];
    if(aBorrar.indexOf(selectedFigId) >= 0) selectFigure(null);
    actualizarInfoSel();
    results = null; renderFigList(); render(); cerrarEdicionSiSobra();
    return;
  }
  if(selectedFigId === null || selectedFigId === undefined || !figures.some(f=>f.id===selectedFigId)){
    aviso('Primero selecciona una figura, en el panel de dibujo o en la lista de Figuras.');
    return;
  }
  deleteFigure(selectedFigId);
}
