///////////////DEPENDENCIES
require("dotenv").config({ path: "./.env" });
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const AWS = require("aws-sdk");
const User = require("./models/user");
const res = require("express/lib/response");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { DocumentClient } = require("aws-sdk/clients/dynamodb");
const { nextTick } = require("process");
const {
  register,
  emailConfirm,
  login,
  locals,
  sess,
} = require("./controllers/userController");
const { userData, docClient } = require("./config/database");
const nodemailer = require("nodemailer");

////////APP USE

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const port = process.env.PORT || 8000;

const TWO_HOURS = 100 * 60 * 60 * 2;
const {
  SESS_NAME = "sid",
  SESS_LIFETIME = TWO_HOURS,
  SESS_SECRET = "default",
  NODE_ENV = "development",
} = process.env;

const IN_PROD = NODE_ENV === "production";
const TableName = "KiteMutual";

app.use(
  session({
    name: SESS_NAME,
    resave: false,
    saveUninitialized: false,
    secret: SESS_SECRET,
    cookie: {
      maxAge: SESS_LIFETIME,
      sameSite: true,
      secure: IN_PROD,
    },
  })
);

app.use(locals);

/////////////////////////////////////////////////// ROUTES
app.get("/", (req, res) => {
  const { userID } = req.session;
  res.send(`
  <h1>Welcome!</h1>

  ${
    userID
      ? `
  <a href='/home'>Home</a>
  <form method='POST' action='/logout'>
    <button>Logout</button>
  </form>
  `
      : `
  <a href='/login'>Login</a>
  <a href='/register'>Register</a>
  `
  }
  
  
  `);
});

app.get("/home", (req, res) => {
  const { user } = res.locals.user;

  console.log("`Im the home log");
  res.send(`
  <h1>HOME</h1>
  <a href='/'>Main</a>
  <ul>
  <li>NAME: ${user.name}</li>
  <li>EMAIL:${user.email}</li>
  </ul>
  `);
});

app.get("/login", (req, res) => {
  // req.session.userID
  res.send(`
  <h1>LOGIN</h1>
  <form method='post' action='/login'>
  <input type='email' name='email' placeholder='Email' required />
  <input type='password' name='password' placeholder='password' required />
  <input type='submit'/>
  </form>
  <a href='/register'>REGISTER</a>
  `);
});

app.get("/register", (req, res) => {
  res.send(`
  <h1>REGISTER</h1>
  <form method='post' action='/register'>
  <input type='name' name='name' placeholder='name' required />
  <input type='email' name='email' placeholder='Email' required />
  <input type='password' name='password' placeholder='password' required />
  <input type='password' name='confirm_password' placeholder='confirm password' required />
  <input type='submit'/>
  </form>
  <a href='/login'>LOGIN</a>
  `);
});

app.post("/register", register);

app.get("/registration/:token", emailConfirm);

app.post("/login", login);

app.delete("/users", (req, res) => {});

app.get("/profile", (req, res) => {
  const { user } = res.locals;
  console.log(user);
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/home");
    }

    res.clearCookie(SESS_NAME);
    res.redirect("/login");
  });
});

app.listen(port, () => {
  console.log(`I'm listening on port:${port}`);
});

//
