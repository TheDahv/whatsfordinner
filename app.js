
/**
 * Module dependencies.
 */

var express = require('express'),
    async = require('async'),
    mongoose = require('mongoose'),
    models = require('./models.js'),
    utils = require('./utils.js'),
    db,
    Plan,
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
  var connStr = process.env.MONGOHQ_URL || 'mongodb://localhost/whatsfordinner-dev';
  app.set('db-uri', connStr);
});

app.configure('test', function() {
  var connStr = process.env.MONGOHQ_URL || 'mongodb://localhost/whatsfordinner-test';
  app.set('db-uri', connStr);
});

app.configure('production', function() {
  var connStr = process.env.MONGOHQ_URL || 'mongodb://localhost/whatsfordinner'; 
  app.set('db-uri', connStr);
});

console.log('connection string is ' + app.set('db-uri'));
db = mongoose.connect(app.set('db-uri'));

models.defineModels(mongoose, function () {
  app.Plan = Plan = mongoose.model('Plan');
});

// Routes
app.get('/:id', function (req, res) {
  var planid = req.params.id;
  console.log('looking up the plan for id: ' + planid);
  
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

app.post('/:id', function (req, res) {
  var planid = req.params.id;  
  console.log('got id ' + planid);

  Plan.findById(planid, function (err, plan) {
    if(err) {
      res.render('error', { locals: { error: err } });
    } else {
      var processDay = (function (r, p) {
        var req = r;
        var plan = p;
        
        return function (day, callback) {
          console.log('preparing ' + day);
          console.log('  request is null? ' + (req === null));
          console.log('  plan id is ' + plan.id);
          
          var meal = plan.findMealByDay(day);
          meal.ingredients = [];
          plan.save(function (err) {
            if (err) { callback(err); }
            console.log ('  meal for ' + day + ' is prepared. moving on...');
            
            meal.name = req.body[day].name;

            console.log('  preparing to save ingredients for ' + day);
            if (req.body[day].ingredients.length > 0) {
              var ingredients = req.body[day].ingredients.trim().replace(/\r\r|\r|\n/gm, ',').split(',');
              ingredients.forEach(function (i) {
                if(i.trim().length) {
                  meal.ingredients.push({
                    name: i.trim()
                  });
                }                
              });
              plan.save(function (err) {
                callback(err);
              });
            } else {
              callback();
            }              
          });
        };
      }(req, plan));      

      // Update the existing plan
      var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
      async.forEachSeries(
        days, 
        processDay, 
        function (err) {
          if (err) {
            res.render('error', {
              locals: {error: err}
            });
          } else {
            console.log('done');            
            res.redirect('/' + plan.id);
          }          
        }
      );              
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

var port = process.env.PORT || 3000;
app.listen(port);
console.log("Express server listening on port %d", app.address().port);
