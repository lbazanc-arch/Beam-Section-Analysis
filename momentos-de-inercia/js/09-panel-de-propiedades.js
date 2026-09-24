// ═══════════════════════════════════════════════════════════
//  PROPERTIES PANEL
// ═══════════════════════════════════════════════════════════
function buildPropPanel(fig){
  const def = FIG_DEFS[fig.type];
  document.getElementById('propTitle').textContent = fig.name;

  // Sign
  document.getElementById('signPos').classList.toggle('active', fig.sign===1);
  document.getElementById('signNeg').classList.toggle('active', fig.sign===-1);

  // Dimension fields — with reference figure at top
  const df = document.getElementById('dimFields');
  df.innerHTML = getRefFigHTML(fig.type, fig.activeAnchor || def.defaultAnchor || 'C');

  // Sector only: toggle to enter either the half-angle (θ) or the total angle (2θ).
  // Internally, fig.dims.alpha is ALWAYS the half-angle (θ); the toggle only
  // changes how the field is labelled and read/written.
  const isSector = fig.type==='sector';
  const angMode = fig.angleMode || 'semi';
  if(isSector){
    const tog = document.createElement('div');
    tog.className = 'field';
    tog.innerHTML = `<label>Modo de ángulo</label>
      <div class="anchor-row">
        <button class="anchor-btn${angMode==='semi'?' active':''}" onclick="setSectorAngleMode('semi')">Semiángulo θ</button>
        <button class="anchor-btn${angMode==='total'?' active':''}" onclick="setSectorAngleMode('total')">Ángulo total 2θ</button>
      </div>`;
    df.appendChild(tog);
  }

  const pairs = [];
  for(let i=0;i<def.dims.length;i+=2) pairs.push(def.dims.slice(i,i+2));
  for(const pair of pairs){
    const row = document.createElement('div');
    row.className = pair.length>1?'field-row':'field';
    for(const dim of pair){
      const d = document.createElement('div'); d.className='field';
      if(isSector && dim.id==='alpha'){
        // Mode-aware label/value/handler; alpha stored internally as half-angle.
        const total = angMode==='total';
        const lbl = total ? 'Ángulo total 2θ (°)' : 'Semiángulo θ (°)';
        const val = total ? r2(fig.dims.alpha*2) : r2(fig.dims.alpha);
        const handler = total ? 'updateSectorAngle(this.value,true)' : 'updateSectorAngle(this.value,false)';
        d.innerHTML=`<label>${lbl}</label><input type="number" id="dim-alpha" value="${val}" step="any" min="0.001" max="${total?'360':'180'}" onchange="${handler}">`;
      } else if(dim.id==='alpha'){
        // Un ángulo se mide en grados: no lleva detrás la unidad de
        // longitud («Semiángulo θ (°) (cm)» no significa nada) y no llega a 180°.
        d.innerHTML=`<label>${dim.label}</label>`
          +`<input type="number" id="dim-${dim.id}" value="${r2(fig.dims[dim.id])}" step="any" min="0.001" max="179.999" onchange="updateDim('${dim.id}',this.value)">`;
      } else {
        // Se indica siempre la unidad activa junto a la magnitud
        d.innerHTML=`<label>${dim.label} <span style="color:var(--grn2);font-weight:800">(${unit})</span></label>`
          +`<input type="number" id="dim-${dim.id}" value="${fig.dims[dim.id]}" step="any" min="0.001" onchange="updateDim('${dim.id}',this.value)">`;
      }
      row.appendChild(d);
    }
    df.appendChild(row);
  }

  // Sector: live helper showing the complementary angle for clarity.
  if(isSector){
    const help = document.createElement('div');
    help.style.cssText = 'font-size:9px;color:var(--muted);margin:2px 0 4px;line-height:1.4;';
    const semi = r2(fig.dims.alpha), tot = r2(fig.dims.alpha*2);
    help.innerHTML = `θ = ${semi}° (semiángulo) &nbsp;·&nbsp; 2θ = ${tot}° (ángulo total). Las fórmulas usan θ en radianes.`;
    df.appendChild(help);
  }

  // Posición: la del ANCLA ACTIVA, no la del centroide. Escribiendo aquí cx y
  // cy, al reabrir la ventana el campo volvía a dar la posición del centroide
  // aunque el alumno hubiera elegido otro punto de anclaje (2026-09-23).
  document.getElementById('rotation').value = r2(fig.rotation);
  updatePropPanel();

  // Anchors
  const ab = document.getElementById('anchorBtns');
  ab.innerHTML = '';
  for(const a of (def.anchors||['C'])){
    const btn=document.createElement('button');
    const isAct=a===(fig.activeAnchor||'C');
    btn.className='anchor-btn'+(isAct?' active':'');
    btn.style.fontWeight=isAct?'700':'500';
    // La misma clave de ancla se llama distinto según la figura (03-), y cada
    // una lleva el color con el que se dibuja en la ficha (2026-09-23).
    const col = (typeof colorAncla === 'function') ? colorAncla(a) : null;
    const nom = etiquetaAnclaje(fig.type, a);
    btn.innerHTML = (col ? '<span class="anc-dot" style="background:' + col + '"></span>' : '')
                  + nom.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    btn.onclick=()=>{fig.activeAnchor=a;fig.anchor=a;buildPropPanel(fig);updatePropPanel();render();};
    ab.appendChild(btn);
  }
  // Update pos label
  const pl=document.getElementById('posLabel');
  if(pl){const aa=fig.activeAnchor||'C'; pl.textContent = etiquetaPosicion(fig.type, aa);}
}

// Un DESPLAZAMIENTO puede valer cero o ser negativo: el trapecio y el triángulo
// se inclinan hacia el otro lado. Un TAMAÑO, no: con una medida negativa el área
// sale negativa y el centroide deja de significar nada, y nada lo avisaba (el
// min del HTML es solo una pista, el valor escrito llega igual aqui). Ojo: `d`
// es desplazamiento en el triángulo, pero es el canto de un perfil W o C.
const DIM_DESPLAZ = {trapecio:{dx:true}, triangulo:{d:true}};

// ── El punto de anclaje se queda donde está ────────────────────────────────
// Al cambiar una medida se mantenía fijo el CENTROIDE, así que el punto de
// anclaje que el alumno había colocado se desplazaba solo y el campo de
// posición seguía enseñando el valor viejo. Ahora se mantiene fija el ANCLA
// ACTIVA, como en el modo 3D de centroide (2026-09-23).
function anclaMundo(fig){
  const def = FIG_DEFS[fig.type], a = fig.activeAnchor || 'C';
  const off = def.anchorOffset(fig.dims, a), r = (fig.rotation||0)*Math.PI/180;
  return {x: fig.cx + off.dx*Math.cos(r) - off.dy*Math.sin(r),
          y: fig.cy + off.dx*Math.sin(r) + off.dy*Math.cos(r)};
}
function recolocarPorAnclaFig(fig, cambio){
  const antes = anclaMundo(fig);
  cambio(fig);
  const def = FIG_DEFS[fig.type], a = fig.activeAnchor || 'C';
  const off = def.anchorOffset(fig.dims, a), r = (fig.rotation||0)*Math.PI/180;
  fig.cx = antes.x - (off.dx*Math.cos(r) - off.dy*Math.sin(r));
  fig.cy = antes.y - (off.dx*Math.sin(r) + off.dy*Math.cos(r));
}
function updateDim(dimId, val){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  const v = parseFloat(val);
  const esAng = !!ANGLE_DIMS[dimId];
  const esDesp = !!(DIM_DESPLAZ[fig.type] && DIM_DESPLAZ[fig.type][dimId]);
  if(!isFinite(v) || (esAng && (v <= 0 || v >= 180)) || (!esAng && !esDesp && v < 0)){
    aviso(esAng ? 'El ángulo tiene que estar entre 0 y 180 grados.'
                : 'Una medida no puede ser negativa.', 'error');
    const inp = document.getElementById('dim-' + dimId);
    if(inp) inp.value = fig.dims[dimId];
    return;
  }
  registrarCambio();
  recolocarPorAnclaFig(fig, f=>{ f.dims[dimId] = v; });
  updatePropPanel();                 // la posición, al día en el acto
  invalidarResultados(); render();
}

// Sector angle input: keeps fig.dims.alpha as the half-angle (θ) regardless of mode.
function updateSectorAngle(val, isTotal){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  registrarCambio();
  const v = parseFloat(val)||0;
  recolocarPorAnclaFig(fig, f=>{ f.dims.alpha = isTotal ? v/2 : v; });
  buildPropPanel(fig);   // refresh helper line + complementary value
  updatePropPanel();
  invalidarResultados(); render();
}
function setSectorAngleMode(mode){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  fig.angleMode = mode;
  buildPropPanel(fig);
}

function updateFigFromProp(){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  // Aquí el 0 SÍ es un valor válido, así que no vale `parseFloat(...)||0`:
  // con eso, un campo con texto que no es un número mandaba la figura al
  // origen y le quitaba el giro, sin decir nada. Se descarta solo lo que no
  // es un número, y el panel repone los valores de la figura.
  const newX = parseFloat(document.getElementById('posX').value);
  const newY = parseFloat(document.getElementById('posY').value);
  const newRot = parseFloat(document.getElementById('rotation').value);
  if(!isFinite(newX) || !isFinite(newY) || !isFinite(newRot)){
    aviso('La posición y el giro tienen que ser números.', 'error');
    buildPropPanel(fig);
    return;
  }
  registrarCambio();
  fig.rotation = newRot;
  const aa = fig.activeAnchor||'C';
  if(aa==='C'){fig.cx=newX;fig.cy=newY;}
  else{
    const def=FIG_DEFS[fig.type];const off=def.anchorOffset(fig.dims,aa);
    const rot=newRot*Math.PI/180;
    fig.cx = newX-(off.dx*Math.cos(rot)-off.dy*Math.sin(rot));
    fig.cy = newY-(off.dx*Math.sin(rot)+off.dy*Math.cos(rot));
  }
  invalidarResultados(); render();
}

function updatePropPanel(){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  const aa = fig.activeAnchor||'C';
  if(aa==='C'){
    document.getElementById('posX').value=r2(fig.cx);
    document.getElementById('posY').value=r2(fig.cy);
  } else {
    const def=FIG_DEFS[fig.type];const off=def.anchorOffset(fig.dims,aa);
    const rot=(fig.rotation||0)*Math.PI/180;
    document.getElementById('posX').value=r2(fig.cx+off.dx*Math.cos(rot)-off.dy*Math.sin(rot));
    document.getElementById('posY').value=r2(fig.cy+off.dx*Math.sin(rot)+off.dy*Math.cos(rot));
  }
  document.getElementById('rotation').value=r2(fig.rotation||0);
}

function setSign(s){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig || fig.sign === s) return;
  registrarCambio();
  fig.sign=s;
  document.getElementById('signPos').classList.toggle('active',s===1);
  document.getElementById('signNeg').classList.toggle('active',s===-1);
  renderFigList(); invalidarResultados(); render();
}
