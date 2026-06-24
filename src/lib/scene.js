// ============================================================
// FORTA — fixed 3D background
// Fresnel-glow morphing icosahedron + drifting particles + bloom.
// Reacts to scroll position and cursor. Imports `three` locally
// (bundled by Astro) and is initialised lazily via initScene().
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const ACCENT = new THREE.Color(0xc8f23a);
const DEEP = new THREE.Color(0x0a0a0b);

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

function makeBlob() {
  const geo = new THREE.IcosahedronGeometry(1.35, 64);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uAmp: { value: 0.32 }, uFreq: { value: 1.25 },
      uAccent: { value: ACCENT }, uDeep: { value: DEEP },
      uFres: { value: 2.6 }, uPulse: { value: 0 },
    },
    vertexShader: NOISE_GLSL + /* glsl */`
      uniform float uTime, uAmp, uFreq, uPulse;
      varying vec3 vN; varying vec3 vView; varying float vDisp;
      void main(){
        vec3 p = position;
        float n = snoise(p*uFreq + vec3(0.0, uTime*0.18, uTime*0.12));
        float n2 = snoise(p*(uFreq*2.3) + uTime*0.25)*0.4;
        float disp = (n + n2) * (uAmp + uPulse);
        p += normal * disp;
        vDisp = disp;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vView = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uAccent, uDeep; uniform float uFres;
      varying vec3 vN; varying vec3 vView; varying float vDisp;
      void main(){
        float fres = pow(1.0 - max(dot(vN, vView), 0.0), uFres);
        vec3 base = mix(uDeep, uDeep*1.8, smoothstep(-0.4,0.4,vDisp));
        vec3 col = mix(base, uAccent, fres);
        col += uAccent * pow(fres, 3.0) * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function makeHalo() {
  const geo = new THREE.IcosahedronGeometry(1.9, 8);
  const mat = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
    uniforms: { uAccent: { value: ACCENT } },
    vertexShader: `varying vec3 vN; varying vec3 vView;
      void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vView=normalize(-mv.xyz); vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uAccent; varying vec3 vN; varying vec3 vView;
      void main(){ float f=pow(1.0-max(dot(vN,vView),0.0),3.5); gl_FragColor=vec4(uAccent, f*0.11); }`,
  });
  return new THREE.Mesh(geo, mat);
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
    uniforms: { uTime: { value: 0 }, uAccent: { value: ACCENT } },
    vertexShader: `uniform float uTime; attribute float aRnd; varying float vR;
      void main(){ vR=aRnd; vec3 p=position; p.y+=sin(uTime*0.3+aRnd*6.28)*0.3;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(aRnd*1.1+0.5)*(110.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vR; uniform vec3 uAccent;
      void main(){ vec2 c=gl_PointCoord-0.5; float d=dot(c,c); if(d>0.25) discard;
        float a=smoothstep(0.25,0.0,d);
        vec3 col=mix(vec3(0.55), uAccent*0.8, step(0.8,vR)); gl_FragColor=vec4(col, a*(0.08+vR*0.13)); }`,
  });
  return new THREE.Points(geo, mat);
}

export function initScene() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollN = 0, scrollTarget = 0, scrollV = 0;
  let lastScroll = window.scrollY;
  let renderer, scene, camera, composer, blob, halo, points;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    const wide = w > 900;
    blob.position.x = halo.position.x = wide ? 2.3 : 0;
    blob.position.y = halo.position.y = wide ? 0.5 : 0;
    blob.userData.baseScale = wide ? 0.82 : 0.92;
  }

  function tick() {
    const t = clock.getElapsedTime();

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    scrollN += (scrollTarget - scrollN) * 0.07;
    scrollV *= 0.9;

    const speed = reduceMotion ? 0 : 1;

    if (blob) {
      blob.material.uniforms.uTime.value = t * speed;
      blob.material.uniforms.uPulse.value = scrollV * 0.5;
      blob.material.uniforms.uAmp.value = 0.30 + scrollN * 0.22;
      blob.rotation.y = t * 0.08 * speed + pointer.x * 0.4 + scrollN * Math.PI * 1.2;
      blob.rotation.x = pointer.y * 0.3 + scrollN * 0.8;
      const bs = blob.userData.baseScale || 0.85;
      const s = bs * (1 - scrollN * 0.18);
      blob.scale.setScalar(s);
      halo.rotation.copy(blob.rotation);
      halo.scale.setScalar(s * 1.04);
    }
    if (points) {
      points.material.uniforms.uTime.value = t * speed;
      points.rotation.y = t * 0.02 * speed + pointer.x * 0.15;
      points.rotation.x = -scrollN * 0.4;
    }

    camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04;
    camera.position.z = 5.2 + scrollN * 1.4;
    camera.lookAt(blob ? blob.position.x * 0.3 : 0, 0, 0);

    const vh = window.innerHeight || 1;
    const fade = Math.max(0, Math.min(1, (window.scrollY - vh * 0.15) / (vh * 0.55)));
    const targetOpacity = 1 - fade * 0.74;
    canvas.style.opacity = (parseFloat(canvas.style.opacity) || 1) + (targetOpacity - (parseFloat(canvas.style.opacity) || 1)) * 0.12;

    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  blob = makeBlob();
  halo = makeHalo();
  points = makePoints();
  scene.add(blob, halo, points);

  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.5, 0.78));
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
    scrollV = Math.min(Math.abs(window.scrollY - lastScroll) / 40, 1);
    lastScroll = window.scrollY;
  }, { passive: true });

  resize();
  renderer.setAnimationLoop(tick);
}
