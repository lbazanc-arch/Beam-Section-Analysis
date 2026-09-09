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
  // En 3D la paleta es #palGrid3d y no tiene «Ver más» (seis sólidos caben).
  const grid = document.getElementById(modoEspacio === '3d' ? 'palGrid3d' : modoEspacio === 'alambre' ? 'palGridAlambre' : 'palGrid');
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
// ── Unidad propia del peso específico o la densidad (propuesta 2.2, 2026-09-08) ──
// El alumno piensa en kN/m³ o kg/m³ aunque la longitud del dibujo vaya en mm.
// Cada material guarda el valor tal como se escribió (valIng, uIng) y el
// programa lo convierte a la unidad del sistema (unitForce/unit³ o kg/unit³),
// que es la que usa el cálculo (m.val). Factores a kN/m³ y a kg/m³.
const MAT_UNIDADES = {
  peso:     {'kN/m³':1, 'N/m³':1e-3, 'kgf/m³':0.00980665, 'tonf/m³':9.80665, 'lb/ft³':0.157087},
  densidad: {'kg/m³':1, 'g/cm³':1000, 'lb/ft³':16.0185}
};
function unidadesMaterial(){ return Object.keys(MAT_UNIDADES[matMagnitud==='densidad' ? 'densidad' : 'peso']); }
function gammaAlSistema(v, u){
  const tabla = MAT_UNIDADES[matMagnitud==='densidad' ? 'densidad' : 'peso'];
  const fac = tabla[u]; if(fac === undefined) return v;
  const porM3 = v*fac;                                   // kN/m³ o kg/m³
  const L = LEN_FAC_I[unit] || 1;                        // metros que mide una unidad de longitud
  const porUnidad3 = porM3*L*L*L;                        // por unit³
  return (matMagnitud==='densidad') ? porUnidad3 : porUnidad3/(FOR_A_KN[unitForce] || 1);
}
function reconvertirMateriales(){
  MATS.forEach(m=>{
    if(m.valIng !== undefined && m.valIng !== null && m.uIng) m.val = +gammaAlSistema(m.valIng, m.uIng).toPrecision(10);
    m.unidad = uGamma();
  });
}
function renderMatUnidades(){
  const sel = document.getElementById('mat-uni'); if(!sel) return;
  const actual = sel.value;
  const lista = unidadesMaterial();
  sel.innerHTML = lista.map(u=>'<option value="'+u+'">'+u+'</option>').join('');
  sel.value = lista.indexOf(actual) >= 0 ? actual : lista[0];
}
function _matValTxt(m){ return (m.valIng !== undefined && m.valIng !== null) ? decFix(m.valIng,'len') : decFix(m.val,'len'); }
function _matUniTxt(m){ return m.uIng || m.unidad || ''; }
function setMagnitud(m){
  const cambia = (matMagnitud !== m);
  matMagnitud=m;
  // Al cambiar de magnitud el valor escrito deja de tener sentido: se conserva
  // el número en la unidad del sistema y se olvida la unidad de entrada.
  if(cambia) MATS.forEach(x=>{ x.valIng = null; x.uIng = null; });
  MATS.forEach(x=>{ x.unidad = uGamma(); });
  renderMatUnidades();
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
  const sel=document.getElementById('mat-uni');
  const uIng=(sel && sel.value) || unidadesMaterial()[0];
  const u=uGamma();     // unidad del sistema, la que usa el cálculo
  const msg=document.getElementById('mat-msg');
  if(!isFinite(v)||v<=0){ if(msg){msg.style.color='#c0392b';msg.textContent='Escribe un valor mayor que cero.';} return; }
  MATS.push({id:++matSeq, val:+gammaAlSistema(v, uIng).toPrecision(10), unidad:u, valIng:v, uIng});
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
    +'<span class="mat-val">= '+_matValTxt(m)+' '+esc(_matUniTxt(m))
    +((m.valIng!==undefined && m.valIng!==null && m.uIng !== uGamma()) ? ' <span style="color:var(--muted);font-size:9px">(= '+Number(m.val).toPrecision(4)+' '+esc(uGamma())+')</span>' : '')
    +'</span>'
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
      if(fig.cz!==undefined) fig.cz = +(fig.cz*k).toFixed(9);   // sólidos 3D
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
  // Los materiales con unidad propia se reconvierten desde el valor escrito:
  // así no acumulan redondeos al cambiar de sistema varias veces.
  reconvertirMateriales();
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
  if(modoEspacio === '3d') return fitView3d();          // 21-vistas-3d.js
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
// ═══════════════════════════════════════════════════════════
//  EJEMPLOS DE VERIFICACIÓN (propuestas 2.4 y 2.6, 2026-09-08)
//  Cada uno resuelto a mano; `esperado` es el centroide (x̄, ȳ) y, al
//  cargarlo, se contrasta con el motor (aviso por consola si difiere más
//  del 0.1 %). Las coordenadas de cada figura son las de SU centroide.
// ═══════════════════════════════════════════════════════════
let ejemploActualCen = null;
const EJEMPLOS_CEN = [
  {
    id:'seccion', nom:'Sección compuesta de 18 figuras', unidad:'mm',
    desc:'La sección de siempre: rectángulos, triángulos, sectores, semicírculos y dos huecos. Es la que más ejercita las cotas y el informe.',
    ref:'Sin valor a mano; se comprueban simetría, envolvente y momento nulo respecto de C.',
    armar(){
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
      return DATOS;
    }
  },
  {
    id:'placa', nom:'Placa con triángulo y hueco (Hibbeler ej. 9.10)', unidad:'mm',
    desc:'Rectángulo de 120 × 60 con un triángulo rectángulo de 120 × 60 encima (ángulo recto a la izquierda) y un hueco rectangular de 40 × 20 centrado en el rectángulo.',
    esperado:{xbar:52.8, ybar:48.0},
    ref:'A = 7200 + 3600 − 800 = 10000 mm²; x̄ = (7200·60 + 3600·40 − 800·60)/10000 = 52.80; ȳ = (7200·30 + 3600·80 − 800·30)/10000 = 48.00 mm.',
    armar(){
      return [
        ['rect',      {b:120, h:60},  60, 30,   0, +1],
        ['rtriangle', {b:120, h:60},  40, 80,   0, +1],   // ángulo recto en (0, 60): C = (b/3, h/3) desde él
        ['rect',      {b:40,  h:20},  60, 30,   0, -1]
      ];
    }
  },
  {
    id:'anillo', nom:'Anillo: el centroide cae en el aire', unidad:'mm',
    desc:'Círculo de radio 60 menos círculo de radio 40, concéntricos. El centroide está en el centro, donde no hay material.',
    esperado:{xbar:0, ybar:0},
    ref:'Por simetría C = (0, 0): fuera del material. Es el «¿por qué?» de que el centroide es un promedio de posiciones, no un punto de la pieza.',
    armar(){
      return [
        ['circle', {r:60}, 0, 0, 0, +1],
        ['circle', {r:40}, 0, 0, 0, -1]
      ];
    }
  },
  {
    id:'ele', nom:'Ángulo en L (dos rectángulos)', unidad:'mm',
    desc:'Ala horizontal de 100 × 20 y ala vertical de 20 × 80 sobre ella, en la esquina inferior izquierda.',
    esperado:{xbar:32.222, ybar:32.222},
    ref:'x̄ = (2000·50 + 1600·10)/3600 = 32.22; ȳ = (2000·10 + 1600·60)/3600 = 32.22 mm. El punto (32.2, 32.2) no está en ninguna de las dos alas.',
    armar(){
      return [
        ['rect', {b:100, h:20}, 50, 10, 0, +1],
        ['rect', {b:20,  h:80}, 10, 60, 0, +1]
      ];
    }
  },
  {
    id:'carga', nom:'Carga distribuida como área (§9.4)', unidad:'m',
    desc:'Carga trapezoidal sobre una viga de 6 m: w crece de 2 a 5 kN/m. Se dibuja como rectángulo (6 × 2) más triángulo (6 × 3, ángulo recto a la derecha). El área es la resultante y el centroide su línea de acción.',
    esperado:{xbar:3.4286, ybar:1.8571},
    ref:'R = 12 + 9 = 21 kN; x̄ = (12·3 + 9·4)/21 = 3.43 m desde el extremo izquierdo (fórmula del trapecio: (L/3)(w₁+2w₂)/(w₁+w₂)).',
    armar(){
      return [
        ['rect',       {b:6, h:2}, 3, 1, 0, +1],
        ['rtriangle2', {b:6, h:3}, 4, 3, 0, +1]    // ángulo recto en (6, 2): C = BR − (b/3, −h/3)
      ];
    }
  }
];
function abrirEjemplosCen(){
  const el = document.getElementById('ejLista');
  // Cada modo enseña su propia lista: sólidos (21-vistas-3d.js), alambres
  // compuestos (24-alambres.js) o secciones planas.
  const lista = (modoEspacio === '3d' && typeof EJEMPLOS_3D !== 'undefined') ? EJEMPLOS_3D
              : (modoEspacio === 'alambre' && typeof EJEMPLOS_ALAMBRE !== 'undefined') ? EJEMPLOS_ALAMBRE : EJEMPLOS_CEN;
  if(el) el.innerHTML = lista.map((e,i)=>
      '<button type="button" class="ej-item" onclick="loadExampleSection(\'' + e.id + '\')">'
    + '<div class="ej-cab"><span class="ej-num">' + (i+1) + '</span><span class="ej-nom">' + e.nom + '</span></div>'
    + '<div class="ej-desc">' + e.desc + '</div>'
    + '<div class="ej-ref"><b>Referencia:</b> ' + e.ref + '</div>'
    + '</button>').join('');
  const m = document.getElementById('ejModal'); if(m) m.classList.add('show');
}
function cerrarEjemplosCen(){ const m = document.getElementById('ejModal'); if(m) m.classList.remove('show'); }
function comprobarEjemploCen(ej){
  if(!ej || !ej.esperado || !results) return;
  const esc0 = Math.max(1, Math.abs(ej.esperado.xbar), Math.abs(ej.esperado.ybar), Math.abs(ej.esperado.zbar || 0));
  ['xbar','ybar','zbar'].forEach(k=>{
    if(ej.esperado[k] === undefined) return;
    if(Math.abs(results[k] - ej.esperado[k]) > 1e-3*esc0)
      console.warn('Ejemplo ' + ej.id + ': ' + k + ' se desvía de la referencia', {esperado:ej.esperado[k], obtenido:results[k]});
  });
}

// Sin argumento carga la sección de 18 figuras, para no romper llamadas antiguas.
function loadExampleSection(id){
  if(modoEspacio === '3d') return loadExample3d(id);    // 21-vistas-3d.js
  if(modoEspacio === 'alambre') return loadExampleAlambre(id);   // 24-alambres.js
  const ej = EJEMPLOS_CEN.find(e=>e.id === id) || EJEMPLOS_CEN[0];
  resetAll();
  ejemploActualCen = ej.id;
  const DATOS = ej.armar();
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
  setUnit(ej.unidad || 'mm'); colorIdx = figures.length % COLORS.length;
  renderFigList(); fitView(); calculate();
  comprobarEjemploCen(ej);
  cerrarEjemplosCen();
}
