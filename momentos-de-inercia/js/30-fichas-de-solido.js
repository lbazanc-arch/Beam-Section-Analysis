// ═══════════════════════════════════════════════════════════
//  FICHA ACOTADA DE CADA SÓLIDO (2026-09-23, petición del profesor)
// ═══════════════════════════════════════════════════════════
// Lo mismo que 25-fichas-de-figura.js hace con las figuras planas, pero en 3D,
// donde la pieza se ve en TRES vistas: planta (X–Y), alzado (X–Z) y la
// isométrica. Antes eran 11 SVG a mano (REF_SOLIDS) con el alzado y la planta
// dibujados a ojo, sin cotas y sin decir dónde caen los puntos de anclaje.
//
//   · las siluetas de planta y alzado salen de `_ordenesVistaPropia` (21-), que
//     ya muestrea el trazo del propio sólido, y la isométrica de `escenaIso`
//     (23-): la ficha no puede contradecir a lo que se ve en el lienzo;
//   · se acotan las medidas que pide el panel (`def.dims`), cada una en la
//     vista donde se ve: las horizontales en planta, la altura en el alzado;
//   · los ejes de referencia salen del CENTRO DE LA BASE, que es por donde se
//     coloca el sólido, y desde ahí se acotan z̄ (altura del centroide) y x̄
//     cuando el centroide no cae sobre el eje (cuña y medio cilindro);
//   · los tres puntos de anclaje —centro de la base, centroide y centro de la
//     tapa— se dibujan con su color en las TRES vistas, y el activo se
//     resalta con un halo.
//
// Se apoya en los ayudantes de 25- (_ffCota, _ffCotaRadio, _ffPunta, _ffTexto,
// _ffVarBarra, FF_COL, colorAncla), así que esa pieza debe cargarse antes.

// Lienzo de cada vista. Planta y alzado van en una fila y la isométrica
// debajo, a todo el ancho.
const FS = {W:250, H:170, mIzq:44, mDer:26, mSup:18, mInf:42, sepCota:23, extra:11};

// ── Qué se acota en cada sólido ──────────────────────────────────────────
// Coordenadas LOCALES relativas al centroide; en planta (x, y) y en el alzado
// (x, z), con el eje vertical hacia arriba. Tipos: los mismos de 25- ('h',
// 'v', 'r') más 'circ', una circunferencia a trazos (la tapa del cono
// truncado, que en planta se ve por dentro).
const COTAS_SOLIDO = {
  s_prisma: d => ({
    planta: [{t:'h', de:[-d.a/2,-d.b/2], a:[d.a/2,-d.b/2], lado:'abajo', txt:'a'},
             {t:'v', de:[-d.a/2,-d.b/2], a:[-d.a/2,d.b/2], lado:'izq',   txt:'b'}],
    alzado: [{t:'v', de:[-d.a/2,-d.h/2], a:[-d.a/2,d.h/2], lado:'izq',   txt:'h'}]
  }),
  s_piramide: d => ({
    planta: [{t:'h', de:[-d.a/2,-d.b/2], a:[d.a/2,-d.b/2], lado:'abajo', txt:'a'},
             {t:'v', de:[-d.a/2,-d.b/2], a:[-d.a/2,d.b/2], lado:'izq',   txt:'b'}],
    alzado: [{t:'v', de:[-d.a/2,-d.h/4], a:[-d.a/2,3*d.h/4], lado:'izq', txt:'h'}]
  }),
  s_cilindro: d => ({
    planta: [{t:'r', c:[0,0], r:d.r, ang:48, txt:'R'}],
    alzado: [{t:'v', de:[-d.r,-d.h/2], a:[-d.r,d.h/2], lado:'izq', txt:'h'}]
  }),
  s_cono: d => ({
    planta: [{t:'r', c:[0,0], r:d.r, ang:48, txt:'R'}],
    alzado: [{t:'v', de:[-d.r,-d.h/4], a:[-d.r,3*d.h/4], lado:'izq', txt:'h'}]
  }),
  s_paraboloide: d => ({
    planta: [{t:'r', c:[0,0], r:d.r, ang:48, txt:'R'}],
    alzado: [{t:'v', de:[-d.r,-d.h/3], a:[-d.r,2*d.h/3], lado:'izq', txt:'h'}]
  }),
  s_conotrunc: d => { const def = SOLID_DEFS.s_conotrunc, c = def.cBase(d); return {
    planta: [{t:'circ', c:[0,0], r:d.r2},
             {t:'r', c:[0,0], r:d.r,  ang:48,  txt:'R₁'},
             {t:'r', c:[0,0], r:d.r2, ang:150, txt:'R₂'}],
    alzado: [{t:'v', de:[-d.r,-c], a:[-d.r,d.h-c], lado:'izq', txt:'h'}]
  }; },
  s_esfera: d => ({
    planta: [{t:'r', c:[0,0], r:d.r, ang:48, txt:'R'}],
    alzado: []
  }),
  s_semiesfera: d => { const c = 3*d.r/8; return {
    planta: [{t:'r', c:[0,0], r:d.r, ang:48, txt:'R'}],
    alzado: [{t:'r', c:[0,-c], r:d.r, ang:62, txt:'R'}]
  }; },
  s_semicilindro: d => { const ex = 4*d.r/(3*Math.PI); return {
    planta: [{t:'r', c:[-ex,0], r:d.r, ang:40, txt:'R'}],
    alzado: [{t:'v', de:[-ex,-d.h/2], a:[-ex,d.h/2], lado:'izq', txt:'h'}]
  }; },
  s_semicilindro_t: d => { const c = 4*d.r/(3*Math.PI); return {
    planta: [{t:'v', de:[-d.r,-d.L/2], a:[-d.r,d.L/2], lado:'izq', txt:'L'}],
    alzado: [{t:'r', c:[0,-c], r:d.r, ang:62, txt:'R'}]
  }; },
  s_cuna: d => { const ex = d.b/3, c = d.h/3; return {
    planta: [{t:'h', de:[-ex,-d.L/2], a:[d.b-ex,-d.L/2], lado:'abajo', txt:'b'},
             {t:'v', de:[-ex,-d.L/2], a:[-ex,d.L/2],     lado:'izq',   txt:'L'}],
    alzado: [{t:'v', de:[-ex,-c], a:[-ex,d.h-c], lado:'izq', txt:'h'}]
  }; }
};

// ── Fórmulas de la ventana de información ────────────────────────────────
// V y el centroide, comprobados contra def.volume(), def.cBase() y
// def.cLocal() con medidas al azar (test-solidos.js del scratchpad).
const FORMULAS_SOLIDO = {
  s_prisma:        {V:'a·b·h', z:'h/2',
                    notas:['El centroide está en el centro del prisma.']},
  s_piramide:      {V:'a·b·h/3', z:'h/4',
                    notas:['Hay mucho más material cerca de la base que del vértice: por eso h/4 y no h/2.']},
  s_cilindro:      {V:'π·R²·h', z:'h/2'},
  s_cono:          {V:'π·R²·h/3', z:'h/4'},
  s_paraboloide:   {V:'π·R²·h/2', z:'h/3',
                    notas:['El área de cada sección crece con la distancia al vértice (r² ∝ z).']},
  s_conotrunc:     {V:'π·h(R₁² + R₁R₂ + R₂²)/3', z:'h(R₁² + 2R₁R₂ + 3R₂²)/4(R₁² + R₁R₂ + R₂²)',
                    notas:['Con R₂ = 0 se recupera el cono (h/4); con R₂ = R₁, el cilindro (h/2).']},
  s_esfera:        {V:'4πR³/3', z:'R',
                    notas:['El centroide es el centro de la esfera, a R de la base.']},
  s_semiesfera:    {V:'2πR³/3', z:'3R/8',
                    notas:['Hay más material junto a la cara plana que junto a la cúpula: 3R/8, no R/2.']},
  s_semicilindro:  {V:'π·R²·h/2', z:'h/2', x:'4R/3π',
                    notas:['x̄ se mide desde la <b>cara plana</b>, hacia la parte curva: es el mismo 4R/3π del semicírculo.']},
  s_semicilindro_t:{V:'π·R²·L/2', z:'4R/3π',
                    notas:['Tumbado sobre su cara rectangular: el centroide queda a 4R/3π <b>sobre</b> esa cara.']},
  s_cuna:          {V:'b·h·L/2', z:'h/3', x:'b/6',
                    notas:['Es un triángulo rectángulo extruido: el centroide está a un tercio de cada cateto.',
                           'x̄ está acotada desde el <b>centro de la base</b>, que es el origen O; medida desde la '
                           + '<b>cara vertical</b> son b/3, que es como la da la tabla del libro.']}
};

// ── Una vista acotada ────────────────────────────────────────────────────
// vistaId: 'planta' (x, y) o 'alzado' (x, z). Dibuja la silueta propia del
// sólido (sin giros), sus cotas, los ejes por el centro de la base, el
// centroide con z̄ / x̄ y los tres puntos de anclaje.
function _fsVista(tipo, d, vistaId, opts){
  const def = SOLID_DEFS[tipo];
  const fig = {type:tipo, dims:d, rotation:0, rotXZ:0, rotYZ:0, volteado:false, sign:1};
  const esPl = vistaId === 'planta';
  const cmds = _ordenesVistaPropia(fig, vistaId);
  const b = bounds3Rel(fig, true);

  // Caja de la vista, en el plano que toca.
  let x0 = b.left, x1 = b.right;
  let v0 = esPl ? b.back : b.bottom, v1 = esPl ? b.front : b.top;
  cmds.forEach(c=>{ if(c[0] === 'Z') return;
    x0 = Math.min(x0,c[1]); x1 = Math.max(x1,c[1]);
    v0 = Math.min(v0,c[2]); v1 = Math.max(v1,c[2]); });
  // El origen (centro de la base) y las anclas también entran en la caja.
  const anc = {};
  (SOLID_ANCHORS || ['BM','C','TOP']).forEach(a=>{
    let q; try{ q = solidAnchorOffsetFig(fig, a); }catch(e){ return; }
    const p = esPl ? [q.dx, q.dy] : [q.dx, q.dz];
    anc[a] = p;
    x0 = Math.min(x0,p[0]); x1 = Math.max(x1,p[0]); v0 = Math.min(v0,p[1]); v1 = Math.max(v1,p[1]);
  });

  const lista = (COTAS_SOLIDO[tipo] ? (COTAS_SOLIDO[tipo](d)[vistaId] || []) : []);
  lista.forEach(c=>{ if(!c.c) return;
    const rr = (c.t === 'r' || c.t === 'circ') ? c.r : 0;
    x0 = Math.min(x0, c.c[0]-rr); x1 = Math.max(x1, c.c[0]+rr);
    v0 = Math.min(v0, c.c[1]-rr); v1 = Math.max(v1, c.c[1]+rr); });

  // Márgenes según las cotas que haya.
  const nivMax = (lado, t) => lista.reduce((m,c)=>(c.t === t && (c.lado||'') === lado) ? Math.max(m, c.niv||1) : m, 0);
  const margen = (lado, t, base) => nivMax(lado, t) ? base + FS.sepCota : base;
  const mIzq = margen('izq','v', 20), mDer = margen('der','v', 22);
  const mSup = margen('arriba','h', 18), mInf = margen('abajo','h', 20);

  const zW = FS.W - mIzq - mDer, zH = FS.H - mSup - mInf;
  const s = Math.min(zW/Math.max(x1-x0,1e-9), zH/Math.max(v1-v0,1e-9));
  const px = x => mIzq + (x - x0)*s + (zW - (x1-x0)*s)/2;
  const py = v => FS.H - mInf - (v - v0)*s - (zH - (v1-v0)*s)/2;

  // Silueta.
  let path = '';
  cmds.forEach(c=>{ path += c[0]==='Z' ? 'Z' : (c[0] + _ffN(px(c[1])) + ',' + _ffN(py(c[2])) + ' '); });
  if(path.indexOf('Z') < 0) path += 'Z';
  let g = `<path d="${path}" fill="${FF_COL.relleno}" stroke="${FF_COL.linea}" stroke-width="1.6" stroke-linejoin="round"/>`;

  // Ejes por el centro de la base (el punto donde se coloca el sólido).
  const O = {x:px(anc.BM ? anc.BM[0] : 0), y:py(anc.BM ? anc.BM[1] : 0)};
  const G = {x:px(0), y:py(0)};
  const izq = px(x0), der = px(x1), arr = py(v1), aba = py(v0);
  const ex0 = Math.min(izq,O.x) - FS.extra, ex1 = Math.max(der,O.x) + FS.extra;
  const ey0 = Math.min(arr,O.y) - FS.extra, ey1 = Math.max(aba,O.y) + 5;
  const ejeV = esPl ? 'y' : 'z';
  g += `<line x1="${_ffN(ex0)}" y1="${_ffN(O.y)}" x2="${_ffN(ex1)}" y2="${_ffN(O.y)}" stroke="${FF_COL.eje}" stroke-width="0.8"/>`
     + _ffPunta(ex1, O.y, 1, 0, FF_COL.eje, 4.6)
     + `<line x1="${_ffN(O.x)}" y1="${_ffN(ey1)}" x2="${_ffN(O.x)}" y2="${_ffN(ey0)}" stroke="${FF_COL.eje}" stroke-width="0.8"/>`
     + _ffPunta(O.x, ey0, 0, -1, FF_COL.eje, 4.6)
     + _ffTexto(ex1 + 4, O.y + 4, 'x', FF_COL.eje, {anchor:'start', fs:11})
     + _ffTexto(O.x - 5, ey0 + 1, ejeV, FF_COL.eje, {anchor:'end', fs:11});

  // Cotas de las medidas.
  const bordeAba = Math.max(aba,O.y), bordeArr = Math.min(arr,O.y);
  const bordeIzq = Math.min(izq,O.x), bordeDer = Math.max(der,O.x);
  lista.forEach(c=>{
    if(c.t === 'h'){
      const arriba = c.lado === 'arriba';
      const dest = arriba ? bordeArr - FS.sepCota : bordeAba + FS.sepCota;
      g += _ffCota(px(c.de[0]), py(c.de[1]), px(c.a[0]), py(c.a[1]), 0, arriba?-1:1,
                   Math.abs(dest - py(c.de[1])), c.txt);
    } else if(c.t === 'v'){
      const der2 = c.lado === 'der';
      const dest = der2 ? bordeDer + FS.sepCota : bordeIzq - FS.sepCota;
      g += _ffCota(px(c.de[0]), py(c.de[1]), px(c.a[0]), py(c.a[1]), der2?1:-1, 0,
                   Math.abs(dest - px(c.de[0])), c.txt);
    } else if(c.t === 'r'){
      g += _ffCotaRadio(px(c.c[0]), py(c.c[1]), c.r*s, c.ang, c.txt);
    } else if(c.t === 'circ'){
      g += `<circle cx="${_ffN(px(c.c[0]))}" cy="${_ffN(py(c.c[1]))}" r="${_ffN(c.r*s)}" fill="none" `
         + `stroke="${FF_COL.linea}" stroke-width="0.8" stroke-dasharray="4,2.5" opacity=".7"/>`;
    }
  });

  // Centroide: z̄ en el alzado (altura sobre la base) y x̄ donde el centroide
  // no cae sobre el eje del centro de la base (cuña, medio cilindro).
  const hayX = Math.abs(G.x - O.x) > 3, hayV = Math.abs(G.y - O.y) > 3;
  if(hayX) g += _ffCota(O.x, G.y, G.x, G.y, 0, 0, 0, 'x', FF_COL.cen, {ext:false, fs:12.5, barra:true});
  if(hayV) g += _ffCota(G.x, O.y, G.x, G.y, 0, 0, 0, esPl ? 'y' : 'z', FF_COL.cen,
                        {ext:false, fs:12.5, barra:true});

  // Puntos de anclaje, con el activo resaltado.
  const activa = opts && opts.activa;
  (SOLID_ANCHORS || ['BM','C','TOP']).forEach(a=>{
    if(!anc[a]) return;
    const ax = px(anc[a][0]), ay = py(anc[a][1]), col = colorAncla(a === 'C' ? 'C' : a);
    if(a === activa)
      g += `<circle cx="${_ffN(ax)}" cy="${_ffN(ay)}" r="6.6" fill="${col}" opacity=".22"/>`
         + `<circle cx="${_ffN(ax)}" cy="${_ffN(ay)}" r="3.7" fill="${col}" stroke="#fff" stroke-width="1.2"/>`;
    else if(a !== 'C')
      g += `<circle cx="${_ffN(ax)}" cy="${_ffN(ay)}" r="2.6" fill="${col}" stroke="#fff" stroke-width="0.9"/>`;
  });
  g += `<circle cx="${_ffN(G.x)}" cy="${_ffN(G.y)}" r="3.6" fill="${FF_COL.cen}" stroke="#fff" stroke-width="1.2"/>`
     + _ffTexto(G.x + (G.x >= O.x ? 9 : -9), G.y + (G.y <= O.y ? -8 : 13), 'G', FF_COL.cenTxt,
                {anchor:G.x >= O.x ? 'start' : 'end', fs:12.5})
     + _ffTexto(O.x - 8, O.y + 13, 'O', FF_COL.eje, {anchor:'end', fs:10.5, recta:true});

  const nom = (def.name || tipo).replace(/[<>&]/g, '');
  return `<svg viewBox="0 0 ${FS.W} ${FS.H}" class="ref-fig-svg" role="img" `
       + `aria-label="${nom}, ${esPl ? 'planta' : 'alzado'} acotado con el centroide y los puntos de anclaje">${g}</svg>`;
}

// ── La ficha: las tres vistas ────────────────────────────────────────────
function fichaSolidoSVG(tipo, opts){
  opts = opts || {};
  const def = SOLID_DEFS && SOLID_DEFS[tipo];
  if(!def || !COTAS_SOLIDO[tipo]) return '';
  const d = {};
  (def.dims || []).forEach(x=>{ d[x.id] = x.def; });
  const fig = {type:tipo, dims:d, rotation:0, rotXZ:0, rotYZ:0, volteado:false, sign:1,
               color:FF_COL.linea};
  let planta = '', alzado = '', iso = '';
  try{ planta = _fsVista(tipo, d, 'planta', opts); }catch(e){}
  try{ alzado = _fsVista(tipo, d, 'alzado', opts); }catch(e){}
  try{ iso = svgIsoReferencia(fig, {activa:opts.activa}); }catch(e){}
  const caja = (t, svg) => svg ? `<div class="fs-vista"><div class="fs-tit">${t}</div>${svg}</div>` : '';
  return `<div class="fs-fila">${caja('Planta (X–Y)', planta)}${caja('Alzado (X–Z)', alzado)}</div>`
       + `<div class="fs-fila fs-iso">${caja('Isométrica', iso)}</div>`;
}

// ── La ventana de información del sólido ─────────────────────────────────
function formulasSolidoHTML(tipo){
  const f = FORMULAS_SOLIDO[tipo], def = SOLID_DEFS && SOLID_DEFS[tipo];
  if(!f || !def) return '';
  const fila = (m, e, cls) => '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
    + '<td class="ff-m">' + m + '</td><td class="ff-e">' + e + '</td></tr>';
  let filas = fila('V', f.V, 'ff-sep');
  filas += fila('z̄', f.z, 'ff-sep');
  if(f.x) filas += fila('x̄', f.x);
  const notas = (f.notas || []).concat([
    'z̄ es la altura del centroide <b>sobre el centro de la base</b>, que es el punto por el que se '
    + 'coloca el sólido' + (f.x ? ', y x̄ su separación horizontal' : '') + '.',
    'Las tres vistas son las de la pieza <b>sin girar</b>: los giros se aplican después, en el panel.'
  ]);
  return '<div class="ff-info">'
    + '<div class="ff-tit">' + (def.name || tipo) + '</div>'
    + '<table class="ff-tabla"><tbody>' + filas + '</tbody></table>'
    + '<ul class="ff-notas">' + notas.map(n=>'<li>' + n + '</li>').join('') + '</ul>'
    + '</div>';
}
