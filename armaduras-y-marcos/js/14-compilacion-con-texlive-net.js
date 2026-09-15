// ── Compilación con texlive.net ────────────────────────────────────
// Servidor real (no WASM) mantenido por DANTE e.V. (grupo alemán de usuarios
// de TeX), pensado justo para botones de "compilar" embebidos en sitios
// externos: lo usan learnlatex.org y los foros latex.org / texwelt.de.
//
// OJO con la técnica: NO se usa fetch()/XMLHttpRequest para leer el PDF de
// vuelta, porque el servidor no envía cabeceras CORS y eso lo bloquearía
// igual que pasó con SwiftLaTeX. En vez de eso, replicamos exactamente lo
// que hace su propio script de referencia (runlatex.js, usado en producción
// por learnlatex.org): un <form> normal apuntando a un <iframe> oculto por
// "target". Un envío de formulario entre dominios NO está sujeto a CORS
// (esa restricción solo aplica cuando JS intenta LEER la respuesta con
// fetch/XHR); el PDF resultante simplemente se muestra dentro del iframe.
const TEXLIVE_NET_URL = 'https://texlive.net/cgi-bin/latexcgi';

function _panelLatexPDF(){
  let panel = document.getElementById('panelLatexPDF');
  if(panel) return panel;

  panel = document.createElement('div');
  panel.id = 'panelLatexPDF';
  panel.style.cssText = 'display:none; position:fixed; inset:0; z-index:9000; '
    + 'background:rgba(15,20,28,.72); align-items:center; justify-content:center; padding:16px;';
  // El cierre pasa por una función con nombre en vez de código en línea: así no
  // depende de cómo queden escapadas las comillas dentro del atributo, y de
  // paso puede limpiar el visor.
  panel.innerHTML =
      '<div style="background:#fff; border-radius:10px; width:100%; max-width:900px; '
    +   'height:92vh; display:flex; flex-direction:column; overflow:hidden; position:relative;">'
    +   '<div style="display:flex; align-items:center; justify-content:space-between; '
    +     'padding:10px 14px; border-bottom:1px solid #e5d9c8;">'
    +     '<strong style="color:#7c5cd6">Reporte PDF (LaTeX)</strong>'
    +     '<button onclick="cerrarPanelLatex()" title="Cerrar" aria-label="Cerrar" '
    +       'style="border:none;background:none;font-size:22px;cursor:pointer;line-height:1;'
    +       'color:#6B7280;padding:0 4px;">&times;</button>'
    +   '</div>'
    +   '<div id="latexEstado" style="padding:8px 14px; font-size:12.5px; color:#6B7280;">'
    +     'Enviando a texlive.net…</div>'
    +   '<iframe id="latexFrame" name="latexFrame" style="flex:1; border:none;"></iframe>'
    +   '<div id="latexPie" style="padding:6px 14px; font-size:10.5px; color:#9aa3ad; '
    +     'border-top:1px solid #f0eee9;">Si en lugar del PDF aparece texto, es el registro '
    +     'de LaTeX: c\u00f3pialo y av\u00edsanos.</div>'
    +   '<div id="latexCargando" style="position:absolute; inset:0; background:#fff; '
    +     'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px;">'
    +     '<div style="display:flex; gap:10px; align-items:flex-end; height:64px;">'
    +       '<span class="bsa-let" style="color:#CDA953; animation-delay:0s">B</span>'
    +       '<span class="bsa-let" style="color:#8AB4CA; animation-delay:.22s">S</span>'
    +       '<span class="bsa-let" style="color:#22584B; animation-delay:.44s">A</span>'
    +     '</div>'
    +     '<div style="font-size:12px;color:#6B7280">Compilando el informe…</div>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(panel);
  return panel;
}

// Cierra la ventana del informe y deja el visor limpio, para que al volver a
// generar no se vea por un instante el PDF anterior.

function generarPDFLatex(){
  const btn = document.getElementById('btnLatex');
  if(btn && btn.dataset.ocupado === '1') return;   // evita doble pulsación

  // 1. Armar el .tex (esta parte ya estaba probada, sin cambios)
  const tex = construirLatex();
  if(!tex) return;

  try {
    if(btn) btn.dataset.ocupado = '1';
    _estadoBotonLatex('Enviando…');

    const panel = _panelLatexPDF();
    const estado = document.getElementById('latexEstado');
    const frame = document.getElementById('latexFrame');
    estado.textContent = 'Enviando a texlive.net…';
    const cargando = document.getElementById('latexCargando');
    if(cargando) cargando.style.display = 'flex';
    panel.style.display = 'flex';

    // 2. Formulario oculto, exactamente con los campos que documenta
    //    texlive.net (filename[]/filecontents[] como pareja, engine, return).
    // El envio vive en core/comun.js porque es identico en los cinco temas.
    // En telefono y tableta el PDF va a una pestana nueva: el navegador no lo
    // pinta dentro de un iframe.
    const enIframe = bsaEnviarTex(tex, TEXLIVE_NET_URL);
    if(!enIframe) bsaPanelMovil();

    // 3. Cuando el iframe termina de navegar (haya PDF o log de error), ya
    //    no hay nada más que esperar. Por CORS no podemos leer el contenido
    //    para saber cuál de los dos es, pero el alumno lo ve directamente.
    //    El evento se adjunta DESPUÉS de submit(): la navegación real tarda
    //    al menos una vuelta de red, así que no hay riesgo de perdérnoslo.
    // Al llegar la respuesta se retira la animación. El mensaje ya NO habla de
    // errores: la advertencia sobre el registro de LaTeX vive en el pie, en
    // pequeño y permanente, para no dar a entender que algo falló cuando el
    // informe se generó bien.
    frame.addEventListener('load', function(){
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
      estado.textContent = 'Informe generado.';
      estado.style.color = '#15803D';
    }, {once:true});

    // Límite de cortesía: si en 45 s no hubo respuesta visible, avisamos
    // (no podemos detectarlo con certeza por CORS, así que es orientativo).
    setTimeout(()=>{
      if(estado.textContent.indexOf('Enviando') === 0){
        estado.textContent = 'Sigue esperando respuesta de texlive.net. '
          + 'Si tarda demasiado, cierra este panel y vuelve a intentar.';
      }
    }, 45000);

    // Salvavidas: si por lo que sea nunca llega el evento 'load', la animación
    // no puede quedarse girando para siempre encima del informe.
    setTimeout(()=>{
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
    }, 90000);

  } catch(e){
    console.error('Error al enviar a texlive.net:', e);
    aviso('Ocurrió un error al preparar el envío: ' + e.message, 'error');
  } finally {
    if(btn) btn.dataset.ocupado = '0';
    _estadoBotonLatex('LaTeX');
  }
}

function _estadoBotonLatex(txt){
  const b = document.getElementById('btnLatex');
  if(b){
    const s = b.querySelector('span');
    if(s) s.textContent = txt;
  }
}

function descargarTex(){
  const tex = construirLatex();
  if(!tex) return;
  const blob = new Blob([tex], {type:'text/x-tex'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'armadura-bsa.tex';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// downloadPDF (el boton rojo «PDF», informe rapido sin LaTeX) vive en 11-pdf.js.
