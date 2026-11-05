import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadIPhoneModels, type PhoneFinish } from './iphone-model';
import { screenTexture } from './phone-scene';

/** One real supplied iPhone, with no ambient animation or rendering during native scroll. */
export async function mountProjectPhone(stage: HTMLElement, root: HTMLElement) {
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas')!;
  const fallback = root.querySelector<HTMLElement>('.device-phone')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const constrained = !!device.connection?.saveData || (device.deviceMemory ?? 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, constrained ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = .9;
  const scene = new THREE.Scene();
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const lighting = pmrem.fromScene(environment, .04, .1, 100, { size: 128 });
  environment.dispose(); pmrem.dispose();
  scene.environment = lighting.texture;
  scene.environmentIntensity = .7;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc7c9d0, 1.2));
  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(-500, 800, 1000); scene.add(light);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000);
  camera.position.z = 1000;
  let phone: Awaited<ReturnType<typeof loadIPhoneModels>>[number] | undefined;
  let texture: THREE.Texture | undefined;
  try {
    [phone] = await loadIPhoneModels(stage.dataset.modelUrl!, true, 1);
    texture = await screenTexture(JSON.parse(stage.dataset.project!), true, { width: 720, aspect: phone.screenAspect });
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    phone.material.map = texture; phone.material.needsUpdate = true;
    phone.setFinish(stage.dataset.finish as PhoneFinish);
    scene.add(phone.group);
  } catch (error) { release(); throw error; }
  const model = phone;
  const baseScale = model.group.scale.clone();
  let yaw = -.2, target = yaw, frame = 0, visible = false, disposed = false;
  let width = 0, height = 0, revealed = false, frames = 0;
  const events = new AbortController(), options = { signal: events.signal };
  const active = () => visible && root.dataset.mode === 'phone' && !document.hidden && !disposed;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };
  const request = () => { if (!frame && active()) frame = requestAnimationFrame(paint); };
  function fail(error?: unknown) {
    stop(); disposed = true;
    root.dispatchEvent(new Event('project-phone-error'));
    if (error) console.warn('The project 3D preview could not render:', error);
  }
  function paint() {
    frame = 0;
    if (!active() || !width || !height) return;
    yaw = reduced.matches || Math.abs(target - yaw) < .0008 ? target : yaw + (target - yaw) * .22;
    model.group.rotation.set(.035, yaw, 0);
    try { renderer.render(scene, camera); } catch (error) { fail(error); return; }
    if (!revealed) {
      revealed = true;
      root.dispatchEvent(new Event('project-phone-ready'));
    }
    if (import.meta.env.DEV) {
      stage.dataset.modelFrames = String(++frames);
      stage.dataset.modelYaw = yaw.toFixed(3);
      stage.dataset.modelTriangles = String(renderer.info.render.triangles);
    }
    if (yaw !== target) request();
  }
  const resize = () => {
    if (root.dataset.mode !== 'phone') { stop(); return; }
    const w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    // Match the large fallback's layout, including its reserved controls area.
    model.group.scale.copy(baseScale).multiplyScalar(fallback.offsetHeight / 5.7);
    model.group.position.set(fallback.offsetLeft + fallback.offsetWidth / 2 - w / 2, h / 2 - fallback.offsetTop - fallback.offsetHeight / 2, 0);
    if (w !== width || h !== height) {
      width = w; height = h;
      camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
      camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    }
    request();
  };
  const size = new ResizeObserver(resize); size.observe(root); size.observe(fallback); resize();
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) request(); else stop(); });
  visibility.observe(root);
  const mode = new MutationObserver(resize);
  mode.observe(root, { attributes: true, attributeFilter: ['data-mode'] });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : request(), options);
  root.querySelectorAll<HTMLButtonElement>('[data-turn]').forEach(button => button.addEventListener('click', () => { target += Number(button.dataset.turn) * Math.PI / 4; request(); }, options));
  const front = () => { target = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2; request(); };
  root.querySelector('[data-front]')!.addEventListener('click', front, options);
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') front();
    else { target += (event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 8; request(); }
  }, options);
  let down: { id: number; x: number; y: number; yaw: number; dragging: boolean } | null = null;
  canvas.addEventListener('pointerdown', event => { if (event.button === 0) down = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: target, dragging: false }; }, options);
  canvas.addEventListener('pointermove', event => {
    if (!down || event.pointerId !== down.id) return;
    const dx = event.clientX - down.x, dy = event.clientY - down.y;
    if (!down.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { down = null; return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.1) return;
      down.dragging = true; canvas.setPointerCapture(event.pointerId);
    }
    if (event.cancelable) event.preventDefault();
    target = down.yaw + dx * .012; request();
  }, options);
  const end = () => { if (down && canvas.hasPointerCapture(down.id)) canvas.releasePointerCapture(down.id); down = null; };
  canvas.addEventListener('pointerup', end, options); canvas.addEventListener('pointercancel', end, options);
  canvas.addEventListener('lostpointercapture', () => { down = null; }, options);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); }, options);
  function release() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    if (texture) textures.add(texture);
    phone?.group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
    lighting.dispose(); renderer.dispose();
  }
  addEventListener('pagehide', event => {
    stop();
    if (!event.persisted) { disposed = true; events.abort(); size.disconnect(); visibility.disconnect(); mode.disconnect(); release(); }
  }, options);
  addEventListener('pageshow', request, options);
  stage.dataset.modelInstances = '1';
  stage.dataset.modelScreenWidth = '720';
  request();
}
