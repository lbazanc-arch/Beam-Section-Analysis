// ═══════════════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  UNIDADES (con conversión) y DECIMALES
// ═══════════════════════════════════════════════════════════
// 1 unidad expresada en metros
const LEN_FAC_I = {mm:0.001, cm:0.01, m:1, in:0.0254, ft:0.3048};
// Dimensiones que NO son longitudes (no deben convertirse)
const ANGLE_DIMS = {alpha:true};


// ═══════════════════════════════════════════════════════════
//  HISTORIAL DE EJERCICIOS (últimos 10, propios de cada usuario)
//  El portal es el dueño del almacén; aquí sólo se pide/envía por postMessage.
// ═══════════════════════════════════════════════════════════
const HIST_APP = 'iner';
let histItems = [];
let histUser  = null;
function histPost(msg){
  try{ if(window.parent && window.parent!==window) window.parent.postMessage(Object.assign({app:HIST_APP},msg),'*'); }catch(e){}
}
function histRequest(){ histPost({bsa:'hist:list'}); }

// ═══ Latido de actividad hacia el portal ═══
// El portal cierra la sesión por inactividad, pero no ve lo que ocurre
// dentro de este iframe. Se le avisa como mucho una vez cada 20 s.
let _ultLatido = 0;
function latidoActividad(){
  const ahora = Date.now();
  if(ahora - _ultLatido < 20000) return;
  _ultLatido = ahora;
  try{
    if(window.parent && window.parent !== window)
      window.parent.postMessage({bsa:'activo'}, '*');
  }catch(e){}
}
['pointerdown','keydown','wheel','touchstart'].forEach(ev=>
  document.addEventListener(ev, latidoActividad, {passive:true}));

function histPush(){
  if(histSuppress) return;          // no re-guardar el ejercicio que se acaba de abrir
  const snap = histSnapshot();
  if(!snap) return;
  histPost({bsa:'hist:save', item:snap});
}
window.addEventListener('message', ev=>{
  const d=ev.data;
  if(!d||typeof d!=='object'||d.bsa!=='hist:data'||d.app!==HIST_APP) return;
  histItems = Array.isArray(d.items)?d.items:[];
  histUser  = d.user||null;
  histRenderList();
  const b=document.getElementById('histBtn');
  if(b) b.style.display = histUser ? '' : 'none';   // sin sesión no tiene sentido
});
function histFmtDate(ts){
  try{ const d=new Date(ts);
    const p=n=>String(n).padStart(2,'0');
    return p(d.getDate())+'/'+p(d.getMonth()+1)+' '+p(d.getHours())+':'+p(d.getMinutes());
  }catch(e){ return ''; }
}
function openHist(){ histRequest(); document.getElementById('histModal').classList.add('show'); }
function closeHist(){ document.getElementById('histModal').classList.remove('show'); }
function histRenderList(){
  const box=document.getElementById('histList'); if(!box) return;
  if(!histUser){
    box.innerHTML='<div class="hist-empty">Inicia sesión en el portal para guardar tu historial.</div>'; return;
  }
  if(!histItems.length){
    box.innerHTML='<div class="hist-empty">Aún no tienes ejercicios guardados.<br>Se guardarán automáticamente al calcular.</div>'; return;
  }
  box.innerHTML = histItems.map((it,i)=>
    '<div class="hist-item">'+
      '<div class="hist-info"><div class="hist-title">'+(i+1)+'. '+String(it.title||'Ejercicio').replace(/</g,'&lt;')+'</div>'+
      '<div class="hist-date">'+histFmtDate(it.ts)+'</div></div>'+
      '<button class="hist-load" onclick="histLoad(\''+String(it.id)+'\')">Abrir</button>'+
      '<button class="hist-del" onclick="histDel(\''+String(it.id)+'\')" title="Eliminar">✕</button>'+
    '</div>').join('');
}
function histDel(id){ histPost({bsa:'hist:del', id:String(id)}); }
let histSuppress=false;   // evita volver a guardar mientras se restaura
function histLoad(id){
  const it=histItems.find(x=>String(x.id)===String(id));
  if(!it||!it.state){ aviso('No se encontró ese ejercicio en el historial.', 'error'); return; }
  histSuppress=true;
  try{ histRestore(it.state); closeHist(); }
  catch(e){ aviso('No se pudo abrir ese ejercicio guardado.', 'error'); }
  finally{ setTimeout(()=>{ histSuppress=false; }, 400); }
}

// Estado serializable de la sección
function histSnapshot(){
  if(!results || !figures.length) return null;
  const tipos={}; figures.forEach(f=>{ const n=(FIG_DEFS[f.type]&&FIG_DEFS[f.type].name)||f.type; tipos[n]=(tipos[n]||0)+1; });
  const desc=Object.keys(tipos).map(k=>tipos[k]+'× '+k).join(', ');
  // Se añade el área para distinguir secciones con las mismas figuras pero distintas medidas
  const areaTxt=(results&&isFinite(results.A))?('  ·  A='+fmtVal(results.A)+' '+unit+'²'):'';
  const title=desc+areaTxt;
  return {title, state:{
    figures:JSON.parse(JSON.stringify(figures)),
    unit, colorIdx,
    extraPoint: extraPoint?JSON.parse(JSON.stringify(extraPoint)):null,
    axisAngle,
    DEC:JSON.parse(JSON.stringify(DEC)),
    notationExp
  }};
}
function histRestore(s){
  figures=JSON.parse(JSON.stringify(s.figures));
  if(typeof s.colorIdx==='number') colorIdx=s.colorIdx;
  if(s.unit) setUnit(s.unit);
  extraPoint = s.extraPoint?JSON.parse(JSON.stringify(s.extraPoint)):null;
  axisAngle  = (typeof s.axisAngle==='number')?s.axisAngle:null;
  if(s.DEC) DEC=JSON.parse(JSON.stringify(s.DEC));
  if(typeof s.notationExp==='number') notationExp=s.notationExp;
  selectedFigId=null; selectedFigType=null;
  syncDecTag();
  renderFigList();
  fitView();
  render();
  if(typeof calculate==='function') calculate();
}


// ═══════════════════════════════════════════════════════════
//  CATÁLOGO DE PERFILES LAMINADOS DE ACERO
//  Los perfiles se dibujan como secciones idealizadas (sin radios de
//  acuerdo ni conicidad de alas), de modo que el motor calcula centroide,
//  inercias y Steiner igual que con cualquier otra figura.
// ═══════════════════════════════════════════════════════════
const CAT_FAMILIAS = [
  {id:'W_US', tipo:'wshape',  nom:'Perfiles W — aleta ancha',      sist:'EEUU (in)', u:'in'},
  {id:'W_SI', tipo:'wshape',  nom:'Perfiles W — aleta ancha',      sist:'SI (mm)',   u:'mm'},
  {id:'S_US', tipo:'wshape',  nom:'Perfiles S — normales',         sist:'EEUU (in)', u:'in'},
  {id:'S_SI', tipo:'wshape',  nom:'Perfiles S — normales',         sist:'SI (mm)',   u:'mm'},
  {id:'C_US', tipo:'channel', nom:'Canales C',                     sist:'EEUU (in)', u:'in'},
  {id:'C_SI', tipo:'channel', nom:'Canales C',                     sist:'SI (mm)',   u:'mm'},
  {id:'LI_US',tipo:'angleL',  nom:'Ángulos de lados iguales',      sist:'EEUU (in)', u:'in'},
  {id:'LI_SI',tipo:'angleL',  nom:'Ángulos de lados iguales',      sist:'SI (mm)',   u:'mm'},
  {id:'LD_US',tipo:'angleL',  nom:'Ángulos de lados desiguales',   sist:'EEUU (in)', u:'in'},
  {id:'LD_SI',tipo:'angleL',  nom:'Ángulos de lados desiguales',   sist:'SI (mm)',   u:'mm'}
];
let catFam = null;                 // familia abierta
let misPerfiles = [];              // perfiles guardados en el panel izquierdo

function famPorId(id){ return CAT_FAMILIAS.find(f=>f.id===id); }

function abrirCatalogo(){
  catFam=null;
  document.getElementById('cat-listado').style.display='none';
  document.getElementById('cat-familias').style.display='';
  document.getElementById('cat-add').style.display='none';
  document.getElementById('cat-sub').textContent=
    'Elige una familia de perfiles. Fuente: Beer & Johnston, Mecánica de Materiales, Apéndice C.';
  let h='<div style="max-height:380px;overflow:auto;border:1px solid var(--border);border-radius:8px;">'+
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">'+
        '<thead style="position:sticky;top:0;background:var(--card2);"><tr>'+
        '<th style="text-align:left;padding:7px 10px;">Familia</th>'+
        '<th style="text-align:left;padding:7px 10px;">Unidades</th>'+
        '<th style="text-align:right;padding:7px 10px;">Perfiles</th></tr></thead><tbody>';
  CAT_FAMILIAS.forEach(f=>{
    const n=(STEEL[f.id]||[]).length;
    h+=`<tr onclick="abrirFamilia('${f.id}')" style="cursor:pointer;border-top:1px solid var(--border);"
          onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
        <td style="padding:7px 10px;font-weight:700;color:var(--grn2)">${f.nom}</td>
        <td style="padding:7px 10px;color:var(--muted)">${f.sist}</td>
        <td style="padding:7px 10px;text-align:right;color:var(--muted)">${n}</td></tr>`;
  });
  document.getElementById('cat-familias').innerHTML=h+'</tbody></table></div>';
  document.getElementById('catModal').classList.add('show');
}
function cerrarCatalogo(){ document.getElementById('catModal').classList.remove('show'); }
function volverFamilias(){ abrirCatalogo(); }

function abrirFamilia(id){
  catFam=famPorId(id);
  document.getElementById('cat-familias').style.display='none';
  document.getElementById('cat-listado').style.display='';
  document.getElementById('cat-add').style.display='';
  document.getElementById('cat-sub').textContent=`${catFam.nom} · ${catFam.sist}`;
  document.getElementById('cat-buscar').value='';
  // aviso de precisión según la familia
  const av=document.getElementById('cat-aviso');
  if(id.startsWith('S_')||id.startsWith('C_')){
    av.style.color='#b45309';
    av.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"><path d="M12 9v5M12 17.5v.5"/><path d="M10.3 3.9 2.4 18a1.9 1.9 0 0 0 1.7 2.9h15.8a1.9 1.9 0 0 0 1.7-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0z"/></svg>En los perfiles S y los canales C las alas son <b>cónicas</b>. La sección se dibuja '+
      'con alas rectangulares, así que I<sub>x</sub> sale muy próximo al tabulado pero I<sub>y</sub> resulta '+
      'sobreestimado (~20%). Compara siempre con los valores de la tabla.';
  } else {
    av.style.color='var(--muted)';
    av.innerHTML='La sección se dibuja idealizada, sin radios de acuerdo, por lo que los valores calculados '+
      'difieren del tabulado en torno al 3%.';
  }
  pintarPerfiles();
}

function colsFamilia(){
  const u=catFam.u, u2=u+'²', u4=u==='in'?'in⁴':'10⁶mm⁴';
  if(catFam.tipo==='angleL')
    return ['','Designación','A ('+u2+')','I'+(catFam.id.startsWith('LD')?'x':'')+' ('+u4+')','r ('+u+')'];
  return ['','Designación','d ('+u+')','b_f ('+u+')','A ('+u2+')','Ix ('+u4+')','Iy ('+u4+')'];
}
function filaFamilia(f){
  if(catFam.tipo==='angleL'){
    const A=f[4], I=f[5], r=f[7];
    return [f[0],A,I,r];
  }
  return [f[0],f[1],f[2],f[5],f[6],f[9]];
}
function pintarPerfiles(){
  const q=(document.getElementById('cat-buscar').value||'').trim().toLowerCase();
  const datos=(STEEL[catFam.id]||[]).filter(f=>!q||f[0].toLowerCase().includes(q));
  const cols=colsFamilia();
  document.getElementById('cat-thead').innerHTML='<tr>'+cols.map((c,i)=>
    `<th style="text-align:${i<2?'left':'right'};padding:6px 8px;font-size:10px;color:var(--grn2);">${c}</th>`).join('')+'</tr>';
  let h='';
  datos.forEach(f=>{
    const v=filaFamilia(f);
    h+=`<tr style="border-top:1px solid var(--border);">
      <td style="padding:5px 8px;"><input type="checkbox" class="cat-chk" value="${f[0]}"></td>`;
    v.forEach((x,i)=>{ h+=`<td style="padding:5px 8px;text-align:${i===0?'left':'right'};
        ${i===0?'font-weight:700;color:var(--grn2);':'color:var(--text);'}">${typeof x==='number'?x:x}</td>`; });
    h+='</tr>';
  });
  document.getElementById('cat-tbody').innerHTML=h||'<tr><td style="padding:14px;color:var(--muted)">Sin coincidencias.</td></tr>';
  document.getElementById('cat-cuenta').textContent=datos.length+' perfiles';
}

function agregarSeleccionados(){
  const marcados=[...document.querySelectorAll('.cat-chk')].filter(c=>c.checked).map(c=>c.value);
  if(!marcados.length){ aviso('Marca al menos un perfil.'); return; }
  let nuevos = 0;
  marcados.forEach(nom=>{
    if(misPerfiles.some(p=>p.fam===catFam.id && p.nom===nom)) return;   // ya estaba
    misPerfiles.push({fam:catFam.id, tipo:catFam.tipo, nom:nom});
    nuevos++;
  });
  pintarMisPerfiles();
  cerrarCatalogo();
  // Se abre la paleta para que se VEA dónde han quedado; sin esto el catálogo
  // se cerraba y no quedaba ninguna señal de que se hubiera añadido algo.
  abrirPaletaEnPerfiles();
  aviso(nuevos
    ? (nuevos===1 ? 'Perfil añadido a la paleta de Figuras.'
                  : nuevos+' perfiles añadidos a la paleta de Figuras.')
    : 'Esos perfiles ya estaban en la paleta.');
}

// Abre la paleta de figuras (si estaba cerrada) para mostrar los perfiles.
function abrirPaletaEnPerfiles(){
  // En el mismo tick no vale: el clic del botón "Añadir" sigue subiendo hasta
  // el listener de document, que cierra cualquier menú abierto fuera de sí.
  setTimeout(()=>{
    const m = document.getElementById('menuFiguras');
    if(m && !m.classList.contains('abierto')) abrirPaleta(null);
  }, 0);
}
function quitarPerfil(i){ misPerfiles.splice(i,1); pintarMisPerfiles(); }

// Icono esquemático de cada familia, para reconocer el perfil de un vistazo.
const PERF_ICONO = {
  wshape : '<path d="M4 4h16M12 4v16M4 20h16"/>',
  channel: '<path d="M17 4H7v16h10M7 12h7"/>',
  angleL : '<path d="M7 4v16h13"/>'
};
// Los perfiles elegidos en el catálogo aparecen en la MISMA paleta de
// "Figuras", que es donde se insertan las demás. Antes se pintaban en un
// #misPerfiles que no existía en el HTML: la lista crecía en memoria y no
// se veía por ninguna parte.
function pintarMisPerfiles(){
  const box = document.getElementById('palPerfiles');
  if(!box) return;
  if(!misPerfiles.length){ box.style.display='none'; box.innerHTML=''; return; }
  box.style.display='';
  const filas = misPerfiles.map((p,i)=>{
    const fam  = famPorId(p.fam);
    const icon = PERF_ICONO[p.tipo] || PERF_ICONO.wshape;
    return `<div class="perf-fila">
       <button class="perf-btn" onclick="insertarPerfil(${i})" title="Insertar ${p.nom} en el panel">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
         <span>${p.nom}</span>
         <span class="perf-fam">${fam ? fam.u : ''}</span>
       </button>
       <button class="perf-x" onclick="quitarPerfil(${i})" title="Quitar de la paleta">\u2715</button>
     </div>`;
  }).join('');
  box.innerHTML = '<div class="pal-perf-tit">Perfiles de acero</div>' + filas;
}

// Convierte las medidas del perfil a la unidad activa del aplicativo
function _aUnidad(v, uOrigen){
  return v * (LEN_FAC_I[uOrigen] / LEN_FAC_I[unit]);
}
function insertarPerfil(i){
  const p=misPerfiles[i];
  if(!p){ aviso('No se encontró el perfil.', 'error'); return; }
  const fila=(STEEL[p.fam]||[]).find(f=>f[0]===p.nom);
  if(!fila){ aviso('No se encontró el perfil.', 'error'); return; }
  registrarCambio();      // insertar un perfil es un paso deshacible más
  const fam=famPorId(p.fam), u=fam.u;
  let dims;
  if(p.tipo==='angleL') dims={b1:_aUnidad(fila[1],u), b2:_aUnidad(fila[2],u), t:_aUnidad(fila[3],u)};
  else dims={d:_aUnidad(fila[1],u), bf:_aUnidad(fila[2],u), tf:_aUnidad(fila[3],u), tw:_aUnidad(fila[4],u)};
  // Perfiles S y canales C: alas cónicas → se usan las propiedades de la tabla.
  const porTabla = p.fam.startsWith('S_') || p.fam.startsWith('C_');
  if(p.tipo==='channel') dims.xb = _aUnidad(fila[12], u);   // x̄ tabulado
  const fig={
    id: ++figIdCounter,
    type:p.tipo, cx:0, cy:0, rotation:0, sign:1,
    color: COLORS[colorIdx % COLORS.length],
    dims: dims, etiqueta: p.nom,
    name: p.nom,                      // así se muestra su designación real, no "undefined"
    anchor:'C', activeAnchor:'C', angleMode:'semi',
    perfil: {fam:p.fam, nom:p.nom, tab:porTabla}
  };
  colorIdx++;
  figures.push(fig);
  selectedFigId=fig.id; selectedFigType=null;
  results = null;                      // el calculo anterior ya no vale
  cerrarMenuFiguras();
  renderFigList(); selectFigure(fig.id); fitView(); render();
  aviso(p.nom + ' insertado con su centroide en el origen (0, 0).');
}


// ── Propiedades TABULADAS del perfil, convertidas a la unidad activa ──
// Se leen de la tabla en cada consulta, así que al cambiar de unidad
// no queda ningún valor obsoleto.
function perfilTab(fig){
  if(!fig || !fig.perfil) return null;
  const fam = famPorId(fig.perfil.fam); if(!fam) return null;
  const f = (STEEL[fam.id]||[]).find(r=>r[0]===fig.perfil.nom); if(!f) return null;
  const k  = LEN_FAC_I[fam.u]/LEN_FAC_I[unit];      // factor de longitud
  const k2 = k*k, k3 = k2*k, k4 = k2*k2;
  const si = fam.u==='mm';                          // las tablas SI vienen en 10⁶mm⁴ y 10³mm³
  const eI = si ? 1e6 : 1, eS = si ? 1e3 : 1;
  if(fam.tipo==='angleL'){
    const esIgual = fam.id.startsWith('LI');
    return esIgual
      ? {nom:f[0], A:f[4]*k2, Ix:f[5]*eI*k4, Iy:f[5]*eI*k4, Sx:f[6]*eS*k3, rx:f[7]*k, ry:f[7]*k, xb:f[8]*k, rz:f[9]*k}
      : {nom:f[0], A:f[4]*k2, Ix:f[5]*eI*k4, Sx:f[6]*eS*k3, rx:f[7]*k, yb:f[8]*k,
         Iy:f[9]*eI*k4, Sy:f[10]*eS*k3, ry:f[11]*k, xb:f[12]*k, rz:f[13]*k, tan:f[14]};
  }
  const o={nom:f[0], A:f[5]*k2, Ix:f[6]*eI*k4, Sx:f[7]*eS*k3, rx:f[8]*k,
           Iy:f[9]*eI*k4, Sy:f[10]*eS*k3, ry:f[11]*k};
  if(fam.tipo==='channel') o.xb=f[12]*k;
  return o;
}
// ¿Este perfil debe usar los valores de la tabla en vez de la geometría?
// Se aplica a perfiles S y canales C, cuyas alas reales son cónicas.
function usaTabla(fig){
  return !!(fig && fig.perfil && fig.perfil.tab);
}
function figArea(fig){
  const t=usaTabla(fig)&&perfilTab(fig); if(t) return t.A;
  return FIG_DEFS[fig.type].area(fig.dims);
}
function figIx(fig){
  const t=usaTabla(fig)&&perfilTab(fig); if(t) return t.Ix;
  return FIG_DEFS[fig.type].Ix_c(fig.dims);
}
function figIy(fig){
  const t=usaTabla(fig)&&perfilTab(fig); if(t) return t.Iy;
  return FIG_DEFS[fig.type].Iy_c(fig.dims);
}
function figIxy(fig){
  if(usaTabla(fig)) return 0;      // S y C son simétricos respecto al eje x
  return FIG_DEFS[fig.type].Ixy_c(fig.dims);
}

function setUnit(u){
  unit=u; unitLabel=u;
  const tag=document.getElementById('unitTag'); if(tag) tag.textContent=u;
}

// Cambia de unidad CONVIRTIENDO todas las medidas y posiciones,
// de modo que la sección física permanece idéntica.
function convertUnits(newU){
  const oldU = unit;
  if(newU===oldU) return;
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
  if(typeof renderFigList==='function') renderFigList();
  if(typeof syncPropsPanel==='function'){ try{ syncPropsPanel(); }catch(e){} }
  render();
  if(results && typeof calculate==='function'){ try{ calculate(); }catch(e){} }
}

function openUnitsModal(){
  const s=document.getElementById('selUnit'); if(s) s.value=unit;
  updateUnitsPreview();
  document.getElementById('unitsModal').classList.add('show');
}
function closeUnitsModal(){ document.getElementById('unitsModal').classList.remove('show'); }
function updateUnitsPreview(){
  const u=document.getElementById('selUnit').value;
  document.getElementById('uaPrev').textContent=u+'\u00B2';
  document.getElementById('uiPrev').textContent=u+'\u2074';
}
function applyUnitsModal(){
  convertUnits(document.getElementById('selUnit').value);
  closeUnitsModal();
}

// ── DECIMALES ──
// Cantidad de decimales por magnitud, configurable por el usuario.
function decFix(v, kind){
  const d = DEC[kind]!==undefined ? DEC[kind] : 2;
  if(typeof v!=='number' || !isFinite(v)) return v;
  return parseFloat(v.toFixed(d));
}
function decTagText(){
  const v = [DEC.len, DEC.iner];
  return (v[0]===v[1]) ? (v[0] + (v[0]===1?' decimal':' decimales'))
                       : v.join(' / ') + ' decimales';
}
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
  fillDecSelect('selDecIner',DEC.iner);
  fillDecSelect('selDecAng',DEC.ang);
  updateDecPreview();
  document.getElementById('decModal').classList.add('show');
}
function closeDecModal(){ document.getElementById('decModal').classList.remove('show'); }
function updateDecPreview(){
  const g=id=>parseInt(document.getElementById(id).value,10)||2;
  const dl=g('selDecLen'), di=g('selDecIner'), da=g('selDecAng');
  document.getElementById('dpL').textContent=(12.3456789).toFixed(dl)+' '+unit;
  document.getElementById('dpI').textContent=(48123.987654).toFixed(di)+' '+unit+'\u2074';
  document.getElementById('dpA').textContent=(31.415926).toFixed(da)+'\u00B0';
}
function applyDecModal(){
  const g=id=>parseInt(document.getElementById(id).value,10)||2;
  DEC={len:g('selDecLen'), area:g('selDecArea'), iner:g('selDecIner'), ang:g('selDecAng')};
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
  // Limpiar es reversible: se guarda el estado antes de vaciarlo.
  cerrarEdicionSiSobra_forzar();
  if(figures.length) registrarCambio();
  figures=[]; selectedFigId=null; selectedFigType=null; results=null; colorIdx=0;
  extraPoint=null;
  selectFigure(null); renderFigList();
  document.getElementById('resultsPanel').style.display='none';
  render();
}
function loadExampleSection(){
  resetAll();
  // Sección compuesta de ejemplo (cotas en mm). El ángulo de los sectores se
  // introduce como ángulo TOTAL: angleMode='total' y dims.alpha guarda el
  // SEMIÁNGULO, que es lo que consume el solucionador.
  const F = (type,dims,cx,cy,rotation,sign,name,total) => ({
    id:++figIdCounter, type, dims, cx, cy, rotation, sign,
    color:COLORS[colorIdx++ % COLORS.length],
    anchor:'C', activeAnchor:'C', name,
    angleMode: total ? 'total' : 'semi'
  });
  colorIdx = 0;
  figures = [
    F('rect', {b:220,h:352.15}, 110, 176.07, 0, +1, 'Rectángulo'),
    F('rect', {b:140,h:160.39}, 110, 432.35, 0, +1, 'Rectángulo'),
    F('rect', {b:120,h:75}, 290.07, 279.85, -24, +1, 'Rectángulo'),
    F('rect', {b:120,h:75}, -70.07, 279.85, 24, +1, 'Rectángulo'),
    F('rect', {b:75,h:160}, 397.66, 369.49, 0, +1, 'Rectángulo'),
    F('rect', {b:75,h:160}, -106.64, 132.71, 27, +1, 'Rectángulo'),
    F('rtriangle', {b:75,h:33.53}, -10.13, 320.22, -66, +1, 'Triáng. Rectángulo'),
    F('rtriangle2', {b:75,h:33.53}, 230.13, 320.22, 66, +1, 'Triáng. Rect. \u2461'),
    F('rtriangle', {b:50.7,h:25.56}, 443.68, 432.59, -90, +1, 'Triáng. Rectángulo'),
    F('rtriangle2', {b:50.7,h:25.56}, 351.64, 432.17, 90, +1, 'Triáng. Rect. \u2461'),
    F('rtriangle', {b:50.7,h:25.56}, -118.54, 55.54, 117, +1, 'Triáng. Rectángulo'),
    F('rtriangle2', {b:50.7,h:25.56}, -36.65, 97.56, -63, +1, 'Triáng. Rect. \u2461'),
    F('circle', {r:25}, 110, 446.93, 0, -1, 'Círculo'),
    F('semicircle', {r:47.61}, 110, 390.71, 180, -1, 'Semicírculo'),
    F('sector', {r:75,alpha:57}, 383.12, 254.14, -147, +1, 'Sector Circular', true),
    F('semicircle', {r:63.06}, 397.66, 476.25, 0, +1, 'Semicírculo'),
    F('sector', {r:75,alpha:46.5}, -151.68, 235.94, 70.5, +1, 'Sector Circular', true),
    F('semicircle', {r:63.06}, -57.61, 37.71, -153, +1, 'Semicírculo')
  ];
  setUnit('mm');
  renderFigList(); fitView(); calculate();
}
