function GameController(socket) {
  this.canvas = document.getElementById('game');
  this.game = this.canvas.getContext('2d');
  this.speed = 0;
  this.invaderOffsetX = 10;
  this.invaderOffsetY = 140;
  this.socket = socket;
  this.init();
}

GameController.prototype.init = function () {
  var _this = this;

  this.setupTimers.assetsToLoad = 13; // GameModel, 11 sounds, spritesheet
  this.setupTimers.assetsLoaded = 0;

  this.spritesheet = new Image();
  this.spritesheet.src = '/static/sprites.png';
  this.spritesheet.onload = function () {
    return _this.setupTimers();
  };

  this.sounds = Array(11).fill(0).map(function (e, index) {
    var slug = index != 10 ? '0' + index : index;
    var sound = new Audio('/static/snd_inv' + slug + '.mp3');
    sound.oncanplaythrough = function () {
      return _this.setupTimers();
    };
    sound.loop = false;
  });

  this.model = new GameModel();
  this.model.onload = function () {
    return _this.setupTimers();
  };

  // Setup Game events
  this.ev = new EventController();
  this.ev.registerEvent('left', function () {
    _this.socket.emit('shipmove', 'left');
    _this.model.ship.left();
  }, function () {
    _this.socket.emit('shipmove', 'stop');
    _this.model.ship.stop();
  });
  this.ev.registerEvent('right', function () {
    _this.socket.emit('shipmove', 'right');
    _this.model.ship.right();
  }, function () {
    _this.socket.emit('shipmove', 'stop');
    _this.model.ship.stop();
  });
  this.ev.registerEvent('space', function () {
    var bullet = new GameModel.Bullet('up', _this.model.ship);
    _this.model.bullets.push(bullet);
  });

  // 2 Player Socket model updates
  if (this.socket) {
    var _socket = this.socket;
    _socket.on('bullet', function (bullet) {
      var origin = 0;
      if (bullet.direction === 'down') {
        origin = _this.model.invaders[bullet.origin.row][bullet.origin.col];
      } else {
        origin = _this.model.otherShip;
      }
      var b = new GameModel.Bullet(bullet.direction, origin);
      _this.model.bullets.push(b);
    });

    _socket.on('invaderdeath', function (inv) {
      _this.model.invaders[inv.row][inv.col].explode();
    });

    _socket.on('shipmove', function (direction) {
      if (direction === 'left') _this.model.otherShip.left();
      if (direction === 'right') _this.model.otherShip.right();
      if (direction === 'stop') _this.model.otherShip.stop();
    });
  }
};

GameController.prototype.setupTimers = function () {
  var _this2 = this;

  if (++this.setupTimers.assetsLoaded < this.setupTimers.assetsToLoad || this.setup) {
    return;
  }

  var gameLoop = function gameLoop() {
    _this2.draw();
    window.requestAnimationFrame(gameLoop);
  };
  window.requestAnimationFrame(gameLoop);
  this.timer = setInterval(function () {
    if (_this2.player === 1) {
      var front = _this2.model.getLowest();
      var shooter = front[Math.floor(Math.random() * front.length)];
      var bullet = new GameModel.Bullet('down', shooter);
      _this2.model.bullets.push(bullet);

      var serialized = Object.assign({}, bullet);
      delete serialized.origin;
      debugger;
      _this2.socket.emit('bullet', Object.assign({}, serialized, {
        origin: {
          row: bullet.origin.row,
          col: bullet.origin.col
        }
      }));
    }
    _this2.model.invadersFlat().reverse().forEach(function (invader, i) {
      setTimeout(function () {
        invader.toggleState();
        invader.nextCol();
      }, i * 10);
    });

    // TODO: This doesn't actually chage the interval
    _this2.speed += 10;
  }, 1000 - this.speed);

  this.setup = true;
};

GameController.prototype.draw = function () {
  if (!this.game) throw new Error('No Game canvas to render to');
  if (!this.model) throw new Error('No GameModel found to render');
  var invaders = this.model.invaders;
  var ship = this.model.ship;
  var otherShip = this.model.otherShip;
  var bullets = this.model.bullets;
  var game = this.game;

  game.clearRect(0, 0, this.canvas.width, this.canvas.height);

  // text
  this.drawText('score', 5, 5);
  this.drawText(this.model.score.toString(), 5, 25);
  this.drawText('player ' + this.player, 150, 5);

  for (var i = 0; i < invaders.length; i++) {
    for (var j = 0; j < invaders[i].length; j++) {
      var invader = invaders[i][j];
      if (invader.dead) continue;
      game.drawImage.apply(game, [this.spritesheet].concat(invader.getSprite(), [5 * invader.colOffset + this.invaderOffsetX + j * 30, 30 * invader.rowOffset + this.invaderOffsetY + i * 30, 24, 16]));
    }
  }

  game.drawImage.apply(game, [this.spritesheet].concat(ship.getSprite(), [15 * ship.colOffset, 15 * ship.rowOffset, 22, 16]));
  game.drawImage.apply(game, [this.spritesheet].concat(otherShip.getSprite(), [15 * otherShip.colOffset, 15 * otherShip.rowOffset, 22, 16]));

  for (var _i = 0; _i < bullets.length; _i++) {
    var bullet = bullets[_i];

    if (bullet.direction === 'up') {
      var bulletBound = game.getImageData(15 * bullet.colOffset + 11, 15 * bullet.rowOffset - 10, 2, 2);
      var collide = bulletBound.data.reduce(function (s, c) {
        return s + c;
      });
      if (collide) {
        bullet.explode(function (invader) {
          socket.emit('invaderdeath', {
            row: invader.row,
            col: invader.col
          });
        });
      }
      game.drawImage.apply(game, [this.spritesheet].concat(bullet.getSprite(), [15 * bullet.colOffset + 11, 15 * bullet.rowOffset, 2, 8]));
    } else {
      game.drawImage.apply(game, [this.spritesheet].concat(bullet.getSprite(), [5 * bullet.colOffset + this.invaderOffsetX + bullet.origin.col * 30, 30 * bullet.rowOffset + this.invaderOffsetY + bullet.origin.row * 30, 6, 14]));
    }
  }
};

GameController.prototype.drawText = function (text, x, y) {
  var _this3 = this;
  text.split('').forEach(function (char, i) {
    var _game;
    if (char === ' ') return;
    (_game = _this3.game).drawImage.apply(_game, [_this3.spritesheet].concat(_this3.model.getSprite('abc_' + char), [x + 16 * i, y, 16, 16]));
  });
};