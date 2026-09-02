// ══════════════════════════════════════════════════════════════════════
//  EJES PRINCIPALES u-v SOBRE LA SECCION
// ══════════════════════════════════════════════════════════════════════
// Giran theta_p respecto de x-y y pasan por el centroide. Convencion del
// solucionador: theta_p = -0.5*atan2(2*Pxy, Ix-Iy), y sobre el eje u
// (angulo theta_p medido desde x, positivo antihorario) la inercia vale
// I_max. Comprobado numericamente en test_seccion7.js contra rotateInertia.
function tikzEjesPrincipales(caja, tx, ty){
  if(!results || !isFinite(results.thetaP)) return '';
  const n = v => (Math.abs(v) < 1e-12 ? 0 : v).toFixed(3);
  const px = x => parseFloat(tx(x));
  const py = y => parseFloat(ty(y));
  const cx = px(results.xbar), cy = py(results.ybar);
  const ancho = px(caja.right) - px(caja.left);
  const alto  = py(caja.top)   - py(caja.bottom);
  const L = 0.62 * Math.max(ancho, alto, 1);   // semilongitud de los ejes, cm
  const th = results.thetaP * Math.PI / 180;
  const ejes = [
    { a: th,               et: 'u', sub: 'max', col: 'bsaVerde' },
    { a: th + Math.PI / 2, et: 'v', sub: 'min', col: 'bsaAcc2'  }
  ];
  let s = '';
  for(const e of ejes){
    const dx = L * Math.cos(e.a), dy = L * Math.sin(e.a);
    // El nombre del eje y su inercia van juntos en la punta de la flecha. Un
    // rotulo suelto a media longitud caia sobre el propio eje o sobre las
    // figuras, segun el giro.
    s += '\\draw[' + e.col + ', line width=0.9pt, dash pattern=on 4pt off 2pt, ->, >=stealth] ('
       + n(cx - dx) + ',' + n(cy - dy) + ') -- (' + n(cx + dx) + ',' + n(cy + dy) + ')\n'
       + '      node[' + (Math.cos(e.a) >= 0 ? 'right' : 'left')
       + ', font=\\scriptsize\\bfseries, text=' + e.col
       + ', fill=white, inner sep=1.5pt] {$' + e.et + '\\ (I_{' + e.sub + '})$};\n';
  }
  // arco de theta_p entre el eje x y el eje u
  if(Math.abs(results.thetaP) >= 0.5){
    const rr = Math.min(0.30 * L, 1.1);
    // Referencia horizontal desde C. Sin ella el arco sale de la nada: el eje
    // x pasa por el origen, no por el centroide, asi que no hay ninguna linea
    // visible en C desde la que se pueda leer el giro.
    s += '\\draw[black, line width=1.1pt, dash pattern=on 5pt off 3pt] ('
       + n(cx) + ',' + n(cy) + ') -- (' + n(cx + 1.55*rr) + ',' + n(cy) + ');\n';
    s += '\\draw[bsaRojo, line width=0.9pt, ->, >=stealth] ('
       + n(cx + rr) + ',' + n(cy) + ')\n'
       + '      arc (0:' + n(results.thetaP) + ':' + n(rr) + ');\n';
    const am = th / 2, rl = rr + 0.36;
    s += '\\node[font=\\tiny\\bfseries, text=bsaRojo, fill=white, inner sep=1.5pt] at ('
       + n(cx + rl*Math.cos(am)) + ',' + n(cy + rl*Math.sin(am)) + ') {$\\theta_p$};\n';
  }
  // el centroide, encima de todo
  s += '\\fill[bsaAlerta] (' + n(cx) + ',' + n(cy) + ') circle (2pt);\n';
  s += '\\node[font=\\small\\bfseries, text=bsaAlerta, above right, xshift=2pt, fill=white, inner sep=1pt] at ('
     + n(cx) + ',' + n(cy) + ') {$C$};\n';
  return s;
}
