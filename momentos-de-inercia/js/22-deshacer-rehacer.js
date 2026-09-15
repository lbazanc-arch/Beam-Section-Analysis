// ═══════════════════════════════════════════════════════════
//  DESHACER / REHACER
// ═══════════════════════════════════════════════════════════
// Mismo mecanismo que en los Cap. 6 y 9: una pila de instantáneas del modelo.
// Se guarda el estado ANTES de cada cambio, no después, para que "deshacer"
// devuelva la situación previa a la acción y no la propia acción.
let pilaDeshacer = [], pilaRehacer = [];
const MAX_HISTORIAL = 60;

function instantanea(){
  return JSON.stringify({
    figures: figures.map(f=>{
      // Copia completa: enumerar los campos a mano dejaba fuera 'perfil' y
      // 'angleMode', y un perfil de acero volvía del deshacer como figura
      // corriente, con sus inercias recalculadas por geometría.
      const c = Object.assign({}, f);
      c.dims = Object.assign({}, f.dims);
      if(f.perfil) c.perfil = Object.assign({}, f.perfil);
      return c;
    }),
    figIdCounter, colorIdx, selectedFigId, unit
  });
}

// Mayor id de las figuras del modelo (0 si no hay ninguna). El contador de ids
// nunca debe quedar por debajo: una figura nueva o una copia repetiría un id.
function maxIdFiguras(){
  return figures.reduce((m,f)=>(typeof f.id==='number' && isFinite(f.id) && f.id>m) ? f.id : m, 0);
}

function restaurar(txt){
  let d; try{ d = JSON.parse(txt); }catch(e){ return; }
  figures = (d.figures||[]).map(f=>{
    const c = Object.assign({}, f);
    c.dims = Object.assign({}, f.dims);
    if(f.perfil) c.perfil = Object.assign({}, f.perfil);
    return c;
  });
  figIdCounter = Math.max(d.figIdCounter || 0, maxIdFiguras());
  colorIdx = d.colorIdx || 0;
  // Las medidas de la instantánea están en SU unidad: se restauran con ella.
  // El punto P no va en la instantánea y se lleva a esa unidad.
  if(d.unit && d.unit !== unit){
    const k = LEN_FAC_I[unit]/LEN_FAC_I[d.unit];
    if(extraPoint){ extraPoint.x = +(extraPoint.x*k).toFixed(9); extraPoint.y = +(extraPoint.y*k).toFixed(9); }
    setUnit(d.unit);
  }
  // La marca de Mover / editar no va en la instantánea: se depura de los ids
  // que ya no existen, o Replicar registraría un paso vacío sobre fantasmas.
  selFiguras = selFiguras.filter(id=>figures.some(f=>f.id===id));
  try{ actualizarInfoSel(); }catch(e){}
  invalidarResultados();
  selectFigure(d.selectedFigId != null && figures.some(f=>f.id===d.selectedFigId)
               ? d.selectedFigId : null);
  try{ renderFigList(); }catch(e){}
  try{ updatePropPanel(); }catch(e){}
  actualizarBotonesHistorial();
  render();
}

function registrarCambio(){
  pilaDeshacer.push(instantanea());
  if(pilaDeshacer.length > MAX_HISTORIAL) pilaDeshacer.shift();
  pilaRehacer.length = 0;          // una acción nueva invalida el rehacer
  actualizarBotonesHistorial();
}

function deshacer(){
  if(!pilaDeshacer.length){ aviso('No hay nada que deshacer.'); return; }
  pilaRehacer.push(instantanea());
  restaurar(pilaDeshacer.pop());
}

function rehacer(){
  if(!pilaRehacer.length){ aviso('No hay nada que rehacer.'); return; }
  pilaDeshacer.push(instantanea());
  restaurar(pilaRehacer.pop());
}

function actualizarBotonesHistorial(){
  const d = document.getElementById('btnDeshacer'), r = document.getElementById('btnRehacer');
  if(d) d.disabled = !pilaDeshacer.length;
  if(r) r.disabled = !pilaRehacer.length;
}
