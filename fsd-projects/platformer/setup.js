// setup variables
const walkAcceleration = 2.5; // how much is added to the speed each frame
const gravity = 0.5; // how much is subtracted from speedY each frame
const friction = 1.5; // how much the player is slowed each frame
const maxSpeed = 8; // maximum horizontal speed, not vertical
const playerJumpStrength = 12; // this is subtracted from the speedY each jump
const projectileSpeed = 8; // the speed of projectiles
let shouldDrawGrid = false;
let gridMade = false;
let levelIntro = null;
let levelMusic = null;
let audioUnlockAttached = false;

function unlockLevelAudio() {
  if (!levelMusic) {
    return;
  }

  const playPromise = levelMusic.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function attachAudioUnlockHandlers() {
  if (audioUnlockAttached) {
    return;
  }

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, unlockLevelAudio, { once: true });
  });

  audioUnlockAttached = true;
}

function setupLevelMusic() {
  const techTrack = "../../audio/Animal_Company_OST_Tech_Tree_2.mp3";

  if (!levelMusic) {
    levelMusic = new Audio(techTrack);
    levelMusic.loop = true;
    levelMusic.volume = 0.5;
    levelMusic.preload = "auto";
    attachAudioUnlockHandlers();
  }

  levelMusic.src = techTrack;
  levelMusic.load();
  levelMusic.currentTime = 2;
  unlockLevelAudio();
}

function getLevelTitle() {
  return {
    number: "LEVEL 1",
    title: "The Ruins",
  };
}

function startLevelIntro() {
  levelIntro = {
    ...getLevelTitle(),
    startTime: performance.now(),
    duration: 1800,
  };
}

function clearLevelObjects() {
  platforms.length = 0;
  fakePlatforms.length = 0;
  badPlatforms.length = 0;
  cannons.length = 0;
  projectiles.length = 0;
  collectables.length = 0;
}

function resetPlayerForLevel() {
  player.x = 50;
  player.y = 100;
  player.speedX = 0;
  player.speedY = 0;
  player.onGround = false;
  player.deadAndDeathAnimationDone = false;
  player.winConditionMet = false;
  currentAnimationType = animationTypes.run;
  frameIndex = 0;
}

function createLevel() {
  clearLevelObjects();
  resetPlayerForLevel();
  setupLevelMusic();
  startLevelIntro();

  createPlatform(
    -50,
    canvas.height - 90,
    canvas.width + 100,
    200,
    "rgb(59, 54, 54)",
  );
  createPlatform(500, 500, 700, 290);
  createPlatform(350, 600, 50, 50, "blue");
  createPlatform(100, 180, 100, 20, "lime");
  createPlatform(1000, 400, 100, 20);
  createPlatform(700, 350, 100, 20);
  createPlatform(990, 210, 100, 20);
  createPlatform(1200, 150, 100, 20);
  createPlatform(500, 250, 100, 20);
  createPlatform(300, 200, 100, 20);

  createCollectable("diamond", 200, 170, 0.5, 0.7);
  createCollectable("diamond", 530, 100, 0.5, 0.7);
  createCollectable("diamond", 1015, 300, 0.5, 0.7);
  createCollectable("diamond", 115, 100, 0.5, 0.7);

  createCannon("bottom", 200, 900);
  createCannon("right", 400, 1400);
}

/////////////////////////////////////////////////
//////////ONLY CHANGE ABOVE THIS POINT///////////
/////////////////////////////////////////////////

// Base game variables
const frameRate = 60;
const playerScale = 0.8; //makes the player just a bit smaller. Doesn't affect the hitbox, just the image

// Player variables
const player = {
  x: 50,
  y: 100,
  speedX: 0,
  speedY: 0,
  width: undefined,
  height: undefined,
  onGround: false,
  facingRight: true,
  deadAndDeathAnimationDone: false,
  winConditionMet: false,
};

let hitDx;
let hitDy;
let hitBoxWidth = 50 * playerScale;
let hitBoxHeight = 105 * playerScale;
let firstTimeSetup = true;

const keyPress = {
  any: false,
  up: false,
  left: false,
  down: false,
  right: false,
  space: false,
};

// Player animation variables
const animationTypes = {
  duck: "duck",
  flyingJump: "flying-jump",
  frontDeath: "front-death",
  frontIdle: "front-idle",
  jump: "jump",
  lazer: "lazer",
  run: "run",
  stop: "stop",
  walk: "walk",
};
let currentAnimationType = animationTypes.run;
let frameIndex = 0;
let jumpTimer = 0;
let duckTimer = 0;
let DUCK_COUNTER_IDLE_VALUE = 14;
let debugVar = false;

let spriteHeight = 0;
let spriteWidth = 0;
let spriteX = 0;
let spriteY = 0;
let offsetX = 0;
let offsetY = 0;

// Platform, cannon, projectile, and collectable variables
let platforms = [];
let fakePlatforms = [];
let badPlatforms = [];
let cannons = [];
const cannonWidth = 118;
const cannonHeight = 80;
let projectiles = [];
const defaultProjectileWidth = 24;
const defaultProjectileHeight = defaultProjectileWidth;
const collectableWidth = 40;
const collectableHeight = 40;
let collectables = [];

// canvas and context variables; must be initialized later
let canvas;
let ctx;

// setup function variable
let setup;

let halleImage;
let animationDetails = {};

var collectableList = {
  database: { image: "images/collectables/database.png" },
  diamond: { image: "images/collectables/diamond-head.png" },
  grace: { image: "images/collectables/grace-head.png" },
  kennedi: { image: "images/collectables/kennedi-head.png" },
  max: { image: "images/collectables/max-head.png" },
  steve: { image: "images/collectables/steve-head.png" },
};
