
/**
 * Module dependencies.
 */

var express = require('express'),
    mongoose = require('mongoose'),
    models = require('./models.js'),
    utils = require('./utils.js'),
    db,
    Plan,
//    Meal,
//    Ingredient,
    Settings = { development: {}, test: {}, production: {}};

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(express.favicon(__dirname + '/public/placeholder.ico'));
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
});

// Routes
app.get('/:id', function (req, res) {
  var planid = req.params.id;
  
  Plan.findById(planid, function (err, plan) {
    if(err) {
      res.render('error', {
        locals: { error: err }
      });
    } else {
      var viewdata = {};

      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(function (d) {
        var meal = plan.findMealByDay(d);
        var name = meal === null ? '' : meal.name;
        var ingredients = meal === null ? '' : meal.ingredients.map(function (i) { return i.name; }).join(', ');        
              
        viewdata[d] = {
          name: name,
          ingredients: ingredients
        };
      });

      res.render('planner', {        
        locals: {
          planid: planid,
          viewdata: viewdata
        }
      });      
    }
  });
});

var updateDay = function (req, plan, day) {  
  var meal = plan.findMealByDay(day);
  if(meal === null) {
    meal = {
      day: day,
      ingredients: []
    };
    plan.meals.push(meal);
  } else {    
    while(meal.ingredients.length > 0) {
      meal.ingredients = [];
      plan.save();
    }
  }

  meal.name = req.body[day].name;

  if (req.body[day].ingredients.length > 0) {
    var flat_ingredients, split_ingredients;
    flat_ingredients = req.body[day].ingredients.replace(/\n/g, ',');
    split_ingredients = flat_ingredients.split(',');

    split_ingredients.forEach(function (ingredient) {
      if (ingredient !== '') {
        meal.ingredients.push({
          name: ingredient.trim()
        });
        plan.save();
      }
    });
  }
};

app.post('/:id', function (req, res) {
  var planid = req.params.id;

  Plan.findById(planid, function (err, plan) {
    if(err) {
      res.render('error', { locals: { error: err } });
    } else {
      // Update the existing plan
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(
        function (d) {
          updateDay(req, plan, d); 
        }
      );
  
      // Redirect back to the plan
      res.redirect('/' + planid);      
    }
  });  
});

app.get('/', function (req, res){
  res.render('index', {
    locals: {
      planid: null
    }
  });
});

app.post('/', function (req, res) {
  // Generate a new plan
  var plan = new Plan();
  plan.save();  

  var planid = plan.id;
  res.render('index', {
    locals: {
      planid: planid
    }
  });
});

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
