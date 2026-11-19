// Tiny raw-WebGL helper for the full-screen shader layers (ink, forge, rays).
export const QUAD_VERT = `attribute vec2 aPos;\nvoid main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

export function fullscreen(canvas: HTMLCanvasElement, frag: string, opts: WebGLContextAttributes = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: true, ...opts });
  if (!gl) throw new Error('WebGL not available');
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  const vs = sh(gl.VERTEX_SHADER, QUAD_VERT), fs = sh(gl.FRAGMENT_SHADER, frag);
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const cache = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => { if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name)); return cache.get(name)!; };
  return {
    gl,
    u,
    draw() { gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(prog); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); },
    dispose() { gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteBuffer(buf); },
  };
}

export const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
export const mix3 = (a: number[], b: number[], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
