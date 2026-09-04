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
  TOP:'Cima', BM:'Base', O:'Origen(90°)', E1:'Ext. Horiz', E2:'Ext. Vert'
};
