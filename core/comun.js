// ==========================================================================
//  NUCLEO COMUN - Beam & Section Analysis
//
//  Unico codigo verificado IDENTICO byte a byte en los cinco temas.
//  Se carga el primero en los cinco HTML: un cambio aqui afecta a TODOS.
//  Todo lo demas que 'parece' compartido entre temas ha divergido; ver
//  el apartado 'Codigo que NO se comparte' del LEEME.md de cada tema.
// ==========================================================================

function cerrarAviso(){
  const c = document.getElementById('avisoCaja');
  if(c) c.classList.remove('visible');
  if(_avisoTimer){ clearTimeout(_avisoTimer); _avisoTimer = null; }
}

function armarEsperaDeRecuadro(miGesto){
  miGesto.tEsperaId = setTimeout(()=>{
    if(gesto === miGesto && !miGesto.moved) miGesto.mantenido = true;
  }, UMBRAL_MANTENER_MS);
}

function cerrarPanelLatex(){
  const panel = document.getElementById('panelLatexPDF');
  if(!panel) return;
  panel.style.display = 'none';
  const frame = document.getElementById('latexFrame');
  if(frame) frame.setAttribute('src', 'about:blank');
  const btn = document.getElementById('btnLatex');
  if(btn) btn.dataset.ocupado = '0';
}

// Colofon con el que cierra el informe LaTeX de los cinco temas, justo
// debajo de la resolucion: la plataforma, las letras BSA con los colores del
// logo y el autor. Exige que el preambulo defina bsaMuted, bsaLogoB, bsaLogoS
// y bsaLogoA. Vive aqui para que un cambio de texto o de color salga igual en
// los cinco PDF.
function colofonLatexBSA(){
  // Todo el bloque va en una minipage de ancho completo: es indivisible, asi
  // que nunca se parte entre dos paginas (el titulo al pie de una hoja y las
  // letras en la siguiente). Si no cabe, pasa entero a la pagina siguiente.
  return '\\par\\vspace{18pt}\\noindent\\begin{minipage}{\\textwidth}\n'
    + '\\hrule\\vspace{14pt}\n'
    + '\\begin{center}\n'
    + '{\\small\\color{bsaMuted}\\textbf{BEAM \\& SECTION ANALYSIS}}\\\\[2pt]\n'
    + '{\\footnotesize\\color{bsaMuted}Plataforma educativa de an\\\'alisis estructural}\\\\[8pt]\n'
    + '\\begin{tikzpicture}[baseline]\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoB] at (0,0) {B};\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoS] at (0.47,0) {S};\n'
    + '  \\node[font=\\fontsize{26}{26}\\selectfont\\bfseries, color=bsaLogoA] at (0.96,0) {A};\n'
    + '\\end{tikzpicture}\\\\[7pt]\n'
    + '{\\footnotesize\\color{bsaMuted}Creado por \\textbf{Luis Alejandro Baz\\\'an Campos}}\\\\[2pt]\n'
    + '{\\scriptsize\\color{bsaMuted}beamsectionanalysis.com}\n'
    + '\\end{center}\n\\end{minipage}\n\n';
}
