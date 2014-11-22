(function () {
  var
    E={}, // Entities
    C={}, // Components
    S=[], // Systems
    P=[], // Plugins
    A={}, // Attributes
    running = false,
    cache   = {};

  function store(entity) {
    for(var k in cache) {
      var add = true;
      k.split(".").forEach(function(c){if (!entity.components[c]) add=false;});
      if(add) cache[k][entity.id] = entity;
    }
  }

  function values(obj) {
    var a=[],p;for(p in obj){a.push(obj[p]);}return a;
  }

  function uid() {
    return (((1+Math.random())*0x80000)|0).toString(16);
  }

  function extend(d){
    for(var i=1; i<arguments.length; i++) {
      var s = typeof(arguments[i]) == "function" ? arguments[i]() : arguments[i];
      for (var p in s) if (hasOwnProperty.call(s, p)) d[p] = s[p];
    }
    return d;
  }

  function G (attrs){
    this.entities   = E;
    this.components = C;
    this.systems    = S;
    this.attributes = A = attrs;
    this.C = cache;
    P.forEach(function(p){p.call(this, this);}.bind(this));
  }

  G.prototype = {

    get: function(k) {return A[k];},
    set: function(k,v){A[k]=v;this.trigger('change:'+k, v)},

    // create entity
    entity: function(id, components){
      if(typeof id == "object") {components=id; id=uid();}
      E[id] = new G.Entity(id, components);
      this.trigger("entity:added", E[id]);
      return E[id];
    },

    removeEntity: function(id) {
      delete E[id];
      for(var k in cache) cache[k][id] && delete cache[k][id];
      this.trigger("entity:removed", id);
    },

    // create component
    component: function(id, methods) {
      if(typeof id == "object") {methods = id; id = methods.id || uid();}
      C[id] = G.Component.extend({id:id,game:this}, methods);
      this.trigger("component:added", C[id]);
    },

    // create system
    system: function(id, methods) {
      if(typeof id == "object") {methods = id; id = methods.id || uid();}
      var s = new (G.System.extend({id:id, game:this}, methods))();
      S.push(s);
      this.trigger("system:added", s);
    },

    removeSystem: function(id){
      var indx;
      S.forEach(function(s,i){if(s.id == id) indx = i;});
      if(indx) S.splice(indx,1);
      this.trigger("system:removed", id);
    },

    getEntity: function(id){
      return E[id];
    },

    // find entities by component
    getEntities: function(){
      var cid = Array.prototype.slice.call(arguments, 0).sort().join(".");
      if(cache[cid]) return values(cache[cid]);
      cache[cid] = {};
      for(var e in E) store(E[e]);
      return values(cache[cid]);
    },

    start: function(c){
      if(!running) {
        S.sort(function(a,b){return a.order || 0 > b.order || 0;});
        running = true;
        this.trigger("start", this);
        (function gl(){
          S.forEach(function(s){
            !window.paused && s.update  && s.update.call(s);
            s.draw    && s.draw.call(s);
          });
          if(running) window.requestAnimationFrame(gl, c);
        })()
      }
    },

    stop: function(){
      running = false;
      this.trigger("stop", this);
    }
  };
  
  G.Object = {
    extend: function(){
      var f = function(){
        return this.init && this.init.apply(this, arguments);
      }
      extend(f.prototype, this.prototype, extend.apply(this, arguments));
      extend(f, G.Object);
      return f;
    }
  };

  G.Entity  = G.Object.extend({
    init: function(id, components){
      this.components = {};
      this.id = id;
      for(var c in components) this.add(c, components[c]);
    },
    get:function(c){
      return this.components[c];
    },
    remove: function(c){
      delete this.components[c];
      for(var k in cache) if(k.match(c)) cache[k] && delete cache[k][this.id];
    },
    add: function(c, a) {
      this.components[c] = (function(c, args, fn) {
        args.constructor == Array || (args = [args]);
        if(C[c]) {
          fn=function(){return C[c].apply(this, args);};
          fn.prototype = C[c].prototype;
          return new fn();
        }
      }.bind(this))(c, a);
      store(this);
    }
  });

  G.System = G.Object.extend({
    getEntity: function(){
      return this.game.getEntity.apply(this, arguments);
    },
    getEntities: function(){
      return this.game.getEntities.apply(this, arguments);
    }
  });

  G.Component = G.Object.extend({
    init: function(p){for(var k in p || {}) this[k] = p[k];}
  });

  G.extend = extend;

  G.plugin = function(fn){P.push(fn);};

  G.Events = function(){
    var events = {};
    return {
      ge:function(){
        return events;
      },
      on:function(evt, fn){
        events[evt] = events[evt] || [];
        events[evt].push(fn);

      },
      off:function(evt, fn){
        if(!events[evt]) return;
        (fn) ? events[evt].splice(events[evt].indexOf(fn), 1) : events[evt] = [];
      },
      trigger:function(evt){
        var args = Array.prototype.slice.call(arguments, 1);
        if(!events[evt]) return;
        events[evt].forEach(function(e){
          e.apply(this, args);
        }.bind(this));
      }
    };
  };

  extend(G.prototype, G.Events.call(G.prototype));
  extend(G.System.prototype, G.Events.call(G.System.prototype));
  window.Gamera = G;
}());