const xxh = require('xxhashjs');

let io;

const canvasW = 1000;
const canvasH = 600;

// key: room, value: count in room
const roomCounts = {};

// key: room, value: ready state
const roomStates = {};

// key: socket.name, value: room of socket
const rooms = {};

// max room size
const roomMax = 4;

// key: room, value: object of players in room
const players = {};

// key: room, value: object of enemies in room
const enemies = {};

// key: room, value: score of the room
const scores = {};

// function to handle new sockets and create new players
const createPlayer = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    socket.name = xxh.h32(`${socket.id}${new Date().getTime()}`, 0xBADD00D5).toString(16);
    if (Object.keys(roomCounts).length === 0) {
      console.log('new room');
      const room = 'room0';
      socket.join(room);
      rooms[socket.name] = room;
      roomCounts[room] = 1;
      roomStates[room] = false;
      enemies[room] = {};
      scores[room] = 0;
    } else {
      const roomKeys = Object.keys(roomCounts); // get each room
      let foundRoom = false; // remains false if all rooms are full
      for (let i = 0; i < roomKeys.length; i++) {
        if (roomCounts[roomKeys[i]] < roomMax && !roomStates[roomKeys[i]] ) {
          const room = `room${i}`;
          socket.join(room);
          rooms[socket.name] = room;
          roomCounts[room]++;
          foundRoom = true;
          break;
        }
      }
      if (!foundRoom) {
        console.log('new room');
        const room = `room${roomKeys.length}`;
        socket.join(room);
        rooms[socket.name] = room;
        roomCounts[room] = 1;
        roomStates[room] = false;
        scores[room] = 0;
      }
    }

    // create a new player object and add it to list keyed with socket name
    const player = {
      id: socket.name, // unique id
      lastUpdate: new Date().getTime(), // last time player was updated
      x: data.width / 2, // default x coord of player
      y: data.height / 2, // default y coord of player
      // code from http://www.daverabideau.com/blog/ to generate random color
      color: `#${(`000000${Math.random().toString(16).slice(2, 8).toUpperCase()}`).slice(-6)}`,
      rad: 20,
      prevX: 0, // default last known x coord
      prevY: 0, // default last known y coord
      destX: data.width / 2, // default desired x coord
      destY: data.height / 2, // default desired y coord
      alpha: 0, // default % from prev to dest
      health: 100,
      attacking: false,
      mouseX: 0,
      mouseY: 0,
      ready: false,
    };
    if (players[rooms[socket.name]] == null) players[rooms[socket.name]] = {};
    players[rooms[socket.name]][player.id] = player;

    socket.emit('joined', { player: player, others: players[rooms[socket.name]] });
    socket.broadcast.to(rooms[socket.name]).emit('addPlayer', player);
  });
};

// damage enemy
const damageEnemy = (enemy, room) => {
  delete enemies[room][enemy.id];
  scores[room] += 1;
  io.sockets.in(room).emit('removeEnemy', enemy.id);
  io.sockets.in(room).emit('updateScore', scores[room]);
};

// function to see if an attack hits an enemy
const checkAttack = (player) => {
  const enemyKeys = Object.keys(enemies[rooms[player.id]]);

  // calculate weapon tip relative to player
  let dx = player.mouseX - player.destX;
  let dy = player.mouseY - player.destY;
  let mag = Math.sqrt((dx * dx) + (dy * dy));

  const weaponX = (dx / mag) * 50;
  const weaponY = (dy / mag) * 50;

  for (let i = 0; i < enemyKeys.length; i++) {
    const enemy = enemies[rooms[player.id]][enemyKeys[i]];

    // calculate weapon distance to enemy
    dx = (player.destX + weaponX) - enemy.destX;
    dy = (player.destY + weaponY) - enemy.destY;
    mag = Math.sqrt((dx * dx) + (dy * dy));

    if (mag < enemy.rad) { // if weapon tip is within enemy's radius
      damageEnemy(enemy, rooms[player.id]);
    }
  }
};

// function to process client movement
const onMove = (sock) => {
  const socket = sock;

  socket.on('move', (data) => {
    players[rooms[socket.name]][socket.name] = data;

    players[rooms[socket.name]][socket.name].lastUpdate = new Date().getTime();
    socket.broadcast.to(rooms[socket.name]).emit('updateMovement', players[rooms[socket.name]][socket.name]);

    if (data.attacking) checkAttack(data);
  });
};

const findClosestPlayer = (enemy, room) => {
  const roomsPlayers = players[room]; // get the players in this room
  const playerKeys = Object.keys(roomsPlayers); // get each player
  let lastDist = 100000; // initial distance farther than any players would be
  let closestPlayer = roomsPlayers[playerKeys[0]];
  for (let i = 0; i < playerKeys.length; i++) {
    const player = roomsPlayers[playerKeys[i]]; // get player

    // calculate distance to enemy
    const dx = player.destX - enemy.destX;
    const dy = player.destY - enemy.destY;
    const dist = Math.sqrt((dx * dx) + (dy * dy));

    if (dist < lastDist) {
      lastDist = dist;
      closestPlayer = player;
    }
  }
  return closestPlayer;
};

// function to damage player
const damagePlayer = (playerID, room) => {
  players[room][playerID].health -= 10;

  io.sockets.in(room).emit('updateHealth', { playerID, health: players[room][playerID].health });
};

// function to check enemy/player collisions
const checkCollisions = (roomEnemies, roomPlayers, room) => {
  const enemyKeys = Object.keys(roomEnemies);
  for (let i = 0; i < enemyKeys.length; i++) {
    const playerKeys = Object.keys(roomPlayers);
    const enemy = roomEnemies[enemyKeys[i]];
    for (let j = 0; j < playerKeys.length; j++) {
      const player = roomPlayers[playerKeys[j]];

      const dx = player.destX - enemy.destX;
      const dy = player.destY - enemy.destY;
      const dist = Math.sqrt((dx * dx) + (dy * dy));

      if (dist < (player.rad + enemy.rad)) {
        damagePlayer(player.id, room);
      }
    }
  }
};

// function to update enemy positions
const updateEnemies = () => {
  const roomKeys = Object.keys(roomCounts); // get each room
  for (let i = 0; i < roomKeys.length; i++) {
    if (enemies[roomKeys[i]] != null) {
      if (Object.keys(enemies[roomKeys[i]]).length !== 0) {
        const roomsEnemies = enemies[roomKeys[i]]; // get this room's enemies
        const keys = Object.keys(roomsEnemies); // get each enemy

        // move to closest player
        for (let j = 0; j < keys.length; j++) {
          const enemy = roomsEnemies[keys[j]]; // get enemy
          const closestPlayer = findClosestPlayer(enemy, roomKeys[i]);

          // update previous position before changing destination
          enemy.prevX = enemy.destX;
          enemy.prevY = enemy.destY;

          // calculate enemy movement
          const dx = closestPlayer.destX - enemy.destX;
          const dy = closestPlayer.destY - enemy.destY;
          const mag = Math.sqrt((dx * dx) + (dy * dy));

          const velX = (dx / mag) * enemy.speed;
          const velY = (dy / mag) * enemy.speed;

          // update enemy destination
          enemy.destX += velX;
          enemy.destY += velY;

          // update real list of enemies
          enemies[roomKeys[i]][enemy.id] = enemy;
        }
      }

      // send room's updated enemies
      const lastUpdate = new Date().getTime();
      io.sockets.in(roomKeys[i]).emit('updateEnemies', { enemies: enemies[roomKeys[i]], lastUpdate });

      // check enemy/player collisions
      checkCollisions(enemies[roomKeys[i]], players[roomKeys[i]], roomKeys[i]);
    }
  }
};

const spawnEnemy = () => {
  const roomKeys = Object.keys(roomCounts); // get each room
  for (let i = 0; i < roomKeys.length; i++) {
    if (enemies[roomKeys[i]] == null) enemies[roomKeys[i]] = {};
    if (Object.keys(enemies[roomKeys[i]]).length < 10 && roomStates[roomKeys[i]] ) {
      // get random side to spawn on
      const randSide = Math.floor((Math.random() * 4) + 1);

      // enemy spawn location
      let randomX = 0;
      let randomY = 0;

      // 25% chance for each side
      if (randSide <= 1) { // calculate to spawn left
        randomX = Math.floor((Math.random() * 10) + 1) - 10;
        randomY = Math.floor((Math.random() * canvasH) + 1);
      } else if (randSide === 2) { // calculate to spawn right
        randomX = Math.floor((Math.random() * 10) + 1) + canvasW;
        randomY = Math.floor((Math.random() * canvasH) + 1);
      } else if (randSide === 3) { // calculate to spawn top
        randomX = Math.floor((Math.random() * 600) + 1);
        randomY = Math.floor((Math.random() * 10) + 1) - 10;
      } else { // calculate to spawn bottom
        randomX = Math.floor((Math.random() * 600) + 1);
        randomY = Math.floor((Math.random() * 10) + 1) + canvasH;
      }

      // create enemy to add
      const enemy = {
        id: xxh.h32(`${new Date().getTime()}`, 0xBADD00D5).toString(16), // unique id
        x: randomX, // default x coord of enemy
        y: randomY, // default y coord of enemy
        color: '#ff0000', // color of enemy
        rad: 15,
        prevX: 0, // default last known x coord
        prevY: 0, // default last known y coord
        destX: randomX, // default desired x coord
        destY: randomY, // default desired y coord
        alpha: 0, // default % from prev to dest
        health: 100, // default health
        speed: 5,
      };

      enemies[roomKeys[i]][enemy.id] = enemy;
    }
  }
};

// check if all players are ready
const onReady = (sock) => {
  const socket = sock;

  socket.on('ready', (readyState) => {
    players[rooms[socket.name]][socket.name].ready = readyState;
    socket.broadcast.to(rooms[socket.name]).emit('updateReady', { id: players[rooms[socket.name]][socket.name].id, ready: readyState });

    playerKeys = Object.keys(players[rooms[socket.name]]);
    let allReady = true;
    for (let i = 0; i < playerKeys.length; i++) {
      allReady = allReady && players[rooms[socket.name]][playerKeys[i]].ready;
    }

    if (allReady) {
      io.sockets.in(rooms[socket.name]).emit('startGame');
      roomStates[rooms[socket.name]] = true;
    }
  });
};

// leave room on death
const onLeave = (sock) => {
  const socket = sock;

  socket.on('leave', () => {
    if (players[rooms[socket.name]] && players[rooms[socket.name]][socket.name]) {
      io.sockets.in(rooms[socket.name]).emit('left', players[rooms[socket.name]][socket.name].id); // notify clients
      delete players[rooms[socket.name]][socket.name]; // delete player on server to be recreated
      socket.leave(rooms[socket.name]); // remove socket from room
      roomCounts[rooms[socket.name]]--;
      if (roomCounts[rooms[socket.name]] <= 0) {
        delete roomCounts[rooms[socket.name]];
        delete rooms[socket.name];
        delete enemies[rooms[socket.name]];
        delete players[rooms[socket.name]];
      }
    }
  });
};

// delete players that disconnect
const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    if (players[rooms[socket.name]] && players[rooms[socket.name]][socket.name]) {
      io.sockets.in(rooms[socket.name]).emit('left', players[rooms[socket.name]][socket.name].id); // notify clients
      delete players[rooms[socket.name]][socket.name]; // delete player on server
      socket.leave(rooms[socket.name]); // remove socket from room
      roomCounts[rooms[socket.name]]--;
      if (roomCounts[rooms[socket.name]] <= 0) {
        delete roomCounts[rooms[socket.name]];
        delete rooms[socket.name];
        delete enemies[rooms[socket.name]];
        delete players[rooms[socket.name]];
      }
    }
  });
};

const configure = (ioServer) => {
  io = ioServer;

  setInterval(spawnEnemy, 300);
  setInterval(updateEnemies, 100);

  io.sockets.on('connection', (socket) => {
    createPlayer(socket);
    onMove(socket);
    onReady(socket);
    onLeave(socket);
    onDisconnect(socket);
  });
};

module.exports.configure = configure;
