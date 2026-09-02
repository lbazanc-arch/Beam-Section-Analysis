function construirLatex(){
  if(!results){ aviso('Primero calcula el momento de inercia.'); return null; }
  const u1 = unit, u2 = unit+'\u00b2', u4 = unit+'\u2074';
  // Numeración corrida de figuras y tablas, como en cap9: cada lámina y cada
  // cuadro llevan su pie, y así el texto puede referirse a ellos.
  let figN = 0, tablaN = 0;
  const figCaption = txt => {
    figN++;
    return '\n\\begin{center}{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} '
         + txt + '}\\end{center}\n\\vspace{4pt}\n';
  };
  const tablaCaption = txt => {
    tablaN++;
    return '\n\\begin{center}{\\small\\color{bsaMuted}\\textbf{Tabla ' + tablaN + '.} '
         + txt + '}\\end{center}\n\\vspace{4pt}\n';
  };
  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});

  let tex = '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.2cm]{geometry}\n'
    + '\\usepackage{amsmath,amssymb}\n\\usepackage{tikz}\n'
    + '\\usetikzlibrary{patterns,arrows.meta,calc}\n\\usepackage{xcolor}\n\n'
    + '\\definecolor{bsaAcc}{HTML}{0D3A8F}\n'
    + '\\definecolor{bsaAlerta}{HTML}{B8860C}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n'
    + '\\definecolor{bsaMuted}{HTML}{6B7280}\n'
    + '\\definecolor{bsaLogoB}{HTML}{CDA953}\n'
    + '\\definecolor{bsaLogoS}{HTML}{8AB4CA}\n'
    + '\\definecolor{bsaLogoA}{HTML}{22584B}\n\n'
    + '\\definecolor{bsaAcc2}{HTML}{1D4ED8}\n'
    // Mismo rojo que usa el circulo de Mohr en pantalla, para que el angulo
    // 2*theta_p se lea igual en la app y en el PDF.
    + '\\definecolor{bsaRojo}{HTML}{C0392B}\n\n'
    // Encabezado y pie corridos en TODAS las páginas, como en cap6 y cap9: el
    // informe se imprime y se reparte suelto, así que cada hoja tiene que decir
    // de qué capítulo es. Antes usaba \\pagestyle{plain}: solo el número de
    // página, sin identificación.
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Momento de Inercia}\\hfill}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    // El seno en notación española. cap9 lo define y lo usa en el centroide del
    // sector circular; sin esta macro, ese desarrollo aborta la compilación con
    // "Undefined control sequence" y no sale ningún PDF.
    + '\\newcommand{\\sen}{\\operatorname{sen}}\n'
    + '\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\veredicto}[1]{%\n'
    + '  \\begin{center}\\fcolorbox{bsaAcc}{bsaAcc!7}{\\parbox{0.93\\textwidth}'
    +      '{\\vspace{3pt}#1\\vspace{3pt}}}\\end{center}}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\par\\addvspace{10pt}\\penalty-250\n'
    + '  \\noindent{\\large\\bfseries\\color{bsaAcc}#1}\\par\\nopagebreak\n'
    + '  \\vspace{3pt}\\nopagebreak\\hrule\\nopagebreak\\vspace{7pt}\\nopagebreak}\n\n'
    // Los huecos sobrantes se acumulan al pie de la página en vez de repartirse
    // entre los párrafos: es lo que evita las separaciones grandes a media hoja.
    + '\\raggedbottom\n\n'
    + '\\begin{document}\n\n'
    + '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Reporte de Momento de Inercia de una Secci\\\'on Compuesta}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{8pt}\n\n';

  // ── 1. Sección compuesta con cotas ──
  // Va primero, antes que cualquier número: el lector tiene que ver de qué
  // sección se está hablando antes de leer una sola tabla.
  tex += '\\seccion{1. Secci\\\'on compuesta}\n'
    + '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
    + tikzSeccionCompuesta({cotas:true})
    + '\\end{tikzpicture}\n\\end{center}\n';
  tex += figCaption('Secci\\\'on compuesta con sus figuras y cotas generales.');
  tex += '\\begin{center}\n\\begin{tabular}{@{}ll@{\\hspace{18pt}}ll@{}}\n'
    + '\\tikz{\\filldraw[fill=bsaAcc2, fill opacity=0.30, draw=bsaAcc2] (0,0) rectangle (0.35,0.22);} & '
    + '{\\footnotesize \\\'Area que suma} & '
    + '\\tikz{\\filldraw[pattern=north east lines, pattern color=bsaAcc2, draw=bsaAcc2, dashed] (0,0) rectangle (0.35,0.22);} & '
    + '{\\footnotesize \\\'Area que resta}\\\\\n'
    + '\\end{tabular}\n\\end{center}\n\\vspace{6pt}\n';

  // ── 2. Desarrollo de cada figura ──
  // Área, centroide propio, inercias propias, giro a ejes paralelos a x-y y
  // traslado de Steiner. El croquis acotado va al costado, a la misma altura,
  // dentro de una minipágina.
  tex += '\\seccion{2. Desarrollo de cada figura}\n';
  results.steps.forEach((st,i)=>{
    const f  = st.fig;
    const nom = f.etiqueta || f.name || FIG_DEFS[f.type].name;
    const fa = formulaArea(f);
    const fi = formulaInercia(f);
    const cl = centroideLocalTex(f);
    const g  = f.rotation || 0;
    const girada = Math.abs(g) >= 0.005;

    // Cada figura arranca con una regla fina y aire por arriba y por abajo: sin
    // eso los desarrollos se leen como un único bloque continuo y no se
    // distingue dónde acaba uno y empieza el siguiente.
    tex += '\\filbreak\n';
    tex += '\\noindent{\\bfseries\\color{bsaAcc} Figura ' + (i+1) + ': '
         + escLatex(nom) + '}\\ \\ {\\small\\color{bsaMuted}('
         + (f.sign > 0 ? 'se \\textbf{suma}' : 'se \\textbf{resta}') + ')}\\\\[6pt]\n';

    tex += '\\noindent\\begin{minipage}[t]{0.60\\textwidth}\n\\small\n';

    // Área
    tex += '\\textbf{\\\'Area}\n';
    tex += '\\[ ' + fa.sim + ' \\]\n';
    tex += '\\[ ' + fa.sus + ' = ' + ftex(st.a) + '\\,' + utex(u2) + ' \\]\n';

    // Centroide propio, solo si no está en el centro de la caja
    if(cl){
      tex += '\\textbf{Centroide propio}\n';
      tex += '\\[ ' + cl + ' \\]\n';
    }
    tex += '\\[ \\tilde{x}_i = ' + decP(f.cx,'len') + '\\,' + utex(u1)
         + ' \\qquad \\tilde{y}_i = ' + decP(f.cy,'len') + '\\,' + utex(u1) + ' \\]\n';

    // Inercias propias, sobre los ejes de la figura sin girar
    tex += '\\textbf{Inercias propias' + (girada ? ' (ejes de la figura)' : '') + '}\n';
    tex += '\\[ ' + fi.ix.sim + (fi.ix.sus ? ' = ' + fi.ix.sus : '')
         + ' = ' + ftex(st.Ixc0) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ ' + fi.iy.sim + (fi.iy.sus ? ' = ' + fi.iy.sus : '')
         + ' = ' + ftex(st.Iyc0) + '\\,' + utex(u4) + ' \\]\n';
    // Cuando el producto es nulo por simetría, la propia fórmula ya dice "= 0" y
    // su razón: repetir "= 0 mm^4" detrás sobraba y se leía mal.
    if(Math.abs(st.Ixyc0) < 1e-12 && fi.ixy.sus === '0'){
      tex += '\\[ ' + fi.ixy.sim + ' \\]\n';
    } else {
      tex += '\\[ ' + fi.ixy.sim + (fi.ixy.sus ? ' = ' + fi.ixy.sus : '')
           + ' = ' + ftex(st.Ixyc0) + '\\,' + utex(u4) + ' \\]\n';
    }

    // Giro a ejes paralelos a x-y
    if(girada){
      // Cuatro decimales, no los del usuario: con dos, quien quiera rehacer la
      // sustitución a mano no reproduce el resultado.
      const c2 = Math.cos(2*g*Math.PI/180).toFixed(4), s2 = Math.sin(2*g*Math.PI/180).toFixed(4);
      tex += '\\textbf{Giro a ejes paralelos a $x$ e $y$}\\\\[2pt]\n';
      tex += '{\\footnotesize La figura est\\\'a colocada girada $\\beta = ' + decP(g,'len')
           + '^\\circ$. Sus inercias propias est\\\'an referidas a los ejes de la figura, '
           + 'as\\\'i que antes de trasladarlas hay que llevarlas a ejes paralelos a los '
           + 'globales:}\n';
      tex += '\\[ \\bar{I}_{x}\' = \\dfrac{\\bar{I}_x+\\bar{I}_y}{2} + \\dfrac{\\bar{I}_x-\\bar{I}_y}{2}\\cos 2\\beta + \\bar{P}_{xy}\\sen 2\\beta \\]\n';
      tex += '\\[ \\bar{I}_{y}\' = \\dfrac{\\bar{I}_x+\\bar{I}_y}{2} - \\dfrac{\\bar{I}_x-\\bar{I}_y}{2}\\cos 2\\beta - \\bar{P}_{xy}\\sen 2\\beta \\]\n';
      tex += '\\[ \\bar{P}_{xy}\' = -\\dfrac{\\bar{I}_x-\\bar{I}_y}{2}\\sen 2\\beta + \\bar{P}_{xy}\\cos 2\\beta \\]\n';
      tex += '{\\footnotesize Con $\\cos 2\\beta = ' + c2 + '$ y $\\sen 2\\beta = ' + s2 + '$:}\n';
      tex += '\\[ \\bar{I}_{x}\' = ' + ftex(st.Ixc) + '\\,' + utex(u4)
           + ' \\qquad \\bar{I}_{y}\' = ' + ftex(st.Iyc) + '\\,' + utex(u4) + ' \\]\n';
      tex += '\\[ \\bar{P}_{xy}\' = ' + ftex(st.Ixyc) + '\\,' + utex(u4) + ' \\]\n';
    }

    // Traslado al centroide de la sección compuesta (Steiner)
    const dxS = decP(st.dx,'len'), dyS = decP(st.dy,'len');
    tex += '\\textbf{Traslado al centroide de la secci\\\'on (Steiner)}\\\\[2pt]\n';
    tex += '\\[ d_{x_i} = \\tilde{x}_i - \\bar{x} = ' + decP(f.cx,'len') + ' - ' + decP(results.xbar,'len')
         + ' = ' + dxS + '\\,' + utex(u1)
         + ' \\qquad d_{y_i} = ' + dyS + '\\,' + utex(u1) + ' \\]\n';
    // Cada línea empieza diciendo QUÉ se está calculando. Sin el símbolo a la
    // izquierda, tres paréntesis seguidos no dicen cuál es cuál.
    const marca = f.sign > 0 ? '' : '-';
    const pr = girada ? '\'' : '';
    tex += '\\[ \\bar{I}_{x_i} = ' + marca + '\\left(\\bar{I}_{x}' + pr + ' + A_i d_{y_i}^{2}\\right) = '
         + marca + '\\left(' + ftex(st.Ixc) + ' + (' + ftex(st.a) + ')(' + dyS + ')^{2}\\right) = '
         + ftex(st.Ix_f) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ \\bar{I}_{y_i} = ' + marca + '\\left(\\bar{I}_{y}' + pr + ' + A_i d_{x_i}^{2}\\right) = '
         + marca + '\\left(' + ftex(st.Iyc) + ' + (' + ftex(st.a) + ')(' + dxS + ')^{2}\\right) = '
         + ftex(st.Iy_f) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ \\bar{P}_{xy_i} = ' + marca + '\\left(\\bar{P}_{xy}' + pr + ' + A_i d_{x_i} d_{y_i}\\right) = '
         + marca + '\\left(' + ftex(st.Ixyc) + ' + (' + ftex(st.a) + ')(' + dxS + ')(' + dyS + ')\\right) = '
         + ftex(st.Ixy_f) + '\\,' + utex(u4) + ' \\]\n';

    tex += '\\end{minipage}\\hfill\n';
    tex += '\\begin{minipage}[t]{0.36\\textwidth}\n\\vspace{0pt}\n\\begin{center}\n';
    tex += tikzCroquisFigura(f, 3.6) + '\n\n\\vspace{3pt}\n';
    tex += '{\\scriptsize\\color{bsaMuted} \\textbf{Figura ' + (i+1) + '.} '
         + escLatex(nom)
         + (girada ? '\\\\ girada $\\beta=' + decP(g,'len') + '^\\circ$' : '\\\\ sin giro') + '}\n';
    tex += '\\end{center}\n\\end{minipage}\n\n\\vspace{4pt}\n';
    // Regla de cierre entre desarrollos, no de apertura: si el bloque siguiente
    // salta de página, la anterior termina con una línea y no queda cortada.
    if(i < results.steps.length-1){
      tex += '\\vspace{8pt}\\noindent\\textcolor{black!20}{\\rule{\\textwidth}{0.4pt}}\\vspace{10pt}\n\n';
    }
  });
  tex += '\\vspace{10pt}\n';

  // ── 3. Tabla resumen ──
  tex += '\\seccion{3. Tablas resumen}\n';

  // ── Tabla A · la que conduce al centroide ──
  // Solo lo que interviene en x̄ e ȳ: área, centroide propio y sus momentos
  // estáticos. La fila de totales es la que se sustituye en la sección 4.
  {
    const fA  = factorColumna(results.steps.map(s=>s.a*s.fig.sign));
    const fAX = factorColumna(results.steps.map(s=>s.a*s.fig.sign*s.fig.cx));
    const fAY = factorColumna(results.steps.map(s=>s.a*s.fig.sign*s.fig.cy));
    const cab = (t,f,u) => '\\textbf{' + t + '}' + (f.cab ? ' $' + f.cab + '$' : '')
                         + (u ? ' {\\scriptsize(' + utexto(u) + ')}' : '');
    let sQx = 0, sQy = 0;
    tex += '\\begin{center}\\small\\begin{tabular}{clcccccc}\\hline\n'
      + '\\textbf{N\\textsuperscript{o}} & \\textbf{Figura} & \\textbf{Signo} & '
      + cab('$A_i$', fA, u2) + ' & \\textbf{$\\tilde{x}_i$} {\\scriptsize(' + utexto(u1) + ')} & '
      + '\\textbf{$\\tilde{y}_i$} {\\scriptsize(' + utexto(u1) + ')} & '
      + cab('$A_i\\tilde{x}_i$', fAX, '') + ' & ' + cab('$A_i\\tilde{y}_i$', fAY, '')
      + '\\\\\\hline\n';
    results.steps.forEach((st,k)=>{
      const nom = st.fig.etiqueta || st.fig.name || FIG_DEFS[st.fig.type].name;
      const a = st.a*st.fig.sign;
      sQx += a*st.fig.cx; sQy += a*st.fig.cy;
      tex += (k+1) + ' & ' + escLatex(nom) + ' & ' + (st.fig.sign > 0 ? '$+$' : '$-$')
        + ' & ' + celdaCol(a, fA, DEC.area)
        + ' & ' + decP(st.fig.cx,'len') + ' & ' + decP(st.fig.cy,'len')
        + ' & ' + celdaCol(a*st.fig.cx, fAX, DEC.area)
        + ' & ' + celdaCol(a*st.fig.cy, fAY, DEC.area) + ' \\\\\n';
    });
    tex += '\\hline\\multicolumn{3}{l}{$\\sum$ (Total)} & '
      + celdaCol(results.A, fA, DEC.area) + ' & --- & --- & '
      + celdaCol(sQx, fAX, DEC.area) + ' & ' + celdaCol(sQy, fAY, DEC.area) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{center}\n'
      + tablaCaption('\\\'Areas y momentos est\\\'aticos. Los sumandos llevan ya el signo de '
        + 'la figura, as\\\'i que las restas entran en negativo. Las columnas con factor '
        + '$\\times 10^{n}$ lo llevan en la cabecera.');
  }

  // ── Tabla B · la que conduce a las inercias ──
  // Inercia propia ya llevada a ejes paralelos a x-y, término de Steiner y
  // aportación final de cada figura. La fila de totales alimenta la sección 5.
  {
    const fIx  = factorColumna(results.steps.map(s=>s.Ixc));
    const fIy  = factorColumna(results.steps.map(s=>s.Iyc));
    const fIxy = factorColumna(results.steps.map(s=>s.Ixyc));
    const fSx  = factorColumna(results.steps.map(s=>s.a*s.dy*s.dy));
    const fSy  = factorColumna(results.steps.map(s=>s.a*s.dx*s.dx));
    const fTx  = factorColumna(results.steps.map(s=>s.Ix_f));
    const fTy  = factorColumna(results.steps.map(s=>s.Iy_f));
    const fTxy = factorColumna(results.steps.map(s=>s.Ixy_f));
    const cab = (t,f) => '\\textbf{' + t + '}' + (f.cab ? ' {\\scriptsize$' + f.cab + '$}' : '');
    tex += '\\begin{center}\\small\\begin{tabular}{ccccccccc}\\hline\n'
      + '\\textbf{N\\textsuperscript{o}} & '
      + cab("$\\bar{I}_{x}'$", fIx) + ' & ' + cab("$\\bar{I}_{y}'$", fIy) + ' & '
      + cab("$\\bar{P}_{xy}'$", fIxy) + ' & '
      + cab('$A_i d_{y_i}^{2}$', fSx) + ' & ' + cab('$A_i d_{x_i}^{2}$', fSy) + ' & '
      + cab('$\\bar{I}_{x_i}$', fTx) + ' & ' + cab('$\\bar{I}_{y_i}$', fTy) + ' & '
      + cab('$\\bar{P}_{xy_i}$', fTxy) + '\\\\\\hline\n';
    results.steps.forEach((st,k)=>{
      tex += (k+1)
        + ' & ' + celdaCol(st.Ixc,  fIx,  DEC.iner)
        + ' & ' + celdaCol(st.Iyc,  fIy,  DEC.iner)
        + ' & ' + celdaCol(st.Ixyc, fIxy, DEC.iner)
        + ' & ' + celdaCol(st.a*st.dy*st.dy, fSx, DEC.iner)
        + ' & ' + celdaCol(st.a*st.dx*st.dx, fSy, DEC.iner)
        + ' & ' + celdaCol(st.Ix_f,  fTx,  DEC.iner)
        + ' & ' + celdaCol(st.Iy_f,  fTy,  DEC.iner)
        + ' & ' + celdaCol(st.Ixy_f, fTxy, DEC.iner) + ' \\\\\n';
    });
    tex += '\\hline\\multicolumn{6}{l}{$\\sum$ (Total)} & '
      + celdaCol(results.Ix,  fTx,  DEC.iner) + ' & '
      + celdaCol(results.Iy,  fTy,  DEC.iner) + ' & '
      + celdaCol(results.Ixy, fTxy, DEC.iner) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{center}\n'
      + tablaCaption('Inercias por figura. $\\bar{I}\'$ y $\\bar{P}\'$ son las propias ya '
        + 'giradas a ejes paralelos a $x$ e $y$; las tres \\\'ultimas columnas incluyen el '
        + 'traslado de Steiner y el signo de la figura, y su suma es la de la secci\\\'on 5. '
        + 'Unidades: ' + utexto(u4) + '.');
  }

    // ── 4. Centroide de la sección compuesta ──
  // Fórmula, sustitución con los totales de la Tabla 1 y resultado. Sin la
  // sustitución el lector no puede enlazar la tabla con el número final.
  {
    let sQx = 0, sQy = 0;
    results.steps.forEach(st=>{ const a = st.a*st.fig.sign;
      sQx += a*st.fig.cx; sQy += a*st.fig.cy; });
    tex += '\\seccion{4. Centroide de la secci\\\'on compuesta}\n'
      + 'Con los totales de la Tabla 1:\n'
      + '\\[ A = \\sum A_i = ' + ftex(results.A) + '\\,' + utex(u2) + ' \\]\n'
      + '\\[ \\bar{x} = \\dfrac{\\sum A_i \\tilde{x}_i}{\\sum A_i} = \\dfrac{'
      + ftex(sQx) + '}{' + ftex(results.A) + '} = ' + decP(results.xbar,'len') + '\\,' + utex(u1) + ' \\]\n'
      + '\\[ \\bar{y} = \\dfrac{\\sum A_i \\tilde{y}_i}{\\sum A_i} = \\dfrac{'
      + ftex(sQy) + '}{' + ftex(results.A) + '} = ' + decP(results.ybar,'len') + '\\,' + utex(u1) + ' \\]\n'
      + '\\veredicto{El centroide de la secci\\\'on compuesta est\\\'a en '
      + '$C\\,(' + decP(results.xbar,'len') + '\\,;\\,' + decP(results.ybar,'len') + ')\\,'
      + utex(u1) + '$. Todas las inercias que siguen est\\\'an referidas a los ejes '
      + '$x$ e $y$ que pasan por ese punto.}\n';
  }

  // ── 5. Momentos de inercia centroidales ──
  // Las tres magnitudes con el mismo tratamiento: fórmula general, suma de las
  // dos partes (propia y traslado) y resultado. El producto de inercia va en pie
  // de igualdad con Ix e Iy, no como apéndice: es el que decide los ejes
  // principales de la sección siguiente.
  {
    let sPropIx = 0, sPropIy = 0, sPropIxy = 0;
    let sStIx = 0, sStIy = 0, sStIxy = 0;
    results.steps.forEach(st=>{
      const g = st.fig.sign;
      sPropIx  += g*st.Ixc;            sStIx  += g*st.a*st.dy*st.dy;
      sPropIy  += g*st.Iyc;            sStIy  += g*st.a*st.dx*st.dx;
      sPropIxy += g*st.Ixyc;           sStIxy += g*st.a*st.dx*st.dy;
    });
    tex += '\\seccion{5. Momentos de inercia de la secci\\\'on compuesta}\n'
      + 'Cada figura aporta su inercia propia (ya girada a ejes paralelos a $x$ e $y$) '
      + 'm\\\'as el t\\\'ermino de traslaci\\\'on de Steiner. Los sumandos salen de la Tabla 2:\n';

    tex += '\\[ \\bar{I}_x = \\sum \\left(\\bar{I}_{x}\' + A_i\\,d_{y_i}^{2}\\right) = '
      + ftex(sPropIx) + ' + ' + ftex(sStIx) + ' = ' + ftex(results.Ix) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ \\bar{I}_y = \\sum \\left(\\bar{I}_{y}\' + A_i\\,d_{x_i}^{2}\\right) = '
      + ftex(sPropIy) + ' + ' + ftex(sStIy) + ' = ' + ftex(results.Iy) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ \\bar{P}_{xy} = \\sum \\left(\\bar{P}_{xy}\' + A_i\\,d_{x_i}d_{y_i}\\right) = '
      + ftex(sPropIxy) + ' + ' + ftex(sStIxy) + ' = ' + ftex(results.Ixy) + '\\,' + utex(u4) + ' \\]\n';

    tex += '\\vspace{2pt}\\noindent Momento polar y radios de giro:\n';
    tex += '\\[ J_O = \\bar{I}_x + \\bar{I}_y = ' + ftex(results.Ix) + ' + ' + ftex(results.Iy)
      + ' = ' + ftex(results.Jo) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ k_x = \\sqrt{\\dfrac{\\bar{I}_x}{A}} = \\sqrt{\\dfrac{' + ftex(results.Ix) + '}{'
      + ftex(results.A) + '}} = ' + decP(results.kx,'len') + '\\,' + utex(u1)
      + ' \\qquad k_y = \\sqrt{\\dfrac{\\bar{I}_y}{A}} = \\sqrt{\\dfrac{' + ftex(results.Iy) + '}{'
      + ftex(results.A) + '}} = ' + decP(results.ky,'len') + '\\,' + utex(u1) + ' \\]\n';

    // El signo del producto de inercia no es un detalle: dice hacia dónde se
    // inclinan los ejes principales, y conviene decirlo con palabras.
    const pxy = results.Ixy;
    const lectura = (Math.abs(pxy) < 1e-9)
      ? 'El producto de inercia es nulo, as\\\'i que los ejes $x$ e $y$ que pasan por el '
        + 'centroide ya son los ejes principales de la secci\\\'on.'
      : 'El producto de inercia ' + (pxy > 0 ? 'es positivo' : 'es negativo')
        + ', de modo que los ejes $x$ e $y$ NO son principales: existe un giro '
        + '$\\theta_p$ que los anula, y es el que se calcula a continuaci\\\'on.';
    tex += '\\veredicto{' + lectura + '}\n';
  }

  // ── 4. Ejes principales y circulo de Mohr ──
  // El centro y el radio se calculan aqui con las MISMAS expresiones que usa
  // tikzMohr para situar los puntos. Si alguna vez divergieran, el texto
  // describiria un circulo distinto del dibujado justo debajo.
  const mAvg = (results.Ix + results.Iy) / 2;
  const mR   = Math.sqrt(Math.pow((results.Ix - results.Iy) / 2, 2)
                         + results.Ixy * results.Ixy);

  tex += '\\seccion{6. Ejes principales de inercia y c\\\'irculo de Mohr}\n'
    + '\\[ \\tan 2\\theta_p = \\dfrac{-2\\bar{P}_{xy}}{\\bar{I}_x - \\bar{I}_y} '
    + '\\quad\\Longrightarrow\\quad \\theta_p = ' + decP(results.thetaP,'ang') + '^\\circ \\]\n'
    // ftex, no decP: decP imprime 5152127336.7177 mientras el resto de la
    // seccion usa notacion cientifica. Dos formatos para la misma magnitud
    // en el mismo parrafo obligan al lector a traducir mentalmente.
    + '\\[ I_{max} = ' + ftex(results.Imax) + '\\,' + utex(u4)
    + ' \\qquad I_{min} = ' + ftex(results.Imin) + '\\,' + utex(u4) + ' \\]\n';

  // ── Construccion del circulo, paso a paso ──
  tex += '\\vspace{4pt}\\noindent El c\\\'irculo de Mohr reune estos tres resultados en '
    + 'un solo dibujo. Se construye con dos datos: su centro, que est\\\'a sobre el eje '
    + 'de momentos de inercia, y su radio.\n';
  tex += '\\[ \\bar{I}_{avg} = \\dfrac{\\bar{I}_x + \\bar{I}_y}{2} = \\dfrac{'
    + ftex(results.Ix) + ' + ' + ftex(results.Iy) + '}{2} = ' + ftex(mAvg)
    + '\\,' + utex(u4) + ' \\]\n';
  tex += '\\[ R = \\sqrt{\\left(\\dfrac{\\bar{I}_x - \\bar{I}_y}{2}\\right)^{2} '
    + '+ \\bar{P}_{xy}^{\\,2}} = \\sqrt{\\left(' + ftex((results.Ix - results.Iy) / 2)
    + '\\right)^{2} + \\left(' + ftex(results.Ixy) + '\\right)^{2}} = ' + ftex(mR)
    + '\\,' + utex(u4) + ' \\]\n';
  tex += '\\vspace{2pt}\\noindent Cada eje de la secci\\\'on es un punto del c\\\'irculo. '
    + 'El eje $x$ da el punto $A(\\bar{I}_x,\\ \\bar{P}_{xy})$ y el eje $y$ da '
    + '$B(\\bar{I}_y,\\ -\\bar{P}_{xy})$; al llevar signos opuestos en la ordenada, '
    + '$A$ y $B$ quedan diametralmente opuestos y el centro del c\\\'irculo cae '
    + 'justo en $\\bar{I}_{avg}$. Los cortes con el eje horizontal son '
    + '$I_{max} = \\bar{I}_{avg} + R$ e $I_{min} = \\bar{I}_{avg} - R$, donde el '
    + 'producto de inercia se anula.\n';
  tex += '\\[ A(' + ftex(results.Ix) + ',\\ ' + ftex(results.Ixy) + ') \\qquad '
    + 'B(' + ftex(results.Iy) + ',\\ ' + ftex(-results.Ixy) + ') \\]\n';

  // ── Lamina TikZ ──
  // Si el circulo degenera en un punto, tikzMohr devuelve cadena vacia: se
  // emite el parrafo explicativo en su lugar y NO un tikzpicture vacio, que
  // saldria como un hueco sin sentido en el PDF.
  const laminaMohr = (typeof tikzMohr === 'function') ? tikzMohr(results, u4) : '';
  if(laminaMohr){
    tex += '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
      + laminaMohr
      + '\\end{tikzpicture}\n\\end{center}\n';
    tex += figCaption('C\\\'irculo de Mohr de inercia. El giro $2\\theta_p$ medido sobre '
      + 'el c\\\'irculo corresponde a un giro $\\theta_p$ de los ejes en la secci\\\'on.');
  } else {
    tex += '\\vspace{2pt}\\noindent El c\\\'irculo se reduce a un punto: '
      + '$\\bar{I}_x = \\bar{I}_y$ y $\\bar{P}_{xy} = 0$. La inercia vale lo mismo '
      + 'respecto de cualquier eje que pase por el centroide, de modo que no hay '
      + 'una direcci\\\'on principal privilegiada y no hay c\\\'irculo que dibujar.\n';
  }

  // ── Veredicto ──
  const yaPrinc = Math.abs(results.Ixy) < 1e-9;
  tex += '\\veredicto{' + (yaPrinc
    ? 'El producto de inercia es nulo: los ejes $x$ e $y$ centroidales YA son los '
      + 'ejes principales ($\\theta_p = 0^\\circ$). En el c\\\'irculo, $A$ y $B$ caen '
      + 'sobre el eje horizontal, que es donde el producto de inercia se anula.'
    : 'Los ejes principales pasan por el centroide y est\\\'an girados $'
      + decP(results.thetaP,'ang') + '^\\circ$ respecto a los ejes $x$ e $y$. '
      + 'Sobre ellos el producto de inercia se anula, y la inercia alcanza su valor '
      + 'm\\\'aximo y m\\\'inimo. En el c\\\'irculo ese giro se lee duplicado: '
      + '$2\\theta_p = ' + decP(2 * results.thetaP,'ang') + '^\\circ$.')
    + '}\n\n';

  // ── 5. Ejes principales sobre la seccion ──
  // La lamina repite la seccion, esta vez SIN la cadena de cotas: lo unico
  // acotado es el centroide, y como variables. Los valores van justo debajo,
  // que es donde se pueden escribir con su notacion x10^n sin pisar el dibujo.
  tex += '\\seccion{7. Ejes principales sobre la secci\\\'on}\n'
    + '\\noindent Los ejes $u$ y $v$ pasan por el centroide $C$ y est\\\'an girados '
    + '$\\theta_p$ respecto de $x$ e $y$. Sobre $u$ la inercia es m\\\'axima, '
    + 'sobre $v$ m\\\'inima, y el producto de inercia se anula en ambos.\n'
    + '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
    + tikzSeccionCompuesta({cotas:false, ejes:true, cotasC:true, ejesPrincipales:true})
    + '\\end{tikzpicture}\n\\end{center}\n';
  tex += figCaption('Secci\\\'on compuesta con los ejes centroidales $x$-$y$ y los ejes '
    + 'principales $u$-$v$ girados $\\theta_p$.');
  tex += '\\[ \\bar{x}_C = ' + decP(results.xbar,'len') + '\\,' + utex(u1)
    + ' \\qquad \\bar{y}_C = ' + decP(results.ybar,'len') + '\\,' + utex(u1)
    + ' \\qquad \\theta_p = ' + decP(results.thetaP,'ang') + '^\\circ \\]\n';
  tex += '\\[ I_{max} = ' + ftex(results.Imax) + '\\,' + utex(u4)
    + ' \\qquad I_{min} = ' + ftex(results.Imin) + '\\,' + utex(u4) + ' \\]\n';
  tex += '\\veredicto{' + (Math.abs(results.thetaP) < 0.005
    ? 'El giro es nulo: los ejes $x$ e $y$ ya coinciden con los principales, '
      + 'de modo que $u \\equiv x$ y $v \\equiv y$.'
    : 'Un giro de $' + decP(results.thetaP,'ang') + '^\\circ$ '
      + (results.thetaP > 0 ? 'en sentido antihorario' : 'en sentido horario')
      + ' lleva los ejes $x$-$y$ sobre los ejes principales $u$-$v$.')
    + '}\n\n';

  // ── 6. Inercia en un punto P (solo si el usuario lo pidio) ──
  // Toda esta seccion es condicional: sin punto insertado no se imprime nada,
  // ni el titulo. Un apartado vacio en un informe docente se lee como un fallo
  // del programa, no como "no habia datos".
  const epLat = (typeof computeExtraPoint === 'function') ? computeExtraPoint(results) : null;
  if(epLat){
    tex += '\\seccion{8. Inercia en el punto $P$}\n'
      + '\\noindent Las inercias calculadas hasta aqu\\\'i son centroidales. Para '
      + 'referirlas a un punto cualquiera $P$ se aplica el teorema de los ejes '
      + 'paralelos, con $d_x$ y $d_y$ medidos DEL PUNTO AL CENTROIDE.\n';
    tex += '\\[ P\\left(' + decP(epLat.x,'len') + ',\\ ' + decP(epLat.y,'len') + '\\right)'
      + '\\,' + utex(u1) + ' \\]\n';
    tex += '\\[ d_x = \\bar{x}_C - x_P = ' + decP(results.xbar,'len') + ' - ' + decP(epLat.x,'len')
      + ' = ' + decP(epLat.dx,'len') + '\\,' + utex(u1)
      + ' \\qquad d_y = \\bar{y}_C - y_P = ' + decP(results.ybar,'len') + ' - ' + decP(epLat.y,'len')
      + ' = ' + decP(epLat.dy,'len') + '\\,' + utex(u1) + ' \\]\n';
    tex += '\\[ I_{xP} = \\bar{I}_x + A\\,d_y^{2} = ' + ftex(results.Ix) + ' + '
      + ftex(results.A) + '\\cdot\\left(' + decP(epLat.dy,'len') + '\\right)^{2} = '
      + ftex(epLat.IxP) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ I_{yP} = \\bar{I}_y + A\\,d_x^{2} = ' + ftex(results.Iy) + ' + '
      + ftex(results.A) + '\\cdot\\left(' + decP(epLat.dx,'len') + '\\right)^{2} = '
      + ftex(epLat.IyP) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ P_{xyP} = \\bar{P}_{xy} + A\\,d_x d_y = ' + ftex(results.Ixy) + ' + '
      + ftex(results.A) + '\\cdot\\left(' + decP(epLat.dx,'len') + '\\right)\\left('
      + decP(epLat.dy,'len') + '\\right) = ' + ftex(epLat.IxyP) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\veredicto{Los t\\\'erminos de Steiner son siempre positivos para $I_x$ e '
      + '$I_y$, de modo que la inercia respecto de $P$ no puede ser menor que la '
      + 'centroidal. El producto $P_{xy}$ s\\\'i cambia de signo seg\\\'un el cuadrante '
      + 'en que caiga $P$ respecto de $C$.}\n\n';

    // ── circulo de Mohr en P ──
    const avgP = (epLat.IxP + epLat.IyP) / 2;
    tex += '\\noindent Con estas tres inercias se arma el c\\\'irculo de Mohr en $P$, '
      + 'igual que en la secci\\\'on 6 pero partiendo de $I_{xP}$, $I_{yP}$ y $P_{xyP}$.\n';
    tex += '\\[ I_{avgP} = \\dfrac{I_{xP} + I_{yP}}{2} = ' + ftex(avgP) + '\\,' + utex(u4)
      + ' \\qquad R_P = \\sqrt{\\left(\\dfrac{I_{xP} - I_{yP}}{2}\\right)^{2} + P_{xyP}^{\\,2}} = '
      + ftex(epLat.R) + '\\,' + utex(u4) + ' \\]\n';
    tex += '\\[ \\theta_{pP} = ' + decP(epLat.thetaP,'ang') + '^\\circ \\qquad '
      + 'I_{maxP} = ' + ftex(epLat.Imax) + '\\,' + utex(u4) + ' \\qquad '
      + 'I_{minP} = ' + ftex(epLat.Imin) + '\\,' + utex(u4) + ' \\]\n';

    // ── 7. Rotacion de los ejes en P (solo si el usuario dio un angulo) ──
    // El circulo se dibuja UNA sola vez. Si hay rotacion, la lamina se aplaza
    // al final de la seccion 9 y lleva encima los puntos U y V: son el mismo
    // diametro girado, no un circulo nuevo. Dibujarla antes obligaria a
    // remitir a una figura que aun no se ha explicado.
    const rotLat = epLat.rot;
    if(rotLat){
      tex += '\\seccion{9. Rotaci\\\'on de los ejes en el punto $P$}\n'
        + '\\noindent Los ejes $x$-$y$ en $P$ se giran un \\\'angulo $\\theta = '
        + decP(rotLat.ang,'ang') + '^\\circ$ (positivo en sentido antihorario). '
        + 'Las inercias respecto de los nuevos ejes $u$-$v$ salen de las '
        + 'ecuaciones de transformaci\\\'on.\n';
      const c2 = rotLat.c2, s2 = rotLat.s2;
      const difP = (epLat.IxP - epLat.IyP) / 2;
      tex += '\\[ I_u = \\dfrac{I_{xP}+I_{yP}}{2} + \\dfrac{I_{xP}-I_{yP}}{2}\\cos 2\\theta '
        + '- P_{xyP}\\,\\operatorname{sen} 2\\theta = ' + ftex(rotLat.Iu) + '\\,' + utex(u4) + ' \\]\n';
      tex += '\\[ I_v = \\dfrac{I_{xP}+I_{yP}}{2} - \\dfrac{I_{xP}-I_{yP}}{2}\\cos 2\\theta '
        + '+ P_{xyP}\\,\\operatorname{sen} 2\\theta = ' + ftex(rotLat.Iv) + '\\,' + utex(u4) + ' \\]\n';
      tex += '\\[ P_{uv} = \\dfrac{I_{xP}-I_{yP}}{2}\\operatorname{sen} 2\\theta '
        + '+ P_{xyP}\\cos 2\\theta = ' + ftex(rotLat.Iuv) + '\\,' + utex(u4) + ' \\]\n';
      tex += '\\vspace{2pt}\\noindent Sustituyendo, con $2\\theta = '
        + decP(2*rotLat.ang,'ang') + '^\\circ$, $\\cos 2\\theta = ' + decP(c2,'ang')
        + '$ y $\\operatorname{sen} 2\\theta = ' + decP(s2,'ang') + '$:\n';
      tex += '\\[ I_u = ' + ftex((epLat.IxP+epLat.IyP)/2) + ' + ' + ftex(difP)
        + '\\cdot(' + decP(c2,'ang') + ') - ' + ftex(epLat.IxyP) + '\\cdot('
        + decP(s2,'ang') + ') = ' + ftex(rotLat.Iu) + '\\,' + utex(u4) + ' \\]\n';
      tex += '\\veredicto{La suma $I_u + I_v = ' + ftex(rotLat.Iu + rotLat.Iv)
        + '\\,' + utex(u4) + '$ es la misma que $I_{xP} + I_{yP}$: girar los ejes '
        + 'reparte la inercia entre ellos, pero no la crea ni la destruye. Por eso '
        + '$U$ y $V$ caen sobre el mismo c\\\'irculo, en un di\\\'ametro girado $2\\theta$.'
        + (rotLat.swapped ? ' Con $\\theta = 90^\\circ$ los ejes quedan simplemente '
            + 'intercambiados: $I_u \\equiv I_{yP}$.' : '') + '}\n\n';
    }

    const laminaP = (typeof tikzMohr === 'function')
      ? tikzMohr({Ix: epLat.IxP, Iy: epLat.IyP, Ixy: epLat.IxyP}, u4,
                 rotLat ? {sub:'P', rot:rotLat} : {sub:'P'}) : '';
    if(laminaP){
      tex += '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
        + laminaP + '\\end{tikzpicture}\n\\end{center}\n';
      tex += figCaption(rotLat
        ? 'C\\\'irculo de Mohr en el punto $P$. $A$ y $B$ son los ejes $x$-$y$; '
          + '$U$ y $V$, los mismos ejes girados $\\theta = ' + decP(rotLat.ang,'ang')
          + '^\\circ$, que sobre el c\\\'irculo se mide duplicado.'
        : 'C\\\'irculo de Mohr de inercia en el punto $P$.');
    } else {
      tex += '\\vspace{2pt}\\noindent En $P$ el c\\\'irculo se reduce a un punto: '
        + '$I_{xP} = I_{yP}$ y $P_{xyP} = 0$, as\\\'i que cualquier eje por $P$ es principal.\n';
    }

    // ── 8. Lamina final: la seccion con el punto insertado ──
    tex += '\\seccion{10. Secci\\\'on con el punto $P$ y sus ejes}\n'
      + '\\noindent \\\'Ultima l\\\'amina: la misma secci\\\'on, acotada solo respecto '
      + 'del punto $P$, con sus ejes principales $u_P$-$v_P$ girados $\\theta_{pP} = '
      + decP(epLat.thetaP,'ang') + '^\\circ$'
      + (rotLat
         ? ', y encima los ejes $u$-$v$ que giran $\\theta = ' + decP(rotLat.ang,'ang')
           + '^\\circ$. Los principales son la referencia contra la que se lee ese giro.'
         : '.')
      + '\n'
      + '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
      + tikzSeccionCompuesta({cotas:false, ejes:true, cotasC:false, puntoP:true})
      + '\\end{tikzpicture}\n\\end{center}\n';
    tex += figCaption(rotLat
      ? 'Secci\\\'on con el punto $P$ acotado. En verde, sus ejes principales '
        + '$u_P$-$v_P$; en azul, los ejes girados $\\theta$ por el usuario.'
      : 'Secci\\\'on con el punto $P$ acotado y sus ejes principales $u_P$-$v_P$.');
    tex += '\\[ x_P = ' + decP(epLat.x,'len') + '\\,' + utex(u1)
      + ' \\qquad y_P = ' + decP(epLat.y,'len') + '\\,' + utex(u1)
      + ' \\qquad \\theta_{pP} = ' + decP(epLat.thetaP,'ang') + '^\\circ'
      + (rotLat ? ' \\qquad \\theta = ' + decP(rotLat.ang,'ang') + '^\\circ' : '') + ' \\]\n\n';
  }

  // ── Cierre con la marca BSA ──
  tex += '\\vspace{18pt}\\hrule\\vspace{14pt}\n\\begin{center}\n'
    + '{\\small\\color{bsaMuted}\\textbf{BEAM \\& SECTION ANALYSIS (BSA)}}\\\\[8pt]\n'
    + '\\begin{tikzpicture}[baseline]\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoB] at (0,0) {B};\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoS] at (0.47,0) {S};\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoA] at (0.96,0) {A};\n'
    + '\\end{tikzpicture}\\\\[7pt]\n'
    + '{\\footnotesize\\color{bsaMuted}Creado por \\textbf{Luis Alejandro Baz\\\'an Campos}}\\\\[2pt]\n'
    + '{\\scriptsize\\color{bsaMuted}beamsectionanalysis.com}\n\\end{center}\n\n'
    + '\\end{document}\n';
  return tex;
}
