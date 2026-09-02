function construirLatex(){
  if(!resultado || resultado.error){ aviso('Primero resuelve la armadura sin errores.'); return null; }
  const uL = unitLen, uF = unitFor;
  const capT = parseFloat(document.getElementById('capT') ? document.getElementById('capT').value : NaN);
  const capC = parseFloat(document.getElementById('capC') ? document.getElementById('capC').value : NaN);
  const hayCap = isFinite(capT) && isFinite(capC) && capT > 0 && capC > 0;

  // ── Numeración correlativa de figuras y tablas, estilo libro ──
  // IMPORTANTE: figCaption()/tablaCaption() y los contadores manuales de
  // figN deben invocarse en el MISMO ORDEN en que el texto final aparece en
  // el documento (no en el orden en que JS calcula cada bloque). Por eso
  // esta función arma "tex" de forma incremental, sección por sección, en
  // vez de precalcular todo y unirlo al final.
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
  const j = nodos.length, m = barras.length, r = Object.keys(resultado.reacciones)
    .reduce((s,id)=> s + (resultado.reacciones[id].rx !== undefined ? 2 : 1), 0);
  const veredicto = (m + r === 2*j)
    ? '\\textbf{Armadura isost\\\'atica.} El n\\\'umero de inc\\\'ognitas coincide con el de ecuaciones de equilibrio disponibles.'
    : ((m + r < 2*j)
        ? '\\textbf{Armadura inestable.} Faltan restricciones o barras: hay menos inc\\\'ognitas que ecuaciones.'
        : '\\textbf{Armadura hiperest\\\'atica.} Hay m\\\'as inc\\\'ognitas que ecuaciones; se necesitan m\\\'etodos adicionales.');
  const check = (m + r === 2*j) ? '\\;\\checkmark' : '';

  // El encabezado de página debe nombrar el método realmente usado, no
  // "método de nudos" fijo: la app puede estar en método de secciones.
  const usaSecciones = (typeof metodo !== 'undefined') && metodo === 'secciones';
  const nombreMetodo = !usaSecciones
    ? 'M\\\'etodo de nudos'
    : (modoCorte === 'auto' ? 'M\\\'etodo de secciones (autom\\\'atico)'
                            : 'M\\\'etodo de secciones (corte manual)');

  const preambulo = '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n'
    + '\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.2cm]{geometry}\n'
    + '\\usepackage{amsmath,amssymb}\n'
    + '\\usepackage{tikz}\n'
    + '\\usetikzlibrary{arrows.meta,calc}\n'
    + '\\usepackage{xcolor}\n\n'
    + '\\definecolor{bsaAcc}{HTML}{B45309}\n'
    + '\\definecolor{bsaAcc2}{HTML}{1D4ED8}\n'
    + '\\definecolor{bsaRoj}{HTML}{B3261E}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n'
    + '\\definecolor{bsaAlerta}{HTML}{DB2777}\n'
    + '\\definecolor{bsaMuted}{HTML}{6B7280}\n'
    + '\\definecolor{bsaLogoB}{HTML}{CDA953}\n'
    + '\\definecolor{bsaLogoS}{HTML}{8AB4CA}\n'
    + '\\definecolor{bsaLogoA}{HTML}{22584B}\n\n'
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- An\\\'alisis de Armaduras}\\hfill}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    + '\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\veredicto}[1]{%\n'
    + '  \\begin{center}\n'
    + '  \\fcolorbox{bsaAcc}{bsaAcc!7}{%\n'
    + '    \\parbox{0.93\\textwidth}{\\vspace{3pt}#1\\vspace{3pt}}}\n'
    + '  \\end{center}}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\vspace{10pt}{\\large\\bfseries\\color{bsaAcc}#1}\\par\\vspace{3pt}\\hrule\\vspace{7pt}}\n\n'
    + '\\begin{document}\n\n';

  let tex = preambulo;
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Reporte de An\\\'alisis de Armadura}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{8pt}\n\n';

  // ── 1. Geometría ──
  tex += '\\seccion{1. Geometr\\\'ia}\n'
    + '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
    + tikzArmaduraCompleta({cotas:true, valores:false}) + '\\end{tikzpicture}\n\\end{center}\n';
  tex += figCaption('Diagrama de cuerpo libre (DCL) general de la armadura, con apoyos, cargas aplicadas y cotas.');
  tex += '\\begin{center}\n'
    + '\\begin{tabular}{@{}ll@{\\hspace{18pt}}ll@{}}\n'
    + '\\textcolor{bsaAcc2}{\\rule[0.06cm]{0.45cm}{1.6pt}} & {\\footnotesize Tracci\\\'on} & '
    + '\\textcolor{bsaRoj}{\\rule[0.06cm]{0.45cm}{1.6pt}} & {\\footnotesize Compresi\\\'on} \\\\[3pt]\n'
    + '\\textcolor{bsaAcc}{\\rule[0.06cm]{0.45cm}{1.6pt}} & {\\footnotesize Apoyos y cargas aplicadas} & '
    + '\\textcolor{bsaVerde}{\\rule[0.06cm]{0.45cm}{1.6pt}} & {\\footnotesize Reacciones (DCL de nudo, Secc.\\ 4)} \\\\[3pt]\n'
    + '\\textcolor{bsaAlerta}{\\rule[0.06cm]{0.45cm}{2.4pt}} & {\\footnotesize Barra sobreesforzada (Secc.\\ 7)} & & \\\\\n'
    + '\\end{tabular}\n'
    + '\\end{center}\n\\vspace{6pt}\n';

  // ── 2. Determinación estática ──
  tex += '\\seccion{2. Determinaci\\\'on est\\\'atica}\n'
    + '\\[\n  m + r = 2j \\qquad\\Longrightarrow\\qquad ' + m + ' + ' + r + ' = 2(' + j + ') '
    + '\\qquad\\Longrightarrow\\qquad ' + (m+r) + ' = ' + (2*j) + check + '\n\\]\n'
    + '\\veredicto{' + veredicto + '}\n\n';

  // ── 3. Reacciones: derivación + tabla ──
  const pines = nodos.filter(n=>n.apoyo==='fijo');
  const rodillos = nodos.filter(n=>n.apoyo==='movil');
  let derivacionReacciones = '';
  if(pines.length===1 && rodillos.length===1){
    const P = pines[0], Rn = rodillos[0];
    const dir = (Rn.apAng===0) ? {x:1,y:0} : {x:0,y:1};
    const nombreReac = (Rn.apAng===0) ? ('R_{x' + escLatex(Rn.nombre) + '}') : ('R_{y' + escLatex(Rn.nombre) + '}');
    let terminos = [], sumaC = 0;
    nodos.forEach(n=>{
      if(!esCero(n.fy)){
        const brazo = n.x - P.x;
        sumaC += n.fy*brazo;
        if(Math.abs(brazo) > 1e-9) terminos.push(fmtNum(n.fy) + '(' + dec(brazo,'f') + ')');
      }
      if(!esCero(n.fx)){
        const brazo = -(n.y - P.y);
        sumaC += n.fx*brazo;
        if(Math.abs(brazo) > 1e-9) terminos.push(fmtNum(n.fx) + '(' + dec(brazo,'f') + ')');
      }
    });
    const coefR = (Rn.x-P.x)*dir.y - (Rn.y-P.y)*dir.x;
    const X = Math.abs(coefR) > 1e-9 ? -sumaC/coefR : 0;
    const ladoIzq = (terminos.join(' + ').replace(/\+ -/g,'- ') || '0') + ' + ' + fmtCoef(coefR) + nombreReac;
    derivacionReacciones += '\\textbf{Momento respecto de ' + escLatex(P.nombre) + '} (giro antihorario positivo):\\\\[2pt]\n'
      + '\\[ \\sum M_{' + escLatex(P.nombre) + '} = 0:\\quad ' + ladoIzq + ' = 0 \\]\n'
      + '\\[ \\Rightarrow\\quad ' + nombreReac + ' = ' + dec(X,'f') + '\\;' + uF + ' \\]\n';

    const sumFx = nodos.reduce((s,n)=>s+(n.fx||0),0), sumFy = nodos.reduce((s,n)=>s+(n.fy||0),0);
    const Ay = dir.y!==0 ? -(sumFy + X*dir.y) : -sumFy;
    const Ax = dir.x!==0 ? -(sumFx + X*dir.x) : -sumFx;
    derivacionReacciones += '\\textbf{Equilibrio vertical}:\\\\[2pt]\n'
      + '\\[ \\sum F_y = 0:\\quad A_y + ' + fmtNum(dir.y!==0?X*dir.y:0) + ' + ' + fmtNum(sumFy) + ' = 0'
      + ' \\;\\Rightarrow\\; A_y = ' + dec(Ay,'f') + '\\;' + uF + ' \\]\n'
      + '\\textbf{Equilibrio horizontal}:\\\\[2pt]\n'
      + '\\[ \\sum F_x = 0:\\quad A_x + ' + fmtNum(dir.x!==0?X*dir.x:0) + ' + ' + fmtNum(sumFx) + ' = 0'
      + ' \\;\\Rightarrow\\; A_x = ' + dec(Ax,'f') + '\\;' + uF + ' \\]\n';
  } else {
    derivacionReacciones = '{\\small\\color{bsaMuted}Esta configuraci\\\'on de apoyos tiene m\\\'as de un pasador o '
      + 'rodillo; las reacciones se obtuvieron resolviendo el sistema de equilibrio global completo en vez '
      + 'de una derivaci\\\'on en un solo paso.}\\\\[6pt]\n';
  }
  let filasReac = '';
  Object.keys(resultado.reacciones).forEach(id=>{
    const n = nodos.find(z=>z.id===parseInt(id,10));
    const rc = resultado.reacciones[id];
    filasReac += escLatex(n.nombre) + ' & ' + (rc.rx !== undefined ? dec(rc.rx,'f') : '---') + ' & '
      + (rc.ry !== undefined ? dec(rc.ry,'f') : '---') + ' & ' + (n.apoyo === 'fijo' ? 'Fijo (pasador)' : 'M\\\'ovil (rodillo)') + ' \\\\\n';
  });
  tex += '\\seccion{3. Reacciones en los apoyos}\n' + derivacionReacciones + '\n'
    + '\\begin{center}\n\\begin{tabular}{lccl}\n\\hline\n'
    + '\\textbf{Apoyo} & $R_x$ (' + uF + ') & $R_y$ (' + uF + ') & Tipo\\\\\n\\hline\n'
    + filasReac + '\\hline\n\\end{tabular}\n\\end{center}\n'
    + tablaCaption('Reacciones resueltas en cada apoyo.');

  // ── 4. Desarrollo por nudos o por secciones, según el método activo ──
  // La app permite resolver por método de nudos O por método de secciones
  // (corte automático o manual); el PDF debe mostrar el mismo que está
  // seleccionado en pantalla, no siempre nudos.
  // usaSecciones ya se calculó arriba, junto al encabezado de página.

  if(!usaSecciones){
    tex += '\\seccion{4. M\\\'etodo de nudos, paso a paso}\n'
      + '\\noindent Los nudos se recorren de modo que en cada uno queden como m\\\'aximo dos '
      + 'inc\\\'ognitas, porque en cada nudo solo hay dos ecuaciones: $\\sum F_x = 0$ y $\\sum F_y = 0$.\\\\[8pt]\n\n';
    const orden = ordenNudos();
    orden.forEach((paso, i)=>{
      const n = paso.nodo;
      const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
      let textoIzq = '\\textbf{Nudo ' + (i+1) + ': ' + escLatex(n.nombre) + '} \\hfill '
        + '{\\small\\color{bsaMuted}' + conec.length + ' barra(s)'
        + (paso.nuevas.length ? ', ' + paso.nuevas.length + ' inc\\\'ognita(s) en este paso' : ' \\textperiodcentered\\ comprobaci\\\'on')
        + '}\\\\[3pt]\n';

      let exFx = [], exFy = [];
      conec.forEach(b=>{
        const o = nodos.find(z=>z.id === (b.a===n.id ? b.b : b.a));
        const dx = o.x-n.x, dy = o.y-n.y, L = Math.hypot(dx,dy);
        const cx = dx/L, cy = dy/L;
        const nb = nombreBarra(b);
        if(Math.abs(cx) > 1e-9) exFx.push(fmtCoef(cx) + 'F_{'+nb+'}');
        if(Math.abs(cy) > 1e-9) exFy.push(fmtCoef(cy) + 'F_{'+nb+'}');
      });
      const R = resultado.reacciones[n.id];
      if(R && R.rx !== undefined) exFx.push('R_{x' + escLatex(n.nombre) + '}');
      if(R && R.ry !== undefined) exFy.push('R_{y' + escLatex(n.nombre) + '}');
      if(!esCero(n.fx)) exFx.push(fmtNum(n.fx));
      if(!esCero(n.fy)) exFy.push(fmtNum(n.fy));

      textoIzq += '\\begin{footnotesize}\n'
        + '\\[ \\textstyle\\sum F_x = 0:\\quad ' + (exFx.join(' + ').replace(/\+ -/g,'- ') || '0') + ' = 0 \\]\n'
        + '\\[ \\textstyle\\sum F_y = 0:\\quad ' + (exFy.join(' + ').replace(/\+ -/g,'- ') || '0') + ' = 0 \\]\n'
        + '\\end{footnotesize}\n';

      if(paso.nuevas.length){
        paso.nuevas.forEach(bid=>{
          const b = barras.find(x=>x.id===bid);
          const val = resultado.fuerzas[bid];
          const tipo = esCero(val) ? '\\text{(fuerza cero)}'
                     : (val > 0 ? '\\text{(tracci\\\'on)}' : '\\text{(compresi\\\'on)}');
          textoIzq += '\\[ F_{' + nombreBarra(b) + '} = ' + dec(Math.abs(val),'f') + '\\;\\text{' + uF + '}\\;' + tipo + ' \\]\n';
        });
      } else {
        textoIzq += '{\\small\\color{bsaMuted}Todas las barras de este nudo ya se conocen: sirve como '
          + 'comprobaci\\\'on del equilibrio.}\\\\[2pt]\n';
      }

      const dclA = tikzDCLNudo(n, resultado);
      const leyendaAng = dclA.angulos.length
        ? '{\\tiny\\color{bsaMuted}' + dclA.angulos.map(a=>'$' + a.letra + '=' + dec(a.valor,'f') + '^{\\circ}$').join(', ') + '}\\\\[2pt]\n'
        : '';
      figN++;
      tex += '\\noindent\\begin{minipage}[c]{0.54\\textwidth}\n' + textoIzq + '\\end{minipage}\\hfill\n'
        + '\\begin{minipage}[c]{0.44\\textwidth}\\centering\n'
        + '\\begin{tikzpicture}[scale=0.68]\n' + dclA.tikz + '\\end{tikzpicture}\\\\[1pt]\n'
        + leyendaAng
        + '{\\tiny\\color{bsaMuted}Figura ' + figN + '. DCL del nudo ' + escLatex(n.nombre) + '.}\n'
        + '\\end{minipage}\n'
        + '\\vspace{6pt}\\hrule\\vspace{9pt}\n';
    });

  } else if(modoCorte === 'auto'){
    tex += '\\seccion{4. M\\\'etodo de secciones \\textperiodcentered\\ resoluci\\\'on autom\\\'atica}\n'
      + '\\noindent En cada paso se busca, entre todos los cortes posibles, el que separa la armadura en '
      + 'dos partes dejando como m\\\'aximo tres inc\\\'ognitas (una porci\\\'on solo aporta tres ecuaciones '
      + 'de equilibrio), y de esos se toma el que resuelve m\\\'as barras a la vez.\\\\[8pt]\n\n';
    const pasosAuto = buscarCortes();
    if(!pasosAuto.length){
      tex += '{\\small\\color{bsaMuted}No se encontr\\\'o ning\\\'un corte que deje tres o menos '
        + 'inc\\\'ognitas; esta armadura necesita empezar por el equilibrio de alg\\\'un nudo.}\\\\[6pt]\n';
    } else {
      const resueltasPrev = {};
      miembrosCero().map(c=>c.barra).forEach(id=>{ resueltasPrev[id] = 0; });
      pasosAuto.forEach((paso, i)=>{
        const previas = Object.assign({}, resueltasPrev);
        const est = estrategiaPaso(paso, previas);
        const nomLado = paso.lado.map(id=>nodos.find(n=>n.id===id).nombre).sort().join(', ');
        const nomInc = paso.sol.incog.map(b=>nombreBarra(b)).join(', ');

        let textoIzq = '\\textbf{Corte ' + (i+1) + '} \\hfill {\\small\\color{bsaMuted}resuelve ' + nomInc
          + ' \\textperiodcentered\\ porci\\\'on: ' + nomLado + '}\\\\[3pt]\n';
        est.items.forEach(p=>{
          const detalleTxt = p.detalle.map(x=>(x.val>=0?' + ':' - ')+dec(Math.abs(x.val),'f')).join('');
          if(p.tipo === 'momento'){
            textoIzq += '\\begin{footnotesize}\\[ \\textstyle\\sum M_O = 0:\\quad ' + fmtCoef(p.coef) + 'F_{' + nombreBarra(p.d.barra) + '}'
              + detalleTxt + ' = 0 \\]\\end{footnotesize}\n';
          } else {
            textoIzq += '\\begin{footnotesize}\\[ \\textstyle\\sum F_{\\perp} = 0:\\quad ' + fmtCoef(p.coef) + 'F_{' + nombreBarra(p.d.barra) + '}'
              + detalleTxt + ' = 0 \\]\\end{footnotesize}\n';
          }
          const tipoTxt = esCero(p.val) ? '\\text{(fuerza cero)}' : (p.val > 0 ? '\\text{(tracci\\\'on)}' : '\\text{(compresi\\\'on)}');
          textoIzq += '\\[ F_{' + nombreBarra(p.d.barra) + '} = ' + dec(Math.abs(p.val),'f') + '\\;\\text{' + uF + '}\\;' + tipoTxt + ' \\]\n';
        });

        const dclC = tikzSeccionPorcion(paso.lado, est.datos, est.externas, est.items);
        const leyendaAngC = dclC.angulos.length
          ? '{\\tiny\\color{bsaMuted}' + dclC.angulos.map(a=>'$' + a.letra + '=' + dec(a.valor,'f') + '^{\\circ}$').join(', ') + '}\\\\[2pt]\n'
          : '';
        figN++;
        tex += '\\noindent\\begin{minipage}[c]{0.56\\textwidth}\n' + textoIzq + '\\end{minipage}\\hfill\n'
          + '\\begin{minipage}[c]{0.40\\textwidth}\\centering\n'
          + '\\begin{tikzpicture}[scale=0.72]\n' + dclC.tikz + '\\end{tikzpicture}\\\\[1pt]\n'
          + leyendaAngC
          + '{\\tiny\\color{bsaMuted}Figura ' + figN + '. Porci\\\'on del corte ' + (i+1) + '.}\n'
          + '\\end{minipage}\n'
          + '\\vspace{6pt}\\hrule\\vspace{9pt}\n';

        Object.keys(paso.sol.valores).forEach(id=>{ resueltasPrev[id] = paso.sol.valores[id]; });
      });
      const faltanAuto = barras.filter(b=>resueltasPrev[b.id] === undefined);
      if(faltanAuto.length){
        tex += '{\\small\\color{bsaMuted}Quedan ' + faltanAuto.map(b=>escLatex(nombreBarra(b))).join(', ')
          + ' sin resolver por cortes: ning\\\'un corte v\\\'alido las deja con tres o menos inc\\\'ognitas, '
          + 'as\\\'i que se obtienen con el equilibrio de un nudo. Sus valores igual aparecen en la tabla siguiente.}\\\\[6pt]\n';
      }
    }

  } else {
    // modoCorte === 'manual'
    tex += '\\seccion{4. M\\\'etodo de secciones \\textperiodcentered\\ corte manual}\n';
    const info = analizarCorte();
    if(!info.valido){
      const motivos = {
        'sin-corte':'No se ha trazado ning\\\'un corte en la aplicaci\\\'on.',
        'no-corta':'El corte trazado no atraviesa ninguna barra.',
        'no-separa':'El corte trazado no separa la armadura en exactamente dos partes.',
        'muchas':'El corte trazado deja m\\\'as de tres inc\\\'ognitas; una porci\\\'on solo aporta tres ecuaciones de equilibrio.'
      };
      tex += '{\\small\\color{bsaMuted}' + (motivos[info.motivo] || 'El corte trazado no es v\\\'alido.') + '}\\\\[6pt]\n';
    } else {
      const sol = resolverSeccion(info);
      const nomLado = info.lado.map(id=>nodos.find(n=>n.id===id).nombre).sort().join(', ');
      const nomInc = info.incog.map(b=>nombreBarra(b)).join(', ');
      tex += '\\noindent Corte manual \\textperiodcentered\\ resuelve ' + escLatex(nomInc)
        + ' \\textperiodcentered\\ porci\\\'on analizada: ' + escLatex(nomLado) + '.\\\\[8pt]\n\n';

      let textoIzq = '';
      sol.pasos.forEach(p=>{
        const detalleTxt = p.detalle.map(x=>(x.val>=0?' + ':' - ')+dec(Math.abs(x.val),'f')).join('');
        if(p.tipo === 'momento'){
          textoIzq += '\\begin{footnotesize}\\[ \\textstyle\\sum M_O = 0:\\quad ' + fmtCoef(p.coef) + 'F_{' + nombreBarra(p.d.barra) + '}'
            + detalleTxt + ' = 0 \\]\\end{footnotesize}\n';
        } else {
          textoIzq += '\\begin{footnotesize}\\[ \\textstyle\\sum F_{\\perp} = 0:\\quad ' + fmtCoef(p.coef) + 'F_{' + nombreBarra(p.d.barra) + '}'
            + detalleTxt + ' = 0 \\]\\end{footnotesize}\n';
        }
        const tipoTxt = esCero(p.val) ? '\\text{(fuerza cero)}' : (p.val > 0 ? '\\text{(tracci\\\'on)}' : '\\text{(compresi\\\'on)}');
        textoIzq += '\\[ F_{' + nombreBarra(p.d.barra) + '} = ' + dec(Math.abs(p.val),'f') + '\\;\\text{' + uF + '}\\;' + tipoTxt + ' \\]\n';
      });

      const dclM = tikzSeccionPorcion(info.lado, sol.datos, sol.externas, sol.pasos);
      const leyendaAngM = dclM.angulos.length
        ? '{\\tiny\\color{bsaMuted}' + dclM.angulos.map(a=>'$' + a.letra + '=' + dec(a.valor,'f') + '^{\\circ}$').join(', ') + '}\\\\[2pt]\n'
        : '';
      figN++;
      tex += '\\noindent\\begin{minipage}[c]{0.56\\textwidth}\n' + textoIzq + '\\end{minipage}\\hfill\n'
        + '\\begin{minipage}[c]{0.40\\textwidth}\\centering\n'
        + '\\begin{tikzpicture}[scale=0.78]\n' + dclM.tikz + '\\end{tikzpicture}\\\\[1pt]\n'
        + leyendaAngM
        + '{\\tiny\\color{bsaMuted}Figura ' + figN + '. Porci\\\'on analizada por el corte.}\n'
        + '\\end{minipage}\n'
        + '\\vspace{6pt}\\hrule\\vspace{9pt}\n';
    }
  }

  // ── 5. Resumen de fuerzas en las barras ──
  let filasBarras = '';
  barras.forEach((b, i)=>{
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    const f = resultado.fuerzas[b.id] || 0;
    const L = Math.hypot(nb.x-na.x, nb.y-na.y);
    const nat = esCero(f) ? '---' : (f >= 0 ? 'T' : 'C');
    let util = '';
    if(hayCap && !esCero(f)){
      const pct = f >= 0 ? (f/capT*100) : (Math.abs(f)/capC*100);
      util = dec(pct,'f') + '\\%';
    }
    filasBarras += (i+1) + ' & ' + escLatex(nombreBarra(b)) + ' & ' + dec(L,'len') + ' & '
      + dec(Math.abs(f),'f') + ' & ' + nat + (hayCap ? ' & ' + (util || '---') : '') + ' \\\\\n';
  });
  tex += '\\seccion{5. Resumen de fuerzas en las barras}\n'
    + '\\begin{center}\n\\begin{tabular}{clcc l' + (hayCap ? 'c' : '') + '}\n\\hline\n'
    + '\\textbf{N\\textsuperscript{o}} & \\textbf{Barra} & \\textbf{Long.\\ (' + uL + ')} & \\textbf{Fuerza (' + uF + ')} & \\textbf{Naturaleza}'
    + (hayCap ? ' & \\textbf{Uso}' : '') + '\\\\\n\\hline\n'
    + filasBarras + '\\hline\n\\end{tabular}\n\\end{center}\n'
    + tablaCaption('Fuerza axial, naturaleza y aprovechamiento de cada barra.')
    + '\\noindent T = tracci\\\'on, C = compresi\\\'on.\n\n';

  // ── 6. Sensibilidad ante cambios de carga (DCL comparativos + tabla) ──
  function analizarConEscalaTemporal(k){
    const orig = nodos.map(n=>({n, fx:n.fx, fy:n.fy}));
    nodos.forEach(n=>{ n.fx *= k; n.fy *= k; });
    const res = analizar();
    orig.forEach(o=>{ o.n.fx = o.fx; o.n.fy = o.fy; });
    return res;
  }
  const hayCarga = nodos.some(n=>!esCero(n.fx)||!esCero(n.fy));
  if(hayCarga){
    const resX2 = analizarConEscalaTemporal(2);
    const resD2 = analizarConEscalaTemporal(0.5);
    let filasSens = '';
    barras.forEach((b,i)=>{
      const base = resultado.fuerzas[b.id]||0;
      const x2 = resX2.error ? null : (resX2.fuerzas[b.id]||0);
      const d2 = resD2.error ? null : (resD2.fuerzas[b.id]||0);
      filasSens += (i+1) + ' & ' + escLatex(nombreBarra(b)) + ' & ' + dec(base,'f') + ' & '
        + (x2===null?'---':dec(x2,'f')) + ' & ' + (d2===null?'---':dec(d2,'f')) + ' \\\\\n';
    });

    tex += '\\seccion{6. \\textquestiondown Qu\\\'e pasa si cambio las cargas?}\n'
      + '\\noindent Esta secci\\\'on del programa permite variar cualquier carga y recalcular al '
      + 'instante; como referencia impresa, se comparan las fuerzas resultantes si \\textbf{todas} '
      + 'las cargas se duplican, manteniendo su direcci\\\'on.\\\\[8pt]\n';

    if(!resX2.error){
      const tikzA = tikzArmaduraCompleta({fuerzas:resultado.fuerzas, reacciones:resultado.reacciones, cotas:false, valores:true, factorCargas:1});
      const tikzB = tikzArmaduraCompleta({fuerzas:resX2.fuerzas, reacciones:resX2.reacciones, cotas:false, valores:true, factorCargas:2});
      tex += '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n' + tikzA + '\\end{tikzpicture}\n\\end{center}\n'
        + figCaption('Caso actual: fuerza en cada barra con las cargas tal como est\\\'an definidas.');
      tex += '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n' + tikzB + '\\end{tikzpicture}\n\\end{center}\n'
        + figCaption('Con el doble de carga: mismas barras, fuerzas recalculadas al duplicar todas las cargas.');
    }

    tex += '\\begin{center}\\begin{tabular}{clccc}\\hline\n'
      + '\\textbf{N\\textsuperscript{o}} & \\textbf{Barra} & \\textbf{Actual (' + uF + ')} & '
      + '\\textbf{Doble de carga} & \\textbf{Mitad de carga}\\\\\\hline\n'
      + filasSens + '\\hline\\end{tabular}\\end{center}\n'
      + tablaCaption('Fuerza en cada barra bajo la carga actual y bajo variaciones de ella.');
  }

  // ── 7. ¿Qué barra falla primero? (tabla + DCL en la carga de falla) ──
  if(hayCap){
    let nodosParaFalla = nodos.filter(n=>!esCero(n.fx)||!esCero(n.fy));
    if(typeof simNodoId === 'number' && simNodoId !== null){
      const elegido = nodos.find(z=>z.id===simNodoId);
      if(elegido && (!esCero(elegido.fx)||!esCero(elegido.fy))) nodosParaFalla = [elegido];
    }
    let filasFalla = '', tikzFalla = '', veredictosFalla = [];
    nodosParaFalla.forEach(n=>{
      const mag0 = Math.hypot(n.fx, n.fy);
      if(mag0 < 1e-9) return;
      const ux = n.fx/mag0, uy = n.fy/mag0;
      const fx0 = n.fx, fy0 = n.fy;
      n.fx = 0; n.fy = 0;
      const r0 = analizar();
      n.fx = fx0; n.fy = fy0;
      const r1 = analizar();
      if(r0.error || r1.error) return;
      let mejorP = null, mejorBarra = null;
      barras.forEach(b=>{
        const a = r0.fuerzas[b.id] || 0;
        const bcoef = ((r1.fuerzas[b.id]||0) - a) / mag0;
        if(Math.abs(bcoef) < 1e-12) return;
        [capT, -capC].forEach(lim=>{
          if(!(Math.abs(lim) > 0)) return;
          const P = (lim - a) / bcoef;
          if(P > 1e-9 && (mejorP === null || P < mejorP)){ mejorP = P; mejorBarra = b; }
        });
      });
      if(mejorP !== null){
        filasFalla += escLatex(n.nombre) + ' & ' + dec(mag0,'f') + ' & '
          + escLatex(nombreBarra(mejorBarra)) + ' & ' + dec(mejorP,'f') + ' \\\\\n';
        veredictosFalla.push('Con la carga en el nudo \\textbf{' + escLatex(n.nombre) + '}, la primera barra en fallar es '
          + '\\textbf{' + escLatex(nombreBarra(mejorBarra)) + '}, al alcanzar esa carga '
          + '\\textbf{' + dec(mejorP,'f') + '\\,' + uF + '} (actualmente vale ' + dec(mag0,'f') + '\\,' + uF + ').');

        const fuerzasFalla = {};
        barras.forEach(b=>{
          const a = r0.fuerzas[b.id] || 0;
          const bcoef = ((r1.fuerzas[b.id]||0) - a) / mag0;
          fuerzasFalla[b.id] = a + bcoef*mejorP;
        });
        const fx0f = n.fx, fy0f = n.fy;
        n.fx = ux*mejorP; n.fy = uy*mejorP;
        const resFalla = analizar();
        n.fx = fx0f; n.fy = fy0f;
        const reaccionesFalla = resFalla.error ? resultado.reacciones : resFalla.reacciones;

        const tikzF = tikzArmaduraCompleta({fuerzas:fuerzasFalla, reacciones:reaccionesFalla, cotas:false,
          valores:true, factorCargas:(mejorP/mag0), resaltar:mejorBarra.id});
        tikzFalla += '\\begin{center}\n\\begin{tikzpicture}[scale=0.95]\n' + tikzF + '\\end{tikzpicture}\n\\end{center}\n'
          + figCaption('Diagrama de cuerpo libre en la carga de falla del nudo ' + escLatex(n.nombre)
            + '; la barra ' + escLatex(nombreBarra(mejorBarra)) + ' (resaltada en magenta) es la que alcanza su capacidad admisible primero.');
      }
    });

    if(filasFalla){
      tex += '\\seccion{7. \\textquestiondown Qu\\\'e barra falla primero?}\n'
        + '\\noindent Con las capacidades admisibles ingresadas ($F_{\\text{adm,T}}=' + dec(capT,'f') + '\\,' + uF
        + '$, $F_{\\text{adm,C}}=' + dec(capC,'f') + '\\,' + uF + '$), se indica, para la carga aplicada, '
        + 'cu\\\'al barra alcanza primero su l\\\'imite si esa carga aumenta y a qu\\\'e valor.\\\\[8pt]\n'
        + '\\veredicto{' + veredictosFalla.join('\\\\[4pt] ') + '}\n'
        + '\\begin{center}\\begin{tabular}{lccc}\\hline\n'
        + '\\textbf{Nudo cargado} & \\textbf{Carga actual (' + uF + ')} & \\textbf{Barra cr\\\'itica} & '
        + '\\textbf{Falla en (' + uF + ')}\\\\\\hline\n'
        + filasFalla + '\\hline\\end{tabular}\\end{center}\n'
        + tablaCaption('Carga de falla y barra cr\\\'itica para el nudo analizado.')
        + tikzFalla;
    }
  }

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
