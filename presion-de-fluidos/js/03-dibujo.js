// ═══════════════════════════════════════════════════════════
//  DIBUJO
// ═══════════════════════════════════════════════════════════
function ajustarCanvas(){
  const a = document.getElementById('canvasArea');
  if(!a||!cv) return;
  const rect = a.getBoundingClientRect(), dpr = window.devicePixelRatio||1;
  W = rect.width; H = rect.height;
  cv.width = Math.max(1,Math.round(W*dpr)); cv.height = Math.max(1,Math.round(H*dpr));
  cv.style.width = W+'px'; cv.style.height = H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  dibujar();
}
function aPantalla(x,y){ return [W/2+(x-vx)*escala, H/2-(y-vy)*escala]; }
function aMundo(px,py){ return [(px-W/2)/escala+vx, (H/2-py)/escala+vy]; }
function pasoRejilla(){
  const obj = 34/escala, e = Math.floor(Math.log10(Math.max(obj,1e-9))), base = Math.pow(10,e);
  const m = obj/base;
  return (m<=1?1:m<=2?2:m<=5?5:10)*base;
}
function snap(v){ const p = pasoRejilla()/2; return Math.round(v/p)*p; }

// ── Recorrido ordenado de la compuerta. La cadena va del extremo MÁS ALTO
//    al MÁS BAJO: la frontera entre zonas sube en vertical desde el primero
//    y baja en vertical desde el último, y así nunca se cruza consigo misma.
//    `orden` dice, tramo a tramo, si se recorre de a hacia b: es lo que usa
//    signoZona para saber qué cara mira a cada zona.
function cadenaCompuerta(){
  if(!tramos.length) return null;
  const ady = {};
  tramos.forEach(t=>{ (ady[t.a]=ady[t.a]||[]).push(t); (ady[t.b]=ady[t.b]||[]).push(t); });
  const nodoDe = id => nodos.find(n=>n.id===id);
  const extremos = Object.keys(ady).map(Number).filter(id=>ady[id].length===1 && nodoDe(id));
  if(!extremos.length) return null;          // circuito cerrado: no hay frontera abierta
  const tUlt = tramos[tramos.length-1];
  let fin = (extremos.indexOf(tUlt.b)>=0) ? tUlt.b
          : (extremos.indexOf(tUlt.a)>=0) ? tUlt.a : extremos[0];
  const otro = extremos.find(id=>id!==fin);
  if(otro!==undefined && nodoDe(otro).y < nodoDe(fin).y - 1e-9) fin = otro;
  const inicio = extremos.find(id=>id!==fin) ?? fin;

  const pts = [{x:nodoDe(inicio).x, y:nodoDe(inicio).y}];
  const visit = {};
  const orden = [];
  let actual = inicio, seguir = true;
  while(seguir && actual!==fin){
    seguir = false;
    for(const t of (ady[actual]||[])){
      if(visit[t.id]) continue;
      visit[t.id] = true;
      const haciaB = (t.a===actual);
      orden.push({t, haciaB});
      let pt = puntosTramo(t, 40);
      if(!haciaB) pt = pt.slice().reverse();
      for(let i=1;i<pt.length;i++) pts.push(pt[i]);
      actual = haciaB ? t.b : t.a;
      seguir = true;
      break;
    }
  }
  if(pts.length < 2) return null;
  return {pts, inicio:nodoDe(inicio), fin:nodoDe(fin), orden};
}

// ── Registro de ocupación del lienzo ──
// Todo lo que se pinta deja aquí su polígono, en píxeles de pantalla: los trazos
// con su grosor, los símbolos con su giro, las flechas con su punta, los arcos,
// las cotas, la banda del peso y los propios rótulos. El colocador de textos
// pregunta a ese mismo registro y escribe en el primer hueco libre JUNTO A SU
// ELEMENTO. Es la idea de `crearRegistro` del PDF de armaduras
// (`armaduras-y-marcos/js/12-latex.js`) traída al lienzo, pero con los nombres y
// la geometría de ESTE tema (CLAUDE.md §5.4): aquí se trabaja en píxeles de
// pantalla y no hay escala de figura.
//
// El orden importa, y por eso un texto NO se pinta donde se pide: `_rotulo` lo
// ENCOLA y `_pintarRotulos()` lo coloca al final de dibujar(), cuando toda la
// geometría del repintado ya está registrada. Antes cada rótulo solo podía
// esquivar a los rótulos ANTERIORES, y el símbolo del apoyo —que se dibuja
// después— se comía el principio de «frontera de zonas».
let _rotCajas = [];    // {pol, bb:[x0,y0,x1,y1], tipo, txt}
let _rotCola = [];     // rótulos pendientes de colocar
// Prioridad de colocación: primero los nombres (van pegados a un punto y casi no
// tienen sitio alternativo), luego los valores y al final los rótulos de zona y
// de nivel, que tienen media pantalla libre.
const _ROT_NOMBRE = 0, _ROT_VALOR = 1, _ROT_ZONA = 2;
// Rejilla de casillas sobre el lienzo para no comparar cada posición candidata
// con TODO lo registrado: un rótulo solo mira lo que cae en sus casillas. Sin
// esto, un caso con dos tramos mojados (126 elementos) multiplicaba por tres el
// coste de dibujar(), que se repinta en cada arrastre.
const _REJ_CELDA = 80;
let _rotRejilla = new Map();   // casilla → índices de _rotCajas
let _rotGrandes = [];          // lo que ocupa media pantalla (la columna, un nivel)
let _rotVisto = [];            // sello por elemento, para no mirarlo dos veces
let _rotSello = 0;
let _margenIzqCache = 8;       // lo mide _reservarZonasUI en cada dibujar()

function _bbPolPF(P){
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for(let i=0;i<P.length;i++){
    const x = P[i][0], y = P[i][1];
    if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; if(y>y1) y1=y;
  }
  return [x0,y0,x1,y1];
}
function _cercaPF(a,b,m){ return a[0]-m<=b[2] && b[0]-m<=a[2] && a[1]-m<=b[3] && b[1]-m<=a[3]; }
// Separación entre dos polígonos convexos por ejes separadores: > 0 es la
// holgura; <= 0, se solapan. Con `basta`, deja de buscar en cuanto un eje ya
// separa eso (al que pregunta solo le importa si llega a su margen).
// Aquí y en `_reservarTrazo` la raíz va con `Math.sqrt` y no con `Math.hypot`:
// se llama más de mil veces por repintado y hypot, que protege contra
// desbordamientos que en píxeles de pantalla no existen, cuesta varias veces más.
function _sepPolPF(A,B,basta){
  let mejor = -Infinity;
  for(let pas=0; pas<2; pas++){
    const P = pas ? B : A, n = P.length;
    for(let i=0;i<n;i++){
      const p = P[i], q = P[(i+1)%n];
      let ax = q[1]-p[1], ay = p[0]-q[0];
      const l = Math.sqrt(ax*ax + ay*ay); if(l < 1e-12) continue;
      ax /= l; ay /= l;
      let a0=Infinity,a1=-Infinity,b0=Infinity,b1=-Infinity;
      for(let j=0;j<A.length;j++){ const t = A[j][0]*ax + A[j][1]*ay; if(t<a0)a0=t; if(t>a1)a1=t; }
      for(let j=0;j<B.length;j++){ const t = B[j][0]*ax + B[j][1]*ay; if(t<b0)b0=t; if(t>b1)b1=t; }
      const g = (b0-a1 > a0-b1) ? b0-a1 : a0-b1;
      if(g > mejor){ mejor = g; if(basta !== undefined && mejor >= basta) return mejor; }
    }
  }
  return mejor;
}
// Casillas que toca una caja envolvente, recortadas al lienzo: lo que queda
// fuera cae en la casilla del borde, y como después se compara por ejes
// separadores, eso solo cuesta una comparación de más, nunca un error.
function _celdasPF(bb, m, salida){
  const cM = Math.floor(W/_REJ_CELDA) + 1, fM = Math.floor(H/_REJ_CELDA) + 1;
  salida[0] = Math.max(-1, Math.min(cM, Math.floor((bb[0]-m)/_REJ_CELDA)));
  salida[1] = Math.max(-1, Math.min(cM, Math.floor((bb[2]+m)/_REJ_CELDA)));
  salida[2] = Math.max(-1, Math.min(fM, Math.floor((bb[1]-m)/_REJ_CELDA)));
  salida[3] = Math.max(-1, Math.min(fM, Math.floor((bb[3]+m)/_REJ_CELDA)));
  return salida;
}
const _celdaTmp = [0,0,0,0];
function _regPoner(pol, tipo, txt){
  const bb = _bbPolPF(pol), i = _rotCajas.length;
  const ficha = {pol, bb, tipo:tipo||'trazo', txt:txt||''};
  _rotCajas.push(ficha);
  const c = _celdasPF(bb, 0, _celdaTmp);
  if((c[1]-c[0]+1)*(c[3]-c[2]+1) > 60){ _rotGrandes.push(i); return ficha; }
  for(let x=c[0];x<=c[1];x++) for(let y=c[2];y<=c[3];y++){
    const k = (x+2)*256 + (y+2);
    const a = _rotRejilla.get(k);
    if(a) a.push(i); else _rotRejilla.set(k, [i]);
  }
  return ficha;
}
function _regChoca(pol, margen, filtro){
  const bb = _bbPolPF(pol);
  const sello = ++_rotSello;
  const mirar = i => {
    if(_rotVisto[i] === sello) return false;
    _rotVisto[i] = sello;
    const it = _rotCajas[i];
    if(!_cercaPF(bb, it.bb, margen) || (filtro && !filtro(it))) return false;
    return _sepPolPF(pol, it.pol, margen) < margen;
  };
  for(let n=0;n<_rotGrandes.length;n++) if(mirar(_rotGrandes[n])) return true;
  const c = _celdasPF(bb, margen, _celdaTmp);
  for(let x=c[0];x<=c[1];x++) for(let y=c[2];y<=c[3];y++){
    const a = _rotRejilla.get((x+2)*256 + (y+2));
    if(!a) continue;
    for(let n=0;n<a.length;n++) if(mirar(a[n])) return true;
  }
  return false;
}
// Rectángulo recto (la forma de siempre de reservar: una caja).
function _reservar(x0,y0,x1,y1,tipo){
  const a = Math.min(x0,x1), b = Math.min(y0,y1), c = Math.max(x0,x1), d = Math.max(y0,y1);
  _regPoner([[a,b],[c,b],[c,d],[a,d]], tipo || 'cuerpo');
}
// Caja de un símbolo girado: el rectángulo local (x0,y0)-(x1,y1) girado `rot`
// radianes alrededor de (cx,cy). Se guarda el POLÍGONO GIRADO, no su envolvente
// recta: un apoyo en oblicuo reservaba así sitio que no ocupa y dejaba sin hueco
// a lo que cabía a su lado.
function _reservarGirado(cx,cy,rot,x0,y0,x1,y1,tipo){
  const c = Math.cos(rot), s = Math.sin(rot);
  _regPoner([[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(p => [cx + p[0]*c - p[1]*s, cy + p[0]*s + p[1]*c]),
            tipo || 'simbolo');
}
// Un trazo con su grosor: el rectángulo de semianchura `semi` alrededor del segmento.
function _reservarTrazo(x1,y1,x2,y2,semi,tipo){
  const dx = x2-x1, dy = y2-y1, L = Math.sqrt(dx*dx + dy*dy);
  if(L < 1e-9){ _reservar(x1-semi, y1-semi, x1+semi, y1+semi, tipo); return; }
  const nx = -dy/L*semi, ny = dx/L*semi;
  _regPoner([[x1+nx,y1+ny],[x2+nx,y2+ny],[x2-nx,y2-ny],[x1-nx,y1-ny]], tipo || 'trazo');
}
// Una polilínea en pantalla (un tramo curvo, la tapa de un diagrama, la banda del
// peso). Se registra a trozos: `maxSeg` cuerdas bastan para un arco y evitan
// meter sesenta polígonos por tramo en el registro.
function _reservarPolilinea(ps, semi, tipo, maxSeg){
  if(!ps || ps.length < 2) return;
  const n = ps.length - 1, k = Math.max(1, Math.ceil(n/(maxSeg || 10)));
  for(let i=0;i<n;i+=k){
    const j = Math.min(i+k, n);
    _reservarTrazo(ps[i][0], ps[i][1], ps[j][0], ps[j][1], semi, tipo);
  }
}
// La columna de control, su desplegable, los botones del lienzo y la pista se
// superponen al canvas: lo que caiga debajo no se lee (CLAUDE.md §7). Se
// registran como un elemento más, así que el colocador los esquiva sin reglas
// aparte, y con su medida REAL, que es la que cambia en el móvil. De paso queda
// calculado el margen izquierdo, que es esa misma medida vista de otra manera.
//
// Se mira el RECTÁNGULO, no `getComputedStyle`: leer el estilo calculado de seis
// elementos en cada repintado costaba más que todo el registro junto, y no hace
// falta. Un panel apartado con `transform` deja su rectángulo fuera del lienzo y
// el propio rectángulo lo descarta; la única salvedad es el desplegable, que con
// `plegado` está además a opacidad 0 aunque en el móvil su borde derecho asome
// dentro del lienzo (y ahí `plegado` sí significa siempre oculto: no hay ninguna
// consulta de medios que lo devuelva, al revés que en la columna).
function _reservarZonasUI(){
  _margenIzqCache = 8;
  try{
    const cr = cv.getBoundingClientRect();
    const marca = (el, izquierda) => {
      if(!el) return;
      const r = el.getBoundingClientRect();
      if(r.width <= 0 || r.height <= 0) return;
      const x0 = r.left-cr.left, y0 = r.top-cr.top, x1 = r.right-cr.left, y1 = r.bottom-cr.top;
      if(x1 <= 0 || y1 <= 0 || x0 >= W || y0 >= H) return;
      _reservar(x0, y0, x1, y1, 'ui');
      if(izquierda) _margenIzqCache = Math.max(_margenIzqCache, x1 + 8);
    };
    marca(document.getElementById('leftPanel'), true);
    const fly = document.getElementById('panelFlyout');
    if(fly && !fly.classList.contains('plegado')) marca(fly, true);
    marca(document.getElementById('canvasHint'));
    marca(document.querySelector('.zoom-box'));
  }catch(e){}
}

// ── Rótulos que no se pisan con nada ──
// `_rotulo` mide el texto y lo encola; `_pintarRotulos` lo coloca. (x, y) es el
// sitio natural —el que pidió quien dibuja— y (ax, ay) la dirección preferida
// para apartarse. Se prueba el sitio natural y después posiciones a 15, 30, 45,
// 66, 90 y 120 px en esa dirección y girando alrededor de ella; gana la primera
// que queda libre, así que el rótulo se queda JUNTO A SU ELEMENTO y nunca se va
// a media pantalla (120 px es un 10 % del ancho del lienzo). Si de verdad no hay
// hueco, se escribe con halo —mejor tapado que perdido—, que es el último recurso.
const _ROT_PASOS = [15, 30, 45, 66, 90, 120];
// La 2ª pasada —la que tiene prohibido tapar otro rótulo— busca más lejos:
// antes que borrar un dato ya escrito, el rótulo se aparta. Solo llega ahí lo que
// no cabía cerca, así que la colocación normal (1ª pasada, ≤ 120 px) no cambia.
const _ROT_PASOS_LEJOS = [15, 30, 45, 66, 90, 120, 155, 195, 240, 290];
const _ROT_GIROS = [0, 28, -28, 56, -56, 90, -90, 124, -124, 180];
// Ancho de un texto, recordado por (letra, texto). Cambiar `ctx.font` cuesta
// unos 15 µs en Chrome, y medir cada rótulo en cada repintado era el gasto
// mayor de todo esto; el ancho de un texto con una letra dada no cambia nunca.
let _rotAnchos = new Map();
function _anchoTextoPF(txt, font){
  const k = font + '\u0000' + txt;
  let w = _rotAnchos.get(k);
  if(w === undefined){
    const previa = ctx.font;
    ctx.font = font;
    w = ctx.measureText(txt).width;
    ctx.font = previa;
    if(_rotAnchos.size > 500) _rotAnchos.clear();
    _rotAnchos.set(k, w);
  }
  return w;
}
function _rotulo(txt, x, y, color, ax, ay, font, alinear, prio){
  const f = font || '700 10.5px Inter,sans-serif';
  _rotCola.push({txt, x, y, color, ax:ax||0, ay:ay||0, font:f, al:alinear||'left',
                 w: _anchoTextoPF(txt, f) + 6, h:14, prio: (prio === undefined ? _ROT_VALOR : prio)});
}
function _cajaRotPF(r, cx, cy){
  const x0 = r.al === 'center' ? cx - r.w/2 : (r.al === 'right' ? cx - r.w : cx);
  return {x0, y0: cy - r.h/2, x1: x0 + r.w, y1: cy + r.h/2};
}
function _polCajaRotPF(q){ return [[q.x0,q.y0],[q.x1,q.y0],[q.x1,q.y1],[q.x0,q.y1]]; }
let _rotFontActual = null;      // la letra puesta en ctx, para no repetirla
function _rotPintar(r, cx, cy, q, ultimo){
  // El halo es SIEMPRE el mismo. Con uno opaco, un rótulo del último recurso
  // borraba del todo al que ya estaba escrito debajo (a 375 px, «Zona 1 · nivel
  // …» se comía «zP1 = 1.33 m» y no quedaba ni rastro); con .82 lo de debajo
  // todavía se adivina. `ultimo` queda anotado en la ficha para poder contar
  // desde la consola cuántos rótulos acabaron ahí.
  _regPoner(_polCajaRotPF(q), 'texto', r.txt).ultimo = !!ultimo;
  if(r.font !== _rotFontActual){ ctx.font = r.font; _rotFontActual = r.font; }
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fillRect(q.x0, q.y0, q.x1-q.x0, q.y1-q.y0);
  ctx.fillStyle = r.color || '#1b1f24';
  ctx.textAlign = r.al; ctx.textBaseline = 'middle';
  ctx.fillText(r.txt, cx + (r.al === 'left' ? 3 : (r.al === 'right' ? -3 : 0)), cy);
}
// El menor empujón que saca la caja `q` de los rectángulos de interfaz que la
// tapan. Hace falta porque el radio de búsqueda llega a 120 px y el desplegable
// de la columna mide 260: desde debajo de él NINGUNA posición candidata sale del
// panel, y el rótulo se quedaba invisible (pasaba con «NA = 39.24 kN» en el
// ejemplo `curva` con el desplegable Elementos abierto). Se prueban los cuatro
// lados del panel y gana el más corto que deje la caja dentro del lienzo; el
// bucle se repite porque la columna y su desplegable se solapan entre sí.
// Solo se llama en el último recurso, así que recorrer la lista entera no pesa.
function _empujonFueraDeUI(q){
  let dx = 0, dy = 0;
  for(let vuelta=0; vuelta<3; vuelta++){
    const x0 = q.x0+dx, x1 = q.x1+dx, y0 = q.y0+dy, y1 = q.y1+dy;
    let bb = null;
    for(let i=0;i<_rotCajas.length;i++){
      const it = _rotCajas[i];
      if(it.tipo !== 'ui') continue;
      if(x0 < it.bb[2] && it.bb[0] < x1 && y0 < it.bb[3] && it.bb[1] < y1){ bb = it.bb; break; }
    }
    if(!bb) break;
    const cand = [[bb[0]-x1-2, 0], [bb[2]-x0+2, 0], [0, bb[1]-y1-2], [0, bb[3]-y0+2]];
    let mejor = null, coste = Infinity;
    for(let k=0;k<4;k++){
      const c = cand[k];
      if(x0+c[0] < 2 || y0+c[1] < 2 || x1+c[0] > W-2 || y1+c[1] > H-2) continue;
      const v = Math.abs(c[0]) + Math.abs(c[1]);
      if(v < coste){ coste = v; mejor = c; }
    }
    if(!mejor) break;
    dx += mejor[0]; dy += mejor[1];
  }
  return [dx, dy];
}
function _colocarRotulo(r){
  const nn = Math.hypot(r.ax, r.ay);
  const base = nn > 1e-9 ? Math.atan2(r.ay/nn, r.ax/nn) : -Math.PI/2;   // sin dirección, hacia arriba
  // Si el sitio natural cae fuera del lienzo, su elemento tampoco se ve: no se
  // exige entonces que la caja quepa dentro (si no, el rótulo se iba lejísimos).
  const dentro = r.x > -60 && r.x < W+60 && r.y > -60 && r.y < H+60;
  const cabe = q => !dentro || (q.x0 >= 2 && q.y0 >= 2 && q.x1 <= W-2 && q.y1 <= H-2);
  // Las posiciones que se prueban: el sitio natural y, tras él, anillos en la
  // dirección preferida. Y TRES pasadas sobre esas mismas posiciones, porque no
  // todo lo que estorba estorba igual:
  //   1ª  esquivándolo todo;
  //   2ª  esquivando solo los paneles y LOS RÓTULOS YA ESCRITOS: sobre un trazo
  //       el halo salva el texto, pero encima de otro rótulo lo borra, y eso es
  //       perder un dato que ya estaba en pantalla;
  //   3ª  esquivando solo los paneles, porque debajo de la columna, de los
  //       botones o de la pista ningún halo salvaría el rótulo.
  // Si ninguna cabe, su sitio natural, apartado del panel que lo tape.
  const esUI = it => it.tipo === 'ui';
  const esUIoTexto = it => it.tipo === 'ui' || it.tipo === 'texto' || it.tipo === 'texto-core';
  const prueba = (filtro, pasos) => {
    let q = _cajaRotPF(r, r.x, r.y);
    if(cabe(q) && !_regChoca(_polCajaRotPF(q), 1.2, filtro)) return [r.x, r.y, q];
    for(let i=0;i<pasos.length;i++) for(let j=0;j<_ROT_GIROS.length;j++){
      const a = base + _ROT_GIROS[j]*Math.PI/180, d = pasos[i];
      const cx = r.x + Math.cos(a)*d, cy = r.y + Math.sin(a)*d;
      q = _cajaRotPF(r, cx, cy);
      if(cabe(q) && !_regChoca(_polCajaRotPF(q), 1.2, filtro)) return [cx, cy, q];
    }
    return null;
  };
  let p = prueba(null, _ROT_PASOS);
  if(p) return _rotPintar(r, p[0], p[1], p[2], false);
  p = prueba(esUIoTexto, _ROT_PASOS_LEJOS);
  if(p) return _rotPintar(r, p[0], p[1], p[2], false);
  p = prueba(esUI, _ROT_PASOS_LEJOS);
  if(!p){
    const d = _empujonFueraDeUI(_cajaRotPF(r, r.x, r.y));
    const cx = r.x + d[0], cy = r.y + d[1];
    p = [cx, cy, _cajaRotPF(r, cx, cy)];
  }
  _rotPintar(r, p[0], p[1], p[2], true);
}
function _pintarRotulos(){
  const cola = _rotCola.map((r,i) => ({r,i}));
  cola.sort((a,b) => (a.r.prio - b.r.prio) || (a.i - b.i));
  ctx.save();
  _rotFontActual = null;
  cola.forEach(o => _colocarRotulo(o.r));
  ctx.restore();
  _rotCola = [];
}
function _flecha(x0,y0,x1,y1,color,ancho,cabeza){
  const a = Math.atan2(y1-y0, x1-x0), c = cabeza || 9;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = ancho || 2;
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1 - Math.cos(a)*c*0.6, y1 - Math.sin(a)*c*0.6); ctx.stroke();
  const p1 = [x1 - Math.cos(a)*c - Math.sin(a)*c*0.45, y1 - Math.sin(a)*c + Math.cos(a)*c*0.45];
  const p2 = [x1 - Math.cos(a)*c + Math.sin(a)*c*0.45, y1 - Math.sin(a)*c - Math.cos(a)*c*0.45];
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Al registro, fuste y punta en UN solo polígono convexo: la cola con el grosor
  // del trazo, la base de la punta con su ancho y el vértice. Una flecha es lo que
  // más se cruza con un rótulo y hay muchas (las del diagrama de presión), así que
  // vale la pena no meter dos elementos por cada una.
  const L = Math.sqrt((x1-x0)*(x1-x0) + (y1-y0)*(y1-y0)) || 1;
  const ux = (x1-x0)/L, uy = (y1-y0)/L, nx = -uy, ny = ux;
  const s = (ancho || 2)/2 + 0.6, h = c*0.45 + 0.6, cc = Math.min(c, L*0.9);
  const bx = x1 - ux*cc, by = y1 - uy*cc;
  _regPoner([[x0+nx*s, y0+ny*s], [bx+nx*h, by+ny*h], [x1, y1], [bx-nx*h, by-ny*h], [x0-nx*s, y0-ny*s]], 'flecha');
}
// El arco del ángulo agudo de una reacción lo dibuja `bsaArcoReaccion` (core), y
// core no conoce este registro ni debe conocerlo: es el MISMO dibujo en los tres
// temas que lo usan (CLAUDE.md §5.5). Aquí se apunta lo que ese dibujo ocupa —la
// línea de referencia a trazos, el arco y el valor en grados— repitiendo su
// geometría: si allí cambia, hay que cambiarlo aquí. Su valor en grados es, por
// eso, el ÚNICO texto del lienzo que no pasa por el colocador; va como
// 'texto-core' para que los rótulos del tema lo esquiven igualmente.
function _reservarArcoReaccion(x0, y0, ex, ey){
  const ag = bsaAnguloAgudoEje(ex, ey);
  if(ag.grados < 4) return;
  const rx = ag.desdeV ? 0 : (ex >= 0 ? 1 : -1), ry = ag.desdeV ? (ey >= 0 ? 1 : -1) : 0;
  const a0 = Math.atan2(-ry, rx), a1 = Math.atan2(-ey, ex);
  let d = a1 - a0; while(d > Math.PI) d -= 2*Math.PI; while(d < -Math.PI) d += 2*Math.PI;
  _reservarTrazo(x0, y0, x0 + 26*rx, y0 - 26*ry, 1.2, 'arco');
  const arc = [];
  for(let i=0;i<=6;i++){ const a = a0 + d*i/6; arc.push([x0 + 17*Math.cos(a), y0 + 17*Math.sin(a)]); }
  _reservarPolilinea(arc, 1.4, 'arco', 6);
  const sx = Math.cos(a1), sy = Math.sin(a1), tx = rx, ty = -ry;
  let qx = -ty, qy = tx;
  if(qx*sx + qy*sy > 0){ qx = -qx; qy = -qy; }
  const txt = dec(ag.grados,'f') + '°';
  ctx.save(); ctx.font = '700 10px Inter, sans-serif';
  const w = ctx.measureText(txt).width;
  ctx.restore();
  const tX = x0 + 26*tx + 14*qx, tY = y0 + 26*ty + 14*qy;
  const iz = sx < 0 ? tX : tX - w;
  _reservar(iz, tY-7, iz+w, tY+7, 'texto-core');
}
// Nombre con subíndice (F₁, R_xA…) en el lienzo: la base y el subíndice en dos tamaños.
function _nombreSub(base, sub, x, y, color, font){
  ctx.save();
  ctx.font = font || '700 11px Inter,sans-serif';
  const wb = ctx.measureText(base).width;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = color; ctx.fillText(base, x, y);
  ctx.font = '700 8.5px Inter,sans-serif';
  ctx.fillText(sub, x + wb + 0.5, y + 3.5);
  const w = wb + ctx.measureText(sub).width + 2;
  ctx.restore();
  return w;
}

// La columna de control (y su desplegable) se superponen al borde izquierdo
// del lienzo: lo que se rotule pegado a ese borde debe empezar más allá. El valor
// lo deja medido `_reservarZonasUI` al principio de cada dibujar(), a partir del
// rectángulo real del panel y no de su clase: en escritorio la columna lleva
// siempre `plegado` y se ve igual (`.left-panel.plegado{transform:none}` a partir
// de 821 px), y por mirar la clase en vez de la medida «ZONA 1» y los niveles se
// escribían en x = 12, debajo de la columna (CLAUDE.md §7, «Nada dibujado bajo la
// columna»). En el móvil, con la columna apartada, su rectángulo queda fuera del
// lienzo y el margen vuelve a ser el de siempre; en la lámina del informe PDF el
// lienzo temporal está a left:20000px y ningún panel lo cruza, así que allí sigue
// valiendo 8 y la figura del PDF no cambia.
function _margenIzq(){ return _margenIzqCache; }

// Escala común de los diagramas de presión: la mayor presión de todas las
// zonas y tramos ocupa 80 px, para que las dos zonas sean comparables.
function _presionMaxima(){
  let pM = 0;
  tramos.forEach(t=>{
    if(t.activo === false) return;
    puntosTramo(t, 40).forEach(P=>{ pM = Math.max(pM, presionZona(1,P.y), presionZona(2,P.y)); });
  });
  return pM;
}

// Diagrama de presión de la zona z sobre el tramo t, dibujado del lado del
// líquido y solo donde el tramo está mojado, con flechas hacia la compuerta.
function dibujarDiagramaPresion(t, pts, z, e){
  const niv = nivelZona(z);
  if(!isFinite(niv)) return;
  const nDes = [];
  let alguno = false;
  pts.forEach((P,i)=>{
    const p = presionZona(z, P.y);
    const nv = normalHaciaZona(t, i, pts, z);
    const [sx,sy] = aPantalla(P.x, P.y);
    const d = p*e;
    nDes.push({sx, sy, ox: sx + nv.x*d, oy: sy - nv.y*d, p});
    if(p > 1e-12) alguno = true;
  });
  if(!alguno) return;
  // contorno: base sobre el tramo (parte mojada) y tapa desplazada
  ctx.save();
  ctx.beginPath();
  const tramosMoj = [];
  let actual = null;
  nDes.forEach((q,i)=>{
    const P = pts[i];
    if(P.y <= niv + 1e-12){ if(!actual){ actual = []; } actual.push(q); }
    else if(actual){ tramosMoj.push(actual); actual = null; }
  });
  if(actual) tramosMoj.push(actual);
  tramosMoj.forEach(seg=>{
    if(seg.length < 2) return;
    ctx.beginPath();
    seg.forEach((q,i)=>{ i ? ctx.lineTo(q.sx,q.sy) : ctx.moveTo(q.sx,q.sy); });
    for(let i=seg.length-1;i>=0;i--) ctx.lineTo(seg[i].ox, seg[i].oy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(192,57,43,.13)'; ctx.fill();
    ctx.strokeStyle = 'rgba(192,57,43,.75)'; ctx.lineWidth = 1.3; ctx.stroke();
    // Al registro va el CONTORNO (la tapa y los dos costados), no el relleno: el
    // interior es una trama clarísima y un rótulo se lee bien encima, mientras
    // que un trazo debajo de la letra no.
    const pr = seg.length-1;
    _reservarPolilinea(seg.map(q=>[q.ox,q.oy]), 1.3, 'presion', 10);
    _reservarTrazo(seg[0].sx, seg[0].sy, seg[0].ox, seg[0].oy, 1.3, 'presion');
    _reservarTrazo(seg[pr].sx, seg[pr].sy, seg[pr].ox, seg[pr].oy, 1.3, 'presion');
    // flechas hacia la compuerta, cada cierto trecho (se registran solas)
    const paso = Math.max(2, Math.floor(seg.length/7));
    for(let i=paso;i<seg.length-1;i+=paso){
      const q = seg[i];
      if(Math.hypot(q.ox-q.sx, q.oy-q.sy) < 9) continue;
      _flecha(q.ox, q.oy, q.sx, q.sy, 'rgba(192,57,43,.7)', 1.1, 6);
    }
    // valor de la presión en el extremo más profundo
    const fondo = seg.reduce((m,q)=>q.p > m.p ? q : m, seg[0]);
    if(fondo.p > 1e-12 && VIS.cotas)
      _rotulo('p = ' + dec(fondo.p,'f') + ' ' + uPres(), fondo.ox, fondo.oy, '#c0392b',
              fondo.ox - fondo.sx, fondo.oy - fondo.sy, '600 9.5px Inter,sans-serif', 'center', _ROT_VALOR);
  });
  ctx.restore();
}

function dibujar(){
  if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  _rotCajas = []; _rotCola = []; _rotRejilla = new Map(); _rotGrandes = [];
  _reservarZonasUI();
  // rejilla
  if(VIS.grilla){
    const paso = pasoRejilla();
    const [x0,y0]=aMundo(0,H), [x1,y1]=aMundo(W,0);
    ctx.lineWidth=1;
    for(let i=Math.floor(x0/paso);i<=Math.ceil(x1/paso);i++){
      const [px]=aPantalla(i*paso,0);
      ctx.strokeStyle = (i%5===0)?'rgba(120,132,148,.18)':'rgba(120,132,148,.08)';
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
    }
    for(let j=Math.floor(y0/paso);j<=Math.ceil(y1/paso);j++){
      const [,py]=aPantalla(0,j*paso);
      ctx.strokeStyle = (j%5===0)?'rgba(120,132,148,.18)':'rgba(120,132,148,.08)';
      ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(W,py); ctx.stroke();
    }
  }
  // La rejilla NO se registra: es un fondo grisáceo y un rótulo encima se lee.
  // ── Zonas y capas de líquido: la COMPUERTA es la que divide los líquidos.
  //    La frontera sube en vertical desde el primer nudo, recorre la compuerta
  //    (incluidas sus curvas) y desde el ÚLTIMO NUDO baja en VERTICAL.
  //    Cada zona se pinta recortada a su lado de esa frontera.
  const cadC = cadenaCompuerta();
  if(VIS.liquidos){
  const frPantalla = cadC
    ? cadC.pts.map(P=>aPantalla(P.x,P.y))
    : [[W/2,-10],[W/2,H+10]];               // sin compuerta: división provisional al centro
  const [ixF,iyF] = frPantalla[0];
  const [uxF,uyF] = frPantalla[frPantalla.length-1];
  const trazarFrontera = ()=>{
    ctx.moveTo(ixF, -10);
    ctx.lineTo(ixF, iyF);
    for(let q=1;q<frPantalla.length;q++) ctx.lineTo(frPantalla[q][0], frPantalla[q][1]);
    ctx.lineTo(uxF, H+10);
  };
  const hayCapas = capasOrdenadas(1).length || capasOrdenadas(2).length;
  [1,2].forEach(z=>{
    const capas = capasOrdenadas(z);
    if(!capas.length) return;
    ctx.save();
    ctx.beginPath();
    trazarFrontera();
    if(z===1){ ctx.lineTo(-10,H+10); ctx.lineTo(-10,-10); }
    else     { ctx.lineTo(W+10,H+10); ctx.lineTo(W+10,-10); }
    ctx.closePath();
    ctx.clip();
    capas.forEach((c,i)=>{
      const abajo = (i+1<capas.length) ? capas[i+1].niv : -1e6;
      const [,ya] = aPantalla(0, c.niv);
      const [,yb] = aPantalla(0, Math.max(abajo, -1e6));
      ctx.fillStyle = colorCapa(c.g).replace('rgb','rgba').replace(')', ',.30)');
      ctx.fillRect(0, ya, W, Math.min(yb,H)-ya);
      ctx.strokeStyle = '#2f7fb5'; ctx.lineWidth = (i===0)?2:1.2;
      ctx.beginPath(); ctx.moveTo(0,ya); ctx.lineTo(W,ya); ctx.stroke();
      const etq = (i===0 ? 'Zona ' + z + ' · nivel ' + dec(c.niv,'len') + ' ' + unitLen + ' · ' : '') + 'γ = ' + dec(c.g,'f') + ' ' + uGamma();
      const xi = _margenIzq() + 2;
      // La superficie del líquido cruza el lienzo entero: se registra fina, para
      // que un rótulo no se escriba justo encima de ella.
      _reservarTrazo(0, ya, W, ya, (i===0?2:1.2)/2 + 0.6, 'nivel');
      _rotulo(etq, z===1 ? xi : W-8, ya+13, '#1f6b96', 0, 1, '700 10px Inter,sans-serif',
              z===1 ? 'left' : 'right', _ROT_ZONA);
    });
    ctx.restore();
  });
  // frontera visible: la compuerta ya se dibuja sólida, así que se puntea
  // solo la bajada vertical desde el último nudo (y la subida sobre el primero)
  if(hayCapas){
    ctx.strokeStyle='rgba(27,31,36,.45)'; ctx.lineWidth=1.6; ctx.setLineDash([8,6]);
    ctx.beginPath(); ctx.moveTo(uxF, Math.max(uyF,-10)); ctx.lineTo(uxF, H); ctx.stroke();
    _reservarTrazo(uxF, Math.max(uyF,-10), uxF, H, 1.4, 'frontera');
    if(cadC){
      ctx.beginPath(); ctx.moveTo(ixF, Math.min(iyF,H+10)); ctx.lineTo(ixF, 0); ctx.stroke();
      _reservarTrazo(ixF, Math.min(iyF,H+10), ixF, 0, 1.4, 'frontera');
    }
    ctx.setLineDash([]);
    _rotulo('frontera de zonas', uxF+7, Math.min(Math.max(uyF+26, 26), H-12), 'rgba(27,31,36,.6)',
            0, 1, '700 10px Inter,sans-serif', 'left', _ROT_ZONA);
    _rotulo('ZONA 1', _margenIzq()+4, 20, 'rgba(27,31,36,.6)', 0, 1, '700 10px Inter,sans-serif', 'left', _ROT_ZONA);
    _rotulo('ZONA 2', W-12, 20, 'rgba(27,31,36,.6)', 0, 1, '700 10px Inter,sans-serif', 'right', _ROT_ZONA);
  }
  }

  // ── Diagramas de presión: del lado del líquido, solo en la parte mojada ──
  const pM = _presionMaxima();
  const e = pM > 1e-12 ? 80/pM : 0;
  if(VIS.presion && e > 0){
    tramos.forEach(t=>{
      if(t.activo === false) return;
      const pts = puntosTramo(t, 60);
      if(pts.length<2) return;
      [1,2].forEach(z=>dibujarDiagramaPresion(t, pts, z, e));
    });
  }

  // ── Tramos ──
  tramos.forEach(t=>{
    const pts = puntosTramo(t, 60);
    if(pts.length<2) return;
    const scr = pts.map(P=>aPantalla(P.x,P.y));
    ctx.beginPath();
    scr.forEach((s,i)=>{ i?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1]); });
    const inactivo = t.activo === false;
    const grueso = (selT.indexOf(t.id)>=0)?7:5;
    ctx.strokeStyle = (selT.indexOf(t.id)>=0)?'#0f5c56':(inactivo?'#9aa3ad':'#1b1f24');
    ctx.lineWidth = grueso;
    if(inactivo) ctx.setLineDash([9,6]);
    ctx.stroke();
    ctx.setLineDash([]);
    _reservarPolilinea(scr, grueso/2 + 0.6, 'tramo', 12);
    // Un tramo con peso propio asignado lleva una banda discreta a su lado, como
    // en fuerzas internas: sin marca no se sabría a cuáles se les puso.
    const _pp = VIS.peso ? pesoDe(t) : null;
    if(_pp){
      ctx.save();
      ctx.strokeStyle = (pesoActivo === _pp.id) ? '#b07d1a' : 'rgba(176,125,26,.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const banda = [];
      scr.forEach((s,i)=>{
        const b = scr[Math.min(i+1, scr.length-1)], o = scr[Math.max(i-1, 0)];
        const ln = Math.hypot(b[0]-o[0], b[1]-o[1]) || 1;
        const qx = s[0] - (b[1]-o[1])/ln*7, qy = s[1] + (b[0]-o[0])/ln*7;
        banda.push([qx,qy]);
        i ? ctx.lineTo(qx,qy) : ctx.moveTo(qx,qy);
      });
      ctx.stroke();
      ctx.restore();
      _reservarPolilinea(banda, 2.1, 'peso', 12);
    }
    const md = scr[Math.floor(scr.length/2)];
    _rotulo(nomTramo(t), md[0]+6, md[1]-9, '#0b3f3a', 0, -1, '700 10px Inter,sans-serif', 'left', _ROT_NOMBRE);
  });

  // ── Apoyos, rótulas, topes, nudos ──
  nodos.forEach(n=>{
    const [px,py]=aPantalla(n.x,n.y);
    if(VIS.apoyos){
    if(n.apoyo==='fijo'){
      // El giro del apoyo fijo es PRESENTACIÓN: coloca el símbolo donde lo pide
      // el enunciado y no toca el cálculo. Con 90° (por defecto) el triángulo
      // queda debajo del nudo, que es como se dibujaba antes de tener giro.
      const rot = Math.PI/2 - anguloDibujoApoyoFijo(n)*Math.PI/180;
      ctx.save(); ctx.translate(px,py); ctx.rotate(rot);
      ctx.strokeStyle='#0b3f3a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(-13,21); ctx.lineTo(13,21); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-19,21); ctx.lineTo(19,21); ctx.stroke();
      ctx.restore();
      _reservarGirado(px, py, rot, -19, 0, 19, 22);
    } else if(n.apoyo==='movil'){
      const u = {n, tipo:'R'};
      const d = direccionIncognita(u);
      const a = Math.atan2(d.y, d.x);
      ctx.save(); ctx.translate(px,py); ctx.rotate(Math.PI/2-a);
      ctx.strokeStyle='#0b3f3a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(-12,17); ctx.lineTo(12,17); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-6,21,3.5,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(6,21,3.5,0,Math.PI*2); ctx.stroke();
      ctx.restore();
      // La caja reservada gira con el símbolo (antes era la de un rodillo recto).
      _reservarGirado(px, py, Math.PI/2-a, -14, 0, 14, 25);
    }
    if(n.tope){
      // El tope es un bloque liso apoyado en la compuerta, del lado en que
      // está; empuja hacia el otro lado (dirección d de la incógnita).
      const u = {n, tipo:'T'};
      const d = direccionIncognita(u);
      const rt = Math.atan2(-d.y, d.x);
      ctx.save(); ctx.translate(px,py); ctx.rotate(rt);
      // bloque detrás del nudo (en −d), con rayado
      ctx.fillStyle='#e9d2b3'; ctx.strokeStyle='#b45309'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.rect(-22,-9,15,18); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      for(let k=-6;k<=6;k+=4){ ctx.moveTo(-22,k); ctx.lineTo(-28,k+5); }
      ctx.strokeStyle='#b45309'; ctx.lineWidth=1.1; ctx.stroke();
      ctx.restore();
      // el bloque y su rayado, girados con el tope (antes era una caja suelta)
      _reservarGirado(px, py, rt, -29, -11, -6, 11);
      const vt = (R && !R.error) ? valorTope(n) : null;
      if(vt === null){
        _rotulo('tope', px - d.x*36, py + d.y*36, '#b45309', -d.x, d.y, '700 10px Inter,sans-serif', 'center', _ROT_VALOR);
      }
    }
    }
    if(selN.indexOf(n.id)>=0){
      ctx.beginPath(); ctx.arc(px,py,12,0,Math.PI*2);
      ctx.fillStyle='rgba(15,92,86,.25)'; ctx.fill();
      ctx.strokeStyle='#0f5c56'; ctx.lineWidth=2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(px,py,n.rotula?7:6,0,Math.PI*2);
    ctx.fillStyle = n.rotula ? '#fff' : '#0b3f3a';
    ctx.fill();
    ctx.strokeStyle = n.rotula ? '#c0392b' : '#fff';
    ctx.lineWidth = n.rotula ? 2.6 : 2; ctx.stroke();
    const rn = (selN.indexOf(n.id)>=0) ? 13 : (n.rotula ? 8.5 : 7.5);
    _reservar(px-rn, py-rn, px+rn, py+rn, 'nudo');
    _rotulo(n.nombre, px+10, py-9, '#1b1f24', 1, -1, '700 10.5px Inter,sans-serif', 'left', _ROT_NOMBRE);
  });

  // ── Peso propio: W en el centroide de cada tramo, vertical hacia abajo ──
  // Se conoce antes de resolver (es geometría), así que se dibuja siempre.
  if(VIS.peso){
    fuerzasPesoPropio().forEach(c=>{
      const [px,py] = aPantalla(c.G.x, c.G.y);
      const y0 = py - 46;
      _flecha(px, y0, px, py - 2, '#7a5c1e', 2.6, 10);
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2); ctx.fillStyle = '#7a5c1e'; ctx.fill();
      _reservar(px-4, py-4, px+4, py+4, 'punto');
      _rotulo('W' + c.k.slice(1) + ' = ' + dec(c.F,'f') + ' ' + unitFor, px, y0 - 8, '#7a5c1e', 0, -1,
              '700 10.5px Inter,sans-serif', 'center', _ROT_VALOR);
    });
  }

  // ── Resultantes en su centro de presión y cota de profundidad ──
  if(R && !R.error && VIS.resultantes){
    R.cargas.forEach(c=>{
      const [px,py] = aPantalla(c.P.x, c.P.y);
      const L = 58;
      const x0 = px - c.dir.x*L, y0 = py + c.dir.y*L;
      _flecha(x0, y0, px, py, '#c0392b', 2.8, 11);
      ctx.beginPath(); ctx.arc(px,py,3.2,0,Math.PI*2); ctx.fillStyle='#c0392b'; ctx.fill();
      _reservar(px-4, py-4, px+4, py+4, 'punto');
      // rótulo en la cola de la flecha
      const txt = 'F' + c.k + ' = ' + dec(c.F,'f') + ' ' + unitFor;
      _rotulo(txt, x0 - c.dir.x*8, y0 + c.dir.y*8, '#c0392b', -c.dir.x, c.dir.y, '700 10.5px Inter,sans-serif', 'center', _ROT_VALOR);
      // cota de la profundidad del centro de presión, desde la superficie libre
      if(VIS.cotas && c.zP > 1e-9){
        const [,ys] = aPantalla(0, c.niv);
        const lado = (c.z===1) ? -1 : 1;          // hacia la zona del líquido
        const xc = px + lado*(L + 34);
        ctx.save();
        ctx.strokeStyle='rgba(27,31,36,.55)'; ctx.lineWidth=1;
        ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(xc + lado*4, py); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle='#1b1f24'; ctx.lineWidth=1.15;
        ctx.beginPath(); ctx.moveTo(xc, ys); ctx.lineTo(xc, py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xc-5, ys+5); ctx.lineTo(xc+5, ys-5); ctx.moveTo(xc-5, py+5); ctx.lineTo(xc+5, py-5); ctx.stroke();
        ctx.restore();
        _reservarTrazo(px, py, xc + lado*4, py, 1, 'cota');
        _reservarTrazo(xc, ys, xc, py, 1.2, 'cota');
        _reservarTrazo(xc-5, ys+5, xc+5, ys-5, 1.2, 'cota');
        _reservarTrazo(xc-5, py+5, xc+5, py-5, 1.2, 'cota');
        _rotulo('zP' + c.k + ' = ' + dec(c.zP,'len') + ' ' + unitLen, xc + lado*4, (ys+py)/2, '#1b1f24', lado, 0,
                '600 10px Inter,sans-serif', lado>0 ? 'left' : 'right', _ROT_VALOR);
      }
    });
  }

  // ── Reacciones resueltas: nombre completo y flecha en su sentido real ──
  if(R && !R.error){
    R.inc.forEach((u,j)=>{
      const v = R.val[j];
      if(esCero(v)) return;
      const d = sentidoRealIncognita(u, v);
      const [px,py]=aPantalla(u.n.x,u.n.y);
      const col = (u.tipo==='T') ? '#b45309' : '#15803d';
      // Si la flecha viene por el eje del símbolo (rodillo, pasador o bloque del
      // tope, a menos de 35° de hacia donde cuelga), nace más allá de él en vez de
      // cruzarlo; y una reacción o un tope inclinados llevan en la cola el arco de
      // su ángulo agudo con el eje más cercano (bsaArcoReaccion, el mismo dibujo
      // que armaduras y fuerzas internas; 2026-09-14).
      let hx = null, hy = null, ext = 0;
      if(u.tipo === 'T'){ const dd = direccionIncognita(u); hx = -dd.x; hy = -dd.y; ext = 30; }
      else if(u.n.apoyo === 'movil'){ const dd = direccionIncognita({n:u.n, tipo:'R'}); hx = -dd.x; hy = -dd.y; ext = 34; }
      else if(u.n.apoyo === 'fijo'){ const hd = (anguloDibujoApoyoFijo(u.n) - 180)*Math.PI/180; hx = Math.cos(hd); hy = Math.sin(hd); ext = 34; }
      const porElApoyo = hx !== null && (-d.x*hx - d.y*hy) > Math.cos(35*Math.PI/180);
      const d1 = porElApoyo ? ext : 8;
      const L = d1 + ((u.tipo==='T') ? 36 : 38);
      // llega al nudo desde fuera, en su sentido real
      const x0 = px - d.x*L, y0 = py + d.y*L;
      _flecha(x0, y0, px - d.x*d1, py + d.y*d1, col, 2.6, 10);
      if(u.tipo === 'R' || u.tipo === 'T'){
        bsaArcoReaccion(ctx, x0, y0, d.x, d.y, col);
        _reservarArcoReaccion(x0, y0, d.x, d.y);
      }
      const base = (u.tipo==='T') ? 'N' : 'R';
      const sub = (u.tipo==='Rx') ? 'x'+u.n.nombre : (u.tipo==='Ry') ? 'y'+u.n.nombre : u.n.nombre;
      const txt = base + '_' + sub + ' = ' + dec(Math.abs(v),'f') + ' ' + unitFor;
      _rotulo(txt.replace('_',''), x0 - d.x*6, y0 + d.y*6, col, -d.x, d.y, '700 10.5px Inter,sans-serif', 'center', _ROT_VALOR);
    });
  }

  // Los textos, al final: ya está registrada toda la geometría del repintado.
  _pintarRotulos();
}
function valorTope(n){
  if(!R || R.error) return null;
  let out = null;
  R.inc.forEach((u,j)=>{ if(u.tipo==='T' && u.n.id===n.id) out = R.val[j]; });
  return out;
}
