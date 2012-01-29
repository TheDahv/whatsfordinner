
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    app = module.exports = express.createServer(),
    async = require('async'),
    mongoose = require('mongoose'),
    models = require('./models.js'),
    faye = require('faye'),
    uuid = require('node-uuid'),
    db,
    Plan,
    Settings = { development: {}, test: {}, production: {}},
    pf_api = '27ca1f77f6945602';

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(express.favicon(__dirname + '/public/favicon.ico'));
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

db = mongoose.connect(app.set('db-uri'));

models.defineModels(mongoose, function () {
  app.Plan = Plan = mongoose.model('Plan');
});

// Routes

// Some silly busy work. Turns out not having 
// these special routes can crash the app
// since anything off the root is considered
// a plan ID
app.get('/robots.txt', function (req, res) {
  require('fs').readFile('robots.txt', function (err, data) {
    if (!err) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.write(data);
      res.end();
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain'});
      res.write('robots.txt error');
      res.end();
    }
  });
});

app.get('/pf/getRecipesByDish/:q', function (req, res) {
  var options = {};
  options.host = 'api.punchfork.com';
  options.path = '/recipes?key=' + pf_api + '&q=' + req.params.q;
  options.port = 80;
  options.method = 'GET';

  http.get(options, function(pf_res) {    
    var res_str = '';
    pf_res.on('data', function (data) {      
      res_str += data;
    });

    pf_res.on('end', function () {
      console.log(res_str.toString());
      console.log("Got response: " + pf_res.statusCode);
    });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

app.get('/randomIdentifier', function (req, res) {
  var id = uuid.v4();
  res.writeHead(200, { 'Content-Type': 'text/plain'});
  res.end(id);
});

app.get('/:id', function (req, res) {  
  var planid = req.params.id;
  
  Plan.findById(planid, function (err, plan) {
    if (err) {
      res.render('error', {
        locals: { error: err }
      });
    } else {
      var viewdata = {};

      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(function (d) {
        var meal = plan.findMealByDay(d);
        var name = meal === undefined ? '' : meal.name;
        var recipe = meal === undefined ? '' : meal.recipe;
        var ingredients = '';
        if (meal !== undefined && meal.ingredients.length > 0) {
          ingredients = meal.ingredients.map(function (i) { return i.name; }).join(', ');
        }
              
        viewdata[d] = {
          name: name,
          recipe: recipe,
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

  Plan.findById(planid, function (err, plan) {
    if(err) {
      res.render('error', { locals: { error: err } });
    } else {
      var processDay = (function (r, p) {
        var req = r;
        var plan = p;
        
        return function (day, callback) {          
          var meal = plan.findMealByDay(day);
          meal.ingredients = [];
          plan.save(function (err) {
            if (err) { callback(err); }
            
            meal.name = req.body[day].name;
            meal.recipe = req.body[day].recipe;

            if (req.body[day].ingredients.length > 0) {
              var ingredients = req.body[day].ingredients.trim().replace(/\r\n|\r|\n/gm, ',').split(',');
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

var bayeux = new faye.NodeAdapter({
  mount: '/pubsub',
  timeout: 45
});

bayeux.attach(app);

var port = process.env.PORT || 3000;
app.listen(port);
console.log("Express server listening on port %d", app.address().port);

// PubSub stuff
var pubsubError = function (err) {
  bayeux.getClient().publish('/' + plan_id, {
    error: err,
    propogate: false
  });  
};

bayeux.getClient().subscribe('/*', function (message) {
  if (!message || message.propogate == false) {
    return;
  }

  if (message && message.chat) {
    if (message.propogate) {
      var plan_id = message.plan_id,
          payload = _.extend(message);

      payload.propogate = false;
      // Push out to other subscribers
      bayeux.getClient().publish('/' + plan_id, payload);
    }
    return;
  }

  var saveAndPush = function (plan) {
    plan.save(function (err) {
      if (err) {
        pubsubError(err);
      } else {
        // Push out to all subscribers
        message.propogate = false;
        bayeux.getClient().publish('/' + plan_id, message);          
      }
    });    
  };

  // Gather relevant data
  var plan_id = message.plan_id,
      day = message.target.split('[')[0],
      target = message.target.split('[')[1].replace(/]/g,''),
      value = message.value;
  
  // Persist the changes
  Plan.findById(plan_id, function (err, plan) {
    var meal, ingredients;

    if (err) { 
      pubsubError(err) 
    } else {
      meal = plan.findMealByDay(day);      
      
      if (target === 'name') {
        meal.name = value;
        saveAndPush(plan);
      } else if (target === 'recipe') {
        meal.recipe = value;
        saveAndPush(plan);
      } else {
        meal.ingredients = [];
        plan.save(function (err) {          
          if (err) {
            pubsubError(err);
          } else {
            ingredients = value.trim().replace(/\r\n|\r|\n/gm, ',').split(',');
            ingredients.forEach(function (i) {
              if(i.trim().length) {
                meal.ingredients.push({
                  name: i.trim()
                });
              }
            });
            saveAndPush(plan);
          }          
        });
      }
    }
  });
});
