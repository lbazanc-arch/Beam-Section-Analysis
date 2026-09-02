/* ── Avisos no bloqueantes ──
   El diálogo nativo queda silenciado en móvil: la acción parecía no tener efecto. */
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

function renderKatex(root){
  if(!window.katex) return;
  root.querySelectorAll('.ktx').forEach(el=>{
    if(el.getAttribute('data-done')) return;
    try{ katex.render(el.getAttribute('data-tex'), el, {throwOnError:false, displayMode: el.getAttribute('data-display')==='1'}); el.setAttribute('data-done','1'); }
    catch(e){ el.textContent = el.getAttribute('data-tex'); }
  });
}

// ═══════════════════════════════════════════════════════════
//  BSA — Cap. 7 · Fuerzas internas en vigas y pórticos
//  La viga se construye como una cadena de tramos entre nudos con
//  coordenadas, de modo que puede tener tramos inclinados. Las
//  fuerzas internas se obtienen sobre el EJE LOCAL de cada tramo.
// ═══════════════════════════════════════════════════════════
let nodos = [];    // {id,x,y,nombre,apoyo:'libre'|'movil'|'simple'|'empotrado',rotula:bool}
let tramos = [];   // {id,a,b}
let cargas = [];   // {id,tipo,tramo,pos,pos2,mag,mag2}
let nodoSeq = 0, tramoSeq = 0, cargaSeq = 0;
let tool = 'pan', modoConstr = 'nudos', modoEdic = 'nudos';
let selNodos = [], selTramos = [], selCargas = [];
let selNodo = null, selTramo = null, primerNodo = null;
let gesto = null;   // gesto unificado del botón "Mover / editar" (criterio cap9)
const UMBRAL_ARRASTRE = 4, UMBRAL_MANTENER_MS = 450;
let R = null;
let unitLen = 'm', unitFor = 'kN';
let DEC = {len:2, fuerza:2, momento:2};
let cv, ctx, W = 0, H = 0, vx = 0, vy = 0, escala = 60;
let panDrag = null, mouseW = null;

// ── Visibilidad de capas del dibujo (criterio cap6) ──
// Solo afecta a lo que se ve; el cálculo usa siempre el modelo completo.
const VIS = {grilla:true, ejes:true, cotas:true, cargas:true, apoyos:true};
function setVis(cual, valor){ VIS[cual] = !!valor; dibujar(); }
let edNodo = null, edTramo = null, edApoyo = null, edCarga = null;

const LEN_A_M = {m:1, cm:0.01, ft:0.3048};
const FOR_A_KN = {kN:1, N:0.001, ton:9.80665, lb:0.00444822};
const GRADOS = {libre:0, movil:1, simple:2, empotrado:3};
// Rotación por defecto de un apoyo: colgando hacia abajo.
const AP_ANG_DEF = -90;
// Dirección (radianes, plano con y hacia arriba) en la que EMPUJA la
// reacción de un apoyo orientado: opuesta a la rotación del símbolo.
function angReaccion(n){
  const a = (n.apAng === undefined) ? AP_ANG_DEF : n.apAng;
  return (a + 180) * Math.PI/180;
}
const NOMBRE_APOYO = {libre:'Libre', movil:'Móvil', simple:'Simple / articulado', empotrado:'Empotrado'};

function dec(v,t){
  const d = t==='len' ? DEC.len : (t==='mom' ? DEC.momento : DEC.fuerza);
  const n = Number(v);
  if(!isFinite(n)) return '0';
  return (Math.abs(n) < 5e-11 ? 0 : n).toFixed(d);
}
function esCero(v){ return Math.abs(v) < 1e-9; }
function kx(tex){
  const e = String(tex).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
                       .replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<span class="ktx" data-tex="'+e+'"></span>';
}
function uMom(){ return unitFor+'·'+unitLen; }
function uDist(){ return unitFor+'/'+unitLen; }
function nombreNodo(i){ const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return i<26?L[i]:L[i%26]+Math.floor(i/26); }
function reNombrar(){ nodos.forEach((n,i)=>n.nombre = nombreNodo(i)); }
function nodo(id){ return nodos.find(n=>n.id===id); }
function nomTramo(t){ const a=nodo(t.a), b=nodo(t.b); return (a&&b)? a.nombre+b.nombre : '?'; }

// ── Geometría de un tramo ──
function geoTramo(t){
  const a = nodo(t.a), b = nodo(t.b);
  if(!a||!b) return null;
  const dx = b.x-a.x, dy = b.y-a.y;
  const L = Math.hypot(dx,dy) || 1e-9;
  return {a, b, dx, dy, L, ux:dx/L, uy:dy/L, nx:-dy/L, ny:dx/L,
          ang: Math.atan2(dy,dx)*180/Math.PI};
}
// La cadena en orden: se recorre desde un extremo
function cadena(){
  if(!tramos.length) return [];
  const ady = {}; nodos.forEach(n=>ady[n.id]=[]);
  tramos.forEach(t=>{ ady[t.a].push(t); ady[t.b].push(t); });
  let ini = nodos.find(n=>ady[n.id].length===1) || nodos[0];
  const orden = [], vistos = {};
  let actual = ini, guard = 0;
  while(guard++ < 200){
    const sig = ady[actual.id].find(t=>!vistos[t.id]);
    if(!sig) break;
    vistos[sig.id] = true;
    const otro = nodo(sig.a===actual.id ? sig.b : sig.a);
    orden.push({t:sig, desde:actual, hasta:otro});
    actual = otro;
  }
  return orden;
}
