export enum MaterialType {
  Lambertian = 0,
  Metal = 1,
  Dielectric = 2,
  Emissive = 3,
}

export interface SceneSphere {
  id: string
  name: string
  center: [number, number, number]
  radius: number
  albedo: [number, number, number]
  materialType: MaterialType
  roughnessOrIor: number
  emissionStrength: number
}

export interface Scene {
  name: string
  spheres: SceneSphere[]
}
