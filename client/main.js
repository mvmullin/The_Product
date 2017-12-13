let id; // player's unique id
let color; // player's unique color
let socket; // player's socket
let players = {}; // object to hold player properties
let enemies = {}; // object of enemies in the room
let moveLeft = false; // left or a held
let moveRight = false; // right or d held
let moveUp = false; // up or w held
let moveDown = false; // down or s held
let gameStarted = false;
let ready = false;
let dead = false;

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
  
  ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
  
  if (dead) {
    ctx.font = '20px Verdana';
    ctx.textAlign = 'center';
    ctx.fillText('YOU DIED', canvas.width / 2, canvas.height / 2);
    ctx.fillText('(Press space bar to play again)', canvas.width / 2, (canvas.height / 2)  + 20);
  } else if (gameStarted) {
    movePlayer(); // get player movement

    drawHUD();
    drawPlayers();
    drawEnemies();  
  } else {
    drawReadyStates();
  }
  requestAnimationFrame(draw); // continue to draw updates
};

const drawHUD = () => {
  let scoreStr = score.toString();
  while(scoreStr.length < 6) scoreStr = '0' + scoreStr;
  
  ctx.font = '20px Verdana';
  ctx.textAlign = 'center';
  ctx.fillText(scoreStr, canvas.width / 2, 30);
};

const drawReadyStates = () => {
  let keys = Object.keys(players); // get all player id's
  let drawX = canvas.width / 2;
  let drawY = canvas.height / 2;
  
  // Iterate players
  for(let i = 0; i < keys.length; i++)
  {
    const player = players[keys[i]];
    
    ctx.beginPath();
    if(!player.ready) ctx.fillStyle = 'red';
    else ctx.fillStyle = 'green'; 
    ctx.arc(drawX, drawY, player.rad, 0, 2 * Math.PI);
    ctx.fill();
    
    let num = i + 1;
    let name = 'Player ' + num.toString();
    if(player.id == id) name = 'You';
    ctx.beginPath();
    ctx.font = '20px Verdana';
    ctx.textAlign = 'left';
    ctx.fillStyle = player.color;
    ctx.fillText(name, drawX + (player.rad + 5), drawY);
    
    drawY += 50;
  }
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
      case 82: // R
        if(!gameStarted) {
          ready = !ready;
          players[id].ready = ready;
          readyUp();
        }
        break;
      case 32: // space
        e.preventDefault();
        if(dead) playAgain();
        break;
      default:
        break;
    }
  }
  
  keysDown[e.keyCode] = e.type == 'keydown'; // check if key is down
  
  if(gameStarted) {
    moveLeft = keysDown[37] || keysDown[65]; // left or a held
    moveRight = keysDown[39] || keysDown[68]; // right or d held
    moveUp = keysDown[38] || keysDown[87]; // up or w held
    moveDown = keysDown[40] || keysDown[83]; // down or s held
  } 
};

// function to update position of initial arrow draw
const mouseDownHandler = (e) => {
  if(gameStarted && players[id] && !players[id].attacking) {
    players[id].attacking = true;
    players[id].mouseX = parseInt(e.clientX - offsetX);
    players[id].mouseY = parseInt(e.clientY - offsetY);
    setTimeout(endAttack, 100);
  }
};

const updateScore = (serverScore) => {
  score = serverScore;
};
  
const playAgain = () => {
  socket.emit('join', { width: canvas.width, height: canvas.height});
  dead = false;
}

const handleResize = () => {
  console.log('handleResize');
  offsetX = canvas.offsetLeft;
  offsetY = canvas.offsetTop;
};

const startGame = () => {
  gameStarted = true;
};

const updateReady = (data) => {
  if(!players[data.id]) players[data.id] = {};
  players[data.id].ready = data.ready;
};

// initialize scripts
const init = () => { 
  socket = io.connect();
  canvas = document.querySelector('#myCanvas');
  ctx = canvas.getContext('2d');

  offsetX = canvas.offsetLeft;
  offsetY = canvas.offsetTop;

  socket.on('connect', () => {
    socket.emit('join', { width: canvas.width, height: canvas.height});
  });

  socket.on('joined', setPlayer); // set player on server 'joined' event
  socket.on('addPlayer', addPlayer);
  
  requestAnimationFrame(draw); // draw with new info
  
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