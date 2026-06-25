// ============================================================
// FORTA — "The Core" — fixed 3D background
// A lit, reflective core that means something rather than just
// decorates: it represents the system being built.
//   • Image-based lighting — the surface mirrors a real
//     environment (PBR metal + clearcoat + iridescence), so it
//     reads like polished obsidian/liquid metal, not a flat blob.
//   • Real recomputed normals after displacement, so reflections
//     follow the lumpy surface.
//   • A key light follows the cursor — point at the core and a
//     highlight rakes across it. You shape it.
//   • Crystallisation on scroll — molten and searching at the
//     hero (a raw idea), resolving into a tighter, structured
//     form as you move through the studio's process.
//   • It illuminates the field — surrounding particles brighten
//     on the lit side, so the scene is one lit system.
// Imports `three` locally (bundled by Astro), initialised lazily
// via initScene() once the page is idle.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const ACCENT = new THREE.Color(0xc8f23a);
const DEEP = new THREE.Color(0x06070a);

// ---- Simplex noise (Ashima / Stefan Gustavson) for vertex displacement
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// Displacement shared by the position pass and the normal-recompute pass.
const DISP_GLSL = /* glsl */ `
uniform float uTime, uFreq, uAmp, uMorph, uPulse;
varying float vDisp;
float fbm(vec3 p){
  float s = 0.0, a = 0.55, f = 1.0;
  for(int i = 0; i < 3; i++){ s += a * snoise(p*f); f *= 2.05; a *= 0.5; }
  return s;
}
float getDisp(vec3 pos){
  vec3 q = pos*uFreq + vec3(0.0, uTime*0.16, uTime*0.11);
  float molten = fbm(q);
  float ridge = 1.0 - abs(snoise(q*1.7 + 3.0));
  ridge = ridge*ridge - 0.45;
  return mix(molten, ridge, uMorph) * (uAmp + uPulse);
}`;

// ---- A small environment baked to a PMREM so the core has real,
// brand-tinted reflections (dark room + lime/white/warm glints).
function makeEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP;
        void main(){
          vec3 d = normalize(vP);
          float y = d.y*0.5 + 0.5;
          vec3 floorC = vec3(0.012, 0.013, 0.015);
          vec3 topC   = vec3(0.004, 0.005, 0.006);
          vec3 c = mix(floorC, topC, smoothstep(0.25, 0.95, y));
          c += vec3(0.05, 0.08, 0.015) * smoothstep(0.55, 0.0, abs(y-0.35)) * 0.5; // faint lime band
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  s.add(sky);

  const glint = (hex, intensity, x, y, z, sx = 9, sy = 9) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(sx, sy),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  glint(0xc8f23a, 7.0, 9, 7, 6);      // lime key
  glint(0xeaf6ff, 4.0, -9, 4, 7, 7, 7); // cool fill
  glint(0xffe8c0, 2.2, 3, -7, -8, 12, 12); // warm underglow

  const rt = pmrem.fromScene(s, 0.04);
  sky.geometry.dispose();
  sky.material.dispose();
  pmrem.dispose();
  return rt.texture;
}

function makeBlob(envTex) {
  const geo = new THREE.IcosahedronGeometry(1.35, 32);

  const uniforms = {
    uTime: { value: 0 }, uFreq: { value: 1.2 }, uAmp: { value: 0.34 },
    uMorph: { value: 0 }, uPulse: { value: 0 }, uAccent: { value: ACCENT },
  };

  const mat = new THREE.MeshPhysicalMaterial({
    color: DEEP,
    metalness: 0.92,
    roughness: 0.28,
    envMap: envTex,
    envMapIntensity: 1.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.22,
    iridescence: 1.0,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [120, 420],
    emissive: new THREE.Color(0x000000),
  });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    // ---- Vertex: displace the surface and recompute the normal so the
    // reflections track the real, lumpy geometry.
    shader.vertexShader = NOISE_GLSL + '\n' + DISP_GLSL + '\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      /* glsl */`
        float gRad = length(position);
        vec3 gN0 = position / gRad;
        vec3 gAx = abs(gN0.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
        vec3 gTan = normalize(cross(gAx, gN0));
        vec3 gBit = cross(gN0, gTan);
        float gEps = 0.06;
        vec3 gPa = normalize(position + gTan*gEps) * gRad;
        vec3 gPb = normalize(position + gBit*gEps) * gRad;
        float gD0 = getDisp(position);
        vec3 gP0 = position + gN0 * gD0;
        vec3 gPA = gPa + normalize(gPa) * getDisp(gPa);
        vec3 gPB = gPb + normalize(gPb) * getDisp(gPb);
        vec3 gNrm = normalize(cross(gPA - gP0, gPB - gP0));
        if(dot(gNrm, gN0) < 0.0) gNrm = -gNrm;
        vDisp = gD0;
        vec3 gDispPos = gP0;
        vec3 objectNormal = gNrm;
        #ifdef USE_TANGENT
        vec3 objectTangent = vec3( tangent.xyz );
        #endif
      `,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      'vec3 transformed = gDispPos;',
    );

    // ---- Fragment: energy emitted from the raised seams, pulsing with
    // scroll momentum. Layered on top of the PBR reflections.
    shader.fragmentShader =
      'uniform vec3 uAccent; uniform float uPulse;\nvarying float vDisp;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      /* glsl */`
        #include <emissivemap_fragment>
        float seam = smoothstep(0.12, 0.52, vDisp);
        totalEmissiveRadiance += uAccent * seam * (0.35 + uPulse * 2.2);
      `,
    );
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.uniforms = uniforms;
  return mesh;
}

function makePoints() {
  const N = 900;
  const pos = new Float32Array(N * 3);
  const rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 4 + Math.random() * 9;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t) * 0.7;
    pos[i * 3 + 2] = r * Math.cos(p);
    rnd[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uAccent: { value: ACCENT },
      uLightW: { value: new THREE.Vector3(0.4, 0.5, 0.8).normalize() },
    },
    vertexShader: `uniform float uTime; uniform vec3 uLightW; attribute float aRnd; varying float vR; varying float vLit;
      void main(){ vR=aRnd; vec3 p=position; p.y+=sin(uTime*0.3+aRnd*6.28)*0.3;
        vLit = max(dot(normalize(position), uLightW), 0.0);
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(aRnd*1.1+0.5)*(110.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vR; varying float vLit; uniform vec3 uAccent;
      void main(){ vec2 c=gl_PointCoord-0.5; float d=dot(c,c); if(d>0.25) discard;
        float a=smoothstep(0.25,0.0,d);
        vec3 col=mix(vec3(0.5), uAccent*0.85, step(0.8,vR));
        col=mix(col, uAccent, vLit*0.55);
        gl_FragColor=vec4(col, a*(0.07+vR*0.12+vLit*0.07)); }`,
  });
  return new THREE.Points(geo, mat);
}

export function initScene() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollN = 0, scrollTarget = 0, scrollV = 0, scrollVSigned = 0;
  let lastScroll = window.scrollY;
  let renderer, scene, camera, composer, blob, blobU, points, keyLight, rimLight;
  const lightW = new THREE.Vector3();

  // Mobile-only: the blob trails behind scroll motion, then eases back to
  // its resting spot — lagTarget is nudged by scroll delta and decays to 0
  // each frame, lagY chases it, so the blob springs back once you stop.
  let isWide = true, blobBaseY = 0.5, lagY = 0, lagTarget = 0;

  // Render budget: cap the internal pixel count regardless of how dense or
  // large the monitor is, so a 27" 2K/4K screen doesn't multiply GPU cost.
  const MAX_RENDER_PIXELS = 2.3e6;
  function effectivePixelRatio(w, h) {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const scale = Math.sqrt(MAX_RENDER_PIXELS / (w * h * dpr * dpr));
    return dpr * Math.min(1, scale);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setPixelRatio(effectivePixelRatio(w, h));
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    isWide = w > 900;
    blobBaseY = isWide ? 0.5 : -0.55;
    blob.position.x = isWide ? 2.3 : 0;
    blob.position.y = blobBaseY;
    // Portrait phones get a narrower horizontal FOV than the fixed vertical
    // one, so the same world-space scale reads much larger — shrink it down.
    blob.userData.baseScale = isWide ? 0.82 : 0.34;
  }

  function tick() {
    const t = clock.getElapsedTime();

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    scrollN += (scrollTarget - scrollN) * 0.07;
    scrollV *= 0.9;
    scrollVSigned *= 0.88;

    const speed = reduceMotion ? 0 : 1;

    // Key light: slowly orbits the core and is pulled toward the cursor,
    // so a highlight rakes across the surface where you point.
    const ang = t * 0.22 * speed;
    lightW.set(
      Math.cos(ang) * 0.7 + pointer.x * 0.9,
      0.45 - pointer.y * 0.7,
      0.6 + Math.sin(ang * 0.6) * 0.35,
    ).normalize();
    if (keyLight) keyLight.position.copy(blob.position).addScaledVector(lightW, 6);

    if (blob) {
      blobU.uTime.value = t * speed;
      blobU.uPulse.value = scrollV * 0.45;
      // Scroll bursts churn the surface harder — a liquid roil — right
      // before the stretch below pulls it into a venom-like tendril.
      blobU.uAmp.value = 0.34 - scrollN * 0.06 + scrollV * 0.4;
      blobU.uMorph.value = scrollN;                  // molten → crystalline
      blob.rotation.y = t * 0.08 * speed + pointer.x * 0.4 + scrollN * Math.PI * 1.2;
      blob.rotation.x = pointer.y * 0.3 + scrollN * 0.8;
      const bs = blob.userData.baseScale || 0.85;
      const settle = bs * (1 - scrollN * 0.18);
      // Stretch along the scroll axis, squeeze the cross-section — the
      // squash/stretch of a liquid mass being dragged by momentum.
      const stretch = 1 + Math.abs(scrollVSigned) * 0.55;
      const squeeze = 1 - Math.abs(scrollVSigned) * 0.22;
      blob.scale.set(settle * squeeze, settle * stretch, settle * squeeze);

      if (!isWide) {
        lagY += (lagTarget - lagY) * 0.12;
        lagTarget *= 0.9;
        blob.position.y = blobBaseY + lagY;
      }
    }
    if (points) {
      points.material.uniforms.uTime.value = t * speed;
      points.material.uniforms.uLightW.value.copy(lightW);
      points.rotation.y = t * 0.02 * speed + pointer.x * 0.15;
      points.rotation.x = -scrollN * 0.4;
    }

    camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04;
    camera.position.z = 5.2 + scrollN * 1.4;
    camera.lookAt(blob ? blob.position.x * 0.3 : 0, 0, 0);

    if (isWide) {
      const vh = window.innerHeight || 1;
      const fade = Math.max(0, Math.min(1, (window.scrollY - vh * 0.15) / (vh * 0.55)));
      const targetOpacity = 1 - fade * 0.74;
      canvas.style.opacity = (parseFloat(canvas.style.opacity) || 1) + (targetOpacity - (parseFloat(canvas.style.opacity) || 1)) * 0.12;
    } else {
      canvas.style.opacity = 1;
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(effectivePixelRatio(window.innerWidth, window.innerHeight));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  const envTex = makeEnv(renderer);
  scene.environment = envTex;

  blob = makeBlob(envTex);
  blobU = blob.userData.uniforms;
  points = makePoints();
  scene.add(blob, points);

  // A moving key light (cursor-driven) for a live specular, plus a steady
  // lime rim from behind so the core never goes fully dark.
  keyLight = new THREE.PointLight(0xfff4e0, 60, 0, 2);
  scene.add(keyLight);
  rimLight = new THREE.DirectionalLight(ACCENT, 1.4);
  rimLight.position.set(-4, 2, -5);
  scene.add(rimLight);
  scene.add(new THREE.AmbientLight(0x223044, 0.6));

  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.5, 0.45, 0.85));
    composer.addPass(new OutputPass());
  } catch (e) {
    composer = null;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollTarget = max > 0 ? window.scrollY / max : 0;
    const delta = window.scrollY - lastScroll;
    scrollV = Math.min(Math.abs(delta) / 40, 1);
    scrollVSigned = Math.max(-1, Math.min(1, delta / 40));
    if (!isWide) lagTarget = Math.max(-0.8, Math.min(0.8, lagTarget + delta * 0.025));
    lastScroll = window.scrollY;
  }, { passive: true });

  resize();
  renderer.setAnimationLoop(tick);
}
