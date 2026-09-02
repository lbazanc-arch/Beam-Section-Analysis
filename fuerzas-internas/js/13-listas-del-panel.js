// ═══════════════════════════════════════════════════════════
//  LISTAS DEL PANEL
// ═══════════════════════════════════════════════════════════
function setModoEdicion(m){
  modoEdic=m;
  document.getElementById('stNudos').classList.toggle('active', m==='nudos');
  document.getElementById('stTramos').classList.toggle('active', m==='tramos');
  document.getElementById('hintEdicion').textContent = (m==='nudos')
    ? 'Se editan las coordenadas de cada nudo.'
    : 'Se edita la longitud y la inclinación de cada tramo.';
  pintarListas();
}
function pintarListas(){
  // elementos
  const le=document.getElementById('listaElem');
  if(le){
    if(modoEdic==='nudos'){
      le.innerHTML = nodos.length ? nodos.map(n=>
        '<div class="item-row'+(selNodo===n.id?' sel':'')+'">'
        + '<div class="nm">'+n.nombre+'</div>'
        + '<input class="mini" type="number" step="any" value="'+n.x+'" title="x" '
        + 'onchange="editNodo('+n.id+',\'x\',this.value)">'
        + '<input class="mini" type="number" step="any" value="'+n.y+'" title="y" '
        + 'onchange="editNodo('+n.id+',\'y\',this.value)">'
        + '<button class="x" onclick="borrarNodo('+n.id+')">×</button></div>').join('')
        : '<div class="list-empty">Sin nudos todavía.</div>';
    } else {
      le.innerHTML = tramos.length ? tramos.map(t=>{
        const g=geoTramo(t); if(!g) return '';
        return '<div class="item-row'+(selTramo===t.id?' sel':'')+'">'
        + '<div class="nm">'+nomTramo(t)+'</div>'
        + '<input class="mini" type="number" step="any" value="'+(+g.L.toFixed(4))+'" title="longitud" '
        + 'onchange="editTramo('+t.id+',\'L\',this.value)">'
        + '<input class="mini" type="number" step="any" value="'+(+g.ang.toFixed(2))+'" title="inclinación" '
        + 'onchange="editTramo('+t.id+',\'A\',this.value)">'
        + '<button class="x" onclick="borrarTramo('+t.id+')">×</button></div>';
      }).join('') : '<div class="list-empty">Sin tramos todavía.</div>';
    }
  }
  // apoyos
  const la=document.getElementById('listaApoyos');
  if(la){
    la.innerHTML = nodos.length ? nodos.map(n=>
      '<div class="item-row"><div class="nm">'+n.nombre+'</div>'
      + '<select class="mini" style="width:104px" onchange="editApoyo('+n.id+',this.value)">'
      + ['libre','movil','simple','empotrado'].map(k=>
          '<option value="'+k+'"'+((n.apoyo||'libre')===k?' selected':'')+'>'+NOMBRE_APOYO[k]+'</option>').join('')
      + '</select>'
      + '<label style="font-size:9px;display:flex;align-items:center;gap:3px">'
      + '<input type="checkbox" '+(n.rotula?'checked':'')+' onchange="editRotula('+n.id+',this.checked)"> rótula</label>'
      + '</div>').join('') : '<div class="list-empty">Sin nudos.</div>';
  }
  // cargas
  const lc=document.getElementById('listaCargas');
  if(lc) lc.innerHTML = htmlArbolCargas();
  const si=document.getElementById('tbSelInfo');
  if(si){
    const p=[];
    if(selNodos.length) p.push(selNodos.length+' nudo'+(selNodos.length>1?'s':''));
    if(selTramos.length) p.push(selTramos.length+' tramo'+(selTramos.length>1?'s':''));
    if(selCargas.length) p.push(selCargas.length+' carga'+(selCargas.length>1?'s':''));
    si.textContent = p.length ? ('Seleccionado: '+p.join(', ')) : 'Nada seleccionado';
  }
}
// ═══════════════════════════════════════════════════════════
//  ÁRBOL DE CARGAS
//  Antes era una lista plana: con varias cargas no se sabía cuál pertenecía
//  a qué tramo. Ahora se agrupa por elemento (tramo o nudo) y, dentro, por
//  familia. Las cargas puestas sobre un NUDO aparecen bajo ese nudo, no bajo
//  un tramo al que no pertenecen.
// ═══════════════════════════════════════════════════════════
const CARGA_FAMILIA = {
  P : {nom:'Cargas puntuales',    ico:'↓'},
  U : {nom:'Cargas uniformes',    ico:'▭'},
  T : {nom:'Cargas variables',    ico:'◺'},
  M : {nom:'Momentos',            ico:'↻'}
};
const ORDEN_FAMILIA = ['P','U','T','M'];
// La puntual X dejó de ser un tipo aparte: un archivo antiguo sin normalizar
// todavía puede traerla, y debe listarse con las demás puntuales.
function familiaDeCarga(c){ return (c.tipo === 'PX') ? 'P' : c.tipo; }
let _arbolAbierto = {};          // qué elementos están desplegados

function alternarRamaCarga(clave){
  _arbolAbierto[clave] = !_arbolAbierto[clave];
  const lc = document.getElementById('listaCargas');
  if(lc) lc.innerHTML = htmlArbolCargas();
}

// Icono que indica el sentido real de la carga: dirección elegida y signo.
const _ICO_DIR = {
  y:     ['↓','↑'],       // [magnitud positiva, negativa]
  x:     ['→','←'],
  perp:  ['⇣','⇡'],
  axial: ['⇢','⇠']
};
function iconoSentido(c){
  if(c.tipo === 'M') return (c.mag < 0) ? '↻' : '↺';
  const par = _ICO_DIR[dirDeCarga(c)] || _ICO_DIR.y;
  return (c.mag < 0) ? par[1] : par[0];
}

function htmlArbolCargas(){
  if(!cargas.length) return '<div class="list-empty">Sin cargas colocadas.</div>';

  // Reparto por elemento: los de nudo van a su nudo, el resto a su tramo.
  const grupos = [];
  tramos.forEach(t=>{
    const propias = cargas.filter(c=>c.destino !== 'nudo' && c.tramo === t.id);
    if(propias.length) grupos.push({clave:'t'+t.id, tit:'Tramo '+nomTramo(t), cargas:propias});
  });
  nodos.forEach(n=>{
    const propias = cargas.filter(c=>c.destino === 'nudo' && c.nudo === n.id);
    if(propias.length) grupos.push({clave:'n'+n.id, tit:'Nudo '+n.nombre, cargas:propias});
  });
  const sueltas = cargas.filter(c=>
    (c.destino === 'nudo') ? !nodos.some(n=>n.id===c.nudo)
                           : !tramos.some(t=>t.id===c.tramo));
  if(sueltas.length) grupos.push({clave:'x', tit:'Sin elemento', cargas:sueltas});

  return grupos.map(g=>{
    const abierto = !!_arbolAbierto[g.clave];
    let h = '<div class="rama">'
      + '<div class="rama-cab" onclick="alternarRamaCarga(\'' + g.clave + '\')">'
      + '<span class="rama-fl">' + (abierto ? '▾' : '▸') + '</span>'
      + '<span class="rama-tit">' + g.tit + '</span>'
      + '<span class="rama-n">' + g.cargas.length + '</span>'
      + '</div>';
    if(abierto){
      h += '<div class="rama-cuerpo">';
      ORDEN_FAMILIA.forEach(f=>{
        const lista = g.cargas.filter(c=>familiaDeCarga(c) === f);
        if(!lista.length) return;      // la familia solo aparece si hay algo
        h += '<div class="fam">' + CARGA_FAMILIA[f].nom + '</div>';
        lista.forEach(c=>{
          const u = (c.tipo === 'M') ? uMom() : (c.tipo === 'U' || c.tipo === 'T') ? uDist() : unitFor;
          const val = (c.tipo === 'T')
            ? dec(c.mag, c.tipo==='M'?'mom':'f') + ' → ' + dec(c.mag2||0, 'f')
            : dec(c.mag, c.tipo==='M'?'mom':'f');
          h += '<div class="item-row">'
            + '<span class="sent" title="sentido">' + iconoSentido(c) + '</span>'
            + '<div class="nm">' + val + ' ' + u
            + ((c.tipo !== 'M' && dirDeCarga(c) !== 'y')
                ? ' <span class="loc">' + (DIR_CARGA[dirDeCarga(c)]||{}).nom + '</span>' : '') + '</div>'
            + '<button class="x" title="Editar" onclick="editarCarga(' + c.id + ')">✎</button>'
            + '<button class="x" title="Borrar" onclick="borrarCarga(' + c.id + ')">×</button>'
            + '</div>';
        });
      });
      h += '</div>';
    }
    return h + '</div>';
  }).join('');
}

function editNodo(id,campo,v){
  const n=nodo(id), val=parseFloat(v);
  if(n && isFinite(val)){ n[campo]=val; R=null; } refrescar();
}
function editTramo(id,campo,v){
  const t=tramos.find(z=>z.id===id), g=t&&geoTramo(t), val=parseFloat(v);
  if(!g || !isFinite(val)) return;
  const L = campo==='L' ? val : g.L;
  const A = campo==='A' ? val : g.ang;
  const rad=A*Math.PI/180;
  const nx=g.a.x+L*Math.cos(rad), ny=g.a.y+L*Math.sin(rad);
  const ddx=nx-g.b.x, ddy=ny-g.b.y;
  const cad=cadena(); const idx=cad.findIndex(e=>e.t.id===t.id);
  g.b.x=nx; g.b.y=ny;
  if(idx>=0) for(let i=idx+1;i<cad.length;i++){ cad[i].hasta.x+=ddx; cad[i].hasta.y+=ddy; }
  R=null; centrar(); refrescar();
}
function editApoyo(id,v){ registrarCambio(); const n=nodo(id); if(n){ n.apoyo=v; R=null; } refrescar(); }
function editRotula(id,v){ registrarCambio(); const n=nodo(id); if(n){ n.rotula=v; R=null; } refrescar(); }
function editCargaMag(id,v){
  const c=cargas.find(z=>z.id===id), val=parseFloat(v);
  if(c && isFinite(val)){ c.mag=val; if(c.tipo==='U') c.mag2=val; R=null; } refrescar();
}
function borrarNodo(id){
  registrarCambio();
  tramos=tramos.filter(t=>t.a!==id && t.b!==id);
  cargas=cargas.filter(c=>tramos.some(t=>t.id===c.tramo));
  nodos=nodos.filter(n=>n.id!==id);
  reNombrar(); R=null; refrescar();
}
function borrarTramo(id){
  registrarCambio();
  tramos=tramos.filter(t=>t.id!==id);
  cargas=cargas.filter(c=>c.tramo!==id);
  R=null; refrescar();
}
function refrescar(){ dibujar(); pintarListas(); }
