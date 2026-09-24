// ==========================================================================
//  ESTADO INICIAL DEL TEMA
//
//  Declaraciones que en el archivo original vivian mas abajo. Al partir el
//  script unico en varios <script src>, el navegador puede ejecutar un
//  callback asincrono (ResizeObserver, setTimeout) ENTRE dos archivos, y
//  entonces esas variables aun no existian. Adelantarlas lo evita.
//  Son literales simples: adelantarlas no cambia ningun comportamiento.
// ==========================================================================

// El espacio de trabajo se declara AQUI y no en 29-vistas-3d-masa.js: lo
// miran render(), el raton y calculate(), que van antes, y un callback
// asincrono entre dos <script> los alcanzaria con la `let` aun sin
// inicializar (§5.3 de CLAUDE.md).
let modoEspacio = '2d';   // '2d' inercia de areas | '3d' inercia de masa
let herramienta = 'pan';
let selFiguras = [];        // ids marcados con la herramienta Mover / editar
let extraPoint = null;   // {x, y}
let axisAngle  = null;   // ángulo de rotación de los ejes respecto a X (grados, + antihorario)
let DEC = {len:2, area:2, iner:4, ang:2};
const CANVAS_BG = '#ffffff';
