gulp = require 'gulp'
gutil = require 'gulp-util'

sass = require 'gulp-ruby-sass'
jade = require 'gulp-jade'
connect = require 'gulp-connect'
coffeelint = require 'gulp-coffeelint'
coffee = require 'gulp-coffee'
concat = require 'gulp-concat'
uglify = require 'gulp-uglify'
clean = require 'gulp-clean'
runSequence = require 'run-sequence'
commonJs = require 'gulp-wrap-commonjs'
bower = require 'gulp-bower-files'
browserify = require('gulp-browserify')
rename = require 'gulp-rename'

# CONFIG ---------------------------------------------------------

isProd = gutil.env.type is 'prod'

sources =
  sass: 'src/sass/*.sass'
  html: 'index.html'
  coffee: 'src/**/*.coffee'
  js: 'src/**/*.js'
  spec: 'spec/**/*.coffee'
  templates: 'src/**/*.jade'
  bower: 'bower_components/*/index.js'

# dev and prod will both go to dist for simplicity sake
destinations =
  css: 'build/css'
  html: 'build/'
  js: 'build/js'
  spec: 'build/js'
  templates: 'build/js'

modulePath = (path) ->
  path = path.replace(__dirname + '/src/', '')
  path = path.replace /.(js|coffee|jade)$/, ''
  path

# TASKS -------------------------------------------------------------

gulp.task 'connect', connect.server(
  root: ['build'] # this is the directory the server will run
  port: 1337
  livereload: true
)

gulp.task 'testServer', connect.server
    root: ['test', 'dist']
    port: 9998
    livereload: false


gulp.task 'style', ->
  gulp.src(sources.sass)
  .pipe(sass(trace: true))
  .pipe(gulp.dest(destinations.css))
  .pipe(connect.reload())

gulp.task 'html', ->
  gulp.src(sources.html)
  .pipe(gulp.dest(destinations.html))
  .pipe(connect.reload())

gulp.task 'templates', ->
  gulp.src(sources.templates)
    .pipe(jade({client: true}))
    .pipe(commonJs(
        pathModifier: modulePath, moduleExports: 'template'
    ))
    .pipe(concat('templates.js'))
    .pipe(gulp.dest(destinations.templates))

# I put linting as a separate task so we can run it by itself if we want to
gulp.task 'lint', ->
  gulp.src(sources.coffee)
  .pipe(coffeelint())
  .pipe(coffeelint.reporter())

gulp.task 'src', ->
  gulp.src(sources.coffee)
  .pipe(coffee({bare: true}).on('error', gutil.log))
  .pipe(commonJs(
      pathModifier: modulePath
  ))
  .pipe(concat('app.js'))
  .pipe(if isProd then uglify() else gutil.noop())
  .pipe(gulp.dest(destinations.js))
  .pipe(connect.reload())

  gulp.src(sources.js)
  .pipe(gulp.dest(destinations.js))

gulp.task 'watch', ->
  gulp.watch sources.sass, ['style']
  gulp.watch sources.coffee, ['scripts2', 'html', 'templates']
  gulp.watch sources.html, ['html']

gulp.task 'clean', ->
  gulp.src(['dist/'], {read: false}).pipe(clean())

gulp.task 'build', ->
  runSequence 'clean', ['style', 'src', 'html', 'templates', 'bower-files', 'specs']

gulp.task 'specs', ->
  gulp.src(sources.spec)
  .pipe(coffee().on('error', gutil.log))
  .pipe(concat('spec.js'))
  .pipe(gulp.dest(destinations.spec))

gulp.task 'bower-files', ->
  bower()
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('build/js/'))

gulp.task 'default', [
  'bower-files'
  'scripts2'
  'connect'
  'watch'
]

gulp.task 'test', [
  'build'
  'testServer'
  'watch'
]

gulp.task 'scripts2', ->
  gulp.src('src/js/app.coffee', read: false)
    .pipe(browserify({
      transform: ['coffeeify'],
      extensions: ['.coffee'],
      debug: true
    }))
    .pipe(rename('app.js'))
    .pipe(gulp.dest('./build/js'))
