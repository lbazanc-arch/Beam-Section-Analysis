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
// Lista de angulos de un DCL. Una letra compartida por dos angulos iguales se
// enuncia UNA sola vez (R21): "beta = 36.9" no se repite por cada barra.
function _angulosArm(angulos){
  if(!angulos || !angulos.length) return '';
  const vistas = [];
  angulos.forEach(a=>{ if(a.letra && !vistas.some(v=>v.letra === a.letra)) vistas.push(a); });
  return ' \\\'Angulos: ' + vistas.map(a=>'$' + a.letra + ' = ' + dec(a.valor,'ang') + '^{\\circ}$').join(', ') + '.';
}

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
// Varias ecuaciones de dos líneas en un align*, con 10 pt entre una y otra
// (2026-10-11, el profesor las veía muy juntas). `pares` es [[ecuación, resultado], …].
function _ecuacionesArm(pares){
  return '\\begin{align*}\n' + pares.map(p=>p.join(' \\\\\n')).join(' \\\\[10pt]\n') + '\n\\end{align*}\n';
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
// «(1)», «(1) y (2)», «(1), (2) y (4)». Con `enMath` la « y » va en \text{},
// porque dentro de una ecuación se comía los espacios: salía «(4)y(5)».
function _refsArm(ns, enMath){
  if(!ns.length) return '';
  if(ns.length === 1) return '(' + ns[0] + ')';
  const y = enMath ? ') \\text{ y } (' : ') y (';
  return '(' + ns.slice(0,-1).join('), (') + y + ns[ns.length-1] + ')';
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
  // Figura y pie en un solo bloque (minipage): no se separan de página y entre
  // los dos no queda el doble espacio que dejaban dos `center` seguidos. El
  // tikzpicture se ajusta a lo dibujado; `esc` es la constante de 12-. Las
  // figuras ya se dibujan dentro del ancho útil (tikzArmaduraCompleta); el
  // \resizebox es solo la red por si una estimación de rótulos se queda corta:
  // reduce la figura únicamente si pasa de \linewidth.
  const figura = (tikz, esc, txt) => { figN++;
    return '\n\\par\\medskip\\noindent\\begin{minipage}{\\linewidth}\\centering\n'
      + '\\resizebox{\\ifdim\\width>\\linewidth\\linewidth\\else\\width\\fi}{!}{%\n'
      + '\\begin{tikzpicture}[scale=' + esc + ']\n' + tikz + '\\end{tikzpicture}}\\par\\vspace{4pt}\n'
      + '{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '\\par}\n'
      + '\\end{minipage}\\par\\medskip\n'; };
  // \nopagebreak: el rótulo no se queda huérfano al pie de una página con la
  // tabla en la siguiente.
  const tablaCaption = txt => { tablaN++;
    return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };

  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});
  const j = nodos.length, m = barras.length;
  // Se cuenta por GRADOS del apoyo, no por componentes: un rodillo inclinado
  // deja rx y ry, pero sigue siendo una sola incógnita.
  const r = nodos.reduce((s,n)=> s + (resultado.reacciones[n.id] ? gradosApoyo(n) : 0), 0);
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
    + '\\definecolor{bsaAcc}{HTML}{7C5CD6}\n'
    + '\\definecolor{bsaAcc2}{HTML}{1D4ED8}\n'
    + '\\definecolor{bsaRoj}{HTML}{B3261E}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n'
    + '\\definecolor{bsaAlerta}{HTML}{DB2777}\n'
    + '\\definecolor{bsaMuted}{HTML}{6B7280}\n'
    + '\\definecolor{bsaNeutro}{HTML}{3D4550}\n'  // incógnitas de las figuras, a trazos (el gris de la pantalla)
    + '\\definecolor{bsaBarra}{HTML}{563AA8}\n'   // barras como en el panel de dibujo
    + '\\definecolor{bsaLogoB}{HTML}{CDA953}\n'
    + '\\definecolor{bsaLogoS}{HTML}{8AB4CA}\n'
    + '\\definecolor{bsaLogoA}{HTML}{22584B}\n\n'
    // Estilos de las figuras (12-latex.js). La punta de las fuerzas tiene
    // tamaño FIJO (no crece con el grosor ni con el `scale`), y sus medidas son
    // las de PUNTA_LARGO_CM y PUNTA_SEMI_CM, con las que se registra la flecha.
    + '\\tikzset{\n'
    + '  bsaFuerza/.style={line width=1.1pt, -{Stealth[length=2.4mm, width=1.8mm]}},\n'
    + '  bsaBarraDCL/.style={line width=1.1pt},\n'
    + '  bsaRot/.style={font=\\small, inner sep=1pt},\n'
    + '  bsaAng/.style={font=\\small, inner sep=0.5pt},\n'
    + '  bsaNudo/.style={font=\\small\\bfseries, inner sep=1pt},\n'
    + '  bsaCota/.style={font=\\scriptsize, fill=white, inner sep=1pt}\n'
    + '}\n\n'
    + '\\setlength{\\parskip}{2pt}\n'
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Armaduras}\\hfill\\footnotesize\\color{bsaMuted}' + nombreMetodo + '}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\ \\ \\textperiodcentered\\ \\ p\\\'ag.\\ \\thepage\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    + '\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\par\\addvspace{10pt}\\penalty-250\n'
    + '  \\noindent{\\large\\bfseries\\color{bsaAcc}#1}\\par\\nopagebreak\n'
    + '  \\vspace{3pt}\\nopagebreak\\hrule\\nopagebreak\\vspace{7pt}\\nopagebreak}\n'
    + '\\newcommand{\\subpaso}[1]{\\par\\addvspace{6pt}\\noindent{\\bfseries\\color{bsaAcc2}#1}\\par\\nopagebreak\\vspace{3pt}\\nopagebreak}\n'
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
  tex += figura(tikzArmaduraCompleta({cotas:true, valores:false, neutra:true, escala:ESC_GLOBAL}), ESC_GLOBAL,
    'Modelo de la armadura.' + _angulosArm(_angulosFigura));
  // Sin objetivo, «¿Por qué?» ni procedimiento (2026-10-11, directriz del
  // profesor: nada de conceptos). El convenio queda como leyenda de una línea.
  tex += '\\subpaso{Convenio de signos}\n'
    + '\\noindent{\\footnotesize $F > 0$: tracci\\\'on (T); $F < 0$: compresi\\\'on (C).\\quad '
    + '\\textcolor{bsaAcc2}{\\rule[0.06cm]{0.45cm}{1.6pt}} tracci\\\'on, \\textcolor{bsaRoj}{\\rule[0.06cm]{0.45cm}{1.6pt}} compresi\\\'on, '
    + '\\textcolor{bsaAcc}{\\rule[0.06cm]{0.45cm}{1.6pt}} cargas, \\textcolor{bsaVerde}{\\rule[0.06cm]{0.45cm}{1.6pt}} reacciones, '
    + '\\tikz[baseline=-0.6ex]\\draw[bsaNeutro, line width=1.1pt, dash pattern=on 3.6pt off 2.2pt] (0,0) -- (0.55,0); inc\\\'ognita.}\\par\n';

  // ══ 2. Determinación ══
  tex += '\\seccion{2. Paso 1 --- Determinaci\\\'on est\\\'atica}\n';
  const veredictoDet = (m + r === 2*j)
    ? '\\textbf{Armadura isost\\\'atica.}'
    : ((m + r < 2*j) ? '\\textbf{Armadura inestable.}' : '\\textbf{Armadura hiperest\\\'atica.}');
  tex += '\\[ m + r = 2j \\qquad\\Longrightarrow\\qquad ' + m + ' + ' + r + ' = 2\\cdot' + j
    + ' \\qquad\\Longrightarrow\\qquad ' + (m+r) + ' = ' + (2*j) + ((m + r === 2*j) ? '\\;\\checkmark' : '') + ' \\]\n'
    + '\\veredicto{' + veredictoDet + '}\n';
  // Se dice SIEMPRE si hay simetría (2026-10-11, directriz del profesor): si la
  // hay, el paso 4 resuelve solo la mitad.
  const simR = simetriaResolucion(resultado);
  const ejeSim = '$x = ' + dec(simR.eje,'len') + '$ ' + escLatex(uL);
  tex += '\\noindent{\\footnotesize ' + (simR.tipo === 'simetrica' ? 'Sim\\\'etrica respecto de ' + ejeSim + '.'
    : (simR.tipo === 'antisimetrica' ? 'Geometr\\\'ia sim\\\'etrica y carga antisim\\\'etrica respecto de ' + ejeSim + '.'
    : 'Sin simetr\\\'ia.')) + '}\\\\[4pt]\n';
  // Una línea por barra espejo: «$F_{EC} = F_{AD} = -12.02$ kN (C)».
  const lineasEspejo = espejos => {
    if(!espejos || !espejos.length) return '';
    return '\\[' + espejos.map(e=>{
      const v = resultado.fuerzas[e.barra];
      return 'F_{' + nomB(barras.find(x=>x.id===e.barra)) + '} = ' + (e.sg < 0 ? '-' : '') + 'F_{' + nomB(barras.find(x=>x.id===e.de)) + '} = '
        + dec(v,'f') + '\\ \\text{' + escLatex(uF) + '}' + (esCero(v) ? '' : (v > 0 ? '\\ \\text{(T)}' : '\\ \\text{(C)}'));
    }).join('\\qquad ') + '\\]\n';
  };
  const avisoSim = simR.tipo ? '\\noindent{\\footnotesize Por ' + (simR.tipo === 'simetrica' ? 'simetr\\\'ia' : 'antisimetr\\\'ia')
    + ' respecto de ' + ejeSim + ' se resuelve la mitad: cada barra espejo lleva la ' + (simR.tipo === 'simetrica' ? 'misma fuerza' : 'fuerza opuesta') + '.}\\\\[4pt]\n' : '';

  // ══ 3. Reacciones ══
  tex += '\\seccion{3. Paso 2 --- Reacciones en los apoyos}\n';
  const pines = nodos.filter(n=>n.apoyo==='fijo');
  const rodillos = nodos.filter(n=>n.apoyo==='movil');
  // Los momentos se toman en el pasador cuando hay pasador y rodillo; entonces
  // el DCL acota los brazos desde ahí en vez de repetir la geometría.
  const centroM = (pines.length===1 && rodillos.length===1) ? pines[0] : null;
  tex += figura(tikzArmaduraCompleta({cotas:!centroM, valores:false, reaccionesIncognita:true, brazosDesde:centroM, escala:ESC_GLOBAL}), ESC_GLOBAL,
    'DCL global.' + _angulosArm(_angulosFigura));
  const cargasN = nodos.filter(n=>!esCero(n.fx) || !esCero(n.fy));
  const sumFx = nodos.reduce((s,n)=>s+(n.fx||0),0), sumFy = nodos.reduce((s,n)=>s+(n.fy||0),0);
  const simbR = (n, comp) => 'R_{' + comp + nomN(n) + '}';
  const numEqReac = {};                    // 'yC' -> número de ecuación
  if(pines.length===1 && rodillos.length===1){
    // Caso de clase: pasador + rodillo. Momentos respecto del pasador, donde se
    // cruzan dos de las tres incógnitas: la del rodillo sale sola.
    const P = pines[0], Rn = rodillos[0];
    // La reacción del rodillo tiene la dirección declarada en su apoyo. Si cae
    // sobre un eje conserva el nombre de siempre (R_{yC}); si está inclinada,
    // la incógnita es la MAGNITUD sobre esa dirección y se llama R_C.
    const angR = anguloReaccionApoyo(Rn);
    const cosR = cosenosApoyo(Rn), ca = cosR.cx, sa = cosR.cy;
    const dir = {x:ca, y:sa};
    const inclin = (ca !== 0 && sa !== 0);
    const ejeX = (sa === 0 && ca > 0), ejeY = (ca === 0 && sa > 0);
    const compR = ejeX ? 'x' : (ejeY ? 'y' : 'd');
    const nR = ejeX ? simbR(Rn, 'x') : (ejeY ? simbR(Rn, 'y') : ('R_{' + nomN(Rn) + '}'));
    // El ángulo con el que se ESCRIBE la reacción es el agudo que acota la
    // figura (bsaAnguloAgudoEje, el mismo criterio que arcoAngulo), no el de 0 a
    // 360 con el que la guarda el modelo. Si el DCL enseña θ = 45° con la
    // vertical, las ecuaciones dicen R sen θ y R cos θ; el signo de cada
    // componente lo pone su sentido, no el ángulo. Antes se escribía cos 135°,
    // que no estaba en ninguna figura. La letra es la que le dio la figura.
    const agR = bsaAnguloAgudoEje(ca, sa);
    const letraR = (_angulosFigura.find(a => a.letra && Math.abs(a.valor - agR.grados) < 0.15) || {}).letra || '\\theta';
    const gradosR = dec(agR.grados,'ang') + '^{\\circ}';
    const ejeRefR = agR.desdeV ? 'vertical' : 'horizontal';
    // Desde la horizontal, x lleva cos e y sen; desde la vertical, al revés.
    const fnTrig = comp => (((comp === 'x') !== agR.desdeV) ? '\\cos' : '\\operatorname{sen}');
    const trigR = comp => fnTrig(comp) + ' ' + gradosR;
    const signoR = comp => ((comp === 'x' ? ca : sa) < 0 ? '-' : '');
    const f4 = v => (Math.round(v*10000)/10000).toFixed(4);
    const rc = resultado.reacciones[Rn.id], rp = resultado.reacciones[P.id];
    const valR = (rc.mag !== undefined) ? rc.mag : (compR === 'x' ? rc.rx : rc.ry);
    const terms = [];
    cargasN.forEach(n=>{
      if(!esCero(n.fy)){ const bz = n.x - P.x; if(Math.abs(bz) > 1e-9)
        terms.push({v:n.fy*bz, tex:dec(Math.abs(n.fy),'f') + '\\times' + dec(Math.abs(bz),'len')}); }
      if(!esCero(n.fx)){ const bz = -(n.y - P.y); if(Math.abs(bz) > 1e-9)
        terms.push({v:n.fx*bz, tex:dec(Math.abs(n.fx),'f') + '\\times' + dec(Math.abs(bz),'len')}); }
    });
    const coefR = (Rn.x-P.x)*dir.y - (Rn.y-P.y)*dir.x;
    const cte = terms.reduce((s,t)=>s+t.v, 0);
    // Con el rodillo inclinado, el procedimiento tiene que verse: primero la
    // reacción se descompone con su ángulo, y después el brazo respecto del
    // pasador se desarrolla con sus distancias. Si no, el coeficiente de la
    // ecuación de momentos aparecería como un número sin explicación.
    if(inclin){
      const dxR = Rn.x - P.x, dyR = Rn.y - P.y;
      tex += _alineadaArm([
        'R_{x' + nomN(Rn) + '} &= ' + signoR('x') + nR + fnTrig('x') + letraR + ' = ' + signoR('x') + nR + trigR('x') + ' = ' + f4(ca) + '\\,' + nR,
        'R_{y' + nomN(Rn) + '} &= ' + signoR('y') + nR + fnTrig('y') + letraR + ' = ' + signoR('y') + nR + trigR('y') + ' = ' + f4(sa) + '\\,' + nR
      ]);
      tex += _alineadaArm([
        'M_{' + nomN(P) + '} &= (x_{' + nomN(Rn) + '} - x_{' + nomN(P) + '})\\,R_{y' + nomN(Rn) + '}'
          + ' - (y_{' + nomN(Rn) + '} - y_{' + nomN(P) + '})\\,R_{x' + nomN(Rn) + '}',
        '&= (' + dec(dxR,'len') + ')\\,(' + f4(sa) + '\\,' + nR + ') - (' + dec(dyR,'len') + ')\\,(' + f4(ca) + '\\,' + nR + ')',
        '&= \\left[' + dec(dxR,'len') + '\\times' + f4(sa) + ' - ' + dec(dyR,'len') + '\\times' + f4(ca)
          + '\\right]' + nR + ' = ' + dec(coefR,'len') + '\\,' + nR
      ]);
    }
    // Autocontrol: el despeje escrito debe dar el valor que trae el motor.
    if(Math.abs(coefR) > 1e-9 && Math.abs(-cte/coefR - valR) > 1e-5*Math.max(1, escalaDelProblema()))
      console.warn('Informe LaTeX: el despeje no reproduce el valor de ' + Rn.nombre,
                   {informe:-cte/coefR, motor:valR});
    const n1 = ++eqN; numEqReac[compR + Rn.id] = n1;
    const filasM = [];
    filasM.push(_filaArm('\\circlearrowleft\\!+\\ \\sum M_{' + nomN(P) + '} = 0:\\quad',
      terms.concat([{v:coefR, tex:_coefAbs(coefR) + nR}]), ' = 0\\qquad(' + n1 + ')'));
    // Dos líneas por ecuación (2026-10-11, directriz del profesor): la suma y,
    // debajo, la incógnita con su valor; sin la división ni la sustitución.
    filasM.push('& ' + nR + ' = ' + dec(valR,'f') + '\\ \\text{' + escLatex(uF) + '}');
    tex += _alineadaArm(filasM);
    // ΣFy y ΣFx, citando (n1) al sustituir
    const otras = [['y', '+\\!\\uparrow\\ \\sum F_y = 0:\\quad', sumFy, dir.y, rp.ry],
                   ['x', '\\xrightarrow{+}\\ \\sum F_x = 0:\\quad', sumFx, dir.x, rp.rx]];
    otras.forEach(([comp, etq, sumF, dR, valP])=>{
      const nP = simbR(P, comp);
      // Con el rodillo inclinado, su aportación a cada suma se escribe como
      // R cos(alfa) y R sen(alfa), no como un coeficiente ya multiplicado.
      const t = [{v:1, tex:nP}];
      if(Math.abs(dR) > 1e-9) t.push({v: inclin ? Math.sign(dR) : 1, tex: inclin ? (nR + trigR(comp)) : nR});
      if(!esCero(sumF)) t.push({v:sumF, tex:dec(Math.abs(sumF),'f')});
      const nk = ++eqN; numEqReac[comp + P.id] = nk;
      const f = [];
      f.push(_filaArm(etq, t, ' = 0\\qquad(' + nk + ')'));
      f.push('& ' + nP + ' = ' + dec(valP,'f') + '\\ \\text{' + escLatex(uF) + '}');
      tex += _alineadaArm(f);
      // Autocontrol: lo escrito debe reproducir la reacción que trae el motor.
      if(Math.abs(valP + sumF + dR*valR) > 1e-5*Math.max(1, escalaDelProblema()))
        console.warn('Informe LaTeX: el despeje no reproduce el valor de ' + P.nombre + comp,
                     {informe:-(sumF + dR*valR), motor:valP});
    });
  } else {
    tex += '\\[ \\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M = 0 \\]\n';
  }
  // Tabla de reacciones, con el sentido real en icono
  let filasReac = '', hayInclinado = false;
  nodos.forEach(n=>{
    const rc = resultado.reacciones[n.id]; if(!rc) return;
    // Un rodillo inclinado se lista primero por su magnitud y su dirección, que
    // es la incógnita que se ha resuelto, y después por sus dos componentes.
    if(rc.inclinado){
      hayInclinado = true;
      // Su dirección se da como en la figura y en las ecuaciones: el ángulo
      // agudo con el eje más cercano, no el de 0 a 360 del modelo.
      const agT = bsaAnguloAgudoEje(Math.cos(rc.ang*Math.PI/180), Math.sin(rc.ang*Math.PI/180));
      filasReac += '$R_{' + nomN(n) + '}$ {\\footnotesize(a ' + dec(agT.grados,'ang') + '$^{\\circ}$ de la '
        + (agT.desdeV ? 'vertical' : 'horizontal') + ')} & $'
        + dec(rc.mag,'f') + '$\\,' + escLatex(uF) + ' & ' + _iconoSentido(rc.rx, rc.ry) + ' \\\\\n';
    }
    if(rc.rx !== undefined) filasReac += '$' + simbR(n,'x') + '$ & $' + dec(rc.rx,'f') + '$\\,' + escLatex(uF) + ' & ' + _iconoSentido(rc.rx, 0) + ' \\\\\n';
    if(rc.ry !== undefined) filasReac += '$' + simbR(n,'y') + '$ & $' + dec(rc.ry,'f') + '$\\,' + escLatex(uF) + ' & ' + _iconoSentido(0, rc.ry) + ' \\\\\n';
  });
  tex += tablaCaption('Reacciones en los apoyos, con su sentido real.');
  tex += '\\resultado{\\centering\\small\\begin{tabular}{@{}crc@{}}\\hline\n'
    + '\\textbf{Reacci\\\'on} & \\textbf{Valor} & \\textbf{Sentido real} \\\\\\hline\n' + filasReac
    + '\\hline\\end{tabular}}\n';

  // ══ 4. Fuerza cero ══
  tex += '\\seccion{4. Paso 3 --- Barras de fuerza cero}\n';
  const cero = miembrosCero();
  if(cero.length){
    let f = '';
    cero.forEach(c=>{ const b = barras.find(x=>x.id===c.barra);
      f += '$F_{' + nomB(b) + '}$ & ' + escLatex(c.nudo) + ' & ' + (c.regla===2 ? 'dos barras no colineales, sin carga ni apoyo' : 'tres barras, dos colineales, sin carga') + ' \\\\\n'; });
    tex += tablaCaption('Barras de fuerza cero por inspecci\\\'on.');
    tex += '{\\footnotesize\\begin{center}\\begin{tabular}{ccl}\\hline\nBarra & Nudo & Regla \\\\\\hline\n' + f + '\\hline\\end{tabular}\\end{center}}\n';
  } else {
    tex += '\\noindent{\\footnotesize Ninguna por inspecci\\\'on.}\\\\[4pt]\n';
  }

  // ══ 5. Método ══
  const deQuien = {};      // barraId -> [números de ecuación de los que salió]
  if(!usaSecciones){
    tex += '\\seccion{5. Paso 4 --- M\\\'etodo de nudos}\n';
    const conocidas = {};   // barraId -> valor conocido
    cero.forEach(c=>{ conocidas[c.barra] = 0; deQuien[c.barra] = ['fuerza cero']; });
    // Con simetría, los nudos que ya no despejan nada se omiten (planNudos, 06-).
    const orden = planNudos(resultado).pasos.filter(p => !simR.tipo || p.nuevas.some(id=>conocidas[id] === undefined));
    tex += avisoSim;
    tex += '\\noindent{\\footnotesize Orden de resoluci\\\'on: ' + orden.map(p=>nomN(p.nodo)).join(' $\\to$ ') + '.}\\\\[4pt]\n';
    orden.forEach((paso, i)=>{
      const n = paso.nodo;
      const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
      const nuevas = paso.nuevas.filter(id=>conocidas[id] === undefined);
      const txN = [], txY = [], tsX = [], tsY = [];
      // Cada fila de sustitución cita solo las ecuaciones de las que salieron
      // los valores QUE ESA FILA sustituye: una barra horizontal no entra en
      // ΣF_y y no se cita ahí. Antes se citaban todas en las dos filas.
      const citasX = [], citasY = [];
      const citar = (lista, b) => (deQuien[b.id] || []).forEach(q => { if(q !== 'fuerza cero' && lista.indexOf(q) < 0) lista.push(q); });
      const incogX = [], incogY = [];
      conec.forEach(b=>{
        const o = nodos.find(z=>z.id === (b.a===n.id ? b.b : b.a));
        const dx = o.x-n.x, dy = o.y-n.y, L = Math.hypot(dx,dy);
        const cx = dx/L, cy = dy/L, nb = nomB(b);
        const con = conocidas[b.id];
        if(Math.abs(cx) > 1e-9){
          txN.push({v:cx, tex:_coefAbs(cx) + 'F_{' + nb + '}'});
          if(con !== undefined){ tsX.push({v:cx*con, tex:dec(Math.abs(cx*con),'f')}); citar(citasX, b); }
          else { tsX.push({v:cx, tex:_coefAbs(cx) + 'F_{' + nb + '}'}); incogX.push({b, c:cx}); }
        }
        if(Math.abs(cy) > 1e-9){
          txY.push({v:cy, tex:_coefAbs(cy) + 'F_{' + nb + '}'});
          if(con !== undefined){ tsY.push({v:cy*con, tex:dec(Math.abs(cy*con),'f')}); citar(citasY, b); }
          else { tsY.push({v:cy, tex:_coefAbs(cy) + 'F_{' + nb + '}'}); incogY.push({b, c:cy}); }
        }
      });
      const rc = resultado.reacciones[n.id];
      if(rc && rc.rx !== undefined && !esCero(rc.rx)){ txN.push({v:rc.rx, tex:dec(Math.abs(rc.rx),'f')}); tsX.push({v:rc.rx, tex:dec(Math.abs(rc.rx),'f')}); }
      if(rc && rc.ry !== undefined && !esCero(rc.ry)){ txY.push({v:rc.ry, tex:dec(Math.abs(rc.ry),'f')}); tsY.push({v:rc.ry, tex:dec(Math.abs(rc.ry),'f')}); }
      if(!esCero(n.fx)){ txN.push({v:n.fx, tex:dec(Math.abs(n.fx),'f')}); tsX.push({v:n.fx, tex:dec(Math.abs(n.fx),'f')}); }
      if(!esCero(n.fy)){ txY.push({v:n.fy, tex:dec(Math.abs(n.fy),'f')}); tsY.push({v:n.fy, tex:dec(Math.abs(n.fy),'f')}); }

      tex += '\\subpaso{Nudo ' + nomN(n) + '\\quad{\\normalfont\\footnotesize\\color{bsaMuted}' + conec.length + ' barra(s) \\textperiodcentered\\ '
        + (nuevas.length ? nuevas.length + ' inc\\\'ognita(s)' : 'comprobaci\\\'on') + '}}\n';
      const dclA = tikzDCLNudo(n, resultado, ESC_NUDO, nuevas);
      tex += figura(dclA.tikz, ESC_NUDO, 'DCL del nudo ' + nomN(n) + '.' + _angulosArm(dclA.angulos));
      // Dos líneas por ecuación (2026-10-11, directriz del profesor): la suma
      // igualada a cero y, debajo, la barra que se despeja de ELLA con su valor.
      // Una barra sale de la ecuación que la tiene como única incógnita, o de
      // aquella cuyas otras incógnitas ya se despejaron en este nudo; si ninguna
      // la deja sola, las dos forman un sistema: la segunda línea de cada una es
      // la expresión reducida y los valores van juntos debajo. Una ecuación que no
      // despeja nada es comprobación: lo ya hallado sustituido, igual a cero.
      const eqs = [
        {etq:'\\xrightarrow{+}\\ \\sum F_x = 0:\\quad', tx:txN, ts:tsX, inc:incogX, barras:[]},
        {etq:'+\\!\\uparrow\\ \\sum F_y = 0:\\quad', tx:txY, ts:tsY, inc:incogY, barras:[]}
      ];
      const solaDe = bid => eqs.find(e => e.inc.length === 1 && e.inc[0].b.id === bid) || null;
      // Primero las que salen solas: las demás se apoyan en ellas.
      const ordenNuevas = nuevas.slice().sort((p, q) => (solaDe(q) ? 1 : 0) - (solaDe(p) ? 1 : 0));
      const resueltoEn = (e, bid) => e.inc.some(q => q.b.id === bid) && e.inc.every(q => q.b.id === bid || conocidas[q.b.id] !== undefined);
      // Se despeja mientras haya avance; lo que queda va junto, como sistema.
      // Una barra del sistema no cuenta como conocida hasta el final: si no, la
      // otra parecería salir sola de una ecuación que en realidad tiene dos.
      const usadas = [];
      let sistema = ordenNuevas.slice(), avanza = true;
      while(sistema.length && avanza){
        avanza = false;
        sistema = sistema.filter(bid=>{
          const e = solaDe(bid) || eqs.find(q => resueltoEn(q, bid));
          if(!e) return true;
          e.barras.push(bid); if(usadas.indexOf(e) < 0) usadas.push(e);
          conocidas[bid] = resultado.fuerzas[bid]; avanza = true;
          return false;
        });
      }
      sistema.forEach(bid=>{ conocidas[bid] = resultado.fuerzas[bid]; });
      eqs.forEach(e=>{ if(usadas.indexOf(e) < 0) usadas.push(e); });
      const tipoDe = v => esCero(v) ? '\\ \\text{(fuerza cero)}' : (v > 0 ? '\\ \\text{(T)}' : '\\ \\text{(C)}');
      const valorBarra = bid => 'F_{' + nomB(barras.find(x=>x.id===bid)) + '} = ' + dec(resultado.fuerzas[bid],'f')
        + '\\ \\text{' + escLatex(uF) + '}' + tipoDe(resultado.fuerzas[bid]);
      const cambia = (ts, tx) => ts.some((t, i) => !tx[i] || t.tex !== tx[i].tex);
      const pares = [], numsSis = [];
      usadas.forEach(e=>{
        e.n = ++eqN;
        const par = [_filaArm(e.etq, e.tx, ' = 0\\qquad(' + e.n + ')')];
        e.barras.forEach(bid=>{ par.push('& ' + valorBarra(bid)); deQuien[bid] = [e.n]; });
        if(!e.barras.length && e.tx.length){
          const enSis = e.inc.filter(q => sistema.indexOf(q.b.id) >= 0);
          if(enSis.length){
            numsSis.push(e.n);
            const cte = e.ts.filter(t => t.tex.indexOf('F_') < 0).reduce((s,t)=>s + t.v, 0);
            par.push(_filaArm('', enSis.map(q=>({v:q.c, tex:_coefAbs(q.c) + 'F_{' + nomB(q.b) + '}'})), ' = ' + dec(-cte,'f') + '\\ \\text{' + escLatex(uF) + '}'));
          } else if(cambia(e.ts, e.tx) || e.inc.length){
            // Las barras halladas en este mismo nudo entran ya con su valor.
            let k = 0;
            const num = e.ts.map(t=>{
              if(t.tex.indexOf('F_') < 0) return t;
              const q = e.inc[k++], v = q.c*(resultado.fuerzas[q.b.id] || 0);
              return {v, tex:dec(Math.abs(v),'f')};
            }).filter(t => !esCero(t.v));
            par.push(_filaArm('', num, ' = 0\\ \\checkmark'));
          }
        }
        pares.push(par);
      });
      tex += _ecuacionesArm(pares);
      if(sistema.length){
        sistema.forEach(bid=>{ deQuien[bid] = numsSis.slice(); });
        tex += '\\[' + sistema.map(valorBarra).join('\\qquad ') + '\\]\n';
      }
      // Lo que da la simetría: las barras espejo, ya conocidas para lo que sigue.
      const esp = paso.espejos.filter(e=>conocidas[e.barra] === undefined);
      tex += lineasEspejo(esp);
      esp.forEach(e=>{ conocidas[e.barra] = resultado.fuerzas[e.barra]; deQuien[e.barra] = ['simetr\\\'ia']; });
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
    tex += avisoSim;
    const escribirPaso = (items, datos, externas, lado, titulo, cortadas, ref, espejos) => {
      const nomLado = lado.map(id=>nomN(nodos.find(n=>n.id===id))).sort().join(', ');
      tex += '\\subpaso{' + titulo + '\\quad{\\normalfont\\footnotesize\\color{bsaMuted}porci\\\'on: ' + nomLado + '}}\n';
      // El corte sobre la armadura entera, curvo y pasando por las barras que
      // corta (trazoCorte, 15-; 2026-10-11, petición del profesor).
      const tr = trazoCorte(cortadas, ref);
      if(tr) tex += figura(tikzArmaduraCompleta({neutra:true, cotas:false, corte:tr.pts, cortadas:cortadas.map(x=>x.id), escala:ESC_VARIANTE}),
        ESC_VARIANTE, titulo + ' (a--a).');
      const dcl = tikzSeccionPorcion(lado, datos, externas, items, ESC_PORCION);
      // Ecuaciones del corte: ΣM respecto del NUDO por el que pasan las otras
      // incógnitas (o de un punto O rotulado en su figura de brazos si no hay
      // nudo) y, para la última, ΣF_x o ΣF_y con las ya halladas en este corte
      // sustituidas y citadas. Nunca una suma en un eje inclinado (revisión del PDF).
      const etqC = etiquetasCentros(items);
      let filas = [];
      const vaciar = () => { if(filas.length){ tex += _ecuacionesArm(filas); filas = []; } };
      tex += figura(dcl.tikz, ESC_PORCION, 'Porci\\\'on aislada por el corte.' + _angulosArm(dcl.angulos));
      items.forEach((p, i)=>{
        const nk = ++eqN;
        const terms = [{v:p.coef, tex:_coefAbs(p.coef) + 'F_{' + nomB(p.d.barra) + '}'}]
          .concat(p.detalle.map(x=>({v:x.val, tex:dec(Math.abs(x.val),'f')})));
        let etq;
        if(p.tipo === 'momento'){
          const c = etqC[i], nomC = c ? c.tex : 'O';
          // Antes de la ecuación, la figura de brazos de ESTE centro (R10: las
          // cotas de los brazos, siempre desde el punto de momentos).
          vaciar();
          const br = tikzBrazosCorte(lado, datos, p, nomC, ESC_BRAZOS);
          // Un punto O que no es nudo se define en el pie de la figura que lo dibuja.
          const defO = (c && !c.esNudo) ? ' $' + c.tex + ' = (' + dec(c.x,'len') + ';\\ ' + dec(c.y,'len') + ')$ ' + escLatex(unitLen) + '.' : '';
          tex += figura(br.tikz, ESC_BRAZOS, 'Brazos de $\\sum M_{' + nomC + '}$' + (br.enPorcion ? '' : ' ($' + nomC + '$ fuera de la porci\\\'on)') + '.' + defO + _angulosArm(br.angulos));
          etq = '\\circlearrowleft\\!+\\ \\sum M_{' + nomC + '} = 0:\\quad';
        } else {
          etq = (p.eje === 'x') ? '\\xrightarrow{+}\\ \\sum F_x = 0:\\quad' : '+\\!\\uparrow\\ \\sum F_y = 0:\\quad';
        }
        const par = [_filaArm(etq, terms, ' = 0\\qquad(' + nk + ')')];
        const tipo = esCero(p.val) ? '\\ \\text{(fuerza cero)}' : (p.val > 0 ? '\\ \\text{(T)}' : '\\ \\text{(C)}');
        par.push('& F_{' + nomB(p.d.barra) + '} = ' + dec(p.val,'f') + '\\ \\text{' + escLatex(uF) + '}' + tipo);
        filas.push(par);
        deQuien[p.d.barra.id] = [nk];
      });
      vaciar();
      tex += lineasEspejo(espejos);
      (espejos || []).forEach(e=>{ deQuien[e.barra] = ['simetr\\\'ia']; });
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
          escribirPaso(est.items, est.datos, est.externas, paso.lado, 'Corte ' + (i+1), paso.cortadas, null, paso.espejos);
          Object.keys(paso.sol.valores).forEach(id=>{ previas[id] = paso.sol.valores[id]; });
          (paso.espejos || []).forEach(e=>{ previas[e.barra] = resultado.fuerzas[e.barra]; });
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
        const esp = [], hallado = {};
        sol.pasos.forEach(q=>{ hallado[q.d.barra.id] = true; });
        if(simR.tipo) sol.pasos.forEach(q=>{ const e = simR.espejo[q.d.barra.id];
          if(e && !hallado[e.otro]){ hallado[e.otro] = true; esp.push({barra:e.otro, de:q.d.barra.id, sg:e.sg}); } });
        escribirPaso(sol.pasos, sol.datos, sol.externas, info.lado, 'Corte manual', info.cortadas, corte, esp);
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
    const dq = deQuien[b.id];
    const de = !dq ? '---' : (dq[0] === 'simetr\\\'ia' ? 'simetr\\\'ia' : (_refsArm(dq.filter(q=>q !== 'fuerza cero')) || 'inspecci\\\'on'));
    filasB += (i+1) + ' & $F_{' + nomB(b) + '}$ & ' + dec(L,'len') + ' & ' + dec(Math.abs(f),'f') + ' & ' + nat + ' & ' + de + (hayCap ? ' & ' + (util || '---') : '') + ' \\\\\n';
  });
  tex += tablaCaption('Fuerza axial en cada barra.');
  tex += '{\\footnotesize\\begin{center}\\begin{tabular}{clcccl' + (hayCap ? 'c' : '') + '}\\hline\n'
    + 'N\\textsuperscript{o} & Barra & $L$ [' + escLatex(uL) + '] & $|F|$ [' + escLatex(uF) + '] & T/C & de' + (hayCap ? ' & Uso' : '') + ' \\\\\\hline\n'
    + filasB + '\\hline\\end{tabular}\\end{center}}\n';
  // Comprobación global en una línea de ecuaciones, sin frase (2026-10-11).
  tex += '\\[ \\textstyle\\sum F_x = ' + dec(sumFx + nodos.reduce((s,n)=>s + ((resultado.reacciones[n.id]||{}).rx||0),0),'f')
    + '\\qquad \\sum F_y = ' + dec(sumFy + nodos.reduce((s,n)=>s + ((resultado.reacciones[n.id]||{}).ry||0),0),'f')
    + '\\ \\text{' + escLatex(uF) + '}\\ \\checkmark \\]\n';
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
      tex += figura(tikzArmaduraCompleta({fuerzas:resultado.fuerzas, reacciones:resultado.reacciones, cotas:false, valores:true, factorCargas:1, escala:ESC_VARIANTE}),
        ESC_VARIANTE, 'Cargas actuales.');
      tex += figura(tikzArmaduraCompleta({fuerzas:resX2.fuerzas, reacciones:resX2.reacciones, cotas:false, valores:true, factorCargas:2, escala:ESC_VARIANTE}),
        ESC_VARIANTE, 'Cargas duplicadas.');
    }
    let filasS = '', maxB = null, maxV = -1, cambia = 0;
    barras.forEach((b,i)=>{
      const base = resultado.fuerzas[b.id]||0;
      const x2 = resX2.error ? null : (resX2.fuerzas[b.id]||0), d2 = resD2.error ? null : (resD2.fuerzas[b.id]||0);
      if(x2 !== null && !esCero(base) && (x2 > 0) !== (base > 0)) cambia++;
      if(Math.abs(base) > maxV){ maxV = Math.abs(base); maxB = b; }
      filasS += (i+1) + ' & $F_{' + nomB(b) + '}$ & ' + dec(base,'f') + ' & ' + (x2===null?'---':dec(x2,'f')) + ' & ' + (d2===null?'---':dec(d2,'f')) + ' \\\\\n';
    });
    tex += tablaCaption('Fuerza en cada barra (' + escLatex(uF) + ').');
    tex += '{\\footnotesize\\begin{center}\\begin{tabular}{clrrr}\\hline\n'
      + 'N\\textsuperscript{o} & Barra & Actual & Doble & Mitad \\\\\\hline\n' + filasS + '\\hline\\end{tabular}\\end{center}}\n';
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
      bloquesF += figura(tikzArmaduraCompleta({fuerzas:fF, reacciones:(rF.error ? resultado.reacciones : rF.reacciones), cotas:false, valores:true, factorCargas:(mejorP/mag0), resaltar:mejorB.id, escala:ESC_VARIANTE}),
        ESC_VARIANTE, 'Carga de falla $P = ' + dec(mejorP,'f') + '$ ' + escLatex(uF) + ': $F_{' + nomB(mejorB) + '}$ en ' + (enT ? 'tracci\\\'on' : 'compresi\\\'on') + '.');
    });
    if(filasF){
      tex += '\\seccion{8. \\textquestiondown Qu\\\'e barra falla primero?}\n';
      tex += '\\noindent{\\footnotesize Capacidades admisibles: $F_{\\text{adm,T}} = ' + dec(capT,'f') + '$ y $F_{\\text{adm,C}} = ' + dec(capC,'f') + '$ ' + escLatex(uF) + '.}\\\\[3pt]\n';
      tex += tablaCaption('Carga de falla.');
      tex += '{\\footnotesize\\begin{center}\\begin{tabular}{cccccc}\\hline\n'
        + 'Nudo & Carga actual & Barra cr\\\'itica & Modo & Falla en [' + escLatex(uF) + '] & Factor \\\\\\hline\n' + filasF + '\\hline\\end{tabular}\\end{center}}\n';
      tex += bloquesF;
    }
  }

  // ══ Colofón ══ (sin lista de referencias desde el 2026-10-11, decisión del profesor)
  // Colofón (R20): el mismo bloque en los cinco temas, desde core/comun.js.
  tex += colofonLatexBSA();
  tex += '\\end{document}\n';
  return tex;
}
