// ==========================================================================
//  ESTADO INICIAL DEL TEMA
//
//  Declaraciones que en el archivo original vivian mas abajo. Al partir el
//  script unico en varios <script src>, el navegador puede ejecutar un
//  callback asincrono (ResizeObserver, setTimeout) ENTRE dos archivos, y
//  entonces esas variables aun no existian. Adelantarlas lo evita.
//  Son literales simples: adelantarlas no cambia ningun comportamiento.
// ==========================================================================

let herramienta = 'pan';
let selFiguras = [];        // ids marcados con la herramienta Mover / editar
let extraPoint = null;   // {x, y}
let axisAngle  = null;   // ángulo de rotación de los ejes respecto a X (grados, + antihorario)
let DEC = {len:2, area:2, iner:4, ang:2};
const CANVAS_BG = '#ffffff';
