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

function buildHelpers() {
  const group = new THREE.Group();
  const grid = new THREE.GridHelper(10, 20, 0x0ea5a6, 0x14b8b9); grid.visible = false; group.add(grid);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.25 }); groundMat.depthWrite = false;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.0001; ground.visible = false; group.add(ground);
  const axes = new THREE.AxesHelper(1); axes.visible = false; group.add(axes);
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
    camera.near = Math.max(maxDim / 1000, 0.001); camera.far = Math.max(maxDim * 1500, 1500); camera.updateProjectionMatrix();
    let dir = camera.position.clone().sub(controls.target || new THREE.Vector3());
    if (!isFinite(dir.lengthSq()) || dir.lengthSq() < 1e-10) dir.set(1, 0.7, 1);
    dir.normalize(); camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
  } else {
    const aspect = Math.max(1e-6, (controls?.domElement?.clientWidth || 1) / (controls?.domElement?.clientHeight || 1));
    const span = Math.max(maxDim, 5 * Math.SQRT2);
    camera.left = -span * aspect; camera.right = span * aspect; camera.top = span; camera.bottom = -span;
    camera.near = Math.max(maxDim / 1000, 0.001); camera.far = Math.max(maxDim * 1500, 1500); camera.updateProjectionMatrix();
    camera.position.copy(center.clone().add(new THREE.Vector3(maxDim, maxDim * 0.9, maxDim)));
  }
  controls.target.copy(center); controls.update(); return true;
}

function axisFromToken(t) { if (t === 'X') return new THREE.Vector3(1, 0, 0); if (t === 'Y') return new THREE.Vector3(0, 1, 0); return new THREE.Vector3(0, 0, 1); }
function jointAxisLocal(j) {
  if (j.axisJoint && j.axisJoint.length === 3) {
    const a = new THREE.Vector3(...j.axisJoint); if (a.lengthSq() > EPS) return a.normalize();
  }
  return axisFromToken(j.axisToken || 'Z');
}
function isMovableJoint(j) { return !!j && j.jointType && String(j.jointType).toLowerCase() !== 'fixed'; }
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
    for (const ab of ancestors) if (ab.type === 'Xform') composed.multiply(parseMatrix(directBody(ab.body)));
    mb._composedLocalMatrix = composed.multiply(parseMatrix(directBody(mb.body)));
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
  const colorNums = parseNums(match1(block.body, /primvars:displayColor\s*=\s*\[\(([^\)]*)\)\]/s, '0.72 0.76 0.8'));
  const color = new THREE.Color(colorNums[0] ?? 0.72, colorNums[1] ?? 0.76, colorNums[2] ?? 0.8);
  const texPath = parseStringAttr(block.body, 'automind:textureFile', '') || match1(block.body, /asset\s+inputs:file\s*=\s*@([^@]+)@/s, '');
  let tex = null;
  if (texPath && assetDB?.get) {
    const data = assetDB.get(texPath) || assetDB.get(basename(texPath));
    if (data) {
      tex = new THREE.TextureLoader().load(data);
      tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
      if ('sRGBEncoding' in THREE) tex.encoding = THREE.sRGBEncoding;
    }
  }
  const mat = new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : color, map: tex || null, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide });
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
  j.schema = schema; j.role = role;
  j.body0 = parseStringAttr(body, 'automind:parentLink', localNameFromPath(body0Path));
  j.body1 = parseStringAttr(body, 'automind:childLink', localNameFromPath(body1Path));
  j.parentLink = j.body0; j.childLink = j.body1;
  j.localPos0 = parseVecAttr(body, 'physics:localPos0'); j.localRot0 = parseQuatAttr(body, 'physics:localRot0');
  j.localPos1 = parseVecAttr(body, 'physics:localPos1'); j.localRot1 = parseQuatAttr(body, 'physics:localRot1');
  j.axisToken = parseStringAttr(body, 'physics:axis', 'Z');
  j.axisJoint = parseVecAttr(body, 'automind:axisJoint', null);
  j.axisSuccessor = parseVecAttr(body, 'automind:axisSuccessor', null);
  j.axis = jointAxisLocal(j);
  j.limit = { lower: Number.isFinite(lowerLimit) ? lowerLimit : lowerRad, upper: Number.isFinite(upperLimit) ? upperLimit : upperRad };
  j.angle = 0; j.position = 0; j.value = 0; j.inputValue = 0;
  j.mimicJoint = parseStringAttr(body, 'automind:mimicJoint', '');
  j.mimicMultiplier = parseNumAttr(body, 'automind:mimicMultiplier', 1);
  j.mimicOffset = parseNumAttr(body, 'automind:mimicOffset', 0);
  j.independent = parseStringAttr(body, 'automind:independent', '');
  j.kinematicRole = parseStringAttr(body, 'automind:kinematicRole', '');
  j.exportedMovable = parseBoolAttr(body, 'automind:movable', isMovableJoint(j));
  j.viewerControllable = parseBoolAttr(body, 'automind:viewerControllable', isMovableJoint(j) && role !== 'loop');
  j._localFrame0 = matrixFromPosQuat(j.localPos0, j.localRot0);
  j._localFrame1 = matrixFromPosQuat(j.localPos1, j.localRot1);
  j._localFrame1Inv = j._localFrame1.clone().invert();
  j.userData.__isUSDJoint = true;
  j.userData.__joint = j;
  j.userData.__model = model;
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
function buildKinematicTree(model, allJoints) {
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
function applyPose(model) {
  applyCouplings(model);
  for (const r of model._roots || []) {
    const info = model._linkInfo?.[r]; if (info) applyPoseRecursive(model, r, info.baseMatrix.clone());
  }
  model.updateMatrixWorld(true);
}
function setJointValueInternal(model, j, v) {
  let val = Number(v) || 0;
  if (j.jointType !== 'continuous') {
    if (typeof j.limit?.lower === 'number' && Number.isFinite(j.limit.lower)) val = Math.max(val, j.limit.lower);
    if (typeof j.limit?.upper === 'number' && Number.isFinite(j.limit.upper)) val = Math.min(val, j.limit.upper);
  }
  if (/prismatic/i.test(j.jointType)) j.position = val; else j.angle = val;
  j.value = val;
  applyPose(model);
}

function parseUSDModel(text, assetDB) {
  const model = new USDModel(parseDefaultPrim(text) || 'AutoMindUSD');
  const blocks = findDefBlocks(text);
  model._linkInfo = {};
  const linkBlocks = blocks.filter(b => b.type === 'Xform' && /automind:linkName/.test(directBody(b.body)));
  for (const b of linkBlocks) {
    const info = createLink(model, b, assetDB);
    model._linkInfo[info.name] = info;
  }
  const jointBlocks = blocks.filter(b => /^Physics.*Joint$/.test(b.type));
  const joints = jointBlocks.map(b => parseJointBlock(b, model)).filter(j => j.name && j.body0 && j.body1);
  model.couplings = blocks.filter(b => b.type === 'Xform' && /automind:kind\s*=\s*"coupling"/.test(directBody(b.body))).map(parseCouplingBlock);
  buildKinematicTree(model, joints);
  applyPose(model);
  applyDoubleSided(model);
  return model;
}

export function createViewer({ container, background = 0xffffff, pixelRatio = Math.min(window.devicePixelRatio || 1, 2) } = {}) {
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
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(3, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-4, 2, -3); scene.add(fill);
  const helpers = buildHelpers(); scene.add(helpers.group);

  const ControlsCtor = THREE.OrbitControls;
  if (!ControlsCtor) throw new Error('[USD ViewerCore] THREE.OrbitControls is not defined. Load OrbitControls.js before the module.');
  const controls = new ControlsCtor(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.screenSpacePanning = true;

  let robot = null;
  let raf = null;
  let destroyed = false;

  function resize(w, h, dpr = pixelRatio) {
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(w || rect.width || window.innerWidth || 800));
    const height = Math.max(1, Math.floor(h || rect.height || window.innerHeight || 600));
    renderer.setPixelRatio(Math.min(dpr || 1, 2)); renderer.setSize(width, height, false);
    const aspect = width / Math.max(1, height);
    perspCamera.aspect = aspect; perspCamera.updateProjectionMatrix();
    const span = Math.max(1, controls.target.distanceTo(camera.position) || 1);
    orthoCamera.left = -span * aspect; orthoCamera.right = span * aspect; orthoCamera.top = span; orthoCamera.bottom = -span; orthoCamera.updateProjectionMatrix();
  }
  function animate() {
    if (destroyed) return;
    raf = requestAnimationFrame(animate);
    controls.update(); renderer.render(scene, camera);
  }
  resize(); animate();
  const ro = new ResizeObserver(() => resize()); ro.observe(container);

  const core = {
    scene, renderer, get camera() { return camera; }, controls, helpers, get robot() { return robot; }, set robot(v) { robot = v; },
    loadUSD(usdContent, { assetDB } = {}) {
      if (robot) { scene.remove(robot); }
      robot = parseUSDModel(usdContent || '', assetDB || null);
      scene.add(robot);
      fitAndCenter(camera, controls, robot, 1.08);
      return robot;
    },
    fitAndCenter(object = robot, pad = 1.08) { return fitAndCenter(camera, controls, object, pad); },
    resize,
    setSceneToggles({ grid, ground, axes, shadows } = {}) {
      if (typeof grid === 'boolean') helpers.grid.visible = grid;
      if (typeof ground === 'boolean') helpers.ground.visible = ground;
      if (typeof axes === 'boolean') helpers.axes.visible = axes;
      if (typeof shadows === 'boolean') { renderer.shadowMap.enabled = shadows; helpers.ground.receiveShadow = shadows; }
    },
    setProjection(mode = 'Perspective') {
      const old = camera;
      if (/ortho/i.test(mode)) {
        const dir = old.position.clone().sub(controls.target);
        camera = orthoCamera; camera.position.copy(controls.target.clone().add(dir)); camera.quaternion.copy(old.quaternion);
      } else {
        const dir = old.position.clone().sub(controls.target);
        camera = perspCamera; camera.position.copy(controls.target.clone().add(dir)); camera.quaternion.copy(old.quaternion);
      }
      controls.object = camera; resize(); controls.update();
    },
    destroy() {
      destroyed = true; if (raf) cancelAnimationFrame(raf); ro.disconnect();
      try { renderer.dispose(); renderer.domElement.remove(); } catch (_) {}
    }
  };
  return core;
}

export default { createViewer };
