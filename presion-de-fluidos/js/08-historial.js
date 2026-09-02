// ═══════════════════════════════════════════════════════════
//  HISTORIAL
// ═══════════════════════════════════════════════════════════
const HIST_APP = 'presion';
let histItems = [], histUser = null;
function histPost(msg){
  try{ if(window.parent && window.parent!==window)
    window.parent.postMessage(Object.assign({app:HIST_APP}, msg), '*'); }catch(e){}
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
