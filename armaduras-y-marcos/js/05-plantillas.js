// ═══════════════════════════════════════════════════════════
//  PLANTILLAS
// ═══════════════════════════════════════════════════════════
function generarPlantilla(){
  const L = parseFloat(document.getElementById('tplL').value) || 12;
  const Hh = parseFloat(document.getElementById('tplH').value) || 3;
  const n = Math.max(2, Math.min(10, parseInt(document.getElementById('tplN').value) || 4));
  nodos = []; barras = []; nodoSeq = 0; barraSeq = 0; resultado = null;
  const p = L/n;

  const inf = [], sup = [];
  for(let i=0;i<=n;i++) inf.push(addNodo(i*p, 0));

  if(tipoTpl === 'warren'){
    for(let i=0;i<n;i++) sup.push(addNodo(i*p + p/2, Hh));
    for(let i=0;i<n;i++) addBarra(inf[i].id, inf[i+1].id);
    for(let i=0;i<sup.length-1;i++) addBarra(sup[i].id, sup[i+1].id);
    for(let i=0;i<n;i++){ addBarra(inf[i].id, sup[i].id); addBarra(sup[i].id, inf[i+1].id); }
  } else {
    for(let i=1;i<n;i++) sup.push(addNodo(i*p, Hh));
    for(let i=0;i<n;i++) addBarra(inf[i].id, inf[i+1].id);
    for(let i=0;i<sup.length-1;i++) addBarra(sup[i].id, sup[i+1].id);
    // montantes
    for(let i=0;i<sup.length;i++) addBarra(inf[i+1].id, sup[i].id);
    // cuerdas extremas
    addBarra(inf[0].id, sup[0].id);
    addBarra(sup[sup.length-1].id, inf[n].id);
    // diagonales: Howe hacia el centro, Pratt hacia los extremos
    const medio = n/2;
    for(let i=0;i<sup.length-1;i++){
      const izq = (i+1) < medio;
      if(tipoTpl === 'howe'){
        if(izq) addBarra(inf[i+1].id, sup[i+1].id ? sup[i+1].id : sup[i].id);
        else    addBarra(sup[i].id, inf[i+2].id);
      } else {
        if(izq) addBarra(sup[i].id, inf[i+2].id);
        else    addBarra(inf[i+1].id, sup[i+1].id);
      }
    }
  }
  // apoyos en los extremos inferiores
  inf[0].apoyo = 'fijo';
  inf[n].apoyo = 'movil';
  reNombrar();
  centrar(); refrescar();
}

function cargarEjemplo(){
  nodos = []; barras = []; nodoSeq = 0; barraSeq = 0; resultado = null;
  const A = addNodo(0,0), B = addNodo(4,0), C = addNodo(8,0);
  const D = addNodo(2,3), E = addNodo(6,3);
  addBarra(A.id,B.id); addBarra(B.id,C.id);
  addBarra(A.id,D.id); addBarra(D.id,E.id); addBarra(E.id,C.id);
  addBarra(D.id,B.id); addBarra(E.id,B.id);
  A.apoyo = 'fijo'; C.apoyo = 'movil';
  B.fy = -20;
  reNombrar(); centrar(); refrescar(); resolver();
}
