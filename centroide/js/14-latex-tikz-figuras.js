// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
window.addEventListener('load', ()=>{ try{ setHerramienta('pan'); }catch(e){} resizeCanvas(); fitView(); });
window.addEventListener('resize', resizeCanvas);

// ═══════════════════════════════════════════════════════════
//  GENERADOR DE PDF PROFESIONAL CON LATEX (texlive.net)
// ═══════════════════════════════════════════════════════════
// Traductor independiente del HTML: parte de los mismos datos que ya
// alimentan renderResults (figures, results), no del HTML ya armado.
function escLatex(s){
  const circulados = {'①':'(1)','②':'(2)','③':'(3)','④':'(4)','⑤':'(5)'};
  let out = String(s);
  Object.keys(circulados).forEach(k=>{ out = out.split(k).join(circulados[k]); });
  return out.replace(/([%&_#{}$])/g, '\\$1');
}
function decP(v, kind){
  const d = (kind==='len') ? DEC.len : DEC.area;
  const x = Math.abs(v) < 1e-9 ? 0 : v;
  return x.toFixed(d);
}
function hexRgbSpec(hex){
  hex = String(hex||'#888888').replace('#','');
  if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.substr(0,2),16)||136, g = parseInt(hex.substr(2,2),16)||136, b = parseInt(hex.substr(4,2),16)||136;
  return 'rgb,255:red,'+r+';green,'+g+';blue,'+b;
}

// ── Path LOCAL (unidades reales, sin escalar) de cada tipo de figura ──
// Reproduce exactamente la misma geometría que FIG_DEFS[tipo].draw() dibuja
// en el canvas, pero como comandos de TikZ en vez de llamadas a ctx.
function figuraPathLocal(tipo, d){
  if(tipo === 'rect'){
    return '(' + (-d.b/2) + ',' + (-d.h/2) + ') rectangle (' + (d.b/2) + ',' + (d.h/2) + ')';
  }
  if(tipo === 'rtriangle'){
    return '(' + (-d.b/3) + ',' + (-d.h/3) + ') -- (' + (2*d.b/3) + ',' + (-d.h/3) + ') -- (' + (-d.b/3) + ',' + (2*d.h/3) + ') -- cycle';
  }
  if(tipo === 'rtriangle2'){
    return '(' + (-2*d.b/3) + ',' + (-d.h/3) + ') -- (' + (d.b/3) + ',' + (-d.h/3) + ') -- (' + (d.b/3) + ',' + (2*d.h/3) + ') -- cycle';
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
    return '(' + (-dc) + ',' + (-dc) + ') -- (' + (d.r-dc) + ',' + (-dc) + ') arc (0:90:' + d.r + ') -- cycle';
  }
  if(tipo === 'sector'){
    const t = d.alpha, tr = t*Math.PI/180, R = d.r, yc = 2*R*Math.sin(tr)/(3*tr);
    return '(0,' + (-yc) + ') -- (' + (-R*Math.sin(tr)) + ',' + (R*Math.cos(tr)-yc) + ') arc (' + (90+t) + ':' + (90-t) + ':' + R + ') -- cycle';
  }
  // ── Perfiles laminados: los mismos vértices que draw() de FIG_DEFS ──
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

// ── Caja delimitadora de una figura YA rotada, en coordenadas mundo ──
function figuraBoundsMundo(fig){
  const def = FIG_DEFS[fig.type];
  const b = def.bounds(fig.dims);
  const rot = (fig.rotation||0)*Math.PI/180;
  const esquinas = [{x:b.left,y:b.bottom},{x:b.right,y:b.bottom},{x:b.right,y:b.top},{x:b.left,y:b.top}];
  const mundo = esquinas.map(p=>({
    x: fig.cx + p.x*Math.cos(rot) - p.y*Math.sin(rot),
    y: fig.cy + p.x*Math.sin(rot) + p.y*Math.cos(rot)
  }));
  return {
    left: Math.min(...mundo.map(p=>p.x)), right: Math.max(...mundo.map(p=>p.x)),
    bottom: Math.min(...mundo.map(p=>p.y)), top: Math.max(...mundo.map(p=>p.y))
  };
}

// ── Dibuja una figura ya colocada (posición + rotación reales) ──
function tikzFigura(fig, tx, ty, esc, numero){
  const def = FIG_DEFS[fig.type];
  const cxS = tx(fig.cx), cyS = ty(fig.cy);
  const pathLocal = figuraPathLocal(fig.type, fig.dims);
  const col = hexRgbSpec(fig.color);
  const esSuma = fig.sign === 1;
  const relleno = esSuma
    ? 'fill={' + col + '}, fill opacity=0.30, draw={' + col + '}, line width=0.9pt'
    : 'pattern=north east lines, pattern color={' + col + '}, draw={' + col + '}, line width=0.8pt, dashed';
  let s = '\\begin{scope}[shift={(' + cxS + ',' + cyS + ')}, rotate=' + (fig.rotation||0) + ', scale=' + esc + ']\n';
  s += '\\filldraw[' + relleno + '] ' + pathLocal + ';\n';
  s += '\\end{scope}\n';
  // Punto y etiqueta del centroide local de la figura (fig.cx,fig.cy YA es su centroide)
  s += '\\fill[black!55] (' + cxS + ',' + cyS + ') circle (1.1pt);\n';
  // Número de la parte, junto a su centroide: el informe cita las partes por
  // número («Parte 2», «Tabla 1»), y sin él el lector no sabe cuál es cuál.
  if(numero){
    s += '\\node[font=\\tiny\\bfseries, circle, draw={' + col + '}, fill=white, inner sep=0.9pt, '
       + 'above right=2pt] at (' + cxS + ',' + cyS + ') {' + numero + '};\n';
  }
  return s;
}

// ── Cotas (cadena de dimensiones x + una vertical) sobre la caja total ──
// ── Cotas de la sección compuesta en el PDF ──
// Usa el MISMO planificador que la pantalla (planCotas), así el papel muestra
// exactamente las mismas cotas que el aplicativo. Antes aquí solo se dibujaba
// el rectángulo envolvente: dos números para toda la sección, sin ninguna
// información de las figuras individuales.
//
// Las magnitudes van en cm de TikZ, no en píxeles, así que los umbrales se
// pasan explícitamente. El ancho del texto se estima: \tiny ronda los 0,09 cm
// por carácter.
const TIKZ_COTA = {fusion:0.16, minSeg:0.62, holgura:0.14, maxNiveles:5};
const TIKZ_SALTO = 0.34;   // cm entre niveles de etiqueta

function tikzMedirTexto(t){ return String(t).length * 0.09; }

// borde: coordenada (en cm de TikZ) donde arranca la línea de referencia,
// es decir el canto del dibujo. Sin ella la cota no dice de qué punto sale.
function tikzCadenaCotas(valores, proy, eje, base, borde){
  const plan = planCotas(valores, proy, tikzMedirTexto, TIKZ_COTA);
  if(!plan) return {tex:'', nMax:0, plan:null};
  const n = v => v.toFixed(3);
  const q = plan.coords.map(v=>proy(v));
  const ini = Math.min(...q), fin = Math.max(...q);
  let s = '';

  // Líneas de referencia: del borde del dibujo hasta pasar la cadena. Antes
  // medían 0,18 cm (de la cadena a la cadena) y no referenciaban nada.
  const desde = (borde === undefined) ? base + (eje==='x' ? 0.10 : -0.10) : borde;
  plan.coords.forEach(v=>{
    const w = proy(v);
    if(eje==='x') s += '\\draw[black!30, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(w) + ',' + n(desde) + ') -- (' + n(w) + ',' + n(base-0.10) + ');\n';
    else          s += '\\draw[black!30, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(desde) + ',' + n(w) + ') -- (' + n(base+0.10) + ',' + n(w) + ');\n';
  });

  // línea continua de la cadena
  if(eje==='x') s += '\\draw[black!65, line width=0.35pt] (' + n(ini) + ',' + n(base) + ') -- (' + n(fin) + ',' + n(base) + ');\n';
  else          s += '\\draw[black!65, line width=0.35pt] (' + n(base) + ',' + n(ini) + ') -- (' + n(base) + ',' + n(fin) + ');\n';

  // marcas oblicuas en cada borde conservado
  const T = 0.09;
  plan.coords.forEach(v=>{
    const w = proy(v);
    if(eje==='x') s += '\\draw[black!65, line width=0.35pt] (' + n(w-T) + ',' + n(base-T) + ') -- (' + n(w+T) + ',' + n(base+T) + ');\n';
    else          s += '\\draw[black!65, line width=0.35pt] (' + n(base-T) + ',' + n(w-T) + ') -- (' + n(base+T) + ',' + n(w+T) + ');\n';
  });

  // etiquetas escalonadas, siempre alejándose del dibujo
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
  // La cadena ortogonal no puede expresar un radio ni el ángulo de un sector.
  // Se rotulan con el MISMO criterio que en pantalla: cada valor en su propio
  // recuadro, en un hueco libre cerca de su figura y con una guía que apunta a
  // ella. Se reutiliza planCallouts, así que la colocación es la misma lógica.
  const ALTO_ROT = 0.28;                       // alto de la caja, en cm
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
    // Obstáculos: la caja de cada figura y las bandas de cotas.
    const obst = figures.map(f=>{
      const b = figuraBoundsMundo(f);
      const x0 = px(b.left), x1 = px(b.right), y0 = py(b.bottom), y1 = py(b.top);
      return {x:x0-0.06, y:y0-0.06, w:(x1-x0)+0.12, h:(y1-y0)+0.12};
    });
    obst.push({x:-99, y:-99, w:198, h:99 + baseX + 0.20});          // banda inferior
    obst.push({x:baseY - 0.20, y:-99, w:99, h:198});                // banda derecha
    const marco = {x0:px(cajaMundo.left) - 3.2, y0:py(cajaMundo.bottom) - 0.2,
                   x1:baseY - 0.25,             y1:py(cajaMundo.top) + 1.6};
    const puestas = planCallouts(items, obst, marco,
                                 [0.85, 1.25, 1.75, 2.35, 3.00, 3.70]);
    puestas.forEach(p=>{
      const salida = bordeCaja(p.caja, p.ancla);
      s += '\\draw[black!55, line width=0.28pt] (' + n(salida.x) + ',' + n(salida.y)
         + ') -- (' + n(p.ancla.x) + ',' + n(p.ancla.y) + ');\n';
      s += '\\fill[black!55] (' + n(p.ancla.x) + ',' + n(p.ancla.y) + ') circle (0.5pt);\n';
      s += '\\node[font=\\tiny, draw=black!45, fill=white, rounded corners=1pt, '
         + 'inner sep=1.4pt] at (' + n(p.cx) + ',' + n(p.cy) + ') {$' + p.txt + '$};\n';
    });
  }

  return s;
}

// ── Ejes X, Y y cotas del centroide / centro de gravedad ──
// Sólo para la lámina de la sección resuelta. Se acota lo justo: la abscisa y
// la ordenada de C, y las de G si difieren. Nada más: cualquier otra cota aquí
// distrae de lo que se quiere leer.
function tikzEjesYCotasC(caja, tx, ty, conCotas){
  const n = v => (typeof v === 'number' ? v : parseFloat(v)).toFixed(3);
  const px = x => parseFloat(tx(x));
  const py = y => parseFloat(ty(y));
  const x0 = px(Math.min(0, caja.left))  - 0.9;
  const x1 = px(caja.right)  + 0.7;
  const y0 = py(Math.min(0, caja.bottom)) - 0.9;
  const y1 = py(caja.top)    + 0.7;
  const ox = px(0), oy = py(0);
  let s = '';

  // Ejes
  s += '\\draw[black!70, line width=0.5pt, ->, >=stealth] (' + n(x0) + ',' + n(oy) + ') -- (' + n(x1) + ',' + n(oy) + ') node[right, font=\\small] {$X$};\n';
  s += '\\draw[black!70, line width=0.5pt, ->, >=stealth] (' + n(ox) + ',' + n(y0) + ') -- (' + n(ox) + ',' + n(y1) + ') node[above, font=\\small] {$Y$};\n';
  s += '\\node[font=\\scriptsize, below left, inner sep=1pt] at (' + n(ox) + ',' + n(oy) + ') {$O$};\n';
  if(!conCotas || !results) return s;

  // Una cota por punto y eje, apoyada en el propio eje
  const puntos = [{x:results.xbar, y:results.ybar, et:'C', col:'bsaAlerta'}];
  if(results.hetero && results.sep > 1e-9)
    puntos.push({x:results.xg, y:results.yg, et:'G', col:'bsaVerde'});

  puntos.forEach((p,k)=>{
    const cxp = px(p.x), cyp = py(p.y);
    const yCota = oy - 0.75 - k*0.62;
    const xCota = ox - 0.75 - k*0.62;
    // abscisa
    s += '\\draw[black!35, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(cxp) + ',' + n(cyp) + ') -- (' + n(cxp) + ',' + n(yCota-0.10) + ');\n';
    s += '\\draw[' + p.col + ', line width=0.45pt, <->, >=stealth] (' + n(ox) + ',' + n(yCota) + ') -- (' + n(cxp) + ',' + n(yCota) + ');\n';
    // Encima de su propia línea de cota: sin recuadro y sin pisarla.
    s += '\\node[font=\\small, above, inner sep=1.6pt] at (' + n((ox+cxp)/2) + ',' + n(yCota) + ') {$\\bar{x}_{' + p.et + '}$};\n';
    // ordenada
    s += '\\draw[black!35, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(cxp) + ',' + n(cyp) + ') -- (' + n(xCota-0.10) + ',' + n(cyp) + ');\n';
    s += '\\draw[' + p.col + ', line width=0.45pt, <->, >=stealth] (' + n(xCota) + ',' + n(oy) + ') -- (' + n(xCota) + ',' + n(cyp) + ');\n';
    // rotate=90 la deja en vertical y 'above' la aparta al lado izquierdo de
    // la cota, ya girada: así se lee de abajo arriba y no monta sobre la línea.
    s += '\\node[font=\\small, rotate=90, above, inner sep=1.6pt] at (' + n(xCota) + ',' + n((oy+cyp)/2) + ') {$\\bar{y}_{' + p.et + '}$};\n';
  });
  return s;
}

// ── Diagrama completo de la sección compuesta ──
function tikzSeccionCompuesta(opts){
  opts = opts || {};
  const cajas = figures.map(figuraBoundsMundo);
  const minX = Math.min(...cajas.map(c=>c.left)), maxX = Math.max(...cajas.map(c=>c.right));
  const minY = Math.min(...cajas.map(c=>c.bottom)), maxY = Math.max(...cajas.map(c=>c.top));
  const anchoReal = Math.max(maxX-minX, 1e-6);
  const altoReal  = Math.max(maxY-minY, 1e-6);
  // El dibujo se ajusta al ancho útil, pero sin pasar de 14 cm de alto: una
  // sección alta salía de 21 cm y no cabía tras el título de la sección, que se
  // quedaba solo en la página anterior.
  const esc = Math.min(10.5/anchoReal, 14/altoReal);
  const tx = (x)=> ((x-minX)*esc).toFixed(3);
  const ty = (y)=> ((y-minY)*esc).toFixed(3);

  let s = '';
  // Con numerar:true cada figura lleva su número de parte (el mismo orden que
  // results.steps y que las tablas del informe).
  figures.forEach((fig,i)=>{ s += tikzFigura(fig, tx, ty, esc, opts.numerar ? (i+1) : 0); });

  if(opts.marcarC){
    const cx = tx(results.xbar), cy = ty(results.ybar);
    s += '\\fill[bsaAlerta] (' + cx + ',' + cy + ') circle (2pt);\n';
    s += '\\node[font=\\small\\bfseries, above right, xshift=2pt] at (' + cx + ',' + cy + ') {C};\n';
    if(results.hetero && results.sep > 1e-9){
      const gx = tx(results.xg), gy = ty(results.yg);
      s += '\\fill[bsaVerde] (' + gx + ',' + gy + ') circle (2pt);\n';
      s += '\\node[font=\\small\\bfseries, below right, xshift=2pt] at (' + gx + ',' + gy + ') {G};\n';
    }
  }
  if(opts.ejes){
    s += tikzEjesYCotasC({left:minX,right:maxX,bottom:minY,top:maxY}, tx, ty, !!opts.cotasC);
  }
  if(opts.cotas !== false){
    s += tikzCotasCompuesta({left:minX,right:maxX,bottom:minY,top:maxY}, tx, ty);
  }
  return s;
}

// ── Compilación con texlive.net (mismo mecanismo que Cap. 6) ──
const TEXLIVE_NET_URL = 'https://texlive.net/cgi-bin/latexcgi';
function _panelLatexPDF(){
  let panel = document.getElementById('panelLatexPDF');
  if(panel) return panel;
  panel = document.createElement('div');
  panel.id = 'panelLatexPDF';
  panel.style.cssText = 'display:none; position:fixed; inset:0; z-index:9000; '
    + 'background:rgba(15,20,28,.72); align-items:center; justify-content:center; padding:16px;';
  // El botón de cerrar llamaba a una función en línea con las comillas mal
  // escapadas: el navegador recibía onclick="...(\'panelLatexPDF')..." y al
  // pulsarlo lanzaba un error de sintaxis, así que la ventana no se cerraba.
  // Ahora invoca una función con nombre.
  panel.innerHTML =
      '<div style="background:#fff; border-radius:10px; width:100%; max-width:900px; '
    +   'height:92vh; display:flex; flex-direction:column; overflow:hidden; position:relative;">'
    +   '<div style="display:flex; align-items:center; justify-content:space-between; '
    +     'padding:10px 14px; border-bottom:1px solid #e5d9c8;">'
    +     '<strong style="color:#B45309">Reporte PDF (LaTeX)</strong>'
    +     '<button onclick="cerrarPanelLatex()" title="Cerrar" aria-label="Cerrar" '
    +       'style="border:none;background:none;font-size:22px;cursor:pointer;line-height:1;'
    +       'color:#6B7280;padding:0 4px;">&times;</button>'
    +   '</div>'
    +   '<div id="latexEstado" style="padding:8px 14px; font-size:12.5px; color:#6B7280;">'
    +     'Enviando a texlive.net…</div>'
    +   '<iframe id="latexFrame" name="latexFrame" style="flex:1; border:none;"></iframe>'
    +   '<div id="latexPie" style="padding:6px 14px; font-size:10.5px; color:#9aa3ad; '
    +     'border-top:1px solid #f0eee9;">Si en lugar del PDF aparece texto, es el registro '
    +     'de LaTeX: c\u00f3pialo y av\u00edsanos.</div>'
    +   '<div id="latexCargando" style="position:absolute; inset:0; background:#fff; '
    +     'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px;">'
    +     '<div style="display:flex; gap:10px; align-items:flex-end; height:64px;">'
    +       '<span class="bsa-let" style="color:#CDA953; animation-delay:0s">B</span>'
    +       '<span class="bsa-let" style="color:#8AB4CA; animation-delay:.22s">S</span>'
    +       '<span class="bsa-let" style="color:#22584B; animation-delay:.44s">A</span>'
    +     '</div>'
    +     '<div style="font-size:12px;color:#6B7280">Compilando el informe…</div>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(panel);
  return panel;
}

// Cierra la ventana del informe y deja el iframe limpio, para que al volver a
// generar no se vea por un instante el PDF anterior.
function descargarTex(){
  const tex = construirLatex();
  if(!tex) return;
  const blob = new Blob([tex], {type:'text/x-tex'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'centroides-bsa.tex';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
