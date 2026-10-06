// ═══════════════════════════════════════════════════════════
//  13 · EL PROCEDIMIENTO DEL PROBLEMA INVERSO (2026-10-05, petición del profesor)
//  Una vez elegido el nivel (12-), se escribe el camino que se haría a mano:
//  (1) las presiones y las fuerzas en función de h, (2) la ecuación de la
//  condición con h como incógnita, (3) su despeje y (4) la comprobación con el
//  valor hallado. h es la ALTURA del líquido sobre el punto de referencia (el
//  más bajo de la compuerta o la base de la presa).
//
//  Entre dos «puntos de cambio» (las cotas de los nudos o vértices y de las
//  capas de debajo) cada fuerza de un tramo recto es un polinomio en h: el
//  rectángulo de cada banda crece como h, el triángulo de la banda que corta la
//  superficie como h², y su posición, linealmente. La ecuación sale entonces de
//  grado ≤ 3. Se arma con esos polinomios y se CONTRASTA con el motor: la suma
//  de las partes tiene que dar la fuerza y el momento que integró `analizar`, y
//  la raíz, el nivel que encontró la búsqueda (aviso por consola si no).
//  Una placa curva que la superficie corta no da un polinomio: se resuelve por
//  tanteo y se dice así.
// ═══════════════════════════════════════════════════════════

// ── Polinomios en h: coeficientes de menor a mayor grado ──
const PH = {
  add(...ps){
    const n = Math.max(1, ...ps.map(p=>p.length)), r = new Array(n).fill(0);
    ps.forEach(p=>p.forEach((v, i)=>{ r[i] += v; }));
    return r;
  },
  esc(p, k){ return p.map(v=>v*k); },
  mul(a, b){
    const r = new Array(a.length + b.length - 1).fill(0);
    a.forEach((x, i)=>b.forEach((y, j)=>{ r[i+j] += x*y; }));
    return r;
  },
  val(p, h){ return p.reduce((s, v, i)=>s + v*Math.pow(h, i), 0); },
  der(p){ return p.slice(1).map((v, i)=>v*(i+1)); },
  limpio(p){
    const m = Math.max(1e-12, ...p.map(Math.abs));
    const r = p.map(v=>Math.abs(v) < 1e-9*m ? 0 : v);
    while(r.length > 1 && r[r.length-1] === 0) r.pop();
    return r;
  }
};

// Un coeficiente: con los decimales de fuerza, pero con tres al menos si es
// pequeño (un 0.33 que se escribe 0.3 ya no rehace la cuenta).
function _numInv(v){
  const d = Math.abs(v) < 10 ? Math.max(DEC.fuerza, 3) : DEC.fuerza;
  const s = (Math.abs(v) < 5e-12 ? 0 : v).toFixed(d);
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}
// Un polinomio en h, escrito como a mano: k(h − r), k(h − r)², o desarrollado.
// `expandir`: siempre desarrollado (la ecuación final: factorizada ya diría la raíz).
function polyHTex(p0, letra, expandir){
  const h = letra || 'h';
  const p = PH.limpio(p0);
  const n = p.length - 1;
  const fact = (k, r, e) => {
    const rr = Math.abs(r) < 1e-12 ? h : '(' + h + (r > 0 ? ' - ' : ' + ') + dec(Math.abs(r),'len') + ')';
    return (Math.abs(k - 1) < 1e-12 ? '' : _numInv(k) + '\\,') + rr + (e > 1 ? '^{' + e + '}' : '');
  };
  if(n <= 0) return _numInv(p[0] || 0);
  if(n === 1 && !expandir) return fact(p[1], -p[0]/p[1], 1);
  if(n === 2 && !expandir){
    const disc = p[1]*p[1] - 4*p[2]*p[0];
    if(Math.abs(disc) < 1e-7*Math.max(1, p[1]*p[1])) return fact(p[2], -p[1]/(2*p[2]), 2);
  }
  // desarrollado, del mayor grado al menor
  const t = [];
  for(let i=n;i>=0;i--){
    const v = p[i];
    if(Math.abs(v) < 1e-12) continue;
    const mag = _numInv(Math.abs(v));
    const pot = i === 0 ? mag : (Math.abs(Math.abs(v) - 1) < 1e-12 ? '' : mag + '\\,') + h + (i > 1 ? '^{' + i + '}' : '');
    t.push({s: v < 0 ? '-' : '+', pot});
  }
  return t.map((x, i)=>(i === 0 ? (x.s === '-' ? '-' : '') : ' ' + x.s + ' ') + x.pot).join('');
}

const _cruz = (a, b) => a.x*b.y - a.y*b.x;

// Presión de la zona z a la cota y como polinomio en h (la altura de la
// superficie sobre `ref`): las capas de debajo de la primera están fijas.
function _presionPolyInv(z, y, ref, nivStar){
  const capas = capasOrdenadas(z);
  const lv = i => i === 0 ? [ref, 1] : [capas[i].niv];
  // capa en la que cae y, juzgada con el nivel hallado
  let k = -1;
  for(let i=0;i<capas.length;i++){
    const arriba = i === 0 ? nivStar : capas[i].niv;
    const abajo = i + 1 < capas.length ? capas[i+1].niv : -Infinity;
    if(y < arriba + 1e-12 && y >= abajo - 1e-12){ k = i; break; }
  }
  if(k < 0) return [0];
  let p = [0];
  for(let i=0;i<k;i++) p = PH.add(p, PH.esc(PH.add(lv(i), PH.esc(lv(i+1), -1)), capas[i].g));
  return PH.add(p, PH.esc(PH.add(lv(k), [-y]), capas[k].g));
}

// ── Las partes (rectángulo y triángulo por banda) de un tramo recto mojado ──
// Devuelve [{tipo, F, s, E0, t, dir, banda}] con F y s polinomios en h; s se mide
// desde el extremo ALTO del tramo (E0), que no se mueve con el nivel.
function _partesSegmentoInv(seg, z, ref, nivStar){
  const b = anchoB();
  const capas = capasOrdenadas(z);
  const E0 = seg.A.y >= seg.B.y ? seg.A : seg.B, E1 = E0 === seg.A ? seg.B : seg.A;
  const len = Math.hypot(E1.x - E0.x, E1.y - E0.y);
  const t = {x:(E1.x - E0.x)/len, y:(E1.y - E0.y)/len};
  const dy = E0.y - E1.y, sinB = dy/len;
  const out = [];
  if(dy < 1e-9*Math.max(1, len)){
    const p = _presionPolyInv(z, E0.y, ref, nivStar);
    out.push({tipo:'rect', F:PH.esc(p, b*len), s:[len/2], E0, t, dir:seg.dir, banda:1, L:[len], pTop:p});
    return out;
  }
  // capas: sus cotas (la de arriba, simbólica)
  const lvPoly = i => i === 0 ? [ref, 1] : [capas[i].niv];
  const lvNum = i => i === 0 ? nivStar : capas[i].niv;
  // banda de partida: la capa en la que cae la cota superior mojada
  const corta = E0.y > nivStar + 1e-12;
  let yTop = corta ? lvPoly(0) : [E0.y];
  let k = 0;
  const yTopNum = corta ? nivStar : E0.y;
  while(k + 1 < capas.length && yTopNum <= lvNum(k+1) + 1e-12) k++;
  let banda = 0;
  while(true){
    const yBotNum = Math.max(E1.y, k + 1 < capas.length ? lvNum(k+1) : -Infinity);
    const yBot = [yBotNum];
    const yTopVal = PH.val(yTop, nivStar - ref);
    if(yTopVal - yBotNum > 1e-12){
      banda++;
      const pT = _presionPolyInv(z, yTopVal, ref, nivStar);  // presión a la cota de arriba de la banda
      // si la cota de arriba es la superficie (simbólica), su presión es 0
      const pTop = (corta && banda === 1) ? [0] : (banda === 1 ? _presionPolyInv(z, E0.y, ref, nivStar) : pT);
      const dyBand = PH.add(yTop, PH.esc(yBot, -1));            // y_t − y_b
      const L = PH.esc(dyBand, 1/sinB);
      const sT = PH.esc(PH.add([E0.y], PH.esc(yTop, -1)), 1/sinB);
      const dp = PH.esc(dyBand, capas[k].g);                     // p_b − p_t
      if(PH.limpio(pTop).some(v=>Math.abs(v) > 1e-12))
        out.push({tipo:'rect', F:PH.esc(PH.mul(L, pTop), b), s:PH.add(sT, PH.esc(L, 0.5)), E0, t, dir:seg.dir, banda, L, pTop});
      out.push({tipo:'tri', F:PH.esc(PH.mul(L, dp), 0.5*b), s:PH.add(sT, PH.esc(L, 2/3)), E0, t, dir:seg.dir, banda, L, pTop, dp});
    }
    if(yBotNum <= E1.y + 1e-12 || k + 1 >= capas.length) break;
    yTop = yBot; k++;
  }
  return out;
}

// ── El procedimiento de la solución i ──
function procesoInverso(res, i){
  const s = res.sol[i];
  let pr = null;
  _conNivelInv(res.z, s.h, ()=>{
    try { pr = (res.c.tipo === 'tope' || res.c.tipo === 'reac') ? _procCompuertaInv(res, s) : _procPresaInv(res, s); }
    catch(e){ console.warn('Problema inverso: no se pudo armar el procedimiento', e); pr = null; }
    return null;
  });
  return pr;
}

// Intervalo en el que valen las expresiones: entre dos cotas de cambio.
function _intervaloInv(ys, ref, nivStar){
  let a = -Infinity, b = Infinity;
  ys.forEach(y=>{
    if(y <= nivStar + 1e-9 && y > a) a = y;
    if(y > nivStar + 1e-9 && y < b) b = y;
  });
  return {Ha: a - ref, Hb: b - ref};
}

// Términos de una ecuación a partir de las partes y de las fuerzas constantes.
// `que`: {tipo:'M', C} o {tipo:'Fx'|'Fy'}.
function _terminosInv(segs, constantes, que, z, ref, nivStar, hs){
  const partes = [], terms = [];
  let P = [0];
  const avisos = [];
  segs.forEach(seg=>{
    const ps = _partesSegmentoInv(seg, z, ref, nivStar);
    // autocomprobación contra el motor: fuerza y momento respecto del origen
    let Fs = 0, Ms = 0;
    ps.forEach(q=>{
      const F = PH.val(q.F, hs), sv = PH.val(q.s, hs);
      const Px = q.E0.x + q.t.x*sv, Py = q.E0.y + q.t.y*sv;
      Fs += F; Ms += _cruz({x:Px, y:Py}, {x:q.dir.x*F, y:q.dir.y*F});
    });
    if(seg.f && (Math.abs(Fs - seg.f.F) > 2e-3*Math.max(1, seg.f.F) || Math.abs(Ms - seg.f.Mo) > 3e-3*Math.max(1, Math.abs(seg.f.Mo), seg.f.F)))
      avisos.push('Problema inverso: las partes de ' + seg.nombre + ' no reproducen la fuerza del motor');
    const varias = ps.length > 2 || ps.some(q=>q.banda > 1);
    ps.forEach(q=>{
      const sim = q.tipo === 'rect' ? '\\square' : '\\triangle';
      const nom = seg.nombre.replace(/\}$/, '') + '}^{' + sim + (varias ? q.banda : '') + '}';
      let term, brazo = null, comp = null;
      if(que.tipo === 'M'){
        const a0 = _cruz({x:q.E0.x - que.C.x, y:q.E0.y - que.C.y}, q.dir), a1 = _cruz(q.t, q.dir);
        const arm = PH.add([a0], PH.esc(q.s, a1));
        term = PH.mul(q.F, arm);
        const sg = Math.sign(PH.val(arm, hs)) || 1;
        brazo = PH.esc(arm, sg);                              // el brazo, positivo
        partes.push({nom, tipo:q.tipo, banda:q.banda, F:q.F, brazo, signo:sg, seg, s:q.s, E0:q.E0, t:q.t, dir:q.dir});
      } else {
        const k = que.tipo === 'Fx' ? q.dir.x : q.dir.y;
        term = PH.esc(q.F, k);
        comp = k;
        partes.push({nom, tipo:q.tipo, banda:q.banda, F:q.F, comp, signo:Math.sign(k) || 1, seg, s:q.s, E0:q.E0, t:q.t, dir:q.dir});
      }
      P = PH.add(P, term);
      terms.push({nom, term});
    });
  });
  // Las constantes, copiadas: cada ecuación les da su propio brazo.
  const usadas = [];
  constantes.forEach(cf0=>{
    const cf = Object.assign({}, cf0);
    let v;
    if(que.tipo === 'M') v = _cruz({x:cf.P.x - que.C.x, y:cf.P.y - que.C.y}, {x:cf.Fx, y:cf.Fy});
    else v = que.tipo === 'Fx' ? cf.Fx : cf.Fy;
    if(Math.abs(v) < 1e-12) return;
    cf.v = v;
    cf.brazo = que.tipo === 'M' ? Math.abs(v)/Math.max(1e-12, cf.F) : null;
    P = PH.add(P, [v]);
    usadas.push(cf);
  });
  return {partes, terms, P, avisos, constantes:usadas};
}

// Raíz de P(h) = 0 cerca de la que encontró la búsqueda.
function _raizInv(P0, hs){
  const P = PH.limpio(P0), n = P.length - 1;
  if(n === 1) return {h:-P[0]/P[1], metodo:'lineal'};
  if(n === 2){
    const [c, b, a] = P, d = b*b - 4*a*c;
    if(d >= 0){
      const r1 = (-b + Math.sqrt(d))/(2*a), r2 = (-b - Math.sqrt(d))/(2*a);
      return {h: Math.abs(r1 - hs) < Math.abs(r2 - hs) ? r1 : r2, metodo:'cuadratica', otra: Math.abs(r1 - hs) < Math.abs(r2 - hs) ? r2 : r1};
    }
  }
  if(n === 3 && Math.abs(P[1]) < 1e-12 && Math.abs(P[2]) < 1e-12)
    return {h: Math.cbrt(-P[0]/P[3]), metodo:'cubica'};
  // Newton desde la raíz de la búsqueda
  let h = hs;
  const D = PH.der(P);
  for(let k=0;k<60;k++){
    const f = PH.val(P, h), d = PH.val(D, h);
    if(Math.abs(d) < 1e-14) break;
    const hn = h - f/d;
    if(Math.abs(hn - h) < 1e-12*Math.max(1, Math.abs(h))){ h = hn; break; }
    h = hn;
  }
  return {h, metodo:'tanteo'};
}

// Polinomio por ajuste (para cuando la incógnita no sale de una sola ecuación):
// se evalúa el motor en cuatro alturas del intervalo y se resuelve el sistema.
function _ajusteInv(res, hs, intv){
  const a = Math.max(intv.Ha, hs - 1), bb = Math.min(intv.Hb, hs + 1);
  const span = (isFinite(a) && isFinite(bb)) ? (bb - a) : 2;
  const xs = [0.15, 0.4, 0.65, 0.9].map(f=>(isFinite(a) ? a : hs - 1) + span*f);
  const ys = xs.map(x=>{ const e = evaluarInverso(res.c, res.z, x + res.rg.ref); return e ? e.v : NaN; });
  if(ys.some(v=>!isFinite(v))) return null;
  // Vandermonde 4×4
  const A = xs.map(x=>[1, x, x*x, x*x*x]);
  const sol = resolverSistema(A, ys.slice());
  if(!sol) return null;
  const chk = evaluarInverso(res.c, res.z, hs + res.rg.ref);
  if(!chk || Math.abs(PH.val(sol, hs) - chk.v) > 1e-3*Math.max(1, Math.abs(chk.v))) return null;
  return PH.limpio(sol);
}

function _procCompuertaInv(res, s){
  const c = res.c, z = res.z, ref = res.rg.ref, hs = s.h - ref;
  const r = analizar();
  if(r.error) return null;
  const j = r.inc.findIndex(u=>u.n.id === c.nid && u.tipo === c.tinc);
  if(j < 0) return null;
  const u = r.inc[j];
  const ys = nodos.map(n=>n.y).concat(capasOrdenadas(z).slice(1).map(q=>q.niv));
  const intv = _intervaloInv(ys, ref, s.h);
  const X = c.tipo === 'tope' ? 0 : (Math.sign(r.val[j]) || 1)*c.valor;
  const pr = {c, z, hs, ref, intv, inc:u, X, simb:simbIncognita(u), avisos:[], r};
  const segs = r.cargas.filter(f=>f.z === z).map(f=>({nombre:'F_{' + f.k + '}', f, A:nodo(f.t.a), B:nodo(f.t.b), dir:f.dir, curvo:!!arcoDeTramo(f.t), tramo:nomTramo(f.t)}));
  const constantes = r.fuerzas.filter(f=>f.esPeso || f.z !== z)
    .map(f=>({nombre:f.nombre || ('F_{' + f.k + '}'), P:f.P, Fx:f.Fx, Fy:f.Fy, F:f.F, t:f.t, esPeso:!!f.esPeso}));
  pr.nodosP = _nodosMojadosInv(segs, z, ref, s.h);
  if(segs.some(q=>q.curvo)){ pr.modo = 'tanteo'; return _tanteoInv(pr, res); }
  // La CADENA de ecuaciones del plan que lleva hasta la incógnita (2026-10-05,
  // petición del profesor): si la incógnita necesita otra antes (R_xB necesita
  // N_C, que sale de ΣM), se escribe primero esa en función de h y luego se
  // sustituye. Cada incógnita intermedia queda como polinomio en h.
  const pasos = r.plan.pasos, porJ = {};
  pasos.forEach(p=>{ if(p.tipo === 'despeje') porJ[p.j] = p; });
  const necesarios = new Set(), pila = [j];
  let posible = true;
  while(pila.length){
    const jj = pila.pop(), p = porJ[jj];
    if(!p){ posible = false; break; }
    if(necesarios.has(p)) continue;
    necesarios.add(p);
    (p.previas || []).forEach(q=>pila.push(q));
  }
  if(!posible){
    // Un sistema simultáneo: la incógnita, por ajuste al motor.
    const P = _ajusteInv(res, hs, intv);
    if(!P){ pr.modo = 'tanteo'; return _tanteoInv(pr, res); }
    pr.modo = 'ajuste';
    pr.Xpoly = P;
    pr.P = PH.add(P, [-X]);
    pr.raiz = _raizInv(pr.P, hs);
    return _cerrarInv(pr, res, s);
  }
  const conocidos = {};
  pr.pasos = [];
  pasos.filter(p=>necesarios.has(p)).forEach(p=>{
    const ec = r.plan.ecs[p.e];
    const lado = ec.lado;
    const segsE = lado ? segs.filter(q=>lado.tramos.indexOf(q.f.t.id) >= 0) : segs;
    const constE = lado ? constantes.filter(q=>q.t && lado.tramos.indexOf(q.t.id) >= 0) : constantes;
    const que = (ec.tipo === 'M' || ec.tipo === 'Mrot') ? {tipo:'M', C:ec.centro} : {tipo:ec.tipo};
    const tt = _terminosInv(segsE, constE, que, z, ref, s.h, hs);
    tt.avisos.forEach(a=>pr.avisos.push(a));
    let P = tt.P;
    const prev = [];
    ec.us.forEach(q=>{
      if(q.j === p.j || !conocidos[q.j]) return;
      prev.push({simb:simbIncognita(r.inc[q.j]), coef:q.coef, poly:conocidos[q.j], j:q.j});
      P = PH.add(P, PH.esc(conocidos[q.j], q.coef));
    });
    const cj = (ec.us.find(q=>q.j === p.j) || {}).coef || 0;
    const paso = {ec, que, partes:tt.partes, constantes:tt.constantes, prev, j:p.j,
                  simb:simbIncognita(r.inc[p.j]), coef:cj, final:p.j === j, us:ec.us};
    if(paso.final){ paso.P = PH.add(P, [cj*X]); pr.P = paso.P; }
    else {
      paso.poly = PH.limpio(PH.esc(P, -1/cj));
      conocidos[p.j] = paso.poly;
      if(Math.abs(PH.val(paso.poly, hs) - r.val[p.j]) > 1e-3*Math.max(1, Math.abs(r.val[p.j])))
        pr.avisos.push('Problema inverso: ' + paso.simb + '(h) no reproduce el valor del motor');
    }
    pr.pasos.push(paso);
  });
  pr.modo = 'ecuacion';
  pr.raiz = _raizInv(pr.P, hs);
  return _cerrarInv(pr, res, s);
}

function _procPresaInv(res, s){
  const c = res.c, z = res.z, ref = res.rg.ref, hs = s.h - ref;
  const p = presa(c.pid);
  const rp = analizarPresa(p);
  if(rp.error) return null;
  const g = rp.g;
  const ys = g.verts.map(q=>q.y).concat(capasOrdenadas(z).slice(1).map(q=>q.niv));
  const intv = _intervaloInv(ys, ref, s.h);
  const pr = {c, z, hs, ref, intv, X:0, avisos:[], presa:true, rp};
  const segs = rp.agua.filter(q=>q.z === z).map(q=>({nombre:'E_{' + q.k + '}', f:{F:q.F, Mo:q.Mo}, A:q.A, B:q.B, dir:q.dir}));
  const constantes = rp.pesos.map(q=>({nombre:'W_{' + q.k + '}', P:{x:q.cx, y:q.cy}, Fx:0, Fy:-q.W, F:q.W, esPeso:true}))
    .concat(rp.agua.filter(q=>q.z !== z).map(q=>({nombre:'E_{' + q.k + '}', P:q.P, Fx:q.Fx, Fy:q.Fy, F:q.F})));
  pr.nodosP = _nodosMojadosInv(segs, z, ref, s.h);
  let ec, que;
  if(c.tipo === 'vuelco'){
    const derecha = rp.SFx >= 0;
    const T = {x: derecha ? g.base.x1 : g.base.x0, y: g.base.y, nombre:'T'};
    que = {tipo:'M', C:T};
    ec = {nombre:'\\sum M_{T} = 0', tipo:'M', centro:T};
    pr.toe = T;
  } else {
    que = {tipo:'Fy'};
    ec = {nombre:'\\sum F_y = 0', tipo:'Fy'};
  }
  const tt = _terminosInv(segs, constantes, que, z, ref, s.h, hs);
  pr.avisos = tt.avisos;
  pr.pasos = [{ec, que, partes:tt.partes, constantes:tt.constantes, prev:[], final:true, coef:0, us:[]}];
  pr.modo = 'ecuacion';
  pr.P = tt.P;
  pr.pasos[0].P = tt.P;
  pr.raiz = _raizInv(pr.P, hs);
  return _cerrarInv(pr, res, s);
}

// Presión en los nudos (o vértices) mojados, en función de h.
function _nodosMojadosInv(segs, z, ref, nivStar){
  const vistos = [], out = [];
  segs.forEach(seg=>[seg.A, seg.B].forEach(N=>{
    if(N.y > nivStar + 1e-12) return;
    const clave = N.x.toFixed(6) + ',' + N.y.toFixed(6);
    if(vistos.indexOf(clave) >= 0) return;
    vistos.push(clave);
    out.push({nombre:N.nombre || null, y:N.y, Hn:N.y - ref, p:_presionPolyInv(z, N.y, ref, nivStar)});
  }));
  return out;
}

// Sin polinomio: una tabla corta de tanteo alrededor de la raíz.
function _tanteoInv(pr, res){
  const span = Math.max(0.2, Math.abs(pr.hs)*0.1);
  pr.tabla = [-1, -0.5, 0, 0.5, 1].map(k=>{
    const H = pr.hs + k*span*0.25;
    const e = evaluarInverso(res.c, res.z, H + pr.ref);
    return {H, q: e ? e.q : NaN, m: e ? e.m : NaN};
  });
  pr.raiz = {h:pr.hs, metodo:'tanteo'};
  return _cerrarInv(pr, res, {h:pr.hs + pr.ref});
}

function _cerrarInv(pr, res, s){
  // la raíz de la ecuación escrita tiene que ser la que halló la búsqueda
  if(pr.raiz && Math.abs(pr.raiz.h - pr.hs) > 2e-3*Math.max(1, Math.abs(pr.hs)))
    pr.avisos.push('Problema inverso: la ecuación escrita no reproduce el nivel hallado');
  const e = evaluarInverso(res.c, res.z, s.h);
  pr.comprobacion = e;
  // el esquema, con el nivel hallado (aún aplicado por _conNivelInv)
  try { pr.figura = figuraInversoDatos(pr); } catch(err){ pr.figura = null; console.warn('Problema inverso: no se pudo armar el esquema', err); }
  pr.avisos.forEach(a=>console.warn(a));
  return pr;
}

// ═══ Textos comunes a la pantalla y al PDF ═══
function _condicionTexInv(pr){
  const c = pr.c, uF = escLatex(unitFor);
  if(c.tipo === 'tope') return pr.simb + ' = 0';
  if(c.tipo === 'reac') return '|' + pr.simb + '| = ' + dec(c.valor,'f') + '\\ \\text{' + uF + '}';
  if(c.tipo === 'vuelco') return 'N\\ \\text{en la arista } T';
  return 'N = 0';
}
function _formulaParteInv(q){
  if(q.tipo === 'rect') return 'b\\,L\\,p_{\\text{sup}}';
  return '\\tfrac12\\,b\\,L\\,\\Delta p';
}
const _envolverInv = t => /[+-]/.test(t.replace(/\([^()]*\)/g, '').replace(/^-/, '')) ? '\\left[' + t + '\\right]' : t;
const _coefTexInv = k => Math.abs(Math.abs(k) - 1) < 1e-9 ? '' : _numInv(Math.abs(k)) + '\\,';
// Un término de la ecuación, como se escribe a mano: signo, F(h)·brazo.
function _terminoTexInv(que, q){
  const F = polyHTex(q.F);
  if(que.tipo === 'M'){
    const br = polyHTex(q.brazo);
    return {s:q.signo, tex: _envolverInv(F) + '\\,' + (PH.limpio(q.brazo).length > 1 ? '\\left[' + br + '\\right]' : '(' + br + ')')};
  }
  const k = Math.abs(q.comp);
  return {s:q.signo, tex: _envolverInv(F) + (Math.abs(k - 1) < 1e-9 ? '' : '\\,(' + _numInv(k) + ')')};
}
function _constanteTexInv(que, cf){
  if(que.tipo === 'M') return {s:Math.sign(cf.v) || 1, tex: dec(cf.F, 'f') + '\\,(' + dec(cf.brazo,'len') + ')'};
  return {s:Math.sign(cf.v) || 1, tex: dec(Math.abs(cf.v),'f')};
}
// Las filas de una ecuación de la cadena: términos de 3 en 3. Las incógnitas ya
// halladas entran como S(h); la buscada, con su valor (o fuera, si vale cero);
// una intermedia, con su nombre.
function _filasPasoInv(paso, pr){
  const ts = [];
  paso.partes.forEach(q=>ts.push(_terminoTexInv(paso.que, q)));
  paso.constantes.forEach(cf=>ts.push(_constanteTexInv(paso.que, cf)));
  paso.prev.forEach(pv=>ts.push({s:Math.sign(pv.coef) || 1, tex:_coefTexInv(pv.coef) + pv.simb + '(h)'}));
  if(paso.final){
    if(Math.abs(pr.X) > 1e-12 && paso.coef){
      const v = paso.coef*pr.X;
      ts.push({s:Math.sign(v) || 1, tex:_coefTexInv(paso.coef) + '(' + dec(Math.abs(pr.X),'f') + ')'});
    }
  } else ts.push({s:Math.sign(paso.coef) || 1, tex:_coefTexInv(paso.coef) + paso.simb});
  const filas = [];
  for(let i=0;i<ts.length;i+=3)
    filas.push(ts.slice(i, i+3).map((t, k)=>((i + k === 0) ? (t.s < 0 ? '-' : '') : (t.s < 0 ? ' - ' : ' + ')) + t.tex).join(''));
  return filas;
}
// Las líneas (LaTeX) de una ecuación de la cadena, con su despeje.
function _lineasPasoInv(paso, pr){
  const filas = _filasPasoInv(paso, pr);
  const lin = [paso.ec.nombre.replace(' = 0','') + ':\\quad &' + filas.join(' \\\\ &') + ' = 0'];
  if(!paso.final) lin.push('\\Rightarrow\\quad &' + paso.simb + '(h) = ' + polyHTex(paso.poly, 'h', true));
  else lin.push((paso.prev.length ? '\\text{sustituyendo: }\\quad &' : '&') + polyHTex(paso.P, 'h', true) + ' = 0');
  return lin;
}
// Todas las partes de fuerza que aparecen en la cadena, sin repetir.
function _partesUnicasInv(pr){
  const vistos = {}, out = [];
  (pr.pasos || []).forEach(p=>p.partes.forEach(q=>{ if(!vistos[q.nom]){ vistos[q.nom] = 1; out.push(q); } }));
  return out;
}
function _constantesUnicasInv(pr){
  const vistos = {}, out = [];
  (pr.pasos || []).forEach(p=>p.constantes.forEach(q=>{ if(!vistos[q.nombre]){ vistos[q.nombre] = 1; out.push(q); } }));
  return out;
}
function _metodoTexInv(pr){
  const m = pr.raiz && pr.raiz.metodo;
  if(m === 'lineal') return 'ecuación de primer grado';
  if(m === 'cuadratica') return 'ecuación de segundo grado';
  if(m === 'cubica') return 'ecuación cúbica sin términos intermedios: raíz cúbica';
  const g = pr.P ? PH.limpio(pr.P).length - 1 : 0;
  return g === 3 ? 'ecuación cúbica: se resuelve por tanteo' : 'se resuelve por tanteo';
}
function _validezTexInv(pr){
  const a = pr.intv.Ha, b = pr.intv.Hb;
  const A = isFinite(a) ? dec(Math.max(a, 0),'len') : '0';
  return isFinite(b) ? A + ' \\le h \\le ' + dec(b,'len') : 'h \\ge ' + A;
}

// ═══ El esquema (DCL) del problema inverso: lo comparten la pantalla y el PDF ═══
// En coordenadas del modelo: la estructura, el nivel hallado y la altura h, cada
// parte de la fuerza del líquido con su nombre, las fuerzas constantes, TODAS
// las incógnitas (la de la condición a trazos si vale cero) y, para la primera
// ecuación de momentos de la cadena, el punto de momentos y el brazo de cada
// fuerza (d₁, d₂…), con su expresión en la leyenda.
function figuraInversoDatos(pr){
  const d = {lineas:[], poligono:null, nudos:[], flechas:[], brazos:[], centros:[], nivel:pr.ref + pr.raiz.h, ref:pr.ref};
  if(pr.presa){
    const g = geomPresa(presa(pr.c.pid));
    d.poligono = g.verts.map(q=>({x:q.x, y:q.y}));
  } else {
    tramos.forEach(t=>d.lineas.push(puntosTramo(t, 40)));
    nodos.forEach(n=>d.nudos.push({x:n.x, y:n.y, nombre:n.nombre, rotula:!!n.rotula}));
  }
  const pasoM = (pr.pasos || []).find(p=>p.que.tipo === 'M');
  _partesUnicasInv(pr).forEach(q=>{
    const sv = PH.val(q.s, pr.hs);
    d.flechas.push({P:{x:q.E0.x + q.t.x*sv, y:q.E0.y + q.t.y*sv}, dir:q.dir, nom:q.nom, tipo:q.tipo === 'rect' ? 'presion' : 'presion2'});
  });
  _constantesUnicasInv(pr).forEach(cf=>{
    const Fm = Math.hypot(cf.Fx, cf.Fy) || 1;
    d.flechas.push({P:cf.P, dir:{x:cf.Fx/Fm, y:cf.Fy/Fm}, nom:cf.nombre, tipo:cf.esPeso ? 'peso' : 'presion'});
  });
  if(pr.r){
    pr.r.inc.forEach((u, jj)=>{
      const esObj = (u === pr.inc);
      const val = esObj ? (pr.X || 1) : pr.r.val[jj];
      const dir = sentidoRealIncognita(u, val);
      const nv = normalCompuertaEnNudo(u.n, 2);
      const paralela = nv && Math.abs(dir.x*nv.x + dir.y*nv.y) < 0.3;
      const nulo = Math.abs(val) < 1e-9*Math.max(1, pr.r.residuo.ref);
      d.flechas.push({P:{x:u.n.x, y:u.n.y}, dir, nom:simbIncognita(u), tipo:u.tipo === 'T' ? 'tope' : 'reac',
                      trazos:(esObj && Math.abs(pr.X) < 1e-12) || (!esObj && nulo), inc:u, objetivo:esObj,
                      lado:paralela ? nv : null});
    });
  }
  if(pr.presa && pr.toe){
    const W = Math.sign(pr.rp.SFx) || 1;
    d.flechas.push({P:pr.toe, dir:{x:0, y:1}, nom:'N', tipo:'reac'});
    d.flechas.push({P:pr.toe, dir:{x:-W, y:0}, nom:'F', tipo:'reac'});
  }
  if(pasoM){
    const C = pasoM.que.C;
    d.centros.push({x:C.x, y:C.y, nombre:C.nombre || 'C'});
    let k = 0;
    const brazo = (P, dir, val) => {
      const s0 = (P.x - C.x)*dir.x + (P.y - C.y)*dir.y;
      const Q = {x:P.x - dir.x*s0, y:P.y - dir.y*s0};
      if(Math.hypot(Q.x - C.x, Q.y - C.y) < 1e-6) return;
      d.brazos.push({C, Q, P, nom:'d_{' + (++k) + '}', val});
    };
    pasoM.partes.forEach(q=>{ const f = d.flechas.find(x=>x.nom === q.nom); if(f) brazo(f.P, f.dir, polyHTex(q.brazo)); });
    pasoM.constantes.forEach(cf=>{ const Fm = Math.hypot(cf.Fx, cf.Fy) || 1; brazo(cf.P, {x:cf.Fx/Fm, y:cf.Fy/Fm}, dec(cf.brazo,'len')); });
    (pasoM.us || []).forEach(u=>{
      const inc = pr.r.inc[u.j];
      brazo({x:inc.n.x, y:inc.n.y}, inc.dir, dec(Math.abs(u.coef),'len'));
    });
  }
  // Cada brazo se dibuja como una COTA apartada de la estructura, del lado
  // contrario a las fuerzas: sobre la propia barra se tapaban unos a otros.
  if(d.brazos.length){
    let gx = 0, gy = 0;
    d.flechas.forEach(a=>{ gx += a.P.x - a.dir.x; gy += a.P.y - a.dir.y; });
    gx /= d.flechas.length; gy /= d.flechas.length;
    const C = d.centros[0];
    d.brazos.sort((a, b)=>Math.hypot(a.Q.x - C.x, a.Q.y - C.y) - Math.hypot(b.Q.x - C.x, b.Q.y - C.y));
    d.brazos.forEach((b, i)=>{
      const L = Math.hypot(b.Q.x - b.C.x, b.Q.y - b.C.y);
      let nx = -(b.Q.y - b.C.y)/L, ny = (b.Q.x - b.C.x)/L;
      const mx = (b.C.x + b.Q.x)/2, my = (b.C.y + b.Q.y)/2;
      if((gx - mx)*nx + (gy - my)*ny > 0){ nx = -nx; ny = -ny; }
      b.n = {x:nx, y:ny}; b.nivel = i;
      b.nom = 'd_{' + (i + 1) + '}';            // del más corto al más largo
    });
  }
  return d;
}
const _COL_INV = {presion:'#c0392b', presion2:'#8e2a1f', peso:'#7a5c1e', tope:'#b45309', reac:'#15803d'};
const _TKCOL_INV = {presion:'bsaPres', presion2:'bsaPres!70!black', peso:'bsaPeso', tope:'bsaTope', reac:'bsaReac'};

// LaTeX corto (F_{1}^{\square}, R_{xB}, d_{1}) a SVG con subíndices.
function _texASvgInv(t){
  const sim = s => s.replace(/\\square/g, '□').replace(/\\triangle/g, '△').replace(/\\perp/g, '⊥').replace(/\\parallel/g, '∥').replace(/[{}]/g, '');
  const m = /^([A-Za-z]+)(?:_\{([^}]*)\})?(?:\^\{([^}]*)\})?('?)$/.exec(t);
  if(!m) return sim(t);
  let s = m[1] + m[4];
  if(m[2]) s += '<tspan font-size="75%" dy="3">' + sim(m[2]) + '</tspan>';
  if(m[3]) s += '<tspan font-size="70%" dy="' + (m[2] ? -8 : -5) + '">' + sim(m[3]) + '</tspan>';
  return s;
}

function esquemaInversoSVG(pr){
  const d = pr && pr.figura;
  if(!d) return '';
  const pts = [];
  d.lineas.forEach(l=>l.forEach(q=>pts.push(q)));
  (d.poligono || []).forEach(q=>pts.push(q));
  pts.push({x:pts[0].x, y:d.nivel}, {x:pts[0].x, y:d.ref});
  const minx = Math.min(...pts.map(q=>q.x)), maxx = Math.max(...pts.map(q=>q.x));
  const miny = Math.min(...pts.map(q=>q.y)), maxy = Math.max(...pts.map(q=>q.y));
  const k = Math.min(230/Math.max(maxx - minx, 1e-6), 190/Math.max(maxy - miny, 1e-6), 70);
  const M = {l:130, r:150 + d.brazos.length*17, t:40, b:50};
  const W = (maxx - minx)*k + M.l + M.r, H = (maxy - miny)*k + M.t + M.b;
  const X = x => M.l + (x - minx)*k, Y = y => M.t + (maxy - y)*k;
  const f = v => v.toFixed(1);
  let s = '<svg class="inv-dcl" viewBox="0 0 ' + f(W) + ' ' + f(H) + '" xmlns="http://www.w3.org/2000/svg" font-family="Georgia,serif">';
  s += '<defs>' + Object.keys(_COL_INV).map(kc=>'<marker id="invf-' + kc + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + _COL_INV[kc] + '"/></marker>').join('')
     + '<marker id="invf-cota" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#0b3f3a"/></marker></defs>';
  // superficie libre y h
  const yN = Y(d.nivel), yR = Y(d.ref), xc = X(minx) - 95;
  s += '<line x1="' + f(xc - 20) + '" y1="' + f(yN) + '" x2="' + f(X(maxx) + 40) + '" y2="' + f(yN) + '" stroke="#2f7fb5" stroke-width="1.6"/>';
  s += '<path d="M' + f(xc) + ',' + f(yN - 2) + ' l-6,-9 l12,0 z" fill="none" stroke="#2f7fb5"/>';
  s += '<line x1="' + f(xc) + '" y1="' + f(yR) + '" x2="' + f(X(minx)) + '" y2="' + f(yR) + '" stroke="#9aa3ad" stroke-dasharray="3 3"/>';
  s += '<line x1="' + f(xc) + '" y1="' + f(yN) + '" x2="' + f(xc) + '" y2="' + f(yR) + '" stroke="#374151" marker-start="url(#invf-reac)" marker-end="url(#invf-reac)" stroke-width="0.8"/>';
  s += '<text x="' + f(xc - 6) + '" y="' + f((yN + yR)/2 + 5) + '" font-size="15" font-style="italic" text-anchor="end" fill="#111">h</text>';
  // estructura
  if(d.poligono) s += '<polygon points="' + d.poligono.map(q=>f(X(q.x)) + ',' + f(Y(q.y))).join(' ') + '" fill="#e7e3dc" stroke="#6b6457" stroke-width="1.6"/>';
  d.lineas.forEach(l=>{ s += '<polyline points="' + l.map(q=>f(X(q.x)) + ',' + f(Y(q.y))).join(' ') + '" fill="none" stroke="#0b3f3a" stroke-width="4"/>'; });
  d.nudos.forEach(n=>{
    s += n.rotula ? '<circle cx="' + f(X(n.x)) + '" cy="' + f(Y(n.y)) + '" r="4.5" fill="#fff" stroke="#c0392b" stroke-width="1.5"/>'
                  : '<circle cx="' + f(X(n.x)) + '" cy="' + f(Y(n.y)) + '" r="3" fill="#0b3f3a"/>';
    s += '<text x="' + f(X(n.x) + 7) + '" y="' + f(Y(n.y) - 6) + '" font-size="12" font-weight="700" font-family="Inter,sans-serif" fill="#0b3f3a">' + escLatex(n.nombre) + '</text>';
  });
  // brazos: la recta de acción prolongada y el brazo desde el centro
  d.brazos.forEach(b=>{
    // la recta de acción prolongada hasta el pie del brazo
    s += '<line x1="' + f(X(b.P.x)) + '" y1="' + f(Y(b.P.y)) + '" x2="' + f(X(b.Q.x)) + '" y2="' + f(Y(b.Q.y)) + '" stroke="#9aa3ad" stroke-dasharray="4 3" stroke-width="0.8"/>';
    // la cota, apartada de la estructura: un nivel por brazo
    const off = 72 + b.nivel*17, ox = b.n.x*off, oy = -b.n.y*off;
    const c1 = {x:X(b.C.x) + ox, y:Y(b.C.y) + oy}, c2 = {x:X(b.Q.x) + ox, y:Y(b.Q.y) + oy};
    s += '<line x1="' + f(X(b.C.x)) + '" y1="' + f(Y(b.C.y)) + '" x2="' + f(c1.x + b.n.x*4) + '" y2="' + f(c1.y - b.n.y*4) + '" stroke="#9aa3ad" stroke-width="0.6" stroke-dasharray="2 2"/>';
    s += '<line x1="' + f(X(b.Q.x)) + '" y1="' + f(Y(b.Q.y)) + '" x2="' + f(c2.x + b.n.x*4) + '" y2="' + f(c2.y - b.n.y*4) + '" stroke="#9aa3ad" stroke-width="0.6" stroke-dasharray="2 2"/>';
    s += '<line x1="' + f(c1.x) + '" y1="' + f(c1.y) + '" x2="' + f(c2.x) + '" y2="' + f(c2.y) + '" stroke="#0b3f3a" stroke-width="0.9" marker-start="url(#invf-cota)" marker-end="url(#invf-cota)"/>';
    s += '<text x="' + f((c1.x + c2.x)/2 + b.n.x*9) + '" y="' + f((c1.y + c2.y)/2 - b.n.y*9 + 4) + '" font-size="12" font-style="italic" text-anchor="middle" fill="#0b3f3a">' + _texASvgInv(b.nom) + '</text>';
  });
  // fuerzas
  d.flechas.forEach(a=>{
    const px = X(a.P.x) + (a.lado ? a.lado.x*10 : 0), py = Y(a.P.y) - (a.lado ? a.lado.y*10 : 0), dx = a.dir.x, dy = -a.dir.y, L = 46;
    const col = _COL_INV[a.tipo] || '#333';
    s += '<line x1="' + f(px - dx*L) + '" y1="' + f(py - dy*L) + '" x2="' + f(px - dx*3) + '" y2="' + f(py - dy*3) + '" stroke="' + col + '" stroke-width="2"'
       + (a.trazos ? ' stroke-dasharray="5 3"' : '') + ' marker-end="url(#invf-' + a.tipo + ')"/>';
    // una incógnita paralela a la barra lleva el nombre al costado, no en la cola
    const tx = a.lado ? px - dx*L/2 + a.lado.x*16 : px - dx*(L + 14), ty = a.lado ? py - dy*L/2 - a.lado.y*16 : py - dy*(L + 14);
    s += '<text x="' + f(tx) + '" y="' + f(ty + 5) + '" font-size="14" font-style="italic" text-anchor="middle" fill="' + col + '">' + _texASvgInv(a.nom) + '</text>';
  });
  d.centros.forEach(c=>{
    s += '<circle cx="' + f(X(c.x)) + '" cy="' + f(Y(c.y)) + '" r="5" fill="#fff" stroke="#0b3f3a" stroke-width="1.6"/>';
  });
  s += '</svg>';
  return s;
}

// ═══ Pantalla ═══
function procesoInversoHtml(pr){
  if(!pr) return '';
  const uF = escLatex(unitFor), uL = escLatex(unitLen);
  let h = '<div class="proc-block inv-proc">';
  h += '<div class="proc-sub">Procedimiento con h como incógnita</div>';
  h += '<div class="hint-sm" style="margin:0 0 6px">Las expresiones valen para ' + kx(_validezTexInv(pr) + '\\ \\text{' + uL + '}') + '.</div>';
  // el esquema, con los brazos de la ecuación de momentos
  if(pr.figura){
    h += '<div class="inv-paso">Esquema (dibujado con h = ' + dec(pr.raiz.h,'len') + ' ' + uL + ')</div>' + esquemaInversoSVG(pr);
    if(pr.figura.brazos.length)
      h += '<div class="hint-sm">Brazos respecto de ' + escLatex(pr.figura.centros[0].nombre) + ': '
        + pr.figura.brazos.map(b=>kx(b.nom + ' = ' + b.val)).join(' · ') + ' (' + uL + ')</div>';
  }
  if(pr.nodosP && pr.nodosP.length){
    h += '<div class="inv-paso">① Presiones</div><div class="eq-row"><div class="eq-body">'
      + kx(pr.nodosP.map(nq=>'p_{' + (nq.nombre ? escLatex(nq.nombre) : '') + '} = ' + polyHTex(nq.p)).join('\\qquad ')) + '</div></div>';
  }
  if(pr.modo === 'ecuacion'){
    h += '<div class="inv-paso">② Fuerzas</div><table class="tabla inv-tabla"><thead><tr><th>Fuerza</th><th>Expresión en h (' + uF + ')</th></tr></thead><tbody>';
    _partesUnicasInv(pr).forEach(q=>{ h += '<tr><td>' + kx(q.nom) + '</td><td>' + kx(_formulaParteInv(q) + ' = ' + polyHTex(q.F)) + '</td></tr>'; });
    _constantesUnicasInv(pr).forEach(cf=>{ h += '<tr><td>' + kx(cf.nombre) + '</td><td>' + kx(dec(cf.F,'f') + '\\ \\text{(constante)}') + '</td></tr>'; });
    h += '</tbody></table>';
    h += '<div class="inv-paso">③ Ecuaciones de equilibrio · condición: ' + kx(_condicionTexInv(pr)) + '</div>';
    pr.pasos.forEach(p=>{
      h += '<div class="eq-row"><div class="eq-body">' + kx('\\begin{aligned}' + _lineasPasoInv(p, pr).join(' \\\\ ') + '\\end{aligned}') + '</div></div>';
    });
  } else if(pr.modo === 'ajuste'){
    h += '<div class="inv-paso">② ' + kx(pr.simb) + ' en función de h (sistema de ecuaciones)</div>';
    h += '<div class="eq-row"><div class="eq-body">' + kx(pr.simb + '(h) = ' + polyHTex(pr.Xpoly) + ' = ' + (pr.c.tipo === 'tope' ? '0' : _numInv(pr.X))) + '</div></div>';
  } else {
    h += '<div class="inv-paso">② Tanteo (la placa curva no da un polinomio)</div><table class="tabla inv-tabla"><thead><tr><th>h (' + uL + ')</th><th>Valor</th></tr></thead><tbody>'
      + pr.tabla.map(t=>'<tr><td>' + dec(t.H,'len') + '</td><td>' + dec(t.q,'f') + '</td></tr>').join('') + '</tbody></table>';
  }
  h += '<div class="eq-row"><div class="eq-body">' + kx('\\Rightarrow\\ \\boxed{h = ' + dec(pr.raiz.h,'len') + '\\ \\text{' + uL + '}}') + ' <span class="hint-sm">(' + _metodoTexInv(pr) + ')</span></div></div>';
  const e = pr.comprobacion;
  if(e){
    let t;
    if(pr.c.tipo === 'vuelco') t = 'd = ' + dec(e.q,'len') + '\\ \\text{' + uL + '} = ' + (e.derecha ? 'B' : '0');
    else if(pr.c.tipo === 'levanta') t = 'N = ' + dec(e.q,'f') + '\\ \\text{' + uF + '}';
    else t = pr.simb + ' = ' + dec(pr.c.tipo === 'reac' && pr.c.tinc !== 'T' ? e.q : e.v,'f') + '\\ \\text{' + uF + '}';
    h += '<div class="inv-paso">④ Comprobación con h = ' + dec(pr.raiz.h,'len') + ' ' + uL + '</div><div class="eq-row"><div class="eq-body">' + kx(t + '\\ \\checkmark') + '</div></div>';
  }
  h += '</div>';
  return h;
}

// El título de una condición (con R<sub>xB</sub>) a LaTeX ($R_{xB}$).
function _htmlATexInv(s){
  return String(s).split(/([A-Za-z]<sub>[^<]*<\/sub>)/).map(p=>{
    const m = /^([A-Za-z])<sub>([^<]*)<\/sub>$/.exec(p);
    return m ? '$' + m[1] + '_{' + escLatex(m[2]) + '}$' : escLatex(p.replace(/<[^>]+>/g, ''));
  }).join('');
}

// ═══ PDF ═══
// Sección «Problema inverso», tras el planteamiento: el esquema con los brazos,
// las fuerzas en h, la cadena de ecuaciones, el despeje, la gráfica y la
// comprobación. El resto del informe es la resolución normal con ese nivel.
function latexInverso(ctx){
  const a = inversoActivo;
  if(!a || a.huella !== _huellaInverso()) return '';
  const pr = a.proceso;
  const res = a.res, s = res.sol[a.i], c = res.c;
  const uF = escLatex(unitFor), uL = escLatex(unitLen), UL = '\\,\\text{' + uL + '}';
  let t = '\\seccion{Problema inverso: el nivel $h$ del l\\\'iquido}\n';
  t += '\\noindent\\textbf{Inc\\\'ognita.} La altura $h$ del l\\\'iquido de la zona ' + res.z + ' ' + escLatex(res.rg.refNom)
    + '. \\textbf{Condici\\\'on:} ' + _htmlATexInv(c.tit) + ' ($' + (pr ? _condicionTexInv(pr) : '') + '$).\\\\[3pt]\n';
  if(!pr){
    t += '\\noindent Nivel hallado: $h = ' + dec(s.h - res.rg.ref,'len') + '$' + UL + '.\n';
    return t;
  }
  t += '\\noindent Las expresiones valen para $' + _validezTexInv(pr) + '$' + UL + '.\\\\[2pt]\n';
  if(pr.figura)
    t += ctx.lamina(tkpDCLInverso(pr), 'DCL con las fuerzas en funci\\\'on de $h$' + (pr.figura.brazos.length ? ' y sus brazos respecto de ' + escLatex(pr.figura.centros[0].nombre) : '') + '.');
  if(pr.nodosP && pr.nodosP.length)
    t += '\\subpaso{Presiones en funci\\\'on de $h$}\n$$' + pr.nodosP.map(nq=>'p_{' + (nq.nombre ? escLatex(nq.nombre) : '') + '} = ' + polyHTex(nq.p)).join('\\qquad ') + '$$\n';
  if(pr.modo === 'ecuacion'){
    t += '\\subpaso{Fuerzas en funci\\\'on de $h$}\n';
    t += ctx.tablaCaption('Partes de cada fuerza (rect\\\'angulo $\\square$ y tri\\\'angulo $\\triangle$ de presiones), en ' + uF + '.');
    t += '\\begin{tablacentrada}\\begin{tabular}{ll}\n\\hline\nFuerza & Expresi\\\'on \\\\\n\\hline\n';
    _partesUnicasInv(pr).forEach(q=>{ t += '$' + q.nom + '$ & $' + _formulaParteInv(q) + ' = ' + polyHTex(q.F) + '$ \\\\\n'; });
    _constantesUnicasInv(pr).forEach(cf=>{ t += '$' + cf.nombre + '$ & $' + dec(cf.F,'f') + '$ (constante) \\\\\n'; });
    t += '\\hline\n\\end{tabular}\\end{tablacentrada}\n';
    t += '\\subpaso{Ecuaciones de equilibrio y despeje}\n';
    if(pr.pasos.length > 1)
      t += '\\noindent $' + pr.simb + '$ no sale sola: primero se halla ' + pr.pasos.filter(p=>!p.final).map(p=>'$' + p.simb + '$').join(', ') + ' en funci\\\'on de $h$ y se sustituye.\n';
    pr.pasos.forEach(p=>{ t += '\\begin{align*}\n' + _lineasPasoInv(p, pr).join(' \\\\\n') + '\n\\end{align*}\n'; });
  } else if(pr.modo === 'ajuste'){
    t += '\\subpaso{La inc\\\'ognita en funci\\\'on de $h$}\n';
    t += '\\noindent $' + pr.simb + '$ sale de un sistema de ecuaciones; en este intervalo resulta\n'
      + '$$' + pr.simb + '(h) = ' + polyHTex(pr.Xpoly) + ' = ' + (c.tipo === 'tope' ? '0' : _numInv(pr.X)) + '$$\n';
  } else {
    t += '\\subpaso{Tanteo}\n\\noindent La placa curva hace que la condici\\\'on no sea un polinomio en $h$: se busca el cambio de signo.\n';
    t += '\\begin{tablacentrada}\\begin{tabular}{rr}\n\\hline\n$h$ (' + uL + ') & Valor \\\\\n\\hline\n'
      + pr.tabla.map(r=>dec(r.H,'len') + ' & ' + dec(r.q,'f') + ' \\\\\n').join('') + '\\hline\n\\end{tabular}\\end{tablacentrada}\n';
  }
  t += '$$\\Rightarrow\\quad \\boxed{h = ' + dec(pr.raiz.h,'len') + UL + '}\\qquad\\text{(' + _metodoTexInv(pr) + ')}$$\n';
  t += '\\noindent Superficie libre en la cota $y = ' + dec(s.h,'len') + '$' + UL + '. ' + escLatex(a.lectura.etq) + ': '
    + a.lectura.txt.replace(/<b>|<\/b>/g, '').replace(/<sub>(.*?)<\/sub>/g, '$_{$1}$') + '\n';
  if(res.sol.length > 1){
    t += ctx.tablaCaption('Todas las soluciones de la condici\\\'on.');
    t += '\\begin{tablacentrada}\\begin{tabular}{cll}\n\\hline\n$h$ (' + uL + ') & Lectura & \\\\\n\\hline\n'
      + res.sol.map((o, k)=>dec(o.h - res.rg.ref,'len') + ' & ' + escLatex(lecturaRaizInv(res, o).etq) + ' & ' + (k === a.i ? '\\textbf{elegida}' : '') + ' \\\\\n').join('')
      + '\\hline\n\\end{tabular}\\end{tablacentrada}\n';
  }
  t += ctx.lamina(curvaInversoTikZ(res, a.i), 'La condici\\\'on en funci\\\'on de $h$: se cumple en el trazo verde.');
  t += '\\noindent\\textbf{Comprobaci\\\'on.} El resto del informe resuelve el problema con $h = ' + dec(pr.raiz.h,'len') + '$' + UL + '; ';
  const e = pr.comprobacion;
  if(e){
    if(c.tipo === 'vuelco') t += 'la posici\\\'on de $N$ sale $d = ' + dec(e.q,'len') + '$' + UL + ', en la arista.\n';
    else if(c.tipo === 'levanta') t += 'la normal sale $N = ' + dec(e.q,'f') + '$\\,' + uF + '.\n';
    else t += 'all\\\'i sale $' + pr.simb + ' = ' + dec(c.tipo === 'reac' && c.tinc !== 'T' ? e.q : e.v,'f') + '$\\,' + uF + '.\n';
  }
  return t;
}

// La gráfica de la condición, en TikZ (la misma de la pantalla).
function curvaInversoTikZ(res, elegida){
  const pts = res.curva;
  if(pts.length < 2) return '';
  const c = res.c, ref = res.rg.ref;
  const W = 10, H = 4.2;
  const lims = [];
  if(c.tipo === 'tope' || c.tipo === 'levanta') lims.push(0);
  if(c.tipo === 'reac') lims.push(c.valor);
  if(c.tipo === 'vuelco'){ const g = geomPresa(presa(c.pid)); lims.push(0, g.base.x1 - g.base.x0); }
  let qmin = Math.min(...pts.map(p=>p.q), ...lims), qmax = Math.max(...pts.map(p=>p.q), ...lims);
  if(qmax - qmin < 1e-9){ qmax += 1; qmin -= 1; }
  const pad = 0.08*(qmax - qmin); qmin -= pad; qmax += pad;
  const h0 = pts[0].h - ref, h1 = pts[pts.length-1].h - ref;
  const X = h => ((h - ref) - h0)/(h1 - h0)*W, Y = q => (q - qmin)/(qmax - qmin)*H;
  const F = n => n.toFixed(3);
  let t = '\\draw[black!30] (0,0) rectangle (' + W + ',' + H + ');\n';
  lims.forEach(l=>{ t += '\\draw[black!55, dashed] (0,' + F(Y(l)) + ') -- (' + W + ',' + F(Y(l)) + ');\n'; });
  for(let i=0;i<pts.length-1;i++){
    const a = pts[i], b = pts[i+1], ok = (a.m + b.m)/2 >= 0;
    t += '\\draw[' + (ok ? 'bsaVerde' : 'bsaPres') + ', line width=1.3pt] (' + F(X(a.h)) + ',' + F(Y(a.q)) + ') -- (' + F(X(b.h)) + ',' + F(Y(b.q)) + ');\n';
  }
  res.sol.forEach((so, i)=>{
    if(!so.e) return;
    const x = X(so.h), y = Y(so.e.q);
    t += '\\draw[black!50, dotted] (' + F(x) + ',' + F(y) + ') -- (' + F(x) + ',0);\n';
    t += '\\filldraw[' + (i === elegida ? 'fill=bsaAcc2' : 'fill=white') + ', draw=bsaAcc2] (' + F(x) + ',' + F(y) + ') circle (0.08);\n';
    t += '\\node[font=\\scriptsize, color=bsaAcc2, fill=white, inner sep=1pt, anchor=' + (x > W - 1.6 ? 'south east' : 'south west') + '] at (' + F(x) + ',0.05) {$h' + (res.sol.length > 1 ? '_{' + (i+1) + '}' : '') + ' = ' + dec(so.h - ref,'len') + '$};\n';
  });
  const marcas = (a, b, n) => { const paso = Math.pow(10, Math.floor(Math.log10((b - a)/n))); const k = [1,2,5,10].find(f=>(b - a)/(paso*f) <= n) || 10; const st = paso*k; const out = []; for(let v = Math.ceil(a/st)*st; v <= b + 1e-9*st; v += st) out.push(+v.toFixed(6)); return out; };
  marcas(h0, h1, 6).forEach(v=>{ t += '\\node[font=\\tiny, color=black!60, below] at (' + F((v - h0)/(h1 - h0)*W) + ',0) {' + v + '};\n'; });
  marcas(qmin, qmax, 5).forEach(v=>{ t += '\\node[font=\\tiny, color=black!60, left] at (0,' + F(Y(v)) + ') {' + v + '};\n'; });
  t += '\\node[font=\\scriptsize, below] at (' + F(W/2) + ',-0.35) {$h$ (' + escLatex(unitLen) + ')};\n';
  return t;
}

// ── El mismo esquema en TikZ, para el PDF ──
function tkpDCLInverso(pr){
  const d = pr.figura;
  if(!d) return '';
  tkpReiniciar();
  const F = v => v.toFixed(3);
  const pts = [];
  d.lineas.forEach(l=>l.forEach(q=>pts.push(q)));
  (d.poligono || []).forEach(q=>pts.push(q));
  pts.push({x:pts[0].x, y:d.nivel}, {x:pts[0].x, y:d.ref});
  const minx = Math.min(...pts.map(q=>q.x)), maxx = Math.max(...pts.map(q=>q.x));
  const miny = Math.min(...pts.map(q=>q.y)), maxy = Math.max(...pts.map(q=>q.y));
  const k = Math.min(8.0/Math.max(maxx - minx, 1e-6), 6/Math.max(maxy - miny, 1e-6), 2.2);
  const X = x => (x - minx)*k, Y = y => (y - miny)*k;
  let o = '';
  // superficie libre y la altura h acotada a la izquierda
  const xs0 = X(minx) - 2.9, xs1 = X(maxx) + 0.6, xc = X(minx) - 2.45;
  o += '\\draw[bsaAgua, line width=.9pt] (' + F(xs0) + ',' + F(Y(d.nivel)) + ') -- (' + F(xs1) + ',' + F(Y(d.nivel)) + ');\n';
  o += '\\draw[bsaAgua] (' + F(xs0 + 0.25) + ',' + F(Y(d.nivel) + 0.04) + ') -- ++(-0.12,0.16) -- ++(0.24,0) -- cycle;\n';
  o += '\\draw[black!45, dashed, line width=.35pt] (' + F(xc - 0.12) + ',' + F(Y(d.ref)) + ') -- (' + F(X(minx)) + ',' + F(Y(d.ref)) + ');\n';
  o += '\\draw[black!70, line width=.5pt, {Latex[length=1.3mm]}-{Latex[length=1.3mm]}] (' + F(xc) + ',' + F(Y(d.ref)) + ') -- (' + F(xc) + ',' + F(Y(d.nivel)) + ');\n';
  o += '\\node[fill=white, inner sep=1pt, font=\\small] at (' + F(xc) + ',' + F((Y(d.ref) + Y(d.nivel))/2) + ') {$h$};\n';
  tkpOcupar(xc - 0.25, Y(d.ref), xc + 0.25, Y(d.nivel));
  if(d.poligono){
    o += '\\filldraw[fill=bsaPresa!25, draw=bsaPresa, line width=1pt] ' + d.poligono.map(q=>'(' + F(X(q.x)) + ',' + F(Y(q.y)) + ')').join(' -- ') + ' -- cycle;\n';
    d.poligono.forEach((q, i)=>{ const r = d.poligono[(i+1)%d.poligono.length]; tkpOcuparTrazo(X(q.x), Y(q.y), X(r.x), Y(r.y), 0.06); });
  }
  d.lineas.forEach(l=>{
    o += '\\draw[bsaAcc2, line width=1.8pt] ' + l.map(q=>'(' + F(X(q.x)) + ',' + F(Y(q.y)) + ')').join(' -- ') + ';\n';
    for(let i=1;i<l.length;i++) tkpOcuparTrazo(X(l[i-1].x), Y(l[i-1].y), X(l[i].x), Y(l[i].y), 0.06);
  });
  d.nudos.forEach(n=>{
    o += n.rotula ? '\\filldraw[fill=white, draw=bsaPres, line width=.9pt] (' + F(X(n.x)) + ',' + F(Y(n.y)) + ') circle (0.09);\n'
                  : '\\filldraw[color=bsaAcc2] (' + F(X(n.x)) + ',' + F(Y(n.y)) + ') circle (0.05);\n';
  });
  // brazos: recta de acción prolongada a trazos y el brazo desde el centro
  d.brazos.forEach(b=>{
    o += '\\draw[black!40, dashed, line width=.4pt] (' + F(X(b.P.x)) + ',' + F(Y(b.P.y)) + ') -- (' + F(X(b.Q.x)) + ',' + F(Y(b.Q.y)) + ');\n';
    const off = 1.75 + b.nivel*0.42, ox = b.n.x*off, oy = b.n.y*off;
    const c1 = {x:X(b.C.x) + ox, y:Y(b.C.y) + oy}, c2 = {x:X(b.Q.x) + ox, y:Y(b.Q.y) + oy};
    o += '\\draw[black!40, dashed, line width=.3pt] (' + F(X(b.C.x)) + ',' + F(Y(b.C.y)) + ') -- (' + F(c1.x + b.n.x*0.1) + ',' + F(c1.y + b.n.y*0.1) + ');\n';
    o += '\\draw[black!40, dashed, line width=.3pt] (' + F(X(b.Q.x)) + ',' + F(Y(b.Q.y)) + ') -- (' + F(c2.x + b.n.x*0.1) + ',' + F(c2.y + b.n.y*0.1) + ');\n';
    o += '\\draw[bsaAcc2, line width=.5pt, {Latex[length=1.2mm]}-{Latex[length=1.2mm]}] (' + F(c1.x) + ',' + F(c1.y) + ') -- (' + F(c2.x) + ',' + F(c2.y) + ');\n';
    tkpOcuparTrazo(c1.x, c1.y, c2.x, c2.y, 0.05);
    b.mid = {x:(c1.x + c2.x)/2, y:(c1.y + c2.y)/2};
  });
  // fuerzas
  d.flechas.forEach(a=>{
    const px = X(a.P.x) + (a.lado ? a.lado.x*0.26 : 0), py = Y(a.P.y) + (a.lado ? a.lado.y*0.26 : 0), L = 1.15, x1 = px - a.dir.x*L, y1 = py - a.dir.y*L;
    const col = _TKCOL_INV[a.tipo] || 'black';
    o += '\\draw[-{Latex[length=2mm]}, ' + col + ', line width=1.1pt' + (a.trazos ? ', dashed' : '') + '] (' + F(x1) + ',' + F(y1) + ') -- (' + F(px - a.dir.x*0.06) + ',' + F(py - a.dir.y*0.06) + ');\n';
    tkpOcuparTrazo(x1, y1, px, py, 0.08);
    o += tkpTexto(x1 - a.dir.x*0.3, y1 - a.dir.y*0.3, '$' + a.nom + '$', 'font=\\scriptsize, color=' + col, -a.dir.x, -a.dir.y);
  });
  // nombres de los nudos, rótulos de los brazos y el centro, al final (buscan hueco)
  d.nudos.forEach(n=>{ o += tkpTexto(X(n.x) + 0.24, Y(n.y) + 0.2, '\\textbf{' + escLatex(n.nombre) + '}', 'font=\\scriptsize, color=bsaAcc2', 1, 1); });
  d.brazos.forEach(b=>{
    o += tkpTexto(b.mid.x + b.n.x*0.2, b.mid.y + b.n.y*0.2, '$' + b.nom + '$', 'font=\\tiny, color=bsaAcc2', b.n.x, b.n.y);
  });
  d.centros.forEach(c=>{
    o += '\\filldraw[fill=white, draw=bsaAcc2, line width=.9pt] (' + F(X(c.x)) + ',' + F(Y(c.y)) + ') circle (0.10);\n';
    if(pr.presa) o += tkpTexto(X(c.x) + 0.25, Y(c.y) - 0.3, '\\textbf{' + escLatex(c.nombre) + '}', 'font=\\scriptsize, color=bsaAcc2', 1, -1);
  });
  if(d.brazos.length)
    o += bsaLeyendaBrazosTikz(d.brazos.map(b=>({nom:b.nom, val:b.val + '\\,\\text{' + escLatex(unitLen) + '}'})));
  return o;
}

// Para la figura 1 del PDF (07-): la zona cuyo nivel es la incógnita y el punto
// desde el que se mide h, si hay un problema inverso vigente.
function incognitaFiguraInv(){
  const a = inversoActivo;
  if(!a || a.huella !== _huellaInverso()) return null;
  return {z:a.res.z, ref:a.res.rg.ref};
}
