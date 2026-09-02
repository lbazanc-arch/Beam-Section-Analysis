// ═══════════════════════════════════════════════════════════
//  INFORME PDF POR LATEX
// ═══════════════════════════════════════════════════════════
// ESTADO: primera versión. Cubre portada, tabla resumen con notación x10^n,
// centroide, inercias, ejes principales y Mohr. FALTA todavía el desarrollo
// figura a figura con su croquis acotado y las láminas TikZ de la sección,
// que llegan en la siguiente entrega.
const TEXLIVE_NET_URL = 'https://texlive.net/cgi-bin/latexcgi';

function escLatex(s){
  // Los dígitos circulados ①-⑤ del nombre de las figuras (p. ej. "Triáng.
  // Rect. ②") no existen en inputenc/utf8: pdflatex aborta con "Unicode
  // character not set up for use with LaTeX" y texlive.net no devuelve PDF.
  // Se transliteran antes de escapar, igual que en cap9.
  const circulados = {'\u2460':'(1)','\u2461':'(2)','\u2462':'(3)','\u2463':'(4)','\u2464':'(5)'};
  let out = String(s == null ? '' : s);
  Object.keys(circulados).forEach(k=>{ out = out.split(k).join(circulados[k]); });
  return out.replace(/([%&_#{}$])/g, '\\$1');
}
function decP(v, kind){
  const d = (DEC[kind] !== undefined) ? DEC[kind] : 2;
  const x = (typeof v === 'number' && Math.abs(v) < 1e-9) ? 0 : v;
  return (typeof x === 'number' && isFinite(x)) ? x.toFixed(d) : '---';
}

// ── Notación x10^n para columnas de números grandes ──
// Un factor común por columna, anunciado en la cabecera: la tabla queda con
// números de dos o tres cifras y la magnitud se lee una sola vez. Es lo que
// se hace en un cuadro de ingeniería.
function factorColumna(vals){
  const m = Math.max(...vals.map(v=>Math.abs(v)).filter(v=>isFinite(v) && v>0), 0);
  if(!m) return {exp:0, div:1, cab:''};
  let exp = Math.floor(Math.log10(m));
  exp = Math.floor(exp/3)*3;                 // saltos de mil
  if(exp <= 0) return {exp:0, div:1, cab:''};
  return {exp, div:Math.pow(10,exp), cab:'\\times 10^{'+exp+'}'};
}
function celdaCol(v, f, dec){
  const x = v/f.div;
  return (Math.abs(x) < 5e-7 ? 0 : x).toFixed(dec);
}
