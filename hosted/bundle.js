'use strict';

var id = void 0; // player's unique id
var color = void 0; // player's unique color
var socket = void 0; // player's socket
var players = {}; // object to hold player properties
var enemies = {}; // object of enemies in the room
var moveLeft = false; // left or a held
var moveRight = false; // right or d held
var moveUp = false; // up or w held
var moveDown = false; // down or s held
var gameStarted = false;
var ready = false;

//canvas
var canvas = void 0;
var ctx = void 0;
var canvasOffset = void 0;
var offsetX = void 0;
var offsetY = void 0;

// score
var score = 0;

//redraw canvas
var draw = function draw() {

  //if(gameStarted) {
  if (players[id].health > 0) {
    movePlayer(); // get player movement

    ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
    drawHUD();
    drawPlayers();
    drawEnemies();
  } else {
    ctx.font = '20px Verdana';
    ctx.textAlign = 'center';
    ctx.fillText('YOU DIED', canvas.width / 2, canvas.height / 2);
  }
  /*} else {
    ctx.clearRect(0, 0, canvas.width, canvas.height):
    drawReadyStates();
  }*/
  requestAnimationFrame(draw); // continue to draw updates
};

var drawHUD = function drawHUD() {
  var scoreStr = score.toString();
  while (scoreStr.length < 6) {
    scoreStr = '0' + scoreStr;
  }ctx.font = '20px Verdana';
  ctx.textAlign = 'center';
  ctx.fillText(scoreStr, canvas.width / 2, 30);
};

var drawReadyStates = function drawReadyStates() {
  var keys = Object.keys(players); // get all player id's
  var drawX = canvas.width / 2;
  var drawY = canvas.height / 2;

  // Iterate players
  for (var i = 0; i < keys.length; i++) {
    var player = players[keys[i]];

    if (!player.ready) ctx.fillStyle = 'red';else ctx.fillSyle = 'green';
    ctx.beginPath();
    ctx.arc(drawX, drawY, player.rad, 0, 2 * Math.PI);
    ctx.fill();

    var name = 'Player ' + i.toString();
    if (player.id = id) name = 'You';
    ctx.font = '20px Verdana';
    ctx.textAlign = 'left';
    ctx.fillText(name, drawX + (player.rad + 5), drawY);

    drawY += 30;
  }
};

// linear interpolation to jump percentages to new position
var lerp = function lerp(v0, v1, alpha) {
  return (1 - alpha) * v0 + alpha * v1;
};

// object to keep track of keys that are down
var keysDown = {};
// function to update player movement based on keys down.
var keyDownHandler = function keyDownHandler(e) {
  e = e || event;

  // If key isn't held check press commands
  if (!keysDown[e.keyCode]) {
    switch (e.keyCode) {
      case 82:
        // R
        /*if(!gameStarted) {
          ready = !ready;
          readyUp();
        }*/
        break;
      case 32:
        // space
        playAgain();
        break;
      default:
        break;
    }
  }

  keysDown[e.keyCode] = e.type == 'keydown'; // check if key is down

  //if(gameStarted) {
  moveLeft = keysDown[37] || keysDown[65]; // left or a held
  moveRight = keysDown[39] || keysDown[68]; // right or d held
  moveUp = keysDown[38] || keysDown[87]; // up or w held
  moveDown = keysDown[40] || keysDown[83]; // down or s held
  //}
};

// function to update position of initial arrow draw
var mouseDownHandler = function mouseDownHandler(e) {
  if (!players[id].attacking /*&& gameStarted*/) {
      players[id].attacking = true;
      players[id].mouseX = parseInt(e.clientX - offsetX);
      players[id].mouseY = parseInt(e.clientY - offsetY);
      setTimeout(endAttack, 100);
    }
};

var updateScore = function updateScore(serverScore) {
  score = serverScore;
};

var playAgain = function playAgain() {
  socket.emit('join', { width: canvas.width, height: canvas.height });
};

var handleResize = function handleResize() {
  console.log('handleResize');
  offsetX = canvas.offsetLeft;
  offsetY = canvas.offsetTop;
};

var startGame = function startGame() {
  gameStarted = true;
};

var updateReady = function updateReady(data) {
  if (!players[data.id]) players[data.id] = {};
  players[data.id].ready = data.ready;
};

// initialize scripts
var init = function init() {
  socket = io.connect();
  canvas = document.querySelector('#myCanvas');
  ctx = canvas.getContext('2d');

  offsetX = canvas.offsetLeft;
  offsetY = canvas.offsetTop;

  socket.on('connect', function () {
    socket.emit('join', { width: canvas.width, height: canvas.height });
  });

  socket.on('joined', setPlayer); // set player on server 'joined' event
  socket.on('updateMovement', updatePlayer); // update on server 'updateClient' event
  socket.on('updateEnemies', updateEnemies);
  socket.on('left', removePlayer); // remove player on server 'removePlayer' event
  socket.on('removeEnemy', removeEnemy); // remove enemy on server 'removeEnemy' event
  socket.on('updateScore', updateScore);
  socket.on('updateHealth', updateHealth);
  socket.on('updateReady', updateReady);
  socket.on('startGame', startGame);

  document.body.addEventListener('keydown', keyDownHandler);
  document.body.addEventListener('keyup', keyDownHandler);
  document.body.addEventListener('mousedown', mouseDownHandler);
  window.addEventListener('resize', handleResize);
};

window.onload = init;
'use strict';

var drawPlayers = function drawPlayers() {
  var keys = Object.keys(players); // get all player id's

  // Iterate players
  for (var i = 0; i < keys.length; i++) {
    var player = players[keys[i]];

    // keep animation running smoothly
    if (player.alpha < 1) player.alpha += 0.05;

    player.x = lerp(player.prevX, player.destX, player.alpha); // smooth transition with lerp
    player.y = lerp(player.prevY, player.destY, player.alpha);

    // draw player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.rad, 0, 2 * Math.PI);
    ctx.fillStyle = player.color;
    ctx.fill();

    // draw health
    var healthWidth = 50;
    var healthHeight = 5;
    ctx.fillStyle = 'red';
    ctx.fillRect(player.x - healthWidth / 2, player.y - 35, healthWidth, healthHeight);

    var remainingWidth = healthWidth * (player.health / 100);
    ctx.fillStyle = 'green';
    ctx.fillRect(player.x - healthWidth / 2, player.y - 35, remainingWidth, healthHeight);

    if (player.attacking) {
      // get angle of attack based on mouse click location
      var dx = player.mouseX - player.x;
      var dy = player.mouseY - player.y;
      var angle = Math.atan2(dy, dx);

      // draw attack
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(angle);
      var path = new Path2D();
      path.moveTo(50, 0);
      path.lineTo(0, 5);
      path.lineTo(0, -5);
      ctx.fillStyle = '#8c8c8c';
      ctx.fill(path);
      ctx.restore();
    }
  }
};

// update a player's health from server
var updateHealth = function updateHealth(data) {
  console.log('updateHealth');
  if (players[data.playerID]) players[data.playerID].health = data.health;
  if (players[id].health <= 0) socket.emit('leave');
};

// update a player from server
var updatePlayer = function updatePlayer(data) {
  // if the player is new, add them to players and return
  if (!players[data.id]) {
    players[data.id] = data;
    return;
  }

  // grab player object based on id
  var player = players[data.id];

  // return if player's last update is newer than this server data
  if (player.lastUpdate >= data.lastUpdate) {
    return;
  }

  //update positions to lerp between
  player.prevX = data.prevX;
  player.prevY = data.prevY;
  player.destX = data.destX;
  player.destY = data.destY;

  //update attack info
  player.attacking = data.attacking;
  player.mouseX = data.mouseX;
  player.mouseY = data.mouseY;

  // reset lerp percentage
  player.alpha = 0.05;
};

// remove player based on id
var removePlayer = function removePlayer(id) {
  console.log('player removed');
  if (players[id]) {
    delete players[id];
  }
};

// set this player from server
var setPlayer = function setPlayer(data) {
  id = data.id; // set id from server data
  color = data.color; // set color from server data
  players[id] = data; // set player with new id
  requestAnimationFrame(draw); // draw with new info
};

// signal ready to server
var readyUp = function readyUp() {
  socket.emit('ready', ready);
};

// function to update player position
var movePlayer = function movePlayer() {
  var player = players[id]; // get this player with their id
  player.prevX = player.x;
  player.prevY = player.y;

  var speed = 5; // how far to move

  if (moveLeft) {
    if (player.destX < 0) player.destX = 0;else player.destX -= speed;
  }
  if (moveRight) {
    if (player.destX > canvas.width) player.destX = canvas.width;else player.destX += speed;
  }
  if (moveUp) {
    if (player.destY < 0) player.destY = 0;else player.destY -= speed;
  }
  if (moveDown) {
    if (player.destY > canvas.height) player.destY = canvas.height;else player.destY += speed;
  }

  // reset alpha when moving to keep playing animation
  player.alpha = 0.05;

  // send movement to server
  socket.emit('move', player);
};

// end player attack so they can attack again
var endAttack = function endAttack() {
  players[id].attacking = false;
};
"use strict";

var lastUpdate = 0;
// update enemies from server
var updateEnemies = function updateEnemies(data) {
  if (data.lastUpdate > lastUpdate) {
    var enemyKeys = Object.keys(data.enemies);
    for (var i = 0; i < enemyKeys.length; i++) {
      // iterate enemies
      // add enemy if new
      if (!enemies[enemyKeys[i]]) enemies[enemyKeys[i]] = data.enemies[enemyKeys[i]];else {
        // else update enemy lerping data
        enemies[enemyKeys[i]].prevX = data.enemies[enemyKeys[i]].prevX;
        enemies[enemyKeys[i]].prevY = data.enemies[enemyKeys[i]].prevY;
        enemies[enemyKeys[i]].destX = data.enemies[enemyKeys[i]].destX;
        enemies[enemyKeys[i]].destY = data.enemies[enemyKeys[i]].destY;
        enemies[enemyKeys[i]].alpha = 0.05;
      }
    }

    lastUpdate = data.lastUpdate;
  }
};

// draw enemies
var drawEnemies = function drawEnemies() {
  var keys = Object.keys(enemies); // get all enemy id's
  // Iterate enemies
  for (var i = 0; i < keys.length; i++) {
    var enemy = enemies[keys[i]];

    // keep animation running smoothly
    if (enemy.alpha < 1) enemy.alpha += 0.05;

    enemy.x = lerp(enemy.prevX, enemy.destX, enemy.alpha); // smooth transition with lerp
    enemy.y = lerp(enemy.prevY, enemy.destY, enemy.alpha);

    // draw enemy
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.rad, 0, 2 * Math.PI);
    ctx.fillStyle = enemy.color;
    ctx.fill();
  }
};

// remove enemy based on id
var removeEnemy = function removeEnemy(id) {
  if (enemies[id]) {
    delete enemies[id];
  }
};
