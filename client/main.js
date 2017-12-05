let id; // player's unique id
let color; // player's unique color
let socket; // player's socket
let players = {}; // object to hold player properties
let enemies = {}; // object of enemies in the room
let moveLeft = false; // left or a held
let moveRight = false; // right or d held
let moveUp = false; // up or w held
let moveDown = false; // down or s held

//canvas
let canvas;
let ctx;
let canvasOffset;
let offsetX;
let offsetY;

// score
let score = 0;

//redraw canvas
const draw = () => {
  movePlayer(); // get player movement
  
  ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
  drawHUD();
  drawPlayers();
  drawEnemies();
  requestAnimationFrame(draw); // continue to draw updates
};

const drawHUD = () => {
  let scoreStr = score.toString();
  while(scoreStr.length < 6) scoreStr = '0' + scoreStr;
  
  ctx.font = '20px Verdana';
  ctx.textAlign = 'center';
  ctx.fillText(scoreStr, canvas.width / 2, 30);
};

// linear interpolation to jump percentages to new position
let lerp = (v0, v1, alpha) => {
  return (1 - alpha) * v0 + alpha * v1;
};

// object to keep track of keys that are down
let keysDown = {};
// function to update player movement based on keys down.
const keyDownHandler = (e) => {
  e = e || event;
  
  // If key isn't held check press commands
  if(!keysDown[e.keyCode]){
    switch(e.keyCode) {
      case 81: // Q
        dropIngredient();
        break;
      case 69: // E
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

// function to update position of initial arrow draw
const mouseDownHandler = (e) => {
  if(!players[id].attacking) {
    players[id].attacking = true;
    players[id].mouseX = parseInt(e.clientX - offsetX);
    players[id].mouseY = parseInt(e.clientY - offsetY);
    setTimeout(endAttack, 100);
  }
};

const updateScore = (serverScore) => {
  score = serverScore;
};

const handleResize = () => {
  console.log('handleResize');
  offsetX = canvas.offsetLeft;
  offsetY = canvas.offsetTop;
};

// initialize scripts
const init = () => { 
  socket = io.connect();
  canvas = document.querySelector('#myCanvas');
  ctx = canvas.getContext('2d');

  offsetX = canvas.offsetLeft;
  offsetY = canvas.offsetTop;

  socket.on('connect', () => {
    socket.emit('join', { width: canvas.width, height: canvas.height})
  });

  socket.on('joined', setPlayer); // set player on server 'joined' event
  socket.on('updateMovement', updatePlayer); // update on server 'updateClient' event
  socket.on('updateEnemies', updateEnemies);
  socket.on('left', removePlayer); // remove player on server 'removePlayer' event
  socket.on('removeEnemy', removeEnemy); // remove enemy on server 'removeEnemy' event
  socket.on('updateScore', updateScore);
  
  document.body.addEventListener('keydown', keyDownHandler);
  document.body.addEventListener('keyup', keyDownHandler);
  document.body.addEventListener('mousedown', mouseDownHandler);
  window.addEventListener('resize', handleResize);
  
};

window.onload = init;