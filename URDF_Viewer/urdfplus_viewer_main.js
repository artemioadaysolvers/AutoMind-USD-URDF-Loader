// /URDF_Viewer/urdfplus_viewer_main.js
// BUILD161_CLEAN_NO_FOG_GRID_TWEEN_SHOWALL
// Entrypoint real, sin iframe y sin HTML standalone adapter.
// Exporta directamente el renderer modular URDF+ corregido BUILD161 limpio.
// Firma pública: import(...).then(m => m.render(opts)).

import { render, Base64Images } from './urdfplus_viewer_main_core.js';

export { render, Base64Images };

export default { render };
