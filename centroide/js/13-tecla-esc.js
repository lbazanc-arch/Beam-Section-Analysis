// ═══════════════════════════════════════════════════════════
//  TECLA ESC  (mismo contrato que manejarEsc() de cap6)
// ═══════════════════════════════════════════════════════════
// Orden de prioridad: primero cierra lo más "encima" que haya abierto y se
// detiene ahí. Así una sola pulsación nunca deshace dos cosas a la vez.
const MODALES_ESC = ['edFigModal','transModal','repModal','guardarModal',
                     'unitsModal','decModal','histModal'];
function manejarEsc(){
  // 0) La ventana del informe PDF, que se superpone a todo
  const pl = document.getElementById('panelLatexPDF');
  if(pl && pl.style.display !== 'none' && pl.style.display !== ''){ cerrarPanelLatex(); return; }
  // 1) Una ventana abierta
  const abierto = MODALES_ESC.find(id=>{
    const m = document.getElementById(id);
    return m && m.classList.contains('show');
  });
  if(abierto){
    if(abierto === 'edFigModal') cerrarEdicionFigura();   // devuelve el panel a la columna
    else document.getElementById(abierto).classList.remove('show');
    return;
  }
  // 2) Un menú desplegable de la barra
  const menu = ['menuFiguras','menuTipoCuerpo'].find(id=>{
    const m = document.getElementById(id);
    return m && m.classList.contains('abierto');
  });
  if(menu){ cerrarMenusZona1(); return; }
  // 3) Un aviso en pantalla
  const av = document.getElementById('avisoCaja');
  if(av && av.classList.contains('visible')){ cerrarAviso(); return; }
  // 4) Un gesto de arrastre a medias (recuadro incluido)
  if(gesto || isDragging || isDraggingFig){ cancelarGestoEnCurso(); render(); return; }
  // 5) La colocación de una figura pendiente de clic
  if(selectedFigType){
    selectedFigType = null; ghostPos = null;
    document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
    canvas.style.cursor = (herramienta==='pan') ? 'grab' : 'default';
    render(); return;
  }
  // 6) La selección actual
  if(selFiguras.length || selectedFigId !== null){
    selFiguras = []; selectFigure(null); actualizarInfoSel(); render(); return;
  }
  // 7) La herramienta de borrado, para no dejarla armada sin darse cuenta
  if(herramienta === 'borrar'){ setHerramienta('pan'); }
}
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape') manejarEsc();
});
