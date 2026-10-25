/* ── Avisos no bloqueantes ──
   El diálogo nativo queda silenciado en móvil: la acción parecía no tener efecto. */
let _avisoTimer = null;
function aviso(msg, tipo){
  let c = document.getElementById('avisoCaja');
  if(!c){
    c = document.createElement('div');
    c.id = 'avisoCaja';
    c.className = 'aviso-caja';
    const t = document.createElement('span');
    t.id = 'avisoTxt';
    const x = document.createElement('button');
    x.className = 'aviso-x'; x.type = 'button';
    x.setAttribute('aria-label','Cerrar aviso');
    x.textContent = '\u00d7';
    x.addEventListener('click', cerrarAviso);
    c.appendChild(t); c.appendChild(x);
    document.body.appendChild(c);
  }
  document.getElementById('avisoTxt').textContent = msg;
  c.classList.toggle('error', tipo === 'error');
  c.classList.add('visible');
  if(_avisoTimer) clearTimeout(_avisoTimer);
  _avisoTimer = setTimeout(cerrarAviso, 4500);
}

function renderKatex(root){
  if(!window.katex) return;
  root.querySelectorAll('.ktx').forEach(el=>{
    if(el.getAttribute('data-done')) return;
    try{ katex.render(el.getAttribute('data-tex'), el, {throwOnError:false, displayMode: el.getAttribute('data-display')==='1'}); el.setAttribute('data-done','1'); }
    catch(e){ el.textContent = el.getAttribute('data-tex'); }
  });
}

// ═══════════════════════════════════════════════════════════
//  BSA — Cap. 7 · Fuerzas internas en vigas y pórticos
//  La viga se construye como una cadena de tramos entre nudos con
//  coordenadas, de modo que puede tener tramos inclinados. Las
//  fuerzas internas se obtienen sobre el EJE LOCAL de cada tramo.
// ═══════════════════════════════════════════════════════════
// nodos: {id,x,y,nombre,apoyo:'libre'|'movil'|'simple'|'empotrado',rotula:bool,
//         apAng   — solo el MÓVIL: dirección de su única reacción (entra en el cálculo),
//         apAngDib— solo el SIMPLE: giro del símbolo, presentación pura}
let nodos = [];
let tramos = [];   // {id,a,b}
let cargas = [];   // {id,tipo,tramo,pos,pos2,mag,mag2}
let nodoSeq = 0, tramoSeq = 0, cargaSeq = 0;
// Cuerdas, bielas y topes (22-, 2026-10-18): {id, tipo, a, b|null, ang}. Se
// declaran aquí porque los usan piezas que se cargan antes (deshacer, dibujo).
let vinculos = [], vinculoSeq = 0;
let tipoVinculoPendiente = null, vinculoPrimerNudo = null;
// Primer punto tocado con la herramienta «Tramo curvo» (23-), {id|null, x, y}:
// lo lee el dibujo, que va antes.
let curvoPrimer = null;
let tool = 'pan', modoConstr = 'nudos', modoEdic = 'nudos';
let selNodos = [], selTramos = [], selCargas = [];
let selNodo = null, selTramo = null, primerNodo = null;
let gesto = null;   // gesto unificado del botón "Mover / editar" (criterio cap9)
const UMBRAL_ARRASTRE = 4, UMBRAL_MANTENER_MS = 450;
let R = null;
let unitLen = 'm', unitFor = 'kN';
let DEC = {len:2, fuerza:2, momento:2, ang:2};
let cv, ctx, W = 0, H = 0, vx = 0, vy = 0, escala = 60;
let panDrag = null, mouseW = null;

// ── Visibilidad de capas del dibujo (criterio cap6) ──
// Solo afecta a lo que se ve; el cálculo usa siempre el modelo completo.
const VIS = {grilla:true, ejes:true, cotas:true, cargas:true, peso:true, apoyos:true, leyenda:true};
function setVis(cual, valor){ VIS[cual] = !!valor; dibujar(); }
let edNodo = null, edTramo = null, edApoyo = null, edCarga = null;
// Tipo de carga ('P'|'U'|'T'|'M') elegido en el menú «Cargas» mientras la
// herramienta 'carga' está activa; setTool lo vacía al cambiar de herramienta.
let tipoCargaPendiente = null;
// Toque simple con la herramienta 'carga' en espera (2026-09-14, decisión del
// profesor): no abre la ventana en el acto, sino tras UMBRAL_DOBLE_TOQUE_MS,
// para que un doble toque sobre una carga ya puesta la edite en vez de crear
// otra. Guarda {tId, tipo, destino} (destino con ids, no objetos) o null.
// Van aquí, antes de cualquier pieza que arme el temporizador (CLAUDE.md §5.3).
// La espera tiene que DURAR MÁS que la ventana del doble toque del puente
// táctil (350 ms en 18-, medidos desde el mismo touchstart que llama a onDown):
// si vence antes, la ventana de carga nueva ya está abierta, tapa el lienzo y el
// segundo toque cae en ella, no en onDbl. 400 deja margen a un hilo ocupado.
const UMBRAL_DOBLE_TOQUE_MS = 400;
let toqueCargaPendiente = null;

const LEN_A_M = {m:1, cm:0.01, ft:0.3048};
const FOR_A_KN = {kN:1, N:0.001, ton:9.80665, lb:0.00444822};
const GRADOS = {libre:0, movil:1, simple:2, empotrado:3};
// ── Ángulo de un apoyo ──
// OJO: aquí viven los ángulos INTERNOS, que no son los que escribe el alumno.
// El interno es la dirección en la que EMPUJA la reacción, desde +x y
// antihoraria; el que se teclea en la ventana señala DÓNDE SE APOYA el nudo
// (−90° suelo, 0° pared derecha, 180° pared izquierda, 90° techo) y es
// exactamente el opuesto. La media vuelta la da `bsaAnguloOpuesto`
// (core/comun.js) en el borde de la ventana, así que lo guardado en el
// archivo del ejercicio nunca ha cambiado de significado.
// Por defecto, 90° internos: la reacción sube, que es el rodillo apoyado en el
// suelo de siempre y el pasador dibujado debajo del nudo.
const AP_ANG_DEF = 90;
// Dirección (radianes, plano con y hacia arriba) en la que EMPUJA la reacción
// de un apoyo móvil: es directamente el ángulo que escribió el usuario.
// Hasta el 2026-09-10 `apAng` significaba «hacia dónde cuelga el símbolo desde
// el nudo» y aquí se le sumaban 180°; ahora el campo YA es la dirección de la
// reacción, así que no hay nada que girar.
function angReaccion(n){
  const a = (n.apAng === undefined) ? AP_ANG_DEF : n.apAng;
  return a * Math.PI/180;
}
// Ángulo con el que se DIBUJA el símbolo del apoyo, en la misma convención.
// La distinción importa: en el móvil ese ángulo es la dirección real de su
// única reacción y entra en el cálculo; en el simple es solo presentación —un
// pasador sujeta las dos direcciones se dibuje como se dibuje—, así que vive en
// otra propiedad (`apAngDib`) que ningún motor lee.
function anguloApoyo(n){
  if(!n) return AP_ANG_DEF;
  if(n.apoyo === 'movil')  return (n.apAng    === undefined) ? AP_ANG_DEF : n.apAng;
  if(n.apoyo === 'simple') return (n.apAngDib === undefined) ? AP_ANG_DEF : n.apAngDib;
  return AP_ANG_DEF;
}
const NOMBRE_APOYO = {libre:'Libre', movil:'Móvil', simple:'Simple / articulado', empotrado:'Empotrado'};

function dec(v,t){
  // 'mom' y 'momento' son lo mismo: el PDF escribe 'momento' y aquí solo se
  // conocía 'mom', así que sus momentos salían con los decimales de FUERZA.
  const d = t==='len' ? DEC.len : ((t==='mom' || t==='momento') ? DEC.momento
          : (t==='ang' ? DEC.ang : DEC.fuerza));
  const n = Number(v);
  if(!isFinite(n)) return '0';
  const s = (Math.abs(n) < 5e-11 ? 0 : n).toFixed(d);
  // Un valor que redondea a cero se escribe sin signo: «−0.00» no dice nada.
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}
function esCero(v){ return Math.abs(v) < 1e-9; }
function kx(tex){
  const e = String(tex).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
                       .replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<span class="ktx" data-tex="'+e+'"></span>';
}
function uMom(){ return unitFor+'·'+unitLen; }
function uDist(){ return unitFor+'/'+unitLen; }
function nombreNodo(i){ const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return i<26?L[i]:L[i%26]+Math.floor(i/26); }
function reNombrar(){ nodos.forEach((n,i)=>n.nombre = nombreNodo(i)); }
function nodo(id){ return nodos.find(n=>n.id===id); }
function nomTramo(t){ const a=nodo(t.a), b=nodo(t.b); return (a&&b)? a.nombre+b.nombre : '?'; }

// ── Geometría de un tramo ──
// Un tramo CURVO (2026-10-25, petición del profesor) es un arco de circunferencia
// entre sus dos nudos y guarda su FLECHA (`t.flecha`, con signo), como en presión
// de fluidos: el radio, el lado y el arco mayor son una conversión de borde de su
// ventana (`flechaDesdeRadio`, `radioDesdeFlecha`). En un arco, `L` es la LONGITUD
// DEL ARCO —la distancia s sobre el eje, que es lo que miden las posiciones— y
// `ux`, `uy`, `ang` son los de la cuerda; el punto y la tangente a una distancia s
// los da `puntoEnTramo`, que vale para los dos. Sin `flecha` (o con 0) el tramo
// es recto y todo sigue como siempre.
function geoTramo(t){
  const a = nodo(t.a), b = nodo(t.b);
  if(!a||!b) return null;
  const dx = b.x-a.x, dy = b.y-a.y;
  const c = Math.hypot(dx,dy) || 1e-9;
  const arco = arcoDeTramo(t);
  const L = arco ? arco.R*Math.abs(arco.d) : c;
  return {a, b, dx, dy, L, ux:dx/c, uy:dy/c, nx:-dy/c, ny:dx/c,
          ang: Math.atan2(dy,dx)*180/Math.PI, arco, cuerda:c};
}
function esArco(t){ return !!(t && Math.abs(+t.flecha || 0) > 1e-12); }
// El arco de a a b con flecha f: centro (cx, cy), radio R, ángulo t1 del radio
// que va a `a` y giro d (con signo) de `a` a `b`. Copia del de presión de
// fluidos (01-), con el mismo convenio de la flecha: no se comparte (§5.4).
function arcoEntre(a, b, f){
  if(!a || !b || Math.abs(f || 0) < 1e-12) return null;
  const dx = b.x-a.x, dy = b.y-a.y, c = Math.hypot(dx,dy);
  if(c < 1e-12) return null;
  const Rr = (c*c/4 + f*f)/(2*Math.abs(f));
  const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
  const ux = dx/c, uy = dy/c, nx = -uy, ny = ux;
  const h = Math.sqrt(Math.max(0, Rr*Rr - c*c/4));
  const sg = f >= 0 ? 1 : -1;
  const cx = mx - nx*h*sg, cy = my - ny*h*sg;
  let t1 = Math.atan2(a.y-cy, a.x-cx), t2 = Math.atan2(b.y-cy, b.x-cx);
  let d = t2 - t1;
  while(d >  Math.PI) d -= 2*Math.PI;
  while(d < -Math.PI) d += 2*Math.PI;
  const mayor = Math.abs(f) > c/2;
  if(mayor){ d = d > 0 ? d - 2*Math.PI : d + 2*Math.PI; }
  const bx = (mayor ? -nx : nx)*sg, by = (mayor ? -ny : ny)*sg;
  const tm = t1 + d/2;
  if(Math.cos(tm)*bx + Math.sin(tm)*by < 0) d = d > 0 ? d - 2*Math.PI : d + 2*Math.PI;
  return {cx, cy, R:Rr, t1, d, cuerda:c};
}
function arcoDeTramo(t){
  if(!esArco(t)) return null;
  return arcoEntre(nodo(t.a), nodo(t.b), +t.flecha);
}
// Radio, lado y arco mayor ↔ flecha. `lado` +1: se comba hacia la IZQUIERDA de
// quien va de a a b; −1, hacia la derecha. Copias de las de presión (01-).
function flechaDesdeRadio(c, R, lado, mayor){
  const h = Math.sqrt(Math.max(0, R*R - c*c/4));
  if(h < 1e-12*Math.max(1, R)) mayor = false;
  return (mayor ? -1 : 1) * lado * (mayor ? R + h : R - h);
}
function radioDesdeFlecha(c, f){
  const af = Math.abs(f);
  if(af < 1e-12 || c < 1e-12) return null;
  const mayor = af > c/2*(1 + 1e-12);
  return {R:(c*c/4 + f*f)/(2*af), mayor, lado:Math.sign(f) * (mayor ? -1 : 1)};
}
// Punto del eje a la distancia s (sobre el eje, desde t.a) y su tangente unitaria
// en el sentido de a hacia b. `g` es el de geoTramo.
function puntoEnTramo(g, s){
  if(!g.arco) return {x:g.a.x + g.ux*s, y:g.a.y + g.uy*s, ux:g.ux, uy:g.uy};
  const A = g.arco, sg = A.d >= 0 ? 1 : -1, th = A.t1 + sg*s/A.R;
  return {x:A.cx + A.R*Math.cos(th), y:A.cy + A.R*Math.sin(th),
          ux:-sg*Math.sin(th), uy:sg*Math.cos(th)};
}
// Puntos que delimitan el dibujo: los nudos y, en los tramos curvos, su arco
// (un arco sale de la caja de sus dos nudos).
function puntosDelModelo(){
  const pts = nodos.map(n=>({x:n.x, y:n.y}));
  tramos.forEach(t=>{
    if(!esArco(t)) return;
    const g = geoTramo(t);
    if(g) ejeTramo(g, 24).forEach(p=>pts.push({x:p.x, y:p.y}));
  });
  return pts;
}
// Muestras del eje de un tramo (n + 1 puntos), recto o curvo, de a hacia b.
function ejeTramo(g, n){
  const k = g.arco ? Math.max(n || 48, 8) : 1, pts = [];
  for(let i=0;i<=k;i++) pts.push(puntoEnTramo(g, g.L*i/k));
  return pts;
}
// ── La estructura como cadena principal más ramas (2026-10-04) ──
// Hasta esa fecha el tema solo resolvía tramos uno detrás de otro: si a un nudo
// llegaban tres tramos (un pórtico con un voladizo que sale de la viga), daba
// «no forman una cadena». Ahora vale cualquier ÁRBOL (sin anillos cerrados):
//  · la CADENA PRINCIPAL sale de un extremo libre (el primer nudo con un solo
//    tramo, como antes) y en cada bifurcación sigue por el lado con más tramos;
//  · cada RAMA que cuelga de un nudo X de otra cadena se recorre desde su
//    extremo libre HACIA X, que es como se resuelve un voladizo a mano: el
//    trozo «anterior» de cualquier corte de la rama es la punta de la rama.
// Para su cadena madre, una rama es una acción más en X: la fuerza y el par que
// le transmite (la suma de todo lo que actúa sobre la rama, llevada a X). Con
// eso cada cadena se resuelve con el mismo motor de siempre. Una estructura sin
// bifurcaciones da una sola cadena, idéntica a la de antes.
function _adyacencia(){
  const ady = {}; nodos.forEach(n=>ady[n.id]=[]);
  tramos.forEach(t=>{ if(ady[t.a]) ady[t.a].push(t); if(ady[t.b]) ady[t.b].push(t); });
  return ady;
}
// Nudos a los que se llega desde `idIni` sin cruzar el tramo `tSin`.
function nudosMasAlla(tSin, idIni){
  const ady = _adyacencia(), vistos = new Set([idIni]), pila = [idIni];
  while(pila.length){
    const id = pila.pop();
    (ady[id] || []).forEach(z=>{
      if(tSin && z.id === tSin.id) return;
      const o = (z.a === id) ? z.b : z.a;
      if(!vistos.has(o)){ vistos.add(o); pila.push(o); }
    });
  }
  return vistos;
}
function descomponerEnCadenas(){
  if(!tramos.length) return {cadenas:[]};
  const ady = _adyacencia();
  const usados = nodos.filter(n=>ady[n.id].length);
  if(!usados.length || nudosMasAlla(null, usados[0].id).size !== usados.length)
    return {error:'no-conexa'};
  if(tramos.length !== usados.length - 1) return {error:'anillo'};
  const usadoT = new Set();
  // Tramos de la rama que empieza por `z` saliendo de `desdeId` (z incluido).
  const tamRama = (z, desdeId) => {
    const o = (z.a === desdeId) ? z.b : z.a;
    let k = 1; const vistosT = new Set([z.id]), pila = [o], vistosN = new Set([desdeId, o]);
    while(pila.length){
      const id = pila.pop();
      ady[id].forEach(w=>{
        if(vistosT.has(w.id)) return; vistosT.add(w.id); k++;
        const p = (w.a === id) ? w.b : w.a;
        if(!vistosN.has(p)){ vistosN.add(p); pila.push(p); }
      });
    }
    return k;
  };
  // Camino desde `ini` hasta un extremo, siguiendo en cada nudo el tramo libre
  // con más tramos detrás (a igualdad, el primero, como el recorrido de antes).
  const camino = (ini, primero) => {
    const orden = []; let actual = ini, sig = primero || null, guard = 0;
    while(guard++ < 1000){
      if(!sig){
        let mejor = null, tm = -1;
        ady[actual.id].forEach(z=>{
          if(usadoT.has(z.id)) return;
          const k = tamRama(z, actual.id);
          if(k > tm){ tm = k; mejor = z; }
        });
        sig = mejor;
      }
      if(!sig) break;
      usadoT.add(sig.id);
      const otro = nodo(sig.a === actual.id ? sig.b : sig.a);
      orden.push({t:sig, desde:actual, hasta:otro});
      actual = otro; sig = null;
    }
    return orden;
  };
  const raiz = usados.find(n=>ady[n.id].length === 1) || usados[0];
  const cadenas = [{id:0, cad:camino(raiz), padre:null, union:null}];
  // Las ramas de cada cadena, en el orden de sus nudos. Una rama nueva se
  // añade al final, así que el bucle recorre también las de las ramas.
  for(let k = 0; k < cadenas.length; k++){
    const c = cadenas[k];
    const nudosC = [c.cad[0].desde].concat(c.cad.map(e=>e.hasta));
    nudosC.forEach(X=>{
      if(c.union && X.id === c.union.id) return;     // la unión es de la madre
      ady[X.id].forEach(z=>{
        if(usadoT.has(z.id)) return;
        const ida = camino(X, z);                    // de X a la punta
        const cad = ida.reverse().map(e=>({t:e.t, desde:e.hasta, hasta:e.desde}));
        cadenas.push({id:cadenas.length, cad, padre:k, union:X});
      });
    });
  }
  return {cadenas};
}
// La cadena principal (lo que era toda la estructura antes de las ramas).
function cadena(){
  const est = descomponerEnCadenas();
  return (est.cadenas && est.cadenas.length) ? est.cadenas[0].cad : [];
}
