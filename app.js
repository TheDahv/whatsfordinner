
/**
 * Module dependencies.
 */

var express = require('express'),
    mongoose = require('mongoose'),
    models = require('./models.js'),
    db,
    Plan,
    Meal,
    Ingredient,
    Settings = { development: {}, test: {}, production: {}};

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

app.configure('development', function() {
  app.set('db-uri', 'mongodb://localhost/whatsfordinner-dev');
});

app.configure('test', function() {
  app.set('db-uri', 'mongodb://localhost/whatsfordinner-test');
});

app.configure('production', function() {
  app.set('db-uri', 'mongodb://localhost/whatsfordinner');
});

db = mongoose.connect(app.set('db-uri'));

models.defineModels(mongoose, function () {
  app.Plan = Plan = mongoose.model('Plan');
  app.Meal = Meal = mongoose.model('Meal');
  app.Ingredient = Ingredient = mongoose.model('Ingredient');
});

// Routes
app.get('/:id', function (req, res) {
  var planid = req.params.id;
  res.render('planner', {
    locals: {
      planid: planid
    }
  });
});

app.post('/:id', function (req, res) {
  var planid = req.params.id;

  // Update the existing plan

  // Redirect back to the plan
  res.redirect('/' + planid);
});

app.get('/', function (req, res){
  res.render('index', {
    locals: {
      planid: null
    }
  });
});

app.post('/', function (req, res) {
  var planid = 12345;
  res.render('index', {
    locals: {
      planid: planid
    }
  });
});

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
