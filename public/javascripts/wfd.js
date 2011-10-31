var WFD = WFD || {};

(function (window) {
    // Faye pubsub
    var client = new Faye.Client('/pubsub');

    var plan_id = document.location.pathname.split('/').slice(-1)[0];
    if(plan_id.length) {
      var channel = '/' + plan_id;
      var subscription = client.subscribe(channel, function (message) {      
        if (message.error) {
          // Display the error in some fancy way

          return;
        }

        if (message.target.indexOf('name') >= 0) {
          $('input[name="'+ message.target + '"]').val(message.value);
        } else if (message.target.indexOf('recipe') >= 0) {
          $('input[name="' + message.target + '"]').val(message.value);
        } else if (message.target.indexOf('ingredients') >= 0) {
          $('textarea[name="'+ message.target + '"]').val(message.value);          
        }
      });
      
      $(function () {
        if (client) {
          // We don't need to have the save button available
          // if we are doing automatic saves with pubsub
          $('input.meal_update').remove();
        }

        $('input[type="text"], textarea').change(function (event) {          
          var data_source = event.srcElement || event.currentTarget;
          var data = {
            plan_id: plan_id,
            target: data_source.name,
            value: data_source.value,
            propogate: true
          };
          client.publish(channel, data);

          // After saving, also get some PunchFork recipe suggestions
          console.log('calling to /pf/getRecipesByDish/' + data_source.value);
          $.get('/pf/getRecipesByDish/' + data_source.value, function (data) {
            console.log(data);
          });          
        });        
      });
    }
}(window));
