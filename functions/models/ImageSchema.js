const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  imageName: {
    type: String,
    required: true,
  },
  imagePath: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const Image = mongoose.model("Image", imageSchema);
module.exports = Image;
