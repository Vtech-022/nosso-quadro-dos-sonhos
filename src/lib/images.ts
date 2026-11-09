export interface ProcessedImage {
  full: Blob
  thumb: Blob
  width: number
  height: number
}

const MAX_FULL = 2200
const MAX_THUMB = 760

async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; close?: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() }
    } catch { /* tenta via <img> */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('Não foi possível ler esta imagem. Use JPG, PNG ou WebP.'))
      i.src = url
    })
    return { src: img, w: img.naturalWidth, h: img.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao preparar a imagem.'))), 'image/jpeg', quality),
  )
}

function render(src: CanvasImageSource, w: number, h: number, max: number, quality: number) {
  const scale = Math.min(1, max / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, cw, ch)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, cw, ch)
  return toBlob(canvas, quality).then((blob) => ({ blob, cw, ch }))
}

/** Corrige a orientação, remove metadados (EXIF/GPS), limita o tamanho e gera uma miniatura. */
export async function processImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (file.size > 40 * 1024 * 1024) throw new Error('A imagem passa de 40 MB. Escolha uma foto menor.')
  const d = await decode(file)
  try {
    const full = await render(d.src, d.w, d.h, MAX_FULL, 0.86)
    const thumb = await render(d.src, d.w, d.h, MAX_THUMB, 0.8)
    return { full: full.blob, thumb: thumb.blob, width: full.cw, height: full.ch }
  } finally {
    d.close?.()
  }
}

/** Sugere o formato do mural a partir da proporção da foto. */
export function suggestFormat(w: number, h: number): 'quadrado' | 'retrato' | 'paisagem' {
  const r = w / h
  if (r >= 1.3) return 'paisagem'
  if (r <= 0.85) return 'retrato'
  return 'quadrado'
}
