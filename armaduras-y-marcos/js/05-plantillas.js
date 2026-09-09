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

// ═══════════════════════════════════════════════════════════
//  EJEMPLOS DE VERIFICACIÓN (propuesta F, 2026-09-08)
//  Casos de Hibbeler cap. 6 reformulados con datos propios y resueltos a mano
//  por el método de nudos. `esperado` lleva la fuerza de cada barra (T > 0,
//  C < 0) con el nombre que le pone reNombrar; al cargar el ejemplo se
//  contrasta con el motor y, si alguna se desvía más del 0.1 %, avisa por
//  consola («Ejemplo <id>: F_AB se desvía»).
// ═══════════════════════════════════════════════════════════
const EJEMPLOS = [
  {
    id:'simple',
    nom:'Armadura triangular con carga central',
    desc:'Cinco nudos: A (pasador), B, C (rodillo) en la base de 8 m y D, E a 3 m de altura. 20 kN hacia abajo en B.',
    esperado:{AB:6.67, BC:6.67, AD:-12.02, DE:-13.33, EC:-12.02, DB:12.02, EB:12.02},
    ref:'Simétrica: R_A = R_C = 10 kN. En A, F_AD = −10/sen 56.31° = −12.02 (C) y F_AB = 6.67 (T); las demás por simetría y por el nudo D.',
    armar(){
      const A = addNodo(0,0), B = addNodo(4,0), C = addNodo(8,0);
      const D = addNodo(2,3), E = addNodo(6,3);
      addBarra(A.id,B.id); addBarra(B.id,C.id);
      addBarra(A.id,D.id); addBarra(D.id,E.id); addBarra(E.id,C.id);
      addBarra(D.id,B.id); addBarra(E.id,B.id);
      A.apoyo = 'fijo'; C.apoyo = 'movil';
      ponerCargaNudo(B, 20, 0);
    }
  },
  {
    id:'fuerza-cero',
    nom:'Barra de fuerza cero por inspección',
    desc:'Triángulo A–C–D (base 8 m, altura 3 m) con montante DB en el centro. 10 kN hacia abajo en D. Como Hibbeler ej. 6.4.',
    esperado:{AB:6.67, BC:6.67, AD:-8.33, DC:-8.33, DB:0},
    ref:'En B concurren tres barras, dos colineales (AB y BC) y sin carga: F_DB = 0. Luego F_AD = −5/sen 36.87° = −8.33 (C) y F_AB = 6.67 (T).',
    armar(){
      const A = addNodo(0,0), B = addNodo(4,0), C = addNodo(8,0), D = addNodo(4,3);
      addBarra(A.id,B.id); addBarra(B.id,C.id); addBarra(A.id,D.id); addBarra(D.id,C.id); addBarra(D.id,B.id);
      A.apoyo = 'fijo'; C.apoyo = 'movil';
      ponerCargaNudo(D, 10, 0);
    }
  },
  {
    id:'reacciones-primero',
    nom:'Primero las reacciones: ningún nudo empieza con dos incógnitas',
    desc:'Base A–B–C de 6 m, cordón superior D–E a 3 m sobre A y B, diagonales DB y EC. 15 kN en B y 10 kN en E, hacia abajo. Como Hibbeler ej. 6.3.',
    esperado:{AB:0, BC:12.5, AD:-12.5, DE:-12.5, EC:-17.68, DB:17.68, EB:2.5},
    ref:'Sin las reacciones, A tiene cuatro incógnitas y D tres. Con R_yA = R_yC = 12.5 kN: F_AD = −12.5 (C), F_AB = 0, F_DB = 17.68 (T), F_DE = −12.5 (C), F_EC = −17.68 (C), F_BC = 12.5 (T), F_EB = 2.5 (T).',
    armar(){
      const A = addNodo(0,0), B = addNodo(3,0), C = addNodo(6,0), D = addNodo(0,3), E = addNodo(3,3);
      addBarra(A.id,B.id); addBarra(B.id,C.id); addBarra(A.id,D.id); addBarra(D.id,E.id); addBarra(E.id,C.id);
      addBarra(D.id,B.id); addBarra(E.id,B.id);
      A.apoyo = 'fijo'; C.apoyo = 'movil';
      ponerCargaNudo(B, 15, 0); ponerCargaNudo(E, 10, 0);
    }
  },
  {
    id:'secciones',
    nom:'Armadura de nueve barras para el método de secciones',
    desc:'Base A–B–C–D de 9 m, cordón superior E–F a 3 m sobre B y C, diagonal EC. 20 kN hacia abajo en B. Como Hibbeler ej. 6.5: un corte por BC, EC y EF deja tres incógnitas.',
    esperado:{AB:13.33, BC:13.33, CD:6.67, AE:-18.86, EF:-6.67, FD:-9.43, BE:20, CF:6.67, EC:-9.43},
    ref:'R_yA = 13.33, R_yD = 6.67 kN. F_AE = −18.86 (C), F_AB = F_BC = 13.33 (T), F_BE = 20 (T), F_EC = −9.43 (C), F_EF = −6.67 (C), F_FD = −9.43 (C), F_CD = F_CF = 6.67 (T).',
    armar(){
      const A = addNodo(0,0), B = addNodo(3,0), C = addNodo(6,0), D = addNodo(9,0), E = addNodo(3,3), F = addNodo(6,3);
      addBarra(A.id,B.id); addBarra(B.id,C.id); addBarra(C.id,D.id);
      addBarra(A.id,E.id); addBarra(E.id,F.id); addBarra(F.id,D.id);
      addBarra(B.id,E.id); addBarra(C.id,F.id); addBarra(E.id,C.id);
      A.apoyo = 'fijo'; D.apoyo = 'movil';
      ponerCargaNudo(B, 20, 0);
    }
  }
];

function abrirEjemplos(){
  const el = document.getElementById('ejLista');
  const lista = EJEMPLOS.concat(typeof EJEMPLOS_MARCO !== 'undefined' ? EJEMPLOS_MARCO : []);   // bastidores (19-)
  if(el) el.innerHTML = lista.map((e,i)=>
      '<button type="button" class="ej-item" onclick="cargarEjemplo(\'' + e.id + '\')">'
    + '<div class="ej-cab"><span class="ej-num">' + (i+1) + '</span><span class="ej-nom">' + e.nom + '</span></div>'
    + '<div class="ej-desc">' + e.desc + '</div>'
    + '<div class="ej-ref"><b>Referencia:</b> ' + e.ref + '</div>'
    + '</button>').join('');
  const m = document.getElementById('ejModal');
  if(m) m.classList.add('show');
}
function cerrarEjemplos(){ const m = document.getElementById('ejModal'); if(m) m.classList.remove('show'); }

// Contrasta el resultado del motor con el valor de referencia del ejemplo.
function comprobarEjemplo(ej){
  if(!ej || !ej.esperado || !resultado || resultado.error) return;
  const escalaF = Math.max(1, ...Object.values(ej.esperado).map(v=>Math.abs(v)));
  let desvios = 0;
  Object.keys(ej.esperado).forEach(nombre=>{
    const b = barras.find(x=>nombreBarra(x) === nombre);
    if(!b){ console.warn('Ejemplo ' + ej.id + ': no existe la barra ' + nombre); desvios++; return; }
    const f = resultado.fuerzas[b.id] || 0, e = ej.esperado[nombre];
    // 0.1 % de la mayor fuerza del ejemplo (los valores de referencia van con dos decimales)
    if(Math.abs(f - e) > Math.max(1e-3*escalaF, 0.006)){
      console.warn('Ejemplo ' + ej.id + ': F_' + nombre + ' se desvía de la referencia', {motor:f, referencia:e});
      desvios++;
    }
  });
  return desvios;
}

// Sin argumento carga el primero, para no romper llamadas antiguas.
function cargarEjemplo(id){
  const lista = EJEMPLOS.concat(typeof EJEMPLOS_MARCO !== 'undefined' ? EJEMPLOS_MARCO : []);
  const ej = lista.find(e=>e.id === id) || EJEMPLOS[0];
  nodos = []; barras = []; nodoSeq = 0; barraSeq = 0; resultado = null;
  ej.armar();
  normalizarCargasArm();          // deja todo en el convenio vigente (19-marcos.js)
  reNombrar(); centrar(); refrescar(); resolver();
  if(ej.marco) comprobarEjemploMarco(ej); else comprobarEjemplo(ej);
  cerrarEjemplos();
}
