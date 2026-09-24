// ═══════════════════════════════════════════════════════════
//  INERCIA DE MASA — el motor del modo 3D (Hibbeler §10.8–10.9)
// ═══════════════════════════════════════════════════════════
// El momento de inercia de MASA no es el de áreas: mide la resistencia de un
// cuerpo a la aceleración angular, I = ∫r² dm = ∫r² ρ dV, y se da en kg·m².
// El esquema es el mismo que el 2D de este tema, cambiando A por m y dos ejes
// por tres:
//
//     área          →   masa                m = ρ V
//     Ī de tabla    →   tensor de tabla     core/datos/solidos-3d.js, `inercia`
//     I = Ī + A d²  →   I_xx = Ī_xx + m(d_y² + d_z²)
//     P_xy + A dx dy→   P_xy = P̄_xy + m d_x d_y
//     θ_p, Mohr     →   ejes principales = autovectores del tensor
//     k = √(I/A)    →   k = √(I/m)
//
// CONVENIO, el de Hibbeler y el que ya usa este tema con `Pxy`: los seis
// números de un tensor son `xx, yy, zz` (MOMENTOS, ⟨y²+z²⟩…) y `xy, yz, xz`
// (PRODUCTOS, ⟨xy⟩…, SIN el signo menos). La matriz con la que se gira y se
// diagonaliza lleva los productos negados fuera de la diagonal; esa conversión
// vive en `matrizInercia` y `tensorDesdeMatriz` y en ningún otro sitio.
//
// AQUÍ SÍ IMPORTA EL GIRO. En el 3D de centroide girar una pieza no cambia
// nada, porque el volumen y el centroide no dependen de la postura; el tensor
// sí (I' = R I Rᵀ). Una barra tumbada con el tensor sin girar daría un
// resultado falso en silencio, que es el peor fallo posible de este proyecto.
//
// Sin DOM: todo esto se puede comprobar desde Node.

// ── Tensor ↔ matriz ───────────────────────────────────────────────────────
// Un tensor incompleto (los sólidos diagonales solo declaran los momentos) se
// lee con los productos a cero.
function matrizInercia(t){
  const xy = t.xy || 0, yz = t.yz || 0, xz = t.xz || 0;
  return [[ t.xx, -xy, -xz],
          [ -xy, t.yy, -yz],
          [ -xz, -yz, t.zz]];
}
function tensorDesdeMatriz(M){
  return {xx:M[0][0], yy:M[1][1], zz:M[2][2],
          xy:-M[0][1], yz:-M[1][2], xz:-M[0][2]};
}
function tensorCero(){ return {xx:0, yy:0, zz:0, xy:0, yz:0, xz:0}; }
// Suma de tensores, con signo (un hueco entra con −1).
function sumarTensor(a, b, s){
  s = (s === undefined) ? 1 : s;
  return {xx:a.xx + s*b.xx, yy:a.yy + s*b.yy, zz:a.zz + s*b.zz,
          xy:(a.xy||0) + s*(b.xy||0), yz:(a.yz||0) + s*(b.yz||0), xz:(a.xz||0) + s*(b.xz||0)};
}
function escalarTensor(t, k){
  return {xx:t.xx*k, yy:t.yy*k, zz:t.zz*k,
          xy:(t.xy||0)*k, yz:(t.yz||0)*k, xz:(t.xz||0)*k};
}

// ── El tensor de una pieza, en los ejes del MUNDO ─────────────────────────
// Centroidal y por unidad de masa. Dos pasos sobre el de la ficha:
//   1. VOLTEO: la pieza se refleja en z, así que los productos que llevan una
//      z cambian de signo (⟨xz⟩ y ⟨yz⟩); los momentos no se enteran.
//   2. GIRO: R I Rᵀ, con R la matriz cuyas COLUMNAS son las imágenes de los
//      ejes locales, que es exactamente lo que da `aplicarGiros3d`.
function tensorLocalMasa(fig){
  const def = SOLID_DEFS[fig.type];
  if(!def || !def.inercia) return null;
  const t = def.inercia(fig.dims);
  const base = {xx:t.xx, yy:t.yy, zz:t.zz, xy:t.xy||0, yz:t.yz||0, xz:t.xz||0};
  if(fig.volteado){ base.xz = -base.xz; base.yz = -base.yz; }
  return base;
}
// La matriz de giro de la pieza: columnas = imágenes de x, y, z locales.
function matrizGiro3d(fig){
  const c = [aplicarGiros3d(fig, [1,0,0]),
             aplicarGiros3d(fig, [0,1,0]),
             aplicarGiros3d(fig, [0,0,1])];
  return [[c[0][0], c[1][0], c[2][0]],
          [c[0][1], c[1][1], c[2][1]],
          [c[0][2], c[1][2], c[2][2]]];
}
function tensorMundoMasa(fig){
  const loc = tensorLocalMasa(fig);
  if(!loc) return null;
  const R = matrizGiro3d(fig), I = matrizInercia(loc), M = [[0,0,0],[0,0,0],[0,0,0]];
  // M = R · I · Rᵀ
  for(let i=0;i<3;i++) for(let j=0;j<3;j++){
    let s = 0;
    for(let a=0;a<3;a++) for(let b=0;b<3;b++) s += R[i][a]*I[a][b]*R[j][b];
    M[i][j] = s;
  }
  return tensorDesdeMatriz(M);
}

// ── Steiner en tres dimensiones ───────────────────────────────────────────
// De un tensor CENTROIDAL al de un punto que está en (dx, dy, dz) respecto
// del centroide. Con `signo` −1 se hace al revés (del punto al centroide).
function trasladarTensor(t, m, dx, dy, dz, signo){
  const s = (signo === undefined) ? 1 : signo;
  return {xx:t.xx + s*m*(dy*dy + dz*dz),
          yy:t.yy + s*m*(dx*dx + dz*dz),
          zz:t.zz + s*m*(dx*dx + dy*dy),
          xy:(t.xy||0) + s*m*dx*dy,
          yz:(t.yz||0) + s*m*dy*dz,
          xz:(t.xz||0) + s*m*dx*dz};
}

// ── Ejes principales: Jacobi sobre la matriz simétrica ────────────────────
// Se usa Jacobi y no la fórmula cerrada del polinomio cúbico porque aquí los
// autovalores repetidos son la norma, no la excepción (una esfera los tiene
// los tres iguales y un cilindro dos), y la fórmula cerrada se vuelve
// inestable justo ahí. Devuelve los tres de MAYOR a MENOR con su dirección.
function ejesPrincipales3d(t){
  const A = matrizInercia(t);
  let V = [[1,0,0],[0,1,0],[0,0,1]];
  for(let barrido=0; barrido<60; barrido++){
    let fuera = 0;
    for(let p=0;p<3;p++) for(let q=p+1;q<3;q++) fuera += A[p][q]*A[p][q];
    if(fuera < 1e-24 * (1 + A[0][0]*A[0][0] + A[1][1]*A[1][1] + A[2][2]*A[2][2])) break;
    for(let p=0;p<3;p++) for(let q=p+1;q<3;q++){
      if(Math.abs(A[p][q]) < 1e-300) continue;
      const theta = (A[q][q] - A[p][p]) / (2*A[p][q]);
      const s = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta*theta + 1));
      const c = 1/Math.sqrt(s*s + 1), sn = s*c;
      for(let k=0;k<3;k++){
        const akp = A[k][p], akq = A[k][q];
        A[k][p] = c*akp - sn*akq; A[k][q] = sn*akp + c*akq;
      }
      for(let k=0;k<3;k++){
        const apk = A[p][k], aqk = A[q][k];
        A[p][k] = c*apk - sn*aqk; A[q][k] = sn*apk + c*aqk;
      }
      for(let k=0;k<3;k++){
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c*vkp - sn*vkq; V[k][q] = sn*vkp + c*vkq;
      }
    }
  }
  const ejes = [0,1,2].map(i=>({I:A[i][i], u:[V[0][i], V[1][i], V[2][i]]}));
  ejes.sort((a,b)=>b.I - a.I);
  // Signo canónico: la componente mayor de cada dirección, positiva.
  ejes.forEach(e=>{
    let m = 0; for(let i=1;i<3;i++) if(Math.abs(e.u[i]) > Math.abs(e.u[m])) m = i;
    if(e.u[m] < 0) e.u = e.u.map(v=>-v);
  });
  return ejes;
}
// Momento de inercia respecto de un eje cualquiera que pasa por el punto del
// tensor: I_a = u · I · u, con u unitario (Hibbeler ec. 10-14 en 3D).
function inerciaEnDireccion(t, u){
  const n = Math.hypot(u[0], u[1], u[2]) || 1, v = [u[0]/n, u[1]/n, u[2]/n];
  return t.xx*v[0]*v[0] + t.yy*v[1]*v[1] + t.zz*v[2]*v[2]
       - 2*(t.xy||0)*v[0]*v[1] - 2*(t.yz||0)*v[1]*v[2] - 2*(t.xz||0)*v[0]*v[2];
}

// ── El cuerpo compuesto ───────────────────────────────────────────────────
// `piezas` es una lista de {fig, rho, signo}: la figura tal como está colocada
// (con cx, cy, cz = su CENTROIDE, igual que en el 3D de centroide), su
// densidad y +1 si es material o −1 si es un hueco. Devuelve la masa, el
// centro de masa, el tensor en el ORIGEN y en el CENTRO DE MASA, los radios
// de giro y los ejes principales.
function inerciaDeMasa(piezas){
  let m = 0, Sx = 0, Sy = 0, Sz = 0;
  let O = tensorCero();
  const partes = [];
  for(const pz of piezas){
    const def = SOLID_DEFS[pz.fig.type];
    if(!def || !def.inercia) continue;
    const V = def.volume(pz.fig.dims);
    const mi = (pz.signo === -1 ? -1 : 1) * pz.rho * V;
    const g = {x:pz.fig.cx || 0, y:pz.fig.cy || 0, z:pz.fig.cz || 0};
    // Tensor centroidal de la pieza, ya girado y con su masa.
    const tg = escalarTensor(tensorMundoMasa(pz.fig), mi);
    // Y llevado al origen con Steiner.
    const tO = trasladarTensor(tg, mi, g.x, g.y, g.z);
    O = sumarTensor(O, tO);
    m += mi; Sx += mi*g.x; Sy += mi*g.y; Sz += mi*g.z;
    partes.push({fig:pz.fig, V, m:mi, g, centroidal:tg, enOrigen:tO, rho:pz.rho, signo:pz.signo === -1 ? -1 : 1});
  }
  if(!partes.length || Math.abs(m) < 1e-12) return null;
  const cg = {x:Sx/m, y:Sy/m, z:Sz/m};
  // Del origen al centro de masa: Steiner al revés.
  const G = trasladarTensor(O, m, cg.x, cg.y, cg.z, -1);
  const k = {x:Math.sqrt(Math.max(0, O.xx/m)), y:Math.sqrt(Math.max(0, O.yy/m)), z:Math.sqrt(Math.max(0, O.zz/m))};
  const kG = {x:Math.sqrt(Math.max(0, G.xx/m)), y:Math.sqrt(Math.max(0, G.yy/m)), z:Math.sqrt(Math.max(0, G.zz/m))};
  return {m, cg, O, G, k, kG, partes, principales:ejesPrincipales3d(G)};
}
