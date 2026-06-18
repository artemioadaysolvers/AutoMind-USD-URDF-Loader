// AutoMind URDF+ Viewer SINGLE-FILE original-style bundle.
// Generated to match the original USD direct-jsDelivr import mechanism: one module file, no relative ESM graph.

// ===== bundled module: Theme.js =====
const __mod_Theme_js = (() => {
// Theme.js

const THEME = {
  colors: {
    teal: '#0ea5a6',
    tealSoft: '#14b8b9',
    tealFaint: 'rgba(20,184,185,0.12)',
    panelBg: '#ffffff',
    canvasBg: 0xffffff,
    stroke: '#d7e7e7',
    text: '#0b3b3c',
    textMuted: '#577e7f',
  },

  // ✅ ADD THIS BLOCK
  lighting: {
    ambient: { color: 0xffffff, intensity: 0.9 },
    key:     { color: 0xffffff, intensity: 0.75, position: [3, 5, 4] },
    fill:    { color: 0xffffff, intensity: 0.35, position: [-4, 2, -3] }
  },

  shadows: {
    sm: '0 4px 12px rgba(0,0,0,0.08)',
    md: '0 8px 24px rgba(0,0,0,0.12)',
    lg: '0 12px 36px rgba(0,0,0,0.14)',
  }
};


return { THEME: (typeof THEME !== "undefined" ? THEME : undefined) };
})();
const THEME = __mod_Theme_js.THEME;

// ===== bundled module: core/ViewerCore.js =====
const __mod_core_ViewerCore_js = (() => {
// /USD_Viewer/core/ViewerCore.js
// Three.js r132 compatible USD+ viewer core.
// Exports createViewer({ container, background, pixelRatio })
// Parses ASCII .usda/.usd exported by AutoMind USD+.
/* global THREE */

function assertThree() {
  if (typeof THREE === 'undefined') {
    throw new Error('[USD ViewerCore] THREE is not defined. Load three.js before this module.');
  }
}

const EPS = 1e-12;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// BUILD134_PATCHED: mechanism policy copied from the good standalone USD_Viewer(4).html.
// The important part is not the UI, it is the interactive constrained drag:
// relaxed DLS, redundant-loop filtering, per-drag feasibility projection,
// and final pinning of the dragged joint so it does not snap back on release.
const PERF = {
  DLS_INTERACTIVE_MAX_ITER: 8,
  DLS_FINAL_MAX_ITER: 18,
  DLS_INTERACTIVE_MAX_VARS: 48,
  DLS_FINAL_MAX_VARS: 72,
  DLS_INTERACTIVE_MAX_CONSTRAINTS: 420,
  DLS_FINAL_MAX_CONSTRAINTS: 2000,
  DLS_INTERACTIVE_RELAXATION: 0.52,
  DLS_FINAL_RELAXATION: 0.72,
  DLS_INTERACTIVE_LAMBDA: 1.2e-2,
  DLS_FINAL_LAMBDA: 4e-3,
  DLS_INTERACTIVE_STOP_RESIDUAL: 2.5e-4,
  DLS_FINAL_STOP_RESIDUAL: 3.5e-5,
  DLS_IMPLICIT_WEIGHT_INTERACTIVE: 0.22,
  DLS_IMPLICIT_WEIGHT_FINAL: 0.45,
  DLS_EXPLICIT_LOOP_WEIGHT_INTERACTIVE: 0.72,
  DLS_EXPLICIT_LOOP_WEIGHT_FINAL: 0.82,
  DLS_DRAG_FEASIBLE_RESIDUAL: 1.5e-3,
  DLS_DRAG_FEASIBLE_RELATIVE: 2.75,
  DLS_DRAG_BINARY_STEPS: 8
};

function basename(p) { return String(p || '').split(/[\\/]/).pop(); }
function stripExt(s) { return String(s || '').replace(/\.[^.]+$/, ''); }
function localNameFromPath(path) { return String(path || '').split('/').filter(Boolean).pop() || ''; }
function match1(text, re, fallback = '') { const m = re.exec(String(text || '')); return m ? m[1] : fallback; }
function parseNums(s) { return (String(s || '').match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number); }
function safeRe(name) { return String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function parseStringAttr(body, name, fallback = '') { return match1(body, new RegExp(safeRe(name) + '\\s*=\\s*"([^"]*)"'), fallback); }
function parseBoolAttr(body, name, fallback = false) { const m = new RegExp(safeRe(name) + '\\s*=\\s*(true|false|1|0)').exec(String(body || '')); return m ? /true|1/i.test(m[1]) : fallback; }
function parseNumAttr(body, name, fallback = 0) { const m = new RegExp(safeRe(name) + '\\s*=\\s*([-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?)').exec(String(body || '')); return m ? Number(m[1]) : fallback; }
function parseVecAttr(body, name, fallback = [0, 0, 0]) {
  const m = new RegExp(safeRe(name) + '\\s*=\\s*\\(([^\\)]*)\\)').exec(String(body || ''));
  const n = m ? parseNums(m[1]) : [];
  if (n.length >= 3) return [n[0], n[1], n[2]];
  return Array.isArray(fallback) ? fallback.slice() : fallback;
}
function parseQuatAttr(body, name) {
  const m = new RegExp(safeRe(name) + '\\s*=\\s*\\(([^\\)]*)\\)').exec(String(body || ''));
  const n = m ? parseNums(m[1]) : [];
  return n.length >= 4 ? new THREE.Quaternion(n[1], n[2], n[3], n[0]).normalize() : new THREE.Quaternion();
}
function directBody(body) {
  const text = String(body || '');
  const m = /\n\s*def\s+[A-Za-z_][A-Za-z0-9_]*\s+"[^"]+"/.exec(text);
  return m ? text.slice(0, m.index) : text;
}
function parseDefaultPrim(text) { return match1(text, /defaultPrim\s*=\s*"([^"]+)"/); }

function findMatchingBrace(s, open) {
  let depth = 0, inStr = false, esc = false;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
function scanDefBlocksRecursive(text, baseOffset, parentPath, depth, out) {
  const re = /def\s+([A-Za-z_][A-Za-z0-9_]*)\s+"([^"]+)"[^\{]*\{/g;
  let m;
  while ((m = re.exec(text))) {
    const startBrace = text.indexOf('{', m.index);
    const end = findMatchingBrace(text, startBrace);
    if (startBrace < 0 || end < 0) continue;
    const body = text.slice(startBrace + 1, end);
    const path = parentPath + '/' + m[2];
    out.push({ type: m[1], name: m[2], start: baseOffset + m.index, end: baseOffset + end, body, depth, path, parentPath });
    scanDefBlocksRecursive(body, baseOffset + startBrace + 1, path, depth + 1, out);
    re.lastIndex = end + 1;
  }
}
function findDefBlocks(text) { const out = []; scanDefBlocksRecursive(String(text || ''), 0, '', 0, out); return out; }

function parseArrayBlock(body, lhsRegex) {
  const re = new RegExp(lhsRegex + '\\s*=\\s*\\[(.*?)\\]', 's');
  const m = re.exec(String(body || ''));
  return m ? m[1] : '';
}
function parseArrayTriples(body, lhsRegex) { const txt = parseArrayBlock(body, lhsRegex); const nums = txt ? parseNums(txt) : []; const out = []; for (let i = 0; i + 2 < nums.length; i += 3) out.push([nums[i], nums[i + 1], nums[i + 2]]); return out; }
function parseArrayPairs(body, lhsRegex) { const txt = parseArrayBlock(body, lhsRegex); const nums = txt ? parseNums(txt) : []; const out = []; for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]); return out; }
function parseArrayInts(body, lhsRegex) { const txt = parseArrayBlock(body, lhsRegex); return txt ? parseNums(txt).map(x => Math.trunc(x)) : []; }
function triangulateUsdIndices(rawIdx, counts) {
  const idx = (rawIdx || []).filter(Number.isFinite).map(x => Math.trunc(x));
  const cts = (counts || []).filter(Number.isFinite).map(x => Math.trunc(x));
  if (!idx.length) return [];
  if (!cts.length) return idx.filter(i => i >= 0);
  const tris = [];
  let p = 0;
  for (const c of cts) {
    if (c < 3 || p + c > idx.length) { p += Math.max(c, 0); continue; }
    const face = idx.slice(p, p + c).filter(i => i >= 0); p += c;
    if (face.length < 3) continue;
    for (let k = 1; k + 1 < face.length; k++) tris.push(face[0], face[k], face[k + 1]);
  }
  return tris;
}

function matrixFromUsdNumbers(n) {
  const rowT = Math.hypot(n[12] || 0, n[13] || 0, n[14] || 0);
  const colT = Math.hypot(n[3] || 0, n[7] || 0, n[11] || 0);
  const rowVector = rowT > 1e-12 && colT < Math.max(rowT * 1e-6, 1e-12);
  if (rowVector) {
    return new THREE.Matrix4().set(
      n[0], n[4], n[8],  n[12],
      n[1], n[5], n[9],  n[13],
      n[2], n[6], n[10], n[14],
      n[3], n[7], n[11], n[15]
    );
  }
  return new THREE.Matrix4().set(
    n[0], n[1], n[2],  n[3],
    n[4], n[5], n[6],  n[7],
    n[8], n[9], n[10], n[11],
    n[12], n[13], n[14], n[15]
  );
}
function parseXformQuaternion(body) {
  const q = parseQuatAttr(body, 'xformOp:orient');
  if (!/xformOp:rotateXYZ/.test(body)) return q;
  const r = parseVecAttr(body, 'xformOp:rotateXYZ', [0, 0, 0]) || [0, 0, 0];
  const e = new THREE.Euler(THREE.MathUtils.degToRad(r[0]), THREE.MathUtils.degToRad(r[1]), THREE.MathUtils.degToRad(r[2]), 'XYZ');
  return q.multiply(new THREE.Quaternion().setFromEuler(e)).normalize();
}
function parseMatrix(body) {
  const txt = String(body || '');
  const m = /matrix4d\s+xformOp:transform\s*=\s*\(\((.*?)\)\)/s.exec(txt);
  if (m) {
    const n = parseNums(m[1]);
    if (n.length >= 16) return matrixFromUsdNumbers(n);
  }
  const t = parseVecAttr(txt, 'xformOp:translate', null);
  const s = parseVecAttr(txt, 'xformOp:scale', [1, 1, 1]) || [1, 1, 1];
  const q = parseXformQuaternion(txt);
  const hasOps = !!t || /xformOp:(orient|rotateXYZ|scale)/.test(txt);
  if (!hasOps) return new THREE.Matrix4();
  return new THREE.Matrix4().compose(new THREE.Vector3(...(t || [0, 0, 0])), q, new THREE.Vector3(s[0], s[1], s[2]));
}
function matrixFromPosQuat(pos, quat) {
  return new THREE.Matrix4().compose(new THREE.Vector3(pos[0], pos[1], pos[2]), quat, new THREE.Vector3(1, 1, 1));
}
function setObjectMatrix(obj, mat) {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  mat.decompose(p, q, s);
  obj.position.copy(p); obj.quaternion.copy(q); obj.scale.copy(s); obj.updateMatrix(); obj.updateMatrixWorld(true);
}

function makeWorldGrid(size = 10, divisions = 200, visible = false) {
  const safeSize = Math.max(1e-6, Number(size) || 10);
  let div = Math.max(10, Math.min(1800, Math.floor(Number(divisions) || 200)));
  if (div % 2) div += 1;
  const grid = new THREE.GridHelper(safeSize, div, 0x0ea5a6, 0x14b8b9);
  grid.visible = !!visible;
  grid.frustumCulled = false;
  grid.renderOrder = -10;
  const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
  mats.forEach(m => {
    if (!m) return;
    m.transparent = true;
    m.opacity = 0.72;
    m.depthWrite = false;
    m.depthTest = true;
    m.needsUpdate = true;
  });
  grid.userData.__gridSize = safeSize;
  grid.userData.__gridDivisions = div;
  return grid;
}
function disposeGrid(grid) {
  try { grid?.geometry?.dispose?.(); } catch (_) {}
  try {
    const mats = Array.isArray(grid?.material) ? grid.material : [grid?.material];
    mats.forEach(m => m?.dispose?.());
  } catch (_) {}
}
function niceGridCell(modelDim) {
  const raw = Math.max(Number(modelDim) || 1, 1e-6) / 24;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return Math.max(m * p, 1e-6);
}
function replaceGridIfNeeded(helpers, wantedSize, cellSize, center, floorY, force = false) {
  if (!helpers?.group) return;
  const size = Math.max(1e-6, Number(wantedSize) || 10);
  const cell = Math.max(1e-6, Number(cellSize) || (size / 200));
  let divisions = Math.max(40, Math.ceil(size / cell));
  if (divisions % 2) divisions += 1;
  divisions = Math.min(1800, divisions);
  const oldSize = helpers.grid?.userData?.__gridSize || 0;
  const oldDiv = helpers.grid?.userData?.__gridDivisions || 0;
  const visible = !!helpers.grid?.visible;
  const mustReplace = force || !helpers.grid || size > oldSize * 1.18 || size < oldSize * 0.45 || Math.abs(divisions - oldDiv) > Math.max(12, oldDiv * 0.2);
  if (mustReplace) {
    const old = helpers.grid;
    const grid = makeWorldGrid(size, divisions, visible);
    if (old) helpers.group.remove(old);
    helpers.group.add(grid);
    disposeGrid(old);
    helpers.grid = grid;
    helpers.__gridWorldSize = size;
    helpers.__gridCellSize = cell;
  }
  try { helpers.grid.position.set(center.x, floorY, center.z); helpers.grid.frustumCulled = false; } catch (_) {}
}
function buildHelpers() {
  const group = new THREE.Group();
  // Real world-anchored grid. The helper is rebuilt with more divisions when the
  // camera sees a larger area, so the grid grows without scaling its cell spacing.
  // This prevents the visual bug where the model shrinks but the grid seems to keep
  // the same screen size, and it also prevents Orthographic half-grid clipping.
  const grid = makeWorldGrid(10, 200, false);
  group.add(grid);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.32,
    roughness: 1.0,
    metalness: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.0001;
  ground.visible = false;
  ground.frustumCulled = false;
  ground.receiveShadow = true;
  ground.castShadow = false;
  group.add(ground);
  const axes = new THREE.AxesHelper(1);
  axes.visible = false;
  axes.frustumCulled = false;
  group.add(axes);
  return { group, grid, ground, axes };
}
function applyDoubleSided(root) {
  root?.traverse?.(n => {
    if (n.isMesh && n.geometry) {
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach(m => { if (m) { m.side = THREE.DoubleSide; m.needsUpdate = true; }});
      n.castShadow = true; n.receiveShadow = true; n.geometry.computeVertexNormals?.();
    }
  });
}
function getObjectBounds(object, pad = 1.0) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).multiplyScalar(pad);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  return { box, center, size, maxDim };
}
function fitAndCenter(camera, controls, object, pad = 1.08) {
  const b = getObjectBounds(object, pad); if (!b) return false;
  const { center, maxDim } = b;
  if (camera.isPerspectiveCamera) {
    const fov = (camera.fov || 60) * Math.PI / 180;
    const dist = maxDim / Math.tan(Math.max(1e-6, fov / 2));
    camera.near = Math.max(maxDim / 1000, 0.001); camera.far = Math.max(maxDim * 100000, 10000000); camera.updateProjectionMatrix();
    let dir = camera.position.clone().sub(controls.target || new THREE.Vector3());
    if (!isFinite(dir.lengthSq()) || dir.lengthSq() < 1e-10) dir.set(1, 0.7, 1);
    dir.normalize(); camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
  } else {
    const aspect = Math.max(1e-6, (controls?.domElement?.clientWidth || 1) / (controls?.domElement?.clientHeight || 1));
    const span = Math.max(maxDim, 5 * Math.SQRT2);
    camera.left = -span * aspect; camera.right = span * aspect; camera.top = span; camera.bottom = -span;
    camera.near = Math.max(maxDim / 1000, 0.001); camera.far = Math.max(maxDim * 100000, 10000000); camera.updateProjectionMatrix();
    camera.position.copy(center.clone().add(new THREE.Vector3(maxDim, maxDim * 0.9, maxDim)));
  }
  controls.target.copy(center); controls.update(); return true;
}
function reasonableGridSpan(modelDim, cell) {
  const dim = Math.max(Number(modelDim) || 1, 1e-9);
  const c = Math.max(Number(cell) || niceGridCell(dim), 1e-9);
  // A finite CAD grid: large enough to give context around the model, but it never
  // expands just because the camera zooms out. This prevents the grid from turning
  // into an infinite sheet and keeps its size proportional to the CAD.
  return Math.max(dim * 8.0, c * 56.0);
}

function resizeSceneHelpersForObject(helpers, object) {
  const b = getObjectBounds(object, 1.0);
  if (!helpers || !b) return;
  const center = b.center || b.box.getCenter(new THREE.Vector3());
  const floorY = Number.isFinite(b.box?.min?.y) ? b.box.min.y : 0;
  const modelDim = Math.max(b.maxDim || 1, 1e-9);
  const cell = niceGridCell(modelDim);
  const span = reasonableGridSpan(modelDim, cell);
  helpers.__gridCellSize = cell;
  helpers.__gridBaseCenter = center.clone();
  helpers.__gridBaseFloorY = floorY;
  replaceGridIfNeeded(helpers, span, cell, center, floorY, true);
  try {
    helpers.ground.scale.setScalar(span / 200);
    helpers.ground.position.set(center.x, floorY - Math.max(modelDim, 1e-9) * 1e-4, center.z);
    helpers.ground.frustumCulled = false;
  } catch (_) {}
  try { helpers.axes.scale.setScalar(Math.max(modelDim * 0.35, cell * 8)); helpers.axes.frustumCulled = false; } catch (_) {}
}


function configureSceneShadowsForObject(root, helpers, keyLight) {
  if (!root || !helpers || !keyLight) return;
  const b = getObjectBounds(root, 1.05);
  if (!b) return;
  const center = b.center || b.box.getCenter(new THREE.Vector3());
  const dim = Math.max(b.maxDim || 1, 1e-6);
  const floorY = Number.isFinite(b.box?.min?.y) ? b.box.min.y : center.y - dim * 0.5;
  try {
    helpers.ground.position.set(center.x, floorY - dim * 1e-4, center.z);
    helpers.ground.scale.setScalar(Math.max(helpers.__gridWorldSize || dim * 8, dim * 4) / 200);
    helpers.ground.receiveShadow = true;
    helpers.ground.castShadow = false;
    const gmats = Array.isArray(helpers.ground.material) ? helpers.ground.material : [helpers.ground.material];
    gmats.forEach(m => { if (m) { m.needsUpdate = true; } });
  } catch (_) {}
  try {
    keyLight.target.position.copy(center);
    keyLight.position.copy(center.clone().add(new THREE.Vector3(dim * 2.1, dim * 3.0, dim * 2.4)));
    keyLight.updateMatrixWorld(true);
    keyLight.target.updateMatrixWorld(true);
    const cam = keyLight.shadow.camera;
    const r = Math.max(dim * 2.2, 1.0);
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.near = 0.001;
    cam.far = Math.max(dim * 8.0, 10.0);
    cam.updateProjectionMatrix();
  } catch (_) {}
  try {
    root.traverse(o => {
      if (o?.isMesh && o.geometry && !o.userData?.__isHoverOverlay) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  } catch (_) {}
}

function keepOrthographicDepthSafe(camera, controls, helpers, object) {
  if (!camera?.isOrthographicCamera || !controls?.target) return;
  const b = object ? getObjectBounds(object, 1.0) : null;
  const modelDim = Math.max(b?.maxDim || 1, 1e-9);
  const gridSize = Math.max(helpers?.__gridWorldSize || reasonableGridSpan(modelDim, helpers?.__gridCellSize), modelDim);
  const w = Math.abs((camera.right || 1) - (camera.left || -1)) / Math.max(camera.zoom || 1, 1e-6);
  const h = Math.abs((camera.top || 1) - (camera.bottom || -1)) / Math.max(camera.zoom || 1, 1e-6);
  const viewDiag = Math.sqrt(w * w + h * h);
  const span = Math.max(modelDim, gridSize, viewDiag, 1e-6);
  const target = controls.target;
  const dir = camera.position.clone().sub(target);
  if (!Number.isFinite(dir.lengthSq()) || dir.lengthSq() < 1e-12) dir.set(1, 0.7, 1);
  dir.normalize();
  const safeDist = Math.max(span * 3.0, 1.0);
  camera.position.copy(target.clone().add(dir.multiplyScalar(safeDist)));
  // Orthographic can use a negative near plane. This is the most robust way to stop
  // the grid/threads from being sliced when the view changes while preserving the
  // visible scale, because camera distance does not control orthographic zoom.
  camera.near = -safeDist * 4.0;
  camera.far = safeDist * 4.0;
  camera.updateProjectionMatrix();
}

function keepGridInfiniteForView(helpers, camera, controls, object) {
  // Historical function name kept for compatibility. It now keeps a finite,
  // model-sized grid. The grid is anchored to the model, not to the camera, and it
  // is never rebuilt larger just because the user zoomed out.
  if (!helpers?.grid) return;
  const b = object ? getObjectBounds(object, 1.0) : null;
  if (!b) { keepOrthographicDepthSafe(camera, controls, helpers, object); return; }
  const center = helpers.__gridBaseCenter || b.center || b.box.getCenter(new THREE.Vector3());
  const y = Number.isFinite(helpers.__gridBaseFloorY) ? helpers.__gridBaseFloorY : (Number.isFinite(b.box?.min?.y) ? b.box.min.y : 0);
  const modelDim = Math.max(b.maxDim || 1, 1e-9);
  const cell = helpers.__gridCellSize || niceGridCell(modelDim);
  const wanted = reasonableGridSpan(modelDim, cell);
  replaceGridIfNeeded(helpers, wanted, cell, center, y, false);
  try { helpers.grid.position.set(center.x, y, center.z); helpers.grid.frustumCulled = false; } catch (_) {}
  try {
    const gspan = helpers.__gridWorldSize || wanted;
    helpers.ground.scale.setScalar(gspan / 200);
    helpers.ground.position.set(center.x, y - Math.max(modelDim, 1e-9) * 1e-4, center.z);
    helpers.ground.frustumCulled = false;
  } catch (_) {}
  keepOrthographicDepthSafe(camera, controls, helpers, object);
}



/**
 * Minimal CAD TrackballControls.
 * - True 360° rotation, no OrbitControls polar clamp.
 * - Right button pans in CAD/object-follow direction: drag right => model moves right.
 * - Smooth inertia for rotate/pan/zoom.
 */
class TrackballControls {
  constructor(object, domElement) {
    this.object = object;
    this.domElement = domElement;
    this.enabled = true;
    this.rotateSpeed = 4.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.8;
    this.staticMoving = false;
    this.dynamicDampingFactor = 0.15;
    this.target = new THREE.Vector3();
    this._state = 0;
    this._rect = null;
    this._start = new THREE.Vector2();
    this._end = new THREE.Vector2();
    this._pointerId = null;
    this._lastAxis = new THREE.Vector3(1, 0, 0);
    this._lastAngle = 0;
    this._lastPan = new THREE.Vector3(0, 0, 0);
    this._lastDolly = 0;

    this._onContextMenu = (e) => e.preventDefault();
    this._onWheel = (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this._dolly(-(e.deltaY || 0));
      this.update();
    };
    this._onPointerDown = (e) => {
      if (!this.enabled) return;
      if (this._pointerId !== null) return;
      this._pointerId = e.pointerId;
      this._state = (e.button === 0) ? 1 : (e.button === 1) ? 2 : 3;
      this._start.set(e.clientX, e.clientY);
      this._end.copy(this._start);
      this._lastAngle = 0;
      this._lastPan.set(0, 0, 0);
      this._lastDolly = 0;
      try { this.domElement.setPointerCapture(e.pointerId); } catch (_) {}
      window.addEventListener('pointermove', this._onPointerMove, true);
      window.addEventListener('pointerup', this._onPointerUp, true);
    };
    this._onPointerMove = (e) => {
      if (!this.enabled || this._pointerId !== e.pointerId) return;
      this._end.set(e.clientX, e.clientY);
      if (this._state === 1) this._rotate(this._start, this._end);
      else if (this._state === 2) this._dolly(-(this._end.y - this._start.y) * 4);
      else if (this._state === 3) this._pan(this._start, this._end);
      this._start.copy(this._end);
      this.update();
    };
    this._onPointerUp = (e) => {
      if (this._pointerId !== e.pointerId) return;
      this._pointerId = null;
      this._state = 0;
      window.removeEventListener('pointermove', this._onPointerMove, true);
      window.removeEventListener('pointerup', this._onPointerUp, true);
      try { this.domElement.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    this.domElement.addEventListener('contextmenu', this._onContextMenu);
    this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    this.domElement.addEventListener('pointerdown', this._onPointerDown, true);
  }
  dispose() {
    this.domElement.removeEventListener('contextmenu', this._onContextMenu);
    this.domElement.removeEventListener('wheel', this._onWheel);
    this.domElement.removeEventListener('pointerdown', this._onPointerDown, true);
    window.removeEventListener('pointermove', this._onPointerMove, true);
    window.removeEventListener('pointerup', this._onPointerUp, true);
  }
  handleResize() { this._rect = this.domElement.getBoundingClientRect(); }
  update() {
    if (!this.staticMoving && this._state === 0) {
      if (Math.abs(this._lastAngle) > 1e-6) {
        this._applyRotation(this._lastAxis, this._lastAngle);
        this._lastAngle *= (1.0 - this.dynamicDampingFactor);
        if (Math.abs(this._lastAngle) < 1e-6) this._lastAngle = 0;
      }
      if (this._lastPan.lengthSq() > 1e-12) {
        this.object.position.add(this._lastPan);
        this.target.add(this._lastPan);
        this._lastPan.multiplyScalar(1.0 - this.dynamicDampingFactor);
        if (this._lastPan.lengthSq() < 1e-12) this._lastPan.set(0, 0, 0);
      }
      if (Math.abs(this._lastDolly) > 1e-6) {
        this._dolly(this._lastDolly);
        this._lastDolly *= (1.0 - this.dynamicDampingFactor);
        if (Math.abs(this._lastDolly) < 1e-6) this._lastDolly = 0;
      }
    }
    this.object.lookAt(this.target);
  }
  _getRect() { if (!this._rect) this.handleResize(); return this._rect; }
  _getNDC(clientX, clientY) {
    const r = this._getRect();
    const x = (clientX - r.left) / Math.max(1, r.width);
    const y = (clientY - r.top) / Math.max(1, r.height);
    return new THREE.Vector2(x * 2 - 1, -(y * 2 - 1));
  }
  _projectOnSphere(ndc) {
    const v = new THREE.Vector3(ndc.x, ndc.y, 0);
    const d2 = v.x * v.x + v.y * v.y;
    if (d2 <= 1.0) v.z = Math.sqrt(1.0 - d2);
    else { v.normalize(); v.z = 0.0; }
    return v;
  }
  _applyRotation(axisWorld, angle) {
    const q = new THREE.Quaternion().setFromAxisAngle(axisWorld, angle);
    const eye = this.object.position.clone().sub(this.target);
    eye.applyQuaternion(q);
    this.object.up.applyQuaternion(q);
    this.object.position.copy(this.target.clone().add(eye));
  }
  _rotate(startPx, endPx) {
    const a = this._projectOnSphere(this._getNDC(startPx.x, startPx.y));
    const b = this._projectOnSphere(this._getNDC(endPx.x, endPx.y));
    const axisCam = new THREE.Vector3().crossVectors(a, b);
    const axisLen = axisCam.length();
    if (axisLen < 1e-8) return;
    axisCam.normalize();
    const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
    let angle = -Math.acos(dot) * this.rotateSpeed;
    const axisWorld = axisCam.clone().applyQuaternion(this.object.quaternion).normalize();
    this._applyRotation(axisWorld, angle);
    this._lastAxis.copy(axisWorld);
    this._lastAngle = angle;
  }
  _dolly(delta) {
    const zoomFactor = Math.pow(0.95, (delta * this.zoomSpeed) * 0.01);
    if (this.object.isPerspectiveCamera) {
      const eye = this.object.position.clone().sub(this.target);
      eye.setLength(Math.max(1e-6, eye.length() * zoomFactor));
      this.object.position.copy(this.target.clone().add(eye));
    } else if (this.object.isOrthographicCamera) {
      this.object.zoom = Math.max(1e-3, this.object.zoom / zoomFactor);
      this.object.updateProjectionMatrix();
    }
    this._lastDolly = delta;
  }
  _pan(startPx, endPx) {
    const r = this._getRect();
    const dx = endPx.x - startPx.x;
    const dy = endPx.y - startPx.y;
    const h = Math.max(1, r.height);
    let scale = 1.0;
    if (this.object.isPerspectiveCamera) {
      const eye = this.object.position.clone().sub(this.target);
      const dist = eye.length();
      const fov = (this.object.fov || 60) * Math.PI / 180;
      scale = 2 * dist * Math.tan(fov / 2) / h;
    } else if (this.object.isOrthographicCamera) {
      scale = (this.object.top - this.object.bottom) / (Math.max(this.object.zoom || 1, 1e-6) * h);
    }
    // Intentional CAD direction: drag right => visual model moves right.
    const panX = -dx * scale * this.panSpeed;
    const panY =  dy * scale * this.panSpeed;
    const te = this.object.matrix.elements;
    const xAxis = new THREE.Vector3(te[0], te[1], te[2]);
    const yAxis = new THREE.Vector3(te[4], te[5], te[6]);
    const pan = xAxis.multiplyScalar(panX).add(yAxis.multiplyScalar(panY));
    this.object.position.add(pan);
    this.target.add(pan);
    this._lastPan.copy(pan);
  }
}

function axisFromToken(t) { if (t === 'X') return new THREE.Vector3(1, 0, 0); if (t === 'Y') return new THREE.Vector3(0, 1, 0); return new THREE.Vector3(0, 0, 1); }
function jointAxisLocal(j) {
  if (j?.axisWorldMeta && j.axisWorldMeta.length === 3 && j.userData?.__model && j.body0) {
    const model = j.userData.__model;
    const parent = model._linkInfo?.[j.body0];
    const frame = (parent ? parent.currentMatrix.clone() : new THREE.Matrix4()).multiply(j._localFrame0 || matrixFromPosQuat(j.localPos0 || [0,0,0], j.localRot0 || new THREE.Quaternion()));
    const q = new THREE.Quaternion().setFromRotationMatrix(frame).invert();
    const a = new THREE.Vector3(...j.axisWorldMeta).applyQuaternion(q).normalize();
    if (a.lengthSq() > EPS) return a;
  }
  if (j.axisJoint && j.axisJoint.length === 3) {
    const a = new THREE.Vector3(...j.axisJoint); if (a.lengthSq() > EPS) return a.normalize();
  }
  return axisFromToken(j.axisToken || 'Z');
}
function isMovableJoint(j) { return isMovableFull(j); }
function motionMatrix(j) {
  const axis = jointAxisLocal(j);
  if (!isMovableJoint(j)) return new THREE.Matrix4();
  if (/prismatic/i.test(j.jointType)) return new THREE.Matrix4().makeTranslation(axis.x * j.position, axis.y * j.position, axis.z * j.position);
  return new THREE.Matrix4().makeRotationAxis(axis, j.angle);
}

class USDModel extends THREE.Group {
  constructor(name = 'USDModel') {
    super();
    this.name = name;
    this.links = {};
    this.joints = {};
    this.loopJoints = [];
    this.couplings = [];
    this.implicitCandidates = [];
    this.singleDriverJoint = null;
    this.closureAffectingJointNames = new Set();
    this.manipulableJointByLink = new Map();
    this.isDraggingJoint = false;
    this.isSolvingLoops = false;
    this.lastLoopSolve = null;
    this.activeJointForDrag = null;
    this.pinnedSolverJointName = '';
    this.assetToMeshes = new Map();
    this.meshStats = { blocks: 0, ok: 0, markers: 0, failed: 0, skippedNestedLinks: 0 };
    this.userData.__isUSDModel = true;
    this.userData.__model = this;
  }
  setJointValue(name, v) {
    const j = typeof name === 'string' ? this.joints[name] : name;
    if (!j) return;
    setJointValueInternal(this, j, v);
  }
  applyPose() { applyPose(this); }
  getManipulableJointForLinkName(linkName) { return getManipulableJointForLinkName(this, linkName); }
  getJointWorldPivot(j) { return getJointWorldPivot(this, j); }
  getJointWorldAxis(j) { return getJointWorldAxis(this, j); }
  beginInteractiveDrag(joint = null) {
    this.isDraggingJoint = true;
    this.activeJointForDrag = joint || this.activeJointForDrag || null;
  }
  endInteractiveDrag(joint = null) {
    const pinned = (joint || this.activeJointForDrag || null)?.name || '';
    this.pinnedSolverJointName = pinned;
    this.activeJointForDrag = null;
    this.isDraggingJoint = false;
    solvePoseForCurrentValues(this, true);
    this.pinnedSolverJointName = '';
  }
}


function getOwnedMeshBlocksForLink(linkBlock, model) {
  const defs = findDefBlocks(linkBlock.body);
  const byPath = new Map(defs.map(b => [b.path, b]));
  const owned = [];
  let skipped = 0;
  for (const mb of defs.filter(b => b.type === 'Mesh')) {
    const ancestors = [];
    let parent = mb.parentPath || '';
    let insideOtherLink = false;
    while (parent) {
      const ab = byPath.get(parent);
      if (ab) {
        const head = directBody(ab.body);
        if (ab.type === 'Xform' && /automind:linkName/.test(head)) { insideOtherLink = true; break; }
        ancestors.unshift(ab);
      }
      parent = parent.replace(/\/[^\/]+$/, '');
    }
    if (insideOtherLink) { skipped++; continue; }
    const composed = new THREE.Matrix4().identity();
    const materialBodies = [directBody(linkBlock.body)];
    for (const ab of ancestors) {
      if (ab.type === 'Xform') composed.multiply(parseMatrix(directBody(ab.body)));
      materialBodies.push(directBody(ab.body));
    }
    materialBodies.push(directBody(mb.body));
    mb._composedLocalMatrix = composed.multiply(parseMatrix(directBody(mb.body)));
    // Material bindings and texture hints are frequently authored on an ancestor
    // Xform (Visual/Geom/Part) instead of directly on the Mesh prim. Preserve an
    // effective body so materials/textures are inherited exactly in the viewer and
    // therefore also in component thumbnails.
    mb._effectiveMaterialBody = materialBodies.join('\n');
    owned.push(mb);
  }
  model.meshStats.skippedNestedLinks += skipped;
  return owned;
}
function addTinyMarker(model, group, linkName) {
  model.meshStats.markers++;
  const geom = new THREE.SphereGeometry(0.0025, 12, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9aa9bb, roughness: 0.65 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = 'marker:' + linkName;
  mesh.userData.__linkName = linkName; mesh.userData.__assetKey = linkName;
  group.add(mesh);
  const arr = model.assetToMeshes.get(linkName) || []; arr.push(mesh); model.assetToMeshes.set(linkName, arr);
}
function addMeshToLink(model, info, block, assetDB) {
  model.meshStats.blocks++;
  const pts = parseArrayTriples(block.body, 'point3f\\[\\]\\s+points');
  const rawIdx = parseArrayInts(block.body, 'int\\[\\]\\s+faceVertexIndices');
  const counts = parseArrayInts(block.body, 'int\\[\\]\\s+faceVertexCounts');
  const idx = triangulateUsdIndices(rawIdx, counts);
  if (!pts.length || !idx.length) { model.meshStats.failed++; addTinyMarker(model, info.group, info.name); return; }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.flat()), 3));
  geom.setIndex(idx);
  const uvPairs = parseArrayPairs(block.body, 'texCoord2f\\[\\]\\s+primvars:st');
  if (uvPairs.length) {
    const uv = new Float32Array(pts.length * 2);
    for (let i = 0; i < pts.length; i++) { const p = uvPairs[i] || [0.5, 0.5]; uv[i * 2] = p[0] ?? 0.5; uv[i * 2 + 1] = p[1] ?? 0.5; }
    geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  geom.computeVertexNormals(); geom.computeBoundingSphere();
  const materialBody = block._effectiveMaterialBody || block.body;
  const colorNums0 = parseNums(match1(materialBody, /primvars:displayColor\s*=\s*\[\(([^\)]*)\)\]/s, '0.72 0.76 0.8'));
  const colorNums = findColorInMeshBody(materialBody, model, colorNums0);
  const color = new THREE.Color(colorNums[0] ?? 0.72, colorNums[1] ?? 0.76, colorNums[2] ?? 0.8);
  const texPath = findTexturePathInMeshBody(materialBody, model);
  const tex = textureFromAssetDB(assetDB, texPath, info.name);
  const mat = new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : color, map: tex || null, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide });
  if (tex) { mat.needsUpdate = true; }
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = 'mesh:' + info.name;
  mesh.userData.__linkName = info.name;
  mesh.userData.__assetKey = info.name;
  mesh.userData.textureFile = texPath || '';
  const meshMat = block._composedLocalMatrix || parseMatrix(directBody(block.body));
  setObjectMatrix(mesh, meshMat);
  info.group.add(mesh); info.meshes.push(mesh);
  const arr = model.assetToMeshes.get(info.name) || []; arr.push(mesh); model.assetToMeshes.set(info.name, arr);
  model.meshStats.ok++;
}
function createLink(model, block, assetDB) {
  const body0 = directBody(block.body);
  const linkName = parseStringAttr(body0, 'automind:linkName', block.name);
  const group = new THREE.Group();
  group.name = linkName; group.userData.__linkName = linkName; group.userData.__assetKey = linkName;
  const baseMatrix = parseMatrix(body0);
  setObjectMatrix(group, baseMatrix);
  const info = { name: linkName, primName: block.name, group, baseMatrix: baseMatrix.clone(), currentMatrix: baseMatrix.clone(), children: [], parentJoint: null, meshes: [], displayName: parseStringAttr(body0, 'automind:displayName', linkName) };
  model.links[linkName] = group;
  group.userData.__linkInfo = info;
  group.userData.__model = model;
  model.add(group);
  const mblocks = getOwnedMeshBlocksForLink(block, model);
  for (const mb of mblocks) addMeshToLink(model, info, mb, assetDB);
  if (!mblocks.length && linkName !== 'base_link') addTinyMarker(model, group, linkName);
  return info;
}
function parseJointBlock(block, model) {
  const body = directBody(block.body);
  const body0Path = match1(body, /rel\s+physics:body0\s*=\s*<([^>]+)>/);
  const body1Path = match1(body, /rel\s+physics:body1\s*=\s*<([^>]+)>/);
  const schema = block.type || '';
  const role = parseStringAttr(body, 'automind:jointRole', 'tree');
  let motionType = parseStringAttr(body, 'automind:motionType', '') || parseStringAttr(body, 'automind:originalType', '');
  if (!motionType) {
    if (/FixedJoint/i.test(schema)) motionType = 'fixed';
    else if (/PrismaticJoint/i.test(schema)) motionType = 'prismatic';
    else if (/RevoluteJoint/i.test(schema)) motionType = 'continuous';
    else motionType = 'fixed';
  }
  if (/FixedJoint/i.test(schema)) motionType = 'fixed';
  else if (/PrismaticJoint/i.test(schema)) motionType = 'prismatic';
  else if (/RevoluteJoint/i.test(schema) && /^fixed$/i.test(motionType)) motionType = 'continuous';

  const lowerRad = parseNumAttr(body, 'automind:lowerRad', -Math.PI);
  const upperRad = parseNumAttr(body, 'automind:upperRad', Math.PI);
  const lowerLimit = parseNumAttr(body, 'physics:lowerLimit', lowerRad);
  const upperLimit = parseNumAttr(body, 'physics:upperLimit', upperRad);
  // Joint objects are plain JS objects, not THREE.Group instances.
  // Object3D already owns a read-only/non-reassignable .position Vector3 in some
  // three.js builds; using a Group here caused `Cannot assign to read only property
  // 'position'` when storing prismatic scalar joint values.
  const j = { userData: {} };
  j.name = parseStringAttr(body, 'automind:jointName', block.name);
  j.jointType = motionType;
  j.schema = schema; j.role = role; j.type = motionType; j.originalType = parseStringAttr(body, 'automind:originalType', '');
  j.body0 = parseStringAttr(body, 'automind:parentLink', localNameFromPath(body0Path));
  j.body1 = parseStringAttr(body, 'automind:childLink', localNameFromPath(body1Path));
  j.parentLink = j.body0; j.childLink = j.body1;
  j.localPos0 = parseVecAttr(body, 'physics:localPos0'); j.localRot0 = parseQuatAttr(body, 'physics:localRot0');
  j.localPos1 = parseVecAttr(body, 'physics:localPos1'); j.localRot1 = parseQuatAttr(body, 'physics:localRot1');
  j.axisToken = parseStringAttr(body, 'physics:axis', 'Z');
  j.axisJoint = parseVecAttr(body, 'automind:axisJoint', null);
  j.axisSuccessor = parseVecAttr(body, 'automind:axisSuccessor', null);
  j.axisWorldMeta = parseVecAttr(body, 'automind:axisWorld', null);
  j.axis = jointAxisLocal(j);
  j.lowerRad = Number.isFinite(lowerRad) ? lowerRad : -Math.PI;
  j.upperRad = Number.isFinite(upperRad) ? upperRad : Math.PI;
  j.lowerLimit = Number.isFinite(lowerLimit) ? lowerLimit : j.lowerRad;
  j.upperLimit = Number.isFinite(upperLimit) ? upperLimit : j.upperRad;
  j.limit = { lower: j.lowerLimit, upper: j.upperLimit };
  j.angle = 0; j.position = 0; j.value = 0; j.inputValue = 0;
  j.mimicJoint = parseStringAttr(body, 'automind:mimicJoint', '');
  j.mimicMultiplier = parseNumAttr(body, 'automind:mimicMultiplier', 1);
  j.mimicOffset = parseNumAttr(body, 'automind:mimicOffset', 0);
  j.independent = parseStringAttr(body, 'automind:independent', '');
  j.authority = parseStringAttr(body, 'automind:kinematicAuthority', '');
  j.source = parseStringAttr(body, 'automind:source', '');
  j.evidence = parseStringAttr(body, 'automind:evidence', '');
  j.implicitMotionCandidate = parseBoolAttr(body, 'automind:implicitMotionCandidate', false);
  j.requiresReview = parseBoolAttr(body, 'automind:requiresReview', false);
  j.kinematicRole = parseStringAttr(body, 'automind:kinematicRole', '');
  j.exportedMovable = parseBoolAttr(body, 'automind:movable', isMovableJoint(j));
  j.viewerControllable = parseBoolAttr(body, 'automind:viewerControllable', isMovableJoint(j) && role !== 'loop');
  j._localFrame0 = matrixFromPosQuat(j.localPos0, j.localRot0);
  j._localFrame1 = matrixFromPosQuat(j.localPos1, j.localRot1);
  j._localFrame1Inv = j._localFrame1.clone().invert();
  j.userData.__isUSDJoint = true;
  j.userData.__joint = j;
  j.userData.__model = model;
  j.axis = jointAxisLocal(j);
  j.setJointValue = (v) => setJointValueInternal(model, j, v);
  j.getWorldPosition = (target = new THREE.Vector3()) => {
    const lf = model._linkInfo?.[j.body0];
    if (!lf) return target.set(0, 0, 0);
    const m = lf.currentMatrix.clone().multiply(j._localFrame0);
    return target.setFromMatrixPosition(m);
  };
  j.getWorldQuaternion = (target = new THREE.Quaternion()) => {
    const lf = model._linkInfo?.[j.body0];
    if (!lf) return target.identity();
    const m = lf.currentMatrix.clone().multiply(j._localFrame0);
    return target.setFromRotationMatrix(m);
  };
  return j;
}
function parseCouplingBlock(block) {
  const body = directBody(block.body);
  return {
    name: block.name,
    type: parseStringAttr(body, 'automind:type', 'linear'),
    masterJoint: parseStringAttr(body, 'automind:masterJoint', ''),
    dependentJoint: parseStringAttr(body, 'automind:dependentJoint', ''),
    ratio: parseNumAttr(body, 'automind:ratio', 1),
    offset: parseNumAttr(body, 'automind:offset', 0),
  };
}

function splitJointNames(s) { return String(s || '').split(/\s+/).map(x => x.trim()).filter(Boolean); }
function parseCouplingBlockFull(block) {
  const body = directBody(block.body);
  const c = parseCouplingBlock(block);
  c.masterJoints = splitJointNames(c.masterJoint);
  c.dependentJoints = splitJointNames(c.dependentJoint);
  c.masterLink = parseStringAttr(body, 'automind:masterLink', '');
  c.dependentLink = parseStringAttr(body, 'automind:dependentLink', '');
  c.solver = parseStringAttr(body, 'automind:solver', '');
  c.mode = parseStringAttr(body, 'automind:mode', '');
  c.source = parseStringAttr(body, 'automind:source', '');
  c.evidence = parseStringAttr(body, 'automind:evidence', '');
  return c;
}
function parseImplicitCandidateBlock(block) {
  const body = directBody(block.body);
  return {
    name: block.name,
    pair: parseStringAttr(body, 'automind:pair', ''),
    linkA: parseStringAttr(body, 'automind:linkA', ''),
    linkB: parseStringAttr(body, 'automind:linkB', ''),
    rank: parseNumAttr(body, 'automind:rank', 0),
    freeDof: parseNumAttr(body, 'automind:freeDof', 0),
    axisLike: parseNumAttr(body, 'automind:axisLike', 0),
    planar: parseNumAttr(body, 'automind:planar', 0),
    hasAxisPoint: parseBoolAttr(body, 'automind:hasAxisPoint', false),
    axisWorld: parseVecAttr(body, 'automind:axisWorld', [0,0,1]),
    axisPointWorld: parseVecAttr(body, 'automind:axisPointWorld', [0,0,0]),
    exportedJoint: parseStringAttr(body, 'automind:exportedJoint', ''),
    exportedRole: parseStringAttr(body, 'automind:exportedRole', ''),
    activeForViewerClosure: parseBoolAttr(body, 'automind:activeForViewerClosure', false),
    solver: parseStringAttr(body, 'automind:solver', ''),
    evidence: parseStringAttr(body, 'automind:evidence', ''),
    reason: parseStringAttr(body, 'automind:reason', ''),
    localPointA: null, localPointB: null, localAxisA: null, localAxisB: null,
  };
}
function buildMaterialMaps(blocks) {
  const texByPath = new Map(), colorByPath = new Map();
  const imgRe = /@([^@]+\.(?:png|jpg|jpeg|webp|gif|bmp|svg))@/ig;
  for (const b of blocks) {
    if (!/^(Material|Shader)$/.test(b.type)) continue;
    const body = String(b.body || '');
    let m = imgRe.exec(body);
    if (m) {
      const val = m[1];
      texByPath.set(b.path, val); texByPath.set('/' + b.name, val); texByPath.set(b.name, val);
    }
    const dc = parseVecAttr(body, 'inputs:diffuseColor', null) || parseVecAttr(body, 'primvars:displayColor', null);
    if (dc && dc.length >= 3) {
      colorByPath.set(b.path, dc); colorByPath.set('/' + b.name, dc); colorByPath.set(b.name, dc);
    }
  }
  // If Material contains nested Shader, parent body contains the asset path because findDefBlocks preserves nested body.
  for (const b of blocks.filter(x => x.type === 'Material')) {
    const body = String(b.body || '');
    imgRe.lastIndex = 0;
    const m = imgRe.exec(body);
    if (m) { texByPath.set(b.path, m[1]); texByPath.set('/' + b.name, m[1]); texByPath.set(b.name, m[1]); }
    const dc = parseVecAttr(body, 'inputs:diffuseColor', null) || parseVecAttr(body, 'primvars:displayColor', null);
    if (dc && dc.length >= 3) { colorByPath.set(b.path, dc); colorByPath.set('/' + b.name, dc); colorByPath.set(b.name, dc); }
  }
  return { texByPath, colorByPath };
}
function getPathMapValue(map, path) {
  if (!map || !path) return null;
  const raw = String(path || '');
  const base = basename(raw);
  const variants = [raw, '/' + raw.replace(/^\/+/, ''), base, '/' + base];
  for (const v of variants) {
    if (map.has(v)) return map.get(v);
  }
  const clean = raw.toLowerCase().replace(/^\/+/, '');
  const cleanBase = base.toLowerCase();
  for (const [k, v] of map.entries()) {
    const kk = String(k || '').toLowerCase().replace(/^\/+/, '');
    const kb = basename(kk).toLowerCase();
    if (kk === clean || kb === cleanBase || kk.endsWith('/' + clean) || clean.endsWith('/' + kk)) return v;
  }
  return null;
}
function materialBindingPath(body) {
  return match1(body, /rel\s+material:binding\s*=\s*<([^>]+)>/) || match1(body, /rel\s+material:binding\s*=\s*\[\s*<([^>]+)>/);
}
function findTexturePathInMeshBody(body, model) {
  const txt = String(body || '');
  let p = parseStringAttr(txt, 'automind:textureFile', '') || match1(txt, /asset\s+inputs:file\s*=\s*@([^@]+)@/s, '');
  if (p) return p;
  const bind = materialBindingPath(txt);
  if (bind) {
    p = getPathMapValue(model?._materialTextures, bind);
    if (p) return p;
  }
  p = match1(txt, /@([^@]+\.(?:png|jpg|jpeg|webp|gif|bmp|svg))@/is, '');
  return p || '';
}
function findColorInMeshBody(body, model, fallbackColorNums) {
  const bind = materialBindingPath(body);
  const c = bind ? getPathMapValue(model?._materialColors, bind) : null;
  if (c && c.length >= 3) return c;
  return fallbackColorNums;
}
function textureFromAssetDB(assetDB, texPath, meshName='') {
  if (!texPath || !assetDB?.get) return null;
  const tries = [texPath, basename(texPath), String(texPath).replace(/^\.\//,''), String(texPath).replace(/^\.\.\//,'')];
  let data = '';
  for (const t of tries) { data = assetDB.get(t); if (data) break; }
  if (!data) return null;
  const tex = new THREE.TextureLoader().load(data, () => { try { tex.needsUpdate = true; } catch (_) {} });
  tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  if ('encoding' in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  tex.name = basename(texPath) || meshName || 'usd_texture';
  tex.needsUpdate = true;
  return tex;
}
function buildKinematicTree(model, allJoints) {
  model._allJoints = allJoints || [];
  model.loopJoints = [];
  model.joints = {};
  const infoByName = model._linkInfo;
  Object.values(infoByName).forEach(l => { l.children = []; l.parentJoint = null; l.group.userData.__joint = null; });
  const childTaken = new Set();
  const roots = [];
  for (const j of allJoints) {
    if (!infoByName[j.body0] || !infoByName[j.body1]) continue;
    const isLoop = j.role === 'loop' || childTaken.has(j.body1);
    if (isLoop) { model.loopJoints.push(j); model.joints[j.name] = j; continue; }
    j.tree = true; childTaken.add(j.body1);
    infoByName[j.body1].parentJoint = j.name; infoByName[j.body0].children.push(j.body1);
    const childGroup = infoByName[j.body1].group;
    childGroup.userData.__joint = j;
    j.child = childGroup;
    model.joints[j.name] = j;
  }
  Object.values(infoByName).forEach(l => { if (!l.parentJoint) roots.push(l.name); });
  model._roots = roots;
}
function applyCouplings(model) {
  Object.values(model.joints).forEach(j => {
    if (j.mimicJoint && model.joints[j.mimicJoint]) {
      const m = model.joints[j.mimicJoint];
      const v = (m.value || 0) * j.mimicMultiplier + j.mimicOffset;
      if (/prismatic/i.test(j.jointType)) j.position = v; else j.angle = v; j.value = v;
    }
  });
  for (const c of model.couplings || []) {
    if (!/^linear$/i.test(c.type || '')) continue;
    const m = model.joints[c.masterJoint], d = model.joints[c.dependentJoint];
    if (m && d) {
      const v = (m.value || 0) * c.ratio + c.offset;
      if (/prismatic/i.test(d.jointType)) d.position = v; else d.angle = v; d.value = v;
    }
  }
}
function applyPoseRecursive(model, linkName, worldMatrix) {
  const info = model._linkInfo?.[linkName]; if (!info) return;
  info.currentMatrix.copy(worldMatrix);
  setObjectMatrix(info.group, worldMatrix);
  for (const childName of info.children || []) {
    const child = model._linkInfo?.[childName]; if (!child) continue;
    const j = model.joints[child.parentJoint]; if (!j || j.body0 !== linkName) continue;
    const childWorld = worldMatrix.clone().multiply(j._localFrame0).multiply(motionMatrix(j)).multiply(j._localFrame1Inv);
    applyPoseRecursive(model, childName, childWorld);
  }
}
function applyPoseRaw(model, updateWorld=true) {
  for (const r of model._roots || []) {
    const info = model._linkInfo?.[r]; if (info) applyPoseRecursive(model, r, info.baseMatrix.clone());
  }
  if (updateWorld) model.updateMatrixWorld(true);
}

function jointIsPrismatic(j){ return /prismatic/i.test(j?.jointType || j?.type || '') || /Prismatic/i.test(j?.schema || ''); }
function jointIsRevolute(j){ return /revolute|continuous|hinge/i.test(j?.jointType || j?.type || '') || /Revolute/i.test(j?.schema || ''); }
function isImplicitFreeDof(j){
  if (!j) return false;
  const src = `${j.source || ''} ${j.authority || ''} ${j.kinematicRole || ''}`;
  return !!(j.implicitMotionCandidate || /raw_free_dof\s*=\s*1|rank\s*=\s*5|unlocked\s+Insert|concentric shaft can spin/i.test(src));
}
function isImplicitMovable(j){ return !!(j && String(j.jointType || j.type || '').toLowerCase() === 'fixed' && j.tree && j.role !== 'root' && isImplicitFreeDof(j)); }
function isMovableFull(j){
  if (!j) return false;
  if (isImplicitMovable(j)) return true;
  if (j.exportedMovable === true && !/FixedJoint/i.test(j.schema || '')) return true;
  if (/RevoluteJoint|PrismaticJoint/i.test(j.schema || '')) return true;
  return !!(j.jointType && !/^fixed$/i.test(j.jointType) && !/FixedJoint/i.test(j.schema || ''));
}
function jointValue(j){ return Number(j?.value || 0); }
function setJointScalar(j, v) {
  const val = Number.isFinite(Number(v)) ? Number(v) : 0;
  j.value = val;
  if (jointIsPrismatic(j)) j.position = val; else j.angle = val;
}
function activeImplicitClosureCandidates(model){ return (model.implicitCandidates || []).filter(c => c && c.activeForViewerClosure && c.localPointA && c.localPointB); }
function treeJointBetweenLinks(model, a, b){
  if (!a || !b) return null;
  return (model._allJoints || []).find(j => j && j.tree && j.role !== 'loop' && ((j.body0 === a && j.body1 === b) || (j.body0 === b && j.body1 === a))) || null;
}
function loopIsSolverRelevant(model, j){
  if (!j || !model._linkInfo?.[j.body0] || !model._linkInfo?.[j.body1]) return false;
  // If this pair already has a tree joint, do not close it again as a hard loop.
  if (treeJointBetweenLinks(model, j.body0, j.body1)) return false;
  const txt = `${j.name || ''} ${j.source || ''} ${j.evidence || ''} ${j.authority || ''} ${j.kinematicRole || ''}`;
  if (/diagnostic_only|visual_fastener|requires_review\s*=\s*true/i.test(txt)) return false;
  return true;
}
function implicitCandidateIsSolverRelevant(model, c){
  if (!(c && c.activeForViewerClosure && c.localPointA && c.localPointB)) return false;
  if (!model._linkInfo?.[c.linkA] || !model._linkInfo?.[c.linkB]) return false;
  const tj = treeJointBetweenLinks(model, c.linkA, c.linkB);
  if (tj) return false;
  if (c.exportedJoint) {
    const ej = model.joints?.[c.exportedJoint];
    if (ej && ej.tree && ej.role !== 'loop') return false;
  }
  const txt = `${c.name || ''} ${c.reason || ''} ${c.evidence || ''} ${c.exportedRole || ''}`;
  if (/unlocked\s+Insert|axis_joint|joint_axis|spin|shaft\s+can\s+spin|hinge/i.test(txt)) return false;
  return true;
}
function activeSolverLoopJoints(model, max=Infinity){
  const arr = [];
  for (const j of model.loopJoints || []) {
    if (arr.length >= max) break;
    if (loopIsSolverRelevant(model, j)) arr.push(j);
  }
  return arr;
}
function activeSolverImplicitClosureCandidates(model, max=Infinity){
  const arr = [];
  for (const c of activeImplicitClosureCandidates(model)) {
    if (arr.length >= max) break;
    if (implicitCandidateIsSolverRelevant(model, c)) arr.push(c);
  }
  return arr;
}
function localPointFromWorld(model, linkName, worldPoint){
  const l = model._linkInfo?.[linkName]; if (!l) return new THREE.Vector3();
  return new THREE.Vector3(...worldPoint).applyMatrix4(l.baseMatrix.clone().invert());
}
function localDirFromWorld(model, linkName, worldDir){
  const l = model._linkInfo?.[linkName]; const v = new THREE.Vector3(...(worldDir || [0,0,1]));
  if (v.lengthSq() < EPS) v.set(0,0,1);
  if (l) v.transformDirection(l.baseMatrix.clone().invert());
  v.normalize(); if (v.lengthSq() < EPS) v.set(0,0,1); return v;
}
function finalizeImplicitCandidateFrames(model){
  for (const c of model.implicitCandidates || []) {
    if (!c.activeForViewerClosure || !c.hasAxisPoint) continue;
    if (!model._linkInfo?.[c.linkA] || !model._linkInfo?.[c.linkB]) { c.activeForViewerClosure = false; continue; }
    c.localPointA = localPointFromWorld(model, c.linkA, c.axisPointWorld);
    c.localPointB = localPointFromWorld(model, c.linkB, c.axisPointWorld);
    c.localAxisA = localDirFromWorld(model, c.linkA, c.axisWorld);
    c.localAxisB = localDirFromWorld(model, c.linkB, c.axisWorld);
  }
}
function linkToken(name){ return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_'); }
function linkByToken(model, token){ const t = linkToken(token); for (const k of Object.keys(model._linkInfo || {})) if (linkToken(k).includes(t)) return k; return ''; }
function candidateBetween(model, a,b){ return (model.implicitCandidates || []).find(c => c && ((c.linkA===a && c.linkB===b) || (c.linkA===b && c.linkB===a))); }
function localPointArrayFromWorld(model, linkName, worldPoint){ const p = localPointFromWorld(model, linkName, worldPoint); return [p.x,p.y,p.z]; }
function localAxisArrayFromWorld(model, linkName, worldDir){ const v = localDirFromWorld(model, linkName, worldDir); return [v.x,v.y,v.z]; }
function rewireTreeParent(model, j, newParent){
  if (!j || !newParent || !model._linkInfo?.[newParent]) return;
  const oldParent = j.body0;
  if (oldParent && model._linkInfo[oldParent]) {
    const arr = model._linkInfo[oldParent].children || [];
    const idx = arr.indexOf(j.body1); if (idx >= 0) arr.splice(idx,1);
  }
  j.body0 = j.parentLink = newParent;
  if (!model._linkInfo[newParent].children.includes(j.body1)) model._linkInfo[newParent].children.push(j.body1);
  const child = model._linkInfo[j.body1]; if (child) child.parentJoint = j.name;
}
function promoteJointFromCandidate(model, j, c, reason){
  if (!j || !c || !c.hasAxisPoint) return false;
  j.schema = /Revolute/i.test(j.schema || '') ? j.schema : 'PhysicsRevoluteJoint';
  j.jointType = j.type = 'continuous';
  j.exportedMovable = true; j.viewerControllable = false; j.implicitMotionCandidate = true;
  j.kinematicRole = j.kinematicRole || 'dependent_passive_implicit_coordinate';
  j.authority = (j.authority || '') + ' BUILD131_viewer_repair_from_implicit_candidate';
  j.source = (j.source || '') + ' BUILD131_viewer_promoted_fixed_rank4_axis_candidate';
  j.evidence = (j.evidence || '') + ' ' + (c.evidence || '');
  j.axisWorldMeta = c.axisWorld || [0,0,1];
  j.axisJoint = localAxisArrayFromWorld(model, j.body0, j.axisWorldMeta);
  j.axisSuccessor = localAxisArrayFromWorld(model, j.body1, j.axisWorldMeta);
  j.axis = jointAxisLocal(j);
  j.localPos0 = localPointArrayFromWorld(model, j.body0, c.axisPointWorld);
  j.localPos1 = localPointArrayFromWorld(model, j.body1, c.axisPointWorld);
  j._localFrame0 = matrixFromPosQuat(j.localPos0, j.localRot0);
  j._localFrame1 = matrixFromPosQuat(j.localPos1, j.localRot1);
  j._localFrame1Inv = j._localFrame1.clone().invert();
  j._viewerRepair = reason || 'promoted_from_candidate';
  c.exportedJoint = j.name; c.exportedRole = j.kinematicRole; c.exportedType = j.jointType;
  return true;
}
function applyViewerMechanismRepairsFromCadEvidence(model){
  const repairs = [];
  for (const j of model._allJoints || []) {
    if (!(j && j.tree && /^fixed$/i.test(j.jointType || j.type || ''))) continue;
    const c = candidateBetween(model, j.body0, j.body1);
    if (!c) continue;
    if (c.rank === 4 && c.freeDof >= 1 && c.axisLike === 1 && c.planar === 0 && c.hasAxisPoint) {
      if (promoteJointFromCandidate(model, j, c, 'rank4_axis_like1_nonplanar_fixed_joint')) repairs.push(`${j.name}:fixed→continuous`);
    }
  }
  // BUILD133: Inventor unlocked Insert must stay as a spin axis, not as a rigid lock.
  for (const j of model._allJoints || []) {
    if (!(j && j.tree && /^fixed$/i.test(j.jointType || j.type || ''))) continue;
    const c = candidateBetween(model, j.body0, j.body1);
    if (!c || !c.hasAxisPoint) continue;
    const txt = `${c.reason || ''} ${c.solver || ''} ${c.exportedRole || ''} ${j.source || ''} ${j.evidence || ''}`;
    const sameExport = !c.exportedJoint || c.exportedJoint === j.name;
    const unlockedInsertAxis = /unlocked\s+Insert|concentric\s+shaft\s+can\s+spin|shaft\s+can\s+spin|insert\s+desbloqueado/i.test(txt);
    if (sameExport && unlockedInsertAxis) {
      if (promoteJointFromCandidate(model, j, c, 'build133_unlocked_insert_axis_not_fixed')) {
        j.viewerControllable = true;
        j.independent = j.independent || 'false';
        j.kinematicRole = j.kinematicRole || 'local_unlocked_insert_axis';
        repairs.push(`${j.name}:unlockedInsert fixed→axis`);
      }
    }
  }

  for (const [piesaTok,bucsaTok] of [['piesa_3_1','bucsa_1'], ['piesa_3_2','bucsa_2']]) {
    const piesa = linkByToken(model, piesaTok), bucsa = linkByToken(model, bucsaTok);
    if (!piesa || !bucsa) continue;
    const c = candidateBetween(model, piesa, bucsa);
    if (!(c && c.rank === 4 && c.freeDof >= 1 && c.axisLike === 1 && c.planar === 0 && c.hasAxisPoint)) continue;
    const child = model._linkInfo[piesa];
    const j = child ? model.joints[child.parentJoint] : null;
    if (!j) continue;
    const oldParent = j.body0;
    rewireTreeParent(model, j, bucsa);
    if (promoteJointFromCandidate(model, j, c, `star_${piesaTok}_to_${bucsaTok}`)) repairs.push(`${piesa}:${oldParent}→${bucsa}`);
  }
  model.viewerRepairs = repairs;
  if (repairs.length) console.warn('BUILD131 viewer CAD repairs applied', repairs);
}
function recomputeDriverCache(model){
  const drivers = (model._allJoints || []).filter(j => j && j.tree && j.role !== 'loop' && isMovableFull(j) &&
    (j.independent === 'true' || /active|driver|independent/i.test(`${j.kinematicRole || ''} ${j.authority || ''} ${j.source || ''}`)));
  model.singleDriverJoint = drivers.length === 1 ? drivers[0] : null;
}
function recomputeClosureAffectingJoints(model){
  model.closureAffectingJointNames = new Set();
  const addAncestors = (linkName) => {
    let info = model._linkInfo?.[linkName]; const seen = new Set();
    while (info && !seen.has(info.name)) {
      seen.add(info.name);
      const j = model.joints?.[info.parentJoint];
      if (!j) break;
      if (j.tree && isMovableFull(j)) model.closureAffectingJointNames.add(j.name);
      info = model._linkInfo?.[j.body0];
    }
  };
  for (const l of activeSolverLoopJoints(model)) { addAncestors(l.body0); addAncestors(l.body1); }
  for (const c of activeSolverImplicitClosureCandidates(model)) { addAncestors(c.linkA); addAncestors(c.linkB); }
}
function closureConstraintCount(model){ return activeSolverLoopJoints(model).length + activeSolverImplicitClosureCandidates(model).length; }
function jointAffectsAnyClosure(model, joint){ return !!(joint && joint.tree && isMovableFull(joint) && joint.role !== 'loop' && model.closureAffectingJointNames?.has(joint.name)); }
function nearestMovableAncestorJointRaw(model, linkName){
  let info = model._linkInfo?.[linkName]; const visited = new Set();
  while (info && !visited.has(info.name)) {
    visited.add(info.name);
    const j = model.joints?.[info.parentJoint];
    if (j && j.tree && isMovableFull(j)) return j;
    if (!j) break;
    info = model._linkInfo?.[j.body0];
  }
  return null;
}

function shouldRouteManipulationToSingleDriver(model, linkName, directJoint){
  // BUILD134_HTML_MECHANISM: exact policy from the standalone USD_Viewer(4).html.
  // Do NOT redirect every link in a closed chain to a global single driver.
  // The clicked component must use its nearest local movable joint; the compliant
  // loop solver only adjusts passive closures. This prevents the viewer from
  // feeling "trancado" or from moving only one unrelated driver link.
  return false;
}
function getManipulableJointForLinkName(model, linkName){
  if (model.manipulableJointByLink?.has(linkName)) return model.manipulableJointByLink.get(linkName);
  const direct = nearestMovableAncestorJointRaw(model, linkName);
  if (!direct) return null;
  if (shouldRouteManipulationToSingleDriver(model, linkName, direct)) return model.singleDriverJoint || direct;
  return direct;
}
function rebuildManipulableCache(model){
  recomputeDriverCache(model); recomputeClosureAffectingJoints(model);
  model.manipulableJointByLink = new Map();
  for (const info of Object.values(model._linkInfo || {})) {
    const direct = nearestMovableAncestorJointRaw(model, info.name);
    if (!direct) continue;
    let chosen = direct;
    if (shouldRouteManipulationToSingleDriver(model, info.name, direct) && model.singleDriverJoint) chosen = model.singleDriverJoint;
    model.manipulableJointByLink.set(info.name, chosen);
  }
}
function getJointWorldPivot(model, j){
  const parent = model._linkInfo?.[j.body0]; if (!parent) return new THREE.Vector3();
  const m = parent.currentMatrix.clone().multiply(j._localFrame0 || matrixFromPosQuat(j.localPos0, j.localRot0));
  return new THREE.Vector3().setFromMatrixPosition(m);
}
function getJointWorldAxis(model, j){
  const parent = model._linkInfo?.[j.body0];
  const axis = jointAxisLocal(j).clone();
  if (parent) axis.transformDirection(parent.currentMatrix.clone().multiply(j._localFrame0 || matrixFromPosQuat(j.localPos0, j.localRot0))).normalize();
  if (axis.lengthSq() < EPS) axis.set(0,0,1);
  return axis.normalize();
}
function worldFrameForJointSide(model, j, side){
  const info = model._linkInfo?.[side === 0 ? j.body0 : j.body1];
  if (!info) return new THREE.Matrix4();
  return info.currentMatrix.clone().multiply(side === 0 ? (j._localFrame0 || matrixFromPosQuat(j.localPos0,j.localRot0)) : (j._localFrame1 || matrixFromPosQuat(j.localPos1,j.localRot1)));
}
function worldAxisForJointSide(model, j, side){
  const frame = worldFrameForJointSide(model, j, side);
  let axis;
  if (side === 1 && j.axisSuccessor && j.axisSuccessor.length === 3) axis = new THREE.Vector3(...j.axisSuccessor);
  else if (j.axisJoint && j.axisJoint.length === 3) axis = new THREE.Vector3(...j.axisJoint);
  else axis = jointAxisLocal(j);
  axis.transformDirection(frame).normalize(); if (axis.lengthSq() < EPS) axis.set(0,0,1); return axis;
}
function collectLoopError(model, maxConstraints=Infinity){
  const e = [];
  const scale = Math.max(getObjectBounds(model, 1)?.maxDim || 1, 1e-4);
  const axisWeight = Math.min(Math.max(scale * 0.35, 1e-4), 0.05);
  const loopWeight = model.isDraggingJoint ? PERF.DLS_EXPLICIT_LOOP_WEIGHT_INTERACTIVE : PERF.DLS_EXPLICIT_LOOP_WEIGHT_FINAL;
  const implicitWeight = model.isDraggingJoint ? PERF.DLS_IMPLICIT_WEIGHT_INTERACTIVE : PERF.DLS_IMPLICIT_WEIGHT_FINAL;
  let used = 0;
  for (const j of activeSolverLoopJoints(model, maxConstraints)) {
    if (used++ >= maxConstraints) break;
    const a = worldFrameForJointSide(model, j, 0), b = worldFrameForJointSide(model, j, 1);
    const pa = new THREE.Vector3().setFromMatrixPosition(a), pb = new THREE.Vector3().setFromMatrixPosition(b);
    e.push((pb.x - pa.x) * loopWeight, (pb.y - pa.y) * loopWeight, (pb.z - pa.z) * loopWeight);
    const aa = worldAxisForJointSide(model, j, 0), ab = worldAxisForJointSide(model, j, 1);
    const c = new THREE.Vector3().crossVectors(aa, ab);
    e.push(c.x * axisWeight * loopWeight, c.y * axisWeight * loopWeight, c.z * axisWeight * loopWeight);
  }
  if (used < maxConstraints) {
    for (const cand of activeSolverImplicitClosureCandidates(model, maxConstraints - used)) {
      if (used++ >= maxConstraints) break;
      const la = model._linkInfo?.[cand.linkA], lb = model._linkInfo?.[cand.linkB]; if (!la || !lb) continue;
      const pa = cand.localPointA.clone().applyMatrix4(la.currentMatrix), pb = cand.localPointB.clone().applyMatrix4(lb.currentMatrix);
      e.push((pb.x - pa.x) * implicitWeight, (pb.y - pa.y) * implicitWeight, (pb.z - pa.z) * implicitWeight);
      const aa = cand.localAxisA.clone().transformDirection(la.currentMatrix).normalize(), ab = cand.localAxisB.clone().transformDirection(lb.currentMatrix).normalize();
      const cx = new THREE.Vector3().crossVectors(aa, ab);
      e.push(cx.x * axisWeight * implicitWeight, cx.y * axisWeight * implicitWeight, cx.z * axisWeight * implicitWeight);
    }
  }
  return e;
}
function loopErrorNorm(e){ if (!e || !e.length) return 0; let s=0; for (const v of e) s += v*v; return Math.sqrt(s / Math.max(1, e.length/3)); }
function linearDrivenJointNameSet(model){ const set = new Set(); for (const c of model.couplings || []) if (/^linear$/i.test(c.type || '') && c.dependentJoint) set.add(c.dependentJoint); for (const j of model._allJoints || []) if (j.mimicJoint) set.add(j.name); return set; }
function solverHintDependentNameSet(model){ const set = new Set(); for (const c of model.couplings || []) { const text = `${c.type||''} ${c.solver||''} ${c.mode||''} ${c.source||''}`; if (!/closed_chain|loop|solver|gauss|pin_axis/i.test(text)) continue; for (const name of c.dependentJoints || []) { const j = model.joints?.[name]; if (j && j.tree && j.role !== 'loop') set.add(name); } } return set; }
function passiveLoopSolverJoints(model){
  const linearDriven = linearDrivenJointNameSet(model), hinted = solverHintDependentNameSet(model), hasHint = hinted.size > 0;
  const vars = (model._allJoints || []).filter(j => {
    if (!(j && j.tree && j.role !== 'loop' && isMovableFull(j))) return false;
    if (model.pinnedSolverJointName && j.name === model.pinnedSolverJointName) return false;
    if (model.activeJointForDrag && j.name === model.activeJointForDrag.name) return false;
    if (j.independent === 'true' || /active|driver|direct/i.test(j.kinematicRole || '')) return false;
    if (!jointAffectsAnyClosure(model, j)) return false;
    if (hasHint) return hinted.has(j.name);
    if (linearDriven.has(j.name)) return false;
    return true;
  });
  return vars.slice(0, model.isDraggingJoint ? PERF.DLS_INTERACTIVE_MAX_VARS : PERF.DLS_FINAL_MAX_VARS);
}
function solveLinearDampedNormal(J, e, lambda=1e-4){
  const m=e.length, n=J.length ? J[0].length : 0; if (!m || !n) return [];
  const A=Array.from({length:n},()=>Array(n).fill(0)), b=Array(n).fill(0);
  for(let r=0;r<m;r++) for(let c=0;c<n;c++){ b[c]+=J[r][c]*e[r]; for(let k=0;k<n;k++) A[c][k]+=J[r][c]*J[r][k]; }
  for(let i=0;i<n;i++) A[i][i]+=lambda;
  const M=A.map((row,i)=>row.concat([-b[i]]));
  for(let col=0; col<n; col++){
    let piv=col; for(let r=col+1;r<n;r++) if(Math.abs(M[r][col])>Math.abs(M[piv][col])) piv=r;
    if(Math.abs(M[piv][col])<1e-12) continue;
    if(piv!==col){ const tmp=M[piv]; M[piv]=M[col]; M[col]=tmp; }
    const div=M[col][col]; for(let c=col;c<=n;c++) M[col][c]/=div;
    for(let r=0;r<n;r++){ if(r===col) continue; const f=M[r][col]; if(Math.abs(f)<1e-14) continue; for(let c=col;c<=n;c++) M[r][c]-=f*M[col][c]; }
  }
  return M.map(row=>row[n] || 0);
}
function solveLoopClosureDLS(model){
  if (!closureConstraintCount(model)) return;
  const maxConstraints = model.isDraggingJoint ? PERF.DLS_INTERACTIVE_MAX_CONSTRAINTS : PERF.DLS_FINAL_MAX_CONSTRAINTS;
  const vars = passiveLoopSolverJoints(model);
  if (!vars.length) { model.lastLoopSolve = { residual: loopErrorNorm(collectLoopError(model, maxConstraints)), vars:0, iterations:0, constraints:closureConstraintCount(model) }; return; }
  model.isSolvingLoops = true;
  try {
    let residual = Infinity;
    const maxIter = model.isDraggingJoint ? PERF.DLS_INTERACTIVE_MAX_ITER : PERF.DLS_FINAL_MAX_ITER;
    let lambda = model.isDraggingJoint ? PERF.DLS_INTERACTIVE_LAMBDA : PERF.DLS_FINAL_LAMBDA;
    const stopResidual = model.isDraggingJoint ? PERF.DLS_INTERACTIVE_STOP_RESIDUAL : PERF.DLS_FINAL_STOP_RESIDUAL;
    const relaxation = model.isDraggingJoint ? PERF.DLS_INTERACTIVE_RELAXATION : PERF.DLS_FINAL_RELAXATION;
    for (let it=0; it<maxIter; it++){
      applyPoseRaw(model, false);
      const e0 = collectLoopError(model, maxConstraints);
      residual = loopErrorNorm(e0);
      if (residual < stopResidual) { model.lastLoopSolve = { residual, vars:vars.length, iterations:it, constraints:Math.min(closureConstraintCount(model), maxConstraints) }; break; }
      const m=e0.length, n=vars.length; const J=Array.from({length:m},()=>Array(n).fill(0));
      for (let c=0;c<n;c++){
        const j=vars[c], old=jointValue(j), eps=jointIsPrismatic(j) ? 1e-5 : 1e-4;
        setJointScalar(j, old + eps); applyPoseRaw(model, false);
        const e1=collectLoopError(model, maxConstraints); setJointScalar(j, old);
        for(let r=0;r<m;r++) J[r][c]=(e1[r]-e0[r])/eps;
      }
      const oldVals=vars.map(j=>jointValue(j)); const dq=solveLinearDampedNormal(J,e0,lambda); let maxStep=0;
      for(let c=0;c<vars.length;c++){
        const j=vars[c]; let step=Number(dq[c] || 0) * relaxation;
        const lim=jointIsPrismatic(j) ? 0.004 : (model.isDraggingJoint ? 0.08 : 0.12);
        step=Math.max(-lim, Math.min(lim, step));
        let nv=oldVals[c]+step; if(Number.isFinite(j.lowerRad)&&Number.isFinite(j.upperRad)) nv=Math.max(j.lowerRad, Math.min(j.upperRad, nv));
        setJointScalar(j,nv); maxStep=Math.max(maxStep,Math.abs(step));
      }
      applyPoseRaw(model, false);
      const nextResidual=loopErrorNorm(collectLoopError(model, maxConstraints));
      if(nextResidual > residual*1.15){ for(let c=0;c<vars.length;c++) setJointScalar(vars[c], oldVals[c]); lambda*=10; }
      else { residual=nextResidual; lambda=Math.max(lambda*0.6,1e-7); }
      model.lastLoopSolve={ residual, vars:vars.length, iterations:it+1, constraints:Math.min(closureConstraintCount(model), maxConstraints) };
      if(maxStep < 5e-8) break;
    }
  } finally { model.isSolvingLoops = false; }
}


function solvePoseForCurrentValues(model, updateWorld=true) {
  applyCouplings(model);
  applyPoseRaw(model, false);
  if (!model.isSolvingLoops) solveLoopClosureDLS(model);
  applyCouplings(model);
  applyPoseRaw(model, updateWorld);
}
function applyPose(model) {
  solvePoseForCurrentValues(model, true);
}
function snapshotMovableJointValues(model){
  return (model._allJoints || []).filter(j => j && j.tree && j.role !== 'loop' && isMovableFull(j)).map(j => [j, jointValue(j)]);
}
function restoreMovableJointValues(snapshot){
  for (const [j, v] of snapshot || []) setJointScalar(j, v);
}
function dragFeasibleResidualLimit(baseResidual){
  const b = Number.isFinite(baseResidual) ? baseResidual : 0;
  return Math.max(PERF.DLS_DRAG_FEASIBLE_RESIDUAL, b * PERF.DLS_DRAG_FEASIBLE_RELATIVE);
}

function attemptConstrainedDragValue(model, joint, value, baseSnapshot){
  restoreMovableJointValues(baseSnapshot);
  // Match the HTML mechanism: clamp the tested value before solving so the
  // binary search never evaluates an impossible value outside joint limits.
  let v = Number(value); if (!Number.isFinite(v)) v = 0;
  const lo = Number.isFinite(joint.lowerRad) ? joint.lowerRad : (jointIsPrismatic(joint) ? -0.25 : -Math.PI * 2);
  const hi = Number.isFinite(joint.upperRad) ? joint.upperRad : (jointIsPrismatic(joint) ? 0.25 : Math.PI * 2);
  v = Math.max(lo, Math.min(hi, v));
  setJointScalar(joint, v);
  solvePoseForCurrentValues(model, true);
  const maxConstraints = model.isDraggingJoint ? PERF.DLS_INTERACTIVE_MAX_CONSTRAINTS : PERF.DLS_FINAL_MAX_CONSTRAINTS;
  const residual = model.lastLoopSolve?.residual ?? loopErrorNorm(collectLoopError(model, maxConstraints));
  return { residual, value: jointValue(joint), snapshot: snapshotMovableJointValues(model) };
}

function applyConstrainedJointDrag(model, joint, targetValue){
  if (!joint) return false;
  const startValue = jointValue(joint);
  const baseSnapshot = snapshotMovableJointValues(model);
  const maxConstraints = model.isDraggingJoint ? PERF.DLS_INTERACTIVE_MAX_CONSTRAINTS : PERF.DLS_FINAL_MAX_CONSTRAINTS;
  const baseResidual = model.lastLoopSolve?.residual ?? loopErrorNorm(collectLoopError(model, maxConstraints));
  const residualLimit = dragFeasibleResidualLimit(baseResidual);

  // First try: accept the full mouse delta if the closed-chain projection can keep up.
  const direct = attemptConstrainedDragValue(model, joint, targetValue, baseSnapshot);
  if (!closureConstraintCount(model) || direct.residual <= residualLimit) {
    restoreMovableJointValues(direct.snapshot);
    solvePoseForCurrentValues(model, true);
    return true;
  }

  // Exact standalone HTML behavior: if the requested pose is impossible, do not
  // let the visual loop fly through space and snap back on pointerup. Search on
  // the fraction of the requested delta and keep the farthest feasible pose.
  let lo = 0.0, hi = 1.0;
  let best = null;
  for (let i = 0; i < PERF.DLS_DRAG_BINARY_STEPS; i++) {
    const mid = (lo + hi) * 0.5;
    const v = startValue + (targetValue - startValue) * mid;
    const trial = attemptConstrainedDragValue(model, joint, v, baseSnapshot);
    if (trial.residual <= residualLimit) { best = trial; lo = mid; }
    else hi = mid;
  }
  if (best) restoreMovableJointValues(best.snapshot);
  else {
    restoreMovableJointValues(baseSnapshot);
    setJointScalar(joint, startValue);
  }
  solvePoseForCurrentValues(model, true);
  return !!best;
}
function setJointValueInternal(model, j, v) {
  if (!isMovableFull(j) || j.role === 'loop') return;
  let val = Number(v); if (!Number.isFinite(val)) val = 0;
  const lo = Number.isFinite(j.lowerRad) ? j.lowerRad : (jointIsPrismatic(j) ? -0.25 : -Math.PI * 2);
  const hi = Number.isFinite(j.upperRad) ? j.upperRad : (jointIsPrismatic(j) ? 0.25 : Math.PI * 2);
  val = Math.max(lo, Math.min(hi, val));
  if (model.isDraggingJoint && !model.isSolvingLoops) {
    model.activeJointForDrag = model.activeJointForDrag || j;
    applyConstrainedJointDrag(model, j, val);
    return;
  }
  setJointScalar(j, val);
  applyPose(model);
}


function parseUSDModel(text, assetDB) {
  const model = new USDModel(parseDefaultPrim(text) || 'AutoMindUSD');
  const blocks = findDefBlocks(text);
  const materialMaps = buildMaterialMaps(blocks);
  model._materialTextures = materialMaps.texByPath;
  model._materialColors = materialMaps.colorByPath;
  model._linkInfo = {};
  const linkBlocks = blocks.filter(b => b.type === 'Xform' && /automind:linkName/.test(directBody(b.body)));
  for (const b of linkBlocks) {
    const info = createLink(model, b, assetDB);
    model._linkInfo[info.name] = info;
  }
  const jointBlocks = blocks.filter(b => /^Physics.*Joint$/.test(b.type));
  const joints = jointBlocks.map(b => parseJointBlock(b, model)).filter(j => j.name && j.body0 && j.body1);
  model.couplings = blocks.filter(b => b.type === 'Xform' && /automind:kind\s*=\s*"coupling"/.test(directBody(b.body))).map(parseCouplingBlockFull);
  model.implicitCandidates = blocks.filter(b => b.type === 'Xform' && /automind:kind\s*=\s*"implicit_kinematic_candidate"/.test(directBody(b.body))).map(parseImplicitCandidateBlock);
  buildKinematicTree(model, joints);
  finalizeImplicitCandidateFrames(model);
  applyViewerMechanismRepairsFromCadEvidence(model);
  finalizeImplicitCandidateFrames(model);
  rebuildManipulableCache(model);
  applyPose(model);
  applyDoubleSided(model);
  return model;
}

function disposeDecorationLine(line) {
  try { line?.geometry?.dispose?.(); } catch (_) {}
  const mat = line?.material;
  try { if (Array.isArray(mat)) mat.forEach(m => m?.dispose?.()); else mat?.dispose?.(); } catch (_) {}
  try { line?.parent?.remove?.(line); } catch (_) {}
}
function setLineMaterialOpacity(line, baseOpacity, opacityScale, clipPlane = null) {
  const mat = line?.material;
  const arr = Array.isArray(mat) ? mat : [mat];
  for (const m of arr) {
    if (!m) continue;
    const op = Math.max(0, Math.min(1, (Number(baseOpacity) || 0) * (Number(opacityScale) || 0)));
    m.opacity = op;
    m.transparent = true;
    m.depthWrite = false;
    m.clippingPlanes = clipPlane ? [clipPlane] : null;
    m.clipIntersection = false;
    m.needsUpdate = true;
  }
}
function effectiveMechanismOpacity(core) {
  if (!core) return 0;
  const base = Number.isFinite(core.__mechanismOpacity) ? core.__mechanismOpacity : 1;
  return Math.max(0, Math.min(1, base));
}
function getDecorationScale(model) {
  const b = model ? getObjectBounds(model, 1.0) : null;
  // Same line-segment mechanism idea as the standalone USD viewer, but larger so
  // the axes/loop threads remain visible even when the component meshes are tiny.
  return Math.max((b?.maxDim || 1) * 0.16, 0.012);
}
function buildMechanismDecorations(core) {
  const model = core?.robot;
  disposeDecorationLine(core.__jointAxisBatch?.line); core.__jointAxisBatch = null;
  disposeDecorationLine(core.__loopBatch?.line); core.__loopBatch = null;
  if (!model) return;

  const allTreeJoints = Object.values(model.joints || {}).filter(j => j && j.tree && j.body0 && j.body1);
  const movableAxisJoints = allTreeJoints.filter(j => isMovableJoint(j));
  const axisJoints = movableAxisJoints.length ? movableAxisJoints : allTreeJoints;
  const axisGeom = new THREE.BufferGeometry();
  const axisPositions = new Float32Array(Math.max(1, axisJoints.length * 6));
  axisGeom.setAttribute('position', new THREE.BufferAttribute(axisPositions, 3).setUsage(THREE.DynamicDrawUsage));
  axisGeom.setDrawRange(0, axisJoints.length * 2);
  const axisMat = new THREE.LineBasicMaterial({ color: 0x087ea4, transparent: true, opacity: 0.0, depthTest: false, depthWrite: false, clippingPlanes: core.__mechanismClipPlane ? [core.__mechanismClipPlane] : null });
  const axisLine = new THREE.LineSegments(axisGeom, axisMat);
  axisLine.name = 'automind_joint_axes_batch';
  axisLine.renderOrder = 9998;
  axisLine.frustumCulled = false;
  axisLine.visible = !!core.__showJointAxes && effectiveMechanismOpacity(core) > 0.001 && axisJoints.length > 0;
  core.scene.add(axisLine);
  core.__jointAxisBatch = { line: axisLine, joints: axisJoints, positions: axisPositions, scale: getDecorationScale(model), baseOpacity: 0.95 };

  const loopItems = [];
  for (const j of model.loopJoints || []) loopItems.push({ kind: 'loop', joint: j });
  for (const c of activeImplicitClosureCandidates(model) || []) loopItems.push({ kind: 'implicit', candidate: c });
  const loopGeom = new THREE.BufferGeometry();
  const loopPositions = new Float32Array(Math.max(1, loopItems.length * 6));
  loopGeom.setAttribute('position', new THREE.BufferAttribute(loopPositions, 3).setUsage(THREE.DynamicDrawUsage));
  loopGeom.setDrawRange(0, loopItems.length * 2);
  const loopMat = new THREE.LineBasicMaterial({ color: 0xb7791f, transparent: true, opacity: 0.0, depthTest: false, depthWrite: false, clippingPlanes: core.__mechanismClipPlane ? [core.__mechanismClipPlane] : null });
  const loopLine = new THREE.LineSegments(loopGeom, loopMat);
  loopLine.name = 'automind_loops_batch';
  loopLine.renderOrder = 9999;
  loopLine.frustumCulled = false;
  loopLine.visible = !!core.__showLoops && effectiveMechanismOpacity(core) > 0.001 && loopItems.length > 0;
  core.scene.add(loopLine);
  core.__loopBatch = { line: loopLine, items: loopItems, positions: loopPositions, baseOpacity: 0.95 };
  updateMechanismDecorations(core);
}
function updateMechanismDecorations(core) {
  const model = core?.robot;
  if (!model) return;
  const axisBatch = core.__jointAxisBatch;
  if (axisBatch?.line) {
    const visible = !!core.__showJointAxes && effectiveMechanismOpacity(core) > 0.001 && axisBatch.joints.length > 0;
    axisBatch.line.visible = visible;
    setLineMaterialOpacity(axisBatch.line, axisBatch.baseOpacity ?? 0.95, effectiveMechanismOpacity(core), core.__mechanismClipPlane || null);
    if (visible) {
      const p = new THREE.Vector3();
      const a = new THREE.Vector3();
      let k = 0;
      for (const j of axisBatch.joints) {
        p.copy(model.getJointWorldPivot ? model.getJointWorldPivot(j) : getJointWorldPivot(model, j));
        a.copy(model.getJointWorldAxis ? model.getJointWorldAxis(j) : getJointWorldAxis(model, j));
        if (a.lengthSq() < EPS) a.set(0, 0, 1);
        const s = axisBatch.scale;
        axisBatch.positions[k++] = p.x - a.x * s; axisBatch.positions[k++] = p.y - a.y * s; axisBatch.positions[k++] = p.z - a.z * s;
        axisBatch.positions[k++] = p.x + a.x * s; axisBatch.positions[k++] = p.y + a.y * s; axisBatch.positions[k++] = p.z + a.z * s;
      }
      axisBatch.line.geometry.attributes.position.needsUpdate = true;
    }
  }
  const loopBatch = core.__loopBatch;
  if (loopBatch?.line) {
    const visible = !!core.__showLoops && effectiveMechanismOpacity(core) > 0.001 && loopBatch.items.length > 0;
    loopBatch.line.visible = visible;
    setLineMaterialOpacity(loopBatch.line, loopBatch.baseOpacity ?? 0.95, effectiveMechanismOpacity(core), core.__mechanismClipPlane || null);
    if (visible) {
      const p0 = new THREE.Vector3();
      const p1 = new THREE.Vector3();
      let k = 0;
      for (const item of loopBatch.items) {
        if (item.kind === 'implicit') {
          const c = item.candidate;
          const a = model._linkInfo?.[c.linkA], b = model._linkInfo?.[c.linkB];
          if (a && b && c.localPointA && c.localPointB) {
            p0.copy(c.localPointA).applyMatrix4(a.currentMatrix);
            p1.copy(c.localPointB).applyMatrix4(b.currentMatrix);
          } else { p0.set(0,0,0); p1.set(0,0,0); }
        } else {
          const j = item.joint;
          const a = model._linkInfo?.[j.body0], b = model._linkInfo?.[j.body1];
          if (a && b) {
            p0.set(j.localPos0?.[0] || 0, j.localPos0?.[1] || 0, j.localPos0?.[2] || 0).applyMatrix4(a.currentMatrix);
            p1.set(j.localPos1?.[0] || 0, j.localPos1?.[1] || 0, j.localPos1?.[2] || 0).applyMatrix4(b.currentMatrix);
          } else { p0.set(0,0,0); p1.set(0,0,0); }
        }
        loopBatch.positions[k++] = p0.x; loopBatch.positions[k++] = p0.y; loopBatch.positions[k++] = p0.z;
        loopBatch.positions[k++] = p1.x; loopBatch.positions[k++] = p1.y; loopBatch.positions[k++] = p1.z;
      }
      loopBatch.line.geometry.attributes.position.needsUpdate = true;
    }
  }
}


function createViewer({ container, background = 0xffffff, pixelRatio = Math.min(window.devicePixelRatio || 1, 2) } = {}) {
  assertThree();
  container = container || document.body;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.innerHTML = '';

  const scene = new THREE.Scene(); scene.background = new THREE.Color(background ?? 0xffffff);
  const perspCamera = new THREE.PerspectiveCamera(45, 1, 0.0001, 10000);
  perspCamera.position.set(1.6, 1.1, 1.6);
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 10000);
  orthoCamera.position.copy(perspCamera.position);
  let camera = perspCamera;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(background ?? 0xffffff, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap || THREE.PCFShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 0.82); key.position.set(3, 5, 4); key.castShadow = true; scene.add(key);
  key.shadow.mapSize.width = 2048; key.shadow.mapSize.height = 2048;
  key.shadow.bias = -0.00015; key.shadow.normalBias = 0.02;
  scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-4, 2, -3); fill.castShadow = false; scene.add(fill);
  const helpers = buildHelpers(); scene.add(helpers.group);

  const controls = new TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 4.0;
  controls.zoomSpeed = 1.25;
  controls.panSpeed = 0.8;
  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.15;

  let robot = null;
  let raf = null;
  let destroyed = false;
  let core = null;

  function resize(w, h, dpr = pixelRatio) {
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(w || rect.width || window.innerWidth || 800));
    const height = Math.max(1, Math.floor(h || rect.height || window.innerHeight || 600));
    renderer.setPixelRatio(Math.min(dpr || 1, 2)); renderer.setSize(width, height, false); controls.handleResize?.();
    const aspect = width / Math.max(1, height);
    perspCamera.aspect = aspect; perspCamera.updateProjectionMatrix();
    const robotBounds = robot ? getObjectBounds(robot, 1.0) : null;
    const modelSpan = robotBounds ? robotBounds.maxDim * 1.6 : 1;
    let halfH = Math.max(Math.abs((orthoCamera.top || 1) - (orthoCamera.bottom || -1)) * 0.5, modelSpan, 1e-6);
    // Preserve orthographic zoom while resizing; never derive ortho view size from
    // camera distance, because the camera may be moved far away only to avoid grid
    // near-plane clipping.
    if (!camera?.isOrthographicCamera && robotBounds) halfH = Math.max(halfH, modelSpan);
    orthoCamera.left = -halfH * aspect;
    orthoCamera.right = halfH * aspect;
    orthoCamera.top = halfH;
    orthoCamera.bottom = -halfH;
    orthoCamera.near = -Math.max((helpers.__gridWorldSize || 1) * 4, halfH * 100, 1000);
    orthoCamera.far = Math.max((helpers.__gridWorldSize || 1) * 4, halfH * 100, 1000);
    orthoCamera.updateProjectionMatrix();
    keepOrthographicDepthSafe(orthoCamera, controls, helpers, robot);
  }
  function animate() {
    if (destroyed) return;
    raf = requestAnimationFrame(animate);
    controls.update();
    keepGridInfiniteForView(helpers, camera, controls, robot);
    if (core) updateMechanismDecorations(core);
    renderer.render(scene, camera);
  }
  resize(); animate();
  const ro = new ResizeObserver(() => resize()); ro.observe(container);

  core = {
    __showJointAxes: false,
    __showLoops: false,
    __mechanismOpacity: 1,
    __mechanismSuppressRAF: 0,
    __mechanismSuppressToken: 0,
    __mechanismClipPlane: null,
    scene, renderer, get camera() { return camera; }, controls, helpers, get robot() { return robot; }, set robot(v) { robot = v; },
    loadUSD(usdContent, { assetDB } = {}) {
      if (robot) { scene.remove(robot); }
      robot = parseUSDModel(usdContent || '', assetDB || null);
      scene.add(robot);
      resizeSceneHelpersForObject(helpers, robot);
      configureSceneShadowsForObject(robot, helpers, key);
      buildMechanismDecorations(core);
      fitAndCenter(camera, controls, robot, 1.08);
      return robot;
    },
    fitAndCenter(object = robot, pad = 1.08) { return fitAndCenter(camera, controls, object, pad); },
    resize,
    setSceneToggles({ grid, ground, axes, shadows, jointAxes, loops } = {}) {
      if (typeof grid === 'boolean') helpers.grid.visible = grid;
      if (typeof ground === 'boolean') helpers.ground.visible = ground;
      if (typeof axes === 'boolean') helpers.axes.visible = axes;
      if (typeof shadows === 'boolean') {
        renderer.shadowMap.enabled = !!shadows;
        renderer.shadowMap.needsUpdate = true;
        key.castShadow = !!shadows;
        helpers.ground.receiveShadow = !!shadows;
        if (shadows) configureSceneShadowsForObject(robot, helpers, key);
        try { helpers.ground.material.needsUpdate = true; } catch (_) {}
      }
      if (typeof jointAxes === 'boolean' || typeof loops === 'boolean') core.setMechanismToggles({ jointAxes, loops });
      keepGridInfiniteForView(helpers, camera, controls, robot);
    },
    setMechanismToggles({ jointAxes, loops } = {}) {
      if (typeof jointAxes === 'boolean') core.__showJointAxes = jointAxes;
      if (typeof loops === 'boolean') core.__showLoops = loops;
      if (!core.__jointAxisBatch || !core.__loopBatch) buildMechanismDecorations(core);
      updateMechanismDecorations(core);
    },
    setMechanismClippingPlane(plane = null) {
      core.__mechanismClipPlane = plane || null;
      try { renderer.localClippingEnabled = !!(plane || renderer.localClippingEnabled); } catch (_) {}
      updateMechanismDecorations(core);
    },
    setMechanismSuppressed(suppressed = false, duration = 450) {
      const target = suppressed ? 0 : 1;
      const start = Number.isFinite(core.__mechanismOpacity) ? core.__mechanismOpacity : 1;
      const token = ++core.__mechanismSuppressToken;
      if (core.__mechanismSuppressRAF) { try { cancelAnimationFrame(core.__mechanismSuppressRAF); } catch (_) {} core.__mechanismSuppressRAF = 0; }
      if (!duration || duration <= 0 || Math.abs(start - target) < 1e-4) {
        core.__mechanismOpacity = target;
        updateMechanismDecorations(core);
        return;
      }
      const t0 = performance.now();
      const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const step = (now) => {
        if (token !== core.__mechanismSuppressToken) return;
        const u = Math.min(1, (now - t0) / Math.max(1, duration));
        core.__mechanismOpacity = start + (target - start) * ease(u);
        updateMechanismDecorations(core);
        if (u < 1) core.__mechanismSuppressRAF = requestAnimationFrame(step);
        else core.__mechanismSuppressRAF = 0;
      };
      core.__mechanismSuppressRAF = requestAnimationFrame(step);
    },
    setProjection(mode = 'Perspective') {
      const old = camera;
      const target = controls.target.clone();
      let dir = old.position.clone().sub(target);
      if (!Number.isFinite(dir.lengthSq()) || dir.lengthSq() < 1e-12) dir.set(1, 0.7, 1);
      const dirNorm = dir.clone().normalize();
      const aspect = Math.max(1e-6, (renderer.domElement.clientWidth || 1) / (renderer.domElement.clientHeight || 1));
      const robotBounds = robot ? getObjectBounds(robot, 1.0) : null;
      const modelHalf = Math.max(robotBounds ? robotBounds.maxDim * 0.8 : 0.5, 1e-6);
      if (/ortho/i.test(mode)) {
        camera = orthoCamera;
        let halfH;
        if (old.isPerspectiveCamera) {
          const dist = Math.max(1e-6, dir.length());
          halfH = dist * Math.tan(THREE.MathUtils.degToRad(old.fov || 45) * 0.5);
        } else {
          halfH = Math.abs((old.top || 1) - (old.bottom || -1)) * 0.5 / Math.max(old.zoom || 1, 1e-6);
        }
        halfH = Math.max(halfH, modelHalf, 1e-6);
        camera.left = -halfH * aspect;
        camera.right = halfH * aspect;
        camera.top = halfH;
        camera.bottom = -halfH;
        camera.zoom = 1;
        camera.quaternion.copy(old.quaternion);
        const viewDiag = Math.sqrt(Math.pow(halfH * 2 * aspect, 2) + Math.pow(halfH * 2, 2));
        const safeDist = Math.max(dir.length(), viewDiag * 2.5, (helpers.__gridWorldSize || 0) * 2.0, 1.0);
        camera.position.copy(target.clone().add(dirNorm.multiplyScalar(safeDist)));
        camera.near = -safeDist * 4.0;
        camera.far = safeDist * 4.0;
        camera.updateProjectionMatrix();
        keepGridInfiniteForView(helpers, camera, controls, robot);
      } else {
        camera = perspCamera;
        camera.quaternion.copy(old.quaternion);
        let dist = dir.length();
        if (old.isOrthographicCamera) {
          const halfH = Math.abs((old.top || 1) - (old.bottom || -1)) * 0.5 / Math.max(old.zoom || 1, 1e-6);
          dist = halfH / Math.tan(THREE.MathUtils.degToRad(camera.fov || 45) * 0.5);
        }
        dist = Math.max(dist, modelHalf * 1.5, 1e-6);
        camera.position.copy(target.clone().add(dirNorm.multiplyScalar(dist)));
        camera.near = robotBounds ? Math.max(robotBounds.maxDim / 1000, 0.001) : 0.0001;
        camera.far = Math.max(dist + (helpers.__gridWorldSize || 1) * 3.0, robotBounds ? robotBounds.maxDim * 100000 : 0, 10000000);
        camera.updateProjectionMatrix();
      }
      controls.object = camera; resize(); keepGridInfiniteForView(helpers, camera, controls, robot); controls.update();
    },
    destroy() {
      destroyed = true; if (raf) cancelAnimationFrame(raf); ro.disconnect(); controls.dispose?.();
      disposeDecorationLine(core.__jointAxisBatch?.line); core.__jointAxisBatch = null;
      disposeDecorationLine(core.__loopBatch?.line); core.__loopBatch = null;
      try { renderer.dispose(); renderer.domElement.remove(); } catch (_) {}
    }
  };
  return core;
}


return { createViewer: (typeof createViewer !== "undefined" ? createViewer : undefined) };
})();
const createViewer = __mod_core_ViewerCore_js.createViewer;

// ===== bundled module: interaction/SelectionAndDrag.js =====
const __mod_interaction_SelectionAndDrag_js = (() => {
// /USD_Viewer/interaction/SelectionAndDrag.js
// USD+ BUILD131 movement adapter: hover, selection, exact joint drag routing and 360-camera friendly interaction.
/* global THREE */

const HOVER_COLOR = 0x0ea5a6;
const HOVER_OPACITY = 0.28;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function isMovable(j) {
  const t = String(j?.jointType || j?.type || '').toLowerCase();
  if (!j || !t) return false;
  if (j.exportedMovable === true && !/FixedJoint/i.test(j.schema || '')) return true;
  if (/revolute|continuous|hinge|prismatic/i.test(t)) return true;
  if (/RevoluteJoint|PrismaticJoint/i.test(j.schema || '')) return true;
  return false;
}
function isPrismatic(j) { return /prismatic/i.test(String(j?.jointType || j?.type || '')) || /Prismatic/i.test(j?.schema || ''); }
function getJointValue(j) { return Number(j?.value ?? (isPrismatic(j) ? j?.position : j?.angle) ?? 0) || 0; }
function setJointValue(robot, j, v) {
  if (!robot || !j) return;
  if (typeof j.setJointValue === 'function') j.setJointValue(v);
  else if (typeof robot.setJointValue === 'function') robot.setJointValue(j.name, v);
  robot.updateMatrixWorld?.(true);
}
function collectMeshesInLink(linkObj) {
  const out = [];
  linkObj?.traverse?.(o => { if (o?.isMesh && o.geometry && !o.userData.__isHoverOverlay) out.push(o); });
  return out;
}
function materialList(mat) {
  if (!mat) return [];
  return Array.isArray(mat) ? mat.filter(Boolean) : [mat];
}
function meshOpacityForPicking(mesh) {
  const mats = materialList(mesh?.material);
  if (!mats.length) return 1;
  let best = 0;
  for (const m of mats) {
    if (!m) continue;
    const op = Number.isFinite(m.opacity) ? m.opacity : 1;
    best = Math.max(best, op);
  }
  return best;
}
function meshPickableNow(mesh, plane) {
  if (!mesh || !mesh.isMesh || !mesh.geometry) return false;
  if (mesh.visible === false || mesh.userData?.__isHoverOverlay) return false;
  // Visibility transactions mark the logical final target immediately. During a
  // fade-out, the object may still be visually present for a few frames, but it
  // must already behave as non-pickable to avoid stale hover/click/drag states.
  if (mesh.userData?.__automindVisibilityTarget === false) return false;
  if (meshOpacityForPicking(mesh) <= 0.035) return false;
  return meshVisibleBySection(mesh, plane);
}
function linkPickableNow(link, plane) {
  return collectMeshesInLink(link).some(m => meshPickableNow(m, plane));
}
function computeUnionBox(meshes) {
  const box = new THREE.Box3(); let has = false; const tmp = new THREE.Box3();
  for (const m of meshes || []) { if (!m) continue; tmp.setFromObject(m); if (!has) { box.copy(tmp); has = true; } else box.union(tmp); }
  return has ? box : null;
}
function sectionKeepsPoint(point, plane, eps = 1e-7) {
  // Three.js material clipping keeps the positive side of a Plane and discards
  // fragments with negative signed distance. The raycaster does not know that,
  // so every hover/click/drag hit must pass this same half-space test manually.
  return !plane || !point || plane.distanceToPoint(point) >= -eps;
}
function boxHasAnyVisibleSideByPlane(box, plane, eps = 1e-7) {
  if (!box || !plane) return true;
  const min = box.min, max = box.max;
  const corners = [
    new THREE.Vector3(min.x, min.y, min.z), new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z), new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z), new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z), new THREE.Vector3(max.x, max.y, max.z)
  ];
  return corners.some(c => sectionKeepsPoint(c, plane, eps));
}

const __sectionVertexTmp = new THREE.Vector3();
function meshHasKeptGeometryBySection(mesh, plane, eps = 1e-7) {
  if (!plane) return true;
  if (!mesh || !mesh.geometry) return false;
  const pos = mesh.geometry.attributes?.position;
  if (!pos || !pos.count) return meshVisibleBySectionBBox(mesh, plane, eps);
  // Do not rely only on Box3 corners: long/thin CAD parts can have a bounding box
  // crossing the section plane even when every real triangle is clipped away.
  // Sample actual vertices in world space. If at least one real vertex is on the
  // kept side, the body is partially visible and can still be selected; if all
  // vertices are on the clipped side, it is fully hidden and must be unpickable.
  const count = pos.count;
  const step = Math.max(1, Math.floor(count / 768));
  for (let i = 0; i < count; i += step) {
    __sectionVertexTmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    if (sectionKeepsPoint(__sectionVertexTmp, plane, eps)) return true;
  }
  // Always check the last vertex too, in case the sampling step skipped a tiny end.
  __sectionVertexTmp.fromBufferAttribute(pos, count - 1).applyMatrix4(mesh.matrixWorld);
  return sectionKeepsPoint(__sectionVertexTmp, plane, eps);
}
function meshVisibleBySectionBBox(mesh, plane, eps = 1e-7) {
  if (!plane) return true;
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.isEmpty()) return false;
  return boxHasAnyVisibleSideByPlane(box, plane, eps);
}
function meshVisibleBySection(mesh, plane) {
  if (!plane) return true;
  mesh.updateMatrixWorld?.(true);
  return meshHasKeptGeometryBySection(mesh, plane);
}
function pointVisibleBySection(point, plane, eps = 1e-6) {
  return sectionKeepsPoint(point, plane, eps);
}
function findAncestorLink(o, linkSet) { while (o) { if (linkSet.has(o)) return o; o = o.parent; } return null; }
function buildHoverOverlay({ color = HOVER_COLOR, opacity = HOVER_OPACITY, getSectionPlane = null } = {}) {
  const overlays = [];
  function clear() {
    overlays.splice(0).forEach(o => {
      try { o.parent?.remove(o); o.material?.dispose?.(); } catch (_) {}
    });
  }
  function overlayFor(mesh) {
    if (!mesh?.isMesh || !mesh.geometry) return null;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: 1
    });
    const plane = typeof getSectionPlane === 'function' ? getSectionPlane() : null;
    if (plane) {
      mat.clippingPlanes = [plane];
      mat.clipIntersection = false;
      mat.needsUpdate = true;
    }
    const ov = new THREE.Mesh(mesh.geometry, mat);
    ov.renderOrder = 9999;
    ov.userData.__isHoverOverlay = true;
    return ov;
  }
  function showMesh(mesh) {
    const plane = typeof getSectionPlane === 'function' ? getSectionPlane() : null;
    if (!meshPickableNow(mesh, plane)) return;
    const ov = overlayFor(mesh);
    if (ov) { mesh.add(ov); overlays.push(ov); }
  }
  function showLink(link) {
    const plane = typeof getSectionPlane === 'function' ? getSectionPlane() : null;
    for (const m of collectMeshesInLink(link)) {
      if (meshPickableNow(m, plane)) showMesh(m);
    }
  }
  return { clear, showMesh, showLink };
}

function attachInteraction({ scene, camera, renderer, controls, robot, selectMode = 'link', getSectionPlane = null, onSelectLink = null }) {
  if (!scene || !camera || !renderer || !controls) throw new Error('[USD SelectionAndDrag] Missing core objects');
  let robotModel = robot || null;
  let linkSet = new Set(Object.values(robotModel?.links || {}));
  const getCamera = (typeof camera === 'function') ? camera : () => camera;
  const getPlane = (typeof getSectionPlane === 'function') ? getSectionPlane : () => null;
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const hover = buildHoverOverlay({ getSectionPlane: getPlane });
  let lastHover = null;
  let selectedMeshes = [];
  let selectedLink = null;
  let selectionHelper = null;
  let isolated = false;
  let activeDrag = null;
  let pendingClickSelect = null;
  let lastHoverRaycastAt = 0;

  const dragPlane = new THREE.Plane();
  const dragAxisWorld = new THREE.Vector3();
  const dragPivotWorld = new THREE.Vector3();
  const dragPrevHit = new THREE.Vector3();
  const dragNewHit = new THREE.Vector3();
  const dragProjectedStart = new THREE.Vector3();
  const dragProjectedEnd = new THREE.Vector3();
  const dragTmp = new THREE.Vector3();
  const dragTmp2 = new THREE.Vector3();

  function setRobot(r) { robotModel = r; linkSet = new Set(Object.values(robotModel?.links || {})); clearSelection(); }
  function ensureSelectionHelper() {
    if (!selectionHelper) {
      selectionHelper = new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5), new THREE.Vector3(.5,.5,.5)), new THREE.Color(HOVER_COLOR));
      selectionHelper.visible = false; selectionHelper.renderOrder = 10001; scene.add(selectionHelper);
    }
    return selectionHelper;
  }
  function refreshSelectionMarker() {
    const h = ensureSelectionHelper();
    const plane = getPlane();
    const visibleMeshes = (selectedMeshes || []).filter(m => meshPickableNow(m, plane));
    const box = computeUnionBox(visibleMeshes);
    if (!box || !boxHasAnyVisibleSideByPlane(box, plane)) { h.visible = false; return; }
    h.box.copy(box); h.updateMatrixWorld(true); h.visible = true;
  }
  function setSelected(link, mesh = null) {
    selectedLink = link || null;
    if (selectMode === 'mesh' && mesh) selectedMeshes = [mesh];
    else selectedMeshes = link ? collectMeshesInLink(link) : [];
    refreshSelectionMarker();
  }
  function clearSelection() { selectedMeshes = []; selectedLink = null; if (selectionHelper) selectionHelper.visible = false; }
  function setPointerFromEvent(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    pointerNdc.y = -(((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
    raycaster.setFromCamera(pointerNdc, getCamera());
    return raycaster.ray.clone();
  }
  function linkNameFromObject(obj) {
    let o = obj;
    while (o) { if (o.userData?.__linkName) return o.userData.__linkName; o = o.parent; }
    return '';
  }
  function pickInfoFromPointer(ev) {
    const ray = setPointerFromEvent(ev);
    const plane = getPlane();
    const pickables = [];
    robotModel?.traverse?.(o => {
      if (meshPickableNow(o, plane)) pickables.push(o);
    });
    const hits = raycaster.intersectObjects(pickables, true);
    for (const hit of hits) {
      if (!pointVisibleBySection(hit.point, plane)) continue;
      const linkName = linkNameFromObject(hit.object);
      const link = linkName ? robotModel?.links?.[linkName] : findAncestorLink(hit.object, linkSet);
      if (link && linkPickableNow(link, plane) && meshPickableNow(hit.object, plane)) {
        return { link, linkName: linkName || link.userData?.__linkName || link.name, hit, ray };
      }
    }
    return null;
  }
  function getManipulableJointForLink(link) {
    if (!link || !robotModel) return null;
    const name = link.userData?.__linkName || link.name;
    if (typeof robotModel.getManipulableJointForLinkName === 'function') return robotModel.getManipulableJointForLinkName(name);
    let n = link;
    while (n) { const j = n.userData?.__joint; if (isMovable(j)) return j; n = n.parent; }
    return null;
  }
  function getJointWorldPivot(j) {
    if (robotModel?.getJointWorldPivot) return robotModel.getJointWorldPivot(j);
    return j?.getWorldPosition ? j.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
  }
  function getJointWorldAxis(j) {
    if (robotModel?.getJointWorldAxis) return robotModel.getJointWorldAxis(j);
    const q = j?.getWorldQuaternion ? j.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    return (j?.axis || new THREE.Vector3(1,0,0)).clone().normalize().applyQuaternion(q).normalize();
  }
  function getRevoluteDragDelta(j, startPoint, endPoint, initialGrabPoint) {
    dragAxisWorld.copy(getJointWorldAxis(j));
    dragPivotWorld.copy(getJointWorldPivot(j));
    dragPlane.setFromNormalAndCoplanarPoint(dragAxisWorld, dragPivotWorld);
    dragTmp.copy(getCamera().position).sub(initialGrabPoint).normalize();
    if (Math.abs(dragTmp.dot(dragPlane.normal)) > 0.3) {
      dragPlane.projectPoint(startPoint, dragProjectedStart);
      dragPlane.projectPoint(endPoint, dragProjectedEnd);
      dragProjectedStart.sub(dragPivotWorld); dragProjectedEnd.sub(dragPivotWorld);
      if (dragProjectedStart.lengthSq() < 1e-12 || dragProjectedEnd.lengthSq() < 1e-12) return 0;
      dragTmp.crossVectors(dragProjectedStart, dragProjectedEnd);
      const direction = Math.sign(dragTmp.dot(dragPlane.normal)) || 1;
      return direction * dragProjectedEnd.angleTo(dragProjectedStart);
    }
    dragTmp.set(0,0,-1).transformDirection(getCamera().matrixWorld);
    dragTmp.cross(dragPlane.normal).normalize();
    dragTmp2.subVectors(endPoint, startPoint);
    return dragTmp.dot(dragTmp2) * 4.0;
  }
  function getPrismaticDragDelta(j, startPoint, endPoint) {
    dragAxisWorld.copy(getJointWorldAxis(j));
    dragTmp.subVectors(endPoint, startPoint);
    return dragTmp.dot(dragAxisWorld);
  }
  function startJointDrag(ev, pick) {
    if (!pick || ev.button !== 0) return false;
    const joint = getManipulableJointForLink(pick.link);
    if (!joint) return false;
    setSelected(pick.link, pick.hit?.object || null);
    activeDrag = { link: pick.link, linkName: pick.linkName, joint, type: isPrismatic(joint) ? 'prismatic' : 'revolute', hitDistance: pick.hit.distance, initialGrabPoint: pick.hit.point.clone(), prevRay: pick.ray.clone() };
    robotModel?.beginInteractiveDrag?.(joint);
    controls.enabled = false;
    renderer.domElement.style.cursor = 'grabbing';
    try { renderer.domElement.setPointerCapture?.(ev.pointerId); } catch (_) {}
    return true;
  }
  function cancelActiveDrag(ev) {
    const d = activeDrag;
    if (!d) return;
    try { renderer.domElement.releasePointerCapture?.(ev?.pointerId); } catch (_) {}
    try { robotModel?.endInteractiveDrag?.(d.joint); } catch (_) {}
    activeDrag = null;
    pendingClickSelect = null;
    controls.enabled = true;
    renderer.domElement.style.cursor = 'auto';
  }
  function updateJointDrag(ev) {
    const d = activeDrag; if (!d) return false;
    const planeNow = getPlane();
    if (d.link && !linkPickableNow(d.link, planeNow)) {
      cancelActiveDrag(ev);
      clearSelection();
      hover.clear(); lastHover = null;
      return false;
    }
    if (pendingClickSelect) {
      const dx = Number(ev.clientX || 0) - pendingClickSelect.x;
      const dy = Number(ev.clientY || 0) - pendingClickSelect.y;
      if ((dx * dx + dy * dy) > 25) pendingClickSelect.moved = true;
    }
    const ray = setPointerFromEvent(ev);
    d.prevRay.at(d.hitDistance, dragPrevHit);
    ray.at(d.hitDistance, dragNewHit);
    let delta = isPrismatic(d.joint) ? getPrismaticDragDelta(d.joint, dragPrevHit, dragNewHit) : getRevoluteDragDelta(d.joint, dragPrevHit, dragNewHit, d.initialGrabPoint);
    if (Number.isFinite(delta) && Math.abs(delta) > 1e-9) setJointValue(robotModel, d.joint, getJointValue(d.joint) + delta);
    d.prevRay.copy(ray);
    refreshSelectionMarker();
    return true;
  }
  function endJointDrag(ev) {
    if (!activeDrag) return;
    try { renderer.domElement.releasePointerCapture?.(ev?.pointerId); } catch (_) {}
    const joint = activeDrag?.joint || null;
    const pending = pendingClickSelect;
    pendingClickSelect = null;
    robotModel?.endInteractiveDrag?.(joint);
    activeDrag = null;
    controls.enabled = true;
    renderer.domElement.style.cursor = 'auto';
    refreshSelectionMarker();
    if (pending && !pending.moved) {
      try { if (typeof onSelectLink === 'function') onSelectLink(pending.link, pending.pick); } catch (_) {}
    }
  }
  function isolateSelected() {
    if (!robotModel || !selectedLink) return;
    if (isolated) {
      robotModel.traverse(o => { if (o.isMesh && o.geometry) o.visible = true; }); isolated = false; refreshSelectionMarker(); return;
    }
    const keep = new Set(collectMeshesInLink(selectedLink));
    robotModel.traverse(o => { if (o.isMesh && o.geometry) o.visible = keep.has(o); });
    isolated = true; refreshSelectionMarker();
  }

  function onMove(ev) {
    if (activeDrag) { ev.preventDefault(); updateJointDrag(ev); return; }
    const planeNow = getPlane();
    if (lastHover && !linkPickableNow(lastHover, planeNow)) { hover.clear(); lastHover = null; renderer.domElement.style.cursor = 'auto'; }
    const now = performance.now();
    if (now - lastHoverRaycastAt < 34) return;
    lastHoverRaycastAt = now;
    const pick = pickInfoFromPointer(ev);
    const key = pick?.link || null;
    if (key !== lastHover) {
      hover.clear(); lastHover = key;
      if (pick?.link) hover.showLink(pick.link);
    }
    renderer.domElement.style.cursor = pick?.link ? (getManipulableJointForLink(pick.link) ? 'grab' : 'pointer') : 'auto';
  }
  function onDown(ev) {
    if (ev.button !== 0) return;
    renderer.domElement.focus?.();
    const pick = pickInfoFromPointer(ev);
    if (!pick) { clearSelection(); return; }
    setSelected(pick.link, pick.hit?.object || null);
    if (startJointDrag(ev, pick)) {
      pendingClickSelect = { link: pick.link, pick, x: Number(ev.clientX || 0), y: Number(ev.clientY || 0), moved: false };
      ev.preventDefault(); ev.stopPropagation();
    } else {
      pendingClickSelect = null;
      try { if (typeof onSelectLink === 'function') onSelectLink(pick.link, pick); } catch (_) {}
    }
  }
  function onUp(ev) { if (activeDrag) { ev.preventDefault?.(); endJointDrag(ev); } }
  function onKey(ev) { if (String(ev.key || '').toLowerCase() === 'i') isolateSelected(); }

  renderer.domElement.tabIndex = 0;
  renderer.domElement.addEventListener('pointermove', onMove, { passive: false });
  renderer.domElement.addEventListener('pointerdown', onDown, { passive: false });
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('keydown', onKey, true);

  return {
    setRobot,
    get selectedLink() { return selectedLink; },
    clearSelection,
    clearHover() { hover.clear(); lastHover = null; },
    refreshSelectionMarker,
    destroy() {
      hover.clear(); if (selectionHelper) scene.remove(selectionHelper);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('keydown', onKey, true);
    }
  };
}

return { attachInteraction: (typeof attachInteraction !== "undefined" ? attachInteraction : undefined) };
})();
const attachInteraction = __mod_interaction_SelectionAndDrag_js.attachInteraction;

// ===== bundled module: ui/ToolsDock.js =====
const __mod_ui_ToolsDock_js = (() => {
// /viewer/ui/ToolsDock.js / checkpoint
// Floating tools dock: render modes, explode (smoothed & robust), section plane (ROBOT ONLY), views, projection, scene toggles, snapshot.
/* global THREE */ 

function createToolsDock(app, theme) {
  if (!app || !app.camera || !app.controls || !app.renderer)
    throw new Error('[ToolsDock] Missing app.camera/controls/renderer');

  // --- Normalize theme to flat keys (works with your Theme.js nested shape) ---
  if (theme && theme.colors) {
    theme.teal       ??= theme.colors.teal;
    theme.tealSoft   ??= theme.colors.tealSoft;
    theme.tealFaint  ??= theme.colors.tealFaint;
    theme.bgPanel    ??= theme.colors.panelBg;
    theme.bgCanvas   ??= theme.colors.canvasBg;
    theme.stroke     ??= theme.colors.stroke;
    theme.text       ??= theme.colors.text;
    theme.textMuted  ??= theme.colors.textMuted;
  }
  if (theme && theme.shadows) {
    theme.shadow ??= (theme.shadows.lg || theme.shadows.md || theme.shadows.sm);
  }

  // ============================================================
  // ✅ 50% UI SIZE SYSTEM (ONLY ADDITION)
  // Equivalent to:
  // :root { --tools-scale: 0.5; }
  // ============================================================
  try { document.documentElement.style.setProperty('--tools-scale', '0.5'); } catch (_) {}

  // ---------- DOM ----------
  const ui = {
    root: document.createElement('div'),
    dock: document.createElement('div'),
    header: document.createElement('div'),
    title: document.createElement('div'),
    fitBtn: document.createElement('button'),
    body: document.createElement('div'),
    toggleBtn: document.createElement('button')
  };

  // ---------- Helpers (with hover animations intact) ----------
  const mkButton = (label) => {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      padding: '8px 12px',
      borderRadius: '12px',
      border: `1px solid ${theme.stroke}`,
      background: theme.bgPanel,
      color: theme.text,
      fontWeight: '700',
      cursor: 'pointer',
      pointerEvents: 'auto',
      boxShadow: theme.shadow,
      transition: 'transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease, border-color 120ms ease'
    });
    // Hover/active animations (KEEP)
    b.addEventListener('mouseenter', () => {
      b.style.transform = 'translateY(-1px) scale(1.02)';
      b.style.boxShadow = theme.shadow;
      b.style.background = theme.tealFaint;
      b.style.borderColor = theme.tealSoft ?? theme.teal;
    });
    b.addEventListener('mouseleave', () => {
      b.style.transform = 'none';
      b.style.boxShadow = theme.shadow;
      b.style.background = theme.bgPanel;
      b.style.borderColor = theme.stroke;
    });
    b.addEventListener('mousedown', () => {
      b.style.transform = 'translateY(0) scale(0.99)';
    });
    b.addEventListener('mouseup', () => {
      b.style.transform = 'translateY(-1px) scale(1.02)';
    });
    return b;
  };

  const mkRow = (label, child) => {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      gap: '10px',
      alignItems: 'center',
      margin: '6px 0'
    });
    const l = document.createElement('div');
    l.textContent = label;
    Object.assign(l.style, { color: theme.textMuted, fontWeight: '700' });
    row.appendChild(l);
    row.appendChild(child);
    return row;
  };

  const mkSelect = (options, value) => {
    // Custom select so Section / Render Mode / Projection use the same polished UI
    // as the rest of the dock instead of the browser default dropdown.
    const root = document.createElement('div');
    const face = document.createElement('button');
    const label = document.createElement('span');
    const chevron = document.createElement('span');
    const menu = document.createElement('div');
    let current = value;
    let opened = false;

    root.tabIndex = 0;
    root.dataset.value = String(current || '');
    Object.assign(root.style, {
      position: 'relative',
      width: '100%',
      minWidth: '0',
      pointerEvents: 'auto',
      outline: 'none',
      zIndex: '1'
    });

    face.type = 'button';
    label.textContent = String(current || '');
    chevron.textContent = '▾';
    Object.assign(face.style, {
      width: '100%',
      minHeight: '34px',
      padding: '8px 10px',
      border: `1px solid ${theme.stroke}`,
      borderRadius: '10px',
      background: `linear-gradient(180deg, ${theme.bgPanel}, #f6fbfb)`,
      color: theme.text,
      fontWeight: '750',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease'
    });
    Object.assign(label.style, {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    });
    Object.assign(chevron.style, {
      color: theme.teal,
      fontWeight: '900',
      lineHeight: '1',
      transition: 'transform 160ms ease'
    });

    Object.assign(menu.style, {
      position: 'absolute',
      left: '0',
      right: '0',
      top: 'calc(100% + 6px)',
      padding: '6px',
      border: `1px solid ${theme.stroke}`,
      borderRadius: '12px',
      background: theme.bgPanel,
      boxShadow: theme.shadow,
      display: 'none',
      opacity: '0',
      transform: 'translateY(-4px) scale(0.98)',
      transformOrigin: 'top center',
      transition: 'opacity 140ms ease, transform 140ms ease',
      zIndex: '100000',
      maxHeight: '220px',
      overflowY: 'auto'
    });

    const optionButtons = [];
    function setOpen(next) {
      opened = !!next;
      root.style.zIndex = opened ? '100000' : '1';
      face.style.borderColor = opened ? theme.teal : theme.stroke;
      face.style.boxShadow = opened ? `0 0 0 3px ${theme.tealFaint}, ${theme.shadow}` : '0 2px 8px rgba(0,0,0,0.04)';
      chevron.style.transform = opened ? 'rotate(180deg)' : 'rotate(0deg)';
      if (opened) {
        menu.style.display = 'block';
        requestAnimationFrame(() => {
          menu.style.opacity = '1';
          menu.style.transform = 'translateY(0) scale(1)';
        });
      } else {
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(-4px) scale(0.98)';
        setTimeout(() => { if (!opened) menu.style.display = 'none'; }, 150);
      }
    }
    function setValue(v, emit = true) {
      current = String(v);
      root.dataset.value = current;
      label.textContent = current;
      optionButtons.forEach(btn => {
        const active = btn.dataset.value === current;
        btn.style.background = active ? theme.tealFaint : 'transparent';
        btn.style.color = active ? theme.text : theme.text;
        btn.style.borderColor = active ? (theme.tealSoft ?? theme.teal) : 'transparent';
      });
      if (emit) root.dispatchEvent(new Event('change'));
    }

    options.forEach(o => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(o);
      btn.dataset.value = String(o);
      Object.assign(btn.style, {
        width: '100%',
        padding: '8px 9px',
        border: '1px solid transparent',
        borderRadius: '9px',
        background: 'transparent',
        color: theme.text,
        fontWeight: '700',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background-color 120ms ease, border-color 120ms ease, transform 120ms ease'
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = theme.tealFaint;
        btn.style.borderColor = theme.tealSoft ?? theme.teal;
        btn.style.transform = 'translateX(1px)';
      });
      btn.addEventListener('mouseleave', () => {
        const active = btn.dataset.value === current;
        btn.style.background = active ? theme.tealFaint : 'transparent';
        btn.style.borderColor = active ? (theme.tealSoft ?? theme.teal) : 'transparent';
        btn.style.transform = 'none';
      });
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setValue(o, true);
        setOpen(false);
      });
      optionButtons.push(btn);
      menu.appendChild(btn);
    });

    face.appendChild(label);
    face.appendChild(chevron);
    root.appendChild(face);
    root.appendChild(menu);

    face.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); setOpen(!opened); });
    face.addEventListener('mouseenter', () => { if (!opened) face.style.background = theme.tealFaint; });
    face.addEventListener('mouseleave', () => { if (!opened) face.style.background = `linear-gradient(180deg, ${theme.bgPanel}, #f6fbfb)`; });
    root.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') setOpen(false);
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpen(!opened); }
      const idx = options.map(String).indexOf(current);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); setValue(options[Math.min(options.length - 1, idx + 1)] ?? current, true); }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); setValue(options[Math.max(0, idx - 1)] ?? current, true); }
    });
    document.addEventListener('pointerdown', (ev) => { if (opened && !root.contains(ev.target)) setOpen(false); }, true);
    Object.defineProperty(root, 'value', { get: () => current, set: (v) => setValue(v, false) });
    setValue(value, false);
    return root;
  };

  const mkSlider = (min, max, step, value) => {
    const s = document.createElement('input');
    s.type = 'range'; s.min = min; s.max = max; s.step = step; s.value = value;
    s.style.width = '100%';
    s.style.accentColor = theme.teal;
    return s;
  };

  const mkToggle = (label) => {
    const wrap = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox';
    const span = document.createElement('span'); span.textContent = label;
    Object.assign(wrap.style, { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', pointerEvents: 'auto' });
    cb.style.accentColor = theme.teal;
    Object.assign(span.style, { fontWeight: '700', color: theme.text });
    wrap.appendChild(cb); wrap.appendChild(span);
    return { wrap, cb };
  };


  const mkToggleButton = (label, initial = false) => {
    const b = mkButton(label);
    b.style.padding = '8px';
    b.style.borderRadius = '10px';
    b.dataset.active = initial ? '1' : '0';
    const paint = () => {
      const on = b.dataset.active === '1';
      b.style.background = on ? theme.tealFaint : theme.bgPanel;
      b.style.borderColor = on ? (theme.tealSoft ?? theme.teal) : theme.stroke;
      b.style.color = on ? (theme.teal || theme.text) : theme.text;
      b.style.boxShadow = on ? '0 4px 14px rgba(8,126,164,0.16)' : theme.shadow;
    };
    b.setActive = (v) => { b.dataset.active = v ? '1' : '0'; paint(); };
    b.getActive = () => b.dataset.active === '1';
    b.addEventListener('mouseleave', paint);
    paint();
    return b;
  };

  // Root overlay
  Object.assign(ui.root.style, {
    position: 'absolute',
    left: '0', top: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none',
    zIndex: '9999',
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial'
  });

  // Dock (✅ STEP-like placement: right:14px, top:54px)
  Object.assign(ui.dock.style, {
    position: 'absolute',
    right: '14px',
    top: '54px',
    width: '440px',
    background: theme.bgPanel,
    border: `1px solid ${theme.stroke}`,
    borderRadius: '18px',
    boxShadow: theme.shadow,
    pointerEvents: 'auto',
    overflow: 'hidden',
    display: 'none',

    // ✅ scale system
    transformOrigin: 'top right',
    transform: 'scale(var(--tools-scale))'
  });

  Object.assign(ui.header.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: `1px solid ${theme.stroke}`,
    background: '#0ea5a6'
  });

  ui.title.textContent = 'Viewer Tools';
  Object.assign(ui.title.style, { fontWeight: '800', color: '#ffffff' });

  Object.assign(ui.body.style, { padding: '10px 12px' });

  // Floating toggle button (✅ STEP-like placement: right:14px, top:14px)
  ui.toggleBtn.textContent = 'Open Tools';
  Object.assign(ui.toggleBtn.style, {
    position: 'absolute',
    right: '14px',
    top: '14px',
    padding: '8px 12px',
    borderRadius: '12px',
    border: `1px solid ${theme.stroke}`,
    background: theme.bgPanel,
    color: theme.text,
    fontWeight: '700',
    boxShadow: theme.shadow,
    pointerEvents: 'auto',
    zIndex: '10000',
    transition: 'transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease, border-color 120ms ease',

    // ✅ scale system
    transformOrigin: 'top right',
    transform: 'scale(var(--tools-scale))'
  });

  ui.toggleBtn.addEventListener('mouseenter', () => {
    // keep hover animation but preserve scale
    ui.toggleBtn.style.transform = 'translateY(-1px) scale(calc(var(--tools-scale) * 1.02))';
    ui.toggleBtn.style.background = theme.tealFaint;
    ui.toggleBtn.style.borderColor = theme.tealSoft ?? theme.teal;
  });
  ui.toggleBtn.addEventListener('mouseleave', () => {
    ui.toggleBtn.style.transform = 'scale(var(--tools-scale))';
    ui.toggleBtn.style.background = theme.bgPanel;
    ui.toggleBtn.style.borderColor = theme.stroke;
  });

  // Header button (Snapshot)
  ui.fitBtn = mkButton('Snapshot');
  Object.assign(ui.fitBtn.style, { padding: '6px 10px', borderRadius: '10px' });

  ui.header.appendChild(ui.title);
  ui.header.appendChild(ui.fitBtn);
  ui.dock.appendChild(ui.header);
  ui.dock.appendChild(ui.body);
  ui.root.appendChild(ui.dock);
  ui.root.appendChild(ui.toggleBtn);

  // Attach
  const host = (app?.renderer?.domElement?.parentElement) || document.body;
  host.appendChild(ui.root);

  // ---------- Controls ----------
  const renderModeSel = mkSelect(['Solid', 'Wireframe', 'X-Ray', 'Ghost'], 'Solid');

  // Explode (slider drives a smoothed spring tween; see ExplodeManager below)
  const explodeSlider = mkSlider(0, 1, 0.01, 0);

  // Section
  const axisSel = mkSelect(['X', 'Y', 'Z'], 'X');
  const secDist = mkSlider(-1, 1, 0.001, 0);
  const secEnable = mkToggle('Enable section');
  const secShowPlane = mkToggle('Show slice plane');

  // Views row (NO per-row Snapshot button)
  const rowCam = document.createElement('div');
  Object.assign(rowCam.style, { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', margin: '8px 0' });
  const bIso = mkButton('Iso'), bTop = mkButton('Top'), bFront = mkButton('Front'), bRight = mkButton('Right');
  [bIso, bTop, bFront, bRight].forEach(b => { b.style.padding = '8px'; b.style.borderRadius = '10px'; });

  // Projection + Scene toggles
  const projSel = mkSelect(['Perspective', 'Orthographic'], 'Perspective');
  const togGrid = mkToggle('Grid');
  const togGround = mkToggle('Ground & shadows');
  const togAxes = mkToggle('XYZ axes');
  const togShowJoints = mkToggle('Show Joints');
  const togShowLoops = mkToggle('Show Loops');
  // Default OFF: mechanism overlays can be heavy/noisy on large assemblies.
  togShowJoints.cb.checked = false;
  togShowLoops.cb.checked = false;
  const mechRow = document.createElement('div');
  Object.assign(mechRow.style, {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    alignItems: 'center',
    margin: '2px 0'
  });
  mechRow.appendChild(togShowJoints.wrap);
  mechRow.appendChild(togShowLoops.wrap);

  // Assemble rows
  ui.body.appendChild(mkRow('Render mode', renderModeSel));
  ui.body.appendChild(mkRow('Explode', explodeSlider));
  ui.body.appendChild(mkRow('Section axis', axisSel));
  ui.body.appendChild(mkRow('Section dist', secDist));
  ui.body.appendChild(mkRow('', secEnable.wrap));
  ui.body.appendChild(mkRow('', secShowPlane.wrap));
  ui.body.appendChild(mkRow('Views', rowCam));
  rowCam.appendChild(bIso); rowCam.appendChild(bTop); rowCam.appendChild(bFront); rowCam.appendChild(bRight);
  ui.body.appendChild(mkRow('Projection', projSel));
  ui.body.appendChild(mkRow('', togGrid.wrap));
  ui.body.appendChild(mkRow('', togGround.wrap));
  ui.body.appendChild(mkRow('', togAxes.wrap));
  ui.body.appendChild(mkRow('Mechanism', mechRow));

  // ---------- Logic ----------

  // ------------------ CONFIG ------------------
  // ✅ STEP behavior: hidden by translating to the right, then slide back to 0
  const CLOSED_TX = 560; // px, off-screen to the right
  let isOpen = false;

  // Prepare dock styles once
  Object.assign(ui.dock.style, {
    display: 'block',
    willChange: 'transform, opacity',
    transition: 'transform 260ms cubic-bezier(.2,.7,.2,1), opacity 200ms ease',
    // ✅ keep translateX + scale together
    transform: `translateX(${CLOSED_TX}px) scale(var(--tools-scale))`,
    opacity: '0',
    pointerEvents: 'none'
  });

  // ------------------ TWEEN LOGIC ------------------
  function set(open) {
    isOpen = open;

    if (open) {
      // OPEN tween
      ui.dock.style.opacity = '1';
      ui.dock.style.transform = `translateX(0) scale(var(--tools-scale))`;
      ui.dock.style.pointerEvents = 'auto';
      ui.toggleBtn.textContent = 'Close Tools';
      syncExplodeUI();
    } else {
      // CLOSE tween
      ui.dock.style.opacity = '0';
      ui.dock.style.transform = `translateX(${CLOSED_TX}px) scale(var(--tools-scale))`;
      ui.dock.style.pointerEvents = 'none';
      ui.toggleBtn.textContent = 'Open Tools';
    }
  }

  // Wrappers
  function openDock() { set(true); }
  function closeDock() { set(false); }

  // ------------------ EVENT ------------------
  ui.toggleBtn.addEventListener('click', () => set(!isOpen));

  // Snapshot (header only) — offscreen render target fallback (no preserveDrawingBuffer needed)
  ui.fitBtn.addEventListener('click', () => {
    const { renderer, scene, camera, composer } = app;

    const downloadURL = (url, isObjURL = false) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'snapshot.png';
      document.body.appendChild(a);
      a.click();
      if (isObjURL) URL.revokeObjectURL(url);
      a.remove();
    };

    // fast path
    try {
      renderer.setRenderTarget(null);
      if (composer) composer.render(); else renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL('image/png');
      downloadURL(url);
      return;
    } catch (e) {
      console.warn('[Snapshot] fast path failed, trying offscreen RT.', e);
    }

    // robust path
    try {
      const size = renderer.getSize(new THREE.Vector2());
      const dpr = renderer.getPixelRatio();
      const w = Math.max(1, Math.floor(size.x * dpr));
      const h = Math.max(1, Math.floor(size.y * dpr));

      const oldTarget = renderer.getRenderTarget();
      const rt = new THREE.WebGLRenderTarget(w, h, { samples: 0 });
      renderer.setRenderTarget(rt);
      if (composer) composer.render(); else renderer.render(scene, camera);

      const buffer = new Uint8Array(w * h * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, buffer);

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(w, h);

      for (let y = 0; y < h; y++) {
        const src = (h - 1 - y) * w * 4;
        const dst = y * w * 4;
        imgData.data.set(buffer.subarray(src, src + w * 4), dst);
      }
      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Snapshot failed. Check CORS headers on textures/assets.');
          return;
        }
        downloadURL(URL.createObjectURL(blob), true);
      }, 'image/png');

      renderer.setRenderTarget(oldTarget);
      rt.dispose();
    } catch (e) {
      console.error('[Snapshot] offscreen capture failed:', e);
      alert('Snapshot error. Likely CORS-blocked textures. Ensure servers send Access-Control-Allow-Origin and loaders use crossOrigin="anonymous".');
    }
  });

  // Render mode
  renderModeSel.addEventListener('change', () => setRenderMode(renderModeSel.value));
  function setRenderMode(mode) {
    try { app.setRenderModeState?.(mode); } catch (_) { app.__currentRenderMode = mode || 'Solid'; }
    const root = app.robot || app.scene;
    if (!root) return;
    root.traverse(o => {
      if (o.isMesh && o.material && !o.userData?.__isHoverOverlay) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const logicallyHidden = o.visible === false || o.userData?.__automindVisibilityTarget === false;
        for (const m of mats) {
          if (!m) continue;
          m.wireframe = (mode === 'Wireframe');
          if (logicallyHidden) {
            // Render-mode changes must not resurrect isolated/hidden parts.
            m.transparent = true; m.opacity = 0; m.depthWrite = false; m.depthTest = true;
          } else if (mode === 'X-Ray') {
            m.transparent = true; m.opacity = 0.35; m.depthWrite = false; m.depthTest = true;
          } else if (mode === 'Ghost') {
            m.transparent = true; m.opacity = 0.70; m.depthWrite = false; m.depthTest = true;
          } else {
            m.transparent = false; m.opacity = 1.0; m.depthWrite = true; m.depthTest = true;
          }
          m.needsUpdate = true;
        }
      }
    });
    try { app.interaction?.refreshSelectionMarker?.(); } catch (_) {}
  }

  // ============================================================
  // SECTION PLANE — ROBOT ONLY (FIX)
  // ============================================================
  let secEnabled = false, secPlaneVisible = false, secAxis = 'X';
  let sectionPlane = null, secVisual = null;

  // --- Helpers to apply clipping ONLY to robot meshes, without touching grid/ground/axes ---
  function traverseRobotMeshes(fn) {
    if (!app.robot) return;
    app.robot.traverse((o) => {
      if (!o || !o.isMesh || !o.geometry) return;
      if (o.userData && o.userData.__isHoverOverlay) return;
      fn(o);
    });
  }

  function setMaterialClipping(mat, plane) {
    if (!mat) return;
    mat.clippingPlanes = plane ? [plane] : null;
    // keep defaults sane
    mat.clipIntersection = false;
    mat.clipShadows = true;
    mat.needsUpdate = true;
  }

  // We avoid affecting shared materials by cloning robot materials once per mesh
  function ensureClippableMaterials(mesh) {
    if (!mesh || !mesh.material) return;
    if (mesh.userData && mesh.userData.__clipOriginalMaterial) return;

    const orig = mesh.material;
    mesh.userData ??= {};
    mesh.userData.__clipOriginalMaterial = orig;

    if (Array.isArray(orig)) {
      const clones = orig.map(m => (m && m.clone) ? m.clone() : m);
      mesh.userData.__clipClonedMaterial = clones;
    } else {
      mesh.userData.__clipClonedMaterial = (orig && orig.clone) ? orig.clone() : orig;
    }
  }

  function applyRobotOnlyClipping(plane) {
    // localClippingEnabled must be true for per-material clipping to work
    app.renderer.localClippingEnabled = true;

    // IMPORTANT: keep GLOBAL clipping planes empty so helpers are never clipped
    app.renderer.clippingPlanes = [];

    traverseRobotMeshes((mesh) => {
      ensureClippableMaterials(mesh);

      // switch robot mesh to its cloned materials (so shared materials won't affect helpers)
      if (mesh.userData && mesh.userData.__clipClonedMaterial) {
        mesh.material = mesh.userData.__clipClonedMaterial;
      }

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) setMaterialClipping(m, plane);
    });
  }

  function clearRobotOnlyClipping() {
    // restore original materials back to the robot meshes
    traverseRobotMeshes((mesh) => {
      if (mesh.userData && mesh.userData.__clipOriginalMaterial) {
        // clear clipping on cloned mats (optional, keeps state clean)
        const cm = mesh.userData.__clipClonedMaterial;
        const mats = Array.isArray(cm) ? cm : [cm];
        for (const m of mats) setMaterialClipping(m, null);

        mesh.material = mesh.userData.__clipOriginalMaterial;
      } else if (mesh.material) {
        // fallback: just clear clipping
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) setMaterialClipping(m, null);
      }
    });

    // disable clipping system
    app.renderer.clippingPlanes = [];
    app.renderer.localClippingEnabled = false;
  }

  function ensureSectionVisual() {
    if (secVisual) return secVisual;

    const THICK = 0.001;
    const geom = new THREE.BoxGeometry(1, 1, THICK);

    const makeMat = (side) => new THREE.MeshBasicMaterial({
      color: theme.teal,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      premultipliedAlpha: true,
      side
    });

    const back = new THREE.Mesh(geom.clone(), makeMat(THREE.BackSide));
    const front = new THREE.Mesh(geom.clone(), makeMat(THREE.FrontSide));

    back.renderOrder = 9999;
    front.renderOrder = 10000;

    secVisual = new THREE.Group();
    secVisual.add(back, front);

    secVisual.visible = false;
    secVisual.renderOrder = 10000;
    secVisual.frustumCulled = false;

    app.scene.add(secVisual);
    return secVisual;
  }

  function refreshSectionVisual(maxDim, center) {
    if (!secVisual) return;
    const size = Math.max(1e-6, maxDim || 1);
    secVisual.scale.set(size * 1.2, size * 1.2, 1);
    if (center) secVisual.position.copy(center);
  }

  function updateSectionPlane() {
    // ALWAYS keep global clipping planes empty so grid/helpers are never clipped
    app.renderer.clippingPlanes = [];

    if (!secEnabled || !app.robot) {
      sectionPlane = null;
      try { app.sectionPlane = null; app.getSectionPlane = () => null; app.setMechanismClippingPlane?.(null); } catch (_) {}
      clearRobotOnlyClipping();
      if (secVisual) secVisual.visible = false;
      try { app.interaction?.clearHover?.(); app.interaction?.refreshSelectionMarker?.(); } catch (_) {}
      return;
    }

    const n = new THREE.Vector3(
      secAxis === 'X' ? 1 : 0,
      secAxis === 'Y' ? 1 : 0,
      secAxis === 'Z' ? 1 : 0
    );

    const box = new THREE.Box3().setFromObject(app.robot);
    if (box.isEmpty()) {
      sectionPlane = null;
      try { app.sectionPlane = null; app.getSectionPlane = () => null; app.setMechanismClippingPlane?.(null); } catch (_) {}
      clearRobotOnlyClipping();
      if (secVisual) secVisual.visible = false;
      try { app.interaction?.clearHover?.(); app.interaction?.refreshSelectionMarker?.(); } catch (_) {}
      return;
    }

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const center = box.getCenter(new THREE.Vector3());

    const dist = (Number(secDist.value) || 0) * maxDim * 0.5;
    const plane = new THREE.Plane(n, -center.dot(n) - dist);

    sectionPlane = plane;
    try { app.sectionPlane = plane; app.getSectionPlane = () => sectionPlane; } catch (_) {}

    // ✅ APPLY CLIPPING TO ROBOT ONLY
    applyRobotOnlyClipping(plane);
    // Mechanism threads are helpers, not robot meshes, so they need their own
    // material clipping plane. This makes Show Joints/Show Loops get sliced by
    // the section plane exactly like the CAD geometry.
    try { app.setMechanismClippingPlane?.(plane); } catch (_) {}

    // Visual plane (never clipped because we do NOT use global clipping)
    ensureSectionVisual();
    refreshSectionVisual(maxDim, center);
    secVisual.visible = !!secPlaneVisible;

    // Orient the teal plane to match clipping plane normal
    const look = new THREE.Vector3().copy(n);
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(look.dot(up)) > 0.999) up.set(1, 0, 0);
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), look, up);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    secVisual.setRotationFromQuaternion(q);
    const p0 = n.clone().multiplyScalar(-plane.constant);
    secVisual.position.copy(p0);

    // Clipping in Three.js happens in the material shader, but raycasting still
    // sees the original full geometry. Force interaction state to follow the
    // current section plane so hidden components are not hoverable/clickable.
    try { app.interaction?.clearHover?.(); app.interaction?.refreshSelectionMarker?.(); } catch (_) {}
  }

  axisSel.addEventListener('change', () => { secAxis = axisSel.value; updateSectionPlane(); });
  secDist.addEventListener('input', () => updateSectionPlane());
  secEnable.cb.addEventListener('change', () => { secEnabled = !!secEnable.cb.checked; updateSectionPlane(); });
  secShowPlane.cb.addEventListener('change', () => { secPlaneVisible = !!secShowPlane.cb.checked; updateSectionPlane(); });

  // ---------- Views (animated) ----------
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const dirFromAzEl = (az, el) => new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();

  function currentAzEl(cam, target) {
    const v = cam.position.clone().sub(target);
    const len = Math.max(1e-9, v.length());
    return { el: Math.asin(v.y / len), az: Math.atan2(v.z, v.x), r: len };
  }

  let orbitTweenToken = 0;
  function tweenOrbits(cam, ctrl, toPos, toTarget = null, ms = 700) {
    const token = ++orbitTweenToken;
    const p0 = cam.position.clone(), t0 = ctrl.target.clone(), tStart = performance.now();
    ctrl.enabled = false; cam.up.set(0, 1, 0);
    const moveTarget = (toTarget !== null);
    function step(t) {
      if (token !== orbitTweenToken) return;
      const u = Math.min(1, (t - tStart) / ms), e = easeInOutCubic(u);
      cam.position.set(
        p0.x + (toPos.x - p0.x) * e,
        p0.y + (toPos.y - p0.y) * e,
        p0.z + (toPos.z - p0.z) * e
      );
      if (moveTarget) ctrl.target.set(
        t0.x + (toTarget.x - t0.x) * e,
        t0.y + (toTarget.y - t0.y) * e,
        t0.z + (toTarget.z - t0.z) * e
      );
      ctrl.update(); app.renderer.render(app.scene, cam);
      if (u < 1) requestAnimationFrame(step); else if (token === orbitTweenToken) ctrl.enabled = true;
    }
    requestAnimationFrame(step);
  }

  // Store default distance once (at init)
  let DEFAULT_RADIUS = null;

  function initDefaultRadius(app_) {
    const cam = app_.camera, ctrl = app_.controls, t = ctrl.target.clone();
    const cur = currentAzEl(cam, t);
    DEFAULT_RADIUS = cur.r;
  }

  function getRobotFitSphere(app_) {
    const root = app_.robot || app_.scene;
    if (!root) return null;
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return null;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = size.length() * 0.5 * (1 / Math.sqrt(3));
    return { center, size, radius };
  }

  function distanceToFitSphere(cam, radius, pad = 3) {
    const r = Math.max(1e-6, radius) * pad;

    if (cam.isOrthographicCamera) {
      return THREE.MathUtils.clamp(r * 2.0, 0.25, 1e6);
    }

    const vFov = THREE.MathUtils.degToRad(cam.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * (cam.aspect || 1));
    const dV = r / Math.tan(vFov * 0.5);
    const dH = r / Math.tan(hFov * 0.5);
    return Math.max(dV, dH);
  }

  const AUTO_RADIUS_MIN = 0.35;
  const AUTO_RADIUS_MAX = 1e4;

  function getActiveFitSphere(app_) {
    try {
      const focused = app_?.getCurrentViewFitSphere?.();
      if (focused && focused.center && focused.size && Number.isFinite(focused.radius)) return focused;
    } catch (_) {}
    return getRobotFitSphere(app_);
  }

  function viewEndPose(kind) {
    const cam = app.camera, ctrl = app.controls;
    const s = getActiveFitSphere(app);
    const target = s ? s.center.clone() : ctrl.target.clone();

    const curVec = cam.position.clone().sub(target);
    const len = Math.max(1e-9, curVec.length());
    const cur = { el: Math.asin(curVec.y / len), az: Math.atan2(curVec.z, curVec.x) };

    let az = cur.az, el = cur.el;
    const topEps = 1e-3;
    if (kind === 'iso') { az = Math.PI * 0.25; el = Math.PI * 0.20; }
    if (kind === 'top') { az = Math.round(cur.az / (Math.PI / 2)) * (Math.PI / 2); el = Math.PI / 2 - topEps; }
    if (kind === 'front') { az = Math.PI / 2; el = 0; }
    if (kind === 'right') { az = 0; el = 0; }

    let fitR = 4;
    if (s) {
      fitR = distanceToFitSphere(cam, s.radius, 3);
      fitR = THREE.MathUtils.clamp(fitR, AUTO_RADIUS_MIN, AUTO_RADIUS_MAX);
      if (cam.isOrthographicCamera) {
        const aspect = Math.max(1e-6, (app.renderer?.domElement?.clientWidth || 1) / (app.renderer?.domElement?.clientHeight || 1));
        const halfH = Math.max((s.radius || 1) * 2.85, 1e-6);
        cam.left = -halfH * aspect;
        cam.right = halfH * aspect;
        cam.top = halfH;
        cam.bottom = -halfH;
        cam.zoom = 1;
        const depth = Math.max((s.radius || 1) * 80, 1000);
        cam.near = -depth;
        cam.far = depth;
        cam.updateProjectionMatrix();
        fitR = Math.max((s.radius || 1) * 6, 1.0);
      }
    }

    const dir = new THREE.Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az)
    ).normalize();

    const pos = target.clone().add(dir.multiplyScalar(fitR));
    return { pos, target };
  }

  const bIsoEl = rowCam.children[0], bTopEl = rowCam.children[1], bFrontEl = rowCam.children[2], bRightEl = rowCam.children[3];
  const to = (kind) => viewEndPose(kind);

  bIsoEl.addEventListener('click', () => { const v = to('iso'); tweenOrbits(app.camera, app.controls, v.pos, v.target, 750); });
  bTopEl.addEventListener('click', () => { const v = to('top'); tweenOrbits(app.camera, app.controls, v.pos, v.target, 750); });
  bFrontEl.addEventListener('click', () => { const v = to('front'); tweenOrbits(app.camera, app.controls, v.pos, v.target, 750); });
  bRightEl.addEventListener('click', () => { const v = to('right'); tweenOrbits(app.camera, app.controls, v.pos, v.target, 750); });

  // ---------- Projection ----------
  projSel.addEventListener('change', () => {
    const mode = projSel.value === 'Orthographic' ? 'Orthographic' : 'Perspective';
    try { app.setProjection?.(mode); } catch (_) {}
  });

  // ---------- Scene toggles ----------
  togGrid.cb.addEventListener('change', () => app.setSceneToggles?.({ grid: !!togGrid.cb.checked }));
  togGround.cb.addEventListener('change', () => app.setSceneToggles?.({ ground: !!togGround.cb.checked, shadows: !!togGround.cb.checked }));
  togAxes.cb.addEventListener('change', () => app.setSceneToggles?.({ axes: !!togAxes.cb.checked }));
  togShowJoints.cb.addEventListener('change', () => {
    app.setMechanismToggles?.({ jointAxes: !!togShowJoints.cb.checked });
  });
  togShowLoops.cb.addEventListener('change', () => {
    app.setMechanismToggles?.({ loops: !!togShowLoops.cb.checked });
  });
  // Apply initial checkbox state after the robot/decorations already exist.
  setTimeout(() => {
    try { app.setMechanismToggles?.({ jointAxes: !!togShowJoints.cb.checked, loops: !!togShowLoops.cb.checked }); } catch (_) {}
  }, 0);

  // ============================================================
  // EXPLODE MANAGER (kept as-is except a tiny bugfix: amount() must be inside manager)
  // ============================================================
  function makeExplodeManager() {
    const registry = [];
    const marker = new WeakSet();
    let maxDim = 1;
    let prepared = false;

    let current = 0;
    let target = 0;
    let vel = 0;
    let raf = null;
    let lastT = 0;
    const stiffness = 18;
    const damping = 2 * Math.sqrt(stiffness);

    let zeroSince = null;

    function amount() {
      return current;
    }

    function worldDirToParentLocal(parent, dirWorld) {
      const m = new THREE.Matrix4().copy(parent.matrixWorld).invert();
      const n = new THREE.Matrix3().setFromMatrix4(m);
      return dirWorld.clone().applyMatrix3(n).normalize();
    }

    function chooseTopPartFor(mesh) {
      let n = mesh;
      while (n && n !== app.robot) {
        if (marker.has(n)) return n;
        if (n.parent === app.robot) return n;
        n = n.parent;
      }
      return mesh.parent || mesh;
    }

    function computeBounds() {
      const box = new THREE.Box3().setFromObject(app.robot);
      if (box.isEmpty()) return null;
      return { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
    }

    function prepare() {
      registry.length = 0;
      if (!app.robot) { prepared = false; return; }

      const R = computeBounds();
      if (!R) { prepared = false; return; }
      maxDim = Math.max(R.size.x, R.size.y, R.size.z) || 1;

      const parts = new Set();
      const seen = new WeakSet();
      app.robot.traverse((o) => {
        if (o.isMesh && o.geometry && o.visible && !o.userData.__isHoverOverlay) {
          const top = chooseTopPartFor(o);
          if (!seen.has(top)) { parts.add(top); seen.add(top); marker.add(top); }
        }
      });

      parts.forEach((node) => {
        const parent = node.parent || app.robot;
        const baseLocal = node.position.clone();

        const box = new THREE.Box3().setFromObject(node);
        if (box.isEmpty()) return;
        const cWorld = box.getCenter(new THREE.Vector3());
        const dirWorld = cWorld.sub(R.center).normalize();
        if (!isFinite(dirWorld.x + dirWorld.y + dirWorld.z)) return;

        const dirLocal = worldDirToParentLocal(parent, dirWorld);
        if (!isFinite(dirLocal.x + dirLocal.y + dirLocal.z) || dirLocal.lengthSq() < 1e-12) {
          dirLocal.set((Math.random() * 2 - 1), (Math.random() * 2 - 1), (Math.random() * 2 - 1)).normalize();
        }

        registry.push({ node, parent, baseLocal, dirLocal });
      });

      prepared = true;
      zeroSince = performance.now();
    }

    function applyAmount(a01) {
      if (!prepared) prepare();
      const f = Math.max(0, Math.min(1, a01 || 0));
      const maxOffset = maxDim * 0.6;

      for (const rec of registry) {
        const { node, baseLocal, dirLocal } = rec;
        node.position.copy(baseLocal).addScaledVector(dirLocal, f * maxOffset);
      }

      updateSectionPlane?.();
      try { app.interaction?.refreshSelectionMarker?.(); } catch (_) {}
      try { app.controls?.update?.(); app.renderer?.render?.(app.scene, app.camera); } catch (_) {}
    }

    function tickSpring(now) {
      if (!lastT) lastT = now;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      const x = current, v = vel, xT = target;
      const a = stiffness * (xT - x) - damping * v;
      vel = v + a * dt;
      current = x + vel * dt;

      if (Math.abs(current - target) < 0.0005 && Math.abs(vel) < 0.0005) {
        current = target; vel = 0;
      }

      applyAmount(current);

      if (current === 0) {
        zeroSince ??= now;
        if (now - zeroSince > 300) {
          const keepTarget = target;
          prepare();
          applyAmount(current);
          target = keepTarget;
          zeroSince = now;
        }
      } else {
        zeroSince = null;
      }

      if (current !== target || vel !== 0) {
        raf = requestAnimationFrame(tickSpring);
      } else {
        raf = null;
      }
    }

    function setTarget(a01) {
      target = Math.max(0, Math.min(1, Number(a01) || 0));
      if (!prepared) prepare();
      if (!raf) { lastT = 0; raf = requestAnimationFrame(tickSpring); }
    }

    function immediate(a01) {
      target = current = Math.max(0, Math.min(1, Number(a01) || 0));
      vel = 0;
      if (!prepared) prepare();
      applyAmount(current);
    }

    function recalibrate() {
      prepare();
      applyAmount(current);
    }

    function destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    return { prepare, setTarget, immediate, recalibrate, destroy, amount };
  }

  const explode = makeExplodeManager();
  try { app.explodeRecalibrate = () => explode.recalibrate(); } catch (_) {}

  explodeSlider.addEventListener('input', () => {
    explode.setTarget(Number(explodeSlider.value) || 0);
  });

  function syncExplodeUI() {
    try {
      const a = explode.amount();
      if (!Number.isNaN(a)) explodeSlider.value = String(Math.max(0, Math.min(1, a)));
    } catch { }
  }

  // Defaults
  togGrid.cb.checked = false;
  togGround.cb.checked = false;
  togAxes.cb.checked = false;

  // Start closed
  set(false);

  function onHotkeyH(e) {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.isComposing) return;

    if (e.key === 't' || e.key === 'T' || e.code === 'KeyT') {
      e.preventDefault();
      try { console.log('pressed t'); } catch { }
      set(!isOpen);
    }
  }
  document.addEventListener('keydown', onHotkeyH, true);

  // Public API
  function destroy() {
    try { ui.toggleBtn.remove(); } catch (_) { }
    try { ui.dock.remove(); } catch (_) { }
    try { ui.root.remove(); } catch (_) { }

    try {
      // ensure we restore robot materials and disable clipping
      clearRobotOnlyClipping();
      if (secVisual) app.scene.remove(secVisual);
    } catch (_) { }

    explode.destroy();
    document.removeEventListener('keydown', onHotkeyH, true);
  }

  return { open: openDock, close: closeDock, set, destroy };
}
return { createToolsDock: (typeof createToolsDock !== "undefined" ? createToolsDock : undefined) };
})();
const createToolsDock = __mod_ui_ToolsDock_js.createToolsDock;

// ===== bundled module: ui/ComponentsPanel.js =====
const __mod_ui_ComponentsPanel_js = (() => {
// /viewer/ui/ComponentsPanel.js
// Lista de componentes + frame de descripción al hacer click.
// Integra IA:
//  - Usa app.getComponentDescription(assetKey, index) / app.componentDescriptions.
//  - Actualiza descripción al hacer click.
//  - Si la IA llega después, refresca automáticamente el detalle actual
//    al recibir el evento 'ia_descriptions_ready'.
//
// Versión arreglada:
//  - Mantiene el tamaño/formato visual anterior.
//  - Mantiene UI_SCALE = 0.5.
//  - Mantiene panel width = 440px.
//  - Mantiene thumbnails 128x96.
//  - Mantiene el sistema de traslación/tween con transform + transition.
//  - Panel aparece abajo a la izquierda.
//  - El translateX cerrado se calcula automáticamente según el visualizador.
//  - Ya no necesitas reajustar right/translateX al cambiar de PC.

function createComponentsPanel(app, theme) {
  if (!app || !app.assets || !app.isolate || !app.showAll) {
    throw new Error("[ComponentsPanel] Missing required app APIs");
  }

  const ui = {
    root: document.createElement("div"),
    btn: document.createElement("button"),
    panel: document.createElement("div"),
    header: document.createElement("div"),
    title: document.createElement("div"),
    showAllBtn: document.createElement("button"),
    details: document.createElement("div"),
    detailsTitle: document.createElement("div"),
    detailsBody: document.createElement("div"),
    list: document.createElement("div"),
  };

  // ============================================================
  // CONFIGURACIÓN BASE
  // ============================================================
  // Se mantiene el formato anterior:
  // - botón escalado a 0.5
  // - panel escalado a 0.5
  // - panel base de 440px
  // - thumbnails 128x96
  //
  // El cambio importante:
  // - El panel ahora se ancla abajo a la izquierda.
  // - El sistema de apertura/cierre sigue usando translateX.
  // - El CLOSED_TX se calcula automáticamente.
  // ============================================================

  const UI_SCALE = 0.5;
  const UI_SCALE_INV = 1 / UI_SCALE;

  const BUTTON_LEFT = 50;
  const BUTTON_BOTTOM = 14;

  const PANEL_BASE_WIDTH = 440;
  const PANEL_GAP_ABOVE_BUTTON = 10;

  const SAFE_GAP = 14;

  let open = false;
  let building = false;
  let disposed = false;

  let currentEnt = null;
  let currentIndex = null;

  let currentClosedTx = -2000;

  const css = {
    root: {
      position: "absolute",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "9999",
      overflow: "hidden",
      fontFamily:
        "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    },

    // Botón: mismo formato/tamaño que antes
    btn: {
      position: "absolute",
      left: `${BUTTON_LEFT}px`,
      bottom: `${BUTTON_BOTTOM}px`,
      padding: "8px 12px",
      borderRadius: "12px",
      border: `1px solid ${theme.stroke}`,
      background: theme.bgPanel,
      color: theme.text,
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: theme.shadow,
      pointerEvents: "auto",
      transition: "all .12s ease",
    },

    // Panel: mismo formato/tamaño que antes, pero abajo a la izquierda
    panel: {
      position: "absolute",
      left: `${BUTTON_LEFT}px`,
      bottom: "60px",

      width: `${PANEL_BASE_WIDTH}px`,
      maxHeight: `calc(92vh * ${UI_SCALE_INV})`,

      background: theme.bgPanel,
      border: `1px solid ${theme.stroke}`,
      boxShadow: theme.shadow,
      borderRadius: "18px",
      overflow: "hidden",
      display: "block",
      pointerEvents: "auto",
      willChange: "transform, opacity",

      // Este es el tween que te gustaba.
      transition:
        "transform 260ms cubic-bezier(.2,.7,.2,1), opacity 200ms ease",

      transform: "translateX(-2000px)",
      opacity: "0",
    },

    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      padding: "10px 12px",
      borderBottom: `1px solid ${theme.stroke}`,
      background: "#0ea5a6",
    },

    title: {
      fontWeight: "800",
      color: "#ffffff",
      fontSize: "14px",
    },

    showAllBtn: {
      padding: "6px 10px",
      borderRadius: "10px",
      border: `1px solid ${theme.stroke}`,
      background: theme.bgPanel,
      fontWeight: "700",
      cursor: "pointer",
      fontSize: "11px",
      transition: "all .12s ease",
    },

    details: {
      display: "none",
      padding: "10px 12px",
      borderBottom: `1px solid ${theme.stroke}`,
      background: "#ffffff",
    },

    detailsTitle: {
      fontWeight: "800",
      fontSize: "13px",
      marginBottom: "4px",
      color: theme.text,
    },

    detailsBody: {
      fontSize: "12px",
      lineHeight: "1.5",
      color: theme.textMuted,
      whiteSpace: "pre-wrap",
    },

    list: {
      overflowY: "auto",
      maxHeight: `calc((92vh - 52px) * ${UI_SCALE_INV})`,
      padding: "10px",
    },
  };

  applyStyles(ui.root, css.root);
  applyStyles(ui.btn, css.btn);
  applyStyles(ui.panel, css.panel);
  applyStyles(ui.header, css.header);
  applyStyles(ui.title, css.title);
  applyStyles(ui.showAllBtn, css.showAllBtn);
  applyStyles(ui.details, css.details);
  applyStyles(ui.detailsTitle, css.detailsTitle);
  applyStyles(ui.detailsBody, css.detailsBody);
  applyStyles(ui.list, css.list);

  // Mantiene el tamaño visual anterior
  ui.btn.style.transformOrigin = "bottom left";
  ui.btn.style.scale = String(UI_SCALE);

  // Importante: panel escalado igual que antes, pero anclado abajo a la izquierda
  ui.panel.style.transformOrigin = "bottom left";
  ui.panel.style.scale = String(UI_SCALE);

  ui.btn.textContent = "Components";
  ui.title.textContent = "Components";
  ui.showAllBtn.textContent = "Show all";

  ui.header.appendChild(ui.title);
  ui.header.appendChild(ui.showAllBtn);
  ui.details.appendChild(ui.detailsTitle);
  ui.details.appendChild(ui.detailsBody);
  ui.panel.appendChild(ui.header);
  ui.panel.appendChild(ui.details);
  ui.panel.appendChild(ui.list);
  ui.root.appendChild(ui.panel);
  ui.root.appendChild(ui.btn);

  const host =
    (app.renderer && app.renderer.domElement
      ? app.renderer.domElement.parentElement
      : null) || document.body;

  // Para que absolute sea relativo al visualizador, no al body completo
  const hostStyle = window.getComputedStyle(host);
  if (hostStyle.position === "static") {
    host.style.position = "relative";
  }

  host.appendChild(ui.root);

  // ============================================================
  // RESPONSIVE + CLOSED TRANSLATE AUTOMÁTICO
  // ============================================================

  function getHostSize() {
    const rect = host.getBoundingClientRect();

    return {
      width: Math.max(rect.width || window.innerWidth || 1, 1),
      height: Math.max(rect.height || window.innerHeight || 1, 1),
    };
  }

  function computeClosedTx({ left, panelWidth, hostW }) {
    // El panel está escalado con UI_SCALE.
    // Para asegurar que desaparezca totalmente hacia la izquierda,
    // usamos una distancia lógica grande basada en el tamaño real del host.
    //
    // No es un número calibrado a mano: cambia con el tamaño del visualizador.
    const visualPanelWidth = panelWidth * UI_SCALE;

    const neededVisualMove =
      left + visualPanelWidth + SAFE_GAP + Math.max(80, hostW * 0.08);

    return -Math.ceil(neededVisualMove * UI_SCALE_INV);
  }

  function updateResponsiveLayout() {
    if (disposed) return;

    const { width: hostW, height: hostH } = getHostSize();

    // Mantiene BUTTON_LEFT = 50 cuando se puede.
    // Si el visualizador es muy angosto, evita que se salga.
    const left =
      hostW < 360
        ? SAFE_GAP
        : Math.min(BUTTON_LEFT, Math.max(SAFE_GAP, hostW - 160));

    const btnHeightVisual = (ui.btn.offsetHeight || 42) * UI_SCALE;
    const panelBottom = BUTTON_BOTTOM + btnHeightVisual + PANEL_GAP_ABOVE_BUTTON;

    // Mantiene 440px de ancho lógico.
    // Solo reduce si el visualizador es demasiado angosto.
    const maxPanelWidthByHost = Math.max(
      260,
      (hostW - left - SAFE_GAP) * UI_SCALE_INV
    );

    const panelWidth = Math.min(PANEL_BASE_WIDTH, maxPanelWidthByHost);

    // Como el panel se escala a 0.5, la altura lógica debe compensarse.
    const availableVisualHeight = Math.max(
      120,
      hostH - panelBottom - SAFE_GAP
    );

    const availableLayoutHeight = availableVisualHeight * UI_SCALE_INV;

    ui.btn.style.left = `${left}px`;
    ui.btn.style.bottom = `${BUTTON_BOTTOM}px`;

    ui.panel.style.left = `${left}px`;
    ui.panel.style.bottom = `${panelBottom}px`;
    ui.panel.style.width = `${panelWidth}px`;
    ui.panel.style.maxHeight = `${availableLayoutHeight}px`;

    ui.list.style.maxHeight = `${Math.max(80, availableLayoutHeight - 52)}px`;

    currentClosedTx = computeClosedTx({
      left,
      panelWidth,
      hostW,
    });

    // Si está cerrado y cambia el tamaño del visualizador,
    // actualizamos su posición cerrada sin romper el tween.
    if (!open) {
      ui.panel.style.transform = `translateX(${currentClosedTx}px)`;
    }
  }

  let resizeObserver = null;

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => updateResponsiveLayout());
    resizeObserver.observe(host);
  } else {
    window.addEventListener("resize", updateResponsiveLayout);
  }

  requestAnimationFrame(updateResponsiveLayout);

  // ============================================================
  // HOVERS
  // ============================================================

  ui.btn.addEventListener("mouseenter", () => {
    ui.btn.style.transform = "translateY(-1px) scale(1.02)";
    ui.btn.style.background = theme.tealFaint;
    ui.btn.style.borderColor = theme.tealSoft ?? theme.teal;
  });

  ui.btn.addEventListener("mouseleave", () => {
    ui.btn.style.transform = "none";
    ui.btn.style.background = theme.bgPanel;
    ui.btn.style.borderColor = theme.stroke;
  });

  ui.showAllBtn.addEventListener("mouseenter", () => {
    ui.showAllBtn.style.transform = "translateY(-1px) scale(1.02)";
    ui.showAllBtn.style.background = theme.tealFaint;
    ui.showAllBtn.style.borderColor = theme.tealSoft ?? theme.teal;
  });

  ui.showAllBtn.addEventListener("mouseleave", () => {
    ui.showAllBtn.style.transform = "none";
    ui.showAllBtn.style.background = theme.bgPanel;
    ui.showAllBtn.style.borderColor = theme.stroke;
  });

  ui.showAllBtn.addEventListener("click", () => {
    try { app.clearSelection?.(); app.interaction?.clearHover?.(); } catch (_) {}
    try { app.showAll(); } catch (_) {}
    hideDetails();
  });

  // ============================================================
  // OPEN / CLOSE CON TRANSLATEX + TWEEN
  // ============================================================

  function set(isOpen) {
    open = !!isOpen;

    updateResponsiveLayout();

    if (open) {
      ui.panel.style.opacity = "1";

      // Abierto: vuelve a su posición natural abajo a la izquierda.
      // El tween ocurre desde currentClosedTx hasta 0.
      ui.panel.style.transform = "translateX(0px)";
      ui.panel.style.pointerEvents = "auto";
    } else {
      ui.panel.style.opacity = "0";

      // Cerrado: se va hacia la izquierda con translateX dinámico.
      // Mantiene la animación tipo dock.
      ui.panel.style.transform = `translateX(${currentClosedTx}px)`;
      ui.panel.style.pointerEvents = "none";
    }
  }

  function openPanel() {
    set(true);
    maybeBuild();
  }

  function closePanel() {
    set(false);
  }

  ui.btn.addEventListener("click", () => {
    set(!open);
    if (open) maybeBuild();
  });

  async function maybeBuild() {
    if (building || disposed) return;

    building = true;

    try {
      await renderList();
      updateResponsiveLayout();
    } finally {
      building = false;
    }
  }

  // ============================================================
  // RENDER LIST
  // ============================================================

  async function renderList() {
    clearElement(ui.list);

    let items = [];

    try {
      const res = app.assets.list?.();
      items = Array.isArray(res) ? res : await res;
    } catch {
      items = [];
    }

    if (!items.length) {
      const empty = document.createElement("div");
      empty.textContent = "No components with visual geometry found.";
      empty.style.color = theme.textMuted;
      empty.style.fontWeight = "600";
      empty.style.padding = "8px 2px";
      ui.list.appendChild(empty);
      return;
    }

    items.forEach((ent, index) => {
      const row = document.createElement("div");
      applyStyles(row, rowStyles(theme));

      const img = document.createElement("img");
      applyStyles(img, thumbStyles(theme));
      img.alt = ent.base;
      img.loading = "eager";
      img.decoding = "async";

      const meta = document.createElement("div");

      const title = document.createElement("div");
      title.textContent = ent.base;
      title.style.fontWeight = "700";
      title.style.fontSize = "14px";
      title.style.color = theme.text;

      const small = document.createElement("div");
      small.textContent = `.${ent.ext || "asset"} • ${ent.count} instance${
        ent.count > 1 ? "s" : ""
      }`;
      small.style.color = theme.textMuted;
      small.style.fontSize = "12px";
      small.style.marginTop = "2px";

      meta.appendChild(title);
      meta.appendChild(small);

      row.appendChild(img);
      row.appendChild(meta);
      ui.list.appendChild(row);

      row.addEventListener("mouseenter", () => {
        row.style.transform = "translateY(-1px) scale(1.02)";
        row.style.background = theme.tealFaint;
        row.style.borderColor = theme.tealSoft ?? theme.teal;
      });

      row.addEventListener("mouseleave", () => {
        row.style.transform = "none";
        row.style.background = "#fff";
        row.style.borderColor = theme.stroke;
      });

      row.addEventListener("click", () => {
        // Component menu navigation should behave like a camera focus action,
        // not as a 3D selection. Clear any previous blue selection box first.
        try { app.clearSelection?.(); app.interaction?.clearHover?.(); } catch (_) {}

        try {
          app.isolate.asset(ent.assetKey);
        } catch (_) {}

        currentEnt = ent;
        currentIndex = index;
        showDetails(ent, index);
        set(true);
      });

      (async () => {
        try {
          const url = await app.assets.thumbnail?.(ent.assetKey);

          if (url) {
            img.src = url;
          } else {
            img.replaceWith(makeThumbFallback(ent.base, theme));
          }
        } catch {
          img.replaceWith(makeThumbFallback(ent.base, theme));
        } finally {
          updateResponsiveLayout();
        }
      })();
    });

    updateResponsiveLayout();
  }

  // ============================================================
  // IA DESCRIPTION
  // ============================================================

  function resolveDescription(ent, index) {
    let text = "";

    try {
      if (typeof app.getComponentDescription === "function") {
        text = app.getComponentDescription(ent.assetKey, index) || "";
      }
    } catch (_) {
      text = "";
    }

    if (!text && app.componentDescriptions) {
      const src = app.componentDescriptions;

      if (src[ent.assetKey]) {
        text = src[ent.assetKey];
      } else {
        const base = basenameNoExt(ent.assetKey);
        if (src[base]) text = src[base];
      }
    }

    return text;
  }

  function showDetails(ent, index) {
    if (disposed) return;

    const text = resolveDescription(ent, index);

    if (!text) {
      console.debug(
        "[ComponentsPanel] No se encontró descripción para",
        ent.assetKey
      );
    }

    // Mantengo tu comportamiento anterior:
    // no se muestra el bloque details aunque exista descripción.
    //
    // Si quieres volver a mostrar la descripción IA en el panel,
    // descomenta este bloque:
    //
    // ui.detailsTitle.textContent = ent.base;
    // ui.detailsBody.textContent =
    //   text || "Sin descripción generada para esta pieza.";
    // ui.details.style.display = "block";

    console.debug("[ComponentsPanel] showDetails:", ent.assetKey, "=>", text);
    updateResponsiveLayout();
  }

  function hideDetails() {
    ui.details.style.display = "none";
    ui.detailsTitle.textContent = "";
    ui.detailsBody.textContent = "";
    currentEnt = null;
    currentIndex = null;
    updateResponsiveLayout();
  }

  function refreshCurrentDetailsFromIA() {
    if (!currentEnt && currentIndex == null) return;

    const txt = resolveDescription(currentEnt, currentIndex);

    if (txt && txt !== ui.detailsBody.textContent) {
      ui.detailsBody.textContent = txt;

      console.debug(
        "[ComponentsPanel][IA] Detalle actualizado tras IA para",
        currentEnt.assetKey
      );
    }
  }

  function onIAReady(ev) {
    console.debug("[ComponentsPanel][IA] ia_descriptions_ready", ev && ev.detail);
    refreshCurrentDetailsFromIA();
  }

  window.addEventListener("ia_descriptions_ready", onIAReady);

  let pollCount = 0;

  const pollTimer = setInterval(() => {
    if (disposed) {
      clearInterval(pollTimer);
      return;
    }

    pollCount += 1;

    if (
      app.componentDescriptions &&
      Object.keys(app.componentDescriptions).length > 0
    ) {
      console.debug("[ComponentsPanel][IA] Descripciones detectadas por poll");
      refreshCurrentDetailsFromIA();
      clearInterval(pollTimer);
    }

    if (pollCount > 20) {
      clearInterval(pollTimer);
    }
  }, 500);

  async function refresh() {
    if (disposed) return;
    await renderList();
    updateResponsiveLayout();
  }

  function destroy() {
    disposed = true;

    try {
      document.removeEventListener("keydown", onHotkeyC, true);
    } catch (_) {}

    try {
      window.removeEventListener("ia_descriptions_ready", onIAReady);
    } catch (_) {}

    try {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", updateResponsiveLayout);
      }
    } catch (_) {}

    clearInterval(pollTimer);

    try {
      ui.btn.remove();
    } catch (_) {}

    try {
      ui.panel.remove();
    } catch (_) {}

    try {
      ui.root.remove();
    } catch (_) {}
  }

  function onHotkeyC(e) {
    const tag = (e.target && e.target.tagName) || "";
    const t = tag.toLowerCase();

    if (t === "input" || t === "textarea" || t === "select" || e.isComposing) {
      return;
    }

    if (e.key === "c" || e.key === "C" || e.code === "KeyC") {
      e.preventDefault();
      set(!open);
      if (open) maybeBuild();
    }
  }

  document.addEventListener("keydown", onHotkeyC, true);

  set(false);
  maybeBuild();

  return {
    open: openPanel,
    close: closePanel,
    set,
    refresh,
    destroy,
  };
}

function applyStyles(el, styles) {
  Object.assign(el.style, styles);
}

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function basenameNoExt(p) {
  const q = String(p || "").split("/").pop().split("?")[0].split("#")[0];
  const dot = q.lastIndexOf(".");
  return dot >= 0 ? q.slice(0, dot) : q;
}

function rowStyles(theme) {
  return {
    display: "grid",
    gridTemplateColumns: "128px 1fr",
    gap: "12px",
    alignItems: "center",
    padding: "10px",
    borderRadius: "12px",
    border: `1px solid ${theme.stroke}`,
    marginBottom: "10px",
    background: "#fff",
    cursor: "pointer",
    transition: "transform .08s ease, box-shadow .12s ease",
  };
}

function thumbStyles(theme) {
  return {
    width: "128px",
    height: "96px",
    objectFit: "contain",
    background: "#f7fbfb",
    borderRadius: "10px",
    border: `1px solid ${theme.stroke}`,
  };
}

function makeThumbFallback(label, theme) {
  const wrap = document.createElement("div");

  wrap.style.width = "128px";
  wrap.style.height = "96px";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.background = "#f7fbfb";
  wrap.style.border = `1px solid ${theme.stroke}`;
  wrap.style.borderRadius = "10px";
  wrap.style.fontSize = "11px";
  wrap.style.color = theme.textMuted;
  wrap.style.textAlign = "center";
  wrap.textContent = label || "—";

  return wrap;
}
return { createComponentsPanel: (typeof createComponentsPanel !== "undefined" ? createComponentsPanel : undefined) };
})();
const createComponentsPanel = __mod_ui_ComponentsPanel_js.createComponentsPanel;

// ===== bundled module: core/URDFPlusCore.js =====
const __mod_core_URDFPlusCore_js = (() => {
// /URDF_Viewer/core/URDFPlusCore.js
// AutoMind URDF+ loader for the modular USD-style viewer shell. V5 texture/up-axis fixes.
// No iframe, no standalone HTML: it builds a THREE robot directly and exposes
// the same robot API expected by SelectionAndDrag, ToolsDock and ComponentsPanel.
/* global THREE */

const EPS = 1e-12;
const TEXT_EXT = /\.(urdf|xml|dae|obj|mtl|txt|json|csv)$/i;

function assertThree() {
  if (typeof THREE === 'undefined') throw new Error('[URDFPlusCore] THREE is not defined. Load three.js first.');
}
function basename(path) { return String(path || 'file').split(/[\\/]/).filter(Boolean).pop() || 'file'; }
function stripExt(path) { return basename(path).replace(/\.[^.]+$/, ''); }
function extname(path) { const b = basename(path); const i = b.lastIndexOf('.'); return i >= 0 ? b.slice(i).toLowerCase() : ''; }
function cleanPath(path) {
  let s = String(path || '').trim();
  if ((s.startsWith('@') && s.endsWith('@')) || (s.startsWith('"') && s.endsWith('"'))) s = s.slice(1, -1);
  try { s = decodeURIComponent(s); } catch (_) {}
  s = s.replace(/\\/g, '/').replace(/[?#].*$/, '');
  s = s.replace(/^data:model\//i, '').replace(/^file:\/+/i, '').replace(/^package:\/\//i, '').replace(/^[A-Za-z]:\//, '');
  s = s.replace(/^\.\//, '').replace(/^\/+/, '');
  return s;
}
function normKey(path) { return cleanPath(path).toLowerCase(); }
function variantsFor(path) {
  const raw = cleanPath(path);
  if (!raw) return [];
  const out = new Set();
  const add = (x) => {
    x = normKey(x);
    if (!x) return;
    out.add(x);
    out.add(x.replace(/^\.\//, ''));
    out.add(x.replace(/^\.\.\//, ''));
    const base = basename(x).toLowerCase();
    if (base) out.add(base);
    const parts = x.split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) out.add(parts.slice(i).join('/'));
    if (base) {
      const stem = base.replace(/\.[^.]+$/, '');
      out.add(base.replace(/%20/g, ' '));
      out.add(base.replace(/\s+/g, '_'));
      out.add(base.replace(/_/g, ' '));
      out.add(stem);
      out.add(stem.replace(/[\s_\-]+/g, ''));
    }
  };
  add(raw);
  add(raw.replace(/^.*?urdf_export\//i, ''));
  add(raw.replace(/^.*?meshes\//i, 'meshes/'));
  add(raw.replace(/^.*?mesh\//i, 'mesh/'));
  add(raw.replace(/^.*?textures\//i, 'textures/'));
  add(raw.replace(/^.*?texture\//i, 'texture/'));
  return Array.from(out).filter(Boolean);
}
function mimeFromPath(path) {
  const e = extname(path);
  if (e === '.urdf' || e === '.xml') return 'application/xml';
  if (e === '.dae') return 'model/vnd.collada+xml';
  if (e === '.stl') return 'model/stl';
  if (e === '.obj' || e === '.mtl') return 'text/plain';
  if (e === '.png') return 'image/png';
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.webp') return 'image/webp';
  if (e === '.bmp') return 'image/bmp';
  if (e === '.gif') return 'image/gif';
  if (e === '.tga') return 'image/x-tga';
  return 'application/octet-stream';
}
function dataURLFromValue(path, value) {
  if (value == null) return '';
  if (value instanceof Blob || value instanceof File) return '';
  let s = String(value);
  if (/^(data:|blob:|https?:\/\/)/i.test(s)) return s;
  const mime = mimeFromPath(path);
  if (TEXT_EXT.test(path) && /[<>{}\n\r]/.test(s.slice(0, 2048))) {
    return `data:${mime};charset=utf-8,${encodeURIComponent(s)}`;
  }
  return `data:${mime};base64,${s.replace(/\s+/g, '')}`;
}
function parseVec(s, fallback = [0, 0, 0]) {
  if (s == null || s === '') return Array.isArray(fallback) ? fallback.slice() : fallback;
  const nums = String(s).match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g)?.map(Number) || [];
  const out = Array.isArray(fallback) ? fallback.slice() : [0, 0, 0];
  for (let i = 0; i < Math.min(out.length, nums.length); i++) if (Number.isFinite(nums[i])) out[i] = nums[i];
  return out;
}
function parseNum(s, fallback = 0) { const n = Number(s); return Number.isFinite(n) ? n : fallback; }
function boolAttr(v, fallback = false) {
  if (v == null || v === '') return fallback;
  return /^(true|1|yes|si|sí)$/i.test(String(v));
}
function localName(node) { return (node?.localName || node?.nodeName || '').replace(/^.*:/, ''); }
function childrenByLocalName(node, name) { return Array.from(node?.children || []).filter(n => localName(n) === name); }
function childByLocalName(node, name) { return childrenByLocalName(node, name)[0] || null; }
function attrAny(node, names, fallback = '') {
  if (!node) return fallback;
  for (const name of names) {
    const v = node.getAttribute?.(name) ?? node.getAttributeNS?.('https://automind.dev/mechanism', name.replace(/^automind:/, ''));
    if (v != null && v !== '') return v;
  }
  return fallback;
}
function repairMissingUrdfPlusNamespace(text) {
  let s = String(text || '').replace(/^\uFEFF/, '');
  if (/<robot\b/i.test(s) && /automind:/i.test(s) && !/xmlns:automind=/i.test(s)) {
    s = s.replace(/<robot\b/i, '<robot xmlns:automind="https://automind.dev/mechanism"');
  }
  return s;
}
function applyOrigin(obj, origin = {}) {
  const xyz = origin.xyz || [0, 0, 0];
  const rpy = origin.rpy || [0, 0, 0];
  obj.position.set(xyz[0] || 0, xyz[1] || 0, xyz[2] || 0);
  obj.rotation.set(rpy[0] || 0, rpy[1] || 0, rpy[2] || 0, 'XYZ');
  obj.updateMatrix();
}
function parseOrigin(node) { return { xyz: parseVec(node?.getAttribute?.('xyz'), [0,0,0]), rpy: parseVec(node?.getAttribute?.('rpy'), [0,0,0]) }; }
function originMatrix(origin = {}) {
  const o = new THREE.Object3D();
  applyOrigin(o, origin);
  return o.matrix.clone();
}
function createDefaultMaterial(color = 0xdce7ea) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.04, side: THREE.DoubleSide });
}
function setObjectUserDataRecursive(obj, linkName) {
  obj?.traverse?.((o) => {
    if (!o.userData) o.userData = {};
    o.userData.__linkName = linkName;
    o.userData.__assetKey = linkName;
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (!o.material) o.material = createDefaultMaterial();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.color && m.color.r > 0.96 && m.color.g > 0.96 && m.color.b > 0.96 && !m.map) m.color.setHex(0xe5ecef);
        m.side = THREE.DoubleSide;
        m.needsUpdate = true;
      }
    }
  });
}
function collectMeshes(obj) { const arr = []; obj?.traverse?.(o => { if (o?.isMesh && o.geometry) arr.push(o); }); return arr; }
function makeMissingMarker(label = '') {
  const g = new THREE.Group();
  g.name = 'missing:' + basename(label);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), new THREE.MeshStandardMaterial({ color: 0xff5b7f, roughness: 0.55 }));
  g.add(mesh);
  return g;
}

function sanitizeLoadedColladaObject(obj, fallbackMaterial = null) {
  // Remove camera/light junk from CAD DAE files and make sure failed texture
  // loads do not leave the model as an unreadable black silhouette.
  obj?.traverse?.((o) => {
    if (o.isCamera || o.isLight) {
      try { o.parent?.remove?.(o); } catch (_) {}
      return;
    }
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (!o.material) o.material = fallbackMaterial ? fallbackMaterial.clone() : createDefaultMaterial();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      m.side = THREE.DoubleSide;
      if (m.map && !m.map.image && !m.map.source?.data) {
        // Keep material but do not let Three continuously try to upload an
        // undefined image.
        try { m.map.needsUpdate = false; } catch (_) {}
      }
      const c = m.color;
      if (c && !m.map && c.r < 0.025 && c.g < 0.025 && c.b < 0.025 && fallbackMaterial?.color) {
        c.copy(fallbackMaterial.color);
      }
      m.needsUpdate = true;
    }
  });
}

function extCompatible(recordExt, desiredExt) {
  if (!desiredExt) return true;
  if (!recordExt) return true;
  return String(recordExt).toLowerCase() === String(desiredExt).toLowerCase();
}
function isProbablyColladaTextUrl(url) {
  try {
    const s = String(url || '');
    if (!/^data:/i.test(s)) return true;
    const comma = s.indexOf(',');
    if (comma < 0) return false;
    let payload = s.slice(comma + 1);
    if (/;base64/i.test(s.slice(0, comma))) {
      try { payload = atob(payload.replace(/\s+/g, '')).slice(0, 256); } catch (_) { return false; }
    } else {
      try { payload = decodeURIComponent(payload).slice(0, 256); } catch (_) { payload = payload.slice(0, 256); }
    }
    return /^\s*</.test(payload);
  } catch (_) { return true; }
}

class URDFPlusAssetResolver {
  constructor(assetDB = {}) {
    this.byKey = new Map();
    this.byOriginal = new Map();
    this.objectUrls = [];
    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.setURLModifier((url) => this.resolve(url) || url);
    for (const [rawKey, rawVal] of Object.entries(assetDB || {})) this.add(rawKey, rawVal);
  }
  add(key, val) {
    if (!key || val == null) return;
    const data = dataURLFromValue(key, val);
    if (!data) return;
    const rec = { data, ext: extname(key), key: String(key || '') };
    for (const k of variantsFor(key)) {
      // Keep the first exact normalized key, but never let a .jpg stem overwrite a .dae stem.
      // The lookup checks extension compatibility, so basename/stem aliases are safe now.
      if (!this.byKey.has(k)) this.byKey.set(k, rec);
    }
    this.byOriginal.set(normKey(key), rec);
  }
  _lookup(path, desiredExt = '', opts = {}) {
    if (!path) return '';
    desiredExt = desiredExt || extname(path);
    const strict = opts.strict !== false;

    // 1) Exact normalized/suffix variants, with extension compatibility.
    for (const k of variantsFor(path)) {
      const rec = this.byKey.get(k);
      if (rec && extCompatible(rec.ext, desiredExt)) return rec.data;
    }

    // 2) Exact basename match only, still extension-safe.
    const base = basename(path).toLowerCase();
    if (base) {
      for (const [k, rec] of this.byKey.entries()) {
        if (basename(k).toLowerCase() === base && extCompatible(rec.ext, desiredExt)) return rec.data;
      }
    }

    // 3) Optional fuzzy match. Only use it for textures or extensionless names.
    // Never fuzzy-match CAD meshes across stems: that was the cause of duplicated/wrong DAE.
    const isImage = /\.(png|jpe?g|webp|bmp|gif|tga)$/i.test(desiredExt || base);
    if (!strict && (isImage || !desiredExt) && base) {
      const baseStem = base.replace(/\.[^.]+$/, '');
      const baseNorm = baseStem.replace(/[\s_\-]+/g, '');
      for (const [k, rec] of this.byKey.entries()) {
        if (!extCompatible(rec.ext, desiredExt)) continue;
        const b = basename(k).toLowerCase();
        const stem = b.replace(/\.[^.]+$/, '');
        const n = stem.replace(/[\s_\-]+/g, '');
        if (b === base || stem === baseStem || n === baseNorm) return rec.data;
      }
    }
    return '';
  }
  resolve(path) {
    if (!path) return '';
    const raw = String(path);

    // ColladaLoader resolves relative textures against data:model/vnd.collada+xml
    // as fake URLs such as data:model/base.jpg. They are not real data URLs.
    // Redirect those to the uploaded ZIP/assetDB, extension-safely.
    if (/^data:model\//i.test(raw)) {
      const tail = raw.replace(/^data:model\//i, '').replace(/[?#].*$/, '');
      const ext = extname(tail);
      return this._lookup(tail, ext, { strict: false }) || this._lookup(basename(tail), ext, { strict: false }) || '';
    }

    // Real data URLs are already usable.
    if (/^data:[^,]+,/i.test(raw)) return raw;

    // Blob/http URLs are usable, but if a loader produced a weird URL containing
    // a recognizable asset basename, allow a safe texture-only redirect.
    if (/^blob:/i.test(raw) || /^https?:\/\//i.test(raw)) {
      const base = basename(raw);
      const ext = extname(base);
      const byBase = this._lookup(base, ext, { strict: false });
      return byBase || raw;
    }

    const ext = extname(raw);
    return this._lookup(raw, ext, { strict: true });
  }
  debugLookup(path) {
    const ext = extname(path);
    const url = this.resolve(path);
    return { path, ext, resolved: !!url, urlPrefix: String(url || '').slice(0, 80) };
  }
  dispose() {
    for (const u of this.objectUrls) { try { URL.revokeObjectURL(u); } catch (_) {} }
    this.objectUrls.length = 0;
  }
}

const CLASSIC_LOADER_CDNS = {
  ColladaLoader: [
    'https://unpkg.com/three@0.132.2/examples/js/loaders/ColladaLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/ColladaLoader.js'
  ],
  STLLoader: [
    'https://unpkg.com/three@0.132.2/examples/js/loaders/STLLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/STLLoader.js'
  ],
  OBJLoader: [
    'https://unpkg.com/three@0.132.2/examples/js/loaders/OBJLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/OBJLoader.js'
  ]
};

function loadClassicScriptOnce(src, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts || []).find(s => s.src === src && s.dataset.automindLoaded === '1');
    if (existing) return resolve(true);
    const script = document.createElement('script');
    let done = false;
    const finish = (ok, err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (ok) { script.dataset.automindLoaded = '1'; resolve(true); }
      else { try { script.remove(); } catch (_) {} reject(err || new Error('Failed to load ' + src)); }
    };
    const timer = setTimeout(() => finish(false, new Error('Timeout loading ' + src)), timeoutMs);
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => finish(true);
    script.onerror = () => finish(false, new Error('Failed to load ' + src));
    document.head.appendChild(script);
  });
}

async function loadClassicGlobal(globalName, urls) {
  if (THREE && THREE[globalName]) return true;
  const errors = [];
  for (const src of urls || []) {
    try {
      await loadClassicScriptOnce(src);
      if (THREE && THREE[globalName]) return true;
      errors.push(src + ' loaded, but THREE.' + globalName + ' was not defined');
    } catch (e) {
      errors.push((e && e.message) || String(e));
    }
  }
  throw new Error('Could not load THREE.' + globalName + ' from CDN candidates:\n' + errors.join('\n'));
}

async function ensureClassicLoaderScripts() {
  assertThree();
  await loadClassicGlobal('ColladaLoader', CLASSIC_LOADER_CDNS.ColladaLoader);
  await loadClassicGlobal('STLLoader', CLASSIC_LOADER_CDNS.STLLoader);
  await loadClassicGlobal('OBJLoader', CLASSIC_LOADER_CDNS.OBJLoader);
}
function loaderLoad(loader, url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

function parseMaterialColor(visualNode, materialMap) {
  const matNode = childByLocalName(visualNode, 'material');
  if (!matNode) return null;
  const colorNode = childByLocalName(matNode, 'color');
  const colorStr = colorNode?.getAttribute?.('rgba');
  if (colorStr) return parseVec(colorStr, [0.82, 0.86, 0.88, 1]);
  const name = matNode.getAttribute?.('name');
  return name && materialMap.get(name) ? materialMap.get(name) : null;
}
function materialFromColor(rgba) {
  if (!rgba) return createDefaultMaterial();
  const mat = createDefaultMaterial(new THREE.Color(rgba[0] ?? 0.82, rgba[1] ?? 0.86, rgba[2] ?? 0.88));
  const a = Number(rgba[3]);
  if (Number.isFinite(a) && a < 1) { mat.transparent = true; mat.opacity = Math.max(0, Math.min(1, a)); mat.depthWrite = false; }
  return mat;
}

async function loadMeshObject(filename, resolver, fallbackMaterial) {
  const ext = extname(filename);
  const url = resolver.resolve(filename);
  if (!url) return makeMissingMarker(filename);
  await ensureClassicLoaderScripts();
  try {
    if (ext === '.dae') {
      const loader = new THREE.ColladaLoader(resolver.loadingManager);
      // URDF uses the same coordinate frame for joint origins and mesh visual
      // origins. Some legacy Three.js ColladaLoader builds auto-convert DAE
      // Z_UP/Y_UP per-file, which rotates each mesh independently while the URDF
      // kinematic tree stays unchanged. That visually "explodes" robots such as
      // ANYmal. Keep the DAE coordinates as exported; the viewer/camera handles
      // display orientation globally.
      try { if (loader.options) loader.options.convertUpAxis = false; } catch (_) {}
      if (!isProbablyColladaTextUrl(url)) {
        console.warn('[URDFPlusCore] skipped invalid Collada payload, not XML:', filename, resolver.debugLookup?.(filename));
        return makeMissingMarker(filename);
      }
      const collada = await loaderLoad(loader, url);
      const obj = collada && (collada.scene || collada);
      if (!obj || typeof obj.traverse !== 'function') {
        console.warn('[URDFPlusCore] ColladaLoader returned no scene:', filename, resolver.debugLookup?.(filename));
        return makeMissingMarker(filename);
      }
      sanitizeLoadedColladaObject(obj, fallbackMaterial);
      return obj;
    }
    if (ext === '.stl') {
      const loader = new THREE.STLLoader(resolver.loadingManager);
      const geom = await loaderLoad(loader, url);
      if (!geom.attributes.normal) geom.computeVertexNormals();
      const mesh = new THREE.Mesh(geom, fallbackMaterial ? fallbackMaterial.clone() : createDefaultMaterial());
      const g = new THREE.Group(); g.name = stripExt(filename); g.add(mesh); return g;
    }
    if (ext === '.obj') {
      const loader = new THREE.OBJLoader(resolver.loadingManager);
      const obj = await loaderLoad(loader, url);
      obj.traverse(o => { if (o.isMesh && (!o.material || !o.material.color)) o.material = fallbackMaterial ? fallbackMaterial.clone() : createDefaultMaterial(); });
      return obj;
    }
    return makeMissingMarker(filename);
  } catch (e) {
    console.warn('[URDFPlusCore] mesh load failed', filename, e);
    return makeMissingMarker(filename);
  }
}

class URDFPlusModel extends THREE.Group {
  constructor(name = 'URDFPlusModel') {
    super();
    this.name = name;
    this.links = {};
    this.joints = {};
    this.loopJoints = [];
    this.couplings = [];
    this.implicitCandidates = [];
    this.assetToMeshes = new Map();
    this._linkInfo = {};
    this.parentJointByLink = new Map();
    this.manipulableJointByLink = new Map();
    this.isDraggingJoint = false;
    this.activeJointForDrag = null;
    this.userData.__isURDFPlusModel = true;
    this.userData.__model = this;
  }
  applyPose() { this.updateCurrentMatrices(); }
  updateCurrentMatrices() {
    this.updateMatrixWorld(true);
    for (const info of Object.values(this._linkInfo || {})) info.currentMatrix.copy(info.group.matrixWorld);
  }
  setJointValue(nameOrJoint, value) {
    const joint = typeof nameOrJoint === 'string' ? this.joints[nameOrJoint] : nameOrJoint;
    if (!joint || !joint.movable) return;
    let v = Number(value); if (!Number.isFinite(v)) v = 0;
    const lo = Number.isFinite(joint.lower) ? joint.lower : (/prismatic/i.test(joint.jointType) ? -1 : -Math.PI * 2);
    const hi = Number.isFinite(joint.upper) ? joint.upper : (/prismatic/i.test(joint.jointType) ? 1 : Math.PI * 2);
    v = Math.max(lo, Math.min(hi, v));
    this._setJointScalar(joint, v, true);
    this.applyPose();
  }
  _setJointScalar(joint, value, applyCouplings = true) {
    joint.value = value;
    if (/prismatic/i.test(joint.jointType)) joint.position = value;
    else joint.angle = value;
    applyJointMotion(joint);
    if (applyCouplings && !this.__applyingCouplings) {
      this.__applyingCouplings = true;
      try {
        for (const c of this.couplings || []) {
          if (!c.driver || c.driver !== joint.name || !c.dependent) continue;
          const dep = this.joints[c.dependent];
          if (!dep || !dep.movable) continue;
          this._setJointScalar(dep, (Number(c.multiplier) || 1) * value + (Number(c.offset) || 0), false);
        }
      } finally { this.__applyingCouplings = false; }
    }
  }
  getManipulableJointForLinkName(linkName) {
    if (this.manipulableJointByLink.has(linkName)) return this.manipulableJointByLink.get(linkName);
    let cur = linkName;
    while (cur) {
      const j = this.parentJointByLink.get(cur);
      if (!j) break;
      if (j.movable) { this.manipulableJointByLink.set(linkName, j); return j; }
      cur = j.parent;
    }
    return null;
  }
  getJointWorldPivot(joint) {
    const j = typeof joint === 'string' ? this.joints[joint] : joint;
    const p = new THREE.Vector3();
    j?.originGroup?.getWorldPosition?.(p);
    return p;
  }
  getJointWorldAxis(joint) {
    const j = typeof joint === 'string' ? this.joints[joint] : joint;
    const q = new THREE.Quaternion();
    j?.originGroup?.getWorldQuaternion?.(q);
    const a = (j?.axis || new THREE.Vector3(1,0,0)).clone().normalize().applyQuaternion(q).normalize();
    return a.lengthSq() > EPS ? a : new THREE.Vector3(1,0,0);
  }
  beginInteractiveDrag(joint = null) { this.isDraggingJoint = true; this.activeJointForDrag = joint || null; }
  endInteractiveDrag() { this.isDraggingJoint = false; this.activeJointForDrag = null; this.applyPose(); }
}

function isMovableType(type) { return /revolute|continuous|prismatic|hinge|slider/i.test(String(type || '')); }
function applyJointMotion(joint) {
  const g = joint.motionGroup;
  if (!g) return;
  g.position.set(0,0,0); g.quaternion.identity(); g.rotation.set(0,0,0); g.scale.set(1,1,1);
  const axis = joint.axis || new THREE.Vector3(1,0,0);
  if (/prismatic/i.test(joint.jointType)) g.position.copy(axis.clone().multiplyScalar(Number(joint.position) || 0));
  else if (joint.movable) g.quaternion.setFromAxisAngle(axis.clone().normalize(), Number(joint.angle) || 0);
  g.updateMatrix();
}
function parseJoint(jointNode, model) {
  const name = jointNode.getAttribute('name') || `joint_${Object.keys(model.joints).length}`;
  const type = jointNode.getAttribute('type') || attrAny(jointNode, ['automind:motion_type','motion_type'], 'fixed') || 'fixed';
  const parent = childByLocalName(jointNode, 'parent')?.getAttribute('link') || '';
  const child = childByLocalName(jointNode, 'child')?.getAttribute('link') || '';
  const axisNums = parseVec(childByLocalName(jointNode, 'axis')?.getAttribute('xyz'), [1,0,0]);
  const axis = new THREE.Vector3(axisNums[0] || 0, axisNums[1] || 0, axisNums[2] || 0);
  if (axis.lengthSq() < EPS) axis.set(1,0,0);
  axis.normalize();
  const limit = childByLocalName(jointNode, 'limit');
  const lower = type === 'continuous' ? -Math.PI * 2 : parseNum(limit?.getAttribute('lower'), isMovableType(type) ? (/prismatic/i.test(type) ? -1 : -Math.PI) : 0);
  const upper = type === 'continuous' ? Math.PI * 2 : parseNum(limit?.getAttribute('upper'), isMovableType(type) ? (/prismatic/i.test(type) ? 1 : Math.PI) : 0);
  const j = {
    name, parent, child, body0: parent, body1: child,
    jointType: type, type, schema: /prismatic/i.test(type) ? 'PrismaticJoint' : (isMovableType(type) ? 'RevoluteJoint' : 'FixedJoint'),
    role: attrAny(jointNode, ['role','automind:jointRole','jointRole'], 'tree'),
    tree: true, movable: isMovableType(type), exportedMovable: isMovableType(type),
    independent: boolAttr(attrAny(jointNode, ['independent','automind:independent'], ''), true),
    axis, axisJoint: [axis.x, axis.y, axis.z], axisToken: 'X',
    origin: parseOrigin(childByLocalName(jointNode, 'origin')),
    localPos0: [0,0,0], localPos1: [0,0,0],
    localRot0: new THREE.Quaternion(), localRot1: new THREE.Quaternion(),
    lower, upper, lowerRad: lower, upperRad: upper,
    angle: 0, position: 0, value: 0,
    userData: { __model: model }
  };
  j.localPos0 = j.origin.xyz.slice();
  j._localFrame0 = originMatrix(j.origin);
  j.setJointValue = (v) => model.setJointValue(j, v);
  return j;
}
function parseCouplings(robotNode) {
  const nodes = Array.from(robotNode?.children || []).filter(n => localName(n) === 'coupling');
  return nodes.map(n => {
    const driver = attrAny(n, ['joint','driver','master','source','independent','joint1','from'], '');
    const dependent = attrAny(n, ['dependent','slave','target','follower','joint2','to'], '');
    return {
      driver, dependent,
      multiplier: parseNum(attrAny(n, ['multiplier','ratio','scale','factor'], '1'), 1),
      offset: parseNum(attrAny(n, ['offset','bias'], '0'), 0)
    };
  }).filter(c => c.driver && c.dependent);
}
function parseLoopNodes(robotNode, model) {
  const out = [];
  const nodes = Array.from(robotNode?.children || []).filter(n => localName(n) === 'loop');
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const a = attrAny(n, ['parent','link_a','linkA','body0','from','link1'], '');
    const b = attrAny(n, ['child','link_b','linkB','body1','to','link2'], '');
    if (!a || !b || !model.links[a] || !model.links[b]) continue;
    out.push({ name: attrAny(n, ['name'], `loop_${i}`), role: 'loop', tree: false, body0: a, body1: b, localPos0: [0,0,0], localPos1: [0,0,0] });
  }
  return out;
}

function parseGlobalMaterials(robotNode) {
  const map = new Map();
  for (const m of Array.from(robotNode?.children || []).filter(n => localName(n) === 'material')) {
    const name = m.getAttribute('name');
    const colorNode = childByLocalName(m, 'color');
    if (name && colorNode?.getAttribute('rgba')) map.set(name, parseVec(colorNode.getAttribute('rgba'), [0.82,0.86,0.88,1]));
  }
  return map;
}
async function addVisualsToLink(linkNode, linkGroup, model, resolver, materialMap) {
  const linkName = linkGroup.userData.__linkName || linkGroup.name;
  const visuals = childrenByLocalName(linkNode, 'visual');
  for (const visual of visuals) {
    const vg = new THREE.Group();
    vg.name = 'visual:' + linkName;
    applyOrigin(vg, parseOrigin(childByLocalName(visual, 'origin')));
    const geom = childByLocalName(visual, 'geometry');
    const rgba = parseMaterialColor(visual, materialMap);
    const mat = materialFromColor(rgba);
    let obj = null;
    const mesh = geom ? childByLocalName(geom, 'mesh') : null;
    if (mesh) {
      const filename = mesh.getAttribute('filename') || mesh.getAttribute('url') || '';
      obj = await loadMeshObject(filename, resolver, mat);
      const sc = parseVec(mesh.getAttribute('scale'), [1,1,1]);
      obj.scale.multiply(new THREE.Vector3(sc[0] || 1, sc[1] || 1, sc[2] || 1));
    } else if (geom && childByLocalName(geom, 'box')) {
      const sz = parseVec(childByLocalName(geom, 'box').getAttribute('size'), [0.1,0.1,0.1]);
      obj = new THREE.Mesh(new THREE.BoxGeometry(sz[0], sz[1], sz[2]), mat);
    } else if (geom && childByLocalName(geom, 'cylinder')) {
      const c = childByLocalName(geom, 'cylinder');
      const radius = parseNum(c.getAttribute('radius'), 0.05), length = parseNum(c.getAttribute('length'), 0.1);
      obj = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), mat);
      obj.rotation.x = Math.PI / 2;
    } else if (geom && childByLocalName(geom, 'sphere')) {
      const r = parseNum(childByLocalName(geom, 'sphere').getAttribute('radius'), 0.05);
      obj = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), mat);
    }
    if (!obj) continue;
    setObjectUserDataRecursive(obj, linkName);
    vg.add(obj);
    linkGroup.add(vg);
    const arr = model.assetToMeshes.get(linkName) || [];
    arr.push(...collectMeshes(vg));
    model.assetToMeshes.set(linkName, arr);
  }
  if (!model.assetToMeshes.get(linkName)?.length) {
    const marker = makeMissingMarker(linkName);
    setObjectUserDataRecursive(marker, linkName);
    linkGroup.add(marker);
    model.assetToMeshes.set(linkName, collectMeshes(marker));
  }
}

async function getJSZipSafe() {
  if (window.JSZip) return window.JSZip;
  const esmCandidates = [
    'https://esm.sh/jszip@3.10.1',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm'
  ];
  for (const src of esmCandidates) {
    try {
      const mod = await import(src);
      const z = mod.default || mod.JSZip || window.JSZip;
      if (z) return z;
    } catch (_) {}
  }
  const classicCandidates = [
    'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
  ];
  const errors = [];
  for (const src of classicCandidates) {
    try {
      await loadClassicScriptOnce(src);
      if (window.JSZip) return window.JSZip;
      errors.push(src + ' loaded, but window.JSZip was not defined');
    } catch (e) {
      errors.push((e && e.message) || String(e));
    }
  }
  throw new Error('JSZip is not available from CDN candidates:\n' + errors.join('\n'));
}

async function zipBase64ToAssetDB(base64) {
  if (!base64) return {};
  let JSZip = await getJSZipSafe();
  const clean = String(base64).replace(/^data:[^,]+,/i, '').replace(/\s+/g, '');
  const bin = atob(clean);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const zip = await JSZip.loadAsync(arr.buffer);
  const out = {};
  for (const zf of Object.values(zip.files || {})) {
    if (zf.dir) continue;
    const path = zf.name.replace(/^\/+/, '');
    if (TEXT_EXT.test(path)) out[path] = await zf.async('string');
    else {
      const bytes = await zf.async('uint8array');
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      out[path] = btoa(s);
    }
  }
  return out;
}

function findURDFText(opts, assetDB) {
  const direct = opts.urdfContent || opts.urdfText || opts.robotXml || opts.xmlText || '';
  if (direct && /<robot\b/i.test(String(direct))) return String(direct);
  const wanted = opts.urdfPath || opts.urdfFilename || '';
  if (wanted) {
    for (const k of variantsFor(wanted)) {
      const v = assetDB[k] ?? assetDB[Object.keys(assetDB).find(x => normKey(x) === k)];
      if (v && /<robot\b/i.test(String(v))) return String(v);
    }
  }
  const entries = Object.entries(assetDB || {});
  const urdfs = entries.filter(([k, v]) => /\.(urdf|xml)$/i.test(k) && /<robot\b/i.test(String(v || '')));
  urdfs.sort((a, b) => {
    const sa = /standard_tree_backup/i.test(a[0]) ? 1 : 0;
    const sb = /standard_tree_backup/i.test(b[0]) ? 1 : 0;
    return sa - sb || String(a[0]).length - String(b[0]).length;
  });
  return urdfs[0]?.[1] || '';
}

async function buildURDFAssetDBFromOptions(opts = {}) {
  const assetDB = { ...(opts.assetDB || {}), ...(opts.meshDB || {}), ...(opts.textureDB || {}), ...(opts.assets || {}), ...(opts.filesDB || {}) };
  const zip = opts.URDF_Zip || opts.urdfZip || opts.urdfZipBase64 || opts.zipBase64 || opts.zipDataUrl || '';
  if (zip && !Object.keys(assetDB).length) Object.assign(assetDB, await zipBase64ToAssetDB(zip));
  const urdf = opts.urdfContent || opts.urdfText || opts.robotXml || opts.xmlText;
  if (urdf) assetDB[opts.urdfPath || opts.urdfFilename || 'URDF_Export/robot.urdf'] = String(urdf);
  return assetDB;
}

async function loadURDFPlusModel(opts = {}) {
  assertThree();
  await ensureClassicLoaderScripts();
  const assetDBRaw = await buildURDFAssetDBFromOptions(opts);
  const urdfText = findURDFText(opts, assetDBRaw);
  if (!urdfText) throw new Error('No URDF/XML robot text was provided. Pass urdfContent or assetDB/URDF_Zip containing a .urdf/.xml file.');
  const text = repairMissingUrdfPlusNamespace(urdfText);
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  const err = xml.querySelector('parsererror');
  if (err) throw new Error('Invalid URDF/XML: ' + err.textContent.slice(0, 300));
  const robotNode = xml.querySelector('robot');
  if (!robotNode) throw new Error('No <robot> root found in URDF/XML.');

  const resolver = new URDFPlusAssetResolver(assetDBRaw);
  const model = new URDFPlusModel(robotNode.getAttribute('name') || 'AutoMindURDFPlus');
  model.assetResolver = resolver;
  const materialMap = parseGlobalMaterials(robotNode);

  const linkNodes = Array.from(robotNode.children).filter(n => localName(n) === 'link');
  const linkNodeByName = new Map();
  for (const linkNode of linkNodes) {
    const name = linkNode.getAttribute('name');
    if (!name) continue;
    linkNodeByName.set(name, linkNode);
    const g = new THREE.Group();
    g.name = name;
    g.userData.__linkName = name;
    g.userData.__assetKey = name;
    g.userData.__model = model;
    model.links[name] = g;
    model._linkInfo[name] = { name, group: g, parentJoint: null, children: [], currentMatrix: new THREE.Matrix4() };
  }

  await Promise.all(Array.from(linkNodeByName.entries()).map(([name, node]) => addVisualsToLink(node, model.links[name], model, resolver, materialMap)));

  const childLinks = new Set();
  const joints = Array.from(robotNode.children).filter(n => localName(n) === 'joint').map(n => parseJoint(n, model)).filter(j => j.parent && j.child && model.links[j.parent] && model.links[j.child]);
  for (const joint of joints) {
    model.joints[joint.name] = joint;
    if (childLinks.has(joint.child)) {
      joint.role = 'loop'; joint.tree = false; joint.movable = false;
      model.loopJoints.push(joint);
      continue;
    }
    const parentGroup = model.links[joint.parent];
    const childGroup = model.links[joint.child];
    const originGroup = new THREE.Group();
    originGroup.name = 'joint_origin:' + joint.name;
    applyOrigin(originGroup, joint.origin);
    const motionGroup = new THREE.Group();
    motionGroup.name = 'joint_motion:' + joint.name;
    originGroup.add(motionGroup);
    motionGroup.add(childGroup);
    parentGroup.add(originGroup);
    originGroup.userData.__joint = joint;
    motionGroup.userData.__joint = joint;
    childGroup.userData.__joint = joint;
    joint.originGroup = originGroup;
    joint.motionGroup = motionGroup;
    model.parentJointByLink.set(joint.child, joint);
    model._linkInfo[joint.child].parentJoint = joint;
    model._linkInfo[joint.parent]?.children?.push(model._linkInfo[joint.child]);
    childLinks.add(joint.child);
    applyJointMotion(joint);
  }
  for (const [name, group] of Object.entries(model.links)) if (!childLinks.has(name)) model.add(group);

  model.couplings = parseCouplings(robotNode);
  model.loopJoints.push(...parseLoopNodes(robotNode, model));
  model.updateCurrentMatrices();
  return model;
}


return { loadURDFPlusModel: (typeof loadURDFPlusModel !== "undefined" ? loadURDFPlusModel : undefined), buildURDFAssetDBFromOptions: (typeof buildURDFAssetDBFromOptions !== "undefined" ? buildURDFAssetDBFromOptions : undefined) };
})();
const loadURDFPlusModel = __mod_core_URDFPlusCore_js.loadURDFPlusModel;
const buildURDFAssetDBFromOptions = __mod_core_URDFPlusCore_js.buildURDFAssetDBFromOptions;

// ===== bundled main entry =====
// /URDF_Viewer/urdfplus_viewer_main.js
// AutoMind URDF+ viewer main entrypoint. Direct modular viewer, no iframe, no standalone HTML.
// Same modular architecture as AutoMindCloudExperimental viewer:
// Theme + ViewerCore + AssetDB + SelectionAndDrag + ToolsDock + ComponentsPanel.


export let Base64Images = [];

function debugLog(...args) {
  try { console.log('[URDFPLUS_DEBUG]', ...args); } catch (_) {}
  try { window.URDFPLUS_DEBUG_LOGS = window.URDFPLUS_DEBUG_LOGS || []; window.URDFPLUS_DEBUG_LOGS.push(args); } catch (_) {}
}

function splitName(key) {
  const clean = String(key || '').split('?')[0].split('#')[0];
  const base = clean.split('/').pop();
  const dot = base.lastIndexOf('.');
  return { base: dot >= 0 ? base.slice(0, dot) : base, ext: dot >= 0 ? base.slice(dot + 1).toLowerCase() : '' };
}
function listAssets(assetToMeshes) {
  const items = [];
  assetToMeshes.forEach((meshes, assetKey) => {
    if (!meshes || !meshes.length) return;
    const { base, ext } = splitName(assetKey);
    items.push({ assetKey, base, ext: ext || 'usd-link', count: meshes.length });
  });
  items.sort((a, b) => a.base.localeCompare(b.base, undefined, { numeric: true, sensitivity: 'base' }));
  return items;
}
function materialList(mat) {
  if (!mat) return [];
  return Array.isArray(mat) ? mat.filter(Boolean) : [mat];
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function objectBox(object) {
  const box = new THREE.Box3().setFromObject(object);
  return box.isEmpty() ? null : box;
}
function distanceToFitSphere(cam, radius, pad = 3) {
  const r = Math.max(1e-6, radius) * pad;
  if (cam.isOrthographicCamera) return THREE.MathUtils.clamp(r * 2.0, 0.35, 1e4);
  const vFov = THREE.MathUtils.degToRad(cam.fov || 45);
  const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * (cam.aspect || 1));
  const dV = r / Math.tan(vFov * 0.5);
  const dH = r / Math.tan(hFov * 0.5);
  return Math.max(dV, dH);
}
function updateCameraPlanesForBox(cam, size) {
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  cam.near = cam.isOrthographicCamera ? -Math.max(maxDim * 100, 1000) : Math.max(maxDim / 1000, 0.001);
  cam.far = cam.isOrthographicCamera ? Math.max(maxDim * 100, 1000) : Math.max(maxDim * 5000, 5000);
  if (cam.isOrthographicCamera) {
    const aspect = Math.max(1e-6, cam.right && cam.top ? Math.abs((cam.right - cam.left) / (cam.top - cam.bottom)) : (cam.aspect || 1));
    const halfH = Math.max(maxDim * 1.75, 1e-6);
    cam.left = -halfH * aspect;
    cam.right = halfH * aspect;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.zoom = 1;
  }
  cam.updateProjectionMatrix();
}
let cameraTweenToken = 0;
let cameraTweenRAF = 0;

function tweenCamera(core, endPos, endTarget, duration = 750) {
  const cam = core.camera, ctrl = core.controls;
  // Bulletproof rule: only one camera tween can own controls. A new action
  // cancels the previous frame and immediately returns OrbitControls to a sane state
  // before taking ownership again.
  cameraTweenToken++;
  if (cameraTweenRAF) { try { cancelAnimationFrame(cameraTweenRAF); } catch (_) {} cameraTweenRAF = 0; }
  try { ctrl.enabled = true; } catch (_) {}
  const token = cameraTweenToken;
  const startPos = cam.position.clone();
  const startTarget = ctrl.target.clone();
  ctrl.enabled = false;
  cam.up.set(0, 1, 0);
  if (!duration || duration <= 0) {
    cam.position.copy(endPos);
    ctrl.target.copy(endTarget);
    ctrl.update();
    ctrl.enabled = true;
    return true;
  }
  const t0 = performance.now();
  function step(now) {
    if (token !== cameraTweenToken) return;
    const u = Math.min(1, (now - t0) / duration);
    const k = easeInOutCubic(u);
    cam.position.lerpVectors(startPos, endPos, k);
    ctrl.target.lerpVectors(startTarget, endTarget, k);
    ctrl.update();
    try { core.renderer?.render?.(core.scene, cam); } catch (_) {}
    if (u < 1) cameraTweenRAF = requestAnimationFrame(step);
    else if (token === cameraTweenToken) { cameraTweenRAF = 0; ctrl.enabled = true; }
  }
  cameraTweenRAF = requestAnimationFrame(step);
  return true;
}
function viewIso(core, object = core.robot, duration = 750) {
  // Same final camera pose as Viewer Tools > Iso: az=45°, el≈36°, fit radius pad=3.
  if (!core || !object) return false;
  const box = objectBox(object);
  if (!box) return false;
  const target = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = size.length() * 0.5 * (1 / Math.sqrt(3));
  const az = Math.PI * 0.25;
  const el = Math.PI * 0.20;
  const cam = core.camera;
  updateCameraPlanesForBox(cam, size);
  let fitR = distanceToFitSphere(cam, radius, 3);
  fitR = THREE.MathUtils.clamp(fitR, 0.35, 1e4);
  const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
  return tweenCamera(core, target.clone().add(dir.multiplyScalar(fitR)), target, duration);
}
let visibilityTweenToken = 0;
let visibilityRAF = 0;
let visibilityActionSerial = 0;

function collectRobotMeshes(robot) {
  const meshes = [];
  robot?.traverse?.(o => {
    if (o?.isMesh && o.geometry && !o.userData?.__isHoverOverlay) meshes.push(o);
  });
  return meshes;
}

function collectMeshesInObject(object) {
  const meshes = [];
  object?.traverse?.(o => {
    if (o?.isMesh && o.geometry && !o.userData?.__isHoverOverlay) meshes.push(o);
  });
  return meshes;
}

function ensureMaterialUserData(mat) {
  if (!mat.userData) mat.userData = {};
  return mat.userData;
}

function rememberMaterialBaseState(mat) {
  if (!mat) return;
  const ud = ensureMaterialUserData(mat);
  const op = Number.isFinite(mat.opacity) ? Math.max(0, mat.opacity) : 1;
  // The first stable material state is the canonical restoration state.
  // Never overwrite it with a mid-fade value from rapid panel clicks.
  if (!Number.isFinite(ud.__automindBaseOpacity)) ud.__automindBaseOpacity = op > 0 ? op : 1;
  if (typeof ud.__automindBaseTransparent !== 'boolean') ud.__automindBaseTransparent = !!mat.transparent;
  if (typeof ud.__automindBaseDepthWrite !== 'boolean') ud.__automindBaseDepthWrite = mat.depthWrite !== false;
  if (typeof ud.__automindBaseDepthTest !== 'boolean') ud.__automindBaseDepthTest = mat.depthTest !== false;
}

function cloneMaterialForVisibility(mat) {
  if (!mat || typeof mat.clone !== 'function') return mat;
  const cloned = mat.clone();
  cloned.userData = { ...(mat.userData || {}) };
  const ud = ensureMaterialUserData(cloned);
  const op = Number.isFinite(cloned.opacity) ? Math.max(0, cloned.opacity) : 1;
  if (!Number.isFinite(ud.__automindBaseOpacity)) ud.__automindBaseOpacity = op > 0 ? op : 1;
  if (typeof ud.__automindBaseTransparent !== 'boolean') ud.__automindBaseTransparent = !!cloned.transparent;
  if (typeof ud.__automindBaseDepthWrite !== 'boolean') ud.__automindBaseDepthWrite = cloned.depthWrite !== false;
  if (typeof ud.__automindBaseDepthTest !== 'boolean') ud.__automindBaseDepthTest = cloned.depthTest !== false;
  return cloned;
}

function ensureUniqueVisibilityMaterials(mesh) {
  if (!mesh || !mesh.material) return [];
  if (!mesh.userData.__automindVisibilityMaterialUnique) {
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(cloneMaterialForVisibility);
    else mesh.material = cloneMaterialForVisibility(mesh.material);
    mesh.userData.__automindVisibilityMaterialUnique = true;
  }
  const mats = materialList(mesh.material);
  for (const mat of mats) rememberMaterialBaseState(mat);
  return mats;
}

function baseOpacityFor(mat) {
  const ud = ensureMaterialUserData(mat);
  const base = Number.isFinite(ud.__automindBaseOpacity) ? ud.__automindBaseOpacity : 1;
  return Math.max(0, base);
}

function currentOpacityFor(mat) {
  return Number.isFinite(mat?.opacity) ? Math.max(0, mat.opacity) : 1;
}

function currentRenderModeFor(core) {
  const mode = String(core?.__currentRenderMode || 'Solid');
  if (/^x[- ]?ray$/i.test(mode)) return 'X-Ray';
  if (/^ghost$/i.test(mode)) return 'Ghost';
  if (/^wireframe$/i.test(mode)) return 'Wireframe';
  return 'Solid';
}

function renderModeVisibleOpacity(core, mat) {
  const mode = currentRenderModeFor(core);
  if (mode === 'X-Ray') return 0.35;
  if (mode === 'Ghost') return 0.70;
  return baseOpacityFor(mat);
}

function applyRenderModeMaterialState(core, mat) {
  if (!mat) return;
  const mode = currentRenderModeFor(core);
  const opacity = renderModeVisibleOpacity(core, mat);
  mat.wireframe = (mode === 'Wireframe');
  if (mode === 'X-Ray' || mode === 'Ghost') {
    mat.transparent = true;
    mat.opacity = opacity;
    mat.depthWrite = false;
    mat.depthTest = true;
  } else {
    const ud = ensureMaterialUserData(mat);
    mat.transparent = (typeof ud.__automindBaseTransparent === 'boolean') ? ud.__automindBaseTransparent : (opacity < 1);
    mat.opacity = opacity;
    mat.depthWrite = (typeof ud.__automindBaseDepthWrite === 'boolean') ? ud.__automindBaseDepthWrite : true;
    mat.depthTest = (typeof ud.__automindBaseDepthTest === 'boolean') ? ud.__automindBaseDepthTest : true;
  }
  mat.needsUpdate = true;
}

function cancelVisibilityFrame() {
  if (visibilityRAF) {
    try { cancelAnimationFrame(visibilityRAF); } catch (_) {}
    visibilityRAF = 0;
  }
}

function finalizeVisibilityStates(core, states, finalVisibleMeshes, finalHiddenMeshes, token, after = null) {
  if (token !== visibilityTweenToken) return;

  for (const st of states || []) {
    const ud = ensureMaterialUserData(st.mat);
    if (st.targetVisible) {
      applyRenderModeMaterialState(core, st.mat);
    } else {
      st.mat.opacity = 0;
      st.mat.transparent = true;
      st.mat.depthWrite = false;
      st.mat.depthTest = (typeof ud.__automindBaseDepthTest === 'boolean') ? ud.__automindBaseDepthTest : true;
    }
    st.mat.needsUpdate = true;
  }

  for (const mesh of finalVisibleMeshes || []) {
    mesh.visible = true;
    mesh.userData.__automindVisibilityTarget = true;
  }
  for (const mesh of finalHiddenMeshes || []) {
    mesh.visible = false;
    mesh.userData.__automindVisibilityTarget = false;
  }

  try { after?.(); } catch (_) {}
  try { core?.interaction?.refreshSelectionMarker?.(); } catch (_) {}
  try { core?.renderer?.render?.(core.scene, core.camera); } catch (_) {}
}

function normalizeMeshVisibilityHard(mesh, targetVisible) {
  if (!mesh || !mesh.isMesh || !mesh.geometry || mesh.userData?.__isHoverOverlay) return;
  const mats = ensureUniqueVisibilityMaterials(mesh);
  mesh.visible = !!targetVisible;
  mesh.userData.__automindVisibilityTarget = !!targetVisible;
  for (const mat of mats) {
    const ud = ensureMaterialUserData(mat);
    const targetOpacity = targetVisible ? renderModeVisibleOpacity(null, mat) : 0;
    if (targetVisible) {
      // Hard normalization is used mostly as a fallback/reset; preserve the
      // material's original solid/wireframe flags if no viewer core is available.
      mat.opacity = targetOpacity;
      mat.transparent = (typeof ud.__automindBaseTransparent === 'boolean') ? ud.__automindBaseTransparent : targetOpacity < 1;
      mat.depthWrite = (typeof ud.__automindBaseDepthWrite === 'boolean') ? ud.__automindBaseDepthWrite : true;
      mat.depthTest = (typeof ud.__automindBaseDepthTest === 'boolean') ? ud.__automindBaseDepthTest : true;
    } else {
      mat.opacity = 0;
      mat.transparent = true;
      mat.depthWrite = false;
      mat.depthTest = (typeof ud.__automindBaseDepthTest === 'boolean') ? ud.__automindBaseDepthTest : true;
    }
    mat.needsUpdate = true;
  }
}

function animateMeshVisibility(core, meshes, shouldBeVisible, duration = 540, after = null) {
  // Transaction model: every user action declares the whole desired final state.
  // Old fades are cancelled immediately; unfinished mid-fade opacities are only used
  // as the new start value, never as the new canonical opacity. This prevents rapid
  // component clicks + Show all from leaving semi-hidden or logically stale meshes.
  const token = ++visibilityTweenToken;
  const serial = ++visibilityActionSerial;
  cancelVisibilityFrame();

  const states = [];
  const finalVisibleMeshes = new Set();
  const finalHiddenMeshes = new Set();
  const uniqueMeshes = Array.from(new Set((meshes || []).filter(m => m && m.isMesh && m.geometry && !m.userData?.__isHoverOverlay)));

  for (const mesh of uniqueMeshes) {
    const targetVisible = typeof shouldBeVisible === 'function' ? !!shouldBeVisible(mesh) : !!shouldBeVisible;
    mesh.userData.__automindVisibilitySerial = serial;
    mesh.userData.__automindVisibilityTarget = targetVisible;

    const mats = ensureUniqueVisibilityMaterials(mesh);
    if (targetVisible) {
      // A mesh must be visible during fade-in, even if a previous transaction had
      // already set visible=false.
      mesh.visible = true;
      finalVisibleMeshes.add(mesh);
    } else {
      // Keep it visible while fading out; only hide at transaction finalization.
      mesh.visible = true;
      finalHiddenMeshes.add(mesh);
    }

    for (const mat of mats) {
      if (!mat) continue;
      rememberMaterialBaseState(mat);
      const startOpacity = mesh.visible === false ? 0 : currentOpacityFor(mat);
      const targetOpacity = targetVisible ? renderModeVisibleOpacity(core, mat) : 0;

      mat.transparent = true;
      mat.depthWrite = false;
      mat.opacity = startOpacity;
      mat.needsUpdate = true;

      states.push({ mesh, mat, startOpacity, targetOpacity, targetVisible });
    }
  }

  if (!states.length || !duration || duration <= 0) {
    finalizeVisibilityStates(core, states, finalVisibleMeshes, finalHiddenMeshes, token, after);
    return;
  }

  const t0 = performance.now();
  function step(now) {
    if (token !== visibilityTweenToken) return;
    const u = Math.min(1, (now - t0) / Math.max(1, duration));
    const k = easeInOutCubic(u);

    for (const st of states) {
      if (st.mesh.userData.__automindVisibilitySerial !== serial) continue;
      st.mat.opacity = THREE.MathUtils.lerp(st.startOpacity, st.targetOpacity, k);
      st.mat.needsUpdate = true;
    }

    try { core?.interaction?.refreshSelectionMarker?.(); } catch (_) {}
    try { core?.renderer?.render?.(core.scene, core.camera); } catch (_) {}

    if (u < 1) {
      visibilityRAF = requestAnimationFrame(step);
      return;
    }

    visibilityRAF = 0;
    finalizeVisibilityStates(core, states, finalVisibleMeshes, finalHiddenMeshes, token, after);
  }
  visibilityRAF = requestAnimationFrame(step);
}

function showAll(core) {
  if (!core.robot) return;
  core.__componentViewFocusMeshes = null;
  try { core.setMechanismSuppressed?.(false, 520); } catch (_) {}
  const meshes = collectRobotMeshes(core.robot);
  // Show all is an absolute reset command: all component visibility targets become
  // visible. It deliberately cancels previous isolate transactions and restores
  // canonical material opacity, so it cannot inherit half-faded states.
  animateMeshVisibility(core, meshes, true, 620, () => {
    try { core?.interaction?.clearHover?.(); core?.interaction?.refreshSelectionMarker?.(); } catch (_) {}
  });
  viewIso(core, core.robot, 750);
}

function fitSphereFromMeshes(meshes) {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  let has = false;
  for (const m of meshes || []) {
    if (!m || !m.geometry || m.userData?.__isHoverOverlay) continue;
    tmp.setFromObject(m);
    if (tmp.isEmpty()) continue;
    if (!has) { box.copy(tmp); has = true; } else box.union(tmp);
  }
  if (!has) return null;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-9);
  const radius = Math.max(size.length() * 0.5, maxDim * 0.5, 1e-6);
  return { center, size, radius, maxDim, box };
}

function fitSphereFromObject(object) {
  if (!object) return null;
  const box = objectBox(object);
  if (!box) return null;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-9);
  const radius = Math.max(size.length() * 0.5, maxDim * 0.5, 1e-6);
  return { center, size, radius, maxDim, box };
}

function currentViewFitSphere(core) {
  // If a component was selected through the Components panel, camera view buttons
  // should frame that isolated part. Once Show all is used, the focus is cleared
  // and view buttons frame the full model again.
  const focused = core?.__componentViewFocusMeshes;
  if (Array.isArray(focused) && focused.length) {
    const s = fitSphereFromMeshes(focused.filter(m => m && m.visible !== false));
    if (s) return s;
  }
  return fitSphereFromObject(core?.robot);
}

function frameMeshes(core, meshes, duration = 680) {
  const s = fitSphereFromMeshes(meshes);
  if (!s) return false;
  const { center, size, radius, maxDim } = s;
  const cam = core.camera;

  // Component-panel focus must use the same Iso angle every time, but with a fit
  // distance computed from the selected part itself. A screw gets a close view;
  // a huge body gets a farther view. This avoids inheriting the previous zoom.
  updateCameraPlanesForBox(cam, size);
  const az = Math.PI * 0.25;
  const el = Math.PI * 0.20;
  const dir = new THREE.Vector3(
    Math.cos(el) * Math.cos(az),
    Math.sin(el),
    Math.cos(el) * Math.sin(az)
  ).normalize();

  let dist;
  if (cam.isOrthographicCamera) {
    dist = Math.max(radius * 5.0, maxDim * 4.0, 0.25);
  } else {
    dist = distanceToFitSphere(cam, radius, 2.65);
  }
  dist = THREE.MathUtils.clamp(dist, 0.05, 1e6);
  return tweenCamera(core, center.clone().add(dir.multiplyScalar(dist)), center, duration);
}

function isolateMeshesSmooth(core, meshesToKeep, duration = 560) {
  if (!core.robot) return;
  const allMeshes = collectRobotMeshes(core.robot);
  const keep = new Set((meshesToKeep || []).filter(m => m && m.isMesh && m.geometry && !m.userData?.__isHoverOverlay));
  const kept = Array.from(keep);
  core.__componentViewFocusMeshes = kept.length ? kept : null;
  try { core.setMechanismSuppressed?.(kept.length > 0, duration); } catch (_) {}
  animateMeshVisibility(core, allMeshes, mesh => keep.has(mesh), duration, () => {
    try { core?.interaction?.clearHover?.(); core?.interaction?.refreshSelectionMarker?.(); } catch (_) {}
  });
  if (kept.length) frameMeshes(core, kept);
}

function isolateAsset(core, assetToMeshes, assetKey) {
  if (!core.robot) return;
  isolateMeshesSmooth(core, assetToMeshes.get(assetKey) || [], 560);
}

function isolateLink(core, linkObj) {
  if (!core.robot || !linkObj) return;
  isolateMeshesSmooth(core, collectMeshesInObject(linkObj), 560);
}

function buildThumbnailer(core, assetToMeshes) {
  // AutoMind USD thumbnailer with real USD materials/textures.
  // It keeps texture maps when present, waits briefly for dataURL textures to decode,
  // and adds a subtle edge overlay so white Technic pieces do not disappear on white UI.
  const cache = new Map();
  const W = 320, H = 240;
  const BG_COLOR = 0xf3f8f9;
  const EDGE_COLOR = 0x0b3b3c;

  function materialList(mat) {
    if (!mat) return [];
    return Array.isArray(mat) ? mat.filter(Boolean) : [mat];
  }
  function hasLoadedImage(tex) {
    const img = tex?.image;
    // DataURL TextureLoader creates an HTMLImageElement. Some browsers expose
    // naturalWidth before width, so check both. This prevents caching thumbnails
    // while the main model textures are still decoding.
    return !!(img && (
      (typeof img.naturalWidth === 'number' && img.naturalWidth > 0) ||
      (typeof img.width === 'number' && img.width > 0) ||
      img.complete === true
    ));
  }
  function collectTextureMaps(meshes) {
    const maps = [];
    const seen = new Set();
    for (const mesh of meshes || []) {
      for (const m of materialList(mesh?.material)) {
        for (const k of ['map','emissiveMap','aoMap','alphaMap','bumpMap','normalMap','roughnessMap','metalnessMap']) {
          const tex = m && m[k];
          if (tex && !seen.has(tex)) { seen.add(tex); maps.push(tex); }
        }
      }
    }
    return maps;
  }
  async function waitForTextures(meshes, timeoutMs = 10000) {
    const maps = collectTextureMaps(meshes);
    if (!maps.length) return { maps, loaded: true };
    const t0 = performance.now();
    await new Promise(resolve => {
      const tick = () => {
        if (maps.every(hasLoadedImage) || performance.now() - t0 > timeoutMs) resolve();
        else setTimeout(tick, 35);
      };
      tick();
    });
    for (const tex of maps) { try { tex.needsUpdate = true; } catch (_) {} }
    return { maps, loaded: maps.every(hasLoadedImage) };
  }
  function cloneMaterialForPreview(src) {
    // Critical thumbnail fix:
    // the full 3D model already has the correct material/texture. For thumbnails,
    // do not reconstruct USD materials again; reuse the exact texture object from
    // the visible mesh. Use MeshBasicMaterial for texture previews so lighting does
    // not wash out subtle printed/white textures on small cards.
    if (src?.map) {
      try { src.map.needsUpdate = true; } catch (_) {}
      const mat = new THREE.MeshBasicMaterial({
        map: src.map,
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: !!src.transparent || (Number(src.opacity) < 1),
        opacity: Number.isFinite(src.opacity) ? src.opacity : 1,
        alphaTest: Number.isFinite(src.alphaTest) ? src.alphaTest : 0
      });
      mat.toneMapped = false;
      mat.needsUpdate = true;
      return mat;
    }
    let mat;
    if (src && typeof src.clone === 'function') mat = src.clone();
    else mat = new THREE.MeshStandardMaterial({ color: 0xdfe8ea, roughness: 0.55, metalness: 0.04 });
    mat.side = THREE.DoubleSide;
    if (mat.color) {
      const c = mat.color;
      if (c.r > 0.92 && c.g > 0.92 && c.b > 0.92) mat.color = new THREE.Color(0xe1e8ea);
    }
    mat.roughness = Number.isFinite(mat.roughness) ? mat.roughness : 0.55;
    mat.metalness = Number.isFinite(mat.metalness) ? mat.metalness : 0.04;
    mat.needsUpdate = true;
    return mat;
  }
  function disposePreview(root) {
    root?.traverse?.((o) => {
      if (o?.isMesh && o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m?.dispose?.()); // disposes cloned material only, not shared textures
      }
      if (o?.isLineSegments && o.material) o.material.dispose?.();
      if (o?.userData?.__ownedEdgeGeometry) o.geometry?.dispose?.();
    });
  }

  async function thumbnail(assetKey) {
    if (cache.has(assetKey)) return cache.get(assetKey);
    const meshes = assetToMeshes.get(assetKey) || [];
    if (!meshes.length) return '';
    const texStatus = await waitForTextures(meshes);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe6e8, 2.4));
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.75); fill.position.set(-4, -2, 3); scene.add(fill);

    const root = new THREE.Group();
    scene.add(root);
    for (const mesh of meshes) { try { mesh.updateMatrixWorld(true); } catch (_) {} }
    for (const mesh of meshes) {
      if (!mesh || !mesh.geometry) continue;
      const srcMats = materialList(mesh.material);
      const previewMat = Array.isArray(mesh.material)
        ? srcMats.map(cloneMaterialForPreview)
        : cloneMaterialForPreview(srcMats[0]);
      const c = new THREE.Mesh(mesh.geometry, previewMat);
      c.matrixAutoUpdate = false;
      c.matrix.copy(mesh.matrixWorld);
      c.renderOrder = 1;
      root.add(c);
      try {
        const eg = new THREE.EdgesGeometry(mesh.geometry, 20);
        const em = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.68 });
        const edges = new THREE.LineSegments(eg, em);
        edges.matrixAutoUpdate = false;
        edges.matrix.copy(mesh.matrixWorld);
        edges.renderOrder = 2;
        edges.userData.__ownedEdgeGeometry = true;
        root.add(edges);
      } catch (_) {}
    }

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return '';
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    root.position.sub(center);
    root.updateMatrixWorld(true);

    const camera = new THREE.PerspectiveCamera(35, W / H, Math.max(maxDim / 1000, 0.0001), Math.max(maxDim * 1000, 10));
    camera.position.set(maxDim * 1.9, maxDim * 1.35, maxDim * 1.9);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    const renderer = core.renderer;
    const oldTarget = renderer.getRenderTarget();
    const oldSize = renderer.getSize(new THREE.Vector2());
    const oldPixelRatio = renderer.getPixelRatio();
    const oldClearColor = renderer.getClearColor(new THREE.Color()).clone();
    const oldClearAlpha = renderer.getClearAlpha?.() ?? 1;
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 0 });
    try {
      renderer.setPixelRatio(1);
      renderer.setSize(W, H, false);
      renderer.setClearColor(BG_COLOR, 1);
      renderer.setRenderTarget(rt);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      const buffer = new Uint8Array(W * H * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, buffer);
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++) {
        const src = (H - 1 - y) * W * 4;
        const dst = y * W * 4;
        img.data.set(buffer.subarray(src, src + W * 4), dst);
      }
      ctx.putImageData(img, 0, 0);
      const url = canvas.toDataURL('image/png');
      if (!texStatus.maps.length || texStatus.loaded) cache.set(assetKey, url);
      else setTimeout(() => { try { cache.delete(assetKey); } catch (_) {} }, 250);
      return url;
    } catch (e) {
      debugLog('[thumb] failed', assetKey, String(e));
      return '';
    } finally {
      renderer.setRenderTarget(oldTarget);
      renderer.setPixelRatio(oldPixelRatio);
      renderer.setSize(oldSize.x, oldSize.y, false);
      renderer.setClearColor(oldClearColor, oldClearAlpha);
      rt.dispose();
      disposePreview(root);
      core.resize?.();
    }
  }
  async function primeAll(keys) { for (const k of keys || []) { try { await thumbnail(k); } catch (_) {} } }
  function destroy() { cache.clear(); }
  return { thumbnail, primeAll, destroy };
}

function maybeSetupIA(app, assetToMeshes, thumbs) {
  if (!app.IA_Widgets) return;
  setTimeout(async () => {
    try {
      const cb = window.google?.colab?.kernel?.invokeFunction;
      if (typeof cb !== 'function') { debugLog('[IA] Colab callback unavailable'); return; }
      const items = app.assets.list();
      const entries = [];
      // Full robot ISO as context.
      try {
        const iso = await captureRobotISO(app);
        if (iso) entries.push({ key: '__robot_iso__', name: 'robot_iso', index: -1, image_b64: iso.split(',')[1] || '' });
      } catch (_) {}
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const url = await thumbs.thumbnail(it.assetKey);
        const b64 = String(url || '').split(',')[1] || '';
        if (b64) entries.push({ key: it.assetKey, name: it.base || it.assetKey, index: i, image_b64: b64 });
      }
      const res = await cb('describe_component_images', [entries], {});
      app.componentDescriptions = parseCallbackResult(res);
      window.dispatchEvent(new Event('ia_descriptions_ready'));
      debugLog('[IA] descriptions ready', Object.keys(app.componentDescriptions || {}).length);
    } catch (e) { debugLog('[IA] error', String(e)); }
  }, 500);
}
function parseCallbackResult(res) {
  try {
    if (res && res.data && res.data['application/json']) return res.data['application/json'];
    if (res && typeof res === 'object' && !Array.isArray(res)) return res;
    if (typeof res === 'string') return JSON.parse(res);
  } catch (_) {}
  return {};
}
async function captureRobotISO(app) {
  // reuse first thumbnail-like render by rendering all robot meshes.
  const map = new Map();
  const arr = [];
  app.robot?.traverse?.(o => { if (o.isMesh && o.geometry) arr.push(o); });
  map.set('__robot_iso__', arr);
  const t = buildThumbnailer(app, map);
  const url = await t.thumbnail('__robot_iso__');
  t.destroy();
  return url;
}


export function render(opts = {}) {
  const {
    container,
    selectMode = 'link',
    background = (THEME.colors?.canvasBg ?? THEME.bgCanvas ?? 0xffffff),
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2),
    IA_Widgets = false,
  } = opts;

  if (!container) throw new Error('[urdfplus_viewer_main] opts.container is required');
  debugLog('render init', {
    mode: 'URDF+',
    selectMode,
    IA_Widgets,
    hasZip: !!(opts.URDF_Zip || opts.urdfZip || opts.urdfZipBase64 || opts.zipBase64),
    hasURDF: !!(opts.urdfContent || opts.urdfText || opts.robotXml),
    assetCount: Object.keys(opts.assetDB || {}).length
  });

  const core = createViewer({ container, background, pixelRatio });
  let robot = null;
  let assetToMeshes = new Map();
  let thumbs = null;
  let tools = null;
  let comps = null;

  const inter = attachInteraction({
    scene: core.scene,
    camera: () => core.camera,
    renderer: core.renderer,
    controls: core.controls,
    robot: null,
    selectMode,
    getSectionPlane: () => app?.sectionPlane || null,
    onSelectLink: () => { try { app?.interaction?.refreshSelectionMarker?.(); } catch (_) {} }
  });
  core.interaction = inter;

  const app = {
    scene: core.scene,
    renderer: core.renderer,
    controls: core.controls,
    helpers: core.helpers,
    get camera() { return core.camera; },
    get robot() { return robot; },
    resize: core.resize,
    fitAndCenter: (...args) => core.fitAndCenter(...args),
    setSceneToggles: (...args) => core.setSceneToggles(...args),
    setMechanismToggles: (...args) => core.setMechanismToggles(...args),
    setMechanismClippingPlane: (...args) => core.setMechanismClippingPlane?.(...args),
    setMechanismSuppressed: (...args) => core.setMechanismSuppressed?.(...args),
    setProjection: (...args) => core.setProjection(...args),
    setRenderModeState: (mode) => { core.__currentRenderMode = String(mode || 'Solid'); },
    getCurrentRenderMode: () => core.__currentRenderMode || 'Solid',
    IA_Widgets,
    sectionPlane: null,
    getSectionPlane: () => app?.sectionPlane || null,
    interaction: inter,
    clearSelection: () => inter?.clearSelection?.(),
    componentDescriptions: {},
    assets: {
      list: () => listAssets(assetToMeshes),
      thumbnail: (assetKey) => thumbs?.thumbnail(assetKey) || '',
    },
    isolate: {
      asset: (assetKey) => isolateAsset(core, assetToMeshes, assetKey),
      link: (linkObj) => isolateLink(core, linkObj),
      clear: () => showAll(core),
    },
    showAll: () => showAll(core),
    viewIso: () => viewIso(core, core.robot, 750),
    getCurrentViewFitSphere: () => currentViewFitSphere(core),
    hasComponentViewFocus: () => Array.isArray(core.__componentViewFocusMeshes) && core.__componentViewFocusMeshes.length > 0,
    clearComponentViewFocus: () => { core.__componentViewFocusMeshes = null; },
    getComponentDescription(assetKey, index) {
      const src = app.componentDescriptions || {};
      if (assetKey && src[assetKey]) return src[assetKey];
      const baseFull = (assetKey || '').split(/[\\/]/).pop();
      if (baseFull && src[baseFull]) return src[baseFull];
      const base = baseFull ? baseFull.split('.')[0] : '';
      if (base && src[base]) return src[base];
      if (Array.isArray(src) && typeof index === 'number') return src[index] || '';
      return '';
    },
    async collectAllThumbnails() {
      const items = app.assets.list();
      Base64Images.length = 0;
      for (const it of items) {
        const url = await app.assets.thumbnail(it.assetKey);
        const b64 = String(url || '').split(',')[1] || '';
        if (b64) Base64Images.push(b64);
      }
      window.Base64Images = Base64Images;
      return Base64Images;
    },
  };

  tools = createToolsDock(app, THEME);
  comps = createComponentsPanel(app, THEME);
  app.openTools = (open = true) => tools.set?.(!!open);

  app.ready = (async () => {
    try {
      robot = await loadURDFPlusModel(opts);
      if (core.robot) {
        try { core.scene.remove(core.robot); } catch (_) {}
      }
      core.robot = robot;
      core.scene.add(robot);
      assetToMeshes = robot.assetToMeshes || new Map();
      thumbs = buildThumbnailer(core, assetToMeshes);
      inter.setRobot(robot);
      robot.applyPose?.();
      core.fitAndCenter(robot, 1.08);
      try { core.setMechanismToggles?.({ jointAxes: false, loops: false }); } catch (_) {}
      setTimeout(() => { try { thumbs.primeAll(Array.from(assetToMeshes.keys())); } catch (_) {} }, 1400);
      maybeSetupIA(app, assetToMeshes, thumbs);
      debugLog('URDF+ loaded', {
        robot: robot.name,
        links: Object.keys(robot.links || {}).length,
        joints: Object.keys(robot.joints || {}).length,
        loops: (robot.loopJoints || []).length,
        couplings: (robot.couplings || []).length,
        components: assetToMeshes.size
      });
      return app;
    } catch (err) {
      debugLog('URDF+ load error', err?.stack || err?.message || String(err));
      const box = document.createElement('pre');
      box.textContent = 'AutoMind URDF+ load error:\n' + (err?.stack || err?.message || String(err));
      Object.assign(box.style, {
        position: 'absolute', left: '14px', top: '14px', right: '14px', zIndex: '999999',
        margin: '0', padding: '12px', maxHeight: '45%', overflow: 'auto', whiteSpace: 'pre-wrap',
        background: '#fff5f5', color: '#7a1111', border: '1px solid #f3b3b3', borderRadius: '12px',
        font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      });
      container.appendChild(box);
      throw err;
    }
  })();

  if (typeof window !== 'undefined') {
    window.URDFPlusViewer = window.URDFPlusViewer || {};
    window.URDFPlusViewer.__app = app;
    window.AutoMindURDFPlusApp = app;
  }

  return Object.assign(app, {
    resize: core.resize,
    destroy() {
      try { comps?.destroy?.(); } catch (_) {}
      try { tools?.destroy?.(); } catch (_) {}
      try { inter?.destroy?.(); } catch (_) {}
      try { thumbs?.destroy?.(); } catch (_) {}
      try { robot?.assetResolver?.dispose?.(); } catch (_) {}
      try { core.destroy?.(); } catch (_) {}
    }
  });
}


export default { render };
