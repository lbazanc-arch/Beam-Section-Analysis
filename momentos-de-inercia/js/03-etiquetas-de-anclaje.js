const ANCHOR_LABELS = {
  C:'Centroide', TL:'Esq.↖', TR:'Esq.↗', BL:'Esq.↙', BR:'Esq.↘',
  TOP:'Cima', BM:'Base', O:'Origen(90°)', E1:'Ext. Horiz', E2:'Ext. Vert',
  V:'Vértice', M:'Medio de la cuerda'
};

// La MISMA clave significa cosas distintas según la figura: E1 es el extremo del
// semieje en la elipse y el final de la cuerda en el segmento circular, y BM es
// el centro del diámetro en el semicírculo y el medio del lado inferior en un
// polígono regular. Cada tipo puede dar aquí su propio nombre; lo que no esté
// en esta tabla cae en ANCHOR_LABELS, que es el nombre genérico de siempre.
const ANCHOR_LABELS_TIPO = {
  elipse:     {E1:'Ext. del semieje a', E2:'Ext. del semieje b'},
  semielipse: {BM:'Centro de la base plana', BL:'Base izq.', BR:'Base der.'},
  segmento:   {M:'Medio de la cuerda', E1:'Ext. izq. de la cuerda',
               E2:'Ext. der. de la cuerda', V:'Cima del arco'},
  trapecio:   {BL:'Base mayor izq.', BR:'Base mayor der.',
               TL:'Base menor izq.', TR:'Base menor der.'},
  triangulo:  {BL:'Base izq.', BR:'Base der.', V:'Vértice opuesto'},
  hexagono:   {E1:'Vértice derecho', BM:'Medio del lado inferior'},
  octogono:   {E1:'Vértice derecho', BM:'Medio del lado inferior'}
};

// Nombre del botón de anclaje y de la etiqueta de posición del panel. Los dos
// casos con texto largo (C y BM) se conservan tal cual estaban.
function etiquetaAnclaje(tipo, k){
  const p = ANCHOR_LABELS_TIPO[tipo];
  if(p && p[k]) return p[k];
  if(k === 'C')  return 'G — Centroide';
  if(k === 'BM') return '⊥ Centro base (diámetro)';
  return ANCHOR_LABELS[k] || k;
}
function etiquetaPosicion(tipo, k){
  const p = ANCHOR_LABELS_TIPO[tipo];
  if(p && p[k]) return 'Posición: ' + p[k];
  if(k === 'C')  return 'Posición del Centroide (G)';
  if(k === 'BM') return 'Posición: Centro del diámetro (base plana)';
  return 'Posición: ' + (ANCHOR_LABELS[k] || k);
}
