/**
 * WebGPU device initialization with macOS/Metal compatibility checks.
 */

export interface GPUContext {
  adapter: GPUAdapter
  device: GPUDevice
  format: GPUTextureFormat
}

export async function initWebGPU(): Promise<GPUContext> {
  if (!navigator.gpu) {
    throw new Error(
      'WebGPU not supported. Use Chrome 113+, Safari 18+, or Edge on macOS.',
    )
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  })

  if (!adapter) {
    throw new Error('No GPU adapter found. Check your browser and GPU drivers.')
  }

  // Log adapter info for debugging (property in modern browsers, method in older ones)
  const info = 'info' in adapter
    ? adapter.info
    : await (adapter as unknown as { requestAdapterInfo(): Promise<GPUAdapterInfo> }).requestAdapterInfo()
  console.log(
    `[WebRay] GPU: ${info.vendor} ${info.architecture} (${info.description})`,
  )

  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
      maxComputeWorkgroupSizeX: 8,
      maxComputeWorkgroupSizeY: 8,
    },
  })

  device.lost.then((info) => {
    console.error(`[WebRay] GPU device lost: ${info.message}`)
    if (info.reason !== 'destroyed') {
      // Could auto-reinitialize here
      console.error('[WebRay] Unrecoverable device loss.')
    }
  })

  const format = navigator.gpu.getPreferredCanvasFormat()

  return { adapter, device, format }
}
