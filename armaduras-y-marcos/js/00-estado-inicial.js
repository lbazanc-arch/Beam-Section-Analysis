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
//  Convenio unico del proyecto: todo angulo que escribe el usuario se mide
//  desde el eje +x y en sentido ANTIHORARIO (0 derecha, 90 arriba, -90 abajo).
//
//  · Apoyo MOVIL  -> `n.apAng` es la direccion de su UNICA reaccion, y ENTRA
//    en el calculo (06-motor-de-equilibrio.js). 90 es el rodillo sobre el
//    suelo; 0, el rodillo contra un muro. Los archivos anteriores solo
//    guardaban 0 o 90, que ya significan exactamente eso: siguen siendo
//    validos sin conversion.
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
