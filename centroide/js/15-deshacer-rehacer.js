// ═══════════════════════════════════════════════════════════
//  DESHACER / REHACER
// ═══════════════════════════════════════════════════════════
let pilaDeshacer = [], pilaRehacer = [];
const MAX_HISTORIAL = 60;

function instantanea(){
  return JSON.stringify({
    figures: figures.map(f=>({id:f.id, type:f.type, dims:Object.assign({},f.dims),
      cx:f.cx, cy:f.cy, cz:f.cz, es3d:f.es3d, volteado:f.volteado, perfil:f.perfil,
      rotation:f.rotation, sign:f.sign, color:f.color,
      anchor:f.anchor, activeAnchor:f.activeAnchor, name:f.name, etiqueta:f.etiqueta,
      matId:f.matId, thickness:f.thickness, angleMode:f.angleMode})),
    figIdCounter, colorIdx, modoEspacio, unit, unitForce,
    modoCuerpo, matMagnitud, MATS: MATS.map(m=>({id:m.id, val:m.val, unidad:m.unidad, valIng:m.valIng, uIng:m.uIng})), matSeq
  });
}

// Llamar ANTES de modificar el modelo.
function registrarCambio(){
  pilaDeshacer.push(instantanea());
  if(pilaDeshacer.length > MAX_HISTORIAL) pilaDeshacer.shift();
  pilaRehacer = [];              // una acción nueva invalida el camino de rehacer
  actualizarBotonesHistorial();
}

function restaurarInstantanea(txt){
  const e = JSON.parse(txt);
  // El resultado caduca ANTES de cambiar de modo, como en histRestore (11-): pasar
  // a alambre con un cuerpo heterogéneo llama a setModoCuerpo, que recalculaba el
  // modelo viejo en el modo nuevo y avisaba «En el modo Alambre solo entran
  // segmentos y arcos.».
  invalidarResultados();
  // Las figuras entran ANTES que el modo, y el modo sin vaciar el panel:
  // setModoEspacio repinta, y el 3D pintando las figuras planas que quedaban lanzaba
  // en verticesSolido (20-), así que rehacer de un 2D con figuras a un 3D se rompía.
  figures = e.figures.map(f=>Object.assign({}, f, {dims:Object.assign({},f.dims)}));
  if(e.modoEspacio && e.modoEspacio !== modoEspacio) setModoEspacio(e.modoEspacio, {sinLimpiar:true, sinAjustar:true});
  figIdCounter = e.figIdCounter; colorIdx = e.colorIdx;
  asegurarContadorFiguras();
  // Las medidas de la instantánea están en SUS unidades: se restauran con
  // ellas. El punto P no va en la instantánea y se lleva a esa unidad.
  if(e.unit && e.unit !== unit){
    const k = LEN_FAC_I[unit]/LEN_FAC_I[e.unit];
    if(extraPoint){ extraPoint.x = +(extraPoint.x*k).toFixed(9); extraPoint.y = +(extraPoint.y*k).toFixed(9); }
    setUnit(e.unit);
  }
  if(e.unitForce) unitForce = e.unitForce;
  modoCuerpo = e.modoCuerpo; MATS = e.MATS.map(m=>({id:m.id, val:m.val, unidad:m.unidad, valIng:m.valIng, uIng:m.uIng})); matSeq = e.matSeq;
  if(e.matMagnitud) matMagnitud = e.matMagnitud;
  // Botones de tipo de cuerpo y de magnitud, panel de materiales y su lista (12-).
  try{ pintarTipoDeCuerpo(); }catch(err){}
  // La selección puede apuntar a figuras que ya no existen tras restaurar.
  if(!figures.some(f=>f.id===selectedFigId)) selectedFigId = null;
  selFiguras = selFiguras.filter(id=>figures.some(f=>f.id===id));
  selectFigure(selectedFigId);
  renderFigList(); actualizarInfoSel(); render();
}

function deshacer(){
  if(!pilaDeshacer.length) return;
  pilaRehacer.push(instantanea());
  restaurarInstantanea(pilaDeshacer.pop());
  actualizarBotonesHistorial();
}
function rehacer(){
  if(!pilaRehacer.length) return;
  pilaDeshacer.push(instantanea());
  restaurarInstantanea(pilaRehacer.pop());
  actualizarBotonesHistorial();
}
function actualizarBotonesHistorial(){
  const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
  if(u) u.disabled = !pilaDeshacer.length;
  if(r) r.disabled = !pilaRehacer.length;
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
    aviso('Ocurri\u00f3 un error al preparar el env\u00edo: ' + e.message, 'error');
  } finally {
    if(btn) btn.dataset.ocupado = '0';
  }
}

// ── Construcción completa del documento LaTeX ──
