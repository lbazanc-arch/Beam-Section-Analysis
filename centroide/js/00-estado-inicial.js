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
let selFiguras = [];          // ids de figuras marcadas
let DEC = {len:2, area:2};
// Modo del espacio de trabajo: sección plana ('2d') o cuerpo sólido ('3d').
// Se adelanta aquí porque render() lo consulta desde el primer repintado.
let modoEspacio = '2d';
const CANVAS_BG = '#ffffff';
