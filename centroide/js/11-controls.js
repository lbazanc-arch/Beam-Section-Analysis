// ═══════════════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  UNIDADES (con conversión) y DECIMALES
// ═══════════════════════════════════════════════════════════
// 1 unidad expresada en metros
const LEN_FAC_I = {mm:0.001, cm:0.01, m:1, in:0.0254, ft:0.3048};
// Fuerza en kN, misma convención que LEN_FAC_I: nuevo = viejo * (F_viejo/F_nuevo)
const FOR_A_KN = {kN:1, N:0.001, ton:9.80665, kgf:0.00980665, kip:4.4482216153, lb:0.00444822};
// Dimensiones que NO son longitudes (no deben convertirse)
const ANGLE_DIMS = {alpha:true};


// ═══════════════════════════════════════════════════════════
//  HISTORIAL DE EJERCICIOS (últimos 10, propios de cada usuario)
//  El portal es el dueño del almacén; aquí sólo se pide/envía por postMessage.
// ═══════════════════════════════════════════════════════════
const HIST_APP = 'centro';
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
  // El atajo "Mis ejercicios recientes" del panel de Configuración se retiró:
  // el historial se abre desde su botón de la barra de herramientas.
});
function histFmtDate(ts){
  try{ const d=new Date(ts);
    const p=n=>String(n).padStart(2,'0');
    return p(d.getDate())+'/'+p(d.getMonth()+1)+' '+p(d.getHours())+':'+p(d.getMinutes());
  }catch(e){ return ''; }
}
function openHist(){ pintarGuardadosEnEquipo(); document.getElementById('histModal').classList.add('show'); }
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
  const tipos={}; figures.forEach(f=>{ const n=f.name||(FIG_DEFS[f.type]&&FIG_DEFS[f.type].name)||f.type; tipos[n]=(tipos[n]||0)+1; });
  const desc=Object.keys(tipos).map(k=>tipos[k]+'× '+k).join(', ');
  // Se añade el área (o el volumen en 3D) para distinguir secciones con las
  // mismas figuras pero distintas medidas
  const es3 = (modoEspacio === '3d'), esL = (modoEspacio === 'alambre');
  const areaTxt=(results&&isFinite(results.A))?('  ·  '+(es3?'V=':esL?'L=':'A=')+fmtVal(results.A)+' '+unit+(es3?'³':esL?'':'²')):'';
  const title=desc+areaTxt;
  return {title, state:{
    modoEspacio,
    figures:JSON.parse(JSON.stringify(figures)),
    unit, colorIdx,
    extraPoint: extraPoint?JSON.parse(JSON.stringify(extraPoint)):null,
    axisAngle,
    DEC:JSON.parse(JSON.stringify(DEC)),
    notationExp,
    // El cuerpo y sus materiales (2026-09-15): sin ellos un ejercicio heterogéneo
    // se abría homogéneo, con otra unidad de fuerza, y el peso y G salían distintos.
    modoCuerpo, matMagnitud, unitForce,
    MATS: MATS.map(m=>({id:m.id, val:m.val, unidad:m.unidad, valIng:m.valIng, uIng:m.uIng})),
    matSeq
  }};
}
// Valores con los que arranca el tema (01-): los toma un archivo que no los trae.
const CUERPO_INICIAL = {modoCuerpo, matMagnitud, unitForce};
// Tipo de cuerpo, magnitud, unidad de fuerza y materiales de un archivo. Uno
// anterior a guardarlos abre homogéneo y con la fuerza por defecto, sin
// materiales; un matId que no apunte a un material del archivo queda sin asignar.
function restaurarCuerpoDeArchivo(s, modo){
  const conMats = Array.isArray(s.MATS);
  unitForce   = (s.unitForce && FOR_A_KN[s.unitForce]) ? s.unitForce : CUERPO_INICIAL.unitForce;
  matMagnitud = (s.matMagnitud === 'densidad' || s.matMagnitud === 'peso') ? s.matMagnitud : CUERPO_INICIAL.matMagnitud;
  // El alambre es siempre homogéneo (24-alambres.js).
  modoCuerpo  = (s.modoCuerpo === 'heterogeneo' && modo !== 'alambre') ? 'heterogeneo' : 'homogeneo';
  MATS = (conMats ? s.MATS : [])
    .filter(m=>m && isFinite(Number(m.id)) && isFinite(Number(m.val)))
    .map(m=>{
      const o = {id:Number(m.id), val:Number(m.val), unidad:uGamma()};
      if(m.valIng !== undefined && m.valIng !== null && m.uIng){ o.valIng = Number(m.valIng); o.uIng = m.uIng; }
      return o;
    });
  matSeq = MATS.reduce((mx, m)=>Math.max(mx, m.id), Number(s.matSeq) || 0);
  figures.forEach(f=>{ if(f.matId != null && !MATS.some(m=>m.id === f.matId)) f.matId = null; });
  pintarTipoDeCuerpo();                                   // 12-
}
function histRestore(s){
  // Primero, que el archivo sirva (2026-09-15): una lista de figuras, y cada una de
  // un tipo que conozca el modo del archivo, con medidas y posición. Si no, no se toca
  // ni el modelo ni el resultado; la excepción la convierte en aviso quien abre
  // (_cargarEjercicioTexto en 18-, histLoad). Mirar solo «lista de objetos» dejaba
  // pasar figures:[{}] o type:'xyz', que lanzaban luego en figArea (19-) con el
  // modelo ya sustituido, y deshacer no lo recuperaba: abrir no registra paso.
  if(!s || typeof s !== 'object' || !Array.isArray(s.figures))
    throw new Error('El ejercicio no trae la lista de figuras.');
  // Los archivos anteriores al modo 3D no traen modoEspacio: son 2D.
  const modo = (s.modoEspacio === '3d' || s.modoEspacio === 'alambre') ? s.modoEspacio : '2d';
  const defs = (modo === '3d') ? SOLID_DEFS : FIG_DEFS;
  const num = v => (typeof v === 'number' && isFinite(v));
  const figuraValida = f => !!f && typeof f === 'object'
    && Object.prototype.hasOwnProperty.call(defs, f.type)
    && !!f.dims && typeof f.dims === 'object'
    && num(f.cx) && num(f.cy) && (modo !== '3d' || num(f.cz));
  if(!s.figures.every(figuraValida))
    throw new Error('El ejercicio trae figuras que no se reconocen.');
  // Si aun así algo lanza a mitad de abrirlo, se vuelve al modelo, la vista y el
  // resultado de antes y se relanza: el aviso sale igual y no se pierde nada.
  const previo = {inst: instantanea(), res: !!results,
    extraPoint: extraPoint ? JSON.parse(JSON.stringify(extraPoint)) : null, axisAngle,
    DEC: JSON.parse(JSON.stringify(DEC)), notationExp,
    selectedFigId, selectedFigType, selFiguras: selFiguras.slice(), viewTx, viewTy, viewScale};
  try{ _abrirEstadoDeArchivo(s, modo); }
  catch(e){
    try{
      selectedFigId = previo.selectedFigId; selectedFigType = previo.selectedFigType;
      selFiguras = previo.selFiguras;
      restaurarInstantanea(previo.inst);                   // 15-: figuras, modo, unidades y materiales
      extraPoint = previo.extraPoint; axisAngle = previo.axisAngle;
      DEC = previo.DEC; notationExp = previo.notationExp; syncDecTag();
      viewTx = previo.viewTx; viewTy = previo.viewTy; viewScale = previo.viewScale;
      render();
      if(previo.res) recalcularSinDesplazar();              // 10-
    }catch(err){}
    throw e;
  }
}
// Aplica al tema un estado que histRestore ya dio por bueno.
function _abrirEstadoDeArchivo(s, modo){
  // El panel no puede seguir con la solución del modelo anterior: si calculate()
  // rechaza el archivo (sin figuras), results quedaba con el cálculo viejo. Va
  // antes de cambiar de modo: pasar a alambre con un cuerpo heterogéneo llama a
  // setModoCuerpo, que recalculaba el modelo viejo en el modo nuevo y avisaba.
  invalidarResultados();
  // Las figuras entran ANTES que el modo: setModoEspacio repinta, y el 3D pintando
  // las figuras planas que quedaban lanzaba en verticesSolido (20-): un ejercicio 3D
  // no se abría desde un panel 2D con figuras.
  figures=JSON.parse(JSON.stringify(s.figures));
  if(modo !== modoEspacio) setModoEspacio(modo, {sinLimpiar:true, sinAjustar:true});
  // El contador pasa a ser >= el mayor id del archivo, o las figuras nuevas
  // (y las copias de Replicar) repetirían ids. Un id repetido o no numérico
  // —archivos guardados antes de este arreglo— se renumera al abrir.
  asegurarContadorFiguras();
  { const vistos = new Set();
    figures.forEach(f=>{
      if(typeof f.id !== 'number' || !isFinite(f.id) || vistos.has(f.id)) f.id = ++figIdCounter;
      vistos.add(f.id);
    }); }
  if(typeof s.colorIdx==='number') colorIdx=s.colorIdx;
  if(s.unit) setUnit(s.unit);
  restaurarCuerpoDeArchivo(s, modo);      // tras la unidad: uGamma() depende de ella
  extraPoint = s.extraPoint?JSON.parse(JSON.stringify(s.extraPoint)):null;
  axisAngle  = (typeof s.axisAngle==='number')?s.axisAngle:null;
  if(s.DEC) DEC=JSON.parse(JSON.stringify(s.DEC));
  if(typeof s.notationExp==='number') notationExp=s.notationExp;
  selectedFigId=null; selectedFigType=null; selFiguras=[];
  selectFigure(null); actualizarInfoSel();
  syncDecTag();
  renderFigList();
  fitView();
  render();
  if(typeof calculate==='function') calculate();
}
