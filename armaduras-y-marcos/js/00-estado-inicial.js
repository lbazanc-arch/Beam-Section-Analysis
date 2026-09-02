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
