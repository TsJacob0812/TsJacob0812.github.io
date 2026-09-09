///// DO NOT CHANGE ANYTHING IN THIS FILE /////

///////////////////////////////////////////////
// Core functionality /////////////////////////
///////////////////////////////////////////////
function registerSetup(setup) {
  setupGame = setup;
}

function main() {
  ctx.clearRect(0, 0, 1400, 750); //erase the screen so you can draw everything in it's most current position
  drawGreekBackground();
  drawLevelIntroOverlay();

  if (shouldDrawGrid) {
    makeGrid();
  }

  if (player.deadAndDeathAnimationDone) {
    deathOfPlayer();
    return;
  }

  if (player.winConditionMet) {
    winGame();
    return;
  }

  drawPlatforms();
  drawFakePlatforms();
  drawBadPlatforms();
  drawProjectiles();
  drawCannons();
  drawCollectables();
  playerFrictionAndGravity();

  player.x += player.speedX;
  player.y += player.speedY;

  collision(); //checks if the player will collide with something in this frame
  keyboardControlActions(); //keyboard controls.
  projectileCollision(); //checks if the player is getting hit by a projectile in the next frame
  badPlatformCollision(); //checks if the player is touching a bad platform
  collectablesCollide(); //checks if player has touched a collectable

  animate(); //this changes halle's picture to the next frame so it looks animated.
  // debug()                   //debugging values. Comment this out when not debugging.
  drawRobot(); //this actually displays the image of the robot.
}

function drawLevelIntroOverlay() {
  if (!levelIntro) {
    return;
  }

  const elapsed = performance.now() - levelIntro.startTime;
  const total = levelIntro.duration;
  const fadeIn = Math.min(elapsed / 220, 1);
  const fadeOut = Math.max(0, 1 - Math.max(0, elapsed - 1200) / 600);
  const alpha = Math.min(fadeIn, fadeOut);

  if (alpha <= 0) {
    levelIntro = null;
    return;
  }

  ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
  ctx.font = "700 34px serif";
  ctx.fillText(levelIntro.number, canvas.width / 2, canvas.height / 2 - 28);

  ctx.font = "900 72px serif";
  ctx.fillText(levelIntro.title, canvas.width / 2, canvas.height / 2 + 52);

  if (elapsed >= total) {
    levelIntro = null;
  }
}

function drawGreekBackground() {
  var sky = ctx.createLinearGradient(0, 0, 0, canvas.height);

  if (currentLevel === 1) {
    sky.addColorStop(0, "#171b4a");
    sky.addColorStop(0.52, "#7d4d78");
    sky.addColorStop(1, "#e0a05b");
  } else if (currentLevel === 2) {
    sky.addColorStop(0, "#ff5c4d");
    sky.addColorStop(0.5, "#ff3d35");
    sky.addColorStop(1, "#c91f1f");
  } else {
    sky.addColorStop(0, "#171b4a");
    sky.addColorStop(0.52, "#7d4d78");
    sky.addColorStop(1, "#e0a05b");
  }

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (currentLevel === 2) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 170, 160, 0.18)";
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(180, 70);
    ctx.lineTo(320, 130);
    ctx.lineTo(520, 80);
    ctx.lineTo(700, 150);
    ctx.lineTo(910, 90);
    ctx.lineTo(1120, 160);
    ctx.lineTo(1400, 100);
    ctx.lineTo(1400, 300);
    ctx.lineTo(0, 300);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(120, 20, 20, 0.28)";
    [80, 260, 480, 710, 980, 1160, 1320].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 220 + (x % 60), 90, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(255, 220, 220, 0.12)";
    for (let i = 0; i < 9; i += 1) {
      const w = 200 + i * 35;
      const h = 70 + (i % 3) * 16;
      const x = i * 170;
      const y = 80 + (i % 4) * 35;
      ctx.fillRect(x, y, w, h);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffe9a6";
  ctx.beginPath();
  ctx.arc(canvas.width * 0.78, 125, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fff0a8";
  ctx.beginPath();
  ctx.arc(canvas.width * 0.78, 125, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 239, 201, 0.28)";
  ctx.beginPath();
  ctx.ellipse(190, 130, 150, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(440, 215, 190, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(1080, 245, 220, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(36, 30, 63, 0.58)";
  ctx.beginPath();
  ctx.moveTo(0, 390);
  ctx.lineTo(170, 255);
  ctx.lineTo(330, 390);
  ctx.lineTo(470, 270);
  ctx.lineTo(640, 390);
  ctx.lineTo(810, 245);
  ctx.lineTo(1000, 390);
  ctx.lineTo(1160, 275);
  ctx.lineTo(1400, 390);
  ctx.lineTo(1400, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(238, 204, 145, 0.62)";
  ctx.fillRect(1020, 325, 300, 18);
  ctx.fillRect(1040, 305, 260, 18);
  ctx.fillRect(1060, 285, 220, 18);
  ctx.fillRect(1080, 265, 180, 18);
  ctx.fillRect(1100, 245, 140, 18);
  ctx.fillRect(1120, 225, 100, 18);

  ctx.fillStyle = "rgba(255, 224, 157, 0.72)";
  [1045, 1110, 1175, 1240].forEach(function (columnX) {
    ctx.fillRect(columnX, 345, 22, 145);
    ctx.fillRect(columnX - 7, 338, 36, 8);
    ctx.fillRect(columnX - 7, 488, 36, 8);
  });
  ctx.fillStyle = "rgba(20, 18, 48, 0.42)";
  ctx.beginPath();
  ctx.moveTo(0, 505);
  ctx.quadraticCurveTo(350, 450, 700, 510);
  ctx.quadraticCurveTo(1050, 570, 1400, 500);
  ctx.lineTo(1400, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getJSON(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "json";
  xhr.onload = function () {
    var status = xhr.status;
    if (status === 200) {
      callback(null, xhr.response);
      setupGame();
    } else {
      callback(status, xhr.response);
    }
  };
  xhr.send();
}

function JsonFunction(status, response) {
  /*
      diagram of the json
      top level is the name of the animation
      also don't you dare complain, this is operation sparks fault for making the animation so complicated.
      animation name{
          coordinates{
              sx: xpadding,
              sy: ypadding,
              width: cords.swidth,
              height: cords.sheight,
              hitWidth: 50, //cords.width,
              hitHeight: 105,//cords.height,
              hitDx: 0,
              hitDy: 0,
              xoffset: xoffset,
              yoffset: yoffset,
          }
          maxHeight: largest size the sprite can be
          maxWidth: 
      }
    */
  animationDetails = response;
}

///////////////////////////////////////////////
// Helper functions ///////////////////////////
///////////////////////////////////////////////

function changeAnimationType() {
  if (currentAnimationType === animationTypes.frontDeath) {
    if (
      frameIndex >= animationDetails[currentAnimationType].coordinates.length
    ) {
      player.deadAndDeathAnimationDone = true;
    }
    return;
  }
  if (jumpTimer > 0 && !player.onGround) {
    currentAnimationType = animationTypes.jump;
    jumpTimer--;
  } else {
    jumpTimer = 0;
    if (Math.abs(player.speedX) > 0) {
      //if you're moving then change animation to walking or running
      if (keyPress.left || keyPress.right) {
        currentAnimationType = animationTypes.run;
      } else {
        currentAnimationType = animationTypes.walk;
      }
    } else if (player.onGround) {
      if (keyPress.down) {
        currentAnimationType = animationTypes.duck;
        if (duckTimer < DUCK_COUNTER_IDLE_VALUE) {
          // not using index 0 because the animation is too slow then
          frameIndex = 3;
          duckTimer = DUCK_COUNTER_IDLE_VALUE * 2 - frameIndex;
        }
      } else if (
        duckTimer === 0 ||
        currentAnimationType === animationTypes.walk
      ) {
        currentAnimationType = animationTypes.frontIdle;
      }
    }
  }
}

function debug() {
  debugVar = true;

  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText
  ctx.fillText("xs" + player.speedX + " x: " + player.x, 500, 200);
  ctx.fillText("ys" + player.speedY + " y: " + player.y, 500, 250);

  ctx.fillStyle = "black";
  ctx.fillText("on ground " + player.onGround, 150 + player.x, player.y - 20);
  ctx.fillText("hitx" + hitDx, 150 + player.x, player.y);
  ctx.fillText("hity" + hitDy, 150 + player.x, player.y + 20);
  ctx.fillText("offsetx" + offsetX, 150 + player.x, player.y + 40);
  ctx.fillText("offsetY" + offsetY, 150 + player.x, player.y + 60);

  ctx.fillStyle = "grey";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  //debug showing collision
  ctx.fillStyle = "yellow";
  ctx.fillRect(500, 100, 50, 50);

  ctx.fillStyle = "green";
  ctx.fillRect(player.x, player.y, hitBoxWidth, hitBoxHeight);

  if (collision() !== undefined) {
    ctx.fillStyle = "yellow";
    ctx.fillRect(player.x, player.y - 50, 10, 10);
  }
}

function animate() {
  if (
    !(
      keyPress.down &&
      duckTimer === DUCK_COUNTER_IDLE_VALUE &&
      currentAnimationType === animationTypes.duck
    )
  ) {
    frameIndex = frameIndex + 15 / frameRate;
    if (duckTimer > 0) {
      duckTimer -= 0.25;
    }
  }
  changeAnimationType();
  if (frameIndex >= animationDetails[currentAnimationType].coordinates.length) {
    frameIndex = 0;
  }
  spriteX =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .sx;
  spriteY =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .sy;
  spriteWidth =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .width;
  spriteHeight =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .height;
  maxWidth = animationDetails[currentAnimationType].maxWidth * playerScale;
  maxHeight = animationDetails[currentAnimationType].maxHeight * playerScale;
  offsetX =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .xoffset * playerScale;
  offsetY =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .yoffset * playerScale;
  player.width =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .width * playerScale;
  player.height =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .height * playerScale;
  hitDx =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .hitDx * playerScale;
  hitDy =
    animationDetails[currentAnimationType].coordinates[Math.floor(frameIndex)]
      .hitDy * playerScale;
}

function drawRobot() {
  if (player.deadAndDeathAnimationDone) {
    return;
  }

  drawGreekGoddess(
    player.x - hitDx,
    player.y - hitDy,
    player.width,
    player.height,
    player.facingRight,
  );
}

function drawGreekGoddess(x, y, width, height, facingRight) {
  var centerX = x + width / 2;
  var headY = y + height * 0.2;
  var shoulderY = y + height * 0.39;
  var dressBottom = y + height * 0.94;

  ctx.save();
  if (!facingRight) {
    ctx.translate(centerX * 2, 0);
    ctx.scale(-1, 1);
  }

  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "#ffe27a";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#ffe27a";
  ctx.shadowBlur = 13;
  ctx.beginPath();
  ctx.arc(centerX, headY, width * 0.29, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#54263c";
  ctx.beginPath();
  ctx.moveTo(x + width * 0.28, shoulderY);
  ctx.lineTo(x + width * 0.03, dressBottom);
  ctx.lineTo(x + width * 0.35, y + height * 0.82);
  ctx.lineTo(x + width * 0.57, shoulderY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f1c39b";
  ctx.beginPath();
  ctx.arc(centerX, headY, width * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3a1e2a";
  ctx.beginPath();
  ctx.arc(centerX, headY, width * 0.2, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d9a52e";
  ctx.strokeStyle = "#ffe48a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - width * 0.2, headY - height * 0.1);
  ctx.quadraticCurveTo(
    centerX,
    headY - height * 0.17,
    centerX + width * 0.2,
    headY - height * 0.1,
  );
  ctx.lineTo(centerX + width * 0.16, headY - height * 0.03);
  ctx.quadraticCurveTo(
    centerX,
    headY - height * 0.09,
    centerX - width * 0.16,
    headY - height * 0.03,
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff8df";
  ctx.strokeStyle = "#d9a52e";
  ctx.beginPath();
  ctx.moveTo(centerX - width * 0.17, shoulderY);
  ctx.lineTo(centerX + width * 0.16, shoulderY);
  ctx.lineTo(centerX + width * 0.28, dressBottom);
  ctx.lineTo(centerX - width * 0.3, dressBottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#f1c39b";
  ctx.lineWidth = Math.max(3, width * 0.08);
  ctx.beginPath();
  ctx.moveTo(centerX - width * 0.15, shoulderY);
  ctx.lineTo(x + width * 0.02, y + height * 0.61);
  ctx.moveTo(centerX + width * 0.15, shoulderY);
  ctx.lineTo(x + width * 0.79, y + height * 0.57);
  ctx.stroke();

  ctx.strokeStyle = "#b17b25";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - width * 0.12, dressBottom);
  ctx.lineTo(centerX - width * 0.15, y + height);
  ctx.moveTo(centerX + width * 0.12, dressBottom);
  ctx.lineTo(centerX + width * 0.16, y + height);
  ctx.stroke();

  ctx.strokeStyle = "#ffe27a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.8, y + height * 0.2);
  ctx.lineTo(x + width * 0.88, y + height * 0.3);
  ctx.lineTo(x + width * 0.82, y + height * 0.4);
  ctx.stroke();
  ctx.restore();
}

function collision() {
  player.onGround = false; // Reset this every frame; if the player is actually on the ground, the resolveCollision function will set it to true
  var result = undefined;
  for (var i = 0; i < platforms.length; i++) {
    // Check for collision
    if (
      player.x + hitBoxWidth > platforms[i].x &&
      player.x < platforms[i].x + platforms[i].width &&
      player.y < platforms[i].y + platforms[i].height &&
      player.y + hitBoxHeight > platforms[i].y
    ) {
      //now that we know we have collided, we figure out the direction of collision
      result = resolveCollision(
        platforms[i].x,
        platforms[i].y,
        platforms[i].width,
        platforms[i].height,
      );
    }
  }
  return result;
}

function resolveCollision(objx, objy, objw, objh) {
  //this is the return value
  let collisionDirection = "";
  //found here https://stackoverflow.com/questions/38648693/resolve-collision-of-two-2d-elements
  //first we find the distance between the center of the object and the player
  let dx = player.x + hitBoxWidth / 2 - (objx + objw / 2);
  let dy = player.y + hitBoxHeight / 2 - (objy + objh / 2);

  //get half-widths of each item
  let halfWidth = hitBoxWidth / 2 + objw / 2;
  let halfHeight = hitBoxHeight / 2 + objh / 2;

  // if the x and y vector are less than the half width or half height,
  // then we must be inside the object, causing a collision
  let originx = halfWidth - Math.abs(dx);
  let originy = halfHeight - Math.abs(dy);

  if (debugVar) {
    //debug
    ctx.strokeStyle = "blue";
    ctx.beginPath();
    ctx.moveTo(objx + dx, objy);
    ctx.lineTo(objx, objy);
    ctx.lineTo(objx, objy + dy);
    ctx.stroke();
    ctx.fillStyle = "rbga(252,186,3,.3)";
    ctx.fillRect(player.x, player.y, hitBoxWidth, hitBoxHeight);
  }

  if (originx >= originy) {
    if (dy > 0) {
      //bottom collision
      collisionDirection = "bottom";
      player.y = player.y + originy + 1;
      player.speedY = 0;
    } else {
      //top collision
      collisionDirection = "top";
      player.y = player.y - originy;
      player.speedY = 0;
      player.onGround = true;
    }
  } else {
    if (dx > 0) {
      //left collision
      collisionDirection = "left";
      player.x = player.x + originx;
      player.speedX = 0;
    } else {
      //right collision
      collisionDirection = "right";
      player.x = player.x - originx;
      player.speedX = 0;
    }
  }

  return collisionDirection;
}

function projectileCollision() {
  //checking if the player is dead
  if (currentAnimationType === animationTypes.frontDeath) {
    return;
  }

  for (var i = 0; i < projectiles.length; i++) {
    //this deletes any projectiles that go off the screen
    if (
      projectiles[i].x > canvas.width + 100 + projectiles[i].width ||
      projectiles[i].x < -100 - projectiles[i].width ||
      projectiles[i].y > canvas.height + 100 + projectiles[i].height ||
      projectiles[i].y < -100 - projectiles[i].height
    ) {
      projectiles.splice(i, 1);
    }

    if (i === projectiles.length) {
      return;
    }

    //collision with the player
    if (
      projectiles[i].x < player.x + hitBoxWidth &&
      projectiles[i].x + projectiles[i].width > player.x &&
      projectiles[i].y < player.y + hitBoxHeight &&
      projectiles[i].y + projectiles[i].height > player.y
    ) {
      currentAnimationType = animationTypes.frontDeath;
      frameIndex = 0;
    }
  }
}

function badPlatformCollision() {
  if (currentAnimationType === animationTypes.frontDeath) {
    return;
  }
  for (var i = 0; i < badPlatforms.length; i++) {
    if (
      player.x + hitBoxWidth > badPlatforms[i].x &&
      player.x < badPlatforms[i].x + badPlatforms[i].width &&
      player.y < badPlatforms[i].y + badPlatforms[i].height &&
      player.y + hitBoxHeight > badPlatforms[i].y
    ) {
      currentAnimationType = animationTypes.frontDeath;
      frameIndex = 0;
    }
  }
}

function deathOfPlayer() {
  const panelX = canvas.width / 2 - 260;
  const panelY = canvas.height / 2 - 160;
  const panelWidth = 520;
  const panelHeight = 250;

  ctx.fillStyle = "rgba(15, 8, 8, 0.78)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "rgba(255, 90, 90, 0.9)";
  ctx.lineWidth = 4;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f7d7d7";
  ctx.font = "900 62px serif";
  ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2 - 22);

  ctx.font = "500 28px serif";
  ctx.fillStyle = "#f0c7c7";
  ctx.fillText(
    "The dungeon got the better of you.",
    canvas.width / 2,
    canvas.height / 2 + 26,
  );

  ctx.font = "700 26px serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    "Press any key to try again",
    canvas.width / 2,
    canvas.height / 2 + 90,
  );

  if (keyPress.any) {
    keyPress.any = false;
    window.location.reload();
  }
}

function playerFrictionAndGravity() {
  //max speed limiter for ground
  if (player.speedX > maxSpeed) {
    player.speedX = maxSpeed;
  } else if (player.speedX < -maxSpeed) {
    player.speedX = -maxSpeed;
  }
  //friction
  if (Math.abs(player.speedX) < 1) {
    //this makes sure that the player actually stops when the speed gets low enough
    //otherwise if you just always reduce speed it will just end up jiggling
    player.speedX = 0;
  } else if (player.speedX > 0) {
    player.speedX = player.speedX - friction;
  } else {
    player.speedX = player.speedX + friction;
  }

  if (player.onGround === false) {
    player.speedY = player.speedY + gravity;
  }
}

function drawPlatforms() {
  for (var i = 0; i < platforms.length; i++) {
    // Check if platform should move horizontally
    if (platforms[i].minX !== null && platforms[i].maxX !== null) {
      // Move platform based on speed and direction
      platforms[i].x += platforms[i].speedX * platforms[i].directionX;

      // Reverse direction if platform reaches minX or maxX bounds
      if (platforms[i].x < platforms[i].minX) {
        platforms[i].x = platforms[i].minX;
        platforms[i].directionX *= -1; // Change direction to right
      } else if (platforms[i].x > platforms[i].maxX) {
        platforms[i].x = platforms[i].maxX;
        platforms[i].directionX *= -1; // Change direction to left
      }
    }

    // Check if platform should move vertically
    if (platforms[i].minY !== null && platforms[i].maxY !== null) {
      // Move platform based on speed and direction
      platforms[i].y += platforms[i].speedY * platforms[i].directionY;
      // Reverse direction if platform reaches minY or maxY bounds
      if (platforms[i].y < platforms[i].minY) {
        platforms[i].y = platforms[i].minY;
        platforms[i].directionY *= -1; // Change direction to down
      } else if (platforms[i].y > platforms[i].maxY) {
        platforms[i].y = platforms[i].maxY;
        platforms[i].directionY *= -1; // Change direction to up
      }
    }

    // Draw the platform
    const { color, x, y, width, height } = platforms[i];
    if (color === "lime") {
      drawCheckeredPlatform(x, y, width, height);
    } else if (color === "blue") {
      drawStool(x, y, width, height);
    } else if (color === "grey") {
      drawConcretePlatform(x, y, width, height);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    }
  }
}

function drawCheckeredPlatform(x, y, width, height) {
  var tileSize = 10;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#000000";
  for (var tileY = 0; tileY < height; tileY += tileSize) {
    for (var tileX = 0; tileX < width; tileX += tileSize) {
      if ((tileX / tileSize + tileY / tileSize) % 2 === 0) {
        ctx.fillRect(
          x + tileX,
          y + tileY,
          Math.min(tileSize, width - tileX),
          Math.min(tileSize, height - tileY),
        );
      }
    }
  }
}

function drawConcretePlatform(x, y, width, height) {
  var radius = Math.min(7, width / 2, height / 2);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = "#777b7d";
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = "rgba(220, 224, 222, 0.35)";
  for (var fleckY = y + 5; fleckY < y + height; fleckY += 13) {
    for (var fleckX = x + 7; fleckX < x + width; fleckX += 17) {
      ctx.fillRect(fleckX, fleckY, 3, 2);
    }
  }
  ctx.strokeStyle = "rgba(35, 38, 39, 0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.2, y);
  ctx.lineTo(x + width * 0.23, y + height * 0.45);
  ctx.lineTo(x + width * 0.18, y + height);
  ctx.moveTo(x + width * 0.72, y + height);
  ctx.lineTo(x + width * 0.68, y + height * 0.55);
  ctx.lineTo(x + width * 0.76, y + height * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawStool(x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.ellipse(
    x + width / 2,
    y + height - 1,
    width * 0.42,
    3,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.strokeStyle = "#102c5c";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + width * 0.28, y + 12);
  ctx.lineTo(x + width * 0.18, y + height - 2);
  ctx.moveTo(x + width * 0.72, y + 12);
  ctx.lineTo(x + width * 0.82, y + height - 2);
  ctx.stroke();
  ctx.strokeStyle = "#356ed1";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.25, y + height * 0.65);
  ctx.lineTo(x + width * 0.75, y + height * 0.65);
  ctx.stroke();
  ctx.fillStyle = "#2458b5";
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 2, width - 8, 12, 4);
  ctx.fill();
  ctx.fillStyle = "#5c95ed";
  ctx.fillRect(x + 8, y + 4, width - 16, 3);
  ctx.restore();
}

function drawFakePlatforms() {
  for (var i = 0; i < fakePlatforms.length; i++) {
    const { color, x, y, width, height } = fakePlatforms[i];
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }
}

function drawBadPlatforms() {
  for (var i = 0; i < badPlatforms.length; i++) {
    const { color, x, y, width, height } = badPlatforms[i];
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }
}

function toggleGrid() {
  shouldDrawGrid = true;
}

function makeGrid() {
  // vertical grid lines
  for (let i = 100; i < canvas.width; i += 100) {
    if (!gridMade) {
      createFakePlatform(i - 1, 35, 1, canvas.height);
    }
    // add text indicating x value at top of game
    ctx.font = "125% serif";
    ctx.fillStyle = "black";
    ctx.fillText(
      i, // text
      i - 15, // x location
      25, // y location
    );
  }

  // horizontal grid lines
  for (let i = 100; i < canvas.height; i += 100) {
    if (!gridMade) {
      createFakePlatform(45, i - 1, canvas.width, 1);
    }
    // add text indicating y value at left side of game
    ctx.font = "125% serif";
    ctx.fillText(
      i, // text
      10, // x location
      i + 5, // y location
    );
  }
  gridMade = true;
}

function drawProjectiles() {
  var time = Date.now();
  for (var i = 0; i < projectiles.length; i++) {
    var projectile = projectiles[i];
    var horizontal = projectile.speedX !== 0;
    var pulse = 0.7 + Math.sin(time / 90) * 0.3;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff2020";
    ctx.fillRect(
      projectile.x,
      projectile.y,
      projectile.width,
      projectile.height,
    );
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    if (horizontal) {
      ctx.fillRect(
        projectile.x,
        projectile.y + projectile.height * 0.35,
        projectile.width,
        projectile.height * 0.3,
      );
    } else {
      ctx.fillRect(
        projectile.x + projectile.width * 0.35,
        projectile.y,
        projectile.width * 0.3,
        projectile.height,
      );
    }
    ctx.restore();
    projectiles[i].x = projectiles[i].x + projectiles[i].speedX;
    projectiles[i].y = projectiles[i].y + projectiles[i].speedY;
  }
}

function drawCannons() {
  for (var i = 0; i < cannons.length; i++) {
    if (cannons[i].projectileCountdown >= cannons[i].timeBetweenShots) {
      cannons[i].projectileCountdown = 0;
      createProjectile(
        cannons[i].location,
        cannons[i].x,
        cannons[i].y,
        cannons[i].projectileWidth,
        cannons[i].projectileHeight,
      );
    } else {
      cannons[i].projectileCountdown = cannons[i].projectileCountdown + 1;
    }

    // move cannon if minX and maxX are set
    if (cannons[i].minX !== null && cannons[i].maxX !== null) {
      cannons[i].x += cannons[i].speedX;
      if (cannons[i].x < cannons[i].minX || cannons[i].x > cannons[i].maxX) {
        cannons[i].speedX *= -1;
      }
    }
    // move cannon if minY and maxY are set
    if (cannons[i].minY !== null && cannons[i].maxY !== null) {
      cannons[i].y += cannons[i].speedY;
      if (cannons[i].y < cannons[i].minY || cannons[i].y > cannons[i].maxY) {
        cannons[i].speedY *= -1;
      }
    }

    ctx.save(); //save the current translation of the screen.
    ctx.translate(cannons[i].x, cannons[i].y); //you are moving the top left of the screen to the pictures location, this is because you can't rotate the image, you have to rotate the whole page
    ctx.rotate((cannons[i].rotation * Math.PI) / 180); //then you rotate. rotation is centered on 0,0 on the canvas, which is why we moved the picture to 0,0 with translate(x,y)
    drawTempleCannon();
    //also the previous line uses -width / 2 so that the picture is centered. This will mean that (0,0) is at the exact center of the image
    ctx.translate(-cannons[i].x, -cannons[i].y); //the reverse of the previous translate, this moves the page back to the correct place so that the image is no longer at (0,0)
    ctx.restore(); //this unrotates the canvas so the canvas is straight, but now since you did that the picture looks rotated
  }
}

function drawTempleCannon() {
  var bronze = ctx.createLinearGradient(25, 0, 75, 0);
  bronze.addColorStop(0, "#5b2415");
  bronze.addColorStop(0.2, "#c97832");
  bronze.addColorStop(0.45, "#f0b45d");
  bronze.addColorStop(0.7, "#9d4e20");
  bronze.addColorStop(1, "#42180f");

  ctx.save();
  ctx.shadowColor = "rgba(20, 10, 20, 0.7)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = "#453044";
  ctx.beginPath();
  ctx.ellipse(48, 68, 43, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = "#80604e";
  ctx.beginPath();
  ctx.roundRect(13, 58, 70, 12, 5);
  ctx.fill();
  ctx.fillStyle = "#c9a07c";
  ctx.fillRect(17, 58, 62, 3);

  ctx.fillStyle = bronze;
  ctx.beginPath();
  ctx.ellipse(48, 51, 30, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f7cf7a";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = bronze;
  ctx.beginPath();
  ctx.roundRect(34, 5, 28, 48, 7);
  ctx.fill();
  ctx.strokeStyle = "#5a2114";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#2d1110";
  ctx.beginPath();
  ctx.ellipse(48, 6, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f7cf7a";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#f0b45d";
  ctx.fillRect(29, 17, 38, 5);
  ctx.fillRect(31, 39, 34, 5);
  ctx.strokeStyle = "#6f2d18";
  ctx.lineWidth = 1;
  ctx.strokeRect(29, 17, 38, 5);
  ctx.strokeRect(31, 39, 34, 5);

  ctx.strokeStyle = "#ffe29a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(39, 27);
  ctx.lineTo(44, 32);
  ctx.lineTo(39, 37);
  ctx.moveTo(57, 27);
  ctx.lineTo(52, 32);
  ctx.lineTo(57, 37);
  ctx.stroke();

  ctx.fillStyle = "#fff0ae";
  ctx.beginPath();
  ctx.arc(48, 51, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b2817";
  ctx.beginPath();
  ctx.arc(48, 51, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCollectables() {
  for (var i = 0; i < collectables.length; i++) {
    if (collectables[i].collected !== true) {
      //draw on screen if not collected
      if (collectables[i].type === "diamond") {
        drawGrapes(collectables[i].x, collectables[i].y, 1);
      } else {
        ctx.drawImage(
          collectables[i].image,
          collectables[i].x,
          collectables[i].y,
          collectableWidth,
          collectableHeight,
        );
      }
    } else {
      //draw the icons at the top if collected
      if (collectables[i].alpha > 0.4) {
        collectables[i].alpha = collectables[i].alpha - 0.007;
      }
      ctx.globalAlpha = collectables[i].alpha;
      if (collectables[i].type === "diamond") {
        drawGrapes(200 + 100 * i, 10, collectables[i].alpha);
      } else {
        ctx.drawImage(
          collectables[i].image,
          200 + 100 * i,
          10,
          collectableWidth,
          collectableHeight,
        );
      }
      ctx.globalAlpha = 1;
    }

    // Horizontal movement logic for collectables
    if (collectables[i].minX !== null && collectables[i].maxX !== null) {
      // Move collectable based on speed and direction
      collectables[i].x += collectables[i].speed * collectables[i].direction;

      // Reverse direction if collectable reaches minX or maxX bounds
      if (collectables[i].x < collectables[i].minX) {
        collectables[i].x = collectables[i].minX;
        collectables[i].direction *= -1; // Change direction to right
      } else if (collectables[i].x > collectables[i].maxX) {
        collectables[i].x = collectables[i].maxX;
        collectables[i].direction *= -1; // Change direction to left
      }
    }

    //gravity
    collectables[i].speedY = collectables[i].speedY + collectables[i].gravity;
    collectables[i].y = collectables[i].y + collectables[i].speedY;

    // Check for collision with platforms in order to bounce
    for (var j = 0; j < platforms.length; j++) {
      if (
        collectables[i].x + collectableWidth > platforms[j].x &&
        collectables[i].x < platforms[j].x + platforms[j].width &&
        collectables[i].y < platforms[j].y + platforms[j].height &&
        collectables[i].y + collectableHeight > platforms[j].y
      ) {
        //bottom of collectable is below top of platform
        collectables[i].y = collectables[i].y - collectables[i].speedY;
        collectables[i].speedY *= -collectables[i].bounce;
      }
    }
  }
}

function drawGrapes(x, y, alpha) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = "#4c8b35";
  ctx.beginPath();
  ctx.ellipse(x + 26, y + 10, 11, 6, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6f4aa8";
  var berries = [
    [24, 16],
    [32, 18],
    [19, 23],
    [27, 25],
    [35, 25],
    [15, 31],
    [23, 32],
    [31, 32],
    [19, 39],
    [27, 39],
    [23, 46],
  ];
  for (var i = 0; i < berries.length; i++) {
    ctx.beginPath();
    ctx.arc(x + berries[i][0], y + berries[i][1], 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(214, 190, 255, 0.7)";
  for (var j = 0; j < berries.length; j += 2) {
    ctx.beginPath();
    ctx.arc(
      x + berries[j][0] - 1.5,
      y + berries[j][1] - 1.5,
      1.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function collectablesCollide() {
  for (var i = 0; i < collectables.length; i++) {
    if (
      collectables[i].x + collectableWidth > player.x &&
      collectables[i].x < player.x + hitBoxWidth &&
      collectables[i].y < player.y + hitBoxHeight &&
      collectables[i].y + collectableHeight > player.y
    ) {
      collectables[i].collected = true;
      checkForWin();
    }
  }
}

function checkForWin() {
  if (collectables.length === 0) {
    return; // If there are no collectables, we can't win
  }
  for (var i = 0; i < collectables.length; i++) {
    if (collectables[i].collected !== true) {
      return; // If any collectable is not collected, we can't win yet
    }
  }
  player.winConditionMet = true; // Set win condition to true
}

function winGame() {
  if (currentLevel === 1) {
    ctx.fillStyle = "rgba(40, 0, 0, 0.7)";
    ctx.fillRect(
      canvas.width / 4,
      canvas.height / 6,
      canvas.width / 2,
      canvas.height / 2,
    );
    ctx.fillStyle = "white";
    ctx.font = "800% serif";
    ctx.fillText(
      "Level Clear!",
      canvas.width / 4,
      canvas.height / 6 + canvas.height / 5,
      (canvas.width / 16) * 14,
    );
    ctx.font = "500% serif";
    ctx.fillText(
      "Press any key for level 2",
      canvas.width / 4,
      canvas.height / 6 + canvas.height / 3,
      (canvas.width / 16) * 14,
    );
    if (keyPress.any) {
      keyPress.any = false;
      currentLevel = 2;
      createLevel(currentLevel);
      player.winConditionMet = false;
    }
    return;
  }

  ctx.fillStyle = "grey";
  ctx.fillRect(
    canvas.width / 4,
    canvas.height / 6,
    canvas.width / 2,
    canvas.height / 2,
  );
  ctx.fillStyle = "white";
  ctx.font = "800% serif";
  ctx.fillText(
    "You Win!",
    canvas.width / 4,
    canvas.height / 6 + canvas.height / 5,
    (canvas.width / 16) * 14,
  );
  ctx.font = "500% serif";
  ctx.fillText(
    "Hit any key to restart",
    canvas.width / 4,
    canvas.height / 6 + canvas.height / 3,
    (canvas.width / 16) * 14,
  );
  if (keyPress.any) {
    keyPress.any = false;
    window.location.reload();
  }
}

function createPlatform(
  x,
  y,
  width,
  height,
  color = "grey",
  minX = null,
  maxX = null,
  speedX = 1,
  minY = null,
  maxY = null,
  speedY = 1,
) {
  platforms.push({
    x,
    y,
    width,
    height,
    color,
    minX,
    maxX,
    speedX,
    minY,
    maxY,
    speedY,
    directionX: 1, // 1 for right, -1 for left
    directionY: 1, // 1 for down, -1 for up
  });
}

function createFakePlatform(x, y, width, height, color = "grey") {
  fakePlatforms.push({
    x,
    y,
    width,
    height,
    color,
  });
}

function createBadPlatform(x, y, width, height, color = "red") {
  badPlatforms.push({
    x,
    y,
    width,
    height,
    color,
  });
}

function createCannon(
  wallLocation,
  position,
  timeBetweenShots,
  width = defaultProjectileWidth,
  height = defaultProjectileHeight,
  minPos = null,
  maxPos = null,
  speed = 1,
) {
  if (wallLocation === "top") {
    cannons.push({
      x: position,
      y: cannonHeight,
      rotation: 180,
      projectileCountdown: 0,
      location: wallLocation,
      timeBetweenShots: timeBetweenShots / (1000 / frameRate),
      projectileWidth: width,
      projectileHeight: height,
      minX: minPos,
      maxX: maxPos,
      speedX: speed,
      minY: null,
      maxY: null,
      speedY: 0,
    });
  } else if (wallLocation === "bottom") {
    cannons.push({
      x: position,
      y: canvas.height - cannonHeight,
      rotation: 0,
      projectileCountdown: 0,
      location: wallLocation,
      timeBetweenShots: timeBetweenShots / (1000 / frameRate),
      projectileWidth: width,
      projectileHeight: height,
      minX: minPos,
      maxX: maxPos,
      speedX: speed,
      minY: null,
      maxY: null,
      speedY: 0,
    });
  } else if (wallLocation === "left") {
    cannons.push({
      x: cannonHeight,
      y: position,
      rotation: 90,
      projectileCountdown: 0,
      location: wallLocation,
      timeBetweenShots: timeBetweenShots / (1000 / frameRate),
      projectileWidth: width,
      projectileHeight: height,
      minX: null,
      maxX: null,
      speedX: 0,
      minY: minPos,
      maxY: maxPos,
      speedY: speed,
    });
  } else if (wallLocation === "right") {
    cannons.push({
      x: canvas.width - cannonHeight,
      y: position,
      rotation: 270,
      projectileCountdown: 0,
      location: wallLocation,
      timeBetweenShots: timeBetweenShots / (1000 / frameRate),
      projectileWidth: width,
      projectileHeight: height,
      minX: null,
      maxX: null,
      speedX: 0,
      minY: minPos,
      maxY: maxPos,
      speedY: speed,
    });
  }
}

function createCollectable(
  type,
  x,
  y,
  gravity = 0,
  bounce = 1,
  minX = null,
  maxX = null,
  speed = 1,
) {
  if (type !== "") {
    var image = document.createElement("img");
    image.src = collectableList[type].image;
    image.id = "image" + collectables.length;
    collectables.push({
      image,
      type,
      x,
      y,
      speedY: 0,
      collected: false,
      alpha: 2,
      gravity,
      bounce,
      minX,
      maxX,
      speed,
      direction: 1, // 1 for right, -1 for left
    });
  }
}

function createProjectile(wallLocation, x, y, width, height) {
  //checking if the player is dead
  if (currentAnimationType === animationTypes.frontDeath) {
    return;
  }

  if (wallLocation === "top") {
    projectiles.push({
      x: x - 71.5,
      y: y - 55 - height / 2,
      speedX: 0,
      speedY: projectileSpeed,
      width,
      height,
    });
  } else if (wallLocation === "bottom") {
    projectiles.push({
      x: x + 47,
      y: y + 50 + height / 2,
      speedX: 0,
      speedY: -projectileSpeed,
      width,
      height,
    });
  } else if (wallLocation === "left") {
    projectiles.push({
      x: x - 80 - width / 2,
      y: y + 46,
      speedX: projectileSpeed,
      speedY: 0,
      width,
      height,
    });
  } else if (wallLocation === "right") {
    projectiles.push({
      x: x + 40 + width / 2,
      y: y - 71.5,
      speedX: -projectileSpeed,
      speedY: 0,
      width,
      height,
    });
  }

  // putting this here instead of in every if
  projectiles[projectiles.length - 1].x -= (width - defaultProjectileWidth) / 2;
  projectiles[projectiles.length - 1].y -=
    (height - defaultProjectileHeight) / 2;
}

function keyboardControlActions() {
  keyPress.any = false; //keyboardHandler will set this to true if you press any key. Setting the variable to false here makes sure that key press dosen't stick around.
  //this is used for respawning; if you hit any key after you die this variable will be set to true and you will respawn.

  if (currentAnimationType === animationTypes.frontDeath) {
    return;
  }

  if (keyPress.left) {
    player.speedX -= walkAcceleration;
    player.facingRight = false;
  }
  if (keyPress.right) {
    player.speedX += walkAcceleration;
    player.facingRight = true;
  }
  if (keyPress.space || keyPress.up) {
    if (player.onGround) {
      //this only lets you jump if you are on the ground
      player.speedY = player.speedY - playerJumpStrength;
      jumpTimer = 19; //this counts how many frames to have the jump last.
      player.onGround = false; //bug fix for jump animation, you have to change this or the jump animation doesn't work
      frameIndex = 4;
    }
  }
}

function handleKeyDown(e) {
  if (player.deadAndDeathAnimationDone) {
    window.location.reload();
    return;
  }

  keyPress.any = true;
  if (e.key === "ArrowUp" || e.key === "w") {
    keyPress.up = true;
  }
  if (e.key === "ArrowLeft" || e.key === "a") {
    keyPress.left = true;
  }
  if (e.key === "ArrowDown" || e.key === "s") {
    keyPress.down = true;
  }
  if (e.key === "ArrowRight" || e.key === "d") {
    keyPress.right = true;
  }
  if (e.key === " ") {
    keyPress.space = true;
  }
}

function handleKeyUp(e) {
  if (e.key === "ArrowUp" || e.key === "w") {
    keyPress.up = false;
  }
  if (e.key === "ArrowLeft" || e.key === "a") {
    keyPress.left = false;
  }
  if (e.key === "ArrowDown" || e.key === "s") {
    keyPress.down = false;
    if (currentAnimationType === animationTypes.duck) {
      duckTimer = 8;
      frameIndex = 20;
    }
  }
  if (e.key === "ArrowRight" || e.key === "d") {
    keyPress.right = false;
  }
  if (e.key === " ") {
    keyPress.space = false;
  }
}

function loadJson() {
  getJSON("halle.json", JsonFunction); //runs this before the setup because of timing things
}
