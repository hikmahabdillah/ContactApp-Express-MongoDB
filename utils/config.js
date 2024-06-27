const mongoose = require("mongoose");
const mongoUri = process.env.MONGO_URI;

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// new Contact
// const contact1 = new Contact({
//   name: "hillary",
//   email: "hillary@gmail.com",
//   img: "img/hillary.jpg",
// });

// contact1.save().then((contact) => {
//   console.log(contact);
// });
