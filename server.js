///////////////DEPENDENCIES
require("dotenv").config({ path: "./.env" });
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const AWS = require("aws-sdk");
const { User, Account } = require("./models/user");
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
  accountVal,
  makeAnAccount,
} = require("./controllers/userController");
const { userData, docClient } = require("./config/database");
const nodemailer = require("nodemailer");
const { redirLogin, redirHome } = require("./middlewares");
const { aws } = require("dynamoose");

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

app.post("/read", async (req, res) => {
  const { email } = req.body;
  const admins = [
    "okarimi@talentpath.com",
    "etyo@talentpath.com",
    "mtatum@talentpath.com",
    "mmarchetti@talentpath.com",
    "cbonsma@talentpath.com",
    "jkhan@talentpath.com",
    "lmichaeli@talentpath.com",
    "fracaku@talentpath.com",
  ];
  const valid = admins.includes(email);
  if (valid) {
    let params = {};
    params.TableName = "kmutualUnique";
    const data = await docClient
      .scan(params)
      .promise()
      .catch((e) => {
        console.log(e);
        res.status(500).send(e);
      });

    res.status(200).send({ status: "success", data: data.Items });
  } else {
    res.status(200).send("Need an administrator acc");
  }
});

app.get("/home", redirLogin, async (req, res) => {
  const { user } = res.locals;
  const valAcc = await accountVal(req, res, user);
  if (valAcc) {
    res.redirect("/makeAnAccount");
  } else {
    const { account } = res.locals;
    res.send(`
  <h1>HOME</h1>
  <a href='/'>Main</a>
  <ul>
  <li>Name: ${user.name}</li>
  <li>Email: ${user.email}</li>
  <li>Account Balance:  $${account.Account_Balance}</li>
  </ul>
  `);
  }
});

app.post("/makeAnAccount", redirHome, makeAnAccount);

app.get("/makeAnAccount", (req, res) => {
  res.send(`
  <h1>Make Account</h1>
  <form method='post' action='/makeAnAccount'>
  <input type='' name='AccountBalance' placeholder='AccountBalance' required />
  <input type='submit'/>
  </form>
  `);
});

app.get("/login", redirHome, (req, res) => {
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

app.get("/register", redirHome, (req, res) => {
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

app.get("/registration/:token", redirHome, emailConfirm);

app.post("/login", redirHome, login);

app.delete("/users", (req, res) => {});

app.get("/profile", (req, res) => {
  const { user } = res.locals;
  console.log(user);
});

app.post("/logout", redirLogin, (req, res) => {
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
