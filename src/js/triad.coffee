constants = require('./constants.coffee')
chance = new (require('chance'))

class Triad

  constructor: ->

  render: ->
    @svg = d3.select('body').append('svg')
    @shapes = []
    @generator = @shapeFactory()
    @tick()

  shapeFactory: ->
    x = 1
    y = 1

    =>
      rot = Math.round(Math.random() * 4)

      if x < 1
        dx = 1
      else if x >= Math.floor($(window).width() / constants.SHAPE_SIZE)
        dx = -1
      if y < 1
        dy = 1
      else if y >= Math.floor($(window).height() / constants.SHAPE_SIZE)
        dy = -1

      unless dx?
        dx = Math.round(Math.random() * 2) - 1
      unless dy?
        dy = Math.round(Math.random() * 2) - 1

      if @shapeExistsAtPosition(x + dx, y + dy)
        dx += if chance.bool() then 1 else -1

      x += dx
      y += dy

      {x, y, rot}

  tick: =>
    shape = @generator()
    shape.el = @drawTriange shape

    if @shapes.length > 25
      toRemove = @shapes.pop()
      toRemove.el.remove()
    @shapes.unshift(shape)
    _.delay @tick, constants.TICK_MS

  drawTriange: ({x, y, size, rot}) ->
    size ?= constants.SHAPE_SIZE

    triangle = @svg.append("path")
      .attr 'd', (d) ->
        return "M #{x * size} #{y * size} l #{size} #{size} l -#{size} 0 z"
      .style 'fill', 'blue'

    if rot > 0
      triangle.attr 'transform', "rotate(#{rot*90}, #{x * size + size/2}, #{y * + size + size/2})"

    triangle.transition().style('opacity', 0).duration(constants.FADE_MS)

  shapeExistsAtPosition: (x, y) ->
    conflicts = @shapes.filter (shape) -> shape.x is x and shape.y is y
    conflicts.length > 0

module.exports = Triad