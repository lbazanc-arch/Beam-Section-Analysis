// ═══════════════════════════════════════════════════════════
//  CANVAS SETUP
// ═══════════════════════════════════════════════════════════
const canvas = document.getElementById('mainCanvas');
try{ setTimeout(histRequest, 60); }catch(e){}
try{ pintarMisPerfiles(); }catch(e){}
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  const area = document.getElementById('canvasArea');
  const W = area.clientWidth, H = area.clientHeight;
  canvas.width = W*dpr; canvas.height = H*dpr;
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  ctx.scale(dpr,dpr);
  if(!viewTx && !viewTy) { viewTx = W/2; viewTy = H/2; }
  // El observador puede saltar ENTRE dos <script> (CLAUDE.md §5.3), y render
  // vive en la pieza siguiente (05-dibujo.js): la consola decía, al azar, «render is
  // not defined» al cargar la página. Si aún no existe, se dibuja al terminar.
  if(typeof render === 'function') render();
  else window.addEventListener('load', ()=>render(), {once:true});
}
new ResizeObserver(resizeCanvas).observe(document.getElementById('canvasArea'));

function worldToScreen(wx,wy){ return {x: viewTx + wx*viewScale, y: viewTy - wy*viewScale}; }
function screenToWorld(sx,sy){ return {x: (sx-viewTx)/viewScale, y: -(sy-viewTy)/viewScale}; }
