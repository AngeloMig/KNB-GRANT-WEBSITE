import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadIPhoneModels, type PhoneFinish } from './iphone-model';
import { screenTexture } from './phone-scene';

interface OrbitState { turn: number; spread: number; tilt: number }

/** A visual replacement for the six mobile CSS phones, driven by the existing orbit. */
export async function mountOrbitPhones(root: HTMLElement, initial: OrbitState) {
  const ring = root.querySelector<HTMLElement>('.ob-ring')!;
  const canvas = root.querySelector<HTMLCanvasElement>('.ob-model-canvas')!;
  const cards = [...root.querySelectorAll<HTMLElement>('.ob-card')];
  const projects: Parameters<typeof screenTexture>[0][] = JSON.parse(root.dataset.orbitProjects!);
  const mobile = matchMedia('(max-width: 640px)');
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const constrained = !!device.connection?.saveData || (device.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'default' });
  const stillPixelRatio = Math.min(Math.max(devicePixelRatio || 1, 1.5), constrained ? 1.75 : 3);
  let motionPixelRatio = Math.min(stillPixelRatio, constrained ? 1.5 : 2);
  let pixelRatio = stillPixelRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.9;
  const scene = new THREE.Scene();
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const lighting = pmrem.fromScene(studio, 0.04, 0.1, 100, { size: 128 });
  scene.environment = lighting.texture;
  scene.environmentIntensity = 0.7;
  studio.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc7c9d0, 1.2));
  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(-500, 800, 1000); scene.add(light);
  const camera = new THREE.PerspectiveCamera(20, 1, 1, 6000);
  const orbit = new THREE.Group(); scene.add(orbit);
  const textures: THREE.Texture[] = [];
  let phones: Awaited<ReturnType<typeof loadIPhoneModels>> = [];
  try {
    // One decoded model, six geometry-sharing instances, one real project per screen.
    phones = await loadIPhoneModels(root.dataset.orbitModel!, true, projects.length);
    const screens = await Promise.allSettled(projects.map((project, i) => screenTexture(project, true, { width: 720, aspect: phones[i].screenAspect })));
    screens.forEach(result => { if (result.status === 'fulfilled') textures.push(result.value); });
    if (screens.some(result => result.status === 'rejected')) throw new Error('A project screen could not load.');
    const colors: PhoneFinish[] = ['silver', 'cosmic-orange', 'deep-blue'];
    phones.forEach((phone, i) => {
      phone.material.map = textures[i]; phone.material.needsUpdate = true;
      textures[i].anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      phone.setFinish(colors[i % colors.length]);
      orbit.add(phone.group);
    });
  } catch (error) {
    release(); throw error;
  }

  const scales = phones.map(phone => phone.group.scale.clone());
  let state = initial, width = 0, height = 0, phoneHeight = 0, radius = 0;
  let visible = false, disposed = false, scrolling = false, moving = false;
  let frame = 0, scrollTimer = 0, qualityTimer = 0, lastPaint = 0, renders = 0, reportedAt = 0, slowFrames = 0, scrollRenders = 0;
  const events = new AbortController(), options = { signal: events.signal };
  const stop = (reason: string) => {
    cancelAnimationFrame(frame); frame = 0;
    root.dataset.modelState = reason; root.dataset.modelFrames = String(renders);
  };
  const paint = (time: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden || !mobile.matches) return;
    // Cap high-refresh phones at 60; there is no independent ambient render loop.
    const frameBudget = 1000 / 60;
    if (time - lastPaint < frameBudget - 1) { frame = requestAnimationFrame(paint); return; }
    const interval = time - lastPaint;
    // Start at Retina quality, then reduce fill-rate only after sustained slow
    // animation frames. Idle gaps and the initial shader compilation do not count.
    if (moving && interval < 120) slowFrames = interval > frameBudget * 1.45 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames >= 12 && motionPixelRatio > 1.25) {
      motionPixelRatio = Math.max(1.25, motionPixelRatio - 0.25);
      slowFrames = 0;
    }
    // Keep movement at 60 fps with a lighter buffer, then repaint the resting
    // phones at full display density. Geometry and screen textures stay intact.
    const targetPixelRatio = moving ? motionPixelRatio : stillPixelRatio;
    if (pixelRatio !== targetPixelRatio) {
      pixelRatio = targetPixelRatio;
      renderer.setPixelRatio(pixelRatio);
      root.dataset.modelPixelRatio = String(pixelRatio);
    }
    lastPaint = time;
    orbit.rotation.set(-THREE.MathUtils.degToRad(state.tilt), THREE.MathUtils.degToRad(state.turn), 0);
    orbit.position.z = -radius;
    const step = 360 / phones.length;
    const front = ((Math.round(-state.turn / step) % phones.length) + phones.length) % phones.length;
    phones.forEach((phone, i) => {
      const angle = Number(cards[i].dataset.angle) * state.spread;
      const facing = (((angle + state.turn) % 360 + 540) % 360) - 180;
      // The backmost model is fully occluded; skip its draw calls.
      phone.group.visible = Math.abs(facing) < 145 && (state.spread > 0.82 || i === front);
      const radians = THREE.MathUtils.degToRad(angle);
      phone.group.position.set(Math.sin(radians) * radius, -phoneHeight / 2, Math.cos(radians) * radius);
      phone.group.rotation.y = radians;
    });
    renderer.render(scene, camera); renders++;
    if (import.meta.env.DEV && scrolling) root.dataset.modelScrollFrames = String(++scrollRenders);
    const renderState = moving ? 'moving' : 'idle';
    if (root.dataset.modelState !== renderState) {
      root.dataset.modelState = renderState;
      root.dataset.modelFrames = String(renders);
    }
    if (import.meta.env.DEV && root.dataset.modelQuality !== (moving ? 'motion' : 'still')) root.dataset.modelQuality = moving ? 'motion' : 'still';
    if (time - reportedAt > 750) {
      root.dataset.modelState = moving ? 'moving' : 'idle';
      root.dataset.modelFrames = String(renders);
      root.dataset.modelTriangles = String(renderer.info.render.triangles);
      root.dataset.modelDrawCalls = String(renderer.info.render.calls);
      if (import.meta.env.DEV) {
        let top = Infinity, bottom = -Infinity;
        const box = new THREE.Box3(), point = new THREE.Vector3();
        const renderHeight = renderer.getSize(new THREE.Vector2()).y;
        phones.forEach(phone => {
          if (!phone.group.visible) return;
          box.setFromObject(phone.group);
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            point.set(x, y, z).project(camera);
            const screenY = (1 - point.y) * renderHeight / 2;
            top = Math.min(top, screenY); bottom = Math.max(bottom, screenY);
          }
        });
        root.dataset.modelBounds = JSON.stringify({ top: Math.round(top), bottom: Math.round(bottom), height: renderHeight });
      }
      reportedAt = time;
    }
  };
  const request = () => {
    if (!frame && visible && mobile.matches && !document.hidden && !disposed) frame = requestAnimationFrame(paint);
  };
  const resize = () => {
    if (!mobile.matches) { stop('desktop'); return; }
    const w = ring.clientWidth, h = ring.clientHeight;
    if (!w || !h || (width === w && height === h)) return;
    width = w; height = h;
    phoneHeight = cards[0].offsetHeight; radius = cards[0].offsetWidth * 1.05;
    // The original CSS phones can extend beyond the ring while tilting. Give the
    // WebGL drawing area the same room, without changing the orbit's layout.
    const padding = Math.ceil(cards[0].offsetWidth * 0.6);
    const renderHeight = height + padding * 2;
    root.style.setProperty('--model-padding', `${padding}px`);
    root.style.setProperty('--model-height', `${renderHeight}px`);
    root.dataset.modelPadding = String(padding);
    phones.forEach((phone, i) => phone.group.scale.copy(scales[i]).multiplyScalar(phoneHeight / 5.7));
    // Match the existing CSS orbit's 1800px perspective and top-aligned cards.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(renderHeight / 3600));
    camera.aspect = width / renderHeight;
    camera.position.set(0, -height / 2, 1800);
    camera.lookAt(0, -height / 2, 0); camera.updateProjectionMatrix();
    renderer.setSize(width, renderHeight, false); request();
  };
  const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(ring); resize();
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request(); else stop('offscreen');
  });
  observer.observe(ring);
  document.addEventListener('visibilitychange', () => document.hidden ? stop('hidden') : request(), options);
  mobile.addEventListener('change', () => mobile.matches ? (resize(), request()) : stop('desktop'), options);
  addEventListener('scroll', () => {
    scrolling = true;
    // Pose changes come from the existing orbit controller. Plain page movement
    // does not need a new WebGL frame for every native scroll event.
    if (!visible) stop('offscreen');
    clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => { scrolling = false; if (visible) request(); else stop('offscreen'); }, 140);
  }, { ...options, passive: true });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); root.classList.remove('ob-model-ready');
    stop('fallback'); disposed = true;
  }, options);
  function release() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    const maps = new Set<THREE.Texture>(textures);
    phones.forEach(phone => phone.group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) maps.add(value);
      }
    }));
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); maps.forEach(t => t.dispose());
    lighting.dispose(); renderer.dispose();
  }
  addEventListener('pagehide', event => {
    stop('hidden');
    if (!event.persisted) { disposed = true; clearTimeout(scrollTimer); clearTimeout(qualityTimer); events.abort(); observer.disconnect(); sizeObserver.disconnect(); release(); }
  }, options);
  addEventListener('pageshow', request, options);
  root.dataset.modelInstances = String(phones.length);
  root.dataset.modelScreenWidth = '720';
  root.dataset.modelPixelRatio = String(renderer.getPixelRatio());
  root.classList.add('ob-model-ready');
  root.querySelector<HTMLElement>('[data-model-credit]')!.hidden = false;
  request();
  return (next: OrbitState) => {
    const changed = next.turn !== state.turn || next.spread !== state.spread || next.tilt !== state.tilt;
    state = next;
    if (changed) {
      moving = true;
      clearTimeout(qualityTimer);
      qualityTimer = window.setTimeout(() => { moving = false; request(); }, 180);
    }
    request();
  };
}
