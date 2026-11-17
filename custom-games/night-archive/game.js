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
const interactionPrompt = document.querySelector("#interaction-prompt");
const gameMessage = document.querySelector("#game-message");
const endingBlackout = document.querySelector("#ending-blackout");
const endingThankYou = document.querySelector("#ending-thank-you");

const TILE = 40;
const WALL_HEIGHT = 69;
const ELEVATOR_MUSIC_RADIUS = 220;
const HANDPRINT_FADE_DISTANCE = 40;
const ROOM_COUNT = 28;
const GAP_ROOM_INDEX = 5;
const TALL_CEILING_ROOM_INDEX = 15;
const TALL_CEILING_HEIGHT = 154;
const MAP_SIZE = 108;
const COLS = MAP_SIZE;
const ROWS = MAP_SIZE;
const map = Array.from({ length: ROWS }, () => Array(COLS).fill("#"));
const rooms = [];
const pillarCells = new Set();
const obstacleCells = new Set();

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

function addRoom(x, y, width, height, margin = 4) {
  const overlaps = rooms.some(([otherX, otherY, otherWidth, otherHeight]) =>
    x < otherX + otherWidth + margin &&
    x + width + margin > otherX &&
    y < otherY + otherHeight + margin &&
    y + height + margin > otherY
  );
  if (overlaps) return false;
  rooms.push([x, y, width, height]);
  return true;
}

function carveWindingConnection(start, end) {
  const distanceX = end.x - start.x;
  const distanceY = end.y - start.y;
  const distance = Math.abs(distanceX) + Math.abs(distanceY);
  const waypointCount = Math.max(2, Math.floor(distance / 7));
  const waypoints = [start];

  for (let index = 1; index < waypointCount; index += 1) {
    const progress = index / waypointCount;
    const offset = (mazeRandom() - 0.5) * 12;
    waypoints.push({
      x: Math.max(2, Math.min(COLS - 3, Math.round(start.x + distanceX * progress - Math.sign(distanceY) * offset))),
      y: Math.max(2, Math.min(ROWS - 3, Math.round(start.y + distanceY * progress + Math.sign(distanceX) * offset))),
    });
  }
  waypoints.push(end);

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const from = waypoints[index];
    const to = waypoints[index + 1];
    if (mazeRandom() < 0.5) {
      carveHorizontal(Math.min(from.x, to.x), Math.max(from.x, to.x), from.y);
      carveVertical(to.x, Math.min(from.y, to.y), Math.max(from.y, to.y));
    } else {
      carveVertical(from.x, Math.min(from.y, to.y), Math.max(from.y, to.y));
      carveHorizontal(Math.min(from.x, to.x), Math.max(from.x, to.x), to.y);
    }
  }
}

addRoom(4, 4, 10, 10);
addRoom(88, 88, 12, 12);
for (let index = 2; index < ROOM_COUNT; index += 1) {
  let placed = false;
  for (let attempt = 0; attempt < 2000 && !placed; attempt += 1) {
    const largeRoom = index % 5 === 0;
    const specialRoom = [GAP_ROOM_INDEX, TALL_CEILING_ROOM_INDEX, 20, 25].includes(index);
    const width = specialRoom ? 14 + Math.floor(mazeRandom() * 2)
      : largeRoom ? 12 + Math.floor(mazeRandom() * 3)
        : 6 + Math.floor(mazeRandom() * 3);
    const height = specialRoom ? 14 + Math.floor(mazeRandom() * 2)
      : largeRoom ? 12 + Math.floor(mazeRandom() * 3)
        : 6 + Math.floor(mazeRandom() * 3);
    const x = 3 + Math.floor(mazeRandom() * (MAP_SIZE - width - 6));
    const y = 3 + Math.floor(mazeRandom() * (MAP_SIZE - height - 6));
    placed = addRoom(x, y, width, height);
  }
  if (!placed) throw new Error(`Could not place maze room ${index + 1}.`);
}

function buildMaze() {
  rooms.forEach(([x, y, width, height]) => carveRect(x, y, width, height));

  const connections = [];
  const roomCenters = rooms.map(([x, y, width, height]) => ({
    x: x + Math.floor(width / 2),
    y: y + Math.floor(height / 2),
  }));
  const connected = new Set([0]);
  while (connected.size < rooms.length) {
    let best = null;
    let bestDistance = Infinity;
    for (const from of connected) {
      for (let to = 0; to < rooms.length; to += 1) {
        if (connected.has(to)) continue;
        const distance = Math.hypot(
          roomCenters[from].x - roomCenters[to].x,
          roomCenters[from].y - roomCenters[to].y,
        );
        if (distance < bestDistance) {
          best = [from, to];
          bestDistance = distance;
        }
      }
    }
    if (!best) throw new Error("Could not connect all maze rooms.");
    connections.push(best);
    connected.add(best[1]);
  }

  const connectedPairs = new Set(connections.map(([from, to]) => [from, to].sort((a, b) => a - b).join("|")));
  const loopCandidates = [];
  for (let from = 0; from < rooms.length; from += 1) {
    for (let to = from + 1; to < rooms.length; to += 1) {
      if (connectedPairs.has(`${from}|${to}`)) continue;
      const distance = Math.hypot(
        roomCenters[from].x - roomCenters[to].x,
        roomCenters[from].y - roomCenters[to].y,
      );
      loopCandidates.push({ from, to, score: distance + mazeRandom() * 18 });
    }
  }
  loopCandidates.sort((a, b) => a.score - b.score);
  for (const { from, to } of loopCandidates.slice(0, 12)) connections.push([from, to]);

  const gapCenter = roomCenters[GAP_ROOM_INDEX];
  for (const side of [-1, 1]) {
    const neighbor = roomCenters
      .map((position, index) => ({ index, position }))
      .filter(({ index, position }) =>
        index !== GAP_ROOM_INDEX && Math.sign(position.x - gapCenter.x) === side
      )
      .sort((a, b) =>
        Math.hypot(a.position.x - gapCenter.x, a.position.y - gapCenter.y) -
        Math.hypot(b.position.x - gapCenter.x, b.position.y - gapCenter.y)
      )[0];
    if (neighbor) connections.push([GAP_ROOM_INDEX, neighbor.index]);
  }

  for (const [from, to] of connections) {
    carveWindingConnection(roomCenters[from], roomCenters[to]);
  }

  rooms.forEach(([x, y, width, height], index) => {
    if (width < 12 || height < 12 || (index !== 0 && index !== 1 && index % 5 !== 0)) return;
    const corners = [
      [x + 2, y + 2],
      [x + width - 3, y + 2],
      [x + 2, y + height - 3],
      [x + width - 3, y + height - 3],
    ];
    for (const [column, row] of corners) {
      const key = `${column},${row}`;
      pillarCells.add(key);
      map[row][column] = "#";
    }
  });

  rooms.forEach(([x, y, width, height], index) => {
    if ([0, 1, 10, 4, 13, 22].includes(index)) return;
    const candidates = [
      [x + 2, y + 2],
      [x + width - 3, y + 2],
      [x + 2, y + height - 3],
      [x + width - 3, y + height - 3],
    ];
    for (const [column, row] of candidates) {
      const key = `${column},${row}`;
      if (map[row][column] !== "." || pillarCells.has(key)) continue;
      obstacleCells.add(key);
      map[row][column] = "#";
    }
  });
}

buildMaze();

const pitRoomIndex = 10;
const [pitRoomX, pitRoomY, pitRoomWidth, pitRoomHeight] = rooms[pitRoomIndex];
const pitBounds = {
  x: pitRoomX + 3,
  y: pitRoomY + 3,
  width: pitRoomWidth - 6,
  height: pitRoomHeight - 6,
  centerX: pitRoomX + pitRoomWidth / 2,
  centerY: pitRoomY + pitRoomHeight / 2,
};
const [gapRoomX, gapRoomY, gapRoomWidth, gapRoomHeight] = rooms[GAP_ROOM_INDEX];
const gapBounds = {
  x: gapRoomX + 3,
  y: gapRoomY + 3,
  width: gapRoomWidth - 6,
  height: gapRoomHeight - 6,
  centerX: gapRoomX + gapRoomWidth / 2,
  centerY: gapRoomY + gapRoomHeight / 2,
};
const [tallRoomX, tallRoomY, tallRoomWidth, tallRoomHeight] = rooms[TALL_CEILING_ROOM_INDEX];
const pitCells = new Set();
const PIT_BEAM_WIDTH = 24;
const GAP_BRIDGE_WIDTH = 50;
for (const bounds of [pitBounds, gapBounds]) {
  for (let row = bounds.y; row < bounds.y + bounds.height; row += 1) {
    for (let column = bounds.x; column < bounds.x + bounds.width; column += 1) {
      pitCells.add(`${column},${row}`);
    }
  }
}

function roomCenter(index) {
  const [x, y, width, height] = rooms[index];
  return {
    x: (x + width / 2) * TILE,
    y: (y + height / 2) * TILE,
  };
}

function distanceToPitBeamLine(worldPosition, centerCell) {
  const offsetInTiles = worldPosition / TILE - centerCell;
  return Math.abs(offsetInTiles - Math.round(offsetInTiles / 2) * 2) * TILE;
}

function isInPit(x, y) {
  return [pitBounds, gapBounds].some((bounds) =>
    x >= bounds.x * TILE &&
    x < (bounds.x + bounds.width) * TILE &&
    y >= bounds.y * TILE &&
    y < (bounds.y + bounds.height) * TILE
  );
}

function isOnPitBeam(x, y) {
  const beamMargin = PIT_BEAM_WIDTH / 2 - 2;
  const inPitLattice = x >= pitBounds.x * TILE &&
    x < (pitBounds.x + pitBounds.width) * TILE &&
    y >= pitBounds.y * TILE &&
    y < (pitBounds.y + pitBounds.height) * TILE;
  const inGap = x >= gapBounds.x * TILE &&
    x < (gapBounds.x + gapBounds.width) * TILE &&
    y >= gapBounds.y * TILE &&
    y < (gapBounds.y + gapBounds.height) * TILE;
  const onLattice = distanceToPitBeamLine(x, pitBounds.centerX) <= beamMargin ||
    distanceToPitBeamLine(y, pitBounds.centerY) <= beamMargin;
  const onGapBridge = Math.abs(x / TILE - gapBounds.centerX) * TILE <= GAP_BRIDGE_WIDTH / 2 ||
    Math.abs(y / TILE - gapBounds.centerY) * TILE <= GAP_BRIDGE_WIDTH / 2;
  return (inPitLattice && onLattice) || (inGap && onGapBridge);
}

const elevatorRoomCenter = roomCenter(1);
const relays = [
  { ...roomCenter(4), active: false },
  { ...roomCenter(13), active: false },
  { ...roomCenter(22), active: false },
];
const elevatorRoom = rooms[1];
const exit = {
  x: elevatorRoomCenter.x,
  y: elevatorRoomCenter.y + (elevatorRoom[3] / 2 - 0.5) * TILE,
};
const playerStart = roomCenter(0);
const entityStart = rooms
  .map((_, index) => ({ index, position: roomCenter(index) }))
  .filter(({ index }) => ![0, 1, pitRoomIndex, 4, 13, 22].includes(index))
  .reduce((farthest, candidate) =>
    Math.hypot(candidate.position.x - playerStart.x, candidate.position.y - playerStart.y) >
    Math.hypot(farthest.position.x - playerStart.x, farthest.position.y - playerStart.y)
      ? candidate
      : farthest
  ).position;
const heldKeys = new Set();
const player = {
  ...playerStart,
  yaw: 0,
  pitch: 0,
  radius: 9,
  moving: false,
  frameDistance: 0,
  distanceSinceStep: 0,
  walkPhase: 0,
  bobAmount: 0,
};
const entity = {
  ...entityStart,
  radius: 13,
  visible: false,
  moving: false,
  speed: 52,
  pathTimer: 0,
  target: null,
  wanderDestination: null,
  wanderPause: 1.4,
  alertTimer: 0,
};
let state = "intro";
let relaysFound = 0;
let elevatorUnlocked = false;
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
let interactionRequested = false;
let nearbyLever = null;
const lightFlares = [];
let lightGlowTexture = null;
let lightFlareTexture = null;
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
moonlight.shadow.mapSize.set(2048, 2048);
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
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
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
  pillar: new THREE.MeshStandardMaterial({
    color: 0xd0bd78,
    emissive: 0x211808,
    emissiveIntensity: 0.45,
    roughness: 0.92,
  }),
  floor: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, ...surfaces.floor, bumpScale: 0.24 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, ...surfaces.ceiling, bumpScale: 0.08 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x322718, roughness: 0.88, ...surfaces.wood, bumpScale: 0.1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x70552b, roughness: 0.82, ...surfaces.wood, bumpScale: 0.1 }),
  brass: new THREE.MeshStandardMaterial({ color: 0x98783a, metalness: 0.4, roughness: 0.45, ...surfaces.paper, bumpScale: 0.025 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xc3a866, roughness: 0.9, ...surfaces.paper, bumpScale: 0.04 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x3c321f, roughness: 0.84, ...surfaces.paper, bumpScale: 0.03 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x080a0b, roughness: 0.92, ...surfaces.creature, bumpScale: 0.06 }),
  creature: new THREE.MeshStandardMaterial({ color: 0x11110f, roughness: 0.9, ...surfaces.creature, bumpScale: 0.2 }),
  rib: new THREE.MeshStandardMaterial({ color: 0x554937, roughness: 0.92, ...surfaces.creature, bumpScale: 0.14 }),
  maw: new THREE.MeshStandardMaterial({
    color: 0x26090a,
    emissive: 0x300708,
    emissiveIntensity: 0.4,
    roughness: 0.9,
    ...surfaces.creature,
    bumpScale: 0.12,
  }),
  skinwalkerFace: new THREE.MeshStandardMaterial({
    color: 0x6a6250,
    roughness: 0.98,
    ...surfaces.creature,
    bumpScale: 0.22,
  }),
  skinwalkerEye: new THREE.MeshStandardMaterial({
    color: 0x5b190f,
    emissive: 0x7d1b0c,
    emissiveIntensity: 0.45,
    roughness: 0.36,
  }),
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

function roomWallTransform(room, side, alongOffset = 0, orientationOffset = 0, inset = 8) {
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
    x: wallCenter.x + tangentX * alongOffset + inwardX * inset,
    z: wallCenter.z + tangentZ * alongOffset + inwardZ * inset,
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

function addStableLight(parent, color, intensity, distance, position) {
  const light = new THREE.PointLight(color, intensity, distance, 1.65);
  light.position.set(...position);
  light.castShadow = false;
  parent.add(light);
  parent.userData.light = light;
  parent.userData.baseIntensity = intensity;
  return light;
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

function buildChairPile(parent, variation) {
  const placements = [
    [0, 0, 0],
    [7, 18, -4],
    [-6, 34, 3],
    [3, 49, 8],
  ];
  placements.forEach(([x, y, z], index) => {
    const chair = new THREE.Group();
    chair.position.set(x, y, z);
    chair.rotation.y = (variation + index * 2) * Math.PI / 5;
    chair.scale.setScalar(index === 0 ? 1 : 0.88);
    buildArchiveChair(chair, variation + index);
    parent.add(chair);
  });
}

function buildChairHeap(parent, variation) {
  const placements = [
    [-28, 0, -18], [0, 0, 2], [27, 1, -14], [-12, 3, 26], [18, 7, 27],
    [-35, 18, 4], [-8, 20, -23], [25, 22, 4], [4, 25, 23],
    [-23, 37, -8], [14, 40, -4], [3, 52, 4],
  ];
  placements.forEach(([x, y, z], index) => {
    const chair = new THREE.Group();
    chair.position.set(x, y, z);
    chair.scale.setScalar(index < 5 ? 0.9 : 0.82);
    buildArchiveChair(chair, variation + index);
    chair.rotation.set(
      ((index * 7 + variation) % 5 - 2) * 0.18,
      (index * 1.91 + variation) % (Math.PI * 2),
      ((index * 3 + variation) % 7 - 3) * 0.22,
    );
    parent.add(chair);
  });
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
  const normalCeilingTiles = [];
  const tallCeilingTiles = [];
  const walls = [];
  const pillars = [];
  const tallPillars = [];
  const obstacles = [];
  const inTallRoom = (column, row) =>
    column >= tallRoomX &&
    column < tallRoomX + tallRoomWidth &&
    row >= tallRoomY &&
    row < tallRoomY + tallRoomHeight;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      const cell = { x: column, y: row };
      if (map[row][column] === ".") {
        if (!pitCells.has(`${column},${row}`)) {
          floors.push(cell);
          (inTallRoom(column, row) ? tallCeilingTiles : normalCeilingTiles).push(cell);
        }
      } else if (obstacleCells.has(`${column},${row}`)) obstacles.push(cell);
      else if (pillarCells.has(`${column},${row}`)) {
        (inTallRoom(column, row) ? tallPillars : pillars).push(cell);
      }
      else walls.push(cell);
    }
  }

  const tallUpperWalls = [];
  const addTallBoundaryWall = (column, row) => {
    if (map[row]?.[column] === "#" && !pillarCells.has(`${column},${row}`)) {
      tallUpperWalls.push({ x: column, y: row });
    }
  };
  for (let column = tallRoomX; column < tallRoomX + tallRoomWidth; column += 1) {
    addTallBoundaryWall(column, tallRoomY);
    addTallBoundaryWall(column, tallRoomY + tallRoomHeight - 1);
  }
  for (let row = tallRoomY + 1; row < tallRoomY + tallRoomHeight - 1; row += 1) {
    addTallBoundaryWall(tallRoomX, row);
    addTallBoundaryWall(tallRoomX + tallRoomWidth - 1, row);
  }

  addInstancedTiles(
    obstacles,
    new THREE.BoxGeometry(31, 44, 31),
    materials.darkWood,
    ({ x, y }) => new THREE.Color().setHSL(0.09 + ((x * 7 + y * 13) % 4) * 0.012, 0.28, 0.22),
    21,
  );
  addInstancedTiles(
    floors,
    new THREE.BoxGeometry(TILE + 0.5, 2, TILE + 0.5),
    materials.floor,
    ({ x, y }) => new THREE.Color().setHSL(0.115 + ((x * 17 + y * 29) % 5) * 0.004, 0.18, 0.19),
    -1,
  );
  const pitVoid = new THREE.Mesh(
    new THREE.PlaneGeometry(pitBounds.width * TILE, pitBounds.height * TILE),
    new THREE.MeshBasicMaterial({ color: 0x080906, side: THREE.DoubleSide }),
  );
  pitVoid.rotation.x = -Math.PI / 2;
  pitVoid.position.set(
    (pitBounds.x + pitBounds.width / 2) * TILE,
    -58,
    (pitBounds.y + pitBounds.height / 2) * TILE,
  );
  worldRoot.add(pitVoid);
  const gapVoid = new THREE.Mesh(
    new THREE.PlaneGeometry(gapBounds.width * TILE, gapBounds.height * TILE),
    new THREE.MeshBasicMaterial({ color: 0x050605, side: THREE.DoubleSide }),
  );
  gapVoid.rotation.x = -Math.PI / 2;
  gapVoid.position.set(
    (gapBounds.x + gapBounds.width / 2) * TILE,
    -86,
    (gapBounds.y + gapBounds.height / 2) * TILE,
  );
  worldRoot.add(gapVoid);

  const gapBridgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x524c3e,
    roughness: 0.96,
    metalness: 0.08,
  });
  const gapBridgeX = new THREE.Mesh(
    new THREE.BoxGeometry(gapBounds.width * TILE, 3, GAP_BRIDGE_WIDTH),
    gapBridgeMaterial,
  );
  gapBridgeX.position.set(gapBounds.centerX * TILE, 0.5, gapBounds.centerY * TILE);
  worldRoot.add(gapBridgeX);
  const gapBridgeZ = new THREE.Mesh(
    new THREE.BoxGeometry(GAP_BRIDGE_WIDTH, 3, gapBounds.height * TILE),
    gapBridgeMaterial,
  );
  gapBridgeZ.position.set(gapBounds.centerX * TILE, 0.5, gapBounds.centerY * TILE);
  worldRoot.add(gapBridgeZ);

  const pitBeamMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaa078,
    roughness: 0.96,
  });
  const pitCenterX = pitBounds.centerX * TILE;
  const pitCenterY = pitBounds.centerY * TILE;
  const pitWidth = pitBounds.width * TILE;
  const pitDepth = pitBounds.height * TILE;
  for (let offset = -pitBounds.width; offset <= pitBounds.width; offset += 2) {
    const beamX = pitCenterX + offset * TILE;
    if (beamX >= pitBounds.x * TILE && beamX <= (pitBounds.x + pitBounds.width) * TILE) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(PIT_BEAM_WIDTH, 3, pitDepth),
        pitBeamMaterial,
      );
      beam.position.set(beamX, 0.5, (pitBounds.y + pitBounds.height / 2) * TILE);
      worldRoot.add(beam);
    }
    const beamZ = pitCenterY + offset * TILE;
    if (beamZ >= pitBounds.y * TILE && beamZ <= (pitBounds.y + pitBounds.height) * TILE) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(pitWidth, 3, PIT_BEAM_WIDTH),
        pitBeamMaterial,
      );
      beam.position.set((pitBounds.x + pitBounds.width / 2) * TILE, 0.5, beamZ);
      worldRoot.add(beam);
    }
  }
  addInstancedTiles(
    walls,
    new THREE.BoxGeometry(TILE, WALL_HEIGHT, TILE),
    materials.wall,
    ({ x, y }) => new THREE.Color().setHSL(0.115 + ((x * 11 + y * 19) % 5) * 0.004, 0.2, 0.21),
    WALL_HEIGHT / 2,
  );
  addInstancedTiles(
    pillars,
    new THREE.BoxGeometry(TILE * 0.58, WALL_HEIGHT + 3, TILE * 0.58),
    materials.pillar,
    () => new THREE.Color(0xd0bd78),
    (WALL_HEIGHT + 3) / 2,
  );
  addInstancedTiles(
    tallPillars,
    new THREE.BoxGeometry(TILE * 0.58, TALL_CEILING_HEIGHT + 2, TILE * 0.58),
    materials.pillar,
    () => new THREE.Color(0xd0bd78),
    (TALL_CEILING_HEIGHT + 2) / 2,
  );
  addInstancedTiles(
    tallUpperWalls,
    new THREE.BoxGeometry(TILE, TALL_CEILING_HEIGHT - WALL_HEIGHT, TILE),
    materials.wall,
    () => new THREE.Color(0xd0bd78),
    (TALL_CEILING_HEIGHT + WALL_HEIGHT) / 2,
  );
  addInstancedTiles(
    normalCeilingTiles,
    new THREE.BoxGeometry(TILE + 0.2, 2, TILE + 0.2),
    materials.ceiling,
    () => new THREE.Color(0xc9be9f),
    70,
  );
  addInstancedTiles(
    tallCeilingTiles,
    new THREE.BoxGeometry(TILE + 0.2, 2, TILE + 0.2),
    materials.ceiling,
    () => new THREE.Color(0xc9be9f),
    TALL_CEILING_HEIGHT + 1,
  );

  const ceilingHousing = new THREE.MeshStandardMaterial({
    color: 0x9c884d,
    roughness: 0.9,
  });
  const fluorescentPanel = new THREE.MeshBasicMaterial({ color: 0xfff5c8 });
  const housingPositions = [];
  const panelPositions = [];
  const glowPositions = [];
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext("2d");
  if (!glowContext) throw new Error("Could not create fluorescent light glow.");
  const glow = glowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
  glow.addColorStop(0, "rgba(255, 251, 228, 1)");
  glow.addColorStop(0.16, "rgba(255, 232, 173, 0.78)");
  glow.addColorStop(0.48, "rgba(255, 202, 105, 0.34)");
  glow.addColorStop(1, "rgba(255, 176, 60, 0)");
  glowContext.fillStyle = glow;
  glowContext.fillRect(0, 0, 128, 128);
  lightGlowTexture = new THREE.CanvasTexture(glowCanvas);
  lightGlowTexture.colorSpace = THREE.SRGBColorSpace;
  const flareCanvas = document.createElement("canvas");
  flareCanvas.width = 256;
  flareCanvas.height = 128;
  const flareContext = flareCanvas.getContext("2d");
  if (!flareContext) throw new Error("Could not create fluorescent glare texture.");
  const flareGlow = flareContext.createRadialGradient(128, 64, 2, 128, 64, 58);
  flareGlow.addColorStop(0, "rgba(255, 255, 246, 1)");
  flareGlow.addColorStop(0.12, "rgba(255, 248, 221, 0.9)");
  flareGlow.addColorStop(0.45, "rgba(255, 221, 157, 0.3)");
  flareGlow.addColorStop(1, "rgba(255, 208, 122, 0)");
  flareContext.fillStyle = flareGlow;
  flareContext.fillRect(0, 0, 256, 128);
  const streak = flareContext.createLinearGradient(0, 64, 256, 64);
  streak.addColorStop(0, "rgba(255, 235, 182, 0)");
  streak.addColorStop(0.36, "rgba(255, 243, 211, 0.2)");
  streak.addColorStop(0.5, "rgba(255, 255, 240, 0.9)");
  streak.addColorStop(0.64, "rgba(255, 243, 211, 0.2)");
  streak.addColorStop(1, "rgba(255, 235, 182, 0)");
  flareContext.fillStyle = streak;
  flareContext.fillRect(0, 61, 256, 6);
  lightFlareTexture = new THREE.CanvasTexture(flareCanvas);
  lightFlareTexture.colorSpace = THREE.SRGBColorSpace;
  const ceilingGlow = new THREE.MeshBasicMaterial({
    map: lightGlowTexture,
    color: 0xffe5aa,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const flareBaseMaterial = new THREE.SpriteMaterial({
    map: lightFlareTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  rooms.forEach(([x, y, width, height], index) => {
    const centerX = x + Math.floor(width / 2);
    const centerY = y + Math.floor(height / 2);
    const ceilingY = index === TALL_CEILING_ROOM_INDEX ? TALL_CEILING_HEIGHT + 1 : 70;
    const fixtureY = ceilingY - 13;
    const fixture = new THREE.Group();
    const position = tileWorldPosition(centerX, centerY);
    fixture.position.set(position.x, 0, position.z);
    for (const offsetX of [-2, 0, 2]) {
      for (const offsetY of [-2, 0, 2]) {
        const panelPosition = tileWorldPosition(centerX + offsetX, centerY + offsetY);
        housingPositions.push({ ...panelPosition, y: ceilingY - 3 });
        panelPositions.push({ ...panelPosition, y: ceilingY - 4 });
        glowPositions.push({ ...panelPosition, y: ceilingY - 4.6 });
      }
    }
    addStableLight(fixture, 0xffd783, 940, 270, [0, fixtureY, 0]);
    const flareMaterial = flareBaseMaterial.clone();
    const flare = new THREE.Sprite(flareMaterial);
    flare.position.set(position.x, fixtureY, position.z);
    flare.scale.set(150, 70, 1);
    flare.renderOrder = 2;
    worldRoot.add(flare);
    lightFlares.push({ sprite: flare, material: flareMaterial });
    worldRoot.add(fixture);
  });

  const addInstancedFixtures = (positions, geometry, material, height, rotationX = 0) => {
    const fixtures = new THREE.InstancedMesh(geometry, material, positions.length);
    const transform = new THREE.Object3D();
    positions.forEach((position, index) => {
      transform.position.set(position.x, position.y ?? height, position.z);
      transform.rotation.x = rotationX;
      transform.updateMatrix();
      fixtures.setMatrixAt(index, transform.matrix);
    });
    fixtures.instanceMatrix.needsUpdate = true;
    worldRoot.add(fixtures);
  };
  addInstancedFixtures(housingPositions, new THREE.BoxGeometry(34, 1.5, 14), ceilingHousing, 67);
  addInstancedFixtures(panelPositions, new THREE.BoxGeometry(27, 0.5, 9), fluorescentPanel, 66);
  addInstancedFixtures(
    glowPositions,
    new THREE.PlaneGeometry(62, 62),
    ceilingGlow,
    65.4,
    -Math.PI / 2,
  );

  const rugMaterial = materials.rug;
  rooms.forEach(([x, y, width, height], index) => {
    const room = [x, y, width, height];
    const center = tileWorldPosition(x + Math.floor(width / 2), y + Math.floor(height / 2));
    if (index % 3 !== 2 && index !== pitRoomIndex) {
      const rug = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(100, width * TILE * 0.52), 0.5, Math.min(75, height * TILE * 0.42)),
        rugMaterial,
      );
      rug.position.set(center.x, 0.15, center.z);
      rug.rotation.y = (mazeRandom() - 0.5) * 0.4;
      rug.receiveShadow = true;
      worldRoot.add(rug);
    }

    const roomSide = [0, 1, 2, 3, 2, 1, 3][index % 7];
    const orientationOffset = [0, 0, 0, 0, 0.28, -0.28, 0.14][index % 7];
    const shelf = new THREE.Group();
    const shelfPlacement = roomWallTransform(room, roomSide, -70, orientationOffset, 9);
    shelf.position.set(shelfPlacement.x, 0, shelfPlacement.z);
    shelf.rotation.y = shelfPlacement.rotation;
    buildArchiveShelf(shelf, index);
    worldRoot.add(shelf);

    if (![0, 1, pitRoomIndex, 4, 13, 22].includes(index)) {
      const corner = index % 4;
      const chairPile = new THREE.Group();
      const insetX = corner % 2 === 0 ? 1.35 : width - 1.35;
      const insetY = corner < 2 ? 1.35 : height - 1.35;
      const pileCenter = tileWorldPosition(x + insetX, y + insetY);
      chairPile.position.set(pileCenter.x, 0, pileCenter.z);
      if ([TALL_CEILING_ROOM_INDEX, 20, 25].includes(index)) {
        buildChairHeap(chairPile, index);
      } else {
        buildChairPile(chairPile, index);
      }
      worldRoot.add(chairPile);
    }

    if (index % 3 === 1 && index !== 1) {
      const desk = new THREE.Group();
      const deskPlacement = roomWallTransform(room, (roomSide + 1) % 4, 70, orientationOffset, 17);
      desk.position.set(deskPlacement.x, 0, deskPlacement.z);
      desk.rotation.y = deskPlacement.rotation;
      buildArchiveDesk(desk);
      worldRoot.add(desk);
    }

    if (index % 4 === 0 && ![0, pitRoomIndex, 4, 13, 22].includes(index)) {
      const clutter = new THREE.Group();
      const clutterPlacement = roomWallTransform(room, roomSide, 70, orientationOffset, 35);
      clutter.position.set(clutterPlacement.x, 0, clutterPlacement.z);
      clutter.rotation.y = mazeRandom() * Math.PI;
      buildArchiveCrates(clutter, index);
      worldRoot.add(clutter);
    }
  });
}

function buildWallWriting() {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 1600;
  canvasTexture.height = 800;
  const context = canvasTexture.getContext("2d");
  if (!context) throw new Error("Could not create the wall writing texture.");
  context.clearRect(0, 0, canvasTexture.width, canvasTexture.height);
  context.font = "bold italic 76px 'Comic Sans MS', 'Segoe Print', cursive";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#0a0806";
  context.strokeStyle = "#0a0806";
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = 2;
  const writingLines = [
    "it's like describing a dog to someone",
    "who's never seen a dog before, and then",
    "asking them to draw it",
  ];
  writingLines.forEach((line, index) => {
    context.save();
    context.translate(800, 200 + index * 198);
    context.rotate(index % 2 === 0 ? -0.035 : 0.025);
    for (let stroke = 0; stroke < 4; stroke += 1) {
      context.globalAlpha = stroke === 3 ? 1 : 0.32;
      context.fillText(
        line,
        (stroke - 1.5) * (index % 2 ? 1.1 : -0.8),
        (stroke - 1.5) * 1.25,
        1500,
      );
    }
    context.globalAlpha = 1;
    context.restore();
  });

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const candidates = [];
  for (let row = 1; row < ROWS - 1; row += 1) {
    for (let column = 1; column < COLS - 1; column += 1) {
      if (map[row][column] !== ".") continue;
      if (isWall(column, row - 1) && isWall(column - 1, row - 1) && isWall(column + 1, row - 1)) {
        candidates.push({ column, row, side: "north" });
      }
      if (isWall(column, row + 1) && isWall(column - 1, row + 1) && isWall(column + 1, row + 1)) {
        candidates.push({ column, row, side: "south" });
      }
      if (isWall(column - 1, row) && isWall(column - 1, row - 1) && isWall(column - 1, row + 1)) {
        candidates.push({ column, row, side: "west" });
      }
      if (isWall(column + 1, row) && isWall(column + 1, row - 1) && isWall(column + 1, row + 1)) {
        candidates.push({ column, row, side: "east" });
      }
    }
  }
  if (candidates.length === 0) throw new Error("Could not find a wall for the Backrooms writing.");
  const placement = candidates[Math.floor(mazeRandom() * candidates.length)];
  const sign = new THREE.Group();
  const writing = new THREE.Mesh(new THREE.PlaneGeometry(74, 38), material);
  writing.rotation.z = -0.2;
  sign.add(writing);
  sign.position.y = 40;
  if (placement.side === "north") {
    sign.position.set((placement.column + 0.5) * TILE, 40, placement.row * TILE + 0.15);
  } else if (placement.side === "south") {
    sign.position.set((placement.column + 0.5) * TILE, 40, (placement.row + 1) * TILE - 0.15);
    sign.rotation.y = Math.PI;
  } else if (placement.side === "west") {
    sign.position.set(placement.column * TILE + 0.15, 40, (placement.row + 0.5) * TILE);
    sign.rotation.y = Math.PI / 2;
  } else {
    sign.position.set((placement.column + 1) * TILE - 0.15, 40, (placement.row + 0.5) * TILE);
    sign.rotation.y = -Math.PI / 2;
  }
  worldRoot.add(sign);
}

function buildLever(relay) {
  const group = new THREE.Group();
  group.position.set(relay.x, 0, relay.y);
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(13, 3, 10), materials.darkWood);
  pedestal.position.y = 1.5;
  group.add(pedestal);
  addBox(group, [10, 1, 7], [0, 3.5, 0], materials.brass);
  addBox(group, [3, 8, 3], [0, 7.5, 0], materials.darkWood);
  const pivot = new THREE.Group();
  pivot.position.set(0, 10.5, 0);
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 12, 8),
    materials.brass,
  );
  handle.position.y = 6;
  handle.rotation.z = -0.5;
  pivot.add(handle);
  const grip = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), materials.dark);
  grip.position.set(0, 12, 0);
  pivot.add(grip);
  group.add(pivot);
  relay.handle = pivot;
  relay.mesh = group;
  worldRoot.add(group);
}

function buildExit() {
  const group = new THREE.Group();
  group.position.set(exit.x, 0, exit.y + 18.5);
  group.rotation.y = Math.PI;
  addBox(group, [44, 51, 4], [0, 25.5, 0], materials.brass);
  addBox(
    group,
    [35, 44, 0.8],
    [0, 23, 0.9],
    new THREE.MeshBasicMaterial({ color: 0x080b12 }),
  );
  const innerVeil = new THREE.Mesh(
    new THREE.PlaneGeometry(29, 40),
    new THREE.MeshBasicMaterial({
      color: 0x8c9db8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  innerVeil.position.set(0, 23, 0.45);
  group.add(innerVeil);
  addBox(group, [47, 3, 5], [0, 51, 0], materials.darkWood);
  addBox(group, [42, 0.8, 1], [0, 49.2, 2.8], materials.elevatorGlow);
  const doors = [
    addBox(group, [16, 45, 2], [-8, 23, 2.1], materials.darkWood),
    addBox(group, [16, 45, 2], [8, 23, 2.1], materials.wood),
  ];
  addBox(group, [43, 2.5, 5], [0, 48, 0], materials.darkWood);
  addBox(group, [42, 1.6, 9], [0, 0.8, 2.6], materials.brass);
  for (const side of [-1, 1]) {
    addBox(group, [4.5, 48, 5], [side * 21, 24, 0], materials.darkWood);
    for (const height of [8, 20, 32, 44]) {
      addCylinder(group, 1.35, 1.35, 4, [side * 19.3, height, 2], materials.brass, 8);
    }
    addBox(group, [1.8, 44, 0.9], [side * 18.1, 24, 3.2], materials.elevatorGlow);
  }
  addBox(group, [23, 1.2, 0.9], [0, 46, 3.25], materials.elevatorGlow);
  addBox(group, [3, 7, 1.1], [0, 40, 3.9], materials.light);
  addBox(group, [6, 3, 0.6], [0, 35, 3.85], materials.brass);

  addStableLight(group, 0xe4f2ff, 940, 270, [0, 27, 14]);
  const elevatorFlareMaterial = new THREE.SpriteMaterial({
    map: lightFlareTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const elevatorFlare = new THREE.Sprite(elevatorFlareMaterial);
  elevatorFlare.position.set(exit.x, 27, exit.y + 14);
  elevatorFlare.scale.set(160, 76, 1);
  elevatorFlare.renderOrder = 2;
  worldRoot.add(elevatorFlare);
  lightFlares.push({ sprite: elevatorFlare, material: elevatorFlareMaterial });
  group.userData.doors = doors;
  worldRoot.add(group);
  return group;
}

function buildEntity() {
  const root = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), materials.creature);
  torso.position.set(0, 25, -1);
  torso.scale.set(6.7, 14.5, 5.2);
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), materials.dark);
  pelvis.position.set(0, 13, -1);
  pelvis.scale.set(5.2, 6.2, 4.7);
  root.add(pelvis);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 12, 5, 8), materials.creature);
  neck.position.set(0, 35, 1.1);
  neck.rotation.x = -0.16;
  neck.rotation.z = 0.08;
  root.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 43, 2.4);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 12), materials.skinwalkerFace);
  skull.scale.set(4.5, 6, 4.5);
  skull.castShadow = true;
  head.add(skull);
  const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), materials.creature);
  brow.scale.set(4.8, 1.6, 2.2);
  brow.position.set(0, 2.4, 3.1);
  head.add(brow);
  const jaw = new THREE.Group();
  jaw.position.set(0, -3.1, 3.3);
  const jawShape = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.6, 3.2), materials.maw);
  jawShape.position.set(0, -0.4, 1.4);
  jaw.add(jawShape);
  for (let index = -2; index <= 2; index += 1) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.7, 5), materials.bone);
    tooth.position.set(index * 0.9, 0.45, 2.5);
    tooth.rotation.x = Math.PI;
    jaw.add(tooth);
  }
  head.add(jaw);
  const eyes = [];
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), materials.maw);
    socket.scale.set(1.35, 1.05, 0.55);
    socket.position.set(side * 1.65, 0.5, 3.9);
    head.add(socket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), materials.skinwalkerEye);
    eye.position.set(side * 1.65, 0.45, 4.35);
    head.add(eye);
    eyes.push(eye);
    const cheek = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 3.5, 4, 6), materials.creature);
    cheek.position.set(side * 3.3, -1.6, 2.65);
    cheek.rotation.z = side * 0.48;
    head.add(cheek);
  }
  const smile = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.2, -2.25, 3.95),
        new THREE.Vector3(-1.6, -2.8, 4.2),
        new THREE.Vector3(0, -2.45, 4.35),
        new THREE.Vector3(1.8, -2.8, 4.15),
        new THREE.Vector3(3.2, -2.1, 3.85),
      ]),
      18,
      0.22,
      6,
      false,
    ),
    materials.maw,
  );
  head.add(smile);

  const buildAntler = (side) => {
    const trunk = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 2.4, 4.2, 0.2),
      new THREE.Vector3(side * 4.2, 7, 0),
      new THREE.Vector3(side * 5, 11, -0.4),
      new THREE.Vector3(side * 4.6, 14.2, -0.5),
    ]);
    const antler = new THREE.Mesh(new THREE.TubeGeometry(trunk, 18, 0.78, 7, false), materials.rib);
    antler.castShadow = true;
    head.add(antler);
    const branches = [
      [
        new THREE.Vector3(side * 4.4, 7.5, 0),
        new THREE.Vector3(side * 6.8, 8.7, 0.1),
        new THREE.Vector3(side * 8.2, 11, 0.2),
      ],
      [
        new THREE.Vector3(side * 4.9, 10, -0.2),
        new THREE.Vector3(side * 6.6, 12, -0.1),
        new THREE.Vector3(side * 7.1, 14, 0),
      ],
    ];
    branches.forEach((points) => {
      const branch = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.48, 6, false),
        materials.rib,
      );
      branch.castShadow = true;
      head.add(branch);
    });
  };
  buildAntler(-1);
  buildAntler(1);
  for (let index = 0; index < 3; index += 1) {
    const hair = new THREE.Mesh(new THREE.ConeGeometry(1.1, 8 + index, 5), materials.dark);
    hair.position.set((index - 1) * 1.8, -5.8, 0.8);
    hair.rotation.z = (index - 1) * 0.13;
    head.add(hair);
  }
  root.add(head);

  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 4.8, 33, 0.2);
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(1.55, 13, 5, 8), materials.creature);
    upperArm.position.set(side * 0.8, -7, 0);
    upperArm.rotation.z = side * -0.1;
    upperArm.castShadow = true;
    arm.add(upperArm);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(1.05, 15, 5, 8), materials.creature);
    forearm.position.set(side * 1.2, -20.5, 0.8);
    forearm.rotation.z = side * 0.1;
    forearm.castShadow = true;
    arm.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), materials.skinwalkerFace);
    hand.scale.set(2, 1.2, 2.3);
    hand.position.set(side * 1.1, -29, 1.8);
    arm.add(hand);
    for (let finger = -1; finger <= 1; finger += 1) {
      const digit = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 4.5, 4, 6), materials.skinwalkerFace);
      digit.position.set(side * 1.1 + finger * 1.05, -32, 3.3);
      digit.rotation.x = -0.3;
      arm.add(digit);
      const nail = new THREE.Mesh(new THREE.ConeGeometry(0.33, 2.4, 5), materials.rib);
      nail.position.set(side * 1.1 + finger * 1.05, -33.2, 5.9);
      nail.rotation.x = Math.PI / 2;
      arm.add(nail);
    }
    root.add(arm);
    limbs.push(arm);

    const leg = new THREE.Group();
    leg.position.set(side * 2.7, 15, -1);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(2, 10, 5, 8), materials.creature);
    thigh.position.y = -5;
    thigh.castShadow = true;
    leg.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 10, 5, 8), materials.creature);
    shin.position.set(side * 0.8, -15, 0.8);
    shin.rotation.z = side * 0.1;
    leg.add(shin);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), materials.dark);
    foot.scale.set(1.7, 1.1, 3.5);
    foot.position.set(side * 0.9, -21, 2.8);
    leg.add(foot);
    for (let toe = -1; toe <= 1; toe += 1) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.1, 5), materials.rib);
      claw.position.set(side * 0.9 + toe * 0.8, -21.2, 5.5);
      claw.rotation.x = Math.PI / 2;
      leg.add(claw);
    }
    root.add(leg);
    limbs.push(leg);
  }

  const spines = [];
  for (let index = 0; index < 5; index += 1) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(1.15, 6 + (index % 2) * 2, 5), materials.rib);
    spine.position.set((index - 2) * 2.1, 37 - Math.abs(index - 2), -4.2);
    spine.rotation.z = (index - 2) * 0.22;
    spine.rotation.x = Math.PI;
    root.add(spine);
    spines.push(spine);
  }

  root.visible = false;
  worldRoot.add(root);
  return {
    root,
    torso,
    head,
    eyes,
    jaw,
    limbs,
    spines,
    walkPhase: 0,
    lastTime: null,
    lastX: entity.x,
    lastY: entity.y,
  };
}

buildWorld();
buildWallWriting();
buildStopSign();
relays.forEach(buildLever);
const exitModel = buildExit();
const entityModel = buildEntity();
entityModel.root.position.set(entity.x, 0, entity.y);
entity.visible = true;
entityModel.root.visible = true;

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
      const key = `${column},${row}`;
      const pillar = pillarCells.has(key);
      const obstacle = obstacleCells.has(key);
      const halfSize = pillar ? TILE / 4 : obstacle ? 16 : TILE / 2;
      const centerX = column * TILE + TILE / 2;
      const centerY = row * TILE + TILE / 2;
      const nearestX = Math.max(centerX - halfSize, Math.min(x, centerX + halfSize));
      const nearestY = Math.max(centerY - halfSize, Math.min(y, centerY + halfSize));
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
      const nextWorldX = next.x * TILE + TILE / 2;
      const nextWorldY = next.y * TILE + TILE / 2;
      if (isWall(next.x, next.y) ||
        (pitCells.has(key) && !isOnPitBeam(nextWorldX, nextWorldY)) ||
        visited.has(key)) continue;
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

function playFootstep(isMonster, intensity = 1) {
  if (!footstepContext || footstepContext.state !== "running") return;
  const now = footstepContext.currentTime;
  const output = footstepContext.createGain();
  const volume = (isMonster ? 0.54 : 0.16) * THREE.MathUtils.clamp(intensity, 0, 1);
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), now + 0.012);
  output.gain.exponentialRampToValueAtTime(0.0001, now + (isMonster ? 0.36 : 0.18));
  output.connect(footstepContext.destination);

  const thud = footstepContext.createOscillator();
  thud.type = isMonster ? "triangle" : "sine";
  thud.frequency.setValueAtTime(isMonster ? 48 : 86, now);
  thud.frequency.exponentialRampToValueAtTime(isMonster ? 28 : 43, now + 0.2);
  thud.connect(output);
  thud.start(now);
  thud.stop(now + 0.2);

  const noiseLength = Math.floor(footstepContext.sampleRate * (isMonster ? 0.24 : 0.08));
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
  filter.frequency.setValueAtTime(isMonster ? 520 : 460, now);
  noiseGain.gain.setValueAtTime(isMonster ? 0.86 : 0.24, now);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(output);
  noise.start(now);

  if (isMonster) {
    const scrape = footstepContext.createOscillator();
    const scrapeGain = footstepContext.createGain();
    scrape.type = "sawtooth";
    scrape.frequency.setValueAtTime(72, now + 0.04);
    scrape.frequency.exponentialRampToValueAtTime(39, now + 0.3);
    scrapeGain.gain.setValueAtTime(0.12, now + 0.04);
    scrapeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.31);
    scrape.connect(scrapeGain);
    scrapeGain.connect(output);
    scrape.start(now + 0.04);
    scrape.stop(now + 0.32);
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
      entityFootstepTimer = 0.48 + Math.random() * 0.12;
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
  entity.wanderDestination = null;
  entity.wanderPause = 1.4;
  entity.alertTimer = 0;
  interactionRequested = false;
  nearbyLever = null;
  player.moving = false;
  player.frameDistance = 0;
  player.distanceSinceStep = 0;
  player.walkPhase = 0;
  player.bobAmount = 0;
  entityFootstepTimer = 0;
  relays.forEach((relay) => {
    relay.active = false;
    relay.mesh.visible = true;
    relay.handle.rotation.set(0, 0, 0);
  });
  entityModel.root.visible = false;
  entityModel.root.position.set(entity.x, 0, entity.y);
  exitModel.userData.doors[0].position.x = -8;
  exitModel.userData.doors[1].position.x = 8;
  exitModel.userData.doors.forEach((door, index) => {
    door.material = index === 0 ? materials.darkWood : materials.wood;
  });
  relaysFound = 0;
  elevatorUnlocked = false;
  qPressCount = 0;
  lastQPressTime = 0;
  presence = 0;
  relayCount.textContent = "0";
  objectiveText.textContent = "Find and switch the three levers";
  interactionPrompt.hidden = true;
  presenceFill.style.width = "0%";
  gameMessage.classList.remove("visible");
  heldKeys.clear();
}

function unlockElevator() {
  elevatorUnlocked = true;
  objectiveText.textContent = "Reach the service lift";
  exitModel.userData.doors.forEach((door, index) => {
    door.material = materials.relay;
    door.position.x = index === 0 ? -19 : 19;
  });
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
  interactionPrompt.hidden = true;
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
  entity.visible = true;
  entityModel.root.visible = true;
  entityModel.lastTime = null;
  entityModel.lastX = entity.x;
  entityModel.lastY = entity.y;
  overlay.hidden = true;
  startGameAudio();
  canvas.focus();
  requestLookLock();
}

function endGame(won, cause = null) {
  if (won) {
    startEndingCutscene();
    return;
  }
  state = won ? "won" : "lost";
  heldKeys.clear();
  interactionPrompt.hidden = true;
  stopGameAudio();
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  overlay.hidden = false;
  overlayEyebrow.textContent = won ? "SHIFT COMPLETE" : cause === "pit" ? "FLOOR GIVES WAY" : "SIGNAL LOST";
  overlayTitle.textContent = won
    ? "You made it outside."
    : cause === "pit" ? "You fell into the dark." : "The halls went quiet.";
  overlayCopy.textContent = won
    ? "The lift doors close behind you. Somewhere below, one lever is still humming."
    : cause === "pit"
      ? "The open floor swallowed you. Keep to the beams and try the route again."
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
    player.bobAmount += (0 - player.bobAmount) * Math.min(1, deltaTime * 9);
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
  if (player.moving) {
    player.walkPhase += deltaTime * (sprinting ? 11.5 : 7.2);
    const targetBob = sprinting ? 2.25 : 1.15;
    player.bobAmount += (targetBob - player.bobAmount) * Math.min(1, deltaTime * 10);
  } else {
    player.bobAmount += (0 - player.bobAmount) * Math.min(1, deltaTime * 9);
  }
  return sprinting;
}

function canEntitySeePlayer(distance) {
  const sampleCount = Math.ceil(distance / 20);
  for (let index = 1; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const x = entity.x + (player.x - entity.x) * progress;
    const y = entity.y + (player.y - entity.y) * progress;
    if (isWall(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

function chooseWanderDestination() {
  const choices = rooms
    .map((_, index) => index)
    .filter((index) => ![0, 1, pitRoomIndex, 4, 13, 22].includes(index));
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(mazeRandom() * (index + 1));
    [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
  }
  for (const index of choices) {
    const destination = roomCenter(index);
    if (Math.hypot(destination.x - entity.x, destination.y - entity.y) < TILE * 3) continue;
    if (findNextStep(entity.x, entity.y, destination.x, destination.y)) return destination;
  }
  return null;
}

function updateEntity(deltaTime, sprinting) {
  entity.moving = false;
  if (!entity.visible) return;

  const distanceToPlayer = Math.hypot(player.x - entity.x, player.y - entity.y);
  const detectionRange = sprinting ? 570 : 390;
  if (distanceToPlayer < detectionRange && canEntitySeePlayer(distanceToPlayer)) {
    entity.alertTimer = 4.5;
    entity.wanderDestination = null;
  } else {
    entity.alertTimer = Math.max(0, entity.alertTimer - deltaTime);
  }
  const pursuing = entity.alertTimer > 0;
  entity.speed = pursuing ? 68 + relaysFound * 7 + (sprinting ? 15 : 0) : 26;

  if (!pursuing && !entity.wanderDestination) {
    entity.wanderPause -= deltaTime;
    if (entity.wanderPause <= 0) {
      entity.wanderDestination = chooseWanderDestination();
      entity.wanderPause = entity.wanderDestination ? 0 : 1.5 + mazeRandom() * 2.5;
    }
  }
  if (pursuing) entity.wanderDestination = null;

  entity.pathTimer -= deltaTime;
  if (entity.pathTimer <= 0) {
    const destination = pursuing ? player : entity.wanderDestination;
    entity.target = destination
      ? findNextStep(entity.x, entity.y, destination.x, destination.y)
      : null;
    entity.pathTimer = pursuing ? 0.28 : 0.8;
  }

  if (!entity.target) {
    if (!pursuing && entity.wanderDestination) {
      entity.wanderDestination = null;
      entity.wanderPause = 1.5 + mazeRandom() * 2.5;
    }
    return;
  }
  if (entity.target.sameTile) {
    if (pursuing) entity.target = { x: player.x, y: player.y };
    else {
      entity.target = null;
      entity.wanderDestination = null;
      entity.wanderPause = 1.5 + mazeRandom() * 2.5;
      return;
    }
  }

  const dx = entity.target.x - entity.x;
  const dy = entity.target.y - entity.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 1) {
    const step = Math.min(distance, entity.speed * deltaTime);
    const nextX = entity.x + (dx / distance) * step;
    const nextY = entity.y + (dy / distance) * step;
    if (!collidesWithWall(nextX, entity.y, entity.radius)) entity.x = nextX;
    if (!collidesWithWall(entity.x, nextY, entity.radius)) entity.y = nextY;
    if (pitCells.has(`${Math.floor(entity.x / TILE)},${Math.floor(entity.y / TILE)}`)) {
      entity.target = null;
    }
    entity.moving = step > 0.1;
  }
}

function activateNearbyLever() {
  if (!nearbyLever || nearbyLever.active) {
    showMessage("Move closer to a lever.");
    return;
  }
  nearbyLever.active = true;
  nearbyLever.handle.rotation.z = 1.05;
  relaysFound += 1;
  relayCount.textContent = String(relaysFound);
  showMessage(relaysFound === relays.length
    ? "All three levers are set. The service lift is open."
    : "Lever engaged. The sound carries down the halls.");
  if (relaysFound === relays.length) unlockElevator();
}

function updateGame(deltaTime) {
  if (state === "ending") {
    updateEndingCutscene(deltaTime);
    return;
  }
  if (state !== "playing") return;
  const sprinting = updatePlayer(deltaTime);
  if (isInPit(player.x, player.y) && !isOnPitBeam(player.x, player.y)) {
    endGame(false, "pit");
    return;
  }
  updateEntity(deltaTime, sprinting);

  nearbyLever = relays.find((lever) =>
    !lever.active && Math.hypot(player.x - lever.x, player.y - lever.y) < 54
  ) ?? null;
  interactionPrompt.hidden = !nearbyLever;
  if (interactionRequested) {
    interactionRequested = false;
    activateNearbyLever();
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

  if (entity.visible && distanceToEntity < player.radius + entity.radius - 1) {
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
  camera.position.set(
    player.x + Math.sin(player.walkPhase) * player.bobAmount * 0.12,
    eyeHeight + Math.sin(player.walkPhase * 2) * player.bobAmount,
    player.y,
  );
  camera.lookAt(
    player.x + Math.cos(player.yaw) * pitchCos * 100,
    eyeHeight + Math.sin(player.pitch) * 100,
    player.y + Math.sin(player.yaw) * pitchCos * 100,
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
  entityModel.walkPhase += elapsed * (5.4 + movementSpeed * 0.025) * Math.max(walkAmount, 0.12);

  const stride = Math.sin(entityModel.walkPhase);
  const bob = walkAmount * Math.abs(Math.sin(entityModel.walkPhase * 2)) * 1.1 +
    (1 - walkAmount) * Math.sin(time * 1.3) * 0.15;
  entityModel.root.position.set(entity.x, bob, entity.y);
  if (entity.target) {
    entityModel.root.rotation.y = Math.atan2(entity.target.x - entity.x, entity.target.y - entity.y);
  }
  const threat = entity.alertTimer > 0 ? 1 : 0;
  entityModel.torso.rotation.z = Math.sin(time * 1.3) * 0.035 + stride * 0.1 * walkAmount;
  entityModel.torso.rotation.x = 0.1 + Math.cos(entityModel.walkPhase) * 0.08 * walkAmount;
  entityModel.head.rotation.z = Math.sin(time * (threat ? 6.5 : 1.25)) * (threat ? 0.11 : 0.035) -
    stride * 0.06 * walkAmount;
  entityModel.head.rotation.x = 0.08 + Math.sin(entityModel.walkPhase + 0.5) * 0.08 * walkAmount +
    threat * (0.12 + Math.sin(time * 3.2) * 0.12);
  entityModel.head.rotation.y = Math.sin(time * (threat ? 7.5 : 1.1)) * (threat ? 0.24 : 0.055);
  entityModel.jaw.rotation.x = -0.08 - (Math.sin(time * (threat ? 8.5 : 2.4)) + 1) * 0.12;
  entityModel.limbs.forEach((limb, index) => {
    const phaseOffset = index % 2 === 1 ? Math.PI : 0;
    const strideAmount = index < 2 ? 0.42 : 0.7;
    limb.rotation.x = Math.sin(entityModel.walkPhase + phaseOffset) * strideAmount * walkAmount;
    limb.rotation.z = (index % 2 === 0 ? -1 : 1) * 0.08 +
      Math.sin(entityModel.walkPhase + phaseOffset) * 0.1 * walkAmount;
  });
  entityModel.spines.forEach((spine, index) => {
    spine.rotation.z = (index - 2) * 0.22 + Math.sin(time * 2.1 + index) * 0.035;
  });
}

function animateLights(time) {
  relays.forEach((relay, index) => {
    if (relay.handle) relay.handle.rotation.x = Math.sin(time * 1.6 + index) * 0.025;
  });
  const viewDirection = camera.getWorldDirection(new THREE.Vector3());
  const toFlare = new THREE.Vector3();
  lightFlares.forEach(({ sprite, material }) => {
    toFlare.copy(sprite.position).sub(camera.position);
    const distance = toFlare.length();
    const alignment = viewDirection.dot(toFlare.normalize());
    const glare = THREE.MathUtils.smoothstep(alignment, 0.78, 0.98);
    const distanceFade = THREE.MathUtils.clamp(1 - distance / 1500, 0, 1);
    sprite.visible = distance < 1800 && alignment > 0.72;
    material.opacity = glare * distanceFade * 0.95;
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
  if (key === "t" && !event.repeat && state === "playing") {
    player.x = elevatorRoomCenter.x;
    player.y = elevatorRoomCenter.y - TILE;
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
  if (key === "e" && !event.repeat && state === "playing") interactionRequested = true;
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
document.querySelector("[data-action='interact']")?.addEventListener("click", () => {
  if (state === "playing") interactionRequested = true;
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
