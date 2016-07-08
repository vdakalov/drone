
function _el(tag, cls, rules, body, parent) {
  tag || (tag = 'div');
  typeof tag === 'string' && (tag = document.createElement(tag));
  if (rules) {
    var measures = {
      width: 'px',
      height: 'px',
      top: 'px',
      left: 'px',
      right: 'px',
      bottom: 'px'
    };
    for (var name in rules) {
      if (rules.hasOwnProperty(name)) {
        tag.style[name] = rules[name] + (name in measures && measures[name] || '');
      }
    }
  }
  cls && (tag.className = cls);
  body && (tag.innerHTML = body);
  parent && parent.appendChild(tag);
  return tag;
}

function _to(delay, context, func) {
  function stop() { clearTimeout(index); }
  function iter() { return func.call(context, stop); }
  arguments.length === 2 && (func = context, context = this);
  var index = setTimeout(iter, delay * 1000);
  return index;
}

function _ti(delay, context, func) {
  function stop() { clearInterval(index); }
  function iter() { return func.call(context, stop); }
  arguments.length === 2 && (func = context, context = this);
  var index = setInterval(iter, delay * 1000);
  return index;
}

function _each(collection, context, func){
  arguments.length === 2 && (func = context, context = this);
  if (Array.isArray(collection)) {
    for (var i = 0; i < collection.length; i++) {
      func.call(context, collection[i], i, i);
    }
  } else {
    var index = 0;
    for (var name in collection) {
      if (collection.hasOwnProperty(name)) {
        func.call(context, collection[name], name, index++);
      }
    }
  }
  return collection;
}

function _extend(trg, src){
  return _each(src, function(value, name){ trg[name] = value; });
}

function _defaults(trg, src){
  return _each(src, function(value, name){ name in trg || (trg[name] = value); });
}

function _rnd(max) {
  return Math.random() * (max || 1);
}

function _remove(collection, item) {
  var index = collection.indexOf(item);
  if (index !== -1) {
    collection.splice(index, 1);
  }
  return collection;
}

function _range(value, max, min) {
  return Math.max(Math.min(value, max), min);
}

function _rotate(el) {
  var value = el.style.transform.match(/\-?\d+/);
  return value ? parseFloat(value) : 0;
}

function Drone(x, y, deg) {
  this.memory = {x: x, y: y, deg: deg};
  this.power = null;
  this.runtime = [];
  this.engine_volumes = [0, 0, 0, 0];
  this.engine_volumes_max = [
    this.engine_volume_max,
    this.engine_volume_max,
    this.engine_volume_max,
    this.engine_volume_max];
}

Drone.prototype.engine_random = 0.25;
Drone.prototype.engine_volume_max = 40;

Drone.prototype.tasks = {
  power_up: function power_up(){
    _each(this.engine_volumes, this, function(value, index){
      var volume = _rnd(this.engine_random);
      this.engine_volumes[index] += this.engine_volumes_max[index] > this.engine_volumes[index] ? volume : -volume;
    });
  },
  engine: function engine(data){
    data || (data = {});
    _defaults(data, { angle: _rnd(360) });
    return function(){
      data.angle = (data.angle + this.engine_volumes[data.index] * data.dir) % 360;
      _el(data.el, null, { transform: 'rotate(' + data.angle + 'deg)' });
    };
  },
  rotate: function(){
    var cw = this.engine_volumes[0] + this.engine_volumes[3],
        ccw = this.engine_volumes[1] + this.engine_volumes[2];

    this.memory.deg = (this.memory.deg + ccw - cw) % 360;

    _el(this.el_body, null, { transform: 'rotate(' + this.memory.deg + 'deg)' });
  },
  move: function(){
    var back = this.engine_volumes[2] + this.engine_volumes[3],
        front = this.engine_volumes[0] + this.engine_volumes[1],
        left = this.engine_volumes[0] + this.engine_volumes[2],
        right = this.engine_volumes[1] + this.engine_volumes[3];

    var dir = this.get_direction();

    this.memory.x += back - front;
    this.memory.y += left - right;

    _el(this.el_body, null, { left: this.memory.x, top: this.memory.y });
  }
};

Drone.prototype.init = function(){
  this.el_body = _el(null, 'drone', {
    left: this.memory.x,
    top:  this.memory.y,
    transform: 'rotate(' + this.memory.deg + 'deg)'
  });

  this.el_engine_lt = _el(null, null, null, null, this.el_body);
  this.runtime.push(this.tasks.engine({ el: this.el_engine_lt, dir:  1, index: 0 }));

  this.el_engine_rt = _el(null, null, null, null, this.el_body);
  this.runtime.push(this.tasks.engine({ el: this.el_engine_rt, dir: -1, index: 1 }));

  this.el_engine_lb = _el(null, null, null, null, this.el_body);
  this.runtime.push(this.tasks.engine({ el: this.el_engine_lb, dir: -1, index: 2 }));

  this.el_engine_rb = _el(null, null, null, null, this.el_body);
  this.runtime.push(this.tasks.engine({ el: this.el_engine_rb, dir:  1, index: 3 }));

  this.processor();
  this.runtime.push(this.tasks.power_up);
  this.runtime.push(this.tasks.rotate);
};

Drone.prototype.put_on = function(parent){
  if (this.el_body) {
    _el(this.el_body, null, null, null, parent);
    return true;
  }
  return false;
};

Drone.prototype.turn_on = function(){
  this.power = _ti(0.01, this, this.processor);
};

Drone.prototype.turn_off = function(){
  this.power = clearInterval(this.power);
};

Drone.prototype.is_on = function(){
  return typeof this.power === 'number';
};

Drone.prototype.get_middle_engine_volumes = function(){
  return this.engine_volumes.reduce(function(p, c){ return p + c; }, 0) / this.engine_volumes.length;
};

Drone.prototype.get_direction = function(){
  var bound_lt = this.el_engine_lt.getBoundingClientRect(),
      bound_lb = this.el_engine_lb.getBoundingClientRect();

  return [
    bound_lt.left - bound_lb.left,
    bound_lt.top - bound_lb.top
  ];
};

Drone.prototype.processor = function(){
  var down = [];
  _each(this.runtime, this, function(task){
    if (task.call(this) === true) {
      down.push(task);
    }
  });
  if (down.length) {
    _each(down, this, function(item){ _remove(this.runtime, item); });
  }
};

Drone.prototype.rotate_ccw = function(volume){
  var half = volume / 2;
  this.engine_volumes_max[0] = this.engine_volume_max - half;
  this.engine_volumes_max[1] = this.engine_volume_max + half;
  this.engine_volumes_max[2] = this.engine_volume_max + half;
  this.engine_volumes_max[3] = this.engine_volume_max - half;
};

Drone.prototype.rotate_cw = function(volume){
  var half = volume / 2;
  this.engine_volumes_max[0] = this.engine_volume_max + half;
  this.engine_volumes_max[1] = this.engine_volume_max - half;
  this.engine_volumes_max[2] = this.engine_volume_max - half;
  this.engine_volumes_max[3] = this.engine_volume_max + half;
};

Drone.prototype.move_forward = function(volume){
  var half = volume / 2;
  this.engine_volumes_max[0] = this.engine_volume_max - half;
  this.engine_volumes_max[1] = this.engine_volume_max - half;
  this.engine_volumes_max[2] = this.engine_volume_max + half;
  this.engine_volumes_max[3] = this.engine_volume_max + half;
};

Drone.prototype.move_backward = function(volume){
  var half = volume / 2;
  this.engine_volumes_max[0] = this.engine_volume_max + half;
  this.engine_volumes_max[1] = this.engine_volume_max - half;
  this.engine_volumes_max[2] = this.engine_volume_max - half;
  this.engine_volumes_max[3] = this.engine_volume_max - half;
};

Drone.prototype.move_left = function(volume){
  var half = volume / 2;
  this.engine_volumes_max[0] = this.engine_volume_max - half;
  this.engine_volumes_max[1] = this.engine_volume_max + half;
  this.engine_volumes_max[2] = this.engine_volume_max - half;
  this.engine_volumes_max[3] = this.engine_volume_max + half;
};

Drone.prototype.move_right = function(volume){
  var half = volume / 2;
  this.engine_volumes_max[0] = this.engine_volume_max + half;
  this.engine_volumes_max[1] = this.engine_volume_max - half;
  this.engine_volumes_max[2] = this.engine_volume_max + half;
  this.engine_volumes_max[3] = this.engine_volume_max - half;
};

var main = new Drone(100, 100, 180);
main.init();
main.put_on(document.body);
main.turn_on();

_to(4, function(){ main.rotate_ccw(0); });

function onkeyup(event){
  switch (event.which) {
    case 81: // q
      main.rotate_cw(0);
      break;
    case 69: // e
      main.rotate_ccw(0);
      break;
  }
}

function onkeydown(event){
  switch (event.which) {
    case 81: // q
      main.rotate_cw(1);
      break;
    case 69: // e
      main.rotate_ccw(1);
      break;
  }
}

window.addEventListener('keydown', onkeydown);
window.addEventListener('keyup', onkeyup);