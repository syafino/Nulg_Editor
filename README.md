# WebRay Editor

A real-time path tracer running entirely on the GPU via WebGPU, wrapped in a React scene editor. Built as a learning project for GPU compute programming.

## What it does

The app renders a 3D scene using physically-based path tracing — the same technique used in film production renderers. Every pixel casts rays that bounce around the scene, simulating light transport. All of this runs in a WebGPU compute shader on your GPU.

The editor UI lets you add/remove spheres, change materials (diffuse, metal, glass, emissive), adjust camera position, and tweak render settings. The image progressively refines over time as more samples accumulate.

## Architecture

```
src/
├── gpu/                    # WebGPU engine (the core)
│   ├── shaders/
│   │   ├── ray_tracer.wgsl     # Compute kernel — path tracing per-pixel
│   │   ├── materials.wgsl      # BRDF scattering (Lambertian, Metal, Glass, Emissive)
│   │   ├── utils.wgsl          # PCG random number generation, hemisphere sampling
│   │   └── preprocessor.ts     # #include system for composing WGSL modules
│   ├── context.ts              # WebGPU device initialization
│   ├── buffers.ts              # GPU buffer management (16-byte aligned for Metal)
│   ├── pipeline.ts             # Compute pipeline creation
│   ├── blit.ts                 # Fullscreen blit pass (compute output → canvas)
│   └── renderer.ts             # Render loop, progressive accumulation, camera
├── scene/
│   ├── types.ts                # SceneSphere, MaterialType
│   └── defaults.ts             # Default demo scene (7 spheres)
├── ui/
│   ├── Viewport.tsx            # Canvas with orbit/pan/zoom mouse controls
│   └── panels/
│       ├── ScenePanel.tsx      # Sphere list + property editor
│       ├── CameraPanel.tsx     # Camera position, FOV
│       └── RenderPanel.tsx     # Bounce depth, samples per pixel, sky intensity
├── hooks/
│   ├── useWebGPU.ts            # GPU context lifecycle
│   └── useRenderer.ts         # Renderer lifecycle + scene/camera bindings
├── App.tsx                     # 3-column layout: scene panel | viewport | settings
└── main.tsx                    # Entry point
```

### How the renderer works

1. **Compute pass**: The `ray_tracer.wgsl` shader dispatches one thread per pixel (8x8 workgroups). Each thread casts a ray, bounces it through the scene, and accumulates the result into a storage buffer.
2. **Progressive accumulation**: Each frame blends the new sample with all previous frames. The image converges as `frame_count` increases. Any scene or camera change resets accumulation.
3. **Blit pass**: A fullscreen triangle render pass copies the `rgba8unorm` compute output to the canvas texture (which is `bgra8unorm` on Metal/macOS).

### Key design constraints

- **Compute-only tracing**: All ray work is in a compute shader, not a fragment shader. This gives full control over accumulation and will support BVH traversal better.
- **16-byte alignment**: Every GPU struct is padded to 16-byte boundaries. This is required for correctness on the Metal backend (macOS). See `buffers.ts` for the exact layout.
- **WGSL preprocessor**: Shaders use `#include "module"` directives that are resolved at pipeline creation time. This keeps WGSL files modular without runtime overhead.

## Requirements

- **Browser**: Chrome 113+, Safari 18+, or Edge (must support WebGPU)
- **Node.js**: 18+
- Works on any GPU — no NVIDIA required. Optimized for Apple Silicon / Metal.

## Getting started

```bash
npm install
npm run dev
```

Open the local URL in Chrome or Safari. You should see the default scene rendering immediately.

## Controls

- **Left-drag**: Orbit camera
- **Right-drag**: Pan camera
- **Scroll**: Zoom in/out
- Left sidebar: Add, select, and edit spheres
- Right sidebar: Camera and render settings

## Tech stack

| Layer | Tech |
|-------|------|
| Build | Vite |
| UI | React 19 + Tailwind CSS 3 |
| Language | TypeScript (strict) |
| GPU | WebGPU + WGSL compute shaders |
| Math | wgpu-matrix |
