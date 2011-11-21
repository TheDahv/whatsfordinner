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

      $('#generate_print_sheet').click(function () {
        var print_div,
            meal,
            meal_title,
            meal_recipe,
            i,
            ingredient_length,
            ingredient_array=[],
            ul_ref;

        print_div = $('<div />', { id:'print_list' }).
          css('background-color','#fff').
          css('height','auto').
          css('width','600px');

        print_div.appendTo('#main');

        $('.meal_day').each(function (i,el) {
          meal = $(el);
          meal_title = $(meal.find('input')[0]).val();
          meal_recipe = $(meal.find('input')[1]).val();
          ingredient_array = meal.find('textarea').val().split(',');
          
          $('<h3 />').text(meal_title + (meal_recipe ? ' - ' + meal_recipe : '')).appendTo(print_div);

          ingredient_length = ingredient_array.length;
          i = 0;
          ul_ref = $('<ul />');
          for( ; i < ingredient_length; i+=1){
            $('<li />').text(ingredient_array[i]).css('margin-left','10px').appendTo(ul_ref);
          }
          ul_ref.appendTo(print_div);
        });
        $('html,body').animate({ scrollTop: $(document).height() }, 'slow');
        return false;
      });
    });
  }
}(window));
