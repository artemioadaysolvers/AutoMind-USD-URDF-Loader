BUILD163 - DAE diffuse tint preserved / anti-gray render

Clean URDF+ Colab viewer with exactly the requested Theme.js lighting, previous teal grid color, and minimum scripts.

Fixes over BUILD162:
- Preserves DAE material diffuse color when a texture exists. This matches the older viewer behavior and prevents red/black CAD parts from becoming gray/washed-out.
- Render-mode changes no longer force textured materials to pure white.
- Component thumbnails preserve the same diffuse tint as the main viewport.
- Keeps Show all/render mode stability, uniform teal grid, tween camera focus, base64 texture loading, and realtime URDF+ joint/loop logic.
