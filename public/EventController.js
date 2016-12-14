function EventController() {
  var _this = this;
  this.events = {};
  this.keys = {};
  document.addEventListener('keydown', function (e) {
    return _this.eventHandler(e);
  });
  document.addEventListener('keyup', function (e) {
    return _this.eventHandler(e);
  });
}

EventController.prototype.registerEvent = function (key, fn, stopFn) {
  if (key === 'left') key = 37;
  if (key === 'up') key = 38;
  if (key === 'right') key = 39;
  if (key === 'down') key = 40;
  if (key === 'space') key = 32;

  this.events[key] = fn;
  this.events[key + 'stop'] = stopFn;
};

EventController.prototype.eventHandler = function (e) {
  var currentState = this.keys[e.keyCode];
  var startFn = this.events[e.keyCode];
  var stopFn = this.events[e.keyCode + 'stop'];

  if (!startFn) return;
  if (currentState === e.type) return;

  this.keys[e.keyCode] = e.type;

  if (this.keys[e.keyCode] === 'keydown') this.events[e.keyCode](e);
  if (this.keys[e.keyCode] === 'keyup' && stopFn) stopFn(e);
};