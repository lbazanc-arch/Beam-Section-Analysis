// ═══════════════════════════════════════════════════════════
//  TRANSFORMAR Y REPLICAR  (portado del Cap. 9)
// ═══════════════════════════════════════════════════════════
// Modo activo del cuadro Transformar: 'mover' o 'girar'. Es estado del módulo,
// no una función, así que no venía con el resto del bloque portado.
let transModo = 'mover';
function abrirTransformar(){
  if(!selFiguras.length){
    aviso('Marca al menos una figura con la herramienta Mover / editar para transformarla.');
    return;
  }
  const sel = document.getElementById('transRef');
  const opciones = ['<option value="origen">Origen (0 ; 0)</option>'];
  selFiguras.forEach(id=>{
    const f = figures.find(z=>z.id===id);
    if(f) opciones.push('<option value="fig:'+f.id+'">Centro de '+esc(f.name)
      + (f.etiqueta ? ' ' + esc(f.etiqueta) : '')
      + '  ('+decP(f.cx,'len')+' ; '+decP(f.cy,'len')+')</option>');
  });
  opciones.push('<option value="libre">Coordenada a elegir…</option>');
  sel.innerHTML = opciones.join('');
  document.getElementById('transSub').textContent =
    'Se transformarán ' + selFiguras.length + ' figura(s). Al girar, la referencia '
    + 'queda fija y es el centro de rotación; al mover, toda la selección se desplaza por igual.';
  cambiarRefTrans();
  setTransModo('mover');
  document.getElementById('transModal').classList.add('show');
}

function closeTransformar(){ document.getElementById('transModal').classList.remove('show'); }

function cambiarRefTrans(){
  const v = document.getElementById('transRef').value;
  document.getElementById('transCampoRef').style.display = (v==='libre') ? 'block' : 'none';
  actualizarPrevTrans();
}

function setTransModo(m){
  transModo = m;
  document.getElementById('transCampoMover').style.display = (m==='mover') ? 'block' : 'none';
  document.getElementById('transCampoGirar').style.display = (m==='girar') ? 'block' : 'none';
  const a = document.getElementById('transTabMover'), b = document.getElementById('transTabGirar');
  if(a) a.classList.toggle('active', m==='mover');
  if(b) b.classList.toggle('active', m==='girar');
  actualizarPrevTrans();
}

function refTransformar(){
  const v = document.getElementById('transRef').value;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  if(v === 'origen') return {x:0, y:0, nombre:'el origen'};
  if(v === 'libre')  return {x:num('transRx'), y:num('transRy'), nombre:'la coordenada indicada'};
  const id = parseInt(String(v).split(':')[1]);
  const f = figures.find(z=>z.id===id);
  if(!f) return null;
  return {x:f.cx, y:f.cy, nombre:'el centro de ' + f.name};
}

function calcularTransformacion(){
  const ref = refTransformar();
  if(!ref) return null;
  const num = id => { const e=document.getElementById(id); const n=parseFloat(e && e.value); return isFinite(n)?n:0; };
  const destinos = [];
  if(transModo === 'mover'){
    const dx = num('transDx'), dy = num('transDy');
    selFiguras.forEach(id=>{
      const f = figures.find(z=>z.id===id); if(!f) return;
      // En un desplazamiento se mueve TODA la selección por igual: la
      // referencia solo queda fija cuando se gira.
      destinos.push({id, cx:f.cx+dx, cy:f.cy+dy, rotation:f.rotation});
    });
    return {ref, destinos, dx, dy};
  }
  const grados = num('transAng');
  const ang = grados*Math.PI/180;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  selFiguras.forEach(id=>{
    const f = figures.find(z=>z.id===id); if(!f) return;
    // Rotación 2D estándar del centro alrededor de la referencia, más el mismo
    // giro aplicado a la orientación propia de la figura: el conjunto se mueve
    // como un sólido rígido.
    const ux = f.cx - ref.x, uy = f.cy - ref.y;
    destinos.push({id,
      cx: ref.x + ux*cs - uy*sn,
      cy: ref.y + ux*sn + uy*cs,
      rotation: f.rotation + grados});
  });
  return {ref, destinos, ang:grados};
}

function actualizarPrevTrans(){
  const p = document.getElementById('transPrev');
  if(!p) return;
  const t = calcularTransformacion();
  if(!t){ p.textContent = 'Elige una referencia válida.'; return; }
  if(transModo === 'mover'){
    p.textContent = 'Las ' + t.destinos.length + ' figura(s) se desplazan ('
      + decP(t.dx,'len') + ' ; ' + decP(t.dy,'len') + ') ' + unit
      + ', midiendo desde ' + t.ref.nombre + '.';
  } else {
    p.textContent = 'Las ' + t.destinos.length + ' figura(s) giran ' + t.ang
      + '° alrededor de ' + t.ref.nombre + ' (' + decP(t.ref.x,'len') + ' ; '
      + decP(t.ref.y,'len') + ') ' + unit + ', arrastrando su propia orientación.';
  }
}

function applyTransformar(){
  const t = calcularTransformacion();
  if(!t){ aviso('Elige una referencia válida.', 'error'); return; }
  if(transModo === 'mover' && t.dx === 0 && t.dy === 0){
    aviso('Indica un desplazamiento en x o en y.'); return;
  }
  if(transModo === 'girar' && t.ang === 0){
    aviso('Indica un ángulo de giro distinto de cero.'); return;
  }
  registrarCambio();   // un solo paso de deshacer para todo el lote
  // El giro NUNCA se engancha a la rejilla: redondear cada centro alteraría
  // las distancias entre figuras y deformaría la sección. En cap6 esto llegó a
  // cambiar una barra de 6 a 6.10 en un giro de 37°.
  t.destinos.forEach(d=>{
    const f = figures.find(z=>z.id===d.id);
    if(!f) return;
    f.cx = d.cx; f.cy = d.cy; f.rotation = d.rotation;
  });
  results = null;
  closeTransformar();
  updatePropPanel(); renderFigList(); actualizarInfoSel(); render();
}

function actualizarPrevRep(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  const base = figures.find(f=>f.id===selFiguras[0]);
  const el = document.getElementById('repPrev');
  if(!el || !base) return;
  let t = 'Desde (' + decP(base.cx,'len') + ' ; ' + decP(base.cy,'len') + ') ' + unit + ' → ';
  const p = [];
  for(let i=1;i<=Math.min(nrep,3);i++)
    p.push('(' + decP(base.cx+dx*i,'len') + ' ; ' + decP(base.cy+dy*i,'len') + ')');
  el.innerHTML = t + p.join(', ') + (nrep>3 ? ' …' : '');
}

function abrirReplicar(){
  if(!selFiguras.length){
    aviso('Elige la herramienta Mover / editar y marca al menos una figura para replicar.');
    return;
  }
  document.getElementById('repSub').textContent =
    'Se replicarán ' + selFiguras.length + ' figura(s), desplazándolas la distancia indicada tantas veces como pidas.';
  actualizarPrevRep();
  document.getElementById('repModal').classList.add('show');
}

function closeReplicar(){ document.getElementById('repModal').classList.remove('show'); }

function applyReplicar(){
  const g = id => parseFloat(document.getElementById(id).value) || 0;
  const dx = g('repDx'), dy = g('repDy');
  const nrep = Math.max(1, Math.min(50, parseInt(document.getElementById('repN').value) || 1));
  if(dx === 0 && dy === 0){ aviso('Indica un desplazamiento en x o en y.'); return; }
  registrarCambio();
  const orig = selFiguras.slice();
  const nuevas = [];
  for(let i=1;i<=nrep;i++){
    orig.forEach(id=>{
      const o = figures.find(z=>z.id===id);
      if(!o) return;
      const nf = Object.assign({}, o, {dims:Object.assign({},o.dims)});
      nf.id = ++figIdCounter;
      nf.cx = o.cx + dx*i;
      nf.cy = o.cy + dy*i;
      figures.push(nf);
      nuevas.push(nf.id);
    });
  }
  results = null;
  selFiguras = nuevas;
  selectFigure(nuevas.length ? nuevas[nuevas.length-1] : null);
  closeReplicar(); renderFigList(); actualizarInfoSel(); render();
}

function actualizarInfoSel(){
  const el = document.getElementById('tbSelInfo');
  if(el) el.textContent = selFiguras.length
    ? ('Seleccionadas: '+selFiguras.length+' figura'+(selFiguras.length>1?'s':''))
    : 'Nada seleccionado';
}
