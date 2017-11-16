'use strict';

var id = void 0; // player's unique id
var color = void 0; // player's unique color
var socket = void 0; // player's socket
var players = {}; // object to hold player properties
var ingrediants = {}; // object to hold falling ingrediants
var ingrediantNum = 0;
var moveLeft = false; // left or a held
var moveRight = false; // right or d held
var moveUp = false; // up or w held
var moveDown = false; // down or s held

var canvas = void 0;
var ctx = void 0;

// bread properties
var breadHeight = 10;
var breadWidth = 30;

//redraw canvas
var draw = function draw() {
  movePlayer(); // get player movement

  ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
  drawHUD();
  drawPlayers();
  requestAnimationFrame(draw); // continue to draw updates
};

var drawHUD = function drawHUD() {
  ctx.font = '20px Verdana';
  ctx.textAlign = 'center';
  ctx.fillText('0000', canvas.width / 2, 30);
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
      case 81:
        // Q
        dropIngredient();
        break;
      case 69:
        // E
        combineIngredients();
        break;
      default:
        break;
    }
  }

  keysDown[e.keyCode] = e.type == 'keydown'; // check if key is down

  moveLeft = keysDown[37] || keysDown[65]; // left or a held
  moveRight = keysDown[39] || keysDown[68]; // right or d held
  moveUp = keysDown[38] || keysDown[87]; // up or w held
  moveDown = keysDown[40] || keysDown[83]; // down or s held
};

// initialize scripts
var init = function init() {
  socket = io.connect();
  canvas = document.querySelector('#myCanvas');
  ctx = canvas.getContext('2d');

  socket.on('connect', function () {
    socket.emit('join', { width: canvas.width, height: canvas.height });
  });

  socket.on('joined', setPlayer); // set player on server 'joined' event
  socket.on('updateMovement', updatePlayer); // update on server 'updateClient' event
  socket.on('left', removePlayer); // remove player on server 'removePlayer event

  document.body.addEventListener('keydown', keyDownHandler);
  document.body.addEventListener('keyup', keyDownHandler);
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
  }
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

  // reset lerp percentage
  player.alpha = 0.05;
};

// remove player based on id
var removePlayer = function removePlayer(id) {
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
