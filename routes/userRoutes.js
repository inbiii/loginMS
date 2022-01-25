require("dotenv").config({ path: "../.env" });
const router = require("express").Router();
const session = require("express-session");

/////////////REDIS
const RedisStore = require("connect-redis")(session);
const redis = require("redis").createClient({ port: 6379, host: "localhost" });

const {
  register,
  emailConfirm,
  login,
  locals,
  accountVal,
  makeAnAccount,
  resetPass,
  resetConfirm,
  logout,
} = require("../controllers/userController");

const { redirLogin, redirHome } = require("../middlewares");

const TWO_HOURS = 100 * 60 * 60 * 2;
const {
  SESS_NAME = "sid",
  SESS_LIFETIME = TWO_HOURS,
  SESS_SECRET = "default",
  NODE_ENV = "development",
} = process.env;

const IN_PROD = NODE_ENV === "production";

const sess = session({
  store: new RedisStore({
    client: redis,
  }),
  name: SESS_NAME,
  resave: false,
  saveUninitialized: false,
  secret: SESS_SECRET,
  cookie: {
    maxAge: SESS_LIFETIME,
    sameSite: true,
    secure: IN_PROD,
  },
});

router.locals = locals;

/////////////////////////////////////////////////// ROUTES
// router.get("/", (req, res) => {
//   const { userID } = req.session;
//   res.send(`
//   <h1>Welcome!</h1>

//   ${
//     userID
//       ? `
//   <a href='/home'>Home</a>
//   <form method='POST' action='/logout'>
//     <button>Logout</button>
//   </form>
//   `
//       : `
//   <a href='/login'>Login</a>
//   <a href='/register'>Register</a>
//   `
//   }

//   `);
// });

// router.get("/home", redirLogin, async (req, res) => {
//   const { user } = res.locals;
//   const valAcc = await accountVal(req, res, user);
//   if (valAcc) {
//     res.redirect("/makeAnAccount");
//   } else {
//     const { account } = res.locals;
//     res.send(`
//     <h1>HOME</h1>
//     <a href='/'>Main</a>
//     <ul>
//     <li>Name: ${user.name}</li>
//     <li>Email: ${user.email}</li>
//     <li>Account Balance:  $${account.Account_Balance}</li>
//     </ul>
//     `);
//   }
// });

// router.get("/makeAnAccount", (req, res) => {
//   res.send(`
//   <h1>Make Account</h1>
//   <form method='post' action='/makeAnAccount'>
//   <input type='' name='AccountBalance' placeholder='AccountBalance' required />
//   <input type='submit'/>
//   </form>
//   `);
// });

// router.get("/login", redirHome, (req, res) => {
//   // req.session.userID
//   res.send(`
//   <h1>LOGIN</h1>
//   <form method='post' action='/login'>
//   <input type='email' name='email' placeholder='Email' required />
//   <input type='password' name='password' placeholder='password' required />
//   <input type='submit'/>
//   </form>
//   <a href='/register'>REGISTER</a>
//   <a href='/resetPassword'>Forgot Your Password?</a>
//   `);
// });

// router.get("/register", redirHome, (req, res) => {
//   res.send(`
//   <h1>REGISTER</h1>
//   <form method='post' action='/register'>
//   <input type='name' name='name' placeholder='name' required />
//   <input type='email' name='email' placeholder='Email' required />
//   <input type='password' name='password' placeholder='password' required />
//   <input type='password' name='confirm_password' placeholder='confirm password' required />
//   <input type='submit'/>
//   </form>
//   <a href='/login'>LOGIN</a>
//   `);
// });

// router.get("/resetPassword", (req, res) => {
//   res.send(` <h1>RESET PASSWORD</h1>
//   <form method='post' action='/resetPassword'>
//   <input type='email' name='email' placeholder='Type your Email' required />
//   <input type='submit'/>`);
// });

// router.get("/resetPassword/:token", redirHome, (req, res) => {
//   const { token } = req.params;
//   res.send(` <h1>RESET PASSWORD</h1>
//   <form method='post' action='/resetPassword/${token}'>
//   <input type='password' name='password' placeholder='Type your new password' required />
//   <input type='password' name='confirm_password' placeholder='Type your new password again' required />

//   <input type='submit'/>`);
// });

router.get("/profile", (req, res) => {
  const { user } = res.locals;
  console.log(user);
});

////////////////////////////////////////////////FUNCTIONAL POSTS

router.post("/makeAnAccount", makeAnAccount);

router.get("/registration/:token", emailConfirm);

router.post("/register", register);

router.post("/login", login);

router.post("/resetPassword", resetPass);

router.post("/resetPassword/:token", resetConfirm);

router.post("/logout", redirLogin, logout);

router.delete("/users", (req, res) => {});

module.exports = { router, sess, locals };
