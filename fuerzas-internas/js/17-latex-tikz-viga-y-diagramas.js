// ── Modelo de la viga en TikZ: tramos, apoyos, cargas y nombres de nudo ──
// `sel` (opcional) recorta la figura a un TROZO de la estructura, para el DCL
// del lado de una rótula: {tramos:[ids], origen:{x,y,nombre}, rotula:nodo}.
// Con él, además, los brazos se acotan desde `origen` en vez de desde O, que es
// la regla: se acota siempre desde el punto respecto al cual se toman momentos.
function tikzViga(conReacciones, sel){
  if(!nodos.length) return '';
  tzReiniciar();
  _angulosFiguraFI = [];
  const genAng = bsaLetrasGriegas();
  const _idsVis = (sel && sel.tramos) ? sel.tramos : null;
  const _tr = _idsVis ? tramos.filter(t=>_idsVis.indexOf(t.id) >= 0) : tramos;
  const _ndIds = new Set();
  _tr.forEach(t=>{ _ndIds.add(t.a); _ndIds.add(t.b); });
  const _nd = _idsVis ? nodos.filter(n=>_ndIds.has(n.id)) : nodos;
  if(!_nd.length) return '';
  // ¿Entra esta carga en el trozo dibujado? Una carga de nudo se decide por su
  // nudo; una de tramo, por su tramo (el mismo criterio que `accionEnLado`).
  const _cgVis = c => !_idsVis || (c.destino === 'nudo'
    ? _ndIds.has(c.nudo) : _idsVis.indexOf(c.tramo) >= 0);
  // Qué reacciones se dibujan. Con `incNodos` se usa la MISMA lista que emplea
  // `analizar` para montar la ecuación de la rótula, así el dibujo y la
  // ecuación no pueden discrepar.
  const _incVis = u => (sel && sel.incNodos)
    ? sel.incNodos.indexOf(u.n.id) >= 0
    : (!_idsVis || _ndIds.has(u.n.id));
  const OR = (sel && sel.origen) ? sel.origen : {x:0, y:0, nombre:'O'};
  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  _nd.forEach(n=>{ minx=Math.min(minx,n.x); maxx=Math.max(maxx,n.x); miny=Math.min(miny,n.y); maxy=Math.max(maxy,n.y); });
  const spanX = Math.max(maxx-minx, 1e-6);
  const k = Math.min(2.2, 8/spanX);
  const Xn = x => (x-minx)*k, Yn = y => y*k;
  // Centro de la figura: decide qué lado de una flecha es «de fuera».
  const cxFig = (Xn(minx)+Xn(maxx))/2, cyFig = (Yn(miny)+Yn(maxy))/2;
  const F = n => n.toFixed(3);
  let out = '';
  // ── Dos fases (2026-09-14) ──
  // (A) Se dibuja y se reserva TODA la geometría: tramos, rótulas, puntos de
  // nudo, apoyos, bloques y flechas de las cargas, arcos de los pares y
  // reacciones. (B) Solo entonces se colocan los rótulos, que se van dejando en
  // estas listas como {x,y,txt,opts,dir,candidatos}. Antes cada rótulo se
  // colocaba en cuanto se dibujaba lo suyo, sin saber lo que venía detrás: los
  // tramos no se reservaban, el nombre del nudo tenía un sitio fijo que no veía
  // el arco del par ni las flechas de la repartida, y la flecha de una puntual
  // atravesaba el valor de la repartida colocado antes que ella. El TikZ de los
  // rótulos se escribe al final, así que además quedan encima del dibujo.
  const pendNudos = [], pendPares = [], pendRepartidas = [], pendPuntuales = [], pendW = [], pendReac = [];
  // Distancia desde la cola de una flecha hasta el centro de su rótulo: media
  // caja medida en la dirección de la flecha, más la holgura `g` con que se
  // reservó el trazo y 0.02. Con una distancia fija (0.16) la caja pisaba la
  // reserva de su propia flecha y el rótulo nunca se quedaba en su cola: subía
  // un escalón, o se iba de lado con una guía.
  const sepCola = (txt, op, vx, vy, g) => Math.abs(vx)*tzAncho(txt, op)/2 + Math.abs(vy)*tzAlto(txt, op)/2 + g + 0.02;
  _tr.forEach(t=>{
    const a = nodo(t.a), b = nodo(t.b);
    if(!a||!b) return;
    out += '\\draw[line width=1.6pt, color=bsaAcc2] (' + F(Xn(a.x)) + ',' + F(Yn(a.y)) + ') -- (' + F(Xn(b.x)) + ',' + F(Yn(b.y)) + ');\n';
    tzOcuparTrazo(Xn(a.x), Yn(a.y), Xn(b.x), Yn(b.y), 0.06);
  });
  // Reserva el rectángulo local [x0,x1]×[y0,y1] de un símbolo girado `ang`
  // grados alrededor del nudo (px,py), troceado en celdas: la caja envolvente
  // de un símbolo girado (el cuadrado de antes) tapaba también las esquinas
  // libres del nudo, que es donde va su nombre.
  const ocuparGirado = (px, py, x0, y0, x1, y1, ang) => {
    const ca = Math.cos(ang*Math.PI/180), sa = Math.sin(ang*Math.PI/180);
    const ni = Math.max(1, Math.ceil((x1-x0)/0.2)), nj = Math.max(1, Math.ceil((y1-y0)/0.2));
    for(let i=0;i<ni;i++) for(let j=0;j<nj;j++){
      const xa = x0+(x1-x0)*i/ni, xb = x0+(x1-x0)*(i+1)/ni;
      const ya = y0+(y1-y0)*j/nj, yb = y0+(y1-y0)*(j+1)/nj;
      const xs = [], ys = [];
      [[xa,ya],[xb,ya],[xa,yb],[xb,yb]].forEach(p=>{
        xs.push(px + p[0]*ca - p[1]*sa); ys.push(py + p[0]*sa + p[1]*ca);
      });
      tzOcupar(Math.min.apply(null,xs), Math.min.apply(null,ys),
               Math.max.apply(null,xs), Math.max.apply(null,ys));
    }
  };
  _nd.forEach(n=>{
    const x = Xn(n.x), y = Yn(n.y);
    if(n.apoyo && n.apoyo !== 'libre'){
      // Empotramiento: el muro mira hacia afuera de la viga, girando con los
      // tramos que llegan al nudo (`anguloEmpotramiento`, 15-), igual que en el
      // lienzo. El criterio anterior solo distinguía izquierda y derecha, y en
      // una columna el muro salía montado sobre la propia viga.
      const emp = (n.apoyo === 'empotrado');
      const aAp = anguloApoyo(n);
      const aMuro = emp ? anguloEmpotramiento(n) : undefined;
      out += tikzApoyo(x, y, n.apoyo, 1, aMuro, aAp);
      // Si el símbolo gira, su hueco se reserva girado con él: el muro (cara en
      // x = 0 y rayas hacia +x local) o el simple/móvil colgando del nudo.
      if(emp) ocuparGirado(x, y, -0.04, -0.53, 0.20, 0.46, (aMuro === undefined ? 180 : aMuro));
      else if(Math.abs(aAp - 90) > 0.01) ocuparGirado(x, y, -0.42, -0.62, 0.42, 0.02, aAp - 90);
      else tzOcupar(x-0.42, y-0.62, x+0.42, y+0.02);
    }
  });
  _nd.forEach(n=>{
    if(n.rotula && tramos.filter(t=>t.a===n.id||t.b===n.id).length > 1)
      out += '\\filldraw[fill=white, draw=bsaAcc2, line width=.8pt] (' + F(Xn(n.x)) + ',' + F(Yn(n.y)) + ') circle (0.09);\n';
  });
  _nd.forEach(n=>{
    const x = Xn(n.x), y = Yn(n.y);
    out += '\\filldraw[color=bsaAcc2] (' + F(x) + ',' + F(y) + ') circle (0.045);\n';
    tzOcupar(x-0.10, y-0.10, x+0.10, y+0.10);      // el punto y, si la hay, la rótula
    // El nombre busca la primera esquina libre, empezando arriba a la derecha
    // (donde iba siempre). Las esquinas se separan lo justo para que la caja
    // del rótulo no toque el punto del nudo ni la banda de un tramo recto. Si
    // un par en el nudo las tapa todas, se prueban las mismas esquinas por
    // fuera de su arco (`ey2`) y, por último, apartadas en horizontal más allá
    // del rayado de un muro (`ex2`: el voladizo con repartida y momento de
    // empotramiento), antes de escapar hacia arriba, que con una repartida a
    // cada lado subía el nombre por encima del bloque. `ex3` queda más allá
    // del medio ancho de un apoyo simple o móvil (0.42): un apoyo intermedio
    // con repartida a los dos lados tapaba las otras doce esquinas y su nombre
    // subía por encima de las cargas con una guía que cruzaba el bloque.
    const txt = escLatex(n.nombre), op = 'font=\\scriptsize\\bfseries, color=bsaAcc2';
    const wN = tzAncho(txt, op), hN = tzAlto(txt, op);
    const ex = wN/2 + 0.08, ey = hN/2 + 0.11, ey2 = hN/2 + 0.42, ex2 = wN/2 + 0.26, ex3 = wN/2 + 0.48;
    pendNudos.push({x, y, txt, opts:op, dir:[0, 1],
      candidatos:[{x:x+ex,  y:y+ey},  {x:x-ex,  y:y+ey},  {x:x+ex,  y:y-ey},  {x:x-ex,  y:y-ey},
                  {x:x+ex,  y:y+ey2}, {x:x-ex,  y:y+ey2}, {x:x+ex,  y:y-ey2}, {x:x-ex,  y:y-ey2},
                  {x:x+ex2, y:y+ey},  {x:x-ex2, y:y+ey},  {x:x+ex2, y:y-ey},  {x:x-ex2, y:y-ey},
                  {x:x+ex3, y:y-ey},  {x:x-ex3, y:y-ey}]});
  });
  // Primero las repartidas y después el resto: el bloque relleno tapaba las
  // flechas y los momentos que caían en su mismo tramo.
  // En el DCL, la resultante W de cada repartida se reserva aquí y su valor
  // pasa a la fase B con los demás rótulos: colocado después, junto a su
  // flecha, ya no encontraba sitio y se iba lejos con una guía.
  if(conReacciones && R && !R.error){
    cargasConPeso().filter(c=>(c.tipo==='U'||c.tipo==='T') && _cgVis(c)).forEach(c=>{
      const a = accionesDeCarga(c)[0]; if(!a) return;
      const Fm = Math.hypot(a.fx, a.fy); if(Fm < 1e-9) return;
      const x = Xn(a.x), y = Yn(a.y), ex = a.fx/Fm, ey = a.fy/Fm;
      tzOcuparTrazo(x-ex*1.35, y-ey*1.35, x-ex*0.08, y-ey*0.08, 0.10);
      const labW = '$W=' + dec(Fm,'f') + '$\\,' + escLatex(unitFor), opW = 'font=\\tiny, color=bsaDist!60!black';
      const sW = 1.35 + sepCola(labW, opW, ex, ey, 0.10);
      pendW.push({x:x-ex*sW, y:y-ey*sW, txt:labW, opts:opW, dir:[-ex, -ey]});
    });
  }
  const _cgs = cargas.filter(_cgVis);
  const _ordenadas = _cgs.filter(c=>c.tipo==='U'||c.tipo==='T')
    .concat(_cgs.filter(c=>!(c.tipo==='U'||c.tipo==='T')));
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
        const lab = dec(Math.abs(c.mag),'f')+'\\,'+escLatex(unitFor);
        const opP = 'font=\\tiny, color=bsaCarga';
        if(paralela){
          const n2x = -_g2.uy, n2y = _g2.ux;
          const s2 = (n2y < 0) ? -1 : 1;
          pendPuntuales.push({x:(x1+x2)/2 + n2x*s2*0.24, y:(y1+y2)/2 + n2y*s2*0.24,
                              txt:lab, opts:opP, dir:[n2x*s2, n2y*s2]});
        } else if(vy > 0.5){
          // apunta hacia arriba: su cola queda bajo la viga, en la zona de
          // las cotas, así que el valor se pone al costado de la flecha.
          // Sitios, primero hacia fuera de la viga y luego del otro lado: a media
          // flecha (el de siempre), junto a la cola y media caja más allá de
          // ella. Con una repartida también hacia arriba su bloque cuelga bajo la
          // viga y tapa la media flecha; con un solo sitio el rótulo caía a
          // tzTexto, y su guía nacía en ese punto, vacío y dentro del bloque, a
          // 0.62 de la flecha. Si ninguno cabe, tzTexto arranca en la propia
          // flecha (`origen`), para que la guía salga de ella.
          const s = (x <= (Xn(minx)+Xn(maxx))/2) ? -1 : 1;
          const dxP = tzAncho(lab, 'font=\\tiny')/2 + 0.14, hP = tzAlto(lab, opP);
          const fMas = -(hP/2)/0.75;                 // la flecha mide 0.75
          const cand = [];
          [s, -s].forEach(sd=>[0.5, 0, fMas].forEach(f=>cand.push(
            {x:x1 + (x2-x1)*f + sd*dxP, y:y1 + (y2-y1)*f})));
          pendPuntuales.push({x:cand[0].x, y:cand[0].y, txt:lab, opts:opP, dir:[s, 0],
                              candidatos:cand, origen:{x:(x1+x2)/2, y:(y1+y2)/2}});
        } else {
          // En la cola de la flecha; si está ocupada, un escalón más allá (el
          // primer sitio que ya probaba tzTexto, sin guía). Si tampoco cabe, AL
          // COSTADO de la flecha, junto a su cola (y media caja hacia la punta o
          // más allá de la cola), primero del lado de fuera de la estructura. En
          // el DCL la flecha discontinua de la resultante W de una repartida en
          // la misma vertical tapa la cola y el escalón, y tzTexto se llevaba el
          // valor de lado, con una guía, hasta encima del nudo vecino (o del
          // tramo de al lado, si el suyo era corto).
          const sP = sepCola(lab, opP, vx, vy, 0.07);
          const wP = tzAncho(lab, opP), hP = tzAlto(lab, opP);
          const nx = -vy, ny = vx;                  // normal a la flecha
          const semiN = Math.abs(nx)*wP/2 + Math.abs(ny)*hP/2;
          const semiV = Math.abs(vx)*wP/2 + Math.abs(vy)*hP/2;
          const sF = (nx*(x1-cxFig) + ny*(y1-cyFig) < 0) ? -1 : 1;
          const s2 = sP + hP + 0.08;
          const cand = [{x:x1 - vx*sP, y:y1 - vy*sP}, {x:x1 - vx*s2, y:y1 - vy*s2}];
          [sF, -sF].forEach(sd=>[0, semiV, -semiV].forEach(tv=>cand.push(
            {x:x1 + nx*sd*(semiN + 0.14) + vx*tv, y:y1 + ny*sd*(semiN + 0.14) + vy*tv})));
          pendPuntuales.push({x:cand[0].x, y:cand[0].y, txt:lab, opts:opP, dir:[-vx, -vy], candidatos:cand});
        }
      } else {
        out += '\\draw[-{Latex[length=2mm]}, color=bsaMomento, line width=1.1pt] (' + F(x+0.3) + ',' + F(y) + ') arc (0:300:0.3);\n';
        tzOcuparArco(x, y, 0.30, 0.06);
        // El valor va en la primera diagonal libre, con la esquina más cercana
        // de su caja a unos 0.55 del nudo: fuera del arco y sin pisar el nombre.
        const lab = dec(Math.abs(c.mag),'mom')+'\\,'+escLatex(unidadMomento());
        const opM = 'font=\\tiny, color=bsaMomento';
        const ex = tzAncho(lab, opM)/2 + 0.38, ey = tzAlto(lab, opM)/2 + 0.38;
        pendPares.push({x, y, txt:lab, opts:opM, dir:[1, 1],
          candidatos:[{x:x+ex, y:y+ey}, {x:x-ex, y:y+ey}, {x:x+ex, y:y-ey}, {x:x-ex, y:y-ey}]});
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
      // Separación del valor sobre el borde del bloque: media caja del rótulo
      // medida en la dirección en que se levanta, más 0.07. Sobre una viga es
      // el 0.20 de siempre; sobre una columna, con la carga horizontal, cuenta
      // el ancho del texto y el rótulo ya no arranca dentro del bloque.
      const opD = 'font=\\tiny, color=bsaDist';
      const sep = t => Math.abs(ex)*tzAncho(t, opD)/2 + Math.abs(ey)*tzAlto(t, opD)/2 + 0.07;
      // ── Sitios para un valor de la repartida (2026-09-14) ──
      // Antes solo se probaban el centro y los cuartos, y en un tramo corto con
      // una puntual en medio los tres chocaban con su flecha (media caja del
      // rótulo, 0.62, frente a medio cuarto de un bloque de 2 cm, 0.50). El
      // rótulo caía entonces a tzTexto, subía justo encima de la cola de la
      // flecha, le quitaba el sitio a «8.00 kN» y la guía de este lo cruzaba.
      // Ahora, en orden: (1) el sitio preferido `f0` (centro o extremo); (2) a lo
      // largo del bloque, sobre su borde, hasta los cuartos o hasta donde el
      // rótulo aún cabe entero sobre el bloque (`haciaDentro`: el valor de un
      // extremo de una trapecial solo se corre hacia dentro y como mucho media
      // caja, para que siga tocando la vertical de su extremo: más adentro se
      // leería como la intensidad en otro punto); (3) en la normal del
      // sitio preferido, subiendo de 0.06 en 0.06, que lo apila por encima de
      // lo que ocupe esa vertical (la flecha de la puntual y su valor) sin guía,
      // porque sigue sobre su propio bloque. El valor de un extremo sube como
      // mucho 0.60: por encima quedaba junto al nombre y al par del nudo, lejos
      // de su carga, y es mejor la búsqueda de tzTexto con su guía. El de una
      // uniforme puede subir más, porque sigue en el eje del bloque, donde en
      // el DCL está también su resultante W. El borde se toma del lado hacia el
      // que se levanta el bloque: con una intensidad negativa, el opuesto.
      const Lb = Math.hypot(bx-ax, by-ay);
      const hEn = f => h1 + (h2-h1)*Math.max(0, Math.min(1, f));
      const sitios = (t, f0, haciaDentro) => {
        const semi = (Lb > 1e-9) ? (Math.abs(bx-ax)*tzAncho(t, opD)/2 + Math.abs(by-ay)*tzAlto(t, opD)/2)/Lb : 0;
        const fr = (Lb > 1e-9) ? semi/Lb : 0;          // media caja, en fracción del bloque
        const pto = (f, sube) => {
          const ha = hEn(f - fr), hb = hEn(f + fr);
          const hv = (Math.abs(ha) >= Math.abs(hb)) ? ha : hb;
          const d = hv + ((hv < 0) ? -1 : 1)*(sep(t) + sube);
          return {x:ax+(bx-ax)*f + ex*d, y:ay+(by-ay)*f + ey*d};
        };
        const lista = [pto(f0, 0)];
        const dmax = haciaDentro ? Math.min(0.25, fr) : Math.max(0.25, 0.5 - fr);
        for(let j=1;j<=4;j++){
          const df = dmax*j/4;
          if(haciaDentro) lista.push(pto(f0 + haciaDentro*df, 0));
          else lista.push(pto(f0 - df, 0), pto(f0 + df, 0));
        }
        for(let j=1, nSub = haciaDentro ? 10 : 40; j<=nSub; j++) lista.push(pto(f0, 0.06*j));
        const sg = (hEn(f0) < 0) ? -1 : 1;
        return {x:lista[0].x, y:lista[0].y, txt:t, opts:opD, dir:[ex*sg, ey*sg], candidatos:lista};
      };
      // Trapecial: los dos extremos llevan valor distinto y hay que verlos.
      if(Math.abs(w1-w2) > 1e-9){
        const t1 = dec(Math.abs(w1),'f'), t2 = dec(Math.abs(w2),'f')+'\\,'+escLatex(uDist());
        pendRepartidas.push(sitios(t1, 0, 1));
        pendRepartidas.push(sitios(t2, 1, -1));
      } else {
        const t1 = dec(Math.abs(w1),'f')+'\\,'+escLatex(uDist());
        pendRepartidas.push(sitios(t1, 0.5, 0));
      }
    }
  });
  // Reacciones incógnita, dibujadas en su sentido positivo supuesto.
  if(conReacciones && R && !R.error){
    R.inc.filter(u=>_incVis(u)).forEach(u=>{
      const x = Xn(u.n.x), y = Yn(u.n.y);
      const d = (u.ang !== undefined) ? {x:Math.cos(u.ang), y:Math.sin(u.ang)}
              : (u.tipo==='Rx' ? {x:1,y:0} : (u.tipo==='Ry' ? {x:0,y:1} : null));
      const nom = simbReaccion(u);
      const opR = 'font=\\tiny, color=bsaReac';
      if(!d){
        out += '\\draw[-{Latex[length=1.8mm]}, color=bsaReac, line width=1pt] ('
             + F(x+0.34) + ',' + F(y-0.34) + ') arc (0:280:0.34);\n';
        // `arc` arranca en (x+0.34, y-0.34): su centro queda en (x, y-0.34)
        tzOcuparArco(x, y-0.34, 0.34, 0.06);
        pendReac.push({x:x+0.55, y:y-0.55, txt:'$'+nom+'$', opts:opR, dir:[1, -1]});
        return;
      }
      // El rodillo inclinado (2026-09-14, criterio de armaduras): la flecha nace
      // más allá del símbolo del apoyo, que llega a 0.58, porque en su cola se
      // acota el ángulo agudo con el eje más cercano, con su letra. Cualquier
      // flecha que venga por el eje del símbolo (a menos de 35° de hacia donde
      // cuelga) nace también más allá de él, en vez de cruzarlo.
      const inclinada = (u.ang !== undefined) && bsaAnguloAgudoEje(d.x, d.y).grados >= 4;
      let porElApoyo = false;
      if(u.n.apoyo === 'movil' || u.n.apoyo === 'simple'){
        const hd = (anguloApoyo(u.n) - 180)*Math.PI/180;
        porElApoyo = (-d.x*Math.cos(hd) - d.y*Math.sin(hd)) > Math.cos(35*Math.PI/180);
      }
      const bajoApoyo = porElApoyo || (u.n.apoyo && u.n.apoyo !== 'libre' && d.y > 0.5);
      const L1 = inclinada ? 1.55 : (bajoApoyo ? 1.30 : 0.85);
      const L0 = inclinada ? 0.70 : (porElApoyo ? 0.70 : (bajoApoyo ? 0.62 : 0.10));
      out += '\\draw[-{Latex[length=2mm]}, color=bsaReac, line width=1.1pt] ('
           + F(x-d.x*L1) + ',' + F(y-d.y*L1) + ') -- (' + F(x-d.x*L0) + ',' + F(y-d.y*L0) + ');\n';
      tzOcuparTrazo(x-d.x*L1, y-d.y*L1, x-d.x*L0, y-d.y*L0, 0.07);
      if(inclinada) out += tikzArcoReaccionFI(x-d.x*L1, y-d.y*L1, d.x, d.y, genAng, pendReac);
      if(!inclinada && Math.abs(d.y) > 0.5){
        // vertical: el rótulo va al costado de la flecha, hacia afuera de la
        // viga, y no debajo de su cola, donde se metía entre las cotas.
        const s = (x <= (Xn(minx)+Xn(maxx))/2) ? -1 : 1;
        const wl = tzAncho('$'+nom+'$', 'font=\\tiny');
        pendReac.push({x:x + s*(wl/2 + 0.14), y:y - d.y*(L1+L0)/2, txt:'$'+nom+'$', opts:opR, dir:[s, 0]});
      } else {
        pendReac.push({x:x-d.x*(L1+0.18), y:y-d.y*(L1+0.18), txt:'$'+nom+'$', opts:opR, dir:[-d.x, -d.y]});
      }
    });
  }

  // ── Fase B: rótulos, con toda la geometría ya reservada ──
  // Primero los nombres de nudo, después los valores de las cargas y por
  // último los nombres de las reacciones. Entre las cargas, de menos sitios a
  // más: los pares (cuatro diagonales), las puntuales (la cola de su flecha),
  // las resultantes W del DCL (la cola de la suya) y al final las repartidas,
  // que pueden correrse a lo largo de su bloque o apilarse encima. Con las
  // repartidas antes, su valor ocupaba la cola de la puntual. Se colocan AQUÍ,
  // antes de las cotas, porque las cotas arrancan más allá de todo lo reservado.
  let rotulos = '';
  pendNudos.concat(pendPares, pendPuntuales, pendW, pendRepartidas, pendReac).forEach(r=>{
    rotulos += r.candidatos
      ? tzTextoEn(r.candidatos, r.txt, r.opts, r.dir[0], r.dir[1], r.origen)
      : tzTexto(r.x, r.y, r.txt, r.opts, r.dir[0], r.dir[1]);
  });

  // ── Cotas ──
  let minY = Infinity;
  _nd.forEach(n=>{ minY = Math.min(minY, Yn(n.y)); });

  if(conReacciones && R && !R.error){
    // ── DCL para las reacciones: resultantes de las repartidas y brazos
    //    desde O, el punto respecto al que se toman los momentos ──
    // Cada carga repartida se sustituye por su resultante (trazo discontinuo
    // en el centroide) y todas las fuerzas se acotan desde O con cotas
    // corridas, una por nivel: son exactamente los brazos que aparecen en
    // la ecuación de momentos.
    const brazosX = [], brazosY = [];
    // El brazo se mide desde OR (el punto respecto al que se toman momentos),
    // no desde el origen del plano: en el DCL de una rótula, desde la rótula.
    const anota = (ax, ay, fx, fy) => {
      if(Math.abs(fy) > 1e-9 && Math.abs(ax - OR.x) > 1e-6) brazosX.push(ax);
      if(Math.abs(fx) > 1e-9 && Math.abs(ay - OR.y) > 1e-6) brazosY.push(ay);
    };
    cargasConPeso().filter(_cgVis).forEach(c=>{
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
        // su valor ya se colocó en la fase B (pendW)
      }
      anota(a.x, a.y, a.fx, a.fy);
    });
    R.inc.filter(u=>!_idsVis || _ndIds.has(u.n.id)).forEach(u=>{
      if(u.tipo === 'M' && u.ang === undefined) return;
      const d = (u.ang !== undefined) ? {x:Math.cos(u.ang), y:Math.sin(u.ang)}
              : (u.tipo==='Rx' ? {x:1,y:0} : {x:0,y:1});
      anota(u.n.x, u.n.y, d.x, d.y);
    });
    // ── En el DCL de una rótula, las fuerzas que transmite la otra mitad ──
    // Se dibujan porque existen; no aparecen en la ecuación porque los
    // momentos se toman justo ahí y su brazo es nulo. Verlo es la mitad de
    // entender por qué la rótula da una ecuación extra.
    if(sel && sel.rotula){
      const xr = Xn(sel.rotula.x), yr = Yn(sel.rotula.y), nr = escLatex(sel.rotula.nombre);
      out += '\\draw[-{Latex[length=1.8mm]}, color=bsaMuted, dashed, line width=.9pt] ('
           + F(xr-0.95) + ',' + F(yr) + ') -- (' + F(xr-0.12) + ',' + F(yr) + ');\n';
      out += '\\draw[-{Latex[length=1.8mm]}, color=bsaMuted, dashed, line width=.9pt] ('
           + F(xr) + ',' + F(yr-0.95) + ') -- (' + F(xr) + ',' + F(yr-0.12) + ');\n';
      out += tzTexto(xr-1.18, yr+0.16, '$' + nr + '_x$', 'font=\\tiny, color=bsaMuted', -1, 1);
      out += tzTexto(xr+0.20, yr-1.10, '$' + nr + '_y$', 'font=\\tiny, color=bsaMuted', 1, -1);
    }
    // Punto respecto al que se toman momentos, si no cae sobre un nudo dibujado
    if(!_nd.some(n=>Math.abs(n.x - OR.x) < 1e-6 && Math.abs(n.y - OR.y) < 1e-6)){
      out += '\\filldraw[black] (' + F(Xn(OR.x)) + ',' + F(Yn(OR.y)) + ') circle (0.05);\n';
      out += tzTexto(Xn(OR.x)-0.2, Yn(OR.y)-0.2, '$' + escLatex(OR.nombre) + '$',
                     'font=\\scriptsize\\bfseries', -1, -1);
    }
    // Cotas corridas horizontales desde O, ordenadas de menor a mayor: cada
    // una en su nivel, con la etiqueta sobre su propia línea.
    // Mismo criterio en los dos ejes: la banda de cotas empieza por debajo
    // (o a la derecha) de TODO lo ya dibujado, no a una distancia fija del
    // último nudo. Antes las cotas verticales cruzaban los valores de las
    // fuerzas horizontales que sobresalen de la columna.
    const ext = tzExtension();
    const xsB = [...new Set(brazosX.map(v=>+v.toFixed(4)))]
      .sort((a,b)=>Math.abs(a-OR.x)-Math.abs(b-OR.x));
    let base = Math.min(minY - 1.60, ext.y0 - 0.45);
    const x0 = Xn(OR.x);
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
      out += tzTextoFijo((x0+x1)/2, yy, dec(Math.abs(xv-OR.x),'len') + (i === xsB.length-1 ? '\\,' + escLatex(unitLen) : ''),
                         'font=\\scriptsize, color=black!75');
    });
    // Cotas corridas verticales desde OR (brazos de las fuerzas horizontales)
    const ysB = [...new Set(brazosY.map(v=>+v.toFixed(4)))]
      .sort((a,b)=>Math.abs(a-OR.y)-Math.abs(b-OR.y));
    let baseX = Math.max(Math.max(..._nd.map(n=>Xn(n.x))) + 0.75, ext.x1 + 0.45);
    const y0 = Yn(OR.y);
    ysB.forEach((yv, i)=>{
      const xx = baseX + i*0.42, y1 = Yn(yv);
      out += '\\draw[black!45, line width=.35pt, dashed] (' + F(Xn(OR.x)) + ',' + F(y0) + ') -- (' + F(xx+0.12) + ',' + F(y0) + ');\n';
      out += '\\draw[black!70, line width=.5pt, {Latex[length=1.3mm]}-{Latex[length=1.3mm]}] ('
           + F(xx) + ',' + F(y0) + ') -- (' + F(xx) + ',' + F(y1) + ');\n';
      const w2 = tzAncho(dec(Math.abs(yv-OR.y),'len'), 'font=\\scriptsize');
      tzOcupar(xx-0.16, (y0+y1)/2 - w2/2, xx+0.16, (y0+y1)/2 + w2/2);
      out += '\\node[rotate=90, font=\\scriptsize, color=black!75, fill=white, inner sep=1pt] at ('
           + F(xx) + ',' + F((y0+y1)/2) + ') {' + dec(Math.abs(yv-OR.y),'len') + '\\,' + escLatex(unitLen) + '};\n';
    });
    return out + rotulos;
  }

  // ── Figura del modelo: primero las posiciones de las cargas (niveles
  //    interiores), después la cadena de nudos, y por último la luz total.
  //    Mismo orden que en el panel, para que el alumno lea igual las dos.
  const ext = tzExtension();
  let base = Math.min(minY - 0.75, ext.y0 - 0.40);

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
    let baseX = Math.max(Math.max(...nodos.map(n=>Xn(n.x))) + 0.55, ext.x1 + 0.45);
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
  return out + rotulos;
}

// ═══════════════════════════════════════════════════════════
//  INFORME: estructura del documento
//  Sigue el orden en que se enseña el tema: planteamiento y convenio de
//  signos → reacciones → funciones por tramos (con DCL y ecuaciones) →
//  diagramas → comprobaciones. Cada paso lleva su «¿Por qué?».
// ═══════════════════════════════════════════════════════════
// Resultante y centroide de cada carga repartida, tal como se usan para las
// reacciones (la viga completa admite la sustitución; un trozo cortado, no).
// Se redujo a lo que entra en la ecuación de momentos: cuánto vale W y dónde
// actúa. La columna con la fórmula desarrollada y la de coordenadas globales
// saturaban la tabla sin añadir nada que no estuviera ya en la figura.
// La posición se da SIEMPRE respecto del nudo de referencia del pórtico (el
// primero de la cadena): en horizontal, o en vertical si el tramo es vertical.
function tablaCargasEquivalentes(R){
  const lista = cargasConPeso().filter(c=>c.tipo==='U'||c.tipo==='T');
  if(!lista.length) return '';
  const uL = escLatex(unitLen), uF = escLatex(unitFor), uM = escLatex(unidadMomento());
  const O = (R && R.cad && R.cad.length) ? R.cad[0].desde : {x:0, y:0, nombre:'O'};
  const nO = escLatex(O.nombre || 'O');
  let hayPar = false;
  let filas = '';
  lista.forEach(c=>{
    const z = trozoCargado(c); if(!z || z.len <= 1e-12) return;
    const t = tramos.find(q=>q.id === c.tramo);
    const g = t && geoTramo(t);
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const W = (w1+w2)/2*z.len;
    const a = accionesDeCarga(c)[0];
    const nom = (c._peso ? 'Peso propio' : (c.tipo==='U' ? 'Uniforme' : 'Variable'))
              + ' en ' + escLatex(t ? nomTramo(t) : '?');
    // Sin resultante no hay centroide, pero sí un par: es el término que
    // entra de verdad en la ecuación de momentos.
    if(Math.abs(W) < 1e-9){
      hayPar = true;
      filas += nom + ' & sin resultante ($w$ cambia de signo) & par $= '
             + dec(a ? (a.m || 0) : 0, 'momento') + '$ ' + uM + ' \\\\\n';
      return;
    }
    // Vertical → se mide en vertical desde el nivel de O; en los demás casos,
    // en horizontal desde O.
    const vert = g && Math.abs(g.ux) < 1e-9;
    const d = vert ? (a.y - O.y) : (a.x - O.x);
    const pos = 'a ' + dec(Math.abs(d),'len') + ' ' + uL + ' de ' + nO
              + (vert ? (d < 0 ? ' (hacia abajo)' : ' (hacia arriba)') : '');
    filas += nom + ' & $W = ' + dec(Math.abs(W),'fuerza') + '$ ' + uF + ' & ' + pos + ' \\\\\n';
  });
  if(!filas) return '';
  let out = tablaCaption('Cargas equivalentes: cada carga repartida se sustituye, solo para este '
    + 'paso, por su resultante $W$ (área del diagrama de carga) aplicada en el centroide de ese '
    + 'diagrama. La posición se mide desde ' + nO
    + (hayPar ? '. Una carga cuya intensidad cambia de signo puede tener resultante nula y aun así '
      + 'producir un par, que sí entra en $\\sum M$' : '') + '.');
  out += '{\\footnotesize\\begin{center}\\begin{tabular}{lll}\n\\hline\n'
    + 'Carga & Resultante & Actúa \\\\\n\\hline\n' + filas
    + '\\hline\n\\end{tabular}\\end{center}}\n';
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
    + '\\definecolor{bsaVerde}{HTML}{15803D}\n'
    + '\\definecolor{bsaLogoB}{HTML}{CDA953}\n'
    + '\\definecolor{bsaLogoS}{HTML}{8AB4CA}\n'
    + '\\definecolor{bsaLogoA}{HTML}{22584B}\n\n'
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
    + '  \\par\\addvspace{10pt}\\penalty-250\n'
    + '  \\noindent{\\large\\bfseries\\color{bsaAcc}#1}\\par\\nopagebreak\n'
    + '  \\vspace{3pt}\\nopagebreak\\hrule\\nopagebreak\\vspace{7pt}\\nopagebreak}\n'
    + '\\newcommand{\\subpaso}[1]{\\par\\addvspace{6pt}\\noindent{\\bfseries\\color{bsaAcc2}#1}\\par\\nopagebreak\\vspace{3pt}\\nopagebreak}\n'
    + '\\newcommand{\\porque}[1]{\\par\\vspace{3pt}\\noindent\\fcolorbox{bsaAcc!40}{bsaAcc!5}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\footnotesize{\\bfseries\\color{bsaAcc2}¿Por qué?}\\ #1}}\\par\\vspace{4pt}}\n'
    + '\\newcommand{\\resultado}[1]{\\par\\vspace{2pt}\\noindent\\fcolorbox{bsaVerde!50}{bsaVerde!6}{%\n'
    + '  \\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\small #1}}\\par\\vspace{4pt}}\n\n'
    + '\\begin{document}\n\n';

  _yaDicho = {};        // cada informe vuelve a dar sus explicaciones una vez
  _tabN = 0;            // y a numerar sus tablas desde 1
  const porAreas = (typeof metodo7 !== 'undefined' && metodo7 === 'areas');
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
  // Aquí iba una tabla con las coordenadas de cada nudo y otra con cada carga.
  // Las dos repetían, en números, lo que la figura ya dice: se eliminaron.
  const _usados = pesos.filter(p=>tramos.some(t=>t.pesoId === p.id));
  if(_usados.length){
    tex += tablaCaption('Peso propio considerado, en dirección vertical y sobre la '
      + 'longitud real del eje.');
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
    + (porAreas
      ? '\\item \\textbf{Intervalos.} Se marcan los puntos donde cambia algo (una carga puntual, '
        + 'un par, el inicio o el fin de una carga repartida, un apoyo, un quiebre): entre dos de '
        + 'ellos la ley de carga no cambia.\n'
        + '\\item \\textbf{Áreas.} Partiendo de un valor conocido en un extremo, en cada intervalo se '
        + 'suma a $V$ el área de la carga cambiada de signo y a $M$ el área del cortante; los saltos '
        + 'de las fuerzas puntuales y de los pares se suman aparte.\n'
      : '\\item \\textbf{Cortes por tramos.} Se marcan los puntos donde cambia algo (una carga puntual, '
        + 'un par, el inicio o el fin de una carga repartida, un apoyo, un quiebre) y se corta en una sección '
        + 'genérica de cada intervalo, a distancia $x$ del origen del tramo.\n'
        + '\\item \\textbf{Equilibrio del trozo.} Se dibuja el DCL del trozo anterior al corte con $N$, $V$ y '
        + '$M$ en sentido positivo y se plantean $\\sum F_{\\parallel}=0$, $\\sum F_{\\perp}=0$ y $\\sum M_S=0$; '
        + 'de ahí salen $N(x)$, $V(x)$ y $M(x)$.\n')
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
    tex += tablaCargasEquivalentes(R);
    tex += '\\porque{Para el equilibrio de la viga \\emph{completa} una carga repartida puede sustituirse por su '
      + 'resultante, porque las ecuaciones de equilibrio solo dependen de la fuerza total y de su momento. Esa '
      + 'sustitución \\textbf{no} vale al analizar un trozo cortado dentro de la carga: allí actúa solo la parte '
      + 'de carga que queda antes del corte, y su resultante cambia con $x$.}\n';
  }
  tex += 'Se plantean las tres ecuaciones de equilibrio de la viga completa'
    + (R.rotulas.length ? ', más ' + R.rotulas.length
        + ' ecuación(es) de momento nulo por cada rótula interna' : '') + ':\\\\[2pt]\n';
  // Los subíndices nombran el punto real: $\sum M_A = 0$ dice por sí solo
  // respecto a qué se toman los momentos, sin aclaración entre paréntesis.
  tex += '$$\\sum F_x = 0 \\qquad \\sum F_y = 0 \\qquad \\sum M_{' + nombreOrigen() + '} = 0'
    + R.rotulas.map(rt=>'\\qquad \\sum M_{' + escLatex(rt.nombre) + '} = 0').join('') + '$$\n';
  tex += 'con ' + R.inc.length + ' incógnita(s) de reacción y ' + R.diag.eq + ' ecuación(es): la viga es '
    + 'isostática y las reacciones salen de la estática.\\\\[6pt]\n';
  tex += pasoAPasoReacciones(R);
  // Cada reacción con su nombre completo ($R_{yD}$, $R_{xD}$, $R_A$, $M_D$) y
  // el sentido real con un icono, no con una frase: se lee de un vistazo.
  tex += tablaCaption('Reacciones en los apoyos, con su sentido real.');
  tex += '\\resultado{\\centering\\small\n'
    + '\\begin{tabular}{@{}crc@{}}\n\\hline\n'
    + '\\textbf{Reacción} & \\textbf{Valor} & \\textbf{Sentido real} \\\\\n\\hline\n';
  R.inc.forEach((u,j)=>{
    const esMom = (u.tipo === 'M' && u.ang === undefined);
    const v = R.val[j];
    // La dirección del rodillo inclinado, con el mismo ángulo agudo que la figura
    // y el desarrollo (2026-09-14): nunca el de 0 a 360 del modelo.
    let dirR = '';
    if(u.ang !== undefined){
      const agT = bsaAnguloAgudoEje(Math.cos(u.ang), Math.sin(u.ang));
      if(agT.grados >= 4) dirR = ' {\\footnotesize(a ' + dec(agT.grados,'f') + '$^{\\circ}$ de la ' + (agT.desdeV ? 'vertical' : 'horizontal') + ')}';
    }
    tex += '$' + simbReaccion(u) + '$' + dirR + ' & $'
      + dec(v, esMom?'momento':'fuerza') + '$\\,' + escLatex(esMom?unidadMomento():unitFor)
      + ' & ' + iconoReaccion(u, v) + ' \\\\\n';
  });
  tex += '\\hline\n\\end{tabular}}\n';
  tex += '\\noindent{\\footnotesize Un valor negativo significa que la reacción actúa en sentido '
    + 'contrario al supuesto en el DCL; el icono ya muestra el sentido real, y así se dibuja en '
    + 'los DCL de los cortes.}\\\\[4pt]\n';

  // ══ 3. Paso 2: el método elegido ══
  // El PDF sigue el método que el alumno escogió en la columna de control
  // (`metodo7`), igual que la pantalla: si eligió áreas, el informe se
  // construye por áreas y NO repite el desarrollo por ecuaciones.
  if(porAreas){
    tex += '\\seccion{3. Paso 2 --- Diagramas por el método de las áreas}\n';
    tex += '\\noindent Conocidas las reacciones, no hace falta cortar y plantear el equilibrio en '
      + 'cada intervalo: los diagramas se construyen acumulando áreas desde un extremo.\n';
    tex += '\\porque{Las relaciones diferenciales $dV/dx = -w$ y $dM/dx = V$, integradas entre dos '
      + 'secciones, dicen que el \\emph{cambio} de $V$ es el área del diagrama de carga cambiada de '
      + 'signo, y el \\emph{cambio} de $M$ es el área del diagrama de cortante. Se parte de un valor '
      + 'conocido en un extremo y se va sumando área a área. Donde hay una fuerza puntual $V$ salta, '
      + 'y donde hay un par aplicado salta $M$: esos saltos se suman aparte, porque no son áreas.}\n';
    grupos.forEach(gg=>{
      if(gg.idx > 0)
        tex += '\\vspace{8pt}\\noindent{\\color{bsaAcc2}\\rule{\\linewidth}{.8pt}}\\vspace{5pt}\n';
      tex += '\\subpaso{Tramo ' + escLatex(gg.recorrido) + '\\quad '
        + (gg.inclinado ? 'inclinado ' + gg.ang.toFixed(1) + '$^\\circ$' : 'horizontal')
        + '\\quad $L = ' + dec(gg.L,'len') + '$\\,' + uL + '}\n';
      tex += tablaAreasGrupo(R, gg);
      tex += tablaNudosGrupo(R, gg);
      tex += tablaSingulares(R, gg);
    });
  } else {
  tex += '\\seccion{3. Paso 2 --- Funciones $N(x)$, $V(x)$ y $M(x)$ por tramos}\n';
  tex += '\\noindent La abscisa de la sección se mide desde el último punto de quiebre de la viga: se llama '
    + '$x$ en los tramos horizontales y $r$ en los inclinados, donde se mide a lo largo del eje del tramo. '
    + 'Las solicitaciones se refieren siempre a los ejes locales: $N$ según el eje del tramo y $V$ '
    + 'perpendicular a él.\n';
  tex += '\\porque{Las funciones $N$, $V$ y $M$ cambian de expresión cada vez que aparece una nueva acción. '
    + 'Una sola expresión no puede describir ambos lados de esos puntos, así que se corta en cada intervalo '
    + 'por separado. \\textbf{Hay que abrir un intervalo nuevo en:} una fuerza puntual (hace saltar $V$); '
    + 'un par aplicado (hace saltar $M$); el principio y el final de una carga repartida (allí $V$ cambia '
    + 'de ley); un apoyo, porque su reacción es una fuerza puntual; una rótula; y un quiebre del eje, '
    + 'donde cambian los ejes locales a los que se refieren $N$ y $V$. Entre dos de esos puntos no pasa '
    + 'nada nuevo y una sola expresión vale para todo el intervalo.}\n';

  grupos.forEach(gg=>{
    const sb = gg.simbolo;
    if(gg.idx > 0)
      tex += '\\vspace{8pt}\\noindent{\\color{bsaAcc2}\\rule{\\linewidth}{.8pt}}\\vspace{5pt}\n';
    tex += '\\subpaso{Tramo ' + escLatex(gg.recorrido) + '\\quad '
      + (gg.inclinado ? 'inclinado ' + gg.ang.toFixed(1) + '$^\\circ$' : 'horizontal')
      + '\\quad $L = ' + dec(gg.L,'len') + '$\\,' + uL
      + '\\quad abscisa $' + sb + '$ desde ' + escLatex(gg.desde.nombre) + '}\n';
    tex += fraseCortesGrupo(R, gg);
    gg.tramos.forEach(seg=>{
      seg.subs.forEach(sub=>{
        tex += desarrolloCorte(R, grupos, gg, seg, sub, figCaption);
        tex += '\\vspace{3pt}\\noindent{\\color{bsaMuted}\\rule{0.35\\linewidth}{.3pt}}\\\\[3pt]\n';
      });
    });
    tex += tablaNudosGrupo(R, gg);
    tex += tablaSingulares(R, gg);
  });
  }

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
  // Aquí iba, por tramo, una tabla con la forma que debe tener cada diagrama
  // (constante, lineal, parábola). El propio diagrama ya la muestra.
  grupos.forEach(gg=>{
    tex += '\\begin{center}\\begin{tikzpicture}\n' + tikzDiagramasGrupo(R, gg)
         + '\\end{tikzpicture}\\end{center}\n';
    tex += figCaption('Tramo ' + escLatex(gg.recorrido) + (gg.inclinado ? ' (desarrollado sobre su eje)' : '')
      + ': esquema y diagramas ' + (gg.tramos.some(t2=>t2.subs.some(su=>su.cN.some(v=>Math.abs(v)>5e-9))) ? 'DFN, ' : '') + 'DFC y DMF.');
  });

  // ══ 5. Paso 4: comprobaciones ══
  tex += '\\seccion{5. Paso 4 --- Comprobaciones}\n';
  tex += '\\porque{Un diagrama que no cierra delata un error de signo o de brazo. Las comprobaciones más útiles '
    + 'son las condiciones de borde: en un extremo libre o tras el último apoyo ya no queda viga, luego '
    + '$V$ y $M$ deben anularse; un apoyo articulado o una rótula no transmiten momento.}\n';
  tex += '\\subpaso{Condiciones de borde}\n';
  tex += comprobacionesFinales(R, grupos);
  // El informe sigue SOLO el método elegido en la columna de control (R13):
  // con «ecuaciones» no aparece el método de las áreas, ni siquiera como
  // comprobación; con «áreas» no aparecen los cortes. Antes el método de las
  // áreas se añadía aquí como comprobación cuando no era el elegido.

  tex += '\\subpaso{Resumen de valores extremos}\n';
  tex += tablaCaption('Valores extremos de $N$, $V$ y $M$ en cada tramo.');
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

  tex += bsaReferenciasLatex({extra:['Rodr\\\'iguez, H.~J. (s.f.). \\emph{Fuerzas internas} (cap.~8). '
    + 'Secci\\\'on de Ingenier\\\'ia Mec\\\'anica, Pontificia Universidad Cat\\\'olica del Per\\\'u.']});

  // ── Colofón (R20): el mismo bloque en los cinco temas, desde core/comun.js ──
  tex += colofonLatexBSA();

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
