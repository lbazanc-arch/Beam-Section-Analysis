// ═══════════════════════════════════════════════════════════
//  PLANTILLAS
// ═══════════════════════════════════════════════════════════
function generarPlantilla(){
  const L = parseFloat(document.getElementById('tplL').value) || 12;
  const Hh = parseFloat(document.getElementById('tplH').value) || 3;
  const n = Math.max(2, Math.min(10, parseInt(document.getElementById('tplN').value) || 4));
  // Un solo paso de deshacer, tomado ANTES de vaciar el modelo: con uno por nudo
  // y por barra, el primero ya guardaba el modelo vacío y una plantilla grande
  // echaba de la pila (MAX_HISTORIAL) el estado anterior.
  // Un toque de la herramienta Carga en espera apunta a un id del modelo que se
  // va: al vencer abriría la ventana sobre el nudo que herede ese id.
  cancelarToqueCarga();
  registrarCambio();
  nodos = []; barras = []; nodoSeq = 0; barraSeq = 0;
  // La selección y la línea de corte eran del modelo anterior; con los ids
  // empezando otra vez en 1, la selección marcaría otros nudos.
  selNodos = []; selBarras = []; selBarra = null; selNodoInfo = null; selNodo = null;
  corte = null; corteDrag = null;
  invalidarResultados();
  const p = L/n;

  const inf = [], sup = [];
  for(let i=0;i<=n;i++) inf.push(addNodo(i*p, 0, true));

  if(tipoTpl === 'warren'){
    for(let i=0;i<n;i++) sup.push(addNodo(i*p + p/2, Hh, true));
    for(let i=0;i<n;i++) addBarra(inf[i].id, inf[i+1].id, true);
    for(let i=0;i<sup.length-1;i++) addBarra(sup[i].id, sup[i+1].id, true);
    for(let i=0;i<n;i++){ addBarra(inf[i].id, sup[i].id, true); addBarra(sup[i].id, inf[i+1].id, true); }
  } else {
    for(let i=1;i<n;i++) sup.push(addNodo(i*p, Hh, true));
    for(let i=0;i<n;i++) addBarra(inf[i].id, inf[i+1].id, true);
    for(let i=0;i<sup.length-1;i++) addBarra(sup[i].id, sup[i+1].id, true);
    // montantes
    for(let i=0;i<sup.length;i++) addBarra(inf[i+1].id, sup[i].id, true);
    // cuerdas extremas
    addBarra(inf[0].id, sup[0].id, true);
    addBarra(sup[sup.length-1].id, inf[n].id, true);
    // diagonales: Howe hacia el centro, Pratt hacia los extremos
    const medio = n/2;
    for(let i=0;i<sup.length-1;i++){
      const izq = (i+1) < medio;
      if(tipoTpl === 'howe'){
        if(izq) addBarra(inf[i+1].id, sup[i+1].id ? sup[i+1].id : sup[i].id, true);
        else    addBarra(sup[i].id, inf[i+2].id, true);
      } else {
        if(izq) addBarra(sup[i].id, inf[i+2].id, true);
        else    addBarra(inf[i+1].id, sup[i+1].id, true);
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
//  `armar()` crea sin registro (addNodo/addBarra con `true`): cargarEjemplo abre
//  UN paso de deshacer antes de vaciar el modelo, como generarPlantilla.
// ═══════════════════════════════════════════════════════════
const EJEMPLOS = [
  {
    id:'simple',
    nom:'Armadura triangular con carga central',
    desc:'Cinco nudos: A (pasador), B, C (rodillo) en la base de 8 m y D, E a 3 m de altura. 20 kN hacia abajo en B.',
    esperado:{AB:6.67, BC:6.67, AD:-12.02, DE:-13.33, EC:-12.02, DB:12.02, EB:12.02},
    ref:'Simétrica: R_A = R_C = 10 kN. En A, F_AD = −10/sen 56.31° = −12.02 (C) y F_AB = 6.67 (T); las demás por simetría y por el nudo D.',
    armar(){
      const A = addNodo(0,0, true), B = addNodo(4,0, true), C = addNodo(8,0, true);
      const D = addNodo(2,3, true), E = addNodo(6,3, true);
      addBarra(A.id,B.id, true); addBarra(B.id,C.id, true);
      addBarra(A.id,D.id, true); addBarra(D.id,E.id, true); addBarra(E.id,C.id, true);
      addBarra(D.id,B.id, true); addBarra(E.id,B.id, true);
      A.apoyo = 'fijo'; C.apoyo = 'movil';
      ponerCargaNudo(B, 20, 0);
    }
  },
  {
    id:'fuerza-cero',
    nom:'Barra de fuerza cero por inspección',
    desc:'Triángulo A–C–D (base 8 m, altura 3 m) con montante DB en el centro. 10 kN hacia abajo en D.',
    esperado:{AB:6.67, BC:6.67, AD:-8.33, DC:-8.33, DB:0},
    ref:'En B concurren tres barras, dos colineales (AB y BC) y sin carga: F_DB = 0. Luego F_AD = −5/sen 36.87° = −8.33 (C) y F_AB = 6.67 (T).',
    armar(){
      const A = addNodo(0,0, true), B = addNodo(4,0, true), C = addNodo(8,0, true), D = addNodo(4,3, true);
      addBarra(A.id,B.id, true); addBarra(B.id,C.id, true); addBarra(A.id,D.id, true); addBarra(D.id,C.id, true); addBarra(D.id,B.id, true);
      A.apoyo = 'fijo'; C.apoyo = 'movil';
      ponerCargaNudo(D, 10, 0);
    }
  },
  {
    id:'reacciones-primero',
    nom:'Primero las reacciones: ningún nudo empieza con dos incógnitas',
    desc:'Base A–B–C de 6 m, cordón superior D–E a 3 m sobre A y B, diagonales DB y EC. 15 kN en B y 10 kN en E, hacia abajo.',
    esperado:{AB:0, BC:12.5, AD:-12.5, DE:-12.5, EC:-17.68, DB:17.68, EB:2.5},
    ref:'Sin las reacciones, A tiene cuatro incógnitas y D tres. Con R_yA = R_yC = 12.5 kN: F_AD = −12.5 (C), F_AB = 0, F_DB = 17.68 (T), F_DE = −12.5 (C), F_EC = −17.68 (C), F_BC = 12.5 (T), F_EB = 2.5 (T).',
    armar(){
      const A = addNodo(0,0, true), B = addNodo(3,0, true), C = addNodo(6,0, true), D = addNodo(0,3, true), E = addNodo(3,3, true);
      addBarra(A.id,B.id, true); addBarra(B.id,C.id, true); addBarra(A.id,D.id, true); addBarra(D.id,E.id, true); addBarra(E.id,C.id, true);
      addBarra(D.id,B.id, true); addBarra(E.id,B.id, true);
      A.apoyo = 'fijo'; C.apoyo = 'movil';
      ponerCargaNudo(B, 15, 0); ponerCargaNudo(E, 10, 0);
    }
  },
  {
    id:'secciones',
    nom:'Armadura de nueve barras para el método de secciones',
    desc:'Base A–B–C–D de 9 m, cordón superior E–F a 3 m sobre B y C, diagonal EC. 20 kN hacia abajo en B. Un corte por BC, EC y EF deja tres incógnitas.',
    esperado:{AB:13.33, BC:13.33, CD:6.67, AE:-18.86, EF:-6.67, FD:-9.43, BE:20, CF:6.67, EC:-9.43},
    ref:'R_yA = 13.33, R_yD = 6.67 kN. F_AE = −18.86 (C), F_AB = F_BC = 13.33 (T), F_BE = 20 (T), F_EC = −9.43 (C), F_EF = −6.67 (C), F_FD = −9.43 (C), F_CD = F_CF = 6.67 (T).',
    armar(){
      const A = addNodo(0,0, true), B = addNodo(3,0, true), C = addNodo(6,0, true), D = addNodo(9,0, true), E = addNodo(3,3, true), F = addNodo(6,3, true);
      addBarra(A.id,B.id, true); addBarra(B.id,C.id, true); addBarra(C.id,D.id, true);
      addBarra(A.id,E.id, true); addBarra(E.id,F.id, true); addBarra(F.id,D.id, true);
      addBarra(B.id,E.id, true); addBarra(C.id,F.id, true); addBarra(E.id,C.id, true);
      A.apoyo = 'fijo'; D.apoyo = 'movil';
      ponerCargaNudo(B, 20, 0);
    }
  }
];

function abrirEjemplos(){
  const el = document.getElementById('ejLista');
  const lista = EJEMPLOS;
  // Un solo ejemplo a la vista; los demás siguen en el código como casos de
  // verificación, que es lo que contrasta la consola (CLAUDE.md §4).
  if(el) el.innerHTML = lista.slice(0,1).map((e,i)=>
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
  const lista = EJEMPLOS;
  const ej = lista.find(e=>e.id === id) || EJEMPLOS[0];
  // Como generarPlantilla: la espera de Carga apunta al modelo que se va, y un
  // solo paso de deshacer, tomado ANTES de vaciar. Con uno por nudo y por barra
  // ('secciones' apilaba 15) deshacer recorría la armadura a medio construir.
  cancelarToqueCarga();
  registrarCambio();
  // Sin invalidarResultados: resolver() vuelve a pintar el panel al final.
  nodos = []; barras = []; nodoSeq = 0; barraSeq = 0; resultado = null;
  // La selección apuntaba al modelo anterior, y como los ids vuelven a empezar
  // en 1 pasaría a marcar otros nudos.
  selNodos = []; selBarras = []; selBarra = null; selNodoInfo = null; selNodo = null;
  // La línea de corte también era del modelo anterior (ningún ejemplo trae la suya).
  corte = null; corteDrag = null;
  ej.armar();
  normalizarCargasArm();          // deja todo en el convenio vigente (10-modales.js)
  reNombrar(); centrar(); refrescar(); resolver();
  comprobarEjemplo(ej);
  cerrarEjemplos();
}
