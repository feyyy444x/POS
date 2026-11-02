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
  float drift=sin(t*.18)*.10;
  vec3 q=p;
  q.xz*=rot(t*.055 + u_scene*.12);
  q.xy*=rot(sin(t*.13)*.035);

  /* Architectural portal frame: a solid rectangular frame with a recessed core. */
  vec3 frameP=q-vec3(.34+drift,.05,-.10);
  frameP.xy*=rot(.10+sin(t*.12)*.035);
  float frameOuter=sdBox(frameP,vec3(.92,.98,.13));
  float frameInner=sdBox(frameP-vec3(0.,-.015,.045),vec3(.72,.78,.20));
  float portal=max(frameOuter,-frameInner);

  /* Floating structural slabs and columns. */
  float plinth=sdBox(q-vec3(.18,-.78,-.04),vec3(1.12,.09,.48));
  float upperSlab=sdBox(q-vec3(.20,.76,-.12),vec3(.88,.075,.34));
  float columnA=sdBox(q-vec3(-.43,-.02,-.02),vec3(.10,.72,.12));
  float columnB=sdBox(q-vec3(.66,-.02,-.02),vec3(.10,.72,.12));
  float lintel=sdBox(q-vec3(.11,.68,-.02),vec3(.70,.09,.13));
  float crossBeam=sdBox(q-vec3(.12,.12,-.20),vec3(.76,.045,.055));
  float architecture=min(portal,min(plinth,min(upperSlab,min(columnA,min(columnB,min(lintel,crossBeam))))));

  /* A stepped volume gives the scene a constructed, not spherical, silhouette. */
  vec3 stepA=q-vec3(-.72,-.36,.06); stepA.xy*=rot(-.18+t*.035);
  vec3 stepB=q-vec3(-.38,-.49,.02); stepB.xy*=rot(-.18+t*.035);
  vec3 stepC=q-vec3(-.04,-.61,-.02); stepC.xy*=rot(-.18+t*.035);
  float steps=min(sdBox(stepA,vec3(.23,.16,.22)),min(sdBox(stepB,vec3(.23,.16,.22)),sdBox(stepC,vec3(.23,.16,.22))));

  /* Page-specific structural motifs. */
  float transaction=sdBox(q-vec3(.26,.02,.02),vec3(.58,.40,.12));
  float inventory=min(sdBox(q-vec3(.24,.04,.02),vec3(.66,.55,.10)),sdBox(q-vec3(.24,-.52,.02),vec3(.78,.055,.14)));
  float analytics=min(sdBox(q-vec3(.18,-.10,.02),vec3(.76,.08,.12)),min(sdBox(q-vec3(-.35,.12,.02),vec3(.10,.34,.12)),sdBox(q-vec3(.18,.35,.02),vec3(.10,.57,.12))));
  float organization=min(sdBox(q-vec3(.28,.04,.02),vec3(.14,.14,.14)),min(sdBox(q-vec3(-.42,-.40,.02),vec3(.12,.12,.12)),sdBox(q-vec3(.88,-.40,.02),vec3(.12,.12,.12))));
  float team=min(sdBox(q-vec3(.12,.30,.02),vec3(.18,.20,.10)),sdBox(q-vec3(.12,-.22,.02),vec3(.34,.12,.10)));
  float settings=sdBox(q-vec3(.26,.02,.02),vec3(.54,.54,.07));
  float queue=sdBox(q-vec3(.22,.02,.02),vec3(.72,.20,.08));
  float support=min(sdBox(q-vec3(.20,.08,.02),vec3(.62,.12,.09)),sdBox(q-vec3(.20,-.22,.02),vec3(.12,.22,.09)));
  float motif=architecture;
  if(u_scene>0.5 && u_scene<1.5) motif=min(transaction,lintel);
  else if(u_scene>=1.5 && u_scene<2.5) motif=inventory;
  else if(u_scene>=2.5 && u_scene<3.5) motif=analytics;
  else if(u_scene>=3.5 && u_scene<4.5) motif=organization;
  else if(u_scene>=4.5 && u_scene<5.5) motif=team;
  else if(u_scene>=5.5 && u_scene<6.5) motif=settings;
  else if(u_scene>=6.5 && u_scene<7.5) motif=queue;
  else if(u_scene>=7.5 && u_scene<8.5) motif=support;
  else if(u_scene>=8.5 && u_scene<9.5) motif=portal;
  return min(motif,min(steps,architecture));
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
  if (path.includes('login') || path.includes('auth') || document.querySelector('.access-portal, .nx-access-portal, .access-content')) return 9
  if ((path === '/' || path.endsWith('/index.html')) && !document.querySelector('.app-shell')) return 0
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
    let drawFrame = null
    let lastFrame = 0
    const frameInterval = 1000 / 30

    const onPointer = (event) => {
      pointer = [
        (event.clientX / Math.max(innerWidth, 1) - .5) * 2,
        (event.clientY / Math.max(innerHeight, 1) - .5) * -2,
      ]
    }
    const updateScene = () => {
      const heading = document.querySelector('.page-heading h1, .access-content h1, main h1')?.textContent || ''
      const nextScene = sceneFor(heading, location.pathname)
      if (nextScene === scene) return
      scene = nextScene
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
          if (!reduced && now - lastFrame < frameInterval) { raf = requestAnimationFrame(draw); return }
          lastFrame = now
          const dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 0.78 : 1.05)
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
        drawFrame = draw
        draw(performance.now())
      } catch (error) {
        console.warn('NexaPos 3D layer unavailable; using accessible DOM fallback.', error)
      }
    }

    resizeObserver = new ResizeObserver(() => {
      if (!lost && !reduced) {
        cancelAnimationFrame(raf)
        lastFrame = 0
        if (drawFrame) raf = requestAnimationFrame(drawFrame)
        else initialize()
      }
    })
    resizeObserver.observe(document.documentElement)
    initialize()

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf)
      else if (!reduced && !lost) {
        start = performance.now()
        lastFrame = 0
        if (drawFrame && gl) raf = requestAnimationFrame(drawFrame)
        else initialize()
      }
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
