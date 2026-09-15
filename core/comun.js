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
// `dec(v,'f')` del tema que lo llama (los mismos decimales que las fuerzas).
function bsaTextoAnguloAgudo(ux, uy){
  const a = bsaAnguloAgudoEje(ux, uy);
  return dec(a.grados,'f') + '° de la ' + (a.desdeV ? 'vertical' : 'horizontal');
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
  ctx.fillText(dec(ag.grados,'f') + '°', x0 + 26*tx + 14*qx, y0 + 26*ty + 14*qy);
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
