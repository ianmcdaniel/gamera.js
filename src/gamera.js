// Gamera engine

(function () {
  var P=[]; //Plugins

  function values(obj) {
    var a=[],p;for(p in obj){a.push(obj[p]);}return a;
  }

  function uid() {
    return (((1+Math.random())*0x80000)|0).toString(16);
  }

  function extend(d){
    for(var a,p,s,i=1; i<arguments.length; i++) {
      a = arguments[i]; s = typeof(a) == "function" ? a() : a;
      for (p in s) if (hasOwnProperty.call(s, p)) d[p] = s[p];
    }
    return d;
  }

  var Object = extend((function(){}), {

    mixin:function(o){
      var p = this.prototype.init, m = o.init;
      if(m) {
        this.prototype.init = function(){p.apply(this, arguments); m.apply(this, arguments)}
        delete o.init;
      }
      extend(this.prototype, o);
    },

    extend: function(){
      var
        p = "prototype",
        c = function(){return this.init && this.init.apply(this, arguments)},
        s = function(){ this.constructor = c;};
      s[p] = this[p]; c[p] = new s;
      extend(c[p], extend.apply(this, arguments));
      for(k in Object) c[k] = Object[k]
      return c;
    }
  });

  var G = Object.extend({

    init:function(attrs){
      this.entities   = {};
      this.components = {};
      this.systems    = [];
      this.running    = false;

      this._attrs     = attrs || {};
      P.forEach(function(p){p.call(this, this);}.bind(this));
    },

    get: function(k) {return this._attrs[k];},
    set: function(k,v){this._attrs[k]=v; this.trigger('change:'+k, v)},

    // create entity
    entity: function(id, components){
      var e = this.entities;
      if(typeof id == "object") {components=id; id=uid();}
      e[id] = new G.Entity(this, id, components);
      //this._store(e[id]);
      this.trigger("entity:added", e[id]);
      return e[id];
    },

    removeEntity: function(id) {
      G.Cache.remove(id);
      delete this.entities[id];
      this.trigger("entity:removed", id);
    },

    // create component
    component: function(id, methods) {
      var c = this.components[id] = G.Component.extend({id:id,game:this}, methods);
      this.trigger("component:added", c);
    },

    // create system
    system: function(id, methods) {
      if(typeof id == "object") {methods = id; id = methods.id || uid();}
      var s = new (G.System.extend({id:id, game:this}, methods))();
      this.systems.push(s);
      this.trigger("system:added", s);
    },

    removeSystem: function(id){
      var indx, s = this.systems;
      s.forEach(function(s,i){if(s.id == id) indx = i;});
      if(indx) s.splice(indx,1);
      this.trigger("system:removed", id);
    },

    getEntity: function(id){
      return this.entities[id];
    },

    // find entities by component
    getEntities: function(){
      var cid = Array.prototype.slice.call(arguments, 0).sort().join("."),
          c=G.Cache._cache;
      if(c[cid]) return values(c[cid]);
      c[cid] = {};
      for(var e in this.entities) {
        G.Cache.update(this.entities[e]);
      }
      return values(c[cid]);
    },

    start: function(c){
      var self = this;
      if(!this.running) {
        this.systems.sort(function(a,b){return a.order || 0 > b.order || 0;});
        this.running = true;
        this.trigger("start", this);
        (function gl(){
          self.systems.forEach(function(s){
            s.update && s.update.call && s.update.call(s);
          });
          if(self.running) window.requestAnimationFrame(gl, c);
        })()
      }
    },

    stop: function(){
      this.running = false;
      this.trigger("stop", this);
    }
  })

  G.Object = Object;

  G.Entity  = G.Object.extend({
    init: function(game, id, components){
      this.components = {};
      this.id = id;
      this.game = game;
      for(var c in components) this.add(c, components[c]);
    },
    get:function(c){
      var
        i,
        str = c.split("."),
        obj = this.components;
      for (i = 0; i < str.length; i++) obj = obj[str[i]];
      return obj;
    },
    remove: function(c){
      G.Cache.update(this);
      delete this.components[c];

    },
    add: function(c, a) {
      var gc = this.game.components;
      this.components[c] = (function(c, args, fn) {
        args.constructor == Array || (args = [args]);
        if(gc[c]) {
          fn=function(){return gc[c].apply(this, args);};
          fn.prototype = gc[c].prototype;
          return new fn();
        }
      }.bind(this))(c, a);
      G.Cache.update(this);
    }
  });

  G.System = G.Object.extend({
    getEntity: function(){
      return this.game.getEntity.apply(this.game, arguments);
    },
    getEntities: function(){
      return this.game.getEntities.apply(this.game, arguments);
    }
  });

  G.Component = G.Object.extend({
    init: function(p){for(var k in p || {}) this[k] = p[k];}
  });

  G.plugin = function(fn){P.push(fn);};

  G.Cache = {

    _cache:{},

    update: function(entity) {
      this.remove(entity.id);
      for(var k in this._cache) {
        var add = true;
        k.split(".").forEach(function(c){if (!entity.components[c]) add=false;});
        if(add) this._cache[k][entity.id] = entity;
      }
    },

    remove: function(id){
      for(var k in this._cache) this._cache[k][id] && delete this._cache[k][id];
    }
  }

  G.Events = {
    on:function(evt, fn){
      this.events || (this.events = {})
      this.events[evt] = this.events[evt] || [];
      this.events[evt].push(fn);
    },

    off:function(evt, fn){
      if(!this.events || !this.events[evt]) return;
      (fn) ? this.events[evt].splice(this.events[evt].indexOf(fn), 1) : this.events[evt] = [];
    },

    trigger:function(evt){
      var args = Array.prototype.slice.call(arguments, 1);
      if(!this.events || !this.events[evt]) return;
      this.events[evt].forEach(function(e){
        e.apply(this, args);
      }.bind(this));
    }
  }

  G.mixin(G.Events);

  G.Entity.mixin(G.Events);

  G.System.mixin(G.Events);

  var root = this;
  if (typeof define === 'function' && define.amd) {
    define('Gamera', [], function() {
      return G;
    });
  } else if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = G;
    }
    exports.Gamera = G;
  } else {
    root.Gamera = G;
  }

}());
