import { useState } from 'react'
import { MaterialType, PrimitiveType, type ScenePrimitive, type SceneSphere, type SceneBox, type ScenePlane, type SceneMesh } from '@/scene/types'

interface ScenePanelProps {
  primitives: ScenePrimitive[]
  onUpdate: (primitives: ScenePrimitive[]) => void
}

const MATERIAL_NAMES: Record<MaterialType, string> = {
  [MaterialType.Lambertian]: 'Diffuse',
  [MaterialType.Metal]: 'Metal',
  [MaterialType.Dielectric]: 'Glass',
  [MaterialType.Emissive]: 'Emissive',
}

const PRIMITIVE_TYPE_NAMES: Record<PrimitiveType, string> = {
  [PrimitiveType.Sphere]: 'Sphere',
  [PrimitiveType.Box]: 'Box',
  [PrimitiveType.Plane]: 'Plane',
  [PrimitiveType.Mesh]: 'Mesh',
}

function ColorInput({ value, onChange }: { value: [number, number, number]; onChange: (c: [number, number, number]) => void }) {
  const hex = '#' + value.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
  return (
    <input
      type="color"
      value={hex}
      className="w-8 h-6 cursor-pointer border border-zinc-600 rounded"
      onChange={(e) => {
        const h = e.target.value
        onChange([
          parseInt(h.slice(1, 3), 16) / 255,
          parseInt(h.slice(3, 5), 16) / 255,
          parseInt(h.slice(5, 7), 16) / 255,
        ])
      }}
    />
  )
}

function NumberInput({
  value,
  onChange,
  step = 0.1,
  min,
  max,
  label,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-12 text-zinc-400">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        className="w-16 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-white"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </label>
  )
}

function Vec3Input({
  value,
  onChange,
  label,
}: {
  value: [number, number, number]
  onChange: (v: [number, number, number]) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="w-12 text-zinc-400">{label}</span>
      {(['x', 'y', 'z'] as const).map((axis, i) => (
        <input
          key={axis}
          type="number"
          value={value[i]}
          step={0.1}
          className="w-14 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-white"
          onChange={(e) => {
            const next = [...value] as [number, number, number]
            next[i] = parseFloat(e.target.value) || 0
            onChange(next)
          }}
        />
      ))}
    </div>
  )
}

export function ScenePanel({ primitives, onUpdate }: ScenePanelProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const updatePrimitive = (id: string, patch: Partial<ScenePrimitive>) => {
    onUpdate(primitives.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const addPrimitive = (type: PrimitiveType) => {
    const id = `${PRIMITIVE_TYPE_NAMES[type].toLowerCase()}_${Date.now()}`
    let newPrimitive: ScenePrimitive

    switch (type) {
      case PrimitiveType.Sphere:
        newPrimitive = {
          id,
          type: PrimitiveType.Sphere,
          name: 'New Sphere',
          center: [0, 0.5, 0],
          radius: 0.5,
          albedo: [0.8, 0.3, 0.3],
          materialType: MaterialType.Lambertian,
          roughnessOrIor: 0,
          emissionStrength: 0,
        } as SceneSphere
        break
      case PrimitiveType.Box:
        newPrimitive = {
          id,
          type: PrimitiveType.Box,
          name: 'New Box',
          center: [0, 0.5, 0],
          size: [1, 1, 1],
          albedo: [0.8, 0.3, 0.3],
          materialType: MaterialType.Lambertian,
          roughnessOrIor: 0,
          emissionStrength: 0,
        } as SceneBox
        break
      case PrimitiveType.Plane:
        newPrimitive = {
          id,
          type: PrimitiveType.Plane,
          name: 'New Plane',
          position: [0, 0, 0],
          normal: [0, 1, 0],
          albedo: [0.5, 0.5, 0.5],
          materialType: MaterialType.Lambertian,
          roughnessOrIor: 0,
          emissionStrength: 0,
        } as ScenePlane
        break
      case PrimitiveType.Mesh:
        newPrimitive = {
          id,
          type: PrimitiveType.Mesh,
          name: 'New Mesh',
          vertices: [],
          indices: [],
          center: [0, 0.5, 0],
          albedo: [0.8, 0.3, 0.3],
          materialType: MaterialType.Lambertian,
          roughnessOrIor: 0,
          emissionStrength: 0,
        } as SceneMesh
        break
    }

    onUpdate([...primitives, newPrimitive])
    setSelected(id)
  }

  const removePrimitive = (id: string) => {
    onUpdate(primitives.filter((p) => p.id !== id))
    if (selected === id) setSelected(null)
  }

  const selectedPrimitive = primitives.find((p) => p.id === selected)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-200">Scene</h2>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white"
          >
            + Add
          </button>
          {showAddMenu && (
            <div className="absolute right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded shadow-lg z-50">
              {[PrimitiveType.Sphere, PrimitiveType.Box, PrimitiveType.Plane].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    addPrimitive(type)
                    setShowAddMenu(false)
                  }}
                  className="block w-full px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 text-left"
                >
                  {PRIMITIVE_TYPE_NAMES[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Primitive list */}
      <div className="flex-1 overflow-y-auto">
        {primitives.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`flex items-center justify-between px-2 py-1.5 cursor-pointer text-xs border-b border-zinc-800 ${
              selected === p.id ? 'bg-zinc-700' : 'hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">{PRIMITIVE_TYPE_NAMES[p.type]}</span>
              <span className="text-zinc-200">{p.name}</span>
            </div>
            <span className="text-zinc-500">{MATERIAL_NAMES[p.materialType]}</span>
          </div>
        ))}
      </div>

      {/* Selected primitive editor */}
      {selectedPrimitive && (
        <div className="border-t border-zinc-700 p-2 space-y-2 overflow-y-auto max-h-96">
          <input
            value={selectedPrimitive.name}
            onChange={(e) => updatePrimitive(selectedPrimitive.id, { name: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
          />

          {/* Sphere properties */}
          {selectedPrimitive.type === PrimitiveType.Sphere && (
            <>
              <Vec3Input
                label="Pos"
                value={(selectedPrimitive as SceneSphere).center}
                onChange={(center) => updatePrimitive(selectedPrimitive.id, { center })}
              />
              <NumberInput
                label="Radius"
                value={(selectedPrimitive as SceneSphere).radius}
                onChange={(radius) => updatePrimitive(selectedPrimitive.id, { radius })}
                step={0.1}
                min={0.01}
              />
            </>
          )}

          {/* Box properties */}
          {selectedPrimitive.type === PrimitiveType.Box && (
            <>
              <Vec3Input
                label="Pos"
                value={(selectedPrimitive as SceneBox).center}
                onChange={(center) => updatePrimitive(selectedPrimitive.id, { center })}
              />
              <Vec3Input
                label="Size"
                value={(selectedPrimitive as SceneBox).size}
                onChange={(size) => updatePrimitive(selectedPrimitive.id, { size })}
              />
            </>
          )}

          {/* Plane properties */}
          {selectedPrimitive.type === PrimitiveType.Plane && (
            <>
              <Vec3Input
                label="Pos"
                value={(selectedPrimitive as ScenePlane).position}
                onChange={(position) => updatePrimitive(selectedPrimitive.id, { position })}
              />
              <Vec3Input
                label="Normal"
                value={(selectedPrimitive as ScenePlane).normal}
                onChange={(normal) => {
                  const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2)
                  if (len > 0) {
                    updatePrimitive(selectedPrimitive.id, {
                      normal: [normal[0] / len, normal[1] / len, normal[2] / len],
                    })
                  }
                }}
              />
            </>
          )}

          {/* Mesh properties */}
          {selectedPrimitive.type === PrimitiveType.Mesh && (
            <>
              <Vec3Input
                label="Pos"
                value={(selectedPrimitive as SceneMesh).center}
                onChange={(center) => updatePrimitive(selectedPrimitive.id, { center })}
              />
              <div className="text-xs text-zinc-500">
                Vertices: {(selectedPrimitive as SceneMesh).vertices.length}
                <br />
                Triangles: {(selectedPrimitive as SceneMesh).indices.length / 3}
              </div>
            </>
          )}

          {/* Common material properties */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-12 text-zinc-400">Color</span>
            <ColorInput
              value={selectedPrimitive.albedo}
              onChange={(albedo) => updatePrimitive(selectedPrimitive.id, { albedo })}
            />
            <select
              value={selectedPrimitive.materialType}
              onChange={(e) =>
                updatePrimitive(selectedPrimitive.id, { materialType: parseInt(e.target.value) as MaterialType })
              }
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-1 py-0.5 text-white"
            >
              {Object.entries(MATERIAL_NAMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {selectedPrimitive.materialType === MaterialType.Metal && (
            <NumberInput
              label="Rough"
              value={selectedPrimitive.roughnessOrIor}
              onChange={(roughnessOrIor) => updatePrimitive(selectedPrimitive.id, { roughnessOrIor })}
              step={0.05}
              min={0}
              max={1}
            />
          )}

          {selectedPrimitive.materialType === MaterialType.Dielectric && (
            <NumberInput
              label="IOR"
              value={selectedPrimitive.roughnessOrIor}
              onChange={(roughnessOrIor) => updatePrimitive(selectedPrimitive.id, { roughnessOrIor })}
              step={0.05}
              min={1}
              max={3}
            />
          )}

          {selectedPrimitive.materialType === MaterialType.Emissive && (
            <NumberInput
              label="Power"
              value={selectedPrimitive.emissionStrength}
              onChange={(emissionStrength) => updatePrimitive(selectedPrimitive.id, { emissionStrength })}
              step={0.5}
              min={0}
            />
          )}

          <button
            onClick={() => removePrimitive(selectedPrimitive.id)}
            className="w-full py-1 text-xs bg-red-900/50 hover:bg-red-800/50 rounded text-red-300"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
