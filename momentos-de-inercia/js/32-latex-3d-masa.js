// ═════════════════════════════════════════════════════════
//  INFORME EN LaTeX del 3D de MASAS — laminas TikZ
// ═════════════════════════════════════════════════════════
// GEMELA de centroide/js/22-latex-3d.js en todo lo que dibuja (las dos
// vistas, los croquis de cada solido y las tres vistas juntas): al tocar
// una, mira la otra (§5.4 de CLAUDE.md). Lo unico distinto es que el punto
// que marca `marcarC` aqui es el CENTRO DE MASA y no el centroide del
// volumen, porque es lo que calcula este tema.
//
// El informe propiamente dicho, `construirLatex3dMasa`, va al final.

// ═══════════════════════════════════════════════════════════
//  INFORME LaTeX del modo 3D · la misma clase paso a paso que el 2D
//  (Hibbeler, 2027), con volúmenes y tres coordenadas.
//  Láminas: planta y alzado en TikZ, una junto a otra. Sigue las reglas de
//  redacción de fuerzas-internas/LEEME.md.
// ═══════════════════════════════════════════════════════════

// Contorno TikZ de un sólido en una vista, en coordenadas locales (origen en
// su centroide). Los poliedros —y los sólidos de revolución TUMBADOS— van por
// su silueta (con los giros y el volteo ya aplicados); un sólido de revolución
// que solo gire en planta reproduce drawPlanta/drawAlzado y, si está volteado,
// el llamador añade yscale=-1 al scope (_yscaleSolido).
function _pathSolidoTikz(fig, vistaId, opts){
  const d = fig.dims, t = fig.type, def = SOLID_DEFS[t];
  const n = v => (+v).toFixed(4);
  const pol = contornoSolido(fig, vistaId, opts);
  if(pol) return pol.map(q=>'(' + n(q[0]) + ',' + n(q[1]) + ')').join(' -- ') + ' -- cycle';
  const c = def.cBase(d);
  if(vistaId === 'planta') return '(0,0) circle (' + n(t === 's_conotrunc' ? Math.max(d.r, d.r2) : d.r) + ')';
  if(t === 's_cilindro')    return '(' + n(-d.r) + ',' + n(-c) + ') rectangle (' + n(d.r) + ',' + n(d.h-c) + ')';
  if(t === 's_cono')        return '(' + n(-d.r) + ',' + n(-c) + ') -- (' + n(d.r) + ',' + n(-c) + ') -- (0,' + n(d.h-c) + ') -- cycle';
  if(t === 's_esfera')      return '(0,0) circle (' + n(d.r) + ')';
  if(t === 's_semiesfera')  return '(' + n(-d.r) + ',' + n(-c) + ') arc (180:0:' + n(d.r) + ') -- cycle';
  if(t === 's_conotrunc')   return '(' + n(-d.r) + ',' + n(-c) + ') -- (' + n(d.r) + ',' + n(-c) + ') -- (' + n(d.r2) + ',' + n(d.h-c) + ') -- (' + n(-d.r2) + ',' + n(d.h-c) + ') -- cycle';
  // Parábola z = h(1 − x²/R²): Bézier cúbica equivalente a la cuadrática de control (0, 2h)
  if(t === 's_paraboloide') return '(' + n(-d.r) + ',' + n(-c) + ') .. controls (' + n(-d.r/3) + ',' + n(-c+4*d.h/3) + ') and (' + n(d.r/3) + ',' + n(-c+4*d.h/3) + ') .. (' + n(d.r) + ',' + n(-c) + ') -- cycle';
  return '(0,0) circle (1)';
}
function _yscaleSolido(fig, vistaId, opts){
  // Si la pieza tiene silueta, el volteo ya está dentro de sus puntos: añadir
  // aquí yscale=-1 la dibujaría dos veces del revés.
  if(contornoSolido(fig, vistaId, opts)) return '';
  return (fig.volteado && vistaId !== 'planta') ? ', yscale=-1' : '';
}

// Lámina de una vista: sólidos numerados, cadenas de cotas y, si se pide, el
// centroide marcado. Devuelve el cuerpo del tikzpicture. Ancho útil: `ancho` cm.
function tikzVista3d(vistaId, opts){
  opts = opts || {};
  const ancho = opts.ancho || 7.0;
  const n = v => v.toFixed(3);
  const {xs, vs} = bordes3d(vistaId);
  let minX = Math.min(...xs), maxX = Math.max(...xs), minV = Math.min(...vs), maxV = Math.max(...vs);
  if(opts.ejes){ minX = Math.min(minX, 0); maxX = Math.max(maxX, 0); minV = Math.min(minV, 0); maxV = Math.max(maxV, 0); }
  const esc = Math.min(ancho/Math.max(maxX-minX,1e-6), (opts.alto || 7.5)/Math.max(maxV-minV,1e-6));
  const tx = x => (x-minX)*esc, tv = v => (v-minV)*esc;
  let s = '';
  figures.forEach((fig,i)=>{
    const col = hexRgbSpec(fig.color), esSuma = fig.sign === 1;
    const relleno = esSuma
      ? 'fill={' + col + '}, fill opacity=0.30, draw={' + col + '}, line width=0.9pt'
      : 'pattern=north east lines, pattern color={' + col + '}, draw={' + col + '}, line width=0.8pt, dashed';
    const cx = tx(fig.cx), cv = tv(vDe(fig, vistaId));
    s += '\\begin{scope}[shift={(' + n(cx) + ',' + n(cv) + ')}, scale=' + esc.toFixed(5) + _yscaleSolido(fig, vistaId) + ']\n';
    s += '\\filldraw[' + relleno + '] ' + _pathSolidoTikz(fig, vistaId) + ';\n\\end{scope}\n';
    s += '\\fill[black!55] (' + n(cx) + ',' + n(cv) + ') circle (1.1pt);\n';
    if(opts.numerar) s += '\\node[font=\\tiny\\bfseries, circle, draw={' + col + '}, fill=white, inner sep=0.9pt, above right=2pt] at ('
      + n(cx) + ',' + n(cv) + ') {' + (i+1) + '};\n';
  });
  if(opts.ejes){
    const ox = tx(0), ov = tv(0);
    s += '\\draw[black!70, line width=0.5pt, ->, >=stealth] (' + n(tx(minX)-0.6) + ',' + n(ov) + ') -- (' + n(tx(maxX)+0.6) + ',' + n(ov) + ') node[right, font=\\small] {$X$};\n';
    s += '\\draw[black!70, line width=0.5pt, ->, >=stealth] (' + n(ox) + ',' + n(tv(minV)-0.6) + ') -- (' + n(ox) + ',' + n(tv(maxV)+0.6) + ') node[above, font=\\small] {$' + (vistaId==='planta'?'Y':'Z') + '$};\n';
    s += '\\node[font=\\scriptsize, below left, inner sep=1pt] at (' + n(ox) + ',' + n(ov) + ') {$O$};\n';
  }
  if(opts.cotas){
    const yBorde = tv(minV), baseX = yBorde - 0.75;
    const cadX = tikzCadenaCotas(xs, tx, 'x', baseX, yBorde + 0.06); s += cadX.tex;
    const xBorde = tx(maxX), baseY = xBorde + 0.75;
    const cadV = tikzCadenaCotas(vs, tv, 'y', baseY, xBorde - 0.06); s += cadV.tex;
    const yTot = baseX - 0.30 - (cadX.nMax+1)*TIKZ_SALTO;
    s += '\\draw[bsaVerde, line width=0.45pt, <->, >=stealth] (' + n(tx(minX)) + ',' + n(yTot) + ') -- (' + n(tx(maxX)) + ',' + n(yTot) + ');\n';
    s += '\\node[font=\\scriptsize\\bfseries, text=bsaVerde, fill=white, inner sep=1pt] at (' + n((tx(minX)+tx(maxX))/2) + ',' + n(yTot) + ') {' + decP(maxX-minX,'len') + '\\,' + escLatex(unit) + '};\n';
    const xTot = baseY + 0.30 + (cadV.nMax+1)*TIKZ_SALTO;
    s += '\\draw[bsaVerde, line width=0.45pt, <->, >=stealth] (' + n(xTot) + ',' + n(tv(minV)) + ') -- (' + n(xTot) + ',' + n(tv(maxV)) + ');\n';
    s += '\\node[font=\\scriptsize\\bfseries, text=bsaVerde, fill=white, inner sep=1pt, rotate=90] at (' + n(xTot) + ',' + n((tv(minV)+tv(maxV))/2) + ') {' + decP(maxV-minV,'len') + '\\,' + escLatex(unit) + '};\n';
    // Radios de los sólidos de revolución, en su propio recuadro
    // Los rótulos que caen en el mismo sitio (sólidos coaxiales en la
    // planta) se apilan hacia abajo en vez de taparse.
    const puestos = [];
    figures.forEach(fig=>{
      const def = SOLID_DEFS[fig.type]; if(!def.rotR) return;
      const cx = tx(fig.cx); let cv = tv(vDe(fig, vistaId)) - 0.32;
      while(puestos.some(q=>Math.abs(q[0]-cx) < 0.9 && Math.abs(q[1]-cv) < 0.3)) cv -= 0.34;
      puestos.push([cx, cv]);
      s += '\\node[font=\\tiny, draw=black!45, fill=white, rounded corners=1pt, inner sep=1.2pt] at (' + n(cx) + ',' + n(cv) + ') {$' + def.rotR(fig.dims, v=>decP(v,'len')) + '$};\n';
    });
  }
  if(opts.marcarC && results && results.cg){
    const r = results, vC = vistaId==='planta' ? r.cg.y : r.cg.z;
    const cx = tx(r.cg.x), cv = tv(vC);
    s += '\\fill[bsaAlerta] (' + n(cx) + ',' + n(cv) + ') circle (2pt);\n';
    s += '\\node[font=\\small\\bfseries, above right, xshift=2pt] at (' + n(cx) + ',' + n(cv) + ') {C};\n';
    if(opts.ejes){
      const ox = tx(0), ov = tv(0);
      s += '\\draw[bsaAlerta, line width=0.4pt, dash pattern=on 1.4pt off 1.4pt] (' + n(ox) + ',' + n(cv) + ') -- (' + n(cx) + ',' + n(cv) + ') -- (' + n(cx) + ',' + n(ov) + ');\n';
      s += '\\node[font=\\small, below, inner sep=1.6pt] at (' + n((ox+cx)/2) + ',' + n(ov) + ') {$\\bar{x}$};\n';
      s += '\\node[font=\\small, left, inner sep=1.6pt] at (' + n(ox) + ',' + n((ov+cv)/2) + ') {$\\bar{' + (vistaId==='planta'?'y':'z') + '}$};\n';
    }
    // (en centroide aqui se marca ademas el centro de gravedad; aqui el
    // punto marcado YA es el centro de masa)

  }
  return s;
}

// Las TRES vistas en una sola fila, en el orden planta, alzado e isométrica
// (decisión del profesor, 2026-09-16). Antes iban en dos figuras separadas, con
// la isométrica debajo y con su propio pie largo. Cada una lleva ahora un pie
// corto y comparten el pie general de la figura.
function _laminasVistas3d(opts, lamina){
  const w = (opts && opts.ancho) || 4.9;
  // Dos filas: los tres dibujos y, debajo, los tres pies. Así los pies quedan
  // alineados entre sí sin dejar hueco muerto, que es lo que pasaba al meter
  // cada vista en una caja de altura fija: las tres vistas se escalan a lo que
  // ocupa su dibujo y ninguna llena la caja.
  const vista = id => '\\begin{tikzpicture}[scale=1]\n' + tikzVista3d(id, opts) + '\\end{tikzpicture}\n';
  const iso = (typeof tikzIso3d === 'function')
    ? '\\begin{tikzpicture}[scale=1]\n'
      + tikzIso3d({numerar:true, ejes:true, ancho:w, alto:w*0.88}) + '\\end{tikzpicture}\n'
    : '\\rule{0pt}{2cm}\n';
  const titulos = ['Planta (X--Y)', 'Alzado (X--Z)', 'Isom\\\'etrica'];
  const cuerpos = [vista('planta'), vista('alzado'), iso];
  const pies    = ['Vista desde arriba.', 'Vista de frente.', 'Observador en $(1,1,1)$.'];
  const caja = dentro => '\\begin{minipage}[t]{0.32\\textwidth}\\centering\\vspace{0pt}\n'
                       + dentro + '\\end{minipage}';
  const fila = f => '\\noindent' + [0,1,2].map(f).join('\\hfill');
  return fila(i => caja('{\\footnotesize\\color{bsaAcc2}\\textbf{' + titulos[i] + '}}\\\\[3pt]\n'
                        + '\\bsaEncajar{' + cuerpos[i] + '}\n'))
    + '\\par\\nopagebreak\\vspace{3pt}\n'
    + fila(i => caja('{\\scriptsize\\color{bsaMuted}' + pies[i] + '}'))
    + '\\par\\nopagebreak\\vspace{4pt}\n' + lamina;
}

// Croquis acotado del alzado de un sólido, al costado de su desarrollo.
// Croquis ACOTADO de una vista ortogonal de un sólido: 'planta' se lee en
// (x, y) y 'alzado' en (x, z). Solo el alzado acota la altura del centroide
// sobre la base, que en planta no se ve.
function tikzCroquisSolido(fig, anchoCm, vistaId){
  vistaId = vistaId || 'alzado';
  const esPl = vistaId === 'planta';
  const def = SOLID_DEFS[fig.type], b = bounds3Rel(fig, true);
  const w0 = esPl ? b.back : b.bottom, w1 = esPl ? b.front : b.top;
  const bw = Math.max(b.right-b.left,1e-9), bh = Math.max(w1-w0,1e-9);
  const W = anchoCm || 3.6, H = 3.0, esc = Math.min((W-1.1)/bw, (H-1.0)/bh);
  const cxm = (b.left+b.right)/2, cym = (w0+w1)/2;
  const tx = x => (x-cxm)*esc, ty = v => (v-cym)*esc, n = v => v.toFixed(3);
  const col = hexRgbSpec(fig.color), neg = fig.sign < 0;
  const ox = tx(0), oy = ty(0);
  let s = '\\begin{tikzpicture}[scale=1]\n';
  s += '\\begin{scope}[shift={(' + n(ox) + ',' + n(oy) + ')}, scale=' + esc.toFixed(4) + _yscaleSolido(fig, vistaId, {rot0:true}) + ']\n';
  s += '\\path[' + (neg ? 'pattern=north east lines, pattern color={'+col+'}, draw={'+col+'}, line width=0.7pt, dashed'
                        : 'fill={'+col+'}, fill opacity=0.28, draw={'+col+'}, line width=0.8pt') + '] ' + _pathSolidoTikz(fig,vistaId,{rot0:true}) + ';\n';
  s += '\\end{scope}\n';
  s += '\\fill[bsaAlerta] (' + n(ox) + ',' + n(oy) + ') circle (1.4pt);\n';
  s += '\\node[font=\\tiny, above right, inner sep=1pt] at (' + n(ox) + ',' + n(oy) + ') {$C_i$};\n';
  const x0 = tx(b.left), x1 = tx(b.right), y0 = ty(w0), y1 = ty(w1), yc = y0-0.34, xc = x1+0.34;
  s += '\\draw[black!65, line width=0.3pt, <->, >=stealth] (' + n(x0) + ',' + n(yc) + ') -- (' + n(x1) + ',' + n(yc) + ');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt] at (' + n((x0+x1)/2) + ',' + n(yc) + ') {' + decP(bw,'len') + '};\n';
  s += '\\draw[black!65, line width=0.3pt, <->, >=stealth] (' + n(xc) + ',' + n(y0) + ') -- (' + n(xc) + ',' + n(y1) + ');\n';
  s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt, rotate=90] at (' + n(xc) + ',' + n((y0+y1)/2) + ') {' + decP(bh,'len') + '};\n';
  if(!esPl){
    // cota del centroide desde la base (arriba si el sólido está volteado)
    const yb = fig.volteado ? y1 : y0;
    s += '\\draw[bsaAlerta, line width=0.3pt, <->, >=stealth] (' + n(x0-0.34) + ',' + n(yb) + ') -- (' + n(x0-0.34) + ',' + n(oy) + ');\n';
    s += '\\node[font=\\tiny, fill=white, inner sep=0.8pt, rotate=90, text=bsaAlerta] at (' + n(x0-0.34) + ',' + n((yb+oy)/2) + ') {' + decP(def.cBase(fig.dims),'len') + '};\n';
  }
  s += '\\end{tikzpicture}';
  return s;
}

// Las TRES vistas de UNA pieza, en una fila, antes de su desarrollo
// (2026-09-16, decisión del profesor). Los dos planos van acotados; la
// isométrica no, porque está solo para ver la forma y las medidas ya las dan
// los planos. La pieza se dibuja centrada en su centroide y sin girar: el giro
// se dice en el título de la parte.
function _vistasSolido3(fig, uTxt){
  const anch = 4.6;
  const iso = (typeof tikzIso3d === 'function')
    ? '\\begin{tikzpicture}[scale=1]\n'
      + tikzIso3d({figs:[Object.assign({}, fig, {cx:0, cy:0, cz:0, rotation:0, rotXZ:0, rotYZ:0})],
                   ancho:anch, alto:3.0, ejes:false, numerar:false})
      + '\\end{tikzpicture}'
    : '\\rule{0pt}{2cm}';
  const caja = dentro => '\\begin{minipage}[t]{0.32\\textwidth}\\centering\\vspace{0pt}\n' + dentro + '\\end{minipage}';
  const titulos = ['Planta (X--Y)', 'Alzado (X--Z)', 'Isom\\\'etrica'];
  const cuerpos = [tikzCroquisSolido(fig, anch, 'planta'), tikzCroquisSolido(fig, anch, 'alzado'), iso];
  const pies = ['Acotada en ' + uTxt + '.',
                'Acotada en ' + uTxt + '; en naranja, la altura del centroide desde la base.',
                'Sin acotar: solo la forma.'];
  const fila = f => '\\noindent' + [0,1,2].map(f).join('\\hfill');
  return fila(i => caja('{\\scriptsize\\color{bsaAcc2}\\textbf{' + titulos[i] + '}}\\\\[2pt]\n' + cuerpos[i]))
    + '\\par\\nopagebreak\\vspace{2pt}\n'
    + fila(i => caja('{\\scriptsize\\color{bsaMuted}' + pies[i] + '}'))
    + '\\par\\nopagebreak\\vspace{6pt}\n';
}

// ══ El tensor de tabla de cada sólido, en LaTeX ═══════════════════════════
// Solo para escribirlo: los números salen de `def.inercia` (core), que es lo
// único que entra en el cálculo. `xz` únicamente lo lleva la cuña.
const FORMULA_I_SOLIDO = {
  s_prisma:  {xx:'\\tfrac{1}{12}m(b^{2}+h^{2})', yy:'\\tfrac{1}{12}m(a^{2}+h^{2})', zz:'\\tfrac{1}{12}m(a^{2}+b^{2})'},
  s_cilindro:{xx:'\\tfrac{1}{12}m(3R^{2}+h^{2})', yy:'\\tfrac{1}{12}m(3R^{2}+h^{2})', zz:'\\tfrac{1}{2}mR^{2}'},
  s_semicilindro:{xx:'\\tfrac{1}{12}m(3R^{2}+h^{2})', yy:'\\tfrac{1}{12}m(3R^{2}+h^{2})-me^{2}', zz:'\\tfrac{1}{2}mR^{2}-me^{2}',
    nota:'con $e = 4R/3\\pi$, la separación del centroide a la cara plana'},
  s_semicilindro_t:{xx:'m\\left(\\tfrac{L^{2}}{12}+\\tfrac{R^{2}}{4}-e^{2}\\right)', yy:'\\tfrac{1}{2}mR^{2}-me^{2}', zz:'m\\left(\\tfrac{R^{2}}{4}+\\tfrac{L^{2}}{12}\\right)',
    nota:'con $e = 4R/3\\pi$, la altura del centroide sobre la cara de apoyo'},
  s_cono:    {xx:'\\tfrac{3}{80}m(4R^{2}+h^{2})', yy:'\\tfrac{3}{80}m(4R^{2}+h^{2})', zz:'\\tfrac{3}{10}mR^{2}'},
  s_esfera:  {xx:'\\tfrac{2}{5}mR^{2}', yy:'\\tfrac{2}{5}mR^{2}', zz:'\\tfrac{2}{5}mR^{2}'},
  s_semiesfera:{xx:'\\tfrac{83}{320}mR^{2}', yy:'\\tfrac{83}{320}mR^{2}', zz:'\\tfrac{2}{5}mR^{2}'},
  s_piramide:{xx:'m\\left(\\tfrac{b^{2}}{20}+\\tfrac{3h^{2}}{80}\\right)', yy:'m\\left(\\tfrac{a^{2}}{20}+\\tfrac{3h^{2}}{80}\\right)', zz:'\\tfrac{1}{20}m(a^{2}+b^{2})'},
  s_conotrunc:{xx:'\\tfrac{1}{2}\\bar{I}_{zz}+m\\tfrac{I_3}{I_2}-m\\bar{z}^{2}', yy:'=\\bar{I}_{xx}', zz:'\\tfrac{m}{2}\\,\\tfrac{I_1}{I_2}',
    nota:'con $I_1=\\int\\rho^{4}dz$, $I_2=\\int\\rho^{2}dz$ e $I_3=\\int z^{2}\\rho^{2}dz$ sobre el perfil $\\rho(z)=R_1+(R_2-R_1)z/h$'},
  s_paraboloide:{xx:'m\\left(\\tfrac{R^{2}}{6}+\\tfrac{h^{2}}{18}\\right)', yy:'m\\left(\\tfrac{R^{2}}{6}+\\tfrac{h^{2}}{18}\\right)', zz:'\\tfrac{1}{3}mR^{2}'},
  s_cuna:    {xx:'m\\left(\\tfrac{L^{2}}{12}+\\tfrac{h^{2}}{18}\\right)', yy:'\\tfrac{1}{18}m(b^{2}+h^{2})', zz:'m\\left(\\tfrac{b^{2}}{18}+\\tfrac{L^{2}}{12}\\right)',
    xz:'-\\tfrac{1}{36}mbh', nota:'es el único del catálogo con producto de inercia propio distinto de cero'},
};

// ══ El informe ════════════════════════════════════════════════════════════
// Sigue las 22 reglas de redacción (fuerzas-internas/LEEME.md). La que más
// manda aquí es R1: cada concepto se explica UNA vez, la primera que hace
// falta, y después solo se aplica.
function construirLatex3dMasa(){
  if(!results || !results.principales){ aviso('Primero calcula el cuerpo sólido.'); return null; }
  _yaDichoIn = {};
  const R = results, P = R.partes;
  // Todo el desarrollo numérico va en METROS y kilogramos: la inercia de masa
  // se da en kg·m², y mezclar milímetros en los brazos haría que las cuentas
  // de la tabla no se pudieran seguir. Los dibujos conservan su unidad.
  const M = R.met;
  // `decP` va con los decimales configurados del tema, que son los del dibujo;
  // aquí hacen falta los de una magnitud en SI, así que el informe lleva sus
  // propios formateadores. Un valor demasiado pequeño para cuatro decimales se
  // escribe en notación científica en vez de salir como 0.0000.
  const num = (v, d) => {
    if(!isFinite(v)) return '---';
    if(v !== 0 && Math.abs(v) < 5e-5){
      const e = Math.floor(Math.log10(Math.abs(v)));
      return (v/Math.pow(10,e)).toFixed(3) + '\\times 10^{' + e + '}';
    }
    return (Math.abs(v) < 1e-12 ? 0 : v).toFixed(d === undefined ? 4 : d);
  };
  const L  = v => num(v*M);                            // una longitud, en m
  const m4 = v => num(v);                              // una masa, en kg
  const I4 = v => num(v*R.aSI);                        // una inercia, en kg·m²
  const uTxt = escLatex(unit);
  const nombreDe = f => escLatex(f.etiqueta || f.name || SOLID_DEFS[f.type].name);
  const celdaNombre = f => { const s = nombreDe(f);
    return s.length > 26 ? '\\parbox[t]{3.6cm}{\\raggedright ' + s + '}' : s; };

  let figN = 0, tablaN = 0, ecN = 0;
  const figCap = txt => { figN++; return '\\begin{center}{\\small\\color{bsaMuted}\\textbf{Figura ' + figN + '.} ' + txt + '}\\end{center}\n\\vspace{4pt}\n'; };
  const tablaCap = txt => { tablaN++; return '\\noindent{\\footnotesize\\textbf{Tabla ' + tablaN + '.} ' + txt + '}\\\\[2pt]\\nopagebreak\n'; };
  const porque = (clave, txt) => _primeraVezIn(clave) ? '\\porque{' + txt + '}\n' : '';
  const ec = () => '\\tag{' + (++ecN) + '}';

  // ¿Hay algo que obligue a hablar de giros o de productos? Si no, no se
  // menciona: el informe no explica lo que no usa.
  const hayGiro = figures.some(f=>giroFueraDePlanta(f) || Math.abs(anguloPlano(f,'xy')) > 1e-9);
  const escala = Math.max(Math.abs(R.G.xx), Math.abs(R.G.yy), Math.abs(R.G.zz), 1e-30);
  const prodNulo = v => Math.abs(v) < 1e-7*escala;
  const hayProd = !(prodNulo(R.G.xy) && prodNulo(R.G.yz) && prodNulo(R.G.xz));
  const hayHueco = P.some(p=>p.signo === -1);

  // ── Autocomprobaciones: lo que se imprime tiene que reproducir el motor ──
  {
    const rel = (a,b,e)=>Math.abs(a-b) > (e || 1e-8)*Math.max(1, Math.abs(a), Math.abs(b));
    let m=0, Sx=0, Sy=0, Sz=0, Oxx=0, Oyy=0, Ozz=0;
    P.forEach(p=>{ m+=p.m; Sx+=p.m*p.g.x; Sy+=p.m*p.g.y; Sz+=p.m*p.g.z;
                   Oxx+=p.enOrigen.xx; Oyy+=p.enOrigen.yy; Ozz+=p.enOrigen.zz; });
    if(rel(m, R.m) || rel(Sx/m, R.cg.x) || rel(Sy/m, R.cg.y) || rel(Sz/m, R.cg.z))
      console.warn('Informe LaTeX: la tabla no reproduce el centro de masa');
    if(rel(Oxx, R.O.xx) || rel(Oyy, R.O.yy) || rel(Ozz, R.O.zz))
      console.warn('Informe LaTeX: la suma de las partes no reproduce el tensor en O');
    // Steiner de vuelta: de O al centro de masa.
    const g = trasladarTensor(R.O, R.m, R.cg.x, R.cg.y, R.cg.z, -1);
    if(rel(g.xx, R.G.xx) || rel(g.yy, R.G.yy) || rel(g.zz, R.G.zz))
      console.warn('Informe LaTeX: el traslado a G no reproduce el tensor centroidal');
    // La traza es invariante: los tres principales suman lo mismo que la diagonal.
    const tr = R.principales.reduce((s,e)=>s+e.I, 0);
    if(rel(tr, R.G.xx + R.G.yy + R.G.zz, 1e-7))
      console.warn('Informe LaTeX: los ejes principales no conservan la traza');
  }

  // Piezas iguales (tipo, medidas, postura, signo y densidad) se desarrollan
  // una sola vez: es R1 aplicada a las partes.
  const clave = f => f.type + '|' + JSON.stringify(f.dims) + '|' + f.sign + '|' + (f.volteado?1:0)
    + '|' + PLANOS_GIRO.map(q=>anguloPlano(f, q.id)).join(',') + '|' + f.rho + '|' + (f.rhoU||'');
  const grupos = [], pos = {};
  P.forEach((p,i)=>{ const k = clave(p.fig);
    if(pos[k] === undefined){ pos[k] = grupos.length; grupos.push({idx:[i]}); } else grupos[pos[k]].idx.push(i); });
  const listaNums = ns => ns.length === 1 ? String(ns[0]) : ns.slice(0,-1).join(', ') + ' y ' + ns[ns.length-1];

  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});
  let tex = _preambuloLatexIn();
  tex += '\\begin{center}\n'
    + '  {\\LARGE\\bfseries\\color{bsaAcc} Momento de inercia de masa de un cuerpo compuesto}\\\\[3pt]\n'
    + '  {\\large\\color{bsaAcc2} Método de las partes: masas, ejes paralelos y ejes principales}\\\\[3pt]\n'
    + '  {\\small\\color{bsaMuted} Informe generado: ' + escLatex(dt) + '}\n'
    + '\\end{center}\n\\vspace{6pt}\n\n';

  // ══ 1. Planteamiento ══
  tex += '\\seccion{1. Planteamiento del problema}\n';
  tex += _laminasVistas3d({cotas:true, numerar:true, ancho:4.9, alto:5.6},
    figCap('Las tres vistas del cuerpo, con las partes numeradas' + (hayHueco ? '. Las rayadas son huecos.' : '.')));
  tex += '\\subpaso{Objetivo}\n'
    + 'Determinar el tensor de inercia de masa del cuerpo respecto de los ejes del origen $O$ y de los '
    + 'ejes paralelos que pasan por su centro de masa $G$, los radios de giro y los ejes principales.\n';
  tex += porque('inercia-masa',
    'El momento de inercia de masa mide la resistencia de un cuerpo a la \\emph{aceleración angular}, '
    + 'igual que la masa mide su resistencia a la aceleración lineal. Se define como '
    + '$I=\\int_m r^{2}\\,dm$, con $r$ la distancia de cada partícula al eje, y se da en kg$\\cdot$m$^{2}$. '
    + 'No es el momento de inercia de área: aquel es geométrico, en unidades de longitud a la cuarta. '
    + 'En un cuerpo compuesto la integral se convierte en una suma sobre partes de inercia conocida, y '
    + 'un agujero es una parte más con masa \\textbf{negativa}.');
  tex += '\\subpaso{Procedimiento de análisis}\n'
    + '\\begin{enumerate}\\setlength{\\itemsep}{1pt}\n'
    + '\\item \\textbf{Partes.} Se divide el cuerpo en sólidos de inercia conocida y se toma la masa de cada uno, $m_i=\\rho_i V_i$.\n'
    + '\\item \\textbf{Tensor propio.} De la tabla, los momentos $\\bar{I}_{xx}$, $\\bar{I}_{yy}$, $\\bar{I}_{zz}$ de cada parte respecto de '
    + 'sus \\emph{propios} ejes centroidales.\n'
    + (hayGiro ? '\\item \\textbf{Orientación.} La parte que no está en su postura de tabla lleva su tensor girado a los ejes del dibujo.\n' : '')
    + '\\item \\textbf{Traslado.} Cada tensor se lleva a los ejes de $O$ con el teorema de los ejes paralelos y se suman.\n'
    + '\\item \\textbf{Centro de masa} y traslado de vuelta, para obtener el tensor centroidal del conjunto.\n'
    + '\\item \\textbf{Ejes principales} y radios de giro.\n'
    + '\\end{enumerate}\n';
  tex += '\\subpaso{Datos}\n'
    + 'El modelo está acotado en ' + uTxt + '. Todo el desarrollo numérico se hace en \\textbf{metros y kilogramos}, '
    + 'que es lo que pide la unidad del resultado, kg$\\cdot$m$^{2}$.\n';

  // ══ 2. Las partes ══
  tex += '\\seccion{2. Masa y tensor propio de cada parte}\n';
  grupos.forEach((g, gi)=>{
    const i0 = g.idx[0], p = P[i0], f = p.fig, def = SOLID_DEFS[f.type];
    const nums = g.idx.map(i=>i+1), varios = g.idx.length > 1;
    const F = FORMULA_I_SOLIDO[f.type] || {};
    const postura = [];
    if(f.volteado && f.type !== 's_esfera') postura.push('volteado: su base queda arriba');
    PLANOS_GIRO.forEach(q=>{ if(Math.abs(anguloPlano(f, q.id)) > 1e-9)
      postura.push('en el plano ' + q.tex + ', ' + q.que + ' a $' + decP(anguloPanel(f, q.id),'ang') + '^{\\circ}$ de ' + q.desdeTex); });
    const posturaTex = postura.length ? '\\ {\\small\\color{bsaMuted}[' + postura.join('; ') + ']}' : '';
    if(gi > 0) tex += '\\vspace{8pt}\\noindent\\textcolor{black!20}{\\rule{\\textwidth}{0.4pt}}\\vspace{8pt}\n\n';
    tex += '\\subpaso{' + (varios ? 'Partes ' : 'Parte ') + listaNums(nums) + ' — ' + nombreDe(f)
         + (p.signo === -1 ? ' (hueco)' : '') + posturaTex + '}\n';
    tex += _vistasSolido3(f, uTxt);
    // Volumen y masa
    const dimsTxt = def.dims.map(d=>'$' + d.id.replace('r2','R_2').replace(/^r$/,'R').replace(/^L$/,'L') + ' = '
                     + num(f.dims[d.id]*M) + '$ m').join(',\\; ');
    tex += '\\begin{align*}\n'
      + 'V &= ' + decP(p.V*M*M*M, 'iner') + '\\ \\text{m}^{3}, \\qquad '
      + '\\rho = ' + decP(f.rho, 'len') + '\\ \\text{' + escLatex(f.rhoU || densUnidad) + '} \\\\\n'
      + 'm &= \\rho V = ' + (p.signo === -1 ? '-' : '') + m4(Math.abs(p.m)) + '\\ \\text{kg}\n'
      + '\\end{align*}\n';
    if(p.signo === -1) tex += porque('hueco',
      'Un agujero se resta: se calcula como si fuese material y su masa entra con signo negativo, igual que en las secciones planas.');
    // Tensor propio, de tabla
    tex += porque('tensor-propio',
      'Los tres momentos de la tabla están referidos a los ejes que pasan por el \\emph{centroide de la propia pieza} y son '
      + 'paralelos a sus aristas o a su eje de revolución. Son los valores que después se trasladan.');
    const filaF = (sub, form, val) => '\\bar{I}_{' + sub + '} &= ' + form + ' = ' + I4(val) + '\\ \\text{kg}\\cdot\\text{m}^{2}';
    const locNoGirado = tensorLocalMasa(f);
    const lineas = [];
    if(F.xx) lineas.push(filaF('xx', F.xx, p.m*locNoGirado.xx));
    if(F.yy) lineas.push(filaF('yy', F.yy === '=\\bar{I}_{xx}' ? '\\bar{I}_{xx}' : F.yy, p.m*locNoGirado.yy));
    if(F.zz) lineas.push(filaF('zz', F.zz, p.m*locNoGirado.zz));
    if(F.xz) lineas.push(filaF('xz', F.xz, p.m*locNoGirado.xz));
    if(lineas.length) tex += '\\begin{align*}\n' + lineas.join(' \\\\\n') + '\n\\end{align*}\n';
    if(F.nota) tex += '\\noindent{\\small ' + F.nota.charAt(0).toUpperCase() + F.nota.slice(1) + '.}\\par\n';
    // Giro, solo si esta pieza lo lleva
    if(giroFueraDePlanta(f) || Math.abs(anguloPlano(f,'xy')) > 1e-9){
      tex += porque('giro-tensor',
        'Una pieza que no está en su postura de tabla no se puede trasladar sin más: sus ejes propios ya no son los del '
        + 'dibujo. El tensor se lleva a los ejes del dibujo con $\\mathbf{I}\' = \\mathbf{R}\\,\\mathbf{I}\\,\\mathbf{R}^{\\mathsf{T}}$, '
        + 'donde $\\mathbf{R}$ tiene por columnas las direcciones de los ejes propios vistas desde el dibujo. A diferencia del '
        + 'volumen o del centroide, aquí la postura \\textbf{sí} cambia el resultado.');
      const tg = escalarTensor(tensorMundoMasa(f), p.m);
      tex += '\\begin{align*}\n'
        + '\\bar{I}_{xx} &= ' + I4(tg.xx) + ', \\qquad \\bar{I}_{yy} = ' + I4(tg.yy) + ', \\qquad \\bar{I}_{zz} = ' + I4(tg.zz) + '\\ \\text{kg}\\cdot\\text{m}^{2}\n'
        + '\\end{align*}\n';
      tex += '\\noindent{\\small Ya en los ejes del dibujo.}\\par\n';
    }
  });

  // ══ 3. Traslado a los ejes de O ══
  tex += '\\seccion{3. Traslado a los ejes del origen}\n';
  tex += porque('steiner3d',
    'El teorema de los ejes paralelos en tres dimensiones dice que, para pasar de los ejes centroidales de una parte a '
    + 'otros paralelos, hay que sumar la masa por el \\emph{cuadrado de la distancia entre los dos ejes}. Para el eje $x$ '
    + 'esa distancia se mide en el plano $y$--$z$, de ahí $d_y^{2}+d_z^{2}$; y análogamente para los otros dos:\n'
    + '\\[ I_{xx} = \\bar{I}_{xx} + m\\,(d_y^{2}+d_z^{2}), \\qquad I_{yy} = \\bar{I}_{yy} + m\\,(d_x^{2}+d_z^{2}), \\qquad '
    + 'I_{zz} = \\bar{I}_{zz} + m\\,(d_x^{2}+d_y^{2}) \\]');
  tex += tablaCap('Masa, posición del centroide de cada parte y su momento de inercia respecto de los ejes de $O$. '
    + 'Longitudes en m, masas en kg e inercias en kg$\\cdot$m$^{2}$.');
  tex += '\\begingroup\\setlength{\\tabcolsep}{3pt}\\footnotesize\\begin{center}\n'
    + '\\begin{tabular}{@{}l r r r r r r r@{}}\n\\hline\n'
    + 'Parte & $m$ & $\\tilde{x}$ & $\\tilde{y}$ & $\\tilde{z}$ & $I_{xx}$ & $I_{yy}$ & $I_{zz}$ \\\\\n\\hline\n';
  P.forEach((p,i)=>{
    tex += (i+1) + '. ' + celdaNombre(p.fig) + ' & ' + m4(p.m)
      + ' & ' + L(p.g.x) + ' & ' + L(p.g.y) + ' & ' + L(p.g.z)
      + ' & ' + I4(p.enOrigen.xx) + ' & ' + I4(p.enOrigen.yy) + ' & ' + I4(p.enOrigen.zz) + ' \\\\\n';
  });
  tex += '\\hline\n$\\sum$ & \\textbf{' + m4(R.m) + '} & & & & \\textbf{' + I4(R.O.xx)
       + '} & \\textbf{' + I4(R.O.yy) + '} & \\textbf{' + I4(R.O.zz) + '} \\\\\n\\hline\n'
       + '\\end{tabular}\\end{center}\\endgroup\n\\vspace{6pt}\n';

  // ══ 4. Centro de masa ══
  tex += '\\seccion{4. Centro de masa}\n';
  tex += '\\begin{align}\n'
    + 'm &= \\sum m_i = ' + m4(R.m) + '\\ \\text{kg} ' + ec() + ' \\\\\n'
    + '\\bar{x} &= \\frac{\\sum m_i\\tilde{x}_i}{\\sum m_i} = ' + L(R.cg.x) + '\\ \\text{m}, \\qquad '
    + '\\bar{y} = ' + L(R.cg.y) + '\\ \\text{m}, \\qquad \\bar{z} = ' + L(R.cg.z) + '\\ \\text{m} ' + ec() + '\n'
    + '\\end{align}\n';

  // ══ 5. Tensor en el centro de masa ══
  tex += '\\seccion{5. Tensor de inercia en el centro de masa}\n';
  tex += 'El mismo traslado, ahora al revés: de los ejes de $O$ a los paralelos por $G$ se \\emph{resta} el término de masa '
       + 'por distancia al cuadrado, con las distancias de (2).\n';
  tex += '\\begin{align*}\n'
    + '\\bar{I}_{xx} &= I_{xx} - m(\\bar{y}^{2}+\\bar{z}^{2}) = ' + I4(R.O.xx) + ' - ' + I4(R.m*(R.cg.y*R.cg.y + R.cg.z*R.cg.z))
    + ' = ' + I4(R.G.xx) + ' \\\\\n'
    + '\\bar{I}_{yy} &= I_{yy} - m(\\bar{x}^{2}+\\bar{z}^{2}) = ' + I4(R.G.yy) + ', \\qquad '
    + '\\bar{I}_{zz} = I_{zz} - m(\\bar{x}^{2}+\\bar{y}^{2}) = ' + I4(R.G.zz) + '\n'
    + '\\end{align*}\n'
    + '\\noindent{\\small Todo en kg$\\cdot$m$^{2}$.}\\par\n';
  if(hayProd){
    tex += porque('productos',
      'Los productos de inercia $P_{xy}=\\int xy\\,dm$ miden la \\emph{asimetría} del cuerpo respecto de cada par de planos. '
      + 'Se anulan cuando hay un plano de simetría perpendicular a uno de los dos ejes, y son los que obligan a buscar los '
      + 'ejes principales. Se trasladan con $P_{xy} = \\bar{P}_{xy} + m\\,d_x d_y$, sin elevar al cuadrado y \\textbf{con su signo}.');
    tex += '\\begin{align*}\n'
      + '\\bar{P}_{xy} &= ' + I4(R.G.xy) + ', \\qquad \\bar{P}_{yz} = ' + I4(R.G.yz)
      + ', \\qquad \\bar{P}_{xz} = ' + I4(R.G.xz) + '\\ \\text{kg}\\cdot\\text{m}^{2}\n'
      + '\\end{align*}\n';
  } else {
    tex += '\\noindent Los tres productos de inercia se anulan: el cuerpo es simétrico respecto de los planos coordenados '
         + 'que pasan por $G$, así que los ejes del dibujo \\textbf{ya son los principales}.\\par\n';
  }
  tex += '\\subpaso{Radios de giro}\n';
  tex += porque('radio-giro',
    'El radio de giro $k=\\sqrt{I/m}$ es la distancia a la que habría que concentrar toda la masa, en un punto, para que '
    + 'diese el mismo momento de inercia. Sirve para comparar cuerpos de masas distintas.');
  tex += '\\begin{align*}\n'
    + 'k_x &= \\sqrt{\\bar{I}_{xx}/m} = ' + num(R.kG.x*M) + '\\ \\text{m}, \\qquad '
    + 'k_y = ' + num(R.kG.y*M) + '\\ \\text{m}, \\qquad '
    + 'k_z = ' + num(R.kG.z*M) + '\\ \\text{m}\n'
    + '\\end{align*}\n';

  // ══ 6. Ejes principales ══
  tex += '\\seccion{6. Ejes principales de inercia}\n';
  tex += porque('principales',
    'En todo punto de un cuerpo existen tres direcciones perpendiculares entre sí en las que los productos de inercia se '
    + 'anulan: son los \\emph{ejes principales}, y sus momentos, los \\emph{momentos principales}, son el mayor y el menor '
    + 'posibles en ese punto. Se obtienen resolviendo $\\det(\\mathbf{I}-\\lambda\\mathbf{1})=0$; en el plano, este mismo '
    + 'cálculo es el que da $\\theta_p$ y el círculo de Mohr.');
  tex += tablaCap('Momentos principales de inercia en $G$ y la dirección de cada eje, en componentes sobre $x$, $y$, $z$.');
  tex += '\\begingroup\\footnotesize\\begin{center}\n'
    + '\\begin{tabular}{@{}l r r r r@{}}\n\\hline\n'
    + ' & $I$ (kg$\\cdot$m$^{2}$) & $u_x$ & $u_y$ & $u_z$ \\\\\n\\hline\n';
  ['I_1\\ \\text{(máximo)}', 'I_2', 'I_3\\ \\text{(mínimo)}'].forEach((nom, i)=>{
    const e = R.principales[i];
    tex += '$' + nom + '$ & ' + I4(e.I) + ' & ' + num(e.u[0]) + ' & ' + num(e.u[1]) + ' & ' + num(e.u[2]) + ' \\\\\n';
  });
  tex += '\\hline\n\\end{tabular}\\end{center}\\endgroup\n\\vspace{6pt}\n';
  tex += '\\subpaso{Comprobación}\n'
    + 'La suma de los tres momentos principales tiene que coincidir con la de la diagonal del tensor, porque girar los '
    + 'ejes no cambia la traza:\n'
    + '\\[ I_1+I_2+I_3 = ' + I4(R.principales.reduce((s,e)=>s+e.I,0))
    + ' = \\bar{I}_{xx}+\\bar{I}_{yy}+\\bar{I}_{zz} = ' + I4(R.G.xx+R.G.yy+R.G.zz) + '\\ \\text{kg}\\cdot\\text{m}^{2} \\]\n';

  tex += bsaReferenciasLatex({});
  tex += colofonLatexBSA();
  tex += '\\end{document}\n';
  return tex;
}
