// ══════════════════════════════════════════════════════════════════════
//  PUNTO P ACOTADO Y EJES GIRADOS EN P
// ══════════════════════════════════════════════════════════════════════
// Esta lamina acota UNICAMENTE el punto insertado, y como variables. La
// cadena de cotas de la seccion y el centroide no aparecen: aqui lo que se
// explica es donde esta P y cuanto giran sus ejes.
function tikzPuntoPyEjes(caja, tx, ty){
  if(!extraPoint) return '';
  const n = v => (Math.abs(v) < 1e-12 ? 0 : v).toFixed(3);
  const px = x => parseFloat(tx(x));
  const py = y => parseFloat(ty(y));
  const ox = px(0), oy = py(0);
  const pxp = px(extraPoint.x), pyp = py(extraPoint.y);
  let s = '';

  // cotas de P, apoyadas fuera de la caja completa
  const yC = Math.min(oy, py(caja.bottom)) - 0.75;
  const xC = Math.min(ox, px(caja.left))   - 0.75;
  s += '\\draw[black!35, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] ('
     + n(pxp) + ',' + n(pyp) + ') -- (' + n(pxp) + ',' + n(yC-0.10) + ');\n'
     + '\\draw[bsaRojo, line width=0.45pt, <->, >=stealth] (' + n(ox) + ',' + n(yC)
     + ') -- (' + n(pxp) + ',' + n(yC) + ');\n'
     + '\\node[font=\\small, above, inner sep=1.6pt] at (' + n((ox+pxp)/2) + ',' + n(yC) + ') {$x_P$};\n';
  s += '\\draw[black!35, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] ('
     + n(pxp) + ',' + n(pyp) + ') -- (' + n(xC-0.10) + ',' + n(pyp) + ');\n'
     + '\\draw[bsaRojo, line width=0.45pt, <->, >=stealth] (' + n(xC) + ',' + n(oy)
     + ') -- (' + n(xC) + ',' + n(pyp) + ');\n'
     + '\\node[font=\\small, rotate=90, above, inner sep=1.6pt] at (' + n(xC) + ',' + n((oy+pyp)/2) + ') {$y_P$};\n';

  // ── ejes en P: primero los PRINCIPALES, luego los girados por el usuario ──
  // Los principales van siempre que haya punto: son la referencia contra la
  // que se lee cualquier giro. Sin ellos, la lamina muestra unos ejes torcidos
  // sin decir respecto de que estan torcidos.
  const ancho = px(caja.right) - px(caja.left);
  const alto  = py(caja.top)   - py(caja.bottom);
  const L = 0.55 * Math.max(ancho, alto, 1);
  const epP = (typeof computeExtraPoint === 'function' && results)
    ? computeExtraPoint(results) : null;
  const rrBase = Math.min(0.30 * L, 1.1);
  let rMax = 0;   // alcance del arco mas exterior, para la linea de referencia

  const dibujarPar = (angGrados, etU, etV, col, escala) => {
    const a0 = angGrados * Math.PI / 180;
    let out = '';
    for(const e of [{a: a0, et: etU}, {a: a0 + Math.PI/2, et: etV}]){
      const dx = escala*L*Math.cos(e.a), dy = escala*L*Math.sin(e.a);
      out += '\\draw[' + col + ', line width=0.9pt, dash pattern=on 4pt off 2pt, ->, >=stealth] ('
        + n(pxp - dx) + ',' + n(pyp - dy) + ') -- (' + n(pxp + dx) + ',' + n(pyp + dy) + ')\n'
        + '      node[' + (Math.cos(e.a) >= 0 ? 'right' : 'left')
        + ', font=\\scriptsize\\bfseries, text=' + col
        + ', fill=white, inner sep=1.5pt] {$' + e.et + '$};\n';
    }
    return out;
  };
  const dibujarArco = (angGrados, etiqueta, col, radio) => {
    if(Math.abs(angGrados % 360) < 0.5) return '';
    rMax = Math.max(rMax, radio);
    const am = angGrados * Math.PI / 360, rl = radio + 0.36;
    return '\\draw[' + col + ', line width=0.9pt, ->, >=stealth] ('
      + n(pxp + radio) + ',' + n(pyp) + ')\n'
      + '      arc (0:' + n(angGrados) + ':' + n(radio) + ');\n'
      + '\\node[font=\\tiny\\bfseries, text=' + col + ', fill=white, inner sep=1.5pt] at ('
      + n(pxp + rl*Math.cos(am)) + ',' + n(pyp + rl*Math.sin(am)) + ') {$' + etiqueta + '$};\n';
  };

  let ejesTex = '';
  if(epP && isFinite(epP.thetaP)){
    ejesTex += dibujarPar(epP.thetaP, 'u_P\\ (I_{maxP})', 'v_P\\ (I_{minP})', 'bsaVerde', 1);
    ejesTex += dibujarArco(epP.thetaP, '\\theta_{pP}', 'bsaVerde', rrBase);
  }
  if(axisAngle !== null && isFinite(axisAngle)){
    // Los girados por el usuario van en el azul de U y V del circulo de Mohr:
    // son el mismo par de ejes, visto en la seccion en vez de en el circulo.
    ejesTex += dibujarPar(axisAngle, 'u', 'v', 'bsaAcc2', 0.82);
    ejesTex += dibujarArco(axisAngle, '\\theta', 'bsaAcc2', rrBase * 1.75);
  }
  if(ejesTex){
    // Referencia horizontal desde P: el eje x pasa por el origen, no por P,
    // asi que sin ella los arcos saldrian de la nada. Se traza ANTES de los
    // ejes para que estos queden encima, y llega hasta el arco mas exterior.
    if(rMax > 0){
      s += '\\draw[black, line width=1.1pt, dash pattern=on 5pt off 3pt] ('
         + n(pxp) + ',' + n(pyp) + ') -- (' + n(pxp + 1.35*rMax) + ',' + n(pyp) + ');\n';
    }
    s += ejesTex;
  }

  s += '\\fill[bsaRojo] (' + n(pxp) + ',' + n(pyp) + ') circle (2.2pt);\n';
  s += '\\node[font=\\small\\bfseries, text=bsaRojo, above right, xshift=2pt, fill=white, inner sep=1pt] at ('
     + n(pxp) + ',' + n(pyp) + ') {$P$};\n';
  return s;
}
