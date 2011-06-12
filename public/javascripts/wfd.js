var WFD = WFD || {};

(function (window) {
  var ctrlKey = 17,
      sKey = 83,
      cmdKey = 91, // for all you Mac people
      ctrlPressed = false,
      sPressed = false,
      cmdPressed = false;

    // trigger save action
    window.onkeydown = function (event) {        
        switch (event.which) {
            case ctrlKey: ctrlPressed = true; break;
            case sKey: sPressed = true; break;
            case cmdKey: cmdPressed = true; break;
        }
        if ((ctrlPressed || cmdPressed) && sPressed) { WFD.processSave(); event.preventDefault(); return false; }
    };
    window.onkeyup = function (event) {
        switch (event.which) {
            case ctrlKey: ctrlPressed = false; break;
            case sKey: sPressed = false; break;
            case cmdKey: cmdPressed = false; break;
        }
    };
    
    // save action
    WFD.processSave = function () { 
      window.document.getElementById('meal_form').submit(); 
      return;
    };    
}(window));