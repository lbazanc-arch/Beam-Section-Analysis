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
    'Beer, F. P., Johnston, E. R. y Mazurek, D. F. (2024). '
      + '\\emph{Vector Mechanics for Engineers: Statics} (12.\\textsuperscript{a} ed., versi\\\'on 2024). McGraw Hill.'
  ];
  if(opts.materiales) refs.push(
    'Beer, F. P., Johnston, E. R., DeWolf, J. T. y Mazurek, D. F. (2020). '
      + '\\emph{Mechanics of Materials} (8.\\textsuperscript{a} ed.). McGraw Hill.');
  refs.push(
    'Hibbeler, R. C. (2027). \\emph{Engineering Mechanics: Statics} (16.\\textsuperscript{a} ed.). Pearson.');
  (opts.extra || []).forEach(r=>refs.push(r));
  // \par cierra el párrafo anterior: sin él, «Referencias» se pegaba al final
  // del último texto del informe en vez de empezar en su propia línea.
  return '\\par\\vspace{10pt}\\noindent{\\footnotesize\\color{bsaMuted}\\textbf{Referencias}\\\\[3pt]\n'
    + '\\begin{list}{}{\\setlength{\\leftmargin}{1.3em}\\setlength{\\itemindent}{-1.3em}'
    + '\\setlength{\\topsep}{0pt}\\setlength{\\itemsep}{2pt}\\setlength{\\parsep}{0pt}}\n'
    + refs.map(r=>'\\item ' + r + '\n').join('')
    + '\\end{list}}\n';
}

// Leyenda de los brazos de giro al costado de un DCL del PDF (2026-10-04,
// petición del profesor). Cuando las cotas de los brazos no dejan leer su valor
// (no caben en su línea o se pisan), en la figura cada cota lleva solo su
// nombre ($d_1$, $d_{AB}$…) y aquí se dan los valores. Se pone al final del
// tikzpicture, a la derecha de todo lo dibujado. `filas` = [{nom, val}], con
// `nom` en modo matemático y `val` ya con su unidad. La usan fuerzas internas,
// armaduras y presión.
function bsaLeyendaBrazosTikz(filas){
  if(!filas || !filas.length) return '';
  return '\\node[anchor=north west, xshift=4mm, font=\\scriptsize, align=left, draw=black!25, '
    + 'fill=white, rounded corners=1pt, inner sep=3pt] at (current bounding box.north east) {'
    + '\\textbf{Brazos}' + filas.map(f=>'\\\\ $' + f.nom + ' = ' + f.val + '$').join('') + '};\n';
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

// ==========================================================================
//  CONVENIO DE ANGULOS QUE ESCRIBE EL USUARIO  (2026-09-11)
//
//  El angulo que el alumno teclea senala DE DONDE VIENE la fuerza o DONDE
//  ESTA el apoyo, no hacia donde apunta la flecha:
//
//    Apoyo   0 = se apoya en la pared derecha   180 / -180 = pared izquierda
//            90 = se apoya en el techo          -90        = en el suelo
//    Carga   0 = va hacia la izquierda          180        = hacia la derecha
//            90 = hacia abajo                   270        = hacia arriba
//
//  Los motores y los dibujos siguen trabajando con el angulo MATEMATICO de
//  siempre (desde +x, antihorario, hacia donde apunta el vector): un rodillo
//  en el suelo empuja a 90, una carga hacia abajo va a -90. Entre los dos
//  convenios hay exactamente media vuelta, y esta funcion es esa media
//  vuelta. Es involutiva -aplicarla dos veces devuelve el valor original-,
//  asi que la misma llamada sirve para leer un campo y para rellenarlo.
//
//  Se convierte SOLO en el borde de la interfaz (al leer un campo y al
//  escribirlo). Lo guardado en el archivo del ejercicio sigue siendo el
//  angulo matematico, de modo que los ejercicios anteriores se abren sin
//  conversion y ningun motor cambia.
// ==========================================================================
//  `rango360` elige como se ENSENA el resultado, que no cambia el angulo:
//  los apoyos se cuentan en (-180, 180] porque asi los dijo el profesor
//  (-90 el suelo, 180 o -180 la pared izquierda), y las cargas en [0, 360)
//  por lo mismo (0 izquierda, 90 abajo, 180 derecha, 270 arriba). Sin esto,
//  quien escribia 270 en una carga la reabria viendo -90.
function bsaAnguloOpuesto(a, rango360){
  const n = Number(a);
  if(!isFinite(n)) return 0;
  let v = ((n + 180) % 360 + 360) % 360;   // media vuelta, ya en [0, 360)
  if(!rango360 && v > 180) v -= 360;       // rango (-180, 180]
  return +v.toFixed(6);
}

// ==========================================================================
//  EL ANGULO AGUDO CON EL QUE SE DICE UNA DIRECCION  (2026-09-14)
//
//  Eje mas cercano y angulo agudo con los que se ACOTA una direccion (ux,uy):
//  desde la horizontal si esta a menos de 45 grados de ella, desde la
//  vertical si no. Es el UNICO criterio del proyecto para escribir el angulo
//  de una reaccion o de una fuerza: lo usan el lienzo, la tabla de
//  resultados, el arco de las figuras del PDF y la descomposicion del
//  informe, en armaduras, fuerzas internas y presion, para que en pantalla y
//  en el papel se lea el mismo numero. El empate a 45 grados va siempre
//  hacia la vertical, y no segun el redondeo del coseno. El angulo de 0 a
//  360 con el que un modelo guarda una reaccion no se ensena nunca.
// ==========================================================================
function bsaAnguloAgudoEje(ux, uy){
  const conH = Math.acos(Math.min(1, Math.abs(ux))) * 180/Math.PI;   // con la horizontal
  const desdeV = conH > 45 - 1e-7;                                     // mas cerca de la vertical
  return {desdeV, grados: desdeV ? 90 - conH : conH};
}

// Como se dice esa direccion en pantalla: '45.00° de la vertical'. Usa el
// `dec(v,'ang')` del tema que lo llama: los decimales de ANGULOS de su ventana
// (hasta el 2026-09-27 eran los de las fuerzas).
function bsaTextoAnguloAgudo(ux, uy){
  const a = bsaAnguloAgudoEje(ux, uy);
  return dec(a.grados,'ang') + '° de la ' + (a.desdeV ? 'vertical' : 'horizontal');
}
// Angulo de una fuerza inclinada en el CROQUIS de una ventana (SVG, y hacia
// abajo), medido desde +x (2026-10-04, peticion del profesor). Va en la COLA
// de la flecha (x, y), que es donde la flecha arranca en la direccion `ang`
// (grados, desde +x, antihorario, hacia donde apunta): con el arco en el nudo,
// al otro lado de la flecha, no se entendia a que se referia. Dibuja +x a trazos
// con su rotulo, el arco del equivalente MAS CORTO (en (-180, 180]: 270 se
// acota -90) con punta en el sentido del giro, y el valor donde menos estorba:
// lejos de las direcciones `ocupadas` (grados, mismo convenio; la flecha y +x
// ya se cuentan). Lo usan fuerzas internas, armaduras y presion (el tope).
// Devuelve {svg, t}: t es el angulo acotado.
function bsaArcoAnguloSVG(o){
  const F = v => v.toFixed(1), rad = g => g*Math.PI/180;
  const x = o.x, y = o.y, col = o.col || '#c0392b', r = o.r || 15, ref = o.ref || 30;
  let t = (((+o.ang % 360) + 540) % 360) - 180;
  if(t <= -180 + 1e-9) t = 180;
  t = +t.toFixed(4);
  let s = '<line x1="' + F(x) + '" y1="' + F(y) + '" x2="' + F(x + ref) + '" y2="' + F(y)
        + '" stroke="' + col + '" stroke-width="1" stroke-dasharray="3,2" opacity=".85"/>'
        + '<text x="' + F(x + ref + 2) + '" y="' + F(y + 3) + '" font-family="Inter,sans-serif" font-size="8.5" font-weight="700" fill="#66727e">+x</text>';
  if(Math.abs(t) > 0.5){
    const ex = x + r*Math.cos(rad(t)), ey = y - r*Math.sin(rad(t));
    s += '<path d="M ' + F(x + r) + ' ' + F(y) + ' A ' + r + ' ' + r + ' 0 0 ' + (t > 0 ? 0 : 1) + ' '
       + F(ex) + ' ' + F(ey) + '" fill="none" stroke="' + col + '" stroke-width="1.4"/>';
    // Punta tangente al arco en su extremo, en el sentido del giro.
    const tx = (t > 0) ? -Math.sin(rad(t)) : Math.sin(rad(t));
    const ty = (t > 0) ? -Math.cos(rad(t)) : Math.cos(rad(t));
    const g = Math.atan2(ty, tx)*180/Math.PI;
    s += '<polygon points="0,0 -6,-2.8 -6,2.8" fill="' + col + '" transform="translate(' + F(ex) + ',' + F(ey) + ') rotate(' + g.toFixed(1) + ')"/>';
  }
  // El valor: se prueban sitios alrededor de la cola (bisectriz del arco y a
  // sus lados, a dos distancias) y gana el que no pisa nada de lo dibujado
  // (`o.segs` [x1,y1,x2,y2] y `o.cajas` {x0,x1,y0,y1}, en pantalla), no se sale
  // del dibujo (`o.ancho`, `o.alto`) y queda más lejos de las direcciones
  // ocupadas. Devuelve también su caja, para que el que llama la registre.
  const txt = dec(t, 'ang') + '°';
  const ocup = [0, t].concat(o.ocupadas || []);
  const dif = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
  const pisa = (c, sg) => {                  // ¿el segmento sg cruza la caja c (con holgura)?
    const h = 2, dx = sg[2]-sg[0], dy = sg[3]-sg[1];
    const p = [-dx, dx, -dy, dy], q = [sg[0]-(c.x0-h), (c.x1+h)-sg[0], sg[1]-(c.y0-h), (c.y1+h)-sg[1]];
    let t0 = 0, t1 = 1;
    for(let i = 0; i < 4; i++){
      if(Math.abs(p[i]) < 1e-12){ if(q[i] < 0) return false; continue; }
      const rr = q[i]/p[i];
      if(p[i] < 0){ if(rr > t1) return false; if(rr > t0) t0 = rr; } else { if(rr < t0) return false; if(rr < t1) t1 = rr; }
    }
    return true;
  };
  const segsTodos = (o.segs || []).concat([[x, y, x + ref + 12, y]]);
  for(let i = 0; i < 8; i++){                // el propio arco, en ocho trozos
    const a0 = rad(t*i/8), a1 = rad(t*(i+1)/8);
    segsTodos.push([x + r*Math.cos(a0), y - r*Math.sin(a0), x + r*Math.cos(a1), y - r*Math.sin(a1)]);
  }
  let mejor = null;
  for(const dA of [0, 30, -30, 60, -60, 90, -90, 120, -120, 180]) for(const dr of [10, 20, 32]){
    const a = t/2 + dA, ca = Math.cos(rad(a));
    const lx = x + (r + dr)*ca, ly = y - (r + dr)*Math.sin(rad(a)) + 3.5;
    const ta = ca > 0.3 ? 'start' : (ca < -0.3 ? 'end' : 'middle');
    const w = txt.length*6.2, x0 = ta === 'start' ? lx : (ta === 'end' ? lx - w : lx - w/2);
    const c = {x0, x1:x0 + w, y0:ly - 9.5, y1:ly + 2.5};
    let k = 0;
    segsTodos.forEach(sg=>{ if(pisa(c, sg)) k++; });
    (o.cajas || []).forEach(b=>{ if(c.x0 < b.x1 && b.x0 < c.x1 && c.y0 < b.y1 && b.y0 < c.y1) k++; });
    if(o.ancho && (c.x0 < 1 || c.x1 > o.ancho - 1)) k += 5;
    if(o.alto && (c.y0 < 1 || c.y1 > o.alto - 1)) k += 5;
    // Primero que no pise nada; después, lo más cerca de la bisectriz del arco
    // (junto a él), con algo de holgura respecto de la flecha y de +x.
    const holg = Math.min(30, ...ocup.map(qq => dif(a, qq)));
    const nota = k*1000 + Math.abs(dA)*0.8 + dr*0.3 - holg*0.5;
    if(!mejor || nota < mejor.nota) mejor = {nota, lx, ly, ta, c};
  }
  s += '<text x="' + F(mejor.lx) + '" y="' + F(mejor.ly) + '" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="' + col
     + '" text-anchor="' + mejor.ta + '">' + txt + '</text>';
  return {svg:s, t, caja:mejor.c};
}
// Arco del angulo de una reaccion inclinada en el LIENZO, en la cola de su
// flecha (coordenadas de pantalla, y hacia abajo): entre el eje mas cercano
// (trazo punteado de 26 px) y la flecha, radio 17, con el valor agudo junto
// al extremo del trazo, del lado contrario al fuste y creciendo lejos del
// nudo (en la bisectriz chocaba con el fuste o con el simbolo del apoyo).
// (x0,y0) es la cola; (ex,ey) el sentido de la flecha EN EL MUNDO (y hacia
// arriba). Devuelve false si el angulo es menor de 4 grados (no dibuja nada).
// Es el mismo planteamiento que el arco de las figuras de los PDF, y lo usan
// armaduras, fuerzas internas y presion: un solo dibujo para los tres.
function bsaArcoReaccion(ctx, x0, y0, ex, ey, col){
  const ag = bsaAnguloAgudoEje(ex, ey);
  if(ag.grados < 4) return false;
  const rx = ag.desdeV ? 0 : (ex >= 0 ? 1 : -1), ry = ag.desdeV ? (ey >= 0 ? 1 : -1) : 0;
  const a0 = Math.atan2(-ry, rx), a1 = Math.atan2(-ey, ex);      // angulos de pantalla
  let d = a1 - a0; while(d > Math.PI) d -= 2*Math.PI; while(d < -Math.PI) d += 2*Math.PI;
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth = 1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 26*rx, y0 - 26*ry); ctx.stroke();
  ctx.setLineDash([]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x0, y0, 17, a0, a1, d < 0); ctx.stroke();
  const sx = Math.cos(a1), sy = Math.sin(a1), tx = rx, ty = -ry;
  let qx = -ty, qy = tx; if(qx*sx + qy*sy > 0){ qx = -qx; qy = -qy; }
  const haciaDerecha = sx < 0;
  ctx.font = '700 10px Inter, sans-serif'; ctx.textBaseline = 'middle';
  ctx.textAlign = haciaDerecha ? 'left' : 'right';
  ctx.fillText(dec(ag.grados,'ang') + '°', x0 + 26*tx + 14*qx, y0 + 26*ty + 14*qy);
  ctx.restore();
  return true;
}
// Letras griegas para los angulos de una figura del PDF: una letra por valor,
// y dos angulos iguales (a menos de 0.15 grados) comparten letra, con el valor
// escrito una sola vez en el pie (regla R21 de los DCL). Una instancia por
// figura. Lo usan armaduras y fuerzas internas.
function bsaLetrasGriegas(){
  const lista = ['\\theta','\\alpha','\\beta','\\gamma','\\delta','\\varepsilon','\\zeta','\\eta'];
  let i = 0;
  const vistos = [];   // {valor, letra}
  return {
    para(valor){
      const igual = vistos.find(v => Math.abs(v.valor-valor) < 0.15);
      if(igual) return igual.letra;
      const l = lista[i % lista.length]; i++;
      vistos.push({valor, letra:l});
      return l;
    }
  };
}

// ==========================================================================
//  EL INFORME RAPIDO (boton rojo "PDF", no el de LaTeX)  (2026-09-14)
//
//  Imprime los resultados de pantalla como un documento propio. Sustituye a
//  las cinco copias de downloadPDF, que fallaban igual en los cinco temas:
//   - KaTeX sin estilos: la hoja se enlazaba por ruta relativa en una ventana
//     about:blank (o se buscaba un <style id="katex-css"> que ya no existe).
//   - Controles de pantalla impresos (botones, casillas, deslizadores).
//   - @page sin margen: desde la 2.a hoja el texto tocaba el borde.
//   - En el movil, pestana con ancho de escritorio, sin boton para imprimir y
//     un print() por temporizador que iOS y Android no respetan; y en dos
//     temas la ventana se abria DESPUES de recortar el lienzo, fuera del gesto.
//
//  Como funciona ahora:
//   1. La pestana se abre LO PRIMERO, sincronica dentro de la pulsacion
//      (bsaInformeRapido); si el navegador la bloquea, un aviso con boton la
//      reintenta con un gesto nuevo (bsaReintentarInforme).
//   2. El panel de resultados se CLONA y se limpia (bsaLimpiarResultados): cada
//      <canvas> pasa a imagen recortada, cada control se quita (o deja su
//      valor como texto) y los contenedores con scroll se abren.
//   3. bsaDocInforme arma un documento completo de nivel superior: cabecera
//      con las letras BSA, figuras, cuerpo, colofon igual al del LaTeX y una
//      barra "Imprimir / Guardar como PDF" que no sale en el papel. En pantalla
//      es una pagina adaptable; al imprimir, A4 con margenes.
//   4. En el ordenador se imprime solo al cargar (tras las fuentes); en el
//      telefono y la tableta NO: pulsa el boton, que es un gesto nuevo en un
//      documento de nivel superior y ahi si funciona.
// ==========================================================================

// ── Recorte de un lienzo a su dibujo ──
// Devuelve {src, ancho, alto}: la imagen PNG con fondo blanco y su tamano en
// px CSS (el lienzo guarda px fisicos: con devicePixelRatio 2 un recorte de
// 800 px se veia al doble en el papel). null si el lienzo mide 0, esta vacio
// o no se puede leer. Cuenta como dibujo lo que no es transparente ni gris
// casi blanco sin saturacion (la reticula del editor).
function _bsaRecorte(cv){
  if(!cv || !cv.getContext) return null;
  const w = cv.width, h = cv.height;
  if(!w || !h) return null;
  try{
    const d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for(let y = 0; y < h; y++){
      for(let x = 0; x < w; x++){
        const i = (y*w + x)*4;
        if(d[i+3] < 8) continue;
        const r = d[i], g = d[i+1], b = d[i+2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if((mx - mn) <= 18 && mn >= 190) continue;
        if(x < x0) x0 = x; if(x > x1) x1 = x;
        if(y < y0) y0 = y; if(y > y1) y1 = y;
      }
    }
    if(x1 < 0) return null;                            // nada dibujado
    const m = Math.round(Math.min(w, h)*0.02) + 6;     // margen para que no quede pegado
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
    x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const t = document.createElement('canvas');
    t.width = cw; t.height = ch;
    const tc = t.getContext('2d');
    tc.fillStyle = '#ffffff'; tc.fillRect(0, 0, cw, ch);
    tc.drawImage(cv, x0, y0, cw, ch, 0, 0, cw, ch);
    // Escala del lienzo: px fisicos por px CSS. Si esta oculto (clientWidth 0)
    // se supone la densidad de la pantalla.
    const esc = cv.clientWidth > 0 ? w / cv.clientWidth : (window.devicePixelRatio || 1);
    return {src: t.toDataURL('image/png'), ancho: Math.round(cw/esc), alto: Math.round(ch/esc)};
  }catch(e){
    return null;                                       // lienzo contaminado o sin memoria
  }
}
function bsaRecortarLienzo(cv){
  const r = _bsaRecorte(cv);
  return r ? r.src : null;
}

// ── La hoja de KaTeX para un documento nuevo ──
// Devuelve lo que va en el <head>: un <style> con el texto de katex.min.css
// leido de document.styleSheets, si ese texto conserva las fuentes; si no
// (Chrome las omite) o no se puede leer, un <link> con la URL ABSOLUTA de la
// hoja, que ya esta en la cache y lleva las fuentes dentro como data:. Una
// ruta relativa no sirve: el documento nuevo es about:blank.
let _bsaCssKatexCache = null;
function bsaCssKatex(){
  if(_bsaCssKatexCache) return _bsaCssKatexCache;
  let hoja = null;
  try{
    hoja = Array.from(document.styleSheets).find(s => s.href && /katex[^/]*\.css/i.test(s.href)) || null;
  }catch(e){ hoja = null; }
  if(hoja){
    try{
      const base = hoja.href;
      const reglas = Array.from(hoja.cssRules);
      // Chrome serializa @font-face SIN su src cuando la fuente va en data:
      // (comprobado 2026-09-14: 23 KB de texto frente a 369 KB del archivo).
      // Un texto asi dejaria KaTeX sin sus fuentes: entonces se enlaza.
      const sinFuente = reglas.some(r => r.type === 5 /* FONT_FACE_RULE */
        && !(r.style && r.style.getPropertyValue('src')));
      if(sinFuente) throw new Error('font-face sin src');
      let css = reglas.map(r => r.cssText).join('\n');
      // Por si alguna url() quedo relativa: se resuelve contra la hoja.
      css = css.replace(/url\((['"]?)(?!data:|https?:|blob:|#)([^'")]+)\1\)/g,
        (m, q, u) => { try{ return 'url("' + new URL(u, base).href + '")'; }catch(e){ return m; } });
      _bsaCssKatexCache = '<style>' + css.replace(/<\/style/gi, '<\\/style') + '</style>';
      return _bsaCssKatexCache;
    }catch(e){ /* cssRules inaccesible (file:// u otro origen) o sin fuentes: se enlaza */ }
  }
  const viejo = document.getElementById('katex-css');                 // formato anterior al desglose
  if(viejo && viejo.textContent) return '<style>' + viejo.textContent + '</style>';
  let href = hoja ? hoja.href : '';
  if(!href){
    const ln = document.querySelector('link[rel="stylesheet"][href*="katex"]');
    href = ln ? ln.href : 'vendor/katex.min.css';
  }
  try{ href = new URL(href, location.href).href; }catch(e){}
  return '<link rel="stylesheet" href="' + _bsaEsc(href) + '">';
}

// Ancho maximo de una imagen del informe (px CSS), como estilo en linea. Tope y
// no ancho fijo: con ancho y alto automaticos, el max-height del CSS reduce los
// dos a la vez; un width fijo dejaba bandas vacias a los lados. Primero
// max-width:100%, por si el navegador no conoce min().
function _bsaTopeAncho(ancho){
  return 'max-width:100%;max-width:min(100%,' + Math.round(ancho) + 'px)';
}

// ── Clon de los resultados, listo para el papel ──
// No toca el panel de la pantalla: trabaja sobre una copia y devuelve su HTML.
//   opts.conservarValores (true)  un campo de texto o numero con valor, un
//        <select> o un <textarea> se sustituyen por su valor como texto
//        (<span class="bsa-valor">), porque suele ser un dato del resultado
//        ("Admisible en traccion 20"). Con false se quitan sin mas.
//   opts.quitar     selector CSS de lo que ademas hay que quitar ('.notation-bar').
//   opts.lienzo(cv) devuelve {src, ancho?, alto?}, un dataURL o null para un
//        lienzo concreto; si no se da, o devuelve undefined, se usa el recorte.
//   opts.tituloLienzo(cv) pie para la figura de ese lienzo (opcional).
//   opts.conservarOcultos (false) con true, lo que en pantalla tiene
//        display:none tambien se copia (por defecto se quita).
//   opts.reemplazarTexto [[RegExp|texto, reemplazo], ...] se aplica a los
//        nodos de texto del clon (fuera de KaTeX): una frase de pantalla metida
//        en un parrafo que si va al papel ("El desarrollo completo va en el
//        PDF.") o un rotulo imperativo ("Gira los ejes..."). Un texto se
//        reemplaza en todas sus apariciones; una RegExp, segun sus banderas.
// Siempre se quitan: button, input (casillas, radios, deslizadores, archivos),
// [data-bsa-pantalla], script y template; las etiquetas que se quedan vacias
// o sin su control; los contenedores que solo tenian controles; los atributos
// on* y contenteditable. Un <canvas> pasa a <figure class="bsa-fig"><img>;
// si esta vacio desaparece. overflow auto/scroll pasa a visible y se quita su
// max-height; los <details> se abren. KaTeX no se recorre por dentro.
function bsaLimpiarResultados(panel, opts){
  opts = opts || {};
  if(typeof panel === 'string') panel = document.getElementById(panel);
  if(!panel) return '';
  const conservar = opts.conservarValores !== false;
  const clon = panel.cloneNode(true);

  // 1) Recorrido en paralelo original ↔ clon ANTES de modificar nada: el
  //    clon es identico, asi que los hijos se emparejan por posicion. El
  //    original da lo que la copia no conserva (valor vivo de un campo,
  //    pixeles del lienzo, estilo calculado, URL absoluta).
  const lienzos = [], campos = [], desbordes = [], enlaces = [], ocultos = [];
  const conservarOcultos = !!opts.conservarOcultos;
  const paralelo = (o, c)=>{
    const tag = o.tagName;
    const esSvg = (typeof SVGElement !== 'undefined') && o instanceof SVGElement;
    let cs = null;
    if(!esSvg){ try{ cs = getComputedStyle(o); }catch(e){ cs = null; } }
    // Lo que en pantalla no se ve tampoco va al papel (el panel en si, no:
    // puede estar en un desplegable cerrado). Sin recorrerlo, asi que un
    // lienzo oculto ni se recorta. Se salvan <style> y <link>, que siempre
    // son display:none, y un contenedor de <defs> que otros SVG referencian.
    if(o !== panel && cs && cs.display === 'none' && !conservarOcultos
       && tag !== 'STYLE' && tag !== 'LINK' && !o.querySelector('defs,symbol,marker')){
      ocultos.push(c);
      return;
    }
    if(tag === 'CANVAS') lienzos.push([o, c]);
    else if(tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') campos.push([o, c]);
    else if(tag === 'IMG' || tag === 'A') enlaces.push([o, c]);
    // Ni KaTeX ni un SVG llevan controles, lienzos ni scroll: no se recorren
    // (miles de spans y trazos que solo encarecerian getComputedStyle).
    if(o.classList && o.classList.contains('katex')) return;
    if(esSvg) return;
    if(cs && /auto|scroll/.test(cs.overflowX + ' ' + cs.overflowY)) desbordes.push(c);
    const oh = o.children, ch = c.children;
    for(let i = 0; i < oh.length && i < ch.length; i++) paralelo(oh[i], ch[i]);
  };
  paralelo(panel, clon);
  // Fuera lo oculto ANTES de nada: sus controles y lienzos no se han apuntado.
  const padresOcultos = [];
  ocultos.forEach(c=>{ if(c.parentNode){ padresOcultos.push(c.parentNode); c.parentNode.removeChild(c); } });

  const padres = padresOcultos;            // para limpiar lo que queda vacio
  const quitar = (el)=>{
    if(!el || !el.parentNode) return;
    padres.push(el.parentNode);
    el.parentNode.removeChild(el);
  };

  // 2) Lienzos → imagen
  lienzos.forEach(([o, c])=>{
    let r;
    if(typeof opts.lienzo === 'function'){ try{ r = opts.lienzo(o); }catch(e){ r = undefined; } }
    if(r === undefined) r = _bsaRecorte(o);
    if(typeof r === 'string') r = {src: r};
    if(!r || !r.src){ quitar(c); return; }
    const fig = document.createElement('figure');
    fig.className = 'bsa-fig bsa-fig-lienzo';
    let titulo = '';
    if(typeof opts.tituloLienzo === 'function'){ try{ titulo = opts.tituloLienzo(o) || ''; }catch(e){} }
    if(titulo){
      const cap = document.createElement('figcaption');
      cap.textContent = titulo;
      fig.appendChild(cap);
    }
    const img = document.createElement('img');
    img.src = r.src;
    img.alt = titulo || 'Figura';
    // Tope de ancho, no ancho fijo: con width y alto automaticos, el max-height
    // del CSS reduce los dos a la vez; un width fijo dejaba bandas vacias.
    if(r.ancho) img.setAttribute('style', _bsaTopeAncho(r.ancho));
    fig.appendChild(img);
    if(c.parentNode) c.parentNode.replaceChild(fig, c);
  });

  // 3) Controles: fuera, o su valor como texto. Una etiqueta que CONTENIA un
  //    control retirado se va con el ("Grupo 1" junto a una casilla que ya
  //    no esta no dice nada); lo mismo la que lo apuntaba con for=.
  const idsRetirados = new Set(), etiquetas = new Set(), padresDeCampo = new Set();
  campos.forEach(([o, c])=>{
    const tag = o.tagName;
    let valor = '';
    if(conservar){
      if(tag === 'SELECT'){
        const op = o.options && o.selectedIndex >= 0 ? o.options[o.selectedIndex] : null;
        valor = op ? op.text : '';
      }else if(tag === 'TEXTAREA'){
        valor = o.value;
      }else if(tag === 'INPUT'){
        const tipo = (o.getAttribute('type') || 'text').toLowerCase();
        if(['text','number','email','search','tel','url','date','time'].indexOf(tipo) >= 0) valor = o.value;
      }
    }
    valor = String(valor || '').trim();
    if(valor){
      const s = document.createElement('span');
      s.className = 'bsa-valor';
      s.textContent = valor;
      if(c.parentNode) c.parentNode.replaceChild(s, c);
    }else{
      if(o.id) idsRetirados.add(o.id);
      const lab = c.closest ? c.closest('label') : null;
      if(lab && lab !== clon) etiquetas.add(lab);
      if(c.parentNode && c.parentNode !== clon) padresDeCampo.add(c.parentNode);
      quitar(c);
    }
  });
  clon.querySelectorAll('label').forEach(l=>{
    const f = l.getAttribute('for');
    if(f && idsRetirados.has(f)) etiquetas.add(l);
    else if(!l.textContent.trim() && !l.querySelector('img,svg,.katex,.bsa-valor')) etiquetas.add(l);
  });
  // Etiqueta HERMANA del control retirado: <div class="field"><label>Punto X
  // </label><input></div>. Si en ese contenedor ya solo quedan etiquetas
  // (ningun otro elemento ni texto suelto), no rotulan nada.
  padresDeCampo.forEach(p=>{
    if(!clon.contains(p)) return;
    const hijos = Array.from(p.childNodes);
    const soloEtiquetas = hijos.some(n => n.nodeType === 1)
      && hijos.every(n => (n.nodeType === 1 && n.tagName === 'LABEL')
                       || (n.nodeType === 3 && !n.textContent.trim())
                       || n.nodeType === 8);
    if(soloEtiquetas) hijos.forEach(n=>{ if(n.nodeType === 1) etiquetas.add(n); });
  });
  etiquetas.forEach(l=>{ if(clon.contains(l)) quitar(l); });

  // 4) Lo que el tema marca como "solo pantalla" y lo que pide quitar
  let sel = '[data-bsa-pantalla],script,template,noscript';
  if(opts.quitar) sel += ',' + opts.quitar;
  try{ clon.querySelectorAll(sel).forEach(quitar); }
  catch(e){ clon.querySelectorAll('[data-bsa-pantalla],script,template,noscript').forEach(quitar); }

  // 4b) Frases de pantalla dentro de texto que se imprime
  const cambios = Array.isArray(opts.reemplazarTexto) ? opts.reemplazarTexto.filter(p => Array.isArray(p) && p[0]) : [];
  if(cambios.length){
    const nodos = [];
    const tw = document.createTreeWalker(clon, 4 /* NodeFilter.SHOW_TEXT */, null);
    for(let n = tw.nextNode(); n; n = tw.nextNode()){
      const p = n.parentNode;
      if(p && p.closest && p.closest('.katex,style')) continue;
      nodos.push(n);
    }
    nodos.forEach(n=>{
      let t = n.nodeValue;
      cambios.forEach(([busca, pone])=>{
        pone = pone == null ? '' : String(pone);
        t = (busca instanceof RegExp) ? t.replace(busca, pone) : t.split(String(busca)).join(pone);
      });
      if(t === n.nodeValue) return;
      n.nodeValue = t;
      if(!t.trim() && n.parentNode) padres.push(n.parentNode);
    });
  }

  // 5) Contenedores que solo tenian controles: vacios, fuera
  const VACIABLES = {DIV:1, P:1, SPAN:1, LABEL:1, FORM:1, FIELDSET:1, SECTION:1, LI:1, UL:1};
  padres.forEach(p=>{
    let n = p;
    // (isConnected no sirve: el clon no esta en el documento)
    while(n && n !== clon && n.nodeType === 1 && VACIABLES[n.tagName]
          && clon.contains(n) && !n.textContent.trim()
          && !n.querySelector('img,svg,figure,table,hr,canvas,.katex,math')){
      const sube = n.parentNode;
      sube.removeChild(n);
      n = sube;
    }
  });

  // 6) Scroll abierto, <details> abiertos, URLs absolutas, sin manejadores
  desbordes.forEach(c=>{
    if(!clon.contains(c) && c !== clon) return;
    c.style.setProperty('overflow', 'visible', 'important');
    c.style.setProperty('max-height', 'none', 'important');
  });
  enlaces.forEach(([o, c])=>{
    if(o.tagName === 'IMG' && o.getAttribute('src')) c.setAttribute('src', o.src);
    if(o.tagName === 'A' && o.getAttribute('href')){
      if(/^\s*javascript:/i.test(o.getAttribute('href'))) c.removeAttribute('href');
      else if(o.getAttribute('href').charAt(0) !== '#') c.setAttribute('href', o.href);
    }
  });
  clon.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
  const todos = [clon].concat(Array.from(clon.querySelectorAll('*')));
  todos.forEach(el=>{
    const attrs = el.attributes;
    for(let i = attrs.length - 1; i >= 0; i--){
      const nom = attrs[i].name.toLowerCase();
      if(nom.indexOf('on') === 0 || nom === 'contenteditable') el.removeAttribute(attrs[i].name);
    }
  });
  // El panel de pantalla puede estar oculto con display:none en linea.
  return clon.innerHTML;
}

// ── El documento completo ──
//   tema         'Fuerzas internas' (cabecera y <title>)
//   acento       {acc, acc2, suave, borde} del tema
//   figuras      [{titulo, src, ancho?}] antes del cuerpo (las nulas se saltan)
//   cuerpo       HTML de bsaLimpiarResultados
//   cssTema      CSS propio del tema (clases del panel de resultados); va
//                despues del comun, asi que puede redefinir cualquier cosa.
//                Tamanos pensados para el PAPEL (como los de hoy): en pantalla
//                la hoja se amplia sola para que se lea en el movil.
//   autoImprimir abre el dialogo de impresion al cargar (solo en el ordenador)
//   fecha        Date (opcional; por defecto, ahora)
// Variables disponibles para cssTema: --acc --acc2 --suave --borde, y los
// alias de los CSS de impresion de siempre: --grn --grn2 --card --border
// --text --muted --math --sans.
function bsaDocInforme(o){
  o = o || {};
  const tema = String(o.tema || 'Informe');
  const ac = Object.assign({acc:'#0d3a8f', acc2:'#041d56', suave:'#eef2fb', borde:'#d5dce6'}, o.acento || {});
  const f = o.fecha instanceof Date ? o.fecha : new Date();
  const dos = n => (n < 10 ? '0' : '') + n;
  const fechaIso = f.getFullYear() + '-' + dos(f.getMonth() + 1) + '-' + dos(f.getDate());
  let fechaLarga = fechaIso;
  try{ fechaLarga = f.toLocaleString('es-PE', {dateStyle:'long', timeStyle:'short'}); }catch(e){}
  const titulo = 'BSA — ' + tema + ' — ' + fechaIso;
  const katex = bsaCssKatex();
  const katexHead = /^\s*</.test(katex) ? katex : '<style>' + katex + '</style>';
  const cssVar = (v)=> String(v).replace(/[;{}<>]/g, '');

  const cssComun = ''
    + ':root{--acc:' + cssVar(ac.acc) + ';--acc2:' + cssVar(ac.acc2) + ';--suave:' + cssVar(ac.suave) + ';--borde:' + cssVar(ac.borde) + ';'
    +   '--grn:var(--acc);--grn2:var(--acc2);--card:var(--suave);--border:var(--borde);'
    +   '--text:#1a1a1a;--muted:#5f6b76;'
    +   "--math:'STIX Two Text','Times New Roman',Georgia,serif;--sans:Inter,'Helvetica Neue',Arial,sans-serif;}"
    + '*,*::before,*::after{box-sizing:border-box}'
    + 'html{-webkit-text-size-adjust:100%;text-size-adjust:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + 'body{margin:0;background:#e9edf1;color:var(--text);font-family:var(--sans);font-size:10.5px;line-height:1.45}'
    // Barra de pantalla (no se imprime)
    + '.bsa-barra{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;align-items:center;gap:8px;'
    +   'padding:10px 16px;background:#fff;border-bottom:1px solid #d5dce6;box-shadow:0 1px 6px rgba(0,0,0,.06);font-size:13px}'
    + '.bsa-barra-txt{flex:1 1 220px;min-width:0;color:#5f6b76;font-size:12.5px;line-height:1.35}'
    + '.bsa-barra button{font:inherit;font-weight:700;font-size:14px;min-height:44px;padding:10px 16px;border-radius:9px;'
    +   'border:1px solid #ccd2d8;background:#fff;color:#1b1f24;cursor:pointer}'
    + '.bsa-barra .bsa-imprimir{background:var(--acc2);border-color:var(--acc2);color:#fff}'
    + '.bsa-barra button:focus-visible{outline:3px solid var(--acc);outline-offset:2px}'
    // Hoja
    + '.bsa-hoja{max-width:196mm;margin:18px auto 32px;padding:12mm 12mm 10mm;background:#fff;'
    +   'box-shadow:0 2px 14px rgba(0,0,0,.08);border-radius:4px}'
    + '@media screen{.bsa-hoja{zoom:1.3}}'
    + '@media screen and (max-width:640px){body{background:#fff}.bsa-hoja{zoom:1.2;margin:0;padding:14px 12px 20px;'
    +   'border-radius:0;box-shadow:none}.bsa-barra{padding:8px 12px}.bsa-barra button{flex:1 1 auto}'
    // Una tabla ancha se desplaza dentro de si misma en vez de ensanchar la
    // pagina (solo en pantalla: en el papel sigue siendo una tabla normal).
    +   '.bsa-cuerpo table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}}'
    // Cabecera
    + '.bsa-cab{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;border-bottom:2px solid var(--acc2);'
    +   'padding-bottom:8px;margin-bottom:12px;break-after:avoid;page-break-after:avoid}'
    + '.bsa-logo{flex:none;font:800 26px/1 var(--sans);letter-spacing:.5px}'
    + '.bsa-logo .b{color:#CDA953}.bsa-logo .s{color:#8AB4CA}.bsa-logo .a{color:#22584B}'
    + '.bsa-cab-txt{flex:1 1 200px;min-width:0}'
    + '.bsa-cab-marca{font-size:8.5px;font-weight:700;letter-spacing:1.2px;color:var(--muted);text-transform:uppercase}'
    + '.bsa-cab-tema{font-size:17px;font-weight:800;color:var(--acc);line-height:1.2}'
    + '.bsa-cab-fecha{margin-left:auto;font-size:9px;color:var(--muted);text-align:right}'
    // Figuras
    + '.bsa-fig{margin:0 0 12px;text-align:center;break-inside:avoid;page-break-inside:avoid}'
    + '.bsa-fig figcaption{margin:0 0 5px;text-align:left;font-size:10px;font-weight:800;color:var(--acc);'
    +   'text-transform:uppercase;letter-spacing:.5px;break-after:avoid;page-break-after:avoid}'
    + '.bsa-fig img{display:block;margin:0 auto;width:auto;max-width:100%;height:auto;max-height:115mm;'
    +   'border:1px solid var(--borde);border-radius:6px;background:#fff}'
    // Cuerpo: nada se sale de la hoja ni se parte mal
    + '.bsa-cuerpo img,.bsa-cuerpo video{max-width:100%;height:auto}'
    + '.bsa-cuerpo svg:not(.katex svg){max-width:100%;height:auto}'
    + '.bsa-cuerpo table{border-collapse:collapse;max-width:100%}'
    + '.bsa-cuerpo table,.bsa-cuerpo tr,.bsa-cuerpo figure,.bsa-cuerpo img,.bsa-cuerpo svg:not(.katex svg){break-inside:avoid;page-break-inside:avoid}'
    + '.bsa-cuerpo thead{display:table-header-group}.bsa-cuerpo tfoot{display:table-footer-group}'
    + '.bsa-cuerpo h1,.bsa-cuerpo h2,.bsa-cuerpo h3,.bsa-cuerpo h4,.bsa-cuerpo h5,.bsa-cuerpo h6,'
    +   '.bsa-cuerpo [class*="title"],.bsa-cuerpo [class*="titulo"]{break-after:avoid;page-break-after:avoid}'
    + '.bsa-cuerpo [style*="overflow"]{overflow:visible!important}'
    + '.bsa-cuerpo details>summary{list-style:none;cursor:default}.bsa-cuerpo details>summary::-webkit-details-marker{display:none}'
    + '.bsa-valor{font-family:var(--math);font-weight:700;padding:0 4px;border-bottom:1px solid var(--borde);white-space:nowrap}'
    // Por si la hoja de KaTeX no llega: el MathML no se duplica con el HTML
    + '.katex .katex-mathml{position:absolute;clip:rect(1px,1px,1px,1px);padding:0;border:0;height:1px;width:1px;overflow:hidden}'
    // Colofon (el mismo contenido que colofonLatexBSA)
    + '.bsa-colofon{margin-top:18px;padding-top:12px;border-top:1px solid var(--borde);text-align:center;color:var(--muted);'
    +   'break-inside:avoid;page-break-inside:avoid}'
    + '.bsa-col-marca{font-size:10px;font-weight:800;letter-spacing:1px}'
    + '.bsa-col-sub{font-size:9px;margin-top:1px}'
    + '.bsa-col-logo{font:800 24px/1 var(--sans);letter-spacing:1px;margin:8px 0 6px}'
    + '.bsa-col-logo .b{color:#CDA953}.bsa-col-logo .s{color:#8AB4CA}.bsa-col-logo .a{color:#22584B}'
    + '.bsa-col-autor{font-size:9px}.bsa-col-web{font-size:8.5px;margin-top:2px}'
    // Papel
    + '@page{size:A4;margin:14mm 12mm 16mm}'
    + '@media print{body{background:#fff}.bsa-barra{display:none!important}'
    +   '.bsa-hoja{zoom:1;max-width:none;margin:0;padding:0;box-shadow:none;border-radius:0}}';

  const figs = (o.figuras || []).filter(x => x && x.src).map(x=>
      '<figure class="bsa-fig">'
    + (x.titulo ? '<figcaption>' + _bsaEsc(x.titulo) + '</figcaption>' : '')
    + '<img src="' + _bsaEsc(x.src) + '" alt="' + _bsaEsc(x.titulo || 'Figura') + '"'
    + (x.ancho ? ' style="' + _bsaTopeAncho(x.ancho) + '"' : '') + '>'
    + '</figure>').join('');

  const logo = '<span class="b">B</span><span class="s">S</span><span class="a">A</span>';
  const auto = o.autoImprimir ? 'true' : 'false';

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + _bsaEsc(titulo) + '</title>'
    + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;600;700;800&display=swap">'
    + katexHead
    + '<style>' + cssComun + '</style>'
    + (o.cssTema ? '<style>' + String(o.cssTema).replace(/<\/style/gi, '<\\/style') + '</style>' : '')
    + '</head><body>'
    + '<div class="bsa-barra" role="toolbar" aria-label="Informe">'
    +   '<div class="bsa-barra-txt">Para guardarlo en PDF, pulsa Imprimir y elige «Guardar como PDF».</div>'
    +   '<button type="button" class="bsa-imprimir" id="bsaImprimir">Imprimir / Guardar como PDF</button>'
    +   '<button type="button" id="bsaCerrar">Cerrar</button>'
    + '</div>'
    + '<div class="bsa-hoja">'
    +   '<header class="bsa-cab">'
    +     '<div class="bsa-logo" aria-hidden="true">' + logo + '</div>'
    +     '<div class="bsa-cab-txt"><div class="bsa-cab-marca">Beam &amp; Section Analysis</div>'
    +       '<div class="bsa-cab-tema">' + _bsaEsc(tema) + '</div></div>'
    +     '<div class="bsa-cab-fecha">' + _bsaEsc(fechaLarga) + '</div>'
    +   '</header>'
    +   figs
    +   '<main class="bsa-cuerpo">' + (o.cuerpo || '') + '</main>'
    +   '<footer class="bsa-colofon">'
    +     '<div class="bsa-col-marca">BEAM &amp; SECTION ANALYSIS</div>'
    +     '<div class="bsa-col-sub">Plataforma educativa de análisis estructural</div>'
    +     '<div class="bsa-col-logo" aria-hidden="true">' + logo + '</div>'
    +     '<div class="bsa-col-autor">Creado por <b>Luis Alejandro Bazán Campos</b></div>'
    +     '<div class="bsa-col-web">beamsectionanalysis.com</div>'
    +   '</footer>'
    + '</div>'
    + '<script>(function(){'
    +   'function imprimir(){try{window.focus();}catch(e){}window.print();}'
    +   'document.getElementById("bsaImprimir").onclick=imprimir;'
    +   'document.getElementById("bsaCerrar").onclick=function(){window.close();'
    +     'setTimeout(function(){if(!window.closed){var t=document.querySelector(".bsa-barra-txt");'
    +     'if(t)t.textContent="Puedes cerrar esta pesta\\u00f1a.";}},300);};'
    +   'if(!' + auto + ')return;'
    +   'var hecho=false;'
    +   'function lanzar(){if(hecho)return;hecho=true;'
    +     'var f=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();'
    +     'Promise.race([f,new Promise(function(r){setTimeout(r,2500);})]).then(function(){setTimeout(imprimir,250);});}'
    +   'if(document.readyState==="complete")lanzar();else window.addEventListener("load",lanzar);'
    +   'setTimeout(lanzar,4000);'
    + '})();<\/script>'
    + '</body></html>';
}

// ── Abrir la pestana ──
// Tiene que ir dentro de la pulsacion del alumno. Devuelve la ventana o null;
// si el navegador la bloquea, deja un aviso con boton que la reintenta.
let _bsaUltimoInforme = null;
function _bsaEscribirInforme(w, html){
  w.document.open();
  w.document.write(html);
  w.document.close();
  try{ w.focus(); }catch(e){}
}
function bsaAbrirInforme(html){
  _bsaUltimoInforme = html;
  let w = null;
  try{ w = window.open('', '_blank'); }catch(e){ w = null; }
  if(!w){ _bsaAvisoInforme(true); return null; }
  _bsaEscribirInforme(w, html);
  _bsaQuitarAvisoInforme();
  return w;
}
// Boton del aviso: gesto nuevo, asi que el navegador ya no la bloquea.
function bsaReintentarInforme(){
  if(_bsaUltimoInforme) bsaAbrirInforme(_bsaUltimoInforme);
}
function _bsaQuitarAvisoInforme(){
  const c = document.getElementById('bsaInformeBloqueado');
  if(c) c.remove();
}
function _bsaAvisoInforme(conBoton, texto){
  _bsaQuitarAvisoInforme();
  const c = document.createElement('div');
  c.id = 'bsaInformeBloqueado';
  c.setAttribute('role', 'alert');
  c.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:100000;'
    + 'width:min(420px,calc(100vw - 32px));background:#fff;border:1px solid #d5dce6;border-radius:12px;'
    + 'box-shadow:0 8px 28px rgba(0,0,0,.18);padding:14px 16px;font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;'
    + 'color:#1b1f24;display:flex;flex-wrap:wrap;align-items:center;gap:10px;';
  c.innerHTML =
      '<div style="flex:1 1 200px;min-width:0">'
    +   _bsaEsc(texto || 'Tu navegador bloqueó la pestaña del informe.')
    + '</div>'
    + (conBoton ? '<button type="button" onclick="bsaReintentarInforme()" '
    +   'style="background:#0d3a8f;color:#fff;border:none;padding:10px 16px;border-radius:9px;'
    +   'font:inherit;font-weight:700;cursor:pointer;min-height:40px">Abrir el informe</button>' : '')
    + '<button type="button" aria-label="Cerrar" onclick="this.parentNode.remove()" '
    +   'style="background:none;border:none;font-size:20px;line-height:1;color:#66727e;cursor:pointer;padding:4px 6px">&times;</button>';
  document.body.appendChild(c);
}

// ── Encaje de la figura del informe (2026-09-15) ──
// Lo usan los cinco temas en el antes() de su informe (armaduras 11-,
// fuerzas internas 18-, presión 07-, centroide 17-, momentos 26-). El recorte de bsaInformeRapido toma el lienzo
// TAL COMO ESTÁ la vista, y lo que en pantalla se salía por el borde salía
// cortado también en el papel. Con estas piezas cada tema, en antes(), dibuja
// la figura en un lienzo de tamaño fijo, la encaja MIDIENDO el propio dibujo
// (cotas, flechas y rótulos no escalan con el zoom) y, si traza algo hasta el
// borde por diseño, lo corta con un marco blanco; despues() repone la vista.

// Píxel de dibujo: el criterio de _bsaRecorte (no transparente y no gris casi
// blanco sin saturación, que es la retícula del editor).
function _esPixelDeDibujoInforme(d, i){
  if(d[i+3] < 8) return false;
  const r = d[i], g = d[i+1], b = d[i+2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return !((mx - mn) <= 18 && mn >= 190);
}

// Caja del dibujo de un lienzo en px CSS, {x0, y0, x1, y1} (x1 e y1 por fuera
// del último píxel), o null si no hay nada.
//   o.zona     {x0, y0, x1, y1} en px CSS: solo se mira dentro
//   o.ignorar  (x, y) en px CSS → true si ese píxel no cuenta (un eje que
//              cruza el lienzo entero, una leyenda fija en una esquina)
function cajaDibujoInforme(cv, o){
  o = o || {};
  if(!cv || !cv.getContext || !cv.width || !cv.height) return null;
  const w = cv.width, h = cv.height;
  const esc = cv.clientWidth > 0 ? w / cv.clientWidth : (window.devicePixelRatio || 1);
  const z = o.zona;
  const zx0 = z ? Math.max(0, Math.floor(z.x0*esc)) : 0, zy0 = z ? Math.max(0, Math.floor(z.y0*esc)) : 0;
  const zx1 = z ? Math.min(w, Math.ceil(z.x1*esc)) : w,  zy1 = z ? Math.min(h, Math.ceil(z.y1*esc)) : h;
  const zw = zx1 - zx0, zh = zy1 - zy0;
  if(zw <= 0 || zh <= 0) return null;
  let d;
  try{ d = cv.getContext('2d').getImageData(zx0, zy0, zw, zh).data; }catch(e){ return null; }
  const ign = typeof o.ignorar === 'function' ? o.ignorar : null;
  let x0 = zw, y0 = zh, x1 = -1, y1 = -1;
  for(let y = 0; y < zh; y++){
    for(let x = 0; x < zw; x++){
      if(!_esPixelDeDibujoInforme(d, (y*zw + x)*4)) continue;
      if(x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;     // no cambia la caja
      if(ign && ign((zx0 + x + 0.5)/esc, (zy0 + y + 0.5)/esc)) continue;
      if(x < x0) x0 = x; if(x > x1) x1 = x;
      if(y < y0) y0 = y; if(y > y1) y1 = y;
    }
  }
  if(x1 < 0) return null;
  return {x0: (zx0 + x0)/esc, y0: (zy0 + y0)/esc, x1: (zx0 + x1 + 1)/esc, y1: (zy0 + y1 + 1)/esc};
}

// Encaja un dibujo en su lienzo dejando margen a lo que no escala con la vista.
//   o.ancho, o.alto   tamaño del lienzo en px CSS
//   o.margen          px CSS libres por lado: número o {izq, der, arr, aba}
//   o.medir()         redibuja con la vista actual y devuelve la caja del
//                     dibujo en px CSS (cajaDibujoInforme) o null
//   o.modelo()        caja del modelo (nudos, figuras) en px CSS con la vista
//                     actual, o null
//   o.escalar(k, dx, dy)  cambia la vista: el modelo se amplía k veces
//                     alrededor del centro de su caja y se desplaza (dx, dy) px
// Lo que sobresale del modelo (cadenas de cotas, columnas de valores,
// reacciones) se toma de la medida, y se vuelve a medir tras cada cambio
// porque puede variar con la escala: dos o tres pasadas bastan. Si aun así no
// cabe, se reduce a pasos. Devuelve {ok, caja} de la última medida.
function encajarDibujoInforme(o){
  const W = o.ancho, H = o.alto;
  const m = typeof o.margen === 'number'
    ? {izq:o.margen, der:o.margen, arr:o.margen, aba:o.margen}
    : Object.assign({izq:16, der:16, arr:16, aba:16}, o.margen || {});
  const libreW = W - m.izq - m.der, libreH = H - m.arr - m.aba;
  const cabe = B => !!B && B.x0 >= m.izq - 0.5 && B.y0 >= m.arr - 0.5
                        && B.x1 <= W - m.der + 0.5 && B.y1 <= H - m.aba + 0.5;
  // El cambio que deja el modelo lo más grande posible (hasta kMax) y el
  // dibujo centrado en lo libre, si lo que sobresale no variara.
  const paso = (B, kMax)=>{
    let M = typeof o.modelo === 'function' ? o.modelo() : null;
    if(!M) M = {x0:(B.x0 + B.x1)/2, x1:(B.x0 + B.x1)/2, y0:(B.y0 + B.y1)/2, y1:(B.y0 + B.y1)/2};
    const Mw = M.x1 - M.x0, Mh = M.y1 - M.y0;
    const oI = Math.max(0, M.x0 - B.x0), oD = Math.max(0, B.x1 - M.x1);
    const oA = Math.max(0, M.y0 - B.y0), oB = Math.max(0, B.y1 - M.y1);
    let k = Infinity;
    if(Mw > 1) k = Math.min(k, (libreW - oI - oD)/Mw);
    if(Mh > 1) k = Math.min(k, (libreH - oA - oB)/Mh);
    if(!isFinite(k)) k = 1;
    k = Math.max(0.02, Math.min(k, kMax));
    const bw = k*Mw + oI + oD, bh = k*Mh + oA + oB;
    return {k: k,
      dx: m.izq + (libreW - bw)/2 + oI + k*Mw/2 - (M.x0 + Mw/2),
      dy: m.arr + (libreH - bh)/2 + oA + k*Mh/2 - (M.y0 + Mh/2)};
  };
  let B = o.medir();
  for(let i = 0; i < (o.pasadas || 5) && B; i++){
    const p = paso(B, o.ampliarMax || 40);
    if(cabe(B) && Math.abs(p.k - 1) < 0.04) return {ok:true, caja:B};
    o.escalar(p.k, p.dx, p.dy);
    B = o.medir();
  }
  for(let i = 0; i < 10 && B && !cabe(B); i++){
    const p = paso(B, 0.9);
    o.escalar(p.k, p.dx, p.dy);
    B = o.medir();
  }
  return {ok: cabe(B), caja: B};
}

// Lienzo oculto de ancho × alto px CSS a res píxeles por px, con el contexto
// ya escalado. Va DENTRO del documento (el recorte usa su ancho CSS para dar la
// imagen a su tamaño) y a la DERECHA de la pantalla: lo que mide cuánto tapa
// la columna de control, que está a la izquierda, da cero. Quien lo crea lo
// quita (lienzo.remove()) en despues().
function lienzoTemporalInforme(ancho, alto, res){
  res = res || 2;
  const c = document.createElement('canvas');
  c.width = Math.round(ancho*res); c.height = Math.round(alto*res);
  c.style.cssText = 'position:fixed;left:20000px;top:0;width:' + ancho + 'px;height:' + alto
    + 'px;visibility:hidden;pointer-events:none';
  document.body.appendChild(c);
  c.getContext('2d').setTransform(res, 0, 0, res, 0, 0);
  return c;
}

// Banda blanca de g px CSS por dentro del borde (contexto en px CSS): lo que
// el tema traza hasta el borde por diseño acaba en ella; el resto del dibujo
// ya viene encajado lejos del borde.
function marcoLienzoInforme(c, ancho, alto, g){
  c.save();
  c.setLineDash([]);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, ancho, g); c.fillRect(0, alto - g, ancho, g);
  c.fillRect(0, 0, g, alto);  c.fillRect(ancho - g, 0, g, alto);
  c.restore();
}

// ── El boton "PDF" de un tema, entero ──
//   panel          id o elemento de los resultados (por defecto 'resultsPanel')
//   hayResultados  booleano o funcion; por defecto, que el panel tenga contenido
//   sinResultados  texto del aviso si no hay nada que imprimir
//   tema, acento, cssTema   → bsaDocInforme
//   figuras        [{titulo, lienzo | src}] o una funcion que la devuelva; se
//                  evalua DESPUES de antes(), asi que puede usar lo que este
//                  redibuje. Un lienzo se recorta; si queda vacio, se omite.
//   limpiar        opciones de bsaLimpiarResultados
//   antes()        preparar (p. ej. redibujar el circulo de Mohr a mas
//                  resolucion); puede devolver una promesa
//   despues()      deshacerlo; se llama siempre, tambien si algo falla
//   autoImprimir   por defecto !bsaEsMovil()
// Devuelve una promesa con true si el informe llego a la pestana.
async function bsaInformeRapido(opts){
  opts = opts || {};
  const panel = typeof opts.panel === 'object' && opts.panel
    ? opts.panel : document.getElementById(opts.panel || 'resultsPanel');
  let hay = opts.hayResultados;
  if(typeof hay === 'function'){ try{ hay = hay(); }catch(e){ hay = false; } }
  if(hay === undefined) hay = !!(panel && panel.innerHTML.trim());
  if(!hay || !panel){
    const msg = opts.sinResultados || 'Primero resuelve el ejercicio.';
    if(typeof aviso === 'function') aviso(msg, 'error'); else _bsaAvisoInforme(false, msg);
    return false;
  }

  // 1) La pestana, YA: cualquier trabajo antes consumiria el gesto. Mientras
  //    se recortan los lienzos, la pestana dice que se esta preparando.
  let w = null;
  try{ w = window.open('', '_blank'); }catch(e){ w = null; }
  if(w){
    try{
      _bsaEscribirInforme(w, '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>BSA — '
        + _bsaEsc(opts.tema || 'Informe') + '</title></head>'
        + '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;'
        + 'font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#5f6b76;background:#fff">'
        + 'Preparando el informe…</body></html>');
    }catch(e){}
  }

  let html = '';
  try{
    if(typeof opts.antes === 'function'){
      const p = opts.antes();
      if(p && typeof p.then === 'function') await p;
    }
    let figs = typeof opts.figuras === 'function' ? opts.figuras() : (opts.figuras || []);
    figs = (figs || []).map(f=>{
      if(!f) return null;
      if(f.src) return f;
      const r = f.lienzo ? _bsaRecorte(typeof f.lienzo === 'string' ? document.getElementById(f.lienzo) : f.lienzo) : null;
      return r ? {titulo: f.titulo, src: r.src, ancho: r.ancho} : null;
    }).filter(Boolean);
    const cuerpo = bsaLimpiarResultados(panel, opts.limpiar);
    html = bsaDocInforme({
      tema: opts.tema, acento: opts.acento, cssTema: opts.cssTema,
      figuras: figs, cuerpo: cuerpo,
      autoImprimir: opts.autoImprimir !== undefined ? !!opts.autoImprimir : !bsaEsMovil()
    });
  }catch(e){
    console.error('Informe PDF:', e);
    if(w){
      try{
        _bsaEscribirInforme(w, '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
          + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>BSA</title></head>'
          + '<body style="font:15px/1.5 system-ui,sans-serif;padding:24px;color:#1b1f24">'
          + '<p>No se pudo preparar el informe: ' + _bsaEsc(e && e.message || e) + '</p></body></html>');
      }catch(_){}
    }
    if(typeof aviso === 'function') aviso('No se pudo preparar el informe: ' + (e && e.message || e), 'error');
    return false;
  }finally{
    if(typeof opts.despues === 'function'){ try{ opts.despues(); }catch(e){ console.error(e); } }
  }

  _bsaUltimoInforme = html;
  if(!w){ _bsaAvisoInforme(true); return false; }
  // Cerrada por el alumno mientras se preparaba: el navegador no bloqueo nada.
  if(w.closed){ _bsaAvisoInforme(true, 'Se cerró la pestaña del informe.'); return false; }
  try{
    _bsaEscribirInforme(w, html);
  }catch(e){
    console.error('Informe PDF:', e);
    _bsaAvisoInforme(true);
    return false;
  }
  _bsaQuitarAvisoInforme();
  return true;
}

// ═══════════════════════════════════════════════════════════
//  EJES x-y DEL LIENZO (2026-10-03, peticion del profesor)
//  Los mismos en los cinco temas: por el origen, con flecha en el extremo
//  positivo, la letra junto a ella y el valor de cada linea de la rejilla a lo
//  largo de cada eje, para situar lo dibujado sin contar cuadros. Es fondo,
//  como la rejilla: quien lo llama decide si reserva en su registro las cajas
//  que devuelve (las dos letras y las dos puntas). Si el origen queda fuera de
//  la vista, ese eje no se dibuja.
//  o = {W, H, aPantalla(x,y) -> [sx,sy], aMundo(sx,sy) -> [x,y],
//       paso (el de la rejilla, en unidades del mundo), cv (el lienzo, para
//       medir la columna de control que lo tapa por la izquierda), col}
// ═══════════════════════════════════════════════════════════
function bsaEjesXY(ctx, o){
  const W = o.W, H = o.H, pasoRej = o.paso, col = o.col || 'rgba(55,65,81,.75)';
  let izq = 0;
  try{
    const lp = document.getElementById('leftPanel') || document.querySelector('.left-panel');
    if(lp && o.cv){
      const r = lp.getBoundingClientRect(), c = o.cv.getBoundingClientRect();
      const x1 = r.right - c.left;
      if(r.width > 0 && x1 > 0 && x1 < W/2 && r.bottom > c.top && r.top < c.bottom) izq = x1 + 8;
    }
  }catch(e){}
  const p0 = o.aPantalla(0, 0), ox = p0[0], oy = p0[1];
  const fmt = v => String(+v.toPrecision(6));
  const punta = (x, y, ux, uy) => {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x - ux*9 - uy*4, y - uy*9 + ux*4); ctx.lineTo(x - ux*9 + uy*4, y - uy*9 - ux*4);
    ctx.closePath(); ctx.fill();
  };
  const cajas = [];
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.3; ctx.setLineDash([]);
  const verX = oy > 4 && oy < H-4, verY = ox > izq+4 && ox < W-4;
  // Un valor por linea de la rejilla si caben holgados; si no, uno cada cinco
  // (las lineas mayores) o cada diez. Siempre sobre una linea de la rejilla.
  let paso = pasoRej;
  if(paso > 0){
    ctx.font = '600 9px Inter, sans-serif';
    const ancho = v => ctx.measureText(fmt(v)).width;
    const px1 = Math.abs(o.aPantalla(pasoRej, 0)[0] - ox);
    const muestra = Math.max(ancho(o.aMundo(0, 0)[0]), ancho(o.aMundo(W, 0)[0]), ancho(o.aMundo(0, H)[1]), ancho(pasoRej*7)) + 16;
    for(const k of [1, 5, 10, 50]){ paso = pasoRej*k; if(px1*k >= Math.max(30, muestra)) break; }
  }
  if(verX && paso > 0){
    ctx.beginPath(); ctx.moveTo(izq, oy); ctx.lineTo(W-10, oy); ctx.stroke();
    punta(W-8, oy, 1, 0); cajas.push([W-18, oy-5, W-8, oy+5]);
    ctx.font = '600 9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const x0 = o.aMundo(izq, 0)[0], x1 = o.aMundo(W-40, 0)[0];
    for(let i=Math.ceil(x0/paso); i<=Math.floor(x1/paso); i++){
      if(i === 0) continue;
      const px = o.aPantalla(i*paso, 0)[0];
      ctx.beginPath(); ctx.moveTo(px, oy-3); ctx.lineTo(px, oy+3); ctx.stroke();
      ctx.fillText(fmt(i*paso), px, oy+5);
    }
    ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('x', W-10, oy-6); cajas.push([W-20, oy-20, W-8, oy-6]);
  }
  if(verY && paso > 0){
    ctx.beginPath(); ctx.moveTo(ox, H); ctx.lineTo(ox, 10); ctx.stroke();
    punta(ox, 8, 0, -1); cajas.push([ox-5, 8, ox+5, 18]);
    ctx.font = '600 9px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const y0 = o.aMundo(0, H)[1], y1 = o.aMundo(0, 40)[1];
    for(let j=Math.ceil(y0/paso); j<=Math.floor(y1/paso); j++){
      if(j === 0) continue;
      const py = o.aPantalla(0, j*paso)[1];
      ctx.beginPath(); ctx.moveTo(ox-3, py); ctx.lineTo(ox+3, py); ctx.stroke();
      ctx.fillText(fmt(j*paso), ox-5, py);
    }
    ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('y', ox+7, 8); cajas.push([ox+6, 6, ox+16, 22]);
  }
  if(verX && verY){
    ctx.font = '600 9px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('0', ox-4, oy+4);
  }
  ctx.restore();
  return {cajas, ox, oy, verX, verY, izq};
}

// ═══════════════════════════════════════════════════════════
//  COTAS ENCADENADAS DEL LIENZO, CON HUECO LIBRE (2026-10-03)
//  El acotamiento de presion de fluidos llevado a los demas temas: lineas de
//  extension, linea de cota con punta en los dos extremos y el valor derecho.
//  Cada cadena va en un carril (una recta paralela al eje) que se coloca en el
//  primer desplazamiento LIBRE: se miran los pixeles ya pintados del lienzo en
//  la franja que ocuparia (linea y textos), asi que hay que llamarla al final
//  del dibujo. Si un valor no cabe en su tramo, sube a una segunda fila.
//  o = {W, H, cadenas: [{eje:'x'|'y', puntos:[{v, sx, sy}], lados:[1,-1]}],
//       caja:[x0,y0,x1,y1] (lo dibujado, en pantalla), texto: v => '2.00 m',
//       col, izq, ejes:{ox, oy} (si se ven los ejes: un carril no se monta
//       sobre el eje paralelo a el ni sobre sus valores)}
//  Una cadena con `soloCarril: true` mira solo su linea y sus valores, no sus
//  lineas de extension (que pueden tener que bajar junto a una reaccion).
//  En una cadena 'x' el carril es horizontal: lado +1 debajo, -1 encima. En una
//  'y' es vertical: +1 a la derecha, -1 a la izquierda. Cada punto es una
//  coordenada v del eje y el sitio (sx, sy) del que sale su linea de extension;
//  de varios puntos con la misma v se toma el mas cercano al carril.
// ═══════════════════════════════════════════════════════════
function bsaCotasLienzo(ctx, o){
  const W = o.W, H = o.H, col = o.col || '#374151';
  const FUENTE = '600 10px Inter, sans-serif';
  // La columna de control tapa el lienzo por la izquierda: ningun carril ni
  // valor debajo de ella (la misma medida que bsaEjesXY).
  let izq = o.izq || 0;
  try{
    const lp = document.getElementById('leftPanel') || document.querySelector('.left-panel');
    const cvEl = ctx.canvas;
    if(lp && cvEl && cvEl.isConnected){
      const r = lp.getBoundingClientRect(), c = cvEl.getBoundingClientRect();
      const x1 = r.right - c.left;
      if(r.width > 0 && x1 > 0 && x1 < W/2 && r.bottom > c.top && r.top < c.bottom) izq = Math.max(izq, x1 + 8);
    }
  }catch(e){}
  ctx.save();
  ctx.font = FUENTE;
  const ancho = t => ctx.measureText(t).width;
  // Tinta en una franja: algun pixel oscuro o de color (la rejilla es clarisima).
  const cuentaTinta = (x0, y0, x1, y1) => {
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    if(x1 - x0 < 1 || y1 - y0 < 1) return 0;
    const dpr = ctx.canvas.width / W;
    let d;
    try{ d = ctx.getImageData(x0*dpr, y0*dpr, Math.max(1,(x1-x0)*dpr), Math.max(1,(y1-y0)*dpr)).data; }catch(e){ return 0; }
    let n = 0;
    for(let i=0;i<d.length;i+=8){
      const r = d[i], g = d[i+1], b = d[i+2];
      const lum = 0.299*r + 0.587*g + 0.114*b, cro = Math.max(r,g,b) - Math.min(r,g,b);
      // los ejes de bsaEjesXY (y sus valores) son fondo, como la rejilla
      if(Math.abs(r-105) < 14 && Math.abs(g-113) < 14 && Math.abs(b-125) < 14) continue;
      if(lum < 205 || cro > 48) n++;
    }
    return n;
  };
  const punta = (x, y, ux, uy) => {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x - ux*7 - uy*2.6, y - uy*7 + ux*2.6); ctx.lineTo(x - ux*7 + uy*2.6, y - uy*7 - ux*2.6);
    ctx.closePath(); ctx.fill();
  };
  const cajaGeneral = o.caja;
  const OFF = [26, 40, 56, 76, 100, 130, 165];
  const usado = {x:{'1':0,'-1':0}, y:{'1':0,'-1':0}};
  const ultimo = {x:{}, y:{}};      // linea de la ultima cadena colocada en cada lado
  (o.cadenas || []).forEach(cad=>{
    // una cadena puede medirse desde su propia caja (la de un tramo, por ejemplo)
    const caja = cad.caja || cajaGeneral;
    // coordenadas distintas, de menor a mayor
    const vs = [];
    cad.puntos.slice().sort((a,b)=>a.v-b.v).forEach(p=>{
      const u = vs[vs.length-1];
      if(u && Math.abs(p.v - u.v) < 1e-9*Math.max(1, Math.abs(p.v))) u.ps.push(p); else vs.push({v:p.v, ps:[p]});
    });
    if(vs.length < 2) return;
    const horiz = cad.eje === 'x';
    // posicion en pantalla de cada coordenada a lo largo del carril
    const pos = vs.map(q=>horiz ? q.ps[0].sx : q.ps[0].sy);
    const tramos = [];
    for(let i=0;i<vs.length-1;i++){
      if(Math.abs(pos[i+1]-pos[i]) < 2) continue;
      const t = (cad.texto || o.texto)(Math.abs(vs[i+1].v - vs[i].v));   // una cadena puede llevar su formato
      tramos.push({a:pos[i], b:pos[i+1], t, w:ancho(t)});
    }
    if(!tramos.length) return;
    // filas de texto: un valor que no cabe junto al anterior sube de fila
    let filas = 1;
    const asignar = () => {
      let fin = [-Infinity, -Infinity];
      filas = 1;
      tramos.forEach(q=>{
        const m = (q.a + q.b)/2, ext = horiz ? q.w/2 + 4 : 7;
        let f = 0;
        if(m - ext < fin[0]) f = 1;
        if(f === 1 && m - ext < fin[1]) f = 0;
        q.fila = f; fin[f] = m + ext; filas = Math.max(filas, f + 1);
      });
    };
    asignar();
    const lo = Math.min(...pos), hi = Math.max(...pos);
    // La linea de extension de la coordenada q hacia el carril c: desde su punto
    // mas cercano al carril y nunca a traves del dibujo (un punto del interior la
    // empieza en el borde de la caja). {t: su abscisa (o ordenada), a, b: tramo}.
    const extension = (q, lado, c) => {
      const p = q.ps.reduce((m,p)=>{ const dm = horiz ? Math.abs(m.sy - c) : Math.abs(m.sx - c), dp = horiz ? Math.abs(p.sy - c) : Math.abs(p.sx - c); return dp < dm ? p : m; }, q.ps[0]);
      const borde = horiz ? (lado > 0 ? caja[3] : caja[1]) : (lado > 0 ? caja[2] : caja[0]);
      const pd = horiz ? p.sy : p.sx;
      const desde = Math.abs(pd - borde) < 3 ? pd : borde + (lado > 0 ? 6 : -6), s = c > desde ? 1 : -1;
      if(Math.abs(c - desde) < 8) return null;
      return {t: horiz ? p.sx : p.sy, a: desde + s*(Math.abs(pd - borde) < 3 ? 10 : 4), b: c + s*5, s, ini: desde + s*4};
    };
    const anchoTxt = horiz ? 14*filas : Math.max(...tramos.map(q=>q.w)) + 8 + (filas > 1 ? 40 : 0);
    // Se prueba cada carril posible dentro del lienzo: gana el primero sin tinta
    // y, si ninguno esta limpio, el que menos tinta pise (linea, valores y
    // lineas de extension).
    let el = null, mejor = null;
    for(const lado of (cad.lados || [1,-1])){
      for(const off of OFF){
        const d = off + usado[cad.eje][lado];
        const c = horiz ? (lado > 0 ? caja[3] + d : caja[1] - d) : (lado > 0 ? caja[2] + d : caja[0] - d);
        // el carril y sus valores, enteros dentro del lienzo visible
        if(horiz ? (c - (lado < 0 ? anchoTxt : 0) < 10 || c + (lado > 0 ? anchoTxt : 0) > H - 10)
                 : (c - (lado < 0 ? anchoTxt : 0) < izq + 4 || c + (lado > 0 ? anchoTxt : 0) > W - 10)) continue;
        const r = horiz ? [lo - 8, c - (lado > 0 ? 5 : anchoTxt + 2), hi + 8, c + (lado > 0 ? anchoTxt + 2 : 5)]
                        : [c - (lado > 0 ? 5 : anchoTxt + 2), lo - 8, c + (lado > 0 ? anchoTxt + 2 : 5), hi + 8];
        let tinta = cuentaTinta(r[0], r[1], r[2], r[3]);
        // el eje paralelo al carril y sus valores
        if(o.ejes){
          const b0 = horiz ? r[1] : r[0], b1 = horiz ? r[3] : r[2];
          const e0 = horiz ? o.ejes.oy - 4 : o.ejes.ox - 40, e1 = horiz ? o.ejes.oy + 17 : o.ejes.ox + 4;
          if(b0 < e1 && b1 > e0) tinta += 1000;
        }
        if(!cad.soloCarril) vs.forEach(q=>{
          const e = extension(q, lado, c);
          if(!e) return;
          tinta += 4*(horiz ? cuentaTinta(e.t - 1.5, Math.min(e.a, e.b), e.t + 1.5, Math.max(e.a, e.b))
                            : cuentaTinta(Math.min(e.a, e.b), e.t - 1.5, Math.max(e.a, e.b), e.t + 1.5));
        });
        if(tinta === 0){ el = {lado, d, c}; break; }
        if(!mejor || tinta < mejor.tinta) mejor = {lado, d, c, tinta};
      }
      if(el) break;
    }
    if(!el && mejor) el = mejor;
    if(!el){
      // Ningun carril cabe en el lienzo: el lado con mas sitio, en su primer desplazamiento.
      const sitio = horiz ? {'1': H - caja[3], '-1': caja[1]} : {'1': W - caja[2], '-1': caja[0] - izq};
      const lado = sitio['1'] >= sitio['-1'] ? 1 : -1, d = OFF[0] + usado[cad.eje][lado];
      let c = horiz ? (lado > 0 ? caja[3] + d : caja[1] - d) : (lado > 0 ? caja[2] + d : caja[0] - d);
      // ...pero dentro del lienzo: mejor encima de algo que invisible. Si ya se
      // forzó otra cadena contra ese borde, esta va por dentro de ella.
      let lim = horiz ? (lado > 0 ? H - anchoTxt - 10 : anchoTxt + 10) : (lado > 0 ? W - anchoTxt - 10 : izq + anchoTxt + 4);
      const u = ultimo[cad.eje][lado];
      if(u) lim = lado > 0 ? Math.min(lim, u - anchoTxt - 16) : Math.max(lim, u + anchoTxt + 16);
      if(lado > 0 ? c > lim : c < lim) c = lim;
      el = {lado, d, c};
    }
    usado[cad.eje][el.lado] = el.d + (horiz ? 14*filas : anchoTxt) - 10;
    // la mas interior de las colocadas: una cadena forzada contra el borde va por dentro de ella
    const ul = ultimo[cad.eje][el.lado];
    ultimo[cad.eje][el.lado] = ul === undefined ? el.c : (el.lado > 0 ? Math.min(ul, el.c) : Math.max(ul, el.c));
    const colC = cad.col || col;          // una cadena puede llevar su color
    ctx.strokeStyle = colC; ctx.fillStyle = colC; ctx.lineWidth = 1;
    // lineas de extension
    vs.forEach(q=>{
      const e = extension(q, el.lado, el.c);
      if(!e) return;
      ctx.beginPath();
      if(horiz){ ctx.moveTo(e.t, e.ini); ctx.lineTo(e.t, e.b); }
      else { ctx.moveTo(e.ini, e.t); ctx.lineTo(e.b, e.t); }
      ctx.stroke();
    });
    // lineas de cota, puntas y valores
    tramos.forEach(q=>{
      const largo = Math.abs(q.b - q.a), sg = q.b > q.a ? 1 : -1;
      ctx.beginPath();
      if(horiz){ ctx.moveTo(q.a, el.c); ctx.lineTo(q.b, el.c); } else { ctx.moveTo(el.c, q.a); ctx.lineTo(el.c, q.b); }
      ctx.stroke();
      if(largo >= 16){
        if(horiz){ punta(q.a, el.c, -sg, 0); punta(q.b, el.c, sg, 0); }
        else { punta(el.c, q.a, 0, -sg); punta(el.c, q.b, 0, sg); }
      } else {
        [q.a, q.b].forEach(v=>{ ctx.beginPath(); horiz ? ctx.arc(v, el.c, 1.8, 0, Math.PI*2) : ctx.arc(el.c, v, 1.8, 0, Math.PI*2); ctx.fill(); });
      }
      const m = (q.a + q.b)/2;
      ctx.fillStyle = '#1b1f24';
      if(horiz){
        ctx.textAlign = 'center'; ctx.textBaseline = el.lado > 0 ? 'top' : 'bottom';
        const y = el.c + el.lado*(4 + q.fila*13);
        ctx.fillText(q.t, m, y);
      } else {
        ctx.textAlign = el.lado > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(q.t, el.c + el.lado*(6 + q.fila*(Math.max(...tramos.map(z=>z.w)) + 10)), m);
      }
      ctx.fillStyle = colC;
    });
  });
  ctx.restore();
}
