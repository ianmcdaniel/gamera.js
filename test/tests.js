// documentation on writing tests here: http://docs.jquery.com/QUnit
// example tests: https://github.com/jquery/qunit/blob/master/test/same.js


// stupid polyfill for stupid phantomjs
Function.prototype.bind = Function.prototype.bind || function (thisp) {
  var fn = this;
  return function () {
    return fn.apply(thisp, arguments);
  };
};

// below are some general tests but feel free to delete them.
var Game;

test("Gamera Exists",function(){
  expect(1);
  ok(true, !!Gamera);
})


test("Create Game",function(){
  Game = new Gamera();

  expect(1);  
  ok(true, !!Game.entities);
})

test("Create Component",function(){
  Game.component("test",{a:1,b:2})
  expect(1);
  ok(true, !!Game.components["test"]);
})
