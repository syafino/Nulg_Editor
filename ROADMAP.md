# WebRay Editor — Roadmap

5-phase enhancement plan to evolve from a sphere tracer to a production-capable path tracer.

---

## Phase 1: Richer Geometry (Weeks 1–2)

**Goal**: Move beyond spheres. Support diverse primitive shapes and meshes.

### Features
- **Box primitive**: Axis-aligned bounding boxes (AABB intersections)
- **Plane primitive**: Infinite ground planes with optional bounding rect
- **Triangle meshes**: Load OBJ files, store as flattened vertex buffer + index buffer
- **Unified hit structure**: Generalize the `HitRecord` to store `primitive_type` and `primitive_id`, allowing different intersection code paths in the shader
- **Scene persistence**: Save/load scenes as JSON (spheres + boxes + planes + mesh list)

### GPU changes
- Expand the scene buffer to store multiple primitive types
- Add separate buffer tables for box and plane data
- Implement OBJ parser in TypeScript to upload mesh data as GPU buffers

### UI changes
- Scene panel: dropdown to select primitive type when adding objects
- Show mesh statistics (vertex count, triangle count) in the scene list

---

## Phase 2: Material System (Weeks 3–4)

**Goal**: Move from hardcoded BRDFs to a flexible material library with textures and parameters.

### Features
- **Texture support**: Albedo, normal, and roughness maps (2D textures, loaded from images)
- **Material library**: Named materials (wood, plastic, marble, etc.) with preset parameters
- **Advanced BRDFs**:
  - Oren-Nayar (brushed surfaces)
  - Plastic (diffuse + specular with Fresnel)
  - Subsurface scattering (thin translucent materials like skin/wax)
- **Procedural textures**: Checkerboard, noise-based patterns generated on GPU
- **Anisotropic roughness**: Separate roughness in X and Y directions (brushed metal)

### GPU changes
- Texture binding table + sampler array
- Material evaluation becomes a function that reads from textures
- Expand `properties` vec4 to store multiple roughness values

### UI changes
- Material editor panel: texture upload, parameter sliders
- Material preview thumbnail in the scene list
- Preset material browser

---

## Phase 3: Performance & Denoising (Weeks 5–6)

**Goal**: Accelerate convergence and maintain real-time interactivity.

### Features
- **BVH acceleration structure**: Build a bounding volume hierarchy on CPU, upload to GPU, use it in ray traversal instead of brute-force sphere checks
- **Adaptive sampling**: Pixels with high variance get more samples; converged pixels are skipped
- **Denoiser integration**: Post-process filter (e.g., Optix-style spatial denoiser, or ML-based via a separate model)
- **Progressive preview modes**:
  - Draft (2 bounces, 1 SPP): instant visual feedback
  - Standard (6 bounces, 4 SPP): typical real-time interaction
  - Quality (8 bounces, 16 SPP): offline renders

### GPU changes
- Add BVH node buffer + traversal loop in the compute shader
- Add per-pixel variance tracking for adaptive sampling
- Denoising can be a separate compute pass or offloaded to a library

### UI changes
- Preview mode selector (dropdown)
- Real-time frame rate display
- Performance graphs (convergence, rays/sec)
- Denoiser strength slider

---

## Phase 4: Advanced Effects (Weeks 7–8)

**Goal**: Support cinematic effects and environmental rendering.

### Features
- **Depth of field**: Thin-lens model with adjustable aperture and focal distance
- **Motion blur**: Per-object velocity vectors, temporal sampling
- **Volumetric effects**: Fog/mist (homogeneous or heterogeneous), caustics via photon mapping
- **Environment maps**: HDRI skies instead of procedural gradient (equirectangular textures)
- **Emissive area lights**: Use real emissive geometry instead of hardcoded point lights
- **Chromatic aberration**: Wavelength-dependent refraction for glass

### GPU changes
- Per-object velocity buffer for motion blur
- Volume density and phase function in compute shader
- Environment map lookup in sky sampling
- Medium/volume support in ray structure

### UI changes
- Camera settings: aperture f-stop, focal length
- Environment browser: load HDRI files
- Volume editor: add fog regions, set density
- Per-object motion vector UI

---

## Phase 5: Production Tools (Weeks 9–10)

**Goal**: Make the tool suitable for offline rendering and creative iteration.

### Features
- **Export pipeline**:
  - Multi-layer EXR (albedo, normal, depth, emission passes)
  - PNG/JPEG sequences for animation
  - Raw OpenEXR with full channel control
- **Undo/redo system**: Full history of scene edits, camera moves
- **Animation**: Keyframe curves for camera path, object movement, material parameters
- **Distributed rendering**: Render tiles on multiple devices (WebWorkers or network)
- **Render queue**: Batch render multiple scenes/settings
- **Metadata**: Embed render time, settings, scene hash in output files
- **Real-time link**: Live viewport that updates as you tweak parameters on a secondary monitor

### GPU changes
- Tile-based rendering (dispatch subsets of pixels, write to staging buffer)
- Per-frame metadata collection (convergence estimate, tile timings)

### UI changes
- Timeline panel for animation keyframes
- Export dialog with format and quality options
- Batch render queue manager
- Performance profiler (per-tile render time histogram)
- Render settings preset save/load

---

## Implementation order

1. **Phase 1** first—geometry support unlocks scene complexity
2. **Phase 3** next—performance makes phases 2+ interactive
3. **Phase 2** and **Phase 4** can run in parallel
4. **Phase 5** last—polish and production features

## Success metrics

- Phase 1: Render a furnished room (boxes, planes, triangle mesh)
- Phase 2: Photorealistic materials with textures
- Phase 3: Real-time interaction even with 10k+ triangles
- Phase 4: Depth of field + volumetric fog producing cinematic shots
- Phase 5: Export high-res offline renders in under 2 minutes per frame
