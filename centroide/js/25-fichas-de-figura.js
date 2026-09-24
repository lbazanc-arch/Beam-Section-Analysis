// ═══════════════════════════════════════════════════════════
//  FICHA ACOTADA DE CADA FIGURA (2026-09-23, petición del profesor)
// ═══════════════════════════════════════════════════════════
// La ficha del panel de propiedades se DIBUJA, no se escribe: antes eran 19
// SVG a mano por tema, con los rótulos puestos a ojo («x h», «y b» sueltos,
// «G(b/3,h/3)» encima del punto), y se veían apretados y distorsionados.
// Ahora se generan desde FIG_DEFS con acotado de dibujo técnico:
//
//   · la silueta sale del propio `draw` de la figura (muestreando las curvas,
//     igual que croquisFigura), así que la ficha no puede contradecir al lienzo;
//   · se acotan EXACTAMENTE las medidas que el alumno escribe en el panel
//     (`def.dims`), ni una más: la ficha y los campos dicen lo mismo;
//   · las cotas van FUERA de la figura, con líneas de extensión, línea de cota
//     y punta en los dos extremos, y el texto sobre la línea;
//   · los ejes de referencia se dibujan desde el ORIGEN de la figura (su ancla
//     natural: la esquina inferior izquierda, el centro de la base plana o el
//     vértice), que es desde donde se miden x̄ e ȳ y desde donde el alumno
//     coloca la figura en el lienzo;
//   · x̄ e ȳ se acotan de los ejes al centroide, en ámbar y a trazos, para que
//     se distingan de las medidas de la figura;
//   · las cotas llevan la VARIABLE (b, h, R, x̄), nunca el valor: las fórmulas
//     van en la ventana de información (botón ⓘ).
//
// Las medidas son las nominales de FIG_DEFS (`dims[].def`): la ficha es una
// referencia como la tabla de la contraportada de Hibbeler, no un reflejo de
// las medidas que tenga la figura en ese momento.
//
// GEMELA: el mismo cuerpo vive en momentos-de-inercia (§5.4 de CLAUDE.md). Al
// tocar una, mira la otra.

// ── Paleta ──
const FF_COL = {
  linea:  '#0d3a8f',           // contorno de la figura
  relleno:'rgba(228,172,23,.13)',
  cota:   '#0a2e7a',           // cotas de medida (b, h, R, θ)
  eje:    '#64748b',           // ejes de referencia
  cen:    '#e2900b',           // centroide y sus cotas (x̄, ȳ)
  cenTxt: '#a8660a'
};
// Lienzo de la ficha y márgenes para las cotas exteriores.
const FF = {W:250, H:172, mIzq:44, mDer:30, mSup:22, mInf:44,
            sepCota:24, extra:12, punta:5, fuente:13, corta:30};

// ── Ayudantes de trazo ───────────────────────────────────────────────────
const _ffN = v => (Math.round(v*100)/100);
// Punta de flecha llena en (x, y) apuntando hacia (ux, uy).
function _ffPunta(x, y, ux, uy, col, L){
  const l = L || FF.punta, a = l*0.4, px = -uy, py = ux;
  return `<polygon points="${_ffN(x)},${_ffN(y)} ${_ffN(x-ux*l+px*a)},${_ffN(y-uy*l+py*a)} `
       + `${_ffN(x-ux*l-px*a)},${_ffN(y-uy*l-py*a)}" fill="${col}"/>`;
}
// Texto con halo blanco: la línea de cota no lo atraviesa.
function _ffTexto(x, y, txt, col, opts){
  opts = opts || {};
  const anc = opts.anchor || 'middle', fs = opts.fs || FF.fuente;
  const rot = opts.rot ? ` transform="rotate(${opts.rot} ${_ffN(x)} ${_ffN(y)})"` : '';
  const est = (opts.recta ? '' : 'font-style="italic" ') + 'font-family="Georgia, serif"';
  return `<text x="${_ffN(x)}" y="${_ffN(y)}" text-anchor="${anc}" font-size="${fs}" ${est} `
       + `stroke="#ffffff" stroke-width="3" stroke-linejoin="round" paint-order="stroke" `
       + `fill="${col}"${rot}>${txt}</text>`;
}
// Una variable con barra (x̄, ȳ): la barra se DIBUJA. El carácter combinante
// U+0304 no rinde igual en todas las fuentes y en el SVG salía un garabato.
function _ffVarBarra(x, y, letra, col, opts){
  opts = opts || {};
  const fs = opts.fs || 12.5, anc = opts.anchor || 'middle';
  const w = fs*0.42;                       // ancho aproximado de la letra
  const cx = anc === 'start' ? x + w/2 : anc === 'end' ? x - w/2 : x;
  return _ffTexto(x, y, letra, col, {anchor:anc, fs})
       + `<line x1="${_ffN(cx - w/2 - 0.4)}" y1="${_ffN(y - fs*0.88)}" `
       + `x2="${_ffN(cx + w/2 + 0.4)}" y2="${_ffN(y - fs*0.88)}" `
       + `stroke="${col}" stroke-width="1.1" stroke-linecap="round"/>`;
}

// Cota entre dos puntos YA en coordenadas de pantalla. La línea de cota va
// desplazada `sep` en la dirección normal (nx, ny); con sep = 0 se dibuja
// sobre el propio segmento (es lo que hacen x̄ e ȳ).
function _ffCota(x1, y1, x2, y2, nx, ny, sep, txt, col, opts){
  opts = opts || {};
  const c = col || FF_COL.cota;
  const ax = x1 + nx*sep, ay = y1 + ny*sep, bx = x2 + nx*sep, by = y2 + ny*sep;
  const L = Math.hypot(bx-ax, by-ay) || 1, ux = (bx-ax)/L, uy = (by-ay)/L;
  let s = '';
  if(opts.ext !== false && sep > 3){      // líneas de extensión, con holgura
    const fino = `stroke="${c}" stroke-width="0.7" opacity=".7"`, g = 2.5;
    s += `<line x1="${_ffN(x1+nx*g)}" y1="${_ffN(y1+ny*g)}" x2="${_ffN(ax+nx*3.5)}" y2="${_ffN(ay+ny*3.5)}" ${fino}/>`
       + `<line x1="${_ffN(x2+nx*g)}" y1="${_ffN(y2+ny*g)}" x2="${_ffN(bx+nx*3.5)}" y2="${_ffN(by+ny*3.5)}" ${fino}/>`;
  }
  s += `<line x1="${_ffN(ax)}" y1="${_ffN(ay)}" x2="${_ffN(bx)}" y2="${_ffN(by)}" stroke="${c}" stroke-width="0.9"`
     + (opts.trazos ? ' stroke-dasharray="3.5,2.5"' : '') + `/>`
     + _ffPunta(ax, ay, -ux, -uy, c) + _ffPunta(bx, by, ux, uy, c);
  if(txt){
    const mx = (ax+bx)/2, my = (ay+by)/2, vert = Math.abs(uy) > Math.abs(ux);
    // TODAS las letras van derechas, también las de las cotas verticales
    // (decisión del profesor, 2026-09-23): una h girada se lee peor que una h
    // derecha, y el halo blanco del rótulo corta la línea de cota como en un
    // plano acotado en estilo unidireccional.
    const rotular = (x, y, o) => opts.barra ? _ffVarBarra(x, y, txt, c, o)
                                            : _ffTexto(x, y, txt, c, o);
    if(vert){
      s += rotular(opts.barra ? mx - 6 : mx, my + (opts.barra ? 4 : 4.5),
                   {anchor:opts.barra ? 'end' : 'middle', fs:opts.fs});
    } else if(opts.barra){
      // x-barra se rotula junto al EXTREMO DEL EJE (al 30 % del recorrido), no
      // en el medio: en el medio se juntaba con la G del centroide.
      s += rotular(ax + (bx-ax)*0.42, my - 7, {fs:opts.fs});
    } else {
      s += rotular(mx, my - 5.5, {fs:opts.fs});
    }
  }
  return s;
}
// Cota de radio: flecha del centro al arco, con el rótulo sobre la línea.
function _ffCotaRadio(cx, cy, r, angGrados, txt, col){
  const c = col || FF_COL.cota, a = angGrados*Math.PI/180;
  const ux = Math.cos(a), uy = -Math.sin(a);
  const x2 = cx + ux*r, y2 = cy + uy*r;
  return `<line x1="${_ffN(cx)}" y1="${_ffN(cy)}" x2="${_ffN(x2)}" y2="${_ffN(y2)}" stroke="${c}" stroke-width="0.9"/>`
       + _ffPunta(x2, y2, ux, uy, c)
       + `<circle cx="${_ffN(cx)}" cy="${_ffN(cy)}" r="1.4" fill="${c}"/>`
       + _ffTexto(cx + ux*r*0.74 - uy*7, cy + uy*r*0.74 - ux*7, txt, c);
}
// Arco de ángulo con punta en los dos extremos, como una cota angular de
// plano. El ángulo se mide entre dos direcciones que TIENEN que estar
// dibujadas (el eje de simetría y un radio): si no, el arco flota y no se sabe
// respecto a qué se mide.
function _ffCotaAngulo(cx, cy, r, a0, a1, txt, col, opts){
  opts = opts || {};
  const c = col || FF_COL.cota;
  const p = a => [cx + r*Math.cos(a), cy - r*Math.sin(a)];
  const [x0,y0] = p(a0), [x1,y1] = p(a1);
  const grande = Math.abs(a1-a0) > Math.PI ? 1 : 0, am = (a0+a1)/2;
  // Puntas tangentes al arco, en cada extremo.
  const t0 = [ Math.sin(a0),  Math.cos(a0)], t1 = [-Math.sin(a1), -Math.cos(a1)];
  return `<path d="M${_ffN(x0)},${_ffN(y0)} A${_ffN(r)},${_ffN(r)} 0 ${grande} 1 ${_ffN(x1)},${_ffN(y1)}" `
       + `fill="none" stroke="${c}" stroke-width="0.9"/>`
       + _ffPunta(x0, y0, t0[0], t0[1], c, 4.2) + _ffPunta(x1, y1, t1[0], t1[1], c, 4.2)
       + _ffTexto(cx + (r + (opts.dentro ? -9 : 8))*Math.cos(am),
                  cy - (r + (opts.dentro ? -9 : 8))*Math.sin(am), txt, c,
                  {fs:12, rot:90 - am*180/Math.PI});
}
// Línea auxiliar a trazos (un radio, un eje de simetría): sirve de referencia
// para leer el ángulo.
function _ffAuxiliar(x1, y1, x2, y2, col){
  return `<line x1="${_ffN(x1)}" y1="${_ffN(y1)}" x2="${_ffN(x2)}" y2="${_ffN(y2)}" `
       + `stroke="${col || FF_COL.cota}" stroke-width="0.7" stroke-dasharray="4,2.5" opacity=".75"/>`;
}
// Punto con nombre (el vértice de una parábola).
function _ffPunto(x, y, txt, col, opts){
  opts = opts || {};
  const c = col || FF_COL.linea;
  return (opts.soloTexto ? '' : `<circle cx="${_ffN(x)}" cy="${_ffN(y)}" r="2.6" fill="${c}"/>`)
       + _ffTexto(x + (opts.dx || 0), y + (opts.dy || -7), txt, c,
                  {anchor:opts.anchor || 'middle', fs:11.5});
}

// ── Muestreo del trazo de la figura ──────────────────────────────────────
// Contexto falso que sigue la CURVA, no la cuerda (el mismo criterio que
// croquisFigura, 09-), más `rect`, que el rectángulo sí usa.
function _ffTrazo(def, dims){
  const cmds = [];
  let cur = [0,0];
  const pt = (x,y) => { cmds.push([cmds.length?'L':'M', x, y]); cur = [x,y]; };
  const barrido = (a0,a1,acw) => { let d = a1-a0;
    if(acw && d>0) d -= 2*Math.PI;
    if(!acw && d<0) d += 2*Math.PI;
    return d; };
  const ctx = {
    moveTo:(x,y)=>{ cmds.push(['M',x,y]); cur=[x,y]; },
    lineTo:(x,y)=>{ cmds.push(['L',x,y]); cur=[x,y]; },
    closePath:()=>cmds.push(['Z']),
    rect:(x,y,w,h)=>{ cmds.push(['M',x,y],['L',x+w,y],['L',x+w,y+h],['L',x,y+h],['Z']); cur=[x,y]; },
    arc:(cx,cy,r,a0,a1,acw)=>{ const n=48, dd=barrido(a0,a1,acw);
      for(let i=0;i<=n;i++){ const a=a0+dd*(i/n); pt(cx+r*Math.cos(a), cy+r*Math.sin(a)); } },
    ellipse:(cx,cy,rx,ry,rot,a0,a1,acw)=>{ const n=56, dd=barrido(a0,a1,acw),
      cr=Math.cos(rot||0), sr=Math.sin(rot||0);
      for(let i=0;i<=n;i++){ const a=a0+dd*(i/n), ex=rx*Math.cos(a), ey=ry*Math.sin(a);
        pt(cx+ex*cr-ey*sr, cy+ex*sr+ey*cr); } },
    quadraticCurveTo:(qx,qy,x,y)=>{ const n=36, x0=cur[0], y0=cur[1];
      for(let i=1;i<=n;i++){ const t=i/n, u=1-t;
        pt(u*u*x0+2*u*t*qx+t*t*x, u*u*y0+2*u*t*qy+t*t*y); } },
    bezierCurveTo:(c1x,c1y,c2x,c2y,x,y)=>{ const n=36, x0=cur[0], y0=cur[1];
      for(let i=1;i<=n;i++){ const t=i/n, u=1-t;
        pt(u*u*u*x0+3*u*u*t*c1x+3*u*t*t*c2x+t*t*t*x,
           u*u*u*y0+3*u*u*t*c1y+3*u*t*t*c2y+t*t*t*y); } },
    beginPath:()=>{} };
  try{ def.draw(ctx, dims); }catch(e){ return null; }
  return cmds.length ? cmds : null;
}

// ── Origen de las cotas ──────────────────────────────────────────────────
// El punto desde el que se miden x̄ e ȳ y por el que pasan los ejes de la
// ficha: el ancla natural de cada figura. Si no hay ninguno (círculo, elipse),
// es el propio centroide y no hay nada que acotar.
const ORIGEN_FICHA = {
  rect:'BL', triangle:'BL', rtriangle:'BL', rtriangle2:'BR', triangulo:'BL',
  trapecio:'BL', semicircle:'BM', quarter:'O', sector:'O', segmento:'M',
  parabola:'BM', semiparabola:'O', enjuta:'O', cuartoelipse:'O',
  semielipse:'BM', hexagono:'BM', octogono:'BM'
};
function _ffOrigen(tipo, def){
  const anc = def.anchors || ['C'];
  for(const a of [ORIGEN_FICHA[tipo], def.defaultAnchor, 'BL', 'O', 'BM', 'M'])
    if(a && anc.indexOf(a) >= 0) return a;
  return 'C';
}

// ── Qué se acota en cada figura ──────────────────────────────────────────
// Se acotan las medidas de `def.dims`, en coordenadas LOCALES (origen en el
// centroide, Y hacia arriba):
//   {t:'h', de:[x,y], a:[x,y], lado:'abajo'|'arriba', txt}   cota horizontal
//   {t:'v', de:[x,y], a:[x,y], lado:'izq'|'der', txt}        cota vertical
//   {t:'r', c:[x,y], r:R, ang:grados, txt}                   radio
//   {t:'ang', c:[x,y], r:R, a0:rad, a1:rad, txt}             ángulo
const COTAS_FICHA = {
  // ── Rectas ──
  rect: d => [
    {t:'h', de:[-d.b/2,-d.h/2], a:[d.b/2,-d.h/2], lado:'abajo', txt:'b'},
    {t:'v', de:[-d.b/2,-d.h/2], a:[-d.b/2,d.h/2], lado:'izq',   txt:'h'}
  ],
  rtriangle: d => [
    {t:'h', de:[-d.b/3,-d.h/3], a:[2*d.b/3,-d.h/3], lado:'abajo', txt:'b'},
    {t:'v', de:[-d.b/3,-d.h/3], a:[-d.b/3,2*d.h/3], lado:'izq',   txt:'h'}
  ],
  // El ángulo recto está a la derecha: la cota h va por ese lado y no cruza la
  // hipotenusa.
  rtriangle2: d => [
    {t:'h', de:[-2*d.b/3,-d.h/3], a:[d.b/3,-d.h/3], lado:'abajo', txt:'b'},
    {t:'v', de:[d.b/3,-d.h/3],    a:[d.b/3,2*d.h/3], lado:'der',  txt:'h'}
  ],
  triangulo: d => { const q = _propsPoli(_vTriangulo(d)), e = (x,y)=>[x-q.cx, y-q.cy]; return [
    {t:'h', de:e(0,0),    a:e(d.b,0),    lado:'abajo',  txt:'b'},
    {t:'v', de:e(0,0),    a:e(0,d.h),    lado:'izq',    txt:'h'},
    {t:'h', de:e(0,d.h),  a:e(d.d,d.h),  lado:'arriba', txt:'d'}
  ]; },
  trapecio: d => { const q = _propsPoli(_vTrapecio(d)), e = (x,y)=>[x-q.cx, y-q.cy]; return [
    {t:'h', de:e(0,0),      a:e(d.a,0),         lado:'abajo',  txt:'a'},
    {t:'v', de:e(0,0),      a:e(0,d.h),         lado:'izq',    txt:'h'},
    {t:'h', de:e(d.dx,d.h), a:e(d.dx+d.b,d.h),  lado:'arriba', txt:'b'},
    {t:'h', de:e(0,d.h),    a:e(d.dx,d.h),      lado:'arriba', txt:'dx', niv:2}
  ]; },

  // ── Circulares ──
  circle: d => [
    {t:'r', c:[0,0], r:d.r, ang:48, txt:'R'}
  ],
  semicircle: d => [
    {t:'r', c:[0,-4*d.r/(3*Math.PI)], r:d.r, ang:54, txt:'R'}
  ],
  quarter: d => { const dc = 4*d.r/(3*Math.PI); return [
    {t:'r', c:[-dc,-dc], r:d.r, ang:68, txt:'R'}
  ]; },
  // θ es el SEMIÁNGULO: se mide del eje de simetría a un radio, así que el eje
  // se dibuja (a trazos) o el arco no diría respecto a qué está medido.
  sector: d => { const t = d.alpha*Math.PI/180, R = d.r, yc = 2*R*Math.sin(t)/(3*t); return [
    {t:'linea', de:[0,-yc], a:[0, R - yc]},                            // eje de simetría
    {t:'r',     c:[0,-yc], r:R, ang:90 + d.alpha, txt:'R'},
    {t:'ang',   c:[0,-yc], r:R*0.88, a0:Math.PI/2 - t, a1:Math.PI/2, txt:'θ'}
  ]; },
  // El centro del círculo cae por DEBAJO de la cuerda, fuera de la figura: se
  // marca igualmente, porque R y θ se miden desde él.
  // El centro del arco cae POR DEBAJO de la cuerda, fuera de la figura: se
  // dibujan los dos radios hasta los extremos de la cuerda y el eje de
  // simetría, y θ se lee entre el eje y el radio derecho. Sin esas tres líneas
  // el arco del ángulo no se sabe de dónde sale.
  segmento: d => { const t = d.alpha*Math.PI/180, R = d.r, s2 = Math.sin(t), c2 = Math.cos(t);
    const yO = 2*R*Math.pow(s2,3)/(3*(t - s2*c2)), O = [0, -yO]; return [
    {t:'linea', de:O, a:[ R*s2, R*c2 - yO]},                           // radio derecho
    {t:'linea', de:O, a:[-R*s2, R*c2 - yO]},                           // radio izquierdo
    {t:'linea', de:O, a:[0, R - yO]},                                  // eje de simetría
    {t:'r',     c:O, r:R, ang:90 + d.alpha, txt:'R'},
    {t:'ang',   c:O, r:R*c2*0.82, a0:Math.PI/2 - t, a1:Math.PI/2, txt:'θ', dentro:true}
  ]; },

  // ── Parabólicas ──
  parabola: d => [
    {t:'h', de:[-d.b/2,-2*d.h/5], a:[d.b/2,-2*d.h/5],  lado:'abajo', txt:'b'},
    {t:'v', de:[-d.b/2,-2*d.h/5], a:[-d.b/2,3*d.h/5],  lado:'izq',   txt:'h'},
    {t:'pt', p:[0, 3*d.h/5], txt:'V', opts:{dx:9, dy:-4, anchor:'start'}}
  ],
  semiparabola: d => { const ox = -3*d.a/8, oy = -2*d.h/5; return [
    {t:'h', de:[ox,oy], a:[ox+d.a,oy], lado:'abajo', txt:'a'},
    {t:'v', de:[ox,oy], a:[ox,oy+d.h], lado:'izq',   txt:'h'},
    {t:'pt', p:[ox, oy+d.h], txt:'V', opts:{dx:8, dy:-4, anchor:'start'}}
  ]; },
  // El lado vertical está a la derecha: la altura se acota por ahí.
  // Aquí la parábola es TANGENTE a la base en O: su vértice es el propio
  // origen, y conviene decirlo, porque es lo que distingue esta figura de la
  // media parábola.
  enjuta: d => { const ox = -3*d.a/4, oy = -3*d.h/10; return [
    {t:'h', de:[ox,oy],       a:[ox+d.a,oy],       lado:'abajo', txt:'a'},
    {t:'v', de:[ox+d.a,oy],   a:[ox+d.a,oy+d.h],   lado:'der',   txt:'h'},
    {t:'pt', p:[ox, oy], txt:'V', opts:{dx:2, dy:-8, anchor:'start'}}
  ]; },

  // ── Elípticas ── (a y b son SEMIEJES: se acotan desde el centro)
  cuartoelipse: d => { const dx = 4*d.a/(3*Math.PI), dy = 4*d.b/(3*Math.PI); return [
    {t:'h', de:[-dx,-dy], a:[d.a-dx,-dy], lado:'abajo', txt:'a'},
    {t:'v', de:[-dx,-dy], a:[-dx,d.b-dy], lado:'izq',   txt:'b'}
  ]; },
  semielipse: d => { const yc = 4*d.b/(3*Math.PI); return [
    {t:'h', de:[0,-yc],     a:[d.a,-yc],     lado:'abajo', txt:'a'},
    {t:'v', de:[-d.a,-yc],  a:[-d.a,d.b-yc], lado:'izq',   txt:'b'}
  ]; },
  elipse: d => [
    {t:'h', de:[0,0], a:[d.a,0], lado:'abajo', txt:'a'},
    {t:'v', de:[0,0], a:[0,d.b], lado:'izq',   txt:'b'}
  ],

  // ── Polígonos ── (R es el radio circunscrito: del centro a un vértice)
  hexagono: d => [
    {t:'r', c:[0,0], r:d.r, ang:0, txt:'R'}
  ],
  octogono: d => [
    {t:'r', c:[0,0], r:d.r, ang:22.5, txt:'R'}
  ]
};

// ── Puntos de anclaje ─────────────────────────────────────────────────────
// Cada familia de anclas tiene su color, y el ANCLA ACTIVA se resalta con un
// anillo: en el panel se ve dónde queda el punto desde el que se está
// colocando la figura (petición del profesor, 2026-09-23).
const ANCLA_COLOR = {
  C:   '#e2900b',   // centroide — ámbar, el mismo color con el que va la G
  esq: '#15803d',   // esquinas de la caja (BL, BR, TL, TR)
  med: '#0e7490',   // medios de un lado (BM, M)
  ver: '#7c3aed'    // vértices y extremos con nombre (O, V, E1, E2)
};
const ANCLA_FAMILIA = {C:'C', BL:'esq', BR:'esq', TL:'esq', TR:'esq',
                       BM:'med', M:'med', O:'ver', V:'ver', E1:'ver', E2:'ver'};
function colorAncla(a){ return ANCLA_COLOR[ANCLA_FAMILIA[a] || 'ver'] || ANCLA_COLOR.ver; }
// Leyenda corta, en HTML, para poner junto a la ficha.
function leyendaAnclasHTML(){
  const p = (col, txt) => '<span style="display:inline-flex;align-items:center;gap:3px">'
    + '<span style="width:8px;height:8px;border-radius:50%;background:' + col + ';display:inline-block"></span>'
    + txt + '</span>';
  return '<div class="ref-fig-leyenda">' + p(ANCLA_COLOR.C, 'centroide') + p(ANCLA_COLOR.esq, 'esquina')
       + p(ANCLA_COLOR.med, 'medio') + p(ANCLA_COLOR.ver, 'vértice') + '</div>';
}

// ── Fórmulas de cada figura (ventana del botón de información) ───────────
// Antes iban debajo del dibujo, apretadas y sin decir respecto a qué ejes
// estaban escritas. Ahora se listan en una TABLA que abre el botón ⓘ de la
// ficha, con las aclaraciones debajo (decisión del profesor, 2026-09-23).
//   A       área
//   x, y    centroide, medido desde el ORIGEN de la ficha (el punto O que
//           acotan x̄ e ȳ en el dibujo); null si el centroide es el centro
//   Ix, Iy, Pxy   SIEMPRE respecto de los ejes centroidales x'–y'
//   notas   aclaraciones propias de esa figura
// Las de área y centroide están comprobadas contra def.area() y
// def.anchorOffset() con medidas al azar (test-formulas.js del scratchpad).
const FORMULAS_FICHA = {
  rect:        {A:'b·h', x:'b/2', y:'h/2',
                Ix:'b·h³/12', Iy:'b³·h/12', Pxy:'0'},
  rtriangle:   {A:'b·h/2', x:'b/3', y:'h/3',
                Ix:'b·h³/36', Iy:'b³·h/36', Pxy:'−b²h²/72'},
  rtriangle2:  {A:'b·h/2', x:'b/3', y:'h/3',
                Ix:'b·h³/36', Iy:'b³·h/36', Pxy:'+b²h²/72',
                notas:['x̄ se mide hacia la <b>izquierda</b> de O: el ángulo recto está a la derecha.']},
  triangulo:   {A:'b·h/2', x:'(b + d)/3', y:'h/3',
                Ix:'b·h³/36', Iy:'b·h(b² − b·d + d²)/36', Pxy:'b·h²(2d − b)/72',
                notas:['<i>d</i> es la abscisa del vértice opuesto, medida desde O.']},
  trapecio:    {A:'(a + b)·h/2', x:'por la fórmula exacta del polígono', y:'h(a + 2b)/3(a + b)',
                Ix:'h³(a² + 4ab + b²)/36(a + b)', Iy:'exacta, por polígono', Pxy:'exacta, por polígono',
                notas:['<i>a</i> es la base mayor y <i>b</i> la menor, desplazada <i>dx</i>.',
                       'P̄ₓ&#x1D67; solo vale 0 si el trapecio es isósceles.']},
  circle:      {A:'π·R²', x:null, y:null,
                Ix:'π·R⁴/4', Iy:'π·R⁴/4', Pxy:'0'},
  semicircle:  {A:'π·R²/2', x:'0', y:'4R/3π',
                Ix:'0.1098·R⁴', Iy:'π·R⁴/8', Pxy:'0'},
  quarter:     {A:'π·R²/4', x:'4R/3π', y:'4R/3π',
                Ix:'0.0549·R⁴', Iy:'0.0549·R⁴', Pxy:'−0.01647·R⁴'},
  sector:      {A:'θ·R²', x:'0', y:'2R·sen θ/3θ',
                Ix:'R⁴(θ − ½·sen 2θ)/4', Iy:'R⁴(θ + ½·sen 2θ)/4 − A·ȳ²', Pxy:'0',
                notas:['θ es el <b>semiángulo</b>: el ángulo total del sector es 2θ.',
                       'En las fórmulas θ va en <b>radianes</b>; en el panel se escribe en grados.']},
  segmento:    {A:'R²(θ − sen θ·cos θ)', x:'0', y:'2R·sen³θ/3(θ − sen θ·cos θ) − R·cos θ',
                Ix:'R⁴(θ − sen θ cos θ + 2 sen³θ cos θ)/4 − A·y₀²',
                Iy:'R⁴(3θ − 3 sen θ cos θ − 2 sen³θ cos θ)/12', Pxy:'0',
                notas:['θ es el <b>semiángulo</b> medido en el centro del arco, en <b>radianes</b>.',
                       'ȳ se mide desde el punto medio de la cuerda; y₀ es la altura del centroide sobre el centro.']},
  parabola:    {A:'2b·h/3', x:'0', y:'2h/5',
                Ix:'8b·h³/175', Iy:'b³·h/30', Pxy:'0',
                notas:['El vértice <b>V</b> es la cima; la base es la cuerda de longitud <i>b</i>.']},
  semiparabola:{A:'2a·h/3', x:'3a/8', y:'2h/5',
                Ix:'8a·h³/175', Iy:'19a³·h/480', Pxy:'−a²h²/60',
                notas:['El vértice <b>V</b> está sobre el lado vertical, a la altura <i>h</i>.']},
  enjuta:      {A:'a·h/3', x:'3a/4', y:'3h/10',
                Ix:'37a·h³/2100', Iy:'a³·h/80', Pxy:'+a²h²/120',
                notas:['La parábola es <b>tangente a la base en O</b>: ahí está su vértice <b>V</b>.']},
  cuartoelipse:{A:'π·a·b/4', x:'4a/3π', y:'4b/3π',
                Ix:'a·b³(π/16 − 4/9π)', Iy:'a³·b(π/16 − 4/9π)', Pxy:'a²b²(1/8 − 4/9π)',
                notas:['<i>a</i> y <i>b</i> son los <b>semiejes</b>, medidos desde O.']},
  semielipse:  {A:'π·a·b/2', x:'0', y:'4b/3π',
                Ix:'a·b³(π/8 − 8/9π)', Iy:'π·a³·b/8', Pxy:'0',
                notas:['<i>a</i> es el semieje horizontal y <i>b</i> la altura, desde la base plana.']},
  elipse:      {A:'π·a·b', x:null, y:null,
                Ix:'π·a·b³/4', Iy:'π·a³·b/4', Pxy:'0',
                notas:['<i>a</i> y <i>b</i> son los <b>semiejes</b>: los ejes miden 2a y 2b.']},
  hexagono:    {A:'3√3·R²/2', x:'0', y:'√3·R/2',
                Ix:'5√3·R⁴/16', Iy:'5√3·R⁴/16', Pxy:'0',
                notas:['<i>R</i> es el radio <b>circunscrito</b>: del centro a un vértice.',
                       'Con Īₓ = Ī&#x1D67; y P̄ₓ&#x1D67; = 0, <b>cualquier eje por G da la misma inercia</b>.']},
  octogono:    {A:'2√2·R²', x:'0', y:'R·cos(π/8)',
                Ix:'A(6R² − L²)/24', Iy:'A(6R² − L²)/24', Pxy:'0',
                notas:['<i>R</i> es el radio <b>circunscrito</b> y <i>L</i> = 2R·sen(π/8) el lado.',
                       'Con Īₓ = Ī&#x1D67; y P̄ₓ&#x1D67; = 0, cualquier eje por G da la misma inercia.']}
};
// Nombre del punto desde el que se miden x̄ e ȳ, para decirlo en la ventana.
const ORIGEN_TEXTO = {
  BL:'la esquina inferior izquierda', BR:'la esquina inferior derecha',
  BM:'el centro de la base', M:'el punto medio de la cuerda',
  O:'el vértice', C:'el propio centroide'
};
// La ventana de información: una tabla con el área, el centroide y las
// inercias, y debajo las aclaraciones (qué es cada letra, si el ángulo va en
// radianes y respecto a qué ejes está escrito cada grupo de fórmulas).
function formulasFiguraHTML(tipo){
  const f = FORMULAS_FICHA[tipo], def = (typeof FIG_DEFS !== 'undefined') && FIG_DEFS[tipo];
  if(!f || !def) return '';
  const ancO = _ffOrigen(tipo, def), nomO = ORIGEN_TEXTO[ancO] || 'el origen O';
  const fila = (m, e, cls) => '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
    + '<td class="ff-m">' + m + '</td><td class="ff-e">' + e + '</td></tr>';
  let filas = fila('A', f.A, 'ff-sep');
  if(f.x || f.y){
    if(f.x) filas += fila('x̄', f.x);
    if(f.y) filas += fila('ȳ', f.y);
  } else {
    filas += fila('x̄, ȳ', 'en el centro de la figura');
  }
  filas += fila('Īₓ', f.Ix, 'ff-sep') + fila('Ī&#x1D67;', f.Iy) + fila('P̄ₓ&#x1D67;', f.Pxy);
  const notas = (f.notas || []).concat([
    'x̄ e ȳ se miden desde <b>O</b>, ' + nomO + '.',
    'Īₓ, Ī&#x1D67; y P̄ₓ&#x1D67; son respecto de los <b>ejes centroidales x′–y′</b> (los de trazos); '
    + 'para cualquier otro eje, aplica Steiner.'
  ]);
  return '<div class="ff-info">'
    + '<div class="ff-tit">' + (def.name || tipo) + '</div>'
    + '<table class="ff-tabla"><tbody>' + filas + '</tbody></table>'
    + '<ul class="ff-notas">' + notas.map(n=>'<li>' + n + '</li>').join('') + '</ul>'
    + '</div>';
}

// ── La ficha ─────────────────────────────────────────────────────────────
// Devuelve el SVG (cadena) de la figura `tipo` acotada, o '' si no se puede.
function fichaFiguraSVG(tipo, opts){
  opts = opts || {};
  const def = (typeof FIG_DEFS !== 'undefined') && FIG_DEFS[tipo];
  if(!def || !def.draw || !COTAS_FICHA[tipo]) return '';
  const d = {};
  (def.dims || []).forEach(x=>{ d[x.id] = x.def; });

  const cmds = _ffTrazo(def, d);
  if(!cmds) return '';

  // Caja del dibujo: la declarada, unida a la del trazo y al origen de cotas.
  let b;
  try{ b = def.bounds(d); }catch(e){ return ''; }
  let x0 = b.left, x1 = b.right, y0 = b.bottom, y1 = b.top;
  cmds.forEach(c=>{ if(c[0] === 'Z') return;
    x0 = Math.min(x0,c[1]); x1 = Math.max(x1,c[1]);
    y0 = Math.min(y0,c[2]); y1 = Math.max(y1,c[2]); });
  const ancO = _ffOrigen(tipo, def);
  const oo = def.anchorOffset ? def.anchorOffset(d, ancO) : {dx:0, dy:0};
  x0 = Math.min(x0, oo.dx); x1 = Math.max(x1, oo.dx);
  y0 = Math.min(y0, oo.dy); y1 = Math.max(y1, oo.dy);
  (COTAS_FICHA[tipo](d) || []).forEach(c=>{
    const ps = [];
    if(c.c) ps.push(c.c);
    if(c.t === 'linea'){ ps.push(c.de, c.a); }
    if(c.t === 'pt') ps.push(c.p);
    if(c.t === 'ang'){                       // los dos extremos del arco
      const rr = c.r*1.1;
      [c.a0, c.a1, (c.a0+c.a1)/2].forEach(a=>
        ps.push([c.c[0] + rr*Math.cos(a), c.c[1] + rr*Math.sin(a)]));
    }
    ps.forEach(q=>{ x0 = Math.min(x0,q[0]); x1 = Math.max(x1,q[0]);
                    y0 = Math.min(y0,q[1]); y1 = Math.max(y1,q[1]); });
  });

  // Márgenes: solo se reserva sitio donde de verdad hay cotas, y se apilan los
  // niveles (el trapecio lleva dos arriba: la base menor y su desplazamiento).
  const lista = COTAS_FICHA[tipo](d) || [];
  const nivMax = (lado, t) => lista.reduce((m,c)=>
    (c.t === t && (c.lado||'') === lado) ? Math.max(m, c.niv || 1) : m, 0);
  const margen = (lado, t, base) => { const n = nivMax(lado, t);
    return n ? base + FF.sepCota + (n-1)*15 : base; };
  const mIzq = margen('izq','v', 20), mDer = margen('der','v', 24);
  const mSup = margen('arriba','h', 20), mInf = margen('abajo','h', 20);

  // Encaje en la zona de dibujo.
  const zW = FF.W - mIzq - mDer, zH = FF.H - mSup - mInf;
  const s = Math.min(zW/Math.max(x1-x0,1e-9), zH/Math.max(y1-y0,1e-9));
  const px = x => mIzq + (x - x0)*s + (zW - (x1-x0)*s)/2;
  const py = y => FF.H - mInf - (y - y0)*s - (zH - (y1-y0)*s)/2;

  // Silueta.
  let path = '';
  cmds.forEach(c=>{ path += c[0]==='Z' ? 'Z' : (c[0] + _ffN(px(c[1])) + ',' + _ffN(py(c[2])) + ' '); });
  if(path.indexOf('Z') < 0) path += 'Z';

  const O = {x:px(oo.dx), y:py(oo.dy)}, G = {x:px(0), y:py(0)};
  const izq = px(x0), der = px(x1), arr = py(y1), aba = py(y0);

  // ¿Hay que acotar x̄ e ȳ, o el centroide cae sobre los propios ejes?
  const hayX = Math.abs(G.x - O.x) > 3, hayY = Math.abs(G.y - O.y) > 3;
  const ejeXesG = !hayY, ejeYesG = !hayX;

  let g = `<path d="${path}" fill="${FF_COL.relleno}" stroke="${FF_COL.linea}" stroke-width="1.6" stroke-linejoin="round"/>`;

  // ── Ejes de referencia por el origen ──
  const ex0 = Math.min(izq, O.x) - FF.extra, ex1 = Math.max(der, O.x) + FF.extra;
  const ey0 = Math.min(arr, O.y) - FF.extra, ey1 = Math.max(aba, O.y) + 5;
  const rotX = ejeXesG ? "x ≡ x'" : 'x', rotY = ejeYesG ? "y ≡ y'" : 'y';
  g += `<line x1="${_ffN(ex0)}" y1="${_ffN(O.y)}" x2="${_ffN(ex1)}" y2="${_ffN(O.y)}" stroke="${FF_COL.eje}" stroke-width="0.8"/>`
     + _ffPunta(ex1, O.y, 1, 0, FF_COL.eje, 4.6)
     + `<line x1="${_ffN(O.x)}" y1="${_ffN(ey1)}" x2="${_ffN(O.x)}" y2="${_ffN(ey0)}" stroke="${FF_COL.eje}" stroke-width="0.8"/>`
     + _ffPunta(O.x, ey0, 0, -1, FF_COL.eje, 4.6)
     // El rótulo compuesto es ancho: va encima de la punta, alineado a la
     // derecha, para no salirse del lienzo.
     + (ejeXesG ? _ffTexto(Math.min(ex1 + 3, FF.W - 2), O.y - 6, rotX, FF_COL.eje, {anchor:'end', fs:11})
                : _ffTexto(ex1 + 4, O.y + 4, rotX, FF_COL.eje, {anchor:'start', fs:11}))
     + _ffTexto(O.x - 5, ey0 + 1, rotY, FF_COL.eje, {anchor:'end', fs:11});
  // Si el origen ES el centroide no se marca dos veces: manda la G.
  if(hayX || hayY){
    if(opts.anclas === false)
      g += `<circle cx="${_ffN(O.x)}" cy="${_ffN(O.y)}" r="2.1" fill="${FF_COL.eje}"/>`;
    g += _ffTexto(O.x - 8, O.y + 13, 'O', FF_COL.eje, {anchor:'end', fs:10.5, recta:true});
  }

  // ── Cotas de las medidas, fuera de la figura ──
  // El nivel se mide desde el borde exterior del conjunto figura + ejes, para
  // que la línea de cota no caiga nunca sobre el dibujo ni sobre un eje.
  const bordeAba = Math.max(aba, O.y), bordeArr = Math.min(arr, O.y);
  const bordeIzq = Math.min(izq, O.x), bordeDer = Math.max(der, O.x);
  lista.forEach(c=>{
    const salto = ((c.niv || 1) - 1)*15;
    if(c.t === 'h'){
      const arriba = c.lado === 'arriba';
      const y = arriba ? -1 : 1;
      const dest = arriba ? bordeArr - FF.sepCota - salto : bordeAba + FF.sepCota + salto;
      g += _ffCota(px(c.de[0]), py(c.de[1]), px(c.a[0]), py(c.a[1]), 0, y,
                   Math.abs(dest - py(c.de[1])), c.txt);
    } else if(c.t === 'v'){
      const der2 = c.lado === 'der';
      const x = der2 ? 1 : -1;
      const dest = der2 ? bordeDer + FF.sepCota + salto : bordeIzq - FF.sepCota - salto;
      g += _ffCota(px(c.de[0]), py(c.de[1]), px(c.a[0]), py(c.a[1]), x, 0,
                   Math.abs(dest - px(c.de[0])), c.txt);
    } else if(c.t === 'r'){
      g += _ffCotaRadio(px(c.c[0]), py(c.c[1]), c.r*s, c.ang, c.txt);
    } else if(c.t === 'ang'){
      g += _ffCotaAngulo(px(c.c[0]), py(c.c[1]), c.r*s, c.a0, c.a1, c.txt, null, {dentro:c.dentro});
    } else if(c.t === 'linea'){
      g += _ffAuxiliar(px(c.de[0]), py(c.de[1]), px(c.a[0]), py(c.a[1]));
    } else if(c.t === 'pt'){
      const hayAncla = opts.anclas !== false && (def.anchors || []).some(a=>{
        let q; try{ q = def.anchorOffset(d, a); }catch(e){ return false; }
        return Math.hypot(px(q.dx) - px(c.p[0]), py(q.dy) - py(c.p[1])) < 3;
      });
      g += _ffPunto(px(c.p[0]), py(c.p[1]), c.txt, null,
                    Object.assign({soloTexto:hayAncla}, c.opts));
    }
  });

  // ── Centroide y sus cotas ──
  // ── Puntos de anclaje ──
  // Se dibujan antes que el centroide para que su marca quede por encima.
  if(opts.anclas !== false && def.anchorOffset){
    const activa = opts.activa || null;
    (def.anchors || []).forEach(a=>{
      if(a === 'C') return;                       // el centroide ya es la G
      let q; try{ q = def.anchorOffset(d, a); }catch(e){ return; }
      const ax = px(q.dx), ay = py(q.dy), col = colorAncla(a);
      if(a === activa)
        g += `<circle cx="${_ffN(ax)}" cy="${_ffN(ay)}" r="6.4" fill="${col}" opacity=".22"/>`
           + `<circle cx="${_ffN(ax)}" cy="${_ffN(ay)}" r="3.6" fill="${col}" stroke="#fff" stroke-width="1.2"/>`;
      else
        g += `<circle cx="${_ffN(ax)}" cy="${_ffN(ay)}" r="2.5" fill="${col}" stroke="#fff" stroke-width="0.9"/>`;
    });
  }

  // x̄ e ȳ: del eje al centroide. La cota va sobre la propia distancia, así que
  // no hacen falta líneas de referencia: el extremo ya se apoya en el eje.
  if(hayX) g += _ffCota(O.x, G.y, G.x, G.y, 0, 0, 0, 'x', FF_COL.cen, {ext:false, fs:12.5, barra:true});
  if(hayY) g += _ffCota(G.x, O.y, G.x, G.y, 0, 0, 0, 'y', FF_COL.cen, {ext:false, fs:12.5, barra:true});
  // Ejes centroidales x'–y' por G: son los ejes de las fórmulas de inercia
  // (Ī es siempre centroidal), y sin dibujarlos la ficha no dice respecto a
  // qué están escritas. Van en trazo fino para no competir con la figura.
  if(opts.ejesG !== false){
    const t = `stroke="${FF_COL.cen}" stroke-width="0.75" stroke-dasharray="5,3" opacity=".65"`;
    const gx0 = Math.min(izq, O.x) - 7, gx1 = Math.max(der, O.x) + 7;
    const gy0 = Math.min(arr, O.y) - 7, gy1 = Math.max(aba, O.y) + 7;
    // Si el eje centroidal COINCIDE con el de referencia (x̄ = 0 o ȳ = 0, como
    // en el semicírculo o la parábola) no se dibuja dos veces: se dice en el
    // rótulo que son el mismo eje.
    // El rótulo va al lado que no ocupa una cota exterior: con la altura
    // acotada a la derecha (enjuta), x' se escribe a la izquierda.
    const cotaDer = nivMax('der','v') > 0, cotaArr = nivMax('arriba','h') > 0;
    if(hayY){
      g += `<line x1="${_ffN(gx0)}" y1="${_ffN(G.y)}" x2="${_ffN(gx1)}" y2="${_ffN(G.y)}" ${t}/>`
         + (cotaDer ? _ffTexto(gx0 - 3, G.y + 3.5, "x'", FF_COL.cenTxt, {anchor:'end', fs:10.5})
                    : _ffTexto(gx1 + 3, G.y + 3.5, "x'", FF_COL.cenTxt, {anchor:'start', fs:10.5}));
    }
    if(hayX){
      g += `<line x1="${_ffN(G.x)}" y1="${_ffN(gy1)}" x2="${_ffN(G.x)}" y2="${_ffN(gy0)}" ${t}/>`
         + (cotaArr ? _ffTexto(G.x + 4, gy1 - 1, "y'", FF_COL.cenTxt, {anchor:'start', fs:10.5})
                    : _ffTexto(G.x + 4, gy0 + 2, "y'", FF_COL.cenTxt, {anchor:'start', fs:10.5}));
    }
  }
  const gDer = G.x >= O.x, gArr = G.y <= O.y;
  if((opts.activa || 'C') === 'C' && opts.anclas !== false)
    g += `<circle cx="${_ffN(G.x)}" cy="${_ffN(G.y)}" r="6.6" fill="${FF_COL.cen}" opacity=".22"/>`;
  g += `<circle cx="${_ffN(G.x)}" cy="${_ffN(G.y)}" r="3.6" fill="${FF_COL.cen}" stroke="#fff" stroke-width="1.2"/>`
     + _ffTexto(G.x + (gDer ? 9 : -9), G.y + (gArr ? -8 : 13), 'G', FF_COL.cenTxt,
                {anchor:gDer ? 'start' : 'end', fs:12.5});

  const nom = (def.name || tipo).replace(/[<>&]/g, '');
  return `<svg viewBox="0 0 ${FF.W} ${FF.H}" class="ref-fig-svg" role="img" `
       + `aria-label="${nom} acotada: medidas y posición del centroide G desde los ejes de referencia">${g}</svg>`;
}
