// build server
const express = require("express");
const app = express();
const multer = require("multer");
const expressLayouts = require("express-ejs-layouts");
const validator = require("validator");
// const { body, validationResult, check } = require("express-validator");
const port = 3000;

// flash message
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

const {
  loadContact,
  detailContact,
  addContact,
  isDuplicated,
  deleteContact,
  updateContact,
  sortContactByName,
} = require("./utils/contacts");
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
app.get("/", (req, res) => {
  const contacts = loadContact();
  res.render("index", {
    title: "Home Page",
    contacts,
    layout: "layouts/mainlayouts.ejs",
  });
});

app.get("/about", (req, res) => {
  res.render("about", {
    title: "About Page",
    layout: "layouts/mainlayouts.ejs",
  });
});

app.get("/contact", (req, res) => {
  const contacts = sortContactByName();
  res.render("contact", {
    title: "Contact Page",
    contacts,
    msg: req.flash("msg"),
    layout: "layouts/mainlayouts.ejs",
  });
});

app.get("/contact/add", (req, res) => {
  res.render("add-contacts", {
    title: "Add Contact Page",
    layout: "layouts/mainlayouts.ejs",
  });
});

app.post("/contact", upload.single("img"), (req, res) => {
  // MANUAL VALIDATOR
  const name = req.body.name;
  const email = req.body.email;
  const duplicated = isDuplicated(name);
  const isEmail = validator.isEmail(email);

  const errors = [];
  if (duplicated) {
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
  const contact = { ...req.body, img: "img/" + imagePath };
  console.log(contact);
  addContact(contact);
  req.flash("msg", "Contact added successfully!");
  res.redirect("/contact");
});

app.get("/contact/:name", (req, res) => {
  const name = req.params.name;
  const detail = detailContact(name);
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
app.get("/contact/update/:name", (req, res) => {
  const name = req.params.name;
  const contacts = loadContact();
  const findContact = contacts.find((contact) => contact.name === name);
  if (!findContact) {
    res.status(404).send(`${name} Not Found`);
  }
  res.render("update-contact", {
    title: "Update Contact Page",
    layout: "layouts/mainlayouts.ejs",
    findContact,
  });
});

app.post("/contact/update", upload.single("img"), (req, res) => {
  // MANUAL VALIDATOR
  const oldName = req.body.oldName;
  const name = req.body.name;
  const email = req.body.email;
  const duplicated = isDuplicated(name);
  const isEmail = validator.isEmail(email);
  const contacts = loadContact();
  const findContact = contacts.find((contact) => contact.name === oldName);

  const errors = [];
  if (oldName !== name && duplicated) {
    // res.status(400).send("Duplicated");
    errors.push({ msg: "Contact already exists" });
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

  // After validation process
  const imagePath = req.file ? "img/" + req.file.filename : findContact.img;
  const contact = { ...req.body, img: imagePath };
  updateContact(contact);
  req.flash("msg", "Contact updated successfully!");
  res.redirect("/contact");
});

app.get("/contact/delete/:name", (req, res) => {
  const name = req.params.name;
  const contacts = loadContact();
  const findContact = contacts.find((contact) => contact.name === name);
  if (!findContact) {
    res.status(404).send(`${name} Not Found`);
  }
  deleteContact(name);
  req.flash("msg", "Deleted contact successfully!");
  res.redirect("/contact");
});

// for request anything
app.use("/", (req, res) => {
  res.status(404).send("Not Found");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
