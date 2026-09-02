// ═══════════════════════════════════════════════════════════
//  PALETA DE FIGURAS · TIPO DE CUERPO · MATERIALES
// ═══════════════════════════════════════════════════════════

// Alterna entre las dos familias de figuras de la paleta horizontal
// ── Panel deslizante en móvil ──


// Tras elegir una figura en móvil, el cajón se cierra solo para poder dibujar
function cerrarPanelSiMovil(){
  // Antes llamaba a cerrarPanel(), que se eliminó con el cajón móvil antiguo:
  // la referencia rota lanzaba ReferenceError y abortaba selectFigType(),
  // por lo que en pantallas <=820px no se podía insertar ninguna figura.
  if(window.innerWidth<=820) setTimeout(()=>{ try{ cerrarSeccion(); }catch(e){} }, 180);
}

// La paleta muestra 6 figuras (cuadrícula de 3 columnas, 2 filas) y esconde
// el resto tras "Ver más". Antes eran dos pestañas con desplazamiento
// horizontal, donde no había ninguna pista de que hubiera más figuras.
const PAL_VISIBLES = 6;
function alternarVerMas(){
  const grid = document.getElementById('palGrid');
  const btn  = document.getElementById('palMas');
  const txt  = document.getElementById('palMasTxt');
  if(!grid || !btn) return;
  const abriendo = !btn.classList.contains('abierto');
  const todos = grid.querySelectorAll('.fig-btn');
  todos.forEach((b,i)=>{ b.classList.toggle('oculta', !abriendo && i >= PAL_VISIBLES); });
  btn.classList.toggle('abierto', abriendo);
  if(txt) txt.textContent = abriendo ? 'Ver menos' : 'Ver más';
}

// Si la figura elegida estaba entre las escondidas, se despliega la paleta
// para que el botón marcado quede a la vista.
function asegurarFiguraVisible(tipo){
  const b = document.getElementById('figbtn-' + tipo);
  const btn = document.getElementById('palMas');
  if(b && b.classList.contains('oculta') && btn && !btn.classList.contains('abierto')){
    alternarVerMas();
  }
}

// ── Materiales que define el estudiante ──
function setMagnitud(m){
  matMagnitud=m;
  MATS.forEach(x=>{ x.unidad = uGamma(); });
  const a=document.getElementById('mag-peso'), b=document.getElementById('mag-dens');
  if(a) a.classList.toggle('active', m==='peso');
  if(b) b.classList.toggle('active', m==='densidad');
  renderMats();
  if(selectedFigId){ const fg=figures.find(f=>f.id===selectedFigId); if(fg) buildPropPanel(fg); }
  if(results) calculate();
  render();
}
function addMaterial(){
  const v=parseFloat((document.getElementById('mat-val')||{}).value);
  const u=uGamma();     // la unidad viene del sistema elegido, no se escribe
  const msg=document.getElementById('mat-msg');
  if(!isFinite(v)||v<=0){ if(msg){msg.style.color='#c0392b';msg.textContent='Escribe un valor mayor que cero.';} return; }
  MATS.push({id:++matSeq, val:v, unidad:u});
  const inp=document.getElementById('mat-val'); if(inp){ inp.value=''; inp.focus(); }
  if(msg){ msg.style.color='var(--muted)'; msg.textContent=''; }
  renderMats();
  if(selectedFigId){ const fg=figures.find(f=>f.id===selectedFigId); if(fg) buildPropPanel(fg); }
}
function delMaterial(id){
  const usados=figures.filter(f=>f.matId===id).length;
  if(usados && !confirm('Hay '+usados+' figura(s) usando '+matSimbolo()+id+'.\nSi lo eliminas, quedarán sin material asignado. ¿Continuar?')) return;
  MATS=MATS.filter(m=>m.id!==id);
  figures.forEach(f=>{ if(f.matId===id) f.matId=null; });
  renderMats();
  if(selectedFigId){ const fg=figures.find(f=>f.id===selectedFigId); if(fg) buildPropPanel(fg); }
  if(results) calculate();
  render();
}
function renderMats(){
  const lbl=document.getElementById('mat-uni-lbl'); if(lbl) lbl.textContent=uGamma();
  const box=document.getElementById('matLista'); if(!box) return;
  if(!MATS.length){
    box.innerHTML='<div style="font-size:9px;color:var(--muted);line-height:1.45;padding:2px 0 4px;">'
      +'Define los '+(matMagnitud==='densidad'?'valores de densidad':'pesos específicos')
      +' que usarás y luego asígnalos a cada figura.</div>';
    return;
  }
  box.innerHTML=MATS.map(m=>
    '<div class="mat-item">'
    +'<span class="mat-sym">'+matSimbolo()+m.id+'</span>'
    +'<span class="mat-val">= '+decFix(m.val,'len')+' '+esc(m.unidad||'')+'</span>'
    +'<button class="mat-x" onclick="delMaterial('+m.id+')" title="Eliminar">×</button>'
    +'</div>').join('');
}
function asignarMaterial(v){
  const fig=figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  registrarCambio();
  fig.matId = v ? Number(v) : null;
  if(results) calculate();
  render();
}
function updateThickness(v){
  const fig=figures.find(f=>f.id===selectedFigId);
  if(!fig) return;
  registrarCambio();
  fig.thickness = parseFloat(v)||1;
  if(results) calculate();
  render();
}

// ── Homogéneo / heterogéneo ──
function setModoCuerpo(m){
  modoCuerpo=m;
  const h=document.getElementById('modo-homo'), e=document.getElementById('modo-het');
  if(h) h.classList.toggle('active', m==='homogeneo');
  if(e) e.classList.toggle('active', m==='heterogeneo');
  const hint=document.getElementById('modo-hint');
  if(hint) hint.textContent = m==='heterogeneo'
    ? 'Cada figura lleva su propio material: G se separa del centroide.'
    : 'Un solo material: G coincide con el centroide.';
  const mp=document.getElementById('matPanel');
  if(mp) mp.style.display = (m==='heterogeneo') ? 'block' : 'none';
  if(m==='heterogeneo'){
    if(!MATS.length){
      // dos valores de arranque, para que el alumno los edite
      MATS=[{id:++matSeq, val:50, unidad:uGamma()},{id:++matSeq, val:45, unidad:uGamma()}];
    }
    // las figuras ya dibujadas toman el primer material, y el alumno lo cambia
    figures.forEach(f=>{ if(!f.matId) f.matId=MATS[0].id; });
  }
  renderMats();
  if(selectedFigId){ const fg=figures.find(f=>f.id===selectedFigId); if(fg) buildPropPanel(fg); }
  if(results) calculate();
  render();
}

function setUnit(u){
  unit=u; unitLabel=u;
  const tag=document.getElementById('unitTag'); if(tag) tag.textContent=u;
}

// Cambia de unidad CONVIRTIENDO todas las medidas y posiciones,
// de modo que la sección física permanece idéntica.
function convertUnits(newU){
  const oldU = unit;
  // Antes se salía aquí si la longitud no cambiaba, así que un cambio de SOLO
  // la fuerza no volvía a dibujar ni a recalcular: los resultados quedaban
  // con el número viejo bajo la etiqueta nueva. Ahora la función siempre
  // termina refrescando; el bucle de geometría solo se salta si de verdad
  // no hay nada que reescalar.
  if(newU!==oldU){
    const k = LEN_FAC_I[oldU]/LEN_FAC_I[newU];   // valor_nuevo = valor_viejo * k
    for(const fig of figures){
      if(fig.cx!==undefined) fig.cx = +(fig.cx*k).toFixed(9);
      if(fig.cy!==undefined) fig.cy = +(fig.cy*k).toFixed(9);
      if(fig.dims){
        for(const key in fig.dims){
          if(ANGLE_DIMS[key]) continue;                 // los ángulos no se convierten
          const v = fig.dims[key];
          if(typeof v==='number' && isFinite(v)) fig.dims[key] = +(v*k).toFixed(9);
        }
      }
    }
    if(extraPoint){
      extraPoint.x = +(extraPoint.x*k).toFixed(9);
      extraPoint.y = +(extraPoint.y*k).toFixed(9);
    }
    setUnit(newU);
  }
  if(typeof renderFigList==='function') renderFigList();
  try{ const fg=figures.find(f=>f.id===selectedFigId); if(fg) buildPropPanel(fg); }catch(e){}
  render();
  if(results && typeof calculate==='function'){ try{ calculate(); }catch(e){} }
}

function openUnitsModal(){
  const s=document.getElementById('selUnit'); if(s) s.value=unit;
  const sf=document.getElementById('selForce'); if(sf) sf.value=unitForce;
  updateUnitsPreview();
  document.getElementById('unitsModal').classList.add('show');
}
function closeUnitsModal(){ document.getElementById('unitsModal').classList.remove('show'); }
function updateUnitsPreview(){
  const u=document.getElementById('selUnit').value;
  const F=(document.getElementById('selForce')||{}).value||unitForce;
  const a=document.getElementById('uaPrev'); if(a) a.textContent=u+'\u00B2';
  const g=document.getElementById('ugPrev');
  if(g) g.textContent = (matMagnitud==='densidad') ? ('kg/'+u+'\u00B3') : (F+'/'+u+'\u00B3');
  const w=document.getElementById('uwPrev'); if(w) w.textContent=F;
}
function applyUnitsModal(){
  // BUG corregido: antes solo se le cambiaba la ETIQUETA de texto al peso
  // específico / densidad de cada material (m.unidad), pero el NÚMERO
  // (m.val) se quedaba igual. Un γ de 24 kN/m³ pasaba a decir "24 kN/cm³",
  // que ya no es el mismo material. Ahora se recalcula con las tres
  // magnitudes de las que depende γ = fuerza/longitud³ (y ρ = masa/longitud³,
  // con la masa fija en kg): longitud actual, longitud nueva y fuerza.
  const oldLen = unit, oldForce = unitForce;
  const newLen = document.getElementById('selUnit').value;
  const newForce = (document.getElementById('selForce')||{}).value || unitForce;

  const k  = LEN_FAC_I[oldLen]/LEN_FAC_I[newLen];      // longitud: nuevo = viejo*k
  const kF = FOR_A_KN[oldForce]/FOR_A_KN[newForce];    // fuerza:   nuevo = viejo*kF

  MATS.forEach(m=>{
    // γ = fuerza/longitud³  →  factor = kF / k³
    // ρ = masa/longitud³ (masa fija en kg)  →  factor = 1 / k³
    const factor = (matMagnitud==='densidad') ? (1/(k*k*k)) : (kF/(k*k*k));
    m.val = +(m.val*factor).toPrecision(10);
  });

  unitForce = newForce;
  convertUnits(newLen);
  MATS.forEach(m=>{ m.unidad = uGamma(); });
  renderMats();
  closeUnitsModal();
}

// ── DECIMALES ──
// Cantidad de decimales por magnitud, configurable por el usuario.
function decFix(v, kind){
  const d = DEC[kind]!==undefined ? DEC[kind] : 2;
  if(typeof v!=='number' || !isFinite(v)) return v;
  return parseFloat(v.toFixed(d));
}
function decTagText(){ return '0.'+'0'.repeat(DEC.len); }
function syncDecTag(){ const e=document.getElementById('decTag'); if(e) e.textContent=decTagText(); }
function fillDecSelect(id, val){
  const s=document.getElementById(id); if(!s) return;
  s.innerHTML='';
  for(let d=1; d<=4; d++){
    const o=document.createElement('option');
    o.value=String(d); o.textContent='0.'+'0'.repeat(d)+'  ('+d+' decimal'+(d>1?'es':'')+')';
    if(d===val) o.selected=true;
    s.appendChild(o);
  }
}
function openDecModal(){
  fillDecSelect('selDecLen',DEC.len);
  fillDecSelect('selDecArea',DEC.area);
  updateDecPreview();
  document.getElementById('decModal').classList.add('show');
}
function closeDecModal(){ document.getElementById('decModal').classList.remove('show'); }
function updateDecPreview(){
  const g=id=>{const e=document.getElementById(id); return e?(parseInt(e.value,10)||2):2;};
  const dl=g('selDecLen'), dar=g('selDecArea');
  const eL=document.getElementById('dpL');  if(eL)  eL.textContent=(12.3456789).toFixed(dl)+' '+unit;
  const eA=document.getElementById('dpAr'); if(eA)  eA.textContent=(48123.987654).toFixed(dar)+' '+unit+'\u00B2';
}
function applyDecModal(){
  const g=id=>{const e=document.getElementById(id); return e?(parseInt(e.value,10)||2):2;};
  DEC={len:g('selDecLen'), area:g('selDecArea')};
  syncDecTag(); closeDecModal();
  render();
  if(results) renderResults(results, currentU4, currentU2, currentU1);
}
function zoomIn(){ viewScale*=1.2; render(); }
function zoomOut(){ viewScale/=1.2; render(); }
// Color de fondo del lienzo (claro, coherente con el resto de la app)

// Bounding box REAL de la sección compuesta, en coordenadas de mundo.
// Usa def.bounds(dims) de cada figura y su rotación propia (las 4 esquinas
// de la caja local se rotan y luego se trasladan al centro fig.cx/fig.cy).
function figuresBBox(){
  if(!figures || !figures.length) return null;
  let x0=Infinity, y0=Infinity, x1=-Infinity, y1=-Infinity, found=false;
  for(const fig of figures){
    const def = FIG_DEFS[fig.type];
    if(!def || typeof def.bounds!=='function') continue;
    let b;
    try{ b = def.bounds(fig.dims); }catch(e){ continue; }
    if(!b) continue;
    const rot = (fig.rotation||0)*Math.PI/180;
    const cr=Math.cos(rot), sr=Math.sin(rot);
    const corners=[[b.left,b.bottom],[b.right,b.bottom],[b.right,b.top],[b.left,b.top]];
    for(const [lx,ly] of corners){
      const wx = (fig.cx||0) + lx*cr - ly*sr;
      const wy = (fig.cy||0) + lx*sr + ly*cr;
      if(!isFinite(wx)||!isFinite(wy)) continue;
      x0=Math.min(x0,wx); y0=Math.min(y0,wy);
      x1=Math.max(x1,wx); y1=Math.max(y1,wy);
      found=true;
    }
  }
  if(!found||!isFinite(x0)) return null;
  return {x0,y0,x1,y1};
}

// Encuadra y CENTRA la sección compuesta dentro del área visible
function fitView(){
  const cvEl = document.getElementById('mainCanvas');
  const area = document.getElementById('canvasArea');
  const W = (cvEl && cvEl.clientWidth)  || (area && area.clientWidth)  || 800;
  const H = (cvEl && cvEl.clientHeight) || (area && area.clientHeight) || 600;
  const bb = figuresBBox();
  if(!bb){ viewTx=W/2; viewTy=H/2; viewScale=1; render(); return; }
  const bw = bb.x1-bb.x0, bh = bb.y1-bb.y0;
  const mx = (bb.x0+bb.x1)/2, my = (bb.y0+bb.y1)/2;
  // Si la sección es degenerada (un punto), no intentar ajustar la escala
  if(!(bw>1e-9) && !(bh>1e-9)){
    viewTx = W/2 - mx*viewScale; viewTy = H/2 + my*viewScale; render(); return;
  }
  const MARGIN = 0.80;                                   // ~20% de aire alrededor
  const sW = bw>1e-9 ? (W*MARGIN)/bw : Infinity;
  const sH = bh>1e-9 ? (H*MARGIN)/bh : Infinity;
  let s = Math.min(sW, sH);
  if(!isFinite(s) || s<=0) s = 1;
  // Tope amplio: en cm o m una sección pequeña necesita mucha escala.
  // El caso degenerado (sección de tamaño nulo) ya se filtró arriba.
  s = Math.max(1e-4, Math.min(s, 20000));
  viewScale = s;
  viewTx = W/2 - mx*s;
  viewTy = H/2 + my*s;
  render();
}
function resetAll(){
  registrarCambio();
  figures=[]; selectedFigId=null; selectedFigType=null; results=null; colorIdx=0;
  extraPoint=null;
  selectFigure(null); renderFigList();
  document.getElementById('resultsPanel').style.display='none';
  render();
}
// Ejemplo de referencia del capítulo: silueta compuesta por 18 figuras, con
// giros y con dos figuras restadas. Sirve para ver de un vistazo el reparto de
// cotas, los ángulos y el efecto de las figuras negativas.
//
// OJO con el sector circular: fig.dims.alpha guarda SIEMPRE el SEMIÁNGULO θ.
// La tabla del enunciado da el ángulo TOTAL (2θ), así que se divide entre dos
// y se deja angleMode:'total' para que el panel lo muestre como se pidió.
function loadExampleSection(){
  resetAll();
  const DATOS = [
    // tipo,          dims,               cx,       cy,      rot,   signo
    ['rect',        {b:220,   h:352.15},  110,      176.07,     0,  +1],
    ['rect',        {b:140,   h:160.39},  110,      432.35,     0,  +1],
    ['rect',        {b:120,   h:75},      290.07,   279.85,   -24,  +1],
    ['rect',        {b:120,   h:75},      -70.07,   279.85,    24,  +1],
    ['rect',        {b:75,    h:160},     397.66,   369.49,     0,  +1],
    ['rect',        {b:75,    h:160},     -106.64,  132.71,    27,  +1],
    ['rtriangle',   {b:75,    h:33.53},   -10.13,   320.22,   -66,  +1],
    ['rtriangle2',  {b:75,    h:33.53},   230.13,   320.22,    66,  +1],
    ['rtriangle',   {b:50.7,  h:25.56},   443.68,   432.59,   -90,  +1],
    ['rtriangle2',  {b:50.7,  h:25.56},   351.64,   432.17,    90,  +1],
    ['rtriangle',   {b:50.7,  h:25.56},   -118.54,  55.54,    117,  +1],
    ['rtriangle2',  {b:50.7,  h:25.56},   -36.65,   97.56,    -63,  +1],
    ['circle',      {r:25},               110,      446.93,     0,  -1],
    ['semicircle',  {r:47.61},            110,      390.71,   180,  -1],
    ['sector',      {r:75, alpha:114/2},  383.12,   254.14,  -147,  +1],
    ['semicircle',  {r:63.06},            397.66,   476.25,     0,  +1],
    ['sector',      {r:75, alpha:93/2},   -151.68,  235.94,   70.5,  +1],
    ['semicircle',  {r:63.06},            -57.61,   37.71,   -153,  +1]
  ];
  figures = DATOS.map(([tipo, dims, cx, cy, rot, signo], i)=>{
    const def = FIG_DEFS[tipo];
    const anc = def.defaultAnchor || 'C';
    return {
      id: ++figIdCounter, type: tipo, dims: Object.assign({}, dims),
      cx, cy, rotation: rot, sign: signo,
      color: COLORS[i % COLORS.length],
      anchor: anc, activeAnchor: anc, name: def.name,
      matId: (modoCuerpo==='heterogeneo' && MATS.length) ? MATS[0].id : null,
      thickness: 1,
      angleMode: (tipo==='sector') ? 'total' : 'semi'
    };
  });
  setUnit('mm'); colorIdx = figures.length % COLORS.length;
  renderFigList(); fitView(); calculate();
}
