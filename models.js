var Plan,
    Meal,
    Ingredient;

var defineModels = function (mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;
  
  Ingredient = new Schema({
    name      : String,
    category  : String
  });

  Meal = new Schema({
    name        : String,
    ingredients : [Ingredient]
  });

  Plan = new Schema({
    day   : String,
    meals : [Meal]
  });


  mongoose.model('Ingredient', Ingredient);
  mongoose.model('Meal', Meal);
  mongoose.model('Plan', Plan);

  fn();
};

exports.defineModels = defineModels;