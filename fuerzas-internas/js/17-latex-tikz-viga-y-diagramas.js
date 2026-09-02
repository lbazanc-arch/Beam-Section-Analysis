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
    if(n.apoyo && n.apoyo !== 'libre'){
      // Empotramiento: las rayas miran hacia afuera de la viga
      const lado = (n.x >= maxx - 1e-9 && n.x > minx + 1e-9) ? 1 : -1;
      out += tikzApoyo(x, y, n.apoyo, 1, lado);
    }
  });
  nodos.forEach(n=>{
    if(n.rotula && tramos.filter(t=>t.a===n.id||t.b===n.id).length > 1)
      out += '\\filldraw[fill=white, draw=bsaAcc2, line width=.8pt] (' + F(Xn(n.x)) + ',' + F(Yn(n.y)) + ') circle (0.09);\n';
  });
  nodos.forEach(n=>{
    const x = F(Xn(n.x)), y = F(Yn(n.y));
    out += '\\filldraw[color=bsaAcc2] (' + x + ',' + y + ') circle (0.045);\n';
    out += '\\node[above right, font=\\scriptsize\\bfseries, color=bsaAcc2] at (' + x + ',' + y + ') {' + escLatex(n.nombre) + '};\n';
    // El nombre del nudo es intocable: reserva su hueco antes que nada.
    tzOcupar(+x, +y+0.06, +x+0.30, +y+0.34);
  });
  // Primero las repartidas y después el resto: el bloque relleno tapaba las
  // flechas y los momentos que caían en su mismo tramo.
  if(conReacciones && R && !R.error){
    cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T').forEach(c=>{
      const a = accionesDeCarga(c)[0]; if(!a) return;
      const Fm = Math.hypot(a.fx, a.fy); if(Fm < 1e-9) return;
      const x = Xn(a.x), y = Yn(a.y), ex = a.fx/Fm, ey = a.fy/Fm;
      tzOcuparTrazo(x-ex*1.35, y-ey*1.35, x-ex*0.08, y-ey*0.08, 0.10);
    });
  }
  const _ordenadas = cargas.filter(c=>c.tipo==='U'||c.tipo==='T')
    .concat(cargas.filter(c=>!(c.tipo==='U'||c.tipo==='T')));
  _ordenadas.forEach(c=>{
    if(c.tipo==='P' || c.tipo==='PX' || c.tipo==='M'){
      const P = puntoDeCarga(c);
      if(!P) return;
      const x = Xn(P.x), y = Yn(P.y);
      if(c.tipo==='P' || c.tipo==='PX'){
        // El informe dibujaba SIEMPRE en vertical (o en horizontal la axial),
        // así que una carga marcada perpendicular al tramo salía como si
        // fuese global. Ahora sigue la dirección real que devuelve dirCarga.
        const _g2 = geoDeCarga(c);
        const d = dirCarga(c, _g2);
        const sg = (c.mag < 0) ? -1 : 1;
        const vx = d.x*sg, vy = d.y*sg;      // en TikZ la y NO está invertida
        // Una flecha casi paralela a la barra caía ENCIMA de ella y su valor
        // se leía sobre el propio eje. En ese caso se aparta hacia el lado
        // libre y se une al punto de aplicación con una guía de puntos.
        // Una fuerza paralela a la barra va SOBRE la barra (ahí actúa), pero
        // con un halo blanco que la recorta del eje para que se note, y con
        // el valor al costado de la flecha en vez de en su cola.
        const paralela = _g2 && Math.abs(vx*_g2.ux + vy*_g2.uy) > 0.9;
        const x1 = x - vx*0.85, y1 = y - vy*0.85;
        const x2 = x - vx*0.10, y2 = y - vy*0.10;
        if(paralela)
          out += '\\draw[white, line width=3.4pt] (' + F(x1) + ',' + F(y1) + ') -- (' + F(x2) + ',' + F(y2) + ');\n';
        out += '\\draw[-{Latex[length=2.2mm]}, color=bsaCarga, line width=1.1pt] ('
             + F(x1) + ',' + F(y1) + ') -- (' + F(x2) + ',' + F(y2) + ');\n';
        tzOcuparTrazo(x1, y1, x2, y2, 0.07);
        if(paralela){
          const n2x = -_g2.uy, n2y = _g2.ux;
          const s2 = (n2y < 0) ? -1 : 1;
          out += tzTexto((x1+x2)/2 + n2x*s2*0.24, (y1+y2)/2 + n2y*s2*0.24,
                         dec(Math.abs(c.mag),'f')+'\\,'+escLatex(unitFor),
                         'font=\\tiny, color=bsaCarga', n2x*s2, n2y*s2);
        } else if(vy > 0.5){
          // apunta hacia arriba: su cola queda bajo la viga, en la zona de
          // las cotas, así que el valor se pone al costado de la flecha
          const s = (x <= (Xn(minx)+Xn(maxx))/2) ? -1 : 1;
          const lab2 = dec(Math.abs(c.mag),'f')+'\\,'+escLatex(unitFor);
          out += tzTexto((x1+x2)/2 + s*(tzAncho(lab2, 'font=\\tiny')/2 + 0.14), (y1+y2)/2,
                         lab2, 'font=\\tiny, color=bsaCarga', s, 0);
        } else {
          out += tzTexto(x1 - vx*0.16, y1 - vy*0.16,
                         dec(Math.abs(c.mag),'f')+'\\,'+escLatex(unitFor),
                         'font=\\tiny, color=bsaCarga', -vx, -vy);
        }
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
      out += '\\draw[color=bsaDist] (' + F(ax) + ',' + F(ay)
           + ') -- (' + F(ax+ex*h1) + ',' + F(ay+ey*h1)
           + ') -- (' + F(bx+ex*h2) + ',' + F(by+ey*h2)
           + ') -- (' + F(bx) + ',' + F(by) + ') -- cycle;\n';
      for(let i=0;i<=5;i++){
        const tt=i/5, xi = ax+(bx-ax)*tt, yi = ay+(by-ay)*tt, hi = h1+(h2-h1)*tt;
        out += '\\draw[-{Latex[length=1.6mm]}, color=bsaDist, line width=.8pt] ('
             + F(xi+ex*hi) + ',' + F(yi+ey*hi) + ') -- ('
             + F(xi+ex*0.05) + ',' + F(yi+ey*0.05) + ');\n';
      }
      tzOcuparBloque({x:ax, y:ay}, {x:bx, y:by}, ex, ey, h1, h2);
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
      const bajoApoyo = (u.n.apoyo && u.n.apoyo !== 'libre' && d.y > 0.5);
      const L1 = bajoApoyo ? 1.30 : 0.85, L0 = bajoApoyo ? 0.62 : 0.10;
      out += '\\draw[-{Latex[length=2mm]}, color=bsaReac, line width=1.1pt] ('
           + F(x-d.x*L1) + ',' + F(y-d.y*L1) + ') -- (' + F(x-d.x*L0) + ',' + F(y-d.y*L0) + ');\n';
      tzOcuparTrazo(x-d.x*L1, y-d.y*L1, x-d.x*L0, y-d.y*L0, 0.07);
      if(Math.abs(d.y) > 0.5){
        // vertical: el rótulo va al costado de la flecha, hacia afuera de la
        // viga, y no debajo de su cola, donde se metía entre las cotas.
        const s = (x <= (Xn(minx)+Xn(maxx))/2) ? -1 : 1;
        const wl = tzAncho('$'+nom+'$', 'font=\\tiny');
        out += tzTexto(x + s*(wl/2 + 0.14), y - d.y*(L1+L0)/2, '$'+nom+'$',
                       'font=\\tiny, color=bsaReac', s, 0);
      } else {
        out += tzTexto(x-d.x*(L1+0.18), y-d.y*(L1+0.18), '$'+nom+'$',
                       'font=\\tiny, color=bsaReac', -d.x, -d.y);
      }
    });
  }

  // ── Cotas ──
  let minY = Infinity;
  nodos.forEach(n=>{ minY = Math.min(minY, Yn(n.y)); });

  if(conReacciones && R && !R.error){
    // ── DCL para las reacciones: resultantes de las repartidas y brazos
    //    desde O, el punto respecto al que se toman los momentos ──
    // Cada carga repartida se sustituye por su resultante (trazo discontinuo
    // en el centroide) y todas las fuerzas se acotan desde O con cotas
    // corridas, una por nivel: son exactamente los brazos que aparecen en
    // la ecuación de momentos.
    const brazosX = [], brazosY = [];
    const anota = (ax, ay, fx, fy) => {
      if(Math.abs(fy) > 1e-9 && Math.abs(ax) > 1e-6) brazosX.push(ax);
      if(Math.abs(fx) > 1e-9 && Math.abs(ay) > 1e-6) brazosY.push(ay);
    };
    cargasConPeso().forEach(c=>{
      const acs = accionesDeCarga(c);
      if(!acs.length) return;
      const a = acs[0];
      if(c.tipo === 'U' || c.tipo === 'T'){
        const Fm = Math.hypot(a.fx, a.fy);
        if(Fm < 1e-9) return;
        const x = Xn(a.x), y = Yn(a.y), ex = a.fx/Fm, ey = a.fy/Fm;
        const L1 = 1.35;
        out += '\\draw[-{Latex[length=2mm]}, color=bsaDist!60!black, dashed, line width=1pt] ('
             + F(x-ex*L1) + ',' + F(y-ey*L1) + ') -- (' + F(x-ex*0.08) + ',' + F(y-ey*0.08) + ');\n';
        tzOcuparTrazo(x-ex*L1, y-ey*L1, x-ex*0.08, y-ey*0.08, 0.06);
        out += tzTexto(x-ex*(L1+0.22), y-ey*(L1+0.22), '$W=' + dec(Fm,'f') + '$\\,' + escLatex(unitFor),
                       'font=\\tiny, color=bsaDist!60!black', -ex, -ey);
      }
      anota(a.x, a.y, a.fx, a.fy);
    });
    R.inc.forEach(u=>{
      if(u.tipo === 'M' && u.ang === undefined) return;
      const d = (u.ang !== undefined) ? {x:Math.cos(u.ang), y:Math.sin(u.ang)}
              : (u.tipo==='Rx' ? {x:1,y:0} : {x:0,y:1});
      anota(u.n.x, u.n.y, d.x, d.y);
    });
    // Punto O, si no coincide con un nudo
    if(!nodos.some(n=>Math.abs(n.x) < 1e-6 && Math.abs(n.y) < 1e-6)){
      out += '\\filldraw[black] (' + F(Xn(0)) + ',' + F(Yn(0)) + ') circle (0.05);\n';
      out += tzTexto(Xn(0)-0.2, Yn(0)-0.2, '$O$', 'font=\\scriptsize\\bfseries', -1, -1);
    }
    // Cotas corridas horizontales desde O, ordenadas de menor a mayor: cada
    // una en su nivel, con la etiqueta sobre su propia línea.
    const xsB = [...new Set(brazosX.map(v=>+v.toFixed(4)))].sort((a,b)=>Math.abs(a)-Math.abs(b));
    let base = minY - 1.75;
    const x0 = Xn(0);
    if(xsB.length){
      out += '\\draw[black!45, line width=.35pt, dashed] (' + F(x0) + ',' + F(minY-0.15) + ') -- ('
           + F(x0) + ',' + F(base - (xsB.length-1)*0.40 - 0.15) + ');\n';
    }
    xsB.forEach((xv, i)=>{
      const yy = base - i*0.40, x1 = Xn(xv);
      out += '\\draw[black!45, line width=.35pt, dashed] (' + F(x1) + ',' + F(minY-0.15) + ') -- ('
           + F(x1) + ',' + F(yy-0.12) + ');\n';
      out += '\\draw[black!70, line width=.5pt, {Latex[length=1.3mm]}-{Latex[length=1.3mm]}] ('
           + F(x0) + ',' + F(yy) + ') -- (' + F(x1) + ',' + F(yy) + ');\n';
      tzOcuparTrazo(x0, yy, x1, yy, 0.05);
      out += tzTextoFijo((x0+x1)/2, yy, dec(Math.abs(xv),'len') + (i === xsB.length-1 ? '\\,' + escLatex(unitLen) : ''),
                         'font=\\scriptsize, color=black!75');
    });
    // Cotas corridas verticales desde O (brazos de las fuerzas horizontales)
    const ysB = [...new Set(brazosY.map(v=>+v.toFixed(4)))].sort((a,b)=>Math.abs(a)-Math.abs(b));
    let baseX = Math.max(...nodos.map(n=>Xn(n.x))) + 0.75;
    const y0 = Yn(0);
    ysB.forEach((yv, i)=>{
      const xx = baseX + i*0.42, y1 = Yn(yv);
      out += '\\draw[black!45, line width=.35pt, dashed] (' + F(Xn(0)) + ',' + F(y0) + ') -- (' + F(xx+0.12) + ',' + F(y0) + ');\n';
      out += '\\draw[black!70, line width=.5pt, {Latex[length=1.3mm]}-{Latex[length=1.3mm]}] ('
           + F(xx) + ',' + F(y0) + ') -- (' + F(xx) + ',' + F(y1) + ');\n';
      const w2 = tzAncho(dec(Math.abs(yv),'len'), 'font=\\scriptsize');
      tzOcupar(xx-0.16, (y0+y1)/2 - w2/2, xx+0.16, (y0+y1)/2 + w2/2);
      out += '\\node[rotate=90, font=\\scriptsize, color=black!75, fill=white, inner sep=1pt] at ('
           + F(xx) + ',' + F((y0+y1)/2) + ') {' + dec(Math.abs(yv),'len') + '\\,' + escLatex(unitLen) + '};\n';
    });
    return out;
  }

  // ── Figura del modelo: primero las posiciones de las cargas (niveles
  //    interiores), después la cadena de nudos, y por último la luz total.
  //    Mismo orden que en el panel, para que el alumno lea igual las dos.
  let base = minY - 0.75;

  const xsCargas = [...new Set(xsDeCargas().map(v=>+v.toFixed(6)))];
  const xsNodos  = [...new Set(nodos.map(n=>+n.x.toFixed(6)))];
  const aporta = xsCargas.some(v => !xsNodos.some(q => Math.abs(Xn(q)-Xn(v)) < 0.10));
  if(aporta){
    const todos = [...new Set(xsCargas.concat([Math.min(...xsNodos), Math.max(...xsNodos)])
                    .map(v=>+v.toFixed(6)))];
    const cc = tzCadenaCotas(todos, Xn, base, 'bsaDist', {maxNiveles:3});
    if(cc.nMax >= 0){ out += cc.tikz; base -= 0.40 + (cc.nMax+1)*0.36; }
  }
  const cn = tzCadenaCotas(xsNodos, Xn, base, 'bsaMuted', {maxNiveles:4});
  if(cn.nMax >= 0){
    out += cn.tikz;
    base -= 0.44 + (cn.nMax+1)*0.36;
    // Luz total, solo si hay más de un vano: con uno repetiría la cadena.
    if(cn.nMax >= 0 && xsNodos.length > 2){
      const xa = Xn(Math.min(...xsNodos)), xb = Xn(Math.max(...xsNodos));
      out += '\\draw[bsaAcc, line width=.6pt, {Latex[length=1.4mm]}-{Latex[length=1.4mm]}] ('
           + xa.toFixed(3) + ',' + base.toFixed(3) + ') -- (' + xb.toFixed(3) + ',' + base.toFixed(3) + ');\n';
      out += tzTextoFijo((xa+xb)/2, base, dec(Math.max(...xsNodos)-Math.min(...xsNodos),'len')
           + '\\,' + escLatex(unitLen), 'font=\\scriptsize, color=bsaAcc');
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
      const cy = tzCadenaCotasY(todosY, Yn, baseX, 'bsaDist', {maxNiveles:3});
      if(cy.nMax >= 0){ out += cy.tikz; baseX += 0.30 + (cy.nMax+1)*0.38; }
    }
    const cyn = tzCadenaCotasY(ysNodos, Yn, baseX, 'bsaMuted', {maxNiveles:4});
    if(cyn.nMax >= 0){
      out += cyn.tikz;
      baseX += 0.38 + (cyn.nMax+1)*0.38;
      if(ysNodos.length > 2){
        const ya = Yn(Math.min(...ysNodos)), yb = Yn(Math.max(...ysNodos));
        out += '\\draw[bsaAcc, line width=.6pt, {Latex[length=1.4mm]}-{Latex[length=1.4mm]}] ('
             + baseX.toFixed(3) + ',' + ya.toFixed(3) + ') -- ('
             + baseX.toFixed(3) + ',' + yb.toFixed(3) + ');\n';
        out += '\\node[rotate=90, font=\\scriptsize, color=bsaAcc, fill=white, inner sep=1pt] at ('
             + baseX.toFixed(3) + ',' + ((ya+yb)/2).toFixed(3) + ') {'
             + dec(Math.max(...ysNodos)-Math.min(...ysNodos),'len') + '\\,'
             + escLatex(unitLen) + '};\n';
      }
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
//  INFORME: estructura del documento
//  Sigue el orden en que se enseña el tema: planteamiento y convenio de
//  signos → reacciones → funciones por tramos (con DCL y ecuaciones) →
//  diagramas → comprobaciones. Cada paso lleva su «¿Por qué?».
// ═══════════════════════════════════════════════════════════
function tablaDatosModelo(){
  const uL = escLatex(unitLen), uF = escLatex(unitFor), uM = escLatex(unidadMomento()), uW = escLatex(uDist());
  let out = '';
  // Nudos
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{ccccc}\n\\hline\n'
    + 'Nudo & $x$ [' + uL + '] & $y$ [' + uL + '] & Apoyo & Rótula \\\\\n\\hline\n';
  nodos.forEach(n=>{
    out += escLatex(n.nombre) + ' & ' + dec(n.x,'len') + ' & ' + dec(n.y,'len') + ' & '
      + escLatex(NOMBRE_APOYO[n.apoyo || 'libre'] || 'libre')
      + (n.apoyo === 'movil' && Math.abs((angReaccion(n)*180/Math.PI) - 90) > 0.5
          ? ' (' + (angReaccion(n)*180/Math.PI).toFixed(0) + '$^\\circ$)' : '')
      + ' & ' + (n.rotula ? 'sí' : '--') + ' \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  // Cargas
  const lista = cargasConPeso();
  if(lista.length){
    out += '{\\footnotesize\\begin{center}\\begin{tabular}{llll}\n\\hline\n'
      + 'Carga & Sobre & Posición [' + uL + '] & Magnitud \\\\\n\\hline\n';
    lista.forEach(c=>{
      const t = tramos.find(z=>z.id === c.tramo);
      let tipo, donde, pos, mag;
      const marco = (c.tipo === 'M') ? ''
        : ', ' + ((DIR_CARGA[dirDeCarga(c)]||{}).nom || '').toLowerCase();
      if(c.tipo === 'P' || c.tipo === 'PX'){ tipo = 'Puntual' + marco; mag = dec(c.mag,'fuerza') + ' ' + uF; }
      else if(c.tipo === 'M'){ tipo = 'Momento (par)'; mag = dec(c.mag,'momento') + ' ' + uM + (c.mag >= 0 ? ' antihorario' : ' horario'); }
      else if(c.tipo === 'U'){ tipo = (c._peso ? 'Peso propio' : 'Repartida uniforme') + marco; mag = dec(c.mag,'fuerza') + ' ' + uW; }
      else { tipo = 'Repartida variable' + marco; mag = dec(c.mag,'fuerza') + ' a ' + dec(c.mag2||0,'fuerza') + ' ' + uW; }
      if(c.destino === 'nudo'){ const n = nodo(c.nudo); donde = 'nudo ' + escLatex(n ? n.nombre : '?'); pos = '--'; }
      else {
        donde = 'tramo ' + escLatex(t ? nomTramo(t) : '?');
        if(c.tipo === 'U' || c.tipo === 'T'){
          const z = trozoCargado(c);
          pos = z ? dec(z.s1,'len') + ' a ' + dec(z.s2,'len') + ' desde ' + escLatex(t ? nodo(t.a).nombre : '?') : '--';
        } else {
          const g = t && geoTramo(t);
          pos = g ? dec(sDesdePos(c, g, c.pos),'len') + ' desde ' + escLatex(nodo(t.a).nombre) : '--';
        }
      }
      out += tipo + ' & ' + donde + ' & ' + pos + ' & ' + mag + ' \\\\\n';
    });
    out += '\\hline\n\\end{tabular}\\end{center}}\n';
  }
  return out;
}

// Resultante y centroide de cada carga repartida, tal como se usan para las
// reacciones (la viga completa admite la sustitución; un trozo cortado, no).
function tablaCargasEquivalentes(){
  const lista = cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T');
  if(!lista.length) return '';
  const uL = escLatex(unitLen), uF = escLatex(unitFor), uW = escLatex(uDist());
  let out = '\\noindent{\\footnotesize Cada carga repartida se sustituye, solo para este paso, por su resultante '
    + '$W$ (área del diagrama de carga) aplicada en el centroide de ese diagrama:}\\\\[2pt]\n';
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{llccl}\n\\hline\n'
    + 'Carga & Forma & $W$ [' + uF + '] & Centroide & Posición global ($x$, $y$) [' + uL + '] \\\\\n\\hline\n';
  lista.forEach(c=>{
    const z = trozoCargado(c); if(!z || z.len <= 1e-12) return;
    const t = tramos.find(q=>q.id === c.tramo);
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const W = (w1+w2)/2*z.len;
    const dc = (Math.abs(w1+w2) < 1e-12) ? z.len/2 : z.len*(w1+2*w2)/(3*(w1+w2));
    const a = accionesDeCarga(c)[0];
    const forma = (c.tipo==='U') ? 'rectángulo $w\\cdot L = ' + dec(Math.abs(w1),'fuerza') + '\\times' + dec(z.len,'len') + '$'
      : (Math.abs(w1) < 1e-9 || Math.abs(w2) < 1e-9
          ? 'triángulo $\\tfrac12 w L = \\tfrac12\\cdot' + dec(Math.max(Math.abs(w1),Math.abs(w2)),'fuerza') + '\\times' + dec(z.len,'len') + '$'
          : 'trapecio $\\tfrac12(w_1+w_2)L$');
    const cen = (c.tipo==='U' || Math.abs(w1-w2) < 1e-9) ? 'a $L/2$' : (Math.abs(w1) < 1e-9 ? 'a $2L/3$ del inicio' : (Math.abs(w2) < 1e-9 ? 'a $L/3$ del inicio' : 'a ' + dec(dc,'len') + ' del inicio'));
    out += (c._peso ? 'Peso propio' : (c.tipo==='U' ? 'Uniforme' : 'Variable')) + ' en ' + escLatex(t ? nomTramo(t) : '?')
      + ' & ' + forma + ' & ' + dec(Math.abs(W),'fuerza') + ' & ' + cen
      + ' & (' + dec(a ? a.x : 0,'len') + ', ' + dec(a ? a.y : 0,'len') + ') \\\\\n';
  });
  out += '\\hline\n\\end{tabular}\\end{center}}\n';
  return out;
}

function construirLatex(){
  if(!R || R.error || !R.internas){
    aviso('Primero pulsa Calcular (o revisa el equilibrio de la viga).');
    return null;
  }
  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});
  const uL = escLatex(unitLen), uF = escLatex(unitFor), uM = escLatex(unidadMomento());

  const preambulo = '\\documentclass[11pt]{article}\n'
    + '\\usepackage[utf8]{inputenc}\n'
    + '\\usepackage[T1]{fontenc}\n'
    + '\\usepackage[a4paper,margin=2.0cm]{geometry}\n'
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
    + '\\setlength{\\parskip}{2pt}\n'
    + '\\makeatletter\n'
    + '\\def\\ps@bsa{%\n'
    + '  \\def\\@oddhead{\\small\\color{bsaAcc}\\textbf{BSA --- Fuerzas Internas}\\hfill'
    + '\\footnotesize\\color{bsaMuted}Método de las secciones}%\n'
    + '  \\def\\@oddfoot{\\hfill\\footnotesize\\color{bsaMuted}beamsectionanalysis.com\\ \\ \\textperiodcentered\\ \\ pág.\\ \\thepage\\hfill}%\n'
    + '  \\let\\@evenhead\\@oddhead \\let\\@evenfoot\\@oddfoot}\n'
    + '\\makeatother\n'
    + '\\pagestyle{bsa}\n\n'
    + '\\newcommand{\\seccion}[1]{%\n'
    + '  \\vspace{10pt}{\\large\\bfseries\\color{bsaAcc}#1}\\par\\vspace{3pt}\\hrule\\vspace{7pt}}\n'
    + '\\newcommand{\\subpaso}[1]{\\vspace{6pt}\\noindent{\\bfseries\\color{bsaAcc2}#1}\\par\\vspace{3pt}}\n'
    + '\\newcommand{\\porque}[1]{\\par\\vspace{3pt}\\noindent\\fcolorbox{bsaAcc!40}{bsaAcc!5}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\footnotesize{\\bfseries\\color{bsaAcc2}¿Por qué?}\\ #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\resultado}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaVerde!50}{bsaVerde!6}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n\n'
    + '\\begin{document}\n\n';

  let figN = 0;
  function figCaption(txt){
    figN++;
    return '\n\\begin{center}{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\\end{center}\n\\vspace{4pt}\n';
  }
  const grupos = gruposDireccion(R);
  const hayDist = cargasConPeso().some(c=>c.tipo==='U'||c.tipo==='T');
  const hayN = R.internas.some(seg=>seg.subs.some(su=>su.cN.some(v=>Math.abs(v)>5e-9)));

  let tex = preambulo;
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Fuerzas internas en vigas}\\\\[3pt]\n'
    + '  {\\large\\color{bsaAcc2} Funciones y diagramas de fuerza normal, fuerza cortante y momento flector}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Informe generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{6pt}\n\n';

  // ══ 1. Planteamiento ══
  tex += '\\seccion{1. Planteamiento del problema}\n';
  tex += '\\begin{center}\\begin{tikzpicture}[scale=1]\n' + tikzViga() + '\\end{tikzpicture}\\end{center}\n';
  tex += figCaption('Modelo de la viga: apoyos, cargas y nombres de nudo, con las cotas de posición.');
  tex += tablaDatosModelo();
  const _usados = pesos.filter(p=>tramos.some(t=>t.pesoId === p.id));
  if(_usados.length){
    tex += '\\noindent{\\footnotesize Se ha considerado peso propio, en dirección vertical y '
      + 'sobre la longitud real del eje:}\\\\[2pt]\n';
    tex += '{\\footnotesize\\begin{center}\\begin{tabular}{lrl}\n\\hline\n'
      + 'Valor & Peso (' + escLatex(uDist()) + ') & Tramos \\\\\n\\hline\n';
    _usados.forEach(p=>{
      const nn = tramos.filter(t=>t.pesoId === p.id).map(t=>escLatex(nomTramo(t))).join(', ');
      tex += escLatex(p.nom) + ' & ' + dec(p.val,'f') + ' & ' + nn + ' \\\\\n';
    });
    tex += '\\hline\n\\end{tabular}\\end{center}}\n';
  }
  if(cargas.some(c=>c.tipo !== 'M' && marcoDeCarga(c) === 'local'))
    tex += '\\noindent{\\footnotesize Alguna carga se ha definido respecto al \\emph{eje del tramo} '
      + '(perpendicular o axial) en vez de seguir la vertical y la horizontal del plano; '
      + 'en un tramo inclinado no son lo mismo.}\\\\[4pt]\n';

  tex += '\\subpaso{Objetivo}\n'
    + 'Determinar, en cada sección de la viga, las tres solicitaciones internas: la fuerza normal $N$, '
    + 'la fuerza cortante $V$ y el momento flector $M$; expresarlas como funciones de la posición '
    + 'de la sección y representarlas en los diagramas DFN, DFC y DMF.\n';
  tex += '\\porque{Para diseñar un elemento hay que saber qué carga soporta \\emph{por dentro} en cada '
    + 'punto: la sección más solicitada es la que gobierna el dimensionamiento. Esas cargas interiores no '
    + 'se ven; para ponerlas en evidencia se corta imaginariamente la viga en una sección $S$ y se aísla '
    + 'uno de los dos trozos. Como la viga entera está en equilibrio, cada trozo también lo está, y las '
    + 'fuerzas que el otro trozo ejercía a través del corte ($N$, $V$, $M$) se obtienen con las tres '
    + 'ecuaciones de equilibrio del trozo aislado. Es el \\emph{método de las secciones}.}\n';

  tex += '\\subpaso{Procedimiento de análisis}\n'
    + '\\begin{enumerate}\\setlength{\\itemsep}{1pt}\n'
    + '\\item \\textbf{Reacciones.} Se aísla la viga completa, se dibuja su DCL y se resuelven las '
    + 'reacciones con $\\sum F_x = 0$, $\\sum F_y = 0$ y $\\sum M = 0$' + (R.rotulas.length ? ' (más una ecuación de momento nulo por cada rótula)' : '') + '.\n'
    + '\\item \\textbf{Cortes por tramos.} Se marcan los puntos donde cambia algo (una carga puntual, '
    + 'un par, el inicio o el fin de una carga repartida, un apoyo, un quiebre) y se corta en una sección '
    + 'genérica de cada intervalo, a distancia $x$ del origen del tramo.\n'
    + '\\item \\textbf{Equilibrio del trozo.} Se dibuja el DCL del trozo anterior al corte con $N$, $V$ y '
    + '$M$ en sentido positivo y se plantean $\\sum F_{\\parallel}=0$, $\\sum F_{\\perp}=0$ y $\\sum M_S=0$; '
    + 'de ahí salen $N(x)$, $V(x)$ y $M(x)$.\n'
    + '\\item \\textbf{Diagramas y comprobación.} Se evalúan las funciones en los extremos de cada intervalo, '
    + 'se ubican los ceros y los extremos, se dibujan los diagramas y se verifica con las relaciones '
    + '$dV/dx = -w$, $dM/dx = V$ y con las condiciones de borde.\n'
    + '\\end{enumerate}\n';

  tex += '\\subpaso{Convenio de signos}\n';
  tex += '\\begin{center}\\begin{tikzpicture}[scale=.9]\n' + tikzConvenio()
       + '\\end{tikzpicture}\\end{center}\n';
  tex += figCaption('Sentido POSITIVO de las tres solicitaciones internas sobre las dos caras de un corte.');
  tex += '\\noindent\\begin{itemize}\\setlength{\\itemsep}{1pt}\n'
    + '\\item $N > 0$ cuando la sección está en \\textbf{tracción}: cada trozo tira del otro.\n'
    + '\\item $V > 0$ cuando las fuerzas transversales tienden a hacer \\textbf{girar el trozo en sentido horario}: '
    + 'sobre la cara derecha del trozo izquierdo, $V$ positiva apunta hacia abajo.\n'
    + '\\item $M > 0$ cuando el momento \\textbf{comprime las fibras superiores} y tracciona las inferiores: la viga '
    + 'se curva cóncava hacia arriba (\\emph{sonríe}).\n'
    + '\\end{itemize}\n';
  tex += '\\porque{Con este convenio, para el trozo situado a la izquierda del corte se cumple una regla '
    + 'práctica que evita errores de signo: $V$ es la suma de las fuerzas transversales hacia arriba, y $M$ '
    + 'es la suma de los momentos \\emph{horarios} de esas fuerzas respecto del corte (una fuerza hacia '
    + 'arriba situada a la izquierda da momento positivo; un par antihorario aplicado resta). $N$ es la suma '
    + 'de las fuerzas que tiran del trozo hacia atrás, cambiada de signo.}\n';

  // ══ 2. Paso 1: reacciones ══
  tex += '\\seccion{2. Paso 1 --- Reacciones en los apoyos}\n';
  tex += '\\porque{El trozo que se aísla al cortar contiene uno o más apoyos, así que sus reacciones aparecen '
    + 'en las ecuaciones del corte como fuerzas conocidas. Por eso hay que resolverlas antes, con el equilibrio '
    + 'de la viga completa.}\n';
  if(hayDist){
    tex += tablaCargasEquivalentes();
    tex += '\\porque{Para el equilibrio de la viga \\emph{completa} una carga repartida puede sustituirse por su '
      + 'resultante, porque las ecuaciones de equilibrio solo dependen de la fuerza total y de su momento. Esa '
      + 'sustitución \\textbf{no} vale al analizar un trozo cortado dentro de la carga: allí actúa solo la parte '
      + 'de carga que queda antes del corte, y su resultante cambia con $x$.}\n';
  }
  tex += 'Se plantean las tres ecuaciones de equilibrio de la viga completa'
    + (R.rotulas.length ? ', más ' + R.rotulas.length
        + ' ecuación(es) de momento nulo por cada rótula interna' : '') + ':\\\\[2pt]\n';
  tex += '$$\\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M_O = 0'
    + (R.rotulas.length ? '\\qquad \\sum M_{\\text{rótula}} = 0' : '') + '$$\n';
  tex += 'con ' + R.inc.length + ' incógnita(s) de reacción y ' + R.diag.eq + ' ecuación(es): la viga es '
    + 'isostática y las reacciones salen de la estática.\\\\[6pt]\n';
  tex += pasoAPasoReacciones(R);
  tex += '\\resultado{\\centering\\small\n'
    + '\\begin{tabular}{@{}clrl@{}}\n\\hline\n'
    + '\\textbf{Apoyo} & \\textbf{Componente} & \\textbf{Valor} & \\textbf{Sentido real} \\\\\n\\hline\n';
  R.inc.forEach((u,j)=>{
    const esMom = (u.tipo === 'M' && u.ang === undefined);
    const nomR = u.ang !== undefined ? 'R' : (u.tipo==='Rx' ? 'R_x' : (u.tipo==='Ry' ? 'R_y' : 'M'));
    const v = R.val[j];
    let que, sentido;
    if(esMom){
      que = 'momento de empotramiento';
      sentido = (v >= 0) ? 'antihorario' : 'horario';
    } else if(u.ang !== undefined){
      const gr = (u.ang*180/Math.PI).toFixed(0);
      que = 'según el apoyo (' + gr + '$^\\circ$)';
      sentido = (v >= 0) ? 'en el sentido dibujado' : 'contrario al dibujado';
    } else if(u.tipo === 'Rx'){
      que = 'horizontal';
      sentido = (v >= 0) ? 'hacia la derecha' : 'hacia la izquierda';
    } else {
      que = 'vertical';
      sentido = (v >= 0) ? 'hacia arriba' : 'hacia abajo';
    }
    tex += escLatex(u.n.nombre) + ' & $' + nomR + '$, ' + que + ' & $'
      + dec(v, esMom?'momento':'fuerza') + '$\\,' + escLatex(esMom?unidadMomento():unitFor)
      + ' & ' + sentido + ' \\\\\n';
  });
  tex += '\\hline\n\\end{tabular}}\n';
  tex += '\\noindent{\\footnotesize El signo se refiere al sentido positivo supuesto en el DCL: '
    + 'un valor negativo significa que la reacción actúa al revés, y la columna «Sentido real» ya lo '
    + 'traduce. En los DCL de los cortes cada reacción se dibuja directamente con ese sentido real.}\\\\[4pt]\n';

  // ══ 3. Paso 2: funciones por tramos ══
  tex += '\\seccion{3. Paso 2 --- Funciones $N(x)$, $V(x)$ y $M(x)$ por tramos}\n';
  tex += '\\noindent La abscisa de la sección se mide desde el último punto de quiebre de la viga: se llama '
    + '$x$ en los tramos horizontales y $r$ en los inclinados, donde se mide a lo largo del eje del tramo. '
    + 'Las solicitaciones se refieren siempre a los ejes locales: $N$ según el eje del tramo y $V$ '
    + 'perpendicular a él.\n';
  tex += '\\porque{Las funciones $N$, $V$ y $M$ cambian de expresión cada vez que aparece una nueva acción: '
    + 'una fuerza puntual hace saltar $V$, un par hace saltar $M$, y al entrar en una carga repartida $V$ '
    + 'deja de ser constante. Una sola expresión no puede describir ambos lados de esos puntos, así que se '
    + 'corta en cada intervalo por separado.}\n';

  grupos.forEach(gg=>{
    const sb = gg.simbolo;
    if(gg.idx > 0)
      tex += '\\vspace{8pt}\\noindent{\\color{bsaAcc2}\\rule{\\linewidth}{.8pt}}\\vspace{5pt}\n';
    tex += '\\subpaso{Tramo ' + escLatex(gg.recorrido) + '\\quad '
      + (gg.inclinado ? 'inclinado ' + gg.ang.toFixed(1) + '$^\\circ$' : 'horizontal')
      + '\\quad $L = ' + dec(gg.L,'len') + '$\\,' + uL
      + '\\quad abscisa $' + sb + '$ desde ' + escLatex(gg.desde.nombre) + '}\n';
    tex += '\\noindent{\\footnotesize Puntos donde hay que cortar en este tramo:}\\\\[2pt]\n';
    tex += tablaCortesGrupo(R, gg);
    gg.tramos.forEach(seg=>{
      seg.subs.forEach(sub=>{
        tex += desarrolloCorte(R, grupos, gg, seg, sub, figCaption);
        tex += '\\vspace{3pt}\\noindent{\\color{bsaMuted}\\rule{0.35\\linewidth}{.3pt}}\\\\[3pt]\n';
      });
    });
    tex += tablaNudosGrupo(R, gg);
    tex += tablaSingulares(R, gg);
  });

  // ══ 4. Paso 3: diagramas ══
  tex += '\\seccion{4. Paso 3 --- Diagramas de fuerzas internas}\n';
  tex += '\\noindent Cada diagrama se dibuja debajo del esquema del tramo, con la misma escala horizontal, '
    + 'de modo que cada salto o cambio de pendiente quede justo bajo la acción que lo produce. Se acotan los '
    + 'valores en los extremos de cada intervalo, los puntos donde la función se anula y los extremos de $M$.\n';
  tex += '\\porque{Las relaciones diferenciales $dV/dx = -w$ y $dM/dx = V$ dicen cómo debe verse cada '
    + 'diagrama: la pendiente de $V$ es la intensidad de carga cambiada de signo, y la pendiente de $M$ '
    + 'es el valor de $V$. Por eso $M$ alcanza un máximo o mínimo justo donde $V = 0$, y donde $V$ '
    + 'cambia de signo por un salto (una carga puntual) $M$ tiene un vértice. Los ceros de $M$ son los '
    + 'puntos de inflexión de la deformada.}\n';
  grupos.forEach(gg=>{
    tex += tablaFormaGrupo(R, gg);
    tex += '\\begin{center}\\begin{tikzpicture}\n' + tikzDiagramasGrupo(R, gg)
         + '\\end{tikzpicture}\\end{center}\n';
    tex += figCaption('Tramo ' + escLatex(gg.recorrido) + (gg.inclinado ? ' (desarrollado sobre su eje; las cargas se muestran por sus componentes perpendicular y paralela)' : '')
      + ': esquema de cargas y reacciones y, debajo, los diagramas '
      + (gg.tramos.some(t2=>t2.subs.some(su=>su.cN.some(v=>Math.abs(v)>5e-9))) ? 'DFN, ' : '')
      + 'DFC y DMF alineados con él.');
  });

  // ══ 5. Paso 4: comprobaciones ══
  tex += '\\seccion{5. Paso 4 --- Comprobaciones}\n';
  tex += '\\porque{Un diagrama que no cierra delata un error de signo o de brazo. Las comprobaciones más útiles '
    + 'son las condiciones de borde (en un extremo libre o tras el último apoyo ya no queda viga, luego '
    + '$V$ y $M$ deben anularse; un apoyo articulado o una rótula no transmiten momento) y el método de las áreas, '
    + 'que reconstruye cada diagrama a partir del anterior por integración.}\n';
  tex += '\\subpaso{Condiciones de borde}\n';
  tex += comprobacionesFinales(R, grupos);
  tex += '\\subpaso{Método de las áreas}\n';
  grupos.forEach(gg=>{ tex += tablaAreasGrupo(R, gg); });

  tex += '\\subpaso{Resumen de valores extremos}\n';
  tex += '{\\footnotesize\\begin{center}\\begin{tabular}{l' + (hayN ? 'rr' : '') + 'rrrr}\n\\hline\n'
    + 'Tramo ' + (hayN ? '& $N_{\\max}$ & $N_{\\min}$ ' : '') + '& $V_{\\max}$ & $V_{\\min}$ & $M_{\\max}$ & $M_{\\min}$ \\\\\n\\hline\n';
  R.internas.forEach(seg=>{
    const ns = seg.puntos.map(p=>p.N), vs = seg.puntos.map(p=>p.V), ms = seg.puntos.map(p=>p.M);
    tex += escLatex(seg.nombre)
      + (hayN ? ' & ' + dec(Math.max(...ns),'fuerza') + ' & ' + dec(Math.min(...ns),'fuerza') : '')
      + ' & ' + dec(Math.max(...vs),'fuerza') + ' & ' + dec(Math.min(...vs),'fuerza')
      + ' & ' + dec(Math.max(...ms),'momento') + ' & ' + dec(Math.min(...ms),'momento') + ' \\\\\n';
  });
  tex += '\\hline\n\\end{tabular}\\end{center}}\n'
    + '{\\footnotesize\\color{bsaMuted}Valores en ' + uF + ' (fuerzas) y ' + uM + ' (momento). '
    + 'La sección crítica para el diseño a flexión es la de $|M|$ máximo; la crítica a cortante, la de $|V|$ máximo.}\n';

  tex += '\\vspace{10pt}\\noindent{\\footnotesize\\color{bsaMuted}\\textbf{Referencias.} '
    + 'R.~C. Hibbeler, \\emph{Ingeniería Mecánica: Estática}, 12.ª ed., cap.~7 «Fuerzas internas». '
    + 'H.~J. Rodríguez, \\emph{Cap.~8 Fuerzas internas}, Sección de Ingeniería Mecánica, PUCP. '
    + 'F.~P. Beer y E.~R. Johnston, \\emph{Mecánica vectorial para ingenieros: Estática}, cap.~7.}\n';

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
