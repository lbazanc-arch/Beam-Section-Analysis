// ==========================================================================
//  ESTADO INICIAL DEL TEMA
//
//  Declaraciones que en el archivo original vivian mas abajo. Al partir el
//  script unico en varios <script src>, el navegador puede ejecutar un
//  callback asincrono (ResizeObserver, setTimeout) ENTRE dos archivos, y
//  entonces esas variables aun no existian. Adelantarlas lo evita.
//  Son literales simples: adelantarlas no cambia ningun comportamiento.
// ==========================================================================

let mouseW = null;
let metodo = 'nudos';
let corte = null;        // {x1,y1,x2,y2} en coordenadas del mundo
let corteDrag = null;
let modoCorte = 'auto';

// ==========================================================================
//  ANGULOS DE LOS APOYOS
//  Hay DOS angulos y no significan lo mismo (CLAUDE.md 7):
//
//  · El que ESCRIBE EL USUARIO senala DONDE SE APOYA el nudo: -90 en el
//    suelo, 0 contra la pared derecha, 180 contra la izquierda, 90 en el
//    techo. Vive solo en la ventana del apoyo.
//  · El que GUARDA EL MODELO en `n.apAng` es el opuesto: la direccion en la
//    que EMPUJA la reaccion, medida desde +x y antihoraria. Es el que
//    consumen el motor y los tres dibujos.
//
//  `bsaAnguloOpuesto` (core/comun.js) pasa de uno a otro, y se aplica SOLO
//  en el borde de la ventana. Por eso los ejercicios guardados antes del
//  2026-09-11 se abren sin conversion: lo almacenado no ha cambiado nunca.
//
//  · Apoyo MOVIL  -> `n.apAng` ENTRA en el calculo (06-motor-de-equilibrio.js).
//    90 es el rodillo sobre el suelo; 180, el rodillo contra la pared
//    derecha. Los archivos anteriores solo guardaban 0 o 90, que ya
//    significan exactamente eso: siguen siendo validos sin conversion.
//  · Apoyo FIJO   -> `n.apAngDib` gira SOLO el dibujo. Un pasador restringe
//    las dos direcciones se dibuje como se dibuje, asi que este angulo no
//    puede tocar el motor ni el informe: es presentacion.
//
//  Viven aqui porque `dibujar()` puede ejecutarse desde un ResizeObserver
//  entre dos <script src> (CLAUDE.md 5.3), antes de que se cargue el archivo
//  donde estarian de otro modo.
// ==========================================================================
const AP_ANG_POR_DEFECTO = 90;          // rodillo sobre el suelo / pasador bajo el nudo

// Angulo normalizado a (-180, 180].
function normalizarAnguloArm(a){
  const n = Number(a);
  if(!isFinite(n)) return 0;
  let v = ((n % 360) + 360) % 360;
  if(v > 180) v -= 360;
  return +v.toFixed(6);
}
// Direccion de la reaccion de un apoyo movil. Solo tiene sentido fisico ahi.
function anguloReaccionApoyo(n){
  if(!n || n.apAng === undefined || n.apAng === null) return AP_ANG_POR_DEFECTO;
  return normalizarAnguloArm(n.apAng);
}
// Angulo con el que se DIBUJA el apoyo: el de la reaccion si es movil, el
// puramente estetico si es fijo.
function anguloDibujoApoyo(n){
  if(!n) return AP_ANG_POR_DEFECTO;
  if(n.apoyo === 'movil') return anguloReaccionApoyo(n);
  if(n.apAngDib === undefined || n.apAngDib === null) return AP_ANG_POR_DEFECTO;
  return normalizarAnguloArm(n.apAngDib);
}
// Coseno y seno de la direccion de la reaccion, con los ceros exactos. Sin
// este redondeo un rodillo vertical dejaria rx = 6e-17 en vez de no dejar
// ninguna componente horizontal, y el resto del tema (conteo de reacciones,
// flechas del DCL, tabla) creeria que tiene dos.
function cosenosApoyo(n){
  const a = anguloReaccionApoyo(n)*Math.PI/180;
  const c = Math.cos(a), s = Math.sin(a);
  return {cx: Math.abs(c) < 1e-12 ? 0 : c, cy: Math.abs(s) < 1e-12 ? 0 : s};
}
// Envoltura <g transform="rotate(...)"> para girar el simbolo de un apoyo en
// un SVG (09-diagrama-svg-de-la-armadura.js). El simbolo se dibuja bajo el
// nudo y va al lado CONTRARIO a la reaccion, igual que en el lienzo y en el
// PDF: por eso el giro es (90 - angulo). En SVG la y va hacia abajo, asi que
// un giro positivo ya es horario, exactamente como en el canvas. Escribirlo
// como (angulo - 90) espejaba el simbolo: dejaba el rodillo del lado de su
// propia reaccion y contradecia a los otros dos dibujos del mismo modelo.
function giroApoyoSVG(n, px, py){
  const g = normalizarAnguloArm(90 - anguloDibujoApoyo(n));
  if(Math.abs(g) < 0.01) return {abre:'', cierra:''};
  return {abre:'<g transform="rotate(' + g.toFixed(2) + ' ' + px + ' ' + py + ')">', cierra:'</g>'};
}
