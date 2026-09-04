// ═══════════════════════════════════════════════════════════
//  INFORME LaTeX · una clase paso a paso (Hibbeler cap. 6)
//  Planteamiento y convenio → determinación → reacciones → fuerza cero →
//  método de nudos (o de secciones, según lo elegido en pantalla) →
//  resumen y comprobación → qué pasa si cambia la carga → qué barra falla.
//  Sigue las mismas reglas de redacción que el informe de fuerzas internas
//  (fuerzas-internas/LEEME.md, «Reglas de redacción»): cada explicación una
//  sola vez, tablas y ecuaciones numeradas y citadas, DCL de nudo con los
//  sentidos reales, icono del convenio en cada sumatoria, colofón BSA.
// ═══════════════════════════════════════════════════════════

// ── Ayudantes de formato (locales: no se comparten con otros temas) ──
let _yaDichoArm = {};
function _primeraVezArm(clave){
  if(_yaDichoArm[clave]) return false;
  _yaDichoArm[clave] = true;
  return true;
}
// Suma de términos {v, tex}: v da el signo, tex la expresión en valor absoluto.
function _sumaTexArm(terms, ceroTxt){
  if(!terms.length) return ceroTxt || '0';
  return terms.map((t,i)=>(i===0 ? (t.v<0?'-':'') : (t.v<0?' - ':' + ')) + t.tex).join('');
}
function _alineadaArm(filas){
  return '\\begin{align*}\n' + filas.join(' \\\\\n') + '\n\\end{align*}\n';
}
// Fila «etiqueta & términos cola», partida cada `porFila` términos.
function _filaArm(izq, terms, cola, porFila){
  const n = porFila || 5;
  if(!terms.length) return izq + ' & ' + (cola || '0');
  let s = izq + ' & ';
  terms.forEach((t,i)=>{
    const sg = (i===0) ? (t.v<0?'-':'') : (t.v<0?' - ':' + ');
    if(i > 0 && i % n === 0) s += ' \\\\\n &\\qquad ';
    s += sg + t.tex;
  });
  return s + (cola || '');
}
// Coeficiente en valor absoluto, listo para ir delante de un símbolo.
function _coefAbs(c){
  const a = Math.abs(c);
  if(Math.abs(a-1) < 1e-9) return '';
  return dec(a,'f') + '\\,';
}
// «(1)», «(1) y (2)», «(1), (2) y (4)»
function _refsArm(ns){
  if(!ns.length) return '';
  if(ns.length === 1) return '(' + ns[0] + ')';
  return '(' + ns.slice(0,-1).join('), (') + ') y (' + ns[ns.length-1] + ')';
}
function _iconoSentido(fx, fy){
  const a = Math.atan2(fy, fx);
  const k = ((Math.round(a/(Math.PI/4)) % 8) + 8) % 8;
  return '$' + ['\\rightarrow','\\nearrow','\\uparrow','\\nwarrow',
                '\\leftarrow','\\swarrow','\\downarrow','\\searrow'][k] + '$';
}

function construirLatex(){
  if(!resultado || resultado.error){ aviso('Primero resuelve la armadura sin errores.'); return null; }
  _yaDichoArm = {};
  const uL = unitLen, uF = unitFor;
  const uM = escLatex(unitFor) + '\\cdot' + escLatex(unitLen);
  const capT = parseFloat(document.getElementById('capT') ? document.getElementById('capT').value : NaN);
  const capC = parseFloat(document.getElementById('capC') ? document.getElementById('capC').value : NaN);
  const hayCap = isFinite(capT) && isFinite(capC) && capT > 0 && capC > 0;

  // Figuras y tablas se numeran en el ORDEN en que aparecen en el texto, así
  // que el documento se arma de forma incremental, sección por sección.
  let figN = 0, tablaN = 0, eqN = 0;
  const figCaption = txt => { figN++;
    return '\n\\begin{center}{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\\end{center}\n\\vspace{4pt}\n'; };
  // \nopagebreak: el rótulo no se queda huérfano al pie de una página con la
  // tabla en la siguiente.
  const tablaCaption = txt => { tablaN++;
    return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };
  const porque = (clave, txt) => _primeraVezArm(clave) ? '\\porque{' + txt + '}\n' : '';

  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});
  const j = nodos.length, m = barras.length;
  const r = Object.keys(resultado.reacciones)
    .reduce((s,id)=> s + (resultado.reacciones[id].rx !== undefined ? 1 : 0)
                       + (resultado.reacciones[id].ry !== undefined ? 1 : 0), 0);
  const usaSecciones = (typeof metodo !== 'undefined') && metodo === 'secciones';
  const nombreMetodo = !usaSecciones ? 'M\\\'etodo de nudos'
    : (modoCorte === 'auto' ? 'M\\\'etodo de secciones (autom\\\'atico)' : 'M\\\'etodo de secciones (corte manual)');
  const nomN = n => escLatex(n.nombre);
  const nomB = b => escLatex(nombreBarra(b));

  const preambulo = '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n'
    + '\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.0cm]{geometry}\n'
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
    + '\\setlength{\\parskip}{2pt}\n'
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Armaduras}\\hfill\\footnotesize\\color{bsaMuted}' + nombreMetodo + '}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\ \\ \\textperiodcentered\\ \\ p\\\'ag.\\ \\thepage\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    + '\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\vspace{10pt}{\\large\\bfseries\\color{bsaAcc}#1}\\par\\vspace{3pt}\\hrule\\vspace{7pt}}\n'
    + '\\newcommand{\\subpaso}[1]{\\vspace{6pt}\\noindent{\\bfseries\\color{bsaAcc2}#1}\\par\\vspace{3pt}}\n'
    + '\\newcommand{\\porque}[1]{\\par\\vspace{3pt}\\noindent\\fcolorbox{bsaAcc2!40}{bsaAcc2!5}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\footnotesize{\\bfseries\\color{bsaAcc2}\\textquestiondown Por qu\\\'e?}\\ #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\resultado}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaVerde!50}{bsaVerde!6}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\veredicto}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaAcc}{bsaAcc!7}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n\n'
    + '\\begin{document}\n\n';

  let tex = preambulo;
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} An\\\'alisis de una armadura plana}\\\\[3pt]\n'
    + '  {\\large\\color{bsaAcc2} Reacciones y fuerza en cada barra por el ' + nombreMetodo.toLowerCase() + '}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Informe generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{6pt}\n\n';

  // ══ 1. Planteamiento ══
  tex += '\\seccion{1. Planteamiento del problema}\n';
  tex += '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
    + tikzArmaduraCompleta({cotas:true, valores:false}) + '\\end{tikzpicture}\n\\end{center}\n';
  tex += figCaption('Modelo de la armadura: nudos, barras, apoyos, cargas aplicadas y cotas.');
  tex += '\\subpaso{Objetivo}\n'
    + 'Hallar las reacciones en los apoyos y la fuerza axial en cada barra, indicando si trabaja a '
    + '\\textbf{tracci\\\'on} (T) o a \\textbf{compresi\\\'on} (C).\n';
  tex += porque('dos-fuerzas',
    'Una armadura se idealiza con dos hip\\\'otesis: las cargas act\\\'uan solo en los nudos y las uniones se '
    + 'comportan como pasadores lisos. Con ellas, cada barra recibe fuerza \\textbf{solo en sus dos extremos}: '
    + 'es un \\emph{elemento de dos fuerzas}, y el equilibrio obliga a que esas dos fuerzas sean iguales, '
    + 'opuestas y \\textbf{a lo largo del eje de la barra}. Por eso en una armadura no hay cortante ni momento '
    + 'flector: solo fuerza axial, y basta un n\\\'umero por barra.');
  tex += '\\subpaso{Procedimiento de an\\\'alisis}\n'
    + '\\begin{enumerate}\\setlength{\\itemsep}{1pt}\n'
    + '\\item \\textbf{Determinaci\\\'on est\\\'atica.} Se comprueba $m + r = 2j$: tantas inc\\\'ognitas como ecuaciones.\n'
    + '\\item \\textbf{Reacciones.} Se a\\\'isla la armadura completa, se dibuja su DCL y se plantean '
    + '$\\sum F_x = 0$, $\\sum F_y = 0$ y $\\sum M = 0$.\n'
    + '\\item \\textbf{Barras de fuerza cero.} Se detectan por inspecci\\\'on antes de calcular: ahorran trabajo.\n'
    + (usaSecciones
      ? '\\item \\textbf{M\\\'etodo de secciones.} Se corta la armadura por no m\\\'as de tres barras desconocidas y se '
        + 'plantea el equilibrio de un trozo (tres ecuaciones), eligiendo el punto de momentos donde se crucen '
        + 'dos de las inc\\\'ognitas para que la tercera salga sola.\n'
      : '\\item \\textbf{M\\\'etodo de nudos.} Se a\\\'isla cada pasador y se plantean $\\sum F_x = 0$ y '
        + '$\\sum F_y = 0$, recorriendo los nudos de modo que en cada uno queden como m\\\'aximo dos inc\\\'ognitas.\n')
    + '\\item \\textbf{Resumen y comprobaci\\\'on.} Se tabulan las fuerzas con su naturaleza y se verifica el '
    + 'equilibrio en un nudo no usado.\n'
    + '\\end{enumerate}\n';
  tex += '\\subpaso{Convenio de signos}\n'
    + '\\noindent Toda fuerza de barra desconocida se supone en \\textbf{tracci\\\'on}: sale del nudo, tirando de '
    + '\\\'el hacia la barra. Si el resultado es positivo la barra est\\\'a en tracci\\\'on; si es negativo, en '
    + 'compresi\\\'on (empuja al nudo). En las figuras: \\textcolor{bsaAcc2}{\\rule[0.06cm]{0.45cm}{1.6pt}} '
    + 'tracci\\\'on, \\textcolor{bsaRoj}{\\rule[0.06cm]{0.45cm}{1.6pt}} compresi\\\'on, '
    + '\\textcolor{bsaAcc}{\\rule[0.06cm]{0.45cm}{1.6pt}} cargas aplicadas, '
    + '\\textcolor{bsaVerde}{\\rule[0.06cm]{0.45cm}{1.6pt}} reacciones. '
    + 'Los ejes $x$ e $y$ son los del plano; los pares se toman positivos en sentido antihorario.\n';

  // ══ 2. Determinación ══
  tex += '\\seccion{2. Paso 1 --- Determinaci\\\'on est\\\'atica}\n';
  const veredictoDet = (m + r === 2*j)
    ? '\\textbf{Armadura isost\\\'atica.} Hay tantas inc\\\'ognitas ($m$ fuerzas de barra m\\\'as $r$ reacciones) como ecuaciones ($2$ por nudo).'
    : ((m + r < 2*j)
        ? '\\textbf{Armadura inestable.} Faltan barras o apoyos.'
        : '\\textbf{Armadura hiperest\\\'atica.} Sobran inc\\\'ognitas: la est\\\'atica sola no basta.');
  tex += '\\[ m + r = 2j \\qquad\\Longrightarrow\\qquad ' + m + ' + ' + r + ' = 2\\cdot' + j
    + ' \\qquad\\Longrightarrow\\qquad ' + (m+r) + ' = ' + (2*j) + ((m + r === 2*j) ? '\\;\\checkmark' : '') + ' \\]\n'
    + '\\veredicto{' + veredictoDet + '}\n';
  const sim = analizarSimetria(resultado);
  if(sim.simetrica)
    tex += '\\noindent{\\footnotesize La geometr\\\'ia, las cargas y los apoyos son sim\\\'etricos respecto del eje '
      + '$x = ' + dec(sim.eje,'len') + '$ ' + escLatex(uL) + ': las barras que se reflejan entre s\\\'i llevan la '
      + 'misma fuerza, lo que servir\\\'a de comprobaci\\\'on.}\\\\[4pt]\n';

  // ══ 3. Reacciones ══
  tex += '\\seccion{3. Paso 2 --- Reacciones en los apoyos}\n';
  tex += porque('reacciones',
    'Para aislar un nudo que est\\\'a sobre un apoyo hace falta conocer su reacci\\\'on, y en general el '
    + 'primer nudo con dos inc\\\'ognitas suele ser un apoyo. Por eso se resuelven antes, con el equilibrio de '
    + 'la armadura completa: en \\textbf{ese} cuerpo libre las fuerzas de las barras son internas y no aparecen.');
  tex += '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n'
    + tikzArmaduraCompleta({cotas:true, valores:false, reaccionesIncognita:true}) + '\\end{tikzpicture}\n\\end{center}\n';
  tex += figCaption('DCL de la armadura completa: cargas aplicadas y reacciones inc\\\'ognita en su sentido positivo supuesto. '
    + 'Los brazos de las cargas se leen en las cotas.');

  const pines = nodos.filter(n=>n.apoyo==='fijo');
  const rodillos = nodos.filter(n=>n.apoyo==='movil');
  const cargasN = nodos.filter(n=>!esCero(n.fx) || !esCero(n.fy));
  const sumFx = nodos.reduce((s,n)=>s+(n.fx||0),0), sumFy = nodos.reduce((s,n)=>s+(n.fy||0),0);
  const simbR = (n, comp) => 'R_{' + comp + nomN(n) + '}';
  const numEqReac = {};                    // 'yC' -> número de ecuación
  if(pines.length===1 && rodillos.length===1){
    // Caso de clase: pasador + rodillo. Momentos respecto del pasador, donde se
    // cruzan dos de las tres incógnitas: la del rodillo sale sola.
    const P = pines[0], Rn = rodillos[0];
    const dir = (Rn.apAng===0) ? {x:1,y:0} : {x:0,y:1};
    const compR = (Rn.apAng===0) ? 'x' : 'y';
    const nR = simbR(Rn, compR);
    const rc = resultado.reacciones[Rn.id], rp = resultado.reacciones[P.id];
    const valR = compR === 'x' ? rc.rx : rc.ry;
    const terms = [];
    cargasN.forEach(n=>{
      if(!esCero(n.fy)){ const bz = n.x - P.x; if(Math.abs(bz) > 1e-9)
        terms.push({v:n.fy*bz, tex:dec(Math.abs(n.fy),'f') + '\\times' + dec(Math.abs(bz),'len')}); }
      if(!esCero(n.fx)){ const bz = -(n.y - P.y); if(Math.abs(bz) > 1e-9)
        terms.push({v:n.fx*bz, tex:dec(Math.abs(n.fx),'f') + '\\times' + dec(Math.abs(bz),'len')}); }
    });
    const coefR = (Rn.x-P.x)*dir.y - (Rn.y-P.y)*dir.x;
    const cte = terms.reduce((s,t)=>s+t.v, 0);
    const n1 = ++eqN; numEqReac[compR + Rn.id] = n1;
    const filasM = [];
    filasM.push(_filaArm('\\circlearrowleft\\!+\\ \\sum M_{' + nomN(P) + '} = 0:\\quad',
      terms.concat([{v:coefR, tex:_coefAbs(coefR) + nR}]), ' = 0\\qquad(' + n1 + ')'));
    filasM.push('& ' + nR + ' = \\dfrac{' + dec(-cte,'f') + '}{' + dec(coefR,'len') + '} = '
      + dec(valR,'f') + '\\ \\text{' + escLatex(uF) + '}');
    tex += _alineadaArm(filasM);
    // ΣFy y ΣFx, citando (n1) al sustituir
    const otras = [['y', '+\\!\\uparrow\\ \\sum F_y = 0:\\quad', sumFy, dir.y, rp.ry],
                   ['x', '\\xrightarrow{+}\\ \\sum F_x = 0:\\quad', sumFx, dir.x, rp.rx]];
    otras.forEach(([comp, etq, sumF, dR, valP])=>{
      const nP = simbR(P, comp);
      const t = [{v:1, tex:nP}];
      if(Math.abs(dR) > 1e-9) t.push({v:1, tex:nR});
      if(!esCero(sumF)) t.push({v:sumF, tex:dec(Math.abs(sumF),'f')});
      const nk = ++eqN; numEqReac[comp + P.id] = nk;
      const f = [];
      f.push(_filaArm(etq, t, ' = 0\\qquad(' + nk + ')'));
      if(Math.abs(dR) > 1e-9){
        const t2 = [{v:1, tex:nP}, {v:valR, tex:dec(Math.abs(valR),'f')}];
        if(!esCero(sumF)) t2.push({v:sumF, tex:dec(Math.abs(sumF),'f')});
        f.push(_filaArm('{\\footnotesize\\text{de } (' + n1 + '):}\\quad', t2, ' = 0'));
      }
      f.push('& ' + nP + ' = ' + dec(valP,'f') + '\\ \\text{' + escLatex(uF) + '}');
      tex += _alineadaArm(f);
    });
  } else {
    tex += '\\noindent{\\footnotesize Esta configuraci\\\'on de apoyos no es la de pasador m\\\'as rodillo; '
      + 'las tres ecuaciones de equilibrio global se resuelven como sistema:}\n';
    tex += '\\[ \\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M = 0 \\]\n';
  }
  // Tabla de reacciones, con el sentido real en icono
  let filasReac = '';
  nodos.forEach(n=>{
    const rc = resultado.reacciones[n.id]; if(!rc) return;
    if(rc.rx !== undefined) filasReac += '$' + simbR(n,'x') + '$ & $' + dec(rc.rx,'f') + '$\\,' + escLatex(uF) + ' & ' + _iconoSentido(rc.rx, 0) + ' \\\\\n';
    if(rc.ry !== undefined) filasReac += '$' + simbR(n,'y') + '$ & $' + dec(rc.ry,'f') + '$\\,' + escLatex(uF) + ' & ' + _iconoSentido(0, rc.ry) + ' \\\\\n';
  });
  tex += tablaCaption('Reacciones en los apoyos, con su sentido real. Un valor negativo significa que la '
    + 'reacci\\\'on act\\\'ua al rev\\\'es del sentido supuesto en el DCL.');
  tex += '\\resultado{\\centering\\small\\begin{tabular}{@{}crc@{}}\\hline\n'
    + '\\textbf{Reacci\\\'on} & \\textbf{Valor} & \\textbf{Sentido real} \\\\\\hline\n' + filasReac
    + '\\hline\\end{tabular}}\n';

  // ══ 4. Fuerza cero ══
  tex += '\\seccion{4. Paso 3 --- Barras de fuerza cero}\n';
  const cero = miembrosCero();
  tex += porque('fuerza-cero',
    'Antes de calcular conviene mirar cada nudo \\emph{pobre}. Si en un nudo sin carga ni apoyo concurren solo '
    + 'dos barras no colineales, la componente perpendicular a una de ellas solo puede equilibrarla la otra, '
    + 'y viceversa: las dos son nulas. Si concurren tres y dos son colineales, la tercera es nula y las '
    + 'colineales llevan la misma fuerza. La regla no vale si al nudo llega una carga o una reacci\\\'on.');
  if(cero.length){
    let f = '';
    cero.forEach(c=>{ const b = barras.find(x=>x.id===c.barra);
      f += '$F_{' + nomB(b) + '}$ & ' + escLatex(c.nudo) + ' & ' + (c.regla===2 ? 'dos barras no colineales, sin carga ni apoyo' : 'tres barras, dos colineales, sin carga') + ' \\\\\n'; });
    tex += tablaCaption('Barras nulas por inspecci\\\'on, con el nudo desde el que se ve y la regla aplicada.');
    tex += '{\\footnotesize\\begin{center}\\begin{tabular}{ccl}\\hline\nBarra & Nudo & Regla \\\\\\hline\n' + f + '\\hline\\end{tabular}\\end{center}}\n';
  } else {
    tex += '\\noindent{\\footnotesize En esta armadura ning\\\'un nudo cumple las reglas de fuerza cero; alguna barra '
      + 'puede resultar nula al calcular, pero no se ve por inspecci\\\'on.}\\\\[4pt]\n';
  }

  // ══ 5. Método ══
  const deQuien = {};      // barraId -> [números de ecuación de los que salió]
  if(!usaSecciones){
    tex += '\\seccion{5. Paso 4 --- M\\\'etodo de nudos}\n';
    tex += porque('nudos',
      'Sobre un pasador act\\\'uan fuerzas coplanares y \\textbf{concurrentes}, as\\\'i que el momento se satisface '
      + 'solo y quedan dos ecuaciones: $\\sum F_x = 0$ y $\\sum F_y = 0$. Dos ecuaciones resuelven a lo sumo dos '
      + 'inc\\\'ognitas, y por eso el orden de los nudos importa: cada uno debe tener como m\\\'aximo dos barras '
      + 'a\\\'un desconocidas. Las fuerzas ya halladas se llevan al nudo siguiente \\textbf{con su sentido real}: '
      + 'una barra en tracci\\\'on tira de sus dos nudos; una en compresi\\\'on empuja a los dos.');
    const orden = ordenNudos();
    const conocidas = {};   // barraId -> valor conocido
    cero.forEach(c=>{ conocidas[c.barra] = 0; deQuien[c.barra] = ['fuerza cero']; });
    tex += '\\noindent{\\footnotesize Orden de resoluci\\\'on: ' + orden.map(p=>nomN(p.nodo)).join(' $\\to$ ') + '.}\\\\[4pt]\n';
    orden.forEach((paso, i)=>{
      const n = paso.nodo;
      const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
      const nuevas = paso.nuevas.filter(id=>conocidas[id] === undefined);
      const txN = [], txY = [], tsX = [], tsY = [], citas = [];
      const incogX = [], incogY = [];
      conec.forEach(b=>{
        const o = nodos.find(z=>z.id === (b.a===n.id ? b.b : b.a));
        const dx = o.x-n.x, dy = o.y-n.y, L = Math.hypot(dx,dy);
        const cx = dx/L, cy = dy/L, nb = nomB(b);
        const con = conocidas[b.id];
        if(Math.abs(cx) > 1e-9){
          txN.push({v:cx, tex:_coefAbs(cx) + 'F_{' + nb + '}'});
          if(con !== undefined) tsX.push({v:cx*con, tex:dec(Math.abs(cx*con),'f')});
          else { tsX.push({v:cx, tex:_coefAbs(cx) + 'F_{' + nb + '}'}); incogX.push({b, c:cx}); }
        }
        if(Math.abs(cy) > 1e-9){
          txY.push({v:cy, tex:_coefAbs(cy) + 'F_{' + nb + '}'});
          if(con !== undefined) tsY.push({v:cy*con, tex:dec(Math.abs(cy*con),'f')});
          else { tsY.push({v:cy, tex:_coefAbs(cy) + 'F_{' + nb + '}'}); incogY.push({b, c:cy}); }
        }
        if(con !== undefined && deQuien[b.id]) deQuien[b.id].forEach(q=>{ if(citas.indexOf(q) < 0) citas.push(q); });
      });
      const rc = resultado.reacciones[n.id];
      if(rc && rc.rx !== undefined && !esCero(rc.rx)){ txN.push({v:rc.rx, tex:dec(Math.abs(rc.rx),'f')}); tsX.push({v:rc.rx, tex:dec(Math.abs(rc.rx),'f')}); }
      if(rc && rc.ry !== undefined && !esCero(rc.ry)){ txY.push({v:rc.ry, tex:dec(Math.abs(rc.ry),'f')}); tsY.push({v:rc.ry, tex:dec(Math.abs(rc.ry),'f')}); }
      if(!esCero(n.fx)){ txN.push({v:n.fx, tex:dec(Math.abs(n.fx),'f')}); tsX.push({v:n.fx, tex:dec(Math.abs(n.fx),'f')}); }
      if(!esCero(n.fy)){ txY.push({v:n.fy, tex:dec(Math.abs(n.fy),'f')}); tsY.push({v:n.fy, tex:dec(Math.abs(n.fy),'f')}); }

      tex += '\\subpaso{Nudo ' + nomN(n) + '\\quad{\\normalfont\\footnotesize\\color{bsaMuted}' + conec.length + ' barra(s) \\textperiodcentered\\ '
        + (nuevas.length ? nuevas.length + ' inc\\\'ognita(s)' : 'comprobaci\\\'on') + '}}\n';
      const dclA = tikzDCLNudo(n, resultado, conocidas);
      tex += '\\begin{center}\\begin{tikzpicture}[scale=0.72]\n' + dclA.tikz + '\\end{tikzpicture}\\end{center}\n';
      tex += figCaption('DCL del nudo ' + nomN(n) + ': cargas, reacciones y fuerzas de barra. Las barras ya conocidas llevan su valor '
        + 'y su sentido real; las inc\\\'ognitas se suponen en tracci\\\'on.'
        + (dclA.angulos.length ? ' \\\'Angulos: ' + dclA.angulos.map(a=>'$' + a.letra + ' = ' + dec(a.valor,'f') + '^{\\circ}$').join(', ') + '.' : ''));
      const nx = ++eqN, ny = ++eqN;
      const citaTxt = citas.filter(q=>q !== 'fuerza cero');
      const filas = [];
      filas.push(_filaArm('\\xrightarrow{+}\\ \\sum F_x = 0:\\quad', txN, ' = 0\\qquad(' + nx + ')'));
      if(tsX.some(t=>t.tex !== txN.find(u=>u.tex===t.tex)?.tex)) filas.push(_filaArm('{\\footnotesize\\text{de } ' + _refsArm(citaTxt) + ':}\\quad', tsX, ' = 0'));
      filas.push(_filaArm('+\\!\\uparrow\\ \\sum F_y = 0:\\quad', txY, ' = 0\\qquad(' + ny + ')'));
      if(tsY.some(t=>t.tex !== txY.find(u=>u.tex===t.tex)?.tex)) filas.push(_filaArm('{\\footnotesize\\text{de } ' + _refsArm(citaTxt) + ':}\\quad', tsY, ' = 0'));
      // despeje: si una ecuación tiene una sola incógnita, se muestra la división
      nuevas.forEach(bid=>{
        const b = barras.find(x=>x.id===bid);
        const val = resultado.fuerzas[bid];
        const tipo = esCero(val) ? '\\ \\text{(fuerza cero)}' : (val > 0 ? '\\ \\text{(T)}' : '\\ \\text{(C)}');
        const sola = (incogX.length === 1 && incogX[0].b.id === bid) ? {eq:nx, c:incogX[0].c, ts:tsX}
                   : ((incogY.length === 1 && incogY[0].b.id === bid) ? {eq:ny, c:incogY[0].c, ts:tsY} : null);
        if(sola){
          const cte = sola.ts.filter(t=>t.tex.indexOf('F_') < 0).reduce((s,t)=>s+t.v, 0);
          filas.push('{\\footnotesize\\text{de } (' + sola.eq + '):}\\quad & F_{' + nomB(b) + '} = \\dfrac{' + dec(-cte,'f') + '}{' + dec(sola.c,'f') + '} = '
            + dec(val,'f') + '\\ \\text{' + escLatex(uF) + '}' + tipo);
        } else {
          filas.push('{\\footnotesize\\text{de } (' + nx + ') \\text{ y } (' + ny + '):}\\quad & F_{' + nomB(b) + '} = ' + dec(val,'f') + '\\ \\text{' + escLatex(uF) + '}' + tipo);
        }
        conocidas[bid] = val; deQuien[bid] = [nx, ny];
      });
      if(!nuevas.length) filas.push('& \\text{\\footnotesize todas las barras ya se conoc\\\'ian: las dos ecuaciones cierran, el nudo comprueba el resultado}');
      tex += _alineadaArm(filas);
      // Autocontrol: el nudo dibujado debe cerrar con los valores del motor.
      let sx = (rc && rc.rx) || 0, sy = (rc && rc.ry) || 0; sx += n.fx || 0; sy += n.fy || 0;
      conec.forEach(b=>{ const o = nodos.find(z=>z.id === (b.a===n.id ? b.b : b.a));
        const dx = o.x-n.x, dy = o.y-n.y, L = Math.hypot(dx,dy); const f = resultado.fuerzas[b.id]||0;
        sx += f*dx/L; sy += f*dy/L; });
      if(Math.max(Math.abs(sx), Math.abs(sy)) > 1e-5*Math.max(1, escalaDelProblema()))
        console.warn('Informe LaTeX: el DCL del nudo no cierra', {nudo:n.nombre, sx, sy});
    });
  } else {
    // ── Método de secciones (auto o manual) ──
    tex += '\\seccion{5. Paso 4 --- M\\\'etodo de secciones}\n';
    tex += porque('secciones',
      'Si toda la armadura est\\\'a en equilibrio, cualquier trozo lo est\\\'a. Un corte imaginario deja a la vista, como '
      + 'fuerzas externas, las fuerzas de las barras cortadas; el trozo aporta \\textbf{tres} ecuaciones, as\\\'i que el '
      + 'corte no debe atravesar m\\\'as de tres barras desconocidas. El arte est\\\'a en elegir la ecuaci\\\'on: momentos '
      + 'respecto del punto donde se cruzan dos inc\\\'ognitas, o fuerzas perpendiculares a dos inc\\\'ognitas paralelas, '
      + 'para que la tercera salga en un solo paso.');
    const escribirPaso = (items, datos, externas, lado, titulo) => {
      const nomLado = lado.map(id=>nomN(nodos.find(n=>n.id===id))).sort().join(', ');
      tex += '\\subpaso{' + titulo + '\\quad{\\normalfont\\footnotesize\\color{bsaMuted}porci\\\'on: ' + nomLado + '}}\n';
      const dcl = tikzSeccionPorcion(lado, datos, externas, items);
      tex += '\\begin{center}\\begin{tikzpicture}[scale=0.78]\n' + dcl.tikz + '\\end{tikzpicture}\\end{center}\n';
      tex += figCaption('Porci\\\'on aislada por el corte, con las fuerzas de las barras cortadas supuestas en tracci\\\'on y los centros de momento usados.'
        + (dcl.angulos.length ? ' \\\'Angulos: ' + dcl.angulos.map(a=>'$' + a.letra + ' = ' + dec(a.valor,'f') + '^{\\circ}$').join(', ') + '.' : ''));
      const filas = [];
      items.forEach(p=>{
        const nk = ++eqN;
        const terms = [{v:p.coef, tex:_coefAbs(p.coef) + 'F_{' + nomB(p.d.barra) + '}'}]
          .concat(p.detalle.map(x=>({v:x.val, tex:dec(Math.abs(x.val),'f')})));
        const etq = (p.tipo === 'momento')
          ? '\\circlearrowleft\\!+\\ \\sum M_{' + (p.centro && p.centro.nombre ? escLatex(p.centro.nombre) : 'O') + '} = 0:\\quad'
          : '+\\!\\nearrow\\ \\sum F_{\\perp} = 0:\\quad';
        filas.push(_filaArm(etq, terms, ' = 0\\qquad(' + nk + ')'));
        const tipo = esCero(p.val) ? '\\ \\text{(fuerza cero)}' : (p.val > 0 ? '\\ \\text{(T)}' : '\\ \\text{(C)}');
        filas.push('& F_{' + nomB(p.d.barra) + '} = ' + dec(p.val,'f') + '\\ \\text{' + escLatex(uF) + '}' + tipo);
        deQuien[p.d.barra.id] = [nk];
      });
      tex += _alineadaArm(filas);
    };
    if(modoCorte === 'auto'){
      const pasosAuto = buscarCortes();
      if(!pasosAuto.length){
        tex += '\\noindent{\\footnotesize No hay ning\\\'un corte que deje tres o menos inc\\\'ognitas: esta armadura '
          + 'exige empezar por el equilibrio de alg\\\'un nudo.}\\\\[4pt]\n';
      } else {
        const previas = {};
        cero.forEach(c=>{ previas[c.barra] = 0; });
        pasosAuto.forEach((paso, i)=>{
          const est = estrategiaPaso(paso, Object.assign({}, previas));
          escribirPaso(est.items, est.datos, est.externas, paso.lado, 'Corte ' + (i+1));
          Object.keys(paso.sol.valores).forEach(id=>{ previas[id] = paso.sol.valores[id]; });
        });
        const faltan = barras.filter(b=>previas[b.id] === undefined);
        if(faltan.length)
          tex += '\\noindent{\\footnotesize Las barras ' + faltan.map(b=>'$F_{' + nomB(b) + '}$').join(', ')
            + ' no salen de ning\\\'un corte v\\\'alido y se obtienen del equilibrio de un nudo; su valor est\\\'a en la tabla de resumen.}\\\\[4pt]\n';
      }
    } else {
      const info = analizarCorte();
      if(!info.valido){
        const motivos = {'sin-corte':'No se ha trazado ning\\\'un corte.', 'no-corta':'El corte no atraviesa ninguna barra.',
          'no-separa':'El corte no separa la armadura en dos partes.', 'muchas':'El corte deja m\\\'as de tres inc\\\'ognitas.'};
        tex += '\\noindent{\\footnotesize ' + (motivos[info.motivo] || 'El corte no es v\\\'alido.') + '}\\\\[4pt]\n';
      } else {
        const sol = resolverSeccion(info);
        escribirPaso(sol.pasos, sol.datos, sol.externas, info.lado, 'Corte manual');
      }
    }
  }

  // ══ 6. Resumen y comprobación ══
  tex += '\\seccion{6. Paso 5 --- Resumen y comprobaci\\\'on}\n';
  let filasB = '';
  barras.forEach((b, i)=>{
    const na = nodos.find(n=>n.id===b.a), nb = nodos.find(n=>n.id===b.b);
    const f = resultado.fuerzas[b.id] || 0, L = Math.hypot(nb.x-na.x, nb.y-na.y);
    const nat = esCero(f) ? '---' : (f >= 0 ? 'T' : 'C');
    const util = (hayCap && !esCero(f)) ? dec((f >= 0 ? f/capT : Math.abs(f)/capC)*100,'f') + '\\%' : '';
    const de = deQuien[b.id] ? _refsArm(deQuien[b.id].filter(q=>q !== 'fuerza cero')) || 'inspecci\\\'on' : '---';
    filasB += (i+1) + ' & $F_{' + nomB(b) + '}$ & ' + dec(L,'len') + ' & ' + dec(Math.abs(f),'f') + ' & ' + nat + ' & ' + de + (hayCap ? ' & ' + (util || '---') : '') + ' \\\\\n';
  });
  tex += tablaCaption('Fuerza axial en cada barra, su naturaleza (T = tracci\\\'on, C = compresi\\\'on) y de qu\\\'e ecuaci\\\'on sali\\\'o'
    + (hayCap ? '; \\\'ultima columna, aprovechamiento respecto de la capacidad admisible' : '') + '.');
  tex += '{\\footnotesize\\begin{center}\\begin{tabular}{clcccl' + (hayCap ? 'c' : '') + '}\\hline\n'
    + 'N\\textsuperscript{o} & Barra & $L$ [' + escLatex(uL) + '] & $|F|$ [' + escLatex(uF) + '] & T/C & de' + (hayCap ? ' & Uso' : '') + ' \\\\\\hline\n'
    + filasB + '\\hline\\end{tabular}\\end{center}}\n';
  tex += '\\noindent{\\footnotesize Comprobaci\\\'on: el \\\'ultimo nudo del recorrido no aporta inc\\\'ognitas nuevas, y sus dos '
    + 'ecuaciones cierran con los valores hallados. Adem\\\'as, $\\sum F_x$ y $\\sum F_y$ de toda la armadura (cargas m\\\'as reacciones) dan '
    + dec(sumFx + nodos.reduce((s,n)=>s + ((resultado.reacciones[n.id]||{}).rx||0),0),'f') + ' y '
    + dec(sumFy + nodos.reduce((s,n)=>s + ((resultado.reacciones[n.id]||{}).ry||0),0),'f') + ' ' + escLatex(uF) + '.}\\\\[4pt]\n';

  // ══ 7. ¿Qué pasa si cambio la carga? ══
  const analizarConEscala = k => {
    const orig = nodos.map(n=>({n, fx:n.fx, fy:n.fy}));
    nodos.forEach(n=>{ n.fx *= k; n.fy *= k; });
    const res = analizar();
    orig.forEach(o=>{ o.n.fx = o.fx; o.n.fy = o.fy; });
    return res;
  };
  if(cargasN.length){
    const resX2 = analizarConEscala(2), resD2 = analizarConEscala(0.5);
    tex += '\\seccion{7. \\textquestiondown Qu\\\'e pasa si cambio la carga?}\n';
    if(!resX2.error){
      tex += '\\begin{center}\\begin{tikzpicture}[scale=0.9]\n'
        + tikzArmaduraCompleta({fuerzas:resultado.fuerzas, reacciones:resultado.reacciones, cotas:false, valores:true, factorCargas:1})
        + '\\end{tikzpicture}\\end{center}\n' + figCaption('DCL con las cargas actuales: fuerza en cada barra.');
      tex += '\\begin{center}\\begin{tikzpicture}[scale=0.9]\n'
        + tikzArmaduraCompleta({fuerzas:resX2.fuerzas, reacciones:resX2.reacciones, cotas:false, valores:true, factorCargas:2})
        + '\\end{tikzpicture}\\end{center}\n' + figCaption('DCL con todas las cargas duplicadas: mismas barras, fuerzas recalculadas.');
    }
    let filasS = '', maxB = null, maxV = -1, cambia = 0;
    barras.forEach((b,i)=>{
      const base = resultado.fuerzas[b.id]||0;
      const x2 = resX2.error ? null : (resX2.fuerzas[b.id]||0), d2 = resD2.error ? null : (resD2.fuerzas[b.id]||0);
      if(x2 !== null && !esCero(base) && (x2 > 0) !== (base > 0)) cambia++;
      if(Math.abs(base) > maxV){ maxV = Math.abs(base); maxB = b; }
      filasS += (i+1) + ' & $F_{' + nomB(b) + '}$ & ' + dec(base,'f') + ' & ' + (x2===null?'---':dec(x2,'f')) + ' & ' + (d2===null?'---':dec(d2,'f')) + ' \\\\\n';
    });
    tex += tablaCaption('Fuerza en cada barra con la carga actual, con el doble y con la mitad (' + escLatex(uF) + ', signo seg\\\'un el convenio).');
    tex += '{\\footnotesize\\begin{center}\\begin{tabular}{clrrr}\\hline\n'
      + 'N\\textsuperscript{o} & Barra & Actual & Doble & Mitad \\\\\\hline\n' + filasS + '\\hline\\end{tabular}\\end{center}}\n';
    tex += '\\noindent{\\footnotesize\\textbf{Comentario.} Las ecuaciones de equilibrio son lineales en las cargas: al '
      + 'multiplicar \\textbf{todas} las cargas por un factor, cada fuerza de barra y cada reacci\\\'on se multiplican por '
      + 'el mismo factor, y ninguna barra cambia de naturaleza'
      + (cambia ? '' : ' (aqu\\\'i, ninguna)')
      + '. La barra m\\\'as solicitada sigue siendo la misma ($F_{' + nomB(maxB) + '}$), y por eso el reparto de fuerzas '
      + 'depende de la \\emph{geometr\\\'ia} y del \\emph{lugar} de las cargas, no de su magnitud. Cambiar solo una carga, '
      + 'o su direcci\\\'on, s\\\'i altera el reparto: entonces algunas barras crecen m\\\'as que otras y alguna puede pasar de '
      + 'tracci\\\'on a compresi\\\'on.}\\\\[4pt]\n';
  }

  // ══ 8. ¿Qué barra falla primero? ══
  if(hayCap){
    let nodosF = cargasN.slice();
    if(typeof simNodoId === 'number' && simNodoId !== null){
      const el = nodos.find(z=>z.id===simNodoId);
      if(el && (!esCero(el.fx)||!esCero(el.fy))) nodosF = [el];
    }
    let filasF = '', bloquesF = '';
    nodosF.forEach(n=>{
      const mag0 = Math.hypot(n.fx, n.fy); if(mag0 < 1e-9) return;
      const ux = n.fx/mag0, uy = n.fy/mag0, fx0 = n.fx, fy0 = n.fy;
      n.fx = 0; n.fy = 0; const r0 = analizar(); n.fx = fx0; n.fy = fy0; const r1 = analizar();
      if(r0.error || r1.error) return;
      let mejorP = null, mejorB = null, mejorLim = null;
      barras.forEach(b=>{
        const a = r0.fuerzas[b.id] || 0, k = ((r1.fuerzas[b.id]||0) - a)/mag0;
        if(Math.abs(k) < 1e-12) return;
        [capT, -capC].forEach(lim=>{ const P = (lim - a)/k;
          if(P > 1e-9 && (mejorP === null || P < mejorP)){ mejorP = P; mejorB = b; mejorLim = lim; } });
      });
      if(mejorP === null) return;
      const fF = {}; barras.forEach(b=>{ const a = r0.fuerzas[b.id]||0; fF[b.id] = a + ((r1.fuerzas[b.id]||0)-a)/mag0*mejorP; });
      n.fx = ux*mejorP; n.fy = uy*mejorP; const rF = analizar(); n.fx = fx0; n.fy = fy0;
      const enT = mejorLim > 0;
      filasF += nomN(n) + ' & ' + dec(mag0,'f') + ' & $F_{' + nomB(mejorB) + '}$ & ' + (enT ? 'T' : 'C') + ' & ' + dec(mejorP,'f') + ' & ' + dec(mejorP/mag0,'f') + ' \\\\\n';
      bloquesF += '\\begin{center}\\begin{tikzpicture}[scale=0.9]\n'
        + tikzArmaduraCompleta({fuerzas:fF, reacciones:(rF.error ? resultado.reacciones : rF.reacciones), cotas:false, valores:true, factorCargas:(mejorP/mag0), resaltar:mejorB.id})
        + '\\end{tikzpicture}\\end{center}\n'
        + figCaption('DCL en la carga de falla del nudo ' + nomN(n) + ' ($P = ' + dec(mejorP,'f') + '$ ' + escLatex(uF) + '): la barra '
          + '$F_{' + nomB(mejorB) + '}$, resaltada, alcanza justo su capacidad admisible en ' + (enT ? 'tracci\\\'on' : 'compresi\\\'on') + '.');
      bloquesF += '\\noindent{\\footnotesize\\textbf{Por qu\\\'e falla esa barra.} Con una sola carga variable $P$, la fuerza en cada barra es '
        + 'af\\\'in: $F = a + k\\,P$, con $a$ la fuerza debida a las dem\\\'as cargas y $k$ su sensibilidad. Cada barra tiene un '
        + 'l\\\'imite ($+' + dec(capT,'f') + '$ en tracci\\\'on, $-' + dec(capC,'f') + '$ en compresi\\\'on) y alcanza el suyo a una carga '
        + '$P^* = (F_{\\text{adm}} - a)/k$. La primera en llegar es $F_{' + nomB(mejorB) + '}$: no es necesariamente la de mayor '
        + 'fuerza hoy, sino la de mayor \\emph{aprovechamiento} y mayor crecimiento por unidad de carga.}\\\\[3pt]\n'
        + '\\noindent{\\footnotesize\\textbf{Por qu\\\'e no se puede seguir subiendo la carga.} La est\\\'atica solo dice cu\\\'anta fuerza lleva '
        + 'cada barra; \\textbf{no} dice si la barra la resiste. Eso lo fija la capacidad admisible, que viene del material y de la '
        + 'secci\\\'on: por encima de ella la barra en tracci\\\'on fluye o se rompe, y la barra en compresi\\\'on, adem\\\'as, puede '
        + '\\emph{pandear} (fallar por inestabilidad lateral bastante antes de agotar el material, tanto m\\\'as cuanto m\\\'as esbelta sea). '
        + 'Estudiar ese comportamiento \\textemdash esfuerzos, deformaciones, pandeo de Euler, factores de seguridad\\textemdash{} es '
        + 'materia de \\emph{Resistencia de Materiales} y de \\emph{Dise\\~no}, que vienen despu\\\'es de la Est\\\'atica. Aqu\\\'i basta '
        + 'con saber que la carga $P^* = ' + dec(mejorP,'f') + '$ ' + escLatex(uF) + ' es un techo: a partir de ah\\\'i la estructura ya no cumple.}\\\\[4pt]\n';
    });
    if(filasF){
      tex += '\\seccion{8. \\textquestiondown Qu\\\'e barra falla primero?}\n';
      tex += '\\noindent{\\footnotesize Capacidades admisibles: $F_{\\text{adm,T}} = ' + dec(capT,'f') + '$ y $F_{\\text{adm,C}} = ' + dec(capC,'f') + '$ ' + escLatex(uF) + '.}\\\\[3pt]\n';
      tex += tablaCaption('Carga de falla: barra cr\\\'itica, modo (T/C), valor de la carga en el que la alcanza y factor respecto de la carga actual.');
      tex += '{\\footnotesize\\begin{center}\\begin{tabular}{cccccc}\\hline\n'
        + 'Nudo & Carga actual & Barra cr\\\'itica & Modo & Falla en [' + escLatex(uF) + '] & Factor \\\\\\hline\n' + filasF + '\\hline\\end{tabular}\\end{center}}\n';
      tex += bloquesF;
    }
  }

  // ══ Referencias y colofón ══
  tex += '\\vspace{10pt}\\noindent{\\footnotesize\\color{bsaMuted}\\textbf{Referencias.} '
    + 'R.~C. Hibbeler, \\emph{Ingenier\\\'ia Mec\\\'anica: Est\\\'atica}, 12.\\textsuperscript{a} ed., cap.~6 \\textquotedblleft An\\\'alisis estructural\\textquotedblright. '
    + 'F.~P. Beer y E.~R. Johnston, \\emph{Mec\\\'anica vectorial para ingenieros: Est\\\'atica}, cap.~6.}\n';
  // Colofón (R20): el mismo bloque en los cinco temas, desde core/comun.js.
  tex += colofonLatexBSA();
  tex += '\\end{document}\n';
  return tex;
}
