export interface ModelConfig {
  id: string
  label: string
  file: string
  camera: {
    position: [number, number, number]
    fov: number
  }
  model: {
    scale: number
    position: [number, number, number]
    rotation: [number, number, number]
  }
  dead: {
    rotation: [number, number, number]
    position: [number, number, number]
  }
}

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "rat",
    label: "Крыса",
    file: "/models/rat.glb",
    camera: { position: [3.5, 1, 1], fov: 48 },
    model: { scale: 1.15, position: [0, -0.8, 0], rotation: [0, 0, 0] },
    dead: { rotation: [-Math.PI / 2.5, 0, 0.3], position: [0, -1.0, 0] },
  },
  {
    id: "dingus",
    label: "Дингус",
    file: "/models/dingus.glb",
    camera: { position: [3.2, 1.2, 2.8], fov: 60 },
    model: { scale: 1, position: [0, -0.8, 0], rotation: [0, 1.6, 0] },
    dead: { rotation: [-Math.PI / 2.5, 0, 0.3], position: [0, -1.1, 0] },
  },
]
