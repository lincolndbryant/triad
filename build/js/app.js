(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Triad;

Triad = require('./triad.coffee');

window.app = new Triad();

jQuery(function() {
  return app.render();
});



},{"./triad.coffee":3}],2:[function(require,module,exports){
module.exports = {
  TICK_MS: 25,
  FADE_MS: 4000,
  SHAPE_SIZE: 200
};



},{}],3:[function(require,module,exports){
var Triad, constants,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

constants = require('./constants.coffee');

Triad = (function() {
  function Triad() {
    this.tick = __bind(this.tick, this);
  }

  Triad.prototype.render = function() {
    this.svg = d3.select('body').append('svg');
    this.shapes = [];
    this.generator = this.shapeFactory();
    return this.tick();
  };

  Triad.prototype.shapeFactory = function() {
    var x, y;
    x = 1;
    y = 1;
    return (function(_this) {
      return function() {
        var dx, dy, rot;
        rot = Math.round(Math.random() * 4);
        if (x < 1) {
          dx = 1;
        } else if (x >= Math.floor($(window).width() / constants.SHAPE_SIZE)) {
          dx = -1;
        }
        if (y < 1) {
          dy = 1;
        } else if (y >= Math.floor($(window).height() / constants.SHAPE_SIZE)) {
          dy = -1;
        }
        if (dx == null) {
          dx = Math.round(Math.random() * 2) - 1;
        }
        if (dy == null) {
          dy = Math.round(Math.random() * 2) - 1;
        }
        if (_this.shapeExistsAtPosition(x + dx, y + dy)) {
          dx += 1;
        }
        x += dx;
        y += dy;
        return {
          x: x,
          y: y,
          rot: rot
        };
      };
    })(this);
  };

  Triad.prototype.tick = function() {
    var shape, toRemove;
    shape = this.generator();
    shape.el = this.drawTriange(shape);
    if (this.shapes.length > 25) {
      toRemove = this.shapes.pop();
      toRemove.el.remove();
    }
    this.shapes.unshift(shape);
    return _.delay(this.tick, constants.TICK_MS);
  };

  Triad.prototype.drawTriange = function(_arg) {
    var rot, size, triangle, x, y;
    x = _arg.x, y = _arg.y, size = _arg.size, rot = _arg.rot;
    if (size == null) {
      size = constants.SHAPE_SIZE;
    }
    triangle = this.svg.append("path").attr('d', function(d) {
      return "M " + (x * size) + " " + (y * size) + " l " + size + " " + size + " l -" + size + " 0 z";
    }).style('fill', 'blue');
    if (rot > 0) {
      triangle.attr('transform', "rotate(" + (rot * 90) + ", " + (x * size + size / 2) + ", " + (y * +size + size / 2) + ")");
    }
    return triangle.transition().style('opacity', 0).duration(constants.FADE_MS);
  };

  Triad.prototype.shapeExistsAtPosition = function(x, y) {
    var conflicts;
    conflicts = this.shapes.filter(function(shape) {
      return shape.x === x && shape.y === y;
    });
    return conflicts.length > 0;
  };

  return Triad;

})();

module.exports = Triad;



},{"./constants.coffee":2}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9saW5jb2xuL2Rldi9zcmMvdHJpYWQvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2xpbmNvbG4vZGV2L3NyYy90cmlhZC9zcmMvanMvYXBwLmNvZmZlZSIsIi9Vc2Vycy9saW5jb2xuL2Rldi9zcmMvdHJpYWQvc3JjL2pzL2NvbnN0YW50cy5jb2ZmZWUiLCIvVXNlcnMvbGluY29sbi9kZXYvc3JjL3RyaWFkL3NyYy9qcy90cmlhZC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBLEtBQUE7O0FBQUEsS0FBQSxHQUFRLE9BQUEsQ0FBUSxnQkFBUixDQUFSLENBQUE7O0FBQUEsTUFDTSxDQUFDLEdBQVAsR0FBaUIsSUFBQSxLQUFBLENBQUEsQ0FEakIsQ0FBQTs7QUFBQSxNQUdBLENBQU8sU0FBQSxHQUFBO1NBQ0wsR0FBRyxDQUFDLE1BQUosQ0FBQSxFQURLO0FBQUEsQ0FBUCxDQUhBLENBQUE7Ozs7O0FDQUEsTUFBTSxDQUFDLE9BQVAsR0FDRTtBQUFBLEVBQUEsT0FBQSxFQUFTLEVBQVQ7QUFBQSxFQUNBLE9BQUEsRUFBUyxJQURUO0FBQUEsRUFFQSxVQUFBLEVBQVksR0FGWjtDQURGLENBQUE7Ozs7O0FDQUEsSUFBQSxnQkFBQTtFQUFBLGtGQUFBOztBQUFBLFNBQUEsR0FBWSxPQUFBLENBQVEsb0JBQVIsQ0FBWixDQUFBOztBQUFBO0FBSWUsRUFBQSxlQUFBLEdBQUE7QUFBQyx1Q0FBQSxDQUFEO0VBQUEsQ0FBYjs7QUFBQSxrQkFFQSxNQUFBLEdBQVEsU0FBQSxHQUFBO0FBQ04sSUFBQSxJQUFDLENBQUEsR0FBRCxHQUFPLEVBQUUsQ0FBQyxNQUFILENBQVUsTUFBVixDQUFpQixDQUFDLE1BQWxCLENBQXlCLEtBQXpCLENBQVAsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFB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QUEsR0FBdUIsU0FBQyxDQUFELEVBQUksQ0FBSixHQUFBO0FBQ3JCLFFBQUEsU0FBQTtBQUFBLElBQUEsU0FBQSxHQUFZLElBQUMsQ0FBQSxNQUFNLENBQUMsTUFBUixDQUFlLFNBQUMsS0FBRCxHQUFBO2FBQVcsS0FBSyxDQUFDLENBQU4sS0FBVyxDQUFYLElBQWlCLEtBQUssQ0FBQyxDQUFOLEtBQVcsRUFBdkM7SUFBQSxDQUFmLENBQVosQ0FBQTtXQUNBLFNBQVMsQ0FBQyxNQUFWLEdBQW1CLEVBRkU7RUFBQSxDQTVEdkIsQ0FBQTs7ZUFBQTs7SUFKRixDQUFBOztBQUFBLE1Bb0VNLENBQUMsT0FBUCxHQUFpQixLQXBFakIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJUcmlhZCA9IHJlcXVpcmUgJy4vdHJpYWQuY29mZmVlJ1xud2luZG93LmFwcCA9IG5ldyBUcmlhZCgpXG5cbmpRdWVyeSAtPlxuICBhcHAucmVuZGVyKClcbiIsIm1vZHVsZS5leHBvcnRzID1cbiAgVElDS19NUzogMjVcbiAgRkFERV9NUzogNDAwMFxuICBTSEFQRV9TSVpFOiAyMDAiLCJjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5jb2ZmZWUnKVxuXG5jbGFzcyBUcmlhZFxuXG4gIGNvbnN0cnVjdG9yOiAtPlxuXG4gIHJlbmRlcjogLT5cbiAgICBAc3ZnID0gZDMuc2VsZWN0KCdib2R5JykuYXBwZW5kKCdzdmcnKVxuICAgIEBzaGFwZXMgPSBbXVxuICAgIEBnZW5lcmF0b3IgPSBAc2hhcGVGYWN0b3J5KClcbiAgICBAdGljaygpXG5cbiAgc2hhcGVGYWN0b3J5OiAtPlxuICAgIHggPSAxXG4gICAgeSA9IDFcblxuICAgID0+XG4gICAgICByb3QgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiA0KVxuXG4gICAgICBpZiB4IDwgMVxuICAgICAgICBkeCA9IDFcbiAgICAgIGVsc2UgaWYgeCA+PSBNYXRoLmZsb29yKCQod2luZG93KS53aWR0aCgpIC8gY29uc3RhbnRzLlNIQVBFX1NJWkUpXG4gICAgICAgIGR4ID0gLTFcbiAgICAgIGlmIHkgPCAxXG4gICAgICAgIGR5ID0gMVxuICAgICAgZWxzZSBpZiB5ID49IE1hdGguZmxvb3IoJCh3aW5kb3cpLmhlaWdodCgpIC8gY29uc3RhbnRzLlNIQVBFX1NJWkUpXG4gICAgICAgIGR5ID0gLTFcblxuICAgICAgdW5sZXNzIGR4P1xuICAgICAgICBkeCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDIpIC0gMVxuICAgICAgdW5sZXNzIGR5P1xuICAgICAgICBkeSA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDIpIC0gMVxuXG4gICAgICBpZiBAc2hhcGVFeGlzdHNBdFBvc2l0aW9uKHggKyBkeCwgeSArIGR5KVxuICAgICAgICBkeCArPSAxXG5cbiAgICAgIHggKz0gZHhcbiAgICAgIHkgKz0gZHlcblxuICAgICAge3gsIHksIHJvdH1cblxuICB0aWNrOiA9PlxuICAgIHNoYXBlID0gQGdlbmVyYXRvcigpXG4gICAgc2hhcGUuZWwgPSBAZHJhd1RyaWFuZ2Ugc2hhcGVcblxuICAgIGlmIEBzaGFwZXMubGVuZ3RoID4gMjVcbiAgICAgIHRvUmVtb3ZlID0gQHNoYXBlcy5wb3AoKVxuICAgICAgdG9SZW1vdmUuZWwucmVtb3ZlKClcbiAgICBAc2hhcGVzLnVuc2hpZnQoc2hhcGUpXG4gICAgXy5kZWxheSBAdGljaywgY29uc3RhbnRzLlRJQ0tfTVNcblxuICBkcmF3VHJpYW5nZTogKHt4LCB5LCBzaXplLCByb3R9KSAtPlxuICAgIHNpemUgPz0gY29uc3RhbnRzLlNIQVBFX1NJWkVcblxuICAgIHRyaWFuZ2xlID0gQHN2Zy5hcHBlbmQoXCJwYXRoXCIpXG4gICAgICAuYXR0ciAnZCcsIChkKSAtPlxuICAgICAgICByZXR1cm4gXCJNICN7eCAqIHNpemV9ICN7eSAqIHNpemV9IGwgI3tzaXplfSAje3NpemV9IGwgLSN7c2l6ZX0gMCB6XCJcbiAgICAgIC5zdHlsZSAnZmlsbCcsICdibHVlJ1xuXG4gICAgaWYgcm90ID4gMFxuICAgICAgdHJpYW5nbGUuYXR0ciAndHJhbnNmb3JtJywgXCJyb3RhdGUoI3tyb3QqOTB9LCAje3ggKiBzaXplICsgc2l6ZS8yfSwgI3t5ICogKyBzaXplICsgc2l6ZS8yfSlcIlxuXG4gICAgdHJpYW5nbGUudHJhbnNpdGlvbigpLnN0eWxlKCdvcGFjaXR5JywgMCkuZHVyYXRpb24oY29uc3RhbnRzLkZBREVfTVMpXG5cbiAgc2hhcGVFeGlzdHNBdFBvc2l0aW9uOiAoeCwgeSkgLT5cbiAgICBjb25mbGljdHMgPSBAc2hhcGVzLmZpbHRlciAoc2hhcGUpIC0+IHNoYXBlLnggaXMgeCBhbmQgc2hhcGUueSBpcyB5XG4gICAgY29uZmxpY3RzLmxlbmd0aCA+IDBcblxubW9kdWxlLmV4cG9ydHMgPSBUcmlhZCJdfQ==