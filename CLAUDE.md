# CLAUDE.md — WebRay Editor

## Project overview

WebRay Editor is a WebGPU path tracer with a React scene editor. The GPU engine is in `src/gpu/`, the UI is in `src/ui/`, and scene data types live in `src/scene/`.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Type-check (`tsc -b`) then build with Vite
- `npm run lint` — ESLint
- `npx tsc --noEmit` — Type-check only

## Tech stack

- TypeScript (strict mode) with Vite
- React 19 + Tailwind CSS 3
- WebGPU compute shaders written in WGSL
- wgpu-matrix for GPU-aligned math
- Path aliases: `@/` maps to `src/`

## Architecture rules

### GPU buffer alignment (CRITICAL)
All uniform and storage buffer structs MUST follow 16-byte (vec4f) alignment for Metal/macOS compatibility. The `ManagedBuffer` class in `src/gpu/buffers.ts` enforces this by rounding up sizes. When adding new fields to GPU structs, pad to 16-byte boundaries. The WGSL struct layout and the TypeScript `writeUniforms`/`writeSpheres` functions must match exactly.

### Shader composition
WGSL shaders use a custom `#include "module"` preprocessor (`src/gpu/shaders/preprocessor.ts`). Modules are passed as a string map at pipeline creation time in `pipeline.ts`. Do NOT use ES import for `.wgsl` files within shaders — only the top-level `ray_tracer.wgsl` is imported as a raw string via Vite's `?raw` suffix.

### Compute-only rendering
Path tracing uses a compute pipeline, NOT a fragment shader. The compute shader writes to a `texture_storage_2d<rgba8unorm, write>`. A separate blit render pass (`src/gpu/blit.ts`) copies this to the canvas. Do not attempt to merge these into a single pass.

### Progressive accumulation
The renderer accumulates samples across frames via an `accumulation` storage buffer. `frame_count` controls blending weight. Any change to camera, scene, or render settings MUST call `resetAccumulation()` to restart from frame 0.

### Resource lifecycle
GPU resources (GPUBuffer, GPUTexture, GPUBindGroup) must be explicitly destroyed when replaced. See `resize()` and `destroy()` in `renderer.ts`. Never let old buffers leak — always destroy before recreating.

## File structure

- `src/gpu/context.ts` — WebGPU device init, prefers high-performance adapter
- `src/gpu/buffers.ts` — Buffer types, uniform/sphere layout, write helpers
- `src/gpu/pipeline.ts` — Compute pipeline creation, shader preprocessing
- `src/gpu/blit.ts` — Fullscreen triangle blit (rgba8 → canvas bgra8)
- `src/gpu/renderer.ts` — Main render loop, camera math, frame dispatch
- `src/gpu/shaders/ray_tracer.wgsl` — Main compute kernel
- `src/gpu/shaders/materials.wgsl` — Material scattering functions
- `src/gpu/shaders/utils.wgsl` — RNG (PCG hash), sampling utilities
- `src/scene/types.ts` — MaterialType enum, SceneSphere interface
- `src/scene/defaults.ts` — Default 7-sphere demo scene
- `src/ui/Viewport.tsx` — Canvas element with pointer event camera controls
- `src/ui/panels/ScenePanel.tsx` — Sphere list and property editor
- `src/ui/panels/CameraPanel.tsx` — Camera position/orientation/FOV
- `src/ui/panels/RenderPanel.tsx` — Bounce depth, SPP, sky intensity
- `src/hooks/useWebGPU.ts` — GPU context React hook
- `src/hooks/useRenderer.ts` — Renderer lifecycle React hook

## Conventions

- Do not add comments or docstrings to code that wasn't changed
- Keep WGSL structs and their TypeScript write functions in sync — if you change one, change the other
- Material types: 0 = Lambertian, 1 = Metal, 2 = Dielectric, 3 = Emissive
- Max 128 spheres (hardcoded in renderer.ts)
- Workgroup size is 8x8x1 — must match both the WGSL `@workgroup_size` and the dispatch calculation in `renderFrame()`
- Canvas uses `devicePixelRatio` capped at 2x (set in `useRenderer.ts`)
