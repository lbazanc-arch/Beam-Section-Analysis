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
let isDragging = false, dragStart = null, dragViewStart = null;
let isDraggingFig = false, dragFigId = null, dragFigOffset = null;
let dragAnchorId = null; // which anchor point is being dragged
// Botón unificado "Mover / editar", mismo sistema de gestos que Cap. 6: no
// se decide de inmediato si un toque es selección, arrastre de figura, pan
// temporal o recuadro de selección múltiple — se resuelve en el propio
// gesto según haya arrastre, sobre qué, y si se sostuvo antes de moverse.
let gesto = null;
const UMBRAL_ARRASTRE = 4;        // px en pantalla antes de considerar arrastre
const UMBRAL_MANTENER_MS = 450;   // ms sosteniendo en vacío antes de armar el recuadro

// ── Avisos no bloqueantes (sustituyen a alert) ──
// Los diálogos nativos del navegador quedan silenciados en móvil: el usuario
// tocaba un botón, la función salía por su `return` temprano y no aparecía
// absolutamente nada en pantalla. Este aviso se dibuja dentro de la página,
// así que se ve en cualquier dispositivo y no bloquea el hilo.
let _avisoTimer = null;
function aviso(msg, tipo){
  let c = document.getElementById('avisoCaja');
  if(!c){
    c = document.createElement('div');
    c.id = 'avisoCaja';
    c.className = 'aviso-caja';
    const t = document.createElement('span');
    t.id = 'avisoTxt';
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

const COLORS = ['#e2aa1b','#e8734f','#9c5fd6','#2f9e6f','#e0527a','#2fa8a0','#a67c52','#c94f4f'];
let colorIdx = 0;
// Modo del cuerpo: homogéneo (un solo material) o heterogéneo (peso específico por figura)
let modoCuerpo = 'homogeneo';
// Heredadas del análisis de inercia: no se usan en el capítulo 9,
// pero varias funciones auxiliares las consultan.
let extraPoint = null;
let axisAngle  = null;
// Materiales que define el propio estudiante: γ₁, γ₂, γ₃…
// Se declaran una sola vez y luego se asignan a cada figura.
let MATS = [];              // [{id:1, val:50, unidad:'ton/m³', nombre:''}]
let matSeq = 0;
let matMagnitud = 'peso';   // 'peso' (γ) o 'densidad' (ρ)
// Unidad de fuerza: define la del peso específico (fuerza/volumen) y la del peso
let unitForce = 'ton';

// γ se expresa en fuerza/longitud³ ; ρ en masa/longitud³
function uGamma(){
  return matMagnitud==='densidad' ? ('kg/'+unit+'\u00B3') : (unitForce+'/'+unit+'\u00B3');
}
function matSimbolo(){ return matMagnitud==='densidad' ? 'ρ' : 'γ'; }
function matPorId(id){ return MATS.find(m=>m.id===id) || null; }
