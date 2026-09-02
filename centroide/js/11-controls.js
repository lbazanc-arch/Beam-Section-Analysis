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
