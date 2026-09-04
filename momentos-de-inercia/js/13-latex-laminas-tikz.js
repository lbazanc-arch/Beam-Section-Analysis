// ═══════════════════════════════════════════════════════════════════════════
//  LÁMINAS TikZ DEL INFORME  (portadas del Cap. 9)
// ═══════════════════════════════════════════════════════════════════════════
// El papel dibuja la MISMA geometría que el lienzo y usa el MISMO planificador
// de cotas (planCotas / planCallouts), así que el informe muestra exactamente
// las cotas que el alumno ve en pantalla, sin superposiciones.

function hexRgbSpec(hex){
  hex = String(hex||'#888888').replace('#','');
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.substr(0,2),16)||136,
        g = parseInt(hex.substr(2,2),16)||136,
        b = parseInt(hex.substr(4,2),16)||136;
  return 'rgb,255:red,'+r+';green,'+g+';blue,'+b;
}

// ── Trazado LOCAL (unidades reales, sin escalar) de cada tipo de figura ──
// Reproduce la misma geometría que FIG_DEFS[tipo].draw() pinta en el lienzo,
// pero como órdenes de TikZ en vez de llamadas a ctx. El origen local es el
// centroide de la figura, igual que en el modelo.
function figuraPathLocal(tipo, d){
  if(tipo === 'rect'){
    return '(' + (-d.b/2) + ',' + (-d.h/2) + ') rectangle (' + (d.b/2) + ',' + (d.h/2) + ')';
  }
  if(tipo === 'rtriangle'){
    return '(' + (-d.b/3) + ',' + (-d.h/3) + ') -- (' + (2*d.b/3) + ',' + (-d.h/3)
         + ') -- (' + (-d.b/3) + ',' + (2*d.h/3) + ') -- cycle';
  }
  if(tipo === 'rtriangle2'){
    return '(' + (-2*d.b/3) + ',' + (-d.h/3) + ') -- (' + (d.b/3) + ',' + (-d.h/3)
         + ') -- (' + (d.b/3) + ',' + (2*d.h/3) + ') -- cycle';
  }
  if(tipo === 'circle'){
    return '(0,0) circle (' + d.r + ')';
  }
  if(tipo === 'semicircle'){
    const yc = 4*d.r/(3*Math.PI);
    return '(' + (-d.r) + ',' + (-yc) + ') arc (180:0:' + d.r + ') -- cycle';
  }
  if(tipo === 'quarter'){
    const dc = 4*d.r/(3*Math.PI);
    return '(' + (-dc) + ',' + (-dc) + ') -- (' + (d.r-dc) + ',' + (-dc)
         + ') arc (0:90:' + d.r + ') -- cycle';
  }
  if(tipo === 'sector'){
    // dims.alpha es SIEMPRE el semiángulo, aunque la interfaz lo pida total.
    const t = d.alpha, tr = t*Math.PI/180, R = d.r, yc = 2*R*Math.sin(tr)/(3*tr);
    return '(0,' + (-yc) + ') -- (' + (-R*Math.sin(tr)) + ',' + (R*Math.cos(tr)-yc)
         + ') arc (' + (90+t) + ':' + (90-t) + ':' + R + ') -- cycle';
  }
  // ── Perfiles laminados: no existen en el Cap. 9, se trasladan desde el
  //    draw() de FIG_DEFS de este capítulo, vértice a vértice.
  if(tipo === 'wshape'){
    const B=d.bf/2, H=d.d/2, w=d.tw/2, hi=d.d/2-d.tf;
    const P=[[-B,H],[B,H],[B,hi],[w,hi],[w,-hi],[B,-hi],[B,-H],[-B,-H],
             [-B,-hi],[-w,-hi],[-w,hi],[-B,hi]];
    return P.map(q=>'('+q[0]+','+q[1]+')').join(' -- ') + ' -- cycle';
  }
  if(tipo === 'channel'){
    const xb=FIG_DEFS.channel._xbar(d), H=d.d/2;
    const x0=-xb, x1=d.bf-xb, w=x0+d.tw, hi=H-d.tf;
    const P=[[x0,H],[x1,H],[x1,hi],[w,hi],[w,-hi],[x1,-hi],[x1,-H],[x0,-H]];
    return P.map(q=>'('+q[0]+','+q[1]+')').join(' -- ') + ' -- cycle';
  }
  if(tipo === 'angleL'){
    const c=FIG_DEFS.angleL._c(d);
    const x0=-c.xb, y0=-c.yb;
    const P=[[x0,y0],[x0+d.b1,y0],[x0+d.b1,y0+d.t],[x0+d.t,y0+d.t],
             [x0+d.t,y0+d.b2],[x0,y0+d.b2]];
    return P.map(q=>'('+q[0]+','+q[1]+')').join(' -- ') + ' -- cycle';
  }
  return '(0,0) circle (1)';
}

// ── Dibuja una figura ya colocada (posición y rotación reales) ──
function tikzFigura(fig, tx, ty, esc, numero){
  const cxS = tx(fig.cx), cyS = ty(fig.cy);
  const pathLocal = figuraPathLocal(fig.type, fig.dims);
  const col = hexRgbSpec(fig.color);
  const esSuma = fig.sign === 1;
  // Lo que suma va macizo; lo que resta, con trama y borde discontinuo. Misma
  // convención que en pantalla y que en el Cap. 9.
  const relleno = esSuma
    ? 'fill={' + col + '}, fill opacity=0.30, draw={' + col + '}, line width=0.9pt'
    : 'pattern=north east lines, pattern color={' + col + '}, draw={' + col + '}, line width=0.8pt, dashed';
  let s = '\\begin{scope}[shift={(' + cxS + ',' + cyS + ')}, rotate=' + (fig.rotation||0) + ', scale=' + esc + ']\n';
  s += '\\filldraw[' + relleno + '] ' + pathLocal + ';\n';
  s += '\\end{scope}\n';
  s += '\\fill[black!55] (' + cxS + ',' + cyS + ') circle (1.1pt);\n';
  // Número de la parte, junto a su centroide: el informe cita las partes por
  // número («Parte 2», «Tabla 1»), y sin él el lector no sabe cuál es cuál.
  if(numero){
    s += '\\node[font=\\tiny\\bfseries, circle, draw={' + col + '}, fill=white, inner sep=0.9pt, '
       + 'above right=2pt] at (' + cxS + ',' + cyS + ') {' + numero + '};\n';
  }
  return s;
}

// Las magnitudes van en cm de TikZ, no en píxeles, así que los umbrales del
// planificador se pasan explícitos. El ancho del texto se estima: \tiny ronda
// los 0,09 cm por carácter.
const TIKZ_COTA = {fusion:0.16, minSeg:0.62, holgura:0.14, maxNiveles:5};
const TIKZ_SALTO = 0.34;   // cm entre niveles de etiqueta
function tikzMedirTexto(t){ return String(t).length * 0.09; }

// borde: coordenada (en cm de TikZ) donde arranca la línea de referencia, es
// decir el canto del dibujo. Sin ella la cota no dice de qué punto sale.
function tikzCadenaCotas(valores, proy, eje, base, borde){
  const plan = planCotas(valores, proy, tikzMedirTexto, TIKZ_COTA);
  if(!plan) return {tex:'', nMax:0, plan:null};
  const n = v => v.toFixed(3);
  const q = plan.coords.map(v=>proy(v));
  const ini = Math.min(...q), fin = Math.max(...q);
  let s = '';

  const desde = (borde === undefined) ? base + (eje==='x' ? 0.10 : -0.10) : borde;
  plan.coords.forEach(v=>{
    const w = proy(v);
    if(eje==='x') s += '\\draw[black!30, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(w) + ',' + n(desde) + ') -- (' + n(w) + ',' + n(base-0.10) + ');\n';
    else          s += '\\draw[black!30, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(desde) + ',' + n(w) + ') -- (' + n(base+0.10) + ',' + n(w) + ');\n';
  });

  if(eje==='x') s += '\\draw[black!65, line width=0.35pt] (' + n(ini) + ',' + n(base) + ') -- (' + n(fin) + ',' + n(base) + ');\n';
  else          s += '\\draw[black!65, line width=0.35pt] (' + n(base) + ',' + n(ini) + ') -- (' + n(base) + ',' + n(fin) + ');\n';

  const T = 0.09;
  plan.coords.forEach(v=>{
    const w = proy(v);
    if(eje==='x') s += '\\draw[black!65, line width=0.35pt] (' + n(w-T) + ',' + n(base-T) + ') -- (' + n(w+T) + ',' + n(base+T) + ');\n';
    else          s += '\\draw[black!65, line width=0.35pt] (' + n(base-T) + ',' + n(w-T) + ') -- (' + n(base+T) + ',' + n(w+T) + ');\n';
  });

  // Etiquetas escalonadas, siempre alejándose del dibujo: es lo que impide que
  // dos cotas cortas se pisen.
  plan.segs.forEach(sg=>{
    if(!sg.visible) return;
    const d = 0.24 + sg.nivel*TIKZ_SALTO;
    if(eje==='x'){
      const y = base - d;
      s += '\\draw[black!40, line width=0.2pt] (' + n(sg.centro) + ',' + n(base-0.04) + ') -- (' + n(sg.centro) + ',' + n(y+0.10) + ');\n';
      s += '\\node[font=\\tiny, inner sep=0.6pt, fill=white] at (' + n(sg.centro) + ',' + n(y) + ') {' + sg.txt + '};\n';
    } else {
      const x = base + d;
      s += '\\draw[black!40, line width=0.2pt] (' + n(base+0.04) + ',' + n(sg.centro) + ') -- (' + n(x-0.10) + ',' + n(sg.centro) + ');\n';
      s += '\\node[font=\\tiny, inner sep=0.6pt, fill=white, rotate=90] at (' + n(x) + ',' + n(sg.centro) + ') {' + sg.txt + '};\n';
    }
  });
  return {tex:s, nMax:plan.nMax, plan};
}

function tikzCotasCompuesta(cajaMundo, tx, ty){
  const n = v => v.toFixed(3);
  const px = x => parseFloat(tx(x));
  const py = y => parseFloat(ty(y));
  const {xs, ys} = bordesFiguras();
  let s = '';

  // ── Cadena horizontal, debajo ──
  const yBorde = py(cajaMundo.bottom);
  const baseX = yBorde - 0.75;
  const cadX = tikzCadenaCotas(xs, px, 'x', baseX, yBorde + 0.06);
  s += cadX.tex;

  // ── Cadena vertical, a la derecha ──
  const xBorde = px(cajaMundo.right);
  const baseY = xBorde + 0.75;
  const cadY = tikzCadenaCotas(ys, py, 'y', baseY, xBorde - 0.06);
  s += cadY.tex;

  // ── Cotas totales, por fuera de cada cadena ──
  const yTot = baseX - 0.30 - (cadX.nMax+1)*TIKZ_SALTO;
  s += '\\draw[black!40, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(px(cajaMundo.left)) + ',' + n(yBorde) + ') -- (' + n(px(cajaMundo.left)) + ',' + n(yTot-0.10) + ');\n';
  s += '\\draw[black!40, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(px(cajaMundo.right)) + ',' + n(yBorde) + ') -- (' + n(px(cajaMundo.right)) + ',' + n(yTot-0.10) + ');\n';
  s += '\\draw[bsaVerde, line width=0.45pt, <->, >=stealth] (' + n(px(cajaMundo.left)) + ',' + n(yTot) + ') -- (' + n(px(cajaMundo.right)) + ',' + n(yTot) + ');\n';
  s += '\\node[font=\\scriptsize\\bfseries, text=bsaVerde, fill=white, inner sep=1pt] at ('
     + n((px(cajaMundo.left)+px(cajaMundo.right))/2) + ',' + n(yTot) + ') {'
     + decP(cajaMundo.right-cajaMundo.left,'len') + '\\,' + unit + '};\n';

  const xTot = baseY + 0.30 + (cadY.nMax+1)*TIKZ_SALTO;
  s += '\\draw[black!40, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(xBorde) + ',' + n(py(cajaMundo.bottom)) + ') -- (' + n(xTot+0.10) + ',' + n(py(cajaMundo.bottom)) + ');\n';
  s += '\\draw[black!40, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(xBorde) + ',' + n(py(cajaMundo.top)) + ') -- (' + n(xTot+0.10) + ',' + n(py(cajaMundo.top)) + ');\n';
  s += '\\draw[bsaVerde, line width=0.45pt, <->, >=stealth] (' + n(xTot) + ',' + n(py(cajaMundo.bottom)) + ') -- (' + n(xTot) + ',' + n(py(cajaMundo.top)) + ');\n';
  s += '\\node[font=\\scriptsize\\bfseries, text=bsaVerde, fill=white, inner sep=1pt, rotate=90] at ('
     + n(xTot) + ',' + n((py(cajaMundo.bottom)+py(cajaMundo.top))/2) + ') {'
     + decP(cajaMundo.top-cajaMundo.bottom,'len') + '\\,' + unit + '};\n';

  // ── Radios y ángulos de las figuras curvas ──
  // Una cadena ortogonal no puede expresar un radio ni el ángulo de un sector.
  // Se rotulan con el mismo criterio que en pantalla: cada valor en su recuadro,
  // en un hueco libre cerca de su figura y con una guía que apunta a ella. Se
  // reutiliza planCallouts, así que la colocación sigue la misma lógica.
  const ALTO_ROT = 0.28;
  const items = [];
  figures.forEach(f=>{
    const d = f.dims;
    if(d.r === undefined) return;
    const rot = (f.rotation||0)*Math.PI/180;
    const co = {x:0, y:0};
    if(f.type==='quarter'){ const dc=4*d.r/(3*Math.PI); co.x=-dc; co.y=-dc; }
    else if(f.type==='semicircle'){ co.y = -4*d.r/(3*Math.PI); }
    else if(f.type==='sector'){ const t=d.alpha*Math.PI/180; co.y = -2*d.r*Math.sin(t)/(3*t); }
    const wx = f.cx + co.x*Math.cos(rot) - co.y*Math.sin(rot);
    const wy = f.cy + co.x*Math.sin(rot) + co.y*Math.cos(rot);
    let txt = 'R=' + decP(d.r,'len');
    if(f.type==='sector') txt += ',\\ 2\\theta=' + decP(d.alpha*2,'len') + '^\\circ';
    items.push({txt, ancla:{x:px(wx), y:py(wy)},
                w: tikzMedirTexto(txt) + 0.22, h: ALTO_ROT});
  });

  if(items.length){
    const obst = figures.map(f=>{
      const b = figuraBoundsMundo(f);
      const x0 = px(b.left), x1 = px(b.right), y0 = py(b.bottom), y1 = py(b.top);
      return {x:x0-0.06, y:y0-0.06, w:(x1-x0)+0.12, h:(y1-y0)+0.12};
    });
    obst.push({x:-99, y:-99, w:198, h:99 + baseX + 0.20});   // banda inferior de cotas
    obst.push({x:baseY - 0.20, y:-99, w:99, h:198});         // banda derecha de cotas
    const marco = {x0:px(cajaMundo.left) - 3.2, y0:py(cajaMundo.bottom) - 0.2,
                   x1:baseY - 0.25,             y1:py(cajaMundo.top) + 1.6};
    const puestas = planCallouts(items, obst, marco, [0.85, 1.25, 1.75, 2.35, 3.00, 3.70]);
    puestas.forEach(pt=>{
      const salida = bordeCaja(pt.caja, pt.ancla);
      s += '\\draw[black!55, line width=0.28pt] (' + n(salida.x) + ',' + n(salida.y)
         + ') -- (' + n(pt.ancla.x) + ',' + n(pt.ancla.y) + ');\n';
      s += '\\fill[black!55] (' + n(pt.ancla.x) + ',' + n(pt.ancla.y) + ') circle (0.5pt);\n';
      s += '\\node[font=\\tiny, draw=black!45, fill=white, rounded corners=1pt, '
         + 'inner sep=1.4pt] at (' + n(pt.cx) + ',' + n(pt.cy) + ') {$' + pt.txt + '$};\n';
    });
  }
  return s;
}

// ── Lámina completa de la sección compuesta ──
function tikzSeccionCompuesta(opts){
  opts = opts || {};
  if(!figures.length) return '';
  const cajas = figures.map(figuraBoundsMundo);
  let minX = Math.min(...cajas.map(c=>c.left)),  maxX = Math.max(...cajas.map(c=>c.right));
  let minY = Math.min(...cajas.map(c=>c.bottom)), maxY = Math.max(...cajas.map(c=>c.top));
  // Con los ejes X-Y dibujados, el origen forma parte de la lamina. Si cae
  // fuera de la seccion hay que meterlo en la caja ANTES de calcular la
  // escala: en caso contrario el ancho real se subestima y el dibujo se sale
  // del papel por la izquierda.
  if(opts.ejes){
    minX = Math.min(minX, 0); maxX = Math.max(maxX, 0);
    minY = Math.min(minY, 0); maxY = Math.max(maxY, 0);
  }
  // El punto P puede caer fuera de la seccion: si se va a dibujar, entra en la
  // caja por el mismo motivo que el origen.
  if(opts.puntoP && extraPoint){
    minX = Math.min(minX, extraPoint.x); maxX = Math.max(maxX, extraPoint.x);
    minY = Math.min(minY, extraPoint.y); maxY = Math.max(maxY, extraPoint.y);
  }
  const anchoReal = Math.max(maxX-minX, 1e-6);
  const altoReal  = Math.max(maxY-minY, 1e-6);
  // El dibujo se ajusta al ancho útil, pero sin pasar de 14 cm de alto: una
  // sección alta (una I de 300 x 150) salía de 21 cm y no cabía tras el título
  // de la sección, que se quedaba solo en la página anterior.
  const esc = Math.min(10.5/anchoReal, 14/altoReal);
  const tx = (x)=> ((x-minX)*esc).toFixed(3);
  const ty = (y)=> ((y-minY)*esc).toFixed(3);

  let s = '';
  // Con numerar:true cada figura lleva su número de parte (el mismo orden que
  // results.steps y que las tablas del informe).
  figures.forEach((fig,i)=>{ s += tikzFigura(fig, tx, ty, esc, opts.numerar ? (i+1) : 0); });

  if(opts.marcarC && results){
    const cx = tx(results.xbar), cy = ty(results.ybar);
    s += '\\fill[bsaAlerta] (' + cx + ',' + cy + ') circle (2pt);\n';
    s += '\\node[font=\\small\\bfseries, above right, xshift=2pt] at (' + cx + ',' + cy + ') {C};\n';
  }
  if(opts.ejes){
    s += tikzEjesYCotasC({left:minX,right:maxX,bottom:minY,top:maxY}, tx, ty, !!opts.cotasC);
  }
  if(opts.ejesPrincipales){
    s += tikzEjesPrincipales({left:minX,right:maxX,bottom:minY,top:maxY}, tx, ty);
  }
  if(opts.puntoP){
    s += tikzPuntoPyEjes({left:minX,right:maxX,bottom:minY,top:maxY}, tx, ty);
  }
  if(opts.cotas !== false){
    s += tikzCotasCompuesta({left:minX,right:maxX,bottom:minY,top:maxY}, tx, ty);
  }
  return s;
}
