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
    day         : String,
    name        : String,
    ingredients : [Ingredient]
  });

  Plan = new Schema({
    meals : [Meal]
  });

  Plan.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });
  
  Plan.method('findMealByDay', function (day) {
    var meal = null, i;
    for(i = 0; i < this.meals.length; i += 1) {
      if (this.meals[i].day === day) {
        meal = this.meals[i];
        break;
      }      
    }
    return meal;
  });
  
  mongoose.model('Plan', Plan);

  fn();
};

exports.defineModels = defineModels;