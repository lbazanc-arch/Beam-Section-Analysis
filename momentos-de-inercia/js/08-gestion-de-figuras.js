// ═══════════════════════════════════════════════════════════
//  FIGURE MANAGEMENT
// ═══════════════════════════════════════════════════════════
function getRefFigHTML(type) {
  const ref = REF_FIGS[type];
  if(!ref) return '';
  return `<div class="ref-fig-box">
    <div class="ref-fig-title">${ref.title}</div>
    ${ref.svg}
    <div class="ref-fig-formula">${ref.formulas}</div>
  </div>`;
}

function selectFigType(type){
  selectedFigType = type;
  selectedFigId = null;
  asegurarFiguraVisible(type);
  document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
  const btn = document.getElementById('figbtn-'+type);
  if(btn) btn.classList.add('selected');
  document.getElementById('canvasHint').textContent = 'Haz clic en el canvas para colocar la figura';
  canvas.style.cursor='crosshair';
  document.getElementById('propPanel').style.display='none';
  document.getElementById('noSelection').style.display='block';
}

function getDefaultDims(type){
  const def = FIG_DEFS[type];
  const d={};
  for(const dim of def.dims) d[dim.id] = dim.def;
  return d;
}

function placeFigure(type, cx, cy){
  registrarCambio();
  const def = FIG_DEFS[type];
  const id = ++figIdCounter;
  const dims = getDefaultDims(type);
  const color = COLORS[colorIdx % COLORS.length]; colorIdx++;
  // Default centroid always at (0,0)
  const defAnc = def.defaultAnchor || 'C';
  const fig = {id, type, dims, cx:0, cy:0, rotation:0, sign:1, color,
               anchor: defAnc, activeAnchor: defAnc, name: def.name,
               angleMode:'semi'};  // sector only: 'semi' (θ) | 'total' (2θ). Internal alpha is always the half-angle.
  figures.push(fig);
  selectedFigType = null;
  ghostPos = null;
  document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
  canvas.style.cursor='grab';
  // placeFigure sitúa el centroide en el ORIGEN, no donde se hizo clic. El
  // mensaje repetía las coordenadas del clic y hacía creer lo contrario.
  document.getElementById('canvasHint').textContent =
    'Figura colocada con su centroide en el origen (0, 0). Arr\u00e1strala o usa el panel para moverla.';
  selectFigure(id);
  results = null;
  renderFigList();
  render();
}

// ── Salvaguardas del panel prestado ──
// Mientras la ventana de edición está abierta, #propPanel VIVE dentro de ella.
// Si la escena cambia por debajo (se borra la figura, se limpia todo, se abre un
// ejercicio guardado) hay que cerrar la ventana por la vía normal; ocultarla sin
// más dejaría el panel huérfano dentro de un modal invisible y la columna se
// quedaría sin propiedades para el resto de la sesión.
function cerrarEdicionSiSobra_forzar(){
  const m = document.getElementById('edFigModal');
  if(m && m.classList.contains('show')) cerrarEdicionFigura();
}
function cerrarEdicionSiSobra(){
  const m = document.getElementById('edFigModal');
  if(!m || !m.classList.contains('show')) return;
  const sigue = selectedFigId !== null && figures.some(f=>f.id===selectedFigId);
  if(!sigue) cerrarEdicionFigura();
}

function selectFigure(id){
  selectedFigId = id;
  renderFigList();
  if(id){
    const fig = figures.find(f=>f.id===id);
    document.getElementById('propPanel').style.display='block';
    document.getElementById('noSelection').style.display='none';
    buildPropPanel(fig);
  } else {
    document.getElementById('propPanel').style.display='none';
    document.getElementById('noSelection').style.display='block';
  }
  render();
}

function renderFigList(){
  const ul = document.getElementById('figList');
  if(!figures.length){
    ul.innerHTML='<li style="color:var(--muted);font-size:10px;text-align:center;padding:8px">Sin figuras.</li>';
    return;
  }
  ul.innerHTML = figures.map(fig=>`
    <li class="fig-item ${fig.id===selectedFigId?'selected':''}" onclick="selectFigure(${fig.id})">
      <div class="fig-color" style="background:${fig.color}"></div>
      <span class="fig-name">${fig.name}</span>
      <span class="fig-sign ${fig.sign===1?'pos':'neg'}">${fig.sign===1?'＋':'－'}</span>
      <button class="fig-del" onclick="event.stopPropagation();deleteFigure(${fig.id})">×</button>
    </li>`).join('');
}

function deleteFigure(id){
  registrarCambio();
  figures = figures.filter(f=>f.id!==id);
  if(selectedFigId===id) selectFigure(null);
  results=null; renderFigList(); render(); cerrarEdicionSiSobra();
}
