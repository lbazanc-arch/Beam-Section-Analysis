// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let unit = 'mm';
let unitLabel = 'mm';
let figures = [];        // list of placed figures
let selectedFigId = null;
let selectedFigType = null; // type being placed
let ghostPos = null;     // {x,y} in world coords for ghost
let figIdCounter = 0;
let results = null;
let notationExp = 0; // 0=auto, 2=×10², 4=×10⁴, 6=×10⁶, 9=×10⁹

// Canvas transform
let viewTx = 0, viewTy = 0, viewScale = 1;
// ── Avisos no bloqueantes (sustituyen a alert) ──
// Los diálogos nativos del navegador quedan silenciados en móvil: el usuario
// tocaba un botón, la función salía por su `return` temprano y no aparecía
// absolutamente nada en pantalla.
let _avisoTimer = null;
function aviso(msg, tipo){
  let c = document.getElementById('avisoCaja');
  if(!c){
    c = document.createElement('div');
    c.id = 'avisoCaja';
    c.className = 'aviso-caja';
    const t = document.createElement('span'); t.id = 'avisoTxt';
    const x = document.createElement('button');
    x.className = 'aviso-x'; x.type = 'button';
    x.setAttribute('aria-label','Cerrar aviso');
    x.textContent = '\u00d7';
    x.addEventListener('click', cerrarAviso);
    c.appendChild(t); c.appendChild(x);
    document.body.appendChild(c);
  }
  document.getElementById('avisoTxt').textContent = msg;
  c.classList.toggle('error', tipo === 'error');
  c.classList.add('visible');
  if(_avisoTimer) clearTimeout(_avisoTimer);
  _avisoTimer = setTimeout(cerrarAviso, 4500);
}

// ── Visibilidad de capas del dibujo ──
// Solo afecta a lo que se ve; el cálculo usa siempre el modelo completo.
const VIS = {grilla:true, ejes:true, cotas:true, centroide:true};
function setVis(cual, valor){ VIS[cual] = !!valor; render(); }

let isDragging = false, dragStart = null, dragViewStart = null;
// Botón unificado "Mover / editar", mismo sistema de gestos que cap6 y cap9: al
// pulsar NO se decide todavía si es un toque (marca), un arrastre sobre una
// figura (la mueve), un arrastre rápido en vacío (desplaza la vista) o uno
// sostenido en vacío (recuadro de selección múltiple). Se resuelve en
// onMouseMove/onMouseUp según haya arrastre, sobre qué, y si se sostuvo antes.
let gesto = null;
const UMBRAL_ARRASTRE = 4;        // px en pantalla antes de considerarlo arrastre
const UMBRAL_MANTENER_MS = 450;   // ms sosteniendo en vacío antes de armar el recuadro
let isDraggingFig = false, dragFigId = null, dragFigOffset = null;
let dragAnchorId = null; // which anchor point is being dragged

const COLORS = ['#e2aa1b','#e8734f','#9c5fd6','#2f9e6f','#e0527a','#2fa8a0','#a67c52','#c94f4f'];
let colorIdx = 0;
