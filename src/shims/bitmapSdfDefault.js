const INF = 1e20

function edt1d(f, d, v, z, n) {
  v[0] = 0
  z[0] = -INF
  z[1] = INF

  for (let q = 1, k = 0; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }

  for (let q = 0, k = 0; q < n; q++) {
    while (z[k + 1] < q) {
      k++
    }
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

function edt(data, width, height, f, d, v, z) {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      f[y] = data[y * width + x]
    }
    edt1d(f, d, v, z, height)
    for (let y = 0; y < height; y++) {
      data[y * width + x] = d[y]
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      f[x] = data[y * width + x]
    }
    edt1d(f, d, v, z, width)
    for (let x = 0; x < width; x++) {
      data[y * width + x] = Math.sqrt(d[x])
    }
  }
}

function calcSDF(src, options = {}) {
  const cutoff = options.cutoff == null ? 0.25 : options.cutoff
  const radius = options.radius == null ? 8 : options.radius
  const channel = options.channel || 0

  let w
  let h
  let data
  let stride

  if (ArrayBuffer.isView(src) || Array.isArray(src)) {
    if (!options.width || !options.height) {
      throw new Error('For raw data width and height should be provided by options')
    }
    w = options.width
    h = options.height
    data = src
    stride = options.stride || Math.floor(src.length / w / h)
  } else if (
    typeof window !== 'undefined' &&
    window.HTMLCanvasElement &&
    src instanceof window.HTMLCanvasElement
  ) {
    w = src.width
    h = src.height
    data = src.getContext('2d').getImageData(0, 0, w, h).data
    stride = 4
  } else if (
    typeof window !== 'undefined' &&
    window.CanvasRenderingContext2D &&
    src instanceof window.CanvasRenderingContext2D
  ) {
    const canvas = src.canvas
    w = canvas.width
    h = canvas.height
    data = src.getImageData(0, 0, w, h).data
    stride = 4
  } else if (
    typeof window !== 'undefined' &&
    window.ImageData &&
    src instanceof window.ImageData
  ) {
    w = src.width
    h = src.height
    data = src.data
    stride = 4
  } else {
    throw new Error('Unsupported source type for bitmap-sdf shim')
  }

  if (
    (typeof Uint8ClampedArray !== 'undefined' && data instanceof Uint8ClampedArray) ||
    (typeof Uint8Array !== 'undefined' && data instanceof Uint8Array)
  ) {
    const intData = data
    data = new Array(w * h)
    for (let i = 0, l = Math.floor(intData.length / stride); i < l; i++) {
      data[i] = intData[i * stride + channel] / 255
    }
  } else if (stride !== 1) {
    throw new Error('Raw data can have only 1 value per pixel')
  }

  const gridOuter = new Array(w * h)
  const gridInner = new Array(w * h)
  const size = Math.max(w, h)
  const f = new Array(size)
  const d = new Array(size)
  const z = new Array(size + 1)
  const v = new Array(size)

  for (let i = 0, l = w * h; i < l; i++) {
    const a = data[i]
    gridOuter[i] = a === 1 ? 0 : a === 0 ? INF : Math.pow(Math.max(0, 0.5 - a), 2)
    gridInner[i] = a === 1 ? INF : a === 0 ? 0 : Math.pow(Math.max(0, a - 0.5), 2)
  }

  edt(gridOuter, w, h, f, d, v, z)
  edt(gridInner, w, h, f, d, v, z)

  const dist = typeof Float32Array !== 'undefined' ? new Float32Array(w * h) : new Array(w * h)
  for (let i = 0, l = w * h; i < l; i++) {
    dist[i] = Math.min(Math.max(1 - ((gridOuter[i] - gridInner[i]) / radius + cutoff), 0), 1)
  }
  return dist
}

export default calcSDF
