function descargarTex(){
  const tex = construirLatex();
  if(!tex) return;
  const blob = new Blob([tex], {type:'text/x-tex'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'fuerzas-internas-bsa.tex';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function generarPDFLatex(){
  const btn = document.getElementById('btnLatex');
  if(btn && btn.dataset.ocupado === '1') return;

  const tex = construirLatex();
  if(!tex) return;

  try {
    if(btn) btn.dataset.ocupado = '1';
    const panel = _panelLatexPDF();
    const estado = document.getElementById('latexEstado');
    const frame = document.getElementById('latexFrame');
    estado.textContent = 'Enviando a texlive.net…';
    const cargando = document.getElementById('latexCargando');
    if(cargando) cargando.style.display = 'flex';
    panel.style.display = 'flex';

    // El envio vive en core/comun.js porque es identico en los cinco temas.
    // En telefono y tableta el PDF va a una pestana nueva: el navegador no lo
    // pinta dentro de un iframe.
    const enIframe = bsaEnviarTex(tex, TEXLIVE_NET_URL);
    if(!enIframe) bsaPanelMovil();

    frame.addEventListener('load', function(){
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
      estado.textContent = 'Informe generado.';
      estado.style.color = '#15803D';
    }, {once:true});

    setTimeout(()=>{
      if(estado.textContent.indexOf('Enviando') === 0){
        estado.textContent = 'Sigue esperando respuesta de texlive.net. '
          + 'Si tarda demasiado, cierra este panel y vuelve a intentar.';
      }
    }, 45000);
    setTimeout(()=>{
      const cg = document.getElementById('latexCargando');
      if(cg) cg.style.display = 'none';
    }, 90000);
  } catch(e){
    console.error('Error al enviar a texlive.net:', e);
    aviso('Ocurri\u00f3 un error al preparar el env\u00edo: ' + e.message, 'error');
  } finally {
    if(btn) btn.dataset.ocupado = '0';
  }
}

// ═══ Informe rápido: el botón rojo «PDF» (no el de LaTeX) ═══
// Lo común —abrir la pestaña dentro de la pulsación, limpiar el panel, cabecera
// BSA, colofón, KaTeX, A4 con márgenes, imprimir solo en el ordenador y esperar
// al botón en el móvil— es de bsaInformeRapido (core/comun.js). Aquí queda solo
// lo del tema:
//  · La figura de la viga se dibuja APARTE, en un lienzo oculto de tamaño fijo
//    (lienzoTemporalInforme), sin rejilla, ejes, leyenda ni selección. El lienzo de
//    pantalla no sirve: los ejes lo cruzan de lado a lado (el recorte no
//    recortaba nada) y en un teléfono al encuadre le quedan unos 115 px. La
//    vista se ENCAJA midiendo el propio dibujo (encajarDibujoInforme): con un margen
//    fijo, las cotas, las cargas o una reacción podían quedar cortadas por el
//    borde. dibujar() solo usa ctx, W, H y la vista, así que basta cambiarlos un
//    momento; despues() lo devuelve todo y redibuja, también si algo falla.
//  · Las casillas de grupos y los botones Generar / Todos / Ninguno / Ver
//    diagramas se van solos (son controles). Las dos instrucciones que los
//    acompañan se marcan con data-bsa-pantalla mientras se limpia. Los
//    diagramas salen tal como estén generados en pantalla.
//  · El CSS del panel de resultados (_cssInformeRapidoFI), con tamaños de papel.
//    La versión anterior copiaba las <style> de la página, pero estilos.css va
//    en un <link>: el informe salía sin ningún estilo.
const FIG_INFORME_FI = {ancho:820, alto:580, res:2, margen:16};

function _cssInformeRapidoFI(){
  return [
    ':root{--mf:var(--math);--acc-l:var(--suave);--card:#fff;--border:#e0e4e8;--border2:#ccd2d8;',
    '--nor:#0e9f6e;--cor:#d94f5c;--mom:#8b5cf6;--reac:#15803d}',
    // Secciones numeradas
    '.bsa-cuerpo .res-section{margin:0 0 16px}',
    '.bsa-cuerpo .res-title{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;',
    'color:var(--acc);letter-spacing:.3px;margin:0 0 8px;padding-bottom:5px;border-bottom:1px solid var(--border);',
    'break-after:avoid;page-break-after:avoid}',
    '.bsa-cuerpo .res-title .num{flex:none;width:19px;height:19px;border-radius:50%;background:var(--acc2);',
    'color:#fff;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800}',
    '.bsa-cuerpo .hint-sm{font-size:9.5px;color:var(--muted);line-height:1.4}',
    // Veredicto y bloques de ecuaciones
    '.bsa-cuerpo .verdict{border-left:4px solid var(--acc);background:var(--suave);border-radius:7px;',
    'padding:8px 11px;margin:0 0 8px;font-size:10.5px;break-inside:avoid;page-break-inside:avoid}',
    '.bsa-cuerpo .verdict.ok{border-left-color:#15803d;background:#f0fdf4}',
    '.bsa-cuerpo .verdict.bad{border-left-color:var(--cor);background:#fef2f2}',
    '.bsa-cuerpo .verdict-t{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;',
    'margin-bottom:3px;color:var(--muted)}',
    '.bsa-cuerpo .proc-block{background:#fff;border:1px solid var(--border);border-radius:8px;',
    'padding:9px 11px;margin:0 0 8px;break-inside:avoid;page-break-inside:avoid}',
    '.bsa-cuerpo .eq-row{margin:2px 0}',
    '.bsa-cuerpo .eq-body{font-family:var(--mf);font-size:11.5px;line-height:1.6}',
    // Tablas
    '.bsa-cuerpo .tabla{width:100%;border-collapse:collapse;font-family:var(--mf);font-size:10.5px;',
    'margin:0 0 8px;border-bottom:1px solid var(--border2)}',
    '.bsa-cuerpo .tabla th{padding:4px 7px;text-align:left;font:800 8px/1.3 var(--sans);color:var(--acc);',
    'text-transform:uppercase;letter-spacing:.5px;background:var(--suave);border-bottom:2px solid var(--border2)}',
    '.bsa-cuerpo .tabla td{padding:3.5px 7px;border-bottom:1px solid var(--border)}',
    '.bsa-cuerpo .tabla .r{text-align:right}',
    // Método de las ecuaciones: un bloque por subtramo con su DCL
    '.bsa-cuerpo .sub-tramo-cab{font:800 11px/1.3 var(--sans);color:#26415e;margin:12px 0 5px;',
    'padding-bottom:3px;border-bottom:2px solid #e3e8ee;break-after:avoid;page-break-after:avoid}',
    '.bsa-cuerpo .dcl-caja{border:1px solid #e3e8ee;border-radius:8px;padding:8px 10px;margin:0 0 8px;',
    'background:#fbfcfe;break-inside:avoid;page-break-inside:avoid}',
    '.bsa-cuerpo .dcl-rango{font:700 10.5px/1.4 var(--sans);margin-bottom:4px}',
    '.bsa-cuerpo .dcl-nota{font-weight:500;color:var(--muted);font-size:9.5px}',
    '.bsa-cuerpo .dcl-svg{display:block;width:100%;max-width:120mm;height:auto;margin:4px auto}',
    '.bsa-cuerpo .dcl-ecs{margin-top:6px}',
    '.bsa-cuerpo .dcl-extremos{font:500 10px/1.5 var(--sans);color:#3c4652;margin-top:5px;',
    'padding-top:5px;border-top:1px dashed #e3e8ee}',
    '.bsa-cuerpo .dcl-saltos{font:500 10px/1.5 var(--sans);color:#3c4652;margin:6px 0 4px}',
    // Diagramas DFN · DFC · DMF: un grupo entero por bloque, sin estirarse
    '.bsa-cuerpo #diagWrap>div{margin-bottom:12px!important;break-inside:avoid;page-break-inside:avoid}',
    '.bsa-cuerpo #diagWrap>div>div:first-child{font-size:10.5px!important;break-after:avoid;page-break-after:avoid}',
    '.bsa-cuerpo #diagWrap .proc-block>svg{max-width:165mm;margin:0 auto}',
    '.bsa-cuerpo .vd-stats{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
    '.bsa-cuerpo .vd-stat{flex:1 1 150px;border:1px solid var(--border2);border-left:3px solid var(--acc);',
    'border-radius:7px;padding:5px 8px;font-size:9.5px;line-height:1.5;background:#fff}',
    '.bsa-cuerpo .vd-stat-t{font-weight:800;font-size:9.5px;margin-bottom:1px}'
  ].join('');
}

// El encaje de la figura (cajaDibujoInforme, encajarDibujoInforme,
// lienzoTemporalInforme, marcoLienzoInforme) vive en core/comun.js.

// Caja del modelo en coordenadas del mundo: los nudos.
function _cajaModeloFI(){
  if(!nodos.length) return null;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  return {x0:Math.min(...xs), x1:Math.max(...xs), y0:Math.min(...ys), y1:Math.max(...ys)};
}

// Dibuja la viga en el lienzo temporal y la encaja. Cambia ctx, W, H y la
// vista: quien la llama los ha guardado antes. El lienzo va a temporales NADA
// MÁS CREARLO, para que despues() lo quite aunque el encaje o dibujar() fallen
// a medias (si no, quedaba en el documento un lienzo oculto por cada fallo).
function _figuraInformeFI(temporales){
  const f = FIG_INFORME_FI;
  const c0 = _cajaModeloFI();
  if(!c0) return null;
  const lienzo = lienzoTemporalInforme(f.ancho, f.alto, f.res);
  temporales.push(lienzo);
  ctx = lienzo.getContext('2d');
  W = f.ancho; H = f.alto;
  // Punto de partida: el encuadre de centrar(); la medida lo corrige.
  vx = (c0.x0 + c0.x1)/2; vy = (c0.y0 + c0.y1)/2;
  escala = Math.max(0.02, Math.min((W - 260)/Math.max(c0.x1 - c0.x0, 1),
                                   (H - 180)/Math.max(c0.y1 - c0.y0, 1), 400));
  const r = encajarDibujoInforme({
    ancho: W, alto: H, margen: f.margen,
    medir: function(){ dibujar(); return cajaDibujoInforme(lienzo); },
    modelo: function(){
      const c = _cajaModeloFI();
      const p0 = aPantalla(c.x0, c.y1), p1 = aPantalla(c.x1, c.y0);
      return {x0:p0[0], y0:p0[1], x1:p1[0], y1:p1[1]};
    },
    escalar: function(k, dx, dy){
      const c = _cajaModeloFI();
      const xc = (c.x0 + c.x1)/2, yc = (c.y0 + c.y1)/2;
      const s = aPantalla(xc, yc);
      escala *= k;
      vx = xc - (s[0] + dx - W/2)/escala;
      vy = yc + (s[1] + dy - H/2)/escala;
    }
  });
  if(!r.ok) console.warn('Informe PDF: la figura de la viga no cabe entera en su lienzo.');
  return lienzo;
}

function downloadPDF(){
  const rp = document.getElementById('resultsPanel');
  const hay = !!(R && !R.error && rp && rp.style.display !== 'none' && rp.innerHTML.trim());
  let guardado = null, lienzo = null;
  const marcados = [];
  const temporales = [];    // lienzos creados en antes(), también si algo falla
  return bsaInformeRapido({
    panel: 'resultsPanel',
    hayResultados: hay,
    sinResultados: (R && R.error)
      ? 'La viga no se pudo resolver: corrige el modelo y pulsa Calcular.'
      : 'Primero pulsa Calcular.',
    tema: 'Fuerzas internas',
    acento: {acc:'#2563eb', acc2:'#1e3a8a', suave:'#eef3ff', borde:'#e0e4e8'},
    cssTema: _cssInformeRapidoFI(),
    // Las ayudas de los dos métodos (06-) acaban en «El desarrollo completo va
    // en el PDF.»: el resto de la ayuda sí va al papel, esa frase no.
    limpiar: {reemplazarTexto: [[/\s*El desarrollo completo va en el PDF\./g, '']]},
    antes: function(){
      // Primero se guarda todo lo que se va a tocar: despues() lo necesita
      // aunque algo falle a medias.
      guardado = {ctx:ctx, W:W, H:H, vx:vx, vy:vy, escala:escala,
        grilla:VIS.grilla, ejes:VIS.ejes, leyenda:VIS.leyenda,
        selNodos:selNodos, selTramos:selTramos, selCargas:selCargas,
        selNodo:selNodo, selTramo:selTramo};
      rp.querySelectorAll('.res-section > .hint-sm').forEach(function(el){
        if(/columna de control|pulsa Generar/i.test(el.textContent)){
          el.setAttribute('data-bsa-pantalla', '');
          marcados.push(el);
        }
      });
      VIS.grilla = false; VIS.ejes = false; VIS.leyenda = false;
      selNodos = []; selTramos = []; selCargas = []; selNodo = null; selTramo = null;
      lienzo = _figuraInformeFI(temporales);
    },
    figuras: function(){
      return lienzo ? [{titulo:'Viga analizada', lienzo:lienzo}] : [];
    },
    despues: function(){
      marcados.forEach(function(el){ el.removeAttribute('data-bsa-pantalla'); });
      temporales.splice(0).forEach(function(c){ c.remove(); });
      lienzo = null;
      if(!guardado) return;
      const g = guardado;
      guardado = null;
      ctx = g.ctx; W = g.W; H = g.H;
      vx = g.vx; vy = g.vy; escala = g.escala;
      VIS.grilla = g.grilla; VIS.ejes = g.ejes; VIS.leyenda = g.leyenda;
      selNodos = g.selNodos; selTramos = g.selTramos; selCargas = g.selCargas;
      selNodo = g.selNodo; selTramo = g.selTramo;
      dibujar();
    }
  });
}

// ── Jerarquía de Esc (criterio cap9): cierra lo más superficial primero ────
function manejarEsc(){
  // 1) Un modal abierto: se cierra con su función propia para no dejar estado sucio
  const cierres = {nudoModal:'cerrarNudo', tramoModal:'cerrarTramo',
    tramoNuevoModal:'cerrarTramoNuevo', apoyoModal:'cerrarApoyo',
    cargaModal:'cerrarCarga', unitsModal:'closeUnitsModal',
    decModal:'closeDecModal', guardarModal:'cerrarGuardar', histModal:'cerrarHistorial', ejModal:'cerrarEjemplos', pesoModal:'cerrarPeso',
    corteModal:'cerrarCorte',
    transModal:'closeTransformar', repModal:'closeReplicar'};
  for(const id in cierres){
    const m = document.getElementById(id);
    if(m && m.classList.contains('show')){
      try{ window[cierres[id]](); }catch(_){ m.classList.remove('show'); }
      return;
    }
  }
  // 2) Un aviso en pantalla
  const av = document.getElementById('avisoCaja');
  if(av && av.classList.contains('visible')){ cerrarAviso(); return; }
  // 3) Un gesto a medias
  if(panDrag || gesto || pinchDist!==null){ cancelarGestoEnCurso(); dibujar(); return; }
  // 4) La cadena de dibujo por nudos pendiente
  if(primerNodo!==null){ primerNodo=null; dibujar(); return; }
  // 5) La selección actual
  if(selNodos.length || selTramos.length || selCargas.length || selNodo!==null || selTramo!==null){
    selNodos=[]; selTramos=[]; selCargas=[]; selNodo=null; selTramo=null; refrescar(); return;
  }
  // 6) La herramienta de borrado, para no dejarla armada sin darse cuenta
  if(tool==='borrar'){ setTool('sel'); return; }
  // 7) La herramienta de cargas con su tipo armado: se vuelve a desplazar
  if(tool==='carga'){ setTool('pan'); }
}
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ manejarEsc(); return; }
  // Atajos de historial. Se ignoran si el foco está en un campo de texto,
  // donde Ctrl+Z debe deshacer la escritura, no el dibujo.
  const et = (e.target && e.target.tagName || '').toLowerCase();
  if(et === 'input' || et === 'textarea' || et === 'select') return;
  if((e.ctrlKey || e.metaKey) && !e.altKey){
    const k = (e.key || '').toLowerCase();
    if(k === 'z' && !e.shiftKey){ e.preventDefault(); deshacer(); }
    else if(k === 'y' || (k === 'z' && e.shiftKey)){ e.preventDefault(); rehacer(); }
  }
});

// ═══════════════════════════════════════════════════════════
window.addEventListener('load', ()=>{
  cv=document.getElementById('mainCanvas'); ctx=cv.getContext('2d');
  cv.addEventListener('mousedown', onDown);
  cv.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  cv.addEventListener('dblclick', onDbl);
  // ── Puente táctil: un dedo delega en el motor de ratón; dos dedos hacen
  //    pellizco con las mismas cotas que zoomIn/zoomOut; el doble toque
  //    delega en onDbl porque dblclick no existe en pantallas táctiles.
  cv.addEventListener('touchstart', e=>{
    if(e.touches.length===2){
      cancelarGestoEnCurso();
      const a=e.touches[0], b=e.touches[1];
      pinchDist = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
      e.preventDefault(); return;
    }
    if(e.touches.length===1){
      const t=e.touches[0], ahora=Date.now();
      if(ahora-ultimoTap<350 && Math.hypot(t.clientX-ultimoTapX,t.clientY-ultimoTapY)<24){
        ultimoTap=0;
        onDbl({clientX:t.clientX,clientY:t.clientY});
        e.preventDefault(); return;
      }
      ultimoTap=ahora; ultimoTapX=t.clientX; ultimoTapY=t.clientY;
      onDown({clientX:t.clientX,clientY:t.clientY}); e.preventDefault();
    }
  },{passive:false});
  cv.addEventListener('touchmove', e=>{
    if(e.touches.length===2 && pinchDist!==null){
      const a=e.touches[0], b=e.touches[1];
      const d = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
      if(d>0 && pinchDist>0){
        escala = Math.min(4000, Math.max(0.02, escala*d/pinchDist));
        pinchDist = d; dibujar();
      }
      e.preventDefault(); return;
    }
    if(e.touches.length===1 && pinchDist===null){
      const t=e.touches[0];
      onMove({clientX:t.clientX,clientY:t.clientY}); e.preventDefault();
    }
  },{passive:false});
  cv.addEventListener('touchend', e=>{ if(!e.touches || e.touches.length===0){ pinchDist=null; onUp(); } });
  cv.addEventListener('touchcancel', ()=>cancelarGestoEnCurso());
  cv.addEventListener('wheel', e=>{ e.preventDefault(); e.deltaY<0?zoomIn():zoomOut(); },{passive:false});
  window.addEventListener('resize', ajustarCanvas);
  try{ new ResizeObserver(()=>ajustarCanvas()).observe(document.getElementById('canvasArea')); }catch(e){}
  document.getElementById('chipDec').textContent=textoDecimales();
  posicionarToggle();
  ajustarCanvas(); setTool('pan'); setModoEdicion('nudos'); centrar(); refrescar();
  // El guardado ahora es un archivo local: no hay lista que pedir al portal
  // al arrancar.
});


// ═══ Latido de actividad hacia el portal ═══
// El portal cierra la sesión por inactividad, pero no ve lo que ocurre
// dentro de este iframe. Se le avisa como mucho una vez cada 20 s.
let _ultLatido = 0;
function latidoActividad(){
  const ahora = Date.now();
  if(ahora - _ultLatido < 20000) return;
  _ultLatido = ahora;
  try{
    if(window.parent && window.parent !== window)
      window.parent.postMessage({bsa:'activo'}, '*');
  }catch(e){}
}
['pointerdown','keydown','wheel','touchstart'].forEach(ev=>
  document.addEventListener(ev, latidoActividad, {passive:true}));
