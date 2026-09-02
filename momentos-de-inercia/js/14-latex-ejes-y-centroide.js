// ══════════════════════════════════════════════════════════════════════
//  EJES X-Y Y COTAS DEL CENTROIDE  (portado de cap9)
// ══════════════════════════════════════════════════════════════════════
// Las cotas se rotulan como VARIABLES ($\bar{x}_C$, $\bar{y}_C$), no con su
// valor: los numeros van debajo de la lamina. Una cota con el numero encima
// obliga a elegir cuantas cifras caben, y en secciones reales (10^8 mm^4)
// no cabe ninguna sin pisar la linea.
function tikzEjesYCotasC(caja, tx, ty, conCotas){
  const n = v => (typeof v === 'number' ? v : parseFloat(v)).toFixed(3);
  const px = x => parseFloat(tx(x));
  const py = y => parseFloat(ty(y));
  const x0 = px(Math.min(0, caja.left))  - 0.9;
  const x1 = px(caja.right)  + 0.7;
  const y0 = py(Math.min(0, caja.bottom)) - 0.9;
  const y1 = py(caja.top)    + 0.7;
  const ox = px(0), oy = py(0);
  let s = '';

  s += '\\draw[black!70, line width=0.5pt, ->, >=stealth] (' + n(x0) + ',' + n(oy) + ') -- (' + n(x1) + ',' + n(oy) + ') node[right, font=\\small] {$x$};\n';
  s += '\\draw[black!70, line width=0.5pt, ->, >=stealth] (' + n(ox) + ',' + n(y0) + ') -- (' + n(ox) + ',' + n(y1) + ') node[above, font=\\small] {$y$};\n';
  s += '\\node[font=\\scriptsize, below left, inner sep=1pt] at (' + n(ox) + ',' + n(oy) + ') {$O$};\n';
  if(!conCotas || !results) return s;

  const cxp = px(results.xbar), cyp = py(results.ybar);
  // Las lineas de cota se apoyan FUERA de la caja completa, no a 0.75 cm del
  // origen: en cap9 el origen cae en la esquina inferior izquierda, pero aqui
  // puede quedar DENTRO de la seccion y entonces la cota de la ordenada se
  // dibuja encima de las figuras y no se lee.
  const yCota = Math.min(oy, py(caja.bottom)) - 0.75;
  const xCota = Math.min(ox, px(caja.left))   - 0.75;
  // abscisa
  s += '\\draw[black!35, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(cxp) + ',' + n(cyp) + ') -- (' + n(cxp) + ',' + n(yCota-0.10) + ');\n';
  s += '\\draw[bsaAlerta, line width=0.45pt, <->, >=stealth] (' + n(ox) + ',' + n(yCota) + ') -- (' + n(cxp) + ',' + n(yCota) + ');\n';
  s += '\\node[font=\\small, above, inner sep=1.6pt] at (' + n((ox+cxp)/2) + ',' + n(yCota) + ') {$\\bar{x}_C$};\n';
  // ordenada: rotate=90 la deja vertical y 'above' la aparta al lado izquierdo
  // de la cota ya girada, asi se lee de abajo arriba sin montar sobre la linea.
  s += '\\draw[black!35, line width=0.22pt, dash pattern=on 1.4pt off 1.4pt] (' + n(cxp) + ',' + n(cyp) + ') -- (' + n(xCota-0.10) + ',' + n(cyp) + ');\n';
  s += '\\draw[bsaAlerta, line width=0.45pt, <->, >=stealth] (' + n(xCota) + ',' + n(oy) + ') -- (' + n(xCota) + ',' + n(cyp) + ');\n';
  s += '\\node[font=\\small, rotate=90, above, inner sep=1.6pt] at (' + n(xCota) + ',' + n((oy+cyp)/2) + ') {$\\bar{y}_C$};\n';
  return s;
}
