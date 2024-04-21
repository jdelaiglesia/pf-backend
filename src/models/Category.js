const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  deleted: {
    type: Boolean,
    default: false,
  }
});

const Category = mongoose.model("Category", CategorySchema);

module.exports = Category;