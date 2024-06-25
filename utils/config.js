const mongoose = require("mongoose");

mongoose
  .connect(
    "mongodb+srv://hikmahaldrin:hikmah44@cluster0.rvtbfub.mongodb.net/ald?retryWrites=true&w=majority&appName=Cluster0/ald"
  )
  .then(() => console.log("Connected!"));

// create Schema
const Contact = mongoose.model("ContactApp", {
  name: { type: String, required: true },
  email: { type: String, required: true },
  img: { type: String },
});

// new Contact
const contact1 = new Contact({
  name: "hillary",
  email: "hillary@gmail.com",
  img: "img/hillary.jpg",
});

contact1.save().then((contact) => {
  console.log(contact);
});
