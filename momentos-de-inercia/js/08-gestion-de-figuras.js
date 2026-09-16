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

// ── Dónde cae la figura al colocarla ──────────────────────────────────────
// `cx`/`cy` guardan el CENTROIDE de la pieza, pero lo que el alumno apunta con
// el clic es el ancla POR DEFECTO de la figura (BM en el semicírculo y en la
// parábola, BL en el trapecio, M en el segmento circular…). Se descuenta el
// desplazamiento del ancla, girado como la figura, igual que hace placeSolid
// con los sólidos del modo 3D (centroide/js/21-vistas-3d.js).
function desplazamientoAncla(def, dims, ancla, grados){
  const off = (def.anchorOffset ? def.anchorOffset(dims, ancla) : null) || {dx:0, dy:0};
  const rot = (grados || 0)*Math.PI/180;
  return {dx: off.dx*Math.cos(rot) - off.dy*Math.sin(rot),
          dy: off.dx*Math.sin(rot) + off.dy*Math.cos(rot)};
}
// El lienzo no engancha a la rejilla (es solo visual); el único enganche que
// hay es el de los ejes, con la misma tolerancia de 2 px que usa el arrastre.
// Así un clic junto a un eje deja el ancla EXACTAMENTE sobre él.
function engancharAlOrigen(x, y){
  const t = 2/viewScale;
  return {x: Math.abs(x) < t ? 0 : x, y: Math.abs(y) < t ? 0 : y};
}
// Centroide que corresponde a colocar la figura con su ancla en (wx, wy).
// Lo usan placeFigure y la figura fantasma, para que la vista previa caiga
// justo donde quedará la figura. Devuelve también el punto del ancla (ax, ay).
function centroideDesdeClic(type, wx, wy){
  const def = FIG_DEFS[type];
  const p = engancharAlOrigen(isFinite(wx) ? wx : 0, isFinite(wy) ? wy : 0);
  if(!def) return {x:p.x, y:p.y, ax:p.x, ay:p.y};
  const off = desplazamientoAncla(def, getDefaultDims(type), def.defaultAnchor || 'C', 0);
  return {x: p.x - off.dx, y: p.y - off.dy, ax: p.x, ay: p.y};
}

function placeFigure(type, cx, cy){
  registrarCambio();
  const def = FIG_DEFS[type];
  const id = ++figIdCounter;
  const dims = getDefaultDims(type);
  const color = COLORS[colorIdx % COLORS.length]; colorIdx++;
  // La figura se coloca DONDE SE HIZO CLIC: en ese punto cae su ancla por
  // defecto, y cx/cy son el centroide que le corresponde.
  const defAnc = def.defaultAnchor || 'C';
  const pos = centroideDesdeClic(type, cx, cy);
  const fig = {id, type, dims, cx:pos.x, cy:pos.y, rotation:0, sign:1, color,
               anchor: defAnc, activeAnchor: defAnc, name: def.name,
               angleMode:'semi'};  // sector only: 'semi' (θ) | 'total' (2θ). Internal alpha is always the half-angle.
  figures.push(fig);
  selectedFigType = null;
  ghostPos = null;
  document.querySelectorAll('.fig-btn').forEach(b=>b.classList.remove('selected'));
  canvas.style.cursor='grab';
  document.getElementById('canvasHint').textContent =
    `Figura colocada en (${r2(pos.ax)}, ${r2(pos.ay)}) ${unit}`;
  selectFigure(id);
  invalidarResultados();
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
  // La figura borrada sale también de la marca de Mover / editar: si no,
  // Replicar y Transformar seguían contando un id que ya no existe.
  selFiguras = selFiguras.filter(s=>s!==id);
  actualizarInfoSel();
  invalidarResultados(); renderFigList(); render(); cerrarEdicionSiSobra();
}
