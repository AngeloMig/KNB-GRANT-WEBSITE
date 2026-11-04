import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadIPhoneModels, type PhoneFinish } from "./iphone-model";

interface Preview {
  name: string;
  image: string;
  href: string;
  bg: string;
  fg: string;
}

export async function screenTexture(project: Preview, mobile: boolean, options: { width?: number; aspect?: number } = {}) {
  const image = new Image();
  image.src = mobile && !options.width ? project.image.replace('-440.webp', '-330.webp') : project.image;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = options.width ?? (mobile ? 256 : 512);
  canvas.height = Math.round(canvas.width / (options.aspect ?? (512 / 1110)));
  const ctx = canvas.getContext("2d")!;
  const logicalHeight = canvas.height * 512 / canvas.width;
  ctx.scale(canvas.width / 512, canvas.width / 512);
  ctx.fillStyle = project.bg;
  ctx.fillRect(0, 0, 512, logicalHeight);
  // Keep website navigation below the model's actual Dynamic Island and leave
  // room for the home indicator. Draw at the source aspect ratio, never stretched.
  const topInset = 76, bottomInset = 30;
  const sourceHeight = Math.min(
    image.naturalHeight,
    (image.naturalWidth * (logicalHeight - topInset - bottomInset)) / 512,
  );
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    sourceHeight,
    0,
    topInset,
    512,
    sourceHeight * 512 / image.naturalWidth,
  );
  ctx.fillStyle = project.fg;
  ctx.font = "500 17px sans-serif";
  ctx.fillText("9:41", 34, 42);
  ctx.fillRect(435, 30, 24, 11);
  ctx.fillRect(462, 33, 3, 5);
  ctx.fillRect(403, 36, 3, 5);
  ctx.fillRect(409, 33, 3, 8);
  ctx.fillRect(415, 30, 3, 11);
  ctx.fillStyle = project.bg;
  ctx.fillRect(0, logicalHeight - bottomInset, 512, bottomInset);
  ctx.fillStyle = project.fg;
  ctx.fillRect(195, logicalHeight - 12, 122, 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = mobile ? 1 : 4;
  return texture;
}

export async function mountPhoneScene(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("[data-phone-scene]")!;
  const canvas = stage.querySelector<HTMLCanvasElement>("canvas")!;
  const projects: Preview[] = JSON.parse(root.dataset.projects || "[]");
  if (projects.length < 2) return;
  const mobile = matchMedia('(max-width: 640px), (pointer: coarse)').matches;
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const constrained = !!device.connection?.saveData || (device.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !mobile || !constrained,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? (constrained ? 1 : 1.25) : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.9;
  const scene = new THREE.Scene();
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04, 0.1, 100, { size: mobile ? 64 : 128 });
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.8;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc7c9d0, 1.2));
  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(-3, 6, 8);
  scene.add(light);
  const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 100);
  camera.position.set(0, 0, 18);
  const pair = new THREE.Group();
  scene.add(pair);
  const phones = await loadIPhoneModels(root.dataset.modelUrl!, mobile).catch(error => {
    environment.dispose();
    renderer.dispose();
    throw error;
  });
  phones[0].group.position.set(-1.5, -0.08, 0.4);
  phones[1].group.position.set(1.5, 0.27, -0.35);
  pair.add(...phones.map((p) => p.group));
  let index = 0,
    changeId = 0;
  const cache = new Map<string, Promise<THREE.CanvasTexture>>();
  const getTexture = (project: Preview) => {
    if (!cache.has(project.image))
      cache.set(project.image, screenTexture(project, mobile).catch(error => {
        cache.delete(project.image);
        throw error;
      }));
    return cache.get(project.image)!;
  };
  const setProjects = async () => {
    const id = ++changeId;
    const selected = [
      projects[index % projects.length],
      projects[(index + 1) % projects.length],
    ];
    const textures = await Promise.all(selected.map(getTexture));
    if (disposed || id !== changeId) return;
    phones.forEach((phone, i) => {
      const firstMap = !phone.material.map;
      phone.material.map = textures[i];
      if (firstMap) phone.material.needsUpdate = true;
      const link = root.querySelector<HTMLAnchorElement>(
        `[data-project-link="${i}"]`,
      )!;
      link.href = selected[i].href;
      link.querySelector("strong")!.textContent = `${selected[i].name} ↗`;
    });
    // Only retain the visible pair on mobile.
    if (mobile) for (const [key, texture] of cache) {
      if (!selected.some(project => project.image === key)) {
        void texture.then(t => t.dispose());
        cache.delete(key);
      }
    }
    stage.dataset.cachedScreens = String(cache.size);
    requestFrame();
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reduced.matches || (mobile && constrained),
    visible = false,
    running = false,
    targetAngle = 0,
    angle = 0,
    tiltX = 0,
    tiltY = 0,
    idle = 0,
    last = performance.now(),
    frameId = 0;
  let scrolling = false, scrollTimer = 0, disposed = false, lost = false;
  let autoPauseAt = performance.now() + (mobile ? 6000 : 10000);
  let renders = 0, diagnosticAt = 0;
  stage.dataset.quality = mobile ? 'mobile' : 'desktop';
  stage.dataset.pixelRatio = String(renderer.getPixelRatio());
  stage.dataset.screenWidth = mobile ? '256' : '512';
  const motionButton = root.querySelector<HTMLButtonElement>("[data-motion]")!;
  const updateMotion = () => {
    motionButton.textContent = paused ? "Resume motion" : "Pause motion";
    motionButton.setAttribute("aria-pressed", String(paused));
  };
  const tick = (time: number) => {
    if (!visible || document.hidden || scrolling || disposed || lost) {
      running = false;
      return;
    }
    const interacting = dragging || Math.abs(targetAngle - angle) > 0.0005;
    const interval = mobile && !interacting ? 1000 / 30 : 1000 / 60;
    if (time - last < interval - 1) { frameId = requestAnimationFrame(tick); return; }
    const dt = Math.min((time - last) / 1000, 0.1);
    last = time;
    if (!paused && time >= autoPauseAt) { paused = true; updateMotion(); }
    if (!paused) idle += dt;
    if (reduced.matches) angle = targetAngle;
    else angle += (targetAngle - angle) * (1 - Math.exp(-10 * dt));
    pair.rotation.y = angle + tiltY;
    pair.rotation.x = tiltX;
    phones.forEach((phone, i) => {
      const sign = i === 0 ? -1 : 1;
      phone.group.rotation.set(
        0.04,
        (i === 1 ? Math.PI : 0) +
          sign * 0.23 +
          Math.sin(idle * 0.45 + i) * 0.045,
        sign * -0.13,
      );
      phone.group.position.y =
        (i === 0 ? -0.08 : 0.27) + Math.sin(idle * 0.7 + i * 2) * 0.06;
    });
    renderer.render(scene, camera);
    renders++;
    const active = !paused || dragging || Math.abs(targetAngle - angle) > 0.0005;
    if (time - diagnosticAt > 1000 || !active) {
      stage.dataset.renderCount = String(renders);
      stage.dataset.triangles = String(renderer.info.render.triangles);
      stage.dataset.drawCalls = String(renderer.info.render.calls);
      diagnosticAt = time;
    }
    stage.dataset.renderState = active ? 'animating' : 'idle';
    if (active) {
      frameId = requestAnimationFrame(tick);
    } else running = false;
  };
  function requestFrame() {
    if (!running && visible && !document.hidden && !scrolling && !disposed && !lost) {
      running = true;
      last = performance.now();
      frameId = requestAnimationFrame(tick);
    }
  }
  function stop(state: string) {
    cancelAnimationFrame(frameId);
    running = false;
    stage.dataset.renderState = state;
    stage.dataset.renderCount = String(renders);
  }
  const finishNames: Record<PhoneFinish, string> = { silver: 'Silver', 'cosmic-orange': 'Cosmic Orange', 'deep-blue': 'Deep Blue' };
  const setFinish = (finish: PhoneFinish) => {
    phones[0].setFinish(finish === 'silver' ? 'deep-blue' : 'silver');
    phones[1].setFinish(finish);
    stage.dataset.finish = finish;
    root.querySelector('[data-finish-label]')!.textContent = finishNames[finish];
    root.querySelectorAll<HTMLButtonElement>('[data-finish]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.finish === finish)));
    requestFrame();
  };
  root.querySelectorAll<HTMLButtonElement>('[data-finish]').forEach(button => button.addEventListener('click', () => setFinish(button.dataset.finish as PhoneFinish)));
  setFinish('deep-blue');
  let previousWidth = 0, previousHeight = 0;
  const resize = () => {
    const width = stage.clientWidth,
      height = stage.clientHeight,
      halfHeight = width < 450 ? 4.8 : 3.85;
    if (!width || !height || (width === previousWidth && height === previousHeight)) return;
    previousWidth = width; previousHeight = height;
    camera.left = (-width / height) * halfHeight;
    camera.right = -camera.left;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestFrame();
  };
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(stage);
  resize();
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestFrame();
      else stop('offscreen');
    },
    { threshold: 0 },
  );
  visibilityObserver.observe(stage);
  const visibility = () => {
    if (!document.hidden) requestFrame();
    else stop('hidden');
  };
  document.addEventListener("visibilitychange", visibility);
  const onScroll = () => {
    scrolling = true;
    stop('scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      scrolling = false;
      if (visible) requestFrame(); else stop('offscreen');
    }, 140);
  };
  if (mobile) addEventListener('scroll', onScroll, { passive: true });
  root.querySelectorAll<HTMLButtonElement>("[data-rotate]").forEach((button) =>
    button.addEventListener("click", () => {
      targetAngle += (Number(button.dataset.rotate) * Math.PI) / 3;
      requestFrame();
    }),
  );
  root.querySelector("[data-reset]")?.addEventListener("click", () => {
    targetAngle = 0;
    tiltX = 0;
    tiltY = 0;
    requestFrame();
  });
  motionButton.addEventListener("click", () => {
    paused = !paused;
    autoPauseAt = Infinity;
    updateMotion();
    requestFrame();
  });
  root.querySelector("[data-next]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    const previous = index;
    index = (index + 2) % projects.length;
    try { await setProjects(); }
    catch {
      index = previous;
      root.querySelector('[data-scene-note]')!.textContent = 'Couldn’t load those previews. Please try again.';
    } finally { button.disabled = false; }
  });
  const onReduced = () => {
    paused = reduced.matches || (mobile && constrained);
    autoPauseAt = performance.now() + (mobile ? 6000 : 10000);
    updateMotion();
    requestFrame();
  };
  reduced.addEventListener("change", onReduced);
  updateMotion();
  let dragging = false, lastX = 0;
  let pointer: { id: number; x: number; y: number } | undefined;
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    lastX = event.clientX;
    // Capture only a horizontal drag, leaving vertical swipes to the browser.
  });
  stage.addEventListener("pointermove", (event) => {
    if (pointer?.id === event.pointerId) {
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      if (!dragging) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { pointer = undefined; return; }
        if (Math.abs(dx) < 6) return;
        dragging = true;
        stage.setPointerCapture(event.pointerId);
      }
      targetAngle += (event.clientX - lastX) * 0.009;
      lastX = event.clientX;
    } else if (event.pointerType === "mouse" && !mobile && !reduced.matches) {
      const rect = stage.getBoundingClientRect();
      tiltY = ((event.clientX - rect.left) / rect.width - 0.5) * 0.12;
      tiltX = ((event.clientY - rect.top) / rect.height - 0.5) * 0.06;
    } else return;
    requestFrame();
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    window.addEventListener(event, () => {
      dragging = false;
      pointer = undefined;
      requestFrame();
    });
  stage.addEventListener("pointerleave", () => {
    tiltX = 0;
    tiltY = 0;
    requestFrame();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    stage.classList.remove("ready");
    stop('context-lost');
    root.querySelector('[data-scene-note]')!.textContent = '3D paused. Reload to try again.';
    root.querySelectorAll<HTMLButtonElement>('.phone-scene-controls button, [data-next]').forEach(button => button.disabled = true);
  });
  const dispose = () => {
    disposed = true;
    stop('disposed');
    clearTimeout(scrollTimer);
    removeEventListener('scroll', onScroll);
    sizeObserver.disconnect();
    visibilityObserver.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    reduced.removeEventListener("change", onReduced);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        meshMaterials.forEach((material) => {
          materials.add(material);
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        });
      }
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    cache.forEach((texture) => void texture.then((t) => t.dispose()));
    environment.dispose();
    renderer.dispose();
  };
  addEventListener(
    "pagehide",
    (event) => {
      if (!event.persisted) dispose();
      else stop('hidden');
    },
  );
  addEventListener('pageshow', () => requestFrame());
  try { await setProjects(); }
  catch (error) { dispose(); throw error; }
  stage.classList.add("ready");
  root.querySelectorAll<HTMLButtonElement>('.phone-scene-controls button, [data-next], [data-finish]').forEach(button => button.disabled = false);
  requestFrame();
}
