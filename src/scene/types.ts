export enum MaterialType {
  Lambertian = 0,
  Metal = 1,
  Dielectric = 2,
  Emissive = 3,
}

export enum PrimitiveType {
  Sphere = 0,
  Box = 1,
  Plane = 2,
  Mesh = 3,
}

// ─── Primitive Interfaces ───

export interface SceneSphere {
  id: string
  type: PrimitiveType.Sphere
  name: string
  center: [number, number, number]
  radius: number
  albedo: [number, number, number]
  materialType: MaterialType
  roughnessOrIor: number
  emissionStrength: number
}

export interface SceneBox {
  id: string
  type: PrimitiveType.Box
  name: string
  center: [number, number, number]
  size: [number, number, number] // width, height, depth
  albedo: [number, number, number]
  materialType: MaterialType
  roughnessOrIor: number
  emissionStrength: number
}

export interface ScenePlane {
  id: string
  type: PrimitiveType.Plane
  name: string
  position: [number, number, number]
  normal: [number, number, number]
  albedo: [number, number, number]
  materialType: MaterialType
  roughnessOrIor: number
  emissionStrength: number
}

export interface SceneMesh {
  id: string
  type: PrimitiveType.Mesh
  name: string
  vertices: [number, number, number][] // list of vertex positions
  indices: number[] // triangle indices
  center: [number, number, number] // for UI positioning
  albedo: [number, number, number]
  materialType: MaterialType
  roughnessOrIor: number
  emissionStrength: number
}

export type ScenePrimitive = SceneSphere | SceneBox | ScenePlane | SceneMesh

export interface Scene {
  name: string
  primitives: ScenePrimitive[]
}
