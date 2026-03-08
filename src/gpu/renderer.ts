/**
 * Main renderer: manages the render loop, progressive accumulation,
 * and texture-to-canvas blitting.
 */

import type { GPUContext } from './context'
import { createRayTracePipeline } from './pipeline'
import { createBlitPipeline } from './blit'
import {
  ManagedBuffer,
  UNIFORM_BUFFER_SIZE,
  SPHERE_STRIDE,
  writeUniforms,
  writeSpheres,
  writeSceneInfo,
} from './buffers'
import type { UniformData, SphereData } from './buffers'

const MAX_SPHERES = 128
const WORKGROUP_SIZE = 8

export interface RenderSettings {
  maxBounces: number
  samplesPerPixel: number
  skyIntensity: number
}

export class PathTraceRenderer {
  private device: GPUDevice
  private context: GPUCanvasContext
  private format: GPUTextureFormat
  private pipeline: GPUComputePipeline
  private bindGroupLayout: GPUBindGroupLayout

  // Blit pipeline (compute texture -> canvas)
  private blitPipeline: GPURenderPipeline
  private blitBindGroupLayout: GPUBindGroupLayout
  private blitSampler: GPUSampler
  private blitBindGroup: GPUBindGroup | null = null

  // GPU resources
  private uniformBuffer: ManagedBuffer
  private sphereBuffer: ManagedBuffer
  private sceneInfoBuffer: ManagedBuffer
  private accumulationBuffer: ManagedBuffer | null = null
  private outputTexture: GPUTexture | null = null
  private bindGroup: GPUBindGroup | null = null

  // State
  private width = 0
  private height = 0
  private frameCount = 0
  private animFrameId: number | null = null
  private needsReset = true

  // Scene data
  private spheres: SphereData[] = []
  private camera = {
    pos: [0, 1, 5] as [number, number, number],
    yaw: Math.PI,
    pitch: 0,
    fov: Math.PI / 3, // 60 degrees
  }
  private settings: RenderSettings = {
    maxBounces: 6,
    samplesPerPixel: 1,
    skyIntensity: 0.8,
  }

  constructor(gpuCtx: GPUContext, canvas: HTMLCanvasElement) {
    this.device = gpuCtx.device
    this.format = gpuCtx.format

    this.context = canvas.getContext('webgpu')!
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    })

    const { pipeline, bindGroupLayout } = createRayTracePipeline(this.device)
    this.pipeline = pipeline
    this.bindGroupLayout = bindGroupLayout

    const blit = createBlitPipeline(this.device, this.format)
    this.blitPipeline = blit.pipeline
    this.blitBindGroupLayout = blit.bindGroupLayout
    this.blitSampler = blit.sampler

    // Create fixed-size buffers
    this.uniformBuffer = new ManagedBuffer(this.device, {
      label: 'Uniforms',
      size: UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.sphereBuffer = new ManagedBuffer(this.device, {
      label: 'Spheres',
      size: MAX_SPHERES * SPHERE_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    this.sceneInfoBuffer = new ManagedBuffer(this.device, {
      label: 'SceneInfo',
      size: 16, // 4 x u32, 16-byte aligned
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
  }

  setScene(spheres: SphereData[]) {
    this.spheres = spheres.slice(0, MAX_SPHERES)
    writeSpheres(this.sphereBuffer, this.spheres)
    writeSceneInfo(this.sceneInfoBuffer, this.spheres.length)
    this.resetAccumulation()
  }

  setCamera(pos: [number, number, number], yaw: number, pitch: number, fov?: number) {
    this.camera.pos = pos
    this.camera.yaw = yaw
    this.camera.pitch = pitch
    if (fov !== undefined) this.camera.fov = fov
    this.resetAccumulation()
  }

  setSettings(settings: Partial<RenderSettings>) {
    Object.assign(this.settings, settings)
    this.resetAccumulation()
  }

  getCamera() {
    return { ...this.camera }
  }

  getSettings() {
    return { ...this.settings }
  }

  getFrameCount() {
    return this.frameCount
  }

  resetAccumulation() {
    this.frameCount = 0
    this.needsReset = true
  }

  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height

    // Recreate size-dependent resources
    this.outputTexture?.destroy()
    this.accumulationBuffer?.destroy()

    this.outputTexture = this.device.createTexture({
      label: 'Output Texture',
      size: { width, height },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
    })

    this.accumulationBuffer = new ManagedBuffer(this.device, {
      label: 'Accumulation',
      size: width * height * 16, // vec4f per pixel
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    this.rebuildBindGroup()
    this.resetAccumulation()
  }

  private rebuildBindGroup() {
    if (!this.outputTexture || !this.accumulationBuffer) return

    this.bindGroup = this.device.createBindGroup({
      label: 'WebRay Bind Group',
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: this.outputTexture.createView() },
        { binding: 1, resource: { buffer: this.accumulationBuffer.buffer } },
        { binding: 2, resource: { buffer: this.uniformBuffer.buffer } },
        { binding: 3, resource: { buffer: this.sphereBuffer.buffer } },
        { binding: 4, resource: { buffer: this.sceneInfoBuffer.buffer } },
      ],
    })

    this.blitBindGroup = this.device.createBindGroup({
      label: 'Blit Bind Group',
      layout: this.blitBindGroupLayout,
      entries: [
        { binding: 0, resource: this.outputTexture.createView() },
        { binding: 1, resource: this.blitSampler },
      ],
    })
  }

  private computeCameraVectors(): {
    forward: [number, number, number]
    right: [number, number, number]
    up: [number, number, number]
  } {
    const { yaw, pitch } = this.camera
    const forward: [number, number, number] = [
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ]
    const worldUp: [number, number, number] = [0, 1, 0]
    // right = normalize(cross(forward, worldUp))
    const right: [number, number, number] = [
      forward[1] * worldUp[2] - forward[2] * worldUp[1],
      forward[2] * worldUp[0] - forward[0] * worldUp[2],
      forward[0] * worldUp[1] - forward[1] * worldUp[0],
    ]
    const rLen = Math.sqrt(right[0] ** 2 + right[1] ** 2 + right[2] ** 2)
    right[0] /= rLen; right[1] /= rLen; right[2] /= rLen

    // up = cross(right, forward)
    const up: [number, number, number] = [
      right[1] * forward[2] - right[2] * forward[1],
      right[2] * forward[0] - right[0] * forward[2],
      right[0] * forward[1] - right[1] * forward[0],
    ]

    return { forward, right, up }
  }

  private renderFrame() {
    if (!this.bindGroup || !this.outputTexture || !this.blitBindGroup) return

    const { forward, right, up } = this.computeCameraVectors()

    const uniformData: UniformData = {
      cameraPos: this.camera.pos,
      fov: this.camera.fov,
      cameraForward: forward,
      cameraRight: right,
      cameraUp: up,
      resolution: [this.width, this.height],
      frameCount: this.frameCount,
      maxBounces: this.settings.maxBounces,
      samplesPerPixel: this.settings.samplesPerPixel,
      skyIntensity: this.settings.skyIntensity,
    }
    writeUniforms(this.uniformBuffer, uniformData)

    const encoder = this.device.createCommandEncoder({
      label: 'WebRay Frame',
    })

    // Compute pass: path trace
    const computePass = encoder.beginComputePass({ label: 'Path Trace' })
    computePass.setPipeline(this.pipeline)
    computePass.setBindGroup(0, this.bindGroup)
    computePass.dispatchWorkgroups(
      Math.ceil(this.width / WORKGROUP_SIZE),
      Math.ceil(this.height / WORKGROUP_SIZE),
    )
    computePass.end()

    // Render pass: blit compute texture to canvas (handles format conversion)
    const canvasTexture = this.context.getCurrentTexture()
    const renderPass = encoder.beginRenderPass({
      label: 'Blit to Canvas',
      colorAttachments: [
        {
          view: canvasTexture.createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    })
    renderPass.setPipeline(this.blitPipeline)
    renderPass.setBindGroup(0, this.blitBindGroup)
    renderPass.draw(3) // fullscreen triangle
    renderPass.end()

    this.device.queue.submit([encoder.finish()])
    this.frameCount++
  }

  start() {
    if (this.animFrameId !== null) return

    const loop = () => {
      this.renderFrame()
      this.animFrameId = requestAnimationFrame(loop)
    }
    this.animFrameId = requestAnimationFrame(loop)
  }

  stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }

  destroy() {
    this.stop()
    this.uniformBuffer.destroy()
    this.sphereBuffer.destroy()
    this.sceneInfoBuffer.destroy()
    this.accumulationBuffer?.destroy()
    this.outputTexture?.destroy()
  }
}
