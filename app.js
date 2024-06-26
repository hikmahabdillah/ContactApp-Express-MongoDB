// build server
const express = require("express");
const app = express();
const multer = require("multer");
const expressLayouts = require("express-ejs-layouts");
const validator = require("validator");
// const { body, validationResult, check } = require("express-validator");
const port = 3000;

require("./utils/config");
const Contact = require("./model/contact");

// flash message
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

// ACCESS TO ASSETS FOR PUBLIC
app.use(express.static("public"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/img/"); // Lokasi penyimpanan file di server
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Menyimpan dengan nama asli
  },
});
const upload = multer({ storage: storage });

// USE EJS
app.set("views", "./views");
app.set("view engine", "ejs");

app.use(expressLayouts);

app.use(express.urlencoded({ extended: true }));

// configuration flash
app.use(cookieParser("secret"));
app.use(
  session({
    cookie: { maxAge: 60000 },
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(flash());

// APPLICATION LEVEL MIDDLEWARE
const sortByName = async () => {
  try {
    // Ambil semua kontak
    const contacts = await Contact.find();

    // Sortir berdasarkan nama (dalam bentuk lowercase)
    contacts.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    return contacts;
  } catch (err) {
    console.error(err);
  }
};

app.get("/", async (req, res) => {
  const contacts = await sortByName();
  res.render("index", {
    title: "Contact Page",
    contacts,
    msg: req.flash("msg"),
    layout: "layouts/mainlayouts.ejs",
  });
});

app.get("/add", (req, res) => {
  res.render("add-contacts", {
    title: "Add Contact Page",
    layout: "layouts/mainlayouts.ejs",
  });
});

app.post("/", upload.single("img"), async (req, res) => {
  // MANUAL VALIDATOR
  const inputName = req.body.name;
  const email = req.body.email;
  const findContact = await Contact.find({ name: inputName.toLowerCase() });
  let isDuplicated = findContact.length > 0;

  const isEmail = validator.isEmail(email);

  const errors = [];
  if (isDuplicated) {
    errors.push({ msg: "Contact already exists" });
  }

  if (!isEmail) {
    errors.push({ msg: "Not a valid e-mail address" });
  }

  // Jika terdapat error, render kembali halaman dengan pesan kesalahan
  if (errors.length > 0) {
    return res.render("add-contacts", {
      title: "Add Contact Page",
      layout: "layouts/mainlayouts.ejs",
      errors: errors,
    });
  }

  // After validation process
  const imagePath = req.file ? req.file.filename : "Default.jpg";
  const contact = new Contact({ ...req.body, img: "img/" + imagePath });
  console.log(contact);
  await contact.save();
  // addContact(contact);
  req.flash("msg", "Contact added successfully!");
  res.redirect("/");
});

app.get("/:name", async (req, res) => {
  const nameParam = req.params.name;
  const detail = await Contact.find({ name: nameParam });
  // if (!detail) {
  //   res.send(404, `${name} Not Found`);
  // }
  res.render("detail", {
    title: "Detail Page",
    detail,
    layout: "layouts/mainlayouts.ejs",
  });
});

// form update data
app.get("/update/:name", async (req, res) => {
  const name = req.params.name;
  const findContact = await Contact.find({ name: name });
  if (!findContact) {
    res.status(404).send(`${name} Not Found`);
  }
  res.render("update-contact", {
    title: "Update Contact Page",
    layout: "layouts/mainlayouts.ejs",
    findContact,
  });
});

app.post("/update", upload.single("img"), async (req, res) => {
  // MANUAL VALIDATOR
  const oldName = req.body.oldName;
  const name = req.body.name;
  const email = req.body.email;
  // const duplicated = isDuplicated(name);
  const isEmail = validator.isEmail(email);
  const findContact = await Contact.find({ name: oldName });

  const errors = [];
  if (!findContact) {
    errors.push({ msg: "Contact not found" });
  } else if (oldName.toLowerCase() !== name.toLowerCase()) {
    const duplicated = await Contact.findOne({ name: name.toLowerCase() });
    if (duplicated) {
      errors.push({ msg: "Contact already exists" });
    }
  }

  if (!isEmail) {
    errors.push({ msg: "Not a valid e-mail address" });
  }

  // Jika terdapat error, render kembali halaman dengan pesan kesalahan
  if (errors.length > 0) {
    return res.render("update-contact", {
      title: "Update Contact Page",
      layout: "layouts/mainlayouts.ejs",
      findContact,
      errors: errors,
    });
  }

  delete findContact.oldName;
  // After validation process
  const imagePath = req.file ? "img/" + req.file.filename : findContact[0].img;
  const contact = { ...req.body, img: imagePath };
  const filter = { name: findContact[0].name };

  await Contact.updateOne(filter, contact);

  req.flash("msg", "Contact updated successfully!");
  res.redirect("/");
});

app.get("/delete/:name", async (req, res) => {
  const name = req.params.name;
  const findContact = await Contact.find({ name: name });
  if (!findContact) {
    res.status(n404).send(`${name} Not Found`);
  }
  await Contact.deleteOne({ name: findContact[0].name });
  req.flash("msg", "Deleted contact successfully!");
  res.redirect("/");
});

// for request anything
app.use("/", (req, res) => {
  res.status(404).send("Not Found");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
