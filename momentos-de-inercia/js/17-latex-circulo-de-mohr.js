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
       + '        {$2\\theta_p = ' + decP(dosTh,'ang') + '^\\circ$};\n';
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
         + '        {$2\\theta = ' + decP(2 * rt.ang,'ang') + '^\\circ$};\n';
    }
  }

  // nota al pie: lo que el alumno tiene que llevarse del dibujo
  s += '  \\node[font=\\scriptsize, text=bsaRojo, anchor=north, text width=9.5cm, align=center] at (0,'
     + c(-(rc + 1.30)) + ')\n'
     + '        {' + (yaPrincipales
         ? 'El producto de inercia es nulo ' + donde + ': los ejes $x$ e $y$ YA son principales '
           + '($\\theta_p = ' + decP(thP,'ang') + '^\\circ$),\\\\ y por eso $A$ y $B$ caen sobre el eje $I$.'
         : 'Los ejes principales ' + donde + ' giran $\\theta_p = '
           + decP(thP,'ang') + '^\\circ$;\\\\ en el c\\\'irculo ese giro se mide duplicado.')
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
              sus:'A_i = \\left('+decP(d.alpha,'ang')+'^\\circ\\cdot\\dfrac{\\pi}{180}\\right)('+D(d.r)+')^{2}'};
    case 'parabola':
      return {sim:'A_i = \\dfrac{2\\,b\\,h}{3}', sus:'A_i = \\dfrac{2('+D(d.b)+')('+D(d.h)+')}{3}'};
    case 'semiparabola':
      return {sim:'A_i = \\dfrac{2\\,a\\,h}{3}', sus:'A_i = \\dfrac{2('+D(d.a)+')('+D(d.h)+')}{3}'};
    case 'enjuta':
      return {sim:'A_i = \\dfrac{a\\,h}{3}', sus:'A_i = \\dfrac{('+D(d.a)+')('+D(d.h)+')}{3}'};
    case 'cuartoelipse':
      return {sim:'A_i = \\dfrac{\\pi\\,a\\,b}{4}', sus:'A_i = \\dfrac{\\pi ('+D(d.a)+')('+D(d.b)+')}{4}'};
    case 'elipse':
      return {sim:'A_i = \\pi\\,a\\,b', sus:'A_i = \\pi ('+D(d.a)+')('+D(d.b)+')'};
    case 'semielipse':
      return {sim:'A_i = \\dfrac{\\pi\\,a\\,b}{2}', sus:'A_i = \\dfrac{\\pi ('+D(d.a)+')('+D(d.b)+')}{2}'};
    case 'segmento':
      return {sim:'A_i = R^{2}\\left(\\theta - \\sen\\theta\\cos\\theta\\right) \\quad (\\theta \\text{ en radianes})',
              sus:'A_i = ('+D(d.r)+')^{2}\\left('+decP(d.alpha,'ang')+'^\\circ\\cdot\\tfrac{\\pi}{180} - \\sen '+decP(d.alpha,'ang')+'^\\circ\\cos '+decP(d.alpha,'ang')+'^\\circ\\right)'};
    case 'trapecio':
      return {sim:'A_i = \\dfrac{(a+b)\\,h}{2}',
              sus:'A_i = \\dfrac{('+D(d.a)+'+'+D(d.b)+')('+D(d.h)+')}{2}'};
    case 'triangulo':
      return {sim:'A_i = \\dfrac{b\\,h}{2}', sus:'A_i = \\dfrac{('+D(d.b)+')('+D(d.h)+')}{2}'};
    case 'hexagono':
      return {sim:'A_i = \\dfrac{3\\sqrt{3}}{2}R^{2}', sus:'A_i = \\dfrac{3\\sqrt{3}}{2}('+D(d.r)+')^{2}'};
    case 'octogono':
      return {sim:'A_i = 2\\sqrt{2}\\,R^{2}', sus:'A_i = 2\\sqrt{2}('+D(d.r)+')^{2}'};
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
    // Estas líneas se escriben en la columna estrecha del desarrollo (0,60 del
    // ancho), así que la aclaración entre paréntesis va en su propio renglón:
    // de una tirada se salían del papel.
    case 'rtriangle': case 'rtriangle2':
      return '\\begin{gathered} \\text{Centroide propio a } \\tfrac{b}{3} \\text{ y } \\tfrac{h}{3}'
           + ' \\text{ de los catetos:} \\\\[2pt] \\tfrac{'+D(d.b)+'}{3}='+D(d.b/3)
           + ',\\quad \\tfrac{'+D(d.h)+'}{3}='+D(d.h/3) + ' \\end{gathered}';
    case 'semicircle':
      return '\\bar{y}_{loc} = \\dfrac{4R}{3\\pi} = \\dfrac{4('+D(d.r)+')}{3\\pi} = ' + D(4*d.r/(3*Math.PI));
    case 'quarter':
      return '\\bar{x}_{loc} = \\bar{y}_{loc} = \\dfrac{4R}{3\\pi} = ' + D(4*d.r/(3*Math.PI));
    case 'sector': {
      const t = d.alpha*Math.PI/180;
      return '\\bar{y}_{loc} = \\dfrac{2R\\sen\\theta}{3\\theta} = '
           + '\\dfrac{2('+D(d.r)+')\\sen('+decP(d.alpha,'ang')+'^\\circ)}{3('+decP(d.alpha,'ang')+'^\\circ)} = '
           + D(2*d.r*Math.sin(t)/(3*t));
    }
    case 'parabola':
      return '\\bar{y}_{loc} = \\dfrac{2h}{5} = \\dfrac{2('+D(d.h)+')}{5} = ' + D(2*d.h/5)
           + '\\quad (\\text{desde la base})';
    case 'semiparabola':
      return '\\begin{gathered} \\bar{x}_{loc} = \\dfrac{3a}{8} = ' + D(3*d.a/8)
           + ',\\quad \\bar{y}_{loc} = \\dfrac{2h}{5} = ' + D(2*d.h/5)
           + ' \\\\[2pt] (\\text{desde el v\\\'ertice del \\\'angulo recto}) \\end{gathered}';
    case 'enjuta':
      return '\\begin{gathered} \\bar{x}_{loc} = \\dfrac{3a}{4} = ' + D(3*d.a/4)
           + ',\\quad \\bar{y}_{loc} = \\dfrac{3h}{10} = ' + D(3*d.h/10)
           + ' \\\\[2pt] (\\text{desde el v\\\'ertice de la curva}) \\end{gathered}';
    case 'cuartoelipse':
      return '\\bar{x}_{loc} = \\dfrac{4a}{3\\pi} = ' + D(4*d.a/(3*Math.PI))
           + ',\\quad \\bar{y}_{loc} = \\dfrac{4b}{3\\pi} = ' + D(4*d.b/(3*Math.PI));
    case 'semielipse':
      return '\\bar{y}_{loc} = \\dfrac{4b}{3\\pi} = \\dfrac{4('+D(d.b)+')}{3\\pi} = ' + D(4*d.b/(3*Math.PI))
           + '\\quad (\\text{desde la base plana})';
    case 'segmento': {
      const t = d.alpha*Math.PI/180, s = Math.sin(t), c = Math.cos(t);
      return '\\begin{gathered} \\bar{y}_{loc} = \\dfrac{2R\\sen^{3}\\theta}{3\\left(\\theta-\\sen\\theta\\cos\\theta\\right)} = '
           + D(2*d.r*Math.pow(s,3)/(3*(t - s*c)))
           + ' \\\\[2pt] (\\text{desde el centro } O \\text{ del arco}) \\end{gathered}';
    }
    case 'trapecio': {
      const a = d.a, bb = d.b, D2 = d.dx;
      return '\\begin{gathered} \\bar{x}_{loc} = \\dfrac{a^{2}+ab+b^{2}+\\Delta(a+2b)}{3(a+b)} = '
           + D((a*a + a*bb + bb*bb + D2*(a + 2*bb))/(3*(a + bb)))
           + ' \\\\[2pt] \\bar{y}_{loc} = \\dfrac{h\\,(a+2b)}{3(a+b)} = ' + D(d.h*(a + 2*bb)/(3*(a + bb)))
           + ' \\\\[2pt] (\\text{los dos, desde el extremo izquierdo de la base mayor}) \\end{gathered}';
    }
    case 'triangulo':
      return '\\begin{gathered} \\bar{x}_{loc} = \\dfrac{b+d}{3} = ' + D((d.b + d.d)/3)
           + ',\\quad \\bar{y}_{loc} = \\dfrac{h}{3} = ' + D(d.h/3)
           + ' \\\\[2pt] (\\text{los dos, desde el extremo izquierdo de la base}) \\end{gathered}';
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
               '\\text{con } R='+D(d.r)+',\\ \\theta='+decP(d.alpha,'ang')+'^\\circ',
               '\\bar{I}_{y} = \\dfrac{R^{4}}{4}\\left(\\theta+\\sen\\theta\\cos\\theta\\right)',
               '\\text{con } R='+D(d.r)+',\\ \\theta='+decP(d.alpha,'ang')+'^\\circ',
               '\\bar{P}_{xy} = 0 \\quad (\\text{eje vertical de simetr\\\'ia})', '0');
    case 'parabola':
      return F('\\bar{I}_{x} = \\dfrac{8\\,b\\,h^{3}}{175}', '\\dfrac{8('+D(d.b)+')('+D(d.h)+')^{3}}{175}',
               '\\bar{I}_{y} = \\dfrac{b^{3}h}{30}', '\\dfrac{('+D(d.b)+')^{3}('+D(d.h)+')}{30}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{eje vertical de simetr\\\'ia})', '0');
    case 'semiparabola':
      return F('\\bar{I}_{x} = \\dfrac{8\\,a\\,h^{3}}{175}', '\\dfrac{8('+D(d.a)+')('+D(d.h)+')^{3}}{175}',
               '\\bar{I}_{y} = \\dfrac{19\\,a^{3}h}{480}', '\\dfrac{19('+D(d.a)+')^{3}('+D(d.h)+')}{480}',
               '\\bar{P}_{xy} = -\\dfrac{a^{2}h^{2}}{60}',
               '-\\dfrac{('+D(d.a)+')^{2}('+D(d.h)+')^{2}}{60}');
    case 'enjuta':
      return F('\\bar{I}_{x} = \\dfrac{37\\,a\\,h^{3}}{2100}', '\\dfrac{37('+D(d.a)+')('+D(d.h)+')^{3}}{2100}',
               '\\bar{I}_{y} = \\dfrac{a^{3}h}{80}', '\\dfrac{('+D(d.a)+')^{3}('+D(d.h)+')}{80}',
               '\\bar{P}_{xy} = +\\dfrac{a^{2}h^{2}}{120}',
               '+\\dfrac{('+D(d.a)+')^{2}('+D(d.h)+')^{2}}{120}');
    case 'cuartoelipse':
      return F('\\bar{I}_{x} = \\left(\\dfrac{\\pi}{16}-\\dfrac{4}{9\\pi}\\right)a\\,b^{3}',
               '\\left(\\dfrac{\\pi}{16}-\\dfrac{4}{9\\pi}\\right)('+D(d.a)+')('+D(d.b)+')^{3}',
               '\\bar{I}_{y} = \\left(\\dfrac{\\pi}{16}-\\dfrac{4}{9\\pi}\\right)a^{3}b',
               '\\left(\\dfrac{\\pi}{16}-\\dfrac{4}{9\\pi}\\right)('+D(d.a)+')^{3}('+D(d.b)+')',
               '\\bar{P}_{xy} = \\left(\\dfrac{1}{8}-\\dfrac{4}{9\\pi}\\right)a^{2}b^{2}',
               '\\left(\\dfrac{1}{8}-\\dfrac{4}{9\\pi}\\right)('+D(d.a)+')^{2}('+D(d.b)+')^{2}');
    case 'elipse':
      return F('\\bar{I}_{x} = \\dfrac{\\pi\\,a\\,b^{3}}{4}', '\\dfrac{\\pi ('+D(d.a)+')('+D(d.b)+')^{3}}{4}',
               '\\bar{I}_{y} = \\dfrac{\\pi\\,a^{3}b}{4}', '\\dfrac{\\pi ('+D(d.a)+')^{3}('+D(d.b)+')}{4}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{dos ejes de simetr\\\'ia})', '0');
    case 'semielipse':
      return F('\\bar{I}_{x} = \\left(\\dfrac{\\pi}{8}-\\dfrac{8}{9\\pi}\\right)a\\,b^{3}',
               '\\left(\\dfrac{\\pi}{8}-\\dfrac{8}{9\\pi}\\right)('+D(d.a)+')('+D(d.b)+')^{3}',
               '\\bar{I}_{y} = \\dfrac{\\pi\\,a^{3}b}{8}', '\\dfrac{\\pi ('+D(d.a)+')^{3}('+D(d.b)+')}{8}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{eje vertical de simetr\\\'ia})', '0');
    case 'segmento':
      return F('\\bar{I}_{x} = \\dfrac{R^{4}}{4}\\left(\\theta-\\sen\\theta\\cos\\theta+2\\sen^{3}\\theta\\cos\\theta\\right) - A\\,\\bar{y}_{loc}^{2}',
               '\\text{con } R='+D(d.r)+',\\ \\theta='+decP(d.alpha,'ang')+'^\\circ',
               '\\bar{I}_{y} = \\dfrac{R^{4}}{12}\\left(3\\theta-3\\sen\\theta\\cos\\theta-2\\sen^{3}\\theta\\cos\\theta\\right)',
               '\\text{con } R='+D(d.r)+',\\ \\theta='+decP(d.alpha,'ang')+'^\\circ',
               '\\bar{P}_{xy} = 0 \\quad (\\text{eje vertical de simetr\\\'ia})', '0');
    case 'trapecio': {
      // K y J son los dos agrupamientos que se repiten en las tres inercias del
      // trapecio; con la base menor centrada (Delta = (a-b)/2) resulta 2*Delta*K = J
      // y el producto se anula, que es el caso isosceles de los libros.
      const cn = '\\text{con } a='+D(d.a)+',\\ b='+D(d.b)+',\\ h='+D(d.h)+',\\ \\Delta='+D(d.dx)
               + ',\\ K=a^{2}+4ab+b^{2},\\ J=a^{3}+3a^{2}b-3ab^{2}-b^{3}';
      return F('\\bar{I}_{x} = \\dfrac{h^{3}\\left(a^{2}+4ab+b^{2}\\right)}{36(a+b)}',
               '\\dfrac{('+D(d.h)+')^{3}\\left(('+D(d.a)+')^{2}+4('+D(d.a)+')('+D(d.b)+')+('+D(d.b)+')^{2}\\right)}{36('+D(d.a)+'+'+D(d.b)+')}',
               '\\bar{I}_{y} = \\dfrac{h\\left[a^{4}+2a^{3}b+2ab^{3}+b^{4}+\\Delta^{2}K-\\Delta J\\right]}{36(a+b)}', cn,
               '\\bar{P}_{xy} = \\dfrac{h^{2}\\left(2\\Delta K - J\\right)}{72(a+b)}', cn);
    }
    case 'triangulo':
      return F('\\bar{I}_{x} = \\dfrac{b\\,h^{3}}{36}', '\\dfrac{('+D(d.b)+')('+D(d.h)+')^{3}}{36}',
               '\\bar{I}_{y} = \\dfrac{b\\,h\\left(b^{2}-b\\,d+d^{2}\\right)}{36}',
               '\\dfrac{('+D(d.b)+')('+D(d.h)+')\\left(('+D(d.b)+')^{2}-('+D(d.b)+')('+D(d.d)+')+('+D(d.d)+')^{2}\\right)}{36}',
               '\\bar{P}_{xy} = \\dfrac{b\\,h^{2}\\left(2d-b\\right)}{72}',
               '\\dfrac{('+D(d.b)+')('+D(d.h)+')^{2}\\left(2('+D(d.d)+')-('+D(d.b)+')\\right)}{72}');
    case 'hexagono':
      return F('\\bar{I}_{x} = \\dfrac{5\\sqrt{3}}{16}R^{4}', '\\dfrac{5\\sqrt{3}}{16}('+D(d.r)+')^{4}',
               '\\bar{I}_{y} = \\dfrac{5\\sqrt{3}}{16}R^{4}', '\\dfrac{5\\sqrt{3}}{16}('+D(d.r)+')^{4}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{pol\\\'igono regular: todo eje por } G \\text{ es principal})', '0');
    case 'octogono':
      return F('\\bar{I}_{x} = \\dfrac{1+2\\sqrt{2}}{6}R^{4}', '\\dfrac{1+2\\sqrt{2}}{6}('+D(d.r)+')^{4}',
               '\\bar{I}_{y} = \\dfrac{1+2\\sqrt{2}}{6}R^{4}', '\\dfrac{1+2\\sqrt{2}}{6}('+D(d.r)+')^{4}',
               '\\bar{P}_{xy} = 0 \\quad (\\text{pol\\\'igono regular: todo eje por } G \\text{ es principal})', '0');
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

// ── Croquis acotado de UNA figura, en TikZ ──
// Desde el 2026-10-03 (decisión del profesor, el mismo criterio que centroide)
// la figura se dibuja YA GIRADA, como está en la sección, y su giro se dice en
// el centroide: la línea de +x a trazos, el eje propio de la figura a trazos y
// el arco entre los dos con β (el valor, en el pie del croquis). Es el ángulo
// con el que se rotan las inercias propias. Las cotas son las medidas propias de
// la figura (su caja sin girar), alineadas con ella y con los valores DERECHOS.
function tikzCroquisFigura(fig, anchoCm){
  const b = cajaCroquis(fig);
  const bw = Math.max(b.right-b.left, 1e-9), bh = Math.max(b.top-b.bottom, 1e-9);
  const W = anchoCm || 3.6, H = 3.0;
  const g = fig.rotation || 0, gira = Math.abs(g) >= 0.5;
  const ca = Math.cos(g*Math.PI/180), sa = Math.sin(g*Math.PI/180);
  const rot = (x, y) => ({x: x*ca - y*sa, y: x*sa + y*ca});      // local (centroide en el origen) → girado
  const esq = [[b.left,b.bottom],[b.right,b.bottom],[b.right,b.top],[b.left,b.top]].map(q=>rot(q[0],q[1]));
  const rx0 = Math.min(...esq.map(q=>q.x)), rx1 = Math.max(...esq.map(q=>q.x));
  const ry0 = Math.min(...esq.map(q=>q.y)), ry1 = Math.max(...esq.map(q=>q.y));
  const esc = Math.min((W-1.3)/Math.max(rx1-rx0, 1e-9), (H-1.1)/Math.max(ry1-ry0, 1e-9));
  const cxm = (rx0+rx1)/2, cym = (ry0+ry1)/2;
  const P = (x, y) => { const r = rot(x, y); return {X:(r.x-cxm)*esc, Y:(r.y-cym)*esc}; };
  const n = v => v.toFixed(3);
  const col = hexRgbSpec(fig.color);
  const neg = fig.sign < 0;
  const O = P(0, 0);                                // el centroide de la figura
  let s = '\\begin{tikzpicture}[scale=1]\n';
  s += '\\begin{scope}[shift={(' + n(O.X) + ',' + n(O.Y) + ')}, rotate=' + g.toFixed(3) + ', scale=' + esc.toFixed(4) + ']\n';
  s += '\\path[' + (neg
        ? 'pattern=north east lines, pattern color={'+col+'}, draw={'+col+'}, line width=0.7pt, dashed'
        : 'fill={'+col+'}, fill opacity=0.28, draw={'+col+'}, line width=0.8pt') + '] ';
  s += figuraPathLocal(fig.type, fig.dims) + ';\n';
  s += '\\end{scope}\n';
  s += '\\fill[bsaAlerta] (' + n(O.X) + ',' + n(O.Y) + ') circle (1.4pt);\n';
  s += '\\node[font=\\tiny, ' + (gira ? 'below left' : 'above right') + ', inner sep=1pt] at (' + n(O.X) + ',' + n(O.Y) + ') {$C_i$};\n';

  // ── Cotas propias, alineadas con la figura ──
  const d = 0.34/esc, e = 0.08/esc;
  const L = (a, bb, estilo) => '\\draw[' + estilo + '] (' + n(a.X) + ',' + n(a.Y) + ') -- (' + n(bb.X) + ',' + n(bb.Y) + ');\n';
  const ref = 'black!35, line width=0.2pt, dash pattern=on 1.2pt off 1.2pt';
  const cota = 'black!65, line width=0.3pt, <->, >=stealth';
  const yc = b.bottom - d, xc = b.right + d;
  s += L(P(b.left, b.bottom), P(b.left, yc - e), ref) + L(P(b.right, b.bottom), P(b.right, yc - e), ref);
  s += L(P(b.left, yc), P(b.right, yc), cota);
  const mA = P((b.left+b.right)/2, yc - 0.20/esc);
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt] at (' + n(mA.X) + ',' + n(mA.Y) + ') {' + decP(bw,'len') + '};\n';
  s += L(P(b.right, b.bottom), P(xc + e, b.bottom), ref) + L(P(b.right, b.top), P(xc + e, b.top), ref);
  s += L(P(xc, b.bottom), P(xc, b.top), cota);
  const mH = P(xc + 0.10/esc, (b.bottom+b.top)/2);
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt, anchor=' + (ca >= -0.2 ? 'west' : 'east') + '] at (' + n(mH.X) + ',' + n(mH.Y) + ') {' + decP(bh,'len') + '};\n';

  // ── Ángulo de giro, en el centroide, desde +x ──
  if(gira){
    const Rl = 0.85, Ra = 0.52;
    s += '\\draw[black!55, line width=0.3pt, dash pattern=on 1.6pt off 1.2pt, ->, >=stealth] (' + n(O.X) + ',' + n(O.Y) + ') -- (' + n(O.X + Rl) + ',' + n(O.Y) + ');\n';
    s += '\\node[font=\\tiny, text=black!60, anchor=west, inner sep=0.6pt] at (' + n(O.X + Rl) + ',' + n(O.Y) + ') {$+x$};\n';
    s += '\\draw[bsaAlerta!80!black, line width=0.35pt, dash pattern=on 1.6pt off 1.2pt] (' + n(O.X) + ',' + n(O.Y) + ') -- (' + n(O.X + Rl*ca) + ',' + n(O.Y + Rl*sa) + ');\n';
    s += '\\draw[bsaAlerta!80!black, line width=0.4pt, ->, >=stealth] (' + n(O.X + Ra) + ',' + n(O.Y) + ') arc (0:' + g.toFixed(2) + ':' + n(Ra) + ');\n';
    // sobre el arco, solo la letra: el valor lo dice el pie del croquis
    const am = g/2*Math.PI/180;
    s += '\\node[font=\\scriptsize, text=bsaAlerta!80!black, fill=white, fill opacity=0.85, text opacity=1, inner sep=0.6pt] at ('
       + n(O.X + (Ra + 0.17)*Math.cos(am)) + ',' + n(O.Y + (Ra + 0.17)*Math.sin(am)) + ') {$\\beta$};\n';
  }
  s += '\\end{tikzpicture}';
  return s;
}
