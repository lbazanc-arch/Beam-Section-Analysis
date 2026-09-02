function renderKatex(root){
  if(!window.katex) return;
  root.querySelectorAll('.ktx').forEach(el=>{
    if(el.getAttribute('data-done')) return;
    try{ katex.render(el.getAttribute('data-tex'), el, {throwOnError:false, displayMode: el.getAttribute('data-display')==='1'}); el.setAttribute('data-done','1'); }
    catch(e){ el.textContent = el.getAttribute('data-tex'); }
  });
}

// ═══════════════════════════════════════════════════════════
//  BSA — Cap. 6 · Análisis de armaduras (método de nudos)
//  Etapa 1: dibujo libre + plantillas, determinación, reacciones,
//  miembros de fuerza cero y desarrollo nudo por nudo.
// ═══════════════════════════════════════════════════════════

// ── Estado ──
let nodos = [];      // {id, x, y, apoyo:null|'fijo'|'movil', fx, fy}
let barras = [];     // {id, a, b}
let nodoSeq = 0, barraSeq = 0;
let tool = 'pan';
// (la variable 'modo' se retiró con el conmutador Dibujo libre/Plantilla)
let tipoTpl = 'howe';
let selNodo = null;      // primer nudo al trazar una barra
let dragNodo = null;
let nodoCarga = null;    // nudo al que se le está poniendo carga
let resultado = null;
let selBarra = null;     // barra con el recuadro de valor visible
let selNodoInfo = null;  // nudo con el recuadro de datos visible
let selNodos = [];       // ids de nudos seleccionados (herramienta Seleccionar)
let selBarras = [];      // ids de barras seleccionadas
// ── Motor unificado de selección/transformación (botón "Mover / editar") ──
let gesto = null;        // {tipo:'tap'|'mover'|'rubber', ...} en curso durante el mousedown actual
// Al arrastrar sobre una zona vacía con "Mover/editar" o "Eliminar": si el
// arrastre empieza ANTES de este tiempo sosteniendo el dedo/clic, se
// interpreta como desplazamiento del panel (igual que la herramienta Pan).
// Solo si se mantiene presionado más que esto, un arrastre posterior traza
// el recuadro de selección/borrado masivo.
const UMBRAL_MANTENER_MS = 450;

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
let subTab = 'nodos';
let edNodoId = null, edBarraId = null;

let unitLen = 'm', unitFor = 'kN';
let DEC = {len:2, fuerza:2};

// Vista
let vx = 0, vy = 0, escala = 45;   // px por unidad de longitud
let cv, ctx, W = 0, H = 0;

const LEN_A_M = {m:1, cm:0.01, mm:0.001, ft:0.3048};
const FOR_A_KN = {kN:1, N:0.001, ton:9.80665, kg:0.00980665, lb:0.00444822};

// ── Utilidades numéricas ──
function dec(v, tipo){
  const d = tipo === 'len' ? DEC.len : DEC.fuerza;
  const n = Number(v);
  if(!isFinite(n)) return '0';
  const r = Math.abs(n) < 5e-11 ? 0 : n;   // evita "-0.00"
  return r.toFixed(d);
}
// ── Truncamiento adaptativo a cero ──
// Un umbral absoluto fijo falla en los dos extremos: con cargas de miles de
// kN deja pasar residuos numéricos visibles, y con cargas muy pequeñas
// borra fuerzas legítimas. Se usa ε = 1e-6 relativo a la magnitud del
// problema (la mayor carga aplicada), con un piso absoluto de seguridad.
function escalaDelProblema(){
  let m = 0;
  nodos.forEach(n=>{
    m = Math.max(m, Math.abs(n.fx||0), Math.abs(n.fy||0));
  });
  return m;
}
function esCero(v){
  if(!isFinite(v)) return false;
  const umbral = Math.max(1e-9, 1e-6 * escalaDelProblema());
  return Math.abs(v) < umbral;
}

// ── Conversión de coordenadas ──
function aPantalla(x, y){ return [W/2 + (x - vx)*escala, H/2 - (y - vy)*escala]; }
function aMundo(px, py){ return [(px - W/2)/escala + vx, (H/2 - py)/escala + vy]; }
function snap(v){
  // El enganche sigue al paso visible de la rejilla (media división),
  // así funciona igual en metros que en centímetros.
  const p = pasoRejilla()/2;
  return Math.round(v/p)*p;
}
