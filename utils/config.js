const mongoose = require("mongoose");

mongoose
  .connect(
    "mongodb+srv://hikmahaldrin:hikmah44@cluster0.rvtbfub.mongodb.net/ald?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected!"));

// new Contact
// const contact1 = new Contact({
//   name: "hillary",
//   email: "hillary@gmail.com",
//   img: "img/hillary.jpg",
// });

// contact1.save().then((contact) => {
//   console.log(contact);
// });
