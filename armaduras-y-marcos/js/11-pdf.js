// ═══════════════════════════════════════════════════════════
//  PDF RÁPIDO (el botón rojo «PDF»; el de LaTeX vive en 14-)
// ═══════════════════════════════════════════════════════════
// Imprime los resultados de pantalla con el núcleo común de core/comun.js
// (bsaInformeRapido, 2026-09-15): la pestaña se abre dentro de la pulsación,
// el lienzo sale recortado (bsaRecortarLienzo), el panel se clona sin
// controles y el documento lleva la cabecera BSA, el colofón y la barra
// «Imprimir / Guardar como PDF». Aquí solo queda lo propio del tema: el
// acento, la figura, qué partes del panel son de pantalla según el estado y
// el CSS de las clases del panel de resultados.
//
// Las secciones 6 y 7 salen con su resultado actual y sin controles: los
// campos pasan a texto con su valor y los botones desaparecen. Lo que sin
// una pulsación previa no tiene resultado se deja fuera (ver _marcasInformeArm).

// CSS de las clases de #resultsPanel, con tamaños para el papel. Va después
// del CSS común de bsaDocInforme, que ya da --acc, --acc2, --suave, --borde,
// --muted, --math y --sans; aquí se añaden los nombres que usan los estilos en
// línea del panel (--mf, --acc-l, --border2, --ten, --com, --zero).
const CSS_INFORME_ARM = `
:root{--mf:var(--math);--acc-l:var(--suave);--border2:#cfd4dc;
  --ten:#1d4ed8;--com:#c0392b;--zero:#9aa3ad;}
.res-section{margin-bottom:10px;}
.res-title{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;
  color:var(--acc);letter-spacing:.3px;border-bottom:1.5px solid var(--acc2);
  padding-bottom:4px;margin:10px 0 6px;}
.res-title .num{width:18px;height:18px;border-radius:50%;background:var(--acc2);color:#fff;
  display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:none;}
.proc-block{background:#fff;border:1px solid var(--borde);border-radius:6px;
  padding:6px 10px;margin-bottom:6px;break-inside:avoid;page-break-inside:avoid;}
.proc-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 18px;}
.proc-col{min-width:0;}
.proc-sub{font-size:8.5px;font-weight:800;color:var(--acc);text-transform:uppercase;
  letter-spacing:.5px;margin-bottom:4px;}
.eq-row{margin:1px 0;}
.eq-body{font-family:var(--mf);font-size:11px;line-height:1.55;}
.eq-body .katex{font-size:1.05em;}
.verdict{border-left:3px solid var(--acc);background:var(--suave);border-radius:5px;
  padding:6px 9px;margin-bottom:6px;font-size:10px;break-inside:avoid;page-break-inside:avoid;}
.verdict.ok{border-left-color:#15803d;background:#f0fdf4;}
.verdict.bad{border-left-color:var(--com);background:#fef2f2;}
.verdict b{font-weight:800;}
.verdict-t{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;
  color:var(--muted);margin-bottom:3px;}
.tabla{width:100%;border-collapse:collapse;font-family:var(--mf);font-size:11px;margin-bottom:6px;}
.tabla th{padding:3px 6px;text-align:left;font-family:var(--sans);font-size:8.5px;font-weight:800;
  color:var(--acc);text-transform:uppercase;letter-spacing:.4px;background:var(--suave);
  border-bottom:1.5px solid var(--border2);}
.tabla td{padding:2px 6px;border-bottom:1px solid var(--borde);}
.tabla tr:last-child td{border-bottom:none;}
.tabla .r{text-align:right;}
.tag{display:inline-block;padding:0 6px;border-radius:20px;font-family:var(--sans);
  font-size:8.5px;font-weight:800;}
.tag.t{background:#dbeafe;color:var(--ten);}
.tag.c{background:#fee2e2;color:var(--com);}
.tag.z{background:#eef0f3;color:var(--zero);}
.joint-card{background:#fff;border:1px solid var(--borde);border-radius:6px;padding:7px 10px;
  margin-bottom:7px;break-inside:avoid;page-break-inside:avoid;}
.joint-h{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:11px;font-weight:700;
  margin-bottom:6px;}
.joint-n{width:17px;height:17px;border-radius:50%;background:var(--acc);color:#fff;display:flex;
  align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:none;}
.joint-body{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:12px;align-items:start;}
.joint-svg{width:100%;max-width:230px;height:auto;display:block;border:1px solid var(--borde);
  border-radius:6px;background:#fff;}
.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:7px;
  break-inside:avoid;page-break-inside:avoid;}
.summary-box{border:1px solid var(--borde);border-radius:5px;padding:5px 8px;background:#fff;}
.summary-box.hl{background:var(--suave);border-color:var(--acc);}
.s-lbl{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;
  margin-bottom:2px;font-weight:700;}
.s-val{font-size:13px;font-weight:700;color:var(--acc);font-style:italic;font-family:var(--mf);}
.s-unit{font-size:8px;color:var(--muted);}
.dcl-par{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px;}
.dcl-par>:only-child{grid-column:1/-1;}
.hint-sm{font-size:9px;color:var(--muted);line-height:1.35;margin-top:3px;}
/* DCL de pantalla: leyenda de una línea (trazo = incógnita, sólido = conocida) y
   valores de los ángulos bajo cada figura, como en estilos.css pero a tamaño de papel. */
.dcl-leyenda{display:flex;flex-wrap:wrap;align-items:center;gap:3px 14px;font-size:9px;
  color:var(--muted);margin:0 0 6px;}
.dcl-leyenda span{display:inline-flex;align-items:center;gap:5px;}
.dcl-leyenda svg{width:34px;height:10px;flex:none;}
.dcl-ang{font-family:var(--mf);font-size:10px;color:var(--muted);text-align:center;margin-top:3px;}
/* Los diagramas SVG de la armadura ocupan todo el ancho: en una armadura
   alta se comerían la hoja entera. */
.proc-block>svg,#dclIni svg,#dclMod svg,#simDCL svg{max-height:95mm;}
@media screen and (max-width:640px){
  .joint-body{grid-template-columns:1fr;}
  .joint-svg{max-width:min(100%,340px);margin:0 auto;}
  .summary-grid{grid-template-columns:repeat(2,1fr);}
  .dcl-par{grid-template-columns:1fr;}
  .eq-body{overflow-x:auto;overflow-y:hidden;}
}
`;

// Partes del panel que son solo de pantalla SEGÚN EL ESTADO. Se marcan con
// data-bsa-pantalla mientras se arma el informe y downloadPDF las desmarca al
// terminar; las que lo son siempre ya van marcadas en 07-.
//  · §6 sin cargas: la sección solo invita a ponerlas.
//  · §6 sin «Recalcular»: el recuadro «Con las cargas modificadas» solo
//    contiene la instrucción; se va y el estado inicial ocupa el ancho.
//  · §7 sin «Evaluar»: no hay resultado, y los admisibles serían los de fábrica.
function _marcasInformeArm(){
  const marcadas = [];
  const marcar = el=>{
    if(el && !el.hasAttribute('data-bsa-pantalla')){
      el.setAttribute('data-bsa-pantalla', '');
      marcadas.push(el);
    }
  };
  const ce = document.getElementById('cargasEdit');
  if(ce && !ce.querySelector('input')) marcar(ce.closest('.res-section'));
  const dm = document.getElementById('dclMod');
  if(dm && !dm.querySelector('svg')) marcar(document.getElementById('dclModBox'));
  const cap = document.getElementById('capBox');
  if(cap && !cap.innerHTML.trim()) marcar(cap.closest('.res-section'));
  return marcadas;
}

// §4 en corte manual sin corte válido: en pantalla, un recuadro «Traza un
// corte» que dice qué hacer con la herramienta Corte (15-). En el papel no hay
// nada que trazar: se aparta y en su lugar va, solo mientras se arma el
// informe, qué le pasa al corte (los mismos motivos que el informe LaTeX), para
// que la sección no quede con el título solo. Devuelve lo que hay que deshacer.
function _corteSinResultadoArm(){
  if(typeof modoCorte !== 'undefined' && modoCorte === 'auto') return null;
  const cb = document.getElementById('corteBox');
  const v = cb && cb.firstElementChild;
  const t = v && v.classList.contains('verdict') && v.querySelector('.verdict-t');
  if(!t || !/Traza un corte/i.test(t.textContent) || v.hasAttribute('data-bsa-pantalla')) return null;
  let motivo = '';
  try{ motivo = analizarCorte().motivo; }catch(e){}
  const textos = {
    'sin-corte': 'No se ha trazado ningún corte.',
    'no-corta':  'El corte trazado no atraviesa ninguna barra.',
    'no-separa': 'El corte trazado no separa la armadura en dos partes.',
    'muchas':    'El corte trazado deja más de tres incógnitas.'
  };
  const nuevo = document.createElement('div');
  nuevo.className = 'verdict';
  nuevo.innerHTML = '<div class="verdict-t">Sin corte válido</div>';
  nuevo.appendChild(document.createTextNode(textos[motivo] || 'El corte trazado no es válido.'));
  v.setAttribute('data-bsa-pantalla', '');
  cb.insertBefore(nuevo, v);
  return {original: v, nuevo: nuevo};
}

// El encaje de la figura (cajaDibujoInforme, encajarDibujoInforme,
// lienzoTemporalInforme, marcoLienzoInforme) vive en core/comun.js.

// ── La figura del informe ──
// Se dibuja en un lienzo propio de tamaño fijo, no en el del editor: allí se
// recortaba la vista TAL COMO ESTABA, y lo que en pantalla se salía por el
// borde («Ry = 10.00 k» del rodillo derecho en el ejemplo 'simple') salía
// cortado también en el papel; en el teléfono, además, el lienzo es estrecho.
// Va sin rejilla ni ejes (cruzan el lienzo entero y el recorte no recortaba
// nada), sin selección ni recuadros de datos, y encajada MIDIENDO el propio
// dibujo (encajarDibujoInforme, arriba): las cadenas de cotas, las
// flechas de reacción y sus columnas de valores no escalan con el zoom.
// despues() devuelve ctx, W, H, la vista y la selección exactos y redibuja.
const FIG_INFORME_ARM = {ancho:820, alto:580, res:2, margen:16};

// Caja del modelo en coordenadas del mundo: los nudos y, si hay, la línea de
// corte, que se dibuja con sus propios extremos.
function _cajaModeloArm(){
  if(!nodos.length) return null;
  const xs = nodos.map(n=>n.x), ys = nodos.map(n=>n.y);
  if(corte){ xs.push(corte.x1, corte.x2); ys.push(corte.y1, corte.y2); }
  return {x0:Math.min(...xs), x1:Math.max(...xs), y0:Math.min(...ys), y1:Math.max(...ys)};
}

// Dibuja la armadura en el lienzo temporal y la encaja. Cambia ctx, W, H y la
// vista: quien la llama los ha guardado antes. El lienzo va a temporales NADA
// MÁS CREARLO, para que despues() lo quite aunque el encaje o dibujar() fallen
// a medias (si no, quedaba en el documento un lienzo oculto por cada fallo).
function _figuraInformeArm(temporales){
  const f = FIG_INFORME_ARM;
  const c0 = _cajaModeloArm();
  if(!c0) return null;
  const lienzo = lienzoTemporalInforme(f.ancho, f.alto, f.res);
  temporales.push(lienzo);
  ctx = lienzo.getContext('2d');
  W = f.ancho; H = f.alto;
  // Punto de partida: el encuadre de centrar(); la medida lo corrige.
  vx = (c0.x0 + c0.x1)/2; vy = (c0.y0 + c0.y1)/2;
  escala = Math.max(0.02, Math.min((W - 140)/Math.max(c0.x1 - c0.x0, 1),
                                   (H - 140)/Math.max(c0.y1 - c0.y0, 1), 900));
  const r = encajarDibujoInforme({
    ancho: W, alto: H, margen: f.margen,
    medir: ()=>{ dibujar(); return cajaDibujoInforme(lienzo); },
    modelo: ()=>{
      const c = _cajaModeloArm();
      const [x0, y0] = aPantalla(c.x0, c.y1), [x1, y1] = aPantalla(c.x1, c.y0);
      return {x0, y0, x1, y1};
    },
    escalar: (k, dx, dy)=>{
      const c = _cajaModeloArm();
      const xc = (c.x0 + c.x1)/2, yc = (c.y0 + c.y1)/2;
      const [sx, sy] = aPantalla(xc, yc);
      escala *= k;
      vx = xc - (sx + dx - W/2)/escala;
      vy = yc + (sy + dy - H/2)/escala;
    }
  });
  if(!r.ok) console.warn('Informe PDF: la figura de la armadura no cabe entera en su lienzo.');
  return lienzo;
}

function downloadPDF(){
  let marcadas = [], corteInf = null, guardado = null, lienzo = null;
  const temporales = [];    // lienzos creados en antes(), también si algo falla
  return bsaInformeRapido({
    panel: 'resultsPanel',
    sinResultados: 'Primero resuelve la armadura.',
    tema: 'Armaduras',
    acento: {acc:'#7c5cd6', acc2:'#563aa8', suave:'#f2eefc', borde:'#e2e5ea'},
    // Se evalúa después de antes(), que es quien dibuja la figura.
    figuras: ()=> lienzo ? [{titulo:'Armadura analizada', lienzo:lienzo}] : [],
    // Instrucciones que otras piezas escriben sin marcar: «Pulsa Restaurar…»
    // bajo la comparación (08-) y «cámbiala en el desplegable…» (09-).
    limpiar: {quitar: '#compBox>.hint-sm,#simCrit .hint-sm'},
    cssTema: CSS_INFORME_ARM,
    antes: ()=>{
      marcadas = _marcasInformeArm();
      corteInf = _corteSinResultadoArm();
      // Primero se guarda todo lo que se va a tocar: despues() lo necesita
      // aunque algo falle a medias.
      guardado = {ctx:ctx, W:W, H:H, vx:vx, vy:vy, escala:escala,
        grilla:VIS.grilla, ejes:VIS.ejes, gesto:gesto,
        selNodo:selNodo, selNodos:selNodos, selBarra:selBarra, selBarras:selBarras,
        selNodoInfo:selNodoInfo};
      VIS.grilla = false; VIS.ejes = false; gesto = null;
      selNodo = null; selNodos = []; selBarra = null; selBarras = []; selNodoInfo = null;
      lienzo = _figuraInformeArm(temporales);
    },
    despues: ()=>{
      marcadas.forEach(el => el.removeAttribute('data-bsa-pantalla'));
      marcadas = [];
      if(corteInf){
        corteInf.original.removeAttribute('data-bsa-pantalla');
        if(corteInf.nuevo.parentNode) corteInf.nuevo.parentNode.removeChild(corteInf.nuevo);
        corteInf = null;
      }
      temporales.splice(0).forEach(c => c.remove());
      lienzo = null;
      if(guardado){
        const g = guardado;
        guardado = null;
        ctx = g.ctx; W = g.W; H = g.H;
        vx = g.vx; vy = g.vy; escala = g.escala;
        VIS.grilla = g.grilla; VIS.ejes = g.ejes; gesto = g.gesto;
        selNodo = g.selNodo; selNodos = g.selNodos; selBarra = g.selBarra; selBarras = g.selBarras;
        selNodoInfo = g.selNodoInfo;
        dibujar();
      }
    }
  });
}
