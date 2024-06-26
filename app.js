// build server
const express = require("express");
const app = express();
const multer = require("multer");
const expressLayouts = require("express-ejs-layouts");
const validator = require("validator");
// const { body, validationResult, check } = require("express-validator");
const port = 3000;

// Connection to database
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
    const contacts = await Contact.find();

    // Sort by nama (in lowercase)
    contacts.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    return contacts;
  } catch (err) {
    console.error(err);
  }
};

const searchByName = async (nameToSearch) => {
  try {
    // searching case-insensitive
    // FOR WORDS THAT HAVE SIMILARITIES
    const regex = new RegExp(nameToSearch, "i");
    const contacts = await Contact.find({ name: regex });
    return contacts;
  } catch (err) {
    console.error(err);
  }
};

const findByName = async (nameToSearch) => {
  try {
    // find contact case-insensitive
    // FOR SPESIFIC STRING
    const regex = new RegExp(`\\b${nameToSearch}\\b`, "i");
    const contacts = await Contact.find({ name: regex });
    return contacts;
  } catch (err) {
    console.error(err);
  }
};

app.get("/", async (req, res) => {
  let contacts = await sortByName();
  const searchResults = req.flash("searchResults");
  if (searchResults.length > 0) {
    contacts = JSON.parse(searchResults[0]);
  }
  const allNotFavourite = contacts.every((contact) => !contact.isFavourite);
  res.render("index", {
    title: "Contact Page",
    contacts,
    allNotFavourite,
    searchResults,
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

app.post("/search", async (req, res) => {
  // MANUAL VALIDATOR
  const inputName = req.body.search;
  let contacts = await searchByName(inputName);
  console.log(contacts);
  const errors = [];
  if (contacts == undefined) {
    errors.push({ msg: `${inputName} not found!` });
  }
  if (inputName === "") {
    contacts = await sortByName();
  }

  // Jika terdapat error, render kembali halaman dengan pesan kesalahan
  if (errors.length > 0) {
    return res.render("index", {
      title: "Contact Page",
      layout: "layouts/mainlayouts.ejs",
      errors: errors,
    });
  }

  req.flash("searchResults", JSON.stringify(contacts));

  res.redirect("/");
});

// add to favourite feature
app.post("/favourite/:name", async (req, res) => {
  // MANUAL VALIDATOR
  const inputName = req.params.name;
  const isFavourite = req.body.isFavourite === "on";
  let contacts = await findByName(inputName);
  console.log(contacts);
  const errors = [];
  if (contacts == undefined) {
    errors.push({ msg: `${inputName} not found!` });
  }

  // Jika terdapat error, render kembali halaman dengan pesan kesalahan
  if (errors.length > 0) {
    return res.render("index", {
      title: "Contact Page",
      layout: "layouts/mainlayouts.ejs",
      errors: errors,
    });
  }

  const filter = { name: contacts[0].name };

  await Contact.updateOne(filter, { isFavourite: isFavourite });

  res.redirect("/");
});

app.post("/", upload.single("img"), async (req, res) => {
  // MANUAL VALIDATOR
  const inputName = req.body.name;
  const email = req.body.email;
  const num = req.body.num;
  const findContact = await findByName(inputName);

  const isDuplicated = findContact.length > 0;
  const isEmail = validator.isEmail(email);
  const isNum = validator.isMobilePhone(num);

  const errors = [];
  if (isDuplicated) {
    errors.push({ msg: "Contact already exists" });
  }

  if (!isNum) {
    errors.push({ msg: "Not a valid phone num" });
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
  console.log(detail);
  if (detail.length === 0) {
    res.send(404, `${nameParam} Not Found`);
  }
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
  if (findContact.length === 0) {
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
  const num = req.body.num;
  // const duplicated = isDuplicated(name);
  const isEmail = validator.isEmail(email);
  const isNum = validator.isMobilePhone(num);

  const findContact = await findByName(oldName);
  const errors = [];
  if (!findContact) {
    errors.push({ msg: "Contact not found" });
  } else if (oldName.toLowerCase() !== name.toLowerCase()) {
    const duplicated = await findByName(name);
    if (duplicated.length > 0) {
      errors.push({ msg: "Contact already exists" });
    }
  }

  if (!isNum) {
    errors.push({ msg: "Not a valid Phone Num" });
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
    res.status(404).send(`${name} Not Found`);
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
