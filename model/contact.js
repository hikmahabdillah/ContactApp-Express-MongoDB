const mongoose = require("mongoose");

// create Schema
const Contact = mongoose.model("ContactApp", {
  name: { type: String, required: true },
  email: { type: String, required: true },
  img: { type: String },
});

// export
module.exports = Contact;
