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

function construirLatex(){
  if(!results){ aviso('Primero calcula el centroide.'); return null; }
  const het = results.hetero;
  const u2 = unit+'\\textsuperscript{2}', u1 = unit;
  const simb = (matSimbolo() === 'ρ') ? '\\rho' : '\\gamma';

  let figN = 0, tablaN = 0;
  function figCaption(txt){
    figN++;
    return '\n\\begin{center}{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\\end{center}\n\\vspace{4pt}\n';
  }
  function tablaCaption(txt){
    tablaN++;
    return '\n\\begin{center}{\\small\\color{bsaMuted}\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\end{center}\n\\vspace{4pt}\n';
  }

  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});

  const preambulo = '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n'
    + '\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.2cm]{geometry}\n'
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
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Centro de Gravedad y Centroide}\\hfill}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    + '\\newcommand{\\sen}{\\operatorname{sen}}\n'
    + '\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\veredicto}[1]{%\n'
    + '  \\begin{center}\\fcolorbox{bsaAcc}{bsaAcc!7}{\\parbox{0.93\\textwidth}{\\vspace{3pt}#1\\vspace{3pt}}}\\end{center}}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\vspace{10pt}{\\large\\bfseries\\color{bsaAcc}#1}\\par\\vspace{3pt}\\hrule\\vspace{7pt}}\n\n'
    + '\\begin{document}\n\n';

  let tex = preambulo;
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Reporte de An\\\'alisis de Secci\\\'on Compuesta}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{8pt}\n\n';

  // ── 1. Sección compuesta con cotas ──
  tex += '\\seccion{1. Secci\\\'on compuesta}\n'
    + '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n' + tikzSeccionCompuesta({cotas:true}) + '\\end{tikzpicture}\n\\end{center}\n';
  tex += figCaption('Secci\\\'on compuesta con sus figuras y cotas generales.');
  tex += '\\begin{center}\n\\begin{tabular}{@{}ll@{\\hspace{18pt}}ll@{}}\n'
    + '\\tikz{\\filldraw[fill=bsaAcc2, fill opacity=0.30, draw=bsaAcc2] (0,0) rectangle (0.35,0.22);} & {\\footnotesize \\\'Area que suma} & '
    + '\\tikz{\\filldraw[pattern=north east lines, pattern color=bsaAcc2, draw=bsaAcc2, dashed] (0,0) rectangle (0.35,0.22);} & {\\footnotesize \\\'Area que resta} \\\\\n'
    + '\\end{tabular}\n\\end{center}\n\\vspace{6pt}\n';

  // ── 2. Propiedades de cada figura ──
  // Desarrollo completo por figura: fórmula del área, sustitución, resultado,
  // centroide, giro y (si el cuerpo es heterogéneo) peso o masa. El croquis
  // acotado va al costado, a la misma altura, en una minipágina.
  tex += '\\seccion{2. Propiedades de cada figura}\n';
  results.steps.forEach((st,i)=>{
    const f = st.fig;
    const nom = f.etiqueta || f.name || FIG_DEFS[f.type].name;
    const fa = formulaArea(f);
    const areaBruta = FIG_DEFS[f.type].area(f.dims);
    const cl = centroideLocalTex(f);
    const g = f.rotation || 0;

    // Cada figura arranca con una regla fina y aire por arriba y por abajo:
    // sin eso los 18 desarrollos se leen como un único bloque continuo y no se
    // distingue dónde acaba uno y empieza el siguiente.
    if(i > 0) tex += '\\vspace{12pt}\\noindent\\textcolor{black!20}{\\rule{\\textwidth}{0.4pt}}\\vspace{12pt}\n\n';
    tex += '\\noindent{\\bfseries\\color{bsaAcc} Figura ' + (i+1) + ': '
         + escLatex(nom) + '}\\ \\ {\\small\\color{bsaMuted}('
         + (f.sign > 0 ? 'se \\textbf{suma}' : 'se \\textbf{resta}') + ')}\\\\[6pt]\n';

    tex += '\\noindent\\begin{minipage}[t]{0.60\\textwidth}\n\\small\n';
    tex += '\\textbf{\\\'Area}\n';
    tex += '\\[ ' + fa.sim + ' \\]\n';
    tex += '\\[ ' + fa.sus + ' = ' + decP(areaBruta,'area') + '\\,' + utex(u2) + ' \\]\n';
    if(f.sign < 0){
      tex += '{\\footnotesize Al ser un hueco entra en las sumas con signo negativo: '
           + '$A_{' + (i+1) + '} = -' + decP(areaBruta,'area') + '$.}\\\\[3pt]\n';
    }
    tex += '\\textbf{Centroide}\n';
    if(cl) tex += '\\[ ' + cl + ' \\]\n';
    tex += '\\[ \\tilde{x}_{' + (i+1) + '} = ' + decP(st.xi,'len') + '\\,' + utex(u1)
         + ' \\qquad \\tilde{y}_{' + (i+1) + '} = ' + decP(st.yi,'len') + '\\,' + utex(u1) + ' \\]\n';
    if(Math.abs(g) >= 0.5){
      tex += '{\\footnotesize Figura girada un \\\'angulo $\\beta = ' + decP(g,'len')
           + '^\\circ$ respecto al eje $x$. El giro reubica el centroide, pero no '
           + 'altera el \\\'area.}\\\\[3pt]\n';
    }
    if(het){
      const gs = st.mat ? decP(st.g,'len') : '1';
      tex += '\\textbf{' + (matMagnitud === 'densidad' ? 'Masa' : 'Peso') + '}\n';
      tex += '\\[ ' + (matMagnitud === 'densidad' ? 'm_i' : 'W_i') + ' = '
           + simb + '_i\\,A_i\\,t_i = (' + gs + ')(' + decP(Math.abs(st.a),'area')
           + ')(' + decP(st.t,'len') + ') = ' + decP(Math.abs(st.w),'area') + ' \\]\n';
      tex += '{\\footnotesize Espesor perpendicular al plano $XY$: $t_i = '
           + decP(st.t,'len') + '\\,' + u1 + '$.}\n';
    }
    tex += '\\end{minipage}\\hfill\n';
    tex += '\\begin{minipage}[t]{0.36\\textwidth}\n\\vspace{2pt}\\centering\n'
         + tikzCroquisFigura(f, 4.4) + '\n';
    if(Math.abs(g) >= 0.5){
      tex += '\\\\[3pt]{\\scriptsize$\\beta = ' + decP(g,'len') + '^\\circ$}\n';
    }
    tex += '\\\\[2pt]{\\scriptsize\\color{bsaMuted}Croquis acotado, en ' + u1 + '}\n'
         + '\\end{minipage}\n\\vspace{6pt}\n';
  });

  // ── 3. Tabla resumen ──
  // Aquí sí va el cuadro de valores y de productos, con un factor 10^n común
  // por columna para que los números no se desborden.
  tex += '\\seccion{3. Tabla resumen de figuras}\n';
  {
    const fA  = factorColumna(results.steps.map(s2=>s2.a));
    const fX  = factorColumna(results.steps.map(s2=>s2.xi));
    const fY  = factorColumna(results.steps.map(s2=>s2.yi));
    const fAX = factorColumna(results.steps.map(s2=>s2.ax).concat([results.Qy]));
    const fAY = factorColumna(results.steps.map(s2=>s2.ay).concat([results.Qx]));
    const cab = (t, f, u) => '\\textbf{' + t + '}' + (f.cab ? ' $' + f.cab + '$' : '')
                           + (u ? ' {\\scriptsize(' + u + ')}' : '');

    tex += '\\begin{center}\\begin{tabular}{clccccc}\\hline\n'
      + '\\textbf{N\\textsuperscript{o}} & \\textbf{Figura} & '
      + cab('$A_i$', fA, u2) + ' & ' + cab('$\\tilde{x}_i$', fX, u1) + ' & '
      + cab('$\\tilde{y}_i$', fY, u1) + ' & ' + cab('$A_i\\tilde{x}_i$', fAX, '') + ' & '
      + cab('$A_i\\tilde{y}_i$', fAY, '') + '\\\\\\hline\n';
    results.steps.forEach((s2,i)=>{
      const nom = s2.fig.etiqueta || s2.fig.name || FIG_DEFS[s2.fig.type].name;
      tex += (i+1) + ' & ' + escLatex(nom)
        + ' & ' + celdaCol(s2.a, fA, DEC.area)
        + ' & ' + celdaCol(s2.xi, fX, DEC.len)
        + ' & ' + celdaCol(s2.yi, fY, DEC.len)
        + ' & ' + celdaCol(s2.ax, fAX, DEC.area)
        + ' & ' + celdaCol(s2.ay, fAY, DEC.area) + ' \\\\\n';
    });
    tex += '\\hline\n\\multicolumn{2}{l}{$\\sum$ (Total)} & '
      + celdaCol(results.A, fA, DEC.area) + ' & --- & --- & '
      + celdaCol(results.Qy, fAX, DEC.area) + ' & '
      + celdaCol(results.Qx, fAY, DEC.area) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{center}\n'
      + tablaCaption('\\\'Areas, centroides y momentos est\\\'aticos de \\\'area. '
        + 'Las columnas con factor $\\times 10^{n}$ llevan ese factor en la cabecera.');
  }

  // Segunda tabla, solo si el cuerpo es heterogéneo: la de pesos o masas.
  if(het){
    const fG  = factorColumna(results.steps.map(s2=>s2.g));
    const fW  = factorColumna(results.steps.map(s2=>s2.w));
    const fWX = factorColumna(results.steps.map(s2=>s2.wx).concat([results.Wx]));
    const fWY = factorColumna(results.steps.map(s2=>s2.wy).concat([results.Wy]));
    const cab = (t, f, u) => '\\textbf{' + t + '}' + (f.cab ? ' $' + f.cab + '$' : '')
                           + (u ? ' {\\scriptsize(' + u + ')}' : '');
    const Wsim = (matMagnitud === 'densidad') ? 'm' : 'W';

    tex += '\\begin{center}\\begin{tabular}{clcccccc}\\hline\n'
      + '\\textbf{N\\textsuperscript{o}} & \\textbf{Figura} & \\textbf{$' + simb + '_i$} & '
      + cab('$' + simb + '_i$', fG, '') + ' & \\textbf{$t_i$} {\\scriptsize(' + u1 + ')} & '
      + cab('$' + Wsim + '_i$', fW, '') + ' & '
      + cab('$' + Wsim + '_i\\tilde{x}_i$', fWX, '') + ' & '
      + cab('$' + Wsim + '_i\\tilde{y}_i$', fWY, '') + '\\\\\\hline\n';
    results.steps.forEach((s2,i)=>{
      const nom = s2.fig.etiqueta || s2.fig.name || FIG_DEFS[s2.fig.type].name;
      tex += (i+1) + ' & ' + escLatex(nom)
        + ' & ' + (s2.mat ? ('$'+simb+'_{'+s2.mat.id+'}$') : '---')
        + ' & ' + celdaCol(s2.g, fG, DEC.len)
        + ' & ' + decP(s2.t,'len')
        + ' & ' + celdaCol(s2.w, fW, DEC.area)
        + ' & ' + celdaCol(s2.wx, fWX, DEC.area)
        + ' & ' + celdaCol(s2.wy, fWY, DEC.area) + ' \\\\\n';
    });
    tex += '\\hline\n\\multicolumn{5}{l}{$\\sum$ (Total)} & '
      + celdaCol(results.W, fW, DEC.area) + ' & '
      + celdaCol(results.Wx, fWX, DEC.area) + ' & '
      + celdaCol(results.Wy, fWY, DEC.area) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{center}\n'
      + tablaCaption((matMagnitud === 'densidad' ? 'Densidades, masas' : 'Pesos espec\\\'ificos, pesos')
        + ' y sus momentos est\\\'aticos. Es la tabla que alimenta el centro de gravedad.');
  }

  // ── 4. Centroide / centro de gravedad ──
  tex += '\\seccion{4. ' + (het?'Centroide, centro de gravedad y \\\'area':'Centroide y \\\'area de la secci\\\'on compuesta') + '}\n';
  tex += '\\textbf{\\\'Area total}:\\\\[2pt]\n'
    + '\\[ A_{total} = \\sum A_i = ' + ftex(results.A) + '\\,' + utex(u2) + ' \\]\n';
  tex += '\\textbf{Coordenadas del centroide C}:\\\\[2pt]\n'
    + '\\[ \\bar{x} = \\dfrac{\\sum A_i \\tilde{x}_i}{\\sum A_i} = \\dfrac{' + ftex(results.Qy) + '}{' + ftex(results.A) + '} = '
    + decP(results.xbar,'len') + '\\,' + u1 + ' \\]\n'
    + '\\[ \\bar{y} = \\dfrac{\\sum A_i \\tilde{y}_i}{\\sum A_i} = \\dfrac{' + ftex(results.Qx) + '}{' + ftex(results.A) + '} = '
    + decP(results.ybar,'len') + '\\,' + u1 + ' \\]\n';
  if(het){
    tex += '\\textbf{Coordenadas del centro de gravedad G}:\\\\[2pt]\n'
      + '\\[ \\sum W_i = \\sum ' + simb + '_i A_i t_i = ' + decP(results.W,'area') + ' \\]\n'
      + '\\[ x_G = \\dfrac{\\sum W_i \\tilde{x}_i}{\\sum W_i} = \\dfrac{' + ftex(results.Wx) + '}{' + ftex(results.W) + '} = '
      + decP(results.xg,'len') + '\\,' + u1 + ' \\]\n'
      + '\\[ y_G = \\dfrac{\\sum W_i \\tilde{y}_i}{\\sum W_i} = \\dfrac{' + ftex(results.Wy) + '}{' + ftex(results.W) + '} = '
      + decP(results.yg,'len') + '\\,' + u1 + ' \\]\n';
  }
  tex += '\\veredicto{'
    + (het
      ? 'Cuerpo \\textbf{heterog\\\'eneo}: el centro de gravedad G queda a ' + decP(results.sep,'len') + '\\,' + u1
        + ' del centroide C, desplazado hacia el material m\\\'as pesado.'
      : 'Cuerpo \\textbf{homog\\\'eneo}: el peso espec\\\'ifico se cancela en el cociente, de modo que el centroide, '
        + 'el centro de masa y el centro de gravedad son el mismo punto.')
    + '}\n\n';

  // ── 5. Sección resuelta ──
  // Aquí NO se repite la cadena de cotas: se acota únicamente la posición de C
  // (y de G si el cuerpo es heterogéneo) respecto a los ejes X e Y, que aquí
  // sí se dibujan porque son la referencia de la medida.
  tex += '\\seccion{5. Secci\\\'on resuelta}\n'
    + '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
    + tikzSeccionCompuesta({cotas:false, marcarC:true, ejes:true, cotasC:true})
    + '\\end{tikzpicture}\n\\end{center}\n';
  // Los valores no van dentro del dibujo (allí solo la variable): se listan
  // debajo, donde caben con todos sus decimales y su unidad.
  tex += '\\begin{center}\\begin{tabular}{ll}\n'
    + '$\\bar{x}_{C} = ' + decP(results.xbar,'len') + '\\,' + utex(u1) + '$'
    + ' & $\\bar{y}_{C} = ' + decP(results.ybar,'len') + '\\,' + utex(u1) + '$ \\\\\n';
  if(het && results.sep > 1e-9){
    tex += '$\\bar{x}_{G} = ' + decP(results.xg,'len') + '\\,' + utex(u1) + '$'
      + ' & $\\bar{y}_{G} = ' + decP(results.yg,'len') + '\\,' + utex(u1) + '$ \\\\\n';
  }
  tex += '\\end{tabular}\\end{center}\n';
  tex += figCaption('Secci\\\'on resuelta: posici\\\'on del centroide C'
    + (het?' y del centro de gravedad G':'') + ' medida desde los ejes $X$ e $Y$.');

  // ── Cierre con la marca BSA ──
  tex += '\\vspace{18pt}\\hrule\\vspace{14pt}\n'
    + '\\begin{center}\n'
    + '{\\small\\color{bsaMuted}\\textbf{BEAM \\& SECTION ANALYSIS (BSA)}}\\\\[2pt]\n'
    + '{\\footnotesize\\color{bsaMuted}Plataforma educativa de an\\\'alisis estructural}\\\\[8pt]\n'
    + '\\begin{tikzpicture}[baseline]\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoB] at (0,0) {B};\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoS] at (0.47,0) {S};\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoA] at (0.96,0) {A};\n'
    + '\\end{tikzpicture}\\\\[7pt]\n'
    + '{\\footnotesize\\color{bsaMuted}Creado por \\textbf{Luis Alejandro Baz\\\'an Campos}}\\\\[2pt]\n'
    + '{\\scriptsize\\color{bsaMuted}beamsectionanalysis.com}\n'
    + '\\end{center}\n\n';

  tex += '\\end{document}\n';
  return tex;
}
