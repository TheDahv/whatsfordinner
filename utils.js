(function () {
  var processArray = function (l, f) {
    // http://stackoverflow.com/questions/5050265/javascript-nodejs-is-array-foreach-asynchronous
    var todo = l.concat();

    setTimeout(function () {
      f(todo.shift());
      if (todo.length > 0) {
        setTimeout(arguments.callee, 25);
      }
    }, 25);
  };


  exports.processArray = processArray;
}());