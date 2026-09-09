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
//  EJERCICIOS GUARDADOS EN ESTE EQUIPO
//  Por que existe: en el telefono, entregar un ARCHIVO desde el iframe del
//  portal no es fiable. La hoja de compartir exige activacion reciente del
//  usuario y la pierde en la cadena de awaits; y la descarga por URL data:
//  desde un subframe la restringe Chrome en Android, que fue lo que dejaba el
//  archivo en 0 B. La solucion no es cambiar de formato: es no depender del
//  sistema de archivos. El ejercicio se guarda en el almacenamiento del
//  navegador de este equipo, sin servidor y sin base de datos, y el Historial
//  lo vuelve a abrir. Para llevarselo a otro equipo esta bsaAbrirEnPestana.
//  Limites que hay que decir al alumno: vive en ESE navegador y en ESE
//  equipo, y se pierde si borra los datos del sitio.
// ==========================================================================
const BSA_CLAVE_EJ = 'bsa:ejercicios:';
const BSA_MAX_EJ = 20;                       // por tema

function _bsaAlmacen(app){
  try{ const v = JSON.parse(localStorage.getItem(BSA_CLAVE_EJ + app) || '[]'); return Array.isArray(v) ? v : []; }
  catch(e){ return []; }
}
function _bsaEscribirAlmacen(app, lista){
  try{ localStorage.setItem(BSA_CLAVE_EJ + app, JSON.stringify(lista)); return true; }
  catch(e){ return false; }                  // cuota llena o almacenamiento bloqueado
}
function bsaListaGuardados(app){
  return _bsaAlmacen(app).map(e=>({id:e.id, titulo:e.titulo, fecha:e.fecha}));
}
function bsaLeerGuardado(app, id){
  const e = _bsaAlmacen(app).find(x=>x.id === id);
  return e ? e.texto : null;
}
function bsaBorrarGuardado(app, id){
  _bsaEscribirAlmacen(app, _bsaAlmacen(app).filter(x=>x.id !== id));
}
// Guarda y devuelve {ok, motivo}. Un titulo repetido REEMPLAZA al anterior, que
// es lo que espera quien guarda dos veces el mismo ejercicio. Si no cabe, se
// van soltando los mas antiguos antes de rendirse.
function bsaGuardarEnEquipo(app, titulo, texto){
  const lista = _bsaAlmacen(app).filter(e=>e.titulo !== titulo);
  lista.unshift({id:'e' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
                 titulo: titulo, fecha: new Date().toISOString(), texto: texto});
  while(lista.length > BSA_MAX_EJ) lista.pop();
  while(lista.length > 1 && !_bsaEscribirAlmacen(app, lista)) lista.pop();
  if(!_bsaEscribirAlmacen(app, lista)) return {ok:false, motivo:'sin espacio'};
  return {ok:true, id:lista[0].id};
}
function bsaFechaCorta(iso){
  try{ return new Date(iso).toLocaleString('es-PE', {dateStyle:'short', timeStyle:'short'}); }
  catch(e){ return ''; }
}
function _bsaEsc(t){
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// Lista para el modal de Historial. Los dos onclick los define cada tema.
function bsaHtmlGuardados(app){
  const l = bsaListaGuardados(app);
  if(!l.length) return '<div class="bsa-guardados-vacio">Todavia no has guardado ningun ejercicio en este equipo.</div>';
  return '<div class="bsa-guardados">' + l.map(e=>
      '<div class="bsa-guardado">'
    + '<button type="button" class="bsa-guardado-abrir" onclick="abrirEjercicioGuardado(&quot;' + e.id + '&quot;)">'
    +   '<span class="bsa-guardado-nom">' + _bsaEsc(e.titulo) + '</span>'
    +   '<span class="bsa-guardado-fecha">' + _bsaEsc(bsaFechaCorta(e.fecha)) + '</span>'
    + '</button>'
    + '<button type="button" class="bsa-guardado-x" title="Quitar de este equipo" '
    +   'onclick="borrarEjercicioGuardado(&quot;' + e.id + '&quot;)">&times;</button>'
    + '</div>').join('') + '</div>';
}

// ── Llevarse el ejercicio a otro equipo, sin nube ──
// Se abre en una PESTANA propia. Ahi el documento es de nivel superior y el
// toque del alumno es un gesto nuevo, asi que descargar y compartir se
// comportan con normalidad; es el mismo truco que ya usa el informe PDF.
function bsaAbrirEnPestana(texto, nombre){
  const w = window.open('', '_blank');
  if(!w) return false;
  const n = _bsaEsc(nombre || 'ejercicio.txt');
  const datos = String(texto).replace(/<\//g, '<\\/');
  w.document.write(
      '<!doctype html><html lang="es"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + n + '</title><style>'
    + 'body{margin:0;padding:16px;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1b1f24;background:#f1f3f5}'
    + 'h1{font-size:16px;margin:0 0 4px}p{margin:0 0 14px;color:#66727e;font-size:12.5px}'
    + '.b{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}'
    + 'button{flex:1;min-width:120px;padding:12px 14px;border-radius:9px;border:1px solid #ccd2d8;'
    + 'background:#fff;font:inherit;font-weight:700;cursor:pointer}'
    + 'button.p{background:#0d3a8f;border-color:#0d3a8f;color:#fff}'
    + 'pre{white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #e0e4e8;'
    + 'border-radius:9px;padding:12px;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;max-height:52vh;overflow:auto}'
    + '#ok{color:#15803d;font-weight:700;font-size:12.5px;min-height:18px}'
    + '</style></head><body>'
    + '<h1>' + n + '</h1>'
    + '<p>Tu ejercicio. Guardalo con el boton, compartelo, o copia el texto y pegalo donde quieras.</p>'
    + '<div class="b"><button class="p" id="d">Descargar</button>'
    + '<button id="s" style="display:none">Compartir</button>'
    + '<button id="c">Copiar</button></div>'
    + '<div id="ok"></div>'
    + '<pre id="t"></pre>'
    + '<script type="application/json" id="j">' + datos + '<\/script>'
    + '<script>(function(){'
    + 'var txt=document.getElementById("j").textContent, nom=' + JSON.stringify(nombre || 'ejercicio.txt') + ';'
    + 'document.getElementById("t").textContent=txt;'
    + 'var ok=document.getElementById("ok");'
    + 'document.getElementById("d").onclick=function(){'
    + 'var b=new Blob([txt],{type:"text/plain"}),u=URL.createObjectURL(b),a=document.createElement("a");'
    + 'a.href=u;a.download=nom;document.body.appendChild(a);a.click();document.body.removeChild(a);'
    + 'setTimeout(function(){URL.revokeObjectURL(u);},4000);ok.textContent="Descargado.";};'
    + 'if(navigator.share&&navigator.canShare){var f=new File([txt],nom,{type:"text/plain"});'
    + 'if(navigator.canShare({files:[f]})){var sb=document.getElementById("s");sb.style.display="";'
    + 'sb.onclick=function(){navigator.share({files:[new File([txt],nom,{type:"text/plain"})],title:nom})'
    + '.then(function(){ok.textContent="Compartido.";}).catch(function(){});};}}'
    + 'document.getElementById("c").onclick=function(){'
    + 'if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){ok.textContent="Copiado.";});}'
    + 'else{var r=document.createRange();r.selectNodeContents(document.getElementById("t"));'
    + 'var s=getSelection();s.removeAllRanges();s.addRange(r);ok.textContent="Selecciona y copia.";}};'
    + '})();<\/script></body></html>');
  w.document.close();
  return true;
}
// Reenvia el ultimo ejercicio guardado. Lo llama el boton de la ventana Guardar.
let bsaUltimoTextoGuardado = '';
function bsaEnviarUltimo(){
  if(!bsaUltimoTextoGuardado){ return false; }
  return bsaAbrirEnPestana(bsaUltimoTextoGuardado, bsaUltimoNombreGuardado || 'ejercicio.txt');
}

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
  bsaUltimoTextoGuardado = texto;
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
// ── Referencias del informe, en APA ──
// Las mismas obras en los cinco temas, así que viven aquí: corregir una edición
// se hace en un solo sitio y sale igual en los cinco PDF. Orden alfabético y
// sangría francesa, como pide APA.
//   opts.materiales : añade el libro del que salen las tablas de perfiles
//                     (solo lo usan centroide y momentos de inercia).
//   opts.extra      : entradas propias del tema, ya escritas en LaTeX.
function bsaReferenciasLatex(opts){
  opts = opts || {};
  const refs = [
    'Beer, F. P., Johnston, E. R., Mazurek, D. F. y Cornwell, P. J. (2017). '
      + '\\emph{Mec\\\'anica vectorial para ingenieros: Est\\\'atica} (11.\\textsuperscript{a} ed.). McGraw-Hill Interamericana.'
  ];
  if(opts.materiales) refs.push(
    'Beer, F. P., Johnston, E. R., DeWolf, J. T. y Mazurek, D. F. (2017). '
      + '\\emph{Mec\\\'anica de materiales} (7.\\textsuperscript{a} ed.). McGraw-Hill Interamericana.');
  refs.push(
    'Hibbeler, R. C. (2016). \\emph{Ingenier\\\'ia mec\\\'anica: Est\\\'atica} (14.\\textsuperscript{a} ed.). Pearson Educaci\\\'on.');
  (opts.extra || []).forEach(r=>refs.push(r));
  // \par cierra el párrafo anterior: sin él, «Referencias» se pegaba al final
  // del último texto del informe en vez de empezar en su propia línea.
  return '\\par\\vspace{10pt}\\noindent{\\footnotesize\\color{bsaMuted}\\textbf{Referencias}\\\\[3pt]\n'
    + '\\begin{list}{}{\\setlength{\\leftmargin}{1.3em}\\setlength{\\itemindent}{-1.3em}'
    + '\\setlength{\\topsep}{0pt}\\setlength{\\itemsep}{2pt}\\setlength{\\parsep}{0pt}}\n'
    + refs.map(r=>'\\item ' + r + '\n').join('')
    + '\\end{list}}\n';
}

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
