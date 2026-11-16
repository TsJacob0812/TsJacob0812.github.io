import * as THREE from "three";

const canvas = document.querySelector("#game");
const gameFrame = document.querySelector(".game-frame");
const fullscreenButton = document.querySelector("#fullscreen-button");
const overlay = document.querySelector("#game-overlay");
const startButton = document.querySelector("#start-button");
const overlayEyebrow = document.querySelector("#overlay-eyebrow");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const objectiveText = document.querySelector("#objective-text");
const presenceFill = document.querySelector("#presence-fill");
const gameMessage = document.querySelector("#game-message");

const TILE = 40;
const COLS = 102;
const ROWS = 78;
const MOUSE_SENSITIVITY = 0.0024;
const map = Array.from({ length: ROWS }, () => Array(COLS).fill("#"));
const roomColumns = [1, 12, 23, 34, 45, 56, 67, 78, 89];
const roomRows = [1, 11, 21, 31, 41, 51, 61, 71];
const rooms = roomRows.flatMap((y) => roomColumns.map((x) => [x, y, 7, 6]));

function carveRect(x, y, width, height) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) map[row][column] = ".";
  }
}

function carveHorizontal(startX, endX, y) {
  for (let x = startX; x <= endX; x += 1) map[y][x] = ".";
}

function carveVertical(x, startY, endY) {
  for (let y = startY; y <= endY; y += 1) map[y][x] = ".";
}

rooms.forEach(([x, y, width, height]) => carveRect(x, y, width, height));
rooms.forEach(([x, y], index) => {
  if (index % 3 === 0) return;
  if (Math.random() < 0.5) {
    const splitX = x + 3;
    const openingY = y + 1 + Math.floor(Math.random() * 4);
    for (let row = y + 1; row < y + 5; row += 1) {
      if (row !== openingY) map[row][splitX] = "#";
    }
    return;
  }
  const splitY = y + 2 + Math.floor(Math.random() * 2);
  const openingX = x + 1 + Math.floor(Math.random() * 5);
  for (let column = x + 1; column < x + 6; column += 1) {
    if (column !== openingX) map[splitY][column] = "#";
  }
});

const roomEdges = [];
for (let row = 0; row < roomRows.length; row += 1) {
  for (let column = 0; column < roomColumns.length; column += 1) {
    const index = row * roomColumns.length + column;
    if (column < roomColumns.length - 1) roomEdges.push({ a: index, b: index + 1, horizontal: true });
    if (row < roomRows.length - 1) roomEdges.push({ a: index, b: index + roomColumns.length, horizontal: false });
  }
}

function connectRooms(edge) {
  const [x, y] = rooms[edge.a];
  const [nextX, nextY] = rooms[edge.b];
  if (edge.horizontal) {
    const doorRow = y + 1 + Math.floor(Math.random() * 4);
    carveHorizontal(x + 6, nextX, doorRow);
  } else {
    const doorColumn = x + 1 + Math.floor(Math.random() * 5);
    carveVertical(doorColumn, y + 5, nextY);
  }
}

const connectedRooms = new Set([0]);
const connectedEdges = new Set();
while (connectedRooms.size < rooms.length) {
  const availableEdges = roomEdges.filter((edge) => connectedRooms.has(edge.a) !== connectedRooms.has(edge.b));
  const edge = availableEdges[Math.floor(Math.random() * availableEdges.length)];
  connectRooms(edge);
  connectedEdges.add(`${edge.a}:${edge.b}`);
  connectedRooms.add(edge.a);
  connectedRooms.add(edge.b);
}
const remainingEdges = roomEdges.filter((edge) => !connectedEdges.has(`${edge.a}:${edge.b}`));
for (let index = remainingEdges.length - 1; index > 0; index -= 1) {
  const swapIndex = Math.floor(Math.random() * (index + 1));
  [remainingEdges[index], remainingEdges[swapIndex]] = [remainingEdges[swapIndex], remainingEdges[index]];
}
remainingEdges.slice(0, Math.floor(remainingEdges.length * 0.35)).forEach(connectRooms);

function nearestFloorPosition(targetColumn, targetRow) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      if (map[row][column] !== ".") continue;
      const distance = (column - targetColumn) ** 2 + (row - targetRow) ** 2;
      if (distance < nearestDistance) {
        nearest = { column, row };
        nearestDistance = distance;
      }
    }
  }
  if (!nearest) throw new Error("The generated Backrooms map has no walkable floor.");
  return tileWorldPosition(nearest.column, nearest.row);
}

const exit = nearestFloorPosition(92, 74);
const playerStart = { x: 3.5 * TILE, y: 3.5 * TILE };
const entityStart = nearestFloorPosition(92, 4);
const ceilingLights = rooms.filter((_, index) => index % 2 === 0).map(([x, y]) => ({
  x: (x + 3.5) * TILE,
  y: (y + 2.5) * TILE,
}));

function findWallFurniturePlacement(roomX, roomY, index) {
  const column = roomX + (index % 2 === 0 ? 2 : 4);
  const row = roomY + (index % 2 === 0 ? 2 : 4);
  const candidates = [
    { column, row: roomY - 1, x: (column + 0.5) * TILE, y: roomY * TILE + 1.5, rotation: 0 },
    { column, row: roomY + 6, x: (column + 0.5) * TILE, y: (roomY + 6) * TILE - 1.5, rotation: Math.PI },
    { column: roomX - 1, row, x: roomX * TILE + 1.5, y: (row + 0.5) * TILE, rotation: Math.PI / 2 },
    { column: roomX + 7, row, x: (roomX + 7) * TILE - 1.5, y: (row + 0.5) * TILE, rotation: -Math.PI / 2 },
  ].filter((candidate) => isWall(candidate.column, candidate.row));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const wallFurniture = rooms.map(([x, y], index) => ({
  ...findWallFurniturePlacement(x, y, index),
  kind: ["frame", "shelf", "clock", "cabinet"][Math.floor(Math.random() * 4)],
}));
const heldKeys = new Set();
const player = { ...playerStart, yaw: 0, pitch: 0, radius: 9, stepDistance: 0 };
const entity = {
  ...entityStart,
  radius: 13,
  visible: true,
  speed: 73,
  pathTimer: 0,
  target: null,
  goal: null,
  mode: "idle",
  decisionTimer: 2,
  awarenessTimer: 0,
  lastKnownPlayer: null,
  stepDistance: 0,
  isMoving: false,
};
let state = "intro";
let messageTimer = 0;
let presence = 0;
let dragPointerId = null;
let pointerLockPending = false;
let lastPointerX = 0;
let lastPointerY = 0;

const ambientAudio = new Audio(new URL("../../audio/Handprint.mp3", import.meta.url));
ambientAudio.loop = true;
ambientAudio.volume = 0.42;
const monsterAudio = new Audio(new URL("../../audio/Do You Like Air Conditioning 4.mp3", import.meta.url));
monsterAudio.loop = true;
monsterAudio.volume = 0;
const elevatorAudio = new Audio(new URL("../../audio/Still Life.mp3", import.meta.url));
elevatorAudio.loop = true;
elevatorAudio.volume = 0;
let elevatorMusicStarted = false;
let audioContext = null;
let footstepNoiseBuffer = null;

ambientAudio.play().catch(() => {
  // Browsers that block autoplay will start the loop from the Start button.
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171306);
scene.fog = new THREE.Fog(0x171306, 220, 1500);

const camera = new THREE.PerspectiveCamera(76, 8 / 5, 0.1, 5200);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight(0xffe6a3, 0x171108, 0.52));
const moonlight = new THREE.DirectionalLight(0xffe2a0, 0.65);
moonlight.position.set(-180, 250, -90);
moonlight.castShadow = true;
moonlight.shadow.mapSize.set(1024, 1024);
moonlight.shadow.camera.left = -600;
moonlight.shadow.camera.right = 600;
moonlight.shadow.camera.top = 500;
moonlight.shadow.camera.bottom = -500;
scene.add(moonlight);

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 }),
  floor: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x322718, roughness: 0.88 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x70552b, roughness: 0.82 }),
  brass: new THREE.MeshStandardMaterial({ color: 0x98783a, metalness: 0.55, roughness: 0.38 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xc3a866, roughness: 0.9 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x3c321f, roughness: 0.84 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x080a0b, roughness: 0.92 }),
  creature: new THREE.MeshStandardMaterial({ color: 0x171817, roughness: 0.78, metalness: 0.08 }),
  creatureRidge: new THREE.MeshStandardMaterial({ color: 0x3c392d, roughness: 0.76 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xc5b78f, roughness: 0.52 }),
  eye: new THREE.MeshStandardMaterial({
    color: 0xffd66a,
    emissive: 0xe9a51f,
    emissiveIntensity: 3.5,
    roughness: 0.2,
  }),
  light: new THREE.MeshStandardMaterial({
    color: 0xffedb5,
    emissive: 0xffc64a,
    emissiveIntensity: 2.6,
    roughness: 0.28,
  }),
  rug: new THREE.MeshStandardMaterial({ color: 0x514020, roughness: 1 }),
};

function tileWorldPosition(column, row) {
  return { x: column * TILE + TILE / 2, z: row * TILE + TILE / 2 };
}

function createInstancedTiles(cells, geometry, material, colorForCell, yPosition) {
  if (cells.length === 0) return;
  const instances = new THREE.InstancedMesh(geometry, material, cells.length);
  const transform = new THREE.Object3D();
  cells.forEach((cell, index) => {
    const position = tileWorldPosition(cell.x, cell.y);
    transform.position.set(position.x, yPosition, position.z);
    transform.updateMatrix();
    instances.setMatrixAt(index, transform.matrix);
    instances.setColorAt(index, colorForCell(cell));
  });
  instances.instanceMatrix.needsUpdate = true;
  if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
  instances.receiveShadow = true;
  instances.castShadow = true;
  scene.add(instances);
}

function buildStaticWorld() {
  const floorCells = [];
  const wallCells = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      const cell = { x: column, y: row };
      if (map[row][column] === ".") floorCells.push(cell);
      else wallCells.push(cell);
    }
  }

  createInstancedTiles(
    floorCells,
    new THREE.BoxGeometry(TILE + 0.5, 2, TILE + 0.5),
    materials.floor,
    () => new THREE.Color().setHSL(0.115 + Math.random() * 0.025, 0.18, 0.19 + Math.random() * 0.1),
    -1,
  );
  createInstancedTiles(
    wallCells,
    new THREE.BoxGeometry(TILE, TILE, TILE),
    materials.wall,
    () => new THREE.Color().setHSL(0.115 + Math.random() * 0.025, 0.2, 0.17 + Math.random() * 0.12),
    TILE / 2,
  );
  createInstancedTiles(
    floorCells,
    new THREE.BoxGeometry(TILE + 0.2, 2, TILE + 0.2),
    materials.ceiling,
    () => new THREE.Color().setHSL(0.12 + Math.random() * 0.02, 0.13, 0.14 + Math.random() * 0.08),
    TILE + 1,
  );

  rooms.forEach(([x, y]) => {
    const rugPosition = tileWorldPosition(x + 3, y + 3);
    const rug = new THREE.Mesh(new THREE.BoxGeometry(28, 0.45, 19), materials.rug);
    rug.position.set(rugPosition.x, 0.15, rugPosition.z);
    rug.rotation.y = (Math.random() - 0.5) * 0.3;
    rug.receiveShadow = true;
    scene.add(rug);
  });
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

function buildCeilingLights() {
  ceilingLights.forEach(({ x, y }, index) => {
    const fixture = new THREE.Group();
    fixture.position.set(x, 0, y);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(24, 2.2, 8), materials.darkWood);
    housing.position.y = TILE - 2.5;
    housing.castShadow = true;
    fixture.add(housing);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 5), materials.light);
    panel.position.y = TILE - 3.7;
    fixture.add(panel);
    const pointLight = new THREE.PointLight(0xffd169, 2600, 230, 1.65);
    pointLight.position.set(0, TILE - 7, 0);
    fixture.add(pointLight);
    const secondary = new THREE.PointLight(0xffbd4b, 520, 105, 2);
    secondary.position.set(0, TILE - 11, 0);
    fixture.add(secondary);
    fixture.userData.baseIntensity = pointLight.intensity;
    fixture.userData.phase = index * 1.73;
    fixture.userData.light = pointLight;
    fixture.userData.secondary = secondary;
    scene.add(fixture);
  });
}

function buildWallFurniture() {
  wallFurniture.forEach((item, index) => {
    if (!item.x) return;
    const group = new THREE.Group();
    group.position.set(item.x, 22, item.y);
    group.rotation.y = item.rotation;

    if (item.kind === "clock") {
      addBox(group, [14, 14, 1.4], [0, 0, 0], materials.darkWood);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 1, 28), materials.paper);
      face.rotation.x = Math.PI / 2;
      face.position.z = 1.2;
      face.castShadow = true;
      group.add(face);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.7, 0.55, 6, 28), materials.brass);
      ring.position.z = 1.8;
      group.add(ring);
      const minuteHand = addBox(group, [0.7, 4.5, 0.45], [0, 0.4, 2], materials.ink);
      minuteHand.rotation.z = 0.12;
      const hourHand = addBox(group, [3, 0.65, 0.5], [0.8, 0, 2.1], materials.ink);
      hourHand.rotation.z = -0.28;
      for (let mark = 0; mark < 12; mark += 1) {
        const angle = (mark / 12) * Math.PI * 2;
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.35), materials.brass);
        tick.position.set(Math.sin(angle) * 4.35, Math.cos(angle) * 4.35, 2);
        tick.rotation.z = -angle;
        group.add(tick);
      }
    } else if (item.kind === "shelf") {
      addBox(group, [25, 30, 2], [0, 0, 0], materials.darkWood);
      for (let shelf = 0; shelf < 4; shelf += 1) {
        const shelfY = -12 + shelf * 8;
        addBox(group, [27, 1.3, 7], [0, shelfY, 2.5], materials.wood);
        for (let book = 0; book < 4; book += 1) {
          const bookMesh = addBox(
            group,
            [3.3, 5 + ((book + shelf) % 2) * 1.4, 2.1],
            [-8 + book * 5.2, shelfY + 3.4, 4],
            book % 2 ? materials.brass : materials.paper,
            (Math.random() - 0.5) * 0.16,
          );
          bookMesh.rotation.z = (Math.random() - 0.5) * 0.08;
        }
      }
    } else if (item.kind === "cabinet") {
      addBox(group, [21, 28, 9], [0, -1, 3], materials.wood);
      for (let drawer = 0; drawer < 3; drawer += 1) {
        const y = 8 - drawer * 8;
        addBox(group, [17, 6.5, 1], [0, y, 8], materials.brass);
        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 6), materials.darkWood);
        handle.position.set(0, y, 9);
        group.add(handle);
      }
      addBox(group, [23, 2, 11], [0, 14, 3], materials.darkWood);
    } else {
      addBox(group, [23, 24, 1.6], [0, 0, 0], materials.darkWood);
      addBox(group, [18.5, 19, 0.8], [0, 0, 1.3], materials.paper);
      const art = new THREE.Group();
      art.position.z = 1.8;
      addBox(art, [2.4, 12, 0.5], [-4.5, -2, 0], materials.ink, -0.25);
      addBox(art, [3.4, 9, 0.6], [2, -3, 0.3], materials.brass, 0.34);
      addBox(art, [10, 1.1, 0.7], [0, -7, 0.5], materials.darkWood);
      group.add(art);
    }
    scene.add(group);
  });

  rooms.forEach(([roomX, roomY], index) => {
    if (index % 3 !== 1) return;
    const clutter = new THREE.Group();
    const position = tileWorldPosition(roomX + 2 + Math.floor(Math.random() * 3), roomY + 2 + Math.floor(Math.random() * 3));
    clutter.position.set(position.x, 0, position.z);
    clutter.rotation.y = Math.random() * Math.PI;
    addBox(clutter, [9, 11, 8], [0, 5.5, 0], materials.wood);
    addBox(clutter, [10.5, 1.2, 9.5], [0, 11.5, 0], materials.darkWood);
    scene.add(clutter);
  });
}

function buildExit() {
  const group = new THREE.Group();
  group.position.set(exit.x, 0, exit.y + 17);
  addBox(group, [29, 39, 3], [0, 19.5, 0], materials.brass);
  const leftDoor = addBox(group, [12, 35, 1.8], [-6.2, 18, 2.1], materials.darkWood);
  const rightDoor = addBox(group, [12, 35, 1.8], [6.2, 18, 2.1], materials.wood);
  addBox(group, [1.2, 34, 0.8], [0, 18, 3.2], materials.brass);
  addBox(group, [7, 2, 0.7], [0, 31, 3.3], materials.light);
  const indicator = new THREE.PointLight(0xffd169, 180, 30, 2);
  indicator.position.set(0, 34, 5);
  group.add(indicator);
  group.userData.doors = [leftDoor, rightDoor];
  group.userData.indicator = indicator;
  group.userData.doorProgress = 0;
  scene.add(group);
  return group;
}

function buildMonster() {
  const root = new THREE.Group();
  root.position.set(entity.x, 0, entity.y);
  root.visible = true;
  root.scale.setScalar(0.98);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(5.2, 14, 5, 9), materials.creature);
  body.position.y = 17;
  body.scale.set(0.8, 1, 0.7);
  body.castShadow = true;
  root.add(body);

  const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(6.2, 1), materials.creatureRidge);
  chest.position.set(0, 19, 2);
  chest.scale.set(0.88, 1.22, 0.64);
  chest.castShadow = true;
  root.add(chest);

  const head = new THREE.Group();
  head.position.set(0, 29, 1.5);
  const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(5.6, 1), materials.bone);
  skull.scale.set(0.78, 1.1, 0.7);
  skull.castShadow = true;
  head.add(skull);
  const face = new THREE.Mesh(new THREE.BoxGeometry(6.1, 4.5, 1.2), materials.dark);
  face.position.set(0, -1, 4.1);
  head.add(face);
  for (const eyeX of [-1.65, 1.65]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(1.45, 10, 8), materials.dark);
    socket.position.set(eyeX, 0.8, 4.65);
    head.add(socket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.66, 12, 10), materials.eye);
    eye.position.set(eyeX, 0.8, 5.45);
    head.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.2, 0.8), materials.dark);
  mouth.position.set(0, -3.2, 4.9);
  head.add(mouth);
  for (let tooth = 0; tooth < 8; tooth += 1) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.8, 4), materials.bone);
    fang.position.set(-1.8 + tooth * 0.52, -3.7, 5.2);
    fang.rotation.x = Math.PI;
    head.add(fang);
  }
  const tornFlesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.2, 1),
    new THREE.MeshStandardMaterial({ color: 0x542019, roughness: 0.95 }),
  );
  tornFlesh.position.set(-3.2, -1.8, 3.2);
  tornFlesh.scale.set(0.7, 1.4, 0.45);
  head.add(tornFlesh);
  for (const hornSide of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(1.7, 9, 5), materials.creature);
    horn.position.set(hornSide * 4, 5.5, -0.6);
    horn.rotation.z = hornSide * 0.48;
    horn.rotation.x = -0.22;
    horn.castShadow = true;
    head.add(horn);
  }
  root.add(head);

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 5.4, 23, 0);
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(1.7, 9.5, 4, 7), materials.creature);
    upperArm.position.y = -6;
    upperArm.rotation.z = side * -0.16;
    upperArm.castShadow = true;
    arm.add(upperArm);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(1.9, 8, 7), materials.creatureRidge);
    elbow.position.set(side * 0.5, -11.2, 0.2);
    arm.add(elbow);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(1.25, 9.5, 4, 7), materials.creature);
    forearm.position.set(side * 1.1, -16.3, 0.5);
    forearm.rotation.z = side * -0.14;
    forearm.castShadow = true;
    arm.add(forearm);
    const palm = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 1), materials.creatureRidge);
    palm.position.set(side * 1.5, -21.2, 1);
    arm.add(palm);
    for (let claw = 0; claw < 3; claw += 1) {
      const finger = new THREE.Mesh(new THREE.ConeGeometry(0.48, 4.4, 5), materials.bone);
      finger.position.set(side * (0.25 + claw * 1.25), -24.2, 2.3);
      finger.rotation.z = side * 0.25;
      finger.rotation.x = -0.24;
      arm.add(finger);
    }
    arms.push(arm);
    root.add(arm);
  }

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 2.3, 10, 0);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(2, 7, 4, 7), materials.creature);
    shin.position.y = -4.7;
    shin.castShadow = true;
    leg.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2, 5), materials.dark);
    foot.position.set(side * 0.3, -9.4, 1.1);
    leg.add(foot);
    legs.push(leg);
    root.add(leg);
  }

  const backSpines = new THREE.Group();
  for (let spine = 0; spine < 5; spine += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(1.2, 5.3, 5), materials.creatureRidge);
    spike.position.set((spine - 2) * 1.9, 24 - spine * 2.4, -4.1);
    spike.rotation.x = Math.PI / 2;
    backSpines.add(spike);
  }
  root.add(backSpines);
  scene.add(root);
  return { root, head, arms, legs };
}

buildStaticWorld();
buildCeilingLights();
buildWallFurniture();
const exitModel = buildExit();
const monster = buildMonster();

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
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
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
  messageTimer = 2.5;
}

function resetGame() {
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.yaw = 0;
  player.pitch = 0;
  entity.x = entityStart.x;
  entity.y = entityStart.y;
  entity.visible = true;
  entity.speed = 73;
  entity.pathTimer = 0;
  entity.target = null;
  entity.goal = null;
  entity.mode = "idle";
  entity.decisionTimer = 1.5;
  entity.awarenessTimer = 0;
  entity.lastKnownPlayer = null;
  entity.stepDistance = 0;
  entity.isMoving = false;
  player.stepDistance = 0;
  monster.root.visible = true;
  monster.root.position.set(entity.x, 0, entity.y);
  monster.root.rotation.set(0, 0, 0);
  presence = 0;
  objectiveText.textContent = "Find the elevator and escape";
  presenceFill.style.width = "0%";
  gameMessage.classList.remove("visible");
  heldKeys.clear();
  exitModel.userData.doorProgress = 0;
  exitModel.userData.doors[0].position.x = -6.2;
  exitModel.userData.doors[1].position.x = 6.2;
  exitModel.userData.indicator.intensity = 180;
  elevatorMusicStarted = false;
  elevatorAudio.pause();
  elevatorAudio.currentTime = 0;
}

function requestLookLock() {
  if (typeof canvas.requestPointerLock !== "function") return false;
  if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) return false;
  if (pointerLockPending) return true;
  try {
    pointerLockPending = true;
    const request = canvas.requestPointerLock();
    if (request && typeof request.catch === "function") {
      request.catch(() => {
        pointerLockPending = false;
        showMessage("Mouse look could not lock. Click and drag to turn.");
      });
    }
    return true;
  } catch {
    pointerLockPending = false;
    showMessage("Mouse look could not lock. Click and drag to turn.");
    return false;
  }
}

function beginGame() {
  resetGame();
  ambientAudio.play().catch((error) => {
    console.error("Could not start the Backrooms ambient track.", error);
    showMessage("Ambient audio could not start. Check your browser's sound settings.");
  });
  monsterAudio.currentTime = 0;
  monsterAudio.play().catch((error) => {
    console.error("Could not start the monster's audio.", error);
    showMessage("Monster audio could not start. Check your browser's sound settings.");
  });
  initializeFootstepAudio();
  state = "playing";
  overlay.hidden = true;
  canvas.focus();
  requestLookLock();
}

function endGame(won) {
  state = won ? "won" : "lost";
  heldKeys.clear();
  elevatorAudio.pause();
  elevatorAudio.volume = 0;
  monsterAudio.volume = 0;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  overlay.hidden = false;
  overlayEyebrow.textContent = won ? "SHIFT COMPLETE" : "SIGNAL LOST";
  overlayTitle.textContent = won ? "You made it outside." : "The halls went quiet.";
  overlayCopy.textContent = won
    ? "The elevator doors shut. The distant song fades as the maze disappears above you."
    : "The halls swallowed the last of your light. You can try the route again.";
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
  if (length === 0) return false;
  moveX /= length;
  moveY /= length;
  const sprinting = heldKeys.has("shift");
  const speed = sprinting ? 222 : 148;
  const nextX = player.x + moveX * speed * deltaTime;
  const nextY = player.y + moveY * speed * deltaTime;
  const previousX = player.x;
  const previousY = player.y;
  if (!collidesWithWall(nextX, player.y, player.radius)) player.x = nextX;
  if (!collidesWithWall(player.x, nextY, player.radius)) player.y = nextY;
  const distanceMoved = Math.hypot(player.x - previousX, player.y - previousY);
  player.stepDistance += distanceMoved;
  const stepLength = sprinting ? 48 : 64;
  if (player.stepDistance >= stepLength) {
    player.stepDistance %= stepLength;
    playFootstep(sprinting ? 0.95 : 0.75, 0, false);
  }
  return sprinting;
}

function hasLineOfSight(fromX, fromY, toX, toY) {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const samples = Math.ceil(distance / 8);
  for (let index = 1; index < samples; index += 1) {
    const fraction = index / samples;
    if (isWall(
      Math.floor((fromX + (toX - fromX) * fraction) / TILE),
      Math.floor((fromY + (toY - fromY) * fraction) / TILE),
    )) return false;
  }
  return true;
}

function randomFloorTarget() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const column = Math.floor(Math.random() * COLS);
    const row = Math.floor(Math.random() * ROWS);
    if (!isWall(column, row)) return tileWorldPosition(column, row);
  }
  return null;
}

function updateEntity(deltaTime, sprinting) {
  if (!entity.visible) return;
  const distanceToPlayer = Math.hypot(player.x - entity.x, player.y - entity.y);
  const canSeePlayer = distanceToPlayer < 360 &&
    hasLineOfSight(entity.x, entity.y, player.x, player.y);
  const canHearPlayer = distanceToPlayer < (sprinting ? 500 : 185) &&
    (sprinting || heldKeys.has("w") || heldKeys.has("a") || heldKeys.has("s") || heldKeys.has("d"));

  if (canSeePlayer || canHearPlayer) {
    entity.mode = "hunt";
    entity.awarenessTimer = 4;
    entity.lastKnownPlayer = { x: player.x, y: player.y };
    entity.goal = entity.lastKnownPlayer;
  } else if (entity.awarenessTimer > 0) {
    entity.awarenessTimer -= deltaTime;
    entity.mode = "search";
    entity.goal = entity.lastKnownPlayer;
  } else {
    if (entity.mode === "search") {
      entity.mode = "idle";
      entity.goal = null;
      entity.decisionTimer = 1 + Math.random() * 2;
    }
    entity.decisionTimer -= deltaTime;
    if (entity.mode === "wander" &&
        (entity.decisionTimer <= 0 || !entity.goal ||
          Math.hypot(entity.goal.x - entity.x, entity.goal.y - entity.y) < 14)) {
      entity.mode = "idle";
      entity.goal = null;
      entity.decisionTimer = 1.5 + Math.random() * 3;
    } else if (entity.mode === "idle" && entity.decisionTimer <= 0) {
      if (Math.random() < 0.65) {
        entity.goal = randomFloorTarget();
        entity.mode = entity.goal ? "wander" : "idle";
        entity.decisionTimer = 3 + Math.random() * 5;
      } else {
        entity.decisionTimer = 2 + Math.random() * 4;
      }
    }
  }

  entity.isMoving = false;
  entity.speed = entity.mode === "hunt"
    ? 83 + (sprinting ? 20 : 0)
    : entity.mode === "search" ? 61 : 34;
  if (entity.mode === "idle" || !entity.goal) return;

  entity.pathTimer -= deltaTime;
  if (entity.pathTimer <= 0) {
    const goal = entity.mode === "hunt"
      ? { x: player.x, y: player.y }
      : entity.goal;
    entity.target = findNextStep(entity.x, entity.y, goal.x, goal.y);
    entity.pathTimer = entity.mode === "hunt" ? 0.24 : 0.65;
  }
  if (!entity.target) return;
  const target = entity.mode === "hunt" && entity.target.sameTile
    ? { x: player.x, y: player.y }
    : entity.target;
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1) return;
  const step = Math.min(distance, entity.speed * deltaTime);
  const nextX = entity.x + (dx / distance) * step;
  const nextY = entity.y + (dy / distance) * step;
  const previousX = entity.x;
  const previousY = entity.y;
  if (!collidesWithWall(nextX, entity.y, entity.radius)) entity.x = nextX;
  if (!collidesWithWall(entity.x, nextY, entity.radius)) entity.y = nextY;
  const distanceMoved = Math.hypot(entity.x - previousX, entity.y - previousY);
  entity.isMoving = distanceMoved > 0.1;
  if (entity.isMoving) {
    entity.stepDistance += distanceMoved;
    if (entity.stepDistance >= 38) {
      entity.stepDistance %= 38;
      const relativeAngle = Math.atan2(entity.y - player.y, entity.x - player.x) - player.yaw;
      const attenuation = Math.max(0, 1 - distanceToPlayer / 420);
      playFootstep(0.55 * attenuation, Math.sin(relativeAngle), true);
    }
  }
}

function updateEntityModel(time) {
  if (!entity.visible) return;
  const gait = entity.isMoving ? 1 : 0.12;
  monster.root.position.set(entity.x, Math.sin(time * 3.2) * 0.32, entity.y);
  if (entity.isMoving && entity.target) {
    monster.root.rotation.y = Math.atan2(entity.target.x - entity.x, entity.target.y - entity.y);
  } else if (entity.mode === "hunt") {
    monster.root.rotation.y = Math.atan2(player.x - entity.x, player.y - entity.y);
  }
  monster.head.rotation.z = Math.sin(time * 1.5) * (entity.mode === "idle" ? 0.22 : 0.08);
  monster.head.rotation.x = Math.sin(time * 1.9) * (entity.mode === "idle" ? 0.14 : 0.06);
  monster.arms[0].rotation.x = Math.sin(time * 5.1) * 0.65 * gait;
  monster.arms[1].rotation.x = Math.sin(time * 5.1 + Math.PI) * 0.65 * gait;
  monster.legs[0].rotation.x = Math.sin(time * 4.8 + Math.PI) * 0.42 * gait;
  monster.legs[1].rotation.x = Math.sin(time * 4.8) * 0.42 * gait;
}

function initializeFootstepAudio() {
  if (audioContext) {
    audioContext.resume().catch((error) => {
      console.error("Could not resume footstep audio.", error);
      showMessage("Footstep audio could not resume.");
    });
    return;
  }
  if (!window.AudioContext) return;
  try {
    audioContext = new window.AudioContext();
    footstepNoiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.12, audioContext.sampleRate);
    const samples = footstepNoiseBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
  } catch (error) {
    console.error("Could not initialize footstep audio.", error);
    showMessage("Footstep audio is unavailable in this browser.");
  }
}

function playFootstep(volume, pan, monsterStep) {
  if (!audioContext || !footstepNoiseBuffer || volume <= 0.01) return;
  const now = audioContext.currentTime;
  const noise = audioContext.createBufferSource();
  noise.buffer = footstepNoiseBuffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = monsterStep ? 420 : 850;
  const panner = audioContext.createStereoPanner();
  panner.pan.value = THREE.MathUtils.clamp(pan, -1, 1);
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(volume * (monsterStep ? 0.22 : 0.24), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(filter).connect(gain).connect(panner).connect(audioContext.destination);
  noise.start(now);
  noise.stop(now + 0.12);

  const thump = audioContext.createOscillator();
  const thumpGain = audioContext.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(monsterStep ? 62 : 105, now);
  thump.frequency.exponentialRampToValueAtTime(monsterStep ? 38 : 65, now + 0.1);
  thumpGain.gain.setValueAtTime(volume * (monsterStep ? 0.48 : 0.32), now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
  thump.connect(thumpGain).connect(panner);
  thump.start(now);
  thump.stop(now + 0.11);
}

function updateGame(deltaTime, time) {
  if (state !== "playing") return;
  const sprinting = updatePlayer(deltaTime);
  updateEntity(deltaTime, sprinting);
  updateEntityModel(time);

  const distanceToEntity = entity.visible
    ? Math.hypot(player.x - entity.x, player.y - entity.y)
    : 260;
  const distanceToExit = Math.hypot(player.x - exit.x, player.y - exit.y);
  const targetPresence = entity.visible ? Math.max(0, Math.min(100, 100 - distanceToEntity / 2.7)) : 0;
  presence += (targetPresence - presence) * Math.min(1, deltaTime * 2.8);
  presenceFill.style.width = `${presence}%`;
  presenceFill.style.backgroundColor = presence > 70 ? "#e17b43" : presence > 38 ? "#d6b33f" : "#dfc35e";

  const elevatorApproach = Math.max(0, Math.min(1, (1600 - distanceToExit) / 1500));
  elevatorAudio.volume = 0.48 * elevatorApproach * elevatorApproach;
  if (distanceToExit < 1600 && !elevatorMusicStarted) {
    elevatorMusicStarted = true;
    elevatorAudio.play().catch((error) => {
      console.error("Could not start the elevator music.", error);
      showMessage("The elevator music could not play. Check your browser's sound settings.");
    });
    showMessage("A distant song drifts through the halls.");
  }
  const doorTarget = distanceToExit < 180 ? 1 : 0;
  exitModel.userData.doorProgress +=
    (doorTarget - exitModel.userData.doorProgress) * Math.min(1, deltaTime * 2.5);
  const doorOpening = exitModel.userData.doorProgress * 9;
  exitModel.userData.doors[0].position.x = -6.2 - doorOpening;
  exitModel.userData.doors[1].position.x = 6.2 + doorOpening;
  exitModel.userData.indicator.intensity = 180 + exitModel.userData.doorProgress * 700;
  if (objectiveText.textContent !== (distanceToExit < 180 ? "Enter the elevator" : "Find the elevator and escape")) {
    objectiveText.textContent = distanceToExit < 180 ? "Enter the elevator" : "Find the elevator and escape";
  }

  if (entity.visible && distanceToEntity < player.radius + entity.radius - 1) {
    endGame(false);
    return;
  }
  if (distanceToExit < 32) {
    endGame(true);
    return;
  }
  if (messageTimer > 0) {
    messageTimer -= deltaTime;
    if (messageTimer <= 0) gameMessage.classList.remove("visible");
  }
}

function updateCamera() {
  const pitchCos = Math.cos(player.pitch);
  const lookDistance = 100;
  camera.position.set(player.x, 22, player.y);
  camera.lookAt(
    player.x + Math.cos(player.yaw) * pitchCos * lookDistance,
    22 + Math.sin(player.pitch) * lookDistance,
    player.y + Math.sin(player.yaw) * pitchCos * lookDistance,
  );
}

function resizeRenderer() {
  const bounds = canvas.getBoundingClientRect();
  if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) ||
      bounds.width <= 0 || bounds.height <= 0) return;
  renderer.setSize(bounds.width, bounds.height, false);
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
}

const canvasResizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver(resizeRenderer)
  : null;
canvasResizeObserver?.observe(canvas);

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement === gameFrame) {
      await document.exitFullscreen();
      return;
    }
    if (typeof gameFrame.requestFullscreen !== "function") {
      showMessage("Fullscreen is unavailable in this browser.");
      return;
    }
    const fullscreenRequest = gameFrame.requestFullscreen();
    if (state === "playing" && document.pointerLockElement !== canvas) requestLookLock();
    await fullscreenRequest;
  } catch (error) {
    console.error("Could not change fullscreen mode.", error);
    showMessage("Fullscreen could not be changed.");
  }
}

function animateLights(time) {
  scene.children.forEach((child) => {
    if (!child.userData.light) return;
    const flicker = 0.91 + Math.sin(time * 8 + child.userData.phase) * 0.025;
    child.userData.light.intensity = child.userData.baseIntensity * flicker;
    child.userData.secondary.intensity = 520 * flicker;
  });
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  updateGame(deltaTime, time);
  const monsterDistance = Math.hypot(player.x - entity.x, player.y - entity.y);
  const proximity = Math.max(0, 1 - monsterDistance / 420);
  monsterAudio.volume = state === "playing" ? 0.28 * proximity * proximity : 0;
  updateCamera();
  animateLights(time);
  renderer.render(scene, camera);
}

const clock = new THREE.Clock();

function normalizeKey(key) {
  return key.toLowerCase();
}

function turnCamera(deltaX, deltaY) {
  player.yaw += deltaX * MOUSE_SENSITIVITY;
  player.pitch = THREE.MathUtils.clamp(player.pitch - deltaY * MOUSE_SENSITIVITY, -1.42, 1.42);
}

window.addEventListener("keydown", (event) => {
  const key = normalizeKey(event.key);
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  if (key === "f") {
    event.preventDefault();
    toggleFullscreen();
    return;
  }
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
    heldKeys.add(key);
  }
  if ((key === "enter" || key === " ") && state !== "playing") beginGame();
});

fullscreenButton.addEventListener("click", toggleFullscreen);
document.addEventListener("pointerlockchange", () => {
  pointerLockPending = false;
});
document.addEventListener("fullscreenchange", () => {
  const isFullscreen = document.fullscreenElement === gameFrame;
  fullscreenButton.textContent = isFullscreen ? "Exit fullscreen" : "Fullscreen";
  fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
  fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
  if (state === "playing" && document.pointerLockElement !== canvas) requestLookLock();
  window.requestAnimationFrame(() => {
    resizeRenderer();
    window.requestAnimationFrame(resizeRenderer);
  });
});

window.addEventListener("keyup", (event) => heldKeys.delete(normalizeKey(event.key)));
window.addEventListener("blur", () => {
  heldKeys.clear();
  dragPointerId = null;
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas) turnCamera(event.movementX, event.movementY);
});
document.addEventListener("pointerlockerror", () => {
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
startButton.addEventListener("click", beginGame);
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

window.addEventListener("resize", resizeRenderer);
resizeRenderer();
updateCamera();
animate();
