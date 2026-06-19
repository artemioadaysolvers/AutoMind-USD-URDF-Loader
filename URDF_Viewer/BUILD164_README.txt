BUILD164 - Main viewport matches thumbnails / no gray fog

Clean URDF+ Colab viewer with scripts only.

Changes vs BUILD163:
- Main viewport CAD materials now use the same unlit albedo path as thumbnails: original DAE diffuse color * texture, no lighting gray wash.
- Keeps the exact Theme.js lighting requested by the user for scene helpers/thumbnails, but textured CAD meshes no longer become gray due to lit Collada material response.
- Keeps previous teal grid color, clean uniform grid, tween camera focus, stable Show All, URDF+ loops and realtime joints.
