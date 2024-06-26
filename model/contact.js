const mongoose = require("mongoose");

// create Schema
const Contact = mongoose.model("ContactApp", {
  name: { type: String, required: true },
  email: { type: String, required: true },
  num: { type: String, required: true, unique: true },
  isFavourite: { type: Boolean, default: false },
  img: { type: String },
});

// export
module.exports = Contact;
