import * as THREE from "three";

const canvas = document.querySelector("#drive-view");
const overlay = document.querySelector("#start-overlay");
const startButton = document.querySelector("#start-button");
const speedDisplay = document.querySelector("#speed");
const gearDisplay = document.querySelector("#gear");
const districtDisplay = document.querySelector("#district");
const dayPhaseDisplay = document.querySelector("#day-phase");
const message = document.querySelector("#game-message");
const lightsButton = document.querySelector("#lights-toggle");
const lightsLabel = document.querySelector("#lights-label");

const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#9dbbc4", 300, 2400);

const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 2600);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const hemisphere = new THREE.HemisphereLight("#d9e8ef", "#343b35", 1.5);
scene.add(hemisphere);
const ambient = new THREE.AmbientLight("#bacde6", 0.22);
scene.add(ambient);
const sunlight = new THREE.DirectionalLight("#ffe0b0", 2.4);
sunlight.position.set(-180, 260, 100);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.far = 600;
sunlight.shadow.camera.left = -180;
sunlight.shadow.camera.right = 180;
sunlight.shadow.camera.top = 180;
sunlight.shadow.camera.bottom = -180;
sunlight.shadow.bias = -0.00015;
sunlight.shadow.normalBias = 0.035;
scene.add(sunlight);
scene.add(sunlight.target);

const skyUniforms = {
  uTop: { value: new THREE.Color("#315b91") },
  uHorizon: { value: new THREE.Color("#eab58e") },
  uSunColor: { value: new THREE.Color("#fff0cf") },
  uSunDirection: { value: new THREE.Vector3(0, 0.45, -1) },
  uNight: { value: 0 },
  uTime: { value: 0 },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2400, 48, 32),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDirection;
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSunColor;
      uniform vec3 uSunDirection;
      uniform float uNight;
      uniform float uTime;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      void main() {
        vec3 direction = normalize(vDirection);
        float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
        float gradient = pow(height, 0.68);
        vec3 color = mix(uHorizon, uTop, gradient);

        vec2 cloudUv = direction.xz / max(direction.y + 0.42, 0.24);
        float clouds = noise(cloudUv * 4.2 + vec2(uTime * 0.0015, -uTime * 0.0007));
        float cloudMask = smoothstep(0.53, 0.76, clouds) * (1.0 - smoothstep(0.25, 0.82, direction.y));
        vec3 cloudColor = mix(uHorizon * 1.15, vec3(0.92, 0.96, 1.0), smoothstep(0.08, 0.65, direction.y));
        color = mix(color, cloudColor, cloudMask * (0.25 + 0.45 * (1.0 - uNight)));

        float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
        float sunDisc = smoothstep(0.99955, 0.99982, sunDot) * (1.0 - uNight * 0.92);
        float sunGlow = pow(sunDot, 28.0) * (0.12 + 0.28 * (1.0 - uNight));
        color += uSunColor * (sunDisc * 2.0 + sunGlow);

        float moonDot = max(dot(direction, -normalize(uSunDirection)), 0.0);
        float moonDisc = smoothstep(0.99955, 0.99982, moonDot) * uNight;
        float moonGlow = pow(moonDot, 24.0) * uNight * 0.42;
        color += vec3(0.62, 0.78, 1.0) * (moonDisc * 1.7 + moonGlow);

        vec3 starCell = floor(direction * 420.0);
        float star = step(0.9988, hash31(starCell)) * smoothstep(0.02, 0.38, direction.y);
        color += vec3(0.72, 0.84, 1.0) * star * uNight * (0.55 + 0.45 * sin(uTime * 0.001 + hash31(starCell + vec3(8.0)) * 6.28));
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }),
);
sky.frustumCulled = false;
sky.renderOrder = -1;
scene.add(sky);

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: "#52634e", roughness: 1 }),
  asphalt: new THREE.MeshStandardMaterial({ color: "#30363b", roughness: 0.94 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: "#888d88", roughness: 1 }),
  line: new THREE.MeshStandardMaterial({ color: "#e8d8a4", roughness: 1 }),
  sand: new THREE.MeshStandardMaterial({ color: "#c5a873", roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: "#367f91", roughness: 0.28, metalness: 0.16 }),
  foam: new THREE.MeshStandardMaterial({ color: "#c6e2d7", roughness: 0.72 }),
  mountain: ["#58655d", "#68736a", "#77796d", "#4d5a55"].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  ),
  concrete: new THREE.MeshStandardMaterial({ color: "#929891", roughness: 0.88 }),
  damDetail: new THREE.MeshStandardMaterial({ color: "#414a4a", roughness: 0.62, metalness: 0.2 }),
  bridgeSteel: new THREE.MeshStandardMaterial({
    color: "#53636a",
    metalness: 0.74,
    roughness: 0.28,
  }),
  bridgeCable: new THREE.MeshStandardMaterial({
    color: "#c0aa82",
    metalness: 0.78,
    roughness: 0.25,
  }),
  boost: new THREE.MeshStandardMaterial({
    color: "#39d8ef",
    emissive: "#087f9d",
    emissiveIntensity: 1.8,
    metalness: 0.25,
    roughness: 0.32,
  }),
  palmTrunk: new THREE.MeshStandardMaterial({ color: "#72563a", roughness: 1 }),
  palmLeaf: new THREE.MeshStandardMaterial({ color: "#46644a", roughness: 1 }),
  house: ["#c89468", "#d9c7a2", "#718995", "#b7ba9b", "#bb7863"].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
  ),
  roof: ["#714b3c", "#4c5353", "#8b6042"].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.88 }),
  ),
  door: new THREE.MeshStandardMaterial({ color: "#49392e", roughness: 0.92 }),
  lamp: new THREE.MeshStandardMaterial({
    color: "#fff1bd",
    emissive: "#ffcf74",
    emissiveIntensity: 1.4,
  }),
  streetBulb: new THREE.MeshStandardMaterial({
    color: "#fff0ce",
    emissive: "#ffbd68",
    emissiveIntensity: 0,
    roughness: 0.2,
  }),
  parkedCar: ["#c9343d", "#d7d2c4", "#397e96", "#d4a547", "#46535c"].map((color) =>
    new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.36 }),
  ),
  carGlass: new THREE.MeshStandardMaterial({
    color: "#253b45",
    metalness: 0.22,
    roughness: 0.2,
  }),
  rubber: new THREE.MeshStandardMaterial({ color: "#17191b", roughness: 0.86 }),
  building: ["#6b737a", "#827b73", "#a09583", "#646d77", "#8a8580"].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.84 }),
  ),
  glass: new THREE.MeshStandardMaterial({
    color: "#71919c",
    roughness: 0.24,
    metalness: 0.28,
    emissive: "#16252c",
  }),
  tree: new THREE.MeshStandardMaterial({ color: "#31483b", roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: "#554638", roughness: 1 }),
};

function makeGrainTexture({ flecks = 1800, grooves = false } = {}) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  if (!context) throw new Error("Could not create surface texture.");
  context.fillStyle = "#dedede";
  context.fillRect(0, 0, 512, 512);

  for (let index = 0; index < flecks; index += 1) {
    const shade = Math.floor(142 + Math.random() * 100);
    const alpha = 0.08 + Math.random() * 0.3;
    context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
    const size = 1 + Math.random() * (grooves ? 3 : 2);
    context.fillRect(Math.random() * 512, Math.random() * 512, size, size);
  }
  if (grooves) {
    for (let index = 0; index < 38; index += 1) {
      const shade = Math.random() < 0.5 ? 150 : 250;
      context.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, 0.2)`;
      context.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * 512;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(512, y + (Math.random() - 0.5) * 18);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

materials.grass.map = makeGrainTexture({ flecks: 3600 });
materials.grass.map.repeat.set(130, 62);
materials.grass.needsUpdate = true;
materials.asphalt.map = makeGrainTexture({ flecks: 2600, grooves: true });
materials.asphalt.map.repeat.set(1, 1);
materials.asphalt.needsUpdate = true;
materials.sand.map = makeGrainTexture({ flecks: 4200 });
materials.sand.map.repeat.set(28, 38);
materials.sand.needsUpdate = true;
materials.water.map = makeGrainTexture({ flecks: 2200, grooves: true });
materials.water.map.repeat.set(64, 15);
materials.water.needsUpdate = true;
materials.foam.map = makeGrainTexture({ flecks: 1200 });
materials.foam.map.repeat.set(1, 32);
materials.foam.needsUpdate = true;
materials.concrete.map = makeGrainTexture({ flecks: 2100, grooves: true });
materials.concrete.map.repeat.set(5, 5);
materials.concrete.needsUpdate = true;

const worldHalfWidth = 1120;
const northBoundary = 720;
const southBoundary = -2100;
const roadWidth = 26;
const obstacles = [];
const streetlightFixtures = [];
const bridgeAccentLights = [];
const DAY_PHASE_SECONDS = 5 * 60;
const DAY_CYCLE_SECONDS = DAY_PHASE_SECONDS * 6;
const dayPhases = [
  { name: "MORNING", top: "#567eac", horizon: "#f7bd91", sun: "#ffd1a0", sky: "#b4d2ec", ground: "#58544d", intensity: 1.45, elevation: 0.16, night: 0 },
  { name: "LATE MORNING", top: "#3d93cf", horizon: "#d8efff", sun: "#fff2d6", sky: "#c8e8ff", ground: "#68765d", intensity: 2.45, elevation: 0.62, night: 0 },
  { name: "NOON", top: "#327fc4", horizon: "#d9efff", sun: "#fff9e7", sky: "#d3ecff", ground: "#717b62", intensity: 2.9, elevation: 0.94, night: 0 },
  { name: "AFTERNOON", top: "#5484ac", horizon: "#f5d0a6", sun: "#ffdda9", sky: "#bed7e8", ground: "#655e50", intensity: 2.05, elevation: 0.52, night: 0 },
  { name: "EVENING", top: "#4b527a", horizon: "#f08c76", sun: "#ffb17a", sky: "#a9a0b7", ground: "#48434c", intensity: 0.78, elevation: 0.06, night: 0.42 },
  { name: "NIGHT", top: "#101b38", horizon: "#334466", sun: "#a9c5ff", sky: "#7589b4", ground: "#222b3c", intensity: 0.12, elevation: -0.5, night: 1 },
];
const dayPalette = dayPhases.map((phase) => ({
  ...phase,
  topColor: new THREE.Color(phase.top),
  horizonColor: new THREE.Color(phase.horizon),
  sunColor: new THREE.Color(phase.sun),
  skyColor: new THREE.Color(phase.sky),
  groundColor: new THREE.Color(phase.ground),
}));
const dayScratch = {
  top: new THREE.Color(),
  horizon: new THREE.Color(),
  sun: new THREE.Color(),
  sky: new THREE.Color(),
  ground: new THREE.Color(),
};

function box(parent, width, height, depth, material, position, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? false;
  parent.add(mesh);
  return mesh;
}

function addGround(width, depth, material, x, z, y = -0.08) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(x, y, z);
  ground.receiveShadow = true;
  scene.add(ground);
}

function addGroundRect(left, right, bottom, top, material) {
  addGround(
    right - left,
    top - bottom,
    material,
    (left + right) / 2,
    (bottom + top) / 2,
  );
}

function createRoute() {
  const points = [
    [0, 0, 0],
    [0, 0, -280],
    [150, 0, -420],
    [380, 0, -540],
    [520, 5, -760],
    [520, 18, -1000],
    [360, 34, -1260],
    [220, 52, -1450],
    [-220, 52, -1450],
    [-360, 34, -1260],
    [-520, 18, -1000],
    [-520, 5, -760],
    [-400, 0, -520],
    [-300, 0, -390],
    [-240, 0, -180],
    [-220, 0, 80],
    [-220, 0, 280],
    [-100, 0, 430],
    [140, 0, 450],
    [360, 0, 300],
    [460, 0, 70],
    [360, 0, -160],
    [180, 0, -250],
    [0, 0, 180],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.15);
}

function createRibbon(curve, width, material, heightOffset, segments = 700) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const textureLength = 4;
  const curveLength = curve.getLength();
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    positions.push(
      point.x + side.x * width / 2,
      point.y + heightOffset,
      point.z + side.z * width / 2,
      point.x - side.x * width / 2,
      point.y + heightOffset,
      point.z - side.z * width / 2,
    );
    uvs.push(
      (t * curveLength) / textureLength,
      width / textureLength,
      (t * curveLength) / textureLength,
      0,
    );
    if (index < segments) {
      const current = index * 2;
      indices.push(current, current + 1, current + 2, current + 1, current + 3, current + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = new THREE.Mesh(geometry, material);
  road.receiveShadow = true;
  scene.add(road);
  return road;
}

function addHouse(x, z, style = 0) {
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  const width = 29;
  const depth = 26;
  const wallHeight = 12 + (style % 3) * 2;
  const roofHeight = 8;
  box(house, width + 1, 0.35, depth + 1, materials.sidewalk, [0, 0.18, 0]);
  box(
    house,
    width,
    wallHeight,
    depth,
    materials.house[style % materials.house.length],
    [0, wallHeight / 2 + 0.35, 0],
    { castShadow: true, receiveShadow: true },
  );
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.78, roofHeight, 4, 1, true),
    materials.roof[style % materials.roof.length],
  );
  roof.position.y = wallHeight + 0.35 + roofHeight / 2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  house.add(roof);

  for (const side of [-1, 1]) {
    box(house, 4.2, 4.2, 0.2, materials.glass, [side * 7, wallHeight * 0.62, depth / 2 + 0.12]);
  }
  box(house, 5, 8, 0.24, materials.door, [0, 4.35, depth / 2 + 0.14]);
  scene.add(house);
  obstacles.push({ x, z, halfWidth: width / 2 + 1, halfDepth: depth / 2 + 1 });
}

function addBuilding(x, z, style = 0) {
  const width = 42;
  const depth = 36;
  const height = 28 + style * 4;
  box(scene, width, height, depth, materials.building[style % materials.building.length], [x, height / 2, z], {
    castShadow: true,
    receiveShadow: true,
  });
  box(scene, width + 1, 0.4, depth + 1, materials.sidewalk, [x, 0.2, z]);
  box(scene, width + 1, 1.4, depth + 0.8, materials.damDetail, [x, 0.9, z + depth / 2 + 0.15]);
  for (let floor = 0; floor < 2; floor += 1) {
    for (const windowX of [-13, 0, 13]) {
      box(
        scene,
        5,
        5,
        0.18,
        materials.glass,
        [x + windowX, 7 + floor * 11, z + depth / 2 + 0.1],
      );
    }
  }
  obstacles.push({ x, z, halfWidth: width / 2 + 1, halfDepth: depth / 2 + 1 });
}

function addParkedCar(x, z, yaw, colorIndex) {
  const car = new THREE.Group();
  car.position.set(x, 0, z);
  car.rotation.y = yaw;
  box(car, 2.05, 0.62, 4.5, materials.parkedCar[colorIndex % materials.parkedCar.length], [0, 0.82, 0], {
    castShadow: true,
    receiveShadow: true,
  });
  box(car, 1.66, 0.68, 2.15, materials.carGlass, [0, 1.42, -0.1], { castShadow: true });
  for (const side of [-1, 1]) {
    for (const axle of [-1, 1]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12),
        materials.rubber,
      );
      wheel.position.set(side * 1.04, 0.43, axle * 1.48);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      car.add(wheel);
    }
  }
  for (const side of [-1, 1]) {
    box(car, 0.42, 0.2, 0.12, materials.lamp, [side * 0.66, 0.9, -2.29]);
    box(car, 0.42, 0.2, 0.12, materials.damDetail, [side * 0.66, 0.9, 2.29]);
  }
  scene.add(car);
  obstacles.push({ x, z, halfWidth: 2.8, halfDepth: 2.8 });
}

function addBeam(start, end, radius, material, parent = scene) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
    material,
  );
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  beam.castShadow = true;
  beam.receiveShadow = true;
  parent.add(beam);
  return beam;
}

function addStreetlight(x, z, yaw, roadSide) {
  const pole = new THREE.Group();
  pole.position.set(x, 0, z);
  pole.rotation.y = yaw;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.9, 0.65, 12),
    materials.bridgeSteel,
  );
  base.position.y = 0.33;
  base.castShadow = true;
  pole.add(base);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, 8.6, 12),
    materials.bridgeSteel,
  );
  shaft.position.y = 4.8;
  shaft.castShadow = true;
  pole.add(shaft);

  const armDirection = roadSide > 0 ? -1 : 1;
  addBeam(
    new THREE.Vector3(0, 8.7, 0),
    new THREE.Vector3(armDirection * 2.4, 9.3, 0),
    0.16,
    materials.bridgeSteel,
    pole,
  );

  const housing = box(pole, 1.9, 0.34, 0.86, materials.bridgeSteel, [armDirection * 2.45, 9.23, 0], {
    castShadow: true,
  });
  const bulb = box(pole, 1.28, 0.08, 0.52, materials.streetBulb, [armDirection * 2.45, 9.02, 0]);
  const lampLight = new THREE.PointLight("#ffd6a0", 0, 42, 2);
  lampLight.position.set(armDirection * 2.45, 8.85, 0);
  pole.add(lampLight);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 12, 8),
    new THREE.MeshBasicMaterial({
      color: "#ffc978",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.position.copy(lampLight.position);
  pole.add(glow);

  scene.add(pole);
  streetlightFixtures.push({ bulb, housing, light: lampLight, glow });
  obstacles.push({ x, z, halfWidth: 1.3, halfDepth: 1.3 });
}

function addDamBridge(damZ) {
  const deckTop = 52;
  const deckLength = 520;
  const deckDepth = 42;
  box(scene, 1120, 60, 34, materials.concrete, [0, 15, damZ], {
    castShadow: true,
    receiveShadow: true,
  });
  box(scene, deckLength, 2.4, deckDepth, materials.bridgeSteel, [0, deckTop - 1.2, damZ], {
    castShadow: true,
    receiveShadow: true,
  });

  for (const side of [-1, 1]) {
    const railZ = damZ + side * 19.8;
    box(scene, deckLength, 2.2, 1.2, materials.concrete, [0, deckTop + 1.1, railZ], {
      castShadow: true,
      receiveShadow: true,
    });
    box(scene, deckLength, 0.3, 1.55, materials.bridgeSteel, [0, deckTop + 2.35, railZ], {
      castShadow: true,
    });
    for (let x = -250; x <= 250; x += 12.5) {
      box(scene, 0.34, 1.15, 0.42, materials.bridgeSteel, [x, deckTop + 2.9, railZ]);
    }

    for (let x = -240; x <= 240; x += 60) {
      box(scene, 9, 72, 9, materials.concrete, [x, 13, damZ + side * 23], {
        castShadow: true,
        receiveShadow: true,
      });
      box(scene, 17, 3, 15, materials.concrete, [x, -24, damZ + side * 23], {
        castShadow: true,
      });
    }

    const cablePoints = [
      [-260, 55],
      [-105, 91],
      [105, 91],
      [260, 55],
    ].map(([x, y]) => new THREE.Vector3(x, y, damZ + side * 23));
    for (let segment = 0; segment < cablePoints.length - 1; segment += 1) {
      addBeam(cablePoints[segment], cablePoints[segment + 1], 0.3, materials.bridgeCable);
    }
    for (const towerX of [-105, 105]) {
      box(scene, 4.4, 38, 4.4, materials.bridgeSteel, [towerX, 71, damZ + side * 23], {
        castShadow: true,
        receiveShadow: true,
      });
      box(scene, 7, 1.2, 8, materials.bridgeSteel, [towerX, 90.5, damZ + side * 23], {
        castShadow: true,
      });
    }

    for (let x = -245; x <= 245; x += 20) {
      const absX = Math.abs(x);
      let cableY;
      if (absX <= 105) {
        cableY = 79 + (absX / 105) * 12;
      } else {
        cableY = 91 - ((absX - 105) / 155) * 36;
      }
      addBeam(
        new THREE.Vector3(x, deckTop + 3.5, damZ + side * 23),
        new THREE.Vector3(x, cableY, damZ + side * 23),
        0.11,
        materials.bridgeCable,
      );
    }
  }

  box(scene, 5, 1.2, 48, materials.bridgeSteel, [-105, 90.5, damZ], { castShadow: true });
  box(scene, 5, 1.2, 48, materials.bridgeSteel, [105, 90.5, damZ], { castShadow: true });
  for (const side of [-1, 1]) {
    const marker = new THREE.PointLight("#ffd9a3", 5, 34, 2);
    marker.position.set(side * 105, 92, damZ);
    scene.add(marker);
    bridgeAccentLights.push(marker);
  }

  obstacles.push(
    { x: 0, z: damZ - 19.8, halfWidth: deckLength / 2, halfDepth: 0.8, maxY: 56 },
    { x: 0, z: damZ + 19.8, halfWidth: deckLength / 2, halfDepth: 0.8, maxY: 56 },
    { x: 0, z: damZ, halfWidth: 560, halfDepth: 17, maxY: 45 },
  );
}

function buildWorld() {
  const route = createRoute();
  const routeLength = route.getLength();
  addGroundRect(-1250, 1250, -290, 900, materials.grass);
  addGroundRect(-1250, 1250, -1540, -1010, materials.grass);
  addGroundRect(-1250, 1250, -2100, -1540, materials.water);
  addGroundRect(-1250, -710, -1010, -290, materials.water);
  addGroundRect(-710, -702, -1010, -290, materials.foam);
  addGroundRect(-702, -170, -1010, -290, materials.sand);
  addGroundRect(-170, 170, -1010, -290, materials.grass);
  addGroundRect(170, 702, -1010, -290, materials.sand);
  addGroundRect(702, 710, -1010, -290, materials.foam);
  addGroundRect(710, 1250, -1010, -290, materials.water);
  createRibbon(route, 34, materials.sidewalk, 0.012);
  createRibbon(route, roadWidth, materials.asphalt, 0.036);

  const dashCount = Math.floor(routeLength / 34);
  const dashes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.34, 0.045, 10),
    materials.line,
    dashCount,
  );
  const dash = new THREE.Object3D();
  for (let index = 0; index < dashCount; index += 1) {
    const t = (index + 0.5) / dashCount;
    const point = route.getPointAt(t);
    const tangent = route.getTangentAt(t);
    dash.position.set(point.x, point.y + 0.078, point.z);
    dash.rotation.y = Math.atan2(tangent.x, tangent.z);
    dash.updateMatrix();
    dashes.setMatrixAt(index, dash.matrix);
  }
  dashes.instanceMatrix.needsUpdate = true;
  scene.add(dashes);

  for (let index = 0; index < 13; index += 1) {
    addPalm(610 + (index % 2) * 36, -350 - index * 42);
    addPalm(-610 - (index % 2) * 36, -350 - index * 42);
  }

  for (const x of [-220, -110, 110, 220]) {
    for (const z of [-220, -40, 120, 280]) {
      if ((Math.abs(x) === 110 && z === 280) || x === -220) continue;
      addHouse(x, z, Math.floor(Math.random() * materials.house.length));
    }
  }
  addBuilding(315, -105, 0);
  addBuilding(315, 185, 2);
  for (let index = 0; index < 10; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const z = -220 + Math.floor(index / 2) * 92;
    addParkedCar(side * 35, z, 0, index);
  }
  for (const [x, z] of [
    [-450, 30],
    [-500, 145],
    [-460, 270],
    [520, 310],
    [535, 205],
    [510, -70],
  ]) {
    addTree(x, z);
  }

  for (const side of [-1, 1]) {
    for (let peak = 0; peak < 7; peak += 1) {
      const height = 190 + Math.random() * 150;
      const radius = 160 + Math.random() * 35;
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 7, 2),
        materials.mountain[(peak + (side < 0 ? 1 : 0)) % materials.mountain.length],
      );
      mountain.position.set(side * (900 + (peak % 2) * 130), height / 2, -850 - peak * 145);
      mountain.rotation.y = peak * 0.43;
      mountain.castShadow = true;
      mountain.receiveShadow = true;
      scene.add(mountain);
    }
    for (let rock = 0; rock < 12; rock += 1) {
      const radius = 7 + Math.random() * 8;
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1, 0),
        materials.mountain[rock % materials.mountain.length],
      );
      boulder.scale.set(radius, radius * 0.72, radius);
      boulder.position.set(side * (610 + Math.random() * 25), radius * 0.72, -850 - rock * 48);
      boulder.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      scene.add(boulder);
      obstacles.push({
        x: boulder.position.x,
        z: boulder.position.z,
        halfWidth: radius,
        halfDepth: radius,
      });
    }
  }

  const damZ = -1450;
  addDamBridge(damZ);

  for (let index = 0; index < 32; index += 1) {
    const t = 0.025 + index * 0.03;
    const point = route.getPointAt(t);
    const tangent = route.getTangentAt(t);
    const side = index % 2 === 0 ? 1 : -1;
    const offset = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize().multiplyScalar(22 * side);
    const polePosition = point.clone().add(offset);
    const yaw = Math.atan2(tangent.x, tangent.z);
    addStreetlight(polePosition.x, polePosition.z, yaw, side);
  }

  const boostPads = [];
  for (const t of [0.12, 0.29, 0.47, 0.68, 0.86]) {
    const point = route.getPointAt(t);
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.5, 0.22, 24),
      materials.boost,
    );
    pad.position.set(point.x, point.y + 0.16, point.z);
    pad.castShadow = true;
    scene.add(pad);
    boostPads.push({ x: point.x, z: point.z, cooldown: 0, mesh: pad });
  }

  obstacles.push(
    { x: -worldHalfWidth, z: -650, halfWidth: 3, halfDepth: 1400 },
    { x: worldHalfWidth, z: -650, halfWidth: 3, halfDepth: 1400 },
    { x: 0, z: northBoundary, halfWidth: worldHalfWidth, halfDepth: 3 },
    { x: 0, z: southBoundary, halfWidth: worldHalfWidth, halfDepth: 3 },
  );
  return { route, boostPads };
}

function addPalm(x, z) {
  const palm = new THREE.Group();
  palm.position.set(x, 0, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.05, 12, 7), materials.palmTrunk);
  trunk.position.y = 6;
  trunk.rotation.z = -0.09;
  trunk.castShadow = true;
  palm.add(trunk);
  for (let leaf = 0; leaf < 7; leaf += 1) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(1.05, 9, 5), materials.palmLeaf);
    frond.position.set(Math.sin((leaf / 7) * Math.PI * 2) * 3, 11.6, Math.cos((leaf / 7) * Math.PI * 2) * 3);
    frond.rotation.z = Math.cos((leaf / 7) * Math.PI * 2) * 0.95;
    frond.rotation.x = Math.sin((leaf / 7) * Math.PI * 2) * 0.95;
    frond.castShadow = true;
    palm.add(frond);
  }
  scene.add(palm);
  obstacles.push({ x, z, halfWidth: 2.5, halfDepth: 2.5 });
}

function addTree(x, z) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 7, 7), materials.trunk);
  trunk.position.y = 3.5;
  trunk.castShadow = true;
  tree.add(trunk);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 7), materials.tree);
  crown.position.y = 9;
  crown.scale.set(1, 1.3, 1);
  crown.castShadow = true;
  tree.add(crown);
  scene.add(tree);
  obstacles.push({ x, z, halfWidth: 2.5, halfDepth: 2.5 });
}

function createCar() {
  const car = new THREE.Group();
  const shell = new THREE.Group();
  car.add(shell);

  const paint = new THREE.MeshPhysicalMaterial({
    color: "#c9272d",
    metalness: 0.58,
    roughness: 0.24,
    clearcoat: 0.92,
    clearcoatRoughness: 0.16,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#17191c",
    metalness: 0.4,
    roughness: 0.36,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#172d38",
    metalness: 0.28,
    roughness: 0.14,
    transparent: true,
    opacity: 0.94,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: "#9da5a5",
    metalness: 0.84,
    roughness: 0.2,
  });
  const hoverBlue = new THREE.MeshBasicMaterial({ color: "#28aaff", toneMapped: false });
  const headlamp = new THREE.MeshPhysicalMaterial({
    color: "#fff2d6",
    emissive: "#fff0cf",
    emissiveIntensity: 1.7,
    roughness: 0.16,
  });
  const tailLamp = new THREE.MeshStandardMaterial({
    color: "#fc3237",
    emissive: "#dc1019",
    emissiveIntensity: 1.2,
  });

  const bodyWidth = 1.88;
  const sideProfile = new THREE.Shape();
  sideProfile.moveTo(2.5, 0.52);
  sideProfile.lineTo(2.5, 0.78);
  sideProfile.lineTo(2.23, 0.88);
  sideProfile.lineTo(2.03, 0.96);
  sideProfile.lineTo(1.05, 0.96);
  sideProfile.lineTo(0.62, 1.3);
  sideProfile.lineTo(0.3, 1.42);
  sideProfile.lineTo(-0.52, 1.42);
  sideProfile.lineTo(-1.12, 1.08);
  sideProfile.lineTo(-1.35, 0.97);
  sideProfile.lineTo(-2.2, 0.91);
  sideProfile.lineTo(-2.5, 0.78);
  sideProfile.lineTo(-2.5, 0.52);
  sideProfile.lineTo(2.5, 0.52);
  sideProfile.closePath();

  const bodyGeometry = new THREE.ExtrudeGeometry(sideProfile, {
    depth: bodyWidth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  });
  const body = new THREE.Mesh(bodyGeometry, paint);
  body.rotation.y = Math.PI / 2;
  body.position.x = -bodyWidth / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  shell.add(body);

  box(shell, 1.82, 0.16, 1.08, paint, [0, 0.96, -1.52], { castShadow: true });
  box(shell, 1.74, 0.12, 0.72, paint, [0, 0.96, 1.91], { castShadow: true });
  box(shell, 1.68, 0.09, 0.25, trim, [0, 0.55, 0], { castShadow: true });
  box(shell, 1.5, 0.035, 2.85, hoverBlue, [0, 0.505, 0]);

  const windshield = box(shell, 1.55, 0.08, 0.61, glass, [0, 1.22, -0.89]);
  windshield.rotation.x = -0.52;
  const rearWindow = box(shell, 1.48, 0.08, 0.56, glass, [0, 1.22, 0.84]);
  rearWindow.rotation.x = 0.56;
  box(shell, 1.34, 0.08, 0.92, trim, [0, 1.405, -0.12], { castShadow: true });

  for (const side of [-1, 1]) {
    const sideWindow = box(shell, 0.045, 0.36, 1.0, glass, [side * 0.88, 1.22, -0.02]);
    sideWindow.rotation.x = -0.05;
    box(shell, 0.045, 0.34, 0.09, trim, [side * 0.91, 1.2, -0.6]);
    box(shell, 0.045, 0.34, 0.09, trim, [side * 0.91, 1.2, 0.53]);
    box(shell, 0.055, 0.46, 0.06, trim, [side * 0.91, 1.08, 0.65]);

    const mirror = new THREE.Group();
    mirror.position.set(side * 0.98, 1.13, -0.8);
    box(mirror, 0.1, 0.1, 0.25, trim, [side * 0.04, 0, 0]);
    const mirrorShell = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), paint);
    mirrorShell.scale.set(0.68, 0.62, 1);
    mirrorShell.position.set(side * 0.12, 0.03, -0.02);
    mirrorShell.castShadow = true;
    mirror.add(mirrorShell);
    shell.add(mirror);

    box(shell, 0.035, 0.04, 0.6, trim, [side * 0.925, 0.88, 0.04]);
    box(shell, 0.06, 0.045, 0.22, metal, [side * 0.94, 1.04, 0.11]);

  }

  box(shell, 1.82, 0.22, 0.09, trim, [0, 0.67, -2.49]);
  box(shell, 1.77, 0.07, 0.1, metal, [0, 0.53, -2.51]);
  box(shell, 0.62, 0.12, 0.08, trim, [0, 0.68, -2.52]);
  for (const side of [-1, 1]) {
    for (const offset of [-0.16, 0.16]) {
      const light = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24), headlamp);
      light.rotation.x = Math.PI / 2;
      light.position.set(side * 0.65 + offset, 0.67, -2.54);
      light.castShadow = true;
      shell.add(light);
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 8, 24), metal);
      bezel.position.set(side * 0.65 + offset, 0.67, -2.54);
      shell.add(bezel);
    }
  }
  box(shell, 1.52, 0.16, 0.08, trim, [0, 0.59, -2.52]);
  box(shell, 1.18, 0.11, 0.09, paint, [0, 0.47, -2.5]);

  for (const side of [-1, 1]) {
    const scoop = box(shell, 0.34, 0.045, 0.56, trim, [side * 0.48, 1.005, -1.58]);
    scoop.rotation.x = -0.04;
    box(shell, 0.24, 0.025, 0.42, metal, [side * 0.48, 1.029, -1.58]);
    box(shell, 0.08, 0.025, 1.1, paint, [side * 0.68, 0.987, -1.48]);
  }

  for (const side of [-1, 1]) {
    box(shell, 0.75, 0.2, 0.1, trim, [side * 0.51, 0.91, 2.49]);
    box(shell, 0.58, 0.12, 0.12, tailLamp, [side * 0.53, 0.94, 2.55]);
    box(shell, 0.13, 0.08, 0.11, metal, [side * 0.51, 1.08, 2.53]);
    box(shell, 0.45, 0.12, 0.1, trim, [side * 0.7, 0.61, 2.48]);
  }
  box(shell, 1.84, 0.09, 0.08, trim, [0, 1.03, 2.34], { castShadow: true });
  box(shell, 1.9, 0.07, 0.14, paint, [0, 1.08, 2.38], { castShadow: true });
  box(shell, 0.06, 0.3, 0.26, trim, [0, 0.67, 2.48]);
  for (const side of [-1, 1]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 12), metal);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * 0.58, 0.48, 2.51);
    shell.add(exhaust);
    box(shell, 0.36, 0.045, 0.025, trim, [side * 0.9, 0.72, 0.04]);
  }

  const headlightSources = [];
  const taillightSources = [];
  for (const side of [-1, 1]) {
    const beam = new THREE.SpotLight("#d8eaff", 0, 105, 0.38, 0.52, 1.5);
    beam.position.set(side * 0.62, 0.82, -2.48);
    beam.castShadow = false;
    const target = new THREE.Object3D();
    target.position.set(side * 1.2, 0.2, -42);
    car.add(beam, target);
    beam.target = target;
    headlightSources.push({ light: beam, intensity: 95 });

    const headlightGlow = new THREE.PointLight("#bcdcff", 0, 14, 2);
    headlightGlow.position.set(side * 0.65, 0.67, -2.49);
    car.add(headlightGlow);
    headlightSources.push({ light: headlightGlow, intensity: 11 });

    const tailGlow = new THREE.PointLight("#ff1426", 0, 9, 2);
    tailGlow.position.set(side * 0.55, 0.94, 2.48);
    car.add(tailGlow);
    taillightSources.push({ light: tailGlow, intensity: 7 });
  }

  const underglow = new THREE.PointLight("#168cff", 14, 6, 2);
  underglow.position.set(0, 0.28, 0);
  car.add(underglow);

  car.position.set(0, 0.48, 2);
  scene.add(car);
  return { car, shell, headlightSources, taillightSources, headlamp, tailLamp };
}

const { route, boostPads } = buildWorld();
const trackSamples = Array.from({ length: 801 }, (_, index) => {
  const t = index / 800;
  return { t, point: route.getPointAt(t) };
});
const { car, shell, headlightSources, taillightSources, headlamp, tailLamp } = createCar();
const smokeGeometry = new THREE.SphereGeometry(0.55, 7, 6);
const smokeParticles = Array.from({ length: 48 }, () => {
  const material = new THREE.MeshBasicMaterial({
    color: "#d1d6d5",
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(smokeGeometry, material);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, material, age: 0, lifetime: 1, velocity: new THREE.Vector3() };
});

const state = {
  speed: 0,
  lateralSpeed: 0,
  drift: 0,
  boostTimer: 0,
  hoverPhase: 0,
  lightsOn: false,
  manualLights: false,
  dayElapsed: 0,
  lookYaw: 0,
  lookPitch: 0.38,
  lookDragging: false,
  lookPointerId: null,
  pointerX: 0,
  pointerY: 0,
  yaw: 0,
  started: false,
  distance: 0,
};
const keys = new Set();
const touchControls = new Set();
let messageTimeout;
let smokeTimer = 0;
let smokeIndex = 0;

camera.position.set(0, 8, 16);
camera.lookAt(0, 1, -8);

function showMessage(text) {
  message.textContent = text;
  message.classList.add("visible");
  window.clearTimeout(messageTimeout);
  messageTimeout = window.setTimeout(() => message.classList.remove("visible"), 1800);
}

function updateDayCycle(delta, time) {
  state.dayElapsed = (state.dayElapsed + delta) % DAY_CYCLE_SECONDS;
  const phasePosition = state.dayElapsed / DAY_PHASE_SECONDS;
  const phaseIndex = Math.floor(phasePosition);
  const phaseProgress = phasePosition - phaseIndex;
  const blend = THREE.MathUtils.smoothstep(phaseProgress, 0.88, 1);
  const current = dayPalette[phaseIndex];
  const next = dayPalette[(phaseIndex + 1) % dayPalette.length];
  const interpolateColor = (target, from, to) => target.copy(from).lerp(to, blend);

  interpolateColor(dayScratch.top, current.topColor, next.topColor);
  interpolateColor(dayScratch.horizon, current.horizonColor, next.horizonColor);
  interpolateColor(dayScratch.sun, current.sunColor, next.sunColor);
  interpolateColor(dayScratch.sky, current.skyColor, next.skyColor);
  interpolateColor(dayScratch.ground, current.groundColor, next.groundColor);
  const intensity = THREE.MathUtils.lerp(current.intensity, next.intensity, blend);
  const elevation = THREE.MathUtils.lerp(current.elevation, next.elevation, blend);
  const night = THREE.MathUtils.lerp(current.night, next.night, blend);
  const azimuth = (state.dayElapsed / DAY_CYCLE_SECONDS) * Math.PI * 2 - Math.PI / 2;
  const horizontal = Math.cos(elevation);
  const sunDirection = new THREE.Vector3(
    Math.cos(azimuth) * horizontal,
    Math.sin(elevation),
    Math.sin(azimuth) * horizontal,
  ).normalize();

  skyUniforms.uTop.value.copy(dayScratch.top);
  skyUniforms.uHorizon.value.copy(dayScratch.horizon);
  skyUniforms.uSunColor.value.copy(dayScratch.sun);
  skyUniforms.uSunDirection.value.copy(sunDirection);
  skyUniforms.uNight.value = night;
  skyUniforms.uTime.value = time;
  sky.position.copy(camera.position);

  scene.fog.color.copy(dayScratch.horizon);
  hemisphere.color.copy(dayScratch.sky);
  hemisphere.groundColor.copy(dayScratch.ground);
  hemisphere.intensity = THREE.MathUtils.lerp(0.42, 1.65, 1 - night);
  ambient.color.copy(dayScratch.sun);
  ambient.intensity = THREE.MathUtils.lerp(0.14, 0.42, 1 - night);
  sunlight.color.copy(dayScratch.sun);
  sunlight.intensity = intensity;
  sunlight.position.copy(car.position).addScaledVector(sunDirection, 650);
  sunlight.target.position.copy(car.position);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 1.3, 1 - night);

  const nightLamp = THREE.MathUtils.smoothstep(night, 0.04, 0.3);
  materials.streetBulb.emissiveIntensity = nightLamp * 5.5;
  for (const fixture of streetlightFixtures) {
    fixture.light.intensity = nightLamp * 24;
    fixture.glow.material.opacity = nightLamp * 0.23;
    fixture.bulb.visible = nightLamp > 0.01;
  }
  for (const light of bridgeAccentLights) light.intensity = nightLamp * 7;

  if (!state.manualLights) {
    const shouldUseHeadlights = night > 0.22;
    if (state.lightsOn !== shouldUseHeadlights) setHeadlights(shouldUseHeadlights);
  }

  const secondsLeft = Math.ceil(DAY_PHASE_SECONDS - (phasePosition % 1) * DAY_PHASE_SECONDS);
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  dayPhaseDisplay.textContent = `${current.name} · ${minutes}:${seconds}`;
}

function setHeadlights(enabled) {
  state.lightsOn = enabled;
  for (const { light, intensity } of headlightSources) light.intensity = enabled ? intensity : 0;
  for (const { light, intensity } of taillightSources) light.intensity = enabled ? intensity : 0;
  headlamp.emissiveIntensity = enabled ? 7 : 0.45;
  tailLamp.emissiveIntensity = enabled ? 5 : 1.2;
  lightsButton.setAttribute("aria-pressed", String(enabled));
  lightsLabel.textContent = enabled ? "Lights on" : "Lights off";
  lightsButton.title = enabled ? "Turn headlights off (L)" : "Turn headlights on (L)";
}

function isPressed(...controls) {
  return controls.some((control) => keys.has(control) || touchControls.has(control));
}

function collides(x, z) {
  return obstacles.some((obstacle) => {
    if (obstacle.maxY !== undefined && car.position.y > obstacle.maxY) return false;
    const nearestX = THREE.MathUtils.clamp(x, obstacle.x - obstacle.halfWidth, obstacle.x + obstacle.halfWidth);
    const nearestZ = THREE.MathUtils.clamp(z, obstacle.z - obstacle.halfDepth, obstacle.z + obstacle.halfDepth);
    const dx = x - nearestX;
    const dz = z - nearestZ;
    return dx * dx + dz * dz < 2.5 * 2.5;
  });
}

function nearestTrackPoint(x, z) {
  let nearest = trackSamples[0].point;
  let nearestDistanceSquared = Infinity;
  for (const sample of trackSamples) {
    const dx = x - sample.point.x;
    const dz = z - sample.point.z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < nearestDistanceSquared) {
      nearest = sample.point;
      nearestDistanceSquared = distanceSquared;
    }
  }
  return { point: nearest, distance: Math.sqrt(nearestDistanceSquared) };
}

function spawnSmoke(x, z, direction) {
  const particle = smokeParticles[smokeIndex];
  smokeIndex = (smokeIndex + 1) % smokeParticles.length;
  particle.age = 0;
  particle.lifetime = 1.15 + Math.random() * 0.55;
  particle.mesh.visible = true;
  particle.mesh.position.set(x, car.position.y + 0.45, z);
  particle.mesh.scale.setScalar(0.65 + Math.random() * 0.3);
  particle.material.opacity = 0.38;
  particle.velocity.set(
    -direction.x * 0.12 + (Math.random() - 0.5) * 1.3,
    0.8 + Math.random() * 0.7,
    -direction.z * 0.12 + (Math.random() - 0.5) * 1.3,
  );
}

function updateSmoke(delta) {
  for (const particle of smokeParticles) {
    if (!particle.mesh.visible) continue;
    particle.age += delta;
    if (particle.age >= particle.lifetime) {
      particle.mesh.visible = false;
      continue;
    }
    particle.mesh.position.addScaledVector(particle.velocity, delta);
    particle.mesh.scale.setScalar(0.65 + particle.age * 2.15);
    particle.material.opacity = 0.38 * (1 - particle.age / particle.lifetime);
  }
}

function updateDriving(delta) {
  if (!state.started) return;
  state.hoverPhase += delta * 2.2;

  const accelerating = isPressed("w", "arrowup", "accelerate");
  const braking = isPressed("s", "arrowdown", "brake");
  const steering = Number(isPressed("a", "arrowleft", "left")) - Number(isPressed("d", "arrowright", "right"));
  const handbrake = isPressed(" ", "space");
  state.boostTimer = Math.max(0, state.boostTimer - delta);
  const boost = isPressed("shift") || state.boostTimer > 0;
  const maxSpeed = boost ? 63 : 48;

  if (accelerating) state.speed += 27 * delta;
  else if (braking) state.speed -= (state.speed > 1 ? 46 : 17) * delta;
  else state.speed *= Math.exp(-0.54 * delta);

  state.speed = THREE.MathUtils.clamp(state.speed, -16, maxSpeed);
  if (handbrake) state.speed *= Math.exp(-0.32 * delta);

  const speedRatio = Math.min(Math.abs(state.speed) / 18, 1);
  state.drift = THREE.MathUtils.damp(state.drift, handbrake && speedRatio > 0.25 ? 1 : 0, 3.2, delta);
  if (Math.abs(state.speed) > 0.6) {
    state.yaw += steering * speedRatio * delta * (handbrake ? 2.05 : 1.65) * Math.sign(state.speed);
  }
  if (Math.abs(state.speed) > 1) {
    state.lateralSpeed += steering * speedRatio * (handbrake ? 38 : 5) * delta * Math.sign(state.speed);
  }
  state.lateralSpeed *= Math.exp(-(handbrake ? 0.65 : 4.5) * delta);
  state.lateralSpeed = THREE.MathUtils.clamp(state.lateralSpeed, -20, 20);

  const previousX = car.position.x;
  const previousZ = car.position.z;
  const forwardX = -Math.sin(state.yaw);
  const forwardZ = -Math.cos(state.yaw);
  const rightX = Math.cos(state.yaw);
  const rightZ = -Math.sin(state.yaw);
  const velocityX = forwardX * state.speed + rightX * state.lateralSpeed;
  const velocityZ = forwardZ * state.speed + rightZ * state.lateralSpeed;
  car.position.x += velocityX * delta;
  car.position.z += velocityZ * delta;

  if (
    Math.abs(car.position.x) > worldHalfWidth - 7 ||
    car.position.z > northBoundary - 7 ||
    car.position.z < southBoundary + 7 ||
    collides(car.position.x, car.position.z)
  ) {
    car.position.x = previousX;
    car.position.z = previousZ;
    state.speed *= -0.16;
    state.lateralSpeed *= -0.2;
    showMessage("Easy there — watch the edge of the road.");
  }

  for (const pad of boostPads) {
    pad.cooldown = Math.max(0, pad.cooldown - delta);
    if (pad.cooldown === 0 && Math.hypot(car.position.x - pad.x, car.position.z - pad.z) < 8) {
      state.boostTimer = 2.2;
      state.speed = Math.min(maxSpeed, state.speed + 14);
      pad.cooldown = 7;
      showMessage("BOOST!");
    }
  }

  const nearestTrack = nearestTrackPoint(car.position.x, car.position.z);
  const roadHeight = nearestTrack.distance < roadWidth / 2 + 3 ? nearestTrack.point.y : 0;
  const hoverHeight = roadHeight + 0.48 + Math.sin(state.hoverPhase) * 0.025;
  car.position.y = THREE.MathUtils.damp(car.position.y, hoverHeight, 12, delta);

  state.distance += Math.hypot(car.position.x - previousX, car.position.z - previousZ);
  car.rotation.y = state.yaw;
  shell.rotation.z = THREE.MathUtils.damp(
    shell.rotation.z,
    -steering * speedRatio * (0.055 + state.drift * 0.08),
    4,
    delta,
  );
  if (handbrake && steering !== 0 && Math.abs(state.speed) > 8) {
    smokeTimer -= delta;
    while (smokeTimer <= 0) {
      for (const side of [-1, 1]) {
        const rearX = car.position.x + Math.sin(state.yaw) * 1.475 + Math.cos(state.yaw) * side * 0.87;
        const rearZ = car.position.z + Math.cos(state.yaw) * 1.475 - Math.sin(state.yaw) * side * 0.87;
        spawnSmoke(rearX, rearZ, { x: velocityX, z: velocityZ });
      }
      smokeTimer += 0.075;
    }
  } else {
    smokeTimer = 0;
  }

  const cameraDistance = 14;
  const cameraYaw = state.yaw + state.lookYaw;
  const horizontalDistance = Math.cos(state.lookPitch) * cameraDistance;
  const targetCamera = new THREE.Vector3(
    car.position.x + Math.sin(cameraYaw) * horizontalDistance,
    car.position.y + 1.1 + Math.sin(state.lookPitch) * cameraDistance + speedRatio * 0.3,
    car.position.z + Math.cos(cameraYaw) * horizontalDistance,
  );
  camera.position.lerp(targetCamera, 1 - Math.exp(-4.2 * delta));
  camera.lookAt(
    car.position.x,
    car.position.y + 0.95,
    car.position.z,
  );
  const mph = Math.round(Math.abs(state.speed) * 2.25);
  speedDisplay.textContent = String(mph).padStart(3, "0");
  gearDisplay.textContent = state.speed < -0.5 ? "R" : state.speed > 0.5 ? (mph > 72 ? "5" : mph > 48 ? "4" : mph > 30 ? "3" : mph > 14 ? "2" : "1") : "P";

  districtDisplay.textContent =
    car.position.z < -1350 && Math.abs(car.position.x) < 300
      ? "THE DAM"
      : car.position.z < -800
        ? "MOUNTAIN PASS"
        : car.position.z < -320 && car.position.x > 40
          ? "SUNSET BEACH"
          : car.position.z < -320 && car.position.x < -250
            ? "WEST BEACH"
            : "NEON COAST";
}

let previousTime = 0;
function frame(time) {
  const delta = Math.min((time - previousTime) / 1000 || 0, 0.05);
  previousTime = time;
  updateDriving(delta);
  updateDayCycle(delta, time);
  updateSmoke(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
  renderer.setSize(bounds.width, bounds.height, false);
}

startButton.addEventListener("click", () => {
  state.started = true;
  overlay.hidden = true;
  canvas.focus();
  if (document.fullscreenEnabled && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      showMessage("Fullscreen unavailable — playing in the browser window.");
    });
  }
});

lightsButton.addEventListener("click", () => {
  state.manualLights = true;
  setHeadlights(!state.lightsOn);
});
setHeadlights(false);

canvas.addEventListener("pointerdown", (event) => {
  if (!state.started || state.lookDragging || event.button !== 0) return;
  event.preventDefault();
  state.lookDragging = true;
  state.lookPointerId = event.pointerId;
  state.pointerX = event.clientX;
  state.pointerY = event.clientY;
  canvas.classList.add("is-looking");
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!state.lookDragging || event.pointerId !== state.lookPointerId) return;
  state.lookYaw -= (event.clientX - state.pointerX) * 0.008;
  state.lookPitch = THREE.MathUtils.clamp(
    state.lookPitch - (event.clientY - state.pointerY) * 0.006,
    -0.05,
    1.05,
  );
  state.pointerX = event.clientX;
  state.pointerY = event.clientY;
});
function stopFreeLook(event) {
  if (event && event.pointerId !== state.lookPointerId) return;
  state.lookDragging = false;
  state.lookPointerId = null;
  state.lookYaw = 0;
  state.lookPitch = 0.38;
  canvas.classList.remove("is-looking");
}
canvas.addEventListener("pointerup", stopFreeLook);
canvas.addEventListener("pointercancel", stopFreeLook);
canvas.addEventListener("lostpointercapture", stopFreeLook);

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }
  if (key === "l" && !event.repeat) {
    state.manualLights = true;
    setHeadlights(!state.lightsOn);
  }
  keys.add(key);
});
document.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  touchControls.clear();
  stopFreeLook();
});

for (const button of document.querySelectorAll("[data-control]")) {
  const control = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touchControls.add(control);
    button.setPointerCapture(event.pointerId);
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, () => touchControls.delete(control));
  }
}

window.addEventListener("resize", resize);
document.addEventListener("fullscreenchange", resize);
resize();
requestAnimationFrame(frame);
