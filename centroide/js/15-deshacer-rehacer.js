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
    figIdCounter, colorIdx, modoEspacio,
    modoCuerpo, MATS: MATS.map(m=>({id:m.id, val:m.val, unidad:m.unidad})), matSeq
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
  // El modo (2D/3D) se restaura ANTES que las figuras, sin vaciar el panel.
  if(e.modoEspacio && e.modoEspacio !== modoEspacio) setModoEspacio(e.modoEspacio, {sinLimpiar:true, sinAjustar:true});
  figures = e.figures.map(f=>Object.assign({}, f, {dims:Object.assign({},f.dims)}));
  figIdCounter = e.figIdCounter; colorIdx = e.colorIdx;
  modoCuerpo = e.modoCuerpo; MATS = e.MATS.map(m=>({id:m.id, val:m.val, unidad:m.unidad})); matSeq = e.matSeq;
  // La selección puede apuntar a figuras que ya no existen tras restaurar.
  if(!figures.some(f=>f.id===selectedFigId)) selectedFigId = null;
  selFiguras = selFiguras.filter(id=>figures.some(f=>f.id===id));
  results = null;
  try{
    const h = document.getElementById('modo-homo'), he = document.getElementById('modo-het');
    if(h) h.classList.toggle('active', modoCuerpo==='homogeneo');
    if(he) he.classList.toggle('active', modoCuerpo==='heterogeneo');
  }catch(e){}
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
