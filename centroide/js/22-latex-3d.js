// ═══════════════════════════════════════════════════════════
//  INFORME LaTeX del modo 3D · la misma clase paso a paso que el 2D
//  (Hibbeler §9.2, cuerpos compuestos), con volúmenes y tres coordenadas.
//  Láminas: planta y alzado en TikZ, una junto a otra. Sigue las reglas de
//  redacción de fuerzas-internas/LEEME.md.
// ═══════════════════════════════════════════════════════════

// Contorno TikZ de un sólido en una vista, en coordenadas locales (origen en
// su centroide). Los poliedros van por su silueta (con giro y volteo ya
// aplicados); los sólidos de revolución reproducen drawPlanta/drawAlzado y,
// si están volteados, el llamador añade yscale=-1 al scope (_yscaleSolido).
function _pathSolidoTikz(fig, vistaId, opts){
  const d = fig.dims, t = fig.type, def = SOLID_DEFS[t];
  const n = v => (+v).toFixed(4);
  const pol = contornoSolido(fig, vistaId, opts);
  if(pol) return pol.map(q=>'(' + n(q[0]) + ',' + n(q[1]) + ')').join(' -- ') + ' -- cycle';
  const c = def.cBase(d);
  if(vistaId === 'planta') return '(0,0) circle (' + n(t === 's_conotrunc' ? Math.max(d.r, d.r2) : d.r) + ')';
  if(t === 's_cilindro')    return '(' + n(-d.r) + ',' + n(-c) + ') rectangle (' + n(d.r) + ',' + n(d.h-c) + ')';
  if(t === 's_cono')        return '(' + n(-d.r) + ',' + n(-c) + ') -- (' + n(d.r) + ',' + n(-c) + ') -- (0,' + n(d.h-c) + ') -- cycle';
  if(t === 's_esfera')      return '(0,0) circle (' + n(d.r) + ')';
  if(t === 's_semiesfera')  return '(' + n(-d.r) + ',' + n(-c) + ') arc (180:0:' + n(d.r) + ') -- cycle';
  if(t === 's_conotrunc')   return '(' + n(-d.r) + ',' + n(-c) + ') -- (' + n(d.r) + ',' + n(-c) + ') -- (' + n(d.r2) + ',' + n(d.h-c) + ') -- (' + n(-d.r2) + ',' + n(d.h-c) + ') -- cycle';
  // Parábola z = h(1 − x²/R²): Bézier cúbica equivalente a la cuadrática de control (0, 2h)
  if(t === 's_paraboloide') return '(' + n(-d.r) + ',' + n(-c) + ') .. controls (' + n(-d.r/3) + ',' + n(-c+4*d.h/3) + ') and (' + n(d.r/3) + ',' + n(-c+4*d.h/3) + ') .. (' + n(d.r) + ',' + n(-c) + ') -- cycle';
  return '(0,0) circle (1)';
}
function _yscaleSolido(fig, vistaId){
  return (fig.volteado && vistaId !== 'planta' && !SOLID_DEFS[fig.type].vertices) ? ', yscale=-1' : '';
}

// Lámina de una vista: sólidos numerados, cadenas de cotas y, si se pide, el
// centroide marcado. Devuelve el cuerpo del tikzpicture. Ancho útil: `ancho` cm.
function tikzVista3d(vistaId, opts){
  opts = opts || {};
  const ancho = opts.ancho || 7.0;
  const n = v => v.toFixed(3);
  const {xs, vs} = bordes3d(vistaId);
  let minX = Math.min(...xs), maxX = Math.max(...xs), minV = Math.min(...vs), maxV = Math.max(...vs);
  if(opts.ejes){ minX = Math.min(minX, 0); maxX = Math.max(maxX, 0); minV = Math.min(minV, 0); maxV = Math.max(maxV, 0); }
  const esc = Math.min(ancho/Math.max(maxX-minX,1e-6), (opts.alto || 7.5)/Math.max(maxV-minV,1e-6));
  const tx = x => (x-minX)*esc, tv = v => (v-minV)*esc;
  let s = '';
  figures.forEach((fig,i)=>{
    const col = hexRgbSpec(fig.color), esSuma = fig.sign === 1;
    const relleno = esSuma
      ? 'fill={' + col + '}, fill opacity=0.30, draw={' + col + '}, line width=0.9pt'
      : 'pattern=north east lines, pattern color={' + col + '}, draw={' + col + '}, line width=0.8pt, dashed';
    const cx = tx(fig.cx), cv = tv(vDe(fig, vistaId));
    s += '\\begin{scope}[shift={(' + n(cx) + ',' + n(cv) + ')}, scale=' + esc.toFixed(5) + _yscaleSolido(fig, vistaId) + ']\n';
    s += '\\filldraw[' + relleno + '] ' + _pathSolidoTikz(fig, vistaId) + ';\n\\end{scope}\n';
    s += '\\fill[black!55] (' + n(cx) + ',' + n(cv) + ') circle (1.1pt);\n';
    if(opts.numerar) s += '\\node[font=\\tiny\\bfseries, circle, draw={' + col + '}, fill=white, inner sep=0.9pt, above right=2pt] at ('
      + n(cx) + ',' + n(cv) + ') {' + (i+1) + '};\n';
  });
  if(opts.ejes){
    const ox = tx(0), ov = tv(0);
    s += '\\draw[black!70, line width=0.5pt, ->, >=stealth] (' + n(tx(minX)-0.6) + ',' + n(ov) + ') -- (' + n(tx(maxX)+0.6) + ',' + n(ov) + ') node[right, font=\\small] {$X$};\n';
    s += '\\draw[black!70, line width=0.5pt, ->, >=stealth] (' + n(ox) + ',' + n(tv(minV)-0.6) + ') -- (' + n(ox) + ',' + n(tv(maxV)+0.6) + ') node[above, font=\\small] {$' + (vistaId==='planta'?'Y':'Z') + '$};\n';
    s += '\\node[font=\\scriptsize, below left, inner sep=1pt] at (' + n(ox) + ',' + n(ov) + ') {$O$};\n';
  }
  if(opts.cotas){
    const yBorde = tv(minV), baseX = yBorde - 0.75;
    const cadX = tikzCadenaCotas(xs, tx, 'x', baseX, yBorde + 0.06); s += cadX.tex;
    const xBorde = tx(maxX), baseY = xBorde + 0.75;
    const cadV = tikzCadenaCotas(vs, tv, 'y', baseY, xBorde - 0.06); s += cadV.tex;
    const yTot = baseX - 0.30 - (cadX.nMax+1)*TIKZ_SALTO;
    s += '\\draw[bsaVerde, line width=0.45pt, <->, >=stealth] (' + n(tx(minX)) + ',' + n(yTot) + ') -- (' + n(tx(maxX)) + ',' + n(yTot) + ');\n';
    s += '\\node[font=\\scriptsize\\bfseries, text=bsaVerde, fill=white, inner sep=1pt] at (' + n((tx(minX)+tx(maxX))/2) + ',' + n(yTot) + ') {' + decP(maxX-minX,'len') + '\\,' + escLatex(unit) + '};\n';
    const xTot = baseY + 0.30 + (cadV.nMax+1)*TIKZ_SALTO;
    s += '\\draw[bsaVerde, line width=0.45pt, <->, >=stealth] (' + n(xTot) + ',' + n(tv(minV)) + ') -- (' + n(xTot) + ',' + n(tv(maxV)) + ');\n';
    s += '\\node[font=\\scriptsize\\bfseries, text=bsaVerde, fill=white, inner sep=1pt, rotate=90] at (' + n(xTot) + ',' + n((tv(minV)+tv(maxV))/2) + ') {' + decP(maxV-minV,'len') + '\\,' + escLatex(unit) + '};\n';
    // Radios de los sólidos de revolución, en su propio recuadro
    // Los rótulos que caen en el mismo sitio (sólidos coaxiales en la
    // planta) se apilan hacia abajo en vez de taparse.
    const puestos = [];
    figures.forEach(fig=>{
      const def = SOLID_DEFS[fig.type]; if(!def.rotR) return;
      const cx = tx(fig.cx); let cv = tv(vDe(fig, vistaId)) - 0.32;
      while(puestos.some(q=>Math.abs(q[0]-cx) < 0.9 && Math.abs(q[1]-cv) < 0.3)) cv -= 0.34;
      puestos.push([cx, cv]);
      s += '\\node[font=\\tiny, draw=black!45, fill=white, rounded corners=1pt, inner sep=1.2pt] at (' + n(cx) + ',' + n(cv) + ') {$' + def.rotR(fig.dims, v=>decP(v,'len')) + '$};\n';
    });
  }
  if(opts.marcarC && results && results.es3d){
    const r = results, vC = vistaId==='planta' ? r.ybar : r.zbar;
    const cx = tx(r.xbar), cv = tv(vC);
    s += '\\fill[bsaAlerta] (' + n(cx) + ',' + n(cv) + ') circle (2pt);\n';
    s += '\\node[font=\\small\\bfseries, above right, xshift=2pt] at (' + n(cx) + ',' + n(cv) + ') {C};\n';
    if(opts.ejes){
      const ox = tx(0), ov = tv(0);
      s += '\\draw[bsaAlerta, line width=0.4pt, dash pattern=on 1.4pt off 1.4pt] (' + n(ox) + ',' + n(cv) + ') -- (' + n(cx) + ',' + n(cv) + ') -- (' + n(cx) + ',' + n(ov) + ');\n';
      s += '\\node[font=\\small, below, inner sep=1.6pt] at (' + n((ox+cx)/2) + ',' + n(ov) + ') {$\\bar{x}$};\n';
      s += '\\node[font=\\small, left, inner sep=1.6pt] at (' + n(ox) + ',' + n((ov+cv)/2) + ') {$\\bar{' + (vistaId==='planta'?'y':'z') + '}$};\n';
    }
    if(r.hetero && r.sep > 1e-9){
      const vG = vistaId==='planta' ? r.yg : r.zg, gx = tx(r.xg), gv = tv(vG);
      s += '\\fill[bsaVerde] (' + n(gx) + ',' + n(gv) + ') circle (2pt);\n';
      s += '\\node[font=\\small\\bfseries, below left, xshift=-2pt] at (' + n(gx) + ',' + n(gv) + ') {G};\n';
    }
  }
  return s;
}

// Las dos láminas, una junto a otra, con un mismo pie.
function _laminasVistas3d(opts, lamina){
  return '\\noindent\\begin{minipage}[t]{0.49\\textwidth}\\centering\\vspace{0pt}\n'
    + '{\\footnotesize\\color{bsaAcc2}\\textbf{Planta (X--Y)}}\\\\[3pt]\n'
    + '\\begin{tikzpicture}[scale=1]\n' + tikzVista3d('planta', opts) + '\\end{tikzpicture}\n'
    + '\\end{minipage}\\hfill\\begin{minipage}[t]{0.49\\textwidth}\\centering\\vspace{0pt}\n'
    + '{\\footnotesize\\color{bsaAcc2}\\textbf{Alzado (X--Z)}}\\\\[3pt]\n'
    + '\\begin{tikzpicture}[scale=1]\n' + tikzVista3d('alzado', opts) + '\\end{tikzpicture}\n'
    + '\\end{minipage}\\par\\nopagebreak\\vspace{4pt}\n' + lamina;
}

// Croquis acotado del alzado de un sólido, al costado de su desarrollo.
function tikzCroquisSolido(fig, anchoCm){
  const def = SOLID_DEFS[fig.type], b = bounds3Rel(fig, true);
  const bw = Math.max(b.right-b.left,1e-9), bh = Math.max(b.top-b.bottom,1e-9);
  const W = anchoCm || 3.6, H = 3.0, esc = Math.min((W-1.1)/bw, (H-1.0)/bh);
  const cxm = (b.left+b.right)/2, cym = (b.bottom+b.top)/2;
  const tx = x => (x-cxm)*esc, ty = z => (z-cym)*esc, n = v => v.toFixed(3);
  const col = hexRgbSpec(fig.color), neg = fig.sign < 0;
  const ox = tx(0), oy = ty(0);
  let s = '\\begin{tikzpicture}[scale=1]\n';
  s += '\\begin{scope}[shift={(' + n(ox) + ',' + n(oy) + ')}, scale=' + esc.toFixed(4) + _yscaleSolido(fig, 'alzado') + ']\n';
  s += '\\path[' + (neg ? 'pattern=north east lines, pattern color={'+col+'}, draw={'+col+'}, line width=0.7pt, dashed'
                        : 'fill={'+col+'}, fill opacity=0.28, draw={'+col+'}, line width=0.8pt') + '] ' + _pathSolidoTikz(fig,'alzado',{rot0:true}) + ';\n';
  s += '\\end{scope}\n';
  s += '\\fill[bsaAlerta] (' + n(ox) + ',' + n(oy) + ') circle (1.4pt);\n';
  s += '\\node[font=\\tiny, above right, inner sep=1pt] at (' + n(ox) + ',' + n(oy) + ') {$C_i$};\n';
  const x0 = tx(b.left), x1 = tx(b.right), y0 = ty(b.bottom), y1 = ty(b.top), yc = y0-0.34, xc = x1+0.34;
  s += '\\draw[black!65, line width=0.3pt, <->, >=stealth] (' + n(x0) + ',' + n(yc) + ') -- (' + n(x1) + ',' + n(yc) + ');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt] at (' + n((x0+x1)/2) + ',' + n(yc) + ') {' + decP(bw,'len') + '};\n';
  s += '\\draw[black!65, line width=0.3pt, <->, >=stealth] (' + n(xc) + ',' + n(y0) + ') -- (' + n(xc) + ',' + n(y1) + ');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt, rotate=90] at (' + n(xc) + ',' + n((y0+y1)/2) + ') {' + decP(bh,'len') + '};\n';
  // cota del centroide desde la base (arriba si el sólido está volteado)
  const yb = fig.volteado ? y1 : y0;
  s += '\\draw[bsaAlerta, line width=0.3pt, <->, >=stealth] (' + n(x0-0.34) + ',' + n(yb) + ') -- (' + n(x0-0.34) + ',' + n(oy) + ');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt, rotate=90, text=bsaAlerta] at (' + n(x0-0.34) + ',' + n((yb+oy)/2) + ') {' + decP(def.cBase(fig.dims),'len') + '};\n';
  s += '\\end{tikzpicture}';
  return s;
}

function construirLatex3d(){
  if(!results || !results.es3d){ aviso('Primero calcula el centroide.'); return null; }
  _yaDichoCen = {};
  const het = results.hetero, st = results.steps;
  const U1 = '\\,\\text{' + escLatex(unit) + '}', U3 = '\\,\\text{' + escLatex(unit) + '}^{3}';
  const uTxt = escLatex(unit), u3Txt = escLatex(unit) + '\\textsuperscript{3}';
  const simb = (matSimbolo() === 'ρ') ? '\\rho' : '\\gamma';
  const esMasa = (matMagnitud === 'densidad');
  const Wsim = esMasa ? 'm' : 'W', Wnom = esMasa ? 'la masa' : 'el peso', Wnoms = esMasa ? 'las masas' : 'los pesos';
  const uGm = '\\text{' + escLatex(uGamma().replace('\u00B3','')) + '}^{3}';
  const uWtxt = esMasa ? 'kg' : escLatex(uGamma().split('/')[0]);
  const nombreDe = f => escLatex(f.etiqueta || f.name || SOLID_DEFS[f.type].name);

  // Autocomprobación: la tabla que se imprime debe reproducir el centroide.
  {
    let V=0,Qx=0,Qy=0,Qz=0; st.forEach(s=>{ V+=s.v; Qx+=s.vx; Qy+=s.vy; Qz+=s.vz; });
    const rel = (a,b)=>Math.abs(a-b) > 1e-9*Math.max(1, Math.abs(a), Math.abs(b));
    if(rel(V,results.V) || rel(Qx/V,results.xbar) || rel(Qy/V,results.ybar) || rel(Qz/V,results.zbar))
      console.warn('Informe LaTeX: la tabla no reproduce el centroide');
  }

  let figN = 0, tablaN = 0;
  const figCap = txt => { figN++; return '\\begin{center}{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\\end{center}\n\\vspace{4pt}\n'; };
  const tablaCaption = txt => { tablaN++; return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };
  const porque = (clave, txt) => _primeraVezCen(clave) ? '\\porque{' + txt + '}\n' : '';
  const cab = (t, f, u) => '\\textbf{' + t + '}' + (f.cab ? ' $' + f.cab + '$' : '') + (u ? ' {\\scriptsize(' + u + ')}' : '');
  const listaNums = ns => ns.length === 1 ? String(ns[0]) : ns.slice(0,-1).join(', ') + ' y ' + ns[ns.length-1];

  // Sólidos iguales (tipo, dimensiones, signo y material) se desarrollan una vez.
  const clave = f => f.type + '|' + JSON.stringify(f.dims) + '|' + f.sign + (het ? '|' + (f.matId==null?'':f.matId) : '');
  const grupos = [], pos = {};
  st.forEach((s,i)=>{ const k = clave(s.fig); if(pos[k]===undefined){ pos[k]=grupos.length; grupos.push({idx:[i]}); } else grupos[pos[k]].idx.push(i); });
  // Envolvente y simetría: todos los sólidos tienen su eje vertical; el
  // cuerpo es simétrico respecto del plano x = x0 (o y = y0) si todos los
  // ejes caen en él (para la cuña, el eje pasa por su centroide, que no es
  // el del centro de la base: se excluye de la simetría en x).
  const bb = bbox3d();
  let minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
  figures.forEach(f=>{ const b=bounds3Mundo(f); minY=Math.min(minY,b.y0); maxY=Math.max(maxY,b.y1); minZ=Math.min(minZ,b.z0); maxZ=Math.max(maxZ,b.z1); });
  const x0e = (bb.x0+bb.x1)/2, y0e = (minY+maxY)/2;
  const tol = 1e-6*Math.max(1, bb.x1-bb.x0, maxY-minY);
  // La simetría por «todos los ejes en un plano» exige que cada sólido sea
  // simétrico respecto de ese plano: la cuña no lo es en x, y un poliedro
  // girado tampoco lo es respecto de los planos coordenados.
  const rotMod = (f, m) => Math.abs(((f.rotation||0) % m + m) % m);
  const rotOK = f => !(SOLID_DEFS[f.type].vertices && rotMod(f, 90) > 1e-9 && Math.abs(rotMod(f, 90) - 90) > 1e-9);
  // La cuña con giro 0 o 180 tiene su desalineación en x (no es simétrica en x); con 90 o 270, en y.
  const cunaEnX = f => SOLID_DEFS[f.type].cLocal && (rotMod(f, 180) < 1e-9 || Math.abs(rotMod(f, 180) - 180) < 1e-9);
  const cunaEnY = f => SOLID_DEFS[f.type].cLocal && !cunaEnX(f);
  const simX = figures.every(f=>rotOK(f) && !cunaEnX(f) && Math.abs(f.cx-x0e) < tol);
  const simY = figures.every(f=>rotOK(f) && !cunaEnY(f) && Math.abs(f.cy-y0e) < tol);

  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});
  let tex = _preambuloLatexCen('Cuerpos compuestos en 3D');
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} ' + (het ? 'Centro de gravedad y centroide de un cuerpo sólido compuesto' : 'Centroide de un cuerpo sólido compuesto') + '}\\\\[3pt]\n'
    + '  {\\large\\color{bsaAcc2} Método de las partes: volúmenes, momentos estáticos y centroide}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Informe generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{6pt}\n\n';

  // ══ 1. Planteamiento ══
  tex += '\\seccion{1. Planteamiento del problema}\n';
  tex += _laminasVistas3d({cotas:true, numerar:true, ancho:6.6, alto:7.0},
    figCap('Cuerpo compuesto en planta (X--Y) y en alzado (X--Z), con los sólidos numerados y las cotas generales. Los sólidos rayados son huecos.'));
  // Croquis isométrico de solo lectura (23-vista-isometrica.js)
  if(typeof tikzIso3d === 'function'){
    tex += '\\begin{center}\\begin{tikzpicture}[scale=1]\n' + tikzIso3d({numerar:true, ejes:true, ancho:8.0, alto:5.5}) + '\\end{tikzpicture}\\par\\nopagebreak\\vspace{4pt}\n'
      + figCap('Croquis isométrico del cuerpo (observador en la dirección $(1,1,1)$): silueta y número de cada sólido; los huecos, a trazos.').replace('\\begin{center}','') ;
  }
  tex += '\\subpaso{Objetivo}\n'
    + 'Localizar el centroide $C$ del cuerpo' + (het ? ' y su centro de gravedad $G$' : '')
    + ': sus tres coordenadas $\\bar{x}$, $\\bar{y}$, $\\bar{z}$ medidas desde el origen $O$.\n';
  tex += porque('centroide',
    'El peso de un cuerpo es la resultante de los pesos de todas sus partículas, un sistema de fuerzas paralelas que pasa '
    + 'siempre por el mismo punto del cuerpo: el \\emph{centro de gravedad} $G$. Se localiza igualando el momento del peso '
    + 'total al de todos los pesos parciales. Con material homogéneo el peso específico se cancela y queda solo la '
    + 'geometría: el \\emph{centroide} $C$ del volumen. En un cuerpo compuesto, la integral se convierte en una suma sobre '
    + 'partes de centroide conocido, y un agujero es una parte más con volumen negativo.');
  tex += '\\subpaso{Procedimiento de análisis}\n'
    + '\\begin{enumerate}\\setlength{\\itemsep}{1pt}\n'
    + '\\item \\textbf{Partes.} Se divide el cuerpo en sólidos de centroide conocido (prismas, cilindros, conos y conos truncados, esferas, '
    + 'semiesferas, paraboloides, pirámides, cuñas). Un agujero es una parte con volumen \\textbf{negativo}.\n'
    + '\\item \\textbf{Propiedades de cada parte.} Su volumen $V_i$, la posición de su centroide sobre su eje (fórmula de '
    + 'la tabla) y las coordenadas $\\tilde{x}_i$, $\\tilde{y}_i$, $\\tilde{z}_i$ de ese centroide desde $O$.'
    + (het ? ' En un cuerpo heterogéneo, además, ' + Wnom + ' de cada parte, $' + Wsim + '_i = ' + simb + '_i V_i$.' : '') + '\n'
    + '\\item \\textbf{Tabla.} $V_i$, $\\tilde{x}_i$, $\\tilde{y}_i$, $\\tilde{z}_i$ y los momentos estáticos $V_i\\tilde{x}_i$, '
    + '$V_i\\tilde{y}_i$, $V_i\\tilde{z}_i$, con sus sumas.\n'
    + '\\item \\textbf{Centroide.} $\\bar{x} = \\sum V_i\\tilde{x}_i/\\sum V_i$ y lo mismo en $y$ y en $z$'
    + (het ? '; $G$ con ' + Wnoms : '') + '. Después se comprueba.\n'
    + '\\end{enumerate}\n';
  const hayVolteo = figures.some(f=>f.volteado && f.type !== 's_esfera');
  const hayGiro = figures.some(f=>SOLID_DEFS[f.type].vertices && Math.abs(f.rotation||0) > 1e-9);
  const hayCuna = figures.some(f=>SOLID_DEFS[f.type].cLocal);
  tex += '\\subpaso{Convenio}\n'
    + '\\noindent Cada sólido se coloca por el \\textbf{centro de su base} y tiene su eje vertical (paralelo a $Z$). '
    + 'Las posiciones se miden desde $O$: $x$ hacia la derecha, $y$ hacia el fondo de la planta, $z$ hacia arriba. '
    + 'La tilde señala el centroide de una parte; la barra, el de todo el cuerpo. Los huecos entran con volumen negativo.'
    + (hayVolteo ? ' Un sólido \\emph{volteado} cuelga por debajo del punto donde se colocó: su base queda arriba.' : '')
    + (hayGiro ? ' El giro $\\alpha$ de un prisma, pirámide o cuña es alrededor de su eje vertical, antihorario visto en planta; en el alzado se ve su silueta girada.' : '')
    + '\n';

  // ══ 2. Paso 1: cada parte ══
  tex += '\\seccion{2. Paso 1 --- Propiedades de cada parte}\n';
  grupos.forEach((g, gi)=>{
    const i0 = g.idx[0], s0 = st[i0], f = s0.fig, def = SOLID_DEFS[f.type];
    const nums = g.idx.map(i=>i+1), varios = g.idx.length > 1;
    const d = f.dims, D = v => decP(v,'len');
    if(gi > 0) tex += '\\vspace{10pt}\\noindent\\textcolor{black!20}{\\rule{\\textwidth}{0.4pt}}\\vspace{10pt}\n\n';
    tex += '\\par\\noindent\\begin{minipage}{\\textwidth}\n';
    tex += '\\noindent{\\bfseries\\color{bsaAcc} ' + (varios ? 'Partes ' + listaNums(nums) : 'Parte ' + nums[0]) + ': ' + nombreDe(f)
      + '}\\ \\ {\\small\\color{bsaMuted}(' + (f.sign > 0 ? (varios?'se suman':'se suma') : (varios?'se restan':'se resta')) + ')}\\\\[3pt]\n';
    if(varios) tex += '{\\footnotesize Las ' + g.idx.length + ' partes son iguales: volumen y centroide propio se calculan una vez; cada una entra en la tabla con su posición.}\\\\[4pt]\n';
    tex += '\\noindent\\begin{minipage}[t]{0.60\\textwidth}\n\\small\n\\abovedisplayskip=3pt\\belowdisplayskip=3pt\\abovedisplayshortskip=2pt\\belowdisplayshortskip=2pt\n';
    // Volumen: fórmula literal y sustituida
    const sust = def.formula.sust(d, D);
    tex += '\\textbf{Volumen}\n\\[ ' + def.formula.V + ' = ' + sust + ' = ' + decP(Math.abs(s0.v),'area') + U3 + ' \\]\n';
    if(f.sign < 0){
      tex += porque('hueco', 'Un agujero es material que falta: se calcula como si el cuerpo estuviera lleno y se le resta '
        + 'el volumen del hueco, con su centroide en el sitio del hueco. La fórmula de compuestos sigue valiendo, con un '
        + 'sumando negativo.');
      tex += '{\\footnotesize En las sumas: $V_{' + nums[0] + '} = -' + decP(Math.abs(s0.v),'area') + U3 + '$.}\\\\[3pt]\n';
    }
    // Centroide propio
    const cb = def.cBase(d);
    tex += '\\textbf{Centroide propio}\n\\[ ' + def.formula.c + ' = ' + D(cb) + U1 + ' \\quad\\text{' + (def.cLocal ? 'desde la base' : 'sobre el eje, desde el centro de la base') + (f.volteado ? ', hacia abajo (volteado)' : '') + '} \\]\n';
    if(def.cLocal){
      const cl = def.cLocal(d);
      tex += '\\[ ' + def.formula.cx + ' = ' + D(d.b/3) + U1 + ' \\quad\\text{desde la cara vertical, es decir a } ' + D(Math.abs(cl.x)) + U1 + ' \\text{ del centro de la base} \\]\n';
      tex += porque('cuna', 'La cuña es un triángulo rectángulo extruido a lo largo de $y$: el centroide del triángulo está a un tercio de '
        + 'cada cateto (a $h/3$ de la base y a $b/3$ de la cara vertical), y la extrusión no lo mueve. Por eso no queda sobre el '
        + 'eje del centro de la base, y su posición en $x$ depende del giro $\\alpha$.');
    }
    if(f.type==='s_conotrunc')
      tex += porque('conotrunc', 'Un cono truncado es un cono entero al que le falta la punta: integrando discos entre los dos radios '
        + 'salen su volumen y su centroide, que queda más cerca de la base ancha cuanto mayor es la diferencia de radios (con $R_2 = 0$ '
        + 'se recupera $h/4$; con $R_2 = R_1$, el cilindro y $h/2$).');
    else if(f.type==='s_paraboloide')
      tex += porque('paraboloide', 'En el paraboloide el área de cada sección crece linealmente con la distancia al vértice ($r^{2} \\propto z$), '
        + 'así que hay más material junto a la cara plana: al integrar, el centroide queda a $h/3$ de esa cara ($2h/3$ desde el vértice).');
    else if(f.type==='s_cono' || f.type==='s_piramide')
      tex += porque('cono', 'En un cono o una pirámide hay mucho más material cerca de la base que cerca del vértice: las '
        + 'secciones horizontales encogen con el cuadrado de la distancia al vértice. Al integrar, el centroide queda a un '
        + 'cuarto de la altura desde la base (tres cuartos desde el vértice).');
    else if(f.type==='s_semiesfera')
      tex += porque('semiesfera', 'La semiesfera tiene más material junto a su cara plana que junto a la cúpula, así que el '
        + 'centroide no está a $R/2$ sino a $3R/8$ de la cara plana: se obtiene integrando discos horizontales de radio '
        + 'decreciente.');
    else if(f.type==='s_prisma' || f.type==='s_cilindro')
      tex += porque('simetrico', 'Un prisma o un cilindro tienen un plano de simetría a media altura y un eje de simetría '
        + 'vertical: el centroide está sobre el eje, a $h/2$ de la base, sin integrar nada.');
    // Posición
    tex += '\\textbf{Posición desde $O$}\n';
    tex += porque('posicion', 'El centroide de cada parte se obtiene sumando, al centro de su base (que es donde se colocó), la '
      + 'distancia del centroide propio a lo largo del eje' + (hayCuna ? ' (y, en la cuña, su desalineación horizontal, girada con ella)' : '')
      + (hayVolteo ? '; en un sólido volteado esa distancia se resta, porque el cuerpo cuelga hacia abajo' : '') + '. '
      + 'Sus tres coordenadas son los brazos con los que el volumen entra en las sumas de momentos.');
    g.idx.forEach(i=>{ const s = st[i];
      tex += '\\[ \\tilde{x}_{' + (i+1) + '} = ' + D(s.xi) + U1 + ' \\qquad \\tilde{y}_{' + (i+1) + '} = ' + D(s.yi) + U1 + ' \\qquad \\tilde{z}_{' + (i+1) + '} = ' + D(s.zi) + U1 + ' \\]\n'; });
    if(het){
      const gs = s0.mat ? decP(s0.g,'len') : '1';
      tex += '\\textbf{' + (esMasa ? 'Masa' : 'Peso') + '}\n';
      tex += porque('peso', 'Con materiales distintos ' + Wnom + ' ya no es proporcional al volumen: cada parte '
        + (esMasa ? 'tiene masa' : 'pesa') + ' $' + simb + '_i V_i$, y el balance de momentos que localiza $G$ se hace con '
        + Wnoms + '. $G$ se desplaza hacia el material más ' + (esMasa ? 'denso' : 'pesado') + '.');
      tex += '\\[ ' + Wsim + '_{' + nums[0] + '} = ' + simb + '_{' + nums[0] + '}\\,V_{' + nums[0] + '} = (' + gs + ')(' + decP(Math.abs(s0.v),'area') + ') = '
        + decP(Math.abs(s0.w),'area') + '\\,\\text{' + uWtxt + '} \\]\n';
      tex += '{\\footnotesize $' + simb + '_{' + nums[0] + '} = ' + gs + '\\,' + uGm + '$' + (varios ? '; igual para las demás partes del grupo' : '') + (f.sign<0 ? '. Como es un hueco, entra con signo negativo' : '') + '.}\n';
    }
    tex += '\\end{minipage}\\hfill\n\\begin{minipage}[t]{0.36\\textwidth}\n\\vspace{2pt}\\centering\n' + tikzCroquisSolido(f, 4.2) + '\n'
      + '\\\\[2pt]{\\scriptsize\\color{bsaMuted}Alzado acotado en ' + uTxt + '; en naranja, la altura del centroide desde la base}\n'
      + '\\end{minipage}\n\\end{minipage}\n\\vspace{4pt}\n';
  });

  // ══ 3. Paso 2: tabla ══
  tex += '\\seccion{3. Paso 2 --- Tabla de volúmenes y momentos estáticos}\n';
  tex += porque('momento', 'El producto $V_i\\tilde{x}_i$ es el momento estático (de primer orden) del volumen de la parte '
    + 'respecto del plano $x = 0$: volumen por brazo. Sumado sobre las partes, sustituye a la integral $\\int\\tilde{x}\\,dV$ '
    + 'de la definición. Lo mismo en $y$ y en $z$.');
  const fV = factorColumna(st.map(s=>s.v)), fVX = factorColumna(st.map(s=>s.vx).concat([results.Qx])),
        fVY = factorColumna(st.map(s=>s.vy).concat([results.Qy])), fVZ = factorColumna(st.map(s=>s.vz).concat([results.Qz]));
  tex += tablaCaption('Volúmenes, posición del centroide de cada parte y momentos estáticos. Los volúmenes llevan ya el signo de la parte.');
  const tNumV = tablaN;
  tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{clccccccc}\\hline\n'
    + '\\textbf{Parte} & \\textbf{Sólido} & ' + cab('$V_i$', fV, u3Txt) + ' & \\textbf{$\\tilde{x}_i$} & \\textbf{$\\tilde{y}_i$} & \\textbf{$\\tilde{z}_i$} & '
    + cab('$V_i\\tilde{x}_i$', fVX, '') + ' & ' + cab('$V_i\\tilde{y}_i$', fVY, '') + ' & ' + cab('$V_i\\tilde{z}_i$', fVZ, '') + '\\\\\\hline\n';
  st.forEach((s,i)=>{
    tex += (i+1) + ' & ' + nombreDe(s.fig) + ' & ' + celdaCol(s.v, fV, DEC.area) + ' & ' + decP(s.xi,'len') + ' & ' + decP(s.yi,'len') + ' & ' + decP(s.zi,'len')
      + ' & ' + celdaCol(s.vx, fVX, DEC.area) + ' & ' + celdaCol(s.vy, fVY, DEC.area) + ' & ' + celdaCol(s.vz, fVZ, DEC.area) + ' \\\\\n';
  });
  tex += '\\hline\\multicolumn{2}{l}{$\\sum$} & ' + celdaCol(results.V, fV, DEC.area) + ' & --- & --- & --- & '
    + celdaCol(results.Qx, fVX, DEC.area) + ' & ' + celdaCol(results.Qy, fVY, DEC.area) + ' & ' + celdaCol(results.Qz, fVZ, DEC.area) + ' \\\\\n\\hline\\end{tabular}\\end{tablacentrada}}\n';
  let tNumW;
  if(het){
    const fW = factorColumna(st.map(s=>s.w)), fWX = factorColumna(st.map(s=>s.wx).concat([results.Wx])),
          fWY = factorColumna(st.map(s=>s.wy).concat([results.Wy])), fWZ = factorColumna(st.map(s=>s.wz).concat([results.Wz]));
    tex += '\\vspace{4pt}\n' + tablaCaption((esMasa ? 'Densidades, masas' : 'Pesos específicos, pesos') + ' y momentos estáticos de ' + Wnom.split(' ')[1] + ', con $' + Wsim + '_i$ en ' + uWtxt + '.');
    tNumW = tablaN;
    tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{ccccccc}\\hline\n\\textbf{Parte} & \\textbf{Material} & \\textbf{$' + simb + '_i$} & '
      + cab('$' + Wsim + '_i$', fW, '') + ' & ' + cab('$' + Wsim + '_i\\tilde{x}_i$', fWX, '') + ' & ' + cab('$' + Wsim + '_i\\tilde{y}_i$', fWY, '') + ' & ' + cab('$' + Wsim + '_i\\tilde{z}_i$', fWZ, '') + '\\\\\\hline\n';
    st.forEach((s,i)=>{ tex += (i+1) + ' & ' + (s.mat ? '$' + simb + '_{' + s.mat.id + '}$' : '---') + ' & ' + decP(s.g,'len') + ' & ' + celdaCol(s.w, fW, DEC.area)
      + ' & ' + celdaCol(s.wx, fWX, DEC.area) + ' & ' + celdaCol(s.wy, fWY, DEC.area) + ' & ' + celdaCol(s.wz, fWZ, DEC.area) + ' \\\\\n'; });
    tex += '\\hline\\multicolumn{3}{l}{$\\sum$} & ' + celdaCol(results.W, fW, DEC.area) + ' & ' + celdaCol(results.Wx, fWX, DEC.area) + ' & ' + celdaCol(results.Wy, fWY, DEC.area) + ' & ' + celdaCol(results.Wz, fWZ, DEC.area) + ' \\\\\n\\hline\\end{tabular}\\end{tablacentrada}}\n';
  }

  // ══ 4. Paso 3: centroide ══
  tex += '\\seccion{4. Paso 3 --- ' + (het ? 'Centroide y centro de gravedad' : 'Centroide del cuerpo') + '}\n';
  tex += '\\noindent Con las sumas de la Tabla ' + tNumV + ':\n\\[ V = \\sum V_i = ' + ftex(results.V) + U3 + ' \\]\n';
  const coc = (n, num) => '\\bar{' + n + '} = \\dfrac{\\sum V_i\\tilde{' + n + '}_i}{\\sum V_i} = \\dfrac{' + ftex(num) + '}{' + ftex(results.V) + '}';
  tex += '\\[ ' + coc('x', results.Qx) + ' = ' + decP(results.xbar,'len') + U1 + ' \\qquad ' + coc('y', results.Qy) + ' = ' + decP(results.ybar,'len') + U1 + ' \\]\n';
  tex += '\\[ ' + coc('z', results.Qz) + ' = ' + decP(results.zbar,'len') + U1 + ' \\]\n';
  tex += porque('cociente', 'Dividir el momento estático total entre el volumen total da la posición en la que habría que '
    + 'concentrar todo el volumen para producir el mismo momento: la definición del centroide, coordenada a coordenada.');
  tex += '\\resultado{\\centering $C\\,(\\bar{x};\\ \\bar{y};\\ \\bar{z}) = (' + decP(results.xbar,'len') + ';\\ ' + decP(results.ybar,'len') + ';\\ ' + decP(results.zbar,'len') + ')' + U1 + '$, medido desde $O$.}\n';
  if(het){
    tex += '\\subpaso{Centro de gravedad $G$}\n\\noindent Con las sumas de la Tabla ' + tNumW + ', el mismo cociente con ' + Wnoms + ':\n';
    const cw = (n, num) => '\\bar{' + n + '}_G = \\dfrac{\\sum ' + Wsim + '_i\\tilde{' + n + '}_i}{\\sum ' + Wsim + '_i} = \\dfrac{' + ftex(num) + '}{' + ftex(results.W) + '}';
    tex += '\\[ ' + cw('x', results.Wx) + ' = ' + decP(results.xg,'len') + U1 + ' \\qquad ' + cw('y', results.Wy) + ' = ' + decP(results.yg,'len') + U1 + ' \\]\n';
    tex += '\\[ ' + cw('z', results.Wz) + ' = ' + decP(results.zg,'len') + U1 + ' \\]\n';
    tex += '\\resultado{\\centering $G\\,(' + decP(results.xg,'len') + ';\\ ' + decP(results.yg,'len') + ';\\ ' + decP(results.zg,'len') + ')' + U1 + '$, a ' + decP(results.sep,'len') + '\\,' + uTxt + ' de $C$.}\n';
  }
  tex += '\\veredicto{' + (het
    ? 'Cuerpo \\textbf{heterogéneo}: $G$ no coincide con $C$ (distan ' + decP(results.sep,'len') + '\\,' + uTxt + '); se desplaza hacia el material más ' + (esMasa?'denso':'pesado') + '.'
    : 'Cuerpo \\textbf{homogéneo}: el peso específico se cancela en el cociente; centroide, centro de masa y centro de gravedad son el mismo punto $C$.') + '}\n';

  // ══ 5. Paso 4: comprobaciones ══
  tex += '\\seccion{5. Paso 4 --- Comprobaciones}\n';
  tex += porque('comprobar', 'Tres cosas se cumplen siempre: si todos los sólidos tienen su eje en un mismo plano vertical, el '
    + 'centroide está en ese plano; $C$ cae dentro de la caja que envuelve al cuerpo (puede caer fuera del material, como en un '
    + 'tubo, pero no fuera de la caja); y respecto de cualquier plano que pase por $C$ el momento estático total es nulo.');
  tex += '\\begin{itemize}\\setlength{\\itemsep}{2pt}\n';
  if(simX || simY){
    tex += '\\item \\textbf{Simetría.} ';
    if(simX) tex += 'Todos los ejes están en el plano $x = ' + decP(x0e,'len') + '$' + U1 + ', así que $\\bar{x}$ tenía que caer en él: $\\bar{x} = ' + decP(results.xbar,'len') + '$'
      + (Math.abs(results.xbar-x0e) < tol ? '\\ \\checkmark' : ' (no coincide: revisar)') + '. ';
    if(simY) tex += 'Todos los ejes están en el plano $y = ' + decP(y0e,'len') + '$' + U1 + ', así que $\\bar{y}$ tenía que caer en él: $\\bar{y} = ' + decP(results.ybar,'len') + '$'
      + (Math.abs(results.ybar-y0e) < tol ? '\\ \\checkmark' : ' (no coincide: revisar)') + '. ';
    tex += '\n';
  } else {
    tex += '\\item \\textbf{Simetría.} Los ejes de los sólidos no comparten un plano vertical: ninguna coordenada se conoce de antemano.\n';
  }
  const dentro = results.xbar >= bb.x0-tol && results.xbar <= bb.x1+tol && results.ybar >= minY-tol && results.ybar <= maxY+tol && results.zbar >= minZ-tol && results.zbar <= maxZ+tol;
  tex += '\\item \\textbf{Envolvente.} El cuerpo ocupa $' + decP(bb.x0,'len') + ' \\le x \\le ' + decP(bb.x1,'len') + '$, $' + decP(minY,'len') + ' \\le y \\le ' + decP(maxY,'len') + '$ y $'
    + decP(minZ,'len') + ' \\le z \\le ' + decP(maxZ,'len') + '$' + U1 + ', y $C$ queda dentro' + (dentro ? '\\ \\checkmark' : ' --- no queda dentro: revisar') + '.\n';
  {
    let mx=0,my=0,mz=0; st.forEach(s=>{ mx+=s.v*(s.xi-results.xbar); my+=s.v*(s.yi-results.ybar); mz+=s.v*(s.zi-results.zbar); });
    const esc0 = Math.max(Math.abs(results.Qx),Math.abs(results.Qy),Math.abs(results.Qz),1);
    const cero = v => (Math.abs(v) < 1e-9*esc0) ? '0' : ftex(v);
    tex += '\\item \\textbf{Momento nulo respecto de $C$.} $\\sum V_i(\\tilde{x}_i-\\bar{x}) = ' + cero(mx) + '$, $\\sum V_i(\\tilde{y}_i-\\bar{y}) = ' + cero(my)
      + '$, $\\sum V_i(\\tilde{z}_i-\\bar{z}) = ' + cero(mz) + '$\\ \\checkmark\n';
  }
  tex += '\\end{itemize}\n';
  // Pappus–Guldinus: solo si todo es de revolución alrededor del mismo eje.
  const pap = (typeof datosPappus === 'function') ? datosPappus() : null;
  if(pap){
    tex += '\\subpaso{Pappus y Guldinus}\n';
    tex += '\\noindent Todos los sólidos son de revolución alrededor del mismo eje vertical ($x = ' + decP(pap.eje.x,'len') + '$, $y = ' + decP(pap.eje.y,'len') + '$' + U1 + '). '
      + 'Cada volumen debe ser entonces el de girar $360^{\\circ}$ su media sección alrededor del eje: $V_i = 2\\pi\\,\\bar{r}_i\\,A_i$, con $A_i$ el área generatriz y $\\bar{r}_i$ la distancia de su centroide al eje.\n';
    tex += porque('pappus', 'Segundo teorema de Pappus y Guldinus: el volumen de un sólido de revolución es igual al área generatriz por la '
      + 'longitud del camino que recorre su centroide, $2\\pi\\bar{r}$. Vale para el cuerpo entero porque su media sección es la suma '
      + 'de las medias secciones de las partes (los huecos, con área negativa). Es una comprobación independiente de las fórmulas de la tabla.');
    const fA = factorColumna(pap.filas.map(r=>r.A)), fVp = factorColumna(pap.filas.map(r=>r.Vp).concat([pap.Vp]));
    // Fórmulas de la media sección, una vez por tipo de sólido
    const vistos = {};
    const lineas = pap.filas.filter(r=>{ if(vistos[r.fig.type]) return false; vistos[r.fig.type] = true; return true; })
      .map(r=>SOLID_DEFS[r.fig.type].name.toLowerCase() + ': $' + r.p.texA + '$, $' + r.p.texR + '$');
    tex += '\\noindent{\\footnotesize Media sección de cada sólido (Hibbeler, tabla de centroides de áreas) --- ' + lineas.join('; ') + '.}\\par\\vspace{3pt}\n';
    tex += tablaCaption('Comprobación por Pappus y Guldinus: área generatriz, brazo de su centroide y volumen $2\\pi\\bar{r}_iA_i$ frente al de la Tabla ' + tNumV + '. Las áreas de los huecos van con signo negativo.');
    tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{clcccc}\\hline\n\\textbf{Parte} & \\textbf{Sólido} & ' + cab('$A_i$', fA, escLatex(unit) + '\\textsuperscript{2}')
      + ' & \\textbf{$\\bar{r}_i$} {\\scriptsize(' + uTxt + ')} & ' + cab('$2\\pi\\bar{r}_iA_i$', fVp, u3Txt) + ' & \\textbf{$V_i$} {\\scriptsize(Tabla ' + tNumV + ')}\\\\\\hline\n';
    pap.filas.forEach((r,i)=>{
      tex += (i+1) + ' & ' + nombreDe(r.fig) + ' & ' + celdaCol(r.A*r.fig.sign, fA, DEC.area)
        + ' & ' + decP(r.r,'len') + ' & ' + celdaCol(r.Vp, fVp, DEC.area) + ' & ' + celdaCol(r.V, fVp, DEC.area) + ' \\\\\n';
    });
    tex += '\\hline\\multicolumn{4}{l}{$\\sum$} & ' + celdaCol(pap.Vp, fVp, DEC.area) + ' & ' + celdaCol(results.V, fVp, DEC.area) + ' \\\\\n\\hline\\end{tabular}\\end{tablacentrada}}\n';
    tex += '\\noindent{\\footnotesize ' + (pap.ok ? 'Coinciden volumen a volumen y en el total\\ \\checkmark' : 'No coinciden: revisar.') + '}\\par\\vspace{6pt}\n';
    if(!pap.ok) console.warn('Informe LaTeX: Pappus no reproduce los volúmenes');
  }
  tex += '\\subpaso{Cuerpo resuelto}\n';
  tex += _laminasVistas3d({cotas:false, ejes:true, marcarC:true, ancho:6.0, alto:6.5},
    figCap('Cuerpo resuelto: posición de $C$' + (het ? ' y de $G$' : '') + ' en planta y en alzado, medida desde los ejes. Los valores están en la Tabla ' + (tablaN+1) + '.'));
  tex += tablaCaption('Resultados.');
  tex += '{\\small\\begin{tablacentrada}\\begin{tabular}{lcc}\\hline\n\\textbf{Magnitud} & \\textbf{Valor} & \\textbf{Unidad} \\\\\\hline\n'
    + 'Volumen total $V$ & $' + ftex(results.V) + '$ & ' + u3Txt + ' \\\\\n'
    + 'Centroide $\\bar{x}$, $\\bar{y}$, $\\bar{z}$ & $' + decP(results.xbar,'len') + '$, $' + decP(results.ybar,'len') + '$, $' + decP(results.zbar,'len') + '$ & ' + uTxt + ' \\\\\n';
  if(het) tex += (esMasa?'Masa':'Peso') + ' total $' + Wsim + '$ & $' + ftex(results.W) + '$ & ' + uWtxt + ' \\\\\n'
    + 'Centro de gravedad $\\bar{x}_G$, $\\bar{y}_G$, $\\bar{z}_G$ & $' + decP(results.xg,'len') + '$, $' + decP(results.yg,'len') + '$, $' + decP(results.zg,'len') + '$ & ' + uTxt + ' \\\\\n';
  tex += '\\hline\\end{tabular}\\end{tablacentrada}}\n';

  tex += '\\vspace{10pt}\\noindent{\\footnotesize\\color{bsaMuted}\\textbf{Referencias.} R.~C. Hibbeler, \\emph{Ingeniería Mecánica: Estática}, 12.\\textsuperscript{a} ed., cap.~9 «Centro de gravedad y centroide», §9.1--9.2 y tabla de centroides de sólidos. F.~P. Beer y E.~R. Johnston, \\emph{Mecánica vectorial para ingenieros: Estática}, cap.~5.}\n';
  tex += colofonLatexBSA();
  tex += '\\end{document}\n';
  return tex;
}
