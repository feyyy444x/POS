import { useEffect, useRef } from 'react'

const vertexSource = `
attribute vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }
`

const fragmentSource = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_scene;
uniform float u_motion;
#define MAX_STEPS 72
#define MAX_DIST 24.0
#define SURF_DIST 0.0015
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdSphere(vec3 p,float r){return length(p)-r;}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float sceneMap(vec3 p){
  float t=u_time*u_motion;
  float drift=sin(t*.22)*.12;
  p.xz*=rot(t*.10 + u_scene*.22);
  vec3 ringP=p-vec3(.38+drift,.08,-.12);
  float ring=sdTorus(ringP,vec2(.78,.105));
  vec3 coreP=p-vec3(.38+drift,.08,-.12);
  coreP.xy*=rot(.45+sin(t*.17)*.12);
  float core=sdSphere(coreP,.22);
  vec3 shardP=p-vec3(-.82,-.32,.05);
  shardP.xy*=rot(-.5+t*.08);
  float shard=sdBox(shardP,vec3(.28,.28,.28));
  float orbit=sdTorus(p-vec3(.38+drift,.08,-.12),vec2(1.12,.012));
  float secondRing=sdTorus(p-vec3(.38,.08,-.12),vec2(.94,.018));
  vec3 stackA=p-vec3(.3,-.05,0.); stackA.xy*=rot(.35+t*.06);
  vec3 stackB=p-vec3(.3,-.05,-.32); stackB.xy*=rot(-.35-t*.05);
  float stack=min(sdBox(stackA,vec3(.42,.34,.08)),sdBox(stackB,vec3(.34,.26,.08)));
  float analytics=sdTorus(p-vec3(.3,.02,-.08),vec2(.65,.035));
  vec3 nodeA=p-vec3(.15,.12,0.);
  vec3 nodeB=p-vec3(-.52,-.24,0.);
  vec3 nodeC=p-vec3(.78,-.28,0.);
  float network=min(sdSphere(nodeA,.17),min(sdSphere(nodeB,.13),sdSphere(nodeC,.13)));
  float people=min(sdSphere(p-vec3(.12,.35,0.),.17),sdSphere(p-vec3(.12,-.08,0.),.25));
  vec3 dialP=p-vec3(.35,.05,-.08); dialP.xy*=rot(t*.12);
  float dial=sdTorus(dialP,vec2(.58,.055));
  float queue=sdTorus(p-vec3(.32,.04,0.),vec2(.48,.075));
  float support=sdTorus(p-vec3(.3,.08,0.),vec2(.7,.045));
  float motif=ring;
  if(u_scene>0.5 && u_scene<1.5) motif=min(ring,orbit);
  else if(u_scene<2.5 && u_scene>=1.5) motif=stack;
  else if(u_scene<3.5 && u_scene>=2.5) motif=min(analytics,secondRing);
  else if(u_scene<4.5 && u_scene>=3.5) motif=network;
  else if(u_scene<5.5 && u_scene>=4.5) motif=people;
  else if(u_scene<6.5 && u_scene>=5.5) motif=dial;
  else if(u_scene<7.5 && u_scene>=6.5) motif=queue;
  else if(u_scene<8.5 && u_scene>=7.5) motif=support;
  else if(u_scene<9.5 && u_scene>=8.5) motif=min(ring,secondRing);
  return min(motif,min(core,shard));
}
vec3 normalAt(vec3 p){
  vec2 e=vec2(.001,0.);
  return normalize(vec3(sceneMap(p+e.xyy)-sceneMap(p-e.xyy),sceneMap(p+e.yxy)-sceneMap(p-e.yxy),sceneMap(p+e.yyx)-sceneMap(p-e.yyx)));
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_resolution)/u_resolution.y;
  float t=u_time*u_motion;
  uv.x-=.22;
  uv += u_pointer*.035;
  vec3 ro=vec3(0.,0.,4.2);
  vec3 rd=normalize(vec3(uv, -1.75));
  float travel=0.;
  float hit=0.;
  vec3 p;
  for(int i=0;i<MAX_STEPS;i++){
    p=ro+rd*travel;
    float d=sceneMap(p);
    if(d<SURF_DIST){hit=1.;break;}
    travel+=d*.78;
    if(travel>MAX_DIST)break;
  }
  vec3 col=vec3(0.);
  float alpha=0.;
  if(hit>.5){
    vec3 n=normalAt(p);
    vec3 light=normalize(vec3(-.5,.9,1.));
    float diff=max(dot(n,light),0.);
    float rim=pow(1.-max(dot(n,-rd),0.),2.5);
    float fres=pow(1.-abs(dot(n,-rd)),3.);
    vec3 navy=vec3(.035,.11,.19);
    vec3 teal=vec3(.02,.72,.57);
    float band=.5+.5*sin(p.y*7.+t*.35+u_scene);
    col=mix(navy,teal,.18+band*.24)*(.28+diff*.8)+teal*(rim*.32+fres*.28);
    alpha=clamp(.24+rim*.34+diff*.12,.0,.62);
  }
  float glow=exp(-abs(sceneMap(vec3(uv*2.1,0.)))*5.)*.055;
  col+=vec3(.015,.23,.18)*glow;
  alpha=max(alpha,glow);
  gl_FragColor=vec4(col,alpha);
}
`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(message || 'WebGL shader compilation failed')
  }
  return shader
}

const sceneFor = (heading, path) => {
  const value = (heading + ' ' + path).toLowerCase()
  if (value.includes('pos') || value.includes('checkout') || value.includes('kasir')) return 1
  if (value.includes('produk') || value.includes('stok') || value.includes('inventory')) return 2
  if (value.includes('laporan') || value.includes('report')) return 3
  if (value.includes('organisasi') || value.includes('nexaspace') || value.includes('tenant')) return 4
  if (value.includes('tim') || value.includes('karyawan') || value.includes('akses')) return 5
  if (value.includes('pengaturan') || value.includes('setting')) return 6
  if (value.includes('antrean') || value.includes('queue')) return 7
  if (value.includes('support') || value.includes('nexabot')) return 8
  if (path === '/' || path.endsWith('/index.html')) return 0
  if (path.includes('login') || path.includes('auth')) return 9
  return 10
}

/**
 * A transparent, procedural 3D scene layer. DOM remains the accessible UI;
 * this WebGL canvas is decorative and can fail without affecting the app.
 */
export default function NexaUniverse() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    let gl
    let program
    let raf = 0
    let start = performance.now()
    let lost = false
    let pointer = [0, 0]
    let scene = sceneFor(document.querySelector('main h1')?.textContent || '', location.pathname)
    document.documentElement.dataset.nexaScene = String(scene)
    let resizeObserver

    const onPointer = (event) => {
      pointer = [
        (event.clientX / Math.max(innerWidth, 1) - .5) * 2,
        (event.clientY / Math.max(innerHeight, 1) - .5) * -2,
      ]
    }
    const updateScene = () => {
      const heading = document.querySelector('.page-heading h1, .access-content h1, main h1')?.textContent || ''
      scene = sceneFor(heading, location.pathname)
      document.documentElement.dataset.nexaScene = String(scene)
    }
    const observer = new MutationObserver(updateScene)
    observer.observe(document.getElementById('root') || document.body, { subtree: true, childList: true, characterData: true })

    const onLost = (event) => { event.preventDefault(); lost = true; cancelAnimationFrame(raf) }
    const onRestored = () => { lost = false; initialize(); }
    canvas.addEventListener('webglcontextlost', onLost, false)
    canvas.addEventListener('webglcontextrestored', onRestored, false)
    window.addEventListener('pointermove', onPointer, { passive: true })

    const initialize = () => {
      try {
        gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
        if (!gl) return
        const vs = compile(gl, gl.VERTEX_SHADER, vertexSource)
        const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
        program = gl.createProgram()
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
        gl.useProgram(program)
        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
        const position = gl.getAttribLocation(program, 'position')
        gl.enableVertexAttribArray(position)
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
        const uniforms = {
          resolution: gl.getUniformLocation(program, 'u_resolution'),
          time: gl.getUniformLocation(program, 'u_time'),
          pointer: gl.getUniformLocation(program, 'u_pointer'),
          scene: gl.getUniformLocation(program, 'u_scene'),
          motion: gl.getUniformLocation(program, 'u_motion'),
        }
        const draw = (now) => {
          if (lost || !gl) return
          const dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.35)
          const width = Math.max(1, Math.floor(innerWidth * dpr))
          const height = Math.max(1, Math.floor(innerHeight * dpr))
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width
            canvas.height = height
          }
          gl.viewport(0, 0, width, height)
          gl.clearColor(0, 0, 0, 0)
          gl.clear(gl.COLOR_BUFFER_BIT)
          gl.useProgram(program)
          gl.uniform2f(uniforms.resolution, width, height)
          gl.uniform1f(uniforms.time, (now - start) / 1000)
          gl.uniform2f(uniforms.pointer, pointer[0], pointer[1])
          gl.uniform1f(uniforms.scene, scene)
          gl.uniform1f(uniforms.motion, reduced || document.hidden ? 0 : 1)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
          if (!reduced && !document.hidden) raf = requestAnimationFrame(draw)
        }
        draw(performance.now())
      } catch (error) {
        console.warn('NexaPos 3D layer unavailable; using accessible DOM fallback.', error)
      }
    }

    resizeObserver = new ResizeObserver(() => {
      if (!lost && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame((now) => { if (gl) { gl.viewport(0,0,canvas.width,canvas.height); } }) }
    })
    resizeObserver.observe(document.documentElement)
    initialize()

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf)
      else if (!reduced && !lost) { start = performance.now(); initialize() }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      resizeObserver?.disconnect()
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (gl && program) gl.deleteProgram(program)
    }
  }, [])

  return <canvas ref={canvasRef} className="nexa-universe-canvas" aria-hidden="true" role="presentation" />
}
