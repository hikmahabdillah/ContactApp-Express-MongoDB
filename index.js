// build server
require("dotenv").config();
const express = require("express");
const app = express();
const multer = require("multer");
const expressLayouts = require("express-ejs-layouts");
const validator = require("validator");
const port = process.env.PORT || 3000;

// Connection to database
require("./utils/config");
const Contact = require("./model/contact");

// flash message
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// ACCESS TO ASSETS FOR PUBLIC
app.use(express.static("public"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/img/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
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
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
  })
);
app.use(flash());

// APPLICATION LEVEL MIDDLEWARE
const convertPhoneNum = async (number) => {
  if (number.startsWith("08")) {
    return "+62" + number.slice(1);
  }
  return number;
};

const sortByName = async () => {
  try {
    const contacts = await Contact.find().sort({ name: 1 });
    return contacts;
  } catch (err) {
    throw new Error("Failed to fetch contacts");
  }
};

const searchByName = async (nameToSearch) => {
  try {
    const regex = new RegExp(nameToSearch, "i");
    const contacts = await Contact.find({ name: regex });
    return contacts;
  } catch (err) {
    throw new Error("Failed to search contacts");
  }
};

const findByName = async (nameToSearch) => {
  try {
    const regex = new RegExp(`\\b${nameToSearch}\\b`, "i");
    const contacts = await Contact.find({ name: regex });
    return contacts;
  } catch (err) {
    throw new Error("Failed to find contact");
  }
};

// Routes
app.get("/", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.get("/add", (req, res) => {
  res.render("add-contacts", {
    title: "Add Contact Page",
    layout: "layouts/mainlayouts.ejs",
  });
});

app.post("/search", async (req, res, next) => {
  const inputName = req.body.search;
  try {
    let contacts = await searchByName(inputName);
    if (!contacts) {
      contacts = await sortByName();
      req.flash("msg", `${inputName} not found!`);
    }
    req.flash("searchResults", JSON.stringify(contacts));
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

// add to favourite feature
app.post("/favourite/:name", async (req, res, next) => {
  const inputName = req.params.name;
  const isFavourite = req.body.isFavourite === "on";
  try {
    let contacts = await findByName(inputName);
    if (!contacts.length) {
      req.flash("msg", `${inputName} not found!`);
      return res.redirect("/");
    }
    await Contact.updateOne({ name: inputName }, { isFavourite: isFavourite });
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

app.post("/", upload.single("img"), async (req, res, next) => {
  const inputName = req.body.name;
  const email = req.body.email;
  const num = req.body.num;
  try {
    const findContact = await findByName(inputName);
    const isDuplicated = findContact.length > 0;
    const isEmail = validator.isEmail(email);
    const isNum = validator.isMobilePhone(num);
    const phoneNum = await convertPhoneNum(num);

    const errors = [];
    if (isDuplicated) errors.push({ msg: "Contact already exists" });
    if (!isNum) errors.push({ msg: "Not a valid phone num" });
    if (!isEmail) errors.push({ msg: "Not a valid e-mail address" });

    if (errors.length > 0) {
      return res.render("add-contacts", {
        title: "Add Contact Page",
        layout: "layouts/mainlayouts.ejs",
        errors: errors,
      });
    }

    const imagePath = req.file ? req.file.filename : "Default.jpg";
    const contact = new Contact({
      ...req.body,
      num: phoneNum,
      img: "img/" + imagePath,
    });
    await contact.save();
    req.flash("msg", "Contact added successfully!");
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

app.get("/:name", async (req, res, next) => {
  const nameParam = req.params.name;
  try {
    const detail = await Contact.find({ name: nameParam });
    if (!detail.length) {
      return res.status(404).send(`${nameParam} Not Found`);
    }
    res.render("detail", {
      title: "Detail Page",
      detail,
      layout: "layouts/mainlayouts.ejs",
    });
  } catch (err) {
    next(err);
  }
});

// form update data
app.get("/update/:name", async (req, res, next) => {
  const name = req.params.name;
  try {
    const findContact = await Contact.find({ name: name });
    if (!findContact.length) {
      return res.status(404).send(`${name} Not Found`);
    }
    res.render("update-contact", {
      title: "Update Contact Page",
      layout: "layouts/mainlayouts.ejs",
      findContact,
    });
  } catch (err) {
    next(err);
  }
});

app.post("/update", upload.single("img"), async (req, res, next) => {
  const oldName = req.body.oldName;
  const name = req.body.name;
  const email = req.body.email;
  const num = req.body.num;
  try {
    const isEmail = validator.isEmail(email);
    const isNum = validator.isMobilePhone(num);
    const phoneNum = await convertPhoneNum(num);

    const findContact = await findByName(oldName);
    const errors = [];
    if (!findContact.length) errors.push({ msg: "Contact not found" });
    if (oldName.toLowerCase() !== name.toLowerCase()) {
      const duplicated = await findByName(name);
      if (duplicated.length > 0) errors.push({ msg: "Contact already exists" });
    }
    if (!isNum) errors.push({ msg: "Not a valid Phone Num" });
    if (!isEmail) errors.push({ msg: "Not a valid e-mail address" });

    if (errors.length > 0) {
      return res.render("update-contact", {
        title: "Update Contact Page",
        layout: "layouts/mainlayouts.ejs",
        findContact,
        errors: errors,
      });
    }

    const imagePath = req.file
      ? "img/" + req.file.filename
      : findContact[0].img;
    const contact = { ...req.body, num: phoneNum, img: imagePath };
    await Contact.updateOne({ name: findContact[0].name }, contact);
    req.flash("msg", "Contact updated successfully!");
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

app.get("/delete/:name", async (req, res, next) => {
  const name = req.params.name;
  try {
    const findContact = await Contact.find({ name: name });
    if (!findContact.length) {
      return res.status(404).send(`${name} Not Found`);
    }
    await Contact.deleteOne({ name: name });
    req.flash("msg", "Deleted contact successfully!");
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send("Not Found");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
