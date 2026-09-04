// ═══════════════════════════════════════════════════════════
//  SÓLIDOS 3D — catálogo (modo «Cuerpo sólido»)
// ═══════════════════════════════════════════════════════════
// Mismo contrato de idea que FIG_DEFS, pero para sólidos con eje vertical
// (Hibbeler §9.2, tabla de centroides de la contraportada). Cada sólido se
// coloca por el CENTRO DE SU BASE (ancla BM) y guarda en cx, cy, cz la
// posición de su CENTROIDE, igual que las figuras planas guardan el suyo.
//
// Marco LOCAL de un sólido: origen en el centro de su base, z hacia arriba.
// Dos ajustes lo colocan en el mundo:
//   · fig.rotation  giro α (°, antihorario en planta) alrededor de su eje
//                   vertical; solo se nota en los poliedros.
//   · fig.volteado  base arriba: el sólido cuelga por debajo del punto donde
//                   se colocó (z local cambiada de signo). Sirve para una
//                   semiesfera o un cono con la punta hacia abajo.
//
//   dims          medidas (ids: a, b, h, r, r2, L)
//   volume(d)     volumen
//   cBase(d)      altura del centroide sobre el centro de la base (sobre el eje)
//   cLocal(d)     (solo si el centroide NO está sobre el eje de la base, como
//                 en la cuña) {x, z} del centroide desde el centro de la base
//   altura(d)     altura total; topLocal(d) {x,z} del ancla TOP si no es (0,h)
//   bounds3(d)    caja respecto del centroide, sin giro ni volteo:
//                 {left,right, back,front, bottom,top}
//   vertices(d)   (poliedros) vértices [x,y,z] desde el centro de la base;
//                 aristas(): pares de índices, para la isométrica
//   drawPlanta    contorno en planta (x, y) en coordenadas locales relativas
//   drawAlzado    al centroide (sólidos de revolución; los poliedros se
//                 proyectan desde sus vértices)
//   perfil(d)     (revolución) muestras {r, z} del meridiano, z desde la base
//   pappus(d)     (revolución) área generatriz A y distancia r de su centroide
//                 al eje: V = 2π·r·A (Pappus–Guldinus, 2.º teorema)
//   formula       volumen y centroide en LaTeX/texto; sust(d, D) el volumen
//                 con los números sustituidos
const SOLID_DEFS = {
  s_prisma: {
    name:'Prisma rectangular',
    dims:[{id:'a',label:'Lado en X (a)',def:100},{id:'b',label:'Lado en Y (b)',def:80},{id:'h',label:'Altura (h)',def:120}],
    volume: d => d.a*d.b*d.h,
    cBase:  d => d.h/2,
    altura: d => d.h,
    bounds3: d => { const c=d.h/2; return {left:-d.a/2,right:d.a/2,back:-d.b/2,front:d.b/2,bottom:-c,top:d.h-c}; },
    vertices: d => { const a=d.a/2, b=d.b/2; return [[-a,-b,0],[a,-b,0],[a,b,0],[-a,b,0],[-a,-b,d.h],[a,-b,d.h],[a,b,d.h],[-a,b,d.h]]; },
    aristas: () => [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
    drawPlanta: (ctx,d) => { ctx.rect(-d.a/2,-d.b/2,d.a,d.b); },
    drawAlzado: (ctx,d) => { const c=d.h/2; ctx.rect(-d.a/2,-c,d.a,d.h); },
    formula: {V:'V = a\\,b\\,h', c:'\\bar{z}_{loc} = \\dfrac{h}{2}', txt:'V = a·b·h · centroide a h/2 de la base',
      sust:(d,D)=>'('+D(d.a)+')('+D(d.b)+')('+D(d.h)+')'}
  },
  s_cilindro: {
    name:'Cilindro',
    dims:[{id:'r',label:'Radio (R)',def:50},{id:'h',label:'Altura (h)',def:120}],
    volume: d => Math.PI*d.r*d.r*d.h,
    cBase:  d => d.h/2,
    altura: d => d.h,
    bounds3: d => { const c=d.h/2; return {left:-d.r,right:d.r,back:-d.r,front:d.r,bottom:-c,top:d.h-c}; },
    drawPlanta: (ctx,d) => { ctx.arc(0,0,d.r,0,2*Math.PI); },
    drawAlzado: (ctx,d) => { const c=d.h/2; ctx.rect(-d.r,-c,2*d.r,d.h); },
    perfil: d => [{r:d.r,z:0},{r:d.r,z:d.h}],
    pappus: d => ({A:d.r*d.h, r:d.r/2, texA:'A = R\\,h', texR:'\\bar{r} = \\dfrac{R}{2}',
      sustA:D=>'('+D(d.r)+')('+D(d.h)+')', sustR:D=>'\\dfrac{'+D(d.r)+'}{2}'}),
    rotR: (d,D) => 'R=' + D(d.r),
    formula: {V:'V = \\pi R^{2} h', c:'\\bar{z}_{loc} = \\dfrac{h}{2}', txt:'V = πR²h · centroide a h/2 de la base',
      sust:(d,D)=>'\\pi('+D(d.r)+')^{2}('+D(d.h)+')'}
  },
  s_cono: {
    name:'Cono',
    dims:[{id:'r',label:'Radio de la base (R)',def:50},{id:'h',label:'Altura (h)',def:120}],
    volume: d => Math.PI*d.r*d.r*d.h/3,
    cBase:  d => d.h/4,
    altura: d => d.h,
    bounds3: d => { const c=d.h/4; return {left:-d.r,right:d.r,back:-d.r,front:d.r,bottom:-c,top:d.h-c}; },
    drawPlanta: (ctx,d) => { ctx.arc(0,0,d.r,0,2*Math.PI); },
    drawAlzado: (ctx,d) => { const c=d.h/4; ctx.moveTo(-d.r,-c); ctx.lineTo(d.r,-c); ctx.lineTo(0,d.h-c); ctx.closePath(); },
    perfil: d => [{r:d.r,z:0},{r:0,z:d.h}],
    pappus: d => ({A:d.r*d.h/2, r:d.r/3, texA:'A = \\dfrac{R\\,h}{2}', texR:'\\bar{r} = \\dfrac{R}{3}',
      sustA:D=>'\\dfrac{('+D(d.r)+')('+D(d.h)+')}{2}', sustR:D=>'\\dfrac{'+D(d.r)+'}{3}'}),
    rotR: (d,D) => 'R=' + D(d.r),
    formula: {V:'V = \\dfrac{\\pi R^{2} h}{3}', c:'\\bar{z}_{loc} = \\dfrac{h}{4}', txt:'V = πR²h/3 · centroide a h/4 de la base',
      sust:(d,D)=>'\\dfrac{\\pi('+D(d.r)+')^{2}('+D(d.h)+')}{3}'}
  },
  s_esfera: {
    name:'Esfera',
    dims:[{id:'r',label:'Radio (R)',def:50}],
    volume: d => 4*Math.PI*Math.pow(d.r,3)/3,
    cBase:  d => d.r,
    altura: d => 2*d.r,
    bounds3: d => ({left:-d.r,right:d.r,back:-d.r,front:d.r,bottom:-d.r,top:d.r}),
    drawPlanta: (ctx,d) => { ctx.arc(0,0,d.r,0,2*Math.PI); },
    drawAlzado: (ctx,d) => { ctx.arc(0,0,d.r,0,2*Math.PI); },
    perfil: d => { const p=[]; for(let i=0;i<=16;i++){ const t=Math.PI*i/16; p.push({r:d.r*Math.sin(t), z:d.r-d.r*Math.cos(t)}); } return p; },
    pappus: d => ({A:Math.PI*d.r*d.r/2, r:4*d.r/(3*Math.PI), texA:'A = \\dfrac{\\pi R^{2}}{2}', texR:'\\bar{r} = \\dfrac{4R}{3\\pi}',
      sustA:D=>'\\dfrac{\\pi('+D(d.r)+')^{2}}{2}', sustR:D=>'\\dfrac{4('+D(d.r)+')}{3\\pi}'}),
    rotR: (d,D) => 'R=' + D(d.r),
    formula: {V:'V = \\dfrac{4\\pi R^{3}}{3}', c:'\\bar{z}_{loc} = R', txt:'V = 4πR³/3 · centroide en el centro (a R de la base)',
      sust:(d,D)=>'\\dfrac{4\\pi('+D(d.r)+')^{3}}{3}'}
  },
  s_semiesfera: {
    name:'Semiesfera',
    dims:[{id:'r',label:'Radio (R)',def:50}],
    volume: d => 2*Math.PI*Math.pow(d.r,3)/3,
    cBase:  d => 3*d.r/8,
    altura: d => d.r,
    bounds3: d => { const c=3*d.r/8; return {left:-d.r,right:d.r,back:-d.r,front:d.r,bottom:-c,top:d.r-c}; },
    drawPlanta: (ctx,d) => { ctx.arc(0,0,d.r,0,2*Math.PI); },
    // Cara plana abajo (la base) y la cúpula hacia arriba. El arco se recorre
    // de π a 0 en sentido antihorario para trazar la mitad SUPERIOR, igual
    // que el semicírculo plano de FIG_DEFS.
    drawAlzado: (ctx,d) => { const c=3*d.r/8; ctx.moveTo(-d.r,-c); ctx.arc(0,-c,d.r,Math.PI,0,true); ctx.lineTo(d.r,-c); ctx.closePath(); },
    perfil: d => { const p=[]; for(let i=0;i<=8;i++){ const t=Math.PI/2*i/8; p.push({r:d.r*Math.cos(t), z:d.r*Math.sin(t)}); } return p; },
    pappus: d => ({A:Math.PI*d.r*d.r/4, r:4*d.r/(3*Math.PI), texA:'A = \\dfrac{\\pi R^{2}}{4}', texR:'\\bar{r} = \\dfrac{4R}{3\\pi}',
      sustA:D=>'\\dfrac{\\pi('+D(d.r)+')^{2}}{4}', sustR:D=>'\\dfrac{4('+D(d.r)+')}{3\\pi}'}),
    rotR: (d,D) => 'R=' + D(d.r),
    formula: {V:'V = \\dfrac{2\\pi R^{3}}{3}', c:'\\bar{z}_{loc} = \\dfrac{3R}{8}', txt:'V = 2πR³/3 · centroide a 3R/8 de la cara plana',
      sust:(d,D)=>'\\dfrac{2\\pi('+D(d.r)+')^{3}}{3}'}
  },
  s_piramide: {
    name:'Pirámide rectangular',
    dims:[{id:'a',label:'Base en X (a)',def:100},{id:'b',label:'Base en Y (b)',def:80},{id:'h',label:'Altura (h)',def:120}],
    volume: d => d.a*d.b*d.h/3,
    cBase:  d => d.h/4,
    altura: d => d.h,
    bounds3: d => { const c=d.h/4; return {left:-d.a/2,right:d.a/2,back:-d.b/2,front:d.b/2,bottom:-c,top:d.h-c}; },
    vertices: d => { const a=d.a/2, b=d.b/2; return [[-a,-b,0],[a,-b,0],[a,b,0],[-a,b,0],[0,0,d.h]]; },
    aristas: () => [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]],
    drawPlanta: (ctx,d) => { ctx.rect(-d.a/2,-d.b/2,d.a,d.b); },
    drawAlzado: (ctx,d) => { const c=d.h/4; ctx.moveTo(-d.a/2,-c); ctx.lineTo(d.a/2,-c); ctx.lineTo(0,d.h-c); ctx.closePath(); },
    formula: {V:'V = \\dfrac{a\\,b\\,h}{3}', c:'\\bar{z}_{loc} = \\dfrac{h}{4}', txt:'V = a·b·h/3 · centroide a h/4 de la base',
      sust:(d,D)=>'\\dfrac{('+D(d.a)+')('+D(d.b)+')('+D(d.h)+')}{3}'}
  },
  // ── Fase 2 ──
  s_conotrunc: {
    name:'Cono truncado',
    dims:[{id:'r',label:'Radio de la base (R₁)',def:50},{id:'r2',label:'Radio de la tapa (R₂)',def:25},{id:'h',label:'Altura (h)',def:100}],
    volume: d => Math.PI*d.h*(d.r*d.r + d.r*d.r2 + d.r2*d.r2)/3,
    cBase:  d => d.h*(d.r*d.r + 2*d.r*d.r2 + 3*d.r2*d.r2)/(4*(d.r*d.r + d.r*d.r2 + d.r2*d.r2)),
    altura: d => d.h,
    bounds3: d => { const c=SOLID_DEFS.s_conotrunc.cBase(d), R=Math.max(d.r,d.r2); return {left:-R,right:R,back:-R,front:R,bottom:-c,top:d.h-c}; },
    drawPlanta: (ctx,d) => { ctx.arc(0,0,Math.max(d.r,d.r2),0,2*Math.PI); },
    drawAlzado: (ctx,d) => { const c=SOLID_DEFS.s_conotrunc.cBase(d); ctx.moveTo(-d.r,-c); ctx.lineTo(d.r,-c); ctx.lineTo(d.r2,d.h-c); ctx.lineTo(-d.r2,d.h-c); ctx.closePath(); },
    perfil: d => [{r:d.r,z:0},{r:d.r2,z:d.h}],
    pappus: d => ({A:d.h*(d.r+d.r2)/2, r:(d.r*d.r + d.r*d.r2 + d.r2*d.r2)/(3*(d.r+d.r2)),
      texA:'A = \\dfrac{h\\,(R_1+R_2)}{2}', texR:'\\bar{r} = \\dfrac{R_1^{2}+R_1R_2+R_2^{2}}{3\\,(R_1+R_2)}',
      sustA:D=>'\\dfrac{('+D(d.h)+')('+D(d.r)+'+'+D(d.r2)+')}{2}',
      sustR:D=>'\\dfrac{'+D(d.r)+'^{2}+('+D(d.r)+')('+D(d.r2)+')+'+D(d.r2)+'^{2}}{3\\,('+D(d.r)+'+'+D(d.r2)+')}'}),
    rotR: (d,D) => 'R_1=' + D(d.r) + ',\\ R_2=' + D(d.r2),
    formula: {V:'V = \\dfrac{\\pi h\\,(R_1^{2}+R_1R_2+R_2^{2})}{3}',
      c:'\\bar{z}_{loc} = \\dfrac{h\\,(R_1^{2}+2R_1R_2+3R_2^{2})}{4\\,(R_1^{2}+R_1R_2+R_2^{2})}',
      txt:'V = πh(R₁²+R₁R₂+R₂²)/3 · centroide a h(R₁²+2R₁R₂+3R₂²)/[4(R₁²+R₁R₂+R₂²)] de la base',
      sust:(d,D)=>'\\dfrac{\\pi('+D(d.h)+')\\,['+D(d.r)+'^{2}+('+D(d.r)+')('+D(d.r2)+')+'+D(d.r2)+'^{2}]}{3}'}
  },
  s_paraboloide: {
    name:'Paraboloide de revolución',
    dims:[{id:'r',label:'Radio de la base (R)',def:50},{id:'h',label:'Altura (h)',def:100}],
    volume: d => Math.PI*d.r*d.r*d.h/2,
    cBase:  d => d.h/3,
    altura: d => d.h,
    bounds3: d => { const c=d.h/3; return {left:-d.r,right:d.r,back:-d.r,front:d.r,bottom:-c,top:d.h-c}; },
    drawPlanta: (ctx,d) => { ctx.arc(0,0,d.r,0,2*Math.PI); },
    // Parábola z = h(1 − x²/R²): es exactamente una Bézier cuadrática con
    // el punto de control en (0, 2h).
    drawAlzado: (ctx,d) => { const c=d.h/3; ctx.moveTo(-d.r,-c); ctx.quadraticCurveTo(0,-c+2*d.h,d.r,-c); ctx.closePath(); },
    perfil: d => { const p=[]; for(let i=0;i<=10;i++){ const z=d.h*i/10; p.push({r:d.r*Math.sqrt(Math.max(0,1-z/d.h)), z}); } return p; },
    pappus: d => ({A:2*d.r*d.h/3, r:3*d.r/8, texA:'A = \\dfrac{2\\,R\\,h}{3}', texR:'\\bar{r} = \\dfrac{3R}{8}',
      sustA:D=>'\\dfrac{2('+D(d.r)+')('+D(d.h)+')}{3}', sustR:D=>'\\dfrac{3('+D(d.r)+')}{8}'}),
    rotR: (d,D) => 'R=' + D(d.r),
    formula: {V:'V = \\dfrac{\\pi R^{2} h}{2}', c:'\\bar{z}_{loc} = \\dfrac{h}{3}', txt:'V = πR²h/2 · centroide a h/3 de la cara plana',
      sust:(d,D)=>'\\dfrac{\\pi('+D(d.r)+')^{2}('+D(d.h)+')}{2}'}
  },
  s_cuna: {
    name:'Cuña (prisma triangular)',
    dims:[{id:'b',label:'Base en X (b)',def:100},{id:'h',label:'Altura (h)',def:60},{id:'L',label:'Largo en Y (L)',def:80}],
    volume: d => d.b*d.h*d.L/2,
    cBase:  d => d.h/3,
    // Triángulo rectángulo extruido: la cara vertical está en x = −b/2 y la
    // arista alta corre a lo largo de Y. El centroide queda a b/3 de la cara
    // vertical, es decir a b/6 del centro de la base, hacia esa cara.
    cLocal: d => ({x:-d.b/6, z:d.h/3}),
    altura: d => d.h,
    topLocal: d => ({x:-d.b/2, z:d.h}),
    bounds3: d => { const ex=-d.b/6, c=d.h/3; return {left:-d.b/2-ex,right:d.b/2-ex,back:-d.L/2,front:d.L/2,bottom:-c,top:d.h-c}; },
    vertices: d => { const b=d.b/2, L=d.L/2; return [[-b,-L,0],[b,-L,0],[b,L,0],[-b,L,0],[-b,-L,d.h],[-b,L,d.h]]; },
    aristas: () => [[0,1],[1,2],[2,3],[3,0],[0,4],[3,5],[4,5],[1,4],[2,5]],
    drawPlanta: (ctx,d) => { ctx.rect(-d.b/2+d.b/6,-d.L/2,d.b,d.L); },
    drawAlzado: (ctx,d) => { const ex=-d.b/6, c=d.h/3; ctx.moveTo(-d.b/2-ex,-c); ctx.lineTo(d.b/2-ex,-c); ctx.lineTo(-d.b/2-ex,d.h-c); ctx.closePath(); },
    formula: {V:'V = \\dfrac{b\\,h\\,L}{2}', c:'\\bar{z}_{loc} = \\dfrac{h}{3}', cx:'\\bar{x}_{loc} = \\dfrac{b}{3}',
      txt:'V = b·h·L/2 · centroide a h/3 de la base y a b/3 de la cara vertical',
      sust:(d,D)=>'\\dfrac{('+D(d.b)+')('+D(d.h)+')('+D(d.L)+')}{2}'}
  }
};

// Anclas comunes a todos los sólidos: la base (donde se coloca), el centroide
// y la tapa. El desplazamiento va del CENTROIDE al ancla.
const SOLID_ANCHORS = ['BM','C','TOP'];
const SOLID_ANCHOR_LABELS = {BM:'Centro de la base', C:'G — Centroide', TOP:'Centro de la tapa'};

// Centroide en el marco local (desde el centro de la base), sin volteo.
function solidCLocal(def, d){ return def.cLocal ? def.cLocal(d) : {x:0, z:def.cBase(d)}; }

// Un punto local [x,y,z] (desde el centro de la base, sin voltear) pasa a
// coordenadas relativas al CENTROIDE del sólido tal como está colocado:
// se resta el centroide local, se voltea si toca y se gira α.
function localASolido(fig, p){
  const def = SOLID_DEFS[fig.type], d = fig.dims, sz = fig.volteado ? -1 : 1;
  const c = solidCLocal(def, d);
  const dx = p[0]-c.x, dy = p[1], dz = (p[2]-c.z)*sz;
  const r = (fig.rotation||0)*Math.PI/180, cs = Math.cos(r), sn = Math.sin(r);
  return [dx*cs - dy*sn, dx*sn + dy*cs, dz];
}
// Desplazamiento del centroide al ancla, para el sólido tal como está colocado.
function solidAnchorOffsetFig(fig, a){
  const def = SOLID_DEFS[fig.type], d = fig.dims;
  let p;
  if(a === 'BM')       p = [0,0,0];
  else if(a === 'TOP') { const t = def.topLocal ? def.topLocal(d) : {x:0, z:def.altura(d)}; p = [t.x,0,t.z]; }
  else                 { const c = solidCLocal(def, d); p = [c.x,0,c.z]; }
  const q = localASolido(fig, p);
  return {dx:q[0], dy:q[1], dz:q[2]};
}
// Versión sin giro ni volteo (compatibilidad con el código de la fase 1).
function solidAnchorOffset(def, d, a){
  const tipo = Object.keys(SOLID_DEFS).find(k=>SOLID_DEFS[k]===def);
  return solidAnchorOffsetFig({type:tipo, dims:d, rotation:0, volteado:false}, a);
}

// Vértices de un poliedro en el mundo, relativos al centroide (con giro y
// volteo). null para los sólidos de revolución.
function verticesSolido(fig){
  const def = SOLID_DEFS[fig.type];
  if(!def.vertices) return null;
  return def.vertices(fig.dims).map(p=>localASolido(fig, p));
}

// Envolvente convexa de puntos [u,v] (cadena monótona de Andrew).
function hull2d(pts){
  const P = pts.slice().sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  if(P.length < 3) return P;
  const cruz = (o,a,b)=>(a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const inf = [], sup = [];
  for(const p of P){ while(inf.length>=2 && cruz(inf[inf.length-2], inf[inf.length-1], p) <= 0) inf.pop(); inf.push(p); }
  for(let i=P.length-1;i>=0;i--){ const p=P[i]; while(sup.length>=2 && cruz(sup[sup.length-2], sup[sup.length-1], p) <= 0) sup.pop(); sup.push(p); }
  inf.pop(); sup.pop();
  return inf.concat(sup);
}

// Contorno de un poliedro en una vista ('planta' → (x,y); 'alzado' → (x,z)),
// relativo al centroide: la silueta es la envolvente de los vértices
// proyectados (todos los sólidos del catálogo son convexos). opts.rot0 dibuja
// el sólido sin girar (croquis propio). null para sólidos de revolución.
function contornoSolido(fig, vistaId, opts){
  opts = opts || {};
  const f = opts.rot0 ? Object.assign({}, fig, {rotation:0}) : fig;
  const V = verticesSolido(f);
  if(!V) return null;
  return hull2d(V.map(p => vistaId === 'planta' ? [p[0], p[1]] : [p[0], p[2]]));
}

// Fichas de referencia de los sólidos (alzado a la izquierda, planta a la
// derecha), para el panel de propiedades. Mismo formato que REF_FIGS.
const REF_SOLIDS = (function(){
  const est = 'stroke="#0d3a8f" stroke-width="1.5" fill="rgba(228,172,23,.12)"';
  const g   = (x,y) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#f0c040"/><text x="${x+5}" y="${y-4}" font-size="8" fill="#b8860c" font-style="italic">G</text>`;
  const ejes = `<text x="8" y="94" font-size="7" fill="#0e357f">z</text><text x="150" y="94" font-size="7" fill="#0e357f">y</text>`;
  return {
    s_prisma: {title:'Prisma rectangular',
      svg:`<svg viewBox="0 0 160 100" fill="none"><rect x="14" y="20" width="52" height="62" ${est}/>${g(40,51)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">a</text><text x="72" y="54" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <rect x="96" y="30" width="52" height="40" ${est}/>${g(122,50)}<text x="122" y="82" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">a</text><text x="152" y="53" font-size="8" fill="#0a2e7a" font-style="italic">b</text>${ejes}</svg>`,
      formulas:'V = a·b·h &nbsp;·&nbsp; z̄ = h/2'},
    s_cilindro: {title:'Cilindro',
      svg:`<svg viewBox="0 0 160 100" fill="none"><rect x="16" y="18" width="48" height="66" ${est}/>${g(40,51)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="70" y="54" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <circle cx="122" cy="50" r="24" ${est}/>${g(122,50)}<line x1="122" y1="50" x2="146" y2="50" stroke="#0d3a8f" stroke-width="1"/><text x="134" y="46" font-size="8" fill="#0a2e7a" font-style="italic">R</text>${ejes}</svg>`,
      formulas:'V = πR²h &nbsp;·&nbsp; z̄ = h/2'},
    s_cono: {title:'Cono',
      svg:`<svg viewBox="0 0 160 100" fill="none"><polygon points="14,84 66,84 40,16" ${est}/>${g(40,67)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="66" y="50" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <circle cx="122" cy="50" r="24" ${est}/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = πR²h/3 &nbsp;·&nbsp; z̄ = h/4'},
    s_esfera: {title:'Esfera',
      svg:`<svg viewBox="0 0 160 100" fill="none"><circle cx="40" cy="50" r="30" ${est}/>${g(40,50)}<line x1="40" y1="50" x2="70" y2="50" stroke="#0d3a8f" stroke-width="1"/><text x="52" y="46" font-size="8" fill="#0a2e7a" font-style="italic">R</text>
        <circle cx="122" cy="50" r="30" ${est}/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = 4πR³/3 &nbsp;·&nbsp; z̄ = R (el centro)'},
    s_semiesfera: {title:'Semiesfera',
      svg:`<svg viewBox="0 0 160 100" fill="none"><path d="M10,70 A30,30 0 0,1 70,70 Z" ${est}/>${g(40,59)}<text x="40" y="92" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="66" y="50" font-size="8" fill="#0a2e7a" font-style="italic">3R/8</text>
        <circle cx="122" cy="50" r="30" ${est}/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = 2πR³/3 &nbsp;·&nbsp; z̄ = 3R/8'},
    s_piramide: {title:'Pirámide rectangular',
      svg:`<svg viewBox="0 0 160 100" fill="none"><polygon points="12,84 68,84 40,16" ${est}/>${g(40,67)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">a</text><text x="68" y="50" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <rect x="96" y="30" width="52" height="40" ${est}/><line x1="96" y1="30" x2="148" y2="70" stroke="#0d3a8f" stroke-width=".7" stroke-dasharray="3,2"/><line x1="148" y1="30" x2="96" y2="70" stroke="#0d3a8f" stroke-width=".7" stroke-dasharray="3,2"/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = a·b·h/3 &nbsp;·&nbsp; z̄ = h/4'},
    s_conotrunc: {title:'Cono truncado',
      svg:`<svg viewBox="0 0 160 100" fill="none"><polygon points="12,84 68,84 54,18 26,18" ${est}/>${g(40,58)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R₁</text><text x="40" y="14" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R₂</text><text x="70" y="52" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <circle cx="122" cy="50" r="28" ${est}/><circle cx="122" cy="50" r="14" stroke="#0d3a8f" stroke-width=".8" stroke-dasharray="3,2"/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = πh(R₁²+R₁R₂+R₂²)/3<br>z̄ = h(R₁²+2R₁R₂+3R₂²)/[4(R₁²+R₁R₂+R₂²)]'},
    s_paraboloide: {title:'Paraboloide de revolución',
      svg:`<svg viewBox="0 0 160 100" fill="none"><path d="M12,84 Q40,-40 68,84 Z" ${est}/>${g(40,62)}<text x="40" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">2R</text><text x="70" y="52" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <circle cx="122" cy="50" r="28" ${est}/>${g(122,50)}${ejes}</svg>`,
      formulas:'V = πR²h/2 &nbsp;·&nbsp; z̄ = h/3'},
    s_cuna: {title:'Cuña (prisma triangular)',
      svg:`<svg viewBox="0 0 160 100" fill="none"><polygon points="12,84 72,84 12,22" ${est}/>${g(32,63)}<text x="42" y="94" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">b</text><text x="4" y="56" font-size="8" fill="#0a2e7a" font-style="italic">h</text>
        <rect x="96" y="30" width="52" height="40" ${est}/><line x1="96" y1="30" x2="96" y2="70" stroke="#0d3a8f" stroke-width="2.4"/>${g(113,50)}<text x="122" y="82" text-anchor="middle" font-size="8" fill="#0a2e7a" font-style="italic">b</text><text x="152" y="53" font-size="8" fill="#0a2e7a" font-style="italic">L</text>${ejes}</svg>`,
      formulas:'V = b·h·L/2 &nbsp;·&nbsp; z̄ = h/3 &nbsp;·&nbsp; x̄ = b/3'}
  };
})();
