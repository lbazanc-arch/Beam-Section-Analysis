// ═══════════════════════════════════════════════════════════
//  PDF
// ═══════════════════════════════════════════════════════════
function recortarLienzo(c){
  if(!c) return null;
  try{
    const w = c.width, h = c.height;
    const dd = c.getContext('2d').getImageData(0,0,w,h).data;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4; if(dd[i+3]<8) continue;
      const r2=dd[i],g2=dd[i+1],b2=dd[i+2];
      const mx=Math.max(r2,g2,b2), mn=Math.min(r2,g2,b2);
      if((mx-mn)<=18 && mn>=190) continue;
      if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    }
    if(x1<0) return c.toDataURL('image/png');
    const m=Math.round(Math.min(w,h)*0.02)+6;
    x0=Math.max(0,x0-m); y0=Math.max(0,y0-m); x1=Math.min(w-1,x1+m); y1=Math.min(h-1,y1+m);
    const cw=x1-x0+1, ch=y1-y0+1;
    const t=document.createElement('canvas'); t.width=cw; t.height=ch;
    const tc=t.getContext('2d'); tc.fillStyle='#fff'; tc.fillRect(0,0,cw,ch);
    tc.drawImage(c,x0,y0,cw,ch,0,0,cw,ch);
    return t.toDataURL('image/png');
  }catch(e){ return c.toDataURL('image/png'); }
}

// ═══════════════════════════════════════════════════════════
//  GENERADOR DE PDF PROFESIONAL CON LATEX (texlive.net)
//  Mismo mecanismo que Cap. 6, 7 y 9: traductor independiente del HTML,
//  parte de los mismos datos que ya alimentan renderResultados (R).
// ═══════════════════════════════════════════════════════════
function escLatex(s){
  return String(s).replace(/([%&_#{}$])/g, '\\$1');
}
// Unidad de presión en texto plano (fuerza/longitud²), apta para \text{}.
function uPresLatex(){ return escLatex(unitFor) + '/' + escLatex(unitLen) + '$^2$'; }

// ── Geometría de la compuerta y zonas de líquido, en TikZ ──
function tikzCompuerta(){
  if(!nodos.length) return '';
  // Caja que abarca la compuerta y los niveles de líquido, para escalar.
  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  const mete = (x,y)=>{ minx=Math.min(minx,x); maxx=Math.max(maxx,x);
                        miny=Math.min(miny,y); maxy=Math.max(maxy,y); };
  nodos.forEach(n=>mete(n.x,n.y));
  [1,2].forEach(z=>{ const nv = nivelZona(z); if(isFinite(nv)) mete(minx, nv); });
  const spanX = Math.max(maxx-minx, 1e-6), spanY = Math.max(maxy-miny, 1e-6);
  const k = Math.min(9/spanX, 6/spanY, 2.4);
  const X = x => (x-minx)*k, Y = y => (y-miny)*k;
  const F = n => n.toFixed(3);
  let out = '';

  // Zonas de líquido: una banda por zona, desde su nivel hasta el fondo.
  const anchoZ = (maxx-minx)*k;
  [1,2].forEach(z=>{
    const nv = nivelZona(z);
    if(!isFinite(nv)) return;
    const x0 = (z===1) ? -0.6 : anchoZ/2;
    const x1 = (z===1) ? anchoZ/2 : anchoZ+0.6;
    const yTop = Y(Math.min(nv, maxy)), yBot = Y(miny) - 0.5;
    if(yTop <= yBot) return;
    out += '\\fill[bsaAgua!16] (' + F(x0) + ',' + F(yBot) + ') rectangle (' + F(x1) + ',' + F(yTop) + ');\n';
    out += '\\draw[bsaAgua, line width=.9pt] (' + F(x0) + ',' + F(yTop) + ') -- (' + F(x1) + ',' + F(yTop) + ');\n';
    // La etiqueta va pegada al borde exterior de la banda (izquierda la zona 1,
    // derecha la zona 2): en el centro chocaba con el nombre del nudo.
    const xEtq = (z===1) ? x0 + 0.05 : x1 - 0.05;
    const anclaje = (z===1) ? 'above right' : 'above left';
    out += '\\node[' + anclaje + ', font=\\tiny, color=bsaAgua] at (' + F(xEtq) + ',' + F(yTop) + ') {Zona ' + z + '};\n';
  });

  // Tramos de la compuerta (rectos o curvos, muestreando el arco).
  tramos.forEach(t=>{
    const pts = puntosTramo(t, 40);
    if(pts.length < 2) return;
    const seq = pts.map(p=>'(' + F(X(p.x)) + ',' + F(Y(p.y)) + ')').join(' -- ');
    const estilo = (t.activo === false) ? 'bsaMuted, dashed, line width=1pt' : 'bsaAcc2, line width=1.7pt';
    out += '\\draw[' + estilo + '] ' + seq + ';\n';
  });

  // Nudos, nombres, apoyos y topes.
  nodos.forEach(n=>{
    const x = X(n.x), y = Y(n.y);
    out += '\\filldraw[color=bsaAcc2] (' + F(x) + ',' + F(y) + ') circle (0.05);\n';
    out += '\\node[above right, font=\\scriptsize\\bfseries, color=bsaAcc2] at (' + F(x) + ',' + F(y) + ') {' + escLatex(n.nombre) + '};\n';
    if(n.apoyo === 'fijo'){
      out += '\\draw[line width=1pt, color=bsaAcc2] (' + F(x) + ',' + F(y) + ') -- (' + F(x-0.28) + ',' + F(y-0.45) + ') -- (' + F(x+0.28) + ',' + F(y-0.45) + ') -- cycle;\n';
      out += '\\draw[line width=1pt, color=bsaAcc2] (' + F(x-0.42) + ',' + F(y-0.45) + ') -- (' + F(x+0.42) + ',' + F(y-0.45) + ');\n';
    } else if(n.apoyo === 'movil'){
      out += '\\draw[line width=1pt, color=bsaAcc2] (' + F(x) + ',' + F(y) + ') -- (' + F(x-0.26) + ',' + F(y-0.38) + ') -- (' + F(x+0.26) + ',' + F(y-0.38) + ') -- cycle;\n';
      out += '\\draw[line width=1pt, color=bsaAcc2] (' + F(x-0.13) + ',' + F(y-0.47) + ') circle (0.08);\n';
      out += '\\draw[line width=1pt, color=bsaAcc2] (' + F(x+0.13) + ',' + F(y-0.47) + ') circle (0.08);\n';
    }
    if(n.tope){
      const a = (n.tope.ang||0)*Math.PI/180;
      const ux = Math.cos(a), uy = Math.sin(a);
      out += '\\draw[-{Latex[length=2.2mm]}, color=bsaTope, line width=1.1pt] ('
        + F(x-ux*0.95) + ',' + F(y-uy*0.95) + ') -- (' + F(x-ux*0.16) + ',' + F(y-uy*0.16) + ');\n';
      out += '\\node[font=\\tiny, color=bsaTope] at (' + F(x-ux*1.2) + ',' + F(y-uy*1.2) + ') {Tope};\n';
    }
  });
  return out;
}

// ── Diagrama de presión sobre un tramo: p(y) desplegado a lo largo de él ──
function tikzDiagramaPresion(c){
  const pts = puntosTramo(c.t, 60);
  if(pts.length < 2) return '';
  const W2 = 8.0, Hh = 1.9;
  // Presión en cada punto y longitud acumulada.
  let acum = 0;
  const muestras = [{s:0, p:presionNetaTramo(c.t, pts[0].y)}];
  for(let i=1;i<pts.length;i++){
    acum += Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y);
    muestras.push({s:acum, p:presionNetaTramo(c.t, pts[i].y)});
  }
  const L = acum || 1;
  const pmax = Math.max(1e-9, ...muestras.map(m=>Math.abs(m.p)));
  const kx = W2/L, ky = Hh/pmax;
  const F = n => n.toFixed(3);
  const coords = muestras.map(m => '(' + F(m.s*kx) + ',' + F(m.p*ky) + ')').join(' ');
  let out = '';
  out += '\\draw[gray!45, line width=1pt] (0,0) -- (' + F(W2) + ',0);\n';
  out += '\\draw[bsaPres, line width=1pt, fill=bsaPres!15] (0,0) -- plot coordinates {' + coords + '} -- (' + F(W2) + ',0) -- cycle;\n';
  out += '\\node[font=\\tiny, gray] at (0,-0.3) {' + escLatex(c.t ? nomTramo(c.t).charAt(0) : '0') + '};\n';
  out += '\\node[font=\\tiny, gray] at (' + F(W2) + ',-0.3) {' + dec(L,'len') + '\\,' + escLatex(unitLen) + '};\n';
  const pIni = muestras[0].p, pFin = muestras[muestras.length-1].p;
  out += '\\node[font=\\tiny\\bfseries, color=bsaPres] at (0,' + F(pIni*ky + (pIni>=0?0.3:-0.3)) + ') {' + dec(pIni,'f') + '};\n';
  out += '\\node[font=\\tiny\\bfseries, color=bsaPres] at (' + F(W2) + ',' + F(pFin*ky + (pFin>=0?0.3:-0.3)) + ') {' + dec(pFin,'f') + '};\n';
  return out;
}

function construirLatex(){
  if(!R || R.error){
    aviso('Primero pulsa Calcular (o revisa el equilibrio de la compuerta).');
    return null;
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
    + '\\definecolor{bsaAcc}{HTML}{0F5C56}\n'
    + '\\definecolor{bsaAcc2}{HTML}{0B3F3A}\n'
    + '\\definecolor{bsaMuted}{HTML}{66727E}\n'
    + '\\definecolor{bsaAgua}{HTML}{2F7FB5}\n'
    + '\\definecolor{bsaPres}{HTML}{C0392B}\n'
    + '\\definecolor{bsaTope}{HTML}{B45309}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n\n'
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Presi\\\'on de Fluidos}\\hfill}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    + '\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\vspace{10pt}{\\large\\bfseries\\color{bsaAcc}#1}\\par\\vspace{3pt}\\hrule\\vspace{7pt}}\n\n'
    + '\\begin{document}\n\n';

  let figN = 0;
  function figCaption(txt){
    figN++;
    return '\n\\begin{center}{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\\end{center}\n\\vspace{4pt}\n';
  }

  let tex = preambulo;
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Reporte de Presi\\\'on sobre Superficies Sumergidas}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{8pt}\n\n';

  // ── 1. Geometría y datos del fluido ──
  tex += '\\seccion{1. Geometr\\\'ia y datos del fluido}\n';
  tex += '\\begin{center}\\begin{tikzpicture}[scale=1]\n' + tikzCompuerta() + '\\end{tikzpicture}\\end{center}\n';
  tex += figCaption('Compuerta con sus apoyos y los niveles de l\\\'iquido de cada zona.');
  tex += '\\noindent Ancho perpendicular al plano: $b = ' + dec(anchoB(),'len') + '$\\,' + escLatex(unitLen) + '.\\\\[5pt]\n';
  let hayLiquido = false;
  [1,2].forEach(z=>{ if(zonas[z] && zonas[z].length) hayLiquido = true; });
  if(hayLiquido){
    tex += '\\begin{center}\\begin{tabular}{llrr}\n\\hline\n'
      + 'Zona & Capa & $\\gamma$ (' + escLatex(unitFor) + '/' + escLatex(unitLen) + '$^3$) & Nivel (' + escLatex(unitLen) + ') \\\\\n\\hline\n';
    [1,2].forEach(z=>{
      const capas = capasOrdenadas(z);
      capas.forEach((c,i)=>{
        tex += (i===0 ? ('Zona ' + z) : '') + ' & ' + (i+1) + ' & '
          + dec(c.g,'f') + ' & ' + dec(c.niv,'len') + ' \\\\\n';
      });
    });
    tex += '\\hline\n\\end{tabular}\\end{center}\n\\vspace{4pt}\n';
  }
  tex += '\\noindent La presi\\\'on manom\\\'etrica a profundidad $h$ vale $p = \\gamma\\,h$ y act\\\'ua siempre '
    + 'perpendicular a la superficie. Cuando hay l\\\'iquido a ambos lados, sobre cada tramo act\\\'ua la '
    + 'presi\\\'on \\emph{neta}, diferencia entre las dos zonas.\\\\[6pt]\n';

  // ── 2. Resultante de presión sobre cada tramo ──
  tex += '\\seccion{2. Resultante de la presi\\\'on sobre cada tramo}\n';
  tex += '\\noindent La resultante de un tramo es la integral de la presi\\\'on sobre su superficie mojada:\n';
  tex += '$$\\vec{F} = \\int_L p(y)\\,b\\,\\hat{n}\\;ds$$\n';
  tex += 'que se eval\\\'ua num\\\'ericamente a lo largo del tramo (v\\\'alido tanto para tramos rectos como curvos).\\\\[6pt]\n';
  let SX = 0, SY = 0;
  tex += '\\begin{center}\\begin{tabular}{llrrrrr}\n\\hline\n'
    + 'Tramo & Tipo & $L$ (' + escLatex(unitLen) + ') & $p_{min}$ & $p_{max}$ & $F_x$ (' + escLatex(unitFor) + ') & $F_y$ (' + escLatex(unitFor) + ') \\\\\n\\hline\n';
  R.cargas.forEach(c=>{
    SX += c.Fx; SY += c.Fy;
    tex += escLatex(nomTramo(c.t)) + ' & ' + (c.t.tipo==='arco' ? 'Curvo' : 'Recto')
      + ' & ' + dec(c.len,'len') + ' & ' + dec(c.pMin,'f') + ' & ' + dec(c.pMax,'f')
      + ' & ' + dec(c.Fx,'f') + ' & ' + dec(c.Fy,'f') + ' \\\\\n';
  });
  tex += '\\hline\n'
    + '\\multicolumn{5}{l}{$\\Sigma$ resultante del l\\\'iquido} & ' + dec(SX,'f') + ' & ' + dec(SY,'f') + ' \\\\\n'
    + '\\hline\n\\end{tabular}\\end{center}\n';
  tex += '{\\footnotesize\\color{bsaMuted}Presiones en ' + uPresLatex() + '.}\\\\[6pt]\n';
  tex += '\\noindent M\\\'odulo de la resultante total del l\\\'iquido: $|F| = '
    + dec(Math.hypot(SX,SY),'f') + '$\\,' + escLatex(unitFor) + '.\\\\[8pt]\n';

  R.cargas.forEach(c=>{
    tex += '\\noindent{\\bfseries\\color{bsaAcc2} Tramo ' + escLatex(nomTramo(c.t)) + '}\\\\[3pt]\n';
    tex += '\\begin{center}\\begin{tikzpicture}\n' + tikzDiagramaPresion(c) + '\\end{tikzpicture}\\end{center}\n';
    tex += figCaption('Diagrama de presi\\\'on neta a lo largo del tramo '
      + escLatex(nomTramo(c.t)) + ', en ' + uPresLatex() + '.');
  });

  // ── 3. Equilibrio de la compuerta ──
  tex += '\\seccion{3. Equilibrio de la compuerta}\n';
  tex += 'Se plantean las tres ecuaciones de equilibrio del conjunto'
    + (R.diag.rot ? ', m\\\'as ' + R.diag.rot + ' por cada r\\\'otula (momento nulo tomando '
        + 'solo las fuerzas de un lado de la cadena)' : '') + ':\\\\[4pt]\n';
  tex += '$$\\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M_O = 0$$\n';
  tex += '\\noindent Con ' + R.diag.inc + ' inc\\\'ognita(s) y ' + R.diag.eq
    + ' ecuaci\\\'on(es), el problema es estáticamente determinado.\\\\[8pt]\n';
  tex += '\\begin{center}\\begin{tabular}{lllr}\n\\hline\n'
    + 'Punto & Tipo & Direcci\\\'on & Valor (' + escLatex(unitFor) + ') \\\\\n\\hline\n';
  R.inc.forEach((u,j)=>{
    const v = R.val[j];
    let tipo, dirTxt;
    if(u.tipo==='Rx'){ tipo='Apoyo fijo'; dirTxt='horizontal'; }
    else if(u.tipo==='Ry'){ tipo='Apoyo fijo'; dirTxt='vertical'; }
    else if(u.tipo==='R'){ tipo='Apoyo m\\\'ovil'; dirTxt=(u.ang*180/Math.PI).toFixed(0)+'$^\\circ$'; }
    else { tipo='Tope'; dirTxt=(u.ang*180/Math.PI).toFixed(0)+'$^\\circ$'; }
    tex += escLatex(u.n.nombre) + ' & ' + tipo + ' & ' + dirTxt + ' & ' + dec(v,'f') + ' \\\\\n';
  });
  tex += '\\hline\n\\end{tabular}\\end{center}\n'
    + '{\\footnotesize\\color{bsaMuted}Un valor negativo indica que la fuerza act\\\'ua en sentido '
    + 'contrario al de la direcci\\\'on indicada.}\\\\[6pt]\n';

  // ── 4. Comprobación del equilibrio ──
  let cx=0, cy=0, cm=0;
  R.cargas.forEach(c=>{ cx+=c.Fx; cy+=c.Fy; cm+=c.Mo; });
  R.inc.forEach((u,j)=>{
    const v = R.val[j];
    const d = (u.tipo==='Rx')?{x:1,y:0}:(u.tipo==='Ry')?{x:0,y:1}:{x:Math.cos(u.ang),y:Math.sin(u.ang)};
    cx += v*d.x; cy += v*d.y; cm += u.n.x*v*d.y - u.n.y*v*d.x;
  });
  const cierra = Math.abs(cx) < 1e-6*Math.max(1,Math.abs(SX)) && Math.abs(cy) < 1e-6*Math.max(1,Math.abs(SY));
  tex += '\\seccion{4. Comprobaci\\\'on}\n';
  tex += '$$\\sum F_x = ' + cx.toExponential(2) + ' \\qquad \\sum F_y = ' + cy.toExponential(2)
    + ' \\qquad \\sum M_O = ' + cm.toExponential(2) + '$$\n';
  tex += '\\begin{center}{\\small\\color{' + (cierra ? 'bsaVerde' : 'bsaPres') + '}'
    + (cierra ? 'Las tres sumas son nulas: la compuerta queda en equilibrio con estas reacciones.'
              : 'El equilibrio no cierra; revisa los apoyos y las caras mojadas.')
    + '}\\end{center}\n';

  tex += '\n\\end{document}\n';
  return tex;
}

// ── Compilación con texlive.net (mismo mecanismo que Cap. 6, 7 y 9) ──
const TEXLIVE_NET_URL = 'https://texlive.net/cgi-bin/latexcgi';
function _panelLatexPDF(){
  let panel = document.getElementById('panelLatexPDF');
  if(panel) return panel;
  panel = document.createElement('div');
  panel.id = 'panelLatexPDF';
  panel.style.cssText = 'display:none; position:fixed; inset:0; z-index:9000; '
    + 'background:rgba(15,20,28,.72); align-items:center; justify-content:center; padding:16px;';
  panel.innerHTML =
      '<div style="background:#fff; border-radius:10px; width:100%; max-width:900px; '
    +   'height:92vh; display:flex; flex-direction:column; overflow:hidden; position:relative;">'
    +   '<div style="display:flex; align-items:center; justify-content:space-between; '
    +     'padding:10px 14px; border-bottom:1px solid #d7e3e0;">'
    +     '<strong style="color:#0f5c56">Reporte PDF (LaTeX)</strong>'
    +     '<button onclick="cerrarPanelLatex()" title="Cerrar" aria-label="Cerrar" '
    +       'style="border:none;background:none;font-size:22px;cursor:pointer;line-height:1;'
    +       'color:#66727e;padding:0 4px;">&times;</button>'
    +   '</div>'
    +   '<div id="latexEstado" style="padding:8px 14px; font-size:12.5px; color:#66727e;">'
    +     'Enviando a texlive.net…</div>'
    +   '<iframe id="latexFrame" name="latexFrame" style="flex:1; border:none;"></iframe>'
    +   '<div id="latexPie" style="padding:6px 14px; font-size:10.5px; color:#9aa3ad; '
    +     'border-top:1px solid #eef2f1;">Si en lugar del PDF aparece texto, es el registro '
    +     'de LaTeX: c\u00f3pialo y av\u00edsanos.</div>'
    +   '<div id="latexCargando" style="position:absolute; inset:0; background:#fff; '
    +     'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px;">'
    +     '<div style="display:flex; gap:10px; align-items:flex-end; height:64px;">'
    +       '<span class="bsa-let" style="color:#CDA953; animation-delay:0s">B</span>'
    +       '<span class="bsa-let" style="color:#8AB4CA; animation-delay:.22s">S</span>'
    +       '<span class="bsa-let" style="color:#22584B; animation-delay:.44s">A</span>'
    +     '</div>'
    +     '<div style="font-size:12px;color:#66727e">Compilando el informe…</div>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(panel);
  return panel;
}
function descargarTex(){
  const tex = construirLatex();
  if(!tex) return;
  const blob = new Blob([tex], {type:'text/x-tex'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'presion-fluidos-bsa.tex';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function generarPDFLatex(){
  const btn = document.getElementById('btnLatex');
  if(btn && btn.dataset.ocupado === '1') return;

  const tex = construirLatex();
  if(!tex) return;

  try {
    if(btn) btn.dataset.ocupado = '1';
    const panel = _panelLatexPDF();
    const estado = document.getElementById('latexEstado');
    const frame = document.getElementById('latexFrame');
    estado.textContent = 'Enviando a texlive.net…';
    const cargando = document.getElementById('latexCargando');
    if(cargando) cargando.style.display = 'flex';
    panel.style.display = 'flex';

    const viejo = document.getElementById('formLatexNet');
    if(viejo) viejo.remove();
    const form = document.createElement('form');
    form.id = 'formLatexNet';
    form.action = TEXLIVE_NET_URL;
    form.method = 'post';
    form.enctype = 'multipart/form-data';
    form.target = 'latexFrame';
    form.style.display = 'none';
    const campo = (nombre, valor)=>{
      const inp = document.createElement('textarea');
      inp.name = nombre; inp.value = valor;
      form.appendChild(inp);
    };
    campo('filename[]', 'document.tex');
    campo('filecontents[]', tex);
    campo('engine', 'pdflatex');
    campo('return', 'pdf');
    document.body.appendChild(form);
    form.submit();

    frame.addEventListener('load', function(){
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
      estado.textContent = 'Informe generado.';
      estado.style.color = '#15803D';
    }, {once:true});

    setTimeout(()=>{
      if(estado.textContent.indexOf('Enviando') === 0){
        estado.textContent = 'Sigue esperando respuesta de texlive.net. '
          + 'Si tarda demasiado, cierra este panel y vuelve a intentar.';
      }
    }, 45000);
    setTimeout(()=>{
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
    }, 90000);
  } catch(e){
    console.error('Error al enviar a texlive.net:', e);
    aviso('Ocurri\u00f3 un error al preparar el env\u00edo: ' + e.message, 'error');
  } finally {
    if(btn) btn.dataset.ocupado = '0';
  }
}

function downloadPDF(){
  const rp = document.getElementById('resultsPanel');
  if(!rp || !rp.innerHTML.trim()){ aviso('Primero pulsa Calcular.', 'error'); return; }
  const img = recortarLienzo(document.getElementById('mainCanvas'));
  const dt = new Date().toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short'});
  const kEl = document.getElementById('katex-css');
  const katexCss = kEl ? kEl.textContent : '';
  const printCss = `
    *{box-sizing:border-box;margin:0;padding:0;}
    :root{--math:'STIX Two Text','Times New Roman',Georgia,serif;
          --sans:Inter,'Helvetica Neue',Arial,sans-serif;
          --acc:#0f5c56;--acc2:#0b3f3a;--card:#e8f4f1;--border:#c8e0d8;
          --text:#1a1a1a;--muted:#5a7570;}
    body{font-family:var(--sans);font-size:10.5px;background:#fff;color:var(--text);
      padding:12mm 9mm 14mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .pdf-header{display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--acc2);
      padding-bottom:7px;margin-bottom:10px;}
    .pdf-title{font-size:17px;font-weight:800;color:var(--acc);}
    .pdf-sub{font-size:10px;color:var(--muted);}
    .pdf-date{margin-left:auto;font-size:9px;color:var(--muted);}
    .res-section{margin-bottom:8px;}
    .res-title{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;
      color:var(--acc);border-bottom:1.5px solid var(--acc2);padding-bottom:4px;margin:9px 0 6px;}
    .res-title .num{width:18px;height:18px;border-radius:50%;background:var(--acc2);
      display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;
      color:#fff;flex:none;}
    .proc-block{background:var(--card);border:1px solid var(--border);border-radius:6px;
      padding:6px 10px;margin-bottom:6px;page-break-inside:avoid;}
    .proc-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 18px;}
    .proc-sub{font-size:9px;font-weight:700;color:var(--acc);text-transform:uppercase;
      letter-spacing:.5px;margin-bottom:4px;}
    .eq-body{font-family:var(--math);font-size:11px;line-height:1.5;}
    .verdict{border-left:3px solid var(--acc);background:var(--card);border-radius:5px;
      padding:6px 9px;margin-bottom:6px;font-size:10px;page-break-inside:avoid;}
    .verdict-t{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;
      color:var(--muted);margin-bottom:3px;}
    .tabla{width:100%;border-collapse:collapse;font-family:var(--math);font-size:11px;
      page-break-inside:avoid;margin-bottom:6px;}
    .tabla th{padding:3px 6px;text-align:left;font-size:9px;font-weight:700;color:var(--acc);
      text-transform:uppercase;background:var(--card);border-bottom:1.5px solid var(--border);
      font-family:var(--sans);}
    .tabla td{padding:2px 6px;border-bottom:1px solid var(--border);}
    .tabla .r{text-align:right;}
    .tabla .fila-total td{font-weight:700;background:var(--card);color:var(--acc);}
    .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:7px;
      page-break-inside:avoid;}
    .summary-box{border:1px solid var(--border);border-radius:5px;padding:5px 8px;}
    .summary-box.hl{background:var(--card);}
    .s-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;
      font-family:var(--sans);font-weight:700;}
    .s-val{font-size:13px;font-weight:700;color:var(--acc);font-style:italic;font-family:var(--math);}
    .s-unit{font-size:8px;color:var(--muted);}
    .teoria{border-left:3px solid var(--acc);background:var(--card);border-radius:5px;
      padding:6px 9px;margin-bottom:7px;font-size:10px;page-break-inside:avoid;}
    .teoria-t{font-size:9px;font-weight:800;color:var(--acc);text-transform:uppercase;margin-bottom:3px;}
    .hint-sm{font-size:9.5px;color:var(--muted);}
    svg{max-width:100%;height:auto;}
    img{max-width:100%;}
    .wm-seal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      width:340px;height:340px;opacity:.07;z-index:9999;pointer-events:none;}
    .pdf-foot{margin-top:10px;text-align:center;font-size:8.5px;color:var(--muted);
      border-top:1px solid var(--border);padding-top:6px;}
    @page{size:A4 portrait;margin:0;}
    @media print{ body{padding:12mm 9mm 14mm;} }
  `;
  const wmSeal = '<div class="wm-seal"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><path id="stp" d="M 26,100 A 74,74 0 0 1 174,100"/><path id="sbt" d="M 26,100 A 74,74 0 0 0 174,100"/></defs>'
    + '<circle cx="100" cy="100" r="94" fill="none" stroke="#0b3f3a" stroke-width="2.5"/>'
    + '<circle cx="100" cy="100" r="80" fill="none" stroke="#0b3f3a" stroke-width="1"/>'
    + '<text font-family="Inter,sans-serif" font-size="9" font-weight="800" fill="#0b3f3a" letter-spacing="1">'
    + '<textPath href="#stp" startOffset="50%" text-anchor="middle">BEAM &amp; SECTION ANALYSIS</textPath></text>'
    + '<text font-family="Inter,sans-serif" font-size="10.5" font-weight="600" fill="#0b3f3a" letter-spacing="1">'
    + '<textPath href="#sbt" startOffset="50%" text-anchor="middle">by Luis Alejandro Bazán Campos</textPath></text>'
    + '<text x="100" y="106" font-family="Inter,sans-serif" font-size="16" font-weight="800" fill="#0b3f3a" text-anchor="middle">BSA</text>'
    + '<line x1="62" y1="118" x2="138" y2="118" stroke="#0b3f3a" stroke-width="1"/>'
    + '<text x="100" y="133" font-family="Inter,sans-serif" font-size="9" fill="#0b3f3a" text-anchor="middle" letter-spacing="1">EST\u00c1TICA</text>'
    + '</svg></div>';
  let html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
  html += '<title>BSA \u2014 Presi\u00f3n de Fluidos</title>';
  html += '<link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">';
  html += '<style>'+katexCss+'</style><style>'+printCss+'</style></head><body>'+wmSeal;
  html += '<div class="pdf-header"><div><div class="pdf-title">BSA \u2014 Presi\u00f3n de Fluidos</div>'
        + '<div class="pdf-sub">by Luis Alejandro Baz\u00e1n Campos</div></div>'
        + '<div class="pdf-date">Generado: '+dt+'</div></div>';
  if(img) html += '<div style="margin-bottom:12px;page-break-inside:avoid;">'
    + '<h3 style="font-size:11px;font-weight:700;color:#0f5c56;margin-bottom:5px;font-family:Inter,sans-serif;'
    + 'text-transform:uppercase;letter-spacing:.5px;">Situaci\u00f3n analizada</h3>'
    + '<img src="'+img+'" style="max-width:100%;width:auto;max-height:290px;border-radius:8px;'
    + 'border:1px solid #c8e0d8;display:block;margin:6px auto;"></div>';
  html += rp.innerHTML;
  html += '<div class="pdf-foot">Beam &amp; Section Analysis \u00b7 beamsectionanalysis.com</div>';
  html += '<script>window.onload=function(){setTimeout(function(){window.print();},900);}<\/script></body></html>';
  const w = window.open('','_blank','width=980,height=760');
  if(!w){ aviso('El navegador bloque\u00f3 la ventana emergente.', 'error'); return; }
  w.document.write(html); w.document.close();
}
