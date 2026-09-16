// ═══════════════════════════════════════════════════════════
//  PROPERTIES PANEL
// ═══════════════════════════════════════════════════════════
// ── Rótulo de cada ancla ──
// ANCHOR_LABELS (02-) da el nombre genérico; unas pocas figuras nombran el mismo
// punto de otra manera (el O de la enjuta no es un ángulo recto, sino el vértice
// donde la parábola es tangente a la base), y aquí se dice como lo dice la clase.
// La MISMA clave significa cosas distintas según la figura: E1 es el extremo del
// semieje en la elipse y el final de la cuerda en el segmento circular, y BM es
// el centro del diámetro en el semicírculo y el medio del lado inferior en un
// polígono regular. Por eso cada tipo puede dar aquí su propio nombre.
const ANCLA_TEXTO = {
  semicircle:   {BM:'⊥ Centro base (diámetro)'},
  parabola:     {BM:'⊥ Centro de la base', V:'Vértice (cima)'},
  semiparabola: {O:'Origen (90°)', BR:'Fin de la base', V:'Vértice (cima)'},
  enjuta:       {O:'Vértice O (tangente)'},
  cuartoelipse: {O:'Origen (90°)', E1:'Ext. semieje a', E2:'Ext. semieje b'},
  elipse:       {E1:'Ext. semieje a', E2:'Ext. semieje b'},
  semielipse:   {BM:'⊥ Centro de la base plana', BL:'Base izq.', BR:'Base der.'},
  segmento:     {M:'⊥ Medio de la cuerda', E1:'Ext. izq. de la cuerda',
                 E2:'Ext. der. de la cuerda', V:'Cima del arco'},
  trapecio:     {BL:'Base mayor izq.', BR:'Base mayor der.',
                 TL:'Base menor izq.', TR:'Base menor der.'},
  triangulo:    {BL:'Base izq.', BR:'Base der.', V:'Vértice opuesto'},
  hexagono:     {E1:'Vértice derecho', BM:'Medio del lado inferior'},
  octogono:     {E1:'Vértice sup. derecho', BM:'Medio del lado inferior'}
};
function textoAncla(tipo, a){
  const m = ANCLA_TEXTO[tipo];
  return (m && m[a]) || ANCHOR_LABELS[a] || a;
}
function buildPropPanel(fig){
  if(fig && fig.es3d) return buildPropPanel3d(fig);     // 21-vistas-3d.js
  const def = FIG_DEFS[fig.type];
  document.getElementById('propTitle').textContent = fig.name;

  // Sign
  document.getElementById('signPos').classList.toggle('active', fig.sign===1);
  document.getElementById('signNeg').classList.toggle('active', fig.sign===-1);

  // Dimension fields — with reference figure at top
  const df = document.getElementById('dimFields');
  df.innerHTML = getRefFigHTML(fig.type);

  // Material: solo aplica a cuerpos heterogéneos
  if(modoCuerpo==='heterogeneo'){
    const box=document.createElement('div');
    box.className='field';
    const opts = MATS.map(m=>{
      const sel = (fig.matId===m.id)?' selected':'';
      return `<option value="${m.id}"${sel}>${matSimbolo()}${m.id} = ${decFix(m.val,'len')} ${m.unidad||''}</option>`;
    }).join('');
    box.innerHTML='<label>'+(matMagnitud==='densidad'?'Densidad':'Peso específico')
      +' <span style="color:var(--grn2);font-weight:800">('+matSimbolo()+')</span></label>'
      +'<select id="fig-mat" onchange="asignarMaterial(this.value)" style="width:100%;background:var(--bg);'
      +'border:1px solid var(--border2);color:var(--text);padding:8px 9px;border-radius:7px;'
      +'font-size:12px;font-family:inherit;">'
      +'<option value="">— Sin asignar —</option>'+opts+'</select>'
      + (MATS.length ? '' : '<div style="font-size:9.5px;color:#c0392b;margin-top:5px;line-height:1.45;">'
          +'Primero define los valores en el panel de la izquierda.</div>');
    df.appendChild(box);

    // Espesor perpendicular al plano XY: solo afecta el peso (W = γ·A·t),
    // no la posición del centroide. Por defecto t = 1.
    const boxT = document.createElement('div');
    boxT.className = 'field';
    boxT.innerHTML = '<label>Espesor <span style="color:var(--grn2);font-weight:800">('+unit+')</span> '
      + '<span style="color:var(--muted);font-weight:400">— perpendicular al plano XY</span></label>'
      + '<input type="number" id="fig-thickness" value="'+(fig.thickness||1)+'" step="any" min="0.001" '
      + 'onchange="updateThickness(this.value)">';
    df.appendChild(boxT);
  }

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
      } else {
        // Se indica siempre la unidad activa junto a la magnitud, SALVO en los
        // ángulos (θ del segmento, φ del arco de alambre): van en grados, no en
        // la unidad de longitud, y su propia etiqueta ya lo dice.
        const esAng = (typeof ANGLE_DIMS !== 'undefined') && ANGLE_DIMS[dim.id];
        d.innerHTML=`<label>${dim.label}${esAng?'':` <span style="color:var(--grn2);font-weight:800">(${unit})</span>`}</label>`
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

  // Position
  document.getElementById('posX').value = r2(fig.cx);
  document.getElementById('posY').value = r2(fig.cy);
  document.getElementById('rotation').value = r2(fig.rotation);

  // Anchors
  const ab = document.getElementById('anchorBtns');
  ab.innerHTML = '';
  for(const a of (def.anchors||['C'])){
    const btn=document.createElement('button');
    const isAct=a===(fig.activeAnchor||'C');
    btn.className='anchor-btn'+(isAct?' active':'');
    btn.style.fontWeight=isAct?'700':'500';
    btn.textContent = a==='C' ? 'G — Centroide' : textoAncla(fig.type, a);
    btn.onclick=()=>{fig.activeAnchor=a;fig.anchor=a;buildPropPanel(fig);updatePropPanel();render();};
    ab.appendChild(btn);
  }
  // Update pos label
  const pl=document.getElementById('posLabel');
  if(pl){const aa=fig.activeAnchor||'C';pl.textContent = aa==='C' ? 'Posición del Centroide (G)' :
      'Posición: '+textoAncla(fig.type, aa).replace(/^⊥ /,'');}
}

// Un DESPLAZAMIENTO puede valer cero o ser negativo: el trapecio y el triángulo
// se inclinan hacia el otro lado. Un TAMAÑO, no: con una medida negativa el área
// sale negativa y el centroide deja de significar nada, y nada lo avisaba (el
// min del HTML es solo una pista, el valor escrito llega igual aqui). Ojo: `d`
// es desplazamiento en el triángulo, pero es el canto de un perfil W o C.
const DIM_DESPLAZ = {trapecio:{dx:true}, triangulo:{d:true}};
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
  fig.dims[dimId] = v;
  invalidarResultados(); render();
}

// Sector angle input: keeps fig.dims.alpha as the half-angle (θ) regardless of mode.
function updateSectorAngle(val, isTotal){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  registrarCambio();
  const v = parseFloat(val)||0;
  fig.dims.alpha = isTotal ? v/2 : v;
  buildPropPanel(fig);   // refresh helper line + complementary value
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
  if(fig.es3d) return updateFigFromProp3d();            // 21-vistas-3d.js
  registrarCambio();
  const newX = parseFloat(document.getElementById('posX').value)||0;
  const newY = parseFloat(document.getElementById('posY').value)||0;
  const newRot = parseFloat(document.getElementById('rotation').value)||0;
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
  if(fig.es3d) return updatePropPanel3d();              // 21-vistas-3d.js
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
  if(!fig) return;
  registrarCambio();
  fig.sign=s;
  document.getElementById('signPos').classList.toggle('active',s===1);
  document.getElementById('signNeg').classList.toggle('active',s===-1);
  renderFigList(); invalidarResultados(); render();
}
