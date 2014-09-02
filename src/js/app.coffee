Triad = require './triad.coffee'
window.app = new Triad()

jQuery ->
  app.render()
