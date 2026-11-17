import * as THREE from "three";

const canvas = document.querySelector("#game");
const overlay = document.querySelector("#game-overlay");
const startButton = document.querySelector("#start-button");
const overlayEyebrow = document.querySelector("#overlay-eyebrow");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const relayCount = document.querySelector("#relay-count");
const objectiveText = document.querySelector("#objective-text");
const presenceFill = document.querySelector("#presence-fill");
const gameMessage = document.querySelector("#game-message");
const endingBlackout = document.querySelector("#ending-blackout");
const endingThankYou = document.querySelector("#ending-thank-you");

const TILE = 40;
const WALL_HEIGHT = 69;
const ELEVATOR_MUSIC_RADIUS = 220;
const HANDPRINT_FADE_DISTANCE = 40;
const ROOM_GRID_SIZE = 4;
const ROOM_SIZE = 5;
const ROOM_SPACING = 8;
const ROOM_ORIGIN = 1;
const COLS = 34;
const ROWS = 34;
const map = Array.from({ length: ROWS }, () => Array(COLS).fill("#"));
const rooms = Array.from({ length: ROOM_GRID_SIZE ** 2 }, (_, index) => {
  const column = index % ROOM_GRID_SIZE;
  const row = Math.floor(index / ROOM_GRID_SIZE);
  return [
    ROOM_ORIGIN + column * ROOM_SPACING,
    ROOM_ORIGIN + row * ROOM_SPACING,
    ROOM_SIZE,
    ROOM_SIZE,
  ];
});

function carveRect(x, y, width, height) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      map[row][column] = ".";
    }
  }
}

function carveHorizontal(startX, endX, y) {
  for (let x = startX; x <= endX; x += 1) {
    map[y][x] = ".";
  }
}

function carveVertical(x, startY, endY) {
  for (let y = startY; y <= endY; y += 1) {
    map[y][x] = ".";
  }
}

let mazeSeed = 2741;
function mazeRandom() {
  mazeSeed = (mazeSeed * 1664525 + 1013904223) >>> 0;
  return mazeSeed / 4294967296;
}

function roomKey(column, row) {
  return `${column},${row}`;
}

function buildMaze() {
  rooms.forEach(([x, y, width, height]) => carveRect(x, y, width, height));

  const connections = [];
  const visited = new Set([roomKey(0, 0)]);
  const stack = [{ column: 0, row: 0 }];
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [
      { column: current.column + 1, row: current.row },
      { column: current.column - 1, row: current.row },
      { column: current.column, row: current.row + 1 },
      { column: current.column, row: current.row - 1 },
    ].filter(({ column, row }) =>
      column >= 0 && column < ROOM_GRID_SIZE &&
      row >= 0 && row < ROOM_GRID_SIZE &&
      !visited.has(roomKey(column, row))
    );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[Math.floor(mazeRandom() * neighbors.length)];
    visited.add(roomKey(next.column, next.row));
    connections.push([current, next]);
    stack.push(next);
  }

  const possibleLoops = [];
  for (let row = 0; row < ROOM_GRID_SIZE; row += 1) {
    for (let column = 0; column < ROOM_GRID_SIZE; column += 1) {
      if (column + 1 < ROOM_GRID_SIZE) {
        possibleLoops.push([{ column, row }, { column: column + 1, row }]);
      }
      if (row + 1 < ROOM_GRID_SIZE) {
        possibleLoops.push([{ column, row }, { column, row: row + 1 }]);
      }
    }
  }
  for (let index = possibleLoops.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(mazeRandom() * (index + 1));
    [possibleLoops[index], possibleLoops[swapIndex]] = [possibleLoops[swapIndex], possibleLoops[index]];
  }

  const connectedPairs = new Set(connections.map(([from, to]) =>
    [roomKey(from.column, from.row), roomKey(to.column, to.row)].sort().join("|")
  ));
  let addedLoops = 0;
  for (const [from, to] of possibleLoops) {
    const pair = [roomKey(from.column, from.row), roomKey(to.column, to.row)].sort().join("|");
    if (connectedPairs.has(pair)) continue;
    connections.push([from, to]);
    connectedPairs.add(pair);
    addedLoops += 1;
    if (addedLoops === 4) break;
  }

  for (const [from, to] of connections) {
    const first = from.column + from.row * ROOM_GRID_SIZE < to.column + to.row * ROOM_GRID_SIZE
      ? from
      : to;
    const second = first === from ? to : from;
    const [firstX, firstY] = rooms[first.row * ROOM_GRID_SIZE + first.column];
    const [secondX, secondY] = rooms[second.row * ROOM_GRID_SIZE + second.column];
    if (from.row === to.row) {
      const firstDoor = firstY + 1 + Math.floor(mazeRandom() * (ROOM_SIZE - 2));
      const secondDoor = secondY + 1 + Math.floor(mazeRandom() * (ROOM_SIZE - 2));
      const bendX = firstX + ROOM_SIZE + Math.floor(mazeRandom() * (ROOM_SPACING - ROOM_SIZE));
      carveHorizontal(firstX + ROOM_SIZE - 1, bendX, firstDoor);
      carveVertical(bendX, firstDoor, secondDoor);
      carveHorizontal(bendX, secondX, secondDoor);
    } else {
      const firstDoor = firstX + 1 + Math.floor(mazeRandom() * (ROOM_SIZE - 2));
      const secondDoor = secondX + 1 + Math.floor(mazeRandom() * (ROOM_SIZE - 2));
      const bendY = firstY + ROOM_SIZE + Math.floor(mazeRandom() * (ROOM_SPACING - ROOM_SIZE));
      carveVertical(firstDoor, firstY + ROOM_SIZE - 1, bendY);
      carveHorizontal(Math.min(firstDoor, secondDoor), Math.max(firstDoor, secondDoor), bendY);
      carveVertical(secondDoor, bendY, secondY);
    }
  }
}

buildMaze();

const relays = [
  { x: 27.5 * TILE, y: 3.5 * TILE, active: false },
  { x: 3.5 * TILE, y: 27.5 * TILE, active: false },
  { x: 27.5 * TILE, y: 19.5 * TILE, active: false },
];
const exit = { x: 27.5 * TILE, y: 29.5 * TILE };
const playerStart = { x: 3.5 * TILE, y: 3.5 * TILE };
const entityStart = { x: 27.5 * TILE, y: 11.5 * TILE };
const heldKeys = new Set();
const player = { ...playerStart, yaw: 0, pitch: 0, radius: 9, moving: false, frameDistance: 0, distanceSinceStep: 0 };
const entity = { ...entityStart, radius: 13, visible: false, moving: false, speed: 52, pathTimer: 0, target: null };
let state = "intro";
let relaysFound = 0;
let elevatorUnlocked = false;
let firstRelayCutscenePlayed = false;
let cinematic = null;
let endingCutscene = null;
let qPressCount = 0;
let lastQPressTime = 0;
let lastFrame = 0;
let messageTimer = 0;
let presence = 0;
let dragPointerId = null;
let lastPointerX = 0;
let lastPointerY = 0;
let pointerLockPending = false;
let entityFootstepTimer = 0;
let footstepContext = null;
const handprintMusic = new Audio("../../audio/Handprint.mp3");
handprintMusic.loop = true;
handprintMusic.volume = 0.4;
handprintMusic.preload = "auto";
const entityMusic = new Audio("../../audio/Do%20You%20Like%20Air%20Conditioning%204.mp3");
entityMusic.loop = true;
entityMusic.volume = 0;
entityMusic.preload = "auto";
const elevatorMusic = new Audio("../../audio/Still%20Life.mp3");
elevatorMusic.loop = true;
elevatorMusic.volume = 0;
elevatorMusic.preload = "auto";
const endingMusic = new Audio("../../audio/Furniture%20Lament.mp3");
endingMusic.loop = true;
endingMusic.volume = 0.144;
endingMusic.preload = "auto";

const scene = new THREE.Scene();
const worldRoot = new THREE.Group();
scene.add(worldRoot);
const endingRoot = new THREE.Group();
endingRoot.visible = false;
scene.add(endingRoot);
scene.background = new THREE.Color(0x171306);
scene.fog = new THREE.Fog(0x171306, 180, 820);

const camera = new THREE.PerspectiveCamera(76, 8 / 5, 0.1, 1500);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * 1.694);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

worldRoot.add(new THREE.HemisphereLight(0xffe6a3, 0x171108, 1.21));
const moonlight = new THREE.DirectionalLight(0xffe2a0, 0.715);
moonlight.position.set(-180, 250, -90);
moonlight.castShadow = true;
moonlight.shadow.mapSize.set(1024, 1024);
moonlight.shadow.bias = -0.0001;
moonlight.shadow.normalBias = 0.03;
moonlight.shadow.camera.left = -600;
moonlight.shadow.camera.right = 600;
moonlight.shadow.camera.top = 500;
moonlight.shadow.camera.bottom = -500;
worldRoot.add(moonlight);

function createSurfaceMaps(seed, pattern, repeatX, repeatY) {
  const size = 256;
  const colorCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const colorContext = colorCanvas.getContext("2d");
  const bumpContext = bumpCanvas.getContext("2d");
  if (!colorContext || !bumpContext) throw new Error("Could not create game surface textures.");

  const colorData = colorContext.createImageData(size, size);
  const bumpData = bumpContext.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const noise = Math.sin((x + seed) * 12.9898 + (y + seed) * 78.233) * 43758.5453;
      const random = (noise - Math.floor(noise)) - 0.5;
      let grain;
      if (pattern === "wood") {
        grain = Math.sin((x + Math.sin(y * 0.045 + seed) * 16) * 0.36) * 10 +
          Math.sin(x * 0.12 + Math.sin(y * 0.02) * 5) * 4;
      } else if (pattern === "fabric") {
        grain = (x % 6 === 0 || y % 6 === 0 ? -9 : 3) + random * 5;
      } else if (pattern === "carpet") {
        const shiftedFiber = (x + (y % 2) * 2) % 5;
        grain = (shiftedFiber < 2 ? 9 : -5) + (y % 5 === 0 ? -9 : 0) +
          Math.sin((x + y * 0.7) * 0.42) * 5 + random * 8;
      } else if (pattern === "striped") {
        const stripePosition = x % 64;
        grain = (stripePosition < 32 ? 16 : -9) +
          (stripePosition % 32 < 3 ? -15 : 0) + Math.sin(y * 0.08 + seed) * 3;
      } else if (pattern === "ceiling") {
        grain = Math.sin(x * 0.045 + seed) * 4 + Math.sin(y * 0.065 - seed) * 5 +
          (x % 128 < 2 || y % 128 < 2 ? -12 : 0);
      } else {
        grain = Math.sin(x * 0.055 + seed) * 3 + Math.sin(y * 0.07 - seed) * 3;
      }
      const baseShade = pattern === "ceiling" ? 247 : pattern === "carpet" ? 218 : 232;
      const shade = Math.max(0, Math.min(255, baseShade + grain + random * 18));
      const height = Math.max(0, Math.min(255, 128 + grain * (pattern === "carpet" ? 2.4 : 1.8) + random * 32));
      const index = (y * size + x) * 4;
      colorData.data[index] = shade;
      colorData.data[index + 1] = shade;
      colorData.data[index + 2] = shade;
      colorData.data[index + 3] = 255;
      bumpData.data[index] = height;
      bumpData.data[index + 1] = height;
      bumpData.data[index + 2] = height;
      bumpData.data[index + 3] = 255;
    }
  }
  colorContext.putImageData(colorData, 0, 0);
  bumpContext.putImageData(bumpData, 0, 0);

  const makeTexture = (source, colorSpace) => {
    const texture = new THREE.CanvasTexture(source);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    texture.colorSpace = colorSpace;
    return texture;
  };
  return {
    map: makeTexture(colorCanvas, THREE.SRGBColorSpace),
    bumpMap: makeTexture(bumpCanvas, THREE.NoColorSpace),
  };
}

const surfaces = {
  wall: createSurfaceMaps(2, "striped", 2, 4),
  floor: createSurfaceMaps(7, "carpet", 3, 3),
  ceiling: createSurfaceMaps(11, "ceiling", 2, 2),
  wood: createSurfaceMaps(17, "wood", 2, 4),
  paper: createSurfaceMaps(23, "fabric", 2, 2),
  creature: createSurfaceMaps(29, "plaster", 3, 3),
  rug: createSurfaceMaps(31, "fabric", 5, 5),
  glow: createSurfaceMaps(37, "plaster", 1, 1),
};

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, ...surfaces.wall, bumpScale: 0.12 }),
  floor: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, ...surfaces.floor, bumpScale: 0.24 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, ...surfaces.ceiling, bumpScale: 0.08 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x322718, roughness: 0.88, ...surfaces.wood, bumpScale: 0.1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x70552b, roughness: 0.82, ...surfaces.wood, bumpScale: 0.1 }),
  brass: new THREE.MeshStandardMaterial({ color: 0x98783a, metalness: 0.4, roughness: 0.45, ...surfaces.paper, bumpScale: 0.025 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xc3a866, roughness: 0.9, ...surfaces.paper, bumpScale: 0.04 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x3c321f, roughness: 0.84, ...surfaces.paper, bumpScale: 0.03 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x080a0b, roughness: 0.92, ...surfaces.creature, bumpScale: 0.06 }),
  creature: new THREE.MeshStandardMaterial({ color: 0x171817, roughness: 0.78, ...surfaces.creature, bumpScale: 0.1 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xc5b78f, roughness: 0.52, ...surfaces.paper, bumpScale: 0.04 }),
  coat: new THREE.MeshStandardMaterial({ color: 0xa18432, roughness: 0.94, ...surfaces.paper, bumpScale: 0.12 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x54776e, roughness: 0.96, ...surfaces.paper, bumpScale: 0.14 }),
  trousers: new THREE.MeshStandardMaterial({ color: 0x292720, roughness: 0.94, ...surfaces.creature, bumpScale: 0.08 }),
  hat: new THREE.MeshStandardMaterial({ color: 0x25221b, roughness: 0.92, ...surfaces.wood, bumpScale: 0.1 }),
  skin: new THREE.MeshStandardMaterial({ color: 0x71604c, roughness: 0.9, ...surfaces.creature, bumpScale: 0.08 }),
  beard: new THREE.MeshStandardMaterial({ color: 0x211a16, roughness: 0.98, ...surfaces.creature, bumpScale: 0.1 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x39291b, roughness: 0.86, ...surfaces.wood, bumpScale: 0.08 }),
  eye: new THREE.MeshStandardMaterial({
    color: 0xffd66a,
    emissive: 0xe9a51f,
    emissiveIntensity: 3.5,
    roughness: 0.2,
    ...surfaces.glow,
    bumpScale: 0.01,
  }),
  relay: new THREE.MeshStandardMaterial({
    color: 0x9ce5d2,
    emissive: 0x55c5a5,
    emissiveIntensity: 2.4,
    roughness: 0.25,
    ...surfaces.glow,
    bumpScale: 0.01,
  }),
  light: new THREE.MeshStandardMaterial({
    color: 0xffedb5,
    emissive: 0xffc64a,
    emissiveIntensity: 2.6,
    roughness: 0.28,
    ...surfaces.glow,
    bumpScale: 0.01,
  }),
  elevatorGlow: new THREE.MeshStandardMaterial({
    color: 0xf6fbff,
    emissive: 0xd8edff,
    emissiveIntensity: 2.6,
    roughness: 0.24,
  }),
  rug: new THREE.MeshStandardMaterial({ color: 0x514020, roughness: 1, ...surfaces.rug, bumpScale: 0.08 }),
};

function tileWorldPosition(column, row) {
  return { x: column * TILE + TILE / 2, z: row * TILE + TILE / 2 };
}

function roomWallTransform(room, side, alongOffset = 0, orientationOffset = 0) {
  const [x, y, width, height] = room;
  const rotations = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
  const wallRotation = rotations[side % rotations.length];
  const rotation = wallRotation + orientationOffset;
  const wallCenter = [
    { x: (x + width / 2) * TILE, z: y * TILE },
    { x: (x + width) * TILE, z: (y + height / 2) * TILE },
    { x: (x + width / 2) * TILE, z: (y + height) * TILE },
    { x: x * TILE, z: (y + height / 2) * TILE },
  ][side % rotations.length];
  const tangentX = Math.cos(wallRotation);
  const tangentZ = -Math.sin(wallRotation);
  const inwardX = Math.sin(wallRotation);
  const inwardZ = Math.cos(wallRotation);
  return {
    x: wallCenter.x + tangentX * alongOffset + inwardX * 3,
    z: wallCenter.z + tangentZ * alongOffset + inwardZ * 3,
    rotation,
  };
}

function addInstancedTiles(cells, geometry, material, colorForCell, yPosition) {
  if (cells.length === 0) return;
  const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
  const transform = new THREE.Object3D();
  cells.forEach((cell, index) => {
    const position = tileWorldPosition(cell.x, cell.y);
    transform.position.set(position.x, yPosition, position.z);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, colorForCell(cell));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  worldRoot.add(mesh);
}

function addBox(parent, size, position, material, rotation = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.y = rotation;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, height, position, material, segments = 12) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeOctagon(radius) {
  const shape = new THREE.Shape();
  for (let index = 0; index < 8; index += 1) {
    const angle = Math.PI / 8 + (index * Math.PI) / 4;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function buildStopSign() {
  const sign = new THREE.Group();
  sign.position.set(11.5 * TILE, 0, 11.5 * TILE);
  sign.rotation.y = Math.PI;

  const postStart = new THREE.Vector3(0, 20, 0);
  const postEnd = new THREE.Vector3(8, 41, 18);
  const postDirection = postEnd.clone().sub(postStart);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 1, postDirection.length(), 8),
    materials.darkWood,
  );
  post.position.copy(postStart).add(postEnd).multiplyScalar(0.5);
  post.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), postDirection.normalize());
  post.castShadow = true;
  post.receiveShadow = true;
  sign.add(post);

  const braceEnd = new THREE.Vector3(4, 36, 9);
  const braceDirection = braceEnd.clone().sub(postStart);
  const brace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.55, braceDirection.length(), 8),
    materials.brass,
  );
  brace.position.copy(postStart).add(braceEnd).multiplyScalar(0.5);
  brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), braceDirection.normalize());
  sign.add(brace);
  addBox(sign, [5, 6, 1.2], [0, 20, -0.5], materials.darkWood);

  const board = new THREE.Group();
  board.position.copy(postEnd);
  board.rotation.z = -0.08;
  const border = new THREE.Mesh(
    new THREE.ShapeGeometry(makeOctagon(8)),
    new THREE.MeshStandardMaterial({ color: 0xe6ddc8, roughness: 0.65, side: THREE.DoubleSide }),
  );
  border.castShadow = true;
  board.add(border);

  const face = new THREE.Mesh(
    new THREE.ShapeGeometry(makeOctagon(7.25)),
    new THREE.MeshStandardMaterial({ color: 0xa83227, roughness: 0.62, side: THREE.DoubleSide }),
  );
  face.position.z = 0.12;
  board.add(face);

  const textCanvas = document.createElement("canvas");
  textCanvas.width = 512;
  textCanvas.height = 256;
  const context = textCanvas.getContext("2d");
  if (!context) throw new Error("Could not create the stop-sign lettering.");
  context.translate(textCanvas.width / 2, textCanvas.height / 2);
  context.scale(-1, 1);
  context.font = "bold 116px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = 12;
  context.strokeStyle = "#701d18";
  context.strokeText("STOP", 0, 4);
  context.fillStyle = "#fff2dc";
  context.fillText("STOP", 0, 4);
  const textTexture = new THREE.CanvasTexture(textCanvas);
  textTexture.colorSpace = THREE.SRGBColorSpace;
  textTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const lettering = new THREE.Mesh(
    new THREE.PlaneGeometry(11.5, 5.75),
    new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  lettering.position.set(0, -0.2, 0.2);
  board.add(lettering);

  for (const x of [-5.15, 5.15]) {
    for (const y of [-5.15, 5.15]) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), materials.brass);
      rivet.position.set(x, y, 0.22);
      board.add(rivet);
    }
  }
  sign.add(board);
  worldRoot.add(sign);
}

function buildArchiveShelf(parent, variation) {
  addBox(parent, [2, 38, 13], [-14, 19, 0], materials.darkWood);
  addBox(parent, [2, 38, 13], [14, 19, 0], materials.darkWood);
  addBox(parent, [26, 2, 13], [0, 37, 0], materials.wood);
  addBox(parent, [26, 2, 13], [0, 2, 0], materials.wood);
  addBox(parent, [24, 34, 1.4], [0, 19, -5.8], materials.darkWood);

  const bookMaterials = [materials.ink, materials.wood, materials.darkWood, materials.paper, materials.brass];
  for (let shelfIndex = 0; shelfIndex < 3; shelfIndex += 1) {
    const shelfY = 7 + shelfIndex * 10;
    addBox(parent, [26, 1.6, 12], [0, shelfY, 0], materials.wood);
    for (let bookIndex = 0; bookIndex < 4; bookIndex += 1) {
      const bookHeight = 6 + ((variation + shelfIndex + bookIndex) % 3) * 1.4;
      const bookX = -7.5 + bookIndex * 4.7;
      const bookY = shelfY + 1 + bookHeight / 2;
      const bookTilt = (bookIndex - 1) * 0.035;
      const book = addBox(
        parent,
        [3.2, bookHeight, 8],
        [bookX, bookY, 0.3],
        bookMaterials[(variation + shelfIndex + bookIndex) % bookMaterials.length],
      );
      book.rotation.z = bookTilt;
      if ((bookIndex + shelfIndex + variation) % 2 === 0) {
        const band = addBox(
          parent,
          [3.25, 0.55, 8.1],
          [bookX, bookY + bookHeight * 0.28, 0.3],
          materials.brass,
        );
        band.rotation.z = bookTilt;
      }
    }
  }
  addBox(parent, [6, 1.2, 8], [7, 8, 0.5], materials.paper, 0.12);
  addBox(parent, [5, 1, 7], [7.4, 9.1, 0.4], materials.ink, -0.08);
}

function buildArchiveChair(parent, variation) {
  addBox(parent, [17, 2, 15], [0, 10, 0], materials.darkWood);
  addBox(parent, [14, 1.2, 12], [0, 11.6, 0.5], materials.rug);
  for (const side of [-1, 1]) {
    addBox(parent, [2, 10, 2], [side * 6, 5, 5], materials.wood);
    addBox(parent, [2, 27, 2], [side * 6, 13.5, -6], materials.darkWood);
    addBox(parent, [2.2, 2.3, 13], [side * 7.3, 16, -0.5], materials.wood);
  }
  addBox(parent, [14, 2, 2], [0, 18, -6], materials.wood);
  addBox(parent, [14, 2, 2], [0, 25, -6], materials.darkWood);
  addBox(parent, [11, 6, 1.3], [0, 21.5, -4.8], materials.rug);
  addBox(parent, [3, 1.2, 3], [0, 26, -4.5], materials.brass);
  if (variation % 2 === 0) {
    parent.rotation.z = variation % 3 === 0 ? 0.24 : -0.18;
    parent.rotation.x = 0.12;
  }
}

function buildArchiveDesk(parent) {
  addBox(parent, [34, 2.2, 19], [0, 13, 0], materials.wood);
  addBox(parent, [28, 5, 15], [0, 9.3, 0], materials.darkWood);
  for (const side of [-1, 1]) {
    for (const depth of [-1, 1]) {
      addBox(parent, [2.2, 12, 2.2], [side * 13.5, 6, depth * 6.5], materials.wood);
    }
  }
  addBox(parent, [11, 4, 1], [-7, 10.5, 8], materials.darkWood);
  addBox(parent, [11, 4, 1], [7, 10.5, 8], materials.darkWood);
  for (const x of [-7, 7]) addCylinder(parent, 0.75, 0.75, 0.7, [x, 10.5, 8.7], materials.brass, 8);

  addBox(parent, [7, 0.7, 5], [-8, 14.5, 1], materials.paper, 0.08);
  addBox(parent, [6, 0.5, 4], [-7, 15.1, 1.3], materials.ink, -0.12);
  addBox(parent, [5, 1.4, 7], [3, 14.8, 2], materials.darkWood);
  addBox(parent, [4.5, 0.5, 6.5], [3, 15.75, 2], materials.paper);

  addCylinder(parent, 3.2, 3.2, 1, [-11, 14.6, -3], materials.brass);
  addCylinder(parent, 0.65, 0.85, 7, [-11, 18.5, -3], materials.darkWood, 8);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(4.5, 6, 12), materials.light);
  lampShade.position.set(-11, 24.2, -3);
  lampShade.castShadow = true;
  parent.add(lampShade);
}

function buildArchiveCrates(parent, variation) {
  const cratePositions = [
    [-4, 6, 0, 0],
    [4, 13, -2, 0.08],
    [1, 20, 1, -0.06],
  ];
  cratePositions.forEach(([x, y, z, rotation], index) => {
    const width = index === 1 ? 11 : 13;
    addBox(parent, [width, 10, 12], [x, y, z], index === 1 ? materials.darkWood : materials.wood, rotation);
    addBox(parent, [width + 1, 1.2, 13], [x, y + 5.4, z], materials.darkWood, rotation);
    for (const side of [-1, 1]) {
      addBox(parent, [1.2, 10, 0.8], [x + side * (width / 2 - 1), y, z + 6.2], materials.brass);
    }
    addBox(parent, [5, 3.5, 0.3], [x, y + 0.8, z + 6.35], materials.paper, rotation);
    addBox(parent, [2.8, 0.35, 0.4], [x, y + 1.4, z + 6.55], materials.ink);
    addBox(parent, [3.6, 0.3, 0.4], [x, y + 0.4, z + 6.55], materials.ink);
  });
  addBox(parent, [9, 0.4, 6], [0, 26, 0], materials.paper, 0.16 + variation * 0.02);
}

function buildWorld() {
  const floors = [];
  const walls = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      const cell = { x: column, y: row };
      if (map[row][column] === ".") floors.push(cell);
      else walls.push(cell);
    }
  }

  addInstancedTiles(
    floors,
    new THREE.BoxGeometry(TILE + 0.5, 2, TILE + 0.5),
    materials.floor,
    ({ x, y }) => new THREE.Color().setHSL(0.115 + ((x * 17 + y * 29) % 5) * 0.004, 0.18, 0.19),
    -1,
  );
  addInstancedTiles(
    walls,
    new THREE.BoxGeometry(TILE, WALL_HEIGHT, TILE),
    materials.wall,
    ({ x, y }) => new THREE.Color().setHSL(0.115 + ((x * 11 + y * 19) % 5) * 0.004, 0.2, 0.21),
    WALL_HEIGHT / 2,
  );
  addInstancedTiles(
    floors,
    new THREE.BoxGeometry(TILE + 0.2, 2, TILE + 0.2),
    materials.ceiling,
    () => new THREE.Color(0xc9be9f),
    70,
  );

  rooms.forEach(([x, y, width, height], index) => {
    const room = [x, y, width, height];
    const centerX = x + Math.floor(width / 2);
    const centerY = y + Math.floor(height / 2);
    const position = tileWorldPosition(centerX, centerY);
    const fixture = new THREE.Group();
    fixture.position.set(position.x, 0, position.z);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(24, 2, 8), materials.darkWood);
    housing.position.y = 63;
    fixture.add(housing);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 5), materials.light);
    panel.position.y = 61;
    fixture.add(panel);
    const pointLight = new THREE.PointLight(0xffd169, 1210, 190, 1.65);
    pointLight.position.y = 54;
    fixture.add(pointLight);
    fixture.userData.light = pointLight;
    fixture.userData.phase = index * 1.73;
    fixture.userData.baseIntensity = pointLight.intensity;
    worldRoot.add(fixture);

    const rugPosition = tileWorldPosition(centerX, centerY);
    const rug = new THREE.Mesh(new THREE.BoxGeometry(28, 0.45, 19), materials.rug);
    rug.position.set(rugPosition.x, 0.15, rugPosition.z);
    rug.rotation.y = (Math.random() - 0.5) * 0.3;
    rug.receiveShadow = true;
    worldRoot.add(rug);

    const roomSide = [0, 1, 2, 3, 2, 1][index % 6];
    const orientationOffset = [0, 0, 0, 0, 0.28, -0.28][index % 6];
    const shelf = new THREE.Group();
    const shelfPlacement = roomWallTransform(room, roomSide, -42, orientationOffset);
    shelf.position.set(shelfPlacement.x, 0, shelfPlacement.z);
    shelf.rotation.y = shelfPlacement.rotation;
    buildArchiveShelf(shelf, index);
    worldRoot.add(shelf);

    const chair = new THREE.Group();
    const chairPlacement = roomWallTransform(room, roomSide, 76, orientationOffset);
    chair.position.set(chairPlacement.x, 0, chairPlacement.z);
    chair.rotation.y = chairPlacement.rotation;
    buildArchiveChair(chair, index);
    worldRoot.add(chair);

    if (index % 3 === 1) {
      const desk = new THREE.Group();
      const deskPlacement = roomWallTransform(room, roomSide, 14, orientationOffset);
      desk.position.set(deskPlacement.x, 0, deskPlacement.z);
      desk.rotation.y = deskPlacement.rotation;
      buildArchiveDesk(desk);
      worldRoot.add(desk);
    }
  });

  rooms.forEach(([x, y], index) => {
    if (index % 2 !== 0) return;
    const clutter = new THREE.Group();
    const position = tileWorldPosition(x + 2 + (index % 3), y + 3);
    clutter.position.set(position.x, 0, position.z);
    clutter.rotation.y = Math.random() * Math.PI;
    buildArchiveCrates(clutter, index);
    worldRoot.add(clutter);
  });
}

function buildRelay(relay) {
  const group = new THREE.Group();
  group.position.set(relay.x, 0, relay.y);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7, 5, 8), materials.darkWood);
  pedestal.position.y = 2.5;
  group.add(pedestal);
  addCylinder(group, 7.1, 7.1, 0.8, [0, 3.6, 0], materials.brass, 12);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), materials.brass);
    bolt.position.set(Math.cos(angle) * 6.2, 3.4, Math.sin(angle) * 6.2);
    group.add(bolt);
  }
  addBox(group, [4.5, 2.8, 0.45], [0, 2.6, 6.6], materials.brass);
  addBox(group, [1.4, 0.8, 0.2], [0, 2.8, 6.9], materials.light);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.8, 9, 8), materials.brass);
  stem.position.y = 9;
  group.add(stem);
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 2), materials.relay);
  orb.position.y = 16;
  group.add(orb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.6, 8, 24), materials.brass);
  ring.position.y = 9;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const upperRing = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.35, 8, 24), materials.brass);
  upperRing.position.y = 12.5;
  upperRing.rotation.x = Math.PI / 2;
  group.add(upperRing);
  relay.orb = orb;
  relay.mesh = group;
  worldRoot.add(group);
}

function buildExit() {
  const group = new THREE.Group();
  group.position.set(exit.x, 0, exit.y + 18.5);
  group.rotation.y = Math.PI;
  addBox(group, [29, 39, 3], [0, 19.5, 0], materials.brass);
  const doors = [
    addBox(group, [12, 35, 1.8], [-6.2, 18, 2.1], materials.darkWood),
    addBox(group, [12, 35, 1.8], [6.2, 18, 2.1], materials.wood),
  ];
  addBox(group, [30, 2.5, 4], [0, 40, 0], materials.darkWood);
  addBox(group, [30, 1.2, 7], [0, 0.6, 2.6], materials.brass);
  for (const side of [-1, 1]) {
    for (const height of [7, 18, 29]) {
      addCylinder(group, 1.1, 1.1, 3.2, [side * 13.8, height, 2], materials.brass, 8);
    }
  }
  addBox(group, [1.2, 34, 0.8], [0, 18, 3.2], materials.brass);
  addBox(group, [7, 2, 0.7], [0, 31, 3.3], materials.light);
  for (const side of [-1, 1]) {
    addBox(group, [1.1, 35, 0.65], [side * 13.4, 19, 2.15], materials.elevatorGlow);
  }
  addBox(group, [27, 1.1, 0.65], [0, 37, 2.15], materials.elevatorGlow);
  addBox(group, [26, 0.6, 0.8], [0, 0.45, 2.8], materials.elevatorGlow);

  const aura = new THREE.Mesh(new THREE.TorusGeometry(18, 0.28, 6, 36), materials.elevatorGlow);
  aura.position.set(0, 0.22, 7);
  aura.rotation.x = Math.PI / 2;
  group.add(aura);

  const elevatorLight = new THREE.PointLight(0xe4f2ff, 520, 220, 1.8);
  elevatorLight.position.set(0, 22, 12);
  group.add(elevatorLight);
  group.userData.light = elevatorLight;
  group.userData.phase = 0.6;
  group.userData.baseIntensity = elevatorLight.intensity;
  group.userData.doors = doors;
  worldRoot.add(group);
  return group;
}

function buildEntity() {
  const root = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 8, 24, 10), materials.coat);
  torso.position.y = 20;
  torso.scale.z = 0.72;
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);
  addCylinder(root, 1.8, 2.1, 5, [0, 32, 0], materials.leather, 8);

  const coatHem = new THREE.Mesh(new THREE.TorusGeometry(7.65, 0.38, 6, 16), materials.leather);
  coatHem.position.y = 8.5;
  coatHem.rotation.x = Math.PI / 2;
  coatHem.scale.z = 0.74;
  root.add(coatHem);

  addBox(root, [5.4, 20, 0.8], [0, 20, 5.05], materials.leather);
  const coatTails = [];
  for (const side of [-1, 1]) {
    const tail = new THREE.Group();
    tail.position.set(side * 3.2, 8.5, 4);
    addBox(tail, [4.1, 15, 1.1], [0, 0, 0], materials.coat);
    tail.rotation.z = side * 0.12;
    root.add(tail);
    coatTails.push(tail);
    const lapel = addBox(root, [2.2, 8, 0.9], [side * 2.3, 28.5, 4.35], materials.coat);
    lapel.rotation.z = side * -0.3;
  }

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(6.6, 6.6, 1.8, 12, 1, true),
    materials.leather,
  );
  belt.position.y = 14.5;
  belt.scale.z = 0.74;
  root.add(belt);
  addBox(root, [3, 2.5, 0.8], [0, 14.5, 5.05], materials.brass);
  addBox(root, [1.3, 1.2, 0.35], [0, 14.5, 5.5], materials.darkWood);
  for (let index = 0; index < 5; index += 1) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), materials.brass);
    button.position.set(0, 24 - index * 3, 5.35);
    root.add(button);
  }

  const head = new THREE.Group();
  head.position.set(0, 34, 0);
  const face = new THREE.Mesh(new THREE.SphereGeometry(4.1, 12, 10), materials.skin);
  face.scale.set(0.83, 1.12, 0.78);
  face.position.z = 1.3;
  face.castShadow = true;
  head.add(face);
  const hat = new THREE.Group();
  hat.position.y = 4.6;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.2, 0.9, 14), materials.hat);
  brim.scale.z = 0.82;
  brim.castShadow = true;
  hat.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.8, 5.3, 9), materials.hat);
  crown.position.y = 2.9;
  crown.scale.z = 0.86;
  crown.castShadow = true;
  hat.add(crown);
  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.7, 0.65, 9), materials.leather);
  hatBand.position.y = 1;
  hatBand.scale.z = 0.86;
  hat.add(hatBand);
  addBox(hat, [1.5, 1.2, 0.5], [0, 1, 3.25], materials.brass);
  head.add(hat);

  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 8), materials.beard);
    socket.scale.set(1.1, 0.72, 0.55);
    socket.position.set(side * 1.45, 0.4, 4.25);
    head.add(socket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), materials.eye);
    eye.position.set(side * 1.45, 0.4, 4.7);
    head.add(eye);
    const brow = addBox(head, [2, 0.6, 0.6], [side * 1.5, 1.35, 4.5], materials.beard);
    brow.rotation.z = side * -0.12;
    const moustache = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1, 4, 6), materials.beard);
    moustache.position.set(side * 0.8, -1.9, 4.45);
    moustache.rotation.z = side * -Math.PI / 2;
    head.add(moustache);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.1, 5), materials.skin);
  nose.position.set(0, -0.8, 4.8);
  nose.rotation.x = Math.PI / 2;
  head.add(nose);
  addBox(head, [2.6, 0.75, 0.55], [0, -2.35, 4.45], materials.dark);
  const jaw = addBox(head, [2.8, 0.9, 0.8], [0, -3.1, 4.2], materials.beard);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(2.65, 6.8, 9), materials.beard);
  beard.position.set(0, -4.1, 2.5);
  beard.rotation.z = Math.PI;
  beard.castShadow = true;
  head.add(beard);
  for (let index = 0; index < 3; index += 1) {
    const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 2.8, 4, 6), materials.beard);
    braid.position.set((index - 1) * 0.8, -6.1, 3.3);
    braid.rotation.z = (index - 1) * 0.12;
    head.add(braid);
    const tie = new THREE.Mesh(new THREE.SphereGeometry(0.43, 8, 6), materials.brass);
    tie.position.set((index - 1) * 0.8, -7.3, 3.3);
    head.add(tie);
  }
  root.add(head);

  const limbs = [];
  const knees = [];
  let canePivot = null;
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 5.4, 32, 0.2);
    arm.rotation.z = side * 0.4;
    root.add(arm);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(2, 13, 4, 8), materials.sleeve);
    sleeve.position.y = -7;
    sleeve.castShadow = true;
    arm.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.9, 8), materials.leather);
    cuff.position.set(0, -13.5, 0);
    arm.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1.65, 10, 8), materials.skin);
    hand.position.set(0, -15, 0.1);
    hand.scale.set(0.85, 1.1, 0.8);
    arm.add(hand);
    for (let fingerIndex = 0; fingerIndex < 4; fingerIndex += 1) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.35, 4, 6), materials.skin);
      finger.position.set((fingerIndex - 1.5) * 0.58, -16.8, 0.25);
      finger.rotation.z = (fingerIndex - 1.5) * -0.1;
      arm.add(finger);
    }

    if (side === 1) {
      canePivot = new THREE.Group();
      canePivot.position.set(0, -17.8, 1);
      canePivot.rotation.z = -arm.rotation.z;
      addCylinder(canePivot, 0.4, 0.7, 30, [0, 0, 0], materials.darkWood, 8);
      const caneHandle = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), materials.brass);
      caneHandle.position.y = 15.2;
      canePivot.add(caneHandle);
      arm.add(canePivot);
    }

    const leg = new THREE.Group();
    leg.position.set(side * 2.8, 12, 0.2);
    const upperLeg = new THREE.Mesh(new THREE.CapsuleGeometry(2, 7, 4, 8), materials.trousers);
    upperLeg.position.y = -3.5;
    leg.add(upperLeg);
    const knee = new THREE.Group();
    knee.position.set(0, -6.2, 0);
    if (side === -1) {
      addCylinder(knee, 0.9, 0.22, 5.5, [0, -2.75, 0.2], materials.darkWood, 8);
      addCylinder(knee, 0.58, 0.58, 0.6, [0, -4.7, 0.2], materials.brass, 8);
      addCylinder(knee, 0.24, 0.08, 0.55, [0, -5.25, 0.2], materials.darkWood, 6);
      addBox(knee, [3.2, 1.4, 2.4], [0, 0.1, 0.3], materials.leather);
    } else {
      const lowerLeg = new THREE.Mesh(new THREE.CapsuleGeometry(1.65, 4.5, 4, 8), materials.trousers);
      lowerLeg.position.y = -2.4;
      knee.add(lowerLeg);
      addBox(knee, [4.4, 3.4, 7.2], [0, -4, 1.1], materials.leather);
      addBox(knee, [4.5, 0.55, 7.3], [0, -5.85, 1.1], materials.darkWood);
    }
    leg.add(knee);
    root.add(leg);
    knees.push(knee);
    limbs.push(arm, leg);
  }

  root.visible = false;
  worldRoot.add(root);
  return {
    root,
    torso,
    head,
    hat,
    jaw,
    limbs,
    knees,
    coatTails,
    canePivot,
    walkPhase: 0,
    lastTime: null,
    lastX: entity.x,
    lastY: entity.y,
  };
}

buildWorld();
buildStopSign();
relays.forEach(buildRelay);
const exitModel = buildExit();
const entityModel = buildEntity();

function createEndingPortrait() {
  const portraitCanvas = document.createElement("canvas");
  portraitCanvas.width = 480;
  portraitCanvas.height = 300;
  const context = portraitCanvas.getContext("2d");
  if (!context) throw new Error("Could not create the ending portrait.");

  const sky = context.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, "#e7bb82");
  sky.addColorStop(1, "#f5dea6");
  context.fillStyle = sky;
  context.fillRect(0, 0, 480, 300);
  context.fillStyle = "#8c9a69";
  context.beginPath();
  context.moveTo(0, 190);
  context.quadraticCurveTo(120, 115, 245, 196);
  context.quadraticCurveTo(360, 132, 480, 178);
  context.lineTo(480, 300);
  context.lineTo(0, 300);
  context.fill();
  context.fillStyle = "#53684a";
  context.fillRect(0, 240, 480, 60);

  context.fillStyle = "#35443d";
  context.beginPath();
  context.ellipse(174, 231, 53, 78, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#d4a47f";
  context.beginPath();
  context.arc(174, 127, 39, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#302a27";
  context.beginPath();
  context.arc(174, 116, 41, Math.PI, Math.PI * 2);
  context.fill();
  context.fillRect(134, 116, 18, 30);
  context.fillRect(196, 116, 19, 30);
  context.fillStyle = "#49352e";
  context.beginPath();
  context.arc(161, 130, 3.5, 0, Math.PI * 2);
  context.arc(187, 130, 3.5, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#674840";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(163, 153);
  context.quadraticCurveTo(174, 149, 185, 153);
  context.stroke();

  context.fillStyle = "#9c6d63";
  context.beginPath();
  context.ellipse(299, 227, 58, 84, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#e3b18d";
  context.beginPath();
  context.arc(299, 126, 40, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#503a30";
  context.beginPath();
  context.arc(299, 121, 43, Math.PI, Math.PI * 2);
  context.fill();
  context.fillRect(257, 120, 16, 86);
  context.fillRect(324, 120, 17, 91);
  context.fillStyle = "#49352e";
  context.beginPath();
  context.arc(286, 130, 3.5, 0, Math.PI * 2);
  context.arc(311, 130, 3.5, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#86544b";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(286, 151);
  context.quadraticCurveTo(299, 159, 312, 151);
  context.stroke();
  context.fillStyle = "rgba(255, 242, 210, 0.16)";
  context.fillRect(12, 12, 456, 276);

  const portraitTexture = new THREE.CanvasTexture(portraitCanvas);
  portraitTexture.colorSpace = THREE.SRGBColorSpace;
  return portraitTexture;
}

function createInstantPhotoCaption() {
  const captionCanvas = document.createElement("canvas");
  captionCanvas.width = 512;
  captionCanvas.height = 72;
  const context = captionCanvas.getContext("2d");
  if (!context) throw new Error("Could not create the instant-photo caption.");
  context.fillStyle = "#5b5147";
  context.font = "italic 30px Georgia, serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("HOME  •  SUMMER", 256, 36);
  const texture = new THREE.CanvasTexture(captionCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildEndingHouse(parent, position, scale, variation) {
  const house = new THREE.Group();
  house.position.set(...position);
  house.scale.setScalar(scale);
  const wallMaterial = new THREE.MeshToonMaterial({
    color: variation % 2 === 0 ? 0xe7d99e : 0xc6d8a4,
    flatShading: true,
  });
  const roofMaterial = new THREE.MeshToonMaterial({
    color: variation % 2 === 0 ? 0xc77968 : 0x9b7160,
    flatShading: true,
  });
  const windowMaterial = new THREE.MeshToonMaterial({
    color: 0x7d9a95,
    emissive: 0x202c2b,
    flatShading: true,
  });
  const doorMaterial = new THREE.MeshToonMaterial({ color: 0x8f725b, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.1, 4), wallMaterial);
  body.position.y = 1.55;
  house.add(body);
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x51483e });
  const bodyOutline = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), outlineMaterial);
  bodyOutline.position.copy(body.position);
  house.add(bodyOutline);

  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.8, 0);
  roofShape.lineTo(2.8, 0);
  roofShape.lineTo(0, 2.25 + (variation % 3) * 0.18);
  roofShape.closePath();
  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roofShape, { depth: 4.35, bevelEnabled: false }),
    roofMaterial,
  );
  roof.position.set(0, 3.08, -2.18);
  house.add(roof);
  const roofOutline = new THREE.LineSegments(new THREE.EdgesGeometry(roof.geometry), outlineMaterial);
  roofOutline.position.copy(roof.position);
  house.add(roofOutline);

  for (const x of [-1.25, 1.25]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.08), windowMaterial);
    window.position.set(x, 2.05, 2.05);
    house.add(window);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.65, 0.1), doorMaterial);
  door.position.set(0, 0.84, 2.06);
  house.add(door);
  parent.add(house);
}

function buildEndingScene() {
  const cabin = new THREE.Group();
  const cabinWall = new THREE.MeshToonMaterial({ color: 0x89806a, flatShading: true });
  const cabinTrim = new THREE.MeshToonMaterial({ color: 0xc4ad71, flatShading: true });
  const cabinFloor = new THREE.MeshToonMaterial({ color: 0x625d4e, flatShading: true });
  const shaftGlass = new THREE.MeshToonMaterial({
    color: 0x303b37,
    emissive: 0x10160f,
    flatShading: true,
  });
  const shaftLight = new THREE.MeshToonMaterial({
    color: 0xe7d59b,
    emissive: 0xa28b51,
    emissiveIntensity: 1.2,
    flatShading: true,
  });
  endingRoot.add(cabin);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 4.6), cabinFloor);
  floor.position.set(0, 0, 0);
  cabin.add(floor);
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 4.6), cabinWall);
  ceiling.position.set(0, 2.85, 0);
  cabin.add(ceiling);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.8, 4.5), cabinWall);
  leftWall.position.set(-2.15, 1.4, 0);
  cabin.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.8, 4.5), cabinWall);
  rightWall.position.set(2.15, 1.4, 0);
  cabin.add(rightWall);
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 0.14), cabinWall);
  frontWall.position.set(0, 1.4, 2.22);
  cabin.add(frontWall);
  const rearHeader = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 0.16), cabinWall);
  rearHeader.position.set(0, 2.62, -2.2);
  cabin.add(rearHeader);
  const rearSill = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 0.16), cabinWall);
  rearSill.position.set(0, 0.14, -2.2);
  cabin.add(rearSill);
  for (const x of [-2.05, 2.05]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.6, 0.06), cabinTrim);
    rail.position.set(x, 1.42, 2.13);
    cabin.add(rail);
  }
  const rearDoors = [-1, 1].map((side) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.08, 2.35, 0.11), cabinTrim);
    door.position.set(side * 1.04, 1.34, -2.08);
    cabin.add(door);
    return door;
  });

  const shaftWindow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.95, 0.78), shaftGlass);
  shaftWindow.position.set(-2.065, 1.48, -0.15);
  cabin.add(shaftWindow);
  const shaftBands = new THREE.Group();
  shaftBands.position.set(-2.035, 1.48, -0.15);
  for (let index = 0; index < 7; index += 1) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 0.66), shaftLight);
    band.position.y = index * 0.42 - 1.25;
    shaftBands.add(band);
  }
  cabin.add(shaftBands);
  const cabinLamp = new THREE.PointLight(0xffedc4, 5.2, 9, 1.6);
  cabinLamp.position.set(0, 2.6, 0.1);
  cabin.add(cabinLamp);

  const playerModel = new THREE.Group();
  playerModel.position.set(0, 0.08, 0.05);
  cabin.add(playerModel);
  const skin = new THREE.MeshToonMaterial({ color: 0xe5ad83, flatShading: true });
  const hair = new THREE.MeshToonMaterial({ color: 0x49372e, flatShading: true });
  const suit = new THREE.MeshToonMaterial({ color: 0xc4bd39, flatShading: true });
  const suitShadow = new THREE.MeshToonMaterial({ color: 0x777631, flatShading: true });
  const reflective = new THREE.MeshToonMaterial({ color: 0xe8e19a, flatShading: true });
  const shirt = new THREE.MeshToonMaterial({ color: 0x383d37, flatShading: true });
  const pants = suit;
  const dark = new THREE.MeshToonMaterial({ color: 0x302a27, flatShading: true });
  const eyeWhite = new THREE.MeshToonMaterial({ color: 0xf0e3c9, flatShading: true });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.52, 5, 10), suit);
  torso.position.y = 0.98;
  torso.scale.z = 0.73;
  playerModel.add(torso);
  const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 0.035), shirt);
  shirtFront.position.set(0, 1.02, 0.245);
  playerModel.add(shirtFront);
  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.09, 0.035), reflective);
  chestStripe.position.set(0, 1.17, 0.243);
  playerModel.add(chestStripe);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.11, 0.35), suitShadow);
  belt.position.set(0, 0.73, 0);
  playerModel.add(belt);
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.22), suitShadow);
  backpack.position.set(0, 1.06, -0.27);
  playerModel.add(backpack);
  for (const side of [-1, 1]) {
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.46, 8), dark);
    canister.position.set(side * 0.17, 1.16, -0.4);
    playerModel.add(canister);
    const canisterTop = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), reflective);
    canisterTop.position.set(side * 0.17, 1.41, -0.4);
    playerModel.add(canisterTop);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.16, 8), skin);
  neck.position.set(0, 1.42, 0.02);
  playerModel.add(neck);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 16), suitShadow);
  collar.position.set(0, 1.43, 0.02);
  collar.rotation.x = Math.PI / 2;
  playerModel.add(collar);
  const head = new THREE.Group();
  head.position.set(0, 1.68, 0.035);
  playerModel.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), skin);
  face.scale.set(0.82, 1.08, 0.78);
  head.add(face);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.245, 16, 10), suit);
  hairCap.scale.set(0.91, 0.52, 0.82);
  hairCap.position.set(0, 0.135, -0.015);
  head.add(hairCap);
  for (const side of [-1, 1]) {
    const sideHair = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), suit);
    sideHair.scale.set(0.7, 1.25, 0.8);
    sideHair.position.set(side * 0.18, 0.01, 0.015);
    head.add(sideHair);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.033, 10, 8), eyeWhite);
    eye.position.set(side * 0.086, 0.008, 0.177);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), dark);
    pupil.position.set(side * 0.086, 0.006, 0.205);
    head.add(pupil);
    const underEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.012), dark);
    underEye.position.set(side * 0.086, -0.043, 0.181);
    underEye.rotation.z = side * 0.08;
    underEye.material = underEye.material.clone();
    underEye.material.transparent = true;
    underEye.material.opacity = 0.34;
    head.add(underEye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.025, 0.03), hair);
    brow.position.set(side * 0.086, 0.062, 0.181);
    brow.rotation.z = side * -0.18;
    head.add(brow);
  }
  const visorMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9d7c9,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 20, 14, 0, Math.PI, Math.PI / 4, Math.PI / 2),
    visorMaterial,
  );
  visor.position.z = 0.005;
  head.add(visor);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), skin);
  nose.scale.set(0.7, 1.1, 0.85);
  nose.position.set(0, -0.025, 0.198);
  head.add(nose);
  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.06, -0.1, 0.184),
    new THREE.Vector3(0, -0.082, 0.19),
    new THREE.Vector3(0.06, -0.1, 0.184),
  ]);
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 8, 0.008, 5, false), dark);
  head.add(mouth);
  const tearMaterial = new THREE.MeshToonMaterial({
    color: 0xd7e9e9,
    emissive: 0x243b3d,
    flatShading: true,
  });
  const tear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), tearMaterial);
  tear.scale.set(0.72, 1.35, 0.65);
  tear.position.set(0.086, -0.025, 0.205);
  tear.visible = false;
  head.add(tear);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.43, 4, 8), pants);
    leg.position.set(side * 0.15, 0.34, 0);
    playerModel.add(leg);
    const reflectiveBand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.13), reflective);
    reflectiveBand.position.set(side * 0.15, 0.42, 0.11);
    playerModel.add(reflectiveBand);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.36), suitShadow);
    shoe.position.set(side * 0.15, 0.09, 0.075);
    playerModel.add(shoe);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.4, 4, 8), suit);
    arm.position.set(side * 0.39, 1.03, 0.055);
    arm.rotation.z = side * -0.12;
    playerModel.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), dark);
    hand.position.set(side * 0.42, 0.77, 0.12);
    playerModel.add(hand);
  }

  const portraitMaterial = new THREE.MeshBasicMaterial({
    map: createEndingPortrait(),
    side: THREE.DoubleSide,
  });
  const photo = new THREE.Group();
  photo.position.set(-0.49, 1.24, 0.28);
  photo.scale.setScalar(0.42);
  photo.rotation.y = -0.12;
  playerModel.add(photo);
  const photoFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.68, 0.045),
    new THREE.MeshToonMaterial({ color: 0xf3edda, flatShading: true }),
  );
  photo.add(photoFrame);
  const photoImage = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.45), portraitMaterial);
  photoImage.position.set(0, 0.075, 0.027);
  photo.add(photoImage);
  const caption = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.075),
    new THREE.MeshBasicMaterial({ map: createInstantPhotoCaption(), transparent: true }),
  );
  caption.position.set(0, -0.245, 0.028);
  photo.add(caption);
  const photoHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), skin);
  photoHand.position.set(0.27, -0.26, 0.08);
  photo.add(photoHand);

  const outside = new THREE.Group();
  endingRoot.add(outside);
  const fieldMaterial = new THREE.MeshToonMaterial({ color: 0xaab282, flatShading: true });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), fieldMaterial);
  field.rotation.x = -Math.PI / 2;
  field.position.set(0, -0.12, -180);
  outside.add(field);
  for (const [x, z, scale, variation] of [
    [-28, -34, 1.25, 0],
    [18, -43, 1, 1],
    [-61, -70, 1.2, 2],
    [55, -78, 1.35, 3],
    [-12, -104, 0.85, 4],
    [92, -126, 1.1, 5],
    [-101, -145, 1.3, 6],
    [37, -166, 0.75, 7],
    [142, -190, 1.1, 8],
    [-174, -204, 0.9, 9],
  ]) {
    buildEndingHouse(outside, [x, 0, z], scale, variation);
  }

  endingRoot.add(new THREE.HemisphereLight(0xe9dfbd, 0x414436, 2.1));
  const cabinLight = new THREE.PointLight(0xffe6ae, 5.2, 9, 1.6);
  cabinLight.position.set(0, 2.55, 0.1);
  endingRoot.add(cabinLight);
  const fieldLight = new THREE.DirectionalLight(0xf0dda9, 2.2);
  fieldLight.position.set(-40, 110, 80);
  endingRoot.add(fieldLight);

  return { cabin, playerModel, torso, head, tear, photo, rearDoors, shaftBands, cabinLamp, outside };
}

const endingSet = buildEndingScene();
endingSet.outside.visible = true;
endingRoot.visible = false;

function tileAt(column, row) {
  return map[row]?.[column] ?? "#";
}

function isWall(column, row) {
  return tileAt(column, row) === "#";
}

function collidesWithWall(x, y, radius) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius) / TILE);
  const top = Math.floor((y - radius) / TILE);
  const bottom = Math.floor((y + radius) / TILE);

  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) {
      if (!isWall(column, row)) continue;
      const nearestX = Math.max(column * TILE, Math.min(x, (column + 1) * TILE));
      const nearestY = Math.max(row * TILE, Math.min(y, (row + 1) * TILE));
      const deltaX = x - nearestX;
      const deltaY = y - nearestY;
      if (deltaX * deltaX + deltaY * deltaY < radius * radius) return true;
    }
  }
  return false;
}

function findNextStep(startX, startY, goalX, goalY) {
  const start = { x: Math.floor(startX / TILE), y: Math.floor(startY / TILE) };
  const goal = { x: Math.floor(goalX / TILE), y: Math.floor(goalY / TILE) };
  const queue = [start];
  const visited = new Map([[`${start.x},${start.y}`, null]]);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === goal.x && current.y === goal.y) break;

    for (const [dx, dy] of directions) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = `${next.x},${next.y}`;
      if (isWall(next.x, next.y) || visited.has(key)) continue;
      visited.set(key, `${current.x},${current.y}`);
      queue.push(next);
    }
  }

  const goalKey = `${goal.x},${goal.y}`;
  if (!visited.has(goalKey)) return null;
  let step = goal;
  let parent = visited.get(`${step.x},${step.y}`);

  while (parent && parent !== `${start.x},${start.y}`) {
    const [x, y] = parent.split(",").map(Number);
    step = { x, y };
    parent = visited.get(parent);
  }

  return {
    x: step.x * TILE + TILE / 2,
    y: step.y * TILE + TILE / 2,
    sameTile: start.x === goal.x && start.y === goal.y,
  };
}

function showMessage(text) {
  gameMessage.textContent = text;
  gameMessage.classList.add("visible");
  messageTimer = 2.4;
}

function startLoopedTrack(track, label) {
  const playback = track.play();
  if (playback && typeof playback.catch === "function") {
    playback.catch((error) => {
      console.error(`Could not play ${label} audio.`, error);
      showMessage(`${label} audio could not start. Check that the MP3 file is available.`);
    });
  }
}

function initializeFootstepAudio() {
  if (!footstepContext) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      showMessage("This browser does not support the footstep sound effects.");
      return null;
    }
    try {
      footstepContext = new AudioContextConstructor();
    } catch (error) {
      console.error("Could not initialize footstep audio.", error);
      showMessage("Footstep sound effects could not be initialized.");
      return null;
    }
  }

  if (footstepContext.state === "suspended") {
    footstepContext.resume().catch((error) => {
      console.error("Could not resume footstep audio.", error);
      showMessage("Footstep sound effects could not be resumed.");
    });
  }
  return footstepContext;
}

function playEndingTone(frequency, duration, volume, type = "sine", endFrequency = frequency) {
  if (!footstepContext || footstepContext.state !== "running") return;
  const now = footstepContext.currentTime;
  const oscillator = footstepContext.createOscillator();
  const gain = footstepContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.linearRampToValueAtTime(endFrequency, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), now + Math.min(0.04, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(footstepContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playEndingNoise(duration, volume, filterType, frequency) {
  if (!footstepContext || footstepContext.state !== "running") return;
  const now = footstepContext.currentTime;
  const length = Math.floor(footstepContext.sampleRate * duration);
  const buffer = footstepContext.createBuffer(1, length, footstepContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  const source = footstepContext.createBufferSource();
  const filter = footstepContext.createBiquadFilter();
  const gain = footstepContext.createGain();
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), now + Math.min(0.15, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(footstepContext.destination);
  source.start(now);
}

function startEndingRumble() {
  if (!footstepContext || footstepContext.state !== "running") return;
  const now = footstepContext.currentTime;
  const oscillator = footstepContext.createOscillator();
  const filter = footstepContext.createBiquadFilter();
  const gain = footstepContext.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(42, now);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(115, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 1.2);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(footstepContext.destination);
  oscillator.start(now);
  endingCutscene.rumble = { oscillator, gain };
}

function stopEndingRumble() {
  const rumble = endingCutscene?.rumble;
  if (!rumble || !footstepContext) return;
  const now = footstepContext.currentTime;
  rumble.gain.gain.cancelScheduledValues(now);
  rumble.gain.gain.setTargetAtTime(0.0001, now, 0.24);
  rumble.oscillator.stop(now + 1.2);
  endingCutscene.rumble = null;
}

function playEndingCue(name) {
  if (name === "door-close") {
    playEndingTone(112, 0.55, 0.16, "triangle", 48);
    playEndingNoise(0.36, 0.12, "lowpass", 680);
  } else if (name === "cable-clank") {
    playEndingTone(430, 0.38, 0.06, "triangle", 92);
    playEndingNoise(0.22, 0.045, "bandpass", 870);
  } else if (name === "breath") {
    playEndingNoise(0.9, 0.07, "bandpass", 520);
  } else if (name === "photo") {
    playEndingNoise(0.5, 0.055, "highpass", 1550);
  } else if (name === "tear") {
    playEndingTone(1040, 0.34, 0.05, "sine", 520);
    playEndingTone(520, 0.42, 0.018, "sine", 310);
  } else if (name === "ding") {
    playEndingTone(880, 1.1, 0.08, "sine", 880);
    window.setTimeout(() => playEndingTone(1320, 0.75, 0.045), 90);
  } else if (name === "doors-open") {
    playEndingNoise(0.85, 0.09, "lowpass", 430);
    playEndingTone(180, 0.82, 0.035, "triangle", 96);
  } else if (name === "wind") {
    playEndingNoise(7, 0.025, "lowpass", 580);
  } else if (name === "bird") {
    playEndingTone(1760, 0.36, 0.016, "sine", 2240);
    window.setTimeout(() => playEndingTone(2140, 0.3, 0.012, "sine", 1850), 210);
  }
}

function startGameAudio() {
  handprintMusic.currentTime = 0;
  entityMusic.currentTime = 0;
  elevatorMusic.currentTime = 0;
  entityMusic.volume = 0;
  elevatorMusic.volume = 0;
  startLoopedTrack(handprintMusic, "Handprint");
  startLoopedTrack(entityMusic, "Monster");
  startLoopedTrack(elevatorMusic, "Elevator");
  initializeFootstepAudio();
}

function stopGameAudio() {
  handprintMusic.pause();
  entityMusic.pause();
  elevatorMusic.pause();
  entityMusic.volume = 0;
  elevatorMusic.volume = 0;
}

function updateProximityMusic(entityDistance, elevatorDistance) {
  const entityProximity = entity.visible ? THREE.MathUtils.clamp(1 - entityDistance / 380, 0, 1) : 0;
  const elevatorProximity = THREE.MathUtils.clamp(1 - elevatorDistance / ELEVATOR_MUSIC_RADIUS, 0, 1);
  const handprintFade = THREE.MathUtils.clamp(
    (elevatorDistance - ELEVATOR_MUSIC_RADIUS) / HANDPRINT_FADE_DISTANCE,
    0,
    1,
  );
  entityMusic.volume = Math.pow(entityProximity, 1.5) * 0.85;
  handprintMusic.volume = 0.4 * handprintFade;
  elevatorMusic.volume = Math.pow(elevatorProximity, 1.4) * 0.85;
}

function playFootstep(isPirate, intensity = 1) {
  if (!footstepContext || footstepContext.state !== "running") return;
  const now = footstepContext.currentTime;
  const output = footstepContext.createGain();
  const volume = (isPirate ? 0.62 : 0.16) * THREE.MathUtils.clamp(intensity, 0, 1);
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), now + 0.012);
  output.gain.exponentialRampToValueAtTime(0.0001, now + (isPirate ? 0.28 : 0.18));
  output.connect(footstepContext.destination);

  const thud = footstepContext.createOscillator();
  thud.type = isPirate ? "triangle" : "sine";
  thud.frequency.setValueAtTime(isPirate ? 58 : 86, now);
  thud.frequency.exponentialRampToValueAtTime(isPirate ? 34 : 43, now + 0.16);
  thud.connect(output);
  thud.start(now);
  thud.stop(now + 0.2);

  const noiseLength = Math.floor(footstepContext.sampleRate * (isPirate ? 0.13 : 0.08));
  const noiseBuffer = footstepContext.createBuffer(1, noiseLength, footstepContext.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseLength; index += 1) {
    noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseLength);
  }
  const noise = footstepContext.createBufferSource();
  const filter = footstepContext.createBiquadFilter();
  const noiseGain = footstepContext.createGain();
  noise.buffer = noiseBuffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(isPirate ? 720 : 460, now);
  noiseGain.gain.setValueAtTime(isPirate ? 0.72 : 0.24, now);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(output);
  noise.start(now);

  if (isPirate) {
    const woodKnock = footstepContext.createOscillator();
    const knockGain = footstepContext.createGain();
    woodKnock.type = "triangle";
    woodKnock.frequency.setValueAtTime(155, now + 0.025);
    woodKnock.frequency.exponentialRampToValueAtTime(78, now + 0.16);
    knockGain.gain.setValueAtTime(0.34, now + 0.025);
    knockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    woodKnock.connect(knockGain);
    knockGain.connect(output);
    woodKnock.start(now + 0.025);
    woodKnock.stop(now + 0.2);
  }
}

function updateFootsteps(deltaTime, sprinting, entityDistance) {
  player.distanceSinceStep += player.frameDistance;
  const playerStrideLength = sprinting ? 90 : 58;
  while (player.distanceSinceStep >= playerStrideLength) {
    player.distanceSinceStep -= playerStrideLength;
    playFootstep(false, sprinting ? 0.9 : 0.72);
  }

  if (entity.visible && entity.moving) {
    entityFootstepTimer -= deltaTime;
    if (entityFootstepTimer <= 0) {
      const audibility = THREE.MathUtils.clamp(1 - entityDistance / 520, 0, 1);
      playFootstep(true, audibility);
      entityFootstepTimer = 0.62 + Math.random() * 0.08;
    }
  } else {
    entityFootstepTimer = 0;
  }
}

function resetGame() {
  endingMusic.pause();
  endingMusic.currentTime = 0;
  worldRoot.visible = true;
  endingRoot.visible = false;
  endingCutscene = null;
  endingBlackout.classList.remove("visible");
  endingThankYou.classList.remove("visible");
  endingThankYou.setAttribute("aria-hidden", "true");
  document.body.classList.remove("ending-sequence");
  scene.background = new THREE.Color(0x171306);
  scene.fog = new THREE.Fog(0x171306, 180, 820);
  camera.fov = 76;
  camera.updateProjectionMatrix();
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.yaw = 0;
  player.pitch = 0;
  entity.x = entityStart.x;
  entity.y = entityStart.y;
  entity.visible = false;
  entity.moving = false;
  entity.speed = 52;
  entity.pathTimer = 0;
  entity.target = null;
  player.moving = false;
  player.frameDistance = 0;
  player.distanceSinceStep = 0;
  entityFootstepTimer = 0;
  relays.forEach((relay) => {
    relay.active = false;
    relay.mesh.visible = true;
  });
  entityModel.root.visible = false;
  entityModel.root.position.set(entity.x, 0, entity.y);
  exitModel.userData.doors[0].position.x = -6.2;
  exitModel.userData.doors[1].position.x = 6.2;
  exitModel.userData.doors.forEach((door, index) => {
    door.material = index === 0 ? materials.darkWood : materials.wood;
  });
  relaysFound = 0;
  elevatorUnlocked = false;
  firstRelayCutscenePlayed = false;
  cinematic = null;
  qPressCount = 0;
  lastQPressTime = 0;
  presence = 0;
  relayCount.textContent = "0";
  objectiveText.textContent = "Restore the relay lamps";
  presenceFill.style.width = "0%";
  gameMessage.classList.remove("visible");
  heldKeys.clear();
}

function unlockElevator() {
  elevatorUnlocked = true;
  objectiveText.textContent = "Reach the service lift";
  exitModel.userData.doors.forEach((door, index) => {
    door.material = materials.relay;
    door.position.x = index === 0 ? -15 : 15;
  });
}

function findCinematicEntityPosition() {
  let bestPosition = null;
  let bestScore = Infinity;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      if (isWall(column, row)) continue;
      const position = tileWorldPosition(column, row);
      const distance = Math.hypot(position.x - player.x, position.z - player.y);
      if (distance < 110 || distance > 250) continue;

      const sampleCount = Math.ceil(distance / 8);
      let clearView = true;
      for (let index = 1; index < sampleCount; index += 1) {
        const progress = index / sampleCount;
        const x = player.x + (position.x - player.x) * progress;
        const z = player.y + (position.z - player.y) * progress;
        if (isWall(Math.floor(x / TILE), Math.floor(z / TILE))) {
          clearView = false;
          break;
        }
      }
      if (clearView) {
        const score = Math.abs(distance - 185);
        if (score < bestScore) {
          bestPosition = position;
          bestScore = score;
        }
      }
    }
  }
  return bestPosition ?? { x: entityStart.x, z: entityStart.y };
}

function startFirstRelayCutscene() {
  const position = findCinematicEntityPosition();
  entity.x = position.x;
  entity.y = position.z;
  entity.target = { x: player.x, y: player.y };
  entity.pathTimer = 0;
  entity.moving = false;
  entityModel.root.position.set(entity.x, 0, entity.y);
  entityModel.root.rotation.y = Math.atan2(player.x - entity.x, player.y - entity.y);
  entityModel.lastX = entity.x;
  entityModel.lastY = entity.y;
  entityModel.lastTime = null;
  const entityStartPosition = { x: entity.x, y: entity.y };
  firstRelayCutscenePlayed = true;
  heldKeys.clear();
  player.moving = false;
  cinematic = {
    elapsed: 0,
    duration: 4,
    entityStartX: entityStartPosition.x,
    entityStartY: entityStartPosition.y,
    startYaw: player.yaw,
    startPitch: player.pitch,
    targetYaw: Math.atan2(entity.y - player.y, entity.x - player.x),
    targetPitch: 0,
  };
  showMessage("The lamp comes alive. Something is waiting in the halls.");
  messageTimer = cinematic.duration;
}

function updateCutscene(deltaTime) {
  if (!cinematic) return;
  cinematic.elapsed += deltaTime;
  const turnProgress = THREE.MathUtils.clamp((cinematic.elapsed - 0.35) / 1.45, 0, 1);
  const easedTurn = turnProgress * turnProgress * (3 - 2 * turnProgress);
  const yawDelta = Math.atan2(
    Math.sin(cinematic.targetYaw - cinematic.startYaw),
    Math.cos(cinematic.targetYaw - cinematic.startYaw),
  );
  player.yaw = cinematic.startYaw + yawDelta * easedTurn;
  player.pitch = cinematic.startPitch * (1 - easedTurn) + cinematic.targetPitch * easedTurn;

  const approach = THREE.MathUtils.clamp((cinematic.elapsed - 1.4) / 2.2, 0, 1);
  const easedApproach = approach * approach * (3 - 2 * approach);
  const distanceToPlayer = Math.hypot(
    player.x - cinematic.entityStartX,
    player.y - cinematic.entityStartY,
  );
  const approachDistance = Math.min(24, Math.max(0, distanceToPlayer - 60));
  const nextX = cinematic.entityStartX +
    ((player.x - cinematic.entityStartX) / distanceToPlayer) * approachDistance * easedApproach;
  const nextY = cinematic.entityStartY +
    ((player.y - cinematic.entityStartY) / distanceToPlayer) * approachDistance * easedApproach;
  if (!collidesWithWall(nextX, nextY, entity.radius)) {
    entity.moving = Math.hypot(nextX - entity.x, nextY - entity.y) > 0.1;
    entity.x = nextX;
    entity.y = nextY;
  }

  if (cinematic.elapsed >= cinematic.duration) {
    player.yaw = cinematic.targetYaw;
    player.pitch = cinematic.targetPitch;
    cinematic = null;
    entity.moving = false;
  }
}

const endingCueSchedule = [
  [0, "door-close"],
  [0.8, "rumble-start"],
  [3.3, "cable-clank"],
  [4.8, "breath"],
  [5.15, "photo"],
  [7.6, "tear"],
  [8.9, "ding"],
  [9.35, "rumble-stop"],
  [9.8, "doors-open"],
  [10.5, "wind"],
  [12.4, "bird"],
  [15.9, "breath"],
];

const endingShots = [
  { time: 0, position: [1.05, 1.78, 1.95], target: [0, 1.12, 0] },
  { time: 2.6, position: [0, 1.82, 1.32], target: [0, 1.66, 0.06] },
  { time: 5, position: [-1.12, 1.48, 1.22], target: [-0.38, 1.44, 0.37] },
  { time: 6.8, position: [-1.12, 1.48, 1.22], target: [-0.38, 1.44, 0.37] },
  { time: 7.45, position: [0, 1.78, 1.2], target: [0, 1.62, 0.12] },
  { time: 9.35, position: [0, 1.9, 1.18], target: [0, 1.67, 0.05] },
  { time: 10.2, position: [2.25, 1.62, -0.5], target: [0, 1.35, -2.35] },
  { time: 13.6, position: [0, 1.75, -11], target: [0, 2.8, -110] },
  { time: 15.4, position: [0, 1.72, -8.5], target: [0, 1.38, 0] },
  { time: 17.1, position: [0, 1.8, -1.24], target: [0, 1.63, -0.12] },
  { time: 19.5, position: [0, 1.8, -1.24], target: [0, 1.63, -0.12] },
];

function startEndingCutscene() {
  state = "ending";
  heldKeys.clear();
  stopGameAudio();
  endingMusic.currentTime = 0;
  endingMusic.volume = 0.144;
  startLoopedTrack(endingMusic, "Ending");
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  overlay.hidden = true;
  gameMessage.classList.remove("visible");
  worldRoot.visible = false;
  endingRoot.visible = true;
  endingSet.cabin.visible = true;
  endingSet.outside.visible = true;
  endingSet.rearDoors[0].position.x = -1.04;
  endingSet.rearDoors[1].position.x = 1.04;
  endingSet.tear.visible = false;
  endingSet.tear.position.y = -0.025;
  endingSet.photo.position.set(-0.49, 1.24, 0.28);
  endingSet.head.rotation.set(0.18, 0, 0);
  endingSet.playerModel.position.set(0, 0.08, 0.05);
  endingSet.playerModel.rotation.y = 0;
  endingSet.cabin.position.set(0, 0, 0);
  endingBlackout.classList.remove("visible");
  endingThankYou.classList.remove("visible");
  endingThankYou.setAttribute("aria-hidden", "true");
  document.body.classList.add("ending-sequence");
  scene.background = new THREE.Color(0xd0c8a9);
  scene.fog = new THREE.Fog(0xd0c8a9, 12, 220);
  camera.fov = 54;
  camera.updateProjectionMatrix();
  endingCutscene = {
    elapsed: 0,
    playedCues: new Set(),
    rumble: null,
    thankYouShown: false,
    complete: false,
  };
}

function updateEndingCutscene(deltaTime) {
  if (!endingCutscene || endingCutscene.complete) return;
  endingCutscene.elapsed += deltaTime;
  const time = endingCutscene.elapsed;

  for (const [cueTime, cue] of endingCueSchedule) {
    if (time < cueTime || endingCutscene.playedCues.has(cue)) continue;
    endingCutscene.playedCues.add(cue);
    if (cue === "rumble-start") startEndingRumble();
    else if (cue === "rumble-stop") stopEndingRumble();
    else playEndingCue(cue);
  }

  const movement = THREE.MathUtils.clamp(1 - time / 9.2, 0, 1);
  endingSet.cabin.position.y = 0;
  endingSet.cabin.rotation.z = 0;
  endingSet.shaftBands.position.y = 1.48 + ((time * 1.35) % 2.4) - 1.2;
  endingSet.cabinLamp.intensity = 4.5 + Math.sin(time * 11) * 0.5 * movement;

  const photoLift = THREE.MathUtils.clamp((time - 5.05) / 0.8, 0, 1);
  const photoLower = THREE.MathUtils.clamp((time - 7.15) / 0.55, 0, 1);
  const photoProgress = photoLift * (1 - photoLower);
  endingSet.photo.position.set(
    -0.49 + 0.11 * photoProgress,
    1.24 + 0.2 * photoProgress,
    0.28 + 0.09 * photoProgress,
  );
  const photoLook = THREE.MathUtils.clamp((time - 4.8) / 0.6, 0, 1) *
    (1 - THREE.MathUtils.clamp((time - 7.2) / 0.55, 0, 1));
  const lookUp = THREE.MathUtils.clamp((time - 9.05) / 0.72, 0, 1);
  endingSet.head.rotation.x = 0.18 - 0.08 * photoLook - 0.26 * lookUp;
  endingSet.head.rotation.y = -0.34 * photoLook + 0.34 * lookUp;
  const turn = THREE.MathUtils.clamp((time - 9.35) / 0.9, 0, 1);
  const easedTurn = turn * turn * (3 - 2 * turn);
  endingSet.playerModel.rotation.y = Math.PI * easedTurn;
  endingSet.tear.visible = time >= 7.45;
  endingSet.tear.position.y = -0.025 - THREE.MathUtils.clamp((time - 7.45) / 1.05, 0, 1) * 0.15;

  const doorProgress = THREE.MathUtils.clamp((time - 9.55) / 0.9, 0, 1);
  const easedDoor = doorProgress * doorProgress * (3 - 2 * doorProgress);
  endingSet.rearDoors[0].position.x = -1.04 - 1.05 * easedDoor;
  endingSet.rearDoors[1].position.x = 1.04 + 1.05 * easedDoor;

  if (time >= 17.8) endingBlackout.classList.add("visible");
  if (time >= 22.5 && !endingCutscene.thankYouShown) {
    endingThankYou.classList.add("visible");
    endingThankYou.setAttribute("aria-hidden", "false");
    endingCutscene.thankYouShown = true;
  }
  if (time >= 24.5) {
    stopEndingRumble();
    endingMusic.pause();
    endingMusic.currentTime = 0;
    endingCutscene.complete = true;
    state = "ended";
  }
}

function updateEndingCamera() {
  if (!endingCutscene) return;
  const time = endingCutscene.elapsed;
  let segment = endingShots.length - 2;
  for (let index = 0; index < endingShots.length - 1; index += 1) {
    if (time <= endingShots[index + 1].time) {
      segment = index;
      break;
    }
  }
  const from = endingShots[segment];
  const to = endingShots[segment + 1];
  const progress = THREE.MathUtils.clamp((time - from.time) / (to.time - from.time), 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  const position = new THREE.Vector3(...from.position).lerp(new THREE.Vector3(...to.position), eased);
  const target = new THREE.Vector3(...from.target).lerp(new THREE.Vector3(...to.target), eased);
  camera.position.copy(position);
  camera.lookAt(target);
}

function beginGame() {
  resetGame();
  state = "playing";
  overlay.hidden = true;
  startGameAudio();
  canvas.focus();
  requestLookLock();
}

function endGame(won) {
  if (won) {
    startEndingCutscene();
    return;
  }
  state = won ? "won" : "lost";
  heldKeys.clear();
  stopGameAudio();
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  overlay.hidden = false;
  overlayEyebrow.textContent = won ? "SHIFT COMPLETE" : "SIGNAL LOST";
  overlayTitle.textContent = won ? "You made it outside." : "The halls went quiet.";
  overlayCopy.textContent = won
    ? "The lift doors close behind you. Somewhere below, one relay is still humming."
    : "The Backrooms swallowed the last of your light. You can try the route again.";
  startButton.textContent = won ? "Play again" : "Try again";
}

function updatePlayer(deltaTime) {
  const turn = Number(heldKeys.has("arrowright")) - Number(heldKeys.has("arrowleft"));
  player.yaw += turn * 2.1 * deltaTime;
  const forward = Number(heldKeys.has("w") || heldKeys.has("arrowup")) -
    Number(heldKeys.has("s") || heldKeys.has("arrowdown"));
  const strafe = Number(heldKeys.has("d")) - Number(heldKeys.has("a"));
  let moveX = Math.cos(player.yaw) * forward - Math.sin(player.yaw) * strafe;
  let moveY = Math.sin(player.yaw) * forward + Math.cos(player.yaw) * strafe;
  const length = Math.hypot(moveX, moveY);
  if (length === 0) {
    player.moving = false;
    player.frameDistance = 0;
    return false;
  }

  moveX /= length;
  moveY /= length;
  const sprinting = heldKeys.has("shift");
  const speed = sprinting ? 178 : 110;
  const previousX = player.x;
  const previousY = player.y;
  const nextX = player.x + moveX * speed * deltaTime;
  const nextY = player.y + moveY * speed * deltaTime;

  if (!collidesWithWall(nextX, player.y, player.radius)) player.x = nextX;
  if (!collidesWithWall(player.x, nextY, player.radius)) player.y = nextY;
  player.frameDistance = Math.hypot(player.x - previousX, player.y - previousY);
  player.moving = player.frameDistance > 0.1;
  return sprinting;
}

function updateEntity(deltaTime, sprinting) {
  entity.moving = false;
  if (!entity.visible) return;

  entity.speed = 52 + relaysFound * 4 + (sprinting ? 16 : 0);
  entity.pathTimer -= deltaTime;
  if (entity.pathTimer <= 0) {
    entity.target = findNextStep(entity.x, entity.y, player.x, player.y);
    entity.pathTimer = 0.3;
  }

  if (!entity.target) return;
  if (entity.target.sameTile) {
    entity.target = { x: player.x, y: player.y };
  }

  const dx = entity.target.x - entity.x;
  const dy = entity.target.y - entity.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 1) {
    const step = Math.min(distance, entity.speed * deltaTime);
    entity.x += (dx / distance) * step;
    entity.y += (dy / distance) * step;
    entity.moving = step > 0.1;
  }
}

function updateGame(deltaTime) {
  if (state === "ending") {
    updateEndingCutscene(deltaTime);
    return;
  }
  if (state !== "playing") return;
  let sprinting = false;
  if (cinematic) {
    updateCutscene(deltaTime);
  } else {
    sprinting = updatePlayer(deltaTime);
    updateEntity(deltaTime, sprinting);
  }

  for (const relay of relays) {
    if (!relay.active && Math.hypot(player.x - relay.x, player.y - relay.y) < 23) {
      relay.active = true;
      relay.mesh.visible = false;
      relaysFound += 1;
      relayCount.textContent = String(relaysFound);
      entity.visible = true;
      entityModel.root.visible = true;
      showMessage(relaysFound === relays.length ? "All relays live. The service lift is open." : "Relay restored. Something stirred in the halls.");
      if (!firstRelayCutscenePlayed) startFirstRelayCutscene();
      if (relaysFound === relays.length) {
        entity.speed += 8;
        unlockElevator();
      }
    }
  }

  const distanceToEntity = entity.visible
    ? Math.hypot(player.x - entity.x, player.y - entity.y)
    : 260;
  const distanceToElevator = Math.hypot(player.x - exitModel.position.x, player.y - exitModel.position.z);
  updateProximityMusic(distanceToEntity, distanceToElevator);
  updateFootsteps(deltaTime, sprinting, distanceToEntity);
  const targetPresence = entity.visible ? Math.max(0, Math.min(100, 100 - distanceToEntity / 2.7)) : 0;
  presence += (targetPresence - presence) * Math.min(1, deltaTime * 2.8);
  presenceFill.style.width = `${presence}%`;
  presenceFill.style.backgroundColor = presence > 70 ? "#f0d477" : presence > 38 ? "#d8b64e" : "#ad9140";

  if (!cinematic && entity.visible && distanceToEntity < player.radius + entity.radius - 1) {
    endGame(false);
    return;
  }
  if (elevatorUnlocked && Math.hypot(player.x - exit.x, player.y - exit.y) < 25) {
    endGame(true);
    return;
  }

  if (messageTimer > 0) {
    messageTimer -= deltaTime;
    if (messageTimer <= 0) gameMessage.classList.remove("visible");
  }
}

function updateCamera() {
  if (endingCutscene) {
    updateEndingCamera();
    return;
  }
  const pitchCos = Math.cos(player.pitch);
  const eyeHeight = 22;
  let cameraX = player.x;
  let cameraZ = player.y;
  if (cinematic) {
    const dollyProgress = THREE.MathUtils.clamp((cinematic.elapsed - 0.3) / 3.2, 0, 1);
    const dolly = Math.sin(dollyProgress * Math.PI) * 16;
    const nextX = player.x + Math.cos(player.yaw) * dolly;
    const nextZ = player.y + Math.sin(player.yaw) * dolly;
    if (!collidesWithWall(nextX, nextZ, player.radius)) {
      cameraX = nextX;
      cameraZ = nextZ;
    }
  }
  camera.position.set(cameraX, eyeHeight, cameraZ);
  camera.lookAt(
    cameraX + Math.cos(player.yaw) * pitchCos * 100,
    eyeHeight + Math.sin(player.pitch) * 100,
    cameraZ + Math.sin(player.yaw) * pitchCos * 100,
  );
}

function updateEntityModel(time) {
  if (!entity.visible) return;
  const elapsed = entityModel.lastTime === null ? 0 : Math.min(Math.max(time - entityModel.lastTime, 0), 0.05);
  const distance = Math.hypot(entity.x - entityModel.lastX, entity.y - entityModel.lastY);
  const movementSpeed = elapsed > 0 ? distance / elapsed : 0;
  const walkAmount = THREE.MathUtils.clamp(movementSpeed / 45, 0, 1);
  entityModel.lastTime = time;
  entityModel.lastX = entity.x;
  entityModel.lastY = entity.y;
  entityModel.walkPhase += elapsed * (4.5 + movementSpeed * 0.012) * walkAmount;

  const stride = Math.sin(entityModel.walkPhase);
  const bob = walkAmount * Math.abs(Math.sin(entityModel.walkPhase * 2)) * 0.8 +
    (1 - walkAmount) * Math.sin(time * 1.7) * 0.18;
  entityModel.root.position.set(entity.x, bob, entity.y);
  if (entity.target) {
    entityModel.root.rotation.y = Math.atan2(entity.target.x - entity.x, entity.target.y - entity.y);
  }
  entityModel.torso.rotation.z = 0.025 + stride * 0.045 * walkAmount;
  entityModel.torso.rotation.x = 0.06 + Math.cos(entityModel.walkPhase) * 0.025 * walkAmount;
  entityModel.head.rotation.z = Math.sin(time * 1.4) * 0.045 - stride * 0.055 * walkAmount;
  entityModel.head.rotation.x = 0.025 + Math.sin(entityModel.walkPhase + 0.5) * 0.06 * walkAmount;
  entityModel.jaw.rotation.z = -0.08 - (Math.sin(time * 2.8) + 1) * 0.12;
  entityModel.hat.rotation.z = Math.sin(time * 1.3) * 0.025 - stride * 0.035 * walkAmount;
  entityModel.hat.rotation.x = Math.sin(time * 1.7) * 0.018 + Math.cos(entityModel.walkPhase) * 0.035 * walkAmount;
  entityModel.limbs[0].rotation.x = 0.12 + Math.sin(entityModel.walkPhase + Math.PI) * 0.48 * walkAmount;
  entityModel.limbs[1].rotation.x = stride * 0.44 * walkAmount;
  entityModel.limbs[2].rotation.x = -0.16 + stride * 0.34 * walkAmount;
  entityModel.limbs[3].rotation.x = Math.sin(entityModel.walkPhase + Math.PI) * 0.36 * walkAmount;
  entityModel.knees[0].rotation.x = Math.max(0, -stride) * 0.62 * walkAmount;
  entityModel.knees[1].rotation.x = Math.max(0, stride) * 0.34 * walkAmount;
  entityModel.coatTails[0].rotation.x = 0.08 + stride * 0.28 * walkAmount;
  entityModel.coatTails[1].rotation.x = -0.08 - stride * 0.24 * walkAmount;
  entityModel.coatTails[0].rotation.z = -0.12 - stride * 0.08 * walkAmount;
  entityModel.coatTails[1].rotation.z = 0.12 - stride * 0.08 * walkAmount;
  entityModel.canePivot.rotation.x = -0.08 + Math.max(0, stride) * 0.24 * walkAmount;
}

function animateLights(time) {
  worldRoot.traverse((child) => {
    if (!child.userData.light) return;
    child.userData.light.intensity = child.userData.baseIntensity *
      (0.9 + Math.sin(time * 8 + child.userData.phase) * 0.035);
  });
  relays.forEach((relay, index) => {
    if (relay.orb) relay.orb.rotation.y = time * 0.8 + index;
  });
}

function frame(time) {
  requestAnimationFrame(frame);
  const deltaTime = Math.min((time - lastFrame) / 1000 || 0, 0.05);
  lastFrame = time;
  updateGame(deltaTime);
  updateEntityModel(time / 1000);
  updateCamera();
  animateLights(time / 1000);
  renderer.render(scene, camera);
}

function normalizeKey(key) {
  return key.toLowerCase();
}

function turnCamera(deltaX, deltaY) {
  if (cinematic) return;
  player.yaw += deltaX * 0.0024;
  player.pitch = THREE.MathUtils.clamp(player.pitch - deltaY * 0.0024, -1.35, 1.35);
}

function requestLookLock() {
  if (typeof canvas.requestPointerLock !== "function" || pointerLockPending) return;
  pointerLockPending = true;
  try {
    const request = canvas.requestPointerLock();
    if (request && typeof request.catch === "function") {
      request.catch(() => {
        pointerLockPending = false;
        showMessage("Mouse look could not lock. Click and drag to turn.");
      });
    }
  } catch {
    pointerLockPending = false;
    showMessage("Mouse look could not lock. Click and drag to turn.");
  }
}

window.addEventListener("keydown", (event) => {
  const key = normalizeKey(event.key);
  if (key === "t" && !event.repeat && state === "playing" && !cinematic) {
    player.x = 27.5 * TILE;
    player.y = 27.5 * TILE;
    player.yaw = Math.atan2(exit.y - player.y, exit.x - player.x);
    player.pitch = 0;
    player.moving = false;
    player.frameDistance = 0;
    player.distanceSinceStep = 0;
    heldKeys.clear();
    showMessage("Developer teleport: elevator room.");
  }
  if (key === "q" && !event.repeat && state === "playing") {
    const now = performance.now();
    qPressCount = now - lastQPressTime <= 1500 ? qPressCount + 1 : 1;
    lastQPressTime = now;
    if (qPressCount === 3) {
      qPressCount = 0;
      lastQPressTime = 0;
      unlockElevator();
      showMessage("Developer shortcut: service lift unlocked.");
    }
  }
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
    heldKeys.add(key);
  }
  if ((key === "enter" || key === " ") && state !== "playing") beginGame();
});

window.addEventListener("keyup", (event) => {
  heldKeys.delete(normalizeKey(event.key));
});

window.addEventListener("blur", () => {
  heldKeys.clear();
  dragPointerId = null;
});
startButton.addEventListener("click", beginGame);

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas) turnCamera(event.movementX, event.movementY);
});
document.addEventListener("pointerlockchange", () => {
  pointerLockPending = false;
});
document.addEventListener("pointerlockerror", () => {
  pointerLockPending = false;
  showMessage("Mouse look could not lock. Click and drag to turn.");
});
canvas.addEventListener("pointerdown", (event) => {
  if (state !== "playing" || document.pointerLockElement === canvas) return;
  dragPointerId = event.pointerId;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
  requestLookLock();
});
canvas.addEventListener("pointermove", (event) => {
  if (document.pointerLockElement === canvas || dragPointerId !== event.pointerId) return;
  turnCamera(event.clientX - lastPointerX, event.clientY - lastPointerY);
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
});
canvas.addEventListener("pointerup", () => {
  dragPointerId = null;
});
canvas.addEventListener("pointercancel", () => {
  dragPointerId = null;
});
canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  showMessage("Graphics paused. The browser lost its WebGL context; try refreshing the page.");
});

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  const release = () => heldKeys.delete(control);
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    heldKeys.add(control);
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

function resizeRenderer() {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return;
  renderer.setSize(bounds.width, bounds.height, false);
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resizeRenderer);
resizeRenderer();
updateCamera();
requestAnimationFrame(frame);
