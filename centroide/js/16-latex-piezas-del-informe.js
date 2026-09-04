// ═══════════════════════════════════════════════════════════
//  PIEZAS DEL INFORME EN LATEX
// ═══════════════════════════════════════════════════════════

// ── Notación ×10ⁿ para columnas de números grandes ──
// Se busca UN factor común por columna y se anuncia en la cabecera. Es lo que
// se hace en un cuadro de ingeniería: la tabla queda con números de 2 o 3
// cifras en lugar de con seis, y la magnitud se lee una sola vez.
function factorColumna(vals){
  const m = Math.max(...vals.map(v=>Math.abs(v)).filter(v=>isFinite(v) && v>0), 0);
  if(!m) return {exp:0, div:1, cab:''};
  let exp = Math.floor(Math.log10(m));
  exp = Math.floor(exp/3)*3;                 // saltos de mil: 10^3, 10^6, ...
  if(exp <= 0) return {exp:0, div:1, cab:''};
  return {exp, div:Math.pow(10,exp), cab:'\\times 10^{'+exp+'}'};
}
function celdaCol(v, f, dec){
  const x = v/f.div;
  return (Math.abs(x) < 5e-7 ? 0 : x).toFixed(dec);
}

// ── Fórmula del área de cada tipo de figura ──
// Devuelve la expresión simbólica y la misma con los números sustituidos, para
// que el alumno vea de dónde sale cada valor y no solo el resultado.
function formulaArea(fig){
  const d = fig.dims, D = v => decP(v,'len');
  switch(fig.type){
    case 'rect':
      return {sim:'A_i = b\\,h', sus:'A_i = ('+D(d.b)+')('+D(d.h)+')'};
    case 'rtriangle':
    case 'rtriangle2':
      return {sim:'A_i = \\dfrac{b\\,h}{2}', sus:'A_i = \\dfrac{('+D(d.b)+')('+D(d.h)+')}{2}'};
    case 'circle':
      return {sim:'A_i = \\pi R^{2}', sus:'A_i = \\pi ('+D(d.r)+')^{2}'};
    case 'semicircle':
      return {sim:'A_i = \\dfrac{\\pi R^{2}}{2}', sus:'A_i = \\dfrac{\\pi ('+D(d.r)+')^{2}}{2}'};
    case 'quarter':
      return {sim:'A_i = \\dfrac{\\pi R^{2}}{4}', sus:'A_i = \\dfrac{\\pi ('+D(d.r)+')^{2}}{4}'};
    case 'sector':
      return {sim:'A_i = \\theta R^{2} \\quad (\\theta \\text{ en radianes})',
              sus:'A_i = \\left('+D(d.alpha)+'^\\circ\\cdot\\dfrac{\\pi}{180}\\right)('+D(d.r)+')^{2}'};
    default:
      return {sim:'A_i', sus:'A_i'};
  }
}

// ── Posición del centroide propio dentro de la figura ──
// Solo tiene interés donde NO está en el centro geométrico. Es el dato que el
// alumno suele buscar en las tablas de centroides.
function centroideLocalTex(fig){
  const d = fig.dims, D = v => decP(v,'len');
  switch(fig.type){
    case 'rtriangle':
    case 'rtriangle2':
      return '\\text{Centroide propio a } \\tfrac{b}{3} \\text{ y } \\tfrac{h}{3}'
           + ' \\text{ de los catetos: } \\tfrac{'+D(d.b)+'}{3}='+D(d.b/3)
           + ',\\ \\tfrac{'+D(d.h)+'}{3}='+D(d.h/3);
    case 'semicircle':
      return '\\bar{y}_{loc} = \\dfrac{4R}{3\\pi} = \\dfrac{4('+D(d.r)+')}{3\\pi} = '
           + D(4*d.r/(3*Math.PI));
    case 'quarter':
      return '\\bar{x}_{loc} = \\bar{y}_{loc} = \\dfrac{4R}{3\\pi} = '
           + D(4*d.r/(3*Math.PI));
    case 'sector': {
      const t = d.alpha*Math.PI/180;
      return '\\bar{y}_{loc} = \\dfrac{2R\\sen\\theta}{3\\theta} = '
           + '\\dfrac{2('+D(d.r)+')\\sen('+D(d.alpha)+'^\\circ)}{3('+D(d.alpha)+'^\\circ)} = '
           + D(2*d.r*Math.sin(t)/(3*t));
    }
    default:
      return null;   // rectángulo y círculo: el centroide es el centro
  }
}

// ── Croquis acotado de UNA figura, en TikZ ──
// Va al costado de su desarrollo, a la misma altura. Se dibuja en coordenadas
// locales (centroide en el origen) y con la figura sin girar: el giro se indica
// aparte con su ángulo, que es más legible que dibujarla inclinada y minúscula.
function tikzCroquisFigura(fig, anchoCm){
  const def = FIG_DEFS[fig.type];
  const b = def.bounds(fig.dims);
  const bw = Math.max(b.right-b.left, 1e-9), bh = Math.max(b.top-b.bottom, 1e-9);
  const W = anchoCm || 3.6, H = 3.0;
  const esc = Math.min((W-1.1)/bw, (H-1.0)/bh);
  // Centro de la caja envolvente, en coordenadas locales. TODO el croquis se
  // dibuja respecto a él.
  const cxm = (b.left+b.right)/2, cym = (b.bottom+b.top)/2;
  const tx = x => (x-cxm)*esc;
  const ty = y => (y-cym)*esc;
  const n = v => v.toFixed(3);
  const col = hexRgbSpec(fig.color);
  const neg = fig.sign < 0;

  // El origen local de la figura es su CENTROIDE, que en general no coincide
  // con el centro de la caja (el triángulo es el caso claro). Antes el trazado
  // se pintaba en (0,0) mientras las cotas se calculaban respecto al centro de
  // la caja: por eso figura y cotas salían desfasadas.
  const ox = tx(0), oy = ty(0);

  let s = '\\begin{tikzpicture}[scale=1]\n';
  s += '\\begin{scope}[shift={(' + n(ox) + ',' + n(oy) + ')}, scale=' + esc.toFixed(4) + ']\n';
  s += '\\path[' + (neg
        ? 'pattern=north east lines, pattern color={'+col+'}, draw={'+col+'}, line width=0.7pt, dashed'
        : 'fill={'+col+'}, fill opacity=0.28, draw={'+col+'}, line width=0.8pt') + '] ';
  s += figuraPathLocal(fig.type, fig.dims) + ';\n';
  s += '\\end{scope}\n';

  // Centroide de la figura, en su sitio real dentro de la caja
  s += '\\fill[bsaAlerta] (' + n(ox) + ',' + n(oy) + ') circle (1.4pt);\n';
  s += '\\node[font=\\tiny, above right, inner sep=1pt] at (' + n(ox) + ',' + n(oy) + ') {$C_i$};\n';

  // ── Cotas de ancho y alto ──
  const x0 = tx(b.left), x1 = tx(b.right);
  const y0 = ty(b.bottom), y1 = ty(b.top);
  const yc = y0 - 0.34, xc = x1 + 0.34;
  const T = v => n(v);
  s += '\\draw[black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt] ('+T(x0)+','+T(y0)+') -- ('+T(x0)+','+T(yc-0.08)+');\n';
  s += '\\draw[black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt] ('+T(x1)+','+T(y0)+') -- ('+T(x1)+','+T(yc-0.08)+');\n';
  s += '\\draw[black!65, line width=0.3pt, <->, >=stealth] ('+T(x0)+','+T(yc)+') -- ('+T(x1)+','+T(yc)+');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt] at ('+T((x0+x1)/2)+','+T(yc)+') {'+decP(bw,'len')+'};\n';
  s += '\\draw[black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt] ('+T(x1)+','+T(y0)+') -- ('+T(xc+0.08)+','+T(y0)+');\n';
  s += '\\draw[black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt] ('+T(x1)+','+T(y1)+') -- ('+T(xc+0.08)+','+T(y1)+');\n';
  s += '\\draw[black!65, line width=0.3pt, <->, >=stealth] ('+T(xc)+','+T(y0)+') -- ('+T(xc)+','+T(y1)+');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt, rotate=90] at ('+T(xc)+','+T((y0+y1)/2)+') {'+decP(bh,'len')+'};\n';

  // ── Ángulo de giro ──
  const g = fig.rotation || 0;
  if(Math.abs(g) >= 0.5){
    const R = Math.min(0.55, Math.abs(x1-x0)/2.4);
    s += '\\draw[black!65, line width=0.3pt, ->, >=stealth] ('+n(ox)+','+n(oy)+') -- ('+n(ox+R+0.30)+','+n(oy)+');\n';
    s += '\\draw[black!65, line width=0.3pt] ('+n(ox)+','+n(oy)+') -- ('
       + n(ox+(R+0.30)*Math.cos(g*Math.PI/180)) + ',' + n(oy+(R+0.30)*Math.sin(g*Math.PI/180)) + ');\n';
    s += '\\draw[black!65, line width=0.3pt, ->, >=stealth] ('+n(ox+R)+','+n(oy)+') arc (0:'+g.toFixed(2)+':'+n(R)+');\n';

    // La variable se coloca en un hueco libre: en el croquis del rectángulo
    // caía justo encima de la cota de altura. Se reutiliza el colocador, con
    // las etiquetas de las dos cotas como obstáculos.
    const anclaX = ox + (R+0.14)*Math.cos(g*Math.PI/360);
    const anclaY = oy + (R+0.14)*Math.sin(g*Math.PI/360);
    const obst = [
      {x:(x0+x1)/2 - 0.42, y:yc - 0.13, w:0.84, h:0.26},         // rótulo del ancho
      {x:xc - 0.13, y:(y0+y1)/2 - 0.42, w:0.26, h:0.84},         // rótulo del alto
      {x:xc - 0.10, y:y0, w:0.20, h:y1-y0},                      // línea de cota vertical
      {x:x0, y:yc - 0.10, w:x1-x0, h:0.20}                       // línea de cota horizontal
    ];
    const puesto = planCallouts(
      [{txt:'\\beta', ancla:{x:anclaX, y:anclaY}, w:0.30, h:0.26}],
      obst, null, [0.16, 0.28, 0.42, 0.58, 0.76])[0];
    // Si tuvo que apartarse bastante, se le pone una guía fina hasta el arco.
    const d = Math.hypot(puesto.cx-anclaX, puesto.cy-anclaY);
    if(d > 0.30){
      s += '\\draw[black!45, line width=0.22pt] ('+n(puesto.cx)+','+n(puesto.cy)+') -- ('+n(anclaX)+','+n(anclaY)+');\n';
    }
    s += '\\node[font=\\small, inner sep=1pt] at ('+n(puesto.cx)+','+n(puesto.cy)+') {$\\beta$};\n';
  }
  s += '\\end{tikzpicture}';
  return s;
}

// ═══════════════════════════════════════════════════════════
//  INFORME LaTeX · una clase paso a paso (Hibbeler cap. 9, §9.1–9.2)
//  Planteamiento y convenio → propiedades de cada parte → tabla de áreas y
//  momentos estáticos → centroide (y centro de gravedad si el cuerpo es
//  heterogéneo) → comprobaciones → colofón.
//  Sigue las mismas reglas de redacción que los informes de fuerzas internas
//  y armaduras (fuerzas-internas/LEEME.md, «Reglas de redacción»): cada
//  explicación una sola vez, tablas numeradas y citadas, resultados en tabla y
//  desarrollos en texto, colofón BSA. Las figuras iguales se desarrollan una
//  sola vez, y si están en espejo respecto de un eje de la sección se dice.
// ═══════════════════════════════════════════════════════════

// ── Registro de explicaciones ya dadas (R1) ──
let _yaDichoCen = {};
function _primeraVezCen(clave){
  if(_yaDichoCen[clave]) return false;
  _yaDichoCen[clave] = true;
  return true;
}

// ── Figuras iguales y simetría de la sección ──
// Dos figuras son «iguales» si coinciden tipo, dimensiones, signo, giro y (en
// cuerpo heterogéneo) material y espesor: su área, su centroide propio y su
// peso son los mismos, así que se desarrollan una sola vez. Si además están
// en espejo respecto del eje vertical u horizontal que parte la sección por
// la mitad, se dice, porque es lo que permite anticipar el resultado.
// Solo cuentan como «en espejo» los tipos que son simétricos respecto de su
// propio eje: un triángulo rectángulo reflejado ya no es la misma figura.
const _SIM_V_CEN = {rect:1, circle:1, semicircle:1, sector:1};
const _SIM_H_CEN = {rect:1, circle:1};
function _claveFiguraCen(f, het){
  const rot = (((f.rotation||0) % 360) + 360) % 360;
  return f.type + '|' + JSON.stringify(f.dims) + '|' + f.sign + '|' + rot.toFixed(3)
       + (het ? '|' + (f.matId == null ? '' : f.matId) + '|' + (f.thickness || 1) : '');
}
// Eje de simetría candidato: el centro de la caja envolvente de la sección.
// Se contrasta contra él y NO contra el centroide calculado, para que la
// comprobación de simetría del paso 4 sea una comprobación de verdad.
function _envolventeCen(steps){
  const cajas = steps.map(s=>figuraBoundsMundo(s.fig));
  const minX = Math.min(...cajas.map(c=>c.left)),   maxX = Math.max(...cajas.map(c=>c.right));
  const minY = Math.min(...cajas.map(c=>c.bottom)), maxY = Math.max(...cajas.map(c=>c.top));
  return {minX, maxX, minY, maxY, x0:(minX+maxX)/2, y0:(minY+maxY)/2,
          tol: 1e-6*Math.max(1, maxX-minX, maxY-minY)};
}
function _gruposFigurasCen(steps, het, env){
  const grupos = [], pos = {};
  steps.forEach((st,i)=>{
    const k = _claveFiguraCen(st.fig, het);
    if(pos[k] === undefined){ pos[k] = grupos.length; grupos.push({idx:[i], simetria:null}); }
    else grupos[pos[k]].idx.push(i);
  });
  grupos.forEach(g=>{
    if(g.idx.length < 2) return;
    const figs = g.idx.map(i=>steps[i].fig), f0 = figs[0];
    const sinGiro = Math.abs(f0.rotation||0) < 1e-9;
    // Cada figura necesita su reflejo (puede ser ella misma si está centrada
    // sobre el eje), pero al menos un par debe ser de dos figuras DISTINTAS:
    // dos alas centradas sobre el eje vertical no están «en espejo vertical»
    // entre sí, aunque cada una sea simétrica respecto de él.
    const espV = (a,b)=>Math.abs(a.cy-b.cy)<env.tol && Math.abs(a.cx+b.cx-2*env.x0)<env.tol;
    const espH = (a,b)=>Math.abs(a.cx-b.cx)<env.tol && Math.abs(a.cy+b.cy-2*env.y0)<env.tol;
    const espejo = rel => figs.every(a=>figs.some(b=>rel(a,b))) && figs.some(a=>figs.some(b=>b!==a && rel(a,b)));
    if(sinGiro && _SIM_V_CEN[f0.type] && espejo(espV)) g.simetria = 'vertical';
    else if(sinGiro && _SIM_H_CEN[f0.type] && espejo(espH)) g.simetria = 'horizontal';
  });
  return grupos;
}
// ¿Es la sección ENTERA simétrica respecto del eje vertical (u horizontal) que
// pasa por el centro de su envolvente? Cada figura debe tener su reflejo (o
// ser ella misma su reflejo, si está centrada sobre el eje).
function _simetriaSeccionCen(steps, het, env){
  const figs = steps.map(s=>s.fig);
  const igual = (a,b)=>_claveFiguraCen(a,het) === _claveFiguraCen(b,het);
  const sinGiro = f=>Math.abs(f.rotation||0) < 1e-9;
  const v = figs.every(a=>sinGiro(a) && _SIM_V_CEN[a.type]
    && figs.some(b=>igual(a,b) && Math.abs(a.cy-b.cy)<env.tol && Math.abs(a.cx+b.cx-2*env.x0)<env.tol));
  const h = figs.every(a=>sinGiro(a) && _SIM_H_CEN[a.type]
    && figs.some(b=>igual(a,b) && Math.abs(a.cx-b.cx)<env.tol && Math.abs(a.cy+b.cy-2*env.y0)<env.tol));
  return {v, h};
}

// ── Tabla con la fila del catálogo de un perfil, en las unidades de la tabla ──
// Es lo que el alumno consultaría en el Apéndice C: se imprime antes de usar
// sus valores, para que se vea de dónde sale cada número. Aquí solo interesan
// las dimensiones, el área y la posición del centroide.
function _tablaPerfilTex(f, tablaCaption){
  const fam = famPorId(f.perfil.fam); if(!fam) return '';
  const r = (STEEL[fam.id]||[]).find(x=>x[0]===f.perfil.nom); if(!r) return '';
  const u = fam.u, uA = u + '\\textsuperscript{2}';
  const cab = [], fila = [];
  const c = (t,un,v)=>{ cab.push('\\textbf{' + t + '}' + (un ? ' {\\tiny(' + un + ')}' : '')); fila.push(v); };
  c('Designación', '', escLatex(r[0]));
  if(fam.tipo === 'angleL'){
    const igual = fam.id.startsWith('LI');
    c('$b_1$',u,r[1]); c('$b_2$',u,r[2]); c('$t$',u,r[3]); c('$A$',uA,r[4]);
    if(igual) c('$\\bar{x}=\\bar{y}$',u,r[8]);
    else { c('$\\bar{y}$',u,r[8]); c('$\\bar{x}$',u,r[12]); }
  } else {
    c('$d$',u,r[1]); c('$b_f$',u,r[2]); c('$t_f$',u,r[3]); c('$t_w$',u,r[4]); c('$A$',uA,r[5]);
    if(fam.tipo === 'channel') c('$\\bar{x}$',u,r[12]);
  }
  let s = tablaCaption('Propiedades tabuladas del perfil ' + escLatex(r[0]) + ' (' + escLatex(fam.nom) + ', '
    + escLatex(fam.sist) + '; Beer \\& Johnston, \\emph{Mecánica de materiales}, Apéndice C).');
  s += '{\\footnotesize\\begin{tablacentrada}\\begin{tabular}{' + 'c'.repeat(cab.length) + '}\\hline\n'
     + cab.join(' & ') + '\\\\\\hline\n' + fila.join(' & ') + '\\\\\\hline\\end{tabular}\\end{tablacentrada}}\n';
  return s;
}

// ── Ficha del perfil: croquis con la notación de la tabla ──
// Redibujo esquemático (proporciones fijas, no las reales) de la figura que
// acompaña a la tabla del Apéndice C de Beer & Johnston: la sección rayada,
// los ejes X–X e Y–Y y las cotas con los símbolos de las columnas. Va junto a
// la tabla para que el alumno sepa qué mide cada columna. Se dibuja en TikZ
// porque texlive.net solo admite archivos de texto: no se le puede enviar la
// lámina PNG de la paleta. Las cotas quedan FUERA de la banda de los ejes y
// los rótulos de cota se apartan del eje que los cruza (pos distinto de 0.5).
function _tikzFichaPerfil(tipo){
  const rell = 'pattern=north east lines, pattern color=bsaAcc!55, draw=bsaAcc, line width=0.7pt';
  const ax = 'black!80, line width=0.45pt';
  const co = 'black!70, line width=0.35pt, >=stealth';
  const ext = 'black!35, line width=0.25pt';
  const N = v => (+v).toFixed(2);
  const seg = (p,x1,y1,x2,y2) => '\\draw[' + p + '] (' + N(x1) + ',' + N(y1) + ') -- (' + N(x2) + ',' + N(y2) + ');\n';
  const cota = (x1,y1,x2,y2,txt,pos,at) => '\\draw[' + co + ', <->] (' + N(x1) + ',' + N(y1) + ') -- (' + N(x2) + ',' + N(y2)
    + ') node[pos=' + (at === undefined ? 0.5 : at) + ', ' + pos + ', font=\\small, inner sep=1.5pt] {$' + txt + '$};\n';
  const flecha = (x1,y1,x2,y2) => '\\draw[' + co + ', ->] (' + N(x1) + ',' + N(y1) + ') -- (' + N(x2) + ',' + N(y2) + ');\n';
  const rot = (x,y,txt,pos) => '\\node[' + pos + ', font=\\small, inner sep=1.5pt] at (' + N(x) + ',' + N(y) + ') {$' + txt + '$};\n';
  let s = '\\begin{tikzpicture}[scale=0.62]\n';
  if(tipo === 'wshape'){
    const B=1.5, H=1.8, tf=0.35, w=0.15, hi=H-tf;
    const P=[[-B,H],[B,H],[B,hi],[w,hi],[w,-hi],[B,-hi],[B,-H],[-B,-H],[-B,-hi],[-w,-hi],[-w,hi],[-B,hi]];
    s += '\\path[' + rell + '] ' + P.map(q=>'('+N(q[0])+','+N(q[1])+')').join(' -- ') + ' -- cycle;\n';
    s += seg(ax,-2.1,0,2.1,0) + rot(-2.1,0,'X','left') + rot(2.1,0,'X','right');
    s += seg(ax,0,-2.9,0,2.9) + rot(0,-2.9,'Y','below') + rot(0,2.9,'Y','above');
    s += seg(ext,B,H,B+1.5,H) + seg(ext,B,-H,B+1.5,-H) + cota(B+1.35,-H,B+1.35,H,'d','right');
    s += seg(ext,-B,-H,-B,-H-0.85) + seg(ext,B,-H,B,-H-0.85) + cota(-B,-H-0.7,B,-H-0.7,'b_f','below',0.72);
    s += seg(ext,-B,H,-B-0.7,H) + seg(ext,-B,hi,-B-0.7,hi);
    s += flecha(-B-0.45,H+0.7,-B-0.45,H) + flecha(-B-0.45,hi-0.7,-B-0.45,hi) + rot(-B-0.45,H+0.7,'t_f','above');
    s += flecha(-w-0.8,-0.8,-w,-0.8) + flecha(w+0.8,-0.8,w,-0.8) + rot(w+0.8,-0.8,'t_w','right');
  } else if(tipo === 'channel'){
    const x0=-0.9, bf=1.6, x1=x0+bf, w=x0+0.3, H=1.8, tf=0.35, hi=H-tf;
    const P=[[x0,H],[x1,H],[x1,hi],[w,hi],[w,-hi],[x1,-hi],[x1,-H],[x0,-H]];
    s += '\\path[' + rell + '] ' + P.map(q=>'('+N(q[0])+','+N(q[1])+')').join(' -- ') + ' -- cycle;\n';
    s += seg(ax,-2.0,0,1.45,0) + rot(-2.0,0,'X','left') + rot(1.45,0,'X','right');
    s += seg(ax,0,-2.9,0,2.9) + rot(0,-2.9,'Y','below') + rot(0,2.9,'Y','above');
    s += seg(ext,x1,H,x1+1.75,H) + seg(ext,x1,-H,x1+1.75,-H) + cota(x1+1.6,-H,x1+1.6,H,'d','right');
    s += seg(ext,x0,-H,x0,-H-0.85) + seg(ext,x1,-H,x1,-H-0.85) + cota(x0,-H-0.7,x1,-H-0.7,'b_f','below',0.78);
    s += seg(ext,x0,H,x0-0.7,H) + seg(ext,x0,hi,x0-0.7,hi);
    s += flecha(x0-0.45,H+0.7,x0-0.45,H) + flecha(x0-0.45,hi-0.7,x0-0.45,hi) + rot(x0-0.45,H+0.7,'t_f','above');
    s += flecha(x0-0.8,0.8,x0,0.8) + flecha(w+0.8,0.8,w,0.8) + rot(w+0.8,0.8,'t_w','right');
    s += flecha(x0-0.8,-1.0,x0,-1.0) + flecha(0.8,-1.0,0,-1.0) + rot(0.8,-1.0,'\\bar{x}','right');
  } else {   // angleL
    const x0=-1.0, y0=-1.3, b1=2.6, b2=3.0, t=0.4, xr=x0+b1+0.4;
    const P=[[x0,y0],[x0+b1,y0],[x0+b1,y0+t],[x0+t,y0+t],[x0+t,y0+b2],[x0,y0+b2]];
    s += '\\path[' + rell + '] ' + P.map(q=>'('+N(q[0])+','+N(q[1])+')').join(' -- ') + ' -- cycle;\n';
    s += seg(ax,-1.9,0,1.9,0) + rot(-1.9,0,'X','left') + rot(1.9,0,'X','right');
    s += seg(ax,0,-2.2,0,2.4) + rot(0,-2.2,'Y','below') + rot(0,2.4,'Y','above');
    // Eje Z–Z, el principal menor, a un ángulo alfa del eje Y
    const a = (90+34)*Math.PI/180, L = 1.5;
    s += '\\draw[black!70, line width=0.4pt, dashed] (' + N(-L*Math.cos(a)) + ',' + N(-L*Math.sin(a)) + ') -- ('
       + N(L*Math.cos(a)) + ',' + N(L*Math.sin(a)) + ');\n';
    s += rot(L*Math.cos(a), L*Math.sin(a), 'Z', 'above left') + rot(-L*Math.cos(a), -L*Math.sin(a), 'Z', 'below right');
    s += '\\draw[' + co + '] (0,1.1) arc (90:124:1.1) node[midway, above, font=\\small, inner sep=1pt] {$\\alpha$};\n';
    // ȳ y b2 a la derecha, fuera del eje X
    s += seg(ext,x0+b1,y0,xr+2.0,y0) + seg(ext,x0+t,y0+b2,xr+2.0,y0+b2);
    s += cota(xr+1.5,y0,xr+1.5,0,'\\bar{y}','right') + cota(xr+1.5,0,xr+1.5,y0+b2,'b_2','right');
    // x̄ y b1 abajo, con los rótulos apartados del eje Y
    s += seg(ext,x0,y0,x0,y0-1.05) + cota(x0,y0-0.9,0,y0-0.9,'\\bar{x}','below',0.4) + cota(0,y0-0.9,x0+b1,y0-0.9,'b_1','below',0.6);
    // espesor en el extremo del ala horizontal
    s += seg(ext,x0+b1,y0+t,xr+0.15,y0+t);
    s += flecha(xr,y0-0.75,xr,y0) + flecha(xr,y0+t+0.75,xr,y0+t) + rot(xr,y0+t+0.75,'t','above');
  }
  s += '\\end{tikzpicture}';
  return s;
}

function construirLatex(){
  if(!results){ aviso('Primero calcula el centroide.'); return null; }
  _yaDichoCen = {};
  const het = results.hetero;
  const st = results.steps;
  const U1 = '\\,\\text{' + escLatex(unit) + '}';
  const U2 = '\\,\\text{' + escLatex(unit) + '}^{2}';
  const uTxt = escLatex(unit), u2Txt = escLatex(unit) + '\\textsuperscript{2}';
  const simb = (matSimbolo() === 'ρ') ? '\\rho' : '\\gamma';
  const esMasa = (matMagnitud === 'densidad');
  const Wsim = esMasa ? 'm' : 'W';
  const Wnom = esMasa ? 'masa' : 'peso', Wnoms = esMasa ? 'masas' : 'pesos';
  const uGm = '\\text{' + escLatex(uGamma().replace('\u00B3','')) + '}^{3}';   // kN/mm³ en modo matemático
  const nombreDe = f => escLatex(f.etiqueta || f.name || FIG_DEFS[f.type].name);
  // Unidad del peso (γ·A·t da fuerza) o de la masa (ρ·A·t da kg).
  const uWtxt = esMasa ? 'kg' : escLatex(uGamma().split('/')[0]);
  const UW = '\\,\\text{' + uWtxt + '}';
  const env = _envolventeCen(st);
  const grupos = _gruposFigurasCen(st, het, env);
  const simSec = _simetriaSeccionCen(st, het, env);

  // ── Autocomprobación: la tabla que se va a imprimir debe reproducir el
  // centroide del motor. Si no, el informe y el cálculo se han separado.
  {
    let A=0, Qx=0, Qy=0, W=0, Wx=0, Wy=0;
    st.forEach(s=>{ A+=s.a; Qx+=s.ay; Qy+=s.ax; W+=s.w; Wx+=s.wx; Wy+=s.wy; });
    const rel = (a,b)=>Math.abs(a-b) > 1e-9*Math.max(1, Math.abs(a), Math.abs(b));
    if(rel(A, results.A) || rel(Qy/A, results.xbar) || rel(Qx/A, results.ybar)
       || (het && Math.abs(W) > 1e-12 && (rel(Wx/W, results.xg) || rel(Wy/W, results.yg))))
      console.warn('Informe LaTeX: la tabla no reproduce el centroide');
  }

  // Figuras y tablas se numeran en el orden en que aparecen, así que el
  // documento se arma sección por sección y se guarda el número de la tabla
  // que luego se cita.
  let figN = 0, tablaN = 0;
  // Lámina y pie en el MISMO entorno, con \nopagebreak entre ambos: si van
  // en dos «center» seguidos, el salto de página puede caer justo entre la
  // figura y su «Figura N.».
  const lamina = (cuerpo, txt) => { figN++;
    return '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n' + cuerpo
      + '\\end{tikzpicture}\\par\\nopagebreak\\vspace{4pt}\n'
      + '{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\n\\end{center}\n\\vspace{4pt}\n'; };
  // \nopagebreak: el rótulo no se queda huérfano al pie de una página con la
  // tabla en la siguiente.
  const tablaCaption = txt => { tablaN++;
    return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };
  const porque = (clave, txt) => _primeraVezCen(clave) ? '\\porque{' + txt + '}\n' : '';
  const nota = (clave, txt) => _primeraVezCen(clave) ? '{\\footnotesize ' + txt + '}\\\\[3pt]\n' : '';
  const cab = (t, f, u) => '\\textbf{' + t + '}' + (f.cab ? ' $' + f.cab + '$' : '')
                         + (u ? ' {\\scriptsize(' + u + ')}' : '');
  const listaNums = ns => ns.length === 1 ? String(ns[0])
    : ns.slice(0,-1).join(', ') + ' y ' + ns[ns.length-1];

  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});

  const preambulo = '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n'
    + '\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.0cm]{geometry}\n'
    + '\\usepackage{amsmath,amssymb}\n'
    + '\\usepackage{tikz}\n'
    + '\\usetikzlibrary{patterns,arrows.meta,calc}\n'
    + '\\usepackage{xcolor}\n\n'
    + '\\definecolor{bsaAcc}{HTML}{B45309}\n'
    + '\\definecolor{bsaAcc2}{HTML}{1D4ED8}\n'
    + '\\definecolor{bsaAlerta}{HTML}{B8860C}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n'
    + '\\definecolor{bsaMuted}{HTML}{6B7280}\n'
    + '\\definecolor{bsaLogoB}{HTML}{CDA953}\n'
    + '\\definecolor{bsaLogoS}{HTML}{8AB4CA}\n'
    + '\\definecolor{bsaLogoA}{HTML}{22584B}\n\n'
    + '\\setlength{\\parskip}{2pt}\n'
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Centroide}\\hfill'
    + '\\footnotesize\\color{bsaMuted}Cuerpos compuestos}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\ \\ \\textperiodcentered\\ \\ pág.\\ \\thepage\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    + '\\newcommand{\\sen}{\\operatorname{sen}}\n'
    + '\\pagestyle{bsa}\n\n'
    // \penalty y \nopagebreak: el título de una sección no se queda solo al
    // pie de una página con su contenido en la siguiente.
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\par\\addvspace{10pt}\\penalty-250\n'
    + '  \\noindent{\\large\\bfseries\\color{bsaAcc}#1}\\par\\nopagebreak\n'
    + '  \\vspace{3pt}\\nopagebreak\\hrule\\nopagebreak\\vspace{7pt}\\nopagebreak}\n'
    + '\\newcommand{\\subpaso}[1]{\\vspace{6pt}\\noindent{\\bfseries\\color{bsaAcc2}#1}\\par\\vspace{3pt}}\n'
    + '\\newcommand{\\porque}[1]{\\par\\vspace{3pt}\\noindent\\fcolorbox{bsaAcc2!40}{bsaAcc2!5}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\footnotesize{\\bfseries\\color{bsaAcc2}¿Por qué?}\\ #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\resultado}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaVerde!50}{bsaVerde!6}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\veredicto}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaAcc}{bsaAcc!7}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n'
    // Un «center» que no admite salto de página delante: así el rótulo
    // «Tabla N.» nunca se queda solo al pie de la página con la tabla en la
    // siguiente.
    + '\\makeatletter\n'
    + '\\newenvironment{tablacentrada}{\\par\\nopagebreak\\begingroup\\@beginparpenalty=10000\\relax\\begin{center}}{\\end{center}\\endgroup}\n'
    + '\\makeatother\n'
    // Los huecos sobrantes se acumulan al pie de la página en vez de repartirse
    // entre los párrafos: es lo que evita las separaciones grandes a media hoja.
    + '\\raggedbottom\n\n'
    + '\\begin{document}\n\n';

  let tex = preambulo;
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} ' + (het ? 'Centro de gravedad y centroide de un cuerpo compuesto'
                                                     : 'Centroide de una sección compuesta') + '}\\\\[3pt]\n'
    + '  {\\large\\color{bsaAcc2} Método de las partes: áreas, momentos estáticos y centroide}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Informe generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{6pt}\n\n';

  // ══ 1. Planteamiento ══
  tex += '\\seccion{1. Planteamiento del problema}\n';
  tex += lamina(tikzSeccionCompuesta({cotas:true, numerar:true}),
    'Sección compuesta con sus partes numeradas y las cotas generales, medidas entre los '
    + 'bordes de las figuras. Las partes rayadas son huecos.');
  tex += '\\begin{center}\n\\begin{tabular}{@{}ll@{\\hspace{18pt}}ll@{}}\n'
    + '\\tikz{\\filldraw[fill=bsaAcc2, fill opacity=0.30, draw=bsaAcc2] (0,0) rectangle (0.35,0.22);} & {\\footnotesize Área que suma} & '
    + '\\tikz{\\filldraw[pattern=north east lines, pattern color=bsaAcc2, draw=bsaAcc2, dashed] (0,0) rectangle (0.35,0.22);} & {\\footnotesize Área que resta (hueco)} \\\\\n'
    + '\\end{tabular}\n\\end{center}\n\\vspace{4pt}\n';

  tex += '\\subpaso{Objetivo}\n'
    + 'Localizar el centroide $C$ de la sección' + (het ? ' y el centro de gravedad $G$ del cuerpo' : '')
    + ', es decir, sus coordenadas $\\bar{x}$ e $\\bar{y}$ medidas desde el origen $O$ de los ejes de referencia $X$ e $Y$.\n';
  tex += porque('centroide',
    'El peso de un cuerpo es la resultante de los pesos de todas sus partículas: un sistema de fuerzas paralelas. '
    + 'Esa resultante pasa siempre por el mismo punto del cuerpo, el \\emph{centro de gravedad} $G$, que se localiza '
    + 'igualando el momento del peso total al momento de todos los pesos parciales. Si el material es homogéneo, el '
    + 'peso específico se cancela en ese cociente y la posición depende solo de la geometría: es el \\emph{centroide} '
    + '$C$ del área, el punto donde habría que apoyar la sección para que quedara en equilibrio.'
    + (het ? ' Aquí el material cambia de una parte a otra, así que $G$ y $C$ no coinciden y hay que calcular los dos.' : ''));

  tex += '\\subpaso{Procedimiento de análisis}\n'
    + '\\begin{enumerate}\\setlength{\\itemsep}{1pt}\n'
    + '\\item \\textbf{Partes.} Se divide la sección en figuras de centroide conocido (rectángulos, triángulos, círculos y '
    + 'sus fracciones). Un hueco es una parte más, con área \\textbf{negativa}.\n'
    + '\\item \\textbf{Propiedades de cada parte.} Su área $A_i$, la posición de su centroide propio dentro de la figura '
    + '(fórmula de la tabla de figuras) y las coordenadas $\\tilde{x}_i$, $\\tilde{y}_i$ de ese centroide medidas desde $O$.'
    + (het ? ' En un cuerpo heterogéneo, además, el ' + Wnom + ' de cada parte, $' + Wsim + '_i = ' + simb + '_i A_i t_i$.' : '') + '\n'
    + '\\item \\textbf{Tabla.} Se tabulan $A_i$, $\\tilde{x}_i$, $\\tilde{y}_i$ y los momentos estáticos $A_i\\tilde{x}_i$, '
    + '$A_i\\tilde{y}_i$, y se suman las columnas.' + (het ? ' Y lo mismo con los ' + Wnoms + '.' : '') + '\n'
    + '\\item \\textbf{Centroide.} $\\bar{x} = \\sum A_i\\tilde{x}_i / \\sum A_i$, $\\bar{y} = \\sum A_i\\tilde{y}_i / \\sum A_i$'
    + (het ? ', y $G$ con los ' + Wnoms + ' en lugar de las áreas' : '') + '. Después se comprueba.\n'
    + '\\end{enumerate}\n';

  tex += '\\subpaso{Convenio}\n'
    + '\\noindent Todas las posiciones se miden desde el origen $O$ de los ejes $X$ e $Y$ del dibujo, positivas hacia la '
    + 'derecha y hacia arriba. La tilde ($\\tilde{x}_i$, $\\tilde{y}_i$) señala el centroide de \\emph{una parte}; la barra '
    + '($\\bar{x}$, $\\bar{y}$), el de \\emph{toda la sección}. Los huecos entran en todas las sumas con su área cambiada de '
    + 'signo y con su centroide en el sitio del hueco.\n';

  // ══ 2. Paso 1: propiedades de cada parte ══
  tex += '\\seccion{2. Paso 1 --- Propiedades de cada parte}\n';
  tex += '\\noindent Cada parte se trata como una figura aislada: área, centroide propio y posición de ese centroide '
    + 'desde $O$. El croquis acotado de cada una va al costado de su desarrollo.\n';
  grupos.forEach((g, gi)=>{
    const i0 = g.idx[0], s0 = st[i0], f = s0.fig;
    const nums = g.idx.map(i=>i+1);
    const fa = formulaArea(f);
    const areaBruta = FIG_DEFS[f.type].area(f.dims);
    const cl = centroideLocalTex(f);
    const giro = f.rotation || 0;
    const varios = g.idx.length > 1;

    // Cada parte arranca con una regla fina y aire: sin eso los desarrollos se
    // leen como un único bloque continuo.
    if(gi > 0) tex += '\\vspace{10pt}\\noindent\\textcolor{black!20}{\\rule{\\textwidth}{0.4pt}}\\vspace{10pt}\n\n';
    // Todo el bloque de la parte (título, nota, desarrollo y croquis) va en una
    // minipage de ancho completo: es indivisible, así que si no cabe pasa
    // entero a la página siguiente y, si cabe, la página se llena con
    // normalidad. Con \filbreak y \raggedbottom, cada parte abría página.
    tex += '\\par\\noindent\\begin{minipage}{\\textwidth}\n';
    tex += '\\noindent{\\bfseries\\color{bsaAcc} ' + (varios ? 'Partes ' + listaNums(nums) : 'Parte ' + nums[0]) + ': '
         + nombreDe(f) + '}\\ \\ {\\small\\color{bsaMuted}('
         + (f.sign > 0 ? (varios ? 'se suman' : 'se suma') : (varios ? 'se restan' : 'se resta')) + ')}\\\\[3pt]\n';
    if(varios){
      tex += '{\\footnotesize ' + (g.simetria === 'vertical'
          ? 'Las ' + g.idx.length + ' partes son iguales y están en \\textbf{espejo respecto del eje vertical} que parte la '
            + 'sección por la mitad: comparten área, centroide propio y $\\tilde{y}$; solo cambia $\\tilde{x}$, que queda a '
            + 'la misma distancia de ese eje a uno y otro lado. Se desarrollan una sola vez.'
          : g.simetria === 'horizontal'
          ? 'Las ' + g.idx.length + ' partes son iguales y están en \\textbf{espejo respecto del eje horizontal} que parte la '
            + 'sección por la mitad: comparten área, centroide propio y $\\tilde{x}$; solo cambia $\\tilde{y}$, que queda a '
            + 'la misma distancia de ese eje arriba y abajo. Se desarrollan una sola vez.'
          : 'Las ' + g.idx.length + ' partes son iguales (mismo tipo y dimensiones): área y centroide propio se calculan '
            + 'una sola vez, y cada una entra en la tabla con su propia posición.') + '}\\\\[4pt]\n';
    }

    // Un perfil laminado es UNA parte con propiedades tabuladas: antes del
    // desarrollo se imprime su fila del catálogo (a todo el ancho).
    const tb = f.perfil ? perfilTab(f) : null;
    const fam = tb ? famPorId(f.perfil.fam) : null;
    if(tb){
      tex += _tablaPerfilTex(f, tablaCaption);
    }

    // Ecuaciones en display con menos aire: dentro del bloque de una parte hay
    // varias seguidas y con el espaciado normal el bloque crece sin necesidad.
    tex += '\\noindent\\begin{minipage}[t]{0.60\\textwidth}\n\\small\n'
         + '\\abovedisplayskip=3pt\\belowdisplayskip=3pt\\abovedisplayshortskip=2pt\\belowdisplayshortskip=2pt\n';

    if(tb){
      const conv = fam && fam.u !== unit;
      tex += '\\textbf{Valores de la tabla' + (conv ? ' en ' + uTxt : '') + '}\n';
      // s0.a es el área TABULADA (figArea), con el signo de la parte.
      tex += '\\[ A_i = ' + decP(Math.abs(s0.a),'area') + U2 + ' \\]\n';
      if(f.sign < 0)
        tex += '{\\footnotesize En las sumas: $A_{' + nums[0] + '} = -' + decP(Math.abs(s0.a),'area') + U2 + '$.}\\\\[3pt]\n';
      tex += '\\textbf{Centroide propio}\n';
      if(f.type === 'wshape')
        tex += '{\\footnotesize En el centro del perfil: doble simetría.}\\\\[3pt]\n';
      else if(f.type === 'channel')
        tex += '{\\footnotesize A $\\bar{x} = ' + decP(tb.xb,'len') + U1 + '$ del respaldo del alma (tabulado) y sobre el '
             + 'eje horizontal de simetría.}\\\\[3pt]\n';
      else
        tex += '{\\footnotesize A $\\bar{x} = ' + decP(tb.xb,'len') + U1 + '$ y $\\bar{y} = '
             + decP(tb.yb !== undefined ? tb.yb : tb.xb,'len') + U1 + '$ del vértice del ángulo (tabulados).}\\\\[3pt]\n';
    } else {
    // Área
    tex += '\\textbf{Área}\n';
    // Fórmula literal, sustituida y resultado en una sola línea; en dos si la
    // literal lleva una aclaración (el sector avisa de que θ va en radianes).
    if(fa.sim.indexOf('\\quad') >= 0)
      tex += '\\[ ' + fa.sim + ' \\]\n\\[ ' + fa.sus + ' = ' + decP(areaBruta,'area') + U2 + ' \\]\n';
    else
      tex += '\\[ ' + fa.sim + ' = ' + fa.sus.replace(/^A_i = /, '') + ' = ' + decP(areaBruta,'area') + U2 + ' \\]\n';
    if(f.sign < 0){
      tex += porque('hueco',
        'Un hueco es material que falta. Si se calcula primero la figura llena y luego se le quita el hueco, el '
        + 'momento estático de lo que queda es el de la figura llena \\emph{menos} el del hueco: por eso el hueco entra '
        + 'en las sumas con su área cambiada de signo y con su centroide en el sitio del hueco. La fórmula de compuestos '
        + 'sigue valiendo tal cual, con un sumando que resta.');
      tex += '{\\footnotesize En las sumas: $A_{' + nums[0] + '} = -' + decP(areaBruta,'area') + U2 + '$'
           + (varios ? ' (igual para ' + (nums.length > 2 ? 'las partes ' : 'la parte ') + listaNums(nums.slice(1)) + ')' : '')
           + '.}\\\\[3pt]\n';
    }

    // Centroide propio: solo donde no está en el centro de la caja, y con la
    // razón de la fórmula la primera vez que aparece cada tipo (R1).
    if(cl){
      tex += '\\textbf{Centroide propio}\n';
      tex += '\\[ ' + cl + ' \\]\n';
      if(f.type === 'rtriangle' || f.type === 'rtriangle2')
        tex += porque('tri',
          'El centroide de un triángulo está a un tercio de la altura desde la base (y a un tercio de la base desde el '
          + 'cateto vertical): es el punto donde se cruzan las medianas. Sale de integrar $\\int\\tilde{y}\\,dA$ con '
          + 'franjas paralelas a la base, cuyo ancho decrece linealmente hacia el vértice (Hibbeler, ej. 9.3).');
      else if(f.type === 'semicircle')
        tex += porque('semi',
          'En un semicírculo hay más área cerca del diámetro que cerca del arco, así que el centroide no está a $R/2$ '
          + 'sino más abajo, a $4R/3\\pi \\approx 0.42\\,R$ del diámetro. Se obtiene integrando con sectores '
          + 'diferenciales, cada uno con su centroide a $2R/3$ del centro (Hibbeler, ej. 9.4).');
      else if(f.type === 'quarter')
        tex += porque('cuarto',
          'El cuarto de círculo es un semicírculo partido por su eje de simetría: su centroide está a $4R/3\\pi$ de '
          + 'cada uno de los dos radios rectos, por el mismo motivo que en el semicírculo (Hibbeler, ej. 9.4).');
      else if(f.type === 'sector')
        tex += porque('sector',
          'El sector circular de semiángulo $\\theta$ tiene su centroide sobre la bisectriz, a $2R\\sen\\theta/3\\theta$ del '
          + 'vértice. La fórmula reúne los dos casos límite: con $\\theta$ pequeño tiende a $2R/3$ (un triángulo) y con '
          + '$\\theta = 90^\\circ$ da $4R/3\\pi$ (el semicírculo).');
    }
    }   // fin de la rama «no es perfil»

    // Posición desde O, una línea por parte del grupo.
    tex += '\\textbf{Posición desde $O$}\n';
    tex += porque('posicion',
      '$\\tilde{x}_i$ e $\\tilde{y}_i$ son las coordenadas del centroide de la parte medidas desde $O$: son los '
      + '\\emph{brazos} con los que su área entra en la suma de momentos. Se obtienen sumando, a la posición de la '
      + 'figura, la distancia del centroide propio a la referencia con la que se colocó.');
    g.idx.forEach(i=>{
      const s = st[i];
      tex += '\\[ \\tilde{x}_{' + (i+1) + '} = ' + decP(s.xi,'len') + U1
           + ' \\qquad \\tilde{y}_{' + (i+1) + '} = ' + decP(s.yi,'len') + U1 + ' \\]\n';
    });
    if(Math.abs(giro) >= 0.5){
      tex += nota('giro', 'La parte está girada $\\beta = ' + decP(giro,'len') + '^\\circ$ respecto del eje $X$. El giro '
        + 'reubica el centroide propio, y con él $\\tilde{x}$ e $\\tilde{y}$, pero no altera el área.');
    }

    // Peso o masa, solo en cuerpo heterogéneo. Mismo material y espesor en todo
    // el grupo (forma parte de la clave), así que se escribe una vez.
    if(het){
      const gs = s0.mat ? decP(s0.g,'len') : '1';
      tex += '\\textbf{' + (esMasa ? 'Masa' : 'Peso') + '}\n';
      tex += porque('peso',
        'Con materiales distintos el ' + Wnom + ' ya no es proporcional al área: cada parte '
        + (esMasa ? 'tiene masa' : 'pesa') + ' $' + simb + '_i A_i t_i$, con $t_i$ su espesor perpendicular al plano. '
        + 'El balance de momentos que localiza $G$ hay que hacerlo con ' + Wnoms + ', no con áreas: el centro de '
        + 'gravedad se desplaza hacia el material más ' + (esMasa ? 'denso' : 'pesado') + '.');
      tex += '\\[ ' + Wsim + '_{' + nums[0] + '} = ' + simb + '_{' + nums[0] + '}\\,A_{' + nums[0] + '}\\,t_{' + nums[0] + '} = ('
           + gs + ')(' + decP(Math.abs(s0.a),'area') + ')(' + decP(s0.t,'len') + ') = ' + decP(Math.abs(s0.w),'area') + UW + ' \\]\n';
      tex += '{\\footnotesize $' + simb + '_{' + nums[0] + '} = ' + gs + '\\,' + uGm + '$, $t_{' + nums[0] + '} = '
           + decP(s0.t,'len') + U1 + '$'
           + (varios ? '; igual para ' + (nums.length > 2 ? 'las partes ' : 'la parte ') + listaNums(nums.slice(1)) : '')
           + (f.sign < 0 ? '. Como es un hueco, entra en las sumas con signo negativo' : '') + '.}\n';
    }
    tex += '\\end{minipage}\\hfill\n';
    // El croquis acotado de siempre (con el giro β si lo hay) y, en un perfil,
    // debajo la ficha con la notación de la tabla: las dos cosas, porque sin el
    // croquis no se reconoce la figura ni se ve cómo está girada.
    tex += '\\begin{minipage}[t]{0.36\\textwidth}\n\\vspace{2pt}\\centering\n'
         + tikzCroquisFigura(f, 4.4) + '\n';
    tex += '\\\\[2pt]{\\scriptsize\\color{bsaMuted}Croquis acotado en ' + uTxt
         + (Math.abs(giro) >= 0.5 ? ', girado $\\beta = ' + decP(giro,'len') + '^\\circ$' : '') + '}\n';
    if(tb){
      tex += '\\\\[8pt]\n' + _tikzFichaPerfil(f.type) + '\n'
           + '\\\\[2pt]{\\scriptsize\\color{bsaMuted}Notación de la tabla, según Beer \\& Johnston, Apéndice C}\n';
    }
    tex += ''
         + '\\end{minipage}\n\\end{minipage}\n\\vspace{4pt}\n';
  });

  // ══ 3. Paso 2: tabla de áreas y momentos estáticos ══
  tex += '\\seccion{3. Paso 2 --- Tabla de áreas y momentos estáticos}\n';
  tex += porque('momento-estatico',
    'El producto $A_i\\tilde{x}_i$ es el \\emph{momento estático} (de primer orden) del área de la parte respecto del '
    + 'eje $Y$: área por brazo, igual que fuerza por brazo en una suma de momentos. Al tabularlo por partes y sumar, '
    + 'la integral $\\int\\tilde{x}\\,dA$ de la definición se convierte en una suma finita. Un hueco, con área '
    + 'negativa, resta momento donde está.');
  let tNumA;
  {
    const fA  = factorColumna(st.map(s=>s.a));
    const fAX = factorColumna(st.map(s=>s.ax).concat([results.Qy]));
    const fAY = factorColumna(st.map(s=>s.ay).concat([results.Qx]));
    tex += tablaCaption('Áreas, posición del centroide de cada parte y momentos estáticos. Las áreas llevan ya el '
      + 'signo de la parte; una columna con factor $\\times 10^{n}$ lo anuncia en la cabecera.');
    tNumA = tablaN;
    tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{clccccc}\\hline\n'
      + '\\textbf{Parte} & \\textbf{Figura} & '
      + cab('$A_i$', fA, u2Txt) + ' & ' + cab('$\\tilde{x}_i$', {cab:''}, uTxt) + ' & '
      + cab('$\\tilde{y}_i$', {cab:''}, uTxt) + ' & ' + cab('$A_i\\tilde{x}_i$', fAX, '') + ' & '
      + cab('$A_i\\tilde{y}_i$', fAY, '') + '\\\\\\hline\n';
    st.forEach((s,i)=>{
      tex += (i+1) + ' & ' + nombreDe(s.fig)
        + ' & ' + celdaCol(s.a, fA, DEC.area)
        + ' & ' + decP(s.xi,'len')
        + ' & ' + decP(s.yi,'len')
        + ' & ' + celdaCol(s.ax, fAX, DEC.area)
        + ' & ' + celdaCol(s.ay, fAY, DEC.area) + ' \\\\\n';
    });
    tex += '\\hline\n\\multicolumn{2}{l}{$\\sum$} & '
      + celdaCol(results.A, fA, DEC.area) + ' & --- & --- & '
      + celdaCol(results.Qy, fAX, DEC.area) + ' & '
      + celdaCol(results.Qx, fAY, DEC.area) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{tablacentrada}}\n';
  }

  // Segunda tabla, solo si el cuerpo es heterogéneo: la de pesos o masas.
  let tNumW;
  if(het){
    const fG  = factorColumna(st.map(s=>s.g));
    const fW  = factorColumna(st.map(s=>s.w));
    const fWX = factorColumna(st.map(s=>s.wx).concat([results.Wx]));
    const fWY = factorColumna(st.map(s=>s.wy).concat([results.Wy]));
    tex += '\\vspace{4pt}\n';
    tex += tablaCaption((esMasa ? 'Densidades, espesores, masas' : 'Pesos específicos, espesores, pesos')
      + ' y momentos estáticos de ' + Wnom + ', con $' + Wsim + '_i$ en ' + uWtxt + '. Es la tabla que localiza $G$.');
    tNumW = tablaN;
    tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{ccccccc}\\hline\n'
      + '\\textbf{Parte} & \\textbf{Material} & '
      + cab('$' + simb + '_i$', fG, '') + ' & \\textbf{$t_i$} {\\scriptsize(' + uTxt + ')} & '
      + cab('$' + Wsim + '_i$', fW, '') + ' & '
      + cab('$' + Wsim + '_i\\tilde{x}_i$', fWX, '') + ' & '
      + cab('$' + Wsim + '_i\\tilde{y}_i$', fWY, '') + '\\\\\\hline\n';
    st.forEach((s,i)=>{
      tex += (i+1)
        + ' & ' + (s.mat ? ('$' + simb + '_{' + s.mat.id + '}$') : '---')
        + ' & ' + celdaCol(s.g, fG, DEC.len)
        + ' & ' + decP(s.t,'len')
        + ' & ' + celdaCol(s.w, fW, DEC.area)
        + ' & ' + celdaCol(s.wx, fWX, DEC.area)
        + ' & ' + celdaCol(s.wy, fWY, DEC.area) + ' \\\\\n';
    });
    tex += '\\hline\n\\multicolumn{4}{l}{$\\sum$} & '
      + celdaCol(results.W, fW, DEC.area) + ' & '
      + celdaCol(results.Wx, fWX, DEC.area) + ' & '
      + celdaCol(results.Wy, fWY, DEC.area) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{tablacentrada}}\n';
  }

  // ══ 4. Paso 3: centroide ══
  tex += '\\seccion{4. Paso 3 --- ' + (het ? 'Centroide y centro de gravedad' : 'Centroide de la sección') + '}\n';
  tex += '\\noindent Con las sumas de la Tabla ' + tNumA + ':\n';
  tex += '\\[ A = \\sum A_i = ' + ftex(results.A) + U2 + ' \\]\n';
  tex += '\\[ \\bar{x} = \\dfrac{\\sum A_i\\tilde{x}_i}{\\sum A_i} = \\dfrac{' + ftex(results.Qy) + '}{' + ftex(results.A) + '} = '
    + decP(results.xbar,'len') + U1 + ' \\qquad '
    + '\\bar{y} = \\dfrac{\\sum A_i\\tilde{y}_i}{\\sum A_i} = \\dfrac{' + ftex(results.Qx) + '}{' + ftex(results.A) + '} = '
    + decP(results.ybar,'len') + U1 + ' \\]\n';
  tex += porque('cociente',
    'Dividir el momento estático total entre el área total da la posición en la que habría que concentrar toda el '
    + 'área para producir el mismo momento respecto del eje: esa es la definición del centroide. Es un promedio de '
    + 'posiciones ponderado por áreas, y por eso siempre queda entre la parte más a la izquierda y la más a la derecha.');
  tex += '\\resultado{\\centering $C\\,(\\bar{x};\\ \\bar{y}) = (' + decP(results.xbar,'len') + ';\\ '
    + decP(results.ybar,'len') + ')' + U1 + '$, medido desde $O$.}\n';
  if(het){
    tex += '\\subpaso{Centro de gravedad $G$}\n';
    tex += '\\noindent Con las sumas de la Tabla ' + tNumW + ', el mismo cociente pero con ' + Wnoms + ':\n';
    tex += '\\[ \\bar{x}_G = \\dfrac{\\sum ' + Wsim + '_i\\tilde{x}_i}{\\sum ' + Wsim + '_i} = \\dfrac{' + ftex(results.Wx) + '}{' + ftex(results.W) + '} = '
      + decP(results.xg,'len') + U1 + ' \\qquad '
      + '\\bar{y}_G = \\dfrac{\\sum ' + Wsim + '_i\\tilde{y}_i}{\\sum ' + Wsim + '_i} = \\dfrac{' + ftex(results.Wy) + '}{' + ftex(results.W) + '} = '
      + decP(results.yg,'len') + U1 + ' \\]\n';
    tex += '\\resultado{\\centering $G\\,(\\bar{x}_G;\\ \\bar{y}_G) = (' + decP(results.xg,'len') + ';\\ '
      + decP(results.yg,'len') + ')' + U1 + '$, a ' + decP(results.sep,'len') + '\\,' + uTxt + ' de $C$.}\n';
  }
  tex += '\\veredicto{'
    + (het
      ? 'Cuerpo \\textbf{heterogéneo}: el centro de gravedad $G$ no coincide con el centroide $C$ '
        + '(distan ' + decP(results.sep,'len') + '\\,' + uTxt + '). $G$ se desplaza hacia el material más '
        + (esMasa ? 'denso' : 'pesado') + ', y es $G$, no $C$, por donde pasa la resultante del peso.'
      : 'Cuerpo \\textbf{homogéneo}: el peso específico se cancela en el cociente, de modo que el centroide, el centro '
        + 'de masa y el centro de gravedad son el mismo punto $C$.')
    + '}\n';

  // ══ 5. Paso 4: comprobaciones ══
  tex += '\\seccion{5. Paso 4 --- Comprobaciones}\n';
  tex += porque('comprobar',
    'Un centroide mal situado no se nota a simple vista, pero hay tres cosas que siempre deben cumplirse y se '
    + 'comprueban en segundos: la simetría, si la hay, fija una coordenada de antemano; $C$ tiene que caer dentro del '
    + 'rectángulo que envuelve la sección (puede caer fuera del material, como en un anillo, pero nunca fuera de la '
    + 'envolvente); y respecto de cualquier eje que pase por $C$ el momento estático total tiene que ser nulo, que es '
    + 'la definición del centroide leída al revés.');
  tex += '\\begin{itemize}\\setlength{\\itemsep}{2pt}\n';
  // (a) simetría, contrastada contra el centro de la envolvente
  const okV = simSec.v && Math.abs(results.xbar - env.x0) < 1e-6*Math.max(1, env.maxX - env.minX);
  const okH = simSec.h && Math.abs(results.ybar - env.y0) < 1e-6*Math.max(1, env.maxY - env.minY);
  if(simSec.v || simSec.h){
    tex += '\\item \\textbf{Simetría.} ';
    if(simSec.v) tex += 'La sección es simétrica respecto del eje vertical $x = ' + decP(env.x0,'len') + '$'
      + U1 + ', así que $\\bar{x}$ tenía que caer sobre él: $\\bar{x} = ' + decP(results.xbar,'len') + '$'
      + (okV ? '\\ \\checkmark' : ' (no coincide: revisar)') + '. ';
    if(simSec.h) tex += 'La sección es simétrica respecto del eje horizontal $y = ' + decP(env.y0,'len') + '$'
      + U1 + ', así que $\\bar{y}$ tenía que caer sobre él: $\\bar{y} = ' + decP(results.ybar,'len') + '$'
      + (okH ? '\\ \\checkmark' : ' (no coincide: revisar)') + '. ';
    tex += '\n';
  } else {
    tex += '\\item \\textbf{Simetría.} La sección no tiene un eje de simetría vertical ni horizontal, así que ninguna '
      + 'coordenada se conoce de antemano: las dos salen de la tabla.\n';
  }
  // (b) envolvente
  const dentro = results.xbar >= env.minX - env.tol && results.xbar <= env.maxX + env.tol
              && results.ybar >= env.minY - env.tol && results.ybar <= env.maxY + env.tol;
  tex += '\\item \\textbf{Envolvente.} La sección ocupa $' + decP(env.minX,'len') + ' \\le x \\le ' + decP(env.maxX,'len')
    + '$ y $' + decP(env.minY,'len') + ' \\le y \\le ' + decP(env.maxY,'len') + '$' + U1 + ', y $C\\,('
    + decP(results.xbar,'len') + ';\\ ' + decP(results.ybar,'len') + ')$ queda dentro'
    + (dentro ? '\\ \\checkmark' : ' --- no queda dentro: revisar') + '.\n';
  // (c) momento estático nulo respecto de C
  {
    let mx = 0, my = 0;
    st.forEach(s=>{ mx += s.a*(s.xi - results.xbar); my += s.a*(s.yi - results.ybar); });
    const esc0 = Math.max(Math.abs(results.Qx), Math.abs(results.Qy), 1);
    const cero = v => (Math.abs(v) < 1e-9*esc0) ? '0' : ftex(v);
    tex += '\\item \\textbf{Momento nulo respecto de $C$.} Trasladando el eje al centroide, las partes de un lado '
      + 'compensan a las del otro:\n'
      + '\\[ \\sum A_i\\left(\\tilde{x}_i - \\bar{x}\\right) = ' + cero(mx) + ' \\qquad '
      + '\\sum A_i\\left(\\tilde{y}_i - \\bar{y}\\right) = ' + cero(my) + ' \\qquad\\checkmark \\]\n';
  }
  tex += '\\end{itemize}\n';

  // Lámina final: la sección resuelta, acotando solo C (y G).
  tex += '\\subpaso{Sección resuelta}\n';
  tex += lamina(tikzSeccionCompuesta({cotas:false, marcarC:true, ejes:true, cotasC:true}),
    'Sección resuelta: posición del centroide $C$' + (het ? ' y del centro de gravedad $G$' : '')
    + ' medida desde los ejes $X$ e $Y$. Las cotas llevan la variable; los valores están en la Tabla ' + (tablaN+1) + '.');
  tex += tablaCaption('Resultados.');
  tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{lcc}\\hline\n'
    + '\\textbf{Magnitud} & \\textbf{Valor} & \\textbf{Unidad} \\\\\\hline\n'
    + 'Área total $A$ & $' + ftex(results.A) + '$ & ' + u2Txt + ' \\\\\n'
    + 'Centroide $\\bar{x}$ & $' + decP(results.xbar,'len') + '$ & ' + uTxt + ' \\\\\n'
    + 'Centroide $\\bar{y}$ & $' + decP(results.ybar,'len') + '$ & ' + uTxt + ' \\\\\n';
  if(het){
    tex += (esMasa ? 'Masa' : 'Peso') + ' total $' + Wsim + '$ & $' + ftex(results.W) + '$ & ' + uWtxt + ' \\\\\n'
      + 'Centro de gravedad $\\bar{x}_G$ & $' + decP(results.xg,'len') + '$ & ' + uTxt + ' \\\\\n'
      + 'Centro de gravedad $\\bar{y}_G$ & $' + decP(results.yg,'len') + '$ & ' + uTxt + ' \\\\\n';
  }
  tex += '\\hline\\end{tabular}\\end{tablacentrada}}\n';

  // ══ Referencias y colofón ══
  tex += '\\vspace{10pt}\\noindent{\\footnotesize\\color{bsaMuted}\\textbf{Referencias.} '
    + 'R.~C. Hibbeler, \\emph{Ingeniería Mecánica: Estática}, 12.\\textsuperscript{a} ed., cap.~9 «Centro de gravedad '
    + 'y centroide», §9.1--9.2. F.~P. Beer y E.~R. Johnston, \\emph{Mecánica vectorial para ingenieros: Estática}, cap.~5.}\n';
  tex += colofonLatexBSA();
  tex += '\\end{document}\n';
  return tex;
}
