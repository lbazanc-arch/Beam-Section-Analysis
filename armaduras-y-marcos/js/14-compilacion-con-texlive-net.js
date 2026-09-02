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
    +     '<strong style="color:#B45309">Reporte PDF (LaTeX)</strong>'
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
    const viejo = document.getElementById('formLatexNet');
    if(viejo) viejo.remove();
    const form = document.createElement('form');
    form.id = 'formLatexNet';
    form.action = TEXLIVE_NET_URL;
    form.method = 'post';
    form.enctype = 'multipart/form-data';
    form.target = 'latexFrame';
    form.style.display = 'none';

    const campo = (nombre, valor)=>{
      const inp = document.createElement('textarea');
      inp.name = nombre;
      inp.value = valor;
      form.appendChild(inp);
    };
    campo('filename[]', 'document.tex');
    campo('filecontents[]', tex);
    campo('engine', 'pdflatex');
    campo('return', 'pdf');   // PDF directo: el navegador lo renderiza nativo en el iframe

    document.body.appendChild(form);
    form.submit();

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

function downloadPDF(){
  const rp = document.getElementById('resultsPanel');
  if(!rp || !rp.innerHTML.trim()){ aviso('Primero resuelve la armadura.'); return; }
  const img = recortarLienzo(document.getElementById('mainCanvas'));
  const dt = new Date().toLocaleString('es-PE', {dateStyle:'medium', timeStyle:'short'});
  const kEl = document.getElementById('katex-css');
  const katexCss = kEl ? kEl.textContent : '';

  const printCss = `
    *{box-sizing:border-box;margin:0;padding:0;}
    :root{--math:'STIX Two Text','Times New Roman',Georgia,serif;
          --sans:Inter,'Helvetica Neue',Arial,sans-serif;
          --acc:#b45309;--acc2:#7c3a06;--card:#fdf1e3;--border:#e7d3ba;
          --text:#1a1a1a;--muted:#6b5c4a;}
    body{font-family:var(--sans);font-size:10.5px;background:#fff;color:var(--text);
      padding:12mm 9mm 14mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .pdf-header{display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--acc2);
      padding-bottom:7px;margin-bottom:10px;}
    .pdf-title{font-size:17px;font-weight:800;color:var(--acc);}
    .pdf-sub{font-size:10px;color:var(--muted);}
    .pdf-date{margin-left:auto;font-size:9px;color:var(--muted);}
    .res-section{margin-bottom:8px;}
    .res-title{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;
      color:var(--acc);border-bottom:1.5px solid var(--acc2);padding-bottom:4px;margin:9px 0 6px;}
    .res-title .num{width:18px;height:18px;border-radius:50%;background:var(--acc2);
      display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;
      color:#fff;flex:none;}
    .proc-block{background:var(--card);border:1px solid var(--border);border-radius:6px;
      padding:6px 10px;margin-bottom:6px;page-break-inside:avoid;}
    .proc-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 18px;}
    .proc-col{min-width:0;}
    .proc-sub{font-size:9px;font-weight:700;color:var(--acc);text-transform:uppercase;
      letter-spacing:.5px;margin-bottom:4px;}
    .eq-row{margin:1px 0;}
    .eq-body{font-family:var(--math);font-size:11px;line-height:1.5;}
    .eq-body .katex{font-size:1.05em;}
    .verdict{border-left:3px solid var(--acc);background:var(--card);border-radius:5px;
      padding:6px 9px;margin-bottom:6px;font-size:10px;page-break-inside:avoid;}
    .verdict-t{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;
      color:var(--muted);margin-bottom:3px;}
    .tabla{width:100%;border-collapse:collapse;font-family:var(--math);font-size:11px;
      page-break-inside:avoid;margin-bottom:6px;}
    .tabla th{padding:3px 6px;text-align:left;font-size:9px;font-weight:700;color:var(--acc);
      text-transform:uppercase;letter-spacing:.4px;background:var(--card);
      border-bottom:1.5px solid var(--border);font-family:var(--sans);}
    .tabla td{padding:2px 6px;border-bottom:1px solid var(--border);}
    .tabla .r{text-align:right;}
    .tag{display:inline-block;padding:0 6px;border-radius:20px;font-size:9px;font-weight:700;
      font-family:var(--sans);}
    .tag.t{background:#dbeafe;color:#1d4ed8;} .tag.c{background:#fee2e2;color:#c0392b;}
    .tag.z{background:#eef0f3;color:#9aa3ad;}
    .joint-card{background:var(--card);border:1px solid var(--border);border-radius:6px;
      padding:7px 10px;margin-bottom:7px;page-break-inside:avoid;break-inside:avoid;}
    .joint-h{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;
      margin-bottom:6px;flex-wrap:wrap;font-family:var(--sans);}
    .joint-n{width:17px;height:17px;border-radius:50%;background:var(--acc);color:#fff;
      display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:none;}
    .joint-body{display:grid;grid-template-columns:1fr 165px;gap:12px;align-items:start;}
    .joint-svg{width:100%;max-width:160px;height:auto;display:block;border:1px solid var(--border);
      border-radius:6px;background:#fff;}
    .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:7px;
      page-break-inside:avoid;}
    .summary-box{border:1px solid var(--border);border-radius:5px;padding:5px 8px;}
    .summary-box.hl{background:var(--card);}
    .s-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;
      margin-bottom:2px;font-family:var(--sans);font-weight:700;}
    .s-val{font-size:13px;font-weight:700;color:var(--acc);font-style:italic;font-family:var(--math);}
    .s-unit{font-size:8px;color:var(--muted);}
    .teoria{border-left:3px solid var(--acc);background:var(--card);border-radius:5px;
      padding:6px 9px;margin-bottom:7px;font-size:10px;page-break-inside:avoid;}
    .teoria-t{font-size:9px;font-weight:800;color:var(--acc);text-transform:uppercase;
      letter-spacing:.4px;margin-bottom:3px;}
    .hint-sm{font-size:9.5px;color:var(--muted);}
    img{max-width:100%;}
    .wm-seal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      width:340px;height:340px;opacity:.07;z-index:9999;pointer-events:none;}
    .wm-seal svg{width:100%;height:100%;}
    .pdf-foot{margin-top:10px;text-align:center;font-size:8.5px;color:var(--muted);
      border-top:1px solid var(--border);padding-top:6px;letter-spacing:.3px;}
    @page{size:A4 portrait;margin:0;}
    @media print{ body{padding:12mm 9mm 14mm;} }
  `;

  const wmSeal = '<div class="wm-seal"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><path id="stp" d="M 26,100 A 74,74 0 0 1 174,100"/><path id="sbt" d="M 26,100 A 74,74 0 0 0 174,100"/></defs>'
    + '<circle cx="100" cy="100" r="94" fill="none" stroke="#7c3a06" stroke-width="2.5"/>'
    + '<circle cx="100" cy="100" r="80" fill="none" stroke="#7c3a06" stroke-width="1"/>'
    + '<text font-family="Inter,sans-serif" font-size="9" font-weight="800" fill="#7c3a06" letter-spacing="1">'
    + '<textPath href="#stp" startOffset="50%" text-anchor="middle">BEAM &amp; SECTION ANALYSIS</textPath></text>'
    + '<text font-family="Inter,sans-serif" font-size="10.5" font-weight="600" fill="#7c3a06" letter-spacing="1">'
    + '<textPath href="#sbt" startOffset="50%" text-anchor="middle">by Luis Alejandro Bazán Campos</textPath></text>'
    + '<text x="100" y="106" font-family="Inter,sans-serif" font-size="16" font-weight="800" fill="#7c3a06" text-anchor="middle">BSA</text>'
    + '<line x1="62" y1="118" x2="138" y2="118" stroke="#7c3a06" stroke-width="1"/>'
    + '<text x="100" y="133" font-family="Inter,sans-serif" font-size="9" fill="#7c3a06" text-anchor="middle" letter-spacing="1">EST\u00c1TICA</text>'
    + '</svg></div>';

  let html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
  html += '<title>BSA \u2014 An\u00e1lisis de Armaduras</title>';
  html += '<link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">';
  html += '<style>'+katexCss+'</style><style>'+printCss+'</style></head><body>';
  html += wmSeal;
  html += '<div class="pdf-header"><div><div class="pdf-title">BSA \u2014 An\u00e1lisis de Armaduras</div>'
        + '<div class="pdf-sub">by Luis Alejandro Baz\u00e1n Campos</div></div>'
        + '<div class="pdf-date">Generado: '+dt+'</div></div>';
  if(img){
    html += '<div style="margin-bottom:12px;page-break-inside:avoid;">'
      + '<h3 style="font-size:11px;font-weight:700;color:#b45309;margin-bottom:5px;'
      + 'font-family:Inter,sans-serif;text-transform:uppercase;letter-spacing:.5px;">Armadura analizada</h3>'
      + '<img src="'+img+'" style="max-width:100%;width:auto;height:auto;max-height:290px;'
      + 'border-radius:8px;border:1px solid #e7d3ba;display:block;margin:6px auto;"></div>';
  }
  html += rp.innerHTML;
  html += '<div class="pdf-foot">Beam &amp; Section Analysis \u00b7 beamsectionanalysis.com</div>';
  html += '<script>window.onload=function(){setTimeout(function(){window.print();},900);}<\/script>';
  html += '</body></html>';

  const w = window.open('', '_blank', 'width=980,height=760');
  if(!w){ aviso('El navegador bloque\u00f3 la ventana emergente. Perm\u00edtelas para generar el PDF.', 'error'); return; }
  w.document.write(html);
  w.document.close();
}
