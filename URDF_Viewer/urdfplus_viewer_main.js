// /URDF_Viewer/urdfplus_viewer_main.js
// BUILD153: Exact URDF+ runtime path.
// The BUILD152 legacy bridge fixed texture thumbnails, but it routed URDF+ files
// through standard URDFLoader, so closed-chain/coupling drag could not match the
// standalone HTML. BUILD153 makes the direct URDF+ core the default again. That
// core now includes the standalone HTML realtime constrained joint projection,
// final pinned settle, loop/coupling solver, DAE texture rewrites and USD-style
// component thumbnails/overlays.
import { render as renderDirectURDFPlus } from './urdfplus_viewer_main_core.js';
import { render as renderLegacyURDF } from './legacy/urdf_viewer_main.js';

function bool(v) { return /^(1|true|yes)$/i.test(String(v || '')); }
function optsWantLegacy(opts = {}) {
  return bool(opts.useLegacyURDFLoaderPipeline || opts.legacyURDFLoader || opts.standardURDFLoaderOnly) ||
         bool(globalThis.AutoMindUseLegacyURDFLoaderPipeline);
}

export function render(opts = {}) {
  if (optsWantLegacy(opts)) {
    return renderLegacyURDF({ ...opts, modelFormat: 'URDF/URDF+ legacy fallback' });
  }
  return renderDirectURDFPlus({
    ...opts,
    modelFormat: 'URDF+',
    isURDFPlus: true,
    build: 'BUILD153_ExactStandaloneHTMLJointSystem',
    exactStandaloneJointSystem: true,
    unifiedURDFPlusPipeline: false,
    legacyURDFLoaderPipeline: false
  });
}

export default { render };
