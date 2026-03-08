/**
 * Simple OBJ file parser
 * Supports: v (vertex), vn (normal), f (faces with v, v//vn, v/vt/vn format)
 * Returns vertex positions and triangle indices
 */

export interface ParsedMesh {
  vertices: [number, number, number][]
  indices: number[]
}

export function parseOBJ(objText: string): ParsedMesh {
  const vertices: [number, number, number][] = []
  const indices: number[] = []

  const lines = objText.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]

    // Parse vertex position (v x y z)
    if (cmd === 'v') {
      const x = parseFloat(parts[1])
      const y = parseFloat(parts[2])
      const z = parseFloat(parts[3])
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        vertices.push([x, y, z])
      }
    }

    // Parse face (f v1 v2 v3 ...)
    // Supports formats:
    // - f 1 2 3 (just vertex indices)
    // - f 1//1 2//2 3//3 (vertex//normal)
    // - f 1/1/1 2/2/2 3/3/3 (vertex/texture/normal)
    if (cmd === 'f') {
      const faceVertices: number[] = []

      for (let i = 1; i < parts.length; i++) {
        const vertexStr = parts[i]
        const subParts = vertexStr.split('/')
        const vertexIndex = parseInt(subParts[0])

        // OBJ indices are 1-based, convert to 0-based
        if (!isNaN(vertexIndex)) {
          faceVertices.push(vertexIndex - 1)
        }
      }

      // Triangulate: if face has >3 verts, split into triangles (fan triangulation)
      for (let i = 1; i < faceVertices.length - 1; i++) {
        indices.push(faceVertices[0])
        indices.push(faceVertices[i])
        indices.push(faceVertices[i + 1])
      }
    }
  }

  // Validate: remove any invalid indices
  const validIndices = indices.filter((idx) => idx >= 0 && idx < vertices.length)

  return {
    vertices,
    indices: validIndices,
  }
}

/**
 * Calculate center of mass for a mesh
 */
export function getMeshCenter(vertices: [number, number, number][]): [number, number, number] {
  if (vertices.length === 0) {
    return [0, 0, 0]
  }

  let sumX = 0,
    sumY = 0,
    sumZ = 0
  for (const v of vertices) {
    sumX += v[0]
    sumY += v[1]
    sumZ += v[2]
  }

  const len = vertices.length
  return [sumX / len, sumY / len, sumZ / len]
}
