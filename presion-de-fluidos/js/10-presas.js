// ═══════════════════════════════════════════════════════════
//  PRESAS (2026-10-03, petición del profesor)
//  Un cuerpo de peso específico γ apoyado en su base horizontal, con el
//  líquido de las zonas empujando sus caras. Convive con las compuertas en el
//  mismo lienzo y se resuelve aparte, como otro cuerpo libre: su peso (por
//  partes), el empuje del líquido en cada cara mojada y, en la base, la normal
//  N, la fuerza horizontal F y la posición d de N medida desde el extremo
//  izquierdo O de la base (ΣFx, ΣFy, ΣM_O). Tres formas de dibujarla:
//    · plantilla: corona c, altura H y las proyecciones de los dos taludes;
//    · por figuras: rectángulos y triángulos rectángulos, cada uno en su sitio
//      (x, y desde O), montados en la ventana; el contorno es su unión;
//    · polígono: sus vértices, tocados en el lienzo o escritos.
//  Qué cara moja cada zona: si hay compuerta, la que dice su frontera (la del
//  dibujo del líquido); si no, la cresta (el punto más alto) separa la presa en
//  dos: lo que queda a su izquierda mira a la zona 1 y lo de su derecha a la
//  zona 2. La base no se moja (no hay subpresión).
// ═══════════════════════════════════════════════════════════
let presas = [];        // {id, modo, gamma, x0, y0, H, c, m1, m2, partes:[{tipo,b,h,x,y}], verts:[{x,y}]}
let presaSeq = 0;
let selP = [];          // ids de presas seleccionadas
let RP = null;          // resultados: analizarPresas()
let presaPend = null;   // polígono en curso: {gamma, pts:[{x,y}]}
let presaVentana = null;
const COL_PRESA = '#6b6457';
const NOMBRE_PARTE = {rect:'rectángulo', triSube:'triángulo ◢', triBaja:'triángulo ◣', poli:'polígono'};

function presa(id){ return presas.find(p=>p.id === id); }
function nombrePresa(p){ return 'Presa ' + (presas.indexOf(p) + 1); }

// ── Geometría ──
function _areaPoliP(v){ let a = 0; for(let i=0;i<v.length;i++){ const p = v[i], q = v[(i+1)%v.length]; a += p.x*q.y - q.x*p.y; } return a/2; }
function _centroPoliP(v){
  const A = _areaPoliP(v); let cx = 0, cy = 0;
  for(let i=0;i<v.length;i++){ const p = v[i], q = v[(i+1)%v.length], k = p.x*q.y - q.x*p.y; cx += (p.x+q.x)*k; cy += (p.y+q.y)*k; }
  return {x:cx/(6*A), y:cy/(6*A)};
}
// Quita vértices repetidos y los que quedan en medio de una recta.
function _limpiarPoliP(v){
  const tam = Math.max(1e-9, ...v.map(p=>Math.abs(p.x)), ...v.map(p=>Math.abs(p.y)));
  const eps = 1e-9*tam;
  let out = v.filter((p,i)=>{ const q = v[(i+1)%v.length]; return Math.hypot(p.x-q.x, p.y-q.y) > eps; });
  let cambio = true;
  while(cambio && out.length > 3){
    cambio = false;
    for(let i=0;i<out.length;i++){
      const a = out[(i-1+out.length)%out.length], b = out[i], c = out[(i+1)%out.length];
      if(Math.abs((b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x)) < eps*tam){ out.splice(i,1); cambio = true; break; }
    }
  }
  return out;
}
// Partes de una presa de plantilla o por figuras, cada una con su posición
// (x, y: la esquina inferior izquierda de su caja, medida desde O). Una figura
// sin posición (archivos anteriores al 2026-10-03) se coloca en fila sobre la
// base, a continuación de la anterior, que es como se montaban antes.
function partesPresa(p){
  if(p.modo === 'plantilla'){
    const out = []; let x = 0;
    if(p.m1 > 0){ out.push({tipo:'triSube', b:p.m1, h:p.H, x, y:0}); x += p.m1; }
    if(p.c  > 0){ out.push({tipo:'rect',    b:p.c,  h:p.H, x, y:0}); x += p.c; }
    if(p.m2 > 0){ out.push({tipo:'triBaja', b:p.m2, h:p.H, x, y:0}); }
    return out;
  }
  let x = 0;
  return (p.partes || []).filter(q=>q.b > 0 && q.h > 0).map(q=>{
    const r = {tipo:q.tipo, b:q.b, h:q.h, x:isFinite(q.x) ? q.x : x, y:isFinite(q.y) ? q.y : 0};
    x = r.x + q.b;
    return r;
  });
}
// Fija la posición de las figuras que no la traen (la fila de antes).
function posicionarPartes(partes){
  let x = 0;
  partes.forEach(q=>{ if(!isFinite(q.x)) q.x = x; if(!isFinite(q.y)) q.y = 0; x = q.x + (q.b > 0 ? q.b : 0); });
  return partes;
}
// Polígono antihorario, área y centroide de una figura colocada en (xa, ya).
function poliParte(tipo, xa, ya, b, h){
  const xb = xa + b, yt = ya + h;
  if(tipo === 'rect')    return {poly:[{x:xa,y:ya},{x:xb,y:ya},{x:xb,y:yt},{x:xa,y:yt}], A:b*h,   cx:xa + b/2,   cy:ya + h/2};
  if(tipo === 'triSube') return {poly:[{x:xa,y:ya},{x:xb,y:ya},{x:xb,y:yt}],            A:b*h/2, cx:xa + 2*b/3, cy:ya + h/3};
  return                        {poly:[{x:xa,y:ya},{x:xb,y:ya},{x:xa,y:yt}],            A:b*h/2, cx:xa + b/3,   cy:ya + h/3};
}
// Área común de dos polígonos convexos antihorarios (recorte de Sutherland–Hodgman).
function _areaComunP(P, Q){
  let out = P.slice();
  for(let i=0;i<Q.length && out.length;i++){
    const a = Q[i], b = Q[(i+1)%Q.length];
    const lado = p => (b.x-a.x)*(p.y-a.y) - (b.y-a.y)*(p.x-a.x);
    const ent = out; out = [];
    for(let j=0;j<ent.length;j++){
      const c = ent[j], d = ent[(j+1)%ent.length], sc = lado(c), sd = lado(d);
      if(sc >= 0) out.push(c);
      if((sc >= 0) !== (sd >= 0)){ const t = sc/(sc - sd); out.push({x:c.x + (d.x-c.x)*t, y:c.y + (d.y-c.y)*t}); }
    }
  }
  return out.length >= 3 ? Math.max(0, _areaPoliP(out)) : 0;
}
// Contorno de la unión de figuras que se tocan sin solaparse: cada lado se
// parte en los vértices de las demás que caen sobre él y se quitan los trozos
// que aparecen dos veces en sentidos opuestos (los bordes compartidos). Lo que
// queda se encadena en un solo contorno.
function _unionPartesP(polys){
  const todos = [].concat(...polys);
  const tam = Math.max(1, ...todos.map(q=>Math.abs(q.x)), ...todos.map(q=>Math.abs(q.y)));
  const tol = 1e-7*tam;
  const clave = q => Math.round(q.x/tol) + ',' + Math.round(q.y/tol);
  const segs = [];
  polys.forEach(P=>{
    for(let i=0;i<P.length;i++){
      const a = P[i], b = P[(i+1)%P.length];
      const dx = b.x-a.x, dy = b.y-a.y, L2 = dx*dx + dy*dy;
      if(L2 < tol*tol) continue;
      const cortes = [];
      todos.forEach(q=>{
        const t = ((q.x-a.x)*dx + (q.y-a.y)*dy)/L2;
        if(t <= 1e-9 || t >= 1 - 1e-9) return;
        if(Math.abs((q.x-a.x)*dy - (q.y-a.y)*dx)/Math.sqrt(L2) < tol) cortes.push({t, q});
      });
      cortes.sort((u,v)=>u.t - v.t);
      let prev = a;
      cortes.forEach(c=>{ if(clave(c.q) !== clave(prev)){ segs.push([prev, c.q]); prev = c.q; } });
      if(clave(b) !== clave(prev)) segs.push([prev, b]);
    }
  });
  const cuenta = {};
  segs.forEach(s=>{ const k = clave(s[0]) + '>' + clave(s[1]); cuenta[k] = (cuenta[k] || 0) + 1; });
  const quedan = segs.filter(s=>!cuenta[clave(s[1]) + '>' + clave(s[0])]);
  if(quedan.length < 3) return null;
  const desde = {};
  quedan.forEach((s,i)=>{ (desde[clave(s[0])] = desde[clave(s[0])] || []).push(i); });
  // empieza por el punto más bajo y, a igualdad, el de más a la izquierda
  let i0 = 0;
  quedan.forEach((s,i)=>{ const a = s[0], b = quedan[i0][0]; if(a.y < b.y - tol || (Math.abs(a.y-b.y) <= tol && a.x < b.x)) i0 = i; });
  const usado = new Set(), v = [];
  let i = i0;
  while(i !== undefined && !usado.has(i)){
    usado.add(i); v.push(quedan[i][0]);
    const sig = (desde[clave(quedan[i][1])] || []).filter(j=>!usado.has(j));
    i = sig.length ? sig[0] : undefined;
  }
  if(usado.size !== quedan.length) return null;     // más de un contorno: figuras sueltas o un hueco
  return v;
}
// Base de un contorno: su lado horizontal más largo a la cota más baja.
function _baseContornoP(v){
  const yb = Math.min(...v.map(q=>q.y));
  const tol = 1e-9*Math.max(1, ...v.map(q=>Math.abs(q.y)), ...v.map(q=>Math.abs(q.x)));
  let base = null;
  for(let i=0;i<v.length;i++){
    const a = v[i], b = v[(i+1)%v.length];
    if(Math.abs(a.y-yb) < tol && Math.abs(b.y-yb) < tol && (!base || Math.abs(b.x-a.x) > base.x1-base.x0))
      base = {x0:Math.min(a.x,b.x), x1:Math.max(a.x,b.x), y:yb, i};
  }
  return base;
}
function geomPresa(p){
  if(p.modo === 'poligono'){
    let v = _limpiarPoliP((p.verts || []).map(q=>({x:q.x, y:q.y})));
    if(v.length < 3) return {error:'Un polígono necesita al menos tres vértices.'};
    if(_areaPoliP(v) < 0) v.reverse();
    const A = _areaPoliP(v);
    if(!(A > 1e-12)) return {error:'El polígono no encierra área.'};
    const base = _baseContornoP(v);
    if(!base) return {error:'La presa necesita una base horizontal: el lado más bajo del polígono.'};
    const c = _centroPoliP(v);
    return {verts:v, base, partes:[{tipo:'poli', A, cx:c.x, cy:c.y, poly:v}]};
  }
  const ps = partesPresa(p);
  if(!ps.length) return {error:'La presa no tiene ninguna figura con medidas.'};
  const partes = ps.map(q=>Object.assign({tipo:q.tipo, b:q.b, h:q.h, x:q.x, y:q.y}, poliParte(q.tipo, p.x0 + q.x, p.y0 + q.y, q.b, q.h)));
  for(let i=0;i<partes.length;i++) for(let j=i+1;j<partes.length;j++){
    if(_areaComunP(partes[i].poly, partes[j].poly) > 1e-6*Math.min(partes[i].A, partes[j].A))
      return {error:'Las figuras ' + (i+1) + ' y ' + (j+1) + ' se solapan: sepáralas o cambia sus medidas.', solape:[i, j]};
  }
  let v = partes.length === 1 ? partes[0].poly.slice() : _unionPartesP(partes.map(q=>q.poly));
  if(!v) return {error:'Las figuras tienen que tocarse por sus lados y formar una sola pieza, sin huecos.'};
  v = _limpiarPoliP(v);
  if(_areaPoliP(v) < 0) v.reverse();
  const base = _baseContornoP(v);
  if(!base) return {error:'La presa necesita una base horizontal: el lado más bajo de sus figuras.'};
  return {verts:v, base, partes};
}
// x de la cresta: el punto más alto (el centro, si la coronación es plana).
function crestaPresa(g){
  const yM = Math.max(...g.verts.map(q=>q.y));
  const tol = 1e-9*Math.max(1, Math.abs(yM));
  const xs = g.verts.filter(q=>q.y > yM - tol).map(q=>q.x);
  return {x:(Math.min(...xs) + Math.max(...xs))/2, y:yM};
}
function puntoEnPresa(g, x, y){
  let dentro = false; const v = g.verts;
  for(let i=0, j=v.length-1; i<v.length; j=i++){
    if(((v[i].y > y) !== (v[j].y > y)) && (x < (v[j].x-v[i].x)*(y-v[i].y)/(v[j].y-v[i].y) + v[i].x)) dentro = !dentro;
  }
  return dentro;
}
function presaEn(mx, my){
  const [wx, wy] = aMundo(mx, my);
  for(let i=presas.length-1;i>=0;i--){ const g = geomPresa(presas[i]); if(!g.error && puntoEnPresa(g, wx, wy)) return presas[i]; }
  return null;
}
// Mover una presa: su esquina o sus vértices.
function trasladarPresa(p, dx, dy){
  if(p.modo === 'poligono') p.verts.forEach(q=>{ q.x += dx; q.y += dy; });
  else { p.x0 += dx; p.y0 += dy; }
}
function escalarPresa(p, kL){
  if(p.modo === 'poligono') p.verts.forEach(q=>{ q.x *= kL; q.y *= kL; });
  else {
    p.x0 *= kL; p.y0 *= kL;
    ['H','c','m1','m2'].forEach(k=>{ if(isFinite(p[k])) p[k] *= kL; });
    (p.partes || []).forEach(q=>{ q.b *= kL; q.h *= kL; if(isFinite(q.x)) q.x *= kL; if(isFinite(q.y)) q.y *= kL; });
  }
}
function copiaPresa(p){ return JSON.parse(JSON.stringify(p)); }

// ── Cálculo ──
// Zona del punto (x, y). Con compuerta, la frontera es la suya (03-, la misma
// del dibujo del líquido): la zona 1 queda a la izquierda de la vertical que
// sube del primer nudo, la cadena y la vertical que baja del último. Sin
// compuerta, la cresta de la presa (`xCresta`).
function zonaDePuntoPresa(x, y, xCresta){
  const cad = (typeof cadenaCompuerta === 'function') ? cadenaCompuerta() : null;
  if(!cad || !cad.pts || cad.pts.length < 2){
    // Sin compuerta manda la cresta de la PRIMERA presa, que es la frontera que
    // dibuja el líquido (fronteraPresaX): con dos presas, la segunda no se moja
    // por un lado que en el lienzo está seco.
    const xf = crestaPrincipalX();
    return x < (xf !== null ? xf : xCresta) ? 1 : 2;
  }
  const BIG = 1e7, P = cad.pts;
  const poli = [{x:P[0].x, y:BIG}].concat(P).concat([{x:P[P.length-1].x, y:-BIG}, {x:-BIG, y:-BIG}, {x:-BIG, y:BIG}]);
  return puntoEnPresa({verts:poli}, x, y) ? 1 : 2;
}
// Empuje del líquido sobre cada cara mojada, integrado punto a punto como en
// fuerzaTramoZona (01-): la fuerza va contra la presa (−normal exterior).
function cargasAguaPresa(g){
  const out = [], b = anchoB(), v = g.verts, n = v.length;
  const cr = crestaPresa(g);
  const tolx = 1e-9*Math.max(1, Math.abs(cr.x), g.base.x1 - g.base.x0);
  for(let i=0;i<n;i++){
    const A = v[i], B = v[(i+1)%n];
    const esBase = Math.abs(A.y-g.base.y) < 1e-12*Math.max(1,Math.abs(g.base.y)) + 1e-12
                && Math.abs(B.y-g.base.y) < 1e-12*Math.max(1,Math.abs(g.base.y)) + 1e-12;
    if(esBase) continue;
    const mx = (A.x+B.x)/2, myy = (A.y+B.y)/2;
    const dx = B.x-A.x, dy = B.y-A.y, L = Math.hypot(dx, dy);
    const nx = dy/L, ny = -dx/L;                       // normal exterior (polígono antihorario)
    // La coronación (en la cresta misma) no se asigna a ninguna zona.
    if(Math.abs(mx - cr.x) <= tolx) continue;
    const z = zonaDePuntoPresa(mx + nx*1e-6*L, myy + ny*1e-6*L, cr.x);
    const niv = nivelZona(z);
    if(!isFinite(niv)) continue;
    const N = 400;
    let Fx = 0, Fy = 0, Mo = 0, len = 0, pMax = 0;
    const pts = [];
    for(let k=0;k<=N;k++) pts.push({x:A.x + dx*k/N, y:A.y + dy*k/N});
    for(let k=0;k<N;k++){
      const P = pts[k], Q = pts[k+1], ds = L/N;
      const pa = presionZona(z, P.y), pb = presionZona(z, Q.y);
      pMax = Math.max(pMax, pa, pb);
      if(pa > 0 && pb > 0) len += ds;
      else if((pa > 0 || pb > 0) && Math.abs(Q.y-P.y) > 1e-14) len += ds*Math.min(1, Math.abs(niv - (pa > 0 ? P.y : Q.y))/Math.abs(Q.y-P.y));
      const my = (P.y+Q.y)/2, mxx = (P.x+Q.x)/2, p = presionZona(z, my);
      if(p <= 0) continue;
      const dF = p*b*ds, fx = -nx*dF, fy = -ny*dF;
      Fx += fx; Fy += fy; Mo += mxx*fy - my*fx;
    }
    const F = Math.hypot(Fx, Fy);
    if(F < 1e-12) continue;
    const dir = {x:Fx/F, y:Fy/F};
    const P = cortePuntoLinea(pts, {x:Fy*Mo/(F*F), y:-Fx*Mo/(F*F)}, dir);
    out.push({cara:i, A, B, z, niv, Fx, Fy, F, Mo, dir, P, zP:niv - P.y, len, pMax, nOut:{x:nx, y:ny}});
  }
  out.forEach((c,i)=>{ c.k = i+1; });
  return out;
}
function analizarPresa(p){
  const g = geomPresa(p);
  if(g.error) return {p, error:g.error};
  if(!(p.gamma > 0)) return {p, error:'Falta el peso específico γ de la presa.'};
  const b = anchoB();
  const pesosP = g.partes.map((q,i)=>Object.assign({}, q, {k:i+1, W:p.gamma*b*q.A}));
  const agua = cargasAguaPresa(g);
  const O = {x:g.base.x0, y:g.base.y};
  const Bw = g.base.x1 - g.base.x0;
  let SW = 0, SFx = 0, SFy = 0, M = 0;
  pesosP.forEach(q=>{ SW += q.W; q.brazo = q.cx - O.x; q.m = -q.W*q.brazo; M += q.m; });
  agua.forEach(c=>{ c.m = (c.P.x-O.x)*c.Fy - (c.P.y-O.y)*c.Fx; c.brazo = Math.abs(c.m)/c.F; SFx += c.Fx; SFy += c.Fy; M += c.m; });
  const N = SW - SFy;                 // ΣFy: N − ΣW + ΣE_y = 0
  const Fr = -SFx;                    // ΣFx: F + ΣE_x = 0
  const d = N > 1e-12 ? -M/N : NaN;   // ΣM_O: N·d + ΣM = 0
  const tol = 1e-9*Math.max(1, Bw);
  return {p, g, b, pesos:pesosP, agua, O, B:Bw, SW, SFx, SFy, M, N, Fr, d,
          levanta: !(N > 1e-12), dentro: isFinite(d) && d >= -tol && d <= Bw + tol};
}
function analizarPresas(){ return presas.map(analizarPresa); }

// ── Dibujo en el lienzo ──
// Recorta el líquido: no se pinta dentro de la presa ni, sin compuerta, bajo su base (el terreno).
function recortarPresasLiquido(){
  if(!presas.length) return;
  ctx.beginPath();
  ctx.rect(-10, -10, W+20, H+20);
  let ybMin = Infinity;
  presas.forEach(p=>{
    const g = geomPresa(p); if(g.error) return;
    g.verts.forEach((q,i)=>{ const [sx,sy] = aPantalla(q.x, q.y); i ? ctx.lineTo(sx,sy) : ctx.moveTo(sx,sy); });
    ctx.closePath();
    ybMin = Math.min(ybMin, g.base.y);
  });
  if(!tramos.length && isFinite(ybMin)){
    const [, sy] = aPantalla(0, ybMin);
    ctx.moveTo(-10, sy); ctx.lineTo(W+10, sy); ctx.lineTo(W+10, H+10); ctx.lineTo(-10, H+10); ctx.closePath();
  }
  ctx.clip('evenodd');
}
// Frontera de zonas sin compuerta: la vertical por la cresta de la primera presa.
function crestaPrincipalX(){
  for(const p of presas){ const g = geomPresa(p); if(!g.error) return crestaPresa(g).x; }
  return null;
}
function fronteraPresaX(){
  const x = crestaPrincipalX();
  return x === null ? null : aPantalla(x, 0)[0];
}
function _diagramaCaraPresa(c, e){
  const N = 40, pts = [];
  for(let k=0;k<=N;k++){
    const x = c.A.x + (c.B.x-c.A.x)*k/N, y = c.A.y + (c.B.y-c.A.y)*k/N, p = presionZona(c.z, y);
    const [sx, sy] = aPantalla(x, y);
    pts.push({sx, sy, ox: sx + c.nOut.x*p*e, oy: sy - c.nOut.y*p*e, p});
  }
  const moj = pts.filter(q=>q.p > 1e-12);
  if(moj.length < 2) return;
  ctx.save();
  ctx.beginPath();
  moj.forEach((q,i)=>{ i ? ctx.lineTo(q.sx,q.sy) : ctx.moveTo(q.sx,q.sy); });
  for(let i=moj.length-1;i>=0;i--) ctx.lineTo(moj[i].ox, moj[i].oy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(192,57,43,.13)'; ctx.fill();
  ctx.strokeStyle = 'rgba(192,57,43,.75)'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.restore();
  _reservarPolilinea(moj.map(q=>[q.ox,q.oy]), 1.3, 'presion', 10);
  const paso = Math.max(2, Math.floor(moj.length/6));
  for(let i=paso;i<moj.length-1;i+=paso){
    const q = moj[i];
    if(Math.hypot(q.ox-q.sx, q.oy-q.sy) < 9) continue;
    _flecha(q.ox, q.oy, q.sx, q.sy, 'rgba(192,57,43,.7)', 1.1, 6);
  }
  const fondo = moj.reduce((m,q)=>q.p > m.p ? q : m, moj[0]);
  if(VIS.cotas) _rotulo('p = ' + dec(fondo.p,'f') + ' ' + uPres(), fondo.ox, fondo.oy, '#c0392b',
                        fondo.ox - fondo.sx, fondo.oy - fondo.sy, '600 9.5px Inter,sans-serif', 'center', _ROT_VALOR);
}
// El cuerpo de la presa, el terreno bajo su base y, antes de resolver, los pesos.
function dibujarCuerposPresas(){
  presas.forEach(p=>{
    const g = geomPresa(p); if(g.error) return;
    const sel = selP.indexOf(p.id) >= 0;
    const scr = g.verts.map(q=>aPantalla(q.x, q.y));
    // terreno: una franja rayada bajo la base, algo más ancha que ella
    const [bx0, by] = aPantalla(g.base.x0, g.base.y), [bx1] = aPantalla(g.base.x1, g.base.y);
    const ext = Math.max(30, (bx1-bx0)*0.35);
    const ga = tramos.length ? bx0 - ext : 0, gb = tramos.length ? bx1 + ext : W;
    ctx.save();
    ctx.strokeStyle = '#6b5a3e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ga, by); ctx.lineTo(gb, by); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(107,90,62,.6)';
    ctx.beginPath();
    for(let x = ga + 4; x < gb; x += 10){ ctx.moveTo(x, by + 1); ctx.lineTo(x - 7, by + 8); }
    ctx.stroke();
    ctx.restore();
    _reservarTrazo(ga, by + 4, gb, by + 4, 5, 'terreno');
    // cuerpo
    ctx.save();
    ctx.beginPath();
    scr.forEach((s,i)=>{ i ? ctx.lineTo(s[0],s[1]) : ctx.moveTo(s[0],s[1]); });
    ctx.closePath();
    ctx.fillStyle = sel ? 'rgba(15,92,86,.22)' : 'rgba(150,142,128,.38)'; ctx.fill();
    // divisiones entre partes, a trazos (el contorno, continuo, va encima)
    if(g.partes.length > 1){
      // un lado compartido por dos figuras se traza una vez: dos trazos
      // desfasados se verían continuos
      ctx.setLineDash([5,4]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(80,72,60,.7)';
      const hechos = new Set(), k = q => q.x.toFixed(6) + ',' + q.y.toFixed(6);
      g.partes.forEach(q=>q.poly.forEach((a,i)=>{
        const b = q.poly[(i+1)%q.poly.length], c1 = k(a) + '|' + k(b), c2 = k(b) + '|' + k(a);
        if(hechos.has(c1) || hechos.has(c2)) return;
        hechos.add(c1);
        const [ax, ay] = aPantalla(a.x, a.y), [bx, by2] = aPantalla(b.x, b.y);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by2); ctx.stroke();
      }));
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    scr.forEach((s,i)=>{ i ? ctx.lineTo(s[0],s[1]) : ctx.moveTo(s[0],s[1]); });
    ctx.closePath();
    ctx.strokeStyle = sel ? '#0f5c56' : COL_PRESA; ctx.lineWidth = sel ? 3.2 : 2.4; ctx.stroke();
    ctx.restore();
    for(let i=0;i<scr.length;i++){ const a = scr[i], b = scr[(i+1)%scr.length]; _reservarTrazo(a[0],a[1],b[0],b[1], 1.8, 'tramo'); }
    // nombre y O, el origen de la cota d
    const c = _centroPoliP(g.verts), [cx, cy] = aPantalla(c.x, c.y);
    _rotulo(nombrePresa(p) + ' · γ = ' + dec(p.gamma,'f') + ' ' + uGamma(), cx, cy - 18, '#3d3529', 0, -1, '700 10px Inter,sans-serif', 'center', _ROT_NOMBRE);
    ctx.beginPath(); ctx.arc(bx0, by, 3.5, 0, Math.PI*2); ctx.fillStyle = '#3d3529'; ctx.fill();
    _reservar(bx0-4, by-4, bx0+4, by+4, 'punto');
    _rotulo('O', bx0 - 7, by - 9, '#3d3529', -1, -1, '700 10.5px Inter,sans-serif', 'right', _ROT_NOMBRE);
  });
  // diagramas de presión en las caras mojadas
  if(VIS.presion){
    const pM = _presionMaxima(), e = pM > 1e-12 ? 80/pM : 0;
    if(e > 0) presas.forEach(p=>{ const g = geomPresa(p); if(!g.error) cargasAguaPresa(g).forEach(c=>_diagramaCaraPresa(c, e)); });
  }
  // pesos de cada parte, en su centroide (geometría: se ven antes de resolver)
  if(VIS.peso){
    presas.forEach(p=>{
      const g = geomPresa(p); if(g.error || !(p.gamma > 0)) return;
      const b = anchoB();
      g.partes.forEach((q,i)=>{
        const [px, py] = aPantalla(q.cx, q.cy);
        _flecha(px, py - 42, px, py - 2, '#7a5c1e', 2.4, 10);
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2); ctx.fillStyle = '#7a5c1e'; ctx.fill();
        _reservar(px-4, py-4, px+4, py+4, 'punto');
        _rotulo('W' + (g.partes.length > 1 ? (i+1) : '') + ' = ' + dec(p.gamma*b*q.A,'f') + ' ' + unitFor, px, py - 50, '#7a5c1e', 0, -1,
                '700 10px Inter,sans-serif', 'center', _ROT_VALOR);
      });
    });
  }
}
// Tras resolver: empujes en su centro de presión, N y F en la base y la cota d desde O.
function dibujarResultadosPresas(){
  if(!RP) return;
  RP.forEach(r=>{
    if(r.error) return;
    if(VIS.resultantes) r.agua.forEach(c=>{
      const [px, py] = aPantalla(c.P.x, c.P.y), L = 58;
      const x0 = px - c.dir.x*L, y0 = py + c.dir.y*L;
      _flecha(x0, y0, px, py, '#c0392b', 2.8, 11);
      ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI*2); ctx.fillStyle = '#c0392b'; ctx.fill();
      _reservar(px-4, py-4, px+4, py+4, 'punto');
      _rotulo('E' + c.k + ' = ' + dec(c.F,'f') + ' ' + unitFor, x0 - c.dir.x*8, y0 + c.dir.y*8, '#c0392b', -c.dir.x, c.dir.y,
              '700 10.5px Inter,sans-serif', 'center', _ROT_VALOR);
    });
    if(r.levanta || !isFinite(r.d)) return;
    const col = '#15803d';
    const [ox, oy] = aPantalla(r.O.x, r.O.y), [nx] = aPantalla(r.O.x + r.d, r.O.y);
    // con las cotas a la vista, N y d bajan por debajo de la cadena de la presa
    const yN = VIS.cotas ? 110 : 62, yD = VIS.cotas ? 80 : 34;
    // N: llega a la base desde abajo, en su punto
    _flecha(nx, oy + yN, nx, oy + 2, col, 2.8, 11);
    _rotulo('N = ' + dec(r.N,'f') + ' ' + unitFor, nx, oy + yN + 10, col, 0, 1, '700 10.5px Inter,sans-serif', 'center', _ROT_VALOR);
    // F: a lo largo de la base, en su sentido real
    if(Math.abs(r.Fr) > 1e-9*Math.max(1, r.N)){
      const s = r.Fr > 0 ? 1 : -1;
      _flecha(nx - s*64, oy + 14, nx - s*8, oy + 14, col, 2.6, 10);
      _rotulo('F = ' + dec(Math.abs(r.Fr),'f') + ' ' + unitFor, nx - s*72, oy + 14, col, -s, 0, '700 10.5px Inter,sans-serif', s > 0 ? 'right' : 'left', _ROT_VALOR);
    }
    // cota d, de O a N, bajo el terreno
    if(VIS.cotas && r.d > 1e-9){
      const yc = oy + yD;
      _cotaPx([ox, oy], [nx, oy], [ox, yc], [nx, yc], col);
      _rotulo('d = ' + dec(r.d,'len') + ' ' + unitLen, (ox + nx)/2, yc + 10, col, 0, 1, '700 10px Inter,sans-serif', 'center', _ROT_VALOR);
    }
  });
}
// ── Cotas de la presa (2026-10-03, petición del profesor) ──
// Las x de sus vértices, en cadena bajo el terreno, con la base B como total; y
// sus niveles, en cadena a un lado (primero el derecho), con la altura H como
// total. Lo mismo en el lienzo y en la figura del informe (tkpCotasPresa).
function cotasPresaDatos(g){
  const tam = Math.max(1, ...g.verts.map(q=>Math.abs(q.x)), ...g.verts.map(q=>Math.abs(q.y)));
  const tol = 1e-7*tam;
  const unicos = arr => arr.sort((a,b)=>a-b).filter((v,i,a)=>i === 0 || v - a[i-1] > tol);
  const xs = unicos(g.verts.map(q=>q.x)), ys = unicos(g.verts.map(q=>q.y));
  // De dónde sale cada línea de extensión: del punto del CONTORNO más cercano a
  // la cadena, para no cruzar la presa. La de una x, del punto más bajo del
  // contorno en esa vertical (la base, casi siempre); la de un nivel, del más a
  // la derecha (o a la izquierda) del contorno en esa horizontal.
  const cortes = (eje, c) => {
    const out = [], v = g.verts;
    for(let i=0;i<v.length;i++){
      const a = v[i], b = v[(i+1)%v.length];
      const pa = eje === 'x' ? a.x : a.y, pb = eje === 'x' ? b.x : b.y;
      const qa = eje === 'x' ? a.y : a.x, qb = eje === 'x' ? b.y : b.x;
      if(Math.abs(pa-c) <= tol) out.push(qa);
      if(Math.abs(pb-c) <= tol) out.push(qb);
      if((pa-c)*(pb-c) < 0) out.push(qa + (qb-qa)*(c-pa)/(pb-pa));
    }
    return out;
  };
  const bajoDe = x => Math.min(...cortes('x', x));
  const xDe = (y, lado) => { const v = cortes('y', y); return lado > 0 ? Math.max(...v) : Math.min(...v); };
  return {xs, ys, bajoDe, xDe, tol, B:g.base.x1 - g.base.x0, H:ys[ys.length-1] - ys[0]};
}
function dibujarCotasPresas(){
  presas.forEach(p=>{
    const g = geomPresa(p); if(g.error) return;
    const d = cotasPresaDatos(g), fuente = '600 10px Inter,sans-serif', fuenteT = '700 10px Inter,sans-serif';
    const [, by] = aPantalla(0, g.base.y);
    const txt = v => dec(v,'len') + ' ' + unitLen;
    // ── x: cadena bajo el terreno y el total B ──
    const y1 = by + 22, y2 = by + 50;
    for(let i=0;i<d.xs.length-1;i++){
      const a = d.xs[i], b = d.xs[i+1];
      const pa = aPantalla(a, d.bajoDe(a)), pb = aPantalla(b, d.bajoDe(b));
      _cotaPx(pa, pb, [pa[0], y1], [pb[0], y1], COL_COTA);
      _rotulo(txt(b - a), (pa[0] + pb[0])/2, y1 + 14, '#1b1f24', 0, 1, fuente, 'center', _ROT_VALOR);
    }
    if(d.xs.length > 2 || Math.abs(d.xs[0] - g.base.x0) > d.tol || Math.abs(d.xs[d.xs.length-1] - g.base.x1) > d.tol){
      const pa = aPantalla(g.base.x0, g.base.y), pb = aPantalla(g.base.x1, g.base.y);
      _cotaPx(pa, pb, [pa[0], y2], [pb[0], y2], COL_COTA);
      _rotulo('B = ' + txt(d.B), (pa[0] + pb[0])/2, y2 + 14, '#1b1f24', 0, 1, fuenteT, 'center', _ROT_VALOR);
    }
    // ── y: cadena a un lado, en el primer carril libre, y el total H ──
    const sx = g.verts.map(q=>aPantalla(q.x, q.y)[0]);
    const gx0 = Math.min(...sx), gx1 = Math.max(...sx);
    const filas = [];
    for(let i=0;i<d.ys.length-1;i++) filas.push({lo:d.ys[i], hi:d.ys[i+1], t:txt(d.ys[i+1] - d.ys[i])});
    const total = filas.length > 1;
    if(!total) filas[0].t = 'H = ' + filas[0].t;
    const ignora = it => it.tipo !== 'nivel' && it.tipo !== 'frontera';
    const wMax = Math.max(...filas.map(f=>_anchoTextoPF(f.t, fuente))) + 8;
    let el = null;
    for(const lado of [1, -1]){
      for(const off of [24, 40, 58, 80, 104, 132]){
        const x = lado > 0 ? gx1 + off : gx0 - off;
        if(x < _margenIzq() + 50 || x > W - 50) continue;
        const libre = filas.every(f=>{
          const ya = aPantalla(0, f.hi)[1], yb = aPantalla(0, f.lo)[1], ym = (ya + yb)/2;
          const tx0 = lado > 0 ? x + 6 : x - 6 - wMax;
          return !_regChoca([[x-4, ya], [x+4, ya], [x+4, yb], [x-4, yb]], 2, ignora)
              && !_regChoca([[tx0, ym-8], [tx0+wMax, ym-8], [tx0+wMax, ym+8], [tx0, ym+8]], 2, ignora);
        });
        if(libre){ el = {lado, x}; break; }
      }
      if(el) break;
    }
    if(!el) el = {lado:1, x:gx1 + 24};
    filas.forEach(f=>{
      const pa = aPantalla(d.xDe(f.lo, el.lado), f.lo), pb = aPantalla(d.xDe(f.hi, el.lado), f.hi);
      _cotaPx(pb, pa, [el.x, pb[1]], [el.x, pa[1]], COL_COTA);
      _rotulo(f.t, el.x + el.lado*6, (pa[1] + pb[1])/2, '#1b1f24', el.lado, 0, total ? fuente : fuenteT, el.lado > 0 ? 'left' : 'right', _ROT_VALOR);
    });
    if(total){
      const xT = el.x + el.lado*(wMax + 14);
      const ya = d.ys[0], yb = d.ys[d.ys.length-1];
      const pa = aPantalla(d.xDe(ya, el.lado), ya), pb = aPantalla(d.xDe(yb, el.lado), yb);
      _cotaPx(pb, pa, [xT, pb[1]], [xT, pa[1]], COL_COTA);
      _rotulo('H = ' + txt(d.H), xT + el.lado*6, (pa[1] + pb[1])/2, '#1b1f24', el.lado, 0, fuenteT, el.lado > 0 ? 'left' : 'right', _ROT_VALOR);
    }
  });
}
// Polígono en curso: los vértices tocados y, hasta el puntero, a trazos.
function dibujarPresaPendiente(){
  if(!presaPend || tool !== 'presaPoli') return;
  const ps = presaPend.pts.map(q=>aPantalla(q.x, q.y));
  ctx.save();
  ctx.strokeStyle = COL_PRESA; ctx.lineWidth = 2.2;
  ctx.beginPath(); ps.forEach((s,i)=>{ i ? ctx.lineTo(s[0],s[1]) : ctx.moveTo(s[0],s[1]); });
  if(mouseW && ps.length){ const [mx, my] = aPantalla(snap(mouseW[0]), snap(mouseW[1])); ctx.setLineDash([7,5]); ctx.lineTo(mx, my); }
  ctx.stroke(); ctx.setLineDash([]);
  ps.forEach((s,i)=>{ ctx.beginPath(); ctx.arc(s[0], s[1], i ? 4 : 7, 0, Math.PI*2); ctx.fillStyle = i ? COL_PRESA : 'rgba(107,100,87,.35)'; ctx.fill(); });
  ctx.restore();
}

// ── Interacción: polígono tocado en el lienzo ──
function tocarPresaPoligono(wx, wy, mx, my){
  if(!presaPend) return;
  const pts = presaPend.pts;
  if(pts.length >= 3){
    const [fx, fy] = aPantalla(pts[0].x, pts[0].y);
    if(Math.hypot(mx-fx, my-fy) < 13){ cerrarPresaPoligono(); return; }
  }
  const q = {x:snap(wx), y:snap(wy)};
  if(pts.length && Math.abs(pts[pts.length-1].x - q.x) < 1e-12 && Math.abs(pts[pts.length-1].y - q.y) < 1e-12) return;
  pts.push(q); dibujar();
}
function cerrarPresaPoligono(){
  if(!presaPend || presaPend.pts.length < 3) return;
  const p = {id:++presaSeq, modo:'poligono', gamma:presaPend.gamma, verts:presaPend.pts.map(q=>({x:q.x, y:q.y}))};
  const g = geomPresa(p);
  if(g.error){ presaSeq--; aviso(g.error, 'error'); return; }
  registrarCambio();
  presas.push(p);
  presaPend = null;
  invalidarResultados(); setTool('sel'); refrescar();
}
// Borrar presas por ids.
function borrarPresas(ids){
  if(!ids.length) return;
  presas = presas.filter(p=>ids.indexOf(p.id) < 0);
  selP = selP.filter(id=>ids.indexOf(id) < 0);
}

// ── Ventana de la presa ──
function abrirPresaNueva(){
  setTool('presa');
  presaVentana = {editId:null, modo:'plantilla', gamma:24, x0:0, y0:0, H:6, c:1.5, m1:0, m2:3,
                  partes:[{tipo:'rect', b:1.5, h:6, x:0, y:0}, {tipo:'triBaja', b:3, h:6, x:1.5, y:0}], verts:[]};
  _abrirVentanaPresa();
}
function abrirPresaEdicion(id){
  const p = presa(id); if(!p) return;
  const c = copiaPresa(p);
  presaVentana = Object.assign({x0:0, y0:0, H:6, c:1.5, m1:0, m2:3, partes:[], verts:[]}, c, {editId:id});
  posicionarPartes(presaVentana.partes);
  _abrirVentanaPresa();
}
function _abrirVentanaPresa(){
  document.getElementById('prTitulo').textContent = presaVentana.editId ? 'Editar ' + nombrePresa(presa(presaVentana.editId)) : 'Presa';
  document.getElementById('prGamma').value = _numCampo(presaVentana.gamma);
  document.getElementById('prUG').textContent = uGamma();
  _pintarCamposPresa();
  document.getElementById('presaModal').classList.add('show');
}
function cerrarPresa(){
  document.getElementById('presaModal').classList.remove('show');
  presaVentana = null;
}
function setModoPresa(m){
  if(!presaVentana) return;
  _leerCamposPresa();
  // Al pasar a polígono una presa existente, se parte de su contorno.
  if(m === 'poligono' && presaVentana.modo !== 'poligono' && !presaVentana.verts.length && presaVentana.editId){
    const g = geomPresa(presaVentana); if(!g.error) presaVentana.verts = g.verts.map(q=>({x:q.x, y:q.y}));
  }
  // y de plantilla a figuras, de sus tres figuras, ya colocadas
  if(m === 'figuras' && presaVentana.modo === 'plantilla'){
    const ps = partesPresa(presaVentana);
    if(ps.length && ps.every(q=>q.b > 0 && q.h > 0)) presaVentana.partes = ps;
  }
  presaVentana.modo = m;
  presaVentana.foco = null;
  _pintarCamposPresa();
}
// Campo de la ventana; `foco` es la cota del croquis que se resalta al escribir en él.
function _campoPresa(id, lbl, v, foco, ayuda){
  return '<div class="modal-field"><label>' + lbl + '</label><input type="number" id="' + id + '" step="any" value="' + _numCampo(v) + '"'
       + _attrFocoPresa(foco) + ' oninput="_leerCamposPresa();dibujarCroquisPresa()"><span class="uLen" style="font-size:11px">' + unitLen + '</span></div>'
       + (ayuda ? '<div class="hint-sm" style="margin:-4px 0 6px">' + ayuda + '</div>' : '');
}
function _attrFocoPresa(f){ return f ? ' onfocus="focoPresa(\'' + f + '\')" onblur="focoPresa(null)"' : ''; }
function focoPresa(f){ if(!presaVentana) return; presaVentana.foco = f; dibujarCroquisPresa(); }
function _pintarCamposPresa(){
  const v = presaVentana;
  ['plantilla','figuras','poligono'].forEach(m=>{
    const b = document.getElementById('prModo_' + m); if(b) b.classList.toggle('active', v.modo === m);
  });
  const num = (id, val, foco) => '<input type="number" id="' + id + '" step="any" value="' + _numCampo(val) + '"' + _attrFocoPresa(foco)
       + ' oninput="_leerCamposPresa();dibujarCroquisPresa()" style="flex:1">';
  const uL = '<span class="uLen" style="font-size:11px">' + unitLen + '</span>';
  let h = '';
  if(v.modo !== 'poligono'){
    h += '<div class="cfg-lbl" style="margin:2px 0 6px">Punto O: esquina izquierda de la base</div>'
       + '<div class="modal-field"><label style="min-width:14px">x</label>' + num('prX0', v.x0) + uL
       + '<label style="min-width:0">y</label>' + num('prY0', v.y0) + uL + '</div>';
  }
  if(v.modo === 'plantilla'){
    h += _campoPresa('prH', 'Altura H', v.H, 'H')
       + _campoPresa('prC', 'Corona c', v.c, 'c')
       + _campoPresa('prM1', 'Talud izq. m₁', v.m1, 'm1')
       + _campoPresa('prM2', 'Talud der. m₂', v.m2, 'm2', 'm₁ y m₂ son las proyecciones horizontales de los taludes; base = m₁ + c + m₂.');
  } else if(v.modo === 'figuras'){
    h += '<div class="cfg-lbl" style="margin:6px 0 2px">Figuras</div>'
       + '<div class="hint-sm" style="margin:0 0 6px">x, y: esquina inferior izquierda de la figura, desde O. Arrástralas en el croquis: se pegan a los bordes de las demás.</div>';
    h += v.partes.map((q,i)=>'<div style="border:1px solid var(--border2);border-radius:8px;padding:7px 8px 0;margin-bottom:6px">'
       + '<div class="modal-field" style="gap:6px;margin-bottom:6px"><b style="min-width:14px;color:#7a5c1e">' + (i+1) + '</b>'
       + '<select id="prPt' + i + '" onchange="_leerCamposPresa();dibujarCroquisPresa()" style="flex:1.5">'
       + ['rect','triSube','triBaja'].map(t=>'<option value="' + t + '"' + (q.tipo === t ? ' selected' : '') + '>' + NOMBRE_PARTE[t] + '</option>').join('') + '</select>'
       + '<label style="min-width:0">b</label>' + num('prPb' + i, q.b, 'b' + i)
       + '<label style="min-width:0">h</label>' + num('prPh' + i, q.h, 'h' + i) + '</div>'
       + '<div class="modal-field" style="gap:6px;margin-bottom:7px"><span style="min-width:14px"></span>'
       + '<label style="min-width:0">x</label>' + num('prPx' + i, q.x, 'p' + i)
       + '<label style="min-width:0">y</label>' + num('prPy' + i, q.y, 'p' + i) + uL
       + '<button class="x" onclick="quitarPartePresa(' + i + ')" title="Quitar la figura">×</button></div></div>').join('')
       + '<button class="btn-sm" style="width:100%;margin:2px 0 6px" onclick="agregarPartePresa()">+ Añadir figura</button>';
  } else {
    if(v.editId){
      h += '<div class="cfg-lbl" style="margin:2px 0 6px">Vértices (x, y)</div>'
         + v.verts.map((q,i)=>'<div class="modal-field" style="gap:6px"><label style="min-width:14px">' + (i+1) + '</label>'
         + num('prVx' + i, q.x) + num('prVy' + i, q.y)
         + '<button class="x" onclick="quitarVerticePresa(' + i + ')" title="Quitar">×</button></div>').join('')
         + '<button class="btn-sm" style="width:100%;margin:2px 0 6px" onclick="agregarVerticePresa()">+ Añadir vértice</button>';
    } else {
      h += '<div class="hint-sm" style="margin:2px 0 8px">Pulsa «Dibujar» y toca los vértices en el lienzo; ciérralo tocando el primero. El lado más bajo debe ser horizontal: es la base.</div>';
    }
  }
  document.getElementById('prCampos').innerHTML = h;
  document.getElementById('prAplicar').textContent = (v.modo === 'poligono' && !v.editId) ? 'Dibujar' : 'Aplicar';
  dibujarCroquisPresa();
}
function _leerCamposPresa(){
  const v = presaVentana; if(!v) return;
  const n = id => { const e = document.getElementById(id); const x = e ? Number(e.value) : NaN; return (e && e.value !== '' && isFinite(x)) ? x : NaN; };
  const g = n('prGamma'); if(isFinite(g)) v.gamma = g;
  if(document.getElementById('prX0')){ v.x0 = n('prX0'); v.y0 = n('prY0'); }
  if(v.modo === 'plantilla'){ v.H = n('prH'); v.c = n('prC'); v.m1 = n('prM1'); v.m2 = n('prM2'); }
  else if(v.modo === 'figuras') v.partes = v.partes.map((q,i)=>({tipo:(document.getElementById('prPt'+i)||{}).value || q.tipo,
                                                               b:n('prPb'+i), h:n('prPh'+i), x:n('prPx'+i), y:n('prPy'+i)}));
  else if(v.editId) v.verts = v.verts.map((q,i)=>({x:n('prVx'+i), y:n('prVy'+i)}));
}
// Una figura nueva entra pegada a la derecha de las demás, sobre la base.
function agregarPartePresa(){
  _leerCamposPresa();
  const ps = presaVentana.partes, u = ps[ps.length-1];
  const x = ps.length ? Math.max(...ps.map(q=>(isFinite(q.x) ? q.x : 0) + (q.b > 0 ? q.b : 0))) : 0;
  ps.push({tipo:'rect', b:1, h:u && u.h > 0 ? u.h : 1, x, y:0});
  _pintarCamposPresa();
}
function quitarPartePresa(i){ _leerCamposPresa(); presaVentana.partes.splice(i,1); _pintarCamposPresa(); }
function agregarVerticePresa(){ _leerCamposPresa(); const u = presaVentana.verts[presaVentana.verts.length-1] || {x:0,y:0}; presaVentana.verts.push({x:u.x+1, y:u.y}); _pintarCamposPresa(); }
function quitarVerticePresa(i){ _leerCamposPresa(); presaVentana.verts.splice(i,1); _pintarCamposPresa(); }
// Lo que la ventana dejaría como presa (sin tocar el modelo), o el motivo por el que no vale.
function _presaDeVentana(){
  const v = presaVentana;
  if(!(v.gamma > 0)) return {error:'El peso específico γ tiene que ser mayor que cero.'};
  const p = {modo:v.modo, gamma:v.gamma};
  if(v.modo !== 'poligono'){
    if(!isFinite(v.x0) || !isFinite(v.y0)) return {error:'Escribe las coordenadas del punto O.'};
    p.x0 = v.x0; p.y0 = v.y0;
  }
  if(v.modo === 'plantilla'){
    if(!(v.H > 0)) return {error:'La altura H tiene que ser mayor que cero.'};
    if([v.c, v.m1, v.m2].some(x=>!(x >= 0))) return {error:'La corona y los taludes no pueden ser negativos.'};
    if(!(v.c + v.m1 + v.m2 > 0)) return {error:'La base sale nula: da la corona o algún talud.'};
    Object.assign(p, {H:v.H, c:v.c, m1:v.m1, m2:v.m2});
  } else if(v.modo === 'figuras'){
    if(!v.partes.length) return {error:'Añade al menos una figura.'};
    if(v.partes.some(q=>!(q.b > 0) || !(q.h > 0))) return {error:'Cada figura necesita b y h mayores que cero.'};
    if(v.partes.some(q=>!isFinite(q.x) || !isFinite(q.y))) return {error:'Escribe la posición x, y de cada figura.'};
    p.partes = v.partes.map(q=>({tipo:q.tipo, b:q.b, h:q.h, x:q.x, y:q.y}));
  } else {
    if(v.verts.some(q=>!isFinite(q.x) || !isFinite(q.y))) return {error:'Escribe números en todos los vértices.'};
    p.verts = v.verts.map(q=>({x:q.x, y:q.y}));
  }
  const g = geomPresa(p);
  return g.error ? {error:g.error, solape:g.solape} : {p, g};
}
// Lleva O a la esquina izquierda de la base sin mover la presa: las figuras se
// reexpresan desde ahí. Se hace al soltar un arrastre y al aplicar, nunca
// mientras se escribe.
function _normalizarFigurasPresa(p, g){
  if(p.modo !== 'figuras' || !g || g.error) return false;
  const dx = g.base.x0 - p.x0, dy = g.base.y - p.y0;
  const tol = 1e-9*Math.max(1, Math.abs(g.base.x0), Math.abs(g.base.y));
  if(Math.abs(dx) <= tol && Math.abs(dy) <= tol) return false;
  p.x0 = +(p.x0 + dx).toFixed(9); p.y0 = +(p.y0 + dy).toFixed(9);
  p.partes.forEach(q=>{ q.x = +(q.x - dx).toFixed(9); q.y = +(q.y - dy).toFixed(9); });
  return true;
}

// ── Croquis acotado de la ventana (2026-10-03) ──
// Plantilla: H a la izquierda, c encima, m₁·c·m₂ en cadena debajo y la base B
// como total. Por figuras: cada una con su número y sus cotas b y h, y la base
// B debajo. Polígono: la cadena de las x de los vértices y sus niveles. La cota
// del campo que se está escribiendo se resalta en el acento del tema.
const PR_COL_COTA = '#374151', PR_COL_FOCO = '#0f5c56';
const PR_W = 360, PR_H = 230, PR_M = {l:62, r:24, t:30, b:70};
let _arrastrePresa = null;     // {i, tf, w0, x0, y0}
function _tfCroquisPresa(puntos){
  const xs = puntos.map(q=>q.x), ys = puntos.map(q=>q.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const aw = PR_W - PR_M.l - PR_M.r, ah = PR_H - PR_M.t - PR_M.b;
  const k = Math.min(aw/Math.max(x1-x0,1e-9), ah/Math.max(y1-y0,1e-9));
  return {k, ax: PR_M.l + (aw - (x1-x0)*k)/2 - x0*k, ay: PR_H - PR_M.b + y0*k, span:Math.max(x1-x0, y1-y0)};
}
function _svgCotaPresa(p1, p2, D1, D2, txt, tx, ty, ancla, col, negrita){
  const F = v => v.toFixed(1);
  let s = '';
  [[p1, D1], [p2, D2]].forEach(par=>{
    const p = par[0], D = par[1], dx = D[0]-p[0], dy = D[1]-p[1], L = Math.hypot(dx, dy);
    if(L < 5) return;
    const ux = dx/L, uy = dy/L;
    s += '<line x1="' + F(p[0]+ux*3) + '" y1="' + F(p[1]+uy*3) + '" x2="' + F(D[0]+ux*4) + '" y2="' + F(D[1]+uy*4) + '" stroke="' + col + '" stroke-width=".7" opacity=".75"/>';
  });
  const dx = D2[0]-D1[0], dy = D2[1]-D1[1], L = Math.hypot(dx, dy) || 1, ux = dx/L, uy = dy/L;
  s += '<line x1="' + F(D1[0]) + '" y1="' + F(D1[1]) + '" x2="' + F(D2[0]) + '" y2="' + F(D2[1]) + '" stroke="' + col + '" stroke-width="' + (negrita ? 1.6 : 0.9) + '"/>';
  const punta = (x, y, vx, vy) => { const c = 6, w = 2.2;
    return '<polygon points="' + F(x) + ',' + F(y) + ' ' + F(x - vx*c - vy*w) + ',' + F(y - vy*c + vx*w) + ' ' + F(x - vx*c + vy*w) + ',' + F(y - vy*c - vx*w) + '" fill="' + col + '"/>'; };
  if(L >= 14) s += punta(D1[0], D1[1], -ux, -uy) + punta(D2[0], D2[1], ux, uy);
  else s += '<circle cx="' + F(D1[0]) + '" cy="' + F(D1[1]) + '" r="1.5" fill="' + col + '"/><circle cx="' + F(D2[0]) + '" cy="' + F(D2[1]) + '" r="1.5" fill="' + col + '"/>';
  s += '<text x="' + F(tx) + '" y="' + F(ty) + '" font-size="10" text-anchor="' + ancla + '" dominant-baseline="middle" font-weight="' + (negrita ? 800 : 600)
     + '" fill="' + col + '" stroke="#f7faf9" stroke-width="3" paint-order="stroke">' + txt + '</text>';
  return s;
}
// Partes de la ventana en coordenadas del mundo, aunque la presa todavía no valga
// (así, con dos figuras solapadas, se siguen viendo y se pueden separar).
function _partesCroquisPresa(v){
  if(v.modo === 'plantilla'){
    if(!(v.H > 0) || [v.c, v.m1, v.m2].some(x=>!(x >= 0)) || !(v.c + v.m1 + v.m2 > 0) || !isFinite(v.x0) || !isFinite(v.y0)) return [];
    return partesPresa(v).map((q,i)=>Object.assign({i}, q, poliParte(q.tipo, v.x0 + q.x, v.y0 + q.y, q.b, q.h)));
  }
  if(v.modo === 'figuras'){
    const x0 = isFinite(v.x0) ? v.x0 : 0, y0 = isFinite(v.y0) ? v.y0 : 0;
    return v.partes.map((q,i)=>(q.b > 0 && q.h > 0 && isFinite(q.x) && isFinite(q.y))
      ? Object.assign({i, tipo:q.tipo, b:q.b, h:q.h}, poliParte(q.tipo, x0 + q.x, y0 + q.y, q.b, q.h)) : null).filter(Boolean);
  }
  return [];
}
function dibujarCroquisPresa(){
  const svg = document.getElementById('prCroquis'), info = document.getElementById('prInfo');
  if(!svg || !presaVentana) return;
  const v = presaVentana;
  if(v.modo === 'poligono' && !v.editId){ svg.innerHTML = ''; svg.style.display = 'none'; if(info) info.textContent = ''; return; }
  svg.style.display = 'block';
  _activarArrastrePresa(svg);
  const r = _presaDeVentana();
  const partes = v.modo === 'poligono' ? (r.g ? r.g.partes.map((q,i)=>Object.assign({i}, q)) : []) : _partesCroquisPresa(v);
  const puntos = r.g ? r.g.verts : [].concat(...partes.map(q=>q.poly));
  if(!puntos.length){
    svg.innerHTML = '<text x="180" y="115" text-anchor="middle" font-size="12" fill="#c0392b">' + escaparTexto(r.error || 'Faltan medidas.') + '</text>';
    if(info) info.textContent = ''; return;
  }
  const tf = _arrastrePresa ? _arrastrePresa.tf : _tfCroquisPresa(puntos);
  const X = x => tf.ax + x*tf.k, Y = y => tf.ay - y*tf.k;
  const F = q => q.toFixed(1);
  const pts = arr => arr.map(t=>F(X(t.x)) + ',' + F(Y(t.y))).join(' ');
  const foco = v.foco || null, arr = _arrastrePresa ? _arrastrePresa.i : null;
  const colDe = f => foco === f ? PR_COL_FOCO : PR_COL_COTA;
  const nl = x => dec(x,'len');
  let s = '';
  // terreno bajo la base
  const yb = Y(r.g ? r.g.base.y : Math.min(...puntos.map(q=>q.y)));
  s += '<line x1="8" y1="' + F(yb) + '" x2="' + (PR_W-8) + '" y2="' + F(yb) + '" stroke="#6b5a3e" stroke-width="2"/>';
  for(let x = 12; x < PR_W-8; x += 10) s += '<line x1="' + x + '" y1="' + F(yb+1) + '" x2="' + (x-7) + '" y2="' + F(yb+8) + '" stroke="rgba(107,90,62,.45)"/>';
  // cuerpo: la unión si vale; si no, las figuras sueltas
  if(r.g) s += '<polygon points="' + pts(r.g.verts) + '" fill="rgba(150,142,128,.38)" stroke="' + COL_PRESA + '" stroke-width="2"/>';
  const solape = r.solape || [], mover = v.modo === 'figuras';
  partes.forEach(q=>{
    const i = q.i, mal = solape.indexOf(i) >= 0, activa = mover && (arr === i || foco === 'p' + i);
    if(r.g && partes.length < 2 && !activa) return;
    const borde = mal ? '#c0392b' : (activa ? PR_COL_FOCO : (r.g ? 'rgba(80,72,60,.6)' : COL_PRESA));
    const relleno = r.g ? 'rgba(0,0,0,0)' : (mal ? 'rgba(192,57,43,.16)' : 'rgba(150,142,128,.32)');
    s += '<polygon points="' + pts(q.poly) + '"' + (mover ? ' data-parte="' + i + '" style="cursor:move"' : '') + ' fill="' + relleno + '" stroke="' + borde
       + '" stroke-width="' + (activa || mal ? 2 : 1) + '"' + (r.g && !activa && !mal ? ' stroke-dasharray="4,3"' : '') + '/>';
  });
  // ── cotas ──
  const cotaB = yB => r.g ? _svgCotaPresa([X(r.g.base.x0), yb], [X(r.g.base.x1), yb], [X(r.g.base.x0), yB], [X(r.g.base.x1), yB],
                                          'B = ' + nl(r.g.base.x1 - r.g.base.x0), (X(r.g.base.x0)+X(r.g.base.x1))/2, yB + 11, 'middle', PR_COL_COTA, false) : '';
  if(v.modo === 'plantilla' && r.g){
    const x0 = v.x0, yT = Y(v.y0 + v.H), yA = yb + 18;
    const xa = x0 + v.m1, xc = xa + v.c, xd = xc + v.m2;
    // debajo, los dos taludes (la corona va encima); si un valor no cabe junto
    // al anterior, baja a una segunda fila
    let finAnt = -Infinity;
    [['m1','m₁', x0, yb, xa, yT], ['m2','m₂', xc, yT, xd, yb]].forEach(t=>{
      if(t[4] - t[2] <= 1e-12) return;
      const a = X(t[2]), b = X(t[4]), txt = t[1] + ' = ' + nl(t[4]-t[2]), w = txt.length*5.6;
      const fila = (a + b)/2 - w/2 < finAnt + 4 ? 1 : 0;
      if(!fila) finAnt = (a + b)/2 + w/2;
      s += _svgCotaPresa([a, t[3]], [b, t[5]], [a, yA], [b, yA], txt, (a+b)/2, yA + 11 + fila*12, 'middle', colDe(t[0]), foco === t[0]);
    });
    s += cotaB(yb + 50);
    const xi = Math.min(X(x0), X(xa)) - 16;
    s += _svgCotaPresa([X(x0), yb], [X(xa), yT], [xi, yb], [xi, yT], 'H = ' + nl(v.H), xi - 5, (yb + yT)/2, 'end', colDe('H'), foco === 'H');
    if(v.c > 1e-12){
      const yc = yT - 14;
      s += _svgCotaPresa([X(xa), yT], [X(xc), yT], [X(xa), yc], [X(xc), yc], 'c = ' + nl(v.c), (X(xa)+X(xc))/2, yc - 9, 'middle', colDe('c'), foco === 'c');
    }
  } else if(v.modo === 'figuras'){
    partes.forEach(q=>{
      const i = q.i, xa = q.poly[0].x, ya = q.poly[0].y;
      const pxA = X(xa), pxB = X(xa + q.b), pyA = Y(ya), pyT = Y(ya + q.h);
      // b, por dentro y junto a su lado inferior
      const yc = pyA - 9;
      s += _svgCotaPresa([pxA, pyA], [pxB, pyA], [pxA, yc], [pxB, yc], nl(q.b), (pxA+pxB)/2, yc, 'middle', colDe('b' + i), foco === 'b' + i);
      // h, por dentro y junto a su lado vertical; el valor, en el tercio de
      // arriba, para no pisar el número de la figura (que va en su centroide)
      const izq = q.tipo !== 'triSube', xl = izq ? pxA : pxB, xv = izq ? pxA + 9 : pxB - 9;
      s += _svgCotaPresa([xl, pyA], [xl, pyT], [xv, pyA], [xv, pyT], nl(q.h), xv + (izq ? 4 : -4), pyT + (pyA - pyT)*0.25, izq ? 'start' : 'end', colDe('h' + i), foco === 'h' + i);
      // su número, en el centroide
      s += '<circle cx="' + F(X(q.cx)) + '" cy="' + F(Y(q.cy)) + '" r="7" fill="#7a5c1e" pointer-events="none"/><text x="' + F(X(q.cx)) + '" y="' + F(Y(q.cy)+0.5)
         + '" font-size="9.5" font-weight="800" fill="#fff" text-anchor="middle" dominant-baseline="middle" pointer-events="none">' + (i+1) + '</text>';
    });
    s += cotaB(yb + 20);
  } else if(r.g){
    // polígono: la cadena de las x de los vértices y, a la izquierda, sus niveles
    const d = cotasPresaDatos(r.g), yA = yb + 18, xi = X(d.xs[0]) - 16;
    for(let i=0;i<d.xs.length-1;i++){
      const a = d.xs[i], b = d.xs[i+1];
      s += _svgCotaPresa([X(a), Y(d.bajoDe(a))], [X(b), Y(d.bajoDe(b))], [X(a), yA], [X(b), yA], nl(b-a), (X(a)+X(b))/2, yA + 11, 'middle', PR_COL_COTA, false);
    }
    for(let i=0;i<d.ys.length-1;i++){
      const a = d.ys[i], b = d.ys[i+1];
      s += _svgCotaPresa([X(d.xDe(a,-1)), Y(a)], [X(d.xDe(b,-1)), Y(b)], [xi, Y(a)], [xi, Y(b)], nl(b-a), xi - 5, (Y(a)+Y(b))/2, 'end', PR_COL_COTA, false);
    }
  }
  if(r.g) s += '<circle cx="' + F(X(r.g.base.x0)) + '" cy="' + F(yb) + '" r="3" fill="#3d3529"/><text x="' + F(X(r.g.base.x0)-5) + '" y="' + F(yb-6)
             + '" font-size="11" font-weight="700" text-anchor="end" fill="#3d3529">O</text>';
  svg.innerHTML = s;
  if(info){
    if(r.error){ info.innerHTML = '<b style="color:#c0392b">' + escaparTexto(r.error) + '</b>'; return; }
    const A = r.g.partes.reduce((a,q)=>a+q.A, 0);
    info.textContent = 'Base B = ' + nl(r.g.base.x1-r.g.base.x0) + ' ' + unitLen + ' · área A = ' + dec(A,'len') + ' ' + unitLen + '² · '
      + r.g.partes.length + (r.g.partes.length === 1 ? ' figura' : ' figuras');
  }
}
// Arrastre de una figura en el croquis, con imán a los bordes de las demás y a O.
function _activarArrastrePresa(svg){
  if(svg._arrastreListo) return;
  svg._arrastreListo = true;
  const aMundoSvg = (e, tf) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return {x:(q.x - tf.ax)/tf.k, y:(tf.ay - q.y)/tf.k};
  };
  svg.addEventListener('pointerdown', e=>{
    const el = e.target.closest && e.target.closest('[data-parte]');
    if(!el || !presaVentana || presaVentana.modo !== 'figuras') return;
    _leerCamposPresa();
    const i = +el.getAttribute('data-parte'), q = presaVentana.partes[i];
    if(!q || !isFinite(q.x) || !isFinite(q.y)) return;
    // la escala se congela mientras dura el arrastre: el croquis no salta
    const tf = _tfCroquisPresa([].concat(..._partesCroquisPresa(presaVentana).map(t=>t.poly)));
    _arrastrePresa = {i, tf, w0:aMundoSvg(e, tf), x0:q.x, y0:q.y};
    try{ svg.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
    dibujarCroquisPresa();
  });
  svg.addEventListener('pointermove', e=>{
    const a = _arrastrePresa; if(!a || !presaVentana) return;
    const w = aMundoSvg(e, a.tf), ps = presaVentana.partes, q = ps[a.i];
    let nx = a.x0 + (w.x - a.w0.x), ny = a.y0 + (w.y - a.w0.y);
    const umbral = 8/a.tf.k;
    // imán: el borde izquierdo o derecho (inferior o superior) de la figura
    // sobre un borde de otra, o sobre O
    const iman = (val, largo, objetivos) => {
      let mejor = null;
      objetivos.forEach(t=>[t - val, t - (val + largo)].forEach(dd=>{ if(Math.abs(dd) <= umbral && (mejor === null || Math.abs(dd) < Math.abs(mejor))) mejor = dd; }));
      return mejor;
    };
    const otras = ps.filter((t,j)=>j !== a.i && t.b > 0 && t.h > 0 && isFinite(t.x) && isFinite(t.y));
    const ox = iman(nx, q.b, [0].concat(...otras.map(t=>[t.x, t.x + t.b])));
    const oy = iman(ny, q.h, [0].concat(...otras.map(t=>[t.y, t.y + t.h])));
    // sin imán, a un paso redondo de la escala del croquis
    const crudo = a.tf.span/60, e10 = Math.pow(10, Math.floor(Math.log10(crudo))), paso = crudo/e10 >= 5 ? 5*e10 : (crudo/e10 >= 2 ? 2*e10 : e10);
    nx = ox !== null ? nx + ox : Math.round(nx/paso)*paso;
    ny = oy !== null ? ny + oy : Math.round(ny/paso)*paso;
    q.x = +nx.toFixed(9); q.y = +ny.toFixed(9);
    const ex = document.getElementById('prPx' + a.i), ey = document.getElementById('prPy' + a.i);
    if(ex) ex.value = _numCampo(q.x);
    if(ey) ey.value = _numCampo(q.y);
    dibujarCroquisPresa();
  });
  const soltar = () => {
    if(!_arrastrePresa) return;
    _arrastrePresa = null;
    if(presaVentana){
      const r = _presaDeVentana();
      if(r.g && _normalizarFigurasPresa(presaVentana, r.g)){ _pintarCamposPresa(); return; }
    }
    dibujarCroquisPresa();
  };
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);
}
function aplicarPresa(){
  const v = presaVentana; if(!v) return;
  _leerCamposPresa();
  if(v.modo === 'poligono' && !v.editId){
    if(!(v.gamma > 0)){ aviso('El peso específico γ tiene que ser mayor que cero.', 'error'); return; }
    presaPend = {gamma:v.gamma, pts:[]};
    cerrarPresa();
    setTool('presaPoli');
    return;
  }
  const r = _presaDeVentana();
  if(r.error){ aviso(r.error, 'error'); return; }
  _normalizarFigurasPresa(r.p, r.g);
  registrarCambio();
  if(v.editId){
    const p = presa(v.editId);
    Object.keys(p).forEach(k=>{ if(k !== 'id') delete p[k]; });
    Object.assign(p, r.p);
  } else {
    presas.push(Object.assign({id:++presaSeq}, r.p));
    setTool('sel');
  }
  cerrarPresa();
  invalidarResultados(); refrescar();
}
// Lista del panel Elementos.
function listaPresasHtml(){
  if(!presas.length) return '<div class="list-empty">Sin presas.</div>';
  return presas.map(p=>{
    const g = geomPresa(p);
    const modo = p.modo === 'plantilla' ? 'plantilla' : (p.modo === 'figuras' ? 'por figuras' : 'polígono');
    return '<div class="item-row' + (selP.indexOf(p.id) >= 0 ? ' sel' : '') + '"><div class="dot" style="background:' + COL_PRESA + '"></div>'
      + '<div class="nm">' + nombrePresa(p) + ' · ' + modo + (g.error ? ' · <b style="color:#c0392b">revisar</b>' : ' · B = ' + dec(g.base.x1-g.base.x0,'len')) + '</div>'
      + '<button class="cara-btn" onclick="abrirPresaEdicion(' + p.id + ')" title="Editar la presa">\u270e</button>'
      + '<button class="x" onclick="registrarCambio();borrarPresas([' + p.id + ']);invalidarResultados();refrescar()">×</button></div>';
  }).join('');
}

// ── Resultados en pantalla (ecuación y resultado; el porqué va al PDF) ──
function presasHtml(numInicial){
  if(!RP || !RP.length) return '';
  const f = v=>dec(v,'f'), nl = v=>dec(v,'len'), uF = unitFor, uL = unitLen;
  const fila = tx => '<div class="eq-row"><div class="eq-body">' + kx(tx) + '</div></div>';
  const sg = (v,i) => (i===0 ? (v<0?'-':'') : (v<0?' - ':' + '));
  let h = '';
  RP.forEach((r, ir)=>{
    h += '<div class="res-section"><div class="res-title"><div class="num">' + (numInicial + ir) + '</div>' + nombrePresa(r.p) + ' — reacciones en la base</div>';
    if(r.error){ h += '<div class="hint-sm" style="color:#c0392b">' + escaparTexto(r.error) + '</div></div>'; return; }
    // peso por partes
    h += '<table class="tabla"><thead><tr><th>Parte</th><th>Figura</th><th class="r">A (' + uL + '²)</th><th class="r">x̄ (' + uL + ')</th><th class="r">ȳ (' + uL + ')</th><th class="r">W = γ b A (' + uF + ')</th></tr></thead><tbody>';
    r.pesos.forEach(q=>{ h += '<tr><td><b>' + kx('W_{' + q.k + '}') + '</b></td><td>' + NOMBRE_PARTE[q.tipo] + '</td><td class="r">' + nl(q.A) + '</td><td class="r">' + nl(q.cx) + '</td><td class="r">' + nl(q.cy) + '</td><td class="r"><b>' + f(q.W) + '</b></td></tr>'; });
    h += '<tr class="fila-total"><td colspan="5">Σ W (γ = ' + f(r.p.gamma) + ' ' + uGamma() + ', b = ' + nl(r.b) + ' ' + uL + ')</td><td class="r">' + f(r.SW) + '</td></tr></tbody></table>';
    // empujes
    if(r.agua.length){
      h += '<table class="tabla" style="margin-top:6px"><thead><tr><th>Empuje</th><th>Zona</th><th class="r">L mojada (' + uL + ')</th><th class="r">p máx (' + uPres() + ')</th><th class="r">E (' + uF + ')</th><th class="r">z<sub>P</sub> (' + uL + ')</th><th class="r">E<sub>x</sub> (' + uF + ')</th><th class="r">E<sub>y</sub> (' + uF + ')</th><th>Sentido</th></tr></thead><tbody>';
      r.agua.forEach(c=>{ h += '<tr><td><b>' + kx('E_{' + c.k + '}') + '</b></td><td>' + c.z + '</td><td class="r">' + nl(c.len) + '</td><td class="r">' + f(c.pMax) + '</td><td class="r"><b>' + f(c.F) + '</b></td><td class="r">' + nl(c.zP) + '</td><td class="r">' + f(c.Fx) + '</td><td class="r">' + f(c.Fy) + '</td><td>' + iconoSentidoHtml(c.dir.x, c.dir.y) + '</td></tr>'; });
      h += '</tbody></table>';
    } else h += '<div class="hint-sm">Ninguna cara de la presa está mojada.</div>';
    // equilibrio
    h += '<div class="proc-block" style="padding:9px 12px;margin-top:8px">';
    const ex = r.agua.filter(c=>Math.abs(c.Fx) > 1e-9), ey = r.agua.filter(c=>Math.abs(c.Fy) > 1e-9);
    h += fila('\\xrightarrow{+}\\ \\sum F_x:\\ F' + ex.map(c=>(c.Fx<0?' - ':' + ') + f(Math.abs(c.Fx))).join('') + ' = 0\\ \\Rightarrow\\ F = ' + f(r.Fr) + '\\ \\text{' + uF + '}');
    h += fila('+\\!\\uparrow\\ \\sum F_y:\\ N' + r.pesos.map(q=>' - ' + f(q.W)).join('') + ey.map(c=>(c.Fy<0?' - ':' + ') + f(Math.abs(c.Fy))).join('') + ' = 0\\ \\Rightarrow\\ N = ' + f(r.N) + '\\ \\text{' + uF + '}');
    const tm = r.pesos.filter(q=>Math.abs(q.m) > 1e-9).map(q=>({v:q.m, t:f(q.W) + '(' + nl(Math.abs(q.brazo)) + ')'}))
      .concat(r.agua.filter(c=>Math.abs(c.m) > 1e-9).map(c=>({v:c.m, t:f(c.F) + '(' + nl(c.brazo) + ')'})));
    h += fila('\\circlearrowleft{+}\\ \\sum M_O:\\ N\\,d' + tm.map(q=>(q.v<0?' - ':' + ') + q.t).join('') + ' = 0\\ \\Rightarrow\\ d = ' + (isFinite(r.d) ? nl(r.d) : '—') + '\\ \\text{' + uL + '}');
    h += '</div>';
    let ver;
    if(r.levanta) ver = '<b style="color:#c0392b">N ≤ 0: el empuje levanta la presa; no se apoya en su base.</b>';
    else ver = kx('N = ' + f(r.N)) + ' ' + uF + ' ↑ · ' + kx('F = ' + f(Math.abs(r.Fr))) + ' ' + uF + ' ' + (r.Fr >= 0 ? '→' : '←')
      + ' · ' + kx('d = ' + nl(r.d)) + ' ' + uL + ' desde O · base ' + kx('B = ' + nl(r.B)) + ' ' + uL + ': '
      + (r.dentro ? 'N cae <b>dentro</b> de la base ✓' : '<b style="color:#c0392b">N cae fuera de la base: la presa vuelca</b>');
    h += '<div class="verdict">' + ver + '</div></div>';
  });
  return h;
}

// ── Informe LaTeX ──
// Cotas de la presa en la figura del informe (las mismas del lienzo): las x de
// sus vértices bajo el terreno con la base B como total y, a un lado, sus
// niveles con la altura H como total.
const TKP_Y_CADENA = -0.45, TKP_Y_TOTAL = -0.92;
function tkpCotasPresa(g, X, Y){
  const F = v => v.toFixed(3), d = cotasPresaDatos(g);
  const flecha = '{Latex[length=1.5mm,width=1.1mm]}-{Latex[length=1.5mm,width=1.1mm]}';
  const ext = (x1, y1, x2, y2) => {
    const L = Math.hypot(x2-x1, y2-y1); if(L < 0.12) return '';
    const ux = (x2-x1)/L, uy = (y2-y1)/L;
    return '\\draw[bsaMuted, line width=.35pt] (' + F(x1+ux*0.08) + ',' + F(y1+uy*0.08) + ') -- (' + F(x2+ux*0.1) + ',' + F(y2+uy*0.1) + ');\n';
  };
  const cota = (x1, y1, x2, y2) => '\\draw[' + flecha + ', bsaMuted, line width=.4pt] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x2) + ',' + F(y2) + ');\n';
  let out = '';
  // x: cadena y total B
  for(let i=0;i<d.xs.length-1;i++){
    const a = d.xs[i], b = d.xs[i+1];
    out += ext(X(a), Y(d.bajoDe(a)), X(a), TKP_Y_CADENA) + ext(X(b), Y(d.bajoDe(b)), X(b), TKP_Y_CADENA);
    out += cota(X(a), TKP_Y_CADENA, X(b), TKP_Y_CADENA);
    tkpOcuparTrazo(X(a), TKP_Y_CADENA, X(b), TKP_Y_CADENA, 0.05);
    out += tkpTexto((X(a) + X(b))/2, TKP_Y_CADENA - 0.06 - tkpAlto('tiny')/2, '$' + dec(b - a,'len') + '$', 'font=\\tiny', 0, -1);
  }
  if(d.xs.length > 2 || Math.abs(d.xs[0] - g.base.x0) > d.tol || Math.abs(d.xs[d.xs.length-1] - g.base.x1) > d.tol){
    const a = X(g.base.x0), b = X(g.base.x1);
    out += ext(a, 0, a, TKP_Y_TOTAL) + ext(b, 0, b, TKP_Y_TOTAL) + cota(a, TKP_Y_TOTAL, b, TKP_Y_TOTAL);
    tkpOcuparTrazo(a, TKP_Y_TOTAL, b, TKP_Y_TOTAL, 0.05);
    out += tkpTexto((a + b)/2, TKP_Y_TOTAL - 0.06 - tkpAlto('tiny')/2, '$B = ' + dec(d.B,'len') + '$', 'font=\\tiny', 0, -1);
  }
  // y: cadena a un lado, en el primer carril libre, y el total H
  const gx0 = Math.min(...g.verts.map(q=>X(q.x))), gx1 = Math.max(...g.verts.map(q=>X(q.x)));
  const filas = [];
  for(let i=0;i<d.ys.length-1;i++) filas.push({lo:d.ys[i], hi:d.ys[i+1], t:'$' + dec(d.ys[i+1] - d.ys[i],'len') + '$'});
  const total = filas.length > 1;
  if(!total) filas[0].t = '$H = ' + dec(d.H,'len') + '$';
  const wMax = Math.max(...filas.map(f=>tkpAncho(f.t, 'font=\\tiny')));
  let el = null;
  for(const lado of [1, -1]){
    for(const off of [0.5, 0.75, 1.0, 1.3, 1.65, 2.05]){
      const c = lado > 0 ? gx1 + off : gx0 - off;
      const libre = filas.every(f=>{
        const a = Y(f.lo), b = Y(f.hi), m = (a + b)/2, h = tkpAlto('tiny');
        return !tkpChoca({x0:c-0.05, y0:a, x1:c+0.05, y1:b})
            && !tkpChoca({x0: lado < 0 ? c-0.1-wMax : c+0.1, y0:m-h/2, x1: lado < 0 ? c-0.1 : c+0.1+wMax, y1:m+h/2});
      });
      if(libre){ el = {lado, c}; break; }
    }
    if(el) break;
  }
  if(!el) el = {lado:1, c:gx1 + 0.5};
  filas.forEach(f=>{
    const xl = X(d.xDe(f.lo, el.lado)), xh = X(d.xDe(f.hi, el.lado)), yl = Y(f.lo), yh = Y(f.hi);
    out += ext(xl, yl, el.c, yl) + ext(xh, yh, el.c, yh) + cota(el.c, yl, el.c, yh);
    tkpOcuparTrazo(el.c, yl, el.c, yh, 0.05);
    const w = tkpAncho(f.t, 'font=\\tiny');
    out += tkpTexto(el.c + el.lado*(0.1 + w/2), (yl + yh)/2, f.t, 'font=\\tiny', el.lado, 0);
  });
  if(total){
    const c = el.c + el.lado*(wMax + 0.3);
    const yl = Y(d.ys[0]), yh = Y(d.ys[d.ys.length-1]);
    out += ext(el.c, yl, c, yl) + ext(el.c, yh, c, yh) + cota(c, yl, c, yh);
    tkpOcuparTrazo(c, yl, c, yh, 0.05);
    const t = '$H = ' + dec(d.H,'len') + '$', w = tkpAncho(t, 'font=\\tiny');
    out += tkpTexto(c + el.lado*(0.1 + w/2), (yl + yh)/2, t, 'font=\\tiny', el.lado, 0);
  }
  return out;
}
function tkpPresa(r){
  tkpReiniciar();
  const g = r.g, F = v => v.toFixed(3);
  const xs = g.verts.map(q=>q.x), ys = g.verts.map(q=>q.y);
  const niv = [1,2].map(z=>nivelZona(z)).filter(isFinite);
  const Bw = g.base.x1 - g.base.x0;
  const xa = Math.min(...xs) - 0.45*Bw, xb = Math.max(...xs) + 0.45*Bw;
  const ya = g.base.y, yb = Math.max(...ys, ...niv);
  const k = Math.min(9.5/Math.max(xb-xa,1e-9), 6.5/Math.max(yb-ya,1e-9), 2.4);
  const X = x => (x-xa)*k, Y = y => (y-ya)*k;
  const cr = crestaPresa(g);
  let out = '';
  // agua de cada zona: hasta la cresta; la presa, opaca, tapa lo que cae dentro
  [1,2].forEach(z=>{
    const nv = nivelZona(z); if(!isFinite(nv) || nv <= g.base.y) return;
    const x0 = z === 1 ? X(xa) : X(cr.x), x1 = z === 1 ? X(cr.x) : X(xb);
    out += '\\fill[bsaAgua!15] (' + F(x0) + ',0) rectangle (' + F(x1) + ',' + F(Y(nv)) + ');\n';
    out += '\\draw[bsaAgua, line width=1pt] (' + F(x0) + ',' + F(Y(nv)) + ') -- (' + F(x1) + ',' + F(Y(nv)) + ');\n';
    tkpOcupar(x0, Y(nv), x1, Y(nv) + 0.05);
  });
  out += '\\fill[fill=gray!28, draw=bsaPresa, line width=1.2pt] ' + g.verts.map(q=>'(' + F(X(q.x)) + ',' + F(Y(q.y)) + ')').join(' -- ') + ' -- cycle;\n';
  if(g.partes.length > 1) g.partes.forEach(q=>{ out += '\\draw[bsaPresa, dashed, line width=.4pt] ' + q.poly.map(t=>'(' + F(X(t.x)) + ',' + F(Y(t.y)) + ')').join(' -- ') + ' -- cycle;\n'; });
  for(let i=0;i<g.verts.length;i++){ const a = g.verts[i], b = g.verts[(i+1)%g.verts.length]; tkpOcuparTrazo(X(a.x), Y(a.y), X(b.x), Y(b.y), 0.05); }
  // terreno
  out += '\\draw[bsaTierra, line width=1pt] (' + F(X(xa)) + ',0) -- (' + F(X(xb)) + ',0);\n';
  for(let x = X(xa) + 0.15; x < X(xb); x += 0.25) out += '\\draw[bsaTierra!70, line width=.35pt] (' + F(x) + ',0) -- (' + F(x-0.15) + ',-0.15);\n';
  tkpOcupar(X(xa), -0.2, X(xb), 0);
  // pesos
  r.pesos.forEach(q=>{
    const px = X(q.cx), py = Y(q.cy);
    out += '\\draw[-{Latex[length=2mm]}, bsaPeso, line width=1.1pt] (' + F(px) + ',' + F(py + 1.0) + ') -- (' + F(px) + ',' + F(py + 0.05) + ');\n';
    out += '\\filldraw[bsaPeso] (' + F(px) + ',' + F(py) + ') circle (0.045);\n';
    tkpOcuparTrazo(px, py + 1.0, px, py, 0.08);
  });
  // empujes
  r.agua.forEach(c=>{
    const px = X(c.P.x), py = Y(c.P.y), L = 1.3;
    out += '\\draw[-{Latex[length=2.2mm]}, bsaPres, line width=1.2pt] (' + F(px - c.dir.x*L) + ',' + F(py - c.dir.y*L) + ') -- (' + F(px - c.dir.x*0.05) + ',' + F(py - c.dir.y*0.05) + ');\n';
    tkpOcuparTrazo(px - c.dir.x*L, py - c.dir.y*L, px, py, 0.08);
  });
  // O, N, F y la cota d
  const ox = X(r.O.x);
  out += '\\filldraw[bsaAcc2] (' + F(ox) + ',0) circle (0.05);\n';
  if(!r.levanta && isFinite(r.d)){
    const nx = X(r.O.x + r.d);
    out += '\\draw[-{Latex[length=2.2mm]}, bsaReac, line width=1.2pt] (' + F(nx) + ',-1.95) -- (' + F(nx) + ',-0.05);\n';
    tkpOcuparTrazo(nx, -1.95, nx, 0, 0.08);
    if(Math.abs(r.Fr) > 1e-9*Math.max(1, r.N)){
      const s = r.Fr > 0 ? 1 : -1;
      out += '\\draw[-{Latex[length=2.2mm]}, bsaReac, line width=1.2pt] (' + F(nx - s*1.3) + ',-0.25) -- (' + F(nx - s*0.08) + ',-0.25);\n';
      tkpOcuparTrazo(nx - s*1.3, -0.25, nx, -0.25, 0.08);
      out += tkpTexto(nx - s*1.6, -0.25, '$F$', 'font=\\scriptsize, color=bsaReac', -s, 0);
    }
    out += tkpTexto(nx, -2.2, '$N$', 'font=\\scriptsize, color=bsaReac', 0, -1);
    if(r.d > 1e-9){
      out += '\\draw[{Latex[length=1.5mm,width=1.1mm]}-{Latex[length=1.5mm,width=1.1mm]}, bsaReac, line width=.45pt] (' + F(ox) + ',-1.42) -- (' + F(nx) + ',-1.42);\n';
      out += '\\draw[bsaReac!80, line width=.35pt] (' + F(ox) + ',-1.02) -- (' + F(ox) + ',-1.52);\n';
      tkpOcuparTrazo(ox, -1.42, nx, -1.42, 0.05);
      out += tkpTexto((ox + nx)/2, -1.62, '$d = ' + dec(r.d,'len') + '$', 'font=\\tiny, color=bsaReac', 0, -1);
    }
  }
  // cotas de la geometría: después de N, F y d, para que sus valores los esquiven
  out += tkpCotasPresa(g, X, Y);
  // rótulos
  r.pesos.forEach(q=>{ out += tkpTexto(X(q.cx), Y(q.cy) + 1.25, '$W_{' + q.k + '}$', 'font=\\scriptsize, color=bsaPeso', 0, 1); });
  r.agua.forEach(c=>{ out += tkpTexto(X(c.P.x) - c.dir.x*1.6, Y(c.P.y) - c.dir.y*1.6, '$E_{' + c.k + '}$', 'font=\\scriptsize, color=bsaPres', -c.dir.x, -c.dir.y); });
  out += tkpTexto(ox - 0.2, 0.2, '$O$', 'font=\\scriptsize, color=bsaAcc2', -1, 1);
  return out;
}
// Las secciones del informe para las presas. `h` trae los ayudantes de construirLatex.
function latexPresas(h, numInicial){
  if(!RP || !RP.length) return '';
  const f = v=>dec(v,'f'), nl = v=>dec(v,'len');
  const uL = escLatex(unitLen), uF = escLatex(unitFor);
  const UL = '\\,\\text{' + uL + '}', UF = '\\,\\text{' + uF + '}', UM = UF + '\\cdot\\text{' + uL + '}';
  let tex = '';
  RP.forEach((r, ir)=>{
    const nom = escLatex(nombrePresa(r.p));
    tex += '\\seccion{' + (numInicial + ir) + '. ' + nom + ' --- Reacciones en la base}\n';
    if(r.error){ tex += '\\noindent ' + escLatex(r.error) + '\n'; return; }
    tex += h.porque('presa', 'La presa es un cuerpo r\\\'igido apoyado en su cimiento. Sobre ella act\\\'uan su \\textbf{peso}, el \\textbf{empuje del l\\\'iquido} en cada cara mojada (normal a la cara y contra ella) y, en la base, la reacci\\\'on del terreno. '
      + 'Esa reacci\\\'on est\\\'a repartida por toda la base, pero equivale a una \\textbf{normal} $N$ y una \\textbf{fuerza horizontal} $F$ (el rozamiento que impide el deslizamiento) aplicadas en un punto a la distancia $d$ de $O$. '
      + 'Son tres inc\\\'ognitas y salen de las tres ecuaciones del equilibrio; $d$, de los momentos respecto de $O$, donde $F$ no da momento porque act\\\'ua a lo largo de la base. '
      + 'Si $d$ cae fuera de la base, ninguna reacci\\\'on del terreno puede equilibrar la presa: \\textbf{vuelca}.');
    tex += h.lamina(tkpPresa(r), nom + ': peso de cada parte en su centroide, empuje del l\\\'iquido en cada cara mojada y reacciones $N$ y $F$ en la base. Cotas en ' + uL + '.');
    tex += '\\subpaso{Peso de la presa}\n';
    tex += '\\noindent{\\footnotesize Cada parte pesa $W = \\gamma\\,b\\,A$, con $\\gamma = ' + f(r.p.gamma) + '$\\,' + uF + '/' + uL + '$^3$ y $b = ' + nl(r.b) + '$' + UL + ', aplicado en su centroide' + (r.pesos.some(q=>q.tipo !== 'poli' && q.tipo !== 'rect') ? ' (un tri\\\'angulo rect\\\'angulo, a un tercio de su lado vertical y de su base)' : '') + '.}\\\\[2pt]\n';
    tex += h.tablaCaption('Peso por partes. \\\'Areas en ' + uL + '$^2$, coordenadas en ' + uL + ', pesos en ' + uF + '.');
    tex += '\\begin{tablacentrada}\\begin{tabular}{llrrrr}\n\\hline\nParte & Figura & $A$ & $\\bar x$ & $\\bar y$ & $W$ \\\\\n\\hline\n';
    r.pesos.forEach(q=>{ tex += '$W_{' + q.k + '}$ & ' + ({rect:'rect\\\'angulo', triSube:'tri\\\'angulo', triBaja:'tri\\\'angulo', poli:'pol\\\'igono'})[q.tipo] + ' & ' + nl(q.A) + ' & ' + nl(q.cx) + ' & ' + nl(q.cy) + ' & ' + f(q.W) + ' \\\\\n'; });
    tex += '\\hline\n\\multicolumn{5}{l}{$\\Sigma W$} & ' + f(r.SW) + ' \\\\\n\\hline\n\\end{tabular}\\end{tablacentrada}\n';
    tex += '\\subpaso{Empuje del l\\\'iquido}\n';
    if(r.agua.length){
      tex += '\\noindent{\\footnotesize Cada cara mojada recibe la presi\\\'on $p = \\gamma h$; su resultante $E$ es el \\\'area del diagrama por el ancho $b$ y pasa por su centroide, igual que en una compuerta plana.}\\\\[2pt]\n';
      tex += h.tablaCaption('Empuje en cada cara mojada. $L$ y $z_P$ en ' + uL + '; fuerzas en ' + uF + '.');
      tex += '\\begin{tablacentrada}\\begin{tabular}{lrrrrrrc}\n\\hline\nEmpuje & Zona & $L$ & $E$ & $z_P$ & $E_x$ & $E_y$ & Sentido \\\\\n\\hline\n';
      r.agua.forEach(c=>{ tex += '$E_{' + c.k + '}$ & ' + c.z + ' & ' + nl(c.len) + ' & ' + f(c.F) + ' & ' + nl(c.zP) + ' & $' + f(c.Fx) + '$ & $' + f(c.Fy) + '$ & ' + iconoSentidoTex(c.dir.x, c.dir.y) + ' \\\\\n'; });
      tex += '\\hline\n\\end{tabular}\\end{tablacentrada}\n';
    } else tex += '\\noindent Ninguna cara de la presa est\\\'a mojada.\n';
    tex += '\\subpaso{Equilibrio}\n';
    const ex = r.agua.filter(c=>Math.abs(c.Fx) > 1e-9), ey = r.agua.filter(c=>Math.abs(c.Fy) > 1e-9);
    const filas = [];
    filas.push('\\xrightarrow{+}\\ \\sum F_x:\\ & F' + ex.map(c=>(c.Fx<0?' - ':' + ') + f(Math.abs(c.Fx))).join('') + ' = 0 \\ \\Rightarrow\\ \\boxed{F = ' + f(r.Fr) + UF + '}');
    filas.push('+\\!\\uparrow\\ \\sum F_y:\\ & N' + r.pesos.map(q=>' - ' + f(q.W)).join('') + ey.map(c=>(c.Fy<0?' - ':' + ') + f(Math.abs(c.Fy))).join('') + ' = 0 \\ \\Rightarrow\\ \\boxed{N = ' + f(r.N) + UF + '}');
    const tm = r.pesos.filter(q=>Math.abs(q.m) > 1e-9).map(q=>({v:q.m, t:f(q.W) + '(' + nl(Math.abs(q.brazo)) + ')'}))
      .concat(r.agua.filter(c=>Math.abs(c.m) > 1e-9).map(c=>({v:c.m, t:f(c.F) + '(' + nl(c.brazo) + ')'})));
    let fm = '\\circlearrowleft{+}\\ \\sum M_O:\\ & N\\,d';
    tm.forEach((q,i)=>{ if(i > 0 && i % 4 === 0) fm += ' \\\\\n & \\qquad '; fm += (q.v<0?' - ':' + ') + q.t; });
    filas.push(fm + ' = 0');
    if(!r.levanta && isFinite(r.d)) filas.push(' & ' + f(r.N) + '\\,d = ' + f(-r.M) + '\\ \\Rightarrow\\ \\boxed{d = ' + nl(r.d) + UL + '}');
    tex += '\\begin{align*}\n' + filas.join(' \\\\\n') + '\n\\end{align*}\n';
    tex += '{\\footnotesize Los brazos de los momentos se miden desde $O$, perpendiculares a cada fuerza; $F$ no aparece porque act\\\'ua a lo largo de la base.}\\\\[2pt]\n';
    if(r.levanta) tex += '\\veredicto{$N \\le 0$: el empuje del l\\\'iquido levanta la presa, que no se apoya en su base.}\n';
    else tex += '\\resultado{$N = ' + f(r.N) + '$' + UF + ' $\\uparrow$, $F = ' + f(Math.abs(r.Fr)) + '$' + UF + ' ' + iconoSentidoTex(r.Fr >= 0 ? 1 : -1, 0)
      + ' y $N$ act\\\'ua a $d = ' + nl(r.d) + '$' + UL + ' de $O$, con una base de $B = ' + nl(r.B) + '$' + UL + ': '
      + (r.dentro ? 'cae \\textbf{dentro} de la base.' : 'cae \\textbf{fuera} de la base: la presa vuelca.') + '}\n';
  });
  return tex;
}
