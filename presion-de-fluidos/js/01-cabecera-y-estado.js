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
    x.textContent = '×';
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
//  BSA — Presión de fluidos sobre compuertas (Hibbeler §9.5, Beer §5.9)
//  La compuerta se arma por tramos encadenados; a cada lado de ella hay una
//  ZONA que puede tener líquido (una o varias capas). Sobre cada tramo actúa,
//  por cada zona con líquido, una resultante propia aplicada en su centro de
//  presión. El conjunto se resuelve por equilibrio: reacciones de los apoyos
//  y fuerza de los topes.
// ═══════════════════════════════════════════════════════════
let nodos = [];     // {id,x,y,nombre,apoyo:null|'fijo'|'movil',apAng,apModo:'angulo'|'normal',
                    //  apAngFijo (giro del apoyo fijo: SOLO dibujo, nunca cálculo),
                    //  rotula:bool,tope:null|{ang,modo:'normal'|'angulo',lado:1|2}}
let tramos = [];    // {id,a,b,tipo:'recto'|'arco',flecha,activo,invertir}
let nodoSeq = 0, tramoSeq = 0;
let tool = 'pan', selNodo = null;
let gesto = null;   // gesto unificado del botón "Mover / editar" (criterio cap9)
const UMBRAL_ARRASTRE = 4, UMBRAL_MANTENER_MS = 450;
let selN = [], selT = [], infoNodo = null, infoTramo = null;
let apoyoId = null, topeId = null;
let R = null;
let unitLen = 'm', unitFor = 'kN';
let DEC = {len:2, fuerza:2};
let cv, ctx, W = 0, H = 0, vx = 0, vy = 0, escala = 60;
let mouseW = null;

// ── Visibilidad de capas del dibujo (criterio cap6/cap7) ──
// Solo afecta a lo que se ve; el cálculo usa siempre el modelo completo.
const VIS = {grilla:true, apoyos:true, liquidos:true, presion:true, resultantes:true, cotas:true};
function setVis(cual, valor){ VIS[cual] = !!valor; dibujar(); }

const LEN_A_M = {m:1, cm:0.01, ft:0.3048};
const FOR_A_KN = {kN:1, N:0.001, ton:9.80665, lb:0.00444822};

function dec(v,t){
  const d = (t==='len') ? DEC.len : DEC.fuerza;
  const n = Number(v);
  if(!isFinite(n)) return '0';
  return (Math.abs(n)<5e-11?0:n).toFixed(d);
}
function esCero(v){ return Math.abs(v) < 1e-9; }
function num(id,def){ const e=document.getElementById(id); const v=e?parseFloat(e.value):NaN;
  return isFinite(v)?v:(def||0); }
function kx(tex){
  const esc = String(tex).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
                         .replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<span class="ktx" data-tex="'+esc+'"></span>';
}
function uPres(){ return unitFor+'/'+unitLen+'²'; }
function uGamma(){ return unitFor+'/'+unitLen+'³'; }
function nombreNodo(i){ const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return i<26?L[i]:L[i%26]+Math.floor(i/26); }
function reNombrar(){ nodos.forEach((n,i)=>n.nombre = nombreNodo(i)); }
function nodo(id){ return nodos.find(n=>n.id===id); }
function nomTramo(t){
  const a = nodo(t.a), b = nodo(t.b);
  return (a&&b) ? a.nombre+b.nombre : '?';
}

// ── Líquidos por zona ──
// Cada zona tiene sus capas, definidas por la COTA de su nivel superior.
// Físicamente el líquido más liviano flota sobre el más denso, así que el
// programa reordena las capas por densidad y avisa si venían al revés.
let zonas = {1:[], 2:[]};   // [{g, niv}]
let avisoOrden = {1:false, 2:false};

function capasOrdenadas(z){
  const lista = zonas[z].filter(l=>isFinite(l.g) && isFinite(l.niv));
  if(!lista.length){ avisoOrden[z] = false; return []; }
  const niveles = lista.map(l=>l.niv).sort((a,b)=>b-a);      // de arriba a abajo
  const dens = lista.map(l=>l.g).sort((a,b)=>a-b);            // del más liviano al más denso
  // ¿el alumno los había puesto ya en el orden físico?
  const comoEstan = lista.slice().sort((a,b)=>b.niv-a.niv).map(l=>l.g);
  avisoOrden[z] = comoEstan.some((g,i)=>Math.abs(g-dens[i]) > 1e-12);
  return niveles.map((niv,i)=>({niv, g:dens[i]}));
}

// Presión manométrica de la zona z a la cota y: se acumula capa a capa,
// p = Σ γ_i h_i (Hibbeler §9.5). Siempre ≥ 0; por encima del nivel vale 0.
function presionZona(z, y){
  const capas = capasOrdenadas(z);
  let p = 0;
  for(let i=0;i<capas.length;i++){
    const arriba = capas[i].niv;
    const abajo = (i+1 < capas.length) ? capas[i+1].niv : -Infinity;
    if(y >= arriba) continue;                 // por encima de esta capa
    const base = Math.max(y, abajo);
    p += capas[i].g * (arriba - base);        // tramo de esta capa que queda encima
    if(y >= abajo) break;                     // y cae dentro de esta capa
  }
  return p;
}
function nivelZona(z){
  const c = capasOrdenadas(z);
  return c.length ? c[0].niv : -Infinity;
}
// Capa (γ) de la zona z en la que cae la cota y (null por encima del nivel).
function capaEn(z, y){
  const capas = capasOrdenadas(z);
  for(let i=0;i<capas.length;i++){
    const abajo = (i+1 < capas.length) ? capas[i+1].niv : -Infinity;
    if(y < capas[i].niv && y >= abajo) return {i, g:capas[i].g, arriba:capas[i].niv, abajo};
  }
  return null;
}
function anchoB(){ return Math.abs(num('pB',1))||1; }

function addLiquido(z){
  registrarCambio();
  const c = capasOrdenadas(z);
  const nivPrev = c.length ? c[c.length-1].niv - 1 : 0;
  zonas[z].push({g:9.81, niv:nivPrev});
  R = null; refrescar();
}
function borrarLiquido(z,i){ registrarCambio(); zonas[z].splice(i,1); R=null; refrescar(); }
function editLiquido(z,i,campo,v){
  registrarCambio();
  const val = parseFloat(v);
  if(isFinite(val)) zonas[z][i][campo] = val;
  R = null; refrescar();
}
function pintarZonas(){
  [1,2].forEach(z=>{
    const el = document.getElementById('listaZ'+z);
    if(!el) return;
    if(!zonas[z].length){
      el.innerHTML = '<div class="list-empty">Sin líquido en esta zona.</div>';
      return;
    }
    const ord = capasOrdenadas(z);
    let h = zonas[z].map((l,i)=>
      '<div class="liq-row">'
      + '<div class="liq-sw" style="background:'+colorCapa(l.g)+'"></div>'
      + '<span class="lab">γ</span><input type="number" step="any" value="'+l.g+'" '
      + 'title="Peso específico ('+uGamma()+')" onchange="editLiquido('+z+','+i+',\'g\',this.value)">'
      + '<span class="lab">nivel</span><input type="number" step="any" value="'+l.niv+'" '
      + 'title="Cota de la superficie libre ('+unitLen+')" onchange="editLiquido('+z+','+i+',\'niv\',this.value)">'
      + '<button class="x" onclick="borrarLiquido('+z+','+i+')">×</button></div>').join('');
    if(avisoOrden[z])
      h += '<div class="zona-avi">Los líquidos se han reordenado por densidad: el más liviano flota sobre el más denso.</div>';
    if(ord.length > 1)
      h += '<div class="hint-sm">De arriba a abajo: '
         + ord.map(c=>'γ='+dec(c.g,'f')).join(' · ') + '</div>';
    el.innerHTML = h;
  });
}
function colorCapa(g){
  const t = Math.max(0, Math.min(1, (g-6)/12));
  const r = Math.round(120 - 80*t), gg = Math.round(190 - 70*t), b = Math.round(225 - 45*t);
  return 'rgb('+r+','+gg+','+b+')';
}

// ── Geometría de un tramo ──
// Un tramo curvo se define por su cuerda y una flecha (sagita).
function arcoDeTramo(t){
  const a = nodo(t.a), b = nodo(t.b);
  if(!a||!b || t.tipo !== 'arco' || esCero(t.flecha||0)) return null;
  const dx = b.x-a.x, dy = b.y-a.y, c = Math.hypot(dx,dy);
  if(c < 1e-12) return null;
  const f = t.flecha;
  const Rr = (c*c/4 + f*f)/(2*Math.abs(f));       // radio del arco
  const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
  const ux = dx/c, uy = dy/c, nx = -uy, ny = ux;   // normal a la cuerda
  const h = Math.sqrt(Math.max(0, Rr*Rr - c*c/4));
  const sg = f >= 0 ? 1 : -1;
  const cx = mx - nx*h*sg, cy = my - ny*h*sg;      // centro del arco
  let t1 = Math.atan2(a.y-cy, a.x-cx), t2 = Math.atan2(b.y-cy, b.x-cx);
  let d = t2 - t1;
  while(d >  Math.PI) d -= 2*Math.PI;
  while(d < -Math.PI) d += 2*Math.PI;
  if(Math.abs(f) > c/2){ d = d > 0 ? d - 2*Math.PI : d + 2*Math.PI; }
  return {cx, cy, R:Rr, t1, d, cuerda:c};
}
function puntosTramo(t, N){
  const a = nodo(t.a), b = nodo(t.b);
  if(!a||!b) return [];
  const pts = [];
  const arc = arcoDeTramo(t);
  if(!arc){
    for(let i=0;i<=N;i++) pts.push({x:a.x+(b.x-a.x)*i/N, y:a.y+(b.y-a.y)*i/N});
  } else {
    for(let i=0;i<=N;i++){
      const th = arc.t1 + arc.d*i/N;
      pts.push({x:arc.cx+arc.R*Math.cos(th), y:arc.cy+arc.R*Math.sin(th)});
    }
  }
  return pts;
}
function longitudTramo(t){
  const pts = puntosTramo(t, 200);
  let L = 0;
  for(let i=1;i<pts.length;i++) L += Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y);
  return L;
}

// ── Qué lado del tramo mira a cada zona ──
// La compuerta divide el plano en dos: la frontera sube en vertical desde el
// nudo más alto de la cadena, la recorre y baja en vertical desde el más
// bajo. La zona 1 queda al lado −x de esa frontera (a la DERECHA de quien la
// recorre de arriba abajo), la zona 2 al lado +x. Por eso, para un tramo
// recorrido en el sentido de la cadena, la normal derecha (dy,−dx) mira a la
// zona 1. Se calcula desde la cadena, no por la inclinación del tramo: un
// tramo horizontal (el fondo de una compuerta en L) no tiene inclinación
// que valga, y aun así su cara mojada se deduce sola.
function _sentidoEnCadena(t){
  const cad = (typeof cadenaCompuerta === 'function') ? cadenaCompuerta() : null;
  if(!cad || !cad.orden) return 0;
  const o = cad.orden.find(q=>q.t.id === t.id);
  return o ? (o.haciaB ? 1 : -1) : 0;
}
function signoZona(t){
  // +1: la normal derecha +n = (dy,−dx)/ds del recorrido a→b mira a la zona 2.
  let base;
  const s = _sentidoEnCadena(t);
  if(s !== 0) base = -s;                 // a→b sigue la cadena ⇒ +n mira a la zona 1
  else {
    const pts = puntosTramo(t, 12);
    let sx = 0;
    for(let i=0;i<pts.length-1;i++){
      const dx = pts[i+1].x-pts[i].x, dy = pts[i+1].y-pts[i].y;
      const ds = Math.hypot(dx,dy) || 1;
      sx += dy/ds;                       // componente x de la normal (dy/ds, -dx/ds)
    }
    base = (sx >= 0) ? 1 : -1;
  }
  return t.invertir ? -base : base;
}
// Normal unitaria del tramo en un punto de su recorrido, apuntando HACIA la
// zona z. Sirve para dibujar los diagramas del lado del líquido y para las
// direcciones "normal a la compuerta" de topes y apoyos móviles.
function normalHaciaZona(t, i, pts, z){
  const q = Math.min(Math.max(i,0), pts.length-2);
  const A = pts[q], B = pts[q+1];
  const dx=B.x-A.x, dy=B.y-A.y, ds=Math.hypot(dx,dy)||1;
  const nx=dy/ds, ny=-dx/ds;                     // normal derecha (+n)
  const s = (z===2 ? 1 : -1) * signoZona(t);     // +n mira a la zona z ⇔ s = +1
  return {x:nx*s, y:ny*s};
}
function presionNetaTramo(t, y){
  const sg = signoZona(t);
  return sg * (presionZona(1,y) - presionZona(2,y));
}
// Normal a la compuerta en un nudo, apuntando hacia la zona `lado`. Si en el
// nudo concurren dos tramos (una esquina), se promedian sus normales.
function normalCompuertaEnNudo(n, lado){
  let sx = 0, sy = 0;
  tramos.forEach(t=>{
    if(t.a !== n.id && t.b !== n.id) return;
    const pts = puntosTramo(t, 40);
    if(pts.length < 2) return;
    const i = (t.a === n.id) ? 0 : pts.length-2;
    let nv = normalHaciaZona(t, i, pts, lado || 1);
    // En un arco la normal exacta es la radial: la del primer segmento de la
    // poligonal se desvía medio paso angular y desorienta el tope.
    const arc = arcoDeTramo(t);
    if(arc){
      const rx = (n.x - arc.cx)/arc.R, ry = (n.y - arc.cy)/arc.R;
      const s = (rx*nv.x + ry*nv.y) >= 0 ? 1 : -1;
      nv = {x:rx*s, y:ry*s};
    }
    sx += nv.x; sy += nv.y;
  });
  const m = Math.hypot(sx, sy);
  if(m < 1e-9) return null;
  return {x:sx/m, y:sy/m};
}

// Ángulo con el que se DIBUJA el apoyo fijo. Es presentación y nada más: un
// pasador restringe las dos direcciones se dibuje como se dibuje, así que este
// ángulo no entra en ninguna ecuación. Compárese con apAng, que sí es la
// dirección de la reacción del apoyo móvil y sí entra en el cálculo.
// Ojo: como apAng, este es el ángulo INTERNO (desde +x, antihorario; 90° deja
// el triángulo debajo del nudo). El que escribe el alumno señala dónde se
// apoya el nudo y es el opuesto: la media vuelta la da `bsaAnguloOpuesto`
// (core/comun.js) al abrir y al cerrar la ventana, en 06-replicar.js.
function anguloDibujoApoyoFijo(n){
  const a = n && n.apAngFijo;
  return (typeof a === 'number' && isFinite(a)) ? a : 90;
}

// ── Incógnitas: nombre, dirección y sentido ──
// Apoyo fijo: R_xA, R_yA. Apoyo móvil: R_B (una sola, en su dirección).
// Tope: N_C, la fuerza normal que el tope ejerce sobre la compuerta; solo
// puede EMPUJAR, así que un valor negativo significa que la compuerta se
// separa del tope (se abre).
function direccionIncognita(u){
  if(u.tipo==='Rx') return {x:1,y:0};
  if(u.tipo==='Ry') return {x:0,y:1};
  if(u.tipo==='R'){
    if(u.n.apModo === 'normal'){
      const nv = normalCompuertaEnNudo(u.n, 2);
      if(nv) return nv;
    }
    const a = (u.n.apAng===undefined?90:u.n.apAng)*Math.PI/180;
    return {x:Math.cos(a), y:Math.sin(a)};
  }
  // tope
  const tp = u.n.tope || {};
  if(tp.modo !== 'angulo'){
    // el tope está del lado `lado` y empuja hacia el otro lado
    const nv = normalCompuertaEnNudo(u.n, tp.lado || 1);
    if(nv) return {x:-nv.x, y:-nv.y};
  }
  const a = (tp.ang||0)*Math.PI/180;
  return {x:Math.cos(a), y:Math.sin(a)};
}
function anguloIncognita(u){
  const d = direccionIncognita(u);
  let g = Math.atan2(d.y, d.x)*180/Math.PI;
  if(g < 0) g += 360;
  return g;
}
// Símbolo LaTeX de la incógnita (R6: el mismo nombre en todas partes).
function simbIncognita(u){
  const b = u.n.nombre;
  if(u.tipo==='Rx') return 'R_{x' + b + '}';
  if(u.tipo==='Ry') return 'R_{y' + b + '}';
  if(u.tipo==='R')  return 'R_{' + b + '}';
  return 'N_{' + b + '}';
}
function simbIncognitaHtml(u){
  const b = u.n.nombre;
  if(u.tipo==='Rx') return 'R<sub>x' + b + '</sub>';
  if(u.tipo==='Ry') return 'R<sub>y' + b + '</sub>';
  if(u.tipo==='R')  return 'R<sub>' + b + '</sub>';
  return 'N<sub>' + b + '</sub>';
}
function descIncognita(u){
  if(u.tipo==='Rx') return 'reacción horizontal del apoyo fijo';
  if(u.tipo==='Ry') return 'reacción vertical del apoyo fijo';
  if(u.tipo==='R')  return (u.n.apModo === 'normal') ? 'reacción del apoyo móvil, normal a la compuerta'
                                                     : 'reacción del apoyo móvil';
  return (u.n.tope && u.n.tope.modo === 'angulo') ? 'fuerza del tope' : 'fuerza normal del tope';
}
// Sentido real como flecha (R8): la más próxima de las ocho.
const _FLECHAS_HTML = ['→','↗','↑','↖','←','↙','↓','↘'];
const _FLECHAS_TEX  = ['\\rightarrow','\\nearrow','\\uparrow','\\nwarrow','\\leftarrow','\\swarrow','\\downarrow','\\searrow'];
function _indiceFlecha(dx, dy){
  const ang = Math.atan2(dy, dx);
  return ((Math.round(ang/(Math.PI/4)) % 8) + 8) % 8;
}
function iconoSentidoHtml(dx, dy){ return _FLECHAS_HTML[_indiceFlecha(dx,dy)]; }
function iconoSentidoTex(dx, dy){ return '$' + _FLECHAS_TEX[_indiceFlecha(dx,dy)] + '$'; }
function sentidoRealIncognita(u, v){
  const d = direccionIncognita(u);
  const s = v >= 0 ? 1 : -1;
  return {x:d.x*s, y:d.y*s};
}

// ═══════════════════════════════════════════════════════════
//  RESULTANTE DEL LÍQUIDO DE UNA ZONA SOBRE UN TRAMO
//  Integración punto a punto (vale igual para rectos y curvos). Cada zona con
//  líquido produce SU fuerza: en el DCL van como fuerzas distintas, igual
//  que en los problemas de compuertas con agua a los dos lados (Beer 5.79).
// ═══════════════════════════════════════════════════════════
function fuerzaTramoZona(t, z){
  if(t.activo === false) return null;
  const niv = nivelZona(z);
  if(!isFinite(niv)) return null;
  const N = 800;
  const pts = puntosTramo(t, N);
  if(pts.length < 2) return null;
  const b = anchoB();
  const sN = (z===2 ? 1 : -1) * signoZona(t);   // +n mira a la zona z ⇔ +1
  let Fx = 0, Fy = 0, Mo = 0, lenMoj = 0, pMax = 0;
  for(let i=0;i<N;i++){
    const A = pts[i], B = pts[i+1];
    const dx = B.x-A.x, dy = B.y-A.y, ds = Math.hypot(dx,dy);
    if(ds < 1e-14) continue;
    const my = (A.y+B.y)/2, mx = (A.x+B.x)/2;
    const p = presionZona(z, my);
    if(p <= 0) continue;
    lenMoj += ds;
    if(p > pMax) pMax = p;
    // la fuerza del líquido va CONTRA la compuerta: −(normal hacia la zona)
    const nx = -dy/ds*sN, ny = dx/ds*sN;
    const dF = p*b*ds;
    Fx += dF*nx; Fy += dF*ny;
    Mo += mx*(dF*ny) - my*(dF*nx);          // momento respecto al origen
  }
  const F = Math.hypot(Fx,Fy);
  if(F < 1e-12) return null;
  // Punto de la línea de acción más próximo al origen. De Mo = px·Fy − py·Fx
  // junto con p ⊥ F sale px = Fy·Mo/F² y py = −Fx·Mo/F².
  const px = Fy*Mo/(F*F), py = -Fx*Mo/(F*F);
  const dir = {x:Fx/F, y:Fy/F};
  // Centro de presión: donde la línea de acción corta al tramo.
  const P = cortePuntoLinea(pts, {x:px, y:py}, dir);
  return {t, z, Fx, Fy, F, Mo, px, py, dir, P, zP: niv - P.y, niv,
          len: lenMoj, pMax, b};
}
// Intersección de la recta (Q + s·d) con la poligonal `pts`. Si no la corta,
// el punto de la poligonal más próximo a la recta.
function cortePuntoLinea(pts, Q, d){
  let mejor = null, dm = Infinity;
  const nx = -d.y, ny = d.x;                      // normal a la recta
  const f = P => (P.x-Q.x)*nx + (P.y-Q.y)*ny;    // distancia con signo a la recta
  for(let i=0;i<pts.length-1;i++){
    const fa = f(pts[i]), fb = f(pts[i+1]);
    if((fa <= 0 && fb >= 0) || (fa >= 0 && fb <= 0)){
      const s = (Math.abs(fb-fa) < 1e-15) ? 0 : fa/(fa-fb);
      return {x:pts[i].x + (pts[i+1].x-pts[i].x)*s, y:pts[i].y + (pts[i+1].y-pts[i].y)*s};
    }
    const da = Math.abs(fa);
    if(da < dm){ dm = da; mejor = pts[i]; }
  }
  return mejor ? {x:mejor.x, y:mejor.y} : {x:Q.x, y:Q.y};
}

// ═══════════════════════════════════════════════════════════
//  DESARROLLO CERRADO, COMO EN CLASE
//  Lo que el motor integra, el informe lo cuenta con las fórmulas del curso
//  y se comprueba contra la integral. Placa recta: diagrama trapezoidal por
//  capa = rectángulo + triángulo (Hibbeler ej. 9.14, solución II). Placa
//  curva: F_h sobre la proyección vertical y F_v = peso del bloque de
//  líquido entre la placa y la superficie libre (Hibbeler fig. 9-26).
// ═══════════════════════════════════════════════════════════
function desarrolloCarga(c){
  const arc = arcoDeTramo(c.t);
  const d = arc ? _desarrolloCurvo(c, arc) : _desarrolloRecto(c);
  if(!d) return null;
  // Autocomprobación: la suma escrita debe reproducir la integral.
  const tol = 2e-3*Math.max(1, c.F);
  d.coincide = Math.abs(d.F - c.F) < tol
            && Math.hypot(d.P.x - c.P.x, d.P.y - c.P.y) < 5e-3*Math.max(1, c.len);
  return d;
}
// Cotas de corte de las capas de la zona z dentro del intervalo [yT, yD]
// (yT la menos profunda). Devuelve las cotas de arriba abajo.
function _cotasDeCorte(z, yT, yD){
  const capas = capasOrdenadas(z);
  const cotas = [yT];
  capas.forEach((cp,i)=>{
    if(i===0) return;
    if(cp.niv < yT - 1e-12 && cp.niv > yD + 1e-12) cotas.push(cp.niv);
  });
  cotas.push(yD);
  return cotas;
}
function _desarrolloRecto(c){
  const t = c.t, z = c.z, niv = c.niv, b = c.b;
  const a = nodo(t.a), bb = nodo(t.b);
  if(!a||!bb) return null;
  // T: extremo menos profundo; D: el más profundo. Si el tramo asoma sobre la
  // superficie, la parte mojada empieza en el corte con el nivel.
  let T = (a.y >= bb.y) ? a : bb, D = (a.y >= bb.y) ? bb : a;
  T = {x:T.x, y:T.y, nombre:T.nombre}; D = {x:D.x, y:D.y, nombre:D.nombre};
  let cortaSuperficie = false;
  if(T.y > niv + 1e-12){
    if(D.y >= niv - 1e-12) return null;
    const s = (T.y - niv)/(T.y - D.y);
    T = {x:T.x + (D.x-T.x)*s, y:niv, nombre:null};
    cortaSuperficie = true;
  }
  const L = Math.hypot(D.x-T.x, D.y-T.y);
  if(L < 1e-12) return null;
  const u = {x:(D.x-T.x)/L, y:(D.y-T.y)/L};        // de T hacia D, a lo largo de la placa
  const horizontal = Math.abs(T.y - D.y) < 1e-9;
  const cotas = _cotasDeCorte(z, T.y, D.y);
  const bandas = [];
  let F = 0, M = 0;
  for(let i=0;i<cotas.length-1;i++){
    const y0 = cotas[i], y1 = cotas[i+1];
    // posición a lo largo de la placa de cada cota
    const s0 = horizontal ? 0 : (T.y - y0)/(T.y - D.y)*L;
    const s1 = horizontal ? L : (T.y - y1)/(T.y - D.y)*L;
    const l = s1 - s0;
    if(l < 1e-12) continue;
    const p0 = presionZona(z, y0), p1 = presionZona(z, y1);
    const capa = capaEn(z, (y0+y1)/2);
    const Fr = b*l*Math.min(p0,p1), Ft = b*l*Math.abs(p1-p0)/2;
    // centroides medidos desde el extremo menos profundo de la banda
    const sR = l/2, sT = (p1 >= p0) ? 2*l/3 : l/3;
    const Fb = Fr + Ft;
    const sB = Fb > 1e-15 ? (Fr*sR + Ft*sT)/Fb : l/2;
    bandas.push({y0, y1, h0:niv-y0, h1:niv-y1, p0, p1, l, s0, s1, g: capa ? capa.g : 0,
                 Fr, Ft, F:Fb, sR, sT, sB, sAbs: s0 + sB});
    F += Fb; M += Fb*(s0 + sB);
  }
  if(F < 1e-15) return null;
  const sP = M/F;
  const P = {x:T.x + u.x*sP, y:T.y + u.y*sP};
  // Comprobación con γ z̄ A cuando la placa mojada cae en UNA sola capa.
  let gzA = null;
  if(bandas.length === 1){
    const zBar = (bandas[0].h0 + bandas[0].h1)/2;
    gzA = {g:bandas[0].g, zBar, A:L*b, F:bandas[0].g*zBar*L*b};
  }
  const zBarPlaca = niv - (T.y + D.y)/2;
  return {tipo:'recto', T, D, L, u, horizontal, cortaSuperficie, bandas, F, sP, P,
          zP: niv - P.y, zBar: zBarPlaca, gzA,
          angPlaca: Math.atan2(Math.abs(D.y-T.y), Math.abs(D.x-T.x))*180/Math.PI};
}
function _desarrolloCurvo(c, arc){
  const t = c.t, z = c.z, niv = c.niv, b = c.b;
  const N = 400;
  const todos = puntosTramo(t, N);
  // parte mojada, con el corte con la superficie interpolado
  const pts = [];
  for(let i=0;i<todos.length;i++){
    const P = todos[i];
    if(P.y <= niv + 1e-12){
      if(!pts.length && i > 0 && todos[i-1].y > niv){
        const Q = todos[i-1], s = (Q.y - niv)/(Q.y - P.y);
        pts.push({x:Q.x + (P.x-Q.x)*s, y:niv});
      }
      pts.push(P);
    } else if(pts.length){
      const Q = todos[i-1], s = (Q.y - niv)/(Q.y - P.y);
      pts.push({x:Q.x + (P.x-Q.x)*s, y:niv});
      break;
    }
  }
  if(pts.length < 2) return null;
  const sN = (z===2 ? 1 : -1) * signoZona(t);
  // ¿la parte mojada es monótona en y y en x? Si no, la proyección no vale.
  let monoY = true, monoX = true;
  for(let i=2;i<pts.length;i++){
    if((pts[i].y-pts[i-1].y)*(pts[i-1].y-pts[i-2].y) < -1e-12) monoY = false;
    if((pts[i].x-pts[i-1].x)*(pts[i-1].x-pts[i-2].x) < -1e-12) monoX = false;
  }
  // Componentes por integración sobre el arco (el motor) …
  let Fh = 0, Fv = 0;
  for(let i=0;i<pts.length-1;i++){
    const A = pts[i], B = pts[i+1];
    const dx = B.x-A.x, dy = B.y-A.y, ds = Math.hypot(dx,dy);
    if(ds < 1e-14) continue;
    const p = presionZona(z, (A.y+B.y)/2);
    Fh += p*b*(-dy)*sN; Fv += p*b*(dx)*sN;
  }
  // … y como las cuenta el libro: F_h sobre la proyección vertical (bandas
  // trapezoidales por capa) y F_v como peso del bloque por capa.
  const yTop = Math.max(...pts.map(p=>p.y)), yBot = Math.min(...pts.map(p=>p.y));
  const cotas = _cotasDeCorte(z, yTop, yBot);
  const bandasH = [];
  let FhProy = 0, MhProy = 0;
  for(let i=0;i<cotas.length-1;i++){
    const y0 = cotas[i], y1 = cotas[i+1], h = y0 - y1;
    if(h < 1e-12) continue;
    const p0 = presionZona(z,y0), p1 = presionZona(z,y1);
    const Fr = b*h*p0, Ft = b*h*(p1-p0)/2, Fb = Fr + Ft;
    const yR = y0 - h/2, yT = y0 - 2*h/3;
    const yB = Fb > 1e-15 ? (Fr*yR + Ft*yT)/Fb : yR;
    bandasH.push({y0, y1, h0:niv-y0, h1:niv-y1, p0, p1, h, Fr, Ft, F:Fb, yB});
    FhProy += Fb; MhProy += Fb*yB;
  }
  const yFh = FhProy > 1e-15 ? MhProy/FhProy : (yTop+yBot)/2;
  // bloque de líquido entre el arco y la superficie, por capa
  const capas = capasOrdenadas(z);
  const areas = capas.map(cp=>({g:cp.g, niv:cp.niv, A:0}));
  let xMin = Infinity, xMax = -Infinity, Ax = 0, Atot = 0;
  for(let i=0;i<pts.length-1;i++){
    const A = pts[i], B = pts[i+1];
    const dx = Math.abs(B.x-A.x); if(dx < 1e-14) continue;
    const ym = (A.y+B.y)/2, xm = (A.x+B.x)/2;
    xMin = Math.min(xMin, A.x, B.x); xMax = Math.max(xMax, A.x, B.x);
    capas.forEach((cp,k)=>{
      const abajo = (k+1<capas.length) ? capas[k+1].niv : -Infinity;
      const top = Math.min(cp.niv, niv), bot = Math.max(abajo, ym);
      if(top > bot){ areas[k].A += (top-bot)*dx; }
    });
    const col = niv - ym; if(col > 0){ Atot += col*dx; Ax += col*dx*xm; }
  }
  const xFv = Atot > 1e-15 ? Ax/Atot : (xMin+xMax)/2;
  const FvBloque = areas.reduce((s,a)=>s + a.g*a.A*b, 0);
  // Descomposición geométrica del bloque: trapecio bajo la superficie hasta
  // la cuerda mojada, ± el segmento circular entre la cuerda y el arco.
  const T0 = pts[0], D0 = pts[pts.length-1];
  const cuerda = Math.hypot(D0.x-T0.x, D0.y-T0.y);
  let segmento = null;
  if(cuerda > 1e-9 && monoX){
    const half = Math.min(1, cuerda/(2*arc.R));
    const phi = 2*Math.asin(half);
    const Aseg = arc.R*arc.R/2*(phi - Math.sin(phi));
    const Atrap = ((niv - T0.y) + (niv - D0.y))/2*Math.abs(D0.x - T0.x);
    // ¿el arco se comba hacia la superficie (por encima de la cuerda)?
    const mid = pts[Math.floor(pts.length/2)];
    const yCuerdaEnMid = T0.y + (D0.y-T0.y)*((mid.x-T0.x)/((D0.x-T0.x)||1e-12));
    const haciaArriba = mid.y > yCuerdaEnMid;
    segmento = {phi, Aseg, Atrap, haciaArriba, A: haciaArriba ? Atrap - Aseg : Atrap + Aseg};
  }
  const F = Math.hypot(Fh, Fv);
  if(F < 1e-15) return null;
  // La resultante pasa por el centro del arco: todas las presiones son radiales.
  const dir = {x:Fh/F, y:Fv/F};
  const P = cortePuntoLinea(pts, {x:arc.cx, y:arc.cy}, dir);
  return {tipo:'curvo', pts, arc, monoX, monoY, Fh, Fv, F, dir, P, zP: niv - P.y,
          yTop, yBot, bandasH, FhProy, yFh, areas, Atot, xFv, FvBloque, segmento,
          T:T0, D:D0, cuerda, cortaSuperficie: Math.abs(T0.y - niv) < 1e-9 && todos[0].y > niv + 1e-9,
          theta: Math.atan2(Math.abs(Fv), Math.abs(Fh))*180/Math.PI,
          sentidoV: Fv >= 0 ? 'arriba' : 'abajo', sentidoH: Fh >= 0 ? 'derecha' : 'izquierda'};
}

// ── Equilibrio del conjunto ──
function resolverSistema(A,b){
  const n = b.length;
  const M = A.map((f,i)=>f.slice().concat([b[i]]));
  for(let c=0;c<n;c++){
    let piv=c;
    for(let f=c+1;f<n;f++) if(Math.abs(M[f][c])>Math.abs(M[piv][c])) piv=f;
    if(Math.abs(M[piv][c])<1e-10) return null;
    [M[c],M[piv]]=[M[piv],M[c]];
    for(let f=0;f<n;f++){
      if(f===c) continue;
      const k=M[f][c]/M[c][c];
      if(k===0) continue;
      for(let j=c;j<=n;j++) M[f][j]-=k*M[c][j];
    }
  }
  return M.map((f,i)=>M[i][n]/M[i][i]);
}

function listaIncognitas(){
  const inc = [];
  nodos.forEach(n=>{
    if(n.apoyo === 'fijo'){ inc.push({n, tipo:'Rx'}); inc.push({n, tipo:'Ry'}); }
    else if(n.apoyo === 'movil'){ inc.push({n, tipo:'R'}); }
    if(n.tope) inc.push({n, tipo:'T'});
  });
  inc.forEach(u=>{ u.dir = direccionIncognita(u); u.ang = Math.atan2(u.dir.y, u.dir.x); });
  return inc;
}

function analizar(){
  if(!tramos.length) return {error:'sin-tramos'};
  const cargas = [];
  tramos.forEach(t=>{
    [1,2].forEach(z=>{
      const f = fuerzaTramoZona(t, z);
      if(f && f.F > 1e-12) cargas.push(f);
    });
  });
  cargas.forEach((c,i)=>{ c.k = i+1; c.nombre = 'F_{' + (i+1) + '}'; });

  const inc = listaIncognitas();
  const rotulas = nodos.filter(n=>n.rotula);
  const nEq = 3 + rotulas.length;
  const diag = {inc:inc.length, eq:nEq, rot:rotulas.length};
  if(!cargas.length) return {error:'sin-liquido', diag, cargas, inc};
  if(inc.length !== nEq) return {error:'determinacion', diag, cargas, inc};

  // ── ecuaciones ──
  const A = Array.from({length:nEq}, ()=>new Array(inc.length).fill(0));
  const b = new Array(nEq).fill(0);
  // ΣFx, ΣFy, ΣM(origen)
  inc.forEach((u,j)=>{
    const d = u.dir;
    A[0][j] = d.x; A[1][j] = d.y;
    A[2][j] = u.n.x*d.y - u.n.y*d.x;
  });
  let sx=0, sy=0, sm=0;
  cargas.forEach(c=>{ sx+=c.Fx; sy+=c.Fy; sm+=c.Mo; });
  b[0] = -sx; b[1] = -sy; b[2] = -sm;

  // Una ecuación extra por rótula: ΣM = 0 respecto a ella,
  // tomando solo las fuerzas de un lado de la cadena.
  const lados = [];
  rotulas.forEach((rt, k)=>{
    const lado = ladoDeRotula(rt);
    lados.push(lado);
    inc.forEach((u,j)=>{
      if(lado.nodos.indexOf(u.n.id) < 0) return;
      const d = u.dir;
      A[3+k][j] = (u.n.x-rt.x)*d.y - (u.n.y-rt.y)*d.x;
    });
    let m = 0;
    cargas.forEach(c=>{
      if(lado.tramos.indexOf(c.t.id) < 0) return;
      m += (c.P.x-rt.x)*c.Fy - (c.P.y-rt.y)*c.Fx;
    });
    b[3+k] = -m;
  });

  const x = resolverSistema(A,b);
  if(!x) return {error:'singular', diag, cargas, inc};
  const val = {};
  inc.forEach((u,j)=>{ val[j] = x[j]; });
  const out = {cargas, inc, val, diag, rotulas, lados, A, b};
  out.plan = planEquilibrio(out);
  // Comprobación numérica del equilibrio con los valores hallados.
  let cx=0, cy=0, cm=0;
  cargas.forEach(c=>{ cx+=c.Fx; cy+=c.Fy; cm+=c.Mo; });
  inc.forEach((u,j)=>{ cx += val[j]*u.dir.x; cy += val[j]*u.dir.y; cm += u.n.x*val[j]*u.dir.y - u.n.y*val[j]*u.dir.x; });
  out.residuo = {cx, cy, cm, ref: Math.max(1, Math.abs(sx), Math.abs(sy), Math.abs(sm))};
  out.cierra = Math.abs(cx) < 1e-7*out.residuo.ref && Math.abs(cy) < 1e-7*out.residuo.ref && Math.abs(cm) < 1e-7*out.residuo.ref;
  // Topes que se separan: el tope solo empuja.
  out.topesSueltos = inc.filter((u,j)=>u.tipo==='T' && val[j] < -1e-9*out.residuo.ref);
  return out;
}

// Nodos y tramos que quedan a un lado de la rótula (recorriendo la cadena)
function ladoDeRotula(rt){
  const vis = {}, nds = [], trs = [];
  const ady = {};
  nodos.forEach(n=>ady[n.id]=[]);
  tramos.forEach(t=>{ ady[t.a].push({n:t.b,t}); ady[t.b].push({n:t.a,t}); });
  const primero = ady[rt.id][0];
  if(!primero) return {nodos:[], tramos:[]};
  const cola = [primero.n];
  vis[rt.id] = true; vis[primero.n] = true;
  nds.push(primero.n); trs.push(primero.t.id);
  while(cola.length){
    const x = cola.shift();
    ady[x].forEach(e=>{
      if(trs.indexOf(e.t.id) < 0) trs.push(e.t.id);
      if(vis[e.n]) return;
      vis[e.n] = true; nds.push(e.n); cola.push(e.n);
    });
  }
  return {nodos:nds, tramos:trs};
}

// ═══════════════════════════════════════════════════════════
//  EL EQUILIBRIO COMO SE HACE A MANO
//  El motor resuelve un sistema; el alumno toma momentos respecto del
//  pasador (donde se cruzan dos incógnitas) y despeja la tercera, y luego
//  ΣFx y ΣFy. Aquí se planifica ese orden: se elige el centro de momentos
//  por el que pasan más líneas de acción de incógnitas, y se resuelve
//  siempre la ecuación que deja UNA sola incógnita; si ninguna la deja,
//  las que quedan se resuelven como sistema (y el informe lo dice).
// ═══════════════════════════════════════════════════════════
function brazoRespecto(C, Pt, dir){
  // momento = F · brazo, con signo antihorario positivo
  const m = (Pt.x - C.x)*dir.y - (Pt.y - C.y)*dir.x;
  return {m, brazo: Math.abs(m), signo: m >= 0 ? 1 : -1};
}
function planEquilibrio(r){
  const inc = r.inc, cargas = r.cargas;
  const EPS = 1e-9;
  // ── centro de momentos: el nudo con más incógnitas pasando por él ──
  const candidatos = [];
  nodos.forEach(n=>{
    let pasan = 0;
    inc.forEach(u=>{ if(brazoRespecto(n, u.n, u.dir).brazo < 1e-7*Math.max(1, Math.abs(n.x), Math.abs(n.y))) pasan++; });
    candidatos.push({n, pasan, fijo: n.apoyo === 'fijo' ? 1 : 0});
  });
  candidatos.sort((a,b)=> b.pasan - a.pasan || b.fijo - a.fijo || a.n.id - b.n.id);
  const centro = candidatos.length ? candidatos[0].n : {x:0, y:0, nombre:'O'};
  // ── ecuaciones disponibles ──
  const ecs = [];
  const terminosF = (eje, filtroT, filtroN) => {
    const ts = [];
    cargas.forEach(c=>{
      if(filtroT && filtroT.indexOf(c.t.id) < 0) return;
      const v = eje==='x' ? c.Fx : c.Fy;
      if(Math.abs(v) > EPS*Math.max(1,c.F)) ts.push({carga:c, v});
    });
    const us = [];
    inc.forEach((u,j)=>{
      if(filtroN && filtroN.indexOf(u.n.id) < 0) return;
      const coef = eje==='x' ? u.dir.x : u.dir.y;
      if(Math.abs(coef) > EPS) us.push({j, coef});
    });
    return {ts, us};
  };
  const terminosM = (C, filtroT, filtroN) => {
    const ts = [];
    cargas.forEach(c=>{
      if(filtroT && filtroT.indexOf(c.t.id) < 0) return;
      const br = brazoRespecto(C, c.P, c.dir);
      if(br.brazo > 1e-7*Math.max(1, c.len)) ts.push({carga:c, brazo:br.brazo, signo:br.signo, v: br.m*c.F});
    });
    const us = [];
    inc.forEach((u,j)=>{
      if(filtroN && filtroN.indexOf(u.n.id) < 0) return;
      const br = brazoRespecto(C, u.n, u.dir);
      if(br.brazo > 1e-7*Math.max(1, Math.abs(u.n.x), Math.abs(u.n.y))) us.push({j, coef: br.m, brazo:br.brazo, signo:br.signo});
    });
    return {ts, us};
  };
  ecs.push({tipo:'M', centro, nombre:'\\sum M_{' + centro.nombre + '} = 0', ...terminosM(centro)});
  ecs.push({tipo:'Fx', nombre:'\\sum F_x = 0', ...terminosF('x')});
  ecs.push({tipo:'Fy', nombre:'\\sum F_y = 0', ...terminosF('y')});
  (r.rotulas||[]).forEach((rt,k)=>{
    const lado = r.lados[k];
    ecs.push({tipo:'Mrot', centro:rt, lado, nombre:'\\sum M_{' + rt.nombre + '} = 0',
              ...terminosM(rt, lado.tramos, lado.nodos)});
  });
  // ── orden de resolución ──
  const conocido = new Array(inc.length).fill(false);
  const usada = new Array(ecs.length).fill(false);
  const pasos = [];
  let nEc = 0;
  const pendientes = e => ecs[e].us.filter(u=>!conocido[u.j]);
  let restantes = ecs.length, guard = 0;
  while(restantes > 0 && guard++ < 20){
    let el = -1;
    for(let e=0;e<ecs.length;e++){ if(!usada[e] && pendientes(e).length === 1){ el = e; break; } }
    if(el < 0){
      // ecuaciones que ya no tienen incógnitas: quedan como comprobación
      let vacias = false;
      for(let e=0;e<ecs.length;e++){
        if(!usada[e] && pendientes(e).length === 0){ usada[e]=true; restantes--; pasos.push({tipo:'comprobacion', e, num:++nEc}); vacias = true; }
      }
      if(vacias) continue;
      // sistema simultáneo con lo que queda
      const grupo = [], libres = [];
      for(let e=0;e<ecs.length;e++){
        if(usada[e]) continue;
        usada[e]=true; restantes--; grupo.push({e, num:++nEc});
        pendientes(e).forEach(p=>{ if(libres.indexOf(p.j)<0) libres.push(p.j); });
      }
      pasos.push({tipo:'sistema', grupo, libres});
      libres.forEach(j=>conocido[j]=true);
      break;
    }
    usada[el] = true; restantes--;
    const p = pendientes(el)[0];
    pasos.push({tipo:'despeje', e: el, j: p.j, num: ++nEc, previas: ecs[el].us.filter(u=>u.j!==p.j).map(u=>u.j)});
    conocido[p.j] = true;
  }
  return {centro, ecs, pasos};
}

function calcular(){
  R = analizar();
  const rp = document.getElementById('resultsPanel');
  const ra = document.getElementById('resultsArea');
  const hint = document.getElementById('noResultsHint');
  if(ra) ra.style.display='block';
  if(hint) hint.style.display='none';
  if(rp){
    rp.style.display='block';
    rp.innerHTML = R.error ? renderError(R) : renderResultados(R);
    try{ renderKatex(rp); }catch(e){}
  }
  dibujar();
  setTimeout(()=>{ try{ ra.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){} },130);
}

function renderError(r){
  let t;
  if(r.error === 'sin-tramos') t = 'Arma la compuerta: coloca nudos y únelos con tramos.';
  else if(r.error === 'sin-liquido') t = 'Ningún tramo está mojado: añade líquido en la zona 1 o en la zona 2 (panel <b>Líquidos</b>) con un nivel por encima de la compuerta.';
  else if(r.error === 'determinacion'){
    const d = r.diag, g = d.inc - d.eq;
    t = 'Hay <b>' + d.inc + ' incógnita(s)</b> (reacciones y topes) y <b>' + d.eq + ' ecuación(es)</b> '
      + 'de equilibrio' + (d.rot ? ' (3 del conjunto más ' + d.rot + ' por las rótulas)' : '') + '. '
      + (g < 0 ? 'Faltan ' + (-g) + ': la compuerta no está sujeta y se movería.'
               : 'Sobran ' + g + ': el problema es hiperestático y la estática no basta para resolverlo.');
  }
  else t = 'La disposición de apoyos no impide el movimiento: revisa sus direcciones.';
  return '<div class="res-section"><div class="res-title"><div class="num">!</div>No se puede resolver</div>'
    + '<div class="verdict bad"><div class="verdict-t">Equilibrio</div>' + t + '</div></div>';
}
