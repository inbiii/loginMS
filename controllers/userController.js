require("dotenv").config({ path: "../.env" });
////////////////////////////////////////////////////DEPENDENCIES
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

////////////////////////////////////////////////////////DB IMPORTS

const User = require("../models/Login");
const Account = require("../models/Account");

//////////////VARIABLE CREATION ///////////////////////////////
const TableName = process.env.USER_TABLE;
const table2 = process.env.ACCOUNT_TABLE;
let transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

//////////////////////////////////////////////ROUTE FUNCTIONALITY

module.exports = {
  Account: Account,
  User: User,
  locals: async (req, res, next) => {
    const { userID, email } = req.session;
    if (userID && email) {
      const data = await docClient
        .query(
          {
            TableName,
            KeyConditionExpression: "#e = :e",
            ExpressionAttributeNames: {
              "#e": "email",
            },
            ExpressionAttributeValues: {
              ":e": email,
            },
          },
          (err, data) => {
            if (err) {
              console.log(JSON.stringify(err));
            } else {
              return data;
            }
          }
        )
        .promise()
        .catch((e) => {
          res.status(500).send(e);
        });
      res.locals.user = data.Items[0];
    }
    next();
  },
  register: async (req, res) => {
    try {
      // pull variables
      let { email, password, confirm_password, name, siteName } = req.body;

      //Validate
      if (!(email && password && name)) {
        throw new Error({ message: "needs all fields" });
      }
      if (password !== confirm_password) {
        res.redirect("/register?error=passwords");
      }

      // generate unique ID
      let uniqueID = uuidv4();
      //encrypt
      let encryptedPassword = await bcrypt.hash(password, 10);

      console.log("Im here");
      //make user in DB
      const user = await User.create({
        email,
        name,
        password: encryptedPassword,
        uniqueID,
      });

      console.log(user);

      //make token
      jwt.sign(
        { uniqueID: user.uniqueID, email: user.email },
        process.env.EMAIL_KEY,
        {
          expiresIn: "2hr",
        },
        (err, token) => {
          const url = `${siteName}/registration/${token}`;
          console.log(`Kite Mutal Email Sending`);
          transporter.sendMail({
            from: '"Kite Mutual Registration"<kitemutualregserver@gmail.com>',
            to: user.email,
            subject: "Confirm Registration",
            html: `Please <a href="${url}">click here</a> to confirm your email `,
          });
        }
      );

      res.status(201).json({
        status: "success",
        message: "Check your email for the verification link!",
      });
    } catch (e) {
      res.send(e);
    }
  },

  emailConfirm: async (req, res) => {
    try {
      const { token } = req.params;
      const { uniqueID, email } = jwt.verify(token, process.env.EMAIL_KEY);

      const data = await User.findOne({
        email,
        uniqueID,
      });

      data.verified = true;
      data.save();
      console.log(data);
      res.status(200).send("Successfully Registered!");
    } catch (e) {
      console.log(e);
      res.status(400).send("Uh Oh, Registration Error!");
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user.verified) {
        console.log("no email", user);
        res.status(404).json("Validate your email");
      }

      const validPass = bcrypt.compareSync(password, user.password);

      if (!validPass) {
        res.json({
          status: "fail",
          message: "invalid password",
        });
      } else {
        req.session.userID = user.uniqueID;
        req.session.email = user.email;
        console.log(req.session, process.env.SESS_NAME);
        res.json({
          status: "success",
          Data: {
            email: user.email,
            userID: user.uniqueID,
            name: user.name,
          },
        });

        // res.redirect("/home");
      }
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  },
  accountVal: async (req, res, user) => {
    try {
      let params = {
        KeyConditionExpression: "#e = :e",
        ExpressionAttributeNames: {
          "#e": "uniqueID",
        },
        ExpressionAttributeValues: {
          ":e": user.uniqueID,
        },
      };
      params.TableName = table2;
      const data = await docClient
        .query(params)
        .promise()
        .catch((e) => {
          throw new Error(JSON.stringify(e));
        });

      const valid = data.Items.length === 0 ? true : false;
      if (!valid) res.locals.account = data.Items[0];
      return valid;
    } catch (err) {
      // res.status(500).send(err);
      throw new Error("catch block", err);
    }
  },
  makeAnAccount: async (req, res) => {
    try {
      const { uniqueID } = res.locals.user;
      const Account_Balance = parseFloat(req.body.AccountBalance);
      const account = await Account.create({
        uniqueID,
        Account_Balance,
      });
      res.locals.account = account;
      res.redirect("/home");
    } catch (err) {
      console.log("makeAnAccount", err);
    }
  },
  resetPass: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      jwt.sign(
        { uniqueID: user.uniqueID, email: user.email },
        process.env.EMAIL_KEY,
        {
          expiresIn: "2hr",
        },
        (err, token) => {
          const url = `http://localhost:${process.env.PORT}/resetPassword/${token}`;
          console.log(`Kite Mutal Password Reset Email Sending`);
          transporter.sendMail({
            from: '"Kite Mutual Registration"<kitemutualregserver@gmail.com>',
            to: user.email,
            subject: "Reset your password",
            html: `Please <a href="${url}">click here</a> to reset your  password`,
          });
          res.status(200).send("Check your email for password reset link");
        }
      );
    } catch (err) {
      console.log(err);
      res.status(400).send(err);
    }
  },

  resetConfirm: async (req, res) => {
    try {
      const { confirm_password, password } = req.body;
      if (password !== confirm_password) {
        res.status(404).send("passwords do not match");
      } else {
        const { token } = req.params;
        const { uniqueID, email } = jwt.verify(token, process.env.EMAIL_KEY);
        let encryptedPassword = await bcrypt.hash(password, 10);

        const user = user.findOne({ uniqueID });
        user.password = encryptedPassword;
        await user.save();
      }
    } catch (e) {
      console.log(e);
      res.status(400).send(e);
    }
  },

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("/home");
      }

      res.clearCookie(process.env.SESS_NAME);
      res.redirect("/login");
    });
  },
};
