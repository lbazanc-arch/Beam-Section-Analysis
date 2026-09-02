// ═══════════════════════════════════════════════════════════
//  CARGAS: se convierten a fuerzas equivalentes sobre el plano
// ═══════════════════════════════════════════════════════════
// Devuelve la lista de acciones {x,y,fx,fy,m} equivalentes
// Punto de aplicación de una carga puntual: puede ir sobre un tramo
// (a una distancia del inicio) o directamente sobre un nudo.
function puntoDeCarga(c){
  if(c.destino === 'nudo'){
    const n = nodo(c.nudo);
    return n ? {x:n.x, y:n.y} : null;
  }
  const t = tramos.find(z=>z.id===c.tramo);
  const g = t && geoTramo(t);
  if(!g) return null;
  const s = Math.max(0, Math.min(g.L, sDesdePos(c, g, c.pos)));
  return {x:g.a.x + g.ux*s, y:g.a.y + g.uy*s};
}
// Tramo cargado de una distribuida: [inicio, fin] medidos desde el nudo a.
// ── Cómo se declara la posición de una carga ──
// 'eje'    : distancia recorrida sobre el eje del tramo (lo de siempre).
// 'coordX' : la abscisa x del punto; se busca el punto del eje con esa x.
// 'coordY' : lo mismo con la ordenada y, útil en tramos verticales, donde
//            la x no distingue puntos.
// Devolver siempre una distancia sobre el eje deja intacto todo el cálculo
// posterior: solo cambia CÓMO el usuario declara el punto.
// El marco lo fija la propia carga: 'global' = coordenadas del plano,
// 'local' = medidas desde el nudo inicial del tramo (Δx, Δy).
function sDesdePos(c, g, valor){
  const v = Number(valor) || 0;
  const modo = c.basePos || 'eje';
  const local = (c.orient === 'local');
  if(modo === 'coordX'){
    if(Math.abs(g.ux) < 1e-9) return 0;   // tramo vertical: la x no distingue puntos
    return (local ? v : (v - g.a.x)) / g.ux;
  }
  if(modo === 'coordY'){
    if(Math.abs(g.uy) < 1e-9) return 0;   // tramo horizontal: la y no distingue puntos
    return (local ? v : (v - g.a.y)) / g.uy;
  }
  return v;
}
// Operación inversa: dada una distancia sobre el eje, el valor que hay que
// mostrar en el modo pedido. Con esto el cambio de modo CONVIERTE el número
// en vez de limitarse a reinterpretarlo, que movía la carga de sitio.
function posDesdeS(modo, g, s, local){
  if(modo === 'coordX') return (local ? 0 : g.a.x) + g.ux*s;
  if(modo === 'coordY') return (local ? 0 : g.a.y) + g.uy*s;
  return s;
}
// Etiqueta que corresponde al modo, para la interfaz.
function etiquetaPos(modo){
  return modo === 'coordX' ? 'Coordenada x'
       : modo === 'coordY' ? 'Coordenada y'
       : 'Distancia sobre el eje';
}

function trozoCargado(c){
  const t = tramos.find(z=>z.id===c.tramo);
  const g = t && geoTramo(t);
  if(!g) return null;
  let s1 = Math.max(0, Math.min(g.L, sDesdePos(c, g, c.pos)));
  let s2 = (c.posFin===undefined || c.posFin===null) ? g.L
           : Math.max(0, Math.min(g.L, sDesdePos(c, g, c.posFin)));
  if(s2 < s1){ const t2=s1; s1=s2; s2=t2; }
  return {g, s1, s2, len:s2-s1};
}
// ── Orientación de una carga ──
// 'global': la puntual va vertical hacia abajo, la axial horizontal y la
//   distribuida vertical, sea cual sea la inclinación del tramo.
// 'local' : la puntual y la distribuida se vuelven PERPENDICULARES al eje del
//   tramo, y la axial pasa a ser PARALELA a él.
// Devuelve el vector unitario en el que actúa una magnitud positiva.
function dirCarga(c, g){
  const local = (c.orient === 'local');
  if(!g) return {x:0, y:-1};
  if(c.tipo === 'PX'){
    // paralela al eje (sentido del tramo) o horizontal
    return local ? {x:g.ux, y:g.uy} : {x:1, y:0};
  }
  if(!local) return {x:0, y:-1};
  // Perpendicular al eje, apuntando "contra" la barra: para un tramo
  // horizontal debe coincidir con la vertical hacia abajo, así el cambio de
  // modo no altera el resultado en vigas rectas.
  const nx = -g.uy, ny = g.ux;
  const signo = (ny > 0) ? -1 : 1;
  return {x:nx*signo, y:ny*signo};
}

function accionesDeCarga(c){
  if(c.tipo === 'P' || c.tipo === 'PX' || c.tipo === 'M'){
    const P = puntoDeCarga(c);
    if(!P) return [];
    if(c.tipo === 'M') return [{x:P.x, y:P.y, fx:0, fy:0, m:c.mag}];
    const tt = tramos.find(z=>z.id===c.tramo), gg = tt && geoTramo(tt);
    const d = dirCarga(c, gg);
    return [{x:P.x, y:P.y, fx:c.mag*d.x, fy:c.mag*d.y, m:0}];
  }
  if(c.tipo === 'U' || c.tipo === 'T'){
    const z = trozoCargado(c);
    if(!z || z.len <= 1e-12) return [];
    const w1 = c.mag, w2 = (c.tipo==='U') ? c.mag : (c.mag2||0);
    const Ftot = (w1+w2)/2*z.len;
    const dc = (Math.abs(w1+w2) < 1e-12) ? z.len/2 : z.len*(w1+2*w2)/(3*(w1+w2));
    const sc = z.s1 + dc;
    const Q = {x:z.g.a.x + z.g.ux*sc, y:z.g.a.y + z.g.uy*sc};
    const d = dirCarga(c, z.g);
    return [{x:Q.x, y:Q.y, fx:Ftot*d.x, fy:Ftot*d.y, m:0}];
  }
  return [];
}
// ── Peso propio ──
// Un valor único en fuerza por unidad de longitud que se aplica a todos los
// tramos, siempre en dirección vertical y sobre la longitud real del eje.
// No se guarda como carga editable: es una propiedad de la estructura, así
// que se genera al vuelo y no ensucia la lista de cargas del usuario.
// ── Pesos propios ──
// Antes era un único valor global. Ahora son VARIOS valores con nombre, y
// cada tramo guarda cuál se le asignó (t.pesoId). Un tramo sin asignar no
// lleva peso: así se puede tener, por ejemplo, una viga y un tirante con
// secciones distintas en la misma estructura.
let pesos = [];            // [{id, nom, val}]
let pesoSeq = 0;
let pesoActivo = null;     // id del valor que se está pintando

function pesoDe(t){ return pesos.find(p=>p.id === t.pesoId) || null; }

function cargasPesoPropio(){
  const out = [];
  tramos.forEach(t=>{
    const p = pesoDe(t);
    if(!p || !p.val) return;
    out.push({id:'pp'+t.id, tipo:'U', destino:'tramo', tramo:t.id,
              pos:0, posFin:null, mag:p.val, mag2:p.val,
              orient:'global', basePos:'eje', _peso:true});
  });
  return out;
}

function abrirPeso(){
  document.getElementById('pesoLbl').textContent = 'Peso por ' + unitLen + ' (' + uDist() + ')';
  renderPesos();
  document.getElementById('pesoModal').classList.add('show');
}
function cerrarPeso(){ document.getElementById('pesoModal').classList.remove('show'); }

function renderPesos(){
  const el = document.getElementById('pesoLista');
  if(!el) return;
  if(!pesos.length){
    el.innerHTML = '<div class="list-empty">Todavía no hay valores. Crea uno abajo.</div>';
    return;
  }
  el.innerHTML = pesos.map(p=>{
    const n = tramos.filter(t=>t.pesoId === p.id).length;
    return '<div class="item-row' + (pesoActivo===p.id ? ' sel' : '') + '" '
      + 'onclick="elegirPeso(' + p.id + ')" style="cursor:pointer">'
      + '<div class="nm">' + escaparHTML(p.nom) + ' · <b>' + dec(p.val,'f') + ' ' + uDist() + '</b>'
      + (n ? ' <span class="loc">' + n + ' tramo' + (n>1?'s':'') + '</span>' : '') + '</div>'
      + '<button class="x" title="Borrar" onclick="event.stopPropagation();borrarPeso(' + p.id + ')">×</button>'
      + '</div>';
  }).join('');
}
function escaparHTML(t){
  return String(t).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function crearPeso(){
  const v = parseFloat(document.getElementById('pesoVal').value);
  if(!isFinite(v) || v <= 0){ aviso('Indica un peso mayor que cero.', 'error'); return; }
  const nom = (document.getElementById('pesoNom').value || '').trim()
              || ('Peso ' + (pesos.length + 1));
  registrarCambio();
  const p = {id:++pesoSeq, nom, val:v};
  pesos.push(p);
  pesoActivo = p.id;
  document.getElementById('pesoNom').value = '';
  document.getElementById('pesoVal').value = 0;
  renderPesos(); refrescar();
  aviso('Valor creado. Toca los tramos a los que quieras asignárselo.');
}
function elegirPeso(id){
  pesoActivo = (pesoActivo === id) ? null : id;
  renderPesos(); refrescar();
}
function borrarPeso(id){
  registrarCambio();
  pesos = pesos.filter(p=>p.id !== id);
  tramos.forEach(t=>{ if(t.pesoId === id) t.pesoId = null; });
  if(pesoActivo === id) pesoActivo = null;
  R = null; renderPesos(); refrescar();
}
// Herramienta: mientras está activa, tocar un tramo le asigna el valor
// elegido (o se lo quita, si ya lo tenía).
function activarPeso(){
  if(!pesos.length){ abrirPeso(); setTool('peso'); return; }
  setTool('peso');
  abrirPeso();
}
function asignarPesoATramo(idTramo){
  const t = tramos.find(z=>z.id === idTramo);
  if(!t) return false;
  if(pesoActivo === null){
    aviso('Elige antes un valor de peso en la lista.', 'error');
    return false;
  }
  registrarCambio();
  t.pesoId = (t.pesoId === pesoActivo) ? null : pesoActivo;
  R = null; renderPesos(); refrescar();
  return true;
}

function todasLasAcciones(){
  const out = [];
  cargasConPeso().forEach(c=>accionesDeCarga(c).forEach(a=>out.push(Object.assign({carga:c}, a))));
  return out;
}
// Cargas del usuario más las de peso propio, que es lo que ve el cálculo.
function cargasConPeso(){ return cargas.concat(cargasPesoPropio()); }
