// ══════════════════════════════════════════════════════════════════════
//  CÍRCULO DE MOHR DE INERCIA — lámina TikZ para el informe
// ══════════════════════════════════════════════════════════════════════
// Mismas convenciones que drawMohr() en pantalla, para que el alumno vea el
// mismo dibujo en la app y en el PDF:
//   · abscisas: momento de inercia I     · ordenadas: producto de inercia
//   · A = (Ix, Ixy) representa el eje x de la sección
//   · B = (Iy, -Ixy) representa el eje y; A y B son diametralmente opuestos,
//     de modo que el centro C del círculo cae en I_avg = (Ix+Iy)/2
//
// AVISO DE NOMBRES: el solucionador guarda el producto de inercia en el campo
// `Ixy`. En este archivo NO existe ningún `Pxy`: "P_xy" es solo la notación
// tipográfica del informe. Leer `r.Pxy` devolvería undefined y TODAS las
// coordenadas saldrían NaN sin que LaTeX se queje. La prueba
// "campo Ixy, nunca Pxy" de test_mohr10.js vigila exactamente esto.
//
// Devuelve solo el CUERPO del tikzpicture, como el resto de ayudantes tikz*:
// quien llama lo envuelve en \begin{center}\begin{tikzpicture}...
const MOHR_R_CM = 3.4;   // radio del círculo sobre el papel, en cm

function tikzMohr(r, u4, opts){
  if(!r) return '';
  opts = opts || {};
  // Notacion de los rotulos. Por defecto es la centroidal (con barra); con
  // opts.sub='P' pasa a ser la del punto P. El circulo se dibuja igual, pero
  // rotularlo con barras en la seccion del punto P diria que las inercias son
  // centroidales, que es justo lo contrario de lo que se acaba de calcular.
  const sub = opts.sub || '';
  const nIx = sub ? 'I_{x' + sub + '}'  : '\\bar{I}_x';
  const nIy = sub ? 'I_{y' + sub + '}'  : '\\bar{I}_y';
  const nPxy = sub ? 'P_{xy' + sub + '}' : '\\bar{P}_{xy}';
  const donde = sub ? 'en el punto $' + sub + '$' : 'sobre la secci\\\'on';
  const Ix = +r.Ix, Iy = +r.Iy, Ixy = +r.Ixy;
  if(!isFinite(Ix) || !isFinite(Iy) || !isFinite(Ixy)) return '';

  const avg = (Ix + Iy) / 2;
  const R   = Math.sqrt(Math.pow((Ix - Iy) / 2, 2) + Ixy * Ixy);

  // Círculo degenerado (Ix = Iy y producto nulo): se reduce a un punto y
  // cualquier eje por el centroide es principal. No hay lámina que dibujar;
  // el texto de la sección 6 lo explica en palabras.
  const tol = 1e-9 * Math.max(Math.abs(Ix), Math.abs(Iy), 1);
  if(R <= tol) return '';

  const esc = MOHR_R_CM / R;                  // inercia -> cm
  const rc  = MOHR_R_CM;
  const c   = v => (Math.abs(v) < 1e-12 ? 0 : v).toFixed(4);
  const num = v => (typeof ftex === 'function' ? ftex(v) : String(v));
  const uni = u4 ? ('\\ (' + (typeof utex === 'function' ? utex(u4) : u4) + ')') : '';

  // A y B sobre la circunferencia (|CA| = |CB| = R, y B = -A respecto de C)
  const ax = (Ix - avg) * esc, ay =  Ixy * esc;
  const bx = (Iy - avg) * esc, by = -Ixy * esc;

  // IDENTIDAD QUE SOSTIENE TODAS LAS ANOTACIONES DE ANGULO (comprobada en
  // test_mohr10.js sobre cinco casos):
  //
  //     alfa = angulo del radio C->A = atan2(Pxy, (Ix-Iy)/2)
  //     el solucionador calcula  theta_p = -0.5*atan2(2*Pxy, Ix-Iy) = -alfa/2
  //     luego   2*theta_p = -alfa
  //
  // El barrido que lleva del radio C->A hasta el eje I (sentido de I_max) vale
  // 2*theta_p CON SU SIGNO. Por eso el arco va de alfa a 0 y no al reves: asi
  // el numero rotulado coincide con el theta_p que la seccion 6 del informe
  // imprime unas lineas mas arriba.
  const alfa  = Math.atan2(Ixy, (Ix - Iy) / 2);           // radianes
  const aDeg  = alfa * 180 / Math.PI;
  const dosTh = -aDeg;                                    // 2*theta_p, grados
  const thP   = dosTh / 2;
  const gr    = a => (Math.abs(a) < 1e-12 ? 0 : a).toFixed(3);

  // Producto de inercia nulo: A cae exactamente sobre I_max (o sobre I_min si
  // Iy > Ix) y sus rotulos se pisan. Es el caso de toda seccion simetrica, o
  // sea el mas frecuente del curso: se rotula la coincidencia en vez de
  // superponer dos textos ilegibles.
  const coincMax = Math.abs(aDeg) < 0.5;
  const coincMin = Math.abs(180 - Math.abs(aDeg)) < 0.5;
  const yaPrincipales = coincMax || coincMin;
  const rotA = coincMax ? '$A \\equiv I_{max' + sub + '}$' : coincMin ? '$A \\equiv I_{min' + sub + '}$'
                        : '$A(' + nIx + ',\\ ' + nPxy + ')$';
  const rotB = coincMax ? '$B \\equiv I_{min' + sub + '}$' : coincMin ? '$B \\equiv I_{max' + sub + '}$'
                        : '$B(' + nIy + ',\\ -' + nPxy + ')$';
  // Colocación de rótulos con ancla + desplazamiento. NO se usa la sintaxis
  // "above right=2pt and 3pt": esa forma pertenece a la librería `positioning`,
  // que este preámbulo no carga, y pdflatex aborta con
  // "Unknown operator `a' or `an'". Ancla y shift son TikZ base.
  // El relleno blanco no es cosmético: cuando A o B caen cerca de x = ±R, la
  // guía punteada de I_min/I_max les pasa por encima del texto.
  const pos = (x, y) =>
    'anchor=' + (y >= 0 ? 'south' : 'north') + ' ' + (x >= 0 ? 'west' : 'east')
    + ', xshift=' + (x >= 0 ? '3pt' : '-3pt')
    + ', yshift=' + (y >= 0 ? '2pt' : '-2pt')
    + ', fill=white, inner sep=1.5pt';

  let s = '';

  // ── ejes ──────────────────────────────────────────────────────────────
  // El eje vertical se dibuja POR EL CENTRO, no por I = 0: en secciones
  // reales I_avg es varios órdenes mayor que R y el origen quedaría fuera
  // del papel. La marca de quiebre del eje horizontal avisa de ese corte.
  s += '  % ejes\n'
     + '  \\draw[->, bsaMuted] (' + c(-rc - 1.15) + ',0) -- (' + c(rc + 1.55) + ',0)\n'
     + '        node[right, font=\\scriptsize\\bfseries, text=bsaMuted] {$I' + uni + '$};\n'
     + '  \\draw[->, bsaMuted] (0,' + c(-rc - 0.42) + ') -- (0,' + c(rc + 1.05) + ')\n'
     + '        node[above, font=\\scriptsize\\bfseries, text=bsaMuted] {$' + nPxy + '$};\n';

  // marca de quiebre: el origen I = 0 no está representado
  const qb = -rc - 0.72;
  s += '  % quiebre del eje: el origen I = 0 queda fuera del dibujo\n';
  for(const d of [-0.09, 0.09]){
    s += '  \\draw[bsaMuted, line width=0.7pt] ('
       + c(qb + d - 0.07) + ',-0.15) -- (' + c(qb + d + 0.07) + ',0.15);\n';
  }

  // ── marcas y valores sobre el eje I ───────────────────────────────────
  // Los números van FUERA de la circunferencia, colgados de una guía
  // punteada. Colocados junto al eje quedaban dentro del círculo, flotando
  // sobre el dibujo y estorbando la lectura.
  s += '  % valores notables sobre el eje I, acotados bajo el dibujo\n';
  const yVal = -(rc + 0.62);
  const marcas = [
    { x: -rc, v: avg - R },
    { x:   0, v: avg     },
    { x:  rc, v: avg + R }
  ];
  for(const m of marcas){
    s += '  \\draw[bsaMuted] (' + c(m.x) + ',0.13) -- (' + c(m.x) + ',-0.13);\n'
       + '  \\draw[bsaMuted, dotted, line width=0.5pt] ('
       + c(m.x) + ',-0.13) -- (' + c(m.x) + ',' + c(yVal + 0.12) + ');\n'
       + '  \\node[font=\\tiny, text=bsaMuted, anchor=north, fill=white, inner sep=1pt] at ('
       + c(m.x) + ',' + c(yVal) + ') {$' + num(m.v) + '$};\n';
  }
  // Marcas del radio sobre el eje vertical. El relleno blanco es
  // imprescindible: la circunferencia pasa justo por (0, ±R) y sin él el
  // arco atraviesa el rótulo.
  for(const sg of [1, -1]){
    s += '  \\draw[bsaMuted] (-0.13,' + c(sg * rc) + ') -- (0.13,' + c(sg * rc) + ');\n'
       + '  \\node[font=\\tiny, text=bsaMuted, anchor=east, fill=white, inner sep=1pt] at (-0.20,'
       + c(sg * rc) + ') {$' + (sg > 0 ? '+R' : '-R') + '$};\n';
  }

  // ── circunferencia y centro ───────────────────────────────────────────
  s += '  % circunferencia de Mohr\n'
     + '  \\draw[bsaAcc, line width=1.1pt] (0,0) circle (' + c(rc) + ');\n'
     + '  \\fill[bsaAcc] (0,0) circle (1.8pt);\n'
     + '  \\node[font=\\scriptsize\\bfseries, text=bsaAcc, anchor=north, yshift=-3pt, fill=white, inner sep=1pt] at (0,0) {$C_M$};\n';

  // ── puntos A y B, y el diámetro que los une ──────────────────────────
  s += '  % A = eje x de la seccion ; B = eje y\n'
     + '  \\draw[bsaAlerta, dashed, line width=0.9pt] ('
     + c(ax) + ',' + c(ay) + ') -- (' + c(bx) + ',' + c(by) + ');\n'
     + '  \\fill[bsaAlerta] (' + c(ax) + ',' + c(ay) + ') circle (2.2pt);\n'
     + '  \\node[font=\\scriptsize\\bfseries, text=bsaAlerta, ' + pos(ax, ay)
     + '] at (' + c(ax) + ',' + c(ay) + ') {' + rotA + '};\n'
     + '  \\fill[bsaAlerta] (' + c(bx) + ',' + c(by) + ') circle (2.2pt);\n'
     + '  \\node[font=\\scriptsize\\bfseries, text=bsaAlerta, ' + pos(bx, by)
     + '] at (' + c(bx) + ',' + c(by) + ') {' + rotB + '};\n';

  // ── puntos principales ────────────────────────────────────────────────
  s += '  % momentos principales: los cortes del circulo con el eje I\n'
     + '  \\fill[bsaVerde] (' + c(rc) + ',0) circle (2.2pt);\n'
     + '  \\fill[bsaVerde] (' + c(-rc) + ',0) circle (2.2pt);\n';
  if(!yaPrincipales){
    s += '  \\node[font=\\scriptsize\\bfseries, text=bsaVerde, anchor=south west, xshift=3pt, yshift=3pt] at ('
       + c(rc) + ',0) {$I_{max' + sub + '}$};\n'
       + '  \\node[font=\\scriptsize\\bfseries, text=bsaVerde, anchor=south west, xshift=2pt, yshift=3pt] at ('
       + c(-rc) + ',0) {$I_{min' + sub + '}$};\n';
  }

  // ── giro de los ejes principales: el arco de 2*theta_p ────────────────
  // IDENTIDAD QUE SOSTIENE TODO ESTE BLOQUE (comprobada numericamente en
  // test_mohr10.js sobre cinco casos):
  //
  //     alfa = angulo del radio C->A = atan2(Pxy, (Ix-Iy)/2)
  //     el solucionador calcula  theta_p = -0.5*atan2(2*Pxy, Ix-Iy) = -alfa/2
  //     luego   2*theta_p = -alfa
  //
  // Es decir: el barrido que lleva del radio C->A hasta el eje I (sentido de
  // I_max) vale 2*theta_p CON SU SIGNO. Por eso el arco se dibuja de alfa a 0
  // y no al reves: asi el numero rotulado coincide con el theta_p que la
  // seccion 6 del informe imprime unas lineas mas arriba. Invertir el sentido
  // del arco produciria un dibujo que contradice su propio texto.
  // radio de referencia C->I_max: sobre el, el producto de inercia se anula
  s += '  % lados del angulo: radio C->I_max (referencia) y radio C->A\n'
     + '  \\draw[bsaRojo, line width=1.2pt] (0,0) -- (' + c(rc) + ',0);\n'
     + '  \\draw[bsaRojo, line width=1.2pt] (0,0) -- (' + c(ax) + ',' + c(ay) + ');\n';

  // Cota del radio sobre el tramo horizontal (|C I_max| = R por definicion).
  // Va SIEMPRE al lado contrario de donde cae A: colocada del mismo lado
  // chocaba con el rotulo del arco y con el de I_max.
  const ladoR = (alfa >= 0) ? -1 : 1;
  s += '  \\node[font=\\tiny, text=bsaRojo, anchor=' + (ladoR < 0 ? 'north' : 'south')
     + ', fill=white, inner sep=1pt] at ('
     + c(0.50 * rc) + ',' + c(ladoR * 0.13) + ') {$R = ' + num(R) + '$};\n';

  // El arco solo se dibuja si hay giro apreciable. Con alfa ~ 0 los ejes x-y
  // ya son principales: un arco de medio grado seria una mancha ilegible y el
  // veredicto del informe lo dice en palabras.
  if(Math.abs(dosTh) >= 0.5){
    const rr = 1.00;                                   // radio del arco, cm
    const aDeg = alfa * 180 / Math.PI;
    s += '  % arco de 2*theta_p, de C->A hacia el eje I\n'
       + '  \\draw[bsaRojo, line width=1.1pt, -{Latex[length=1.6mm]}] ('
       + c(rr * Math.cos(alfa)) + ',' + c(rr * Math.sin(alfa)) + ')\n'
       + '        arc (' + gr(aDeg) + ':0:' + c(rr) + ');\n';
    // El rotulo se ancla por su borde interior y crece hacia AFUERA. Centrado
    // sobre la bisectriz, su fondo blanco tapaba el propio arco que rotula:
    // solo asomaba la punta de flecha.
    const aMid = alfa / 2, rl = rr + 0.16;
    const hacia = Math.cos(aMid) >= 0 ? 'west' : 'east';
    s += '  \\node[font=\\tiny\\bfseries, text=bsaRojo, fill=white, inner sep=1.5pt, anchor='
       + hacia + '] at ('
       + c(rl * Math.cos(aMid)) + ',' + c(rl * Math.sin(aMid)) + ')\n'
       + '        {$2\\theta_p = ' + dosTh.toFixed(2) + '^\\circ$};\n';
  }

  // ── ejes girados por el usuario: puntos U y V sobre el MISMO circulo ──
  // IDENTIDAD (comprobada numericamente en test_seccion9.js): girar los ejes
  // un angulo theta mueve el punto representativo sobre la circunferencia un
  // arco de +2*theta desde A. No hace falta un segundo circulo: U y V son el
  // mismo diametro de antes, girado.
  //     angulo(U) = alfa + 2*theta ,  |U - C| = R
  if(opts.rot && isFinite(opts.rot.ang) && isFinite(opts.rot.Iu)){
    const rt = opts.rot;
    const ux = (rt.Iu - avg) * esc, uy =  rt.Iuv * esc;
    const vx = (rt.Iv - avg) * esc, vy = -rt.Iuv * esc;
    s += '  % ejes girados theta: puntos U y V sobre el mismo circulo\n'
       + '  \\draw[bsaAcc2, dashed, line width=0.9pt] (' + c(ux) + ',' + c(uy)
       + ') -- (' + c(vx) + ',' + c(vy) + ');\n'
       + '  \\fill[bsaAcc2] (' + c(ux) + ',' + c(uy) + ') circle (2.2pt);\n'
       + '  \\node[font=\\scriptsize\\bfseries, text=bsaAcc2, ' + pos(ux, uy)
       + '] at (' + c(ux) + ',' + c(uy) + ') {$U(I_u,\\ P_{uv})$};\n'
       + '  \\fill[bsaAcc2] (' + c(vx) + ',' + c(vy) + ') circle (2.2pt);\n'
       + '  \\node[font=\\scriptsize\\bfseries, text=bsaAcc2, ' + pos(vx, vy)
       + '] at (' + c(vx) + ',' + c(vy) + ') {$V(I_v,\\ -P_{uv})$};\n'
       + '  \\draw[bsaAcc2, line width=1.1pt] (0,0) -- (' + c(ux) + ',' + c(uy) + ');\n';
    // arco de 2*theta, de A hasta U
    if(Math.abs(rt.ang) >= 0.25){
      const rrU = 1.75, aA = aDeg, aU = aDeg + 2 * rt.ang;
      s += '  \\draw[bsaAcc2, line width=1pt, -{Latex[length=1.6mm]}] ('
         + c(rrU * Math.cos(alfa)) + ',' + c(rrU * Math.sin(alfa)) + ')\n'
         + '        arc (' + gr(aA) + ':' + gr(aU) + ':' + c(rrU) + ');\n';
      const aM = (aA + aU) / 2 * Math.PI / 180, rlU = rrU + 0.16;
      s += '  \\node[font=\\tiny\\bfseries, text=bsaAcc2, fill=white, inner sep=1.5pt, anchor='
         + (Math.cos(aM) >= 0 ? 'west' : 'east') + '] at ('
         + c(rlU * Math.cos(aM)) + ',' + c(rlU * Math.sin(aM)) + ')\n'
         + '        {$2\\theta = ' + (2 * rt.ang).toFixed(2) + '^\\circ$};\n';
    }
  }

  // nota al pie: lo que el alumno tiene que llevarse del dibujo
  s += '  \\node[font=\\scriptsize, text=bsaRojo, anchor=north, text width=9.5cm, align=center] at (0,'
     + c(-(rc + 1.30)) + ')\n'
     + '        {' + (yaPrincipales
         ? 'El producto de inercia es nulo ' + donde + ': los ejes $x$ e $y$ YA son principales '
           + '($\\theta_p = 0^\\circ$),\\\\ y por eso $A$ y $B$ caen sobre el eje $I$.'
         : 'Los ejes principales ' + donde + ' giran $\\theta_p = '
           + thP.toFixed(2) + '^\\circ$;\\\\ en el c\\\'irculo ese giro se mide duplicado.')
     + '};\n';

  return s;
}


// ── Fórmulas simbólicas y su sustitución, por tipo de figura ──
// Se muestran las dos: primero la expresión literal (que es lo que el alumno
// debe recordar) y después la misma con los números metidos.
function formulaArea(fig){
  const d = fig.dims, D = v => decP(v,'len');
  switch(fig.type){
    case 'rect':
      return {sim:'A_i = b\\,h', sus:'A_i = ('+D(d.b)+')('+D(d.h)+')'};
    case 'rtriangle': case 'rtriangle2':
      return {sim:'A_i = \\dfrac{b\\,h}{2}', sus:'A_i = \\dfrac{('+D(d.b)+')('+D(d.h)+')}{2}'};
    case 'circle':
      return {sim:'A_i = \\pi R^{2}', sus:'A_i = \\pi ('+D(d.r)+')^{2}'};
    case 'semicircle':
      return {sim:'A_i = \\dfrac{\\pi R^{2}}{2}', sus:'A_i = \\dfrac{\\pi ('+D(d.r)+')^{2}}{2}'};
    case 'quarter':
      return {sim:'A_i = \\dfrac{\\pi R^{2}}{4}', sus:'A_i = \\dfrac{\\pi ('+D(d.r)+')^{2}}{4}'};
    case 'sector':
      return {sim:'A_i = \\theta R^{2} \\quad (\\theta \\text{ en radianes})',
              sus:'A_i = \\left('+D(d.alpha)+'^\\circ\\cdot\\dfrac{\\pi}{180}\\right)('+D(d.r)+')^{2}'};
    case 'wshape':
      return {sim:'A_i = 2\\,b_f t_f + (d-2t_f)\\,t_w',
              sus:'A_i = 2('+D(d.bf)+')('+D(d.tf)+') + ('+D(d.d)+'-2('+D(d.tf)+'))('+D(d.tw)+')'};
    case 'channel':
      return {sim:'A_i = d\\,t_w + 2(b_f-t_w)\\,t_f',
              sus:'A_i = ('+D(d.d)+')('+D(d.tw)+') + 2('+D(d.bf)+'-'+D(d.tw)+')('+D(d.tf)+')'};
    case 'angleL':
      return {sim:'A_i = t\\,b_2 + (b_1-t)\\,t',
              sus:'A_i = ('+D(d.t)+')('+D(d.b2)+') + ('+D(d.b1)+'-'+D(d.t)+')('+D(d.t)+')'};
    default:
      return {sim:'A_i', sus:'A_i'};
  }
}

// Posición del centroide dentro de la propia figura, cuando no es el centro.
function centroideLocalTex(fig){
  const d = fig.dims, D = v => decP(v,'len');
  switch(fig.type){
    case 'rtriangle': case 'rtriangle2':
      return '\\text{Centroide propio a } \\tfrac{b}{3} \\text{ y } \\tfrac{h}{3}'
           + ' \\text{ de los catetos: } \\tfrac{'+D(d.b)+'}{3}='+D(d.b/3)
           + ',\\ \\tfrac{'+D(d.h)+'}{3}='+D(d.h/3);
    case 'semicircle':
      return '\\bar{y}_{loc} = \\dfrac{4R}{3\\pi} = \\dfrac{4('+D(d.r)+')}{3\\pi} = ' + D(4*d.r/(3*Math.PI));
    case 'quarter':
      return '\\bar{x}_{loc} = \\bar{y}_{loc} = \\dfrac{4R}{3\\pi} = ' + D(4*d.r/(3*Math.PI));
    case 'sector': {
      const t = d.alpha*Math.PI/180;
      return '\\bar{y}_{loc} = \\dfrac{2R\\sen\\theta}{3\\theta} = '
           + '\\dfrac{2('+D(d.r)+')\\sen('+D(d.alpha)+'^\\circ)}{3('+D(d.alpha)+'^\\circ)} = '
           + D(2*d.r*Math.sin(t)/(3*t));
    }
    default: return null;   // rectángulo, círculo y perfiles: el centroide es el centro
  }
}

// ── Inercias PROPIAS de cada tipo, sobre sus ejes centroidales sin girar ──
// Devuelve la fórmula literal y la sustituida para Ix, Iy y el producto Pxy.
// Los perfiles laminados y el ángulo L no tienen una expresión corta, así que
// se declaran como suma de rectángulos y se da el valor.
function formulaInercia(fig){
  const d = fig.dims, D = v => decP(v,'len');
  const F = (sx,ux,sy,uy,sp,up) => ({ix:{sim:sx,sus:ux}, iy:{sim:sy,sus:uy}, ixy:{sim:sp,sus:up}});
  switch(fig.type){
    case 'rect':
      return F('\\bar{I}_{x} = \\dfrac{b\\,h^{3}}{12}', '\\dfrac{('+D(d.b)+')('+D(d.h)+')^{3}}{12}',
               '\\bar{I}_{y} = \\dfrac{h\\,b^{3}}{12}', '\\dfrac{('+D(d.h)+')('+D(d.b)+')^{3}}{12}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{dos ejes de simetr\\\'ia})', '0');
    case 'rtriangle': case 'rtriangle2':
      return F('\\bar{I}_{x} = \\dfrac{b\\,h^{3}}{36}', '\\dfrac{('+D(d.b)+')('+D(d.h)+')^{3}}{36}',
               '\\bar{I}_{y} = \\dfrac{h\\,b^{3}}{36}', '\\dfrac{('+D(d.h)+')('+D(d.b)+')^{3}}{36}',
               '\\bar{P}_{xy} = \\pm\\dfrac{b^{2}h^{2}}{72}', '\\pm\\dfrac{('+D(d.b)+')^{2}('+D(d.h)+')^{2}}{72}');
    case 'circle':
      return F('\\bar{I}_{x} = \\dfrac{\\pi R^{4}}{4}', '\\dfrac{\\pi ('+D(d.r)+')^{4}}{4}',
               '\\bar{I}_{y} = \\dfrac{\\pi R^{4}}{4}', '\\dfrac{\\pi ('+D(d.r)+')^{4}}{4}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{secci\\\'on circular})', '0');
    case 'semicircle':
      return F('\\bar{I}_{x} = \\left(\\dfrac{\\pi}{8}-\\dfrac{8}{9\\pi}\\right)R^{4}',
               '\\left(\\dfrac{\\pi}{8}-\\dfrac{8}{9\\pi}\\right)('+D(d.r)+')^{4}',
               '\\bar{I}_{y} = \\dfrac{\\pi R^{4}}{8}', '\\dfrac{\\pi ('+D(d.r)+')^{4}}{8}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{eje vertical de simetr\\\'ia})', '0');
    case 'quarter':
      return F('\\bar{I}_{x} = \\left(\\dfrac{\\pi}{16}-\\dfrac{4}{9\\pi}\\right)R^{4}',
               '\\left(\\dfrac{\\pi}{16}-\\dfrac{4}{9\\pi}\\right)('+D(d.r)+')^{4}',
               '\\bar{I}_{y} = \\left(\\dfrac{\\pi}{16}-\\dfrac{4}{9\\pi}\\right)R^{4}',
               '\\left(\\dfrac{\\pi}{16}-\\dfrac{4}{9\\pi}\\right)('+D(d.r)+')^{4}',
               '\\bar{P}_{xy} = \\left(\\dfrac{1}{8}-\\dfrac{4}{9\\pi}\\right)R^{4}',
               '\\left(\\dfrac{1}{8}-\\dfrac{4}{9\\pi}\\right)('+D(d.r)+')^{4}');
    case 'sector':
      return F('\\bar{I}_{x} = \\dfrac{R^{4}}{4}\\left(\\theta-\\sen\\theta\\cos\\theta\\right) - A\\,\\bar{y}_{loc}^{2}',
               '\\text{con } R='+D(d.r)+',\\ \\theta='+D(d.alpha)+'^\\circ',
               '\\bar{I}_{y} = \\dfrac{R^{4}}{4}\\left(\\theta+\\sen\\theta\\cos\\theta\\right)',
               '\\text{con } R='+D(d.r)+',\\ \\theta='+D(d.alpha)+'^\\circ',
               '\\bar{P}_{xy} = 0 \\quad (\\text{eje vertical de simetr\\\'ia})', '0');
    case 'wshape':
      return F('\\bar{I}_{x} = \\dfrac{b_f d^{3} - (b_f-t_w)(d-2t_f)^{3}}{12}',
               '\\text{con } b_f='+D(d.bf)+',\\ d='+D(d.d)+',\\ t_f='+D(d.tf)+',\\ t_w='+D(d.tw),
               '\\bar{I}_{y} = \\dfrac{2\\,t_f b_f^{3} + (d-2t_f)\\,t_w^{3}}{12}',
               '\\text{con los mismos datos}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{doble simetr\\\'ia})', '0');
    case 'channel':
      return F('\\bar{I}_{x} = \\sum \\left(\\bar{I}_{x_j} + A_j\\,d_{y_j}^{2}\\right)',
               '\\text{descomponiendo el canal en alma y dos alas}',
               '\\bar{I}_{y} = \\sum \\left(\\bar{I}_{y_j} + A_j\\,d_{x_j}^{2}\\right)',
               '\\text{medido desde } \\bar{x} \\text{ del canal}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{simetr\\\'ia respecto a } x)', '0');
    case 'angleL':
      return F('\\bar{I}_{x} = \\sum \\left(\\bar{I}_{x_j} + A_j\\,d_{y_j}^{2}\\right)',
               '\\text{descomponiendo el \\\'angulo en dos rect\\\'angulos}',
               '\\bar{I}_{y} = \\sum \\left(\\bar{I}_{y_j} + A_j\\,d_{x_j}^{2}\\right)',
               '\\text{con el mismo reparto}',
               '\\bar{P}_{xy} = \\sum A_j\\,d_{x_j} d_{y_j} \\ne 0',
               '\\text{el \\\'angulo L no tiene eje de simetr\\\'ia}');
    default:
      return F('\\bar{I}_{x}','','\\bar{I}_{y}','','\\bar{P}_{xy}','');
  }
}

// ── Croquis acotado de UNA figura, con su ángulo de giro si lo tiene ──

// ── Caja envolvente REAL de una figura, en sus ejes locales ──
// Para los polígonos coincide con FIG_DEFS.bounds. Para el sector circular no:
// su bounds declarado ignora la apertura angular, así que las cotas del croquis
// salían del tamaño equivocado y cruzaban el dibujo.
function cajaCroquis(fig){
  const d = fig.dims;
  if(fig.type === 'sector'){
    const th = d.alpha*Math.PI/180, R = d.r;
    const yc = 2*R*Math.sin(th)/(3*th);          // centroide sobre la bisectriz
    const medio = (d.alpha >= 90) ? R : R*Math.sin(th);
    const arriba = R - yc;                        // el arco pasa por la vertical
    const abajo  = (d.alpha >= 90) ? (R*Math.cos(th) - yc) : -yc;
    return {left:-medio, right:medio, bottom:abajo, top:arriba};
  }
  return FIG_DEFS[fig.type].bounds(d);
}

function tikzCroquisFigura(fig, anchoCm){
  const b = cajaCroquis(fig);
  const bw = Math.max(b.right-b.left, 1e-9), bh = Math.max(b.top-b.bottom, 1e-9);
  const W = anchoCm || 3.6, H = 3.0;
  const esc = Math.min((W-1.1)/bw, (H-1.0)/bh);
  const cxm = (b.left+b.right)/2, cym = (b.bottom+b.top)/2;
  const tx = x => (x-cxm)*esc;
  const ty = y => (y-cym)*esc;
  const n = v => v.toFixed(3);
  const col = hexRgbSpec(fig.color);
  const neg = fig.sign < 0;

  // El origen local de la figura es su CENTROIDE, que en general no coincide con
  // el centro de la caja envolvente (el triángulo es el caso claro).
  const ox = tx(0), oy = ty(0);

  let s = '\\begin{tikzpicture}[scale=1]\n';
  s += '\\begin{scope}[shift={(' + n(ox) + ',' + n(oy) + ')}, scale=' + esc.toFixed(4) + ']\n';
  s += '\\path[' + (neg
        ? 'pattern=north east lines, pattern color={'+col+'}, draw={'+col+'}, line width=0.7pt, dashed'
        : 'fill={'+col+'}, fill opacity=0.28, draw={'+col+'}, line width=0.8pt') + '] ';
  s += figuraPathLocal(fig.type, fig.dims) + ';\n';
  s += '\\end{scope}\n';

  s += '\\fill[bsaAlerta] (' + n(ox) + ',' + n(oy) + ') circle (1.4pt);\n';
  s += '\\node[font=\\tiny, above right, inner sep=1pt] at (' + n(ox) + ',' + n(oy) + ') {$C_i$};\n';

  // ── Cotas de ancho y alto ──
  const x0 = tx(b.left), x1 = tx(b.right);
  const y0 = ty(b.bottom), y1 = ty(b.top);
  const yc = y0 - 0.34, xc = x1 + 0.34;
  const T = v => n(v);
  s += '\\draw[black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt] ('+T(x0)+','+T(y0)+') -- ('+T(x0)+','+T(yc-0.08)+');\n';
  s += '\\draw[black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt] ('+T(x1)+','+T(y0)+') -- ('+T(x1)+','+T(yc-0.08)+');\n';
  s += '\\draw[black!65, line width=0.3pt, <->, >=stealth] ('+T(x0)+','+T(yc)+') -- ('+T(x1)+','+T(yc)+');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt] at ('+T((x0+x1)/2)+','+T(yc)+') {'+decP(bw,'len')+'};\n';
  s += '\\draw[black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt] ('+T(x1)+','+T(y0)+') -- ('+T(xc+0.08)+','+T(y0)+');\n';
  s += '\\draw[black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt] ('+T(x1)+','+T(y1)+') -- ('+T(xc+0.08)+','+T(y1)+');\n';
  s += '\\draw[black!65, line width=0.3pt, <->, >=stealth] ('+T(xc)+','+T(y0)+') -- ('+T(xc)+','+T(y1)+');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt, rotate=90] at ('+T(xc)+','+T((y0+y1)/2)+') {'+decP(bh,'len')+'};\n';

  // ── Ángulo de giro ──
  // Se dibuja el eje x local sin girar, el girado, y el arco entre ambos: es el
  // ángulo con el que se rotan las inercias propias.
  const g = fig.rotation || 0;
  if(Math.abs(g) >= 0.5){
    const R = Math.min(0.55, Math.abs(x1-x0)/2.4);
    s += '\\draw[black!65, line width=0.3pt, ->, >=stealth] ('+n(ox)+','+n(oy)+') -- ('+n(ox+R+0.30)+','+n(oy)+');\n';
    s += '\\draw[black!65, line width=0.3pt] ('+n(ox)+','+n(oy)+') -- ('
       + n(ox+(R+0.30)*Math.cos(g*Math.PI/180)) + ',' + n(oy+(R+0.30)*Math.sin(g*Math.PI/180)) + ');\n';
    s += '\\draw[black!65, line width=0.3pt, ->, >=stealth] ('+n(ox+R)+','+n(oy)+') arc (0:'+g.toFixed(2)+':'+n(R)+');\n';

    // La variable se coloca en un hueco libre: en el rectángulo caía justo sobre
    // la cota de altura. Se reutiliza el colocador, con las dos cotas como
    // obstáculos.
    const anclaX = ox + (R+0.14)*Math.cos(g*Math.PI/360);
    const anclaY = oy + (R+0.14)*Math.sin(g*Math.PI/360);
    const obst = [
      {x:(x0+x1)/2 - 0.42, y:yc - 0.13, w:0.84, h:0.26},
      {x:xc - 0.13, y:(y0+y1)/2 - 0.42, w:0.26, h:0.84},
      {x:xc - 0.10, y:y0, w:0.20, h:y1-y0},
      {x:x0, y:yc - 0.10, w:x1-x0, h:0.20}
    ];
    const puesto = planCallouts(
      [{txt:'\\beta', ancla:{x:anclaX, y:anclaY}, w:0.30, h:0.26}],
      obst, null, [0.16, 0.28, 0.42, 0.58, 0.76])[0];
    const dd = Math.hypot(puesto.cx-anclaX, puesto.cy-anclaY);
    if(dd > 0.30){
      s += '\\draw[black!45, line width=0.22pt] ('+n(puesto.cx)+','+n(puesto.cy)+') -- ('+n(anclaX)+','+n(anclaY)+');\n';
    }
    s += '\\node[font=\\small, inner sep=1pt] at ('+n(puesto.cx)+','+n(puesto.cy)+') {$\\beta$};\n';
  }
  s += '\\end{tikzpicture}';
  return s;
}
