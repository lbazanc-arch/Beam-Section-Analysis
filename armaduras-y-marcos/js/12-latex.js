// ═══════════════════════════════════════════════════════════
//  LATEX
// ═══════════════════════════════════════════════════════════
// Traductor independiente del HTML: parte de los mismos datos que ya
// alimentan resultsPanel (nodos, barras, resultado), no del HTML ya armado.
// Genera un .tex compatible con pdflatex "de fabrica" (sin fontspec ni
// fuentes externas) para que compile igual en cualquier servicio de
// compilacion, sin depender de que motor tenga instalado.
function escLatex(s){
  return String(s).replace(/([%&_#{}$])/g, '\\$1');
}
function tikzColorFuerza(v){
  return esCero(v) ? 'black!45' : (v >= 0 ? 'bsaAcc2' : 'bsaRoj');
}

// ── Apoyo formal (pasador / rodillo), estilo libro de texto ──
// Triángulo con base y sombreado rayado bajo tierra; el rodillo añade dos
// círculos entre el triángulo y la tierra para indicar que puede rodar.
function tikzApoyo(tipo, px, py){
  const w = 0.34, h = 0.52;
  let s = '';
  s += '\\draw[bsaAcc, line width=0.9pt, fill=white] (' + px + ',' + py + ') -- '
     + '++(-' + w + ',-' + h + ') -- ++(' + (2*w) + ',0) -- cycle;\n';
  let baseY = (parseFloat(py) - h).toFixed(3);
  if(tipo === 'movil'){
    const cy2 = (parseFloat(baseY) - 0.10).toFixed(3);
    s += '\\draw[bsaAcc, line width=0.7pt, fill=white] (' + (parseFloat(px)-w*0.55).toFixed(3) + ',' + cy2 + ') circle (0.10);\n';
    s += '\\draw[bsaAcc, line width=0.7pt, fill=white] (' + (parseFloat(px)+w*0.55).toFixed(3) + ',' + cy2 + ') circle (0.10);\n';
    baseY = (parseFloat(cy2) - 0.10).toFixed(3);
  }
  s += '\\draw[bsaAcc, line width=0.8pt] (' + (parseFloat(px)-w-0.06).toFixed(3) + ',' + baseY + ') -- '
     + '(' + (parseFloat(px)+w+0.06).toFixed(3) + ',' + baseY + ');\n';
  // rayado de tierra (hatching)
  const n = 5;
  for(let i=0;i<=n;i++){
    const hx = (parseFloat(px) - w - 0.06 + i*(2*w+0.12)/n).toFixed(3);
    s += '\\draw[bsaAcc, line width=0.5pt] (' + hx + ',' + baseY + ') -- ++(-0.10,-0.11);\n';
  }
  return s;
}

// ── Cotas (cadena de dimensiones) bajo la armadura ──
// Acota cada tramo horizontal entre coordenadas x consecutivas y, si la
// armadura tiene altura, una cota vertical total a la izquierda.
function tikzCotas(tx, ty, minX, maxX, minY, maxY, esc, nodosSubconjunto){
  const nodosParaCotas = nodosSubconjunto || nodos;
  let s = '';
  const xsReales = [...new Set(nodosParaCotas.map(n=>Math.round(n.x*1000)/1000))].sort((a,b)=>a-b);
  const yDim = -0.85;
  const yTop = parseFloat(ty(minY));
  xsReales.forEach(x=>{
    s += '\\draw[black!55, line width=0.35pt] (' + tx(x) + ',' + yTop.toFixed(3) + ') -- (' + tx(x) + ',' + (yDim-0.12).toFixed(3) + ');\n';
  });
  for(let i=0;i<xsReales.length-1;i++){
    const x1 = tx(xsReales[i]), x2 = tx(xsReales[i+1]);
    const dist = xsReales[i+1]-xsReales[i];
    if(dist < 1e-6) continue;
    s += '\\draw[black!55, line width=0.4pt, <->, >=stealth] (' + x1 + ',' + yDim + ') -- (' + x2 + ',' + yDim + ');\n';
    const xm = ((parseFloat(x1)+parseFloat(x2))/2).toFixed(3);
    s += '\\node[font=\\tiny, fill=white, inner sep=1pt] at (' + xm + ',' + yDim + ') {' + dec(dist,'len') + '\\,' + unitLen + '};\n';
  }
  if(maxY - minY > 1e-6){
    const xDimV = -0.85;
    const y1 = ty(minY), y2 = ty(maxY);
    s += '\\draw[black!55, line width=0.35pt] (' + tx(minX) + ',' + y1 + ') -- (' + (xDimV-0.12).toFixed(3) + ',' + y1 + ');\n';
    s += '\\draw[black!55, line width=0.35pt] (' + tx(minX) + ',' + y2 + ') -- (' + (xDimV-0.12).toFixed(3) + ',' + y2 + ');\n';
    s += '\\draw[black!55, line width=0.4pt, <->, >=stealth] (' + xDimV + ',' + y1 + ') -- (' + xDimV + ',' + y2 + ');\n';
    const ym = ((parseFloat(y1)+parseFloat(y2))/2).toFixed(3);
    s += '\\node[font=\\tiny, fill=white, inner sep=1pt, rotate=90] at (' + xDimV + ',' + ym + ') {' + dec(maxY-minY,'len') + '\\,' + unitLen + '};\n';
  }
  return s;
}

// De qué lado se dibuja una fuerza aplicada en un nudo para que no se pise con
// una barra. Por defecto LLEGA al nudo (cola en -û). Si a menos de 12° de ese
// lado hay una barra, SALE del nudo (cola en el nudo, punta hacia +û), que es
// como se dibuja la carga sobre un cordón que tiene un montante encima. Si los
// dos lados están ocupados, llega igual pero apartada lateralmente hacia el
// lado con más hueco. Devuelve {sentido: +1 llega | -1 sale, ox, oy}.
function ladoCarga(n, ux, uy, lateral){
  const sep = (p, q) => Math.abs(((p - q) % 360 + 540) % 360 - 180);
  const dirs = barras.filter(b=>b.a===n.id||b.b===n.id).map(b=>{
    const o = nodos.find(z=>z.id===(b.a===n.id?b.b:b.a));
    return Math.atan2(o.y-n.y, o.x-n.x)*180/Math.PI;
  });
  const libre = ang => !dirs.some(d => sep(d, ang) < 12);
  const aCola = Math.atan2(-uy,-ux)*180/Math.PI, aPunta = Math.atan2(uy,ux)*180/Math.PI;
  if(libre(aCola)) return {sentido:+1, ox:0, oy:0};
  if(libre(aPunta)) return {sentido:-1, ox:0, oy:0};
  const hueco = ang => dirs.length ? Math.min(...dirs.map(d => sep(d, ang))) : 180;
  const s = hueco(aCola - 90) >= hueco(aCola + 90) ? 1 : -1;   // (-uy, ux) está a aCola - 90
  const d = lateral || 0.35;
  return {sentido:+1, ox: s*(-uy)*d, oy: s*ux*d};
}

// ── Flecha de carga refinada (estilo libro, no exagerada) ──
// `ang` (opcional): {gen, coloc, angulos} para acotar el ángulo de una carga
// inclinada, igual que se hace con las barras.
function tikzFlechaCarga(n, tx, ty, factor, longBase, ang){
  factor = factor || 1;
  const fx = n.fx*factor, fy = n.fy*factor;
  if(esCero(fx) && esCero(fy)) return '';
  const mag = Math.hypot(fx, fy);
  const ux = fx/mag, uy = fy/mag;
  const px = parseFloat(tx(n.x)), py = parseFloat(ty(n.y));
  const L = longBase || 1.05;
  // Llega al nudo, o sale de él si por el lado de la cola hay una barra; el
  // rótulo va en el extremo lejano de la flecha, nunca junto al vástago, donde
  // se montaba sobre las diagonales.
  const lado = ladoCarga(n, ux, uy, 0.30), k = lado.sentido;
  const fx0 = px - k*ux*L + lado.ox, fy0 = py - k*uy*L + lado.oy;      // extremo lejano
  const nx0 = px + lado.ox, ny0 = py + lado.oy;                          // extremo en el nudo
  const [x1, y1, x2, y2] = k > 0 ? [fx0, fy0, nx0, ny0] : [nx0, ny0, fx0, fy0];
  let s = '\\draw[->, >=stealth, line width=0.85pt, bsaAcc] (' + x1.toFixed(3) + ',' + y1.toFixed(3) + ') -- (' + x2.toFixed(3) + ',' + y2.toFixed(3) + ');\n';
  const lx = (fx0 - k*ux*0.32).toFixed(3), ly = (fy0 - k*uy*0.32).toFixed(3);
  s += '\\node[font=\\scriptsize, color=bsaAcc, inner sep=1pt] at (' + lx + ',' + ly + ') {' + dec(mag,'f') + '\\,' + unitFor + '};\n';
  // Una carga con componentes en x e y no se puede descomponer sin su ángulo, y
  // era lo único del dibujo que no se veía. Se acota como el de las barras:
  // agudo, desde el eje más cercano, en el arranque del vástago.
  if(ang && ang.gen){
    const arco = arcoAngulo(-k*ux, -k*uy, 'bsaAcc', ang.gen, 0.45, nx0, ny0, ang.coloc);
    if(arco.tikz){ s += arco.tikz; if(ang.angulos) ang.angulos.push({letra:arco.letra, valor:arco.valor}); }
  }
  return s;
}

// ── DCL individual de un nudo (esquemático, sin escala geométrica) ──
// Ancla del texto de una etiqueta según su dirección: la aparta de la línea
// en vez de dejarla centrada encima (era la causa de los solapes).
// Generador de letras griegas para etiquetar ángulos en un mismo diagrama:
// cada llamada a .siguiente() da la próxima (θ, α, β, γ...); se reinicia
// con letrasGriegas() para cada DCL nuevo.
// Generador de letras griegas que REUTILIZA la misma letra si el ángulo ya
// apareció antes en este diagrama (con la misma medida): si tres ángulos
// valen 56.31°, los tres se llaman θ, no θ/α/β.
function letrasGriegas(){
  const lista = ['\\theta','\\alpha','\\beta','\\gamma','\\delta','\\varepsilon','\\zeta','\\eta'];
  let i = 0;
  const vistos = [];   // {valor, letra}
  return {
    para(valor){
      const igual = vistos.find(v => Math.abs(v.valor-valor) < 0.15);
      if(igual) return igual.letra;
      const l = lista[i % lista.length]; i++;
      vistos.push({valor, letra:l});
      return l;
    }
  };
}

// Colocador anti-solape genérico: reparte etiquetas alrededor de un punto
// por ángulo; si dos quedan demasiado cerca angularmente, aleja la más
// reciente a un radio mayor. Devuelve si hubo que desplazarla, para poder
// dibujar una línea conectora delgada hacia su posición real.
function crearColocador(minSepDeg, pasoRadio){
  const puestos = [];
  return {
    ubicar(angDeg, radioBase){
      let radio = radioBase, vueltas = 0;
      let choque = puestos.some(p => Math.min(Math.abs(p.ang-angDeg), 360-Math.abs(p.ang-angDeg)) < minSepDeg);
      while(choque && vueltas < 6){
        radio += pasoRadio; vueltas++;
        choque = puestos.some(p => Math.min(Math.abs(p.ang-angDeg), 360-Math.abs(p.ang-angDeg)) < minSepDeg && Math.abs(p.radio-radio) < pasoRadio*0.6);
      }
      puestos.push({ang:angDeg, radio});
      return {radio, desplazada: radio > radioBase + 1e-6};
    }
  };
}

// Arco de ángulo respecto del eje MÁS CERCANO, horizontal o vertical, con un
// trazo punteado desde el nudo que enseña de qué línea se mide (R21: el DCL lo
// más limpio posible). El ángulo es siempre agudo y no pasa de 45°: si la barra
// está más cerca de la vertical se mide desde ella. Las ecuaciones no dependen
// de esto porque usan los cosenos directores en número, no la letra. Si la
// letra chocaría con otra ya puesta, se aleja y se une con una línea delgada.
function arcoAngulo(ux, uy, col, gen, radio, ox, oy, colocadorLetras){
  ox = ox || 0; oy = oy || 0;
  const conH = Math.acos(Math.min(1, Math.abs(ux))) * 180/Math.PI;   // con la horizontal
  const desdeV = conH > 45;                                            // más cerca de la vertical
  const acuteDeg = desdeV ? 90 - conH : conH;
  if(acuteDeg < 4) return {tikz:'', letra:null, valor:null};
  const R2 = radio || 0.65;
  // Semieje de referencia del mismo lado que la barra: 0/180 si es la
  // horizontal, 90/-90 si es la vertical.
  const rayDeg = desdeV ? (uy >= 0 ? 90 : -90) : (ux >= 0 ? 0 : 180);
  let endDeg = Math.atan2(uy, ux) * 180/Math.PI;
  while(endDeg - rayDeg > 180) endDeg -= 360;     // el arco va siempre por el lado corto
  while(endDeg - rayDeg < -180) endDeg += 360;
  const cr = Math.cos(rayDeg*Math.PI/180), sr = Math.sin(rayDeg*Math.PI/180);
  const tickLen = R2 * 0.62;
  const tx1 = ox.toFixed(3), ty1 = oy.toFixed(3);
  const tx2 = (ox + tickLen*cr).toFixed(3), ty2 = (oy + tickLen*sr).toFixed(3);
  const x1 = (ox + R2*cr).toFixed(3), y1 = (oy + R2*sr).toFixed(3);
  const letra = gen.para(acuteDeg);
  const midDeg = (rayDeg+endDeg)/2;

  let tikz = '\\draw[' + col + '!55, line width=0.35pt, dash pattern=on 1.5pt off 1.5pt] (' + tx1 + ',' + ty1 + ') -- (' + tx2 + ',' + ty2 + ');\n';
  tikz += '\\draw[' + col + '!70, line width=0.45pt] (' + x1 + ',' + y1 + ') arc [start angle=' + rayDeg + ', end angle=' + endDeg.toFixed(2) + ', radius=' + R2 + '];\n';

  const baseLetraR = R2 + 0.30;
  const pos = colocadorLetras ? colocadorLetras.ubicar(midDeg, baseLetraR) : {radio:baseLetraR, desplazada:false};
  const lx = (ox + pos.radio*Math.cos(midDeg*Math.PI/180)).toFixed(3), ly = (oy + pos.radio*Math.sin(midDeg*Math.PI/180)).toFixed(3);
  if(pos.desplazada){
    const ax = (ox + (R2+0.10)*Math.cos(midDeg*Math.PI/180)).toFixed(3), ay = (oy + (R2+0.10)*Math.sin(midDeg*Math.PI/180)).toFixed(3);
    tikz += '\\draw[' + col + '!50, line width=0.3pt] (' + ax + ',' + ay + ') -- (' + lx + ',' + ly + ');\n';
  }
  tikz += '\\node[font=\\tiny, text=' + col + '] at (' + lx + ',' + ly + ') {$' + letra + '$};\n';
  return {tikz, letra, valor:acuteDeg, lx:parseFloat(lx), ly:parseFloat(ly)};
}

function anclaPara(ux, uy){
  const ang = Math.atan2(uy, ux)*180/Math.PI;
  if(ang > -22.5 && ang <= 22.5)   return 'left';
  if(ang > 22.5 && ang <= 67.5)    return 'below left';
  if(ang > 67.5 && ang <= 112.5)   return 'below';
  if(ang > 112.5 && ang <= 157.5)  return 'below right';
  if(ang > 157.5 || ang <= -157.5) return 'right';
  if(ang > -157.5 && ang <= -112.5)return 'above right';
  if(ang > -112.5 && ang <= -67.5) return 'above';
  return 'above left';
}

// Inclinación de una barra respecto de la horizontal, normalizada a [0,180):
// una barra a 210 grados y otra a 30 tienen la misma inclinación.
function inclinacionBarra(ux, uy){
  let a = Math.atan2(uy, ux)*180/Math.PI;
  if(a < 0) a += 180;
  if(a >= 180) a -= 180;
  return a;
}

// Nombre del centro de momentos de cada ecuación de un corte: el del nudo si el
// centro cae en uno (casi siempre: donde se cruzan las otras dos barras cortadas)
// y, si no, una letra O, O', O'' que se rotula en la figura y se define en el pie.
// Devuelve un arreglo alineado con `items` (null donde la ecuación no es de momentos).
function etiquetasCentros(items){
  const libres = ['O', "O'", "O''"];
  let k = 0; const out = [];
  items.forEach(it=>{
    if(it.tipo !== 'momento' || !it.centro){ out.push(null); return; }
    const nd = nodos.find(n=>Math.abs(n.x-it.centro.x) < 1e-6 && Math.abs(n.y-it.centro.y) < 1e-6);
    if(nd){ out.push({tex:escLatex(nd.nombre), esNudo:true, x:it.centro.x, y:it.centro.y}); return; }
    const previo = out.find(o=>o && !o.esNudo && Math.abs(o.x-it.centro.x) < 1e-6 && Math.abs(o.y-it.centro.y) < 1e-6);
    if(previo){ out.push(previo); return; }
    out.push({tex:libres[Math.min(k++, libres.length-1)], esNudo:false, x:it.centro.x, y:it.centro.y});
  });
  return out;
}
// ── Figura de brazos de una ecuación de momentos del corte ──
// Repite la porción en gris y, para el centro C de esa ecuación, acota la
// distancia perpendicular desde C a la línea de acción de cada fuerza que SÍ
// produce momento (la incógnita de la ecuación y las conocidas del detalle),
// con la línea de acción prolongada a trazos hasta el pie de la perpendicular.
// Si C es un nudo de fuera de la porción, las barras cuyas líneas pasan por él
// se prolongan a trazos hasta C. Revisión del PDF, 2026-09-04.
function tikzBrazosCorte(lado, datosCorte, item, nombreCentro){
  const enLado = id => lado.indexOf(id) >= 0;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys);
  const esc = 7.6/Math.max(maxX-minX, 1e-6);
  const X = x => (x-minX)*esc, Y = y => (y-minY)*esc, F = v => v.toFixed(3);
  const C = item.centro, Lf = 1.1;
  const genB = letrasGriegas(), colocB = crearColocador(22, 0.40), angulos = [];
  let s = '';
  barras.forEach(b=>{
    if(!(enLado(b.a) && enLado(b.b))) return;
    const na = nodos.find(x=>x.id===b.a), nb = nodos.find(x=>x.id===b.b);
    s += '\\draw[black!45, line width=1.1pt] (' + F(X(na.x)) + ',' + F(Y(na.y)) + ') -- (' + F(X(nb.x)) + ',' + F(Y(nb.y)) + ');\n';
  });
  nodos.forEach(n=>{
    if(!enLado(n.id)) return;
    s += '\\fill[black!60] (' + F(X(n.x)) + ',' + F(Y(n.y)) + ') circle (1.3pt);\n';
    s += '\\node[font=\\tiny, above right, xshift=1pt] at (' + F(X(n.x)) + ',' + F(Y(n.y)) + ') {' + escLatex(n.nombre) + '};\n';
  });
  // Centro de fuera de la porción: las barras que pasan por él, prolongadas a trazos.
  const enPorcion = nodos.some(n=>enLado(n.id) && Math.abs(n.x-C.x) < 1e-6 && Math.abs(n.y-C.y) < 1e-6);
  if(!enPorcion){
    datosCorte.forEach(d=>{
      if(item.otros.indexOf(d.nombre) < 0) return;
      s += '\\draw[black!50, dashed, line width=0.5pt] (' + F(X(d.px)) + ',' + F(Y(d.py)) + ') -- (' + F(X(C.x)) + ',' + F(Y(C.y)) + ');\n';
    });
  }
  s += '\\fill[bsaAcc] (' + F(X(C.x)) + ',' + F(Y(C.y)) + ') circle (2pt);\n';
  s += '\\draw[bsaAcc, line width=0.6pt] (' + F(X(C.x)) + ',' + F(Y(C.y)) + ') circle (3.6pt);\n';
  if(!enPorcion) s += '\\node[font=\\scriptsize\\bfseries, text=bsaAcc, below right, inner sep=2pt] at (' + F(X(C.x)) + ',' + F(Y(C.y)) + ') {' + nombreCentro + '};\n';
  // Fuerzas con momento: la incógnita de la ecuación y las del detalle.
  const nombreDe = et => et.replace(/^F/, '').replace(/ .*$/, '');
  const fz = [{x:item.d.px, y:item.d.py, ux:item.d.ux, uy:item.d.uy, tex:'$F_{' + escLatex(item.d.nombre) + '}$', col:'bsaAcc2', esCarga:false}];
  item.detalle.forEach(t=>{
    if(t.x === undefined) return;
    const m = Math.hypot(t.fx, t.fy); if(m < 1e-9) return;
    const esR = t.et.charAt(0) === 'R', esF = t.et.charAt(0) === 'F';
    fz.push({x:t.x, y:t.y, ux:t.fx/m, uy:t.fy/m, esCarga: !esR && !esF, col: esR ? 'bsaVerde' : (esF ? 'bsaAcc2' : 'bsaAcc'),
             tex: esR ? '$R_{' + t.et.slice(-1) + escLatex(t.et.slice(1,-1)) + '}$' : (esF ? '$F_{' + escLatex(nombreDe(t.et)) + '}$' : dec(m,'f') + '\\,' + unitFor)});
  });
  fz.forEach(f=>{
    const px = X(f.x), py = Y(f.y);
    // Brazo: pie de la perpendicular desde C a la línea de acción.
    const tproy = (C.x-f.x)*f.ux + (C.y-f.y)*f.uy;
    const fx0 = f.x + tproy*f.ux, fy0 = f.y + tproy*f.uy;
    const brazo = Math.abs((C.x-f.x)*f.uy - (C.y-f.y)*f.ux);
    // flecha corta en su línea de acción, con su nombre
    s += '\\draw[->, >=stealth, ' + f.col + ', line width=1pt] (' + F(px) + ',' + F(py) + ') -- (' + F(px+f.ux*Lf) + ',' + F(py+f.uy*Lf) + ');\n';
    s += '\\node[font=\\tiny, text=' + f.col + ', inner sep=1pt] at (' + F(px+f.ux*(Lf+0.32)-f.uy*0.26) + ',' + F(py+f.uy*(Lf+0.32)+f.ux*0.26) + ') {' + f.tex + '};\n';
    // Carga inclinada: su ángulo, como en los demás DCL.
    if(f.esCarga){
      const arcoC = arcoAngulo(f.ux, f.uy, f.col, genB, 0.5, px, py, colocB);
      if(arcoC.tikz){ s += arcoC.tikz; angulos.push({letra:arcoC.letra, valor:arcoC.valor}); }
    }
    if(brazo < 1e-6) return;
    // línea de acción prolongada a trazos hasta el pie, y cota del brazo
    s += '\\draw[' + f.col + '!60, dashed, line width=0.45pt] (' + F(px) + ',' + F(py) + ') -- (' + F(X(fx0)) + ',' + F(Y(fy0)) + ');\n';
    s += '\\draw[<->, >=stealth, bsaMuted, line width=0.5pt] (' + F(X(C.x)) + ',' + F(Y(C.y)) + ') -- (' + F(X(fx0)) + ',' + F(Y(fy0)) + ')'
       + ' node[midway, fill=white, font=\\tiny, text=bsaMuted, inner sep=1pt] {' + dec(brazo,'len') + '\\,' + escLatex(unitLen) + '};\n';
  });
  return {tikz:s, enPorcion, angulos};
}

// ── Porción aislada del método de secciones (auto o manual) ──
// Dibuja solo el lado analizado: sus barras (color real según resultado),
// las fuerzas supuestas en las barras cortadas (con su valor calculado en
// este paso), las cargas/reacciones que actúan sobre la porción, y un
// marcador en los centros de momento usados para despejar cada incógnita.
function tikzSeccionPorcion(lado, datosCorte, externas, itemsSol){
  const enLado = id => lado.indexOf(id) >= 0;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const anchoReal = Math.max(maxX-minX, 1e-6);
  const esc = 9.3/anchoReal;
  const tx = (x)=> ((x-minX)*esc).toFixed(3);
  const ty = (y)=> ((y-minY)*esc).toFixed(3);
  const gen = letrasGriegas();
  const angulos = [];
  const ocupados = [];   // puntos ya usados (nudos, rótulos), para colocar el marco x,y

  // Un colocador anti-solape POR NUDO: la aglomeración ocurre alrededor de
  // cada nudo por separado (varias barras/cargas saliendo del mismo punto),
  // no en todo el dibujo a la vez.
  const colocPorNudo = {};
  function colocadorDe(idNudo, minSep, paso){
    if(!colocPorNudo[idNudo]) colocPorNudo[idNudo] = crearColocador(minSep, paso);
    return colocPorNudo[idNudo];
  }

  let s = '';
  barras.forEach(b=>{
    if(!(enLado(b.a) && enLado(b.b))) return;   // solo barras enteramente dentro de la porción
    const na = nodos.find(x=>x.id===b.a), nb = nodos.find(x=>x.id===b.b);
    const f = resultado.fuerzas[b.id]||0;
    s += '\\draw[' + tikzColorFuerza(f) + ', line width=1.3pt] (' + tx(na.x) + ',' + ty(na.y) + ') -- (' + tx(nb.x) + ',' + ty(nb.y) + ');\n';
  });
  nodos.forEach(n=>{
    if(!enLado(n.id)) return;
    ocupados.push([parseFloat(tx(n.x)), parseFloat(ty(n.y))]);
    s += '\\fill (' + tx(n.x) + ',' + ty(n.y) + ') circle (1.5pt);\n';
    s += '\\node[font=\\tiny, above right, xshift=1pt] at (' + tx(n.x) + ',' + ty(n.y) + ') {' + escLatex(n.nombre) + '};\n';
    // En un DCL el apoyo se SUSTITUYE por su reacción: si la reacción va dibujada
    // en este nudo, el símbolo del apoyo sobra (y se pisaba con el rótulo).
    const conReaccion = externas.some(e=>e.et.charAt(0) === 'R' && Math.abs(e.x-n.x) < 1e-6 && Math.abs(e.y-n.y) < 1e-6);
    if((n.apoyo === 'fijo' || n.apoyo === 'movil') && !conReaccion) s += tikzApoyo(n.apoyo, tx(n.x), ty(n.y));
  });

  // fuerzas supuestas en las barras cortadas (tracción hacia afuera)
  const Lf0 = 1.55;
  datosCorte.forEach(d=>{
    const nodoRef = d.nd || d.nodoDentro;   // 'nd' en modo auto, 'nodoDentro' en modo manual
    const item = itemsSol.find(it => it.d.barra.id === d.barra.id);
    const val = item ? item.val : null;
    const col = (val!==null && isFinite(val)) ? tikzColorFuerza(val) : 'bsaAcc';
    const px = parseFloat(tx(d.px)), py = parseFloat(ty(d.py));
    const ex = (px+d.ux*Lf0).toFixed(3), ey = (py+d.uy*Lf0).toFixed(3);
    ocupados.push([parseFloat(ex), parseFloat(ey)]);
    s += '\\draw[->, >=stealth, ' + col + ', line width=1.1pt] (' + px.toFixed(3) + ',' + py.toFixed(3) + ') -- (' + ex + ',' + ey + ');\n';

    // Etiqueta simple (solo la variable), separada según lo que ya haya en
    // este mismo nudo; si se aleja, queda unida con una línea delgada.
    const clc = colocadorDe(nodoRef.id, 24, 0.85);
    const angDeg = Math.atan2(d.uy,d.ux)*180/Math.PI;
    const pos = clc.ubicar(angDeg, Lf0+0.35);
    const lx = (px + pos.radio*Math.cos(angDeg*Math.PI/180)).toFixed(3), ly = (py + pos.radio*Math.sin(angDeg*Math.PI/180)).toFixed(3);
    if(pos.desplazada){
      const ax = (px + (Lf0+0.10)*Math.cos(angDeg*Math.PI/180)).toFixed(3), ay = (py + (Lf0+0.10)*Math.sin(angDeg*Math.PI/180)).toFixed(3);
      s += '\\draw[' + col + '!55, line width=0.3pt] (' + ax + ',' + ay + ') -- (' + lx + ',' + ly + ');\n';
    }
    s += '\\node[font=\\small, text=' + col + ', inner sep=1.5pt] at (' + lx + ',' + ly + ') {$F_{' + escLatex(d.nombre) + '}$};\n';
    ocupados.push([parseFloat(lx), parseFloat(ly)]);

    // Arco con letra griega para el ángulo agudo (0-90°) de esta barra,
    // usando el mismo colocador de letras que las fuerzas de este nudo.
    const clcAng = colocadorDe('ang-'+nodoRef.id, 22, 0.40);
    const arco = arcoAngulo(d.ux, d.uy, col, gen, 0.55, px, py, clcAng);
    if(arco.tikz){ s += arco.tikz; angulos.push({letra:arco.letra, valor:arco.valor}); ocupados.push([arco.lx, arco.ly]); }
  });

  // Cargas y reacciones externas sobre la porción. Las cargas llevan su valor
  // (dato); las reacciones, solo la variable (R21). Y ninguna se pisa con una
  // barra: ladoCarga decide si la flecha llega al nudo o sale de él.
  externas.forEach(e=>{
    if(e.barra && e.conocida !== undefined){
      // Barra cortada ya resuelta en un corte anterior: se dibuja SOBRE su barra,
      // con su sentido real (tira si es tracción, empuja si es compresión) y con
      // su nombre (R21), no como una carga externa apartada del nudo.
      const v = e.conocida;
      const nd = nodos.find(z=>Math.abs(z.x-e.x)<1e-6 && Math.abs(z.y-e.y)<1e-6);
      const nf = nd ? nodos.find(z=>z.id === (e.barra.a===nd.id ? e.barra.b : e.barra.a)) : null;
      if(nd && nf){
        const px = parseFloat(tx(e.x)), py = parseFloat(ty(e.y));
        const dx = nf.x-nd.x, dy = nf.y-nd.y, Lb = Math.hypot(dx,dy), bx = dx/Lb, by = dy/Lb;
        const col = tikzColorFuerza(v);
        ocupados.push([px+bx*Lf0, py+by*Lf0]);
        if(v > 0) s += '\\draw[->, >=stealth, ' + col + ', line width=1.1pt] (' + px.toFixed(3) + ',' + py.toFixed(3) + ') -- (' + (px+bx*Lf0).toFixed(3) + ',' + (py+by*Lf0).toFixed(3) + ');\n';
        else      s += '\\draw[->, >=stealth, ' + col + ', line width=1.1pt] (' + (px+bx*Lf0).toFixed(3) + ',' + (py+by*Lf0).toFixed(3) + ') -- (' + (px+bx*0.28).toFixed(3) + ',' + (py+by*0.28).toFixed(3) + ');\n';
        const clcB = colocadorDe(nd.id, 24, 0.85);
        const angB = Math.atan2(by,bx)*180/Math.PI;
        const posB = clcB.ubicar(angB, Lf0+0.35);
        const lx = (px + posB.radio*bx).toFixed(3), ly = (py + posB.radio*by).toFixed(3);
        if(posB.desplazada) s += '\\draw[' + col + '!55, line width=0.3pt] (' + (px+(Lf0+0.10)*bx).toFixed(3) + ',' + (py+(Lf0+0.10)*by).toFixed(3) + ') -- (' + lx + ',' + ly + ');\n';
        s += '\\node[font=\\small, text=' + col + ', inner sep=1.5pt] at (' + lx + ',' + ly + ') {$F_{' + escLatex(nombreBarra(e.barra)) + '}$};\n';
        ocupados.push([parseFloat(lx), parseFloat(ly)]);
        return;
      }
    }
    const mag = Math.hypot(e.fx, e.fy);
    if(mag < 1e-9) return;
    const ux = e.fx/mag, uy = e.fy/mag;
    const esR = e.et.charAt(0) === 'R';
    const col = esR ? 'bsaVerde' : 'bsaAcc';
    const px = parseFloat(tx(e.x)), py = parseFloat(ty(e.y));
    const nodoAqui = nodos.find(z=>Math.abs(z.x-e.x)<1e-6 && Math.abs(z.y-e.y)<1e-6);
    const lado = nodoAqui ? ladoCarga(nodoAqui, ux, uy, 0.30) : {sentido:1, ox:0, oy:0};
    const k = lado.sentido;
    const clc = colocadorDe(nodoAqui ? nodoAqui.id : (e.x+','+e.y), 24, 0.85);
    const angDeg = Math.atan2(-k*uy,-k*ux)*180/Math.PI;   // hacia el extremo lejano de la flecha
    // La carga va más lejos que la reacción: su rótulo tiene que quedar POR ENCIMA de
    // los rótulos de las barras (a 1.90 sobre la barra), no entre ellos.
    const pos = clc.ubicar(angDeg, esR ? 1.15 : 2.05);
    const fx0 = px - k*ux*pos.radio + lado.ox, fy0 = py - k*uy*pos.radio + lado.oy;   // extremo lejano
    const nx0 = px - k*ux*0.28 + lado.ox, ny0 = py - k*uy*0.28 + lado.oy;             // junto al nudo
    const [x1, y1, x2, y2] = k > 0 ? [fx0, fy0, nx0, ny0] : [nx0, ny0, fx0, fy0];
    s += '\\draw[->, >=stealth, ' + col + ', line width=1.1pt] (' + x1.toFixed(3) + ',' + y1.toFixed(3) + ') -- (' + x2.toFixed(3) + ',' + y2.toFixed(3) + ');\n';
    // La etiqueta de una reacción es 'R' + nudo + eje ('RAy'): se rotula R_{yA}.
    const rot = esR ? '$R_{' + e.et.slice(-1) + escLatex(e.et.slice(1, -1)) + '}$' : dec(mag,'f') + '\\,' + unitFor;
    s += '\\node[font=\\tiny, text=' + col + ', inner sep=1.5pt] at (' + (fx0 - k*ux*0.28).toFixed(3) + ',' + (fy0 - k*uy*0.28).toFixed(3) + ') {' + rot + '};\n';
    if(!esR){
      const clcA = colocadorDe('ang-' + (nodoAqui ? nodoAqui.id : (e.x+','+e.y)), 22, 0.40);
      const arcoC = arcoAngulo(-k*ux, -k*uy, col, gen, 0.55, px + lado.ox, py + lado.oy, clcA);
      if(arcoC.tikz){ s += arcoC.tikz; angulos.push({letra:arcoC.letra, valor:arcoC.valor}); ocupados.push([arcoC.lx, arcoC.ly]); }
    }
    ocupados.push([fx0, fy0]);
  });

  // Centros de momento usados en este paso. Si el centro no es un nudo, se
  // rotula con la letra que usa la ecuación (O, O', …), definida en el pie.
  const etqC = etiquetasCentros(itemsSol);
  const rotulados = [];
  itemsSol.forEach((it, k)=>{
    if(it.tipo !== 'momento' || !it.centro) return;
    const cx = tx(it.centro.x), cy = ty(it.centro.y);
    s += '\\draw[bsaAcc, line width=0.6pt, dashed] (' + cx + ',' + cy + ') circle (2.2pt);\n';
    const c = etqC[k];
    if(!c || rotulados.indexOf(c.tex) >= 0) return;
    // Un nudo de la porción ya lleva su nombre; uno de fuera, o un punto O, no.
    const dentro = c.esNudo && nodos.some(n=>enLado(n.id) && Math.abs(n.x-it.centro.x) < 1e-6 && Math.abs(n.y-it.centro.y) < 1e-6);
    if(dentro) return;
    rotulados.push(c.tex);
    s += '\\node[font=\\scriptsize, text=' + (c.esNudo ? 'bsaMuted' : 'bsaAcc') + ', above right, inner sep=1pt] at (' + cx + ',' + cy + ') {' + (c.esNudo ? c.tex : '$' + c.tex + '$') + '};\n';
  });

  // Marco x,y (R21) en la esquina superior más despejada del recuadro de la
  // porción (abajo van las cotas), medida contra lo que hay dibujado: rótulos,
  // puntas de flecha y letras de ángulo. Cuatro candidatas, dos por lado.
  {
    const nl_ = nodos.filter(n=>enLado(n.id));
    if(nl_.length){
      const X0 = Math.min(...nl_.map(n=>parseFloat(tx(n.x)))) - 1.6, X1 = Math.max(...nl_.map(n=>parseFloat(tx(n.x)))) + 1.6;
      const Y1 = Math.max(...nl_.map(n=>parseFloat(ty(n.y)))) + 1.5;
      // Rejilla de candidatas alrededor de las dos esquinas superiores: con una
      // porción de un solo nudo, las esquinas quedan todas igual de cerca de los
      // rótulos y hace falta poder alejarse más.
      const cands = [];
      [X1-0.9, X0].forEach(bx=>{ [-1.0, 0, 0.9].forEach(dx=>{ [-0.9, 0.1, 1.1].forEach(dy=>{ cands.push([bx+dx, Y1+dy]); }); }); });
      const esq = mejorEsquina(cands, ocupados, 0.95, 0.95);
      s += tikzMarcoXY(esq[0], esq[1]);
    }
  }

  // Cotas en x e y de los nudos visibles de la porción (mismo estilo que la
  // Figura 1 general).
  const nodosLado = nodos.filter(n=>enLado(n.id));
  if(nodosLado.length > 1){
    const lx0 = Math.min(...nodosLado.map(n=>n.x)), lx1 = Math.max(...nodosLado.map(n=>n.x));
    const ly0 = Math.min(...nodosLado.map(n=>n.y)), ly1 = Math.max(...nodosLado.map(n=>n.y));
    s += tikzCotas(tx, ty, lx0, lx1, ly0, ly1, esc, nodosLado);
  }
  return {tikz:s, angulos};
}

// Marco de referencia global (x, y): dos flechitas que dicen cuál es el sentido
// positivo de cada suma de fuerzas. Va en una esquina del DCL, nunca sobre el
// nudo, para que no se confunda con una fuerza (R21).
function tikzMarcoXY(x, y){
  const F = v => v.toFixed(3);
  let t = '\\draw[->, >=stealth, bsaMuted, line width=0.7pt] (' + F(x) + ',' + F(y) + ') -- (' + F(x+0.75) + ',' + F(y) + ') node[right, font=\\scriptsize, inner sep=1pt] {$x$};\n';
  t += '\\draw[->, >=stealth, bsaMuted, line width=0.7pt] (' + F(x) + ',' + F(y) + ') -- (' + F(x) + ',' + F(y+0.75) + ') node[above, font=\\scriptsize, inner sep=1pt] {$y$};\n';
  t += '\\fill[bsaMuted] (' + F(x) + ',' + F(y) + ') circle (0.8pt);\n';
  return t;
}
// Elige, entre varias posiciones posibles del marco, la que queda más lejos de
// todo lo ya dibujado (rótulos, puntas de flecha, letras de ángulo): distancia
// mínima de cada punto ocupado a la caja w×h del marco, y se toma la mayor.
function mejorEsquina(cands, ocupados, w, h){
  const dCaja = (q, c) => Math.hypot(Math.max(c[0]-q[0], 0, q[0]-(c[0]+w)), Math.max(c[1]-q[1], 0, q[1]-(c[1]+h)));
  return cands.reduce((m, c) => { const s = ocupados.length ? Math.min(...ocupados.map(q=>dCaja(q, c))) : 99; return s > m.s ? {c, s} : m; }, {c:cands[0], s:-1}).c;
}

// El rotulo lleva SOLO la variable (R21). Lo que ya viene resuelto de los nudos
// anteriores se reconoce por el SENTIDO REAL de la flecha y por el color, no por
// un numero: los valores van en las ecuaciones y en la tabla resumen.
function tikzDCLNudo(n, res){
  const R = 2.10;
  let s = '';
  const ocup = [];   // puntos ya ocupados (rótulos, puntas, letras), para colocar el marco x,y
  const conec = barras.filter(b=>b.a===n.id||b.b===n.id);
  const gen = letrasGriegas();
  const colocadorLetras = crearColocador(24, 0.42);
  const colocadorFuerzas = crearColocador(26, 0.55);
  const angulos = [];   // {letra, valor} — se listan como texto aparte

  function etiquetaFuerza(ux, uy, col, texto, radioBase){
    const angDeg = Math.atan2(uy,ux)*180/Math.PI;
    const pos = colocadorFuerzas.ubicar(angDeg, radioBase);
    const lx = (pos.radio*Math.cos(angDeg*Math.PI/180)).toFixed(3), ly = (pos.radio*Math.sin(angDeg*Math.PI/180)).toFixed(3);
    let tikz = '';
    ocup.push([parseFloat(lx), parseFloat(ly)]);
    if(pos.desplazada){
      const ax = ((radioBase-0.10)*Math.cos(angDeg*Math.PI/180)).toFixed(3), ay = ((radioBase-0.10)*Math.sin(angDeg*Math.PI/180)).toFixed(3);
      tikz += '\\draw[' + col + '!55, line width=0.3pt] (' + ax + ',' + ay + ') -- (' + lx + ',' + ly + ');\n';
    }
    tikz += '\\node[font=\\small, text=' + col + ', inner sep=1.5pt] at (' + lx + ',' + ly + ') {' + texto + '};\n';
    return tikz;
  }

  conec.forEach(b=>{
    const o = nodos.find(z=>z.id === (b.a===n.id?b.b:b.a));
    const dx=o.x-n.x, dy=o.y-n.y, L=Math.hypot(dx,dy);
    const ux=dx/L, uy=dy/L;
    ocup.push([ux*R, uy*R]);
    const val = res.fuerzas[b.id] || 0;
    const cero = esCero(val);
    const col = cero ? 'black!40' : (val>0 ? 'bsaAcc2' : 'bsaRoj');
    const x2=(ux*R).toFixed(3), y2=(uy*R).toFixed(3);
    s += '\\draw[' + col + (cero?', dashed':'') + ', line width=1pt] (0,0) -- (' + x2 + ',' + y2 + ');\n';
    if(!cero){
      if(val>0){
        s += '\\draw[->, >=stealth, ' + col + ', line width=1pt] (' + (ux*(R-0.30)).toFixed(3) + ',' + (uy*(R-0.30)).toFixed(3) + ') -- (' + x2 + ',' + y2 + ');\n';
      } else {
        s += '\\draw[->, >=stealth, ' + col + ', line width=1pt] (' + (ux*0.30).toFixed(3) + ',' + (uy*0.30).toFixed(3) + ') -- (0,0);\n';
      }
    }
    // Etiqueta simple (solo la variable); si chocaría con otra, se aleja y
    // se conecta con una línea delgada hasta la punta de su propia barra.
    s += etiquetaFuerza(ux, uy, col, '$F_{' + nombreBarra(b) + '}$', R+0.30);
    // Arco con letra griega para el ángulo (agudo, 0-90°) respecto de la horizontal.
    const arco = arcoAngulo(ux, uy, col, gen, 0.65, 0, 0, colocadorLetras);
    if(arco.tikz){ s += arco.tikz; angulos.push({letra:arco.letra, valor:arco.valor, barra:nombreBarra(b)}); ocup.push([arco.lx, arco.ly]); }
  });

  // Fuerzas aplicadas en el nudo (carga y reacciones). Por defecto LLEGAN al
  // nudo por el lado de la cola; si ahí hay una barra, SALEN del nudo por el
  // otro lado, y si los dos están ocupados se apartan un poco (ladoCarga).
  const flechaExterna = (ux, uy, col, etiqueta) => {
    const lado = ladoCarga(n, ux, uy, 0.45), k = lado.sentido;
    const ax = -k*ux*2.15 + lado.ox, ay = -k*uy*2.15 + lado.oy;   // extremo lejano
    const bx = -k*ux*0.30 + lado.ox, by = -k*uy*0.30 + lado.oy;   // extremo junto al nudo
    const [x1, y1, x2, y2] = k > 0 ? [ax, ay, bx, by] : [bx, by, ax, ay];
    s += '\\draw[->, >=stealth, ' + col + ', line width=1.2pt] (' + x1.toFixed(3) + ',' + y1.toFixed(3) + ') -- (' + x2.toFixed(3) + ',' + y2.toFixed(3) + ');\n';
    if(lado.ox || lado.oy){
      const lx = -k*ux*2.55 + lado.ox, ly = -k*uy*2.55 + lado.oy;
      s += '\\node[font=\\small, text=' + col + ', inner sep=1.5pt] at (' + lx.toFixed(3) + ',' + ly.toFixed(3) + ') {' + etiqueta + '};\n';
      ocup.push([lx, ly]);
    } else {
      s += etiquetaFuerza(-k*ux, -k*uy, col, etiqueta, 2.55);
    }
    ocup.push([ax, ay]);
    // Si la fuerza es inclinada (componentes en x e y), su ángulo. Las
    // reacciones se dibujan por componentes, así que esto solo afecta a cargas.
    const arcoF = arcoAngulo(-k*ux, -k*uy, col, gen, 0.95, lado.ox, lado.oy, colocadorLetras);
    if(arcoF.tikz){ s += arcoF.tikz; angulos.push({letra:arcoF.letra, valor:arcoF.valor}); ocup.push([arcoF.lx, arcoF.ly]); }
  };
  if(!esCero(n.fx) || !esCero(n.fy)){
    const mag = Math.hypot(n.fx, n.fy);
    flechaExterna(n.fx/mag, n.fy/mag, 'bsaAcc', dec(mag,'f') + '\\,' + unitFor);
  }
  // Reacciones: R>0 apunta a +x / +y. Antes se dibujaban al revés (con R_y>0
  // la flecha iba de (0,+2.15) a (0,+0.30), o sea hacia abajo).
  const rr = res.reacciones[n.id];
  if(rr){
    if(rr.ry !== undefined && !esCero(rr.ry)) flechaExterna(0, rr.ry>0?1:-1, 'bsaVerde', '$R_{y' + escLatex(n.nombre) + '}$');
    if(rr.rx !== undefined && !esCero(rr.rx)) flechaExterna(rr.rx>0?1:-1, 0, 'bsaVerde', '$R_{x' + escLatex(n.nombre) + '}$');
  }

  // Marco x,y en la esquina más despejada, medida contra lo que de verdad hay
  // dibujado (rótulos, puntas y letras), entre cuatro esquinas cercanas y cuatro
  // lejanas del recuadro del DCL.
  const cands = [[2.90,2.90],[-3.60,2.90],[-3.60,-3.60],[2.90,-3.60],[3.75,3.45],[-4.65,3.45],[-4.65,-4.35],[3.75,-4.35]];
  const esq = mejorEsquina(cands, ocup, 0.95, 0.95);
  s += tikzMarcoXY(esq[0], esq[1]);

  s += '\\fill[bsaAcc] (0,0) circle (2pt);\n';
  s += '\\node[font=\\small\\bfseries, above right, xshift=2pt, yshift=2pt] at (0,0) {' + escLatex(n.nombre) + '};\n';
  s += '\\path (-4.70,-4.40) rectangle (4.70,4.40);\n';   // marco invisible: mismo tamaño en todos los DCL
  return {tikz:s, angulos};
}

// ── Armadura completa reutilizable: geometría base + variantes ──
// opts: {fuerzas, reacciones, cotas, valores, factorCargas, resaltar, neutra}
// Los ángulos de las cargas inclinadas quedan en `_angulosFigura`: la función
// devuelve un string (los llamadores lo concatenan), así que el pie los lee de
// aquí justo después de llamarla.
let _angulosFigura = [];
function tikzArmaduraCompleta(opts){
  opts = opts || {};
  const fuerzas = opts.fuerzas || resultado.fuerzas;
  const reacciones = opts.reacciones || resultado.reacciones;
  const factorCargas = opts.factorCargas || 1;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const anchoReal = Math.max(maxX-minX, 1e-6), altoReal = Math.max(maxY-minY, 1e-6);
  const anchoObjetivoCm = 12.5;
  const esc = anchoObjetivoCm/anchoReal;
  const tx = (x)=> ((x-minX)*esc).toFixed(3);
  const ty = (y)=> ((y-minY)*esc).toFixed(3);
  const maxF = Math.max(1e-9, ...barras.map(b=>Math.abs(fuerzas[b.id]||0)));
  _angulosFigura = [];
  const genCargas = letrasGriegas();

  let s = '';
  barras.forEach(b=>{
    const na = nodos.find(x=>x.id===b.a), nb = nodos.find(x=>x.id===b.b);
    if(!na||!nb) return;
    const f = fuerzas[b.id]||0;
    const resaltada = opts.resaltar && opts.resaltar===b.id;
    // La PRIMERA figura del informe (opts.neutra) va como en el panel de dibujo,
    // sin colores de tracción/compresión ni grosor por fuerza; las demás sí los
    // llevan. Solo se resalta la barra que se pida.
    const grosor = resaltada ? 3.2 : (opts.neutra ? 1.4 : (0.8 + 1.4*Math.abs(f)/maxF));
    const col = resaltada ? 'bsaAlerta' : (opts.neutra ? 'bsaBarra' : tikzColorFuerza(f));
    s += '\\draw[' + col + ', line width=' + grosor.toFixed(2) + 'pt] (' + tx(na.x) + ',' + ty(na.y) + ') -- (' + tx(nb.x) + ',' + ty(nb.y) + ');\n';
    if(opts.valores){
      const mx = ((parseFloat(tx(na.x))+parseFloat(tx(nb.x)))/2).toFixed(3);
      const my = ((parseFloat(ty(na.y))+parseFloat(ty(nb.y)))/2).toFixed(3);
      s += '\\node[font=' + (resaltada?'\\tiny\\bfseries':'\\tiny') + ', fill=white, inner sep=1pt, text=' + col + '] at (' + mx + ',' + my + ') {' + dec(Math.abs(f),'f') + '};\n';
    }
  });
  nodos.forEach(n=>{
    s += '\\fill (' + tx(n.x) + ',' + ty(n.y) + ') circle (1.5pt);\n';
    s += '\\node[font=\\tiny, above right, xshift=1pt] at (' + tx(n.x) + ',' + ty(n.y) + ') {' + escLatex(n.nombre) + '};\n';
    if(n.apoyo === 'fijo' || n.apoyo === 'movil'){
      s += tikzApoyo(n.apoyo, tx(n.x), ty(n.y));
    }
    if(opts.cargas !== false){
      s += tikzFlechaCarga(n, tx, ty, factorCargas, null,
                           {gen:genCargas, coloc:crearColocador(24, 0.40), angulos:_angulosFigura});
    }
    // Reacciones incógnita en su sentido positivo supuesto (+x, +y), para el
    // DCL global con el que se plantean las ecuaciones de reacciones.
    if(opts.reaccionesIncognita && reacciones[n.id]){
      const rr = reacciones[n.id];
      const px = parseFloat(tx(n.x)), py = parseFloat(ty(n.y));
      if(rr.ry !== undefined){
        s += '\\draw[->, >=stealth, bsaVerde, line width=1.1pt] (' + px.toFixed(3) + ',' + (py-1.45).toFixed(3) + ') -- (' + px.toFixed(3) + ',' + (py-0.62).toFixed(3) + ');\n';
        s += '\\node[font=\\scriptsize, text=bsaVerde, right, xshift=2pt] at (' + px.toFixed(3) + ',' + (py-1.05).toFixed(3) + ') {$R_{y' + escLatex(n.nombre) + '}$};\n';
      }
      if(rr.rx !== undefined){
        s += '\\draw[->, >=stealth, bsaVerde, line width=1.1pt] (' + (px-1.35).toFixed(3) + ',' + py.toFixed(3) + ') -- (' + (px-0.45).toFixed(3) + ',' + py.toFixed(3) + ');\n';
        s += '\\node[font=\\scriptsize, text=bsaVerde, above] at (' + (px-0.90).toFixed(3) + ',' + py.toFixed(3) + ') {$R_{x' + escLatex(n.nombre) + '}$};\n';
      }
    }
  });
  if(opts.cotas){
    s += tikzCotas(tx, ty, minX, maxX, minY, maxY, esc);
  }
  return s;
}
// Arma el texto .tex y lo DEVUELVE (no descarga nada).
// Lo usan tanto descargarTex() como generarPDFLatex().
