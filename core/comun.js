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
  const mov = document.getElementById('latexMovil');
  if(mov) mov.style.display = 'none';
  const btn = document.getElementById('btnLatex');
  if(btn) btn.dataset.ocupado = '0';
}

// ==========================================================================
//  EL INFORME PDF EN TELEFONO Y TABLETA
//  Ni Safari de iOS ni Chrome de Android pintan un PDF dentro de un iframe:
//  lo descargan y ofrecen "Abrir con...", que es lo que veia el alumno en el
//  movil mientras en el ordenador salia el informe en pantalla. En esos
//  navegadores el formulario se envia a una PESTANA NUEVA y el PDF lo muestra
//  el visor del propio sistema. En el ordenador no cambia nada.
// ==========================================================================
// ==========================================================================
//  ARCHIVOS DE EJERCICIO EN CUALQUIER EQUIPO
//  Los ejercicios se guardan como .json con el tema en el nombre
//  (centroide-ejercicio-1.json) en el ordenador, y como .txt con el mismo
//  contenido en el telefono y la tableta (ver bsaGuardarArchivo). Antes
//  llevaban doble extension (.bsa9.json): en Android el selector de archivos
//  no la reconocia y los dejaba en gris, y en iPhone la descarga por enlace
//  es poco fiable. En el movil, guardar abre la HOJA DE COMPARTIR del
//  sistema (Archivos, Drive, WhatsApp...) y abrir no filtra por extension:
//  el contenido se valida por su campo bsaApp, no por el nombre.
// ==========================================================================
function bsaEsMovil(){ return !bsaPdfEnIframe(); }

// Nombre con el que se guardo de verdad el ultimo archivo (en el movil cambia
// la extension). Lo leen los temas para el aviso de "Guardado como...".
let bsaUltimoNombreGuardado = '';

// ── Por que en el movil el archivo sale como .txt ──
// Chrome en Android solo comparte archivos de una lista cerrada de tipos
// (texto plano, CSV, HTML, PDF, imagen, audio, video). Un .json de tipo
// application/json NO esta en ella: canShare devolvia false y el guardado
// caia a la descarga por enlace, y esa descarga desde dentro del iframe del
// portal dejaba un archivo de 0 B (2026-09-08, probado en un telefono real).
// Solucion: el MISMO contenido JSON se comparte como texto plano con
// extension .txt, que si esta admitida; y si no hay hoja de compartir, la
// descarga va por una URL data:, que Android si escribe entera. Abrir no
// mira la extension: valida el campo bsaApp del contenido.
async function bsaGuardarArchivo(texto, nombreArchivo, tipo){
  tipo = tipo || 'application/json';
  bsaUltimoNombreGuardado = nombreArchivo;
  if(bsaEsMovil()){
    const nombreTxt = String(nombreArchivo).replace(/\.json$/i, '') + '.txt';
    bsaUltimoNombreGuardado = nombreTxt;
    if(navigator.share && navigator.canShare){
      try{
        const archivo = new File([texto], nombreTxt, {type: 'text/plain'});
        if(navigator.canShare({files:[archivo]})){
          await navigator.share({files:[archivo], title: nombreTxt});
          return 'compartido';
        }
      }catch(err){
        // Cancelar la hoja no es un error; cualquier otro fallo cae a la descarga.
        if(err && err.name === 'AbortError') return 'cancelado';
      }
    }
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(texto);
    a.download = nombreTxt;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    return 'descargado';
  }
  const blob = new Blob([texto], {type: tipo});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  // Se revoca con retraso: algunos navegadores necesitan la URL viva
  // mientras arranca la descarga.
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
  return 'descargado';
}

// En el movil el filtro por extension esconde los archivos en vez de
// ayudar: se quita y se deja que el contenido diga si sirve.
function bsaRelajarSelectorArchivo(id){
  const inp = document.getElementById(id || 'archivoAbrir');
  if(inp && bsaEsMovil()) inp.removeAttribute('accept');
}
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('input[type=file][data-bsa-relajar]').forEach(i=>bsaRelajarSelectorArchivo(i.id));
});

function bsaPdfEnIframe(){
  const ua = navigator.userAgent || '';
  // El iPad se presenta como Macintosh desde iPadOS 13: se reconoce por el
  // numero de puntos tactiles.
  const iPad = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  return !(/Android|iPhone|iPad|iPod|Windows Phone|Opera Mini|IEMobile/i.test(ua) || iPad);
}

let _bsaUltimoTex = null;
function bsaEnviarTex(tex, url){
  _bsaUltimoTex = {tex: tex, url: url};
  const viejo = document.getElementById('formLatexNet');
  if(viejo) viejo.remove();
  const enIframe = bsaPdfEnIframe();
  const form = document.createElement('form');
  form.id = 'formLatexNet';
  form.action = url;
  form.method = 'post';
  form.enctype = 'multipart/form-data';
  form.target = enIframe ? 'latexFrame' : '_blank';
  form.style.display = 'none';
  const campo = (nombre, valor)=>{
    const inp = document.createElement('textarea');
    inp.name = nombre; inp.value = valor;
    form.appendChild(inp);
  };
  campo('filename[]', 'document.tex');
  campo('filecontents[]', tex);
  campo('engine', 'pdflatex');
  campo('return', 'pdf');
  document.body.appendChild(form);
  form.submit();
  return enIframe;
}

// Reintento manual: va dentro de un clic del alumno, asi que el navegador no
// lo bloquea aunque haya bloqueado la ventana automatica.
function bsaReabrirInforme(){
  if(_bsaUltimoTex) bsaEnviarTex(_bsaUltimoTex.tex, _bsaUltimoTex.url);
}

function bsaPanelMovil(){
  const cg = document.getElementById('latexCargando');
  if(cg) cg.style.display = 'none';
  const frame = document.getElementById('latexFrame');
  if(frame) frame.style.display = 'none';
  const pie = document.getElementById('latexPie');
  if(pie) pie.style.display = 'none';
  let caja = document.getElementById('latexMovil');
  if(!caja){
    caja = document.createElement('div');
    caja.id = 'latexMovil';
    caja.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;'
      + 'justify-content:center;gap:15px;padding:24px 20px;text-align:center;';
    caja.innerHTML =
        '<div style="font-size:34px;line-height:1">\uD83D\uDCC4</div>'
      + '<div style="font-size:13.5px;color:#374151;line-height:1.6;">'
      +   'Tu informe se abre en una <b>pesta\u00f1a nueva</b> del navegador.<br>'
      +   'Desde ah\u00ed puedes leerlo, guardarlo o compartirlo.'
      + '</div>'
      + '<button type="button" onclick="bsaReabrirInforme()" '
      +   'style="background:#0d3a8f;color:#fff;border:none;padding:11px 20px;border-radius:9px;'
      +   'font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Abrir el informe</button>'
      + '<div style="font-size:11px;color:#9aa3ad;line-height:1.5;max-width:280px;">'
      +   'Si no se abri\u00f3, tu navegador bloque\u00f3 la ventana: pulsa el bot\u00f3n.'
      + '</div>';
    if(frame && frame.parentNode) frame.parentNode.insertBefore(caja, frame);
  }
  caja.style.display = 'flex';
  const estado = document.getElementById('latexEstado');
  if(estado){
    estado.textContent = 'Informe enviado a otra pesta\u00f1a.';
    estado.style.color = '#15803D';
  }
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
