/* ============================================
   artchristech — marble.js
   Domain-warped FBM marble/smoke hero (WebGL).

   Gold→cyan flowing marble over near-black, with the Flower of Life
   breathing through. Scroll-activated: a uReveal uniform fades the
   whole field up as the section centers in the viewport and back down
   as it leaves — combined with a CSS top/bottom gradient mask so the
   edges dissolve into the page (no hard rectangle).
   ============================================ */

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uReveal;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0 - 2.0*f);
  float a = hash(i + vec2(0.0,0.0));
  float b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0));
  float d = hash(i + vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i = 0; i < 5; i++){
    v += amp * vnoise(p);
    p = rot * p * 2.0 + 11.3;
    amp *= 0.5;
  }
  return v;
}
float ringBand(vec2 p, vec2 c, float R, float w){
  float d = length(p - c);
  return smoothstep(w, 0.0, abs(d - R));
}
float flowerField(vec2 p, float R){
  float s = 0.866025 * R; float w = R * 0.10; float f = 0.0;
  f += ringBand(p, vec2( 0.0,    0.0), R, w);
  f += ringBand(p, vec2( R,      0.0), R, w);
  f += ringBand(p, vec2(-R,      0.0), R, w);
  f += ringBand(p, vec2( R*0.5,    s ), R, w);
  f += ringBand(p, vec2(-R*0.5,    s ), R, w);
  f += ringBand(p, vec2( R*0.5,   -s ), R, w);
  f += ringBand(p, vec2(-R*0.5,   -s ), R, w);
  f += ringBand(p, vec2( R*1.5,    s ), R, w) * 0.7;
  f += ringBand(p, vec2(-R*1.5,    s ), R, w) * 0.7;
  f += ringBand(p, vec2( R*1.5,   -s ), R, w) * 0.7;
  f += ringBand(p, vec2(-R*1.5,   -s ), R, w) * 0.7;
  f += ringBand(p, vec2( 0.0,    2.0*s), R, w) * 0.7;
  f += ringBand(p, vec2( 0.0,   -2.0*s), R, w) * 0.7;
  return f;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes.xy) / uRes.y;
  float t = uTime;

  vec2 p = uv * 1.7;
  vec2 q = vec2(fbm(p + 0.10*t), fbm(p + vec2(5.2, 1.3) - 0.08*t));
  vec2 r = vec2(fbm(p + 3.5*q + vec2(1.7, 9.2) + 0.07*t),
                fbm(p + 3.5*q + vec2(8.3, 2.8) - 0.06*t));
  float v = fbm(p + 3.0*r);
  float warpMag = length(r);

  vec3 base = vec3(0.012, 0.014, 0.020);
  vec3 gold = vec3(0.902, 0.706, 0.471);
  vec3 cyan = vec3(0.588, 0.902, 1.000);

  float vv = clamp(v * 1.15, 0.0, 1.0);
  vec3 flow = mix(gold, cyan, smoothstep(0.30, 0.85, vv));
  float lum = pow(vv, 2.2);
  float filaments = smoothstep(0.55, 1.05, warpMag) * 0.6;
  vec3 col = base + flow * (lum * 0.95 + filaments);

  vec2 fp = uv * 2.6;
  float flower = clamp(flowerField(fp, 1.0), 0.0, 1.0);
  float breathe = 0.5 + 0.5 * sin(t * 0.35);
  float reveal = 0.35 + 0.65 * lum;
  col += gold * flower * (0.10 + 0.16 * breathe) * reveal;

  float vig = smoothstep(1.7, 0.4, length(uv));
  col *= mix(0.75, 1.0, vig);

  col = col / (col + vec3(0.85));
  col = pow(col, vec3(0.92));
  col = max(col, vec3(0.018, 0.020, 0.026));
  float g = hash(gl_FragCoord.xy + fract(t)) - 0.5;
  col += g * 0.012;

  // ---- seamless edge feather (all four sides) + scroll reveal ----
  vec2 sn = gl_FragCoord.xy / uRes.xy;
  float ex = smoothstep(0.0, 0.13, sn.x) * smoothstep(0.0, 0.13, 1.0 - sn.x);
  float ey = smoothstep(0.0, 0.16, sn.y) * smoothstep(0.0, 0.16, 1.0 - sn.y);
  float a = clamp(uReveal, 0.0, 1.0) * ex * ey;
  // premultiplied alpha: rgb already scaled by a → transparent edges show the page
  gl_FragColor = vec4(col * a, a);
}
`;

export function initMarbleHero(canvas, label) {
  if (label) { label.textContent = ''; label.classList.remove('visible'); }

  let gl = null;
  try {
    const opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' };
    gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  } catch (e) { gl = null; }
  if (!gl) {
    // graceful fallback: a static gold/cyan wash via CSS
    canvas.style.background =
      'radial-gradient(120% 90% at 30% 25%, rgba(230,180,120,0.16), rgba(5,5,5,0) 55%),' +
      'radial-gradient(110% 100% at 75% 80%, rgba(150,230,255,0.14), rgba(5,5,5,0) 60%), #050505';
    return;
  }

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('shader compile: ' + info);
    }
    return sh;
  }

  let program;
  try {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(program));
    }
  } catch (err) {
    console.warn('[hero] marble shader failed:', err && err.message);
    return;
  }
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'uRes');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uReveal = gl.getUniformLocation(program, 'uReveal');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || window.innerWidth;
    const ch = canvas.clientHeight || window.innerHeight;
    const w = Math.max(1, Math.floor(cw * dpr));
    const h = Math.max(1, Math.floor(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // scroll-driven reveal: 1 when the section is centered, fading toward 0
  // as it leaves the viewport (top or bottom).
  const section = canvas.closest('section') || canvas.parentElement;
  function computeReveal() {
    const vh = window.innerHeight || 1;
    const r = section.getBoundingClientRect();
    const center = r.top + r.height / 2;       // section center vs viewport top
    const d = Math.abs(center - vh / 2) / vh;   // 0 centered, ~1 a screen away
    const x = Math.max(0, 1 - d);
    return x * x * (3 - 2 * x);                  // smoothstep
  }

  let reveal = 1, visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 })
      .observe(canvas);
  }

  const start = (window.performance && performance.now) ? performance.now() : Date.now();
  function renderAt(seconds) {
    reveal = computeReveal();
    gl.uniform1f(uReveal, reveal);
    gl.uniform1f(uTime, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (reduce) {
    function frameStatic() {
      requestAnimationFrame(frameStatic);
      if (!visible || document.hidden) return;
      renderAt(8.0); // frozen time, but reveal still tracks scroll
    }
    requestAnimationFrame(frameStatic);
    return;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    renderAt((now - start) * 0.001);
  }
  requestAnimationFrame(frame);
}
