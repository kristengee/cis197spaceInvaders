function GameModel() {
  this.INVADER_ROW = 5;
  this.INVADER_COL = 11;

  // Default GameModel properties
  this.score = 0;
  this.sprites = [];
  this.invaders = [];
  this.invaderDirection = 'right';
  this.ship = null;
  this.bullets = [];

  this.init();
}

GameModel.prototype.init = function () {
  var _this = this;

  // Get spritesheet data
  fetch('/static/sprites.json').then(function (response) {
    return response.json();
  }).then(function (response) {
    _this.sprites = response.frames;
    _this.onload();
  });

  for (var i = 0; i < this.INVADER_ROW; i++) {
    this.invaders[i] = [];
    for (var j = 0; j < this.INVADER_COL; j++) {
      var type = 0;
      if (i < this.INVADER_ROW * 0.2) type = 2;
      else if (i < this.INVADER_ROW * 0.6) type = 1;
      else type = 0;

      var invader = new GameModel.Invader(type, i, j, this);
      this.invaders[i].push(invader);
    }
  }

  this.ship = new GameModel.Ship(this);
  this.otherShip = new GameModel.Ship(this);
};

GameModel.prototype.getSprite = function (name) {
  var sprite = this.sprites[name].frame;
  if (!sprite) throw new Error('No sprite found for ' + name);
  return Object.values(sprite);
};

GameModel.prototype.invadersFlat = function () {
  var invaders = [];
  for (var i = 0; i < this.INVADER_ROW; i++) {
    for (var j = 0; j < this.INVADER_COL; j++) {
      invaders.push(this.invaders[i][j]);
    }
  }
  return invaders;
};

GameModel.prototype.getLowest = function () {
  var invaders = Array(this.INVADER_COL);
  for (var i = this.INVADER_ROW - 1; i >= 0; i--) {
    for (var j = this.INVADER_COL - 1; j >= 0; j--) {
      if (!invaders[j] && !this.invaders[i][j].dead) {
        invaders[j] = this.invaders[i][j];
      }
    }
  }

  // Trim out undefined values - this means the column
  // has no lowest alive invader
  for (var _i = 0; _i < invaders.length; _i++) {
    if (invaders[_i] == undefined) {
      invaders.splice(_i, 1);
      _i--;
    }
  }

  return invaders;
};

GameModel.Invader = function (type, row, col, parent) {
  this.dead = false;
  this.exploding = false;
  this.model = parent;
  this.type = type;
  this.frameState = 0;
  this.row = row;
  this.col = col;
  this.colOffset = 10;
  this.rowOffset = 0;
};

GameModel.Invader.prototype.toggleState = function () {
  this.frameState = +!this.frameState;
};

GameModel.Invader.prototype.explode = function () {
  var _this2 = this;

  this.exploding = true;
  console.log('exploding ' + this.row + ', ' + this.col);
  // let index = this.model.invaders.indexOf(this);
  setTimeout(function () {
    _this2.dead = true;
  }, 500);
  return this;
};

GameModel.Invader.prototype.getSprite = function () {
  return this.exploding ? this.model.getSprite('invader_explode') : this.model.getSprite('invader_' + this.type + '_' + this.frameState);
};

GameModel.Invader.prototype.nextCol = function () {
  var direction = this.model.invaderDirection;
  var nextRight = this.colOffset + 1 > 20 && direction === 'right';
  var lastLeft = this.row === 0 && this.col === 0;
  var nextLeft = this.colOffset - 1 === -1 && direction === 'left';
  var lastRight = this.row === 0 && this.col === 0;

  if (nextRight || nextLeft) {
    if (nextRight && lastRight || nextLeft && lastLeft) {
      this.model.invaderDirection = direction === 'right' ? 'left' : 'right';
    }
    return this.nextRow();
  } else {
    this.colOffset = direction === 'right' ? this.colOffset + 1 : this.colOffset - 1;
  }
};

GameModel.Invader.prototype.nextRow = function () {
  this.rowOffset++;
};

GameModel.Ship = function (parent) {
  this.dead = false;
  this.frameState = null;
  this.model = parent;
  this.colOffset = 14;
  this.rowOffset = 30;
  this.moveTimer = null;
};

GameModel.Ship.prototype.left = function () {
  var _this3 = this;

  this.stop();
  setTimeout(function () {
    _this3.moveTimer = setInterval(function () {
      if (_this3.colOffset <= 1 && _this3.moveTimer) {
        return _this3.stop();
      }
      _this3.colOffset -= 0.1;
    }, 5);
  }, 80);
};

GameModel.Ship.prototype.right = function () {
  var _this4 = this;
  this.stop();
  setTimeout(function () {
    _this4.moveTimer = setInterval(function () {
      if (_this4.colOffset >= 28 && _this4.moveTimer) {
        return _this4.stop();
      }
      _this4.colOffset += 0.1;
    }, 5);
  }, 80);
};

GameModel.Ship.prototype.stop = function () {
  clearInterval(this.moveTimer);
};

GameModel.Ship.prototype.getSprite = function () {
  return this.model.getSprite('ship');
};

GameModel.Bullet = function (direction, parent) {
  var _this5 = this;

  this.origin = parent;
  this.dead = false;
  this.type = Math.floor(Math.random() * 3);
  this.frameState = 0;
  this.direction = direction;
  this.colOffset = parent.colOffset;
  this.rowOffset = parent.rowOffset;
  this.moveTimer = setInterval(function () {
    if (_this5.rowOffset <= 0 || _this5.rowOffset >= 2048 || _this5.dead) {
      _this5.explode();
      return clearInterval(_this5.moveTimer);
    }

    if (_this5.frameState === 2) {
      _this5.frameState = 0;
    } else {
      _this5.frameState++;
    }

    if (_this5.direction === 'up') {
      _this5.rowOffset -= 0.25;
    } else {
      _this5.rowOffset += 0.05;
    }
  }, 5);
};

GameModel.Bullet.prototype.explode = function (cb) {
  this.dead = true;
  var model = this.origin.model.bullets;
  var invaders = this.origin.model.invaders;
  var bulletX = 15 * this.colOffset + 11;
  var bulletY = 15 * this.rowOffset;

  var candidates = [];
  for (var i = 0; i < invaders.length; i++) {
    for (var j = 0; j < invaders[i].length; j++) {
      var invaderX = 5 * invaders[i][j].colOffset + 10 + j * 30;
      var invaderY = 30 * invaders[i][j].rowOffset + 140 + i * 30;

      var deltaX = Math.abs(bulletX - invaderX);
      var deltaY = Math.abs(bulletY - invaderY);

      if (deltaX <= 30 && deltaY <= 80 && !invaders[i][j].dead) {
        candidates.push({
          invader: invaders[i][j],
          delta: deltaX + deltaY
        });
      }
    }
  }

  var min = Infinity;
  if (candidates.length > 0) {
    var best = candidates.filter(function (c) {
      if (c.delta < min) {
        min = c.delta;
        return c;
      }
    }).pop().invader;
    if (cb) cb(best);
    best.explode();
    this.origin.model.score += 10 * best.type + 10;
  }

  var index = model.indexOf(this);
  model.splice(index, 1);
};

GameModel.Bullet.prototype.getSprite = function () {
  var model = this.origin.model;
  if (this.origin instanceof GameModel.Ship) {
    return this.dead ? model.getSprite('player_bullet_explode') : model.getSprite('player_bullet');
  } else {
    return model.getSprite('bullet_' + this.type + '_' + this.frameState);
  }
};