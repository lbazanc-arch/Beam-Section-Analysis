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
    btn.textContent = a==='C' ? 'G — Centroide' :
      a==='BM' ? '⊥ Centro base (diámetro)' :
      (ANCHOR_LABELS[a]||a);
    btn.onclick=()=>{fig.activeAnchor=a;fig.anchor=a;buildPropPanel(fig);updatePropPanel();render();};
    ab.appendChild(btn);
  }
  // Update pos label
  const pl=document.getElementById('posLabel');
  if(pl){const aa=fig.activeAnchor||'C';pl.textContent = aa==='C' ? 'Posición del Centroide (G)' :
      aa==='BM' ? 'Posición: Centro del diámetro (base plana)' :
      'Posición: '+(ANCHOR_LABELS[aa]||aa);}
}

function updateDim(dimId, val){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  registrarCambio();
  fig.dims[dimId] = parseFloat(val)||0;
  results=null; render();
}

// Sector angle input: keeps fig.dims.alpha as the half-angle (θ) regardless of mode.
function updateSectorAngle(val, isTotal){
  const fig = figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  registrarCambio();
  const v = parseFloat(val)||0;
  fig.dims.alpha = isTotal ? v/2 : v;
  buildPropPanel(fig);   // refresh helper line + complementary value
  results=null; render();
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
  results=null; render();
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
  if(!fig) return;
  registrarCambio();
  fig.sign=s;
  document.getElementById('signPos').classList.toggle('active',s===1);
  document.getElementById('signNeg').classList.toggle('active',s===-1);
  renderFigList(); results=null; render();
}
