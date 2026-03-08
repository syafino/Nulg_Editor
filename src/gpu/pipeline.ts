/**
 * Compute pipeline setup for the path tracer.
 */

import { preprocessWGSL } from './shaders/preprocessor'
import rayTracerSrc from './shaders/ray_tracer.wgsl?raw'
import utilsSrc from './shaders/utils.wgsl?raw'
import materialsSrc from './shaders/materials.wgsl?raw'
import primitivesSrc from './shaders/primitives.wgsl?raw'

export function createRayTracePipeline(device: GPUDevice) {
  const shaderSource = preprocessWGSL(rayTracerSrc, {
    utils: utilsSrc,
    materials: materialsSrc,
    primitives: primitivesSrc,
  })

  const shaderModule = device.createShaderModule({
    label: 'WebRay Path Tracer',
    code: shaderSource,
  })

  const bindGroupLayout = device.createBindGroupLayout({
    label: 'WebRay Bind Group Layout',
    entries: [
      {
        // output_texture
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: 'write-only',
          format: 'rgba8unorm',
          viewDimension: '2d',
        },
      },
      {
        // accumulation buffer
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' },
      },
      {
        // uniforms
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' },
      },
      {
        // spheres
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' },
      },
      {
        // boxes
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' },
      },
      {
        // planes
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' },
      },
      {
        // scene_info
        binding: 6,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' },
      },
    ],
  })

  const pipelineLayout = device.createPipelineLayout({
    label: 'WebRay Pipeline Layout',
    bindGroupLayouts: [bindGroupLayout],
  })

  const pipeline = device.createComputePipeline({
    label: 'WebRay Compute Pipeline',
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  })

  return { pipeline, bindGroupLayout }
}
