
/**
 * Module dependencies.
 */

var express = require('express');

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

// Routes
app.get('/:id', function(req, res) {
  var planid = req.params.id;
  res.render('planner', {
    title: 'What&apos;s For Dinner?'    
  });
});

app.get('/', function(req, res){
  res.render('index', {
    title: 'What&apos;s For Dinner?',
    locals: {
      planid: null
    }
  });
});

app.post('/', function(req, res) {
  var planid = 12345;
  res.render('index', {
    title: 'What&apos;s For Dinner?',
    locals: {
      planid: planid
    }
  });
});

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
