let lastUpdate = 0;
// update enemies from server
const updateEnemies = (data) => {
  if(data.lastUpdate > lastUpdate) {
    const enemyKeys = Object.keys(data.enemies);
    for(let i = 0; i < enemyKeys.length; i++) { // iterate enemies
      // add enemy if new
      if(!enemies[enemyKeys[i]]) enemies[enemyKeys[i]] = data.enemies[enemyKeys[i]];
      else { // else update enemy lerping data
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
const drawEnemies = () => {
  let keys = Object.keys(enemies); // get all enemy id's
  // Iterate enemies
  for(let i = 0; i < keys.length; i++)
  {
    const enemy = enemies[keys[i]];
    
    // keep animation running smoothly
    if(enemy.alpha < 1) enemy.alpha += 0.05;
    
    enemy.x = lerp(enemy.prevX, enemy.destX, enemy.alpha); // smooth transition with lerp
    enemy.y = lerp(enemy.prevY, enemy.destY, enemy.alpha);

    // draw enemy
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.rad, 0, 2 * Math.PI);
    ctx.fillStyle = enemy.color;
    ctx.fill();
  }
};