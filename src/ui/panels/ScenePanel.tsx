import { useState } from 'react'
import { MaterialType, type SceneSphere } from '@/scene/types'

interface ScenePanelProps {
  spheres: SceneSphere[]
  onUpdate: (spheres: SceneSphere[]) => void
}

const MATERIAL_NAMES: Record<MaterialType, string> = {
  [MaterialType.Lambertian]: 'Diffuse',
  [MaterialType.Metal]: 'Metal',
  [MaterialType.Dielectric]: 'Glass',
  [MaterialType.Emissive]: 'Emissive',
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

export function ScenePanel({ spheres, onUpdate }: ScenePanelProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const updateSphere = (id: string, patch: Partial<SceneSphere>) => {
    onUpdate(spheres.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const addSphere = () => {
    const id = `sphere_${Date.now()}`
    onUpdate([
      ...spheres,
      {
        id,
        name: 'New Sphere',
        center: [0, 0.5, 0],
        radius: 0.5,
        albedo: [0.8, 0.3, 0.3],
        materialType: MaterialType.Lambertian,
        roughnessOrIor: 0,
        emissionStrength: 0,
      },
    ])
    setSelected(id)
  }

  const removeSphere = (id: string) => {
    onUpdate(spheres.filter((s) => s.id !== id))
    if (selected === id) setSelected(null)
  }

  const selectedSphere = spheres.find((s) => s.id === selected)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-200">Scene</h2>
        <button
          onClick={addSphere}
          className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white"
        >
          + Add
        </button>
      </div>

      {/* Sphere list */}
      <div className="flex-1 overflow-y-auto">
        {spheres.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`flex items-center justify-between px-2 py-1.5 cursor-pointer text-xs border-b border-zinc-800 ${
              selected === s.id ? 'bg-zinc-700' : 'hover:bg-zinc-800'
            }`}
          >
            <span className="text-zinc-200">{s.name}</span>
            <span className="text-zinc-500">{MATERIAL_NAMES[s.materialType]}</span>
          </div>
        ))}
      </div>

      {/* Selected sphere editor */}
      {selectedSphere && (
        <div className="border-t border-zinc-700 p-2 space-y-2">
          <input
            value={selectedSphere.name}
            onChange={(e) => updateSphere(selectedSphere.id, { name: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
          />

          <Vec3Input
            label="Pos"
            value={selectedSphere.center}
            onChange={(center) => updateSphere(selectedSphere.id, { center })}
          />

          <NumberInput
            label="Radius"
            value={selectedSphere.radius}
            onChange={(radius) => updateSphere(selectedSphere.id, { radius })}
            step={0.1}
            min={0.01}
          />

          <div className="flex items-center gap-2 text-xs">
            <span className="w-12 text-zinc-400">Color</span>
            <ColorInput
              value={selectedSphere.albedo}
              onChange={(albedo) => updateSphere(selectedSphere.id, { albedo })}
            />
            <select
              value={selectedSphere.materialType}
              onChange={(e) =>
                updateSphere(selectedSphere.id, { materialType: parseInt(e.target.value) as MaterialType })
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

          {selectedSphere.materialType === MaterialType.Metal && (
            <NumberInput
              label="Rough"
              value={selectedSphere.roughnessOrIor}
              onChange={(roughnessOrIor) => updateSphere(selectedSphere.id, { roughnessOrIor })}
              step={0.05}
              min={0}
              max={1}
            />
          )}

          {selectedSphere.materialType === MaterialType.Dielectric && (
            <NumberInput
              label="IOR"
              value={selectedSphere.roughnessOrIor}
              onChange={(roughnessOrIor) => updateSphere(selectedSphere.id, { roughnessOrIor })}
              step={0.05}
              min={1}
              max={3}
            />
          )}

          {selectedSphere.materialType === MaterialType.Emissive && (
            <NumberInput
              label="Power"
              value={selectedSphere.emissionStrength}
              onChange={(emissionStrength) => updateSphere(selectedSphere.id, { emissionStrength })}
              step={0.5}
              min={0}
            />
          )}

          <button
            onClick={() => removeSphere(selectedSphere.id)}
            className="w-full py-1 text-xs bg-red-900/50 hover:bg-red-800/50 rounded text-red-300"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
