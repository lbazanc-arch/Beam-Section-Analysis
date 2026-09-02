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

// ── Flecha de carga refinada (estilo libro, no exagerada) ──
function tikzFlechaCarga(n, tx, ty, factor, longBase){
  factor = factor || 1;
  const fx = n.fx*factor, fy = n.fy*factor;
  if(esCero(fx) && esCero(fy)) return '';
  const mag = Math.hypot(fx, fy);
  const ux = fx/mag, uy = fy/mag;
  const px = parseFloat(tx(n.x)), py = parseFloat(ty(n.y));
  const L = longBase || 1.05;
  const x0 = (px - L*ux).toFixed(3), y0 = (py - L*uy).toFixed(3);
  let s = '\\draw[->, >=stealth, line width=0.85pt, bsaAcc] (' + x0 + ',' + y0 + ') -- (' + tx(n.x) + ',' + ty(n.y) + ');\n';
  const perpX = -uy, perpY = ux;
  const side = (Math.abs(perpY) > 0.3) ? (perpY>=0?1:-1) : (perpX>=0?1:-1);
  const lx = (px - L*0.62*ux + side*0.30*perpX).toFixed(3);
  const ly = (py - L*0.62*uy + side*0.30*perpY).toFixed(3);
  s += '\\node[font=\\scriptsize, color=bsaAcc] at (' + lx + ',' + ly + ') {' + dec(mag,'f') + '\\,' + unitFor + '};\n';
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

// Arco de ángulo respecto de una referencia horizontal EXPLÍCITA (se dibuja
// un pequeño trazo punteado desde el nudo, para que se vea de qué línea se
// mide el ángulo). El ángulo es siempre agudo (0-90°): acos(|ux|), porque
// (ux,uy) es unitario. Si la letra chocaría con otra ya puesta, se aleja y
// se conecta con una línea delgada.
function arcoAngulo(ux, uy, col, gen, radio, ox, oy, colocadorLetras){
  ox = ox || 0; oy = oy || 0;
  const acuteDeg = Math.acos(Math.min(1, Math.abs(ux))) * 180/Math.PI;
  if(acuteDeg < 4 || acuteDeg > 86) return {tikz:'', letra:null, valor:null};
  const R2 = radio || 0.65;
  const rayDeg = (ux >= 0) ? 0 : 180;
  const rawDeg = Math.atan2(uy, ux) * 180/Math.PI;
  const tickLen = R2 * 0.62;
  const tx1 = ox.toFixed(3), ty1 = oy.toFixed(3);
  const tx2 = (ox + tickLen*Math.cos(rayDeg*Math.PI/180)).toFixed(3), ty2 = (oy + tickLen*Math.sin(rayDeg*Math.PI/180)).toFixed(3);
  const x1 = (ox + R2*Math.cos(rayDeg*Math.PI/180)).toFixed(3), y1 = (oy + R2*Math.sin(rayDeg*Math.PI/180)).toFixed(3);
  const letra = gen.para(acuteDeg);
  const midDeg = (rayDeg+rawDeg)/2;

  let tikz = '\\draw[' + col + '!55, line width=0.35pt, dash pattern=on 1.5pt off 1.5pt] (' + tx1 + ',' + ty1 + ') -- (' + tx2 + ',' + ty2 + ');\n';
  tikz += '\\draw[' + col + '!70, line width=0.45pt] (' + x1 + ',' + y1 + ') arc [start angle=' + rayDeg + ', end angle=' + rawDeg.toFixed(2) + ', radius=' + R2 + '];\n';

  const baseLetraR = R2 + 0.30;
  const pos = colocadorLetras ? colocadorLetras.ubicar(midDeg, baseLetraR) : {radio:baseLetraR, desplazada:false};
  const lx = (ox + pos.radio*Math.cos(midDeg*Math.PI/180)).toFixed(3), ly = (oy + pos.radio*Math.sin(midDeg*Math.PI/180)).toFixed(3);
  if(pos.desplazada){
    const ax = (ox + (R2+0.10)*Math.cos(midDeg*Math.PI/180)).toFixed(3), ay = (oy + (R2+0.10)*Math.sin(midDeg*Math.PI/180)).toFixed(3);
    tikz += '\\draw[' + col + '!50, line width=0.3pt] (' + ax + ',' + ay + ') -- (' + lx + ',' + ly + ');\n';
  }
  tikz += '\\node[font=\\tiny, text=' + col + '] at (' + lx + ',' + ly + ') {$' + letra + '$};\n';
  return {tikz, letra, valor:acuteDeg};
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
    s += '\\fill (' + tx(n.x) + ',' + ty(n.y) + ') circle (1.5pt);\n';
    s += '\\node[font=\\tiny, above right, xshift=1pt] at (' + tx(n.x) + ',' + ty(n.y) + ') {' + escLatex(n.nombre) + '};\n';
    if(n.apoyo === 'fijo' || n.apoyo === 'movil') s += tikzApoyo(n.apoyo, tx(n.x), ty(n.y));
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

    // Arco con letra griega para el ángulo agudo (0-90°) de esta barra,
    // usando el mismo colocador de letras que las fuerzas de este nudo.
    const clcAng = colocadorDe('ang-'+nodoRef.id, 22, 0.40);
    const arco = arcoAngulo(d.ux, d.uy, col, gen, 0.55, px, py, clcAng);
    if(arco.tikz){ s += arco.tikz; angulos.push({letra:arco.letra, valor:arco.valor}); }
  });

  // cargas y reacciones externas sobre la porción
  externas.forEach(e=>{
    const mag = Math.hypot(e.fx, e.fy);
    if(mag < 1e-9) return;
    const ux = e.fx/mag, uy = e.fy/mag;
    const col = e.et.charAt(0) === 'R' ? 'bsaVerde' : 'bsaAcc';
    const px = parseFloat(tx(e.x)), py = parseFloat(ty(e.y));
    const nodoAqui = nodos.find(z=>Math.abs(z.x-e.x)<1e-6 && Math.abs(z.y-e.y)<1e-6);
    const clc = colocadorDe(nodoAqui ? nodoAqui.id : (e.x+','+e.y), 24, 0.85);
    const angDeg = Math.atan2(-uy,-ux)*180/Math.PI;   // dirección hacia la cola de la flecha
    const pos = clc.ubicar(angDeg, 1.15);
    const sx = (px + pos.radio*Math.cos(angDeg*Math.PI/180)).toFixed(3), sy = (py + pos.radio*Math.sin(angDeg*Math.PI/180)).toFixed(3);
    const ex = (px-ux*0.28).toFixed(3), ey = (py-uy*0.28).toFixed(3);
    s += '\\draw[->, >=stealth, ' + col + ', line width=1.1pt] (' + sx + ',' + sy + ') -- (' + ex + ',' + ey + ');\n';
    s += '\\node[font=\\tiny, text=' + col + ', inner sep=1.5pt] at (' + sx + ',' + sy + ') {' + dec(mag,'f') + '\\,' + unitFor + '};\n';
  });

  // centros de momento usados en este paso
  itemsSol.forEach(it=>{
    if(it.tipo !== 'momento' || !it.centro) return;
    const cx = tx(it.centro.x), cy = ty(it.centro.y);
    s += '\\draw[bsaAcc, line width=0.6pt, dashed] (' + cx + ',' + cy + ') circle (2.2pt);\n';
  });

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

function tikzDCLNudo(n, res){
  const R = 2.10;
  let s = '';
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
    if(arco.tikz){ s += arco.tikz; angulos.push({letra:arco.letra, valor:arco.valor, barra:nombreBarra(b)}); }
  });

  if(!esCero(n.fx) || !esCero(n.fy)){
    const mag=Math.hypot(n.fx,n.fy), ux=n.fx/mag, uy=n.fy/mag;
    const sx=(-ux*2.15).toFixed(3), sy=(-uy*2.15).toFixed(3);
    const ex=(-ux*0.30).toFixed(3), ey=(-uy*0.30).toFixed(3);
    s += '\\draw[->, >=stealth, bsaAcc, line width=1.2pt] (' + sx + ',' + sy + ') -- (' + ex + ',' + ey + ');\n';
    s += etiquetaFuerza(-ux, -uy, 'bsaAcc', dec(mag,'f') + '\\,' + unitFor, 2.55);
  }

  const rr = res.reacciones[n.id];
  if(rr){
    if(rr.ry !== undefined && !esCero(rr.ry)){
      const dir = rr.ry>0?1:-1;
      s += '\\draw[->, >=stealth, bsaVerde, line width=1.2pt] (0,' + (dir*2.15).toFixed(3) + ') -- (0,' + (dir*0.30).toFixed(3) + ');\n';
      s += etiquetaFuerza(0, dir, 'bsaVerde', '$R_{y' + escLatex(n.nombre) + '}$ (' + dec(Math.abs(rr.ry),'f') + '\\,' + unitFor + ')', 2.55);
    }
    if(rr.rx !== undefined && !esCero(rr.rx)){
      const dir = rr.rx>0?1:-1;
      s += '\\draw[->, >=stealth, bsaVerde, line width=1.2pt] (' + (dir*2.15).toFixed(3) + ',0) -- (' + (dir*0.30).toFixed(3) + ',0);\n';
      s += etiquetaFuerza(dir, 0, 'bsaVerde', '$R_{x' + escLatex(n.nombre) + '}$ (' + dec(Math.abs(rr.rx),'f') + '\\,' + unitFor + ')', 2.55);
    }
  }

  s += '\\fill[bsaAcc] (0,0) circle (2pt);\n';
  s += '\\node[font=\\small\\bfseries, above right, xshift=2pt, yshift=2pt] at (0,0) {' + escLatex(n.nombre) + '};\n';
  s += '\\path (-4.70,-4.40) rectangle (4.70,4.40);\n';   // marco invisible: mismo tamaño en todos los DCL
  return {tikz:s, angulos};
}

// ── Armadura completa reutilizable: geometría base + variantes ──
// opts: {fuerzas, reacciones, cotas, valores, factorCargas, resaltar}
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

  let s = '';
  barras.forEach(b=>{
    const na = nodos.find(x=>x.id===b.a), nb = nodos.find(x=>x.id===b.b);
    if(!na||!nb) return;
    const f = fuerzas[b.id]||0;
    const resaltada = opts.resaltar && opts.resaltar===b.id;
    const grosor = resaltada ? 3.2 : (0.8 + 1.4*Math.abs(f)/maxF);
    const col = resaltada ? 'bsaAlerta' : tikzColorFuerza(f);
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
      s += tikzFlechaCarga(n, tx, ty, factorCargas);
    }
  });
  if(opts.cotas){
    s += tikzCotas(tx, ty, minX, maxX, minY, maxY, esc);
  }
  return s;
}
// Arma el texto .tex y lo DEVUELVE (no descarga nada).
// Lo usan tanto descargarTex() como generarPDFLatex().
