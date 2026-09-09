// ═══════════════════════════════════════════════════════════
//  MODO ALAMBRE · centroide de líneas compuestas (Hibbeler §9.2, líneas)
// ═══════════════════════════════════════════════════════════
// Tercer espacio de trabajo del tema, junto a la sección plana (2D) y el
// cuerpo sólido (3D). Las partes son TRAMOS de alambre —segmentos rectos y
// arcos de circunferencia— y cada tramo pesa lo que mide, así que
//     x̄ = Σ L_i x̃_i / Σ L_i ,   ȳ = Σ L_i ỹ_i / Σ L_i .
// Se apoya en el mismo modelo de figuras del 2D (entradas de FIG_DEFS con
// esLinea:true, origen local en el centroide del tramo, `rotation` como
// orientación), así que el lienzo, los gestos, Transformar, Replicar,
// Deshacer, las cotas y el guardado sirven tal cual; lo propio del modo
// (cálculo, resultados en pantalla, ejemplos e informe) vive aquí. Como en
// el 3D, todo lleva «Alambre» o «Linea» en el nombre para no engrosar la
// lista de funciones con el mismo nombre que momentos-de-inercia.
//
// Convenio de cada tipo (coordenadas locales, sin girar):
//   · l_segmento: de A (−L/2, 0) a B (L/2, 0); centroide en el punto medio.
//   · l_arco:     arco de semiángulo α = φ/2 con la bisectriz hacia +y (una
//                 cúpula); centro del arco CA en (0, −d), con d = R·sen α / α.
//   · l_cuarto:   cuarto de arco con el centro CA en la esquina (−2R/π, −2R/π)
//                 y el arco en el primer cuadrante, como el cuarto de círculo.
//   · l_semi:     semicircunferencia con la cuerda abajo y CA en (0, −2R/π).

function _arcoGeom(R, phiDeg){
  const a = Math.max(1e-6, Number(phiDeg) || 0)*Math.PI/360;   // semiángulo, en radianes
  return {a, d: R*Math.sin(a)/a, L: 2*a*R};
}

Object.assign(FIG_DEFS, {
  l_segmento: {
    name:'Segmento recto', esLinea:true,
    dims:[{id:'L',label:'Longitud (L)',def:100}],
    longitud: d => d.L,
    area: d => d.L,
    Ix_c: () => 0, Iy_c: () => 0, Ixy_c: () => 0,
    bounds: d => ({left:-d.L/2, right:d.L/2, bottom:0, top:0}),
    anchors: ['A','C','B'], defaultAnchor:'A',
    anchorOffset: (d,a) => a==='A' ? {dx:-d.L/2, dy:0} : a==='B' ? {dx:d.L/2, dy:0} : {dx:0, dy:0},
    draw: (ctx,d) => { ctx.moveTo(-d.L/2, 0); ctx.lineTo(d.L/2, 0); }
  },
  l_arco: {
    name:'Arco de circunferencia', esLinea:true,
    dims:[{id:'r',label:'Radio (R)',def:60},{id:'phi',label:'Ángulo del arco φ (°)',def:90}],
    longitud: d => _arcoGeom(d.r, d.phi).L,
    area: d => _arcoGeom(d.r, d.phi).L,
    Ix_c: () => 0, Iy_c: () => 0, Ixy_c: () => 0,
    centroArco: d => ({x:0, y:-_arcoGeom(d.r, d.phi).d}),
    puntoRadio: d => ({x:0, y:d.r - _arcoGeom(d.r, d.phi).d}),
    bounds: d => { const g = _arcoGeom(d.r, d.phi); const sx = g.a >= Math.PI/2 ? d.r : d.r*Math.sin(g.a);
      return {left:-sx, right:sx, bottom:-g.d + d.r*Math.cos(g.a), top:d.r - g.d}; },
    anchors: ['CA','C','A','B'], defaultAnchor:'CA',
    anchorOffset: (d,a) => { const g = _arcoGeom(d.r, d.phi);
      if(a==='CA') return {dx:0, dy:-g.d};
      if(a==='A')  return {dx:-d.r*Math.sin(g.a), dy:-g.d + d.r*Math.cos(g.a)};
      if(a==='B')  return {dx: d.r*Math.sin(g.a), dy:-g.d + d.r*Math.cos(g.a)};
      return {dx:0, dy:0}; },
    draw: (ctx,d) => { const g = _arcoGeom(d.r, d.phi);
      // De A (izquierda) a B (derecha) pasando por lo alto: θ de 90°+α a 90°−α.
      ctx.moveTo(-d.r*Math.sin(g.a), -g.d + d.r*Math.cos(g.a));
      ctx.arc(0, -g.d, d.r, Math.PI/2 + g.a, Math.PI/2 - g.a, true); }
  },
  l_cuarto: {
    name:'Cuarto de arco', esLinea:true,
    dims:[{id:'r',label:'Radio (R)',def:50}],
    longitud: d => Math.PI*d.r/2,
    area: d => Math.PI*d.r/2,
    Ix_c: () => 0, Iy_c: () => 0, Ixy_c: () => 0,
    centroArco: d => { const k = 2*d.r/Math.PI; return {x:-k, y:-k}; },
    puntoRadio: d => { const k = 2*d.r/Math.PI; return {x:d.r - k, y:-k}; },
    bounds: d => { const k = 2*d.r/Math.PI; return {left:-k, right:d.r - k, bottom:-k, top:d.r - k}; },
    anchors: ['CA','C','A','B'], defaultAnchor:'CA',
    anchorOffset: (d,a) => { const k = 2*d.r/Math.PI;
      if(a==='CA') return {dx:-k, dy:-k};
      if(a==='A')  return {dx:d.r - k, dy:-k};      // extremo sobre el radio horizontal
      if(a==='B')  return {dx:-k, dy:d.r - k};      // extremo sobre el radio vertical
      return {dx:0, dy:0}; },
    draw: (ctx,d) => { const k = 2*d.r/Math.PI; ctx.moveTo(d.r - k, -k); ctx.arc(-k, -k, d.r, 0, Math.PI/2, false); }
  },
  l_semi: {
    name:'Semicircunferencia', esLinea:true,
    dims:[{id:'r',label:'Radio (R)',def:60}],
    longitud: d => Math.PI*d.r,
    area: d => Math.PI*d.r,
    Ix_c: () => 0, Iy_c: () => 0, Ixy_c: () => 0,
    centroArco: d => ({x:0, y:-2*d.r/Math.PI}),
    puntoRadio: d => ({x:d.r, y:-2*d.r/Math.PI}),
    bounds: d => { const k = 2*d.r/Math.PI; return {left:-d.r, right:d.r, bottom:-k, top:d.r - k}; },
    anchors: ['CA','C','A','B'], defaultAnchor:'CA',
    anchorOffset: (d,a) => { const k = 2*d.r/Math.PI;
      if(a==='CA') return {dx:0, dy:-k};
      if(a==='A')  return {dx:-d.r, dy:-k};
      if(a==='B')  return {dx: d.r, dy:-k};
      return {dx:0, dy:0}; },
    draw: (ctx,d) => { const k = 2*d.r/Math.PI; ctx.moveTo(-d.r, -k); ctx.arc(0, -k, d.r, Math.PI, 0, true); }
  }
});
ANCHOR_LABELS.A = 'Extremo A'; ANCHOR_LABELS.B = 'Extremo B'; ANCHOR_LABELS.CA = 'Centro del arco';
ANGLE_DIMS.phi = true;     // φ no se convierte al cambiar de unidad de longitud

const TIPOS_LINEA = ['l_segmento','l_arco','l_cuarto','l_semi'];
function esModoAlambre(){ return modoEspacio === 'alambre'; }
function esLinea(fig){ const d = fig && FIG_DEFS[fig.type]; return !!(d && d.esLinea); }

// Fichas del panel de propiedades.
Object.assign(REF_FIGS, {
  l_segmento: {
    title:'Segmento recto',
    svg:`<svg viewBox="0 0 160 100" fill="none"><line x1="20" y1="70" x2="140" y2="30" stroke="#0d3a8f" stroke-width="3" stroke-linecap="round"/>
      <circle cx="80" cy="50" r="3.5" fill="#f0c040"/><text x="86" y="46" font-size="8" fill="#f0c040" font-style="italic">C</text>
      <text x="14" y="82" font-size="8" fill="#0a2e7a">A</text><text x="142" y="26" font-size="8" fill="#0a2e7a">B</text>
      <text x="70" y="88" text-anchor="middle" font-size="9" fill="#0a2e7a" font-style="italic">L</text>
      <path d="M20,84 L140,84" stroke="#123f8f" stroke-width="1"/><path d="M40,70 A25,25 0 0,0 44,62" stroke="#0a2e7a" stroke-width="1"/><text x="48" y="66" font-size="7" fill="#0a2e7a">α</text></svg>`,
    formulas:'L = dato &nbsp;&nbsp; C en el punto medio &nbsp;&nbsp; α = orientación respecto de X'
  },
  l_arco: {
    title:'Arco de circunferencia',
    svg:`<svg viewBox="0 0 160 100" fill="none"><path d="M30,75 A55,55 0 0,1 130,75" stroke="#0d3a8f" stroke-width="3" stroke-linecap="round"/>
      <line x1="80" y1="87" x2="30" y2="75" stroke="#0a2e7a" stroke-width="1" opacity=".6"/><line x1="80" y1="87" x2="130" y2="75" stroke="#0a2e7a" stroke-width="1" opacity=".6"/>
      <circle cx="80" cy="87" r="2.5" fill="#0e357f"/><text x="84" y="96" font-size="7" fill="#0a2e7a">CA</text>
      <circle cx="80" cy="42" r="3.5" fill="#f0c040"/><text x="86" y="40" font-size="8" fill="#f0c040" font-style="italic">C</text>
      <text x="63" y="84" font-size="7" fill="#0a2e7a">α</text><text x="90" y="84" font-size="7" fill="#0a2e7a">α</text>
      <line x1="80" y1="87" x2="80" y2="20" stroke="#0d3a8f" stroke-width=".8" stroke-dasharray="3,2" opacity=".5"/>
      <text x="110" y="45" font-size="9" fill="#0a2e7a" font-style="italic">R</text></svg>`,
    formulas:'L = 2αR &nbsp;&nbsp; d = R·sen α / α desde CA, sobre la bisectriz &nbsp;&nbsp; (α = φ/2, en rad)'
  },
  l_cuarto: {
    title:'Cuarto de arco',
    svg:`<svg viewBox="0 0 160 100" fill="none"><path d="M25,85 L25,15 M25,85 L95,85" stroke="#0a2e7a" stroke-width="1" opacity=".5"/>
      <path d="M95,85 A70,70 0 0,0 25,15" stroke="#0d3a8f" stroke-width="3" stroke-linecap="round"/>
      <circle cx="25" cy="85" r="2.5" fill="#0e357f"/><text x="12" y="95" font-size="7" fill="#0a2e7a">CA</text>
      <circle cx="69.5" cy="40.5" r="3.5" fill="#f0c040"/><text x="75" y="38" font-size="8" fill="#f0c040" font-style="italic">C</text>
      <text x="45" y="97" text-anchor="middle" font-size="7" fill="#0a2e7a">2R/π</text><text x="8" y="60" font-size="7" fill="#0a2e7a">2R/π</text>
      <text x="100" y="60" font-size="9" fill="#0a2e7a" font-style="italic">R</text></svg>`,
    formulas:'L = πR/2 &nbsp;&nbsp; x̄ = ȳ = 2R/π desde el centro CA'
  },
  l_semi: {
    title:'Semicircunferencia',
    svg:`<svg viewBox="0 0 160 100" fill="none"><path d="M20,75 A60,60 0 0,1 140,75" stroke="#0d3a8f" stroke-width="3" stroke-linecap="round"/>
      <line x1="20" y1="75" x2="140" y2="75" stroke="#0a2e7a" stroke-width="1" opacity=".5"/>
      <circle cx="80" cy="75" r="2.5" fill="#0e357f"/><text x="84" y="86" font-size="7" fill="#0a2e7a">CA</text>
      <circle cx="80" cy="37" r="3.5" fill="#f0c040"/><text x="86" y="35" font-size="8" fill="#f0c040" font-style="italic">C</text>
      <line x1="80" y1="75" x2="80" y2="15" stroke="#0d3a8f" stroke-width=".8" stroke-dasharray="3,2" opacity=".5"/>
      <text x="90" y="58" font-size="7" fill="#0a2e7a">2R/π</text><text x="120" y="45" font-size="9" fill="#0a2e7a" font-style="italic">R</text></svg>`,
    formulas:'L = πR &nbsp;&nbsp; ȳ = 2R/π desde el centro CA, sobre el eje de simetría'
  }
});

// ══ Espacio de trabajo: menú de tres modos ══════════════════════════════════
// El botón de la barra muestra el modo ACTUAL y abre este menú; cambiar de
// modo vacía el panel (con confirmación), como ya hacía el paso 2D ↔ 3D.
const MODOS_ESPACIO = {'2d':'Sección plana (2D)', '3d':'Cuerpo sólido (3D)', 'alambre':'Alambre (líneas)'};
function menuEspacio(ev){ abrirMenuBarra('menuEspacio', ev); }
function elegirEspacio(m){
  try{ cerrarMenusZona1(); }catch(e){}
  if(!MODOS_ESPACIO[m] || m === modoEspacio) return;
  if(figures.length){
    const ok = confirm('Pasar a «' + MODOS_ESPACIO[m] + '» vacía el panel: lo dibujado no se conserva.\n¿Continuar?');
    if(!ok) return;
    registrarCambio();
  }
  setModoEspacio(m);
}
// Lo que cambia en la interfaz al entrar o salir del modo Alambre. Lo llama
// setModoEspacio (21-vistas-3d.js) al final, con el modo ya fijado.
function _interfazAlambre(esAl){
  const mostrar = (sel, si) => document.querySelectorAll(sel).forEach(e=>{ e.style.display = si ? '' : 'none'; });
  mostrar('#palGridAlambre', esAl);
  mostrar('#btnTipoCuerpo', !esAl);          // alambre homogéneo de sección constante
  mostrar('#propPanel .sign-toggle', !esAl);  // no hay huecos en una línea
  mostrar('#palMas', !esAl);                  // cuatro tramos: caben sin «Ver más»
  if(esAl && modoCuerpo !== 'homogeneo'){ try{ setModoCuerpo('homogeneo'); }catch(e){} }
  const t = document.querySelector('#sec_fig .panel-section-title');
  if(t) t.textContent = esAl ? 'Tramos del alambre' : 'Figuras en la sección';
  ['2d','3d','alambre'].forEach(k=>{ const b = document.getElementById('esp-' + k); if(b) b.classList.toggle('active', k === modoEspacio); });
}

// ══ Geometría auxiliar ══════════════════════════════════════════════════════
function _girar(dx, dy, rotDeg){
  const r = (rotDeg||0)*Math.PI/180, c = Math.cos(r), s = Math.sin(r);
  return {x: dx*c - dy*s, y: dx*s + dy*c};
}
// Extremos A y B del tramo en el mundo.
function extremosLinea(fig){
  const def = FIG_DEFS[fig.type];
  const a = def.anchorOffset(fig.dims, 'A'), b = def.anchorOffset(fig.dims, 'B');
  const A = _girar(a.dx, a.dy, fig.rotation), B = _girar(b.dx, b.dy, fig.rotation);
  return {A:{x:fig.cx + A.x, y:fig.cy + A.y}, B:{x:fig.cx + B.x, y:fig.cy + B.y}};
}
// Centro del arco en el mundo (null en un segmento).
function centroArcoMundo(fig){
  const def = FIG_DEFS[fig.type]; if(!def.centroArco) return null;
  const q = def.centroArco(fig.dims), g = _girar(q.x, q.y, fig.rotation);
  return {x:fig.cx + g.x, y:fig.cy + g.y};
}
// Distancia de un punto al tramo (segmento o arco).
function distanciaATramo(fig, x, y){
  const def = FIG_DEFS[fig.type];
  if(fig.type === 'l_segmento'){
    const e = extremosLinea(fig), vx = e.B.x - e.A.x, vy = e.B.y - e.A.y;
    const L2 = vx*vx + vy*vy || 1e-12;
    const t = Math.max(0, Math.min(1, ((x - e.A.x)*vx + (y - e.A.y)*vy)/L2));
    return Math.hypot(x - (e.A.x + t*vx), y - (e.A.y + t*vy));
  }
  const O = centroArcoMundo(fig), R = fig.dims.r;
  // ¿El punto cae dentro del abanico del arco? Se compara su ángulo con el
  // de los extremos, midiendo desde la bisectriz.
  const e = extremosLinea(fig);
  const ang = p => Math.atan2(p.y - O.y, p.x - O.x);
  const aA = ang(e.A), aB = ang(e.B), aP = ang({x, y});
  const norm = v => { while(v <= -Math.PI) v += 2*Math.PI; while(v > Math.PI) v -= 2*Math.PI; return v; };
  const semi = fig.type === 'l_arco' ? _arcoGeom(R, fig.dims.phi).a : (fig.type === 'l_cuarto' ? Math.PI/4 : Math.PI/2);
  const bis = norm((aA + aB)/2 + (Math.abs(norm(aA - aB)) > Math.PI ? Math.PI : 0));
  // la bisectriz real es la del abanico que contiene el arco: se elige la que
  // queda a «semi» de ambos extremos
  const cand = [bis, norm(bis + Math.PI)];
  const bisec = cand.find(b => Math.abs(Math.abs(norm(aA - b)) - semi) < 1e-6) !== undefined
    ? cand.find(b => Math.abs(Math.abs(norm(aA - b)) - semi) < 1e-6) : bis;
  if(Math.abs(norm(aP - bisec)) <= semi) return Math.abs(Math.hypot(x - O.x, y - O.y) - R);
  return Math.min(Math.hypot(x - e.A.x, y - e.A.y), Math.hypot(x - e.B.x, y - e.B.y));
}
function distanciaAlAlambre(x, y){
  return figures.reduce((m, f) => esLinea(f) ? Math.min(m, distanciaATramo(f, x, y)) : m, Infinity);
}

// ══ Fórmulas de cada tipo (pantalla e informe) ══════════════════════════════
// Devuelve la longitud (literal, sustituida y valor) y, en los arcos, la
// posición del centroide propio desde el centro del arco. `tex` = true usa
// \sen (definido en el preámbulo del informe); en pantalla, \operatorname.
function formulaLinea(fig, tex){
  const d = fig.dims, D = v => decP(v,'len'), sen = tex ? '\\sen' : '\\operatorname{sen}';
  const def = FIG_DEFS[fig.type], L = def.longitud(d);
  switch(fig.type){
    case 'l_segmento': return {L, sim:'L_i = L', sus:null, c:null, cVal:null};
    case 'l_semi':     return {L, sim:'L_i = \\pi R', sus:'\\pi(' + D(d.r) + ')',
                               c:'\\bar{y}_{loc} = \\dfrac{2R}{\\pi} = \\dfrac{2(' + D(d.r) + ')}{\\pi}', cVal:2*d.r/Math.PI};
    case 'l_cuarto':   return {L, sim:'L_i = \\dfrac{\\pi R}{2}', sus:'\\dfrac{\\pi(' + D(d.r) + ')}{2}',
                               c:'\\bar{x}_{loc} = \\bar{y}_{loc} = \\dfrac{2R}{\\pi} = \\dfrac{2(' + D(d.r) + ')}{\\pi}', cVal:2*d.r/Math.PI};
    case 'l_arco': { const g = _arcoGeom(d.r, d.phi), al = D(d.phi/2);
      return {L, sim:'L_i = 2\\alpha R \\quad (\\alpha = \\varphi/2 \\text{ en radianes})',
              sus:'2\\left(' + al + '^\\circ\\cdot\\dfrac{\\pi}{180}\\right)(' + D(d.r) + ')',
              c:'\\bar{y}_{loc} = \\dfrac{R\\,' + sen + '\\alpha}{\\alpha} = \\dfrac{(' + D(d.r) + ')\\,' + sen + '(' + al + '^\\circ)}{' + al + '^\\circ\\cdot\\pi/180}',
              cVal:g.d}; }
  }
  return {L, sim:'L_i', sus:null, c:null, cVal:null};
}

// ══ Cálculo ═════════════════════════════════════════════════════════════════
function calculateAlambre(){
  if(!figures.length){ aviso('Agrega al menos un tramo de alambre.'); return; }
  if(figures.some(f=>!esLinea(f))){ aviso('En el modo Alambre solo entran segmentos y arcos.', 'error'); return; }
  let L = 0, Qx = 0, Qy = 0;
  const steps = [];
  for(const fig of figures){
    const l = FIG_DEFS[fig.type].longitud(fig.dims);
    L += l; Qy += l*fig.cx; Qx += l*fig.cy;          // mismo convenio que en 2D: Qy = Σ L x̃, Qx = Σ L ỹ
    steps.push({fig, l, a:l, g:1, gLabel:'—', mat:null, t:1, w:l, xi:fig.cx, yi:fig.cy,
                lx:l*fig.cx, ly:l*fig.cy, ax:l*fig.cx, ay:l*fig.cy, wx:l*fig.cx, wy:l*fig.cy});
  }
  if(L < 1e-12){ aviso('La longitud total es cero. Revisa los tramos.', 'error'); return; }
  const xbar = Qy/L, ybar = Qx/L;
  results = {esLinea:true, xbar, ybar, xg:xbar, yg:ybar, L, A:L, W:L, Qx, Qy, Wx:Qy, Wy:Qx, sep:0, hetero:false, steps,
             Ix:0, Iy:0, Ixy:0, Imax:0, Imin:0, thetaP:0, Jo:0, kx:0, ky:0};
  renderResultsAlambre(results);
  render();
}

// ══ Resultados en pantalla ═════════════════════════════════════════════════
// Solo la ecuación y el resultado: el desarrollo explicado va en el informe.
function croquisLinea(fig, idx){
  const def = FIG_DEFS[fig.type]; if(!def) return '';
  const W = 190, H = 150, M = 30;
  const cmds = [];
  const fake = { moveTo:(x,y)=>cmds.push(['M',x,y]), lineTo:(x,y)=>cmds.push(['L',x,y]), closePath:()=>{},
    arc:(cx,cy,r,a0,a1,acw)=>{ const n = 32; let da = a1 - a0; if(acw && da > 0) da -= 2*Math.PI; if(!acw && da < 0) da += 2*Math.PI;
      for(let i=0;i<=n;i++){ const a = a0 + da*(i/n); cmds.push([i===0 && !cmds.length ? 'M' : 'L', cx + r*Math.cos(a), cy + r*Math.sin(a)]); } },
    beginPath:()=>{} };
  try{ def.draw(fake, fig.dims); }catch(e){}
  let b = def.bounds(fig.dims);
  const pts = cmds.filter(c=>c[0] !== 'Z');
  if(pts.length) b = {left:Math.min(b.left, ...pts.map(c=>c[1])), right:Math.max(b.right, ...pts.map(c=>c[1])),
                      bottom:Math.min(b.bottom, ...pts.map(c=>c[2])), top:Math.max(b.top, ...pts.map(c=>c[2]))};
  const bw = Math.max(b.right - b.left, 1e-9), bh = Math.max(b.top - b.bottom, 1e-9);
  const s = Math.min((W - 2*M)/bw, (H - 2*M)/bh);
  const px = x => M + (bw*s < W - 2*M ? (W - 2*M - bw*s)/2 : 0) + (x - b.left)*s;
  const py = y => H - M - (bh*s < H - 2*M ? (H - 2*M - bh*s)/2 : 0) - (y - b.bottom)*s;
  let path = '';
  cmds.forEach(c=>{ path += c[0] + px(c[1]).toFixed(1) + ',' + py(c[2]).toFixed(1) + ' '; });
  const col = fig.color || '#14766d', gx = px(0), gy = py(0);
  const O = def.centroArco ? def.centroArco(fig.dims) : null;
  return `
  <div class="croq">
    <div class="croq-h"><span class="croq-n">${idx+1}</span><span class="croq-t">${esc(fig.etiqueta||fig.name||def.name)}</span></div>
    <svg viewBox="0 0 ${W} ${H}" class="croq-svg">
      <path d="${path}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>
      ${O ? `<circle cx="${px(O.x)}" cy="${py(O.y)}" r="2.2" fill="${col}"/><line x1="${px(O.x)}" y1="${py(O.y)}" x2="${gx}" y2="${gy}" stroke="${col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".55"/>` : ''}
      <circle cx="${gx}" cy="${gy}" r="3.4" fill="#e2aa1b" stroke="#fff" stroke-width="1"/>
      <text x="${gx+6}" y="${gy-5}" font-size="9" font-weight="700" fill="#b8860c">C${idx+1}</text>
      <line x1="${px(b.left)}" y1="${H-16}" x2="${px(b.right)}" y2="${H-16}" stroke="#64748b" stroke-width=".9"/>
      <text x="${(px(b.left)+px(b.right))/2}" y="${H-6}" font-size="8.5" fill="#475569" text-anchor="middle">${decFix(bw,'len')} ${unit}</text>
      ${bh > 1e-9 ? `<line x1="${W-16}" y1="${py(b.bottom)}" x2="${W-16}" y2="${py(b.top)}" stroke="#64748b" stroke-width=".9"/>
      <text x="${W-8}" y="${(py(b.bottom)+py(b.top))/2}" font-size="8.5" fill="#475569" text-anchor="middle" transform="rotate(-90 ${W-8} ${(py(b.bottom)+py(b.top))/2})">${decFix(bh,'len')} ${unit}</text>` : ''}
    </svg>
    <div class="croq-d"><span>x̃ = ${decFix(fig.cx,'len')} ${unit}</span><span>ỹ = ${decFix(fig.cy,'len')} ${unit}</span></div>
  </div>`;
}

function renderResultsAlambre(res){
  const u1 = unit;
  currentU4 = unit + '⁴'; currentU2 = unit + '²'; currentU1 = u1;
  const rp = document.getElementById('resultsPanel'); if(rp) rp.style.display = 'block';
  const hint = document.getElementById('noResultsHint'); if(hint) hint.style.display = 'none';
  const ra = document.getElementById('resultsArea'); if(ra) ra.style.display = 'block';
  setTimeout(()=>{ ra && ra.scrollIntoView({behavior:'smooth', block:'start'}); }, 150);
  const f = v => fmtVal(v), nL = v => decFix(v,'len');
  const U = utex(u1);
  let html = '';

  html += `<div class="res-section">
    <div class="res-section-title"><div class="num" style="background:var(--grn)">✎</div>Alambre compuesto — tramos y cotas</div>
    <canvas id="compositeCanvas" style="width:100%;max-width:860px;height:420px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;">Cada tramo con su color y su centroide propio &nbsp;|&nbsp; G = centroide del alambre</div>
  </div>`;

  html += `<div class="res-section"><div class="res-section-title"><div class="num">1</div>Longitud y centroide de cada tramo</div>`;
  res.steps.forEach((s,i)=>{
    const nom = s.fig.etiqueta || s.fig.name || FIG_DEFS[s.fig.type].name;
    const fr = formulaLinea(s.fig, false);
    const eqL = fr.sus ? `${fr.sim.replace(/ \\quad .*$/, '')} = ${fr.sus} = ${kres(ftex(s.l) + '\\,' + U)}`
                       : `L_i = ${kres(ftex(s.l) + '\\,' + U)}`;
    html += `<div class="fig-card"><div class="fig-card-datos">
        <div class="fig-card-h"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${s.fig.color}"></span><b>${i+1}. ${esc(nom)}</b>${Math.abs(s.fig.rotation||0) >= 0.5 ? ` <span style="color:var(--muted);font-weight:500">· α = ${nL(s.fig.rotation)}°</span>` : ''}</div>
        <div class="eq-row"><div class="eq-body">${kx(eqL)}</div></div>
        ${fr.c ? `<div class="eq-row"><div class="eq-body">${kx(fr.c + ' = ' + kres(ftex(fr.cVal) + '\\,' + U))}</div></div>` : ''}
        <table class="fig-tabla"><thead><tr><th>Magnitud</th><th>Símbolo</th><th style="text-align:right">Valor</th><th>Unidad</th></tr></thead><tbody>
          <tr><td>Longitud</td><td><i>L<sub>i</sub></i></td><td class="v">${f(s.l)}</td><td>${u1}</td></tr>
          <tr><td>Centroide x</td><td><i>x̃<sub>i</sub></i></td><td class="v">${nL(s.xi)}</td><td>${u1}</td></tr>
          <tr><td>Centroide y</td><td><i>ỹ<sub>i</sub></i></td><td class="v">${nL(s.yi)}</td><td>${u1}</td></tr>
        </tbody></table></div>
      <div class="fig-card-dib">${croquisLinea(s.fig, i)}</div></div>`;
  });
  html += `</div>`;

  html += `<div class="res-section"><div class="res-section-title"><div class="num">2</div>Tabla de longitudes y momentos de primer orden</div>
    <div style="overflow-x:auto;"><table class="tabla-res"><thead><tr>
      <th>N°</th><th>Tramo</th><th>L<sub>i</sub><br><span>(${u1})</span></th><th>x̃<sub>i</sub><br><span>(${u1})</span></th><th>ỹ<sub>i</sub><br><span>(${u1})</span></th>
      <th>L<sub>i</sub>x̃<sub>i</sub><br><span>(${u1}²)</span></th><th>L<sub>i</sub>ỹ<sub>i</sub><br><span>(${u1}²)</span></th></tr></thead><tbody>`;
  res.steps.forEach((s,i)=>{
    const nom = s.fig.etiqueta || s.fig.name || FIG_DEFS[s.fig.type].name;
    html += `<tr><td>${i+1}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.fig.color};margin-right:5px"></span>${esc(nom)}</td>
      <td class="v">${f(s.l)}</td><td class="v">${nL(s.xi)}</td><td class="v">${nL(s.yi)}</td><td class="v">${f(s.lx)}</td><td class="v">${f(s.ly)}</td></tr>`;
  });
  html += `<tr class="fila-total"><td colspan="2">Σ (Total)</td><td class="v">${f(res.L)}</td><td>—</td><td>—</td><td class="v">${f(res.Qy)}</td><td class="v">${f(res.Qx)}</td></tr>
    </tbody></table></div></div>`;

  html += `<div class="res-section"><div class="res-section-title"><div class="num">3</div>Centroide del alambre</div>
    <div class="proc-block proc-cols">
      <div class="proc-col"><div class="proc-sub">Longitud total</div>
        <div class="eq-row"><div class="eq-body">${kx(`L = \\sum L_{i} = ${kres(ftex(res.L) + '\\,' + U)}`)}</div></div></div>
      <div class="proc-col"><div class="proc-sub">Coordenadas del centroide C</div>
        <div class="eq-row"><div class="eq-body">${kx(`\\bar{x} = \\dfrac{\\sum L_{i}\\tilde{x}_{i}}{\\sum L_{i}} = \\dfrac{${ftex(res.Qy)}}{${ftex(res.L)}} = ${kres(ftex(res.xbar) + '\\,' + U)}`)}</div></div>
        <div class="eq-row"><div class="eq-body">${kx(`\\bar{y} = \\dfrac{\\sum L_{i}\\tilde{y}_{i}}{\\sum L_{i}} = \\dfrac{${ftex(res.Qx)}}{${ftex(res.L)}} = ${kres(ftex(res.ybar) + '\\,' + U)}`)}</div></div></div>
    </div>
    <div class="summary-grid">
      <div class="summary-box"><div class="s-lbl">Longitud total L</div><div class="s-val">${f(res.L)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">x̄</div><div class="s-val">${nL(res.xbar)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box highlight"><div class="s-lbl">ȳ</div><div class="s-val">${nL(res.ybar)}</div><div class="s-unit">${u1}</div></div>
      <div class="summary-box"><div class="s-lbl">Tramos</div><div class="s-val">${res.steps.length}</div><div class="s-unit">—</div></div>
    </div></div>`;

  html += `<div class="res-section"><div class="res-section-title"><div class="num">4</div>Alambre resuelto — ubicación de C</div>
    <canvas id="finalCanvas" style="width:100%;max-width:860px;height:400px;display:block;margin:0 auto;border-radius:10px;border:1px solid var(--border);background:#fff;"></canvas>
    <div style="font-size:10px;color:var(--muted);margin-top:6px;"><b style="color:#b8860c">C</b> = centroide de la línea${distanciaAlAlambre(res.xbar, res.ybar) > 1e-6*Math.max(1, res.L) ? ' (cae fuera del alambre)' : ''}</div></div>`;

  const cont = document.getElementById('resultsPanel');
  if(cont) cont.innerHTML = html;
  try{ if(cont) renderKatex(cont); }catch(e){ console.warn('KaTeX:', e); }
  setTimeout(()=>{ try{ drawCompositeFigure('compositeCanvas'); }catch(e){}
                   try{ drawSeccionFinal('finalCanvas'); }catch(e){} }, 90);
}

// ══ Ejemplos de verificación ═══════════════════════════════════════════════
// Resueltos a mano; `esperado` es el centroide y se contrasta con el motor al
// cargarlos (comprobarEjemploCen, 0.1 %). Las coordenadas de cada tramo son
// las de SU centroide y `rot` su orientación.
const EJEMPLOS_ALAMBRE = [
  {
    id:'gancho', nom:'Alambre con semicircunferencia', unidad:'mm',
    desc:'Semicircunferencia de radio 60 con el centro en el origen y la cuerda sobre el eje X; desde su extremo derecho (60, 0) sigue un segmento horizontal de 40 y luego uno vertical de 20 hacia abajo.',
    esperado:{xbar:20.9259, ybar:28.1695},
    ref:'L₁ = π·60 = 188.50 con ỹ₁ = 2R/π = 38.20; L₂ = 40 en (80, 0); L₃ = 20 en (100, −10). ΣL = 248.50; x̄ = 5200/248.50 = 20.93; ȳ = (7200 − 200)/248.50 = 28.17 mm.',
    armar(){
      return [
        ['l_semi',     {r:60},   0,   2*60/Math.PI, 0],
        ['l_segmento', {L:40},   80,  0,            0],
        ['l_segmento', {L:20},   100, -10,          90]
      ];
    }
  },
  {
    id:'escuadra', nom:'Escuadra de dos segmentos', unidad:'mm',
    desc:'Segmento horizontal de 100 desde el origen y segmento vertical de 80 desde el origen hacia arriba. El centroide no está sobre el alambre.',
    esperado:{xbar:27.7778, ybar:17.7778},
    ref:'x̄ = (100·50 + 80·0)/180 = 27.78; ȳ = (100·0 + 80·40)/180 = 17.78 mm.',
    armar(){
      return [
        ['l_segmento', {L:100}, 50, 0,  0],
        ['l_segmento', {L:80},  0,  40, 90]
      ];
    }
  },
  {
    id:'cuarto', nom:'Cuarto de arco con dos segmentos', unidad:'mm',
    desc:'Cuarto de arco de radio 50 con el centro en el origen y el arco en el primer cuadrante; del extremo (50, 0) baja un segmento de 60 y del extremo (0, 50) sale uno de 40 hacia la izquierda.',
    esperado:{xbar:26.3247, ybar:15.1227},
    ref:'L₁ = π·50/2 = 78.54 con x̃₁ = ỹ₁ = 2R/π = 31.83 (así L₁x̃₁ = R² = 2500); L₂ = 60 en (50, −30); L₃ = 40 en (−20, 50). ΣL = 178.54; x̄ = 4700/178.54 = 26.32; ȳ = 2700/178.54 = 15.12 mm.',
    armar(){
      const k = 2*50/Math.PI;
      return [
        ['l_cuarto',   {r:50},  k,   k,   0],
        ['l_segmento', {L:60},  50,  -30, 90],
        ['l_segmento', {L:40},  -20, 50,  0]
      ];
    }
  },
  {
    id:'arco', nom:'Arco de 120° cerrado por su cuerda', unidad:'mm',
    desc:'Arco de radio 100 y 120° con el centro en el origen y la bisectriz vertical, más el segmento que une sus extremos (cuerda a y = 50).',
    esperado:{xbar:0, ybar:67.8980},
    ref:'α = 60°: L₁ = 2αR = 209.44 con ỹ₁ = R·sen α/α = 82.70 (L₁ỹ₁ = 2R² sen α = 17320.51); cuerda L₂ = 2R·sen α = 173.21 en (0, 50). ȳ = (17320.51 + 8660.25)/382.64 = 67.90 mm; x̄ = 0 por simetría.',
    armar(){
      const g = _arcoGeom(100, 120);
      return [
        ['l_arco',     {r:100, phi:120},          0, g.d, 0],
        ['l_segmento', {L:2*100*Math.sin(g.a)},   0, 100*Math.cos(g.a), 0]
      ];
    }
  }
];
function loadExampleAlambre(id){
  const ej = EJEMPLOS_ALAMBRE.find(e=>e.id === id) || EJEMPLOS_ALAMBRE[0];
  resetAll();
  ejemploActualCen = ej.id;
  figures = ej.armar().map(([tipo, dims, cx, cy, rot], i)=>{
    const def = FIG_DEFS[tipo], anc = def.defaultAnchor || 'C';
    return {id: ++figIdCounter, type:tipo, dims:Object.assign({}, dims), cx, cy, rotation:rot, sign:1,
            color:COLORS[i % COLORS.length], anchor:anc, activeAnchor:anc, name:def.name,
            matId:null, thickness:1, angleMode:'semi'};
  });
  setUnit(ej.unidad || 'mm'); colorIdx = figures.length % COLORS.length;
  renderFigList(); fitView(); calculate();
  comprobarEjemploCen(ej);
  cerrarEjemplosCen();
}

// ══ Informe LaTeX ══════════════════════════════════════════════════════════
// La misma clase paso a paso del 2D (16-latex-piezas-del-informe.js) con
// longitudes en vez de áreas: planteamiento → propiedades de cada tramo →
// tabla → centroide → comprobaciones. Mismas reglas de redacción.
function _simetriaAlambre(st, env){
  const figs = st.map(s=>s.fig);
  const tol = Math.max(env.tol, 1e-6);
  const igual = (p, q) => Math.abs(p.x - q.x) < tol && Math.abs(p.y - q.y) < tol;
  const refl = (p, eje) => eje === 'v' ? {x:2*env.x0 - p.x, y:p.y} : {x:p.x, y:2*env.y0 - p.y};
  const tieneEspejo = (f, eje) => figs.some(g=>{
    if(g.type !== f.type || JSON.stringify(g.dims) !== JSON.stringify(f.dims)) return false;
    if(!igual(refl({x:f.cx, y:f.cy}, eje), {x:g.cx, y:g.cy})) return false;
    const ef = extremosLinea(f), eg = extremosLinea(g);
    const rA = refl(ef.A, eje), rB = refl(ef.B, eje);
    return (igual(rA, eg.A) && igual(rB, eg.B)) || (igual(rA, eg.B) && igual(rB, eg.A));
  });
  return {v: figs.every(f=>tieneEspejo(f, 'v')), h: figs.every(f=>tieneEspejo(f, 'h'))};
}

function construirLatexAlambre(){
  if(!results || !results.esLinea){ aviso('Primero calcula el centroide.'); return null; }
  _yaDichoCen = {};
  const st = results.steps;
  const U1 = '\\,\\text{' + escLatex(unit) + '}';
  const U2 = '\\,\\text{' + escLatex(unit) + '}^{2}';
  const uTxt = escLatex(unit), u2Txt = escLatex(unit) + '\\textsuperscript{2}';
  const nombreDe = f => escLatex(f.etiqueta || f.name || FIG_DEFS[f.type].name);
  const env = _envolventeCen(st);
  const grupos = _gruposFigurasCen(st, false, env);
  const sim = _simetriaAlambre(st, env);

  // Autocomprobación: la tabla que se imprime debe reproducir el centroide.
  {
    let L = 0, Qx = 0, Qy = 0;
    st.forEach(s=>{ L += s.l; Qx += s.ly; Qy += s.lx; });
    const rel = (a,b)=>Math.abs(a-b) > 1e-9*Math.max(1, Math.abs(a), Math.abs(b));
    if(rel(L, results.L) || rel(Qy/L, results.xbar) || rel(Qx/L, results.ybar))
      console.warn('Informe LaTeX: la tabla no reproduce el centroide');
  }

  let figN = 0, tablaN = 0;
  const lamina = (cuerpo, txt) => { figN++;
    return '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n' + cuerpo
      + '\\end{tikzpicture}\\par\\nopagebreak\\vspace{4pt}\n'
      + '{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\n\\end{center}\n\\vspace{4pt}\n'; };
  const tablaCaption = txt => { tablaN++;
    return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };
  const porque = (clave, txt) => _primeraVezCen(clave) ? '\\porque{' + txt + '}\n' : '';
  const nota = (clave, txt) => _primeraVezCen(clave) ? '{\\footnotesize ' + txt + '}\\\\[3pt]\n' : '';
  const cab = (t, f, u) => '\\textbf{' + t + '}' + (f.cab ? ' $' + f.cab + '$' : '') + (u ? ' {\\scriptsize(' + u + ')}' : '');
  const listaNums = ns => ns.length === 1 ? String(ns[0]) : ns.slice(0,-1).join(', ') + ' y ' + ns[ns.length-1];
  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});

  let tex = _preambuloLatexCen('Alambres compuestos');
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Centroide de un alambre compuesto}\\\\[3pt]\n'
    + '  {\\large\\color{bsaAcc2} Método de las partes: longitudes, momentos de primer orden y centroide}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Informe generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{6pt}\n\n';

  // ══ 1. Planteamiento ══
  tex += '\\seccion{1. Planteamiento del problema}\n';
  tex += lamina(tikzSeccionCompuesta({cotas:true, numerar:true}),
    'Alambre compuesto con sus tramos numerados y las cotas generales, medidas entre los extremos y los puntos '
    + 'más salientes de cada tramo.');
  tex += '\\subpaso{Objetivo}\n'
    + 'Localizar el centroide $C$ del alambre, es decir, sus coordenadas $\\bar{x}$ e $\\bar{y}$ medidas desde el origen '
    + '$O$ de los ejes de referencia $X$ e $Y$.\n';
  tex += porque('linea',
    'Un alambre delgado de sección constante pesa en proporción a su \\emph{longitud}: el peso de cada tramo es '
    + '$\\gamma A_s L_i$, con $A_s$ el área de la sección, igual en todos. El balance de momentos que localiza el centro '
    + 'de gravedad se hace entonces con longitudes en lugar de áreas, y $\\gamma A_s$ se cancela en el cociente: el '
    + 'resultado es el \\emph{centroide de la línea}, el punto por el que pasaría la resultante del peso. Casi nunca está '
    + 'sobre el propio alambre.');
  tex += '\\subpaso{Procedimiento de análisis}\n'
    + '\\begin{enumerate}\\setlength{\\itemsep}{1pt}\n'
    + '\\item \\textbf{Tramos.} Se divide el alambre en segmentos rectos y arcos de circunferencia, que tienen el centroide '
    + 'tabulado.\n'
    + '\\item \\textbf{Propiedades de cada tramo.} Su longitud $L_i$, la posición de su centroide propio (el punto medio '
    + 'en un segmento; sobre la bisectriz en un arco) y las coordenadas $\\tilde{x}_i$, $\\tilde{y}_i$ de ese centroide '
    + 'medidas desde $O$.\n'
    + '\\item \\textbf{Tabla.} Se tabulan $L_i$, $\\tilde{x}_i$, $\\tilde{y}_i$ y los momentos de primer orden '
    + '$L_i\\tilde{x}_i$, $L_i\\tilde{y}_i$, y se suman las columnas.\n'
    + '\\item \\textbf{Centroide.} $\\bar{x} = \\sum L_i\\tilde{x}_i / \\sum L_i$, $\\bar{y} = \\sum L_i\\tilde{y}_i / \\sum L_i$. '
    + 'Después se comprueba.\n'
    + '\\end{enumerate}\n';
  tex += '\\subpaso{Convenio}\n'
    + '\\noindent Todas las posiciones se miden desde el origen $O$ de los ejes $X$ e $Y$ del dibujo, positivas hacia la '
    + 'derecha y hacia arriba. La tilde ($\\tilde{x}_i$, $\\tilde{y}_i$) señala el centroide de \\emph{un tramo}; la barra '
    + '($\\bar{x}$, $\\bar{y}$), el de \\emph{todo el alambre}. Un tramo girado se describe por su orientación '
    + '$\\alpha$ respecto del eje $X$; el giro cambia dónde queda su centroide, no su longitud.\n';

  // ══ 2. Paso 1: propiedades de cada tramo ══
  tex += '\\seccion{2. Paso 1 --- Propiedades de cada tramo}\n';
  tex += '\\noindent Cada tramo se trata como una línea aislada: longitud, centroide propio y posición de ese centroide '
    + 'desde $O$. El croquis acotado de cada uno va al costado de su desarrollo.\n';
  grupos.forEach((g, gi)=>{
    const i0 = g.idx[0], s0 = st[i0], f = s0.fig;
    const nums = g.idx.map(i=>i+1);
    const fr = formulaLinea(f, true);
    const giro = f.rotation || 0;
    const varios = g.idx.length > 1;
    if(gi > 0) tex += '\\vspace{10pt}\\noindent\\textcolor{black!20}{\\rule{\\textwidth}{0.4pt}}\\vspace{10pt}\n\n';
    tex += '\\par\\noindent\\begin{minipage}{\\textwidth}\n';
    tex += '\\noindent{\\bfseries\\color{bsaAcc} ' + (varios ? 'Tramos ' + listaNums(nums) : 'Tramo ' + nums[0]) + ': '
         + nombreDe(f) + '}\\\\[3pt]\n';
    if(varios){
      tex += '{\\footnotesize Los ' + g.idx.length + ' tramos son iguales (mismo tipo y medidas): longitud y centroide '
           + 'propio se calculan una sola vez, y cada uno entra en la tabla con su propia posición.}\\\\[4pt]\n';
    }
    tex += '\\noindent\\begin{minipage}[t]{0.60\\textwidth}\n\\small\n'
         + '\\abovedisplayskip=3pt\\belowdisplayskip=3pt\\abovedisplayshortskip=2pt\\belowdisplayshortskip=2pt\n';
    tex += '\\textbf{Longitud}\n';
    if(!fr.sus) tex += '\\[ L_{' + nums[0] + '} = ' + decP(s0.l,'len') + U1 + ' \\quad\\text{(dato)} \\]\n';
    else if(fr.sim.indexOf('\\quad') >= 0) tex += '\\[ ' + fr.sim + ' \\]\n\\[ L_i = ' + fr.sus + ' = ' + decP(s0.l,'len') + U1 + ' \\]\n';
    else tex += '\\[ ' + fr.sim + ' = ' + fr.sus + ' = ' + decP(s0.l,'len') + U1 + ' \\]\n';
    if(f.type === 'l_arco')
      tex += porque('long-arco', 'La longitud de un arco es radio por ángulo, con el ángulo en radianes: cada elemento '
        + '$dL = R\\,d\\theta$ y al integrar en todo el abanico queda $L = R\\,\\varphi = 2\\alpha R$.');
    if(fr.c){
      tex += '\\textbf{Centroide propio}\n';
      tex += '\\[ ' + fr.c + ' = ' + decP(fr.cVal,'len') + U1 + ' \\]\n';
      if(f.type === 'l_semi')
        tex += porque('semi-l', 'En una semicircunferencia el centroide está sobre el eje de simetría, a $2R/\\pi \\approx 0.64\\,R$ '
          + 'del centro: se integra $\\tilde{y}\\,dL$ con $dL = R\\,d\\theta$ y $\\tilde{y} = R\\sen\\theta$, y '
          + '$\\int_0^{\\pi} R^2\\sen\\theta\\,d\\theta / (\\pi R) = 2R/\\pi$. Queda más cerca del arco que el $4R/3\\pi$ '
          + 'del semicírculo lleno, porque aquí todo el material está en el borde.');
      else if(f.type === 'l_cuarto')
        tex += porque('cuarto-l', 'El cuarto de arco es media semicircunferencia: por simetría su centroide está sobre la '
          + 'bisectriz a $45^\\circ$, y proyectado sobre cada radio queda a $2R/\\pi$ del centro, por el mismo cálculo que '
          + 'en la semicircunferencia (Hibbeler, 2016).');
      else if(f.type === 'l_arco')
        tex += porque('arco-l', 'El arco de semiángulo $\\alpha$ tiene su centroide sobre la bisectriz, a $R\\sen\\alpha/\\alpha$ '
          + 'del centro: $\\int R\\cos\\theta\\cdot R\\,d\\theta$ entre $-\\alpha$ y $\\alpha$, dividido entre $2\\alpha R$. '
          + 'Con $\\alpha = 90^\\circ$ da $2R/\\pi$ (la semicircunferencia) y con $\\alpha$ pequeño tiende a $R$ (el arco '
          + 'casi es un punto sobre la circunferencia).');
    } else if(f.type === 'l_segmento'){
      tex += nota('medio', 'El centroide de un segmento recto es su punto medio, a $L/2$ de cada extremo.');
    }
    tex += '\\textbf{Posición desde $O$}\n';
    tex += porque('posicion',
      '$\\tilde{x}_i$ e $\\tilde{y}_i$ son las coordenadas del centroide del tramo medidas desde $O$: son los '
      + '\\emph{brazos} con los que su longitud entra en la suma de momentos. Se obtienen sumando, a la posición del '
      + 'extremo o del centro con que se colocó el tramo, la distancia de ese punto al centroide propio.');
    g.idx.forEach(i=>{
      const s = st[i];
      tex += '\\[ \\tilde{x}_{' + (i+1) + '} = ' + decP(s.xi,'len') + U1
           + ' \\qquad \\tilde{y}_{' + (i+1) + '} = ' + decP(s.yi,'len') + U1 + ' \\]\n';
    });
    if(Math.abs(giro) >= 0.5)
      tex += nota('giro-l', 'El tramo está orientado $\\alpha = ' + decP(giro,'len') + '^\\circ$ respecto del eje $X$: el giro '
        + 'reubica el centroide propio, y con él $\\tilde{x}$ e $\\tilde{y}$, pero no altera la longitud.');
    tex += '\\end{minipage}\\hfill\n';
    tex += '\\begin{minipage}[t]{0.36\\textwidth}\n\\vspace{2pt}\\centering\n' + tikzCroquisFigura(f, 4.4) + '\n';
    tex += '\\\\[2pt]{\\scriptsize\\color{bsaMuted}Croquis acotado en ' + uTxt
         + (Math.abs(giro) >= 0.5 ? ', orientado $\\alpha = ' + decP(giro,'len') + '^\\circ$' : '') + '}\n';
    tex += '\\end{minipage}\n\\end{minipage}\n\\vspace{4pt}\n';
  });

  // ══ 3. Paso 2: tabla ══
  tex += '\\seccion{3. Paso 2 --- Tabla de longitudes y momentos de primer orden}\n';
  tex += porque('momento-linea',
    'El producto $L_i\\tilde{x}_i$ es el \\emph{momento de primer orden} de la longitud del tramo respecto del eje $Y$: '
    + 'longitud por brazo, igual que fuerza por brazo en una suma de momentos. Al tabularlo por tramos y sumar, la '
    + 'integral $\\int\\tilde{x}\\,dL$ de la definición se convierte en una suma finita.');
  let tNumL;
  {
    const fL  = factorColumna(st.map(s=>s.l));
    const fLX = factorColumna(st.map(s=>s.lx).concat([results.Qy]));
    const fLY = factorColumna(st.map(s=>s.ly).concat([results.Qx]));
    tex += tablaCaption('Longitudes, posición del centroide de cada tramo y momentos de primer orden. Una columna con '
      + 'factor $\\times 10^{n}$ lo anuncia en la cabecera.');
    tNumL = tablaN;
    tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{clccccc}\\hline\n'
      + '\\textbf{Tramo} & \\textbf{Tipo} & '
      + cab('$L_i$', fL, uTxt) + ' & ' + cab('$\\tilde{x}_i$', {cab:''}, uTxt) + ' & '
      + cab('$\\tilde{y}_i$', {cab:''}, uTxt) + ' & ' + cab('$L_i\\tilde{x}_i$', fLX, u2Txt) + ' & '
      + cab('$L_i\\tilde{y}_i$', fLY, u2Txt) + '\\\\\\hline\n';
    st.forEach((s,i)=>{
      tex += (i+1) + ' & ' + nombreDe(s.fig)
        + ' & ' + celdaCol(s.l, fL, DEC.len)
        + ' & ' + decP(s.xi,'len') + ' & ' + decP(s.yi,'len')
        + ' & ' + celdaCol(s.lx, fLX, DEC.area) + ' & ' + celdaCol(s.ly, fLY, DEC.area) + ' \\\\\n';
    });
    tex += '\\hline\n\\multicolumn{2}{l}{$\\sum$} & ' + celdaCol(results.L, fL, DEC.len) + ' & --- & --- & '
      + celdaCol(results.Qy, fLX, DEC.area) + ' & ' + celdaCol(results.Qx, fLY, DEC.area) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{tablacentrada}}\n';
  }

  // ══ 4. Paso 3: centroide ══
  tex += '\\seccion{4. Paso 3 --- Centroide del alambre}\n';
  tex += '\\noindent Con las sumas de la Tabla ' + tNumL + ':\n';
  tex += '\\[ L = \\sum L_i = ' + ftex(results.L) + U1 + ' \\]\n';
  tex += '\\[ \\bar{x} = \\dfrac{\\sum L_i\\tilde{x}_i}{\\sum L_i} = \\dfrac{' + ftex(results.Qy) + '}{' + ftex(results.L) + '} = '
    + decP(results.xbar,'len') + U1 + ' \\qquad '
    + '\\bar{y} = \\dfrac{\\sum L_i\\tilde{y}_i}{\\sum L_i} = \\dfrac{' + ftex(results.Qx) + '}{' + ftex(results.L) + '} = '
    + decP(results.ybar,'len') + U1 + ' \\]\n';
  tex += porque('cociente-l',
    'Dividir el momento de primer orden total entre la longitud total da la posición en la que habría que concentrar '
    + 'todo el alambre para producir el mismo momento respecto del eje: esa es la definición del centroide. Es un '
    + 'promedio de posiciones ponderado por longitudes, y por eso siempre queda entre el tramo más a la izquierda y el '
    + 'más a la derecha.');
  tex += '\\resultado{\\centering $C\\,(\\bar{x};\\ \\bar{y}) = (' + decP(results.xbar,'len') + ';\\ '
    + decP(results.ybar,'len') + ')' + U1 + '$, medido desde $O$.}\n';
  const fuera = distanciaAlAlambre(results.xbar, results.ybar) > 1e-6*Math.max(1, results.L);
  if(fuera)
    tex += porque('fuera-l',
      '$C$ cae \\textbf{donde no hay alambre}. No es un error: el centroide es un promedio de posiciones ponderado por '
      + 'longitudes, no un punto de la pieza. Un alambre en forma de L o de arco tiene su centroide en el aire, y aun así, '
      + 'colgado de un hilo que pase por $C$, queda en equilibrio en cualquier orientación: respecto de cualquier eje que '
      + 'pase por $C$ el momento de primer orden total es nulo.');
  tex += '\\veredicto{Alambre \\textbf{homogéneo} de sección constante: el peso de cada tramo es proporcional a su '
    + 'longitud, así que el centroide de la línea, el centro de masa y el centro de gravedad son el mismo punto $C$.}\n';

  // ══ 5. Paso 4: comprobaciones ══
  tex += '\\seccion{5. Paso 4 --- Comprobaciones}\n';
  tex += porque('comprobar-l',
    'Tres cosas deben cumplirse siempre y se comprueban en segundos: la simetría, si la hay, fija una coordenada de '
    + 'antemano; $C$ tiene que caer dentro del rectángulo que envuelve el alambre (puede caer fuera del alambre, pero '
    + 'nunca fuera de la envolvente); y respecto de cualquier eje que pase por $C$ el momento de primer orden total '
    + 'tiene que ser nulo, que es la definición del centroide leída al revés.');
  tex += '\\begin{itemize}\\setlength{\\itemsep}{2pt}\n';
  const okV = sim.v && Math.abs(results.xbar - env.x0) < 1e-6*Math.max(1, env.maxX - env.minX);
  const okH = sim.h && Math.abs(results.ybar - env.y0) < 1e-6*Math.max(1, env.maxY - env.minY);
  if(sim.v || sim.h){
    tex += '\\item \\textbf{Simetría.} ';
    if(sim.v) tex += 'El alambre es simétrico respecto del eje vertical $x = ' + decP(env.x0,'len') + '$' + U1
      + ', así que $\\bar{x}$ tenía que caer sobre él: $\\bar{x} = ' + decP(results.xbar,'len') + '$'
      + (okV ? '\\ \\checkmark' : ' (no coincide: revisar)') + '. ';
    if(sim.h) tex += 'El alambre es simétrico respecto del eje horizontal $y = ' + decP(env.y0,'len') + '$' + U1
      + ', así que $\\bar{y}$ tenía que caer sobre él: $\\bar{y} = ' + decP(results.ybar,'len') + '$'
      + (okH ? '\\ \\checkmark' : ' (no coincide: revisar)') + '. ';
    tex += '\n';
  } else {
    tex += '\\item \\textbf{Simetría.} El alambre no tiene un eje de simetría vertical ni horizontal, así que ninguna '
      + 'coordenada se conoce de antemano: las dos salen de la tabla.\n';
  }
  const dentro = results.xbar >= env.minX - env.tol && results.xbar <= env.maxX + env.tol
              && results.ybar >= env.minY - env.tol && results.ybar <= env.maxY + env.tol;
  tex += '\\item \\textbf{Envolvente.} El alambre ocupa $' + decP(env.minX,'len') + ' \\le x \\le ' + decP(env.maxX,'len')
    + '$ y $' + decP(env.minY,'len') + ' \\le y \\le ' + decP(env.maxY,'len') + '$' + U1 + ', y $C\\,('
    + decP(results.xbar,'len') + ';\\ ' + decP(results.ybar,'len') + ')$ queda dentro'
    + (dentro ? '\\ \\checkmark' : ' --- no queda dentro: revisar') + '.\n';
  {
    let mx = 0, my = 0;
    st.forEach(s=>{ mx += s.l*(s.xi - results.xbar); my += s.l*(s.yi - results.ybar); });
    const esc0 = Math.max(Math.abs(results.Qx), Math.abs(results.Qy), 1);
    const cero = v => (Math.abs(v) < 1e-9*esc0) ? '0' : ftex(v);
    tex += '\\item \\textbf{Momento nulo respecto de $C$.} Trasladando el eje al centroide, los tramos de un lado '
      + 'compensan a los del otro:\n'
      + '\\[ \\sum L_i\\left(\\tilde{x}_i - \\bar{x}\\right) = ' + cero(mx) + ' \\qquad '
      + '\\sum L_i\\left(\\tilde{y}_i - \\bar{y}\\right) = ' + cero(my) + ' \\qquad\\checkmark \\]\n';
  }
  tex += '\\end{itemize}\n';
  tex += '\\subpaso{Alambre resuelto}\n';
  tex += lamina(tikzSeccionCompuesta({cotas:false, marcarC:true, ejes:true, cotasC:true}),
    'Alambre resuelto: posición del centroide $C$ medida desde los ejes $X$ e $Y$. Las cotas llevan la variable; los '
    + 'valores están en la Tabla ' + (tablaN+1) + '.');
  tex += tablaCaption('Resultados.');
  tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{lcc}\\hline\n'
    + '\\textbf{Magnitud} & \\textbf{Valor} & \\textbf{Unidad} \\\\\\hline\n'
    + 'Longitud total $L$ & $' + ftex(results.L) + '$ & ' + uTxt + ' \\\\\n'
    + 'Centroide $\\bar{x}$ & $' + decP(results.xbar,'len') + '$ & ' + uTxt + ' \\\\\n'
    + 'Centroide $\\bar{y}$ & $' + decP(results.ybar,'len') + '$ & ' + uTxt + ' \\\\\n'
    + '\\hline\\end{tabular}\\end{tablacentrada}}\n';

  tex += bsaReferenciasLatex();
  tex += colofonLatexBSA();
  tex += '\\end{document}\n';
  return tex;
}

// ══ TikZ de un tramo (lo usan tikzFigura y tikzCroquisFigura de 14- y 16-) ══
function pathLineaTikz(tipo, d){
  const n = v => (+v).toFixed(4);
  if(tipo === 'l_segmento') return '(' + n(-d.L/2) + ',0) -- (' + n(d.L/2) + ',0)';
  if(tipo === 'l_semi'){ const k = 2*d.r/Math.PI; return '(' + n(-d.r) + ',' + n(-k) + ') arc (180:0:' + n(d.r) + ')'; }
  if(tipo === 'l_cuarto'){ const k = 2*d.r/Math.PI; return '(' + n(d.r - k) + ',' + n(-k) + ') arc (0:90:' + n(d.r) + ')'; }
  if(tipo === 'l_arco'){ const g = _arcoGeom(d.r, d.phi), al = g.a*180/Math.PI;
    return '(' + n(-d.r*Math.sin(g.a)) + ',' + n(-g.d + d.r*Math.cos(g.a)) + ') arc (' + n(90 + al) + ':' + n(90 - al) + ':' + n(d.r) + ')'; }
  return '(0,0) -- (1,0)';
}
