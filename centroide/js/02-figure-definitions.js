// ═══════════════════════════════════════════════════════════
//  FIGURE DEFINITIONS
// ═══════════════════════════════════════════════════════════

// ── Ayudantes de las figuras poligonales (van ANTES de FIG_DEFS) ──────────
// Propiedades EXACTAS de un polígono por el teorema de Green: área, centroide
// y las tres inercias respecto de su propio centroide. No es una aproximación
// numérica: es la fórmula cerrada del polígono, y así el trapecio y el
// triángulo cualquiera salen bien con cualquier combinación de medidas.
function _propsPoli(v){
  let A = 0, cx = 0, cy = 0, Ix = 0, Iy = 0, Ixy = 0;
  for(let i = 0; i < v.length; i++){
    const a = v[i], b = v[(i + 1) % v.length], cr = a[0]*b[1] - b[0]*a[1];
    A  += cr;   cx += (a[0] + b[0])*cr;   cy += (a[1] + b[1])*cr;
    Iy += (a[0]*a[0] + a[0]*b[0] + b[0]*b[0])*cr;
    Ix += (a[1]*a[1] + a[1]*b[1] + b[1]*b[1])*cr;
    Ixy += (a[0]*b[1] + 2*a[0]*a[1] + 2*b[0]*b[1] + b[0]*a[1])*cr;
  }
  A /= 2; cx /= 6*A; cy /= 6*A; Ix /= 12; Iy /= 12; Ixy /= 24;
  return {A:A, cx:cx, cy:cy, Ix:Ix - A*cy*cy, Iy:Iy - A*cx*cx, Ixy:Ixy - A*cx*cy};
}
// Vértices en el marco natural de cada figura (origen en la esquina inferior
// izquierda o en el centro), antes de llevar el centroide a (0,0).
function _vTrapecio(d){ return [[0,0], [d.a,0], [d.dx + d.b, d.h], [d.dx, d.h]]; }
function _vTriangulo(d){ return [[0,0], [d.b,0], [d.d, d.h]]; }
function _vPoliReg(n, R, giro){
  const v = [];
  for(let k = 0; k < n; k++){ const t = 2*Math.PI*k/n + giro; v.push([R*Math.cos(t), R*Math.sin(t)]); }
  return v;
}
// Marco local de un polígono: los mismos vértices con el centroide en el origen.
function _poliLocal(v){ const q = _propsPoli(v); return v.map(p => [p[0] - q.cx, p[1] - q.cy]); }
function _boundsPoli(v){
  const xs = v.map(p => p[0]), ys = v.map(p => p[1]);
  return {left:Math.min.apply(null,xs), right:Math.max.apply(null,xs),
          bottom:Math.min.apply(null,ys), top:Math.max.apply(null,ys)};
}
function _dibujarPoli(ctx, v){
  ctx.moveTo(v[0][0], v[0][1]);
  for(let i = 1; i < v.length; i++) ctx.lineTo(v[i][0], v[i][1]);
  ctx.closePath();
}

const FIG_DEFS = {
  rect: {
    name:'Rectángulo',
    dims:[{id:'b',label:'Base (b)',def:100},{id:'h',label:'Altura (h)',def:80}],
    area: d => d.b*d.h,
    Ix_c: d => d.b*Math.pow(d.h,3)/12,
    Iy_c: d => Math.pow(d.b,3)*d.h/12,
    Ixy_c: d => 0,
    bounds: d => ({left:-d.b/2,right:d.b/2,bottom:-d.h/2,top:d.h/2}),
    anchors: ['C','TL','TR','BL','BR'],
    anchorOffset: (d,a) => {
      if(a==='C')  return {dx:0,      dy:0};
      if(a==='TL') return {dx:-d.b/2, dy:d.h/2};
      if(a==='TR') return {dx:d.b/2,  dy:d.h/2};
      if(a==='BL') return {dx:-d.b/2, dy:-d.h/2};
      if(a==='BR') return {dx:d.b/2,  dy:-d.h/2};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => { ctx.rect(-d.b/2,-d.h/2,d.b,d.h); }
  },
  rtriangle: {
    name:'Triáng. Rectángulo',
    dims:[{id:'b',label:'Base (b)',def:100},{id:'h',label:'Altura (h)',def:80}],
    area: d => 0.5*d.b*d.h,
    Ix_c: d => d.b*Math.pow(d.h,3)/36,
    Iy_c: d => Math.pow(d.b,3)*d.h/36,
    Ixy_c: d => -Math.pow(d.b,2)*Math.pow(d.h,2)/72,
    bounds: d => ({left:-d.b/3,right:2*d.b/3,bottom:-d.h/3,top:2*d.h/3}),
    anchors: ['C','BL','BR','TL'],
    anchorOffset: (d,a) => {
      if(a==='C')  return {dx:0,       dy:0};
      if(a==='BL') return {dx:-d.b/3,  dy:-d.h/3};
      if(a==='BR') return {dx:2*d.b/3, dy:-d.h/3};
      if(a==='TL') return {dx:-d.b/3,  dy:2*d.h/3};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      ctx.moveTo(-d.b/3,-d.h/3);
      ctx.lineTo(2*d.b/3,-d.h/3);
      ctx.lineTo(-d.b/3,2*d.h/3);
      ctx.closePath();
    }
  },
  rtriangle2: {
    name:'Triáng. Rect. ②',
    // PDF page 4, second variant: right angle at BOTTOM-RIGHT
    // Vertices: BL(−2b/3, −h/3), BR(b/3, −h/3), TR(b/3, 2h/3)
    dims:[{id:'b',label:'Base (b)',def:100},{id:'h',label:'Altura (h)',def:80}],
    area: d => 0.5*d.b*d.h,
    Ix_c: d => d.b*Math.pow(d.h,3)/36,
    Iy_c: d => Math.pow(d.b,3)*d.h/36,
    Ixy_c: d => +Math.pow(d.b,2)*Math.pow(d.h,2)/72,   // POSITIVE sign
    bounds: d => ({left:-2*d.b/3, right:d.b/3, bottom:-d.h/3, top:2*d.h/3}),
    anchors: ['C','BL','BR','TR'],
    anchorOffset: (d,a) => {
      if(a==='C')  return {dx:0,        dy:0};
      if(a==='BL') return {dx:-2*d.b/3, dy:-d.h/3};
      if(a==='BR') return {dx:d.b/3,    dy:-d.h/3};
      if(a==='TR') return {dx:d.b/3,    dy:2*d.h/3};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      // Right angle at bottom-RIGHT: BL(−2b/3,−h/3), BR(b/3,−h/3), TR(b/3,2h/3)
      ctx.moveTo(-2*d.b/3, -d.h/3);
      ctx.lineTo(d.b/3,    -d.h/3);
      ctx.lineTo(d.b/3,    2*d.h/3);
      ctx.closePath();
    }
  },
  circle: {
    name:'Círculo',
    dims:[{id:'r',label:'Radio (R)',def:50}],
    area: d => Math.PI*d.r*d.r,
    Ix_c: d => Math.PI*Math.pow(d.r,4)/4,
    Iy_c: d => Math.PI*Math.pow(d.r,4)/4,
    Ixy_c: d => 0,
    bounds: d => ({left:-d.r,right:d.r,bottom:-d.r,top:d.r}),
    anchors: ['C'],
    anchorOffset: () => ({dx:0,dy:0}),
    draw: (ctx,d) => { ctx.arc(0,0,d.r,0,2*Math.PI); }
  },
  semicircle: {
    name:'Semicírculo',
    dims:[{id:'r',label:'Radio (R)',def:50}],
    area: d => 0.5*Math.PI*d.r*d.r,
    Ix_c: d => (Math.PI/8 - 8/(9*Math.PI))*Math.pow(d.r,4),
    Iy_c: d => Math.PI*Math.pow(d.r,4)/8,
    Ixy_c: d => 0,
    bounds: d => { const yc=4*d.r/(3*Math.PI); return {left:-d.r,right:d.r,bottom:-yc,top:d.r-yc}; },
    // BM = midpoint of flat base = most natural reference for these problems
    // Default anchor is BM: user inputs WHERE the flat base center is
    // centroid G is automatically computed as BM + (0, yc) when rotation=0
    anchors: ['BM','C','BL','BR'],
    defaultAnchor: 'BM',
    anchorOffset: (d,a) => {
      const yc=4*d.r/(3*Math.PI);
      if(a==='BM') return {dx:0,    dy:-yc};  // center of flat base
      if(a==='C')  return {dx:0,    dy:0};
      if(a==='BL') return {dx:-d.r, dy:-yc};
      if(a==='BR') return {dx:d.r,  dy:-yc};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      // Draw the UPPER semicircle so the flat base is at the bottom, the dome
      // points up, and the centroid G lies inside the filled area (consistent
      // with bounds(): v spans [-yc, r-yc], and centroid at v=0 is inside).
      // Local drawing coords are math-like (Y up) because of ctx.scale(vS,-vS).
      // The arc is parametrized P(θ)=(r·cosθ, -yc + r·sinθ). The UPPER half needs
      // θ∈[0,π] (sinθ≥0). Sweeping π→0 with anticlockwise=TRUE passes through
      // θ=π/2 (the top, at v=r-yc). Without the flag it would sweep the long way
      // through θ=3π/2 and trace the LOWER half (dome down) — the previous bug.
      const yc = 4*d.r/(3*Math.PI);
      ctx.moveTo(-d.r, -yc);                     // left base endpoint (θ=π)
      ctx.arc(0, -yc, d.r, Math.PI, 0, true);    // upper arc: left→top→right
      ctx.lineTo(d.r, -yc);                      // right endpoint (θ=0, explicit)
      ctx.closePath();                           // flat base line right→left
    }
  },
  quarter: {
    name:'Cuarto Círculo',
    dims:[{id:'r',label:'Radio (R)',def:50}],
    area: d => 0.25*Math.PI*d.r*d.r,
    Ix_c: d => 0.0549*Math.pow(d.r,4),
    Iy_c: d => 0.0549*Math.pow(d.r,4),
    Ixy_c: d => -0.01647*Math.pow(d.r,4),
    bounds: d => { const dc=4*d.r/(3*Math.PI); return {left:-dc,right:d.r-dc,bottom:-dc,top:d.r-dc}; },
    anchors: ['C','O','E1','E2'],
    anchorOffset: (d,a) => {
      const dc=4*d.r/(3*Math.PI);
      if(a==='C')  return {dx:0,      dy:0};
      if(a==='O')  return {dx:-dc,    dy:-dc};
      if(a==='E1') return {dx:d.r-dc, dy:-dc};
      if(a==='E2') return {dx:-dc,    dy:d.r-dc};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      // Quarter disk in the FIRST quadrant relative to the right-angle corner
      // O=(-dc,-dc), so the centroid G=(0,0) lies INSIDE (consistent with bounds()
      // right/top = R-dc and anchorOffset for E1/E2). Sweep θ∈[0, π/2]: from
      // (Ox+R, Oy) [right of O] through the outer corner up to (Ox, Oy+R) [above O].
      // The previous code swept θ∈[-π/2,0] (fourth quadrant, below O), which drew the
      // quarter down-right of O and left the centroid — and E1/E2 — outside the shape.
      const dc=4*d.r/(3*Math.PI);
      ctx.moveTo(-dc,-dc);                     // right-angle corner O
      ctx.arc(-dc,-dc,d.r,0,Math.PI/2,false);  // outer arc, first quadrant (θ:0→π/2)
      ctx.lineTo(-dc,-dc);                     // left edge back to O
      ctx.closePath();                         // bottom edge O→(Ox+R,Oy) closes it
    }
  },
  sector: {
    name:'Sector Circular',
    dims:[{id:'r',label:'Radio (R)',def:60},{id:'alpha',label:'Semiángulo θ (°)',def:30}],
    area: d => { const t=d.alpha*Math.PI/180; return t*d.r*d.r; },
    Ix_c: d => { const t=d.alpha*Math.PI/180,R=d.r; return R*R*R*R/4*(t-0.5*Math.sin(2*t)); },
    Iy_c: d => {
      const t=d.alpha*Math.PI/180,R=d.r;
      const Iy_O=R*R*R*R/4*(t+0.5*Math.sin(2*t));
      const A=t*R*R,xbar=2*R*Math.sin(t)/(3*t);
      return Iy_O-A*xbar*xbar;
    },
    Ixy_c: d => 0,
    bounds: d => {
      const t = d.alpha*Math.PI/180, R = d.r;
      const yc = 2*R*Math.sin(t)/(3*t);          // vértice en (0, −yc)
      // Ancho: los extremos del arco, salvo que el sector pase de 90° por lado,
      // en cuyo caso el punto más ancho es el propio radio.
      const semiAncho = (t >= Math.PI/2) ? R : R*Math.sin(t);
      // Alto: arriba siempre el punto medio del arco (R − yc); abajo, el
      // vértice o el extremo del arco si el sector es obtuso.
      const abajo = Math.min(-yc, R*Math.cos(t) - yc);
      return {left:-semiAncho, right:semiAncho, bottom:abajo, top:R - yc};
    },
    anchors: ['C','O','E1','E2'],
    anchorOffset: (d,ak) => {
      const t=d.alpha*Math.PI/180,R=d.r,yc=2*R*Math.sin(t)/(3*t);
      if(ak==='C')  return {dx:0,             dy:0};
      if(ak==='O')  return {dx:0,             dy:-yc};
      if(ak==='E1') return {dx:-R*Math.sin(t),dy:R*Math.cos(t)-yc};
      if(ak==='E2') return {dx:R*Math.sin(t), dy:R*Math.cos(t)-yc};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      const t=d.alpha*Math.PI/180,R=d.r,yc=2*R*Math.sin(t)/(3*t);
      ctx.moveTo(0,-yc);
      ctx.lineTo(-R*Math.sin(t),R*Math.cos(t)-yc);
      ctx.arc(0,-yc,R,Math.PI/2+t,Math.PI/2-t,true);
      ctx.closePath();
    }
  },

  // ── Cuatro figuras nuevas para FIG_DEFS (centroide y momentos-de-inercia) ──
  // Marco local: el CENTROIDE G está en (0,0), como en las demás figuras; bounds
  // y draw se escriben respecto de G, y el lienzo dibuja con Y hacia arriba.
  // Fórmulas verificadas por integración numérica de la propia región (2026-09-15):
  // error < 1e-11 en las polinómicas y < 1e-6 en las elípticas.
  //
  //  parabola      base b, altura h   A=2bh/3     ȳ=2h/5 (desde la base)
  //                Ix_c=8bh³/175      Iy_c=b³h/30     Ixy_c=0
  //  semiparabola  base a, altura h   A=2ah/3     x̄=3a/8   ȳ=2h/5 (desde O)
  //                Ix_c=8ah³/175      Iy_c=19a³h/480  Ixy_c=−a²h²/60
  //  enjuta        base a, altura h   A=ah/3      x̄=3a/4   ȳ=3h/10 (desde O)
  //                Ix_c=37ah³/2100    Iy_c=a³h/80     Ixy_c=+a²h²/120
  //  cuartoelipse  semiejes a, b      A=πab/4     x̄=4a/3π  ȳ=4b/3π (desde O)
  //                Ix_c=ab³(π/16−4/9π)  Iy_c=a³b(π/16−4/9π)  Ixy_c=a²b²(1/8−4/9π)

  parabola: {
    name:'Parábola',
    dims:[{id:'b',label:'Base (b)',def:80},{id:'h',label:'Altura (h)',def:50}],
    area: d => 2*d.b*d.h/3,
    Ix_c: d => 8*d.b*Math.pow(d.h,3)/175,
    Iy_c: d => Math.pow(d.b,3)*d.h/30,
    Ixy_c: d => 0,                                  // eje vertical de simetría
    bounds: d => ({left:-d.b/2, right:d.b/2, bottom:-2*d.h/5, top:3*d.h/5}),
    anchors: ['BM','C','BL','BR','V'],
    defaultAnchor: 'BM',
    anchorOffset: (d,a) => {
      const yb = -2*d.h/5;                          // base, medida desde G
      if(a==='BM') return {dx:0,       dy:yb};      // centro de la base
      if(a==='C')  return {dx:0,       dy:0};       // centroide
      if(a==='BL') return {dx:-d.b/2,  dy:yb};
      if(a==='BR') return {dx:d.b/2,   dy:yb};
      if(a==='V')  return {dx:0,       dy:3*d.h/5}; // vértice
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      // y = h(1 − (2x/b)²). Una Bézier cuadrática con el control a 2h sobre la
      // base reproduce EXACTAMENTE esa parábola (no es una aproximación).
      const yb = -2*d.h/5, a = d.b/2;
      ctx.moveTo(-a, yb);
      ctx.quadraticCurveTo(0, yb + 2*d.h, a, yb);
      ctx.closePath();
    }
  },
  semiparabola: {
    name:'Media parábola',
    dims:[{id:'a',label:'Base (a)',def:60},{id:'h',label:'Altura (h)',def:50}],
    area: d => 2*d.a*d.h/3,
    Ix_c: d => 8*d.a*Math.pow(d.h,3)/175,
    Iy_c: d => 19*Math.pow(d.a,3)*d.h/480,
    Ixy_c: d => -Math.pow(d.a,2)*Math.pow(d.h,2)/60,
    bounds: d => ({left:-3*d.a/8, right:5*d.a/8, bottom:-2*d.h/5, top:3*d.h/5}),
    anchors: ['O','C','BR','V'],
    defaultAnchor: 'O',
    anchorOffset: (d,k) => {
      const ox = -3*d.a/8, oy = -2*d.h/5;           // esquina recta O, desde G
      if(k==='O')  return {dx:ox,        dy:oy};    // base × lado vertical
      if(k==='C')  return {dx:0,         dy:0};
      if(k==='BR') return {dx:ox + d.a,  dy:oy};    // final de la base
      if(k==='V')  return {dx:ox,        dy:oy+d.h};// vértice, sobre el lado recto
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      // Lado vertical en x=0, base en y=0 y la parábola y=h(1−x²/a²) bajando de
      // (0,h) a (a,0). Tangentes: horizontal en el vértice y −2h/a en la base;
      // se cortan en (a/2, h), que es el control exacto de la Bézier.
      const ox = -3*d.a/8, oy = -2*d.h/5;
      ctx.moveTo(ox, oy);                            // O
      ctx.lineTo(ox + d.a, oy);                      // base
      ctx.quadraticCurveTo(ox + d.a/2, oy + d.h, ox, oy + d.h);
      ctx.closePath();                               // lado vertical de vuelta a O
    }
  },
  enjuta: {
    name:'Media parábola complementaria',
    dims:[{id:'a',label:'Base (a)',def:60},{id:'h',label:'Altura (h)',def:50}],
    area: d => d.a*d.h/3,
    Ix_c: d => 37*d.a*Math.pow(d.h,3)/2100,
    Iy_c: d => Math.pow(d.a,3)*d.h/80,
    Ixy_c: d => Math.pow(d.a,2)*Math.pow(d.h,2)/120,
    bounds: d => ({left:-3*d.a/4, right:d.a/4, bottom:-3*d.h/10, top:7*d.h/10}),
    anchors: ['O','C','BR','TR'],
    defaultAnchor: 'O',
    anchorOffset: (d,k) => {
      const ox = -3*d.a/4, oy = -3*d.h/10;           // vértice O (curva tangente)
      if(k==='O')  return {dx:ox,       dy:oy};
      if(k==='C')  return {dx:0,        dy:0};
      if(k==='BR') return {dx:ox+d.a,   dy:oy};      // esquina inferior derecha
      if(k==='TR') return {dx:ox+d.a,   dy:oy+d.h};  // esquina superior derecha
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      // y = h x²/a², de (0,0) a (a,h); lado vertical derecho y base de vuelta.
      // Tangentes: horizontal en O y 2h/a en (a,h); se cortan en (a/2, 0).
      const ox = -3*d.a/4, oy = -3*d.h/10;
      ctx.moveTo(ox, oy);                            // O, donde la curva es tangente
      ctx.quadraticCurveTo(ox + d.a/2, oy, ox + d.a, oy + d.h);
      ctx.lineTo(ox + d.a, oy);                      // lado vertical derecho
      ctx.closePath();                               // base de vuelta a O
    }
  },
  cuartoelipse: {
    name:'Cuarto de Elipse',
    dims:[{id:'a',label:'Semieje horizontal (a)',def:70},{id:'b',label:'Semieje vertical (b)',def:45}],
    area: d => Math.PI*d.a*d.b/4,
    Ix_c: d => d.a*Math.pow(d.b,3)*(Math.PI/16 - 4/(9*Math.PI)),
    Iy_c: d => Math.pow(d.a,3)*d.b*(Math.PI/16 - 4/(9*Math.PI)),
    Ixy_c: d => Math.pow(d.a,2)*Math.pow(d.b,2)*(1/8 - 4/(9*Math.PI)),
    bounds: d => {
      const dx = 4*d.a/(3*Math.PI), dy = 4*d.b/(3*Math.PI);
      return {left:-dx, right:d.a-dx, bottom:-dy, top:d.b-dy};
    },
    anchors: ['C','O','E1','E2'],
    anchorOffset: (d,k) => {
      const dx = 4*d.a/(3*Math.PI), dy = 4*d.b/(3*Math.PI);
      if(k==='C')  return {dx:0,        dy:0};
      if(k==='O')  return {dx:-dx,      dy:-dy};     // esquina del ángulo recto
      if(k==='E1') return {dx:d.a-dx,   dy:-dy};     // extremo del semieje a
      if(k==='E2') return {dx:-dx,      dy:d.b-dy};  // extremo del semieje b
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      // Mismo cuadrante y mismo sentido que `quarter`, pero con dos semiejes.
      const dx = 4*d.a/(3*Math.PI), dy = 4*d.b/(3*Math.PI);
      ctx.moveTo(-dx, -dy);                          // O
      ctx.ellipse(-dx, -dy, d.a, d.b, 0, 0, Math.PI/2, false);
      ctx.lineTo(-dx, -dy);
      ctx.closePath();
    }
  },
// ══ Entradas de FIG_DEFS ══════════════════════════════════════════════════
// Fórmulas verificadas (2026-09-15): las poligonales contra la fórmula exacta
// de polígono, y esta contra integración numérica; el segmento circular por
// integración en seis aperturas de 40° a 332° (a 180° reproduce el
// semicírculo); elipse y semielipse por integración.

  elipse: {
    name:'Elipse',
    dims:[{id:'a',label:'Semieje horizontal (a)',def:70},{id:'b',label:'Semieje vertical (b)',def:45}],
    area: d => Math.PI*d.a*d.b,
    Ix_c: d => Math.PI*d.a*Math.pow(d.b,3)/4,
    Iy_c: d => Math.PI*Math.pow(d.a,3)*d.b/4,
    Ixy_c: d => 0,                                   // dos ejes de simetría
    bounds: d => ({left:-d.a, right:d.a, bottom:-d.b, top:d.b}),
    anchors: ['C','E1','E2'],
    anchorOffset: (d,k) => {
      if(k==='E1') return {dx:d.a, dy:0};            // extremo del semieje a
      if(k==='E2') return {dx:0,   dy:d.b};          // extremo del semieje b
      return {dx:0, dy:0};
    },
    draw: (ctx,d) => { ctx.ellipse(0, 0, d.a, d.b, 0, 0, 2*Math.PI); ctx.closePath(); }
  },
  semielipse: {
    name:'Semielipse',
    dims:[{id:'a',label:'Semieje horizontal (a)',def:70},{id:'b',label:'Altura (b)',def:45}],
    area: d => Math.PI*d.a*d.b/2,
    Ix_c: d => d.a*Math.pow(d.b,3)*(Math.PI/8 - 8/(9*Math.PI)),
    Iy_c: d => Math.PI*Math.pow(d.a,3)*d.b/8,
    Ixy_c: d => 0,                                   // simétrica respecto de y
    bounds: d => { const yc = 4*d.b/(3*Math.PI); return {left:-d.a, right:d.a, bottom:-yc, top:d.b - yc}; },
    anchors: ['BM','C','BL','BR'],
    defaultAnchor: 'BM',
    anchorOffset: (d,k) => {
      const yc = 4*d.b/(3*Math.PI);
      if(k==='BM') return {dx:0,     dy:-yc};        // centro de la base plana
      if(k==='C')  return {dx:0,     dy:0};
      if(k==='BL') return {dx:-d.a,  dy:-yc};
      if(k==='BR') return {dx:d.a,   dy:-yc};
      return {dx:0, dy:0};
    },
    draw: (ctx,d) => {
      // Mitad SUPERIOR, con la base plana abajo: el mismo barrido que el
      // semicírculo (de π a 0 en sentido antihorario sobre el lienzo, que
      // tiene la Y invertida), pero con dos semiejes.
      const yc = 4*d.b/(3*Math.PI);
      ctx.moveTo(-d.a, -yc);
      ctx.ellipse(0, -yc, d.a, d.b, 0, Math.PI, 0, true);
      ctx.lineTo(d.a, -yc);
      ctx.closePath();
    }
  },
  segmento: {
    name:'Segmento Circular',
    dims:[{id:'r',label:'Radio (R)',def:60},{id:'alpha',label:'Semiángulo θ (°)',def:60}],
    // Con θ en RADIANES: A = R²(θ − senθ·cosθ). El centroide queda sobre el
    // centro del círculo, a yO = 2R·sen³θ / (3(θ − senθ·cosθ)).
    area: d => { const t = d.alpha*Math.PI/180; return d.r*d.r*(t - Math.sin(t)*Math.cos(t)); },
    Ix_c: d => {
      const t = d.alpha*Math.PI/180, R = d.r, s = Math.sin(t), c = Math.cos(t);
      const A = R*R*(t - s*c), yO = 2*R*Math.pow(s,3)/(3*(t - s*c));
      return Math.pow(R,4)/4*(t - s*c + 2*Math.pow(s,3)*c) - A*yO*yO;
    },
    Iy_c: d => {
      const t = d.alpha*Math.PI/180, R = d.r, s = Math.sin(t), c = Math.cos(t);
      return Math.pow(R,4)/12*(3*t - 3*s*c - 2*Math.pow(s,3)*c);
    },
    Ixy_c: d => 0,                                   // simétrico respecto de y
    bounds: d => {
      const t = d.alpha*Math.PI/180, R = d.r, s = Math.sin(t), c = Math.cos(t);
      const yO = 2*R*Math.pow(s,3)/(3*(t - s*c));
      const semiAncho = (t >= Math.PI/2) ? R : R*s;  // pasado el cuarto, manda el radio
      return {left:-semiAncho, right:semiAncho, bottom:R*c - yO, top:R - yO};
    },
    anchors: ['M','C','E1','E2','V'],
    defaultAnchor: 'M',
    anchorOffset: (d,k) => {
      const t = d.alpha*Math.PI/180, R = d.r, s = Math.sin(t), c = Math.cos(t);
      const yO = 2*R*Math.pow(s,3)/(3*(t - s*c));
      if(k==='M')  return {dx:0,     dy:R*c - yO};   // punto medio de la cuerda
      if(k==='C')  return {dx:0,     dy:0};
      if(k==='E1') return {dx:-R*s,  dy:R*c - yO};   // extremo izquierdo de la cuerda
      if(k==='E2') return {dx:R*s,   dy:R*c - yO};   // extremo derecho
      if(k==='V')  return {dx:0,     dy:R - yO};     // punto más alto del arco
      return {dx:0, dy:0};
    },
    draw: (ctx,d) => {
      // Arco de extremo a extremo de la cuerda pasando por lo alto; la cuerda
      // cierra la figura. Mismo criterio de barrido que el sector circular.
      const t = d.alpha*Math.PI/180, R = d.r, s = Math.sin(t), c = Math.cos(t);
      const yO = 2*R*Math.pow(s,3)/(3*(t - s*c));
      ctx.moveTo(-R*s, R*c - yO);
      ctx.arc(0, -yO, R, Math.PI/2 + t, Math.PI/2 - t, true);
      ctx.closePath();
    }
  },
  trapecio: {
    name:'Trapecio',
    dims:[{id:'a',label:'Base mayor (a)',def:100},{id:'b',label:'Base menor (b)',def:55},
          {id:'h',label:'Altura (h)',def:60},{id:'dx',label:'Desplazamiento de la base menor',def:22}],
    area: d => (d.a + d.b)*d.h/2,
    Ix_c: d => Math.pow(d.h,3)*(d.a*d.a + 4*d.a*d.b + d.b*d.b)/(36*(d.a + d.b)),
    Iy_c: d => _propsPoli(_vTrapecio(d)).Iy,         // exacto, por polígono
    Ixy_c: d => _propsPoli(_vTrapecio(d)).Ixy,       // 0 solo si es isósceles
    bounds: d => _boundsPoli(_poliLocal(_vTrapecio(d))),
    anchors: ['BL','C','BR','TL','TR'],
    defaultAnchor: 'BL',
    anchorOffset: (d,k) => {
      const q = _propsPoli(_vTrapecio(d));
      const en = (x,y) => ({dx:x - q.cx, dy:y - q.cy});
      if(k==='BL') return en(0, 0);                  // izquierda de la base mayor
      if(k==='C')  return {dx:0, dy:0};
      if(k==='BR') return en(d.a, 0);
      if(k==='TL') return en(d.dx, d.h);             // izquierda de la base menor
      if(k==='TR') return en(d.dx + d.b, d.h);
      return {dx:0, dy:0};
    },
    draw: (ctx,d) => _dibujarPoli(ctx, _poliLocal(_vTrapecio(d)))
  },
  triangulo: {
    name:'Triángulo',
    dims:[{id:'b',label:'Base (b)',def:100},{id:'h',label:'Altura (h)',def:70},
          {id:'d',label:'Vértice desde la izquierda (d)',def:50}],
    area: d => d.b*d.h/2,
    Ix_c: d => d.b*Math.pow(d.h,3)/36,
    Iy_c: d => d.b*d.h*(d.b*d.b - d.b*d.d + d.d*d.d)/36,
    Ixy_c: d => d.b*d.h*d.h*(2*d.d - d.b)/72,        // 0 solo con el vértice centrado
    bounds: d => _boundsPoli(_poliLocal(_vTriangulo(d))),
    anchors: ['BL','C','BR','V'],
    defaultAnchor: 'BL',
    anchorOffset: (d,k) => {
      const q = _propsPoli(_vTriangulo(d));
      const en = (x,y) => ({dx:x - q.cx, dy:y - q.cy});
      if(k==='BL') return en(0, 0);
      if(k==='C')  return {dx:0, dy:0};
      if(k==='BR') return en(d.b, 0);
      if(k==='V')  return en(d.d, d.h);              // vértice opuesto a la base
      return {dx:0, dy:0};
    },
    draw: (ctx,d) => _dibujarPoli(ctx, _poliLocal(_vTriangulo(d)))
  },
  hexagono: {
    name:'Hexágono',
    dims:[{id:'r',label:'Radio circunscrito (R)',def:55}],
    // Polígono regular de n lados: A = (n/2)R²·sen(2π/n), lado L = 2R·sen(π/n)
    // y CUALQUIER eje por el centroide da I = A(6R² − L²)/24, con Ixy = 0.
    // Para n = 6 eso es A = 3√3R²/2 e I = 5√3R⁴/16.
    area: d => 3*Math.sqrt(3)/2*d.r*d.r,
    Ix_c: d => 5*Math.sqrt(3)/16*Math.pow(d.r,4),
    Iy_c: d => 5*Math.sqrt(3)/16*Math.pow(d.r,4),
    Ixy_c: d => 0,
    bounds: d => _boundsPoli(_vPoliReg(6, d.r, 0)),
    anchors: ['C','E1','BM'],
    anchorOffset: (d,k) => {
      if(k==='E1') return {dx:d.r, dy:0};                    // vértice derecho
      if(k==='BM') return {dx:0,   dy:-d.r*Math.sqrt(3)/2};  // medio del lado inferior
      return {dx:0, dy:0};
    },
    draw: (ctx,d) => _dibujarPoli(ctx, _vPoliReg(6, d.r, 0))
  },
  octogono: {
    name:'Octógono',
    dims:[{id:'r',label:'Radio circunscrito (R)',def:55}],
    // n = 8: A = 2√2R², y la misma I = A(6R² − L²)/24 con L = 2R·sen(π/8).
    area: d => 2*Math.sqrt(2)*d.r*d.r,
    Ix_c: d => { const R = d.r, A = 2*Math.sqrt(2)*R*R, L = 2*R*Math.sin(Math.PI/8); return A*(6*R*R - L*L)/24; },
    Iy_c: d => { const R = d.r, A = 2*Math.sqrt(2)*R*R, L = 2*R*Math.sin(Math.PI/8); return A*(6*R*R - L*L)/24; },
    Ixy_c: d => 0,
    bounds: d => _boundsPoli(_vPoliReg(8, d.r, Math.PI/8)),
    anchors: ['C','E1','BM'],
    anchorOffset: (d,k) => {
      if(k==='E1') return {dx:d.r*Math.cos(Math.PI/8), dy:d.r*Math.sin(Math.PI/8)};  // vértice derecho
      if(k==='BM') return {dx:0, dy:-d.r*Math.cos(Math.PI/8)};                       // medio del lado inferior
      return {dx:0, dy:0};
    },
    draw: (ctx,d) => _dibujarPoli(ctx, _vPoliReg(8, d.r, Math.PI/8))
  },

  // ── Perfiles laminados de acero (llegan solo desde el catálogo) ──────
  // Mismas definiciones que en momentos-de-inercia: la geometría idealizada
  // sirve para dibujar y colocar el perfil; el área y la posición del
  // centroide que entran en el cálculo son los TABULADOS (figArea, dims.xb/yb).
  wshape: {
    name:'Perfil W / S',
    dims:[{id:'d',label:'Peralte (d)',def:300},{id:'bf',label:'Ancho de ala (bf)',def:150},
          {id:'tf',label:'Espesor de ala (tf)',def:12},{id:'tw',label:'Espesor de alma (tw)',def:8}],
    area: d => 2*d.bf*d.tf + (d.d-2*d.tf)*d.tw,
    Ix_c: d => (d.bf*Math.pow(d.d,3) - (d.bf-d.tw)*Math.pow(d.d-2*d.tf,3))/12,
    Iy_c: d => (2*d.tf*Math.pow(d.bf,3) + (d.d-2*d.tf)*Math.pow(d.tw,3))/12,
    Ixy_c: d => 0,
    bounds: d => ({left:-d.bf/2,right:d.bf/2,bottom:-d.d/2,top:d.d/2}),
    anchors: ['C','TL','TR','BL','BR'],
    anchorOffset: (d,a) => {
      if(a==='TL') return {dx:-d.bf/2, dy:d.d/2};
      if(a==='TR') return {dx:d.bf/2,  dy:d.d/2};
      if(a==='BL') return {dx:-d.bf/2, dy:-d.d/2};
      if(a==='BR') return {dx:d.bf/2,  dy:-d.d/2};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      const B=d.bf/2, H=d.d/2, w=d.tw/2, hi=d.d/2-d.tf;
      ctx.moveTo(-B,H); ctx.lineTo(B,H); ctx.lineTo(B,hi); ctx.lineTo(w,hi);
      ctx.lineTo(w,-hi); ctx.lineTo(B,-hi); ctx.lineTo(B,-H); ctx.lineTo(-B,-H);
      ctx.lineTo(-B,-hi); ctx.lineTo(-w,-hi); ctx.lineTo(-w,hi); ctx.lineTo(-B,hi);
      ctx.closePath();
    }
  },
  channel: {
    name:'Canal C',
    dims:[{id:'d',label:'Peralte (d)',def:300},{id:'bf',label:'Ancho de ala (bf)',def:80},
          {id:'tf',label:'Espesor de ala (tf)',def:12},{id:'tw',label:'Espesor de alma (tw)',def:8}],
    area: d => d.d*d.tw + 2*(d.bf-d.tw)*d.tf,
    // x̄ desde el respaldo del alma: el tabulado si viene del catálogo.
    _xbar: d => {
      if(isFinite(d.xb)) return d.xb;
      const a1=d.d*d.tw, a2=(d.bf-d.tw)*d.tf;
      return (a1*(d.tw/2) + 2*a2*(d.tw+(d.bf-d.tw)/2)) / (a1+2*a2);
    },
    Ix_c: d => {
      const alma=d.tw*Math.pow(d.d,3)/12;
      const af=(d.bf-d.tw)*d.tf, yf=(d.d-d.tf)/2;
      return alma + 2*((d.bf-d.tw)*Math.pow(d.tf,3)/12 + af*yf*yf);
    },
    Iy_c: d => {
      const xb=FIG_DEFS.channel._xbar(d);
      const a1=d.d*d.tw, d1=d.tw/2-xb;
      const a2=(d.bf-d.tw)*d.tf, d2=d.tw+(d.bf-d.tw)/2-xb;
      return (d.d*Math.pow(d.tw,3)/12 + a1*d1*d1)
           + 2*(d.tf*Math.pow(d.bf-d.tw,3)/12 + a2*d2*d2);
    },
    Ixy_c: d => 0,
    bounds: d => { const xb=FIG_DEFS.channel._xbar(d);
      return {left:-xb, right:d.bf-xb, bottom:-d.d/2, top:d.d/2}; },
    anchors: ['C','TL','TR','BL','BR'],
    anchorOffset: (d,a) => { const b=FIG_DEFS.channel.bounds(d);
      if(a==='TL') return {dx:b.left, dy:b.top};
      if(a==='TR') return {dx:b.right,dy:b.top};
      if(a==='BL') return {dx:b.left, dy:b.bottom};
      if(a==='BR') return {dx:b.right,dy:b.bottom};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => {
      const xb=FIG_DEFS.channel._xbar(d), H=d.d/2;
      const x0=-xb, x1=d.bf-xb, w=x0+d.tw, hi=H-d.tf;
      ctx.moveTo(x0,H); ctx.lineTo(x1,H); ctx.lineTo(x1,hi); ctx.lineTo(w,hi);
      ctx.lineTo(w,-hi); ctx.lineTo(x1,-hi); ctx.lineTo(x1,-H); ctx.lineTo(x0,-H);
      ctx.closePath();
    }
  },
  angleL: {
    name:'Ángulo L',
    dims:[{id:'b1',label:'Lado horizontal (b₁)',def:100},{id:'b2',label:'Lado vertical (b₂)',def:100},
          {id:'t',label:'Espesor (t)',def:10}],
    // Centroide medido desde el vértice: el tabulado (d.xb, d.yb) si viene del
    // catálogo; si no, el de las dos alas rectangulares.
    _c: d => {
      const a1=d.t*d.b2,            x1=d.t/2,            y1=d.b2/2;
      const a2=(d.b1-d.t)*d.t,      x2=d.t+(d.b1-d.t)/2, y2=d.t/2;
      const A=a1+a2;
      return {a1,x1,y1,a2,x2,y2,A,
              xb: isFinite(d.xb) ? d.xb : (a1*x1+a2*x2)/A,
              yb: isFinite(d.yb) ? d.yb : (a1*y1+a2*y2)/A};
    },
    area: d => d.t*d.b2 + (d.b1-d.t)*d.t,
    Ix_c: d => { const c=FIG_DEFS.angleL._c(d);
      return (d.t*Math.pow(d.b2,3)/12 + c.a1*Math.pow(c.y1-c.yb,2))
           + ((d.b1-d.t)*Math.pow(d.t,3)/12 + c.a2*Math.pow(c.y2-c.yb,2)); },
    Iy_c: d => { const c=FIG_DEFS.angleL._c(d);
      return (d.b2*Math.pow(d.t,3)/12 + c.a1*Math.pow(c.x1-c.xb,2))
           + (d.t*Math.pow(d.b1-d.t,3)/12 + c.a2*Math.pow(c.x2-c.xb,2)); },
    Ixy_c: d => { const c=FIG_DEFS.angleL._c(d);
      return c.a1*(c.x1-c.xb)*(c.y1-c.yb) + c.a2*(c.x2-c.xb)*(c.y2-c.yb); },
    bounds: d => { const c=FIG_DEFS.angleL._c(d);
      return {left:-c.xb, right:d.b1-c.xb, bottom:-c.yb, top:d.b2-c.yb}; },
    anchors: ['C','BL','BR','TL'],
    anchorOffset: (d,a) => { const b=FIG_DEFS.angleL.bounds(d);
      if(a==='BL') return {dx:b.left, dy:b.bottom};
      if(a==='BR') return {dx:b.right,dy:b.bottom};
      if(a==='TL') return {dx:b.left, dy:b.top};
      return {dx:0,dy:0};
    },
    draw: (ctx,d) => { const c=FIG_DEFS.angleL._c(d);
      const x0=-c.xb, y0=-c.yb;
      ctx.moveTo(x0,y0); ctx.lineTo(x0+d.b1,y0); ctx.lineTo(x0+d.b1,y0+d.t);
      ctx.lineTo(x0+d.t,y0+d.t); ctx.lineTo(x0+d.t,y0+d.b2); ctx.lineTo(x0,y0+d.b2);
      ctx.closePath();
    }
  }
};


const ANCHOR_LABELS = {
  C:'Centroide', TL:'Esq.↖', TR:'Esq.↗', BL:'Esq.↙', BR:'Esq.↘',
  TOP:'Cima', BM:'Base', O:'Origen(90°)', E1:'Ext. Horiz', E2:'Ext. Vert',
  V:'Vértice', M:'Medio de la cuerda'
};
