'use strict';
(() => {
  const TAU = Math.PI * 2;
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const lerp = (a,b,t) => a + (b-a)*t;
  const easeInOut = t => t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;

  function mat4Identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
  function mat4Perspective(fovy,aspect,near,far){
    const f=1/Math.tan(fovy/2), nf=1/(near-far), o=new Float32Array(16);
    o[0]=f/aspect;o[5]=f;o[10]=(far+near)*nf;o[11]=-1;o[14]=2*far*near*nf;return o;
  }
  function mat4Multiply(a,b){
    const o=new Float32Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];
    return o;
  }
  function mat4Translate(z){const o=mat4Identity();o[14]=z;return o;}
  function mat4RotateX(a){const c=Math.cos(a),s=Math.sin(a),o=mat4Identity();o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o;}
  function mat4RotateY(a){const c=Math.cos(a),s=Math.sin(a),o=mat4Identity();o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o;}
  function mat4RotateZ(a){const c=Math.cos(a),s=Math.sin(a),o=mat4Identity();o[0]=c;o[1]=s;o[4]=-s;o[5]=c;return o;}

  function createShader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader compile failed');return s;}
  function createProgram(gl,vs,fs){const p=gl.createProgram();gl.attachShader(p,createShader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,createShader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Program link failed');return p;}
  function makeSphere(latSeg=64,lonSeg=96,radius=1){
    const pos=[],norm=[],uv=[],idx=[];
    for(let y=0;y<=latSeg;y++){
      const v=y/latSeg, phi=(.5-v)*Math.PI, cp=Math.cos(phi), sp=Math.sin(phi);
      for(let x=0;x<=lonSeg;x++){
        const u=x/lonSeg, th=(u-.5)*TAU, ct=Math.cos(th), st=Math.sin(th);
        const nx=cp*ct, ny=sp, nz=cp*st;
        pos.push(nx*radius,ny*radius,nz*radius);norm.push(nx,ny,nz);uv.push(u,1-v);
      }
    }
    const row=lonSeg+1;
    for(let y=0;y<latSeg;y++)for(let x=0;x<lonSeg;x++){
      const a=y*row+x,b=a+row,c=b+1,d=a+1;idx.push(a,b,d,b,c,d);
    }
    return {pos:new Float32Array(pos),norm:new Float32Array(norm),uv:new Float32Array(uv),idx:new Uint16Array(idx)};
  }

  const SURFACE_VS = `
    attribute vec3 aPos;attribute vec3 aNormal;attribute vec2 aUV;
    uniform mat4 uMVP;uniform mat4 uModel;
    varying vec3 vNormal;varying vec2 vUV;varying vec3 vWorld;
    void main(){vec4 w=uModel*vec4(aPos,1.0);vWorld=w.xyz;vNormal=normalize((uModel*vec4(aNormal,0.0)).xyz);vUV=aUV;gl_Position=uMVP*vec4(aPos,1.0);}
  `;
  const SURFACE_FS = `
    precision highp float;
    varying vec3 vNormal;varying vec2 vUV;varying vec3 vWorld;
    uniform sampler2D uDay;uniform sampler2D uNight;uniform sampler2D uRussia;
    uniform float uNightReady;uniform float uRussiaReady;uniform float uRussiaGlow;
    uniform vec3 uLight;uniform vec3 uCamera;uniform float uTime;
    void main(){
      vec3 N=normalize(vNormal);vec3 L=normalize(uLight);vec3 V=normalize(uCamera-vWorld);
      float ndl=dot(N,L);float daylight=smoothstep(-0.14,0.28,ndl);
      vec3 day=texture2D(uDay,vUV).rgb;
      float ocean=smoothstep(0.02,0.19,day.b-max(day.r,day.g)*0.78);
      float diff=max(ndl,0.0);
      vec3 H=normalize(L+V);float spec=pow(max(dot(N,H),0.0),72.0)*ocean*1.15;
      vec3 lit=day*(0.18+0.96*diff)+vec3(0.32,0.55,0.95)*spec;
      vec3 night=texture2D(uNight,vUV).rgb;
      float city=max(max(night.r,night.g),night.b);
      vec3 nightCol=mix(day*0.035,night*1.45,step(0.02,city)*uNightReady);
      vec3 color=mix(nightCol,lit,daylight);
      float rim=pow(1.0-max(dot(N,V),0.0),3.2);
      color+=vec3(0.05,0.22,0.46)*rim*(0.25+0.75*daylight);

      vec4 ru=texture2D(uRussia,vUV);
      float fill=ru.r*uRussiaReady*uRussiaGlow;
      float edge=ru.g*uRussiaReady*uRussiaGlow;
      float halo=ru.b*uRussiaReady*uRussiaGlow;
      float pulse=.86+.14*sin(uTime*5.0);
      vec3 ruBlue=vec3(.075,.50,1.0);
      color=mix(color,color*.63+ruBlue*.52,fill*.50);
      color+=ruBlue*(edge*1.30+halo*.34)*pulse;

      color=pow(color,vec3(0.91));
      gl_FragColor=vec4(color,1.0);
    }
  `;
  const CLOUD_FS = `
    precision highp float;varying vec3 vNormal;varying vec2 vUV;varying vec3 vWorld;
    uniform vec3 uLight;uniform vec3 uCamera;uniform float uTime;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    /* Three octaves retain the cloud silhouette while cutting the most
       expensive full-screen shader pass almost in half. */
    float fbm(vec2 p){float v=0.,a=.56;for(int i=0;i<3;i++){v+=a*noise(p);p=p*2.03+17.3;a*=.46;}return v;}
    void main(){
      vec2 uv=vUV;uv.x=fract(uv.x+uTime*.0032);
      float n=fbm(uv*vec2(8.,4.));float n2=fbm(uv*vec2(18.,9.)+5.7);
      float clouds=smoothstep(.56,.74,n*.72+n2*.28);
      clouds*=smoothstep(.04,.16,uv.y)*smoothstep(.04,.16,1.0-uv.y);
      vec3 N=normalize(vNormal);float light=.35+.65*max(dot(N,normalize(uLight)),0.0);
      float rim=pow(1.0-max(dot(N,normalize(uCamera-vWorld)),0.0),2.0);
      gl_FragColor=vec4(vec3(.92,.97,1.0)*(light+.18*rim),clouds*.44);
    }
  `;
  const ATMO_FS = `
    precision highp float;varying vec3 vNormal;varying vec2 vUV;varying vec3 vWorld;
    uniform vec3 uLight;uniform vec3 uCamera;uniform float uTime;
    void main(){vec3 N=normalize(vNormal),V=normalize(uCamera-vWorld);float rim=pow(1.0-max(dot(N,V),0.0),3.1);float sun=.35+.65*max(dot(N,normalize(uLight)),0.0);vec3 c=mix(vec3(.04,.18,.52),vec3(.16,.61,1.0),sun);gl_FragColor=vec4(c,rim*.38);}
  `;

  function Globe(canvas,status){
    this.canvas=canvas;this.status=status;
    this.mobile=matchMedia('(max-width:640px)').matches;
    this.lowPower=this.mobile||((navigator.hardwareConcurrency||8)<=4)||((navigator.deviceMemory||8)<=4);
    this.gl=canvas.getContext('webgl',{alpha:true,antialias:!this.lowPower,premultipliedAlpha:false,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');
    if(!this.gl)throw new Error('WebGL unavailable');
    const gl=this.gl;gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(0,0,0,0);
    this.surface=createProgram(gl,SURFACE_VS,SURFACE_FS);this.cloud=createProgram(gl,SURFACE_VS,CLOUD_FS);this.atmo=createProgram(gl,SURFACE_VS,ATMO_FS);
    this.geo=makeSphere(this.mobile?40:56,this.mobile?64:88,1);
    this.buffers={};
    const upload=(name,data,target=gl.ARRAY_BUFFER)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);this.buffers[name]=b;};
    upload('pos',this.geo.pos);upload('norm',this.geo.norm);upload('uv',this.geo.uv);upload('idx',this.geo.idx,gl.ELEMENT_ARRAY_BUFFER);
    this.rotationX=0.16;this.rotationY=0.08;this.cloudOffset=0;this.cameraZ=3.05;this.dragging=false;this.dragMoved=false;this.lastX=0;this.lastY=0;this.velX=0;this.velY=0;this.fly=null;this.running=true;this.lastTime=performance.now();
    this.lastRenderTime=0;this.frameSamples=[];this.qualityScale=this.lowPower ? .78 : .92;this.lastQualityCheck=0;this.lastFlightEvent=0;this.lastFlightPercent=-1;
    this.light=new Float32Array([-2.8,1.5,3.8]);this.camera=new Float32Array(3);
    this.programInfo=new Map();
    [this.surface,this.cloud,this.atmo].forEach(program=>this.programInfo.set(program,{
      program,
      attrib:{pos:gl.getAttribLocation(program,'aPos'),norm:gl.getAttribLocation(program,'aNormal'),uv:gl.getAttribLocation(program,'aUV')},
      uniform:Object.fromEntries(['uMVP','uModel','uLight','uCamera','uTime','uDay','uNight','uRussia','uNightReady','uRussiaReady','uRussiaGlow'].map(name=>[name,gl.getUniformLocation(program,name)]))
    }));
    this.russiaGlow=0;this.flightProgress=0;
    this.dayTex=this.makeSolidTexture([44,88,128,255]);this.nightTex=this.makeSolidTexture([0,0,0,255]);this.russiaTex=this.makeSolidTexture([0,0,0,255]);this.nightReady=0;this.russiaReady=0;
    this.loadTexture('earth-texture.png',tex=>{this.dayTex=tex;this.statusText('3D / LOCAL TEXTURE');});
    this.loadTexture('russia-highlight.png',tex=>{this.russiaTex=tex;this.russiaReady=1;});
    this.loadTextureCandidates([
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
      'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/textures/planets/earth_atmos_2048.jpg',
      'https://www.inf.u-szeged.hu/~tanacs/threejs/examples/textures/planets/earth_atmos_2048.jpg'
    ],tex=>{this.dayTex=tex;this.statusText('SATELLITE EARTH / 3D');});
    this.loadTextureCandidates([
      'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
      'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/textures/planets/earth_lights_2048.png',
      'https://www.inf.u-szeged.hu/~tanacs/threejs/examples/textures/planets/earth_lights_2048.png'
    ],tex=>{this.nightTex=tex;this.nightReady=1;});
    this.bindEvents();this.resize();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
  }
  Globe.prototype.statusText=function(t){if(this.status)this.status.textContent=t;};
  Globe.prototype.makeSolidTexture=function(rgba){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(rgba));return t;};
  Globe.prototype.loadTexture=function(url,ok,fail){const img=new Image();if(/^https?:/.test(url))img.crossOrigin='anonymous';img.onload=()=>{const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);ok&&ok(t);};img.onerror=()=>fail&&fail();img.src=url;};
  Globe.prototype.loadTextureCandidates=function(urls,ok){let done=false;urls.forEach(url=>this.loadTexture(url,tex=>{if(done)return;done=true;ok&&ok(tex);},()=>{}));};
  Globe.prototype.bindEvents=function(){
    const c=this.canvas;
    c.addEventListener('pointerdown',e=>{this.dragging=true;this.dragMoved=false;this.lastX=e.clientX;this.lastY=e.clientY;this.velX=this.velY=0;c.setPointerCapture?.(e.pointerId);});
    c.addEventListener('pointermove',e=>{if(!this.dragging)return;const dx=e.clientX-this.lastX,dy=e.clientY-this.lastY;if(Math.abs(dx)+Math.abs(dy)>2)this.dragMoved=true;this.rotationY+=dx*.006;this.rotationX=clamp(this.rotationX+dy*.004,-1.05,1.05);this.velY=dx*.00085;this.velX=dy*.00055;this.lastX=e.clientX;this.lastY=e.clientY;});
    const up=e=>{if(!this.dragging)return;this.dragging=false;c.releasePointerCapture?.(e.pointerId);if(!this.dragMoved)document.getElementById('enter-russia')?.click();};
    c.addEventListener('pointerup',up);c.addEventListener('pointercancel',()=>{this.dragging=false;});
    c.addEventListener('wheel',e=>{e.preventDefault();this.cameraZ=clamp(this.cameraZ+e.deltaY*.0016,2.25,4.1);},{passive:false});
    window.addEventListener('resize',()=>this.resize());
  };
  Globe.prototype.resize=function(){const gl=this.gl,c=this.canvas,rect=c.getBoundingClientRect(),cap=this.mobile?1.25:1.65,dpr=Math.min(devicePixelRatio||1,cap)*this.qualityScale;const w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;gl.viewport(0,0,w,h);}this.aspect=w/h;};
  Globe.prototype.setAttribs=function(info){const gl=this.gl;gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.buffers.idx);[['pos','pos',3],['norm','norm',3],['uv','uv',2]].forEach(([name,key,size])=>{const loc=info.attrib[name];if(loc<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[key]);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);});};
  Globe.prototype.draw=function(program,model,time){const gl=this.gl,info=this.programInfo.get(program),u=info.uniform;gl.useProgram(program);this.setAttribs(info);const proj=mat4Perspective(Math.PI/4,this.aspect,.1,20),view=mat4Translate(-this.cameraZ),mvp=mat4Multiply(proj,mat4Multiply(view,model));gl.uniformMatrix4fv(u.uMVP,false,mvp);gl.uniformMatrix4fv(u.uModel,false,model);this.camera[2]=this.cameraZ;if(u.uLight!==null)gl.uniform3fv(u.uLight,this.light);if(u.uCamera!==null)gl.uniform3fv(u.uCamera,this.camera);if(u.uTime!==null)gl.uniform1f(u.uTime,time);
    if(program===this.surface){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.dayTex);gl.uniform1i(u.uDay,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.nightTex);gl.uniform1i(u.uNight,1);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.russiaTex);gl.uniform1i(u.uRussia,2);gl.uniform1f(u.uNightReady,this.nightReady);gl.uniform1f(u.uRussiaReady,this.russiaReady);gl.uniform1f(u.uRussiaGlow,this.russiaGlow);}
    gl.drawElements(gl.TRIANGLES,this.geo.idx.length,gl.UNSIGNED_SHORT,0);
  };
  Globe.prototype.render=function(now){const gl=this.gl,time=now*.001;gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let model=mat4Multiply(mat4RotateZ(-0.18),mat4Multiply(mat4RotateX(this.rotationX),mat4RotateY(this.rotationY)));
    gl.disable(gl.BLEND);gl.depthMask(true);gl.cullFace(gl.BACK);this.draw(this.surface,model,time);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);const cloudModel=mat4Multiply(mat4RotateZ(-0.18),mat4Multiply(mat4RotateX(this.rotationX),mat4Multiply(mat4RotateY(this.rotationY+this.cloudOffset),scaleMatrix(1.014))));this.draw(this.cloud,cloudModel,time);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.cullFace(gl.FRONT);const atmoModel=mat4Multiply(model,scaleMatrix(1.07));this.draw(this.atmo,atmoModel,time);gl.cullFace(gl.BACK);gl.depthMask(true);gl.disable(gl.BLEND);
  };
  function scaleMatrix(s){const o=mat4Identity();o[0]=o[5]=o[10]=s;return o;}
  Globe.prototype.loop=function(now){if(!this.running)return;requestAnimationFrame(this.loop);/* Cap high-refresh displays near 60 FPS so 120/144 Hz screens do not double the GPU load. */if(this.lastRenderTime&&now-this.lastRenderTime<14)return;const frameMs=this.lastRenderTime?now-this.lastRenderTime:16.67,dt=Math.min(.05,frameMs/1000);this.lastRenderTime=now;this.lastTime=now;if(this.fly){const p=clamp((now-this.fly.start)/this.fly.duration,0,1),k=easeInOut(p);this.flightProgress=p;this.rotationX=lerp(this.fly.fromX,this.fly.toX,k);this.rotationY=lerp(this.fly.fromY,this.fly.toY,k);const zoomK=p<.78?easeInOut(p/.78):1;this.cameraZ=lerp(this.fly.fromZ,this.fly.toZ,zoomK);this.russiaGlow=clamp((p-.34)/.46,0,1);const percent=Math.round(p*100);if(p>.54&&percent!==this.lastFlightPercent){this.lastFlightPercent=percent;this.statusText('РОССИЯ / '+percent+'%');}if(now-this.lastFlightEvent>32||p>=1){this.lastFlightEvent=now;window.dispatchEvent(new CustomEvent('ardman-globe-flight',{detail:{progress:p,glow:this.russiaGlow}}));}if(p>=1){this.russiaGlow=1;const resolve=this.fly.resolve;this.fly=null;this.statusText('РОССИЯ / В ФОКУСЕ');resolve();}}else if(!this.dragging){this.rotationY+=.11*dt+this.velY;this.rotationX=clamp(this.rotationX+this.velX,-1.05,1.05);this.velX*=Math.pow(.05,dt);this.velY*=Math.pow(.05,dt);}this.cloudOffset+=.018*dt;this.render(now);this.frameSamples.push(frameMs);if(this.frameSamples.length>60)this.frameSamples.shift();if(now-this.lastQualityCheck>1200&&this.frameSamples.length>=30){this.lastQualityCheck=now;const avg=this.frameSamples.reduce((a,b)=>a+b,0)/this.frameSamples.length,fps=1000/avg;let next=this.qualityScale;if(fps<54)next=Math.max(.56,next-.10);else if(fps>59&&next<1)next=Math.min(1,next+.035);if(Math.abs(next-this.qualityScale)>.015){this.qualityScale=next;this.resize();this.frameSamples.length=0;}}};
  Globe.prototype.flyToRussia=function(){if(this.fly)return this.fly.promise;const duration=2450;let resolve;const promise=new Promise(r=>resolve=r);let targetY=0.0873;let delta=((targetY-this.rotationY+Math.PI)%TAU)-Math.PI;targetY=this.rotationY+delta;this.fly={start:performance.now(),duration,fromX:this.rotationX,fromY:this.rotationY,fromZ:this.cameraZ,toX:1.05,toY:targetY,toZ:1.58,resolve,promise};this.statusText('РОССИЯ / НАВЕДЕНИЕ');document.getElementById('earth-experience')?.classList.add('is-focusing');return promise;};
  Globe.prototype.stop=function(){this.running=false;};

  window.ARDMANGlobe={
    instance:null,
    init(){if(this.instance)return this.instance;const canvas=document.getElementById('earth-canvas');if(!canvas)return null;try{this.instance=new Globe(canvas,document.getElementById('earth-status'));return this.instance;}catch(err){console.error(err);document.getElementById('earth-experience')?.classList.add('webgl-fallback');document.getElementById('earth-status').textContent='3D недоступно · нажмите, чтобы продолжить';return null;}},
    flyToRussia(){const g=this.init();return g?g.flyToRussia():Promise.resolve();},
    stop(){this.instance?.stop();}
  };
})();
