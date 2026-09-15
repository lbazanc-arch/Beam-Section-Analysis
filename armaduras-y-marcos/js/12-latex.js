// ═══════════════════════════════════════════════════════════
//  LATEX
// ═══════════════════════════════════════════════════════════
// Traductor independiente del HTML: parte de los mismos datos que ya
// alimentan resultsPanel (nodos, barras, resultado), no del HTML ya armado.
// Genera un .tex compatible con pdflatex "de fabrica" (sin fontspec ni
// fuentes externas) para que compile igual en cualquier servicio de
// compilacion, sin depender de que motor tenga instalado.
function escLatex(s){
  return String(s).replace(/([%&_#{}$])/g, '\\$1');
}
function tikzColorFuerza(v){
  return esCero(v) ? 'black!45' : (v >= 0 ? 'bsaAcc2' : 'bsaRoj');
}
// Aclara un color para trazos auxiliares. Si ya es una mezcla ('black!40', el
// de una barra de fuerza cero), se deja tal cual: 'black!40!55' no es un color
// y pdflatex se detenía en cuanto una barra nula inclinada llevaba su ángulo.
function _tinte(col, pct){
  return String(col).indexOf('!') >= 0 ? col : col + '!' + pct;
}

// ── Escalas y medidas comunes de las figuras ──
// Cada figura se dibuja en «unidades de figura» y el tikzpicture la reduce con
// su `scale`. TikZ escala las coordenadas pero NO la letra, ni el grosor de las
// líneas, ni las puntas de flecha: todo lo que mide texto o puntas se pasa a
// unidades de figura dividiendo por la escala. Por eso la escala se declara
// UNA vez aquí: 13-construirlatex.js la pone en el tikzpicture y se la pasa a
// la función que dibuja. Antes cada figura llevaba su 0.72 o su 0.78 escrito a
// mano en los dos sitios, y bastaba con que uno cambiara para que las cajas de
// los rótulos dejaran de medir lo que miden.
const ESC_NUDO = 0.72;       // DCL de un nudo
const ESC_PORCION = 0.78;    // porción aislada por un corte
const ESC_BRAZOS = 0.78;     // brazos de una ecuación de momentos del corte
const ESC_GLOBAL = 1;        // modelo y DCL global de la armadura
const ESC_VARIANTE = 0.9;    // la armadura con otras cargas (¿qué pasa si…?, carga de falla)
// Flechas homogéneas: dentro de una figura, la barra cortada, la carga y la
// reacción miden lo mismo, y la punta que llega a un nudo se queda a FL_HUECO
// de él (en unidades de figura).
const FL_NUDO = 1.6, FL_GLOBAL = 1.1, FL_HUECO = 0.18;
// Punta `Stealth` del estilo bsaFuerza (preámbulo de 13-), en cm de papel.
const PUNTA_LARGO_CM = 0.24, PUNTA_SEMI_CM = 0.09, FUSTE_SEMI_CM = 0.025;
const PT_CM = 0.03515;

// ── Registro de ocupación de una figura ──
// Todo lo que se dibuja se apunta aquí como polígonos convexos, en unidades de
// figura: barras y fustes como trazos con su grosor, puntas, símbolos de apoyo
// según su giro, arcos, rótulos, nombres, cotas y guías. El colocador de
// rótulos, la esquina del marco, el lado de cada fuerza y las guías a trazos
// preguntan al mismo registro, en vez de llevar cada uno su lista de puntos.
// Cada elemento lleva `tipo` y, si nace en un nudo, `radialDe` (los nudos de los
// que sale): lo que sale del mismo nudo se compara por ángulo, no por solape,
// porque ahí todo converge y siempre «chocaría».
function _polSeg(x1, y1, x2, y2, semi){
  const L = Math.hypot(x2-x1, y2-y1);
  if(L < 1e-9) return _polCaja(x1, y1, 2*semi, 2*semi);
  const nx = -(y2-y1)/L*semi, ny = (x2-x1)/L*semi;
  return [[x1+nx, y1+ny], [x2+nx, y2+ny], [x2-nx, y2-ny], [x1-nx, y1-ny]];
}
function _polCaja(cx, cy, w, h){
  return [[cx-w/2, cy-h/2], [cx+w/2, cy-h/2], [cx+w/2, cy+h/2], [cx-w/2, cy+h/2]];
}
// Envolvente convexa (cadena monótona).
function _envolvente(ps){
  const p = ps.slice().sort((a, b) => a[0]-b[0] || a[1]-b[1]);
  if(p.length < 3) return p;
  const cruz = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const inf = [], sup = [];
  p.forEach(q => { while(inf.length >= 2 && cruz(inf[inf.length-2], inf[inf.length-1], q) <= 0) inf.pop(); inf.push(q); });
  for(let i = p.length-1; i >= 0; i--){
    const q = p[i];
    while(sup.length >= 2 && cruz(sup[sup.length-2], sup[sup.length-1], q) <= 0) sup.pop();
    sup.push(q);
  }
  inf.pop(); sup.pop();
  return inf.concat(sup);
}
// Separación entre dos polígonos convexos por ejes separadores: > 0 es la
// holgura (cota inferior de la distancia); <= 0, se solapan. Con `basta`, deja
// de buscar en cuanto un eje ya separa eso: al que pregunta solo le importa si
// la holgura llega a su margen.
function _separacion(A, B, basta){
  let mejor = -Infinity;
  for(let pasada = 0; pasada < 2; pasada++){
    const P = pasada ? B : A, n = P.length;
    for(let i = 0; i < n; i++){
      const p = P[i], q = P[(i+1) % n];
      let ax = q[1]-p[1], ay = p[0]-q[0];
      const l = Math.hypot(ax, ay); if(l < 1e-12) continue;
      ax /= l; ay /= l;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for(let j = 0; j < A.length; j++){ const t = A[j][0]*ax + A[j][1]*ay; if(t < a0) a0 = t; if(t > a1) a1 = t; }
      for(let j = 0; j < B.length; j++){ const t = B[j][0]*ax + B[j][1]*ay; if(t < b0) b0 = t; if(t > b1) b1 = t; }
      const g = b0-a1 > a0-b1 ? b0-a1 : a0-b1;
      if(g > mejor){ mejor = g; if(basta !== undefined && mejor >= basta) return mejor; }
    }
  }
  return mejor;
}
// Caja envolvente [x0, y0, x1, y1] de un polígono.
function _cajaDePol(P){
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for(let i = 0; i < P.length; i++){
    const x = P[i][0], y = P[i][1];
    if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}
function _cajasCerca(a, b, m){
  return a[0] - m <= b[2] && b[0] - m <= a[2] && a[1] - m <= b[3] && b[1] - m <= a[3];
}
// Cada elemento guarda su caja envolvente al ponerlo: `choca` y `golpes`
// descartan primero por solape de cajas (ampliadas con el margen) y solo
// comparan por ejes separadores lo que pasa ese filtro. Sin él, cada rótulo,
// cada tramo de guía y cada candidata del marco se comparaba con TODO lo
// dibujado, y construirLatex() tardaba de 40 a 90 veces más (más de un segundo
// en una Pratt por secciones, con el clic del móvil esperando).
function crearRegistro(esc){
  const items = [];
  const reg = {
    esc: esc || 1,
    items,
    ejes: [],     // punteados de eje ya trazados por arcoAngulo: {x, y, ang, largo}
    poner(pol, tipo, extra){ items.push(Object.assign({pol, tipo, bb:_cajaDePol(pol)}, extra || {})); },
    seg(x1, y1, x2, y2, semi, tipo, extra){ reg.poner(_polSeg(x1, y1, x2, y2, semi), tipo, extra); },
    caja(cx, cy, w, h, tipo, extra){ reg.poner(_polCaja(cx, cy, w, h), tipo, extra); },
    golpes(pols, margen, filtro){
      const cajas = pols.map(_cajaDePol);
      return items.filter(it => (!filtro || filtro(it)) &&
        pols.some((p, i) => _cajasCerca(cajas[i], it.bb, margen) && _separacion(p, it.pol, margen) < margen));
    },
    choca(pol, margen, filtro){
      const bb = _cajaDePol(pol);
      for(let i = 0; i < items.length; i++){
        const it = items[i];
        if(!_cajasCerca(bb, it.bb, margen) || (filtro && !filtro(it))) continue;
        if(_separacion(pol, it.pol, margen) < margen) return true;
      }
      return false;
    },
    limites(filtro){
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      items.forEach(it => {
        if(filtro && !filtro(it)) return;
        if(it.bb[0] < x0) x0 = it.bb[0]; if(it.bb[2] > x1) x1 = it.bb[2];
        if(it.bb[1] < y0) y0 = it.bb[1]; if(it.bb[3] > y1) y1 = it.bb[3];
      });
      return isFinite(x0) ? {x0, y0, x1, y1} : null;
    }
  };
  return reg;
}
// Tramos [t0, t1] (longitudes desde A) de la recta A→B que quedan a menos de
// `r` de algún elemento del registro que pase el filtro, ya unidos y ordenados.
// Es el mismo criterio que partir el trazo en trocitos y preguntar por cada
// uno, pero de una vez: por cada polígono convexo, la banda de la recta y el
// semiplano de cada arista (desplazado r) recortan el intervalo.
function _tramosBloqueados(reg, xa, ya, xb, yb, r, filtro){
  const L = Math.hypot(xb-xa, yb-ya);
  if(L < 1e-9) return [];
  const ux = (xb-xa)/L, uy = (yb-ya)/L, nx = -uy, ny = ux;
  const bb = [Math.min(xa, xb), Math.min(ya, yb), Math.max(xa, xb), Math.max(ya, yb)];
  const tramos = [];
  reg.items.forEach(it => {
    if(!_cajasCerca(bb, it.bb, r) || (filtro && !filtro(it))) return;
    const P = it.pol, n = P.length;
    let s0 = Infinity, s1 = -Infinity, a = Infinity, b = -Infinity, area = 0;
    for(let i = 0; i < n; i++){
      const dx = P[i][0]-xa, dy = P[i][1]-ya, s = dx*nx + dy*ny, t = dx*ux + dy*uy;
      if(s < s0) s0 = s; if(s > s1) s1 = s; if(t < a) a = t; if(t > b) b = t;
      const q = P[(i+1) % n]; area += P[i][0]*q[1] - q[0]*P[i][1];
    }
    if(s0 > r || s1 < -r) return;
    a -= r; b += r;
    if(n >= 3 && Math.abs(area) > 1e-12){
      const sg = area > 0 ? 1 : -1;       // antihorario: la normal exterior de p→q es (dy, -dx)
      for(let i = 0; i < n && a < b; i++){
        const p = P[i], q = P[(i+1) % n];
        let ex = sg*(q[1]-p[1]), ey = -sg*(q[0]-p[0]);
        const l = Math.hypot(ex, ey); if(l < 1e-12) continue;
        ex /= l; ey /= l;
        const coef = ex*ux + ey*uy, lim = ex*(p[0]-xa) + ey*(p[1]-ya) + r;
        if(Math.abs(coef) < 1e-12){ if(lim < 0) b = a - 1; continue; }
        if(coef > 0) b = Math.min(b, lim/coef); else a = Math.max(a, lim/coef);
      }
    }
    a = Math.max(a, 0); b = Math.min(b, L);
    if(b > a) tramos.push([a, b]);
  });
  tramos.sort((p, q) => p[0] - q[0]);
  const unidos = [];
  tramos.forEach(t => {
    const u = unidos[unidos.length-1];
    if(u && t[0] <= u[1]) u[1] = Math.max(u[1], t[1]); else unidos.push(t.slice());
  });
  return unidos;
}
// Fuste y punta de una flecha de (x1,y1) a la punta (x2,y2).
function _polFlecha(x1, y1, x2, y2, esc){
  const L = Math.hypot(x2-x1, y2-y1) || 1e-9, ux = (x2-x1)/L, uy = (y2-y1)/L;
  const pl = Math.min(PUNTA_LARGO_CM/esc, L), ps = PUNTA_SEMI_CM/esc;
  const bx = x2 - ux*pl, by = y2 - uy*pl;
  return [_polSeg(x1, y1, bx, by, FUSTE_SEMI_CM/esc), [[x2, y2], [bx - uy*ps, by + ux*ps], [bx + uy*ps, by - ux*ps]]];
}
// Dibuja una fuerza (estilo bsaFuerza: grosor y punta fijos) y la registra.
function _flecha(reg, x1, y1, x2, y2, col, extra){
  const F = v => v.toFixed(3);
  if(reg) _polFlecha(x1, y1, x2, y2, reg.esc).forEach(p => reg.poner(p, 'flecha', extra));
  return '\\draw[bsaFuerza, ' + col + '] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x2) + ',' + F(y2) + ');\n';
}
// ── Incógnita y fuerza cero conocida (decisión del profesor, 2026-09-15) ──
// Una fuerza de barra que se DESPEJA en la figura (la barra de un nudo que aún no
// se conoce, la barra cortada de una porción) va a trazos, en gris neutro y
// saliendo del nudo, que es el supuesto de tracción con el que se escriben las
// ecuaciones; la punta es sólida. Lo ya conocido va en trazo continuo con su color
// y su sentido real. Es lo mismo que dibuja la pantalla (_svgFlecha con `trazos`,
// en 09-). El trazo se para en la base de la punta y la punta la pone un tramo
// corto con bsaFuerza: así no depende de cómo caiga el último guion.
const COLOR_INCOGNITA = 'bsaNeutro';
const TRAZO_INCOGNITA = 'line width=1.1pt, dash pattern=on 3.6pt off 2.2pt';
function _flechaIncognita(reg, x1, y1, x2, y2, extra){
  const F = v => v.toFixed(3), esc = reg ? reg.esc : 1;
  const L = Math.hypot(x2-x1, y2-y1) || 1e-9, ux = (x2-x1)/L, uy = (y2-y1)/L;
  const pl = Math.min(PUNTA_LARGO_CM/esc, L), bx = x2 - ux*pl, by = y2 - uy*pl;
  const ax = bx - ux*0.03/esc, ay = by - uy*0.03/esc;
  if(reg) _polFlecha(x1, y1, x2, y2, esc).forEach(p => reg.poner(p, 'flecha', extra));
  return '\\draw[' + COLOR_INCOGNITA + ', ' + TRAZO_INCOGNITA + '] (' + F(x1) + ',' + F(y1) + ') -- (' + F(bx) + ',' + F(by) + ');\n'
       + '\\draw[bsaFuerza, ' + COLOR_INCOGNITA + '] (' + F(ax) + ',' + F(ay) + ') -- (' + F(x2) + ',' + F(y2) + ');\n';
}
// Barra de fuerza cero ya conocida: trazo continuo fino y gris, sin punta (no
// tiene sentido). A trazos se confundiría con una incógnita.
const COLOR_CERO = 'black!40';
function _trazoCero(reg, x1, y1, x2, y2, extra){
  const F = v => v.toFixed(3), esc = reg ? reg.esc : 1;
  if(reg) reg.seg(x1, y1, x2, y2, 0.04/esc, 'flecha', extra);
  return '\\draw[' + COLOR_CERO + ', line width=0.7pt] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x2) + ',' + F(y2) + ');\n';
}
// Trazo (guía, línea de referencia) que se interrumpe donde pasaría por encima
// de un fuste, un símbolo de apoyo, un rótulo o un nombre: solo se dibujan los
// tramos libres que miden algo (_tramosBloqueados).
function _trazoEvitando(reg, xa, ya, xb, yb, estilo, evitar){
  const F = v => v.toFixed(3), L = Math.hypot(xb-xa, yb-ya);
  if(L < 1e-6) return '';
  if(!reg) return '\\draw[' + estilo + '] (' + F(xa) + ',' + F(ya) + ') -- (' + F(xb) + ',' + F(yb) + ');\n';
  const e = reg.esc, semi = 0.015/e, marg = 0.03/e;
  const tipos = evitar || ['flecha', 'apoyo', 'rotulo', 'nombre'];
  const bloq = _tramosBloqueados(reg, xa, ya, xb, yb, semi + marg, it => tipos.indexOf(it.tipo) >= 0);
  const P = t => [xa + (xb-xa)*t/L, ya + (yb-ya)*t/L];
  const libres = [];
  let desde = 0;
  bloq.forEach(t => { if(t[0] > desde) libres.push([desde, t[0]]); desde = Math.max(desde, t[1]); });
  if(desde < L) libres.push([desde, L]);
  let s = '';
  libres.forEach(t => {
    if(t[1] - t[0] <= 0.10/e) return;
    const p = P(t[0]), q = P(t[1]);
    s += '\\draw[' + estilo + '] (' + F(p[0]) + ',' + F(p[1]) + ') -- (' + F(q[0]) + ',' + F(q[1]) + ');\n';
    reg.seg(p[0], p[1], q[0], q[1], semi, 'guia');
  });
  return s;
}

// ── Medida de los rótulos ──
// Ancho aproximado en puntos, a \small (10 pt), de un trozo de texto o de
// fórmula. Calibrado con la caja real de pdflatex (F_{AB} 19.3 pt, R_{yA} 18.4,
// «20.00\,kN» 37.2): basta para que la caja no se quede corta.
function _anchoPt(cad, enSub, mate){
  let w = 0;
  (String(cad).match(/\\[a-zA-Z]+|\\.|[\s\S]/g) || []).forEach(t => {
    if(t === '\\,') w += 1.67;
    else if(/^\\[;:!]$/.test(t)) w += 2.5;
    else if(/^\\(text|mathrm|operatorname|bfseries|small|tiny|scriptsize|footnotesize|normalfont)$/.test(t)) {}
    else if(t === '\\circ') w += enSub ? 3.5 : 5;
    else if(/^\\[a-zA-Z]+$/.test(t)) w += enSub ? 4.5 : 5.8;      // letra griega u otro símbolo
    else if(/^[{}$]$/.test(t)) {}
    else if(/[A-Z]/.test(t)) w += enSub ? 6.3 : 7.6;
    else if(/[a-z]/.test(t)) w += enSub ? 4.2 : 5.3;
    else if(/[0-9]/.test(t)) w += enSub ? 4.1 : 5.0;
    else if(t === '.' || t === ',' || t === "'") w += 2.8;
    else if(t === '-') w += mate ? 7.8 : 3.3;
    else if(t === ' ') w += 3.3;
    else w += 5;
  });
  return w;
}
// Caja de un rótulo, EN UNIDADES DE LA FIGURA: el `scale` del tikzpicture encoge
// las coordenadas pero no la letra, así que en esas unidades el rótulo mide
// 1/escala veces lo que mide en el papel. Incluye el inner sep de 1 pt de los
// estilos bsaRot y bsaNudo. `tam`: 'small' (por defecto), 'bf' (negrita),
// 'scriptsize' o 'tiny'.
function _cajaRotuloArm(txt, tam, escala){
  const e = escala || 1;
  const f = ({bf:1.12, footnotesize:0.9, scriptsize:0.8, tiny:0.6})[tam] || 1;
  let sub = 0;
  const s = String(txt).replace(/[_^]\{([^{}]*)\}|[_^](\\[a-zA-Z]+|.)/g, (m, g1, g2) => {
    sub += _anchoPt(g1 !== undefined ? g1 : g2, true);
    return '';
  });
  const w = (_anchoPt(s, false, /\$/.test(txt)) + sub + 2)*f, h = ((sub ? 9.0 : 7.2) + 2)*f;
  return {w: w*PT_CM/e, h: h*PT_CM/e};
}
// Extremo de la guía de un rótulo desplazado. La guía sale de (ax, ay) hacia el
// centro del rótulo (lx, ly), pero se detiene un poco antes del borde de su caja
// w×h: los rótulos no llevan fondo y, si llegase al centro, tacharía el texto.
// Devuelve null si el rótulo queda tan cerca que no hay guía que trazar.
function _finGuiaRotulo(ax, ay, lx, ly, w, h){
  const ox = lx - ax, oy = ly - ay, d = Math.hypot(ox, oy);
  if(d < 1e-6) return null;
  const ux = ox/d, uy = oy/d;
  const s = Math.min(Math.abs(ux) < 1e-6 ? Infinity : (w/2)/Math.abs(ux),
                     Math.abs(uy) < 1e-6 ? Infinity : (h/2)/Math.abs(uy)) + 0.05;
  if(s >= d) return null;
  return [lx - ux*s, ly - uy*s];
}

// ── Rótulo de una fuerza, detrás de su extremo libre ──
// El extremo libre es la cola si la fuerza llega al nudo y la punta si sale de
// él. El rótulo se centra en la prolongación de la flecha, a
// d = (|ux|·w + |uy|·h)/2 + holgura del extremo: lo justo para que la caja no
// toque la flecha sea cual sea su dirección. Antes iba a una distancia fija y,
// en horizontal, la punta de F_AB entraba en su propio rótulo. Si ahí choca con
// algo ya dibujado, se gira alrededor del extremo (±30°, ±60°, ±90°); después se
// prueba junto al fuste, a un lado y al otro; y solo si nada cabe se aleja con
// una guía delgada. La flecha nunca se alarga.
//   (ux, uy): dirección de la flecha hacia su extremo libre.
//   largo:    longitud de la flecha (para probar junto al fuste).
function _rotuloTrasExtremo(ex, ey, ux, uy, txt, estilo, escala, reg, largo){
  const esc = escala || (reg ? reg.esc : 1), F = v => v.toFixed(3);
  const caja = _cajaRotuloArm(txt, /bsaNudo|bfseries/.test(estilo) ? 'bf' : 'small', esc);
  const w = caja.w, h = caja.h, hol = 0.07/esc, marg = 0.03/esc;
  const dist = (cx, cy) => (Math.abs(cx)*w + Math.abs(cy)*h)/2 + hol;
  // Frente a otra flecha, un poco más de hueco: con el margen de las líneas el
  // rótulo quedaba pegado al fuste de una carga apilada detrás de la cola.
  const margFl = 0.06/esc;
  const libre = (x, y) => !reg || !(reg.choca(_polCaja(x, y, w, h), marg) || reg.choca(_polCaja(x, y, w, h), margFl, it => it.tipo === 'flecha'));
  const fijar = (x, y) => {
    if(reg) reg.caja(x, y, w, h, 'rotulo');
    return '\\node[' + estilo + '] at (' + F(x) + ',' + F(y) + ') {' + txt + '};\n';
  };
  const base = Math.atan2(uy, ux), rad = Math.PI/180;
  const cands = [];
  [0, 30, -30, 60, -60, 90, -90].forEach(g => {
    const cx = Math.cos(base + g*rad), cy = Math.sin(base + g*rad), d = dist(cx, cy);
    cands.push([ex + cx*d, ey + cy*d]);
  });
  if(largo){
    const nx = -uy, ny = ux, dn = dist(nx, ny) + 0.03/esc;
    [0.25, 0.5].forEach(t => [1, -1].forEach(sg => cands.push([ex - ux*largo*t + sg*nx*dn, ey - uy*largo*t + sg*ny*dn])));
  }
  for(const c of cands) if(libre(c[0], c[1])) return fijar(c[0], c[1]);
  // Último recurso: más lejos, unido al extremo con una guía.
  const colG = _tinte((estilo.match(/text=([^,\]]+)/) || [])[1] || 'black', 55);
  for(const mas of [0.25, 0.5, 0.8, 1.2]){
    for(const g of [0, 30, -30, 60, -60]){
      const cx = Math.cos(base + g*rad), cy = Math.sin(base + g*rad), d = dist(cx, cy) + mas/esc;
      const x = ex + cx*d, y = ey + cy*d;
      if(!libre(x, y)) continue;
      const ax = ex + cx*0.04/esc, ay = ey + cy*0.04/esc, fin = _finGuiaRotulo(ax, ay, x, y, w, h);
      let t = '';
      if(fin){
        t = '\\draw[' + colG + ', line width=0.3pt] (' + F(ax) + ',' + F(ay) + ') -- (' + F(fin[0]) + ',' + F(fin[1]) + ');\n';
        if(reg) reg.seg(ax, ay, fin[0], fin[1], 0.01/esc, 'guia');
      }
      return t + fijar(x, y);
    }
  }
  return fijar(cands[0][0], cands[0][1]);
}
// Nombre de un nudo: en la primera de ocho posiciones alrededor del punto que no
// choque con nada (arriba a la derecha, como siempre, si está libre).
function _rotuloNudo(reg, px, py, nombre, estilo, nudoId){
  const txt = escLatex(nombre), esc = reg.esc, caja = _cajaRotuloArm(txt, 'bf', esc), F = v => v.toFixed(3);
  const w = caja.w, h = caja.h, marg = 0.03/esc, est = estilo || 'bsaNudo';
  const noPropio = it => !(it.tipo === 'punto' && it.nudo === nudoId);
  // Frente a otro rótulo (la letra de un ángulo), más hueco: con el margen de las
  // líneas, «D» y «θ» se leían juntas, «Dθ».
  const margRot = 0.09/esc, esRot = it => it.tipo === 'rotulo';
  // Primero con el hueco amplio frente a los rótulos, alejándose poco a poco; si
  // nada cabe así, con el margen de siempre.
  for(const estricto of [true, false]){
    for(const r of [0.06, 0.16, 0.30, 0.45]){
      for(const [sx, sy] of [[1,1], [-1,1], [1,-1], [-1,-1], [0,1], [1,0], [-1,0], [0,-1]]){
        const x = px + sx*(w/2 + r/esc), y = py + sy*(h/2 + r/esc), pol = _polCaja(x, y, w, h);
        if(reg.choca(pol, marg, noPropio) || (estricto && reg.choca(pol, margRot, esRot))) continue;
        reg.poner(pol, 'nombre');
        return '\\node[' + est + '] at (' + F(x) + ',' + F(y) + ') {' + txt + '};\n';
      }
    }
  }
  const x = px + w/2 + 0.06/esc, y = py + h/2 + 0.06/esc;
  reg.caja(x, y, w, h, 'nombre');
  return '\\node[' + est + '] at (' + F(x) + ',' + F(y) + ') {' + txt + '};\n';
}

// ── Apoyo formal (pasador / rodillo), estilo libro de texto ──
// Triángulo con base y sombreado rayado bajo tierra; el rodillo añade dos
// círculos entre el triángulo y la tierra para indicar que puede rodar.
// `ang` es el ángulo del apoyo, desde +x y antihorario: la dirección de la
// reacción si es un rodillo, el giro estético si es un pasador. El símbolo se
// dibuja bajo el origen y todo él va dentro de un scope girado (la misma
// técnica que el empotramiento de fuerzas internas), así que un rodillo sobre
// un plano inclinado se ve inclinado. Va en gris: el morado es de las cargas.
// Con `reg`, registra la envolvente del símbolo YA GIRADA (tipo 'apoyo').
function tikzApoyo(tipo, px, py, ang, reg, nudoId){
  const w = 0.34, h = 0.52, F = v => v.toFixed(3), col = 'black!65';
  px = parseFloat(px); py = parseFloat(py);
  const giro = (ang === undefined || ang === null) ? 0 : (Number(ang) - 90);
  let s = '\\begin{scope}[shift={(' + F(px) + ',' + F(py) + ')}, rotate=' + giro.toFixed(2) + ']\n';
  s += '\\draw[' + col + ', line width=0.9pt, fill=white] (0,0) -- '
     + '++(-' + w + ',-' + h + ') -- ++(' + (2*w) + ',0) -- cycle;\n';
  const pts = [[0,0], [-w,-h], [w,-h]];
  let baseY = -h;
  if(tipo === 'movil'){
    const cy2 = baseY - 0.10;
    s += '\\draw[' + col + ', line width=0.7pt, fill=white] (' + F(-w*0.55) + ',' + F(cy2) + ') circle (0.10);\n';
    s += '\\draw[' + col + ', line width=0.7pt, fill=white] (' + F(w*0.55) + ',' + F(cy2) + ') circle (0.10);\n';
    baseY = cy2 - 0.10;
  }
  s += '\\draw[' + col + ', line width=0.8pt] (' + F(-w-0.06) + ',' + F(baseY) + ') -- '
     + '(' + F(w+0.06) + ',' + F(baseY) + ');\n';
  // rayado de tierra (hatching)
  const n = 5;
  for(let i=0;i<=n;i++){
    const hx = -w - 0.06 + i*(2*w+0.12)/n;
    s += '\\draw[' + col + ', line width=0.5pt] (' + F(hx) + ',' + F(baseY) + ') -- ++(-0.10,-0.11);\n';
  }
  s += '\\end{scope}\n';
  if(reg){
    pts.push([-w-0.06, baseY], [w+0.06, baseY], [-w-0.16, baseY-0.11], [w-0.04, baseY-0.11]);
    const g = giro*Math.PI/180, c = Math.cos(g), sn = Math.sin(g);
    reg.poner(_envolvente(pts.map(([x, y]) => [px + x*c - y*sn, py + x*sn + y*c])), 'apoyo', {nudo:nudoId});
  }
  return s;
}

// ── De qué lado del nudo va una fuerza aplicada en él ──
// Por defecto LLEGA al nudo (cola lejos, punta a FL_HUECO del nudo). No puede ir
// por un rayo que ya ocupe otra cosa que sale del mismo nudo —una barra, una
// fuerza ya colocada, o el eje del apoyo cuando se pide— ni pisar nada del
// registro; entonces SALE del nudo por el otro lado. Si los dos lados están
// ocupados, se apila en su propia línea de acción detrás de lo que ya ocupa el
// rayo: nunca se aparta lateralmente, porque la figura enseñaría un brazo que no
// existe. Así la carga y la reacción del mismo nudo no se pisan, y R_x no se
// dibuja encima de una barra. Una reacción (`esApoyo`) que tropieza con el
// símbolo de su propio apoyo no cambia de lado: nace más allá de la extensión
// real del símbolo, + FL_HUECO. Un rayo ocupado `blando` (el eje de un arco del
// nudo) se evita si se puede.
//   op: {reg, L, hueco, ocupados:[grados | {ang, tol, blando}], esApoyo}
// Devuelve {sentido:+1 llega | -1 sale, lateral:0, rx, ry (rayo que ocupa,
// desde el nudo), x1,y1 (cola), x2,y2 (punta), ex, ey (extremo libre), hueco, ang}.
function _angulosBarras(n){
  return barras.filter(b=>b.a===n.id||b.b===n.id).map(b=>{
    const o = nodos.find(z=>z.id===(b.a===n.id?b.b:b.a));
    return Math.atan2(o.y-n.y, o.x-n.x)*180/Math.PI;
  });
}
function _sepAng(p, q){ return Math.abs(((p - q) % 360 + 540) % 360 - 180); }
// Lo más lejos, a lo largo del rayo (rx,ry) desde (ox,oy) y dentro de una banda
// de semiancho `banda`, que llega el contorno de los polígonos dados.
function _extensionEnRayo(items, ox, oy, rx, ry, banda){
  // En cada arista, la distancia a lo largo del rayo y la lateral varían
  // linealmente: se recorta la arista a la banda y basta mirar sus extremos.
  let ext = 0;
  items.forEach(it => {
    const P = it.pol;
    for(let i = 0; i < P.length; i++){
      const a = P[i], b = P[(i+1) % P.length];
      const ax = a[0]-ox, ay = a[1]-oy, bx = b[0]-ox, by = b[1]-oy;
      const la = ax*ry - ay*rx, lb = bx*ry - by*rx, ta = ax*rx + ay*ry, tb = bx*rx + by*ry;
      let s0 = 0, s1 = 1;
      const dl = lb - la;
      if(Math.abs(dl) < 1e-12){ if(Math.abs(la) > banda) continue; }
      else {
        const u = (-banda - la)/dl, v = (banda - la)/dl;
        s0 = Math.max(s0, Math.min(u, v)); s1 = Math.min(s1, Math.max(u, v));
        if(s0 > s1) continue;
      }
      ext = Math.max(ext, ta + (tb-ta)*s0, ta + (tb-ta)*s1);
    }
  });
  return ext;
}
// El semieje desde el que arcoAngulo mide el ángulo agudo de una dirección
// (0/180 si es la horizontal, 90/−90 si es la vertical), o null si el ángulo es
// tan pequeño que no se acota.
function _ejeDeReferencia(ux, uy){
  const ag = bsaAnguloAgudoEje(ux, uy);
  if(ag.grados < 4) return null;
  return ag.desdeV ? (uy >= 0 ? 90 : -90) : (ux >= 0 ? 0 : 180);
}
// Los semiejes de los arcos pendientes con vértice en el nudo, como rayos
// ocupados «blandos» para ladoCarga: la carga prefiere no ir por ellos (el
// punteado del eje correría sobre su fuste), pero si no hay otro lado libre
// los ignora, y arcoAngulo ya no traza el punteado encima de la flecha.
function _ejesDeArcos(arcos, nudoId){
  return arcos.filter(a => a.nudo === nudoId).map(a => _ejeDeReferencia(a.ux, a.uy))
    .filter(v => v !== null).map(ang => ({ang, tol:20, blando:true}));
}
function ladoCarga(n, px, py, ux, uy, op){
  op = op || {};
  const reg = op.reg, esc = reg ? reg.esc : 1;
  const L = op.L || FL_GLOBAL, g0 = (op.hueco !== undefined) ? op.hueco : FL_HUECO;
  const ocup = (op.ocupados || []).map(o => typeof o === 'number' ? {ang:o, tol:14} : o);
  const margen = 0.04/esc, banda = PUNTA_SEMI_CM/esc + margen;
  const propia = it => it.radialDe && it.radialDe.indexOf(n.id) >= 0;
  const geom = (k, g) => {
    const rx = -k*ux, ry = -k*uy;
    const cx = px + rx*g, cy = py + ry*g, lx = px + rx*(g+L), ly = py + ry*(g+L);
    return {sentido:k, lateral:0, rx, ry, hueco:g, ang:Math.atan2(ry, rx)*180/Math.PI,
            x1: k > 0 ? lx : cx, y1: k > 0 ? ly : cy, x2: k > 0 ? cx : lx, y2: k > 0 ? cy : ly, ex:lx, ey:ly};
  };
  const ocupado = (c, blandos) => ocup.some(o => (blandos || !o.blando) && _sepAng(o.ang, c.ang) < o.tol);
  if(!reg){ const c = geom(1, g0); return ocupado(c, false) ? geom(-1, g0) : c; }
  const golpesDe = c => reg.golpes(_polFlecha(c.x1, c.y1, c.x2, c.y2, esc), margen, it => !propia(it));
  // En el rayo k con hueco g. Si solo tropieza con el símbolo de su propio
  // apoyo y se permite, una reacción nace más allá de su extensión real +
  // FL_HUECO; una carga se aparta del nudo lo justo para pasar junto al símbolo.
  const probar = (k, g, pasarApoyo) => {
    let c = geom(k, g), gs = golpesDe(c);
    if(pasarApoyo && gs.length && gs.every(it => it.tipo === 'apoyo' && it.nudo === n.id)){
      const hasta = Math.max(g, _extensionEnRayo(gs, px, py, c.rx, c.ry, banda) + g0);
      if(!op.esApoyo){
        for(let g2 = g + 0.04/esc; g2 < hasta; g2 += 0.04/esc){
          const c2 = geom(k, g2), gs2 = golpesDe(c2);
          if(!gs2.length) return {c:c2, gs:gs2};
        }
      }
      c = geom(k, hasta);
      gs = golpesDe(c);
    }
    return {c, gs};
  };
  // 1. Un lado libre. Una reacción puede nacer más allá de su apoyo desde el
  // principio; una carga, solo si antes no ha encontrado un lado libre del todo.
  // `pena` mide lo que la colocación se aparta de la ideal (la usa
  // _fuerzasAplicadas para elegir en qué orden van las fuerzas del nudo).
  // Llegar manda sobre evitar un rayo blando: la carga solo sale del nudo si el
  // lado de llegada lo ocupa de verdad una barra, una flecha o el apoyo. Si llega
  // por el eje de un arco, arcoAngulo ya no traza el punteado bajo su fuste.
  const pasadas = [];
  (op.esApoyo ? [true] : [false, true]).forEach(pasarApoyo =>
    [1, -1].forEach(k => [true, false].forEach(blandos => pasadas.push([blandos, pasarApoyo, k]))));
  for(const [blandos, pasarApoyo, kk] of pasadas){
    for(const k of [kk]){
      if(ocupado(geom(k, g0), blandos)) continue;
      const r = probar(k, g0, pasarApoyo);
      if(!r.gs.length){ r.c.pena = (!op.esApoyo && r.c.hueco > g0 + 1e-6) ? 1 : 0; return r.c; }
    }
  }
  // 2. Los dos lados ocupados. NUNCA se aparta lateralmente: su línea de acción
  // tiene que pasar por el nudo, o la figura enseña un brazo que no existe (y en
  // un DCL de nudo las fuerzas dejan de ser concurrentes). Se apila en su propia
  // línea, detrás de las fuerzas del mismo nudo que ya ocupan ese rayo, sin
  // quedar punta con punta con una que sale; por encima de una barra, solo si no
  // queda otro remedio.
  let mejor = null;
  for(const k of [1, -1]){
    const c0 = geom(k, g0);
    const enRayo = reg.items.filter(it => propia(it) && it.dirDe && it.dirDe[n.id] !== undefined && _sepAng(it.dirDe[n.id], c0.ang) < 14);
    const sobreBarra = enRayo.some(it => it.tipo === 'barra');
    const puntaConPunta = k > 0 && enRayo.some(it => it.sentidoDe && it.sentidoDe[n.id] < 0);
    const ext = (!sobreBarra && enRayo.length) ? _extensionEnRayo(enRayo, px, py, c0.rx, c0.ry, banda) : 0;
    const r = probar(k, ext > 0 ? ext + g0 : g0, true);
    const pena = (sobreBarra ? 100 : 0) + (puntaConPunta ? 10 : 0) + r.gs.length;
    if(!mejor || pena < mejor.pena || (pena === mejor.pena && r.c.hueco < mejor.c.hueco - 1e-9)) mejor = {pena, c:r.c};
  }
  mejor.c.pena = 1 + mejor.pena;
  return mejor.c;
}
// Lo que se apunta en el registro de lo que nace en un nudo: de qué nudo sale,
// con qué ángulo sale de él y si la flecha llega (+1) o sale (−1). ladoCarga lo
// usa para apilar fuerzas en una misma línea y arcoAngulo, para no trazar el
// punteado de un eje por encima de una flecha.
function _radial(id, ang, sentido){
  return {radialDe:[id], dirDe:{[id]:ang}, sentidoDe:{[id]:sentido || 0}};
}
function _radialBarra(na, nb){
  const a = Math.atan2(nb.y-na.y, nb.x-na.x)*180/Math.PI;
  return {radialDe:[na.id, nb.id], dirDe:{[na.id]:a, [nb.id]:a + (a > 0 ? -180 : 180)}, sentidoDe:{}};
}
// Dibuja una fuerza aplicada en un nudo por el lado que decide ladoCarga, la
// registra, apunta su rayo como ocupado y deja su rótulo pendiente: los rótulos
// se colocan al final, cuando ya está todo lo demás en el registro.
//   op: {L, hueco, ocupados, esApoyo, col, txt, pend}
function _fuerzaEnNudo(reg, n, px, py, ux, uy, op){
  const c = ladoCarga(n, px, py, ux, uy, {reg, L:op.L, hueco:op.hueco, ocupados:op.ocupados, esApoyo:op.esApoyo});
  const tikz = _flecha(reg, c.x1, c.y1, c.x2, c.y2, op.col, _radial(n.id, c.ang, c.sentido));
  if(op.ocupados) op.ocupados.push(c.ang);
  if(op.pend) op.pend.push({ex:c.ex, ey:c.ey, dx:c.rx, dy:c.ry, txt:op.txt, col:op.col, largo:op.L || FL_GLOBAL});
  return {tikz, c};
}
// ── Las fuerzas aplicadas en un nudo: cargas y reacciones, juntas ──
// Primero con las cargas delante, que tienen prioridad sobre su eje. Si así
// alguna queda mal —apilada punta con punta, encima de una barra, apartada de
// su nudo, o una reacción que sale en vez de llegar—, se deshace y se prueba
// con las reacciones delante, y se queda el orden que menos se aparta de lo
// ideal (a igualdad, las cargas delante).
//   ctx:   {reg, n, px, py, L, hueco, ocup (rayos ocupados del nudo, se amplía),
//           pend, arcos}
//   lista: [{ux, uy, col, txt, esCarga, esApoyo, arco (radio o null),
//            extra (ocupados solo para esa fuerza)}]
// Devuelve {tikz, res:[{f, c}]} con la colocación de cada fuerza.
function _fuerzasAplicadas(ctx, lista){
  const reg = ctx.reg;
  const cargas = lista.filter(f => f.esCarga), reacs = lista.filter(f => !f.esCarga);
  const inicio = {items:reg.items.length, ejes:reg.ejes.length, pend:ctx.pend.length, arcos:ctx.arcos.length, ocup:ctx.ocup.slice()};
  const volver = () => {
    reg.items.length = inicio.items; reg.ejes.length = inicio.ejes;
    ctx.pend.length = inicio.pend; ctx.arcos.length = inicio.arcos;
    ctx.ocup.length = 0; inicio.ocup.forEach(v => ctx.ocup.push(v));
  };
  const foto = () => ({items:reg.items.slice(inicio.items), ejes:reg.ejes.slice(inicio.ejes), pend:ctx.pend.slice(inicio.pend),
                       arcos:ctx.arcos.slice(inicio.arcos), ocup:ctx.ocup.slice()});
  const poner = f => {
    volver();
    f.items.forEach(v => reg.items.push(v)); f.ejes.forEach(v => reg.ejes.push(v));
    f.pend.forEach(v => ctx.pend.push(v)); f.arcos.forEach(v => ctx.arcos.push(v));
    ctx.ocup.length = 0; f.ocup.forEach(v => ctx.ocup.push(v));
  };
  const colocar = orden => {
    let tikz = '', pena = 0;
    const res = [];
    orden.forEach(f => {
      const r = _fuerzaEnNudo(reg, ctx.n, ctx.px, ctx.py, f.ux, f.uy, {L:ctx.L, hueco:ctx.hueco, esApoyo:f.esApoyo, col:f.col,
                              pend:ctx.pend, txt:f.txt, ocupados:ctx.ocup.concat(f.extra || [])});
      ctx.ocup.push(r.c.ang);
      tikz += r.tikz;
      pena += (r.c.pena || 0) + ((!f.esCarga && r.c.sentido < 0) ? 2 : 0);
      if(f.arco) ctx.arcos.push({ux:f.ux, uy:f.uy, col:f.col, radio:f.arco, ox:r.c.x1, oy:r.c.y1});
      res.push({f, c:r.c});
    });
    return {tikz, pena, res};
  };
  let mejor = colocar(cargas.concat(reacs));
  if(mejor.pena > 0 && cargas.length && reacs.length){
    const fa = foto();
    volver();
    const otro = colocar(reacs.concat(cargas));
    if(otro.pena < mejor.pena) mejor = otro; else poner(fa);
  }
  return mejor;
}

// Cuánto de un trazo cae encima de algo de los tipos dados (para elegir lado).
function _largoBloqueado(reg, xa, ya, xb, yb, tipos){
  if(Math.hypot(xb-xa, yb-ya) < 1e-6) return 0;
  const e = reg.esc;
  return _tramosBloqueados(reg, xa, ya, xb, yb, 0.045/e, it => tipos.indexOf(it.tipo) >= 0)
    .reduce((s, t) => s + t[1] - t[0], 0);
}

// ── Cotas (cadena de dimensiones) de un grupo de nudos ──
// Acota cada tramo horizontal entre coordenadas x consecutivas y, si hay
// altura, la altura total. Las dos cadenas van FUERA de lo ya dibujado (del
// registro), junto a la figura. La horizontal va abajo y la vertical a la
// izquierda, salvo que por ese lado sus líneas de referencia vayan a correr
// encima de flechas y rótulos (en una porción, a lo largo de una barra cortada)
// y por el otro no. Las líneas arrancan en el nivel extremo de los nudos de ese
// lado, como siempre, y se interrumpen donde pisarían una flecha o un rótulo.
function tikzCotas(reg, tx, ty, nodosSubconjunto){
  const lista = nodosSubconjunto || nodos, e = reg.esc, F = v => v.toFixed(3), uL = escLatex(unitLen);
  const B = reg.limites(it => it.tipo !== 'guia');
  if(!B || !lista.length) return '';
  const X = x => parseFloat(tx(x)), Y = y => parseFloat(ty(y));
  const ref = 'black!55, line width=0.35pt', evitar = ['flecha', 'apoyo', 'rotulo', 'nombre', 'arco'];
  let s = '';
  const xs = [...new Set(lista.map(n=>Math.round(n.x*1000)/1000))].sort((a,b)=>a-b);
  const minY = Math.min(...lista.map(n=>n.y)), maxY = Math.max(...lista.map(n=>n.y));
  const minX = Math.min(...lista.map(n=>n.x)), maxX = Math.max(...lista.map(n=>n.x));
  const elegir = (a, b) => (b.coste < a.coste*0.6 - 1e-9) ? b : a;   // a igualdad, el lado de siempre
  const coste = refs => refs.reduce((c, r) => c + _largoBloqueado(reg, r[0], r[1], r[2], r[3], evitar), 0);
  if(xs.length > 1){
    const fila = sg => {
      const yDim = sg < 0 ? B.y0 - 0.40/e : B.y1 + 0.40/e, y0 = Y(sg < 0 ? minY : maxY) + sg*0.10/e;
      const refs = xs.map(x => [X(x), y0, X(x), yDim + sg*0.12/e]);
      return {yDim, refs, coste: coste(refs)};
    };
    const fl = elegir(fila(-1), fila(1)), yDim = fl.yDim;
    fl.refs.forEach(r => { s += _trazoEvitando(reg, r[0], r[1], r[2], r[3], ref, evitar); });
    for(let i=0;i<xs.length-1;i++){
      const x1 = X(xs[i]), x2 = X(xs[i+1]), dist = xs[i+1]-xs[i];
      if(dist < 1e-6) continue;
      s += '\\draw[black!55, line width=0.4pt, <->, >=stealth] (' + F(x1) + ',' + F(yDim) + ') -- (' + F(x2) + ',' + F(yDim) + ');\n';
      const txt = dec(dist,'len') + '\\,' + uL, c = _cajaRotuloArm(txt, 'scriptsize', e);
      s += '\\node[bsaCota] at (' + F((x1+x2)/2) + ',' + F(yDim) + ') {' + txt + '};\n';
      reg.seg(x1, yDim, x2, yDim, 0.02/e, 'cota');
      reg.caja((x1+x2)/2, yDim, c.w, c.h, 'rotulo');
    }
  }
  if(maxY - minY > 1e-6){
    const y1 = Y(minY), y2 = Y(maxY);
    const col = sg => {
      const xDim = sg < 0 ? B.x0 - 0.40/e : B.x1 + 0.40/e, x0 = X(sg < 0 ? minX : maxX) + sg*0.10/e;
      const refs = [y1, y2].map(y => [x0, y, xDim + sg*0.12/e, y]);
      return {xDim, refs, coste: coste(refs)};
    };
    const cl = elegir(col(-1), col(1)), xDim = cl.xDim;
    cl.refs.forEach(r => { s += _trazoEvitando(reg, r[0], r[1], r[2], r[3], ref, evitar); });
    s += '\\draw[black!55, line width=0.4pt, <->, >=stealth] (' + F(xDim) + ',' + F(y1) + ') -- (' + F(xDim) + ',' + F(y2) + ');\n';
    const txt = dec(maxY-minY,'len') + '\\,' + uL, c = _cajaRotuloArm(txt, 'scriptsize', e);
    s += '\\node[bsaCota, rotate=90] at (' + F(xDim) + ',' + F((y1+y2)/2) + ') {' + txt + '};\n';
    reg.seg(xDim, y1, xDim, y2, 0.02/e, 'cota');
    reg.caja(xDim, (y1+y2)/2, c.h, c.w, 'rotulo');
  }
  return s;
}

// ── Cotas corridas de los brazos, desde el punto de momentos ──
// El criterio de `fuerzas-internas` (ver su LEEME, «Reglas de redacción»): se
// acota SIEMPRE desde el punto respecto al cual se toman los momentos, solo las
// fuerzas que producen momento, y cada brazo va en su propio nivel. Así la
// figura enseña exactamente los números que aparecen en la ecuación.
//   O        {x, y, nombre} punto de momentos, en coordenadas del modelo.
//   fuerzas  [{x, y, fx, fy}] puntos de aplicación y dirección (basta el sentido).
//   ext      {yTop, yBase, xBase} en coordenadas del dibujo (opcional): de dónde
//            arrancan las líneas de referencia y dónde empieza cada banda. Sin
//            él, las bandas se ponen fuera de lo que ya tiene el registro.
//   reg      registro de la figura: las guías a trazos se interrumpen donde
//            pisarían un fuste, un apoyo o un rótulo.
// El brazo de una fuerza VERTICAL es horizontal (y al revés), así que las cotas
// horizontales se sacan de las componentes en y, y las verticales de las x.
function tikzBrazosMomento(O, fuerzas, tx, ty, ext, reg){
  const e = reg ? reg.esc : 1, F = v => v.toFixed(3), uL = escLatex(unitLen);
  const bx = [], by = [];
  (fuerzas || []).forEach(f=>{
    if(Math.abs(f.fy) > 1e-9 && Math.abs(f.x - O.x) > 1e-6) bx.push(f.x);
    if(Math.abs(f.fx) > 1e-9 && Math.abs(f.y - O.y) > 1e-6) by.push({y:f.y, x:f.x});
  });
  const x0 = parseFloat(tx(O.x)), y0 = parseFloat(ty(O.y));
  const minYN = Math.min(...nodos.map(n=>parseFloat(ty(n.y))));
  const B = reg ? reg.limites(it => it.tipo !== 'guia') : null;
  ext = ext || {};
  const yTop = ext.yTop !== undefined ? ext.yTop : minYN - 0.10/e;
  const yBase = ext.yBase !== undefined ? ext.yBase : (B ? B.y0 - 0.45/e : minYN - 2.1);
  let s = '';
  // Si el punto de momentos no cae sobre un nudo dibujado, se marca: sin verlo,
  // las cotas arrancarían de la nada.
  if(!nodos.some(n=>Math.abs(n.x - O.x) < 1e-6 && Math.abs(n.y - O.y) < 1e-6)){
    s += '\\filldraw[black!65] (' + F(x0) + ',' + F(y0) + ') circle (1.6pt);\n';
    if(reg){ reg.caja(x0, y0, 0.12/e, 0.12/e, 'punto', {nudo:'O'}); s += _rotuloNudo(reg, x0, y0, O.nombre || 'O', 'bsaNudo, text=black!65', 'O'); }
    else s += '\\node[bsaNudo, below left] at (' + F(x0) + ',' + F(y0) + ') {' + escLatex(O.nombre || 'O') + '};\n';
  }
  const xs = [...new Set(bx.map(v=>+v.toFixed(4)))].sort((a,b)=>Math.abs(a-O.x)-Math.abs(b-O.x));
  const ysMap = {};
  by.forEach(p => { const k = p.y.toFixed(4); if(!ysMap[k]) ysMap[k] = []; ysMap[k].push(p.x); });
  const ys = Object.keys(ysMap).map(Number).sort((a,b)=>Math.abs(a-O.y)-Math.abs(b-O.y));
  const guia = (xa, ya, xb, yb) => _trazoEvitando(reg, xa, ya, xb, yb, 'black!40, line width=0.3pt, dash pattern=on 1.4pt off 1.4pt');
  const numero = (txt, x, y, girado) => {
    const c = _cajaRotuloArm(txt, 'scriptsize', e);
    if(reg) reg.caja(x, y, girado ? c.h : c.w, girado ? c.w : c.h, 'rotulo');
    return '\\node[bsaCota' + (girado ? ', rotate=90' : '') + '] at (' + F(x) + ',' + F(y) + ') {' + txt + '};\n';
  };
  if(xs.length){
    s += guia(x0, yTop, x0, yBase - (xs.length-1)*0.42/e - 0.14/e);
    xs.forEach((xv, i)=>{
      const yy = yBase - i*0.42/e, x1 = parseFloat(tx(xv));
      s += guia(x1, yTop, x1, yy - 0.14/e);
      s += '\\draw[black!70, line width=0.45pt, <->, >=stealth] (' + F(x0) + ',' + F(yy) + ') -- (' + F(x1) + ',' + F(yy) + ');\n';
      if(reg) reg.seg(x0, yy, x1, yy, 0.02/e, 'cota');
      s += numero(dec(Math.abs(xv-O.x),'len') + (i === xs.length-1 ? '\\,' + uL : ''), (x0+x1)/2, yy, false);
    });
  }
  if(ys.length){
    // La columna va del lado del punto de momentos: las guías quedan más cortas.
    const derecha = !B || ext.xBase !== undefined || (B.x1 - x0) <= (x0 - B.x0);
    const xBase = ext.xBase !== undefined ? ext.xBase : (derecha ? B.x1 + 0.45/e : B.x0 - 0.45/e);
    const paso = (derecha ? 1 : -1)*0.44/e, sg = derecha ? 1 : -1;
    ys.forEach((yv, i)=>{
      const xx = xBase + i*paso, y1 = parseFloat(ty(yv));
      const xf = ysMap[yv.toFixed(4)].map(v=>parseFloat(tx(v))).reduce((m, v) => (derecha ? v > m : v < m) ? v : m);
      s += guia(x0 + sg*0.10/e, y0, xx + sg*0.14/e, y0);
      s += guia(xf + sg*0.10/e, y1, xx + sg*0.14/e, y1);
      s += '\\draw[black!70, line width=0.45pt, <->, >=stealth] (' + F(xx) + ',' + F(y0) + ') -- (' + F(xx) + ',' + F(y1) + ');\n';
      if(reg) reg.seg(xx, y0, xx, y1, 0.02/e, 'cota');
      s += numero(dec(Math.abs(yv-O.y),'len') + '\\,' + uL, xx, (y0+y1)/2, true);
    });
  }
  return s;
}
// Las fuerzas exteriores que producen momento en el DCL global: las cargas de
// los nudos y las reacciones (de estas basta su dirección, que es lo que fija
// su línea de acción).
function _fuerzasParaBrazos(reacciones){
  const out = [];
  nodos.forEach(n=>{
    if(!esCero(n.fx || 0) || !esCero(n.fy || 0)) out.push({x:n.x, y:n.y, fx:n.fx || 0, fy:n.fy || 0});
    const rr = reacciones && reacciones[n.id];
    if(rr) out.push({x:n.x, y:n.y, fx:(rr.rx !== undefined ? 1 : 0), fy:(rr.ry !== undefined ? 1 : 0)});
  });
  return out;
}

// Generador de letras griegas que REUTILIZA la misma letra si el ángulo ya
// apareció antes en este diagrama (con la misma medida): si tres ángulos
// valen 56.31°, los tres se llaman θ, no θ/α/β.
// Las letras las reparte bsaLetrasGriegas (core/comun.js), compartida con
// fuerzas internas; aquí queda el nombre de siempre.
function letrasGriegas(){ return bsaLetrasGriegas();
}

// Arco de ángulo respecto del eje MÁS CERCANO, horizontal o vertical, con un
// trazo punteado desde el vértice que enseña de qué línea se mide (R21: el DCL
// lo más limpio posible). El ángulo es siempre agudo y no pasa de 45°: si la
// barra está más cerca de la vertical se mide desde ella. Las ecuaciones no
// dependen de esto porque usan los cosenos directores en número, no la letra.
// El eje de referencia y el ángulo agudo salen de bsaAnguloAgudoEje
// (core/comun.js), que es el único criterio del tema: el mismo que usan el
// lienzo, la tabla de resultados y la descomposición del informe.
// El punteado llega hasta el arco (si se quedaba corto no se veía de qué eje se
// mide). La letra va al tamaño de los rótulos y se coloca con el registro: en
// la bisectriz si cabe; con ángulos pequeños, fuera del ángulo, junto al eje o
// junto a la barra, para no montarse sobre ellas; y solo si no cabe, con guía.
// El punteado no se traza si ese semieje ya lo recorre una flecha o una barra que
// sale del mismo nudo (`nudo`: el vértice es ese nudo), porque correría encima de
// su fuste y la propia flecha ya enseña el eje; ni se repite si otro arco del
// mismo vértice ya trazó ese eje.
function arcoAngulo(ux, uy, col, gen, radio, ox, oy, reg, nudo){
  ox = ox || 0; oy = oy || 0;
  const agudo = bsaAnguloAgudoEje(ux, uy);
  const acuteDeg = agudo.grados;
  if(acuteDeg < 4) return {tikz:'', letra:null, valor:null};
  const R2 = radio || 0.65, esc = reg ? reg.esc : 1, F = v => v.toFixed(3), rad = Math.PI/180;
  // Semieje de referencia del mismo lado que la barra: 0/180 si es la
  // horizontal, 90/-90 si es la vertical.
  const rayDeg = _ejeDeReferencia(ux, uy);
  let endDeg = Math.atan2(uy, ux) * 180/Math.PI;
  while(endDeg - rayDeg > 180) endDeg -= 360;     // el arco va siempre por el lado corto
  while(endDeg - rayDeg < -180) endDeg += 360;
  const cr = Math.cos(rayDeg*rad), sr = Math.sin(rayDeg*rad), tick = R2 + 0.10;
  const letra = gen.para(acuteDeg);
  const midDeg = (rayDeg + endDeg)/2, sg = endDeg >= rayDeg ? 1 : -1;

  const ejeOcupado = reg && nudo !== undefined && reg.items.some(it =>
    (it.tipo === 'flecha' || it.tipo === 'barra') && it.dirDe && it.dirDe[nudo] !== undefined && _sepAng(it.dirDe[nudo], rayDeg) < 3);
  const yaTrazado = reg && reg.ejes.some(e => Math.hypot(e.x-ox, e.y-oy) < 1e-3 && _sepAng(e.ang, rayDeg) < 0.5 && e.largo >= tick - 1e-6);
  let tikz = '';
  if(!ejeOcupado && !yaTrazado){
    tikz += '\\draw[' + _tinte(col, 55) + ', line width=0.35pt, dash pattern=on 1.5pt off 1.5pt] (' + F(ox) + ',' + F(oy) + ') -- (' + F(ox + tick*cr) + ',' + F(oy + tick*sr) + ');\n';
    if(reg){ reg.ejes.push({x:ox, y:oy, ang:rayDeg, largo:tick}); reg.seg(ox, oy, ox + tick*cr, oy + tick*sr, 0.015/esc, 'arco'); }
  }
  tikz += '\\draw[' + _tinte(col, 70) + ', line width=0.45pt] (' + F(ox + R2*cr) + ',' + F(oy + R2*sr) + ') arc [start angle=' + rayDeg + ', end angle=' + endDeg.toFixed(2) + ', radius=' + R2 + '];\n';
  if(reg){
    for(let i = 0; i < 6; i++){
      const a0 = (rayDeg + (endDeg-rayDeg)*i/6)*rad, a1 = (rayDeg + (endDeg-rayDeg)*(i+1)/6)*rad;
      reg.seg(ox + R2*Math.cos(a0), oy + R2*Math.sin(a0), ox + R2*Math.cos(a1), oy + R2*Math.sin(a1), 0.015/esc, 'arco');
    }
  }
  const txt = '$' + letra + '$', caja = _cajaRotuloArm(txt, 'small', esc), hol = 0.04/esc;
  const enDir = (deg, r) => {
    const cx = Math.cos(deg*rad), cy = Math.sin(deg*rad), d = r + (Math.abs(cx)*caja.w + Math.abs(cy)*caja.h)/2 + hol;
    return [ox + cx*d, oy + cy*d];
  };
  const libre = c => !reg || !reg.choca(_polCaja(c[0], c[1], caja.w, caja.h), 0.02/esc);
  // Primero dentro del ángulo (en la bisectriz, un poco más lejos si hace
  // falta); después fuera, junto al eje o junto a la barra.
  const cands = [enDir(midDeg, R2), enDir(midDeg, R2 + 0.18)];
  [0, 0.18, 0.40].forEach(m => {
    cands.push(enDir(rayDeg - sg*25, R2*0.75 + m));
    cands.push(enDir(endDeg + sg*25, R2*0.75 + m));
    if(m) cands.push(enDir(midDeg, R2 + 0.22 + m));
  });
  let pos = reg ? cands.find(libre) : cands[0];
  if(!pos){
    for(const m of [0.7, 1.0, 1.4]){
      const c = enDir(midDeg, R2 + m);
      if(!libre(c)) continue;
      const ax = ox + (R2 + 0.04)*Math.cos(midDeg*rad), ay = oy + (R2 + 0.04)*Math.sin(midDeg*rad);
      const fin = _finGuiaRotulo(ax, ay, c[0], c[1], caja.w, caja.h);
      if(fin) tikz += '\\draw[' + _tinte(col, 50) + ', line width=0.3pt] (' + F(ax) + ',' + F(ay) + ') -- (' + F(fin[0]) + ',' + F(fin[1]) + ');\n';
      pos = c; break;
    }
  }
  if(!pos) pos = cands[0];
  if(reg) reg.caja(pos[0], pos[1], caja.w, caja.h, 'rotulo');
  tikz += '\\node[bsaAng, text=' + col + '] at (' + F(pos[0]) + ',' + F(pos[1]) + ') {' + txt + '};\n';
  return {tikz, letra, valor:acuteDeg, lx:pos[0], ly:pos[1]};
}
// Dibuja los arcos pendientes de una figura y apunta sus ángulos.
function _dibujarArcos(arcos, gen, reg, angulos){
  let s = '';
  arcos.forEach(a => {
    const ar = arcoAngulo(a.ux, a.uy, a.col, gen, a.radio, a.ox, a.oy, reg, a.nudo);
    if(ar.tikz){ s += ar.tikz; angulos.push({letra:ar.letra, valor:ar.valor}); }
  });
  return s;
}

// Nombre del centro de momentos de cada ecuación de un corte: el del nudo si el
// centro cae en uno (casi siempre: donde se cruzan las otras dos barras cortadas)
// y, si no, una letra O, O', O'' que se rotula en la figura y se define en el pie.
// Devuelve un arreglo alineado con `items` (null donde la ecuación no es de momentos).
function etiquetasCentros(items){
  const libres = ['O', "O'", "O''"];
  let k = 0; const out = [];
  items.forEach(it=>{
    if(it.tipo !== 'momento' || !it.centro){ out.push(null); return; }
    const nd = nodos.find(n=>Math.abs(n.x-it.centro.x) < 1e-6 && Math.abs(n.y-it.centro.y) < 1e-6);
    if(nd){ out.push({tex:escLatex(nd.nombre), esNudo:true, x:it.centro.x, y:it.centro.y}); return; }
    const previo = out.find(o=>o && !o.esNudo && Math.abs(o.x-it.centro.x) < 1e-6 && Math.abs(o.y-it.centro.y) < 1e-6);
    if(previo){ out.push(previo); return; }
    out.push({tex:libres[Math.min(k++, libres.length-1)], esNudo:false, x:it.centro.x, y:it.centro.y});
  });
  return out;
}
// ── Figura de brazos de una ecuación de momentos del corte ──
// Repite la porción en gris y, para el centro C de esa ecuación, acota la
// distancia perpendicular desde C a la línea de acción de cada fuerza que SÍ
// produce momento (la incógnita de la ecuación y las conocidas del detalle),
// con la línea de acción prolongada a trazos hasta el pie de la perpendicular.
// Si C es un nudo de fuera de la porción, las barras cuyas líneas pasan por él
// se prolongan a trazos hasta C. Revisión del PDF, 2026-09-04.
// Las fuerzas se dibujan como en la porción: las barras por su barra, hacia
// fuera (la incógnita sale, en tracción; una ya hallada sale si tira y llega si
// empuja), y las cargas y reacciones LLEGAN al nudo. La línea de acción a trazos
// arranca donde acaba la flecha, nunca encima de ella.
function tikzBrazosCorte(lado, datosCorte, item, nombreCentro, escala){
  const esc = escala || ESC_BRAZOS, reg = crearRegistro(esc);
  const enLado = id => lado.indexOf(id) >= 0;
  const C = item.centro, Lf = FL_GLOBAL, g = FL_HUECO, R = g + Lf;
  // Escala ajustada a la porción y al centro, sin pasar de tres veces la de la
  // armadura entera: con una porción pequeña de una armadura grande, a la escala
  // de toda la armadura las cotas de los brazos no cabían y se pisaban.
  const pts = nodos.filter(n=>enLado(n.id)).map(n=>[n.x, n.y]).concat([[C.x, C.y]]);
  const minX = Math.min(...pts.map(p=>p[0])), maxX = Math.max(...pts.map(p=>p[0]));
  const minY = Math.min(...pts.map(p=>p[1])), maxY = Math.max(...pts.map(p=>p[1]));
  const kArm = 7.6/Math.max(Math.max(...nodos.map(n=>n.x)) - Math.min(...nodos.map(n=>n.x)), 1e-6);
  const k = Math.min(3*kArm, 7.6/Math.max(maxX-minX, 1e-6), 4.5/Math.max(maxY-minY, 1e-6));
  const X = x => (x-minX)*k, Y = y => (y-minY)*k, F = v => v.toFixed(3);
  const gen = letrasGriegas(), angulos = [], pend = [], arcos = [];
  const coincide = (n, x, y) => Math.abs(n.x-x) < 1e-6 && Math.abs(n.y-y) < 1e-6;
  let s = '';
  barras.forEach(b=>{
    if(!(enLado(b.a) && enLado(b.b))) return;
    const na = nodos.find(x=>x.id===b.a), nb = nodos.find(x=>x.id===b.b);
    s += '\\draw[black!45, line width=1.1pt] (' + F(X(na.x)) + ',' + F(Y(na.y)) + ') -- (' + F(X(nb.x)) + ',' + F(Y(nb.y)) + ');\n';
    reg.seg(X(na.x), Y(na.y), X(nb.x), Y(nb.y), 0.55*PT_CM/esc, 'barra', _radialBarra(na, nb));
  });
  const nl = nodos.filter(n=>enLado(n.id));
  nl.forEach(n=>{
    s += '\\fill[black!60] (' + F(X(n.x)) + ',' + F(Y(n.y)) + ') circle (1.3pt);\n';
    reg.caja(X(n.x), Y(n.y), 0.10/esc, 0.10/esc, 'punto', {nudo:n.id, radialDe:[n.id]});
  });
  // Centro de fuera de la porción: las barras que pasan por él, prolongadas a trazos.
  const enPorcion = nl.some(n=>coincide(n, C.x, C.y));
  if(!enPorcion){
    datosCorte.forEach(d=>{
      if(item.otros.indexOf(d.nombre) < 0) return;
      s += '\\draw[black!50, dashed, line width=0.5pt] (' + F(X(d.px)) + ',' + F(Y(d.py)) + ') -- (' + F(X(C.x)) + ',' + F(Y(C.y)) + ');\n';
      reg.seg(X(d.px), Y(d.py), X(C.x), Y(C.y), 0.02/esc, 'linea');
    });
  }
  const cx = X(C.x), cy = Y(C.y);
  s += '\\fill[black!65] (' + F(cx) + ',' + F(cy) + ') circle (2pt);\n';
  s += '\\draw[black!65, line width=0.6pt] (' + F(cx) + ',' + F(cy) + ') circle (3.6pt);\n';
  reg.caja(cx, cy, 0.27/esc, 0.27/esc, 'punto', {nudo:'C'});
  // Fuerzas con momento: la incógnita de la ecuación y las del detalle.
  const nombreDe = et => et.replace(/^F/, '').replace(/ .*$/, '');
  // La incógnita de la ecuación, como en la porción: a trazos, gris y saliendo.
  const fz = [{x:item.d.px, y:item.d.py, ux:item.d.ux, uy:item.d.uy, tex:'$F_{' + escLatex(item.d.nombre) + '}$', col:COLOR_INCOGNITA, tipo:'barra', sale:true, incog:true}];
  // El rodillo inclinado es UNA reacción también aquí, como en la porción que va
  // justo antes: sus componentes del detalle se juntan en una sola R_C, en su
  // sentido real y con el arco de su ángulo en la cola. Su brazo se mide sobre la
  // línea de acción de esa resultante (su momento es la suma de los de sus
  // componentes). La dirección sale del apoyo, no de la suma del detalle, que
  // puede traer una sola componente si la otra no produce momento.
  const inclinadas = {};
  item.detalle.forEach(t=>{
    if(t.x === undefined) return;
    const m = Math.hypot(t.fx, t.fy); if(m < 1e-9) return;
    const ux = t.fx/m, uy = t.fy/m, et = t.et.charAt(0);
    if(et === 'R'){
      const ndR = nodos.find(z => coincide(z, t.x, t.y)), rrR = ndR ? resultado.reacciones[ndR.id] : null;
      if(rrR && rrR.inclinado && !esCero(rrR.mag)){
        if(!inclinadas[ndR.id]){
          const ar = rrR.ang*Math.PI/180, sg = rrR.mag > 0 ? 1 : -1;
          inclinadas[ndR.id] = true;
          fz.push({x:ndR.x, y:ndR.y, ux:sg*Math.cos(ar), uy:sg*Math.sin(ar), col:'bsaVerde', tipo:'reaccion', incl:true,
                   tex:'$R_{' + escLatex(ndR.nombre) + '}$'});
        }
        return;
      }
    }
    if(et === 'F'){
      const nom = nombreDe(t.et);
      const b = barras.find(bb => t.ref !== undefined ? bb.id === t.ref : nombreBarra(bb) === nom);
      const nd = b ? nodos.find(z => (z.id === b.a || z.id === b.b) && coincide(z, t.x, t.y)) : null;
      let bx = ux, by = uy;
      if(nd){ const nf = nodos.find(z => z.id === (b.a === nd.id ? b.b : b.a)), Lb = Math.hypot(nf.x-nd.x, nf.y-nd.y); bx = (nf.x-nd.x)/Lb; by = (nf.y-nd.y)/Lb; }
      const sale = ux*bx + uy*by > 0;
      fz.push({x:t.x, y:t.y, ux:bx, uy:by, tex:'$F_{' + escLatex(nom) + '}$', col:tikzColorFuerza(sale ? 1 : -1), tipo:'barra', sale});
    } else {
      const esR = et === 'R';
      fz.push({x:t.x, y:t.y, ux, uy, col: esR ? 'bsaVerde' : 'bsaAcc', tipo: esR ? 'reaccion' : 'carga',
               tex: esR ? '$R_{' + t.et.slice(-1) + escLatex(t.et.slice(1,-1)) + '}$' : dec(m,'f') + '\\,' + escLatex(unitFor)});
    }
  });
  const ocupPorNudo = {};
  const lineas = [];
  // Primero las barras, que van por su barra; después las cargas y reacciones
  // de cada nudo, juntas (_fuerzasAplicadas).
  const ocupDe = nd => (ocupPorNudo[nd.id] = ocupPorNudo[nd.id] || _angulosBarras(nd));
  const grupos = [];
  fz.forEach(f=>{
    const px = X(f.x), py = Y(f.y), nd = nodos.find(z=>coincide(z, f.x, f.y));
    if(f.tipo !== 'barra'){
      let gr = nd ? grupos.find(q => q.nd === nd) : null;
      if(!gr){ gr = {nd, px, py, lista:[]}; grupos.push(gr); }
      gr.lista.push({ux:f.ux, uy:f.uy, col:f.col, txt:f.tex, esCarga: f.tipo === 'carga', arco: f.tipo === 'carga' ? 0.45 : (f.incl ? 0.55 : null), f});
      return;
    }
    // tramo: la parte de la línea de acción que ocupa la flecha (rayo rx,ry desde el nudo, hasta t1)
    const radial = nd ? _radial(nd.id, Math.atan2(f.uy, f.ux)*180/Math.PI, f.sale ? -1 : 1) : {};
    s += f.incog ? _flechaIncognita(reg, px, py, px + f.ux*R, py + f.uy*R, radial)
       : (f.sale ? _flecha(reg, px, py, px + f.ux*R, py + f.uy*R, f.col, radial)
                 : _flecha(reg, px + f.ux*R, py + f.uy*R, px + f.ux*g, py + f.uy*g, f.col, radial));
    pend.push({ex:px + f.ux*R, ey:py + f.uy*R, dx:f.ux, dy:f.uy, txt:f.tex, col:f.col, largo:Lf});
    if(nd) ocupDe(nd);
    lineas.push({f, tramo:{rx:f.ux, ry:f.uy, t1:R}});
  });
  grupos.forEach(gr => {
    const r = _fuerzasAplicadas({reg, n: gr.nd || {id:'libre'}, px:gr.px, py:gr.py, L:Lf, hueco:g,
                                 ocup: gr.nd ? ocupDe(gr.nd) : [], pend, arcos}, gr.lista);
    s += r.tikz;
    r.res.forEach(({f, c}) => lineas.push({f:f.f, tramo:{rx:c.rx, ry:c.ry, t1:c.hueco + Lf}}));
  });
  s += _dibujarArcos(arcos, gen, reg, angulos);
  // Brazo de cada fuerza: la cota desde C hasta el pie de la perpendicular.
  // Primero todas las líneas de cota y después todos sus textos: cuando varias
  // cotas salen del mismo centro sobre la misma recta, el texto de la corta caía
  // sobre la línea de la larga, y como esa línea se dibujaba después, lo tachaba.
  // Ahora el texto (con fondo blanco) va encima y evita, si puede, las otras cotas.
  const trazos = [], pies = [], textosCota = [];
  lineas.forEach(({f, tramo})=>{
    const brazo = Math.abs((C.x-f.x)*f.uy - (C.y-f.y)*f.ux);
    if(brazo < 1e-6) return;
    const tp = ((C.x-f.x)*tramo.rx + (C.y-f.y)*tramo.ry)*k;   // pie, a lo largo del rayo de la flecha (unidades de figura)
    const px = X(f.x), py = Y(f.y), fx0 = px + tramo.rx*tp, fy0 = py + tramo.ry*tp;
    // Línea de acción a trazos hasta el pie, desde donde acaba la flecha.
    if(tp > tramo.t1) trazos.push([px + tramo.rx*tramo.t1, py + tramo.ry*tramo.t1, fx0, fy0, f.col]);
    else if(tp < 0) trazos.push([px, py, fx0, fy0, f.col]);
    // Dos fuerzas con la misma línea de acción (la carga y la barra de un mismo
    // nudo) comparten brazo: la cota se dibuja una vez. Antes salía «3.00 m 3.00 m».
    if(pies.some(p => Math.hypot(p[0]-fx0, p[1]-fy0) < 1e-4)) return;
    pies.push([fx0, fy0]);
    s += '\\draw[<->, >=stealth, bsaMuted, line width=0.5pt] (' + F(cx) + ',' + F(cy) + ') -- (' + F(fx0) + ',' + F(fy0) + ');\n';
    const idCota = textosCota.length;
    reg.seg(cx, cy, fx0, fy0, 0.02/esc, 'cota', {idCota});
    textosCota.push({brazo, fx0, fy0, idCota});
  });
  textosCota.forEach(({brazo, fx0, fy0, idCota}) => {
    const txt = dec(brazo,'len') + '\\,' + escLatex(unitLen), cj = _cajaRotuloArm(txt, 'scriptsize', esc);
    const Lc = Math.hypot(fx0-cx, fy0-cy) || 1e-9, nx = -(fy0-cy)/Lc, ny = (fx0-cx)/Lc;
    const enT = t => [cx + (fx0-cx)*t, cy + (fy0-cy)*t];
    const libre = (p, conCotas) => !reg.choca(_polCaja(p[0], p[1], cj.w, cj.h), 0.02/esc,
                  it => it.tipo !== 'barra' && (it.tipo !== 'cota' || (conCotas && it.idCota !== idCota)));
    const ts = [0.5, 0.35, 0.65, 0.22, 0.78];
    // Sobre su línea sin tocar otra cota; si no, a un lado de ella; y si tampoco,
    // sobre su línea como antes (el fondo blanco la tapa).
    const dn = (Math.abs(nx)*cj.w + Math.abs(ny)*cj.h)/2 + 0.04/esc;
    let pos = ts.map(enT).find(p => libre(p, true));
    if(!pos) pos = ts.map(enT).reduce((a, p) => a.concat([[p[0] + nx*dn, p[1] + ny*dn], [p[0] - nx*dn, p[1] - ny*dn]]), [])
                   .find(p => libre(p, true));
    if(!pos) pos = ts.map(enT).find(p => libre(p, false)) || enT(0.5);
    s += '\\node[bsaCota, text=bsaMuted] at (' + F(pos[0]) + ',' + F(pos[1]) + ') {' + txt + '};\n';
    reg.caja(pos[0], pos[1], cj.w, cj.h, 'rotulo');
  });
  nl.forEach(n=>{ s += _rotuloNudo(reg, X(n.x), Y(n.y), n.nombre, 'bsaNudo, text=black!70', n.id); });
  if(!enPorcion) s += _rotuloNudo(reg, cx, cy, nombreCentro, 'bsaNudo, text=black!65', 'C');
  pend.forEach(p=>{ s += _rotuloTrasExtremo(p.ex, p.ey, p.dx, p.dy, p.txt, 'bsaRot, text=' + p.col, esc, reg, p.largo); });
  trazos.forEach(t=>{ s += _trazoEvitando(reg, t[0], t[1], t[2], t[3], _tinte(t[4], 60) + ', dashed, line width=0.45pt'); });
  return {tikz:s, enPorcion, angulos};
}

// ── Porción aislada del método de secciones (auto o manual) ──
// Dibuja solo el lado analizado: sus barras (color real según resultado),
// las fuerzas supuestas en las barras cortadas, las barras ya resueltas en un
// corte anterior (sobre su barra, con su sentido real), y las cargas y
// reacciones que actúan sobre la porción. Los centros de momento NO se marcan
// aquí: cada ecuación de momentos lleva su propia figura de brazos
// (tikzBrazosCorte), que ya los enseña. Las cotas van junto a la porción.
// La porción se compone primero con las flechas de las barras cortadas a su largo
// (FL_NUDO, salvo las que se tocarían). Si así algún rótulo solo cabe lejos, con
// una guía, se prueba a dejar las que van al mismo nudo de fuera en el 70 % y en el
// 55 % de su barra, y se queda la composición que menos cuesta: una por guía y diez
// por guía que cruce otro rótulo o un nombre (a igualdad, la de flechas más largas).
// Un tope fijo no servía: dejaba limpia la porción de tres barras que llegan a D y
// ensuciaba la de dos que llegan a F. Las cotas y el marco van solo en la elegida.
function tikzSeccionPorcion(lado, datosCorte, externas, itemsSol, escala){
  let mejor = null;
  for(const tope of [0, 0.7, 0.55]){
    const r = _porcionConTope(lado, datosCorte, externas, escala, tope);
    if(!mejor || r.pena < mejor.pena) mejor = r;
    if(mejor.pena === 0) break;
  }
  let s = mejor.s;
  // Cotas de los nudos de la porción, junto a ella.
  if(mejor.nl.length > 1) s += tikzCotas(mejor.reg, mejor.tx, mejor.ty, mejor.nl);
  // Marco x,y (R21) en la esquina libre más próxima.
  s += mejorEsquina(mejor.reg);
  return {tikz:s, angulos:mejor.angulos};
}
function _porcionConTope(lado, datosCorte, externas, escala, tope){
  const esc = escala || ESC_PORCION, reg = crearRegistro(esc);
  const enLado = id => lado.indexOf(id) >= 0;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys);
  const k = 9.3/Math.max(maxX-minX, 1e-6);
  const X = x => (x-minX)*k, Y = y => (y-minY)*k;
  const tx = x => X(x).toFixed(3), ty = y => Y(y).toFixed(3);
  const F = v => v.toFixed(3);
  const L = FL_NUDO, g = FL_HUECO, R = g + L;
  const gen = letrasGriegas(), angulos = [], pend = [], arcos = [];
  const coincide = (n, x, y) => Math.abs(n.x-x) < 1e-6 && Math.abs(n.y-y) < 1e-6;
  const ocupPorNudo = {}, ocupDe = n => (ocupPorNudo[n.id] = ocupPorNudo[n.id] || _angulosBarras(n));

  let s = '';
  barras.forEach(b=>{
    if(!(enLado(b.a) && enLado(b.b))) return;   // solo barras enteramente dentro de la porción
    const na = nodos.find(x=>x.id===b.a), nb = nodos.find(x=>x.id===b.b);
    const f = resultado.fuerzas[b.id]||0;
    s += '\\draw[' + tikzColorFuerza(f) + ', line width=1.3pt] (' + tx(na.x) + ',' + ty(na.y) + ') -- (' + tx(nb.x) + ',' + ty(nb.y) + ');\n';
    reg.seg(X(na.x), Y(na.y), X(nb.x), Y(nb.y), 0.65*PT_CM/esc, 'barra', _radialBarra(na, nb));
  });
  const nl = nodos.filter(n=>enLado(n.id));
  nl.forEach(n=>{
    // En un DCL el apoyo se SUSTITUYE por su reacción: si la reacción va dibujada
    // en este nudo, el símbolo del apoyo sobra.
    const conReaccion = externas.some(e=>e.et.charAt(0) === 'R' && coincide(n, e.x, e.y));
    if((n.apoyo === 'fijo' || n.apoyo === 'movil') && !conReaccion) s += tikzApoyo(n.apoyo, X(n.x), Y(n.y), anguloDibujoApoyo(n), reg, n.id);
  });
  nl.forEach(n=>{
    s += '\\fill (' + tx(n.x) + ',' + ty(n.y) + ') circle (1.5pt);\n';
    reg.caja(X(n.x), Y(n.y), 0.11/esc, 0.11/esc, 'punto', {nudo:n.id, radialDe:[n.id]});
  });

  // ── Las barras cortadas, por su barra y saliendo del nudo de dentro ──
  // Tres clases: las que se despejan en este corte (incógnitas: a trazos, gris
  // neutro y saliendo, el supuesto de tracción de sus ecuaciones); las ya
  // resueltas en un corte anterior (`externas` con `barra` y `conocida`: trazo
  // continuo, su color y su sentido real, con su nombre y no como una carga
  // apartada del nudo); y las que cruza el corte sin estar en ninguna de las dos,
  // que son las de fuerza cero conocidas (trazo fino gris), para que la porción
  // enseñe todas las barras cortadas.
  const cortadas = [];
  const cortada = (b, nd, tipo, v) => {
    const nf = nodos.find(z=>z.id === (b.a===nd.id ? b.b : b.a));
    const dx = nf.x-nd.x, dy = nf.y-nd.y, Lb = Math.hypot(dx,dy);
    cortadas.push({nd, fuera:nf.id, largoBarra:Lb*k, px:X(nd.x), py:Y(nd.y), bx:dx/Lb, by:dy/Lb, tipo, v, txt:'$F_{' + escLatex(nombreBarra(b)) + '}$'});
  };
  datosCorte.forEach(d => cortada(d.barra, d.nd || d.nodoDentro, 'incognita'));   // 'nd' en auto, 'nodoDentro' en manual
  const reacs = [], cargas = [];
  externas.forEach(e=>{
    if(e.barra && e.conocida !== undefined){
      const nd = nodos.find(z=>coincide(z, e.x, e.y));
      if(nd && (e.barra.a === nd.id || e.barra.b === nd.id)){ cortada(e.barra, nd, esCero(e.conocida) ? 'cero' : 'conocida', e.conocida); return; }
    }
    (e.et.charAt(0) === 'R' ? reacs : cargas).push(e);
  });
  const enFigura = datosCorte.map(d => d.barra.id).concat(externas.filter(e => e.barra).map(e => e.barra.id));
  barras.forEach(b=>{
    if(enLado(b.a) === enLado(b.b) || enFigura.indexOf(b.id) >= 0 || !esCero(resultado.fuerzas[b.id] || 0)) return;
    cortada(b, nodos.find(z=>z.id === (enLado(b.a) ? b.a : b.b)), 'cero', 0);
  });
  // Las barras cortadas que van hacia el mismo nudo de fuera (el montante y el
  // cordón que llegan a B; las tres que llegan a D en una Pratt) se encuentran si
  // sus flechas miden casi lo que sus barras: la punta de una caía encima de otra y
  // sus rótulos no cabían. Con `tope`, esas se quedan en esa fracción de su barra
  // (sin bajar de la mitad de FL_NUDO). Sin él, o si aun así dos flechas se tocan,
  // se acortan las dos poco a poco. Las demás miden FL_NUDO.
  const convergen = c => cortadas.some(o => o !== c && o.fuera === c.fuera);
  // Dos que van al mismo nudo de fuera piden más hueco que el de dos trazos: sus
  // puntas acaban juntas y entre ellas tiene que caber un rótulo. Con el margen
  // de siempre la punta de F_BH se quedaba sobre el fuste de F_AB.
  const largos = cortadas.map(c => (tope && convergen(c)) ? Math.min(R, Math.max(0.5*R, tope*c.largoBarra)) : R), margenC = 0.06/esc;
  // Por eso, entre dos que convergen se compara la flecha JUNTO CON la caja del
  // rótulo que irá detrás de su extremo: con solo las flechas separadas, el
  // rótulo de F_FG caía sobre el eje de F_FL y este tenía que irse con una guía.
  const polCortada = (c, r) => _polSeg(c.px + c.bx*g, c.py + c.by*g, c.px + c.bx*r, c.py + c.by*r, PUNTA_SEMI_CM/esc);
  const polConRotulo = (c, r) => {
    const cj = _cajaRotuloArm(c.txt, 'small', esc), d = (Math.abs(c.bx)*cj.w + Math.abs(c.by)*cj.h)/2 + 0.07/esc;
    return _envolvente(polCortada(c, r).concat(_polCaja(c.px + c.bx*(r + d), c.py + c.by*(r + d), cj.w, cj.h)));
  };
  const separadas = (i, j, m) => {
    const a = cortadas[i], b = cortadas[j];
    if(a.fuera === b.fuera) return _separacion(polConRotulo(a, largos[i]), polConRotulo(b, largos[j]), 0.08/esc) >= 0.08/esc;
    return _separacion(polCortada(a, largos[i]), polCortada(b, largos[j]), m) >= m;
  };
  for(let vuelta = 0; vuelta < 14; vuelta++){
    let cambio = false;
    for(let i = 0; i < cortadas.length; i++) for(let j = i+1; j < cortadas.length; j++){
      if(cortadas[i].nd.id === cortadas[j].nd.id) continue;
      if(separadas(i, j, margenC)) continue;
      [i, j].forEach(q => { if(largos[q] > 0.5*R){ largos[q] = Math.max(0.5*R, largos[q]*0.92); cambio = true; } });
    }
    if(!cambio) break;
  }
  cortadas.forEach((c, i) => {
    const r = largos[i], ex = c.px + c.bx*r, ey = c.py + c.by*r, ang = Math.atan2(c.by, c.bx)*180/Math.PI;
    let col;
    if(c.tipo === 'incognita'){
      col = COLOR_INCOGNITA;
      s += _flechaIncognita(reg, c.px, c.py, ex, ey, _radial(c.nd.id, ang, -1));
      // Arco con letra griega para el ángulo agudo de esta barra.
      arcos.push({ux:c.bx, uy:c.by, col, radio:0.55, ox:c.px, oy:c.py, nudo:c.nd.id});
    } else if(c.tipo === 'cero'){
      col = COLOR_CERO;
      s += _trazoCero(reg, c.px, c.py, ex, ey, _radial(c.nd.id, ang, 0));
    } else {
      col = tikzColorFuerza(c.v);
      const radial = _radial(c.nd.id, ang, c.v > 0 ? -1 : 1);
      s += c.v > 0 ? _flecha(reg, c.px, c.py, ex, ey, col, radial)
                   : _flecha(reg, ex, ey, c.px + c.bx*g, c.py + c.by*g, col, radial);
    }
    pend.push({ex, ey, dx:c.bx, dy:c.by, txt:c.txt, col, largo:r - g});
  });

  // Cargas y reacciones externas sobre la porción. Las cargas llevan su valor
  // (dato); las reacciones, solo la variable (R21). Las cargas tienen prioridad
  // sobre su eje y evitan, si pueden, los ejes de los arcos del nudo; las
  // reacciones esquivan lo que ya está. El rodillo inclinado es UNA reacción
  // también aquí: sus dos componentes se juntan en una sola R_C, con el arco de
  // su ángulo agudo en la cola, como en el DCL de nudo y en la pantalla.
  const reacsJuntas = [];
  reacs.forEach(e => {
    const nd = nodos.find(z=>coincide(z, e.x, e.y)), rr = nd ? resultado.reacciones[nd.id] : null;
    if(!(rr && rr.inclinado)){ reacsJuntas.push(e); return; }
    let j = reacsJuntas.find(q => q.inclinadoDe === nd.id);
    if(!j){ j = {x:e.x, y:e.y, fx:0, fy:0, et:'R', inclinadoDe:nd.id, nombre:nd.nombre}; reacsJuntas.push(j); }
    j.fx += e.fx; j.fy += e.fy;
  });
  const grupos = [];
  cargas.concat(reacsJuntas).forEach(e=>{
    const mag = Math.hypot(e.fx, e.fy);
    if(mag < 1e-9) return;
    const esR = e.et.charAt(0) === 'R', inclinada = e.inclinadoDe !== undefined;
    // La etiqueta de una reacción es 'R' + nudo + eje ('RAy'): se rotula R_{yA}.
    const txt = inclinada ? '$R_{' + escLatex(e.nombre) + '}$'
      : (esR ? '$R_{' + e.et.slice(-1) + escLatex(e.et.slice(1, -1)) + '}$' : dec(mag,'f') + '\\,' + escLatex(unitFor));
    const nd = nodos.find(z=>coincide(z, e.x, e.y));
    let gr = nd ? grupos.find(q => q.nd === nd) : null;
    if(!gr){ gr = {nd, x:e.x, y:e.y, lista:[]}; grupos.push(gr); }
    gr.lista.push({ux:e.fx/mag, uy:e.fy/mag, col: esR ? 'bsaVerde' : 'bsaAcc', txt, esCarga:!esR, arco: (esR && !inclinada) ? null : 0.55,
                   extra: (!esR && nd) ? _ejesDeArcos(arcos, nd.id) : null});
  });
  grupos.forEach(gr => {
    s += _fuerzasAplicadas({reg, n: gr.nd || {id:'libre'}, px:X(gr.x), py:Y(gr.y), L, hueco:g,
                            ocup: gr.nd ? ocupDe(gr.nd) : [], pend, arcos}, gr.lista).tikz;
  });

  // El sitio ideal de cada rótulo (detrás del extremo libre) se reserva antes de
  // poner las letras de los ángulos y los nombres, y se libera antes de colocar
  // los rótulos. Con las flechas acortadas, la θ de F_LE ocupaba el hueco bajo la
  // punta de F_FL y su rótulo tenía que irse lejos con una guía.
  pend.forEach(p => {
    const cj = _cajaRotuloArm(p.txt, 'small', esc), d = (Math.abs(p.dx)*cj.w + Math.abs(p.dy)*cj.h)/2 + 0.07/esc;
    reg.caja(p.ex + p.dx*d, p.ey + p.dy*d, cj.w, cj.h, 'reserva');
  });
  s += _dibujarArcos(arcos, gen, reg, angulos);
  nl.forEach(n=>{ s += _rotuloNudo(reg, X(n.x), Y(n.y), n.nombre, 'bsaNudo', n.id); });
  for(let i = reg.items.length - 1; i >= 0; i--) if(reg.items[i].tipo === 'reserva') reg.items.splice(i, 1);
  const desde = reg.items.length;
  pend.forEach(p=>{ s += _rotuloTrasExtremo(p.ex, p.ey, p.dx, p.dy, p.txt, 'bsaRot, text=' + p.col, esc, reg, p.largo); });
  // Lo que cuesta esta composición: una por cada rótulo que ha necesitado guía y
  // diez más por cada guía que cruza otro rótulo o el nombre de un nudo (la guía se
  // para antes de su propio rótulo, así que no cuenta).
  const guias = reg.items.slice(desde).filter(it => it.tipo === 'guia');
  const textos = reg.items.filter(it => it.tipo === 'rotulo' || it.tipo === 'nombre');
  let pena = guias.length;
  guias.forEach(gu => textos.forEach(te => { if(_cajasCerca(gu.bb, te.bb, 0) && _separacion(gu.pol, te.pol) < 0) pena += 10; }));
  // Y diez por cada guía que cruza una flecha y por cada pareja de flechas de
  // barras cortadas que sigue tocándose tras acortar (a menos de margenC): sin
  // esto, 0 puntos no aseguraba que las flechas no se pisaran.
  const flechas = reg.items.filter(it => it.tipo === 'flecha');
  guias.forEach(gu => flechas.forEach(fl => { if(_cajasCerca(gu.bb, fl.bb, 0) && _separacion(gu.pol, fl.pol) < 0) pena += 10; }));
  for(let i = 0; i < cortadas.length; i++) for(let j = i+1; j < cortadas.length; j++){
    if(cortadas[i].nd.id === cortadas[j].nd.id) continue;
    if(_separacion(polCortada(cortadas[i], largos[i]), polCortada(cortadas[j], largos[j]), margenC) < margenC) pena += 10;
  }
  return {s, angulos, reg, tx, ty, nl, pena};
}

// Marco de referencia global (x, y): dos flechitas que dicen cuál es el sentido
// positivo de cada suma de fuerzas. Va en una esquina del DCL, nunca sobre el
// nudo, para que no se confunda con una fuerza (R21). Mide lo mismo en el papel
// en todas las figuras (0.55 cm), sea cual sea su escala.
function tikzMarcoXY(x, y, escala){
  const F = v => v.toFixed(3), a = 0.55/(escala || 1);
  const est = '-{Stealth[length=1.6mm, width=1.2mm]}, bsaMuted, line width=0.6pt';
  let t = '\\draw[' + est + '] (' + F(x) + ',' + F(y) + ') -- (' + F(x+a) + ',' + F(y) + ') node[right, font=\\small, inner sep=1pt, text=bsaMuted] {$x$};\n';
  t += '\\draw[' + est + '] (' + F(x) + ',' + F(y) + ') -- (' + F(x) + ',' + F(y+a) + ') node[above, font=\\small, inner sep=1pt, text=bsaMuted] {$y$};\n';
  t += '\\fill[bsaMuted] (' + F(x) + ',' + F(y) + ') circle (0.8pt);\n';
  return t;
}
// Coloca el marco en la esquina LIBRE más próxima al contenido: prueba cada
// esquina del recuadro de lo dibujado, primero por dentro (no agranda la
// figura) y luego hacia fuera, y se queda con la posición libre (con un margen,
// para que no parezca una fuerza) que menos se sale del recuadro. Antes se
// elegía entre posiciones fijas a casi 6 unidades del nudo.
function mejorEsquina(reg){
  const B = reg.limites(it => it.tipo !== 'guia');
  if(!B) return '';
  const e = reg.esc, a = 0.55/e, bw = a + 0.30/e, bh = a + 0.34/e, paso = 0.18/e, marg = 0.14/e;
  // Las candidatas se ordenan por coste y se prueban en ese orden: la primera
  // libre es la mejor, y no hace falta preguntar por las otras mil.
  const cands = [];
  [[1,1], [-1,1], [1,-1], [-1,-1]].forEach(([sx, sy], iq) => {
    for(let i = -5; i <= 10; i++) for(let j = -5; j <= 10; j++){
      const x0 = sx > 0 ? B.x1 + i*paso - bw : B.x0 - i*paso;
      const y0 = sy > 0 ? B.y1 + j*paso - bh : B.y0 - j*paso;
      const fuera = Math.max(0, x0 + bw - B.x1) + Math.max(0, B.x0 - x0) + Math.max(0, y0 + bh - B.y1) + Math.max(0, B.y0 - y0);
      cands.push({coste: fuera + 0.6*paso*(Math.max(0, -i) + Math.max(0, -j)) + iq*1e-4, x0, y0, orden: cands.length});
    }
  });
  cands.sort((p, q) => p.coste - q.coste || p.orden - q.orden);
  const mejor = cands.find(c => !reg.choca(_polCaja(c.x0 + bw/2, c.y0 + bh/2, bw, bh), marg));
  if(!mejor) return '';
  reg.caja(mejor.x0 + bw/2, mejor.y0 + bh/2, bw, bh, 'marco');
  return tikzMarcoXY(mejor.x0 + 0.04/e, mejor.y0 + 0.04/e, e);
}

// ── DCL individual de un nudo (esquemático, sin escala geométrica) ──
// El rotulo lleva SOLO la variable (R21). `incognitas`: ids de las barras que se
// despejan en ESTE nudo; van a trazos, en gris neutro y saliendo del nudo
// (_flechaIncognita), como se escriben en sus ecuaciones. Las demás ya vienen
// resueltas de nudos anteriores (o por inspección) y se reconocen por el SENTIDO
// REAL de la flecha, el trazo continuo y el color, no por un numero: los valores
// van en las ecuaciones y en la tabla resumen. Una de fuerza cero conocida es un
// trazo fino gris sin punta. Sin `incognitas`, todas se dan por conocidas.
// El punto del nudo se pinta primero, para que las puntas queden encima. Todas
// las flechas miden FL_NUDO; las barras salen del nudo si tiran y llegan a
// FL_HUECO de él si empujan. Primero la carga, que tiene prioridad sobre su eje:
// esquiva las barras y el eje del apoyo, y si puede los ejes de los arcos de las
// barras; después las reacciones, que esquivan lo que ya está. Si los dos lados
// de una fuerza están ocupados se apila en su línea (ladoCarga): las fuerzas del
// nudo siguen siendo concurrentes. La figura se ajusta a lo dibujado: ya no
// lleva un recuadro invisible fijo.
function tikzDCLNudo(n, res, escala, incognitas){
  const esc = escala || ESC_NUDO, reg = crearRegistro(esc);
  const L = FL_NUDO, g = FL_HUECO, R = g + L;
  const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
  const gen = letrasGriegas(), angulos = [], pend = [], arcos = [], ocup = [];
  const esIncognita = id => Array.isArray(incognitas) && incognitas.indexOf(id) >= 0;
  let s = '\\fill[black] (0,0) circle (2pt);\n';
  reg.caja(0, 0, 0.14/esc, 0.14/esc, 'punto', {nudo:n.id, radialDe:[n.id]});

  conec.forEach(b=>{
    const o = nodos.find(z=>z.id === (b.a===n.id?b.b:b.a));
    const dx=o.x-n.x, dy=o.y-n.y, Lb=Math.hypot(dx,dy);
    const ux=dx/Lb, uy=dy/Lb, ang = Math.atan2(uy, ux)*180/Math.PI;
    ocup.push(ang);
    const val = res.fuerzas[b.id] || 0;
    const cero = esCero(val), incog = esIncognita(b.id);
    const col = incog ? COLOR_INCOGNITA : (cero ? COLOR_CERO : (val>0 ? 'bsaAcc2' : 'bsaRoj'));
    if(incog){
      s += _flechaIncognita(reg, 0, 0, ux*R, uy*R, _radial(n.id, ang, -1));
    } else if(cero){
      s += _trazoCero(reg, 0, 0, ux*R, uy*R, _radial(n.id, ang, 0));
    } else if(val > 0){
      s += _flecha(reg, 0, 0, ux*R, uy*R, col, _radial(n.id, ang, -1));
    } else {
      s += _flecha(reg, ux*R, uy*R, ux*g, uy*g, col, _radial(n.id, ang, 1));
    }
    pend.push({ex:ux*R, ey:uy*R, dx:ux, dy:uy, txt:'$F_{' + escLatex(nombreBarra(b)) + '}$', col, largo:L});
    // Arco con letra griega para el ángulo (agudo) respecto del eje más cercano.
    arcos.push({ux, uy, col, radio:0.65, ox:0, oy:0, nudo:n.id});
  });

  // La carga y las reacciones, juntas (_fuerzasAplicadas). Si la fuerza es
  // inclinada (las cargas y la reacción de un rodillo inclinado; las demás
  // reacciones van por componentes), su ángulo va en la cola: junto al nudo se
  // montaba con los arcos de las barras.
  const lista = [];
  if(!esCero(n.fx) || !esCero(n.fy)){
    const mag = Math.hypot(n.fx, n.fy);
    // La carga no va por donde está el apoyo (aunque aquí no se dibuje) y, si
    // puede, tampoco por el eje de un arco: su punteado correría sobre el fuste.
    const eje = (n.apoyo === 'fijo' || n.apoyo === 'movil') ? [{ang:anguloDibujoApoyo(n) - 180, tol:30}] : [];
    lista.push({ux:n.fx/mag, uy:n.fy/mag, col:'bsaAcc', txt:dec(mag,'f') + '\\,' + escLatex(unitFor), esCarga:true, arco:0.55,
                extra:eje.concat(_ejesDeArcos(arcos, n.id))});
  }
  // Reacciones: R>0 apunta a +x / +y.
  const rr = res.reacciones[n.id];
  const reac = (ux, uy, txt) => lista.push({ux, uy, col:'bsaVerde', txt, arco:0.55});
  if(rr){
    if(rr.inclinado && !esCero(rr.mag)){
      // Un rodillo inclinado tiene UNA reacción: una sola flecha, en su sentido
      // real (si la magnitud salió negativa, empuja al revés de lo declarado).
      const ar = rr.ang*Math.PI/180, sg = rr.mag > 0 ? 1 : -1;
      reac(sg*Math.cos(ar), sg*Math.sin(ar), '$R_{' + escLatex(n.nombre) + '}$');
    } else {
      if(rr.ry !== undefined && !esCero(rr.ry)) reac(0, rr.ry>0?1:-1, '$R_{y' + escLatex(n.nombre) + '}$');
      if(rr.rx !== undefined && !esCero(rr.rx)) reac(rr.rx>0?1:-1, 0, '$R_{x' + escLatex(n.nombre) + '}$');
    }
  }
  if(lista.length) s += _fuerzasAplicadas({reg, n, px:0, py:0, L, hueco:g, ocup, pend, arcos}, lista).tikz;

  s += _dibujarArcos(arcos, gen, reg, angulos);
  s += _rotuloNudo(reg, 0, 0, n.nombre, 'bsaNudo', n.id);
  pend.forEach(p=>{ s += _rotuloTrasExtremo(p.ex, p.ey, p.dx, p.dy, p.txt, 'bsaRot, text=' + p.col, esc, reg, p.largo); });
  // Marco x,y en la esquina libre más próxima a lo dibujado.
  s += mejorEsquina(reg);
  return {tikz:s, angulos};
}

// ── Armadura completa reutilizable: geometría base + variantes ──
// opts: {fuerzas, reacciones, cotas, valores, factorCargas, resaltar, neutra,
//        reaccionesIncognita, brazosDesde, cargas, escala}
// Los ángulos de las cargas inclinadas quedan en `_angulosFigura`: la función
// devuelve un string (los llamadores lo concatenan), así que el pie los lee de
// aquí justo después de llamarla.
let _angulosFigura = [];
// La figura no puede pasar del ancho útil de la página (A4 con márgenes de 2 cm:
// 17 cm), menos un margen para lo que las cajas estimadas de los rótulos no ven.
// La escala de 12,5 cm solo acota la armadura: las reacciones laterales, los
// rótulos, las cotas y las columnas de brazos van fuera. Si con todo eso la
// figura se pasa, se rehace con la geometría reducida lo justo (la letra y las
// flechas miden lo mismo en el papel, así que se descuenta esa parte fija).
const ANCHO_UTIL_CM = 16.6;
function tikzArmaduraCompleta(opts){
  opts = opts || {};
  const disp = ANCHO_UTIL_CM/(opts.escala || ESC_GLOBAL);
  let r = _armaduraCompleta(opts, 0);
  for(let i = 0; i < 3 && r.B && r.B.x1 - r.B.x0 > disp; i++){
    const ancho = r.B.x1 - r.B.x0, fijo = ancho - r.anchoReal*r.k;
    let k = (disp - fijo)/r.anchoReal;
    if(!(k > 0)) k = r.k*disp/ancho;
    r = _armaduraCompleta(opts, Math.min(k, 0.97*r.k));
  }
  return r.s;
}
function _armaduraCompleta(opts, kFijo){
  const esc = opts.escala || ESC_GLOBAL, reg = crearRegistro(esc);
  const fuerzas = opts.fuerzas || resultado.fuerzas;
  const reacciones = opts.reacciones || resultado.reacciones;
  const factorCargas = opts.factorCargas || 1;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const anchoReal = Math.max(maxX-minX, 1e-6), altoReal = Math.max(maxY-minY, 1e-6);
  // 12.5 cm de ancho, sin pasar de 10 cm de alto (una armadura esbelta en
  // vertical se salía de la página).
  const k = kFijo || Math.min(12.5/anchoReal, 10/altoReal);
  const X = x => (x-minX)*k, Y = y => (y-minY)*k;
  const tx = (x)=> X(x).toFixed(3);
  const ty = (y)=> Y(y).toFixed(3);
  const maxF = Math.max(1e-9, ...barras.map(b=>Math.abs(fuerzas[b.id]||0)));
  _angulosFigura = [];
  const gen = letrasGriegas(), pend = [], arcos = [];
  const ocupPorNudo = {}, ocupDe = n => (ocupPorNudo[n.id] = ocupPorNudo[n.id] || _angulosBarras(n));

  let s = '';
  barras.forEach(b=>{
    const na = nodos.find(x=>x.id===b.a), nb = nodos.find(x=>x.id===b.b);
    if(!na||!nb) return;
    const f = fuerzas[b.id]||0;
    const resaltada = opts.resaltar && opts.resaltar===b.id;
    // La PRIMERA figura del informe (opts.neutra) va como en el panel de dibujo,
    // sin colores de tracción/compresión ni grosor por fuerza. El DCL global de
    // las reacciones lleva los colores pero grosor uniforme: el grosor por fuerza
    // adelantaría el resultado antes de calcularlo. Solo se resalta la barra que
    // se pida.
    const uniforme = opts.neutra || opts.reaccionesIncognita;
    const grosor = resaltada ? 3.2 : (uniforme ? 1.4 : (0.8 + 1.4*Math.abs(f)/maxF));
    const col = resaltada ? 'bsaAlerta' : (opts.neutra ? 'bsaBarra' : tikzColorFuerza(f));
    s += '\\draw[' + col + ', line width=' + grosor.toFixed(2) + 'pt] (' + tx(na.x) + ',' + ty(na.y) + ') -- (' + tx(nb.x) + ',' + ty(nb.y) + ');\n';
    reg.seg(X(na.x), Y(na.y), X(nb.x), Y(nb.y), grosor*PT_CM/2/esc, 'barra', _radialBarra(na, nb));
  });
  if(opts.valores){
    barras.forEach(b=>{
      const na = nodos.find(x=>x.id===b.a), nb = nodos.find(x=>x.id===b.b);
      if(!na||!nb) return;
      const f = fuerzas[b.id]||0, resaltada = opts.resaltar && opts.resaltar===b.id;
      const col = resaltada ? 'bsaAlerta' : tikzColorFuerza(f);
      const mx = (X(na.x)+X(nb.x))/2, my = (Y(na.y)+Y(nb.y))/2, txt = dec(Math.abs(f),'f');
      const c = _cajaRotuloArm(txt, 'scriptsize', esc);
      s += '\\node[bsaCota, text=' + col + (resaltada ? ', font=\\scriptsize\\bfseries' : '') + '] at (' + mx.toFixed(3) + ',' + my.toFixed(3) + ') {' + txt + '};\n';
      reg.caja(mx, my, c.w, c.h, 'rotulo');
    });
  }
  nodos.forEach(n=>{
    if(n.apoyo === 'fijo' || n.apoyo === 'movil') s += tikzApoyo(n.apoyo, X(n.x), Y(n.y), anguloDibujoApoyo(n), reg, n.id);
  });
  nodos.forEach(n=>{
    s += '\\fill (' + tx(n.x) + ',' + ty(n.y) + ') circle (1.5pt);\n';
    reg.caja(X(n.x), Y(n.y), 0.11/esc, 0.11/esc, 'punto', {nudo:n.id, radialDe:[n.id]});
  });
  // Cargas y reacciones de cada nudo, juntas (_fuerzasAplicadas): las cargas
  // delante, que tienen prioridad sobre su eje, salvo que así alguna quede peor.
  // El ángulo de una carga inclinada se acota en la COLA de su flecha: en el
  // nudo lo tapaba la punta. Las reacciones incógnita van en su sentido positivo
  // supuesto (+x, +y), para el DCL global con el que se plantean las ecuaciones
  // de reacciones; una que viene por el eje de su apoyo nace más allá del
  // símbolo, y R_x no se dibuja encima de una barra. El rodillo inclinado es UNA
  // incógnita, no dos componentes: una sola flecha en la dirección declarada,
  // con su ángulo (agudo, desde el eje más cercano) en la cola, que queda más
  // allá del símbolo.
  nodos.forEach(n=>{
    const lista = [];
    if(opts.cargas !== false){
      const fx = (n.fx || 0)*factorCargas, fy = (n.fy || 0)*factorCargas;
      if(!esCero(fx) || !esCero(fy)){
        const mag = Math.hypot(fx, fy);
        lista.push({ux:fx/mag, uy:fy/mag, col:'bsaAcc', txt:dec(mag,'f') + '\\,' + escLatex(unitFor), esCarga:true, arco:0.45});
      }
    }
    const rr = opts.reaccionesIncognita ? reacciones[n.id] : null;
    if(rr){
      const reac = (ux, uy, txt) => lista.push({ux, uy, col:'bsaVerde', txt, esApoyo:true, arco:0.55});
      if(rr.inclinado){
        const ar = rr.ang*Math.PI/180;
        reac(Math.cos(ar), Math.sin(ar), '$R_{' + escLatex(n.nombre) + '}$');
      } else {
        if(rr.ry !== undefined) reac(0, 1, '$R_{y' + escLatex(n.nombre) + '}$');
        if(rr.rx !== undefined) reac(1, 0, '$R_{x' + escLatex(n.nombre) + '}$');
      }
    }
    if(lista.length) s += _fuerzasAplicadas({reg, n, px:X(n.x), py:Y(n.y), L:FL_GLOBAL, hueco:FL_HUECO, ocup:ocupDe(n), pend, arcos}, lista).tikz;
  });
  const angs = [];
  s += _dibujarArcos(arcos, gen, reg, angs);
  angs.forEach(a => _angulosFigura.push(a));
  nodos.forEach(n=>{ s += _rotuloNudo(reg, X(n.x), Y(n.y), n.nombre, 'bsaNudo', n.id); });
  pend.forEach(p=>{ s += _rotuloTrasExtremo(p.ex, p.ey, p.dx, p.dy, p.txt, 'bsaRot, text=' + p.col, esc, reg, p.largo); });
  if(opts.cotas){
    s += tikzCotas(reg, tx, ty);
  }
  // Brazos desde el punto de momentos: sustituyen a las cotas geométricas en el
  // DCL con el que se plantea la ecuación (la geometría ya está en la Figura 1).
  if(opts.brazosDesde){
    s += tikzBrazosMomento(opts.brazosDesde, _fuerzasParaBrazos(reacciones), tx, ty, null, reg);
  }
  // El DCL global lleva también su marco x,y, con el mismo criterio.
  if(opts.reaccionesIncognita) s += mejorEsquina(reg);
  return {s, k, anchoReal, B: reg.limites(it => it.tipo !== 'guia')};
}
// Arma el texto .tex y lo DEVUELVE (no descarga nada).
// Lo usan tanto descargarTex() como generarPDFLatex().
