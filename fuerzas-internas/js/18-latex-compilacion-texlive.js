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
      inp.name = nombre; inp.value = valor;
      form.appendChild(inp);
    };
    campo('filename[]', 'document.tex');
    campo('filecontents[]', tex);
    campo('engine', 'pdflatex');
    campo('return', 'pdf');
    document.body.appendChild(form);
    form.submit();

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

function downloadPDF(){
  const rp=document.getElementById('resultsPanel');
  if(!rp||!rp.innerHTML.trim()){ aviso('Primero pulsa Calcular.', 'error'); return; }
  const w=window.open('','_blank','width=980,height=760');
  if(!w){ aviso('El navegador bloqueó la ventana emergente.', 'error'); return; }
  const kEl=document.getElementById('katex-css');
  let styles='';
  document.querySelectorAll('style').forEach(s=>{ styles+='<style>'+s.textContent+'</style>'; });
  w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
    +'<title>BSA — Fuerzas Internas</title>'+styles
    +'<style>@page{size:A4 portrait;margin:12mm;} body{background:#fff;padding:0;}</style>'
    +'</head><body><h2 style="color:#2563eb">BSA — Fuerzas Internas</h2>'
    +rp.innerHTML+'</body></html>');
  w.document.close();
  setTimeout(()=>{ try{ w.print(); }catch(e){} }, 700);
}

// ── Jerarquía de Esc (criterio cap9): cierra lo más superficial primero ────
function manejarEsc(){
  // 1) Un modal abierto: se cierra con su función propia para no dejar estado sucio
  const cierres = {nudoModal:'cerrarNudo', tramoModal:'cerrarTramo',
    tramoNuevoModal:'cerrarTramoNuevo', apoyoModal:'cerrarApoyo',
    cargaModal:'cerrarCarga', unitsModal:'closeUnitsModal',
    decModal:'closeDecModal', guardarModal:'cerrarGuardar', histModal:'cerrarHistorial', ejModal:'cerrarEjemplos', pesoModal:'cerrarPeso',
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
  if(tool==='borrar'){ setTool('sel'); }
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
