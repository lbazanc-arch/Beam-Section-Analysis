// ═══════════════════════════════════════════════════════════
//  FIGURE DEFINITIONS
// ═══════════════════════════════════════════════════════════

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
  }
};


const ANCHOR_LABELS = {
  C:'Centroide', TL:'Esq.↖', TR:'Esq.↗', BL:'Esq.↙', BR:'Esq.↘',
  TOP:'Cima', BM:'Base', O:'Origen(90°)', E1:'Ext. Horiz', E2:'Ext. Vert'
};
