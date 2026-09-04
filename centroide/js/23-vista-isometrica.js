// ═══════════════════════════════════════════════════════════
//  MODO 3D · vista isométrica de solo lectura y Pappus–Guldinus
// ═══════════════════════════════════════════════════════════
// La isométrica no se edita: sirve para ver el cuerpo entero de un vistazo.
// Se dibuja en tres sitios con el mismo dibujante: un recuadro opcional del
// lienzo principal (casilla «Isométrica»), una sección de resultados y una
// lámina TikZ del informe. Cada sólido se representa por su SILUETA: la
// envolvente convexa de sus puntos proyectados (vértices en los poliedros;
// anillos del meridiano en los sólidos de revolución), que es exacta porque
// todos los sólidos del catálogo son convexos. Encima van los anillos de la
// base y la tapa, o las aristas, en trazo fino.
//
// Proyección isométrica: el observador mira desde la dirección (1,1,1).
//   u = (X − Y)/√2      v = (2Z − X − Y)/√6      prof = (X + Y + Z)/√3
// prof crece hacia el observador: los sólidos se pintan de lejos a cerca.
function isoProy(X, Y, Z){
  return {u:(X - Y)/Math.SQRT2, v:(2*Z - X - Y)/Math.sqrt(6), prof:(X + Y + Z)/Math.sqrt(3)};
}

// Nube de puntos de un sólido en el mundo: vértices y aristas (poliedros) o
// anillos del perfil (revolución).
function nubeSolido(fig){
  const def = SOLID_DEFS[fig.type];
  const W = q => [fig.cx + q[0], fig.cy + q[1], fig.cz + q[2]];
  if(def.vertices){
    const V = verticesSolido(fig).map(W);
    return {puntos:V, anillos:[], aristas:def.aristas ? def.aristas() : []};
  }
  const perf = def.perfil(fig.dims), N = 36, anillos = [], puntos = [];
  perf.forEach(pz=>{
    const ring = [];
    for(let k=0;k<N;k++){
      const a = 2*Math.PI*k/N;
      const w = W(localASolido(fig, [pz.r*Math.cos(a), pz.r*Math.sin(a), pz.z]));
      ring.push(w); puntos.push(w);
    }
    if(pz.r > 1e-9) anillos.push(ring);
  });
  return {puntos, anillos, aristas:null};
}

// Prepara todo lo que hace falta para pintar: siluetas, anillos, aristas,
// números y la caja en (u, v). Independiente del medio (lienzo o TikZ).
function escenaIso(opts){
  opts = opts || {};
  const items = figures.map((fig,i)=>{
    const nube = nubeSolido(fig);
    const P = nube.puntos.map(p=>isoProy(p[0],p[1],p[2]));
    const hull = hull2d(P.map(q=>[q.u,q.v]));
    const c = isoProy(fig.cx, fig.cy, fig.cz);
    return {fig, num:i+1, hull, c,
      anillos: nube.anillos.map(r=>r.map(p=>{ const q=isoProy(p[0],p[1],p[2]); return [q.u,q.v]; })),
      aristas: nube.aristas ? nube.aristas.map(([a,b])=>[[P[a].u,P[a].v],[P[b].u,P[b].v]]) : null};
  });
  items.sort((a,b)=>a.c.prof - b.c.prof);
  let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
  const meter = (u,v)=>{ u0=Math.min(u0,u); u1=Math.max(u1,u); v0=Math.min(v0,v); v1=Math.max(v1,v); };
  items.forEach(it=>it.hull.forEach(q=>meter(q[0],q[1])));
  // Ejes desde O, de un cuarto del tamaño del cuerpo
  const tam = Math.max(u1-u0, v1-v0, 1e-9);
  let ejes = null;
  if(opts.ejes){
    const L = tam*0.28;
    ejes = [['X',isoProy(L,0,0)],['Y',isoProy(0,L,0)],['Z',isoProy(0,0,L)]].map(([n,q])=>({n, u:q.u, v:q.v}));
    meter(0,0); ejes.forEach(e=>meter(e.u,e.v));
  }
  let C = null;
  if(opts.marcarC && results && results.es3d){ const q = isoProy(results.xbar, results.ybar, results.zbar); C = {u:q.u, v:q.v}; meter(C.u, C.v); }
  return {items, u0,u1,v0,v1, ejes, C};
}

// Pinta la escena en un rectángulo (x0, y0, W, H) de un contexto 2D.
function dibujarIsoEn(c, x0, y0, W, H, opts){
  opts = opts || {};
  if(!figures.length) return;
  const E = escenaIso(opts);
  const m = 22, bw = Math.max(E.u1-E.u0,1e-9), bh = Math.max(E.v1-E.v0,1e-9);
  const s = Math.min((W-2*m)/bw, (H-2*m-14)/bh);
  const px = u => x0 + m + ((W-2*m) - bw*s)/2 + (u-E.u0)*s;
  const py = v => y0 + H - m - ((H-2*m-14) - bh*s)/2 - (v-E.v0)*s;
  c.save();
  if(opts.marco){
    c.fillStyle = 'rgba(255,255,255,.93)'; c.strokeStyle = 'rgba(15,92,86,.45)'; c.lineWidth = 1;
    c.beginPath(); c.rect(x0+0.5, y0+0.5, W-1, H-1); c.fill(); c.stroke();
    c.fillStyle = 'rgba(15,92,86,.92)'; c.font = 'bold 10px Inter'; c.textBaseline = 'middle';
    const w = c.measureText('Isométrica').width + 12; c.fillRect(x0+6, y0+6, w, 16);
    c.fillStyle = '#fff'; c.fillText('Isométrica', x0+12, y0+14); c.textBaseline = 'alphabetic';
  }
  c.beginPath(); c.rect(x0, y0, W, H); c.clip();
  const poli = pts => { c.beginPath(); pts.forEach((q,i)=>{ if(i) c.lineTo(px(q[0]),py(q[1])); else c.moveTo(px(q[0]),py(q[1])); }); c.closePath(); };
  if(E.ejes){
    c.strokeStyle = 'rgba(30,33,38,.35)'; c.lineWidth = 1; c.font = 'bold 10px Inter'; c.fillStyle = 'rgba(30,33,38,.5)';
    E.ejes.forEach(e=>{ c.beginPath(); c.moveTo(px(0),py(0)); c.lineTo(px(e.u),py(e.v)); c.stroke(); c.fillText(e.n, px(e.u)+3, py(e.v)-3); });
  }
  E.items.forEach(it=>{
    const f = it.fig, hueco = f.sign < 0, col = f.color;
    poli(it.hull);
    c.fillStyle = hexAlpha(col, hueco ? 0.08 : 0.26); c.fill();
    c.strokeStyle = hexAlpha(col, hueco ? 0.7 : 0.9); c.lineWidth = hueco ? 1.1 : 1.4;
    c.setLineDash(hueco ? [5,3] : []); c.stroke();
    c.lineWidth = 0.8; c.strokeStyle = hexAlpha(col, 0.55); c.setLineDash(hueco ? [3,3] : []);
    it.anillos.forEach(r=>{ poli(r); c.stroke(); });
    if(it.aristas) it.aristas.forEach(([a,b])=>{ c.beginPath(); c.moveTo(px(a[0]),py(a[1])); c.lineTo(px(b[0]),py(b[1])); c.stroke(); });
    c.setLineDash([]);
    if(opts.numerar){
      const ux = px(it.c.u), uy = py(it.c.v);
      c.beginPath(); c.arc(ux, uy, 7, 0, Math.PI*2); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = hexAlpha(col,.9); c.lineWidth = 1; c.stroke();
      c.fillStyle = hexAlpha(col,.95); c.font = 'bold 9px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(it.num), ux, uy); c.textAlign = 'start'; c.textBaseline = 'alphabetic';
    }
  });
  if(E.C){
    const ux = px(E.C.u), uy = py(E.C.v);
    c.beginPath(); c.arc(ux, uy, 6, 0, Math.PI*2); c.fillStyle = '#f0c040'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#b8860c'; c.font = 'bold 12px Inter'; c.fillText('C', ux+9, uy-6);
    if(opts.marcarC !== 'solo'){
      const txt = '(' + decFix(results.xbar,'len') + ', ' + decFix(results.ybar,'len') + ', ' + decFix(results.zbar,'len') + ')';
      c.font = 'bold 9.5px Inter'; const w = c.measureText(txt).width + 8;
      c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(ux+8, uy+3, w, 13); c.fillStyle = '#b8860c'; c.fillText(txt, ux+12, uy+13);
    }
  }
  c.restore();
}
function dibujarIsoEnCanvas(canvasId, opts){
  const cv = document.getElementById(canvasId); if(!cv) return;
  const dpr = window.devicePixelRatio||1, W = cv.clientWidth||600, H = cv.clientHeight||350;
  cv.width = W*dpr; cv.height = H*dpr;
  const c = cv.getContext('2d'); c.scale(dpr,dpr);
  c.fillStyle = '#fff'; c.fillRect(0,0,W,H);
  dibujarIsoEn(c, 0, 0, W, H, opts);
}

// La misma escena en TikZ, para el informe. Devuelve el cuerpo del tikzpicture.
function tikzIso3d(opts){
  opts = opts || {};
  const E = escenaIso(opts);
  const ancho = opts.ancho || 7.0, alto = opts.alto || 6.5;
  const bw = Math.max(E.u1-E.u0,1e-9), bh = Math.max(E.v1-E.v0,1e-9);
  const esc = Math.min(ancho/bw, alto/bh);
  const n = v => v.toFixed(3), tu = u => (u-E.u0)*esc, tv = v => (v-E.v0)*esc;
  const poli = pts => pts.map(q=>'(' + n(tu(q[0])) + ',' + n(tv(q[1])) + ')').join(' -- ') + ' -- cycle';
  let s = '';
  if(E.ejes){
    E.ejes.forEach(e=>{ s += '\\draw[black!60, line width=0.4pt, ->, >=stealth] (' + n(tu(0)) + ',' + n(tv(0)) + ') -- (' + n(tu(e.u)) + ',' + n(tv(e.v)) + ') node[font=\\scriptsize, above right, inner sep=1pt] {$' + e.n + '$};\n'; });
    s += '\\node[font=\\scriptsize, below left, inner sep=1pt] at (' + n(tu(0)) + ',' + n(tv(0)) + ') {$O$};\n';
  }
  E.items.forEach(it=>{
    const f = it.fig, hueco = f.sign < 0, col = hexRgbSpec(f.color);
    const est = hueco ? 'pattern=north east lines, pattern color={' + col + '}, draw={' + col + '}, line width=0.7pt, dashed'
                      : 'fill={' + col + '}, fill opacity=0.28, draw={' + col + '}, line width=0.8pt';
    s += '\\filldraw[' + est + '] ' + poli(it.hull) + ';\n';
    const fino = 'draw={' + col + '}, line width=0.3pt, opacity=0.6' + (hueco ? ', dash pattern=on 1.2pt off 1.2pt' : '');
    it.anillos.forEach(r=>{ s += '\\draw[' + fino + '] ' + poli(r) + ';\n'; });
    if(it.aristas) it.aristas.forEach(([a,b])=>{ s += '\\draw[' + fino + '] (' + n(tu(a[0])) + ',' + n(tv(a[1])) + ') -- (' + n(tu(b[0])) + ',' + n(tv(b[1])) + ');\n'; });
    if(opts.numerar) s += '\\node[font=\\tiny\\bfseries, circle, draw={' + col + '}, fill=white, inner sep=0.9pt] at (' + n(tu(it.c.u)) + ',' + n(tv(it.c.v)) + ') {' + it.num + '};\n';
  });
  if(E.C){
    s += '\\fill[bsaAlerta] (' + n(tu(E.C.u)) + ',' + n(tv(E.C.v)) + ') circle (2pt);\n';
    s += '\\node[font=\\small\\bfseries, above right, xshift=2pt] at (' + n(tu(E.C.u)) + ',' + n(tv(E.C.v)) + ') {C};\n';
  }
  return s;
}

// ══ Pappus–Guldinus (2.º teorema) ══════════════════════════════════════════
// Solo tiene sentido cuando TODOS los sólidos son de revolución alrededor del
// mismo eje vertical: entonces cada volumen es el de girar su media sección
// (área generatriz A) alrededor del eje, V = 2π·r̄·A, y el total también.
function datosPappus(){
  if(!results || !results.es3d || !figures.length) return null;
  if(!figures.every(f=>SOLID_DEFS[f.type] && SOLID_DEFS[f.type].pappus)) return null;
  const bb = bbox3d(), tol = 1e-6*Math.max(1, bb.x1-bb.x0, bb.v1-bb.v0);
  const ax = figures[0].cx, ay = figures[0].cy;
  if(!figures.every(f=>Math.abs(f.cx-ax) < tol && Math.abs(f.cy-ay) < tol)) return null;
  const filas = results.steps.map(s=>{
    const def = SOLID_DEFS[s.fig.type], p = def.pappus(s.fig.dims);
    const Vp = 2*Math.PI*p.r*p.A*s.fig.sign;
    return {nombre:s.fig.etiqueta || s.fig.name || def.name, A:p.A, r:p.r, Vp, V:s.v, p, fig:s.fig};
  });
  const Vp = filas.reduce((a,r)=>a+r.Vp, 0);
  const igual = (a,b)=>Math.abs(a-b) <= 1e-9*Math.max(1, Math.abs(a), Math.abs(b));
  const ok = filas.every(r=>igual(r.Vp, r.V)) && igual(Vp, results.V);
  return {filas, Vp, ok, eje:{x:ax, y:ay}};
}
