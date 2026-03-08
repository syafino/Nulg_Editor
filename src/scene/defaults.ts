import { MaterialType, PrimitiveType, type Scene } from './types'

let idCounter = 0
function nextId(prefix = 'obj') {
  return `${prefix}_${idCounter++}`
}

export const DEFAULT_SCENE: Scene = {
  name: 'Default Scene',
  primitives: [
    // Ground plane
    {
      id: nextId('plane'),
      type: PrimitiveType.Plane,
      name: 'Ground',
      position: [0, -0.5, 0],
      normal: [0, 1, 0],
      albedo: [0.4, 0.4, 0.4],
      materialType: MaterialType.Lambertian,
      roughnessOrIor: 0,
      emissionStrength: 0,
    },
    // Center: diffuse blue sphere
    {
      id: nextId('sphere'),
      type: PrimitiveType.Sphere,
      name: 'Blue Sphere',
      center: [0, 0.5, 0],
      radius: 1.0,
      albedo: [0.4, 0.5, 0.9],
      materialType: MaterialType.Lambertian,
      roughnessOrIor: 0,
      emissionStrength: 0,
    },
    // Left: glass sphere
    {
      id: nextId('sphere'),
      type: PrimitiveType.Sphere,
      name: 'Glass Sphere',
      center: [-2.2, 0.5, 0],
      radius: 1.0,
      albedo: [1.0, 1.0, 1.0],
      materialType: MaterialType.Dielectric,
      roughnessOrIor: 1.5,
      emissionStrength: 0,
    },
    // Right: metal box
    {
      id: nextId('box'),
      type: PrimitiveType.Box,
      name: 'Gold Box',
      center: [2.2, 0.5, 0],
      size: [1.0, 1.0, 1.0],
      albedo: [0.8, 0.6, 0.2],
      materialType: MaterialType.Metal,
      roughnessOrIor: 0.05,
      emissionStrength: 0,
    },
    // Overhead light
    {
      id: nextId('sphere'),
      type: PrimitiveType.Sphere,
      name: 'Light',
      center: [0, 4, -1],
      radius: 1.5,
      albedo: [1.0, 0.95, 0.8],
      materialType: MaterialType.Emissive,
      roughnessOrIor: 0,
      emissionStrength: 5.0,
    },
    // Small red sphere
    {
      id: nextId('sphere'),
      type: PrimitiveType.Sphere,
      name: 'Red Marble',
      center: [0.8, -0.15, 1.5],
      radius: 0.35,
      albedo: [0.9, 0.15, 0.15],
      materialType: MaterialType.Lambertian,
      roughnessOrIor: 0,
      emissionStrength: 0,
    },
    // Brushed chrome sphere
    {
      id: nextId('sphere'),
      type: PrimitiveType.Sphere,
      name: 'Chrome Sphere',
      center: [-0.9, -0.1, 1.8],
      radius: 0.4,
      albedo: [0.9, 0.9, 0.9],
      materialType: MaterialType.Metal,
      roughnessOrIor: 0.3,
      emissionStrength: 0,
    },
  ],
}
