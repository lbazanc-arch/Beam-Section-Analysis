// ═══════════════════════════════════════════════════════════
//  INFORME LaTeX · una clase paso a paso (Hibbeler cap. 10, §10.1–10.7)
//  Planteamiento y convenio → propiedades de cada parte → centroide de la
//  sección → teorema de Steiner y tabla de inercias → ejes principales →
//  círculo de Mohr → (punto P y ejes girados, si se pidieron) →
//  comprobaciones → colofón.
//  Sigue las mismas reglas de redacción que los informes de fuerzas internas
//  y armaduras (fuerzas-internas/LEEME.md, «Reglas de redacción»): cada
//  explicación una sola vez, tablas numeradas y citadas, resultados en tabla y
//  desarrollos en texto, colofón BSA. Las figuras iguales se desarrollan una
//  sola vez, y si están en espejo respecto de un eje de la sección se dice y
//  se aprovecha (mismas inercias, producto de inercia opuesto).
// ═══════════════════════════════════════════════════════════

// ── Registro de explicaciones ya dadas (R1) ──
let _yaDichoIn = {};
function _primeraVezIn(clave){
  if(_yaDichoIn[clave]) return false;
  _yaDichoIn[clave] = true;
  return true;
}

// ── Figuras iguales y simetría de la sección ──
// Dos figuras son «iguales» si coinciden tipo, dimensiones, signo y giro: su
// área, su centroide propio y sus inercias propias son las mismas y se
// desarrollan una sola vez. Si además están en espejo respecto del eje
// vertical u horizontal que parte la sección por la mitad, se dice, porque
// entonces Steiner también se hace una vez: mismas Ix e Iy, Pxy opuesto.
// Solo cuentan como «en espejo» los tipos simétricos respecto de su propio
// eje: un triángulo rectángulo o un ángulo reflejados ya no son la misma figura.
const _SIM_V_IN = {rect:1, circle:1, semicircle:1, sector:1, wshape:1};
const _SIM_H_IN = {rect:1, circle:1, wshape:1, channel:1};
function _claveFiguraIn(f){
  const rot = (((f.rotation||0) % 360) + 360) % 360;
  return f.type + '|' + JSON.stringify(f.dims) + '|' + f.sign + '|' + rot.toFixed(3);
}
// Eje de simetría candidato: el centro de la caja envolvente de la sección.
// Se contrasta contra él y NO contra el centroide calculado, para que la
// comprobación de simetría del final sea una comprobación de verdad.
function _envolventeIn(steps){
  const cajas = steps.map(s=>figuraBoundsMundo(s.fig));
  const minX = Math.min(...cajas.map(c=>c.left)),   maxX = Math.max(...cajas.map(c=>c.right));
  const minY = Math.min(...cajas.map(c=>c.bottom)), maxY = Math.max(...cajas.map(c=>c.top));
  return {minX, maxX, minY, maxY, x0:(minX+maxX)/2, y0:(minY+maxY)/2,
          tol: 1e-6*Math.max(1, maxX-minX, maxY-minY)};
}
function _gruposFigurasIn(steps, env){
  const grupos = [], pos = {};
  steps.forEach((st,i)=>{
    const k = _claveFiguraIn(st.fig);
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
    if(sinGiro && _SIM_V_IN[f0.type] && espejo(espV)) g.simetria = 'vertical';
    else if(sinGiro && _SIM_H_IN[f0.type] && espejo(espH)) g.simetria = 'horizontal';
  });
  return grupos;
}
function _simetriaSeccionIn(steps, env){
  const figs = steps.map(s=>s.fig);
  const igual = (a,b)=>_claveFiguraIn(a) === _claveFiguraIn(b);
  const sinGiro = f=>Math.abs(f.rotation||0) < 1e-9;
  const v = figs.every(a=>sinGiro(a) && _SIM_V_IN[a.type]
    && figs.some(b=>igual(a,b) && Math.abs(a.cy-b.cy)<env.tol && Math.abs(a.cx+b.cx-2*env.x0)<env.tol));
  const h = figs.every(a=>sinGiro(a) && _SIM_H_IN[a.type]
    && figs.some(b=>igual(a,b) && Math.abs(a.cx-b.cx)<env.tol && Math.abs(a.cy+b.cy-2*env.y0)<env.tol));
  return {v, h};
}

// ── Tabla con la fila del catálogo de un perfil, en las unidades de la tabla ──
// Es lo que el alumno consultaría en el Apéndice C: se imprime antes de usar
// sus valores, para que se vea de dónde sale cada número.
function _tablaPerfilTex(f, tablaCaption){
  const fam = famPorId(f.perfil.fam); if(!fam) return '';
  const r = (STEEL[fam.id]||[]).find(x=>x[0]===f.perfil.nom); if(!r) return '';
  const u = fam.u, si = (u === 'mm');
  const uA = u + '\\textsuperscript{2}';
  const uI = si ? '10\\textsuperscript{6} mm\\textsuperscript{4}' : 'in\\textsuperscript{4}';
  const uS = si ? '10\\textsuperscript{3} mm\\textsuperscript{3}' : 'in\\textsuperscript{3}';
  const cab = [], fila = [];
  const c = (t,un,v)=>{ cab.push('\\textbf{' + t + '}' + (un ? ' {\\tiny(' + un + ')}' : '')); fila.push(v); };
  c('Designación', '', escLatex(r[0]));
  if(fam.tipo === 'angleL'){
    const igual = fam.id.startsWith('LI');
    c('$b_1$',u,r[1]); c('$b_2$',u,r[2]); c('$t$',u,r[3]); c('$A$',uA,r[4]);
    if(igual){ c('$I$',uI,r[5]); c('$S$',uS,r[6]); c('$r$',u,r[7]); c('$\\bar{x}=\\bar{y}$',u,r[8]); c('$r_z$',u,r[9]); }
    else { c('$I_x$',uI,r[5]); c('$S_x$',uS,r[6]); c('$r_x$',u,r[7]); c('$\\bar{y}$',u,r[8]);
           c('$I_y$',uI,r[9]); c('$S_y$',uS,r[10]); c('$r_y$',u,r[11]); c('$\\bar{x}$',u,r[12]);
           c('$r_z$',u,r[13]); c('$\\tan\\alpha$','',r[14]); }
  } else {
    c('$d$',u,r[1]); c('$b_f$',u,r[2]); c('$t_f$',u,r[3]); c('$t_w$',u,r[4]); c('$A$',uA,r[5]);
    c('$I_x$',uI,r[6]); c('$S_x$',uS,r[7]); c('$r_x$',u,r[8]); c('$I_y$',uI,r[9]); c('$S_y$',uS,r[10]); c('$r_y$',u,r[11]);
    if(fam.tipo === 'channel') c('$\\bar{x}$',u,r[12]);
  }
  let s = tablaCaption('Propiedades tabuladas del perfil ' + escLatex(r[0]) + ' (' + escLatex(fam.nom) + ', '
    + escLatex(fam.sist) + '; Beer \\& Johnston, \\emph{Mecánica de materiales}, Apéndice C).');
  // Más de doce columnas (ángulo de lados desiguales) no caben en el ancho de
  // la página: la fila se parte en dos tramos de columnas, uno bajo el otro.
  const porTramo = cab.length > 12 ? Math.ceil(cab.length/2) : cab.length;
  s += '{\\scriptsize\\setlength{\\tabcolsep}{3.5pt}\\begin{tablacentrada}\n';
  for(let i = 0; i < cab.length; i += porTramo){
    const c2 = cab.slice(i, i+porTramo), f2 = fila.slice(i, i+porTramo);
    s += '\\begin{tabular}{' + 'c'.repeat(c2.length) + '}\\hline\n'
       + c2.join(' & ') + '\\\\\\hline\n' + f2.join(' & ') + '\\\\\\hline\\end{tabular}'
       + (i + porTramo < cab.length ? '\\\\[4pt]\n' : '\n');
  }
  s += '\\end{tablacentrada}}\n';
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
  if(!results){ aviso('Primero calcula el momento de inercia.'); return null; }
  _yaDichoIn = {};
  const st = results.steps;
  const u1 = unit, u2 = unit+'\u00b2', u4 = unit+'\u2074';
  const U1 = '\\,' + utex(u1), U2 = '\\,' + utex(u2), U4 = '\\,' + utex(u4);
  const nombreDe = f => escLatex(f.etiqueta || f.name || FIG_DEFS[f.type].name);
  const env = _envolventeIn(st);
  const grupos = _gruposFigurasIn(st, env);
  const simSec = _simetriaSeccionIn(st, env);
  // Centro y radio del círculo de Mohr, con las MISMAS expresiones que usa
  // tikzMohr para situar los puntos: si divergieran, el texto describiría un
  // círculo distinto del dibujado.
  const mAvg = (results.Ix + results.Iy) / 2;
  const mR   = Math.sqrt(Math.pow((results.Ix - results.Iy) / 2, 2) + results.Ixy * results.Ixy);
  const rel = (a,b)=>Math.abs(a-b) > 1e-9*Math.max(1, Math.abs(a), Math.abs(b));

  // ── Autocomprobación: lo que se va a escribir (Steiner parte a parte y las
  // sumas de la tabla) debe reproducir lo que calculó el motor.
  {
    let A=0, Qx=0, Qy=0, Ix=0, Iy=0, Ixy=0, mal=false;
    st.forEach(s=>{
      const g = s.fig.sign;
      A += s.a*g; Qx += s.a*g*s.fig.cy; Qy += s.a*g*s.fig.cx;
      const ixf = (s.Ixc + s.a*s.dy*s.dy)*g, iyf = (s.Iyc + s.a*s.dx*s.dx)*g, pf = (s.Ixyc + s.a*s.dx*s.dy)*g;
      if(rel(ixf, s.Ix_f) || rel(iyf, s.Iy_f) || rel(pf, s.Ixy_f)) mal = true;
      Ix += ixf; Iy += iyf; Ixy += pf;
    });
    if(mal || rel(Qy/A, results.xbar) || rel(Qx/A, results.ybar)
       || rel(Ix, results.Ix) || rel(Iy, results.Iy) || rel(Ixy, results.Ixy)
       || rel(mAvg + mR, results.Imax) || rel(mAvg - mR, results.Imin))
      console.warn('Informe LaTeX: el desarrollo de Steiner no reproduce la inercia');
  }

  // Figuras y tablas se numeran en el orden en que aparecen: el documento se
  // arma sección por sección y se guarda el número de la tabla que se cita.
  let figN = 0, tablaN = 0;
  // Lámina y pie en el MISMO entorno, con \nopagebreak entre ambos: si van
  // en dos «center» seguidos, el salto de página puede caer justo entre la
  // figura y su «Figura N.».
  const lamina = (cuerpo, txt) => { figN++;
    return '\\begin{center}\n\\begin{tikzpicture}[scale=1]\n' + cuerpo
      + '\\end{tikzpicture}\\par\\nopagebreak\\vspace{4pt}\n'
      + '{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\n\\end{center}\n\\vspace{4pt}\n'; };
  const tablaCaption = txt => { tablaN++;
    return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };
  const porque = (clave, txt) => _primeraVezIn(clave) ? '\\porque{' + txt + '}\n' : '';
  const nota = (clave, txt) => _primeraVezIn(clave) ? '{\\footnotesize ' + txt + '}\\\\[3pt]\n' : '';
  const cab = (t, f, u) => '\\textbf{' + t + '}' + (f.cab ? ' {\\scriptsize$' + f.cab + '$}' : '')
                         + (u ? ' {\\scriptsize(' + u + ')}' : '');
  const listaNums = ns => ns.length === 1 ? String(ns[0])
    : ns.slice(0,-1).join(', ') + ' y ' + ns[ns.length-1];
  // Una fórmula con su sustitución y su valor en una línea. Si la «sustitución»
  // es solo una aclaración en texto (perfiles, ángulo, sector), va como nota.
  const lineaFormula = (sim, sus, valor, unidad) => {
    if(!sus) return '\\[ ' + sim + ' = ' + valor + unidad + ' \\]\n';
    if(sus.indexOf('\\text{') === 0) return '\\[ ' + sim + ' = ' + valor + unidad + ' \\]\n'
      + '{\\footnotesize $' + sus + '$.}\\\\[2pt]\n';
    return '\\[ ' + sim + ' = ' + sus + ' = ' + valor + unidad + ' \\]\n';
  };

  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});

  let tex = '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.0cm]{geometry}\n'
    + '\\usepackage{amsmath,amssymb}\n\\usepackage{tikz}\n'
    + '\\usetikzlibrary{patterns,arrows.meta,calc}\n\\usepackage{xcolor}\n\n'
    + '\\definecolor{bsaAcc}{HTML}{0D3A8F}\n'
    + '\\definecolor{bsaAcc2}{HTML}{1D4ED8}\n'
    + '\\definecolor{bsaAlerta}{HTML}{B8860C}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n'
    + '\\definecolor{bsaMuted}{HTML}{6B7280}\n'
    + '\\definecolor{bsaLogoB}{HTML}{CDA953}\n'
    + '\\definecolor{bsaLogoS}{HTML}{8AB4CA}\n'
    + '\\definecolor{bsaLogoA}{HTML}{22584B}\n'
    // Mismo rojo que usa el círculo de Mohr en pantalla, para que el ángulo
    // 2·theta_p se lea igual en la app y en el PDF.
    + '\\definecolor{bsaRojo}{HTML}{C0392B}\n\n'
    + '\\setlength{\\parskip}{2pt}\n'
    // Encabezado y pie corridos en TODAS las páginas: el informe se imprime y
    // se reparte suelto, así que cada hoja dice de qué tema es.
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Momentos de inercia}\\hfill'
    + '\\footnotesize\\color{bsaMuted}Áreas compuestas, ejes principales y círculo de Mohr}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\ \\ \\textperiodcentered\\ \\ pág.\\ \\thepage\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    // El seno en notación española. Sin esta macro, el centroide del sector
    // circular aborta la compilación con "Undefined control sequence".
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
    + '\\begin{document}\n\n'
    + '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Momentos de inercia de una sección compuesta}\\\\[3pt]\n'
    + '  {\\large\\color{bsaAcc2} Centroide, teorema de los ejes paralelos, ejes principales y círculo de Mohr}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Informe generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{6pt}\n\n';

  // ══ 1. Planteamiento ══
  tex += '\\seccion{1. Planteamiento del problema}\n';
  tex += lamina(tikzSeccionCompuesta({cotas:true, numerar:true}),
    'Sección compuesta: partes numeradas y cotas generales; las rayadas son huecos.');
  tex += '\\begin{center}\n\\begin{tabular}{@{}ll@{\\hspace{18pt}}ll@{}}\n'
    + '\\tikz{\\filldraw[fill=bsaAcc2, fill opacity=0.30, draw=bsaAcc2] (0,0) rectangle (0.35,0.22);} & '
    + '{\\footnotesize Área que suma} & '
    + '\\tikz{\\filldraw[pattern=north east lines, pattern color=bsaAcc2, draw=bsaAcc2, dashed] (0,0) rectangle (0.35,0.22);} & '
    + '{\\footnotesize Área que resta (hueco)}\\\\\n'
    + '\\end{tabular}\n\\end{center}\n\\vspace{4pt}\n';

  tex += '\\subpaso{Objetivo}\n'
    + 'Hallar los momentos de inercia $\\bar{I}_x$, $\\bar{I}_y$ y el producto de inercia $\\bar{P}_{xy}$ de la sección '
    + 'respecto de los ejes que pasan por su centroide $C$; a partir de ellos, el momento polar, los radios de giro, '
    + 'la orientación de los ejes principales y las inercias máxima y mínima, y representar todo en el círculo de Mohr.\n';
  tex += porque('inercia',
    'El momento de inercia de un área, $I_x = \\int y^{2}\\,dA$, aparece al calcular el momento de una carga que crece '
    + 'con la distancia al eje: la presión del agua sobre una compuerta o los esfuerzos de flexión en una viga. Cada '
    + 'elemento de área contribuye con su área por el \\emph{cuadrado} de su distancia, así que el material alejado del '
    + 'eje cuenta mucho más que el cercano: por eso una viga en I es rígida con poco material. Es siempre positivo y '
    + 'se mide en longitud a la cuarta. El producto de inercia, $P_{xy} = \\int xy\\,dA$, mide en cambio la '
    + '\\emph{asimetría} del área respecto de los ejes y puede ser positivo, negativo o nulo.');

  tex += '\\subpaso{Procedimiento de análisis}\n'
    + '\\begin{enumerate}\\setlength{\\itemsep}{1pt}\n'
    + '\\item \\textbf{Partes.} Se divide la sección en figuras de inercia conocida; un hueco es una parte más, que se '
    + 'resta entera.\n'
    + '\\item \\textbf{Propiedades de cada parte.} Área, centroide propio, inercias propias respecto de sus ejes '
    + 'centroidales (fórmulas de la tabla de figuras) y posición $\\tilde{x}_i$, $\\tilde{y}_i$ desde $O$.\n'
    + '\\item \\textbf{Centroide de la sección.} Con la tabla de áreas y momentos estáticos, como en el tema de centroides.\n'
    + '\\item \\textbf{Teorema de los ejes paralelos.} Cada inercia propia se traslada al centroide de la sección '
    + 'sumando $A_i d^{2}$, y se suman las partes.\n'
    + '\\item \\textbf{Ejes principales.} El ángulo $\\theta_p$ que anula el producto de inercia y las inercias '
    + 'máxima y mínima; el círculo de Mohr los reúne en un solo dibujo.\n'
    + '\\item \\textbf{Comprobaciones.} Invariantes, orden de las inercias y simetría.\n'
    + '\\end{enumerate}\n';

  tex += '\\subpaso{Convenio}\n'
    + '\\noindent Las posiciones se miden desde el origen $O$ de los ejes $X$ e $Y$ del dibujo, positivas hacia la '
    + 'derecha y hacia arriba. La tilde ($\\tilde{x}_i$) señala el centroide de una parte; la barra ($\\bar{x}$, '
    + '$\\bar{I}_x$), magnitudes referidas al centroide de \\emph{toda} la sección. Los ángulos se miden desde el eje '
    + '$x$, positivos en sentido antihorario. En el círculo de Mohr el eje $x$ de la sección es el punto '
    + '$A(\\bar{I}_x,\\ \\bar{P}_{xy})$ y el eje $y$ el punto $B(\\bar{I}_y,\\ -\\bar{P}_{xy})$.\n';

  // ══ 2. Paso 1: propiedades de cada parte ══
  tex += '\\seccion{2. Paso 1 --- Propiedades de cada parte}\n';
  tex += '\\noindent Cada parte se trata como una figura aislada: área, centroide propio, inercias propias y '
    + 'posición desde $O$. El croquis acotado va al costado de su desarrollo.\n';
  grupos.forEach((g, gi)=>{
    const i0 = g.idx[0], s0 = st[i0], f = s0.fig;
    const nums = g.idx.map(i=>i+1);
    const fa = formulaArea(f);
    const fi = formulaInercia(f);
    const cl = centroideLocalTex(f);
    const giro = f.rotation || 0;
    const girada = Math.abs(giro) >= 0.005;
    const varios = g.idx.length > 1;

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
            + 'sección por la mitad: comparten área, centroide propio, inercias propias y $\\tilde{y}$; solo cambia '
            + '$\\tilde{x}$. Se desarrollan una sola vez, y en el paso 3 se verá que aportan las mismas $\\bar{I}_x$ e '
            + '$\\bar{I}_y$ y productos de inercia opuestos.'
          : g.simetria === 'horizontal'
          ? 'Las ' + g.idx.length + ' partes son iguales y están en \\textbf{espejo respecto del eje horizontal} que parte la '
            + 'sección por la mitad: comparten área, centroide propio, inercias propias y $\\tilde{x}$; solo cambia '
            + '$\\tilde{y}$. Se desarrollan una sola vez, y en el paso 3 se verá que aportan las mismas $\\bar{I}_x$ e '
            + '$\\bar{I}_y$ y productos de inercia opuestos.'
          : 'Las ' + g.idx.length + ' partes son iguales (mismo tipo y dimensiones): área, centroide e inercias propias '
            + 'se calculan una sola vez; cada una entra en las tablas con su propia posición.') + '}\\\\[4pt]\n';
    }

    // Un perfil laminado es UNA parte con propiedades tabuladas: antes del
    // desarrollo se imprime su fila del catálogo (a todo el ancho).
    const tb = f.perfil ? perfilTab(f) : null;
    const fam = tb ? famPorId(f.perfil.fam) : null;
    if(tb){
      tex += _tablaPerfilTex(f, tablaCaption);
    }

    // Ecuaciones en display con menos aire: dentro del bloque de una parte hay
    // seis o siete seguidas y con el espaciado normal el bloque no cabe.
    tex += '\\noindent\\begin{minipage}[t]{0.60\\textwidth}\n\\small\n'
         + '\\abovedisplayskip=3pt\\belowdisplayskip=3pt\\abovedisplayshortskip=2pt\\belowdisplayshortskip=2pt\n';

    if(tb){
      // Valores tabulados, convertidos a la unidad del aplicativo.
      const conv = fam && (fam.u !== unit || fam.u === 'mm');
      // Cada ecuación en su propia línea: una sola línea con tres valores se
      // salía de la minipage y se montaba sobre el croquis de la derecha.
      tex += '\\textbf{Valores de la tabla' + (conv ? ' en ' + utexto(u1) : '') + '}\n';
      tex += '\\[ A_i = ' + ftex(s0.a) + U2 + ' \\]\n';
      tex += '\\[ \\bar{I}_x = ' + ftex(s0.Ixc0) + U4 + ' \\qquad \\bar{I}_y = ' + ftex(s0.Iyc0) + U4 + ' \\]\n';
      if(f.type === 'angleL'){
        const Imin = tb.A*tb.rz*tb.rz, Rm = (tb.Ix + tb.Iy)/2 - Imin;
        tex += porque('pxy-angulo',
          'El producto de inercia del ángulo no viene tabulado, pero sí su radio de giro mínimo $r_z$, el del eje '
          + 'principal menor: $I_{\\min} = A\\,r_z^{2}$. En el círculo de Mohr del perfil, $I_{\\min}$ es el corte '
          + 'izquierdo con el eje horizontal, así que el radio vale $R = (\\bar{I}_x+\\bar{I}_y)/2 - I_{\\min}$, y el '
          + 'punto $A(\\bar{I}_x,\\ \\bar{P}_{xy})$ está sobre el círculo: $|\\bar{P}_{xy}| = \\sqrt{R^{2} - '
          + '((\\bar{I}_x-\\bar{I}_y)/2)^{2}}$. El signo es negativo tal como se dibuja el ángulo, con las alas hacia '
          + '$+x$ y $+y$: su material queda en el segundo y el cuarto cuadrante de sus ejes centroidales.');
        tex += '\\[ I_{\\min} = A\\,r_z^{2} = (' + ftex(tb.A) + ')(' + decP(tb.rz,'len') + ')^{2} = ' + ftex(Imin) + U4 + ' \\]\n';
        tex += '\\[ R = \\dfrac{\\bar{I}_x+\\bar{I}_y}{2} - I_{\\min} = ' + ftex(Rm) + U4 + ' \\]\n';
        tex += '\\[ \\bar{P}_{xy} = -\\sqrt{R^{2} - \\left(\\dfrac{\\bar{I}_x-\\bar{I}_y}{2}\\right)^{2}} = '
             + ftex(s0.Ixyc0) + U4 + ' \\]\n';
      } else {
        tex += '\\[ \\bar{P}_{xy} = 0 \\quad (\\text{' + (f.type === 'wshape' ? 'doble simetría' : 'eje horizontal de simetría') + '}) \\]\n';
      }
      if(f.type === 'channel')
        tex += '{\\footnotesize El centroide del canal está a $\\bar{x} = ' + decP(tb.xb,'len') + U1
             + '$ del respaldo del alma (tabulado); el dibujo lo respeta.}\\\\[2pt]\n';
      if(f.type === 'angleL')
        tex += '{\\footnotesize El centroide del ángulo está a $\\bar{x} = ' + decP(tb.xb,'len') + U1 + '$ y $\\bar{y} = '
             + decP(tb.yb !== undefined ? tb.yb : tb.xb,'len') + U1 + '$ del vértice (tabulados); el dibujo los respeta.}\\\\[2pt]\n';
    } else {
    // Área
    tex += '\\textbf{Área}\n';
    if(fa.sim.indexOf('\\quad') >= 0)
      tex += '\\[ ' + fa.sim + ' \\]\n\\[ ' + fa.sus + ' = ' + ftex(s0.a) + U2 + ' \\]\n';
    else
      tex += lineaFormula(fa.sim, fa.sus.replace(/^A_i = /, ''), ftex(s0.a), U2);
    if(f.sign < 0){
      tex += porque('hueco',
        'Un hueco es material que falta: se calcula como si la figura estuviera llena y se le \\textbf{resta entera}. '
        + 'Eso significa restar su área en el centroide y, en las inercias, restar tanto su inercia propia como su '
        + 'término de traslado $A d^{2}$. Restar solo el área, o solo el traslado, deja el hueco a medias.');
    }

    // Centroide propio, con la razón de la fórmula la primera vez (R1).
    if(cl){
      tex += '\\textbf{Centroide propio}\n';
      tex += '\\[ ' + cl + ' \\]\n';
      if(f.type === 'rtriangle' || f.type === 'rtriangle2')
        tex += porque('tri', 'El centroide de un triángulo está a un tercio de la altura desde la base y a un tercio '
          + 'de la base desde el cateto vertical: es donde se cruzan las medianas (Hibbeler, ej. 9.3).');
      else if(f.type === 'semicircle' || f.type === 'quarter')
        tex += porque('semi', 'En un semicírculo o un cuarto de círculo hay más área cerca del diámetro que cerca del '
          + 'arco, así que el centroide queda a $4R/3\\pi \\approx 0.42\\,R$ del diámetro, no a $R/2$ (Hibbeler, ej. 9.4).');
      else if(f.type === 'sector')
        tex += porque('sector', 'El sector de semiángulo $\\theta$ tiene el centroide sobre su bisectriz, a '
          + '$2R\\sen\\theta/3\\theta$ del vértice: tiende a $2R/3$ si es estrecho y a $4R/3\\pi$ si se abre a semicírculo.');
    }

    // Inercias propias, sobre los ejes de la figura sin girar. En el
    // triángulo el signo del producto se escribe (no «±»): depende de hacia
    // dónde mira la hipotenusa.
    const sg = (f.type === 'rtriangle') ? '-' : '';
    const simP = fi.ixy.sim.replace('\\pm', sg), susP = (fi.ixy.sus || '').replace('\\pm', sg);
    tex += '\\textbf{Inercias propias' + (girada ? ' (ejes de la figura)' : '') + '}\n';
    tex += lineaFormula(fi.ix.sim, fi.ix.sus, ftex(s0.Ixc0), U4);
    tex += lineaFormula(fi.iy.sim, fi.iy.sus, ftex(s0.Iyc0), U4);
    // Cuando el producto es nulo por simetría, la propia fórmula ya lo dice y
    // su razón: repetir «= 0 mm^4» detrás sobraba.
    if(Math.abs(s0.Ixyc0) < 1e-12 && susP === '0') tex += '\\[ ' + simP + ' \\]\n';
    else tex += lineaFormula(simP, susP, ftex(s0.Ixyc0), U4);
    if(f.type === 'rtriangle' || f.type === 'rtriangle2')
      tex += porque('pxy-tri', 'El producto de inercia de un triángulo rectángulo respecto de sus ejes centroidales vale '
        + '$b^{2}h^{2}/72$ en valor absoluto. El signo lo da el reparto del material: es \\textbf{negativo} cuando la '
        + 'hipotenusa mira hacia el primer cuadrante (más área en el segundo y el cuarto, donde $xy < 0$) y '
        + '\\textbf{positivo} cuando mira hacia el segundo.');
    else if(Math.abs(s0.Ixyc0) < 1e-12)
      tex += porque('pxy-cero', 'Si la figura tiene un eje de simetría, a cada elemento de área en $(x, y)$ le '
        + 'corresponde otro igual en $(x, -y)$ (o en $(-x, y)$): los productos $xy$ se cancelan de dos en dos y '
        + '$\\bar{P}_{xy} = 0$. Un eje de simetría es siempre un eje principal de la figura.');
    }   // fin de la rama «no es perfil»

    // Giro a ejes paralelos a x-y
    if(girada){
      const c2 = Math.cos(2*giro*Math.PI/180).toFixed(4), s2 = Math.sin(2*giro*Math.PI/180).toFixed(4);
      tex += '\\textbf{Giro a ejes paralelos a $x$ e $y$}\n';
      tex += porque('giro',
        'Las inercias propias de la tabla están referidas a los ejes de la figura. Si la figura está colocada '
        + 'girada un ángulo $\\beta$, antes de trasladarlas hay que llevarlas a ejes paralelos a $x$ e $y$ con las '
        + 'ecuaciones de transformación (las mismas que giran los ejes en el paso 4, con $\\beta$ en lugar de '
        + '$\\theta$). El giro no cambia $\\bar{I}_x + \\bar{I}_y$: solo reparte la inercia entre los dos ejes.');
      // Las tres ecuaciones de transformación se escriben una sola vez (R1):
      // repetirlas en cada parte girada hacía que ningún par de partes cupiera
      // en una página.
      if(_primeraVezIn('giro-formulas'))
        tex += '\\[ \\bar{I}_{x}\' = \\dfrac{\\bar{I}_x+\\bar{I}_y}{2} + \\dfrac{\\bar{I}_x-\\bar{I}_y}{2}\\cos 2\\beta + \\bar{P}_{xy}\\sen 2\\beta \\]\n'
             + '\\[ \\bar{I}_{y}\' = \\dfrac{\\bar{I}_x+\\bar{I}_y}{2} - \\dfrac{\\bar{I}_x-\\bar{I}_y}{2}\\cos 2\\beta - \\bar{P}_{xy}\\sen 2\\beta \\]\n'
             + '\\[ \\bar{P}_{xy}\' = -\\dfrac{\\bar{I}_x-\\bar{I}_y}{2}\\sen 2\\beta + \\bar{P}_{xy}\\cos 2\\beta \\]\n';
      // Cuatro decimales, no los del usuario: con dos, quien quiera rehacer la
      // sustitución a mano no reproduce el resultado.
      tex += '{\\footnotesize Con $\\beta = ' + decP(giro,'ang') + '^\\circ$, $\\cos 2\\beta = ' + c2
           + '$ y $\\sen 2\\beta = ' + s2 + '$' + (_yaDichoIn['giro-valores'] ? ' en las ecuaciones de giro' : '') + ':}\n';
      _yaDichoIn['giro-valores'] = true;
      tex += '\\[ \\bar{I}_{x}\' = ' + ftex(s0.Ixc) + U4 + ' \\qquad \\bar{I}_{y}\' = ' + ftex(s0.Iyc) + U4
           + ' \\qquad \\bar{P}_{xy}\' = ' + ftex(s0.Ixyc) + U4 + ' \\]\n';
    }

    // Posición desde O, una línea por parte del grupo.
    tex += '\\textbf{Posición desde $O$}\n';
    tex += porque('posicion',
      '$\\tilde{x}_i$ e $\\tilde{y}_i$ son las coordenadas del centroide de la parte medidas desde $O$. Sirven para '
      + 'dos cosas: localizar el centroide de la sección (paso 2) y, restándoles $\\bar{x}$ e $\\bar{y}$, obtener '
      + 'las distancias $d_x$, $d_y$ del traslado de Steiner (paso 3).');
    g.idx.forEach(i=>{
      const s = st[i];
      tex += '\\[ \\tilde{x}_{' + (i+1) + '} = ' + decP(s.fig.cx,'len') + U1
           + ' \\qquad \\tilde{y}_{' + (i+1) + '} = ' + decP(s.fig.cy,'len') + U1 + ' \\]\n';
    });

    tex += '\\end{minipage}\\hfill\n';
    tex += '\\begin{minipage}[t]{0.36\\textwidth}\n\\vspace{0pt}\n\\begin{center}\n';
    // El croquis acotado de siempre (con el giro β si lo hay) y, en un perfil,
    // debajo la ficha con la notación de la tabla: las dos cosas, porque sin el
    // croquis no se reconoce la figura ni se ve cómo está girada.
    tex += tikzCroquisFigura(f, 3.6) + '\n\n\\vspace{3pt}\n';
    tex += '{\\scriptsize\\color{bsaMuted}Croquis acotado en ' + utexto(u1)
         + (girada ? ', girado $\\beta = ' + decP(giro,'ang') + '^\\circ$' : '') + '}\n';
    if(tb){
      tex += '\\\\[8pt]\n' + _tikzFichaPerfil(f.type) + '\n\n\\vspace{3pt}\n'
           + '{\\scriptsize\\color{bsaMuted}Notación de la tabla, según Beer \\& Johnston, Apéndice C}\n';
    }
    tex += '\\end{center}\n\\end{minipage}\n\\end{minipage}\n\n\\vspace{4pt}\n';
  });

  // ══ 3. Paso 2: centroide de la sección ══
  tex += '\\seccion{3. Paso 2 --- Centroide de la sección}\n';
  tex += porque('centroide-antes',
    'El teorema de los ejes paralelos solo funciona a partir de un eje \\emph{centroidal}, y las inercias que se '
    + 'buscan son las de la sección respecto de \\emph{su} centroide. Por eso hay que localizarlo antes, con la misma '
    + 'tabla de áreas y momentos estáticos del tema de centroides: el producto $A_i\\tilde{x}_i$ es el momento '
    + 'estático de la parte, área por brazo, y el cociente entre el momento total y el área total da $\\bar{x}$.');
  let tNumA;
  {
    const fA  = factorColumna(st.map(s=>s.a*s.fig.sign));
    const fAX = factorColumna(st.map(s=>s.a*s.fig.sign*s.fig.cx));
    const fAY = factorColumna(st.map(s=>s.a*s.fig.sign*s.fig.cy));
    let sQx = 0, sQy = 0;
    tex += tablaCaption('Áreas, posición del centroide de cada parte y momentos estáticos. Las áreas llevan ya el '
      + 'signo de la parte; una columna con factor $\\times 10^{n}$ lo anuncia en la cabecera.');
    tNumA = tablaN;
    tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{clccccc}\\hline\n'
      + '\\textbf{Parte} & \\textbf{Figura} & '
      + cab('$A_i$', fA, utexto(u2)) + ' & \\textbf{$\\tilde{x}_i$} {\\scriptsize(' + utexto(u1) + ')} & '
      + '\\textbf{$\\tilde{y}_i$} {\\scriptsize(' + utexto(u1) + ')} & '
      + cab('$A_i\\tilde{x}_i$', fAX, '') + ' & ' + cab('$A_i\\tilde{y}_i$', fAY, '')
      + '\\\\\\hline\n';
    st.forEach((s,k)=>{
      const a = s.a*s.fig.sign;
      sQx += a*s.fig.cx; sQy += a*s.fig.cy;
      tex += (k+1) + ' & ' + nombreDe(s.fig)
        + ' & ' + celdaCol(a, fA, DEC.area)
        + ' & ' + decP(s.fig.cx,'len') + ' & ' + decP(s.fig.cy,'len')
        + ' & ' + celdaCol(a*s.fig.cx, fAX, DEC.area)
        + ' & ' + celdaCol(a*s.fig.cy, fAY, DEC.area) + ' \\\\\n';
    });
    tex += '\\hline\\multicolumn{2}{l}{$\\sum$} & '
      + celdaCol(results.A, fA, DEC.area) + ' & --- & --- & '
      + celdaCol(sQx, fAX, DEC.area) + ' & ' + celdaCol(sQy, fAY, DEC.area) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{tablacentrada}}\n';
    tex += '\\noindent Con las sumas de la Tabla ' + tNumA + ':\n'
      + '\\[ A = \\sum A_i = ' + ftex(results.A) + U2 + ' \\]\n'
      + '\\[ \\bar{x} = \\dfrac{\\sum A_i \\tilde{x}_i}{\\sum A_i} = \\dfrac{' + ftex(sQx) + '}{' + ftex(results.A) + '} = '
      + decP(results.xbar,'len') + U1
      + ' \\qquad \\bar{y} = \\dfrac{\\sum A_i \\tilde{y}_i}{\\sum A_i} = \\dfrac{' + ftex(sQy) + '}{' + ftex(results.A) + '} = '
      + decP(results.ybar,'len') + U1 + ' \\]\n';
    tex += '\\resultado{\\centering $C\\,(\\bar{x};\\ \\bar{y}) = (' + decP(results.xbar,'len') + ';\\ '
      + decP(results.ybar,'len') + ')' + U1 + '$, medido desde $O$. Todas las inercias que siguen se refieren a los '
      + 'ejes $x$ e $y$ que pasan por $C$.}\n';
    if(simSec.v || simSec.h){
      tex += '{\\footnotesize La sección es simétrica respecto de'
        + (simSec.v ? ' un eje vertical' : '') + (simSec.v && simSec.h ? ' y de' : '') + (simSec.h ? ' un eje horizontal' : '')
        + ', así que ' + (simSec.v && simSec.h ? 'las dos coordenadas del centroide se conocían' : 'una coordenada del centroide se conocía')
        + ' de antemano: el centroide está sobre todo eje de simetría. Se comprueba al final.}\\\\[3pt]\n';
    }
  }

  // ══ 4. Paso 3: teorema de los ejes paralelos ══
  tex += '\\seccion{4. Paso 3 --- Teorema de los ejes paralelos (Steiner)}\n';
  tex += porque('steiner',
    'Para un eje $x$ paralelo al eje centroidal $x\'$ de la parte y a distancia $d_y$ de él, cada elemento de área '
    + 'está a $y = y\' + d_y$, así que $\\int y^{2}dA = \\int y\'^{2}dA + 2d_y\\!\\int y\'\\,dA + d_y^{2}\\!\\int dA$. '
    + 'El término central es \\textbf{cero}, porque $x\'$ pasa por el centroide de la parte, y queda '
    + '$I_x = \\bar{I}_{x\'} + A\\,d_y^{2}$: la inercia propia más el área por el cuadrado de la distancia. Vale igual '
    + 'para $I_y$ con $d_x$ y para el producto, $P_{xy} = \\bar{P}_{x\'y\'} + A\\,d_x d_y$, que conserva los signos '
    + 'de $d_x$ y $d_y$. Solo funciona \\emph{desde} un eje centroidal: por eso se calculó $C$ antes.');
  tex += '\\noindent Las distancias van de cada centroide propio al de la sección: $d_{x_i} = \\tilde{x}_i - \\bar{x}$, '
    + '$d_{y_i} = \\tilde{y}_i - \\bar{y}$. Un hueco resta su aporte completo.\n';
  // Desarrollo escrito: la primera parte con la fórmula literal; las demás,
  // solo la sustitución. Las partes en espejo de otra ya desarrollada se
  // despachan en una línea: mismas Ix e Iy, producto opuesto.
  const espejoDe = {};
  grupos.forEach(g=>{ if(g.simetria) g.idx.slice(1).forEach(i=>{ espejoDe[i] = {de:g.idx[0], eje:g.simetria}; }); });
  let primera = true;
  st.forEach((s,i)=>{
    const k = i+1, f = s.fig;
    const girada = Math.abs(f.rotation||0) >= 0.005, pr = girada ? '\'' : '';
    const marca = f.sign > 0 ? '' : '-';
    const dxS = decP(s.dx,'len'), dyS = decP(s.dy,'len');
    // \par delante: sin él, «Parte 1» seguía en la misma línea que el párrafo
    // anterior.
    tex += '\\par\\vspace{3pt}\\noindent{\\bfseries\\color{bsaAcc2} Parte ' + k + '}';
    if(espejoDe[i]){
      const e = espejoDe[i], k0 = e.de + 1;
      tex += '\\quad{\\small en espejo de la parte ' + k0 + ' respecto del eje ' + e.eje + ': '
        + (e.eje === 'vertical' ? '$d_{x_' + k + '} = -d_{x_' + k0 + '} = ' + dxS + '$ y el mismo $d_{y}$'
                                 : '$d_{y_' + k + '} = -d_{y_' + k0 + '} = ' + dyS + '$ y el mismo $d_{x}$')
        + ', así que $\\bar{I}_{x_' + k + '} = \\bar{I}_{x_' + k0 + '}$, $\\bar{I}_{y_' + k + '} = \\bar{I}_{y_' + k0
        + '}$ y $\\bar{P}_{xy_' + k + '} = -\\bar{P}_{xy_' + k0 + '} = ' + ftex(s.Ixy_f) + U4 + '$.}\\\\[2pt]\n';
      return;
    }
    tex += '\\quad{\\small $d_{x_' + k + '} = ' + decP(f.cx,'len') + ' - ' + decP(results.xbar,'len') + ' = ' + dxS + U1
      + '$, \\ $d_{y_' + k + '} = ' + decP(f.cy,'len') + ' - ' + decP(results.ybar,'len') + ' = ' + dyS + U1 + '$}\\\\[2pt]\n';
    // Cada línea empieza diciendo QUÉ se calcula: tres paréntesis seguidos no
    // dicen cuál es cuál.
    const lit = primera;
    tex += '\\[ \\bar{I}_{x_' + k + '} = ' + (lit ? marca + '\\left(\\bar{I}_{x}' + pr + ' + A_' + k + ' d_{y_' + k + '}^{2}\\right) = ' : '')
      + marca + '\\left(' + ftex(s.Ixc) + ' + (' + ftex(s.a) + ')(' + dyS + ')^{2}\\right) = ' + ftex(s.Ix_f) + U4 + ' \\]\n';
    tex += '\\[ \\bar{I}_{y_' + k + '} = ' + (lit ? marca + '\\left(\\bar{I}_{y}' + pr + ' + A_' + k + ' d_{x_' + k + '}^{2}\\right) = ' : '')
      + marca + '\\left(' + ftex(s.Iyc) + ' + (' + ftex(s.a) + ')(' + dxS + ')^{2}\\right) = ' + ftex(s.Iy_f) + U4 + ' \\]\n';
    tex += '\\[ \\bar{P}_{xy_' + k + '} = ' + (lit ? marca + '\\left(\\bar{P}_{xy}' + pr + ' + A_' + k + ' d_{x_' + k + '} d_{y_' + k + '}\\right) = ' : '')
      + marca + '\\left(' + ftex(s.Ixyc) + ' + (' + ftex(s.a) + ')(' + dxS + ')(' + dyS + ')\\right) = ' + ftex(s.Ixy_f) + U4 + ' \\]\n';
    primera = false;
  });

  // Tabla de inercias: propias giradas, traslado y aporte de cada parte.
  let tNumI;
  {
    const fIx  = factorColumna(st.map(s=>s.Ixc));
    const fIy  = factorColumna(st.map(s=>s.Iyc));
    const fIxy = factorColumna(st.map(s=>s.Ixyc));
    const fSx  = factorColumna(st.map(s=>s.a*s.dy*s.dy));
    const fSy  = factorColumna(st.map(s=>s.a*s.dx*s.dx));
    const fSxy = factorColumna(st.map(s=>s.a*s.dx*s.dy));
    const fTx  = factorColumna(st.map(s=>s.Ix_f));
    const fTy  = factorColumna(st.map(s=>s.Iy_f));
    const fTxy = factorColumna(st.map(s=>s.Ixy_f));
    tex += '\\vspace{4pt}\n';
    tex += tablaCaption('Inercias por parte, en ' + utexto(u4) + '. Las tres primeras columnas son las propias '
      + '(ya giradas a ejes paralelos a $x$ e $y$ si la parte está girada); las tres siguientes, los términos de '
      + 'traslado; las tres últimas, el aporte de cada parte con su signo, cuya suma es la inercia de la sección.');
    tNumI = tablaN;
    tex += '{\\footnotesize\\begin{tablacentrada}\\begin{tabular}{cccccccccc}\\hline\n'
      + '\\textbf{Parte} & '
      + cab("$\\bar{I}_{x}'$", fIx, '') + ' & ' + cab("$\\bar{I}_{y}'$", fIy, '') + ' & '
      + cab("$\\bar{P}_{xy}'$", fIxy, '') + ' & '
      + cab('$A_i d_{y_i}^{2}$', fSx, '') + ' & ' + cab('$A_i d_{x_i}^{2}$', fSy, '') + ' & '
      + cab('$A_i d_{x_i}d_{y_i}$', fSxy, '') + ' & '
      + cab('$\\bar{I}_{x_i}$', fTx, '') + ' & ' + cab('$\\bar{I}_{y_i}$', fTy, '') + ' & '
      + cab('$\\bar{P}_{xy_i}$', fTxy, '') + '\\\\\\hline\n';
    st.forEach((s,k)=>{
      tex += (k+1)
        + ' & ' + celdaCol(s.Ixc,  fIx,  DEC.iner)
        + ' & ' + celdaCol(s.Iyc,  fIy,  DEC.iner)
        + ' & ' + celdaCol(s.Ixyc, fIxy, DEC.iner)
        + ' & ' + celdaCol(s.a*s.dy*s.dy, fSx, DEC.iner)
        + ' & ' + celdaCol(s.a*s.dx*s.dx, fSy, DEC.iner)
        + ' & ' + celdaCol(s.a*s.dx*s.dy, fSxy, DEC.iner)
        + ' & ' + celdaCol(s.Ix_f,  fTx,  DEC.iner)
        + ' & ' + celdaCol(s.Iy_f,  fTy,  DEC.iner)
        + ' & ' + celdaCol(s.Ixy_f, fTxy, DEC.iner) + ' \\\\\n';
    });
    tex += '\\hline\\multicolumn{7}{l}{$\\sum$} & '
      + celdaCol(results.Ix,  fTx,  DEC.iner) + ' & '
      + celdaCol(results.Iy,  fTy,  DEC.iner) + ' & '
      + celdaCol(results.Ixy, fTxy, DEC.iner) + ' \\\\\n'
      + '\\hline\\end{tabular}\\end{tablacentrada}}\n';
  }

  // Sumas, polar y radios de giro
  {
    let sPropIx = 0, sPropIy = 0, sPropIxy = 0, sStIx = 0, sStIy = 0, sStIxy = 0;
    st.forEach(s=>{
      const g = s.fig.sign;
      sPropIx  += g*s.Ixc;   sStIx  += g*s.a*s.dy*s.dy;
      sPropIy  += g*s.Iyc;   sStIy  += g*s.a*s.dx*s.dx;
      sPropIxy += g*s.Ixyc;  sStIxy += g*s.a*s.dx*s.dy;
    });
    tex += '\\subpaso{Inercias de la sección}\n'
      + '\\noindent Sumando las últimas columnas de la Tabla ' + tNumI + ' (o, lo que es lo mismo, las propias más '
      + 'los traslados):\n';
    tex += '\\[ \\bar{I}_x = \\sum \\left(\\bar{I}_{x}\' + A_i\\,d_{y_i}^{2}\\right) = '
      + ftex(sPropIx) + ' + ' + ftex(sStIx) + ' = ' + ftex(results.Ix) + U4 + ' \\]\n';
    tex += '\\[ \\bar{I}_y = \\sum \\left(\\bar{I}_{y}\' + A_i\\,d_{x_i}^{2}\\right) = '
      + ftex(sPropIy) + ' + ' + ftex(sStIy) + ' = ' + ftex(results.Iy) + U4 + ' \\]\n';
    tex += '\\[ \\bar{P}_{xy} = \\sum \\left(\\bar{P}_{xy}\' + A_i\\,d_{x_i}d_{y_i}\\right) = '
      + ftex(sPropIxy) + ' + ' + ftex(sStIxy) + ' = ' + ftex(results.Ixy) + U4 + ' \\]\n';
    tex += '\\subpaso{Momento polar y radios de giro}\n';
    tex += porque('polar',
      'El momento polar $J_O = \\int r^{2}dA$ mide la inercia respecto del eje perpendicular al plano por $C$; como '
      + '$r^{2} = x^{2} + y^{2}$, vale simplemente $\\bar{I}_x + \\bar{I}_y$. El radio de giro $k = \\sqrt{I/A}$ es la '
      + 'distancia a la que habría que concentrar toda el área para tener la misma inercia: es el número que usa el '
      + 'diseño de columnas para medir la esbeltez.');
    tex += '\\[ J_O = \\bar{I}_x + \\bar{I}_y = ' + ftex(results.Ix) + ' + ' + ftex(results.Iy)
      + ' = ' + ftex(results.Jo) + U4 + ' \\]\n';
    tex += '\\[ k_x = \\sqrt{\\dfrac{\\bar{I}_x}{A}} = \\sqrt{\\dfrac{' + ftex(results.Ix) + '}{'
      + ftex(results.A) + '}} = ' + decP(results.kx,'len') + U1
      + ' \\qquad k_y = \\sqrt{\\dfrac{\\bar{I}_y}{A}} = \\sqrt{\\dfrac{' + ftex(results.Iy) + '}{'
      + ftex(results.A) + '}} = ' + decP(results.ky,'len') + U1 + ' \\]\n';
    tex += '\\resultado{\\centering $\\bar{I}_x = ' + ftex(results.Ix) + U4 + '$ \\quad $\\bar{I}_y = ' + ftex(results.Iy) + U4
      + '$ \\quad $\\bar{P}_{xy} = ' + ftex(results.Ixy) + U4 + '$ \\quad $J_O = ' + ftex(results.Jo) + U4 + '$}\n';
    // El signo del producto de inercia no es un detalle: dice si hace falta
    // girar los ejes y hacia dónde.
    const pxy = results.Ixy;
    tex += '\\veredicto{' + ((Math.abs(pxy) < 1e-9*Math.max(1, mR))
      ? 'El producto de inercia es \\textbf{nulo}: los ejes $x$ e $y$ que pasan por $C$ ya son los ejes principales '
        + 'de la sección, y $\\bar{I}_x$ e $\\bar{I}_y$ son sus inercias máxima y mínima. El paso siguiente lo confirma.'
      : 'El producto de inercia es ' + (pxy > 0 ? '\\textbf{positivo}' : '\\textbf{negativo}')
        + ': los ejes $x$ e $y$ \\textbf{no} son principales. Existe un giro $\\theta_p$ que anula el producto, y es '
        + 'el que se calcula a continuación.') + '}\n';
  }

  // ══ 5. Paso 4: ejes principales ══
  tex += '\\seccion{5. Paso 4 --- Ejes principales de inercia}\n';
  tex += porque('principales',
    'Al girar los ejes un ángulo $\\theta$, las inercias cambian según $I_u = \\tfrac{\\bar{I}_x+\\bar{I}_y}{2} + '
    + '\\tfrac{\\bar{I}_x-\\bar{I}_y}{2}\\cos 2\\theta - \\bar{P}_{xy}\\sen 2\\theta$ y '
    + '$P_{uv} = \\tfrac{\\bar{I}_x-\\bar{I}_y}{2}\\sen 2\\theta + \\bar{P}_{xy}\\cos 2\\theta$. Derivando $I_u$ '
    + 'respecto de $\\theta$ e igualando a cero se obtiene el ángulo en que la inercia es máxima o mínima, y resulta '
    + 'ser el mismo en que $P_{uv} = 0$: son los \\emph{ejes principales}, siempre perpendiculares entre sí. Con un '
    + 'eje de simetría no hace falta buscarlos: ya lo es.');
  const dI = results.Ix - results.Iy;
  const dosTh = 2*results.thetaP;
  if(Math.abs(dI) < 1e-12*Math.max(1, Math.abs(results.Ix), Math.abs(results.Iy))){
    tex += '\\[ \\tan 2\\theta_p = \\dfrac{-2\\bar{P}_{xy}}{\\bar{I}_x - \\bar{I}_y} \\longrightarrow \\infty '
      + '\\quad (\\bar{I}_x = \\bar{I}_y) \\qquad\\Longrightarrow\\qquad 2\\theta_p = ' + decP(dosTh,'ang')
      + '^\\circ \\qquad \\theta_p = ' + decP(results.thetaP,'ang') + '^\\circ \\]\n';
  } else {
    tex += '\\[ \\tan 2\\theta_p = \\dfrac{-2\\bar{P}_{xy}}{\\bar{I}_x - \\bar{I}_y} = \\dfrac{-2\\,(' + ftex(results.Ixy)
      + ')}{' + ftex(results.Ix) + ' - ' + ftex(results.Iy) + '} = ' + decP(-2*results.Ixy/dI,'iner')
      + ' \\qquad\\Longrightarrow\\qquad 2\\theta_p = ' + decP(dosTh,'ang') + '^\\circ \\qquad \\theta_p = '
      + decP(results.thetaP,'ang') + '^\\circ \\]\n';
    tex += '{\\footnotesize El arco tangente tiene dos soluciones que distan $180^\\circ$ en $2\\theta_p$, es decir '
      + '$90^\\circ$ en $\\theta_p$: son los dos ejes principales. Se toma la que cae en el cuadrante que marcan los '
      + 'signos del numerador y del denominador, y el otro eje es su perpendicular.}\\\\[3pt]\n';
  }
  tex += '\\[ I_{\\max,\\min} = \\dfrac{\\bar{I}_x + \\bar{I}_y}{2} \\pm \\sqrt{\\left(\\dfrac{\\bar{I}_x - \\bar{I}_y}{2}\\right)^{2} '
    + '+ \\bar{P}_{xy}^{\\,2}} = ' + ftex(mAvg) + ' \\pm ' + ftex(mR) + U4 + ' \\]\n';
  tex += '\\[ I_{\\max} = ' + ftex(results.Imax) + U4 + ' \\qquad I_{\\min} = ' + ftex(results.Imin) + U4 + ' \\]\n';
  // La lámina repite la sección SIN la cadena de cotas: lo único acotado es el
  // centroide, y como variables.
  tex += lamina(tikzSeccionCompuesta({cotas:false, ejes:true, cotasC:true, ejesPrincipales:true}),
    'Ejes centroidales $x$-$y$ y ejes principales $u$-$v$, girados $\\theta_p$.');
  tex += '\\resultado{\\centering $\\theta_p = ' + decP(results.thetaP,'ang') + '^\\circ$ \\quad $I_{\\max} = '
    + ftex(results.Imax) + U4 + '$ \\quad $I_{\\min} = ' + ftex(results.Imin) + U4 + '$}\n';
  const yaPrinc = Math.abs(results.thetaP) < 0.005;
  const mayorX = results.Ix >= results.Iy;
  tex += '\\veredicto{' + (yaPrinc
    ? 'El giro es nulo: los ejes $x$ e $y$ ya coinciden con los principales, $u \\equiv x$ y $v \\equiv y$, y '
      + (mayorX ? '$I_{\\max} = \\bar{I}_x$, $I_{\\min} = \\bar{I}_y$.' : '$I_{\\max} = \\bar{I}_y$, $I_{\\min} = \\bar{I}_x$.')
    : 'Un giro de $' + decP(Math.abs(results.thetaP),'ang') + '^\\circ$ en sentido '
      + (results.thetaP > 0 ? 'antihorario' : 'horario') + ' lleva los ejes $x$-$y$ sobre los principales $u$-$v$. '
      + 'Regla de sentido común: $I_{\\max}$ corresponde al eje principal más cercano al de mayor inercia entre $x$ e '
      + '$y$, que aquí es ' + (mayorX ? '$x$' : '$y$') + '.') + '}\n';

  // ══ 6. Paso 5: círculo de Mohr ══
  tex += '\\seccion{6. Paso 5 --- Círculo de Mohr de inercia}\n';
  tex += porque('mohr',
    'Elevando al cuadrado y sumando las ecuaciones de $I_u$ y $P_{uv}$ del paso 4 desaparece $\\theta$ y queda '
    + '$\\left(I_u - \\tfrac{\\bar{I}_x+\\bar{I}_y}{2}\\right)^{2} + P_{uv}^{2} = R^{2}$: en el plano $(I, P)$, todos los '
    + 'pares $(I_u, P_{uv})$ están sobre una circunferencia. Cada eje de la sección es un punto del círculo, y girar '
    + 'los ejes $\\theta$ en la sección es recorrer $2\\theta$ sobre el círculo. Es el mismo cálculo del paso 4, pero '
    + 'dibujado: los cortes con el eje horizontal son $I_{\\max}$ e $I_{\\min}$, porque allí el producto es cero.');
  tex += '\\noindent El círculo se construye con dos datos: su centro, sobre el eje de las inercias, y su radio.\n';
  tex += '\\[ \\bar{I}_{avg} = \\dfrac{\\bar{I}_x + \\bar{I}_y}{2} = \\dfrac{'
    + ftex(results.Ix) + ' + ' + ftex(results.Iy) + '}{2} = ' + ftex(mAvg) + U4 + ' \\]\n';
  tex += '\\[ R = \\sqrt{\\left(\\dfrac{\\bar{I}_x - \\bar{I}_y}{2}\\right)^{2} + \\bar{P}_{xy}^{\\,2}} = '
    + '\\sqrt{\\left(' + ftex((results.Ix - results.Iy) / 2) + '\\right)^{2} + \\left(' + ftex(results.Ixy)
    + '\\right)^{2}} = ' + ftex(mR) + U4 + ' \\]\n';
  tex += '\\noindent El eje $x$ da el punto $A(\\bar{I}_x,\\ \\bar{P}_{xy})$ y el eje $y$ el punto '
    + '$B(\\bar{I}_y,\\ -\\bar{P}_{xy})$; con ordenadas opuestas, $A$ y $B$ quedan en extremos de un diámetro y el '
    + 'centro cae en $\\bar{I}_{avg}$. Los cortes con el eje horizontal son $I_{\\max} = \\bar{I}_{avg} + R$ e '
    + '$I_{\\min} = \\bar{I}_{avg} - R$.\n';
  tex += '\\[ A(' + ftex(results.Ix) + ',\\ ' + ftex(results.Ixy) + ') \\qquad '
    + 'B(' + ftex(results.Iy) + ',\\ ' + ftex(-results.Ixy) + ') \\]\n';
  // Si el círculo degenera en un punto, tikzMohr devuelve cadena vacía: se
  // emite el párrafo explicativo en su lugar y NO un tikzpicture vacío.
  const laminaMohr = (typeof tikzMohr === 'function') ? tikzMohr(results, u4) : '';
  if(laminaMohr){
    tex += lamina(laminaMohr,
      'Círculo de Mohr de inercia: el giro $2\\theta_p$ sobre el círculo es el $\\theta_p$ de los ejes.');
    tex += '\\veredicto{' + (yaPrinc
      ? '$A$ y $B$ caen sobre el eje horizontal, que es donde el producto de inercia se anula: los ejes $x$-$y$ ya '
        + 'son los principales ($\\theta_p = 0^\\circ$).'
      : 'El giro se lee duplicado sobre el círculo: $2\\theta_p = ' + decP(dosTh,'ang') + '^\\circ$ en el círculo son '
        + '$\\theta_p = ' + decP(results.thetaP,'ang') + '^\\circ$ en la sección, en el mismo sentido.') + '}\n';
  } else {
    tex += '\\noindent El círculo se reduce a un punto: $\\bar{I}_x = \\bar{I}_y$ y $\\bar{P}_{xy} = 0$. La inercia '
      + 'vale lo mismo respecto de cualquier eje que pase por el centroide, así que no hay una dirección principal '
      + 'privilegiada y no hay círculo que dibujar.\n';
  }

  // ══ 7. Paso 6: inercia en un punto P (solo si el usuario lo pidió) ══
  // Toda la sección es condicional: sin punto insertado no se imprime nada, ni
  // el título. Un apartado vacío se lee como un fallo del programa.
  const epLat = (typeof computeExtraPoint === 'function') ? computeExtraPoint(results) : null;
  let numSec = 7;
  if(epLat){
    const rotLat = epLat.rot;
    tex += '\\seccion{' + numSec + '. Paso 6 --- Inercia en el punto $P$' + (rotLat ? ' y ejes girados' : '') + '}\n';
    numSec++;
    tex += porque('puntoP',
      'Las inercias calculadas hasta aquí son centroidales. Para referirlas a otro punto $P$ se aplica otra vez el '
      + 'teorema de los ejes paralelos, ahora desde $C$ hacia $P$, con $d_x$ y $d_y$ medidos del punto al centroide. '
      + 'Como los términos $A d^{2}$ son siempre positivos, la inercia respecto de $P$ no puede ser menor que la '
      + 'centroidal; el producto sí cambia de signo según el cuadrante en que caiga $P$ respecto de $C$.');
    tex += '\\[ P\\left(' + decP(epLat.x,'len') + ',\\ ' + decP(epLat.y,'len') + '\\right)' + U1
      + ' \\qquad d_x = \\bar{x} - x_P = ' + decP(results.xbar,'len') + ' - ' + decP(epLat.x,'len') + ' = ' + decP(epLat.dx,'len') + U1
      + ' \\qquad d_y = \\bar{y} - y_P = ' + decP(results.ybar,'len') + ' - ' + decP(epLat.y,'len') + ' = ' + decP(epLat.dy,'len') + U1 + ' \\]\n';
    tex += '\\[ I_{xP} = \\bar{I}_x + A\\,d_y^{2} = ' + ftex(results.Ix) + ' + ' + ftex(results.A)
      + '\\left(' + decP(epLat.dy,'len') + '\\right)^{2} = ' + ftex(epLat.IxP) + U4 + ' \\]\n';
    tex += '\\[ I_{yP} = \\bar{I}_y + A\\,d_x^{2} = ' + ftex(results.Iy) + ' + ' + ftex(results.A)
      + '\\left(' + decP(epLat.dx,'len') + '\\right)^{2} = ' + ftex(epLat.IyP) + U4 + ' \\]\n';
    tex += '\\[ P_{xyP} = \\bar{P}_{xy} + A\\,d_x d_y = ' + ftex(results.Ixy) + ' + ' + ftex(results.A)
      + '\\left(' + decP(epLat.dx,'len') + '\\right)\\left(' + decP(epLat.dy,'len') + '\\right) = ' + ftex(epLat.IxyP) + U4 + ' \\]\n';

    tex += '\\subpaso{Ejes principales en $P$}\n';
    tex += '\\noindent Con estas tres inercias se repiten los pasos 4 y 5, ahora en $P$:\n';
    tex += '\\[ I_{avgP} = \\dfrac{I_{xP} + I_{yP}}{2} = ' + ftex(epLat.avg) + U4
      + ' \\qquad R_P = \\sqrt{\\left(\\dfrac{I_{xP} - I_{yP}}{2}\\right)^{2} + P_{xyP}^{\\,2}} = ' + ftex(epLat.R) + U4 + ' \\]\n';
    tex += '\\[ \\theta_{pP} = ' + decP(epLat.thetaP,'ang') + '^\\circ \\qquad I_{\\max P} = ' + ftex(epLat.Imax) + U4
      + ' \\qquad I_{\\min P} = ' + ftex(epLat.Imin) + U4 + ' \\]\n';

    if(rotLat){
      tex += '\\subpaso{Ejes girados $\\theta = ' + decP(rotLat.ang,'ang') + '^\\circ$ en $P$}\n';
      tex += '\\noindent Los ejes $x$-$y$ en $P$ se giran un ángulo $\\theta$ (positivo antihorario). Las inercias '
        + 'respecto de los nuevos ejes $u$-$v$ salen de las ecuaciones de transformación, con $2\\theta = '
        + decP(2*rotLat.ang,'ang') + '^\\circ$, $\\cos 2\\theta = ' + decP(rotLat.c2,'ang') + '$ y $\\sen 2\\theta = '
        + decP(rotLat.s2,'ang') + '$:\n';
      const difP = (epLat.IxP - epLat.IyP) / 2;
      tex += '\\[ I_u = \\dfrac{I_{xP}+I_{yP}}{2} + \\dfrac{I_{xP}-I_{yP}}{2}\\cos 2\\theta - P_{xyP}\\,\\sen 2\\theta = '
        + ftex(epLat.avg) + ' + ' + ftex(difP) + '(' + decP(rotLat.c2,'ang') + ') - ' + ftex(epLat.IxyP) + '('
        + decP(rotLat.s2,'ang') + ') = ' + ftex(rotLat.Iu) + U4 + ' \\]\n';
      tex += '\\[ I_v = \\dfrac{I_{xP}+I_{yP}}{2} - \\dfrac{I_{xP}-I_{yP}}{2}\\cos 2\\theta + P_{xyP}\\,\\sen 2\\theta = '
        + ftex(rotLat.Iv) + U4 + ' \\qquad P_{uv} = \\dfrac{I_{xP}-I_{yP}}{2}\\sen 2\\theta + P_{xyP}\\cos 2\\theta = '
        + ftex(rotLat.Iuv) + U4 + ' \\]\n';
      tex += '\\veredicto{$I_u + I_v = ' + ftex(rotLat.Iu + rotLat.Iv) + U4 + ' = I_{xP} + I_{yP}$: girar los ejes '
        + 'reparte la inercia entre ellos, pero no la crea ni la destruye. Por eso $U$ y $V$ caen sobre el mismo '
        + 'círculo, en un diámetro girado $2\\theta$.'
        + (rotLat.swapped ? ' Con $\\theta = 90^\\circ$ los ejes quedan intercambiados: $I_u \\equiv I_{yP}$.' : '') + '}\n';
    }
    // El círculo en P se dibuja UNA sola vez, con los puntos U y V encima si
    // hay giro: es el mismo diámetro girado, no un círculo nuevo.
    const laminaP = (typeof tikzMohr === 'function')
      ? tikzMohr({Ix: epLat.IxP, Iy: epLat.IyP, Ixy: epLat.IxyP}, u4, rotLat ? {sub:'P', rot:rotLat} : {sub:'P'}) : '';
    if(laminaP){
      tex += lamina(laminaP, rotLat
        ? 'Círculo de Mohr en $P$: $U$ y $V$ son los ejes girados $\\theta = ' + decP(rotLat.ang,'ang') + '^\\circ$ (doble sobre el círculo).'
        : 'Círculo de Mohr de inercia en el punto $P$.');
    } else {
      tex += '\\noindent En $P$ el círculo se reduce a un punto: $I_{xP} = I_{yP}$ y $P_{xyP} = 0$, así que cualquier '
        + 'eje por $P$ es principal.\n';
    }
    tex += lamina(tikzSeccionCompuesta({cotas:false, ejes:true, cotasC:false, puntoP:true}),
      'Sección con el punto $P$ y sus ejes principales $u_P$-$v_P$, girados $\\theta_{pP} = ' + decP(epLat.thetaP,'ang') + '^\\circ$'
      + (rotLat ? '; en azul, los ejes girados $\\theta = ' + decP(rotLat.ang,'ang') + '^\\circ$' : '') + '.');
  }

  // ══ 8. Comprobaciones ══
  tex += '\\seccion{' + numSec + '. Paso ' + (epLat ? 7 : 6) + ' --- Comprobaciones}\n';
  tex += porque('comprobar',
    'Ninguna de estas comprobaciones exige rehacer el cálculo: son propiedades que se cumplen siempre y que un error '
    + 'de signo o de brazo rompe. La suma de las inercias no cambia al girar los ejes; las principales encierran a '
    + 'todas las demás; un eje de simetría anula el producto; y el traslado de Steiner solo puede aumentar la inercia.');
  const okInv = !rel(results.Imax + results.Imin, results.Jo);
  const okOrd = results.Imin <= Math.min(results.Ix, results.Iy) + 1e-9*mR && results.Imax >= Math.max(results.Ix, results.Iy) - 1e-9*mR;
  tex += '\\begin{itemize}\\setlength{\\itemsep}{2pt}\n';
  tex += '\\item \\textbf{Invariante.} La suma de inercias no depende del giro de los ejes: '
    + '$I_{\\max} + I_{\\min} = ' + ftex(results.Imax) + ' + ' + ftex(results.Imin) + ' = ' + ftex(results.Imax + results.Imin)
    + U4 + ' = \\bar{I}_x + \\bar{I}_y = J_O$' + (okInv ? '\\ \\checkmark' : ' (no coincide: revisar)') + '.\n';
  tex += '\\item \\textbf{Orden.} Las inercias principales encierran a las de cualquier otro eje: '
    + '$I_{\\min} \\le \\bar{I}_x,\\ \\bar{I}_y \\le I_{\\max}$, es decir $' + ftex(results.Imin) + ' \\le '
    + ftex(Math.min(results.Ix, results.Iy)) + ',\\ ' + ftex(Math.max(results.Ix, results.Iy)) + ' \\le ' + ftex(results.Imax) + '$'
    + (okOrd ? '\\ \\checkmark' : ' (no se cumple: revisar)') + '.\n';
  if(simSec.v || simSec.h){
    const okV = simSec.v && Math.abs(results.xbar - env.x0) < 1e-6*Math.max(1, env.maxX - env.minX);
    const okH = simSec.h && Math.abs(results.ybar - env.y0) < 1e-6*Math.max(1, env.maxY - env.minY);
    const okP = Math.abs(results.Ixy) < 1e-9*Math.max(1, results.Ix, results.Iy);
    tex += '\\item \\textbf{Simetría.} ';
    if(simSec.v) tex += 'La sección es simétrica respecto del eje vertical $x = ' + decP(env.x0,'len') + '$' + U1
      + ', así que $\\bar{x}$ tenía que caer sobre él: $\\bar{x} = ' + decP(results.xbar,'len') + '$'
      + (okV ? '\\ \\checkmark' : ' (no coincide: revisar)') + '. ';
    if(simSec.h) tex += 'La sección es simétrica respecto del eje horizontal $y = ' + decP(env.y0,'len') + '$' + U1
      + ', así que $\\bar{y}$ tenía que caer sobre él: $\\bar{y} = ' + decP(results.ybar,'len') + '$'
      + (okH ? '\\ \\checkmark' : ' (no coincide: revisar)') + '. ';
    tex += 'Y un eje de simetría es principal, así que el producto de inercia tenía que anularse: $\\bar{P}_{xy} = '
      + ftex(results.Ixy) + '$' + (okP ? '\\ \\checkmark' : ' (no se anula: revisar)') + '.\n';
  } else {
    tex += '\\item \\textbf{Simetría.} La sección no tiene eje de simetría vertical ni horizontal, así que el producto '
      + 'de inercia no tenía por qué anularse y los ejes principales hay que calcularlos, como se hizo.\n';
  }
  {
    const IxO = results.Ix + results.A*results.ybar*results.ybar;
    const IyO = results.Iy + results.A*results.xbar*results.xbar;
    tex += '\\item \\textbf{Mínimo en el centroide.} Como todo término $A d^{2}$ es positivo, la inercia centroidal es '
      + 'la menor de todas las inercias respecto de ejes paralelos. Respecto de los ejes $X$-$Y$ del dibujo, por $O$: '
      + '$I_{X} = \\bar{I}_x + A\\bar{y}^{2} = ' + ftex(IxO) + U4 + ' \\ge \\bar{I}_x$ e '
      + '$I_{Y} = \\bar{I}_y + A\\bar{x}^{2} = ' + ftex(IyO) + U4 + ' \\ge \\bar{I}_y$\\ \\checkmark.\n';
  }
  tex += '\\end{itemize}\n';

  // Resultados en tabla (R4)
  tex += tablaCaption('Resultados de la sección, referidos a su centroide $C$.');
  tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{lcc}\\hline\n'
    + '\\textbf{Magnitud} & \\textbf{Valor} & \\textbf{Unidad} \\\\\\hline\n'
    + 'Área $A$ & $' + ftex(results.A) + '$ & ' + utexto(u2) + ' \\\\\n'
    + 'Centroide $\\bar{x}$, $\\bar{y}$ & $' + decP(results.xbar,'len') + '$, $' + decP(results.ybar,'len') + '$ & ' + utexto(u1) + ' \\\\\n'
    + '$\\bar{I}_x$ & $' + ftex(results.Ix) + '$ & ' + utexto(u4) + ' \\\\\n'
    + '$\\bar{I}_y$ & $' + ftex(results.Iy) + '$ & ' + utexto(u4) + ' \\\\\n'
    + '$\\bar{P}_{xy}$ & $' + ftex(results.Ixy) + '$ & ' + utexto(u4) + ' \\\\\n'
    + '$J_O$ & $' + ftex(results.Jo) + '$ & ' + utexto(u4) + ' \\\\\n'
    + '$k_x$, $k_y$ & $' + decP(results.kx,'len') + '$, $' + decP(results.ky,'len') + '$ & ' + utexto(u1) + ' \\\\\n'
    + '$\\theta_p$ & $' + decP(results.thetaP,'ang') + '$ & grados \\\\\n'
    + '$I_{\\max}$ & $' + ftex(results.Imax) + '$ & ' + utexto(u4) + ' \\\\\n'
    + '$I_{\\min}$ & $' + ftex(results.Imin) + '$ & ' + utexto(u4) + ' \\\\\n';
  if(epLat){
    tex += '$I_{xP}$, $I_{yP}$, $P_{xyP}$ & $' + ftex(epLat.IxP) + '$, $' + ftex(epLat.IyP) + '$, $' + ftex(epLat.IxyP) + '$ & ' + utexto(u4) + ' \\\\\n';
  }
  tex += '\\hline\\end{tabular}\\end{tablacentrada}}\n';

  // ══ Referencias y colofón ══
  tex += '\\vspace{10pt}\\noindent{\\footnotesize\\color{bsaMuted}\\textbf{Referencias.} '
    + 'R.~C. Hibbeler, \\emph{Ingeniería Mecánica: Estática}, 12.\\textsuperscript{a} ed., cap.~10 «Momentos de inercia», '
    + '§10.1--10.7. F.~P. Beer y E.~R. Johnston, \\emph{Mecánica vectorial para ingenieros: Estática}, cap.~9.}\n';
  tex += colofonLatexBSA();
  tex += '\\end{document}\n';
  return tex;
}
