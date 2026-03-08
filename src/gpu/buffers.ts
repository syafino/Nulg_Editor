/**
 * GPU buffer lifecycle management.
 * All uniform/storage buffers follow strict 16-byte alignment for Metal compatibility.
 */

export class ManagedBuffer {
  buffer: GPUBuffer
  private device: GPUDevice

  constructor(
    device: GPUDevice,
    descriptor: GPUBufferDescriptor,
  ) {
    this.device = device
    // Ensure size is 16-byte aligned
    const alignedSize = Math.ceil(descriptor.size / 16) * 16
    this.buffer = device.createBuffer({
      ...descriptor,
      size: alignedSize,
    })
  }

  write(data: ArrayBuffer | ArrayBufferView, offset = 0) {
    this.device.queue.writeBuffer(
      this.buffer,
      offset,
      data instanceof ArrayBuffer ? data : data.buffer,
      data instanceof ArrayBuffer ? 0 : data.byteOffset,
      data instanceof ArrayBuffer ? data.byteLength : data.byteLength,
    )
  }

  destroy() {
    this.buffer.destroy()
  }
}

/**
 * Uniform buffer for the path tracer.
 * Layout must exactly match the WGSL Uniforms struct (16-byte aligned).
 *
 *  camera_pos:        vec4f  (0)
 *  camera_forward:    vec4f  (16)
 *  camera_right:      vec4f  (32)
 *  camera_up:         vec4f  (48)
 *  resolution:        vec2f  (64)
 *  frame_count:       u32    (72)
 *  max_bounces:       u32    (76)
 *  samples_per_pixel: u32    (80)
 *  sky_intensity:     f32    (84)
 *  _pad0:             f32    (88)
 *  _pad1:             f32    (92)
 *  TOTAL:             96 bytes (6 x 16-byte aligned)
 */
export const UNIFORM_BUFFER_SIZE = 96

export interface UniformData {
  cameraPos: [number, number, number]
  fov: number
  cameraForward: [number, number, number]
  cameraRight: [number, number, number]
  cameraUp: [number, number, number]
  resolution: [number, number]
  frameCount: number
  maxBounces: number
  samplesPerPixel: number
  skyIntensity: number
}

export function writeUniforms(buffer: ManagedBuffer, data: UniformData) {
  const f = new Float32Array(UNIFORM_BUFFER_SIZE / 4)
  const u = new Uint32Array(f.buffer)

  // camera_pos (vec4f): xyz + fov
  f[0] = data.cameraPos[0]
  f[1] = data.cameraPos[1]
  f[2] = data.cameraPos[2]
  f[3] = data.fov

  // camera_forward (vec4f)
  f[4] = data.cameraForward[0]
  f[5] = data.cameraForward[1]
  f[6] = data.cameraForward[2]
  f[7] = 0

  // camera_right (vec4f)
  f[8] = data.cameraRight[0]
  f[9] = data.cameraRight[1]
  f[10] = data.cameraRight[2]
  f[11] = 0

  // camera_up (vec4f)
  f[12] = data.cameraUp[0]
  f[13] = data.cameraUp[1]
  f[14] = data.cameraUp[2]
  f[15] = 0

  // resolution (vec2f)
  f[16] = data.resolution[0]
  f[17] = data.resolution[1]

  // frame_count, max_bounces (u32)
  u[18] = data.frameCount
  u[19] = data.maxBounces

  // samples_per_pixel (u32), sky_intensity (f32)
  u[20] = data.samplesPerPixel
  f[21] = data.skyIntensity

  // _pad0, _pad1
  f[22] = 0
  f[23] = 0

  buffer.write(f)
}

/**
 * Sphere buffer layout (each sphere = 48 bytes = 3 x vec4f, 16-byte aligned).
 */
export const SPHERE_STRIDE = 48 // 3 * 16 bytes

export interface SphereData {
  center: [number, number, number]
  radius: number
  albedo: [number, number, number]
  materialType: number // 0=diffuse, 1=metal, 2=glass, 3=emissive
  roughnessOrIor: number
  emissionStrength: number
}

export function writeSpheres(buffer: ManagedBuffer, spheres: SphereData[]) {
  const f = new Float32Array(spheres.length * (SPHERE_STRIDE / 4))

  for (let i = 0; i < spheres.length; i++) {
    const s = spheres[i]
    const offset = i * 12 // 12 floats per sphere

    // center (vec4f): xyz + radius
    f[offset + 0] = s.center[0]
    f[offset + 1] = s.center[1]
    f[offset + 2] = s.center[2]
    f[offset + 3] = s.radius

    // albedo (vec4f): xyz + material_type
    f[offset + 4] = s.albedo[0]
    f[offset + 5] = s.albedo[1]
    f[offset + 6] = s.albedo[2]
    // material_type stored as float in the vec4
    f[offset + 7] = s.materialType

    // properties (vec4f): roughness/ior, emission_strength, pad, pad
    f[offset + 8] = s.roughnessOrIor
    f[offset + 9] = s.emissionStrength
    f[offset + 10] = 0
    f[offset + 11] = 0
  }

  buffer.write(f)
}

/**
 * Box buffer layout (each box = 64 bytes = 4 x vec4f, 16-byte aligned).
 */
export const BOX_STRIDE = 64 // 4 * 16 bytes

export interface BoxData {
  center: [number, number, number]
  size: [number, number, number]
  albedo: [number, number, number]
  materialType: number
  roughnessOrIor: number
  emissionStrength: number
}

export function writeBoxes(buffer: ManagedBuffer, boxes: BoxData[]) {
  const f = new Float32Array(boxes.length * (BOX_STRIDE / 4))

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]
    const offset = i * 16 // 16 floats per box

    // center (vec4f): xyz + pad
    f[offset + 0] = b.center[0]
    f[offset + 1] = b.center[1]
    f[offset + 2] = b.center[2]
    f[offset + 3] = 0

    // size (vec4f): xyz + pad
    f[offset + 4] = b.size[0]
    f[offset + 5] = b.size[1]
    f[offset + 6] = b.size[2]
    f[offset + 7] = 0

    // albedo (vec4f): xyz + material_type
    f[offset + 8] = b.albedo[0]
    f[offset + 9] = b.albedo[1]
    f[offset + 10] = b.albedo[2]
    f[offset + 11] = b.materialType

    // properties (vec4f): roughness/ior, emission_strength, pad, pad
    f[offset + 12] = b.roughnessOrIor
    f[offset + 13] = b.emissionStrength
    f[offset + 14] = 0
    f[offset + 15] = 0
  }

  buffer.write(f)
}

/**
 * Plane buffer layout (each plane = 64 bytes = 4 x vec4f, 16-byte aligned).
 */
export const PLANE_STRIDE = 64 // 4 * 16 bytes

export interface PlaneData {
  position: [number, number, number]
  normal: [number, number, number]
  albedo: [number, number, number]
  materialType: number
  roughnessOrIor: number
  emissionStrength: number
}

export function writePlanes(buffer: ManagedBuffer, planes: PlaneData[]) {
  const f = new Float32Array(planes.length * (PLANE_STRIDE / 4))

  for (let i = 0; i < planes.length; i++) {
    const p = planes[i]
    const offset = i * 16 // 16 floats per plane

    // position (vec4f): xyz + pad
    f[offset + 0] = p.position[0]
    f[offset + 1] = p.position[1]
    f[offset + 2] = p.position[2]
    f[offset + 3] = 0

    // normal (vec4f): xyz + pad (normalized)
    const nLen = Math.sqrt(p.normal[0] ** 2 + p.normal[1] ** 2 + p.normal[2] ** 2)
    const nX = nLen > 0 ? p.normal[0] / nLen : p.normal[0]
    const nY = nLen > 0 ? p.normal[1] / nLen : p.normal[1]
    const nZ = nLen > 0 ? p.normal[2] / nLen : p.normal[2]
    f[offset + 4] = nX
    f[offset + 5] = nY
    f[offset + 6] = nZ
    f[offset + 7] = 0

    // albedo (vec4f): xyz + material_type
    f[offset + 8] = p.albedo[0]
    f[offset + 9] = p.albedo[1]
    f[offset + 10] = p.albedo[2]
    f[offset + 11] = p.materialType

    // properties (vec4f): roughness/ior, emission_strength, pad, pad
    f[offset + 12] = p.roughnessOrIor
    f[offset + 13] = p.emissionStrength
    f[offset + 14] = 0
    f[offset + 15] = 0
  }

  buffer.write(f)
}

export function writeSceneInfo(
  buffer: ManagedBuffer,
  sphereCount: number,
  boxCount: number,
  planeCount: number,
) {
  const u = new Uint32Array(4) // 16 bytes aligned
  u[0] = sphereCount
  u[1] = boxCount
  u[2] = planeCount
  u[3] = 0 // padding
  buffer.write(u)
}
