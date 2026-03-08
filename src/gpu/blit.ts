/**
 * Fullscreen blit pipeline: copies the compute output texture to the canvas.
 * Needed because compute outputs rgba8unorm but canvas is typically bgra8unorm on Metal.
 */

const BLIT_SHADER = /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var src_sampler: sampler;

struct VSOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> VSOut {
    // Fullscreen triangle
    var positions = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(3.0, -1.0),
        vec2f(-1.0, 3.0),
    );
    let p = positions[idx];
    var out: VSOut;
    out.pos = vec4f(p, 0.0, 1.0);
    out.uv = (p + 1.0) * 0.5;
    out.uv.y = 1.0 - out.uv.y; // flip Y
    return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
    return textureSample(src, src_sampler, in.uv);
}
`

export function createBlitPipeline(device: GPUDevice, canvasFormat: GPUTextureFormat) {
  const module = device.createShaderModule({
    label: 'Blit Shader',
    code: BLIT_SHADER,
  })

  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Blit BGL',
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ],
  })

  const pipeline = device.createRenderPipeline({
    label: 'Blit Pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module, entryPoint: 'vs' },
    fragment: {
      module,
      entryPoint: 'fs',
      targets: [{ format: canvasFormat }],
    },
  })

  const sampler = device.createSampler({
    magFilter: 'nearest',
    minFilter: 'nearest',
  })

  return { pipeline, bindGroupLayout, sampler }
}
