import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface Preview { name: string; image: string; href: string; bg: string; fg: string; }

function outline(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2, r = radius;
  return new THREE.Shape().moveTo(x+r,y).lineTo(x+width-r,y).quadraticCurveTo(x+width,y,x+width,y+r)
    .lineTo(x+width,y+height-r).quadraticCurveTo(x+width,y+height,x+width-r,y+height)
    .lineTo(x+r,y+height).quadraticCurveTo(x,y+height,x,y+height-r)
    .lineTo(x,y+r).quadraticCurveTo(x,y,x+r,y);
}

function face(width: number, height: number, radius: number) {
  const geometry = new THREE.ShapeGeometry(outline(width,height,radius),20);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i=0; i<position.count; i++) uv.setXY(i,position.getX(i)/width+.5,position.getY(i)/height+.5);
  return geometry;
}

function device(kind: 'rounded' | 'squared') {
  const group = new THREE.Group();
  const rounded = kind === 'rounded', w = 2.7, h = rounded ? 5.65 : 5.85, r = rounded ? .4 : .15;
  const metal = new THREE.MeshStandardMaterial({color:rounded ? '#a6a19a' : '#55585c',metalness:1,roughness:.25});
  const dark = new THREE.MeshStandardMaterial({color:'#0d0e10',metalness:.3,roughness:.22});
  const bodyGeometry = new THREE.ExtrudeGeometry(outline(w,h,r),{depth:.16,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:20});
  bodyGeometry.translate(0,0,-.08);
  group.add(new THREE.Mesh(bodyGeometry,metal));
  const bezel = new THREE.Mesh(face(w-.04,h-.04,r-.015),dark); bezel.position.z=.119; group.add(bezel);
  const rear = new THREE.Mesh(face(w-.06,h-.06,r-.02),new THREE.MeshPhysicalMaterial({color:rounded ? '#b8b2a7' : '#393d40',roughness:.32,metalness:.35,clearcoat:.4}));
  rear.position.z=-.12;rear.rotation.y=Math.PI;group.add(rear);
  const screenMaterial = new THREE.MeshBasicMaterial({color:'#fff',toneMapped:false});
  const screen = new THREE.Mesh(face(w-.17,h-.19,Math.max(.055,r-.085)),screenMaterial);
  screen.position.z=.125;group.add(screen);
  const camera = new THREE.Mesh(rounded ? face(.71,.18,.09) : new THREE.CircleGeometry(.045,24),new THREE.MeshBasicMaterial({color:'#090a0c'}));
  camera.position.set(0,h/2-.235,.133);group.add(camera);
  const speaker = new THREE.Mesh(new THREE.BoxGeometry(.4,.014,.012),dark); speaker.position.set(0,h/2-.075,.13);group.add(speaker);
  for(const [side,y,height] of [[1,.6,.62],[-1,.4,.37],[-1,1,.37]] as const){
    const button = new THREE.Mesh(new THREE.BoxGeometry(.055,height,.12),metal);button.position.set(side*(w/2+.039),y,0);group.add(button);
  }
  // Camera bump and separate metal/glass lenses make the reverse a complete model too.
  if(rounded){const bump = new THREE.Mesh(new THREE.ExtrudeGeometry(outline(1.28,1.27,.28),{depth:.08,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:2,steps:1}),metal);bump.position.set(-.57,1.9,-.21);bump.rotation.y=Math.PI;group.add(bump);}
  const lensLocations = rounded ? [[-.88,2.2],[-.88,1.63],[-.29,1.92]] : [[-.95,2.28],[-.95,1.63],[-.95,.98]];
  for(const [x,y] of lensLocations){
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.235,.235,.095,32),metal);rim.rotation.x=Math.PI/2;rim.position.set(x,y,-.24);group.add(rim);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(.18,32),new THREE.MeshPhysicalMaterial({color:'#101a26',metalness:.5,roughness:.08,clearcoat:1}));lens.rotation.y=Math.PI;lens.position.set(x,y,-.29);group.add(lens);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(.055,20),new THREE.MeshBasicMaterial({color:'#31445c'}));dot.rotation.y=Math.PI;dot.position.set(x-.035,y+.035,-.292);group.add(dot);
  }
  const port = new THREE.Mesh(new THREE.BoxGeometry(.31,.035,.1),dark);port.position.set(0,-h/2-.029,0);group.add(port);
  return {group,material:screenMaterial};
}

async function screenTexture(project: Preview) {
  const image = new Image(); image.src=project.image; await image.decode();
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1110;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=project.bg;ctx.fillRect(0,0,512,1110);
  const sourceHeight=Math.min(image.naturalHeight,image.naturalWidth*(1110-66)/512);
  ctx.drawImage(image,0,0,image.naturalWidth,sourceHeight,0,44,512,1044);
  ctx.fillStyle=project.fg;ctx.font='500 17px sans-serif';ctx.fillText('9:41',28,29);
  ctx.fillRect(441,19,24,11);ctx.fillRect(468,22,3,5);
  ctx.fillRect(409,25,3,5);ctx.fillRect(415,22,3,8);ctx.fillRect(421,19,3,11);
  ctx.fillStyle=project.bg;ctx.fillRect(0,1087,512,23);ctx.fillStyle=project.fg;ctx.fillRect(195,1098,122,4);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

export async function mountPhoneScene(root: HTMLElement) {
  const stage=root.querySelector<HTMLElement>('[data-phone-scene]')!;
  const canvas=root.querySelector<HTMLCanvasElement>('canvas')!;
  const projects: Preview[]=JSON.parse(root.dataset.projects || '[]');
  if(projects.length<2)return;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  const scene=new THREE.Scene();
  const room=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff,0xc7c9d0,2.5));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,6,8);scene.add(light);
  const camera=new THREE.OrthographicCamera(-5,5,4,-4,.1,100);camera.position.set(0,0,18);
  const pair=new THREE.Group();scene.add(pair);
  const phones=[device('rounded'),device('squared')];
  phones[0].group.position.set(-1.5,-.08,.4);phones[1].group.position.set(1.5,.27,-.35);
  pair.add(...phones.map(p=>p.group));
  let index=0,changeId=0;
  const cache=new Map<string,Promise<THREE.CanvasTexture>>();
  const getTexture=(project:Preview)=>{if(!cache.has(project.image))cache.set(project.image,screenTexture(project));return cache.get(project.image)!;};
  const setProjects=async()=>{
    const id=++changeId;const selected=[projects[index%projects.length],projects[(index+1)%projects.length]];
    const textures=await Promise.all(selected.map(getTexture));if(id!==changeId)return;
    phones.forEach((phone,i)=>{phone.material.map=textures[i];phone.material.needsUpdate=true;const link=root.querySelector<HTMLAnchorElement>(`[data-project-link="${i}"]`)!;link.href=selected[i].href;link.querySelector('strong')!.textContent=`${selected[i].name} ↗`;});
    requestFrame();
  };
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduced.matches,visible=true,running=false,targetAngle=0,angle=0,tiltX=0,tiltY=0,idle=0,last=performance.now(),frameId=0;
  const motionButton=root.querySelector<HTMLButtonElement>('[data-motion]')!;
  const updateMotion=()=>{motionButton.textContent=paused?'Resume motion':'Pause motion';motionButton.setAttribute('aria-pressed',String(paused));};
  const tick=(time:number)=>{
    if(!visible||document.hidden){running=false;return;}
    const dt=Math.min((time-last)/1000,.05);last=time;if(!paused)idle+=dt;
    angle+=(targetAngle-angle)*.1;pair.rotation.y=angle+tiltY;pair.rotation.x=tiltX;
    phones.forEach((phone,i)=>{const sign=i===0?-1:1;phone.group.rotation.set(.04,sign*.23+Math.sin(idle*.45+i)*.045,sign*-.13);phone.group.position.y=(i===0?-.08:.27)+Math.sin(idle*.7+i*2)*.06;});
    renderer.render(scene,camera);
    if(!paused||Math.abs(targetAngle-angle)>.0005){frameId=requestAnimationFrame(tick);}else running=false;
  };
  function requestFrame(){if(!running&&visible&&!document.hidden){running=true;last=performance.now();frameId=requestAnimationFrame(tick);}}
  const resize=()=>{const width=stage.clientWidth,height=stage.clientHeight,halfHeight=width<450?4.8:3.85;camera.left=-width/height*halfHeight;camera.right=-camera.left;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();renderer.setSize(width,height,false);requestFrame();};
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(stage);resize();
  const visibilityObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)requestFrame();},{threshold:0});visibilityObserver.observe(stage);
  const visibility=()=>{if(!document.hidden)requestFrame();};document.addEventListener('visibilitychange',visibility);
  root.querySelectorAll<HTMLButtonElement>('[data-rotate]').forEach(button=>button.addEventListener('click',()=>{targetAngle+=Number(button.dataset.rotate)*Math.PI/3;requestFrame();}));
  root.querySelector('[data-reset]')?.addEventListener('click',()=>{targetAngle=0;tiltX=0;tiltY=0;requestFrame();});
  motionButton.addEventListener('click',()=>{paused=!paused;updateMotion();requestFrame();});
  root.querySelector('[data-next]')?.addEventListener('click',()=>{index=(index+2)%projects.length;void setProjects();});
  const onReduced=()=>{paused=reduced.matches;updateMotion();requestFrame();};reduced.addEventListener('change',onReduced);updateMotion();
  let dragging=false,lastX=0;
  stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragging=true;lastX=event.clientX;stage.setPointerCapture(event.pointerId);});
  stage.addEventListener('pointermove',event=>{if(dragging){targetAngle+=(event.clientX-lastX)*.009;lastX=event.clientX;}else if(event.pointerType==='mouse'&&!reduced.matches){const rect=stage.getBoundingClientRect();tiltY=((event.clientX-rect.left)/rect.width-.5)*.12;tiltX=((event.clientY-rect.top)/rect.height-.5)*.06;}requestFrame();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(event,()=>{dragging=false;});
  stage.addEventListener('pointerleave',()=>{tiltX=0;tiltY=0;requestFrame();});
  canvas.addEventListener('webglcontextlost',()=>{stage.classList.remove('ready');cancelAnimationFrame(frameId);running=false;});
  const dispose=()=>{cancelAnimationFrame(frameId);sizeObserver.disconnect();visibilityObserver.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',onReduced);scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose());}});cache.forEach(texture=>void texture.then(t=>t.dispose()));environment.dispose();renderer.dispose();};
  addEventListener('pagehide',event=>{if(!event.persisted)dispose();},{once:true});
  await setProjects();renderer.render(scene,camera);stage.classList.add('ready');requestFrame();
}
