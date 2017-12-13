const drawPlayers = () => {
  let keys = Object.keys(players); // get all player id's
  
  // Iterate players
  for(let i = 0; i < keys.length; i++)
  {
    const player = players[keys[i]];
    
    if(player.health > 0) {
      // keep animation running smoothly
      if(player.alpha < 1) player.alpha += 0.05;

      player.x = lerp(player.prevX, player.destX, player.alpha); // smooth transition with lerp
      player.y = lerp(player.prevY, player.destY, player.alpha);

      // draw player
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.rad, 0, 2 * Math.PI);
      ctx.fillStyle = player.color;
      ctx.fill();

      // draw health
      let healthWidth = 50;
      let healthHeight = 5;
      ctx.fillStyle = 'red';
      ctx.fillRect(player.x - (healthWidth / 2), player.y - 35, healthWidth, healthHeight);

      let remainingWidth = healthWidth * (player.health / 100);
      ctx.fillStyle = 'green';
      ctx.fillRect(player.x - (healthWidth / 2), player.y - 35, remainingWidth, healthHeight);


      if(player.attacking) {
        // get angle of attack based on mouse click location
        let dx = player.mouseX - player.x;
        let dy = player.mouseY - player.y;
        let angle = Math.atan2(dy, dx);

        // draw attack
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(angle);
        let path = new Path2D();
        path.moveTo(50, 0);
        path.lineTo(0, 5);
        path.lineTo(0, -5);
        ctx.fillStyle = '#8c8c8c'
        ctx.fill(path);
        ctx.restore();
      }
    }
  }
};

// update a player's health from server
const updateHealth = (data) => {
  console.log('updateHealth');
  if(players[data.playerID]) players[data.playerID].health = data.health;
  if(players[id].health <= 0) {
    dead = true;
    gameStarted = false;
    ready = false;
    players = {};
    enemies = {};
    socket.emit('leave');
  }
  
};

// update a player from server
const updatePlayer = (data) => {
  // if the player is new, add them to players and return
  if(!players[data.id])
  {
    players[data.id] = data;
    return;
  }

  // grab player object based on id
  const player = players[data.id];

  // return if player's last update is newer than this server data
  if(player.lastUpdate >= data.lastUpdate) {
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
const removePlayer = (id) => {
  console.log('player removed');
  if(players[id]) {
    delete players[id];
  }
};

// set this player from server
const setPlayer = (data) => {
  id = data.player.id; // set id from server data
  color = data.player.color; // set color from server data
  players = data.others; // set player with new id
};

// set other players from server
const addPlayer = (data) => {
  players[data.id] = data; // set player with new id
};

// signal ready to server
const readyUp = () => {
  socket.emit('ready', ready);
};

// function to update player position
const movePlayer = () => {
  const player = players[id]; // get this player with their id
  player.prevX = player.x;
  player.prevY = player.y;
  
  const speed = 5; // how far to move
  
  if(moveLeft) {
    if(player.destX < 0) player.destX = 0;
    else player.destX -= speed;
  }
  if(moveRight) {
    if(player.destX > canvas.width) player.destX = canvas.width;
    else player.destX += speed;
  }
  if(moveUp) {
    if(player.destY < 0) player.destY = 0;
    else player.destY -= speed;
  }
  if(moveDown) {
    if(player.destY > canvas.height) player.destY = canvas.height;
    else player.destY += speed;
  }
  
  // reset alpha when moving to keep playing animation
  player.alpha = 0.05;
  
  // send movement to server
  socket.emit('move', player);
};

// end player attack so they can attack again
const endAttack = () => {
  players[id].attacking = false;
}