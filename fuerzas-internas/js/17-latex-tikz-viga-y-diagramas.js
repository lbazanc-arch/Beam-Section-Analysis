// ── Modelo de la viga en TikZ: tramos, apoyos, cargas y nombres de nudo ──
function tikzViga(conReacciones){
  if(!nodos.length) return '';
  tzReiniciar();
  let minx=Infinity, maxx=-Infinity;
  nodos.forEach(n=>{ minx=Math.min(minx,n.x); maxx=Math.max(maxx,n.x); });
  const spanX = Math.max(maxx-minx, 1e-6);
  const k = Math.min(2.2, 8/spanX);
  const Xn = x => (x-minx)*k, Yn = y => y*k;
  const F = n => n.toFixed(3);
  let out = '';
  tramos.forEach(t=>{
    const a = nodo(t.a), b = nodo(t.b);
    if(!a||!b) return;
    out += '\\draw[line width=1.6pt, color=bsaAcc2] (' + F(Xn(a.x)) + ',' + F(Yn(a.y)) + ') -- (' + F(Xn(b.x)) + ',' + F(Yn(b.y)) + ');\n';
  });
  nodos.forEach(n=>{
    const x = Xn(n.x), y = Yn(n.y);
    if(n.apoyo === 'simple'){
      out += '\\draw[line width=1pt] (' + F(x) + ',' + F(y) + ') -- (' + F(x-0.28) + ',' + F(y-0.45) + ') -- (' + F(x+0.28) + ',' + F(y-0.45) + ') -- cycle;\n';
      out += '\\draw[line width=1pt] (' + F(x-0.4) + ',' + F(y-0.45) + ') -- (' + F(x+0.4) + ',' + F(y-0.45) + ');\n';
      for(let i=-3;i<=3;i++){
        const xi = x+i*0.11;
        out += '\\draw[line width=.6pt] (' + F(xi) + ',' + F(y-0.45) + ') -- (' + F(xi-0.08) + ',' + F(y-0.58) + ');\n';
      }
    } else if(n.apoyo === 'movil'){
      out += '\\draw[line width=1pt] (' + F(x) + ',' + F(y) + ') -- (' + F(x-0.26) + ',' + F(y-0.38) + ') -- (' + F(x+0.26) + ',' + F(y-0.38) + ') -- cycle;\n';
      out += '\\draw[line width=1pt] (' + F(x-0.13) + ',' + F(y-0.46) + ') circle (0.08);\n';
      out += '\\draw[line width=1pt] (' + F(x+0.13) + ',' + F(y-0.46) + ') circle (0.08);\n';
      out += '\\draw[line width=1pt] (' + F(x-0.36) + ',' + F(y-0.54) + ') -- (' + F(x+0.36) + ',' + F(y-0.54) + ');\n';
    } else if(n.apoyo === 'empotrado'){
      out += '\\draw[line width=1.4pt] (' + F(x) + ',' + F(y-0.42) + ') -- (' + F(x) + ',' + F(y+0.42) + ');\n';
      for(let i=-3;i<=3;i++){
        const yi = y + i*0.13;
        out += '\\draw[line width=.6pt] (' + F(x) + ',' + F(yi) + ') -- (' + F(x-0.16) + ',' + F(yi-0.1) + ');\n';
      }
    }
  });
  nodos.forEach(n=>{
    const x = F(Xn(n.x)), y = F(Yn(n.y));
    out += '\\filldraw[color=bsaAcc2] (' + x + ',' + y + ') circle (0.045);\n';
    out += '\\node[above right, font=\\scriptsize\\bfseries, color=bsaAcc2] at (' + x + ',' + y + ') {' + escLatex(n.nombre) + '};\n';
    // El nombre del nudo es intocable: reserva su hueco antes que nada.
    tzOcupar(+x, +y+0.06, +x+0.30, +y+0.34);
  });
  cargas.forEach(c=>{
    if(c.tipo==='P' || c.tipo==='PX' || c.tipo==='M'){
      const P = puntoDeCarga(c);
      if(!P) return;
      const x = Xn(P.x), y = Yn(P.y);
      if(c.tipo==='P' || c.tipo==='PX'){
        // El informe dibujaba SIEMPRE en vertical (o en horizontal la axial),
        // así que una carga marcada perpendicular al tramo salía como si
        // fuese global. Ahora sigue la dirección real que devuelve dirCarga.
        const _t = tramos.find(z=>z.id===c.tramo), _g2 = _t && geoTramo(_t);
        const d = dirCarga(c, _g2);
        const sg = (c.mag < 0) ? -1 : 1;
        const vx = d.x*sg, vy = d.y*sg;      // en TikZ la y NO está invertida
        const x1 = x - vx*0.75, y1 = y - vy*0.75;
        const x2 = x - vx*0.12, y2 = y - vy*0.12;
        out += '\\draw[-{Latex[length=2.2mm]}, color=bsaCarga, line width=1.1pt] ('
             + F(x1) + ',' + F(y1) + ') -- (' + F(x2) + ',' + F(y2) + ');\n';
        tzOcuparTrazo(x1, y1, x2, y2, 0.07);
        out += tzTexto(x1 - vx*0.16, y1 - vy*0.16,
                       dec(Math.abs(c.mag),'f')+'\\,'+escLatex(unitFor),
                       'font=\\tiny, color=bsaCarga', -vx, -vy);
      } else {
        out += '\\draw[-{Latex[length=2mm]}, color=bsaMomento, line width=1.1pt] (' + F(x+0.3) + ',' + F(y) + ') arc (0:300:0.3);\n';
        out += tzTexto(x+0.62, y+0.22, dec(Math.abs(c.mag),'mom')+'\\,'+escLatex(unidadMomento()),
                       'font=\\tiny, color=bsaMomento', 1, 1);
      }
    } else {
      const z = trozoCargado(c);
      if(!z || z.len<=1e-12) return;
      const t = tramos.find(tt=>tt.id===c.tramo);
      const g = t && geoTramo(t);
      if(!g) return;
      const ax = Xn(g.a.x+g.ux*z.s1), ay = Yn(g.a.y+g.uy*z.s1);
      const bx = Xn(g.a.x+g.ux*z.s2), by = Yn(g.a.y+g.uy*z.s2);
      const w1 = c.mag, w2 = (c.tipo==='U')? c.mag : (c.mag2||0);
      const wm = Math.max(Math.abs(w1),Math.abs(w2),1e-9);
      const alt = 0.6;
      const h1 = alt*w1/wm, h2 = alt*w2/wm;
      // El bloque se levanta EN CONTRA de la carga: si es local, sale
      // perpendicular al tramo; si es global, siempre vertical.
      const dd = dirCarga(c, g);
      const ex = -dd.x, ey = -dd.y;
      out += '\\draw[color=bsaDist, fill=bsaDist!12] (' + F(ax) + ',' + F(ay)
           + ') -- (' + F(ax+ex*h1) + ',' + F(ay+ey*h1)
           + ') -- (' + F(bx+ex*h2) + ',' + F(by+ey*h2)
           + ') -- (' + F(bx) + ',' + F(by) + ') -- cycle;\n';
      for(let i=0;i<=5;i++){
        const tt=i/5, xi = ax+(bx-ax)*tt, yi = ay+(by-ay)*tt, hi = h1+(h2-h1)*tt;
        out += '\\draw[-{Latex[length=1.6mm]}, color=bsaDist, line width=.8pt] ('
             + F(xi+ex*hi) + ',' + F(yi+ey*hi) + ') -- ('
             + F(xi+ex*0.05) + ',' + F(yi+ey*0.05) + ');\n';
      }
      tzOcuparTrazo(ax+ex*h1, ay+ey*h1, bx+ex*h2, by+ey*h2, 0.06);
      // Trapecial: los dos extremos llevan valor distinto y hay que verlos.
      if(Math.abs(w1-w2) > 1e-9){
        out += tzTexto(ax+ex*(h1+0.20), ay+ey*(h1+0.20), dec(Math.abs(w1),'f'),
                       'font=\\tiny, color=bsaDist', ex, ey);
        out += tzTexto(bx+ex*(h2+0.20), by+ey*(h2+0.20),
                       dec(Math.abs(w2),'f')+'\\,'+escLatex(uDist()),
                       'font=\\tiny, color=bsaDist', ex, ey);
      } else {
        const hm = (h1+h2)/2;
        out += tzTexto((ax+bx)/2+ex*(hm+0.20), (ay+by)/2+ey*(hm+0.20),
                       dec(Math.abs(w1),'f')+'\\,'+escLatex(uDist()),
                       'font=\\tiny, color=bsaDist', ex, ey);
      }
    }
  });
  // Reacciones incógnita, dibujadas en su sentido positivo supuesto.
  if(conReacciones && R && !R.error){
    R.inc.forEach(u=>{
      const x = Xn(u.n.x), y = Yn(u.n.y);
      const d = (u.ang !== undefined) ? {x:Math.cos(u.ang), y:Math.sin(u.ang)}
              : (u.tipo==='Rx' ? {x:1,y:0} : (u.tipo==='Ry' ? {x:0,y:1} : null));
      const nom = (u.ang !== undefined) ? 'R_{'+escLatex(u.n.nombre)+'}'
        : (u.tipo==='Rx' ? 'R_{x'+escLatex(u.n.nombre)+'}'
        : (u.tipo==='Ry' ? 'R_{y'+escLatex(u.n.nombre)+'}' : 'M_{'+escLatex(u.n.nombre)+'}'));
      if(!d){
        out += '\\draw[-{Latex[length=1.8mm]}, color=bsaReac, line width=1pt] ('
             + F(x+0.34) + ',' + F(y-0.34) + ') arc (0:280:0.34);\n';
        out += tzTexto(x+0.55, y-0.55, '$'+nom+'$', 'font=\\tiny, color=bsaReac', 1, -1);
        return;
      }
      const L1 = 0.85;
      out += '\\draw[-{Latex[length=2mm]}, color=bsaReac, line width=1.1pt] ('
           + F(x-d.x*L1) + ',' + F(y-d.y*L1) + ') -- (' + F(x-d.x*0.10) + ',' + F(y-d.y*0.10) + ');\n';
      tzOcuparTrazo(x-d.x*L1, y-d.y*L1, x-d.x*0.10, y-d.y*0.10, 0.07);
      out += tzTexto(x-d.x*(L1+0.18), y-d.y*(L1+0.18), '$'+nom+'$',
                     'font=\\tiny, color=bsaReac', -d.x, -d.y);
    });
  }

  // ── Cotas: primero las posiciones de las cargas (niveles interiores),
  //    después la cadena de nudos, y por último la luz total. Mismo orden
  //    que en el panel, para que el alumno lea igual las dos.
  let minY = Infinity;
  nodos.forEach(n=>{ minY = Math.min(minY, Yn(n.y)); });
  let base = minY - 0.75;

  const xsCargas = [...new Set(xsDeCargas().map(v=>+v.toFixed(6)))];
  const xsNodos  = [...new Set(nodos.map(n=>+n.x.toFixed(6)))];
  const aporta = xsCargas.some(v => !xsNodos.some(q => Math.abs(Xn(q)-Xn(v)) < 0.10));
  if(aporta){
    const todos = [...new Set(xsCargas.concat([Math.min(...xsNodos), Math.max(...xsNodos)])
                    .map(v=>+v.toFixed(6)))];
    const cc = tzCadenaCotas(todos, Xn, base, 'bsaDist', {maxNiveles:2});
    if(cc.nMax >= 0){ out += cc.tikz; base -= 0.30 + (cc.nMax+1)*0.30; }
  }
  const cn = tzCadenaCotas(xsNodos, Xn, base, 'bsaMuted', {maxNiveles:3});
  if(cn.nMax >= 0){
    out += cn.tikz;
    base -= 0.34 + (cn.nMax+1)*0.30;
    // Luz total, solo si hay más de un vano: con uno repetiría la cadena.
    if(cn.nMax >= 0 && xsNodos.length > 2){
      const xa = Xn(Math.min(...xsNodos)), xb = Xn(Math.max(...xsNodos));
      out += '\\draw[bsaAcc, line width=.6pt, {Latex[length=1.4mm]}-{Latex[length=1.4mm]}] ('
           + xa.toFixed(3) + ',' + base.toFixed(3) + ') -- (' + xb.toFixed(3) + ',' + base.toFixed(3) + ');\n';
      out += tzTexto((xa+xb)/2, base, '\\colorbox{white}{' + dec(Math.max(...xsNodos)-Math.min(...xsNodos),'len')
           + '\\,' + escLatex(unitLen) + '}', 'font=\\scriptsize, color=bsaAcc', 0, -1);
    }
  }

  // ── Cotas verticales: solo si la viga tiene desnivel. Se colocan a la
  //    derecha del dibujo, primero las cargas y después los nudos.
  const ysNodos = [...new Set(nodos.map(n=>+n.y.toFixed(6)))];
  if(ysNodos.length > 1){
    let baseX = Math.max(...nodos.map(n=>Xn(n.x))) + 0.55;
    const ysCargas = [...new Set(ysDeCargas().map(v=>+v.toFixed(6)))];
    const aportaY = ysCargas.some(v => !ysNodos.some(q => Math.abs(Yn(q)-Yn(v)) < 0.10));
    if(aportaY){
      const todosY = [...new Set(ysCargas.concat([Math.min(...ysNodos), Math.max(...ysNodos)])
                       .map(v=>+v.toFixed(6)))];
      const cy = tzCadenaCotasY(todosY, Yn, baseX, 'bsaDist', {maxNiveles:2});
      if(cy.nMax >= 0){ out += cy.tikz; baseX += 0.30 + (cy.nMax+1)*0.34; }
    }
    const cyn = tzCadenaCotasY(ysNodos, Yn, baseX, 'bsaMuted', {maxNiveles:3});
    if(cyn.nMax >= 0){
      out += cyn.tikz;
      baseX += 0.34 + (cyn.nMax+1)*0.34;
      if(ysNodos.length > 2){
        const ya = Yn(Math.min(...ysNodos)), yb = Yn(Math.max(...ysNodos));
        out += '\\draw[bsaAcc, line width=.6pt, {Latex[length=1.4mm]}-{Latex[length=1.4mm]}] ('
             + baseX.toFixed(3) + ',' + ya.toFixed(3) + ') -- ('
             + baseX.toFixed(3) + ',' + yb.toFixed(3) + ');\n';
        out += '\\node[rotate=90, font=\\scriptsize, color=bsaAcc] at ('
             + (baseX+0.22).toFixed(3) + ',' + ((ya+yb)/2).toFixed(3) + ') {'
             + dec(Math.max(...ysNodos)-Math.min(...ysNodos),'len') + '\\,'
             + escLatex(unitLen) + '};\n';
      }
    }
  }
  return out;
}
// ── Diagrama V(s) o M(s) de un tramo, como área rellena sobre la base ──
function tikzDiagramaCampo(seg, campo, color, unidadTxt){
  const pts = seg.puntos;
  const W2 = 8.5, Hh = 2.1;
  const vals = pts.map(p=>p[campo]);
  const vmax = Math.max(1e-6, ...vals.map(Math.abs));
  const kx = W2/seg.L, ky = Hh/vmax;
  const F = n => n.toFixed(3);
  const coords = pts.map(p => '(' + F(p.s*kx) + ',' + F(p[campo]*ky) + ')').join(' ');
  let out = '';
  out += '\\draw[gray!45] (0,0) -- (' + F(W2) + ',0);\n';
  out += '\\draw[' + color + ', line width=1pt, fill=' + color + '!15] (0,0) -- plot coordinates {' + coords + '} -- (' + F(W2) + ',0) -- cycle;\n';
  out += '\\node[font=\\tiny, gray] at (0,-0.32) {0};\n';
  out += '\\node[font=\\tiny, gray] at (' + F(W2) + ',-0.32) {' + dec(seg.L,'len') + '\\,' + escLatex(unitLen) + '};\n';
  let iMax=0, iMin=0;
  vals.forEach((v,i)=>{ if(v>vals[iMax]) iMax=i; if(v<vals[iMin]) iMin=i; });
  const dt = campo==='M' ? 'momento' : 'fuerza';
  if(vals[iMax] > 1e-9){
    out += '\\node[font=\\tiny\\bfseries, ' + color + '] at (' + F(pts[iMax].s*kx) + ',' + F(vals[iMax]*ky+0.3) + ') {' + dec(vals[iMax],dt) + '};\n';
  }
  if(vals[iMin] < -1e-9){
    out += '\\node[font=\\tiny\\bfseries, ' + color + '] at (' + F(pts[iMin].s*kx) + ',' + F(vals[iMin]*ky-0.3) + ') {' + dec(vals[iMin],dt) + '};\n';
  }
  return out;
}

function construirLatex(){
  if(!R || R.error || !R.internas){
    aviso('Primero pulsa Calcular (o revisa el equilibrio de la viga).');
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
    + '\\definecolor{bsaAcc}{HTML}{2563EB}\n'
    + '\\definecolor{bsaAcc2}{HTML}{1E3A8A}\n'
    + '\\definecolor{bsaMuted}{HTML}{66727E}\n'
    + '\\definecolor{bsaCarga}{HTML}{D94F5C}\n'
    + '\\definecolor{bsaReac}{HTML}{15803D}\n'
    + '\\definecolor{bsaMomento}{HTML}{8B5CF6}\n'
    + '\\definecolor{bsaDist}{HTML}{E0A83C}\n'
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n\n'
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Fuerzas Internas}\\hfill}%\n'
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
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Reporte de An\\\'alisis de Fuerzas Internas}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{8pt}\n\n';

  // ── 1. Modelo de la viga ──
  tex += '\\seccion{1. Modelo de la viga}\n';
  tex += '\\begin{center}\\begin{tikzpicture}[scale=1]\n' + tikzViga() + '\\end{tikzpicture}\\end{center}\n';
  tex += figCaption('Viga con sus apoyos, cargas y nombres de nudo.');
  const _usados = pesos.filter(p=>tramos.some(t=>t.pesoId === p.id));
  if(_usados.length){
    tex += '\\noindent Se ha considerado peso propio, en dirección vertical y '
      + 'sobre la longitud real del eje:\\\\[3pt]\n';
    tex += '\\begin{center}\\begin{tabular}{lrl}\n\\hline\n'
      + 'Valor & Peso (' + escLatex(uDist()) + ') & Tramos \\\\\n\\hline\n';
    _usados.forEach(p=>{
      const nn = tramos.filter(t=>t.pesoId === p.id).map(t=>escLatex(nomTramo(t))).join(', ');
      tex += escLatex(p.nom) + ' & ' + dec(p.val,'f') + ' & ' + nn + ' \\\\\n';
    });
    tex += '\\hline\n\\end{tabular}\\end{center}\n\\vspace{4pt}\n';
  }
  const _hayLocal = cargas.some(c=>c.orient === 'local');
  if(_hayLocal)
    tex += '\\noindent Alguna carga se ha definido \\emph{local al tramo}: actúa '
      + 'perpendicular al eje (o paralela a él, si es axial) en vez de seguir la '
      + 'vertical y la horizontal globales.\\\\[5pt]\n';

  // ── 2. Reacciones en los apoyos ──
  tex += '\\seccion{2. Reacciones en los apoyos}\n';
  tex += 'Se plantean las tres ecuaciones de equilibrio global'
    + (R.rotulas.length ? ', m\\\'as ' + R.rotulas.length
        + ' ecuaci\\\'on(es) de momento nulo por cada r\\\'otula interna' : '') + ':\\\\[4pt]\n';
  tex += '$$\\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M_O = 0$$\n';
  tex += 'con ' + R.inc.length + ' incógnita(s) de reacción, para un total de '
    + R.diag.eq + ' ecuación(es) disponible(s).\\\\[8pt]\n';

  // ── Desarrollo: cada ecuación con sus términos sustituidos ──
  // Antes se saltaba de las tres ecuaciones al resultado; aquí se escribe
  // término a término de dónde sale cada número, que es lo que el alumno
  // necesita reproducir a mano.
  tex += pasoAPasoReacciones(R);
  tex += '\\begin{center}\\begin{tabular}{ll r}\n\\hline\n'
    + 'Apoyo & Reacci\\\'on & Valor \\\\\n\\hline\n';
  R.inc.forEach((u,j)=>{
    const nomR = u.tipo==='Rx' ? 'R_x' : (u.tipo==='Ry' ? 'R_y' : 'M');
    const esMom = u.tipo === 'M';
    tex += escLatex(u.n.nombre) + ' & $' + nomR + '$ & '
      + dec(R.val[j], esMom?'momento':'fuerza') + '\\,' + escLatex(esMom?unidadMomento():unitFor) + ' \\\\\n';
  });
  tex += '\\hline\n\\end{tabular}\\end{center}\n\\vspace{6pt}\n';

  // ── 3. Diagramas de fuerza cortante y momento flector ──
  tex += '\\seccion{3. Fuerza cortante y momento flector por tramo}\n';
  tex += '\\noindent Convenio de signos adoptado:\\\\[2pt]\n';
  tex += '\\begin{center}\\begin{tikzpicture}[scale=.95]\n' + tikzConvenio()
       + '\\end{tikzpicture}\\end{center}\n';
  tex += figCaption('Sentido POSITIVO de las tres solicitaciones internas.');
  tex += '\\noindent La abscisa se mide desde el último punto de quiebre: se llama '
    + '$x$ en los tramos rectos y $r$ en los inclinados, donde es la resultante de '
    + 'los catetos.\\\\[6pt]\n';
  const _gr = gruposDireccion(R);
  // Se recorre GRUPO a grupo: dentro de cada uno se analizan sus tramos y,
  // al llegar al punto de quiebre, se dibujan los tres diagramas del grupo
  // completo. Antes cada tramo llevaba sus diagramas sueltos, que rompía la
  // continuidad justo donde el alumno necesita verla.
  _gr.forEach(gg=>{
    const sb = gg.simbolo;
    // Regla horizontal antes de cada grupo: sin ella los análisis se leían
    // como un texto continuo y no se veía dónde acaba uno y empieza el otro.
    if(_gr.indexOf(gg) > 0)
      tex += '\\vspace{8pt}\\noindent{\\color{bsaAcc2}\\rule{\\linewidth}{.8pt}}\\vspace{5pt}\n';
    tex += '\\noindent{\\bfseries\\color{bsaAcc}Tramo ' + escLatex(gg.recorrido) + '} '
      + (gg.inclinado ? '\\quad inclinado ' + gg.ang.toFixed(1) + '$^\\circ$'
                      : '\\quad recto')
      + ' \\quad $L = ' + dec(gg.L,'len') + '$\\,' + escLatex(unitLen)
      + ' \\quad abscisa $' + sb + '$ desde ' + escLatex(gg.desde.nombre)
      + '\\\\[4pt]\n';

    gg.tramos.forEach(seg=>{
      const off = seg.s0 - gg.s0;
      if(gg.tramos.length > 1)
        tex += '\\noindent\\emph{Subtramo ' + escLatex(seg.nombre) + '}\\\\[2pt]\n';
      seg.subs.forEach(sub=>{
        const gN = desplazarPoly(sub.cN, off), gV = desplazarPoly(sub.cV, off),
              gM = desplazarPoly(sub.cM, off);
        const a = off+sub.sa, b = off+sub.sb;
        tex += '\\noindent Para $' + dec(a,'len') + ' \\le ' + sb + ' \\le '
          + dec(b,'len') + '$\\,' + escLatex(unitLen) + ':\\\\[2pt]\n';
        // DCL del trozo cortado: sustituye a la tabla de acciones, porque
        // la misma información se lee mejor sobre el dibujo.
        tex += '\\begin{center}\\begin{tikzpicture}\n' + tikzDCLSub(R, gg, seg, sub)
             + '\\end{tikzpicture}\\end{center}\n';
        tex += equilibrioSub(R, gg, seg, sub, off);
        if(gN.some(v=>Math.abs(v)>5e-9))
          tex += '$$N(' + sb + ') = ' + polyTex(gN,'fuerza',sb)
            + '\\ \\ \\text{' + escLatex(unitFor) + '}$$\n';
        tex += '$$V(' + sb + ') = ' + polyTex(gV,'fuerza',sb) + '\\ \\ \\text{' + escLatex(unitFor) + '}'
          + '\\qquad M(' + sb + ') = ' + polyTex(gM,'momento',sb)
          + '\\ \\ \\text{' + escLatex(unidadMomento()) + '}$$\n';

        tex += '\\vspace{4pt}\\noindent{\\color{bsaMuted}\\rule{0.35\\linewidth}{.3pt}}'
             + '\\\\[4pt]\n';
      });
    });

    // ── Resumen del grupo: valores a ambos lados de cada nudo y puntos
    //    singulares del momento, antes de los diagramas.
    tex += tablaNudosGrupo(R, gg);
    tex += tablaSingulares(R, gg);

    // ── Diagramas del GRUPO completo, tras el punto de quiebre ──
    const hayN = gg.tramos.some(t2=>t2.subs.some(su=>su.cN.some(v=>Math.abs(v)>5e-9)));
    if(hayN){
      tex += '\\begin{center}\\begin{tikzpicture}\n' + tikzDiagramaGrupo(R, gg, 'N', 'bsaAcc')
           + '\\end{tikzpicture}\\end{center}\n';
      tex += figCaption('Fuerza normal N(' + sb + ') del tramo ' + escLatex(gg.recorrido) + '.');
    }
    tex += '\\begin{center}\\begin{tikzpicture}\n' + tikzDiagramaGrupo(R, gg, 'V', 'bsaCarga')
         + '\\end{tikzpicture}\\end{center}\n';
    tex += figCaption('Fuerza cortante V(' + sb + ') del tramo ' + escLatex(gg.recorrido) + '.');
    tex += '\\begin{center}\\begin{tikzpicture}\n' + tikzDiagramaGrupo(R, gg, 'M', 'bsaMomento')
         + '\\end{tikzpicture}\\end{center}\n';
    tex += figCaption('Momento flector M(' + sb + ') del tramo ' + escLatex(gg.recorrido) + '.');
    tex += '\\vspace{6pt}\n';
  });

  // ── 4. Resumen de valores extremos ──
  tex += '\\seccion{4. Resumen de valores extremos}\n';
  tex += '\\begin{center}\\begin{tabular}{lrrrr}\n\\hline\n'
    + 'Tramo & $V_{max}$ & $V_{min}$ & $M_{max}$ & $M_{min}$ \\\\\n\\hline\n';
  R.internas.forEach(seg=>{
    const vs = seg.puntos.map(p=>p.V), ms = seg.puntos.map(p=>p.M);
    tex += escLatex(seg.nombre) + ' & ' + dec(Math.max(...vs),'fuerza') + ' & ' + dec(Math.min(...vs),'fuerza')
      + ' & ' + dec(Math.max(...ms),'momento') + ' & ' + dec(Math.min(...ms),'momento') + ' \\\\\n';
  });
  tex += '\\hline\n\\end{tabular}\\end{center}\n'
    + '{\\footnotesize\\color{bsaMuted}Valores en ' + escLatex(unitFor) + ' (cortante) y '
    + escLatex(unidadMomento()) + ' (momento).}\n';

  tex += '\n\\end{document}\n';
  return tex;
}

// ── Compilación con texlive.net (mismo mecanismo que Cap. 6 y Cap. 9) ──
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
    +     'padding:10px 14px; border-bottom:1px solid #dbe3ee;">'
    +     '<strong style="color:#2563eb">Reporte PDF (LaTeX)</strong>'
    +     '<button onclick="cerrarPanelLatex()" title="Cerrar" aria-label="Cerrar" '
    +       'style="border:none;background:none;font-size:22px;cursor:pointer;line-height:1;'
    +       'color:#66727e;padding:0 4px;">&times;</button>'
    +   '</div>'
    +   '<div id="latexEstado" style="padding:8px 14px; font-size:12.5px; color:#66727e;">'
    +     'Enviando a texlive.net…</div>'
    +   '<iframe id="latexFrame" name="latexFrame" style="flex:1; border:none;"></iframe>'
    +   '<div id="latexPie" style="padding:6px 14px; font-size:10.5px; color:#9aa3ad; '
    +     'border-top:1px solid #f0f2f4;">Si en lugar del PDF aparece texto, es el registro '
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
