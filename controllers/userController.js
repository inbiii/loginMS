require("dotenv").config();
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const { userData, docClient } = require("../config/database");
const session = require("express-session");
const AWS = require("aws-sdk");

const TableName = "KiteMutual";
const table2 = "kmutualUnique";

let transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const TWO_HOURS = 100 * 60 * 60 * 2;

const {
  SESS_NAME = "sid",
  SESS_LIFETIME = TWO_HOURS,
  SESS_SECRET = "default",
  NODE_ENV = "development",
} = process.env;

const IN_PROD = NODE_ENV === "production";

module.exports = {
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
      console.log(res.locals.user);
    }
    next();
  },
  register: async (req, res) => {
    try {
      // pull variables
      let { email, password, confirm_password, name } = req.body;

      //Validate
      if (!(email && password && name)) {
        throw new Error({ message: "needs all fields" });
      }
      if (password !== confirm_password) {
        res.redirect("/register?error=passwords");
      }
      //TODO: Validate doesnt exist

      // generate unique ID
      let uniqueID = uuidv4();
      //encrypt
      let encryptedPassword = await bcrypt.hash(password, 10);

      //make user in DB
      const user = await User.create({
        email,
        name,
        password: encryptedPassword,
        uniqueID,
      });

      //make token
      jwt.sign(
        { uniqueID: user.uniqueID, email: user.email },
        process.env.EMAIL_KEY,
        {
          expiresIn: "2hr",
        },
        (err, token) => {
          const url = `http://localhost:8000/registration/${token}`;
          console.log(`Kite Mutal Email Sending`);
          transporter.sendMail({
            from: '"Kite Mutual Registration"<kitemutualregserver@gmail.com>',
            to: user.email,
            subject: "Confirm Registration",
            html: `Please <a href="${url}">click here</a> to confirm your email `,
          });
        }
      );

      res.status(201).json(user);
    } catch (e) {
      console.error(e);
    }
  },

  emailConfirm: async (req, res) => {
    try {
      const { token } = req.params;
      const { uniqueID, email } = jwt.verify(token, process.env.EMAIL_KEY);
      // const user = await userData.filter((el) => el.uniqueID === uniqueID)[0];

      let params = {
        TableName,
        Key: {
          email,
        },
        UpdateExpression: "set #name = :val",
        ExpressionAttributeNames: {
          "#name": "verified",
        },
        ExpressionAttributeValues: { ":val": true },
        ReturnValue: "UPDATED_NEW",
      };

      docClient.update(params, (err, data) => {
        if (err) {
          console.log("ERR UPDATE:", JSON.stringify(err, null, 2));
        } else {
          console.log("UpdateItem:", JSON.stringify(data, null, 2));
          // res.status(200).send("Successfully Registered!");
          res.redirect("/login");
        }
      });
    } catch (e) {
      console.log(e);
      res.status(400).send("Uh Oh, Registration Error!");
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
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
          throw new Error(e);
        });

      const user = data.Items[0];
      if (!user) {
        console.log("no user");
        res.status(404).send("No user with that Email");
      }

      if (!user.verified) {
        console.log("no email", user);
        res.status(404).send("Validate your email");
      }

      const validPass = bcrypt.compareSync(password, user.password);

      if (!validPass) {
        console.log(user);
        throw new Error("invalid login credentials");
      } else {
        req.session.userID = user.uniqueID;
        req.session.email = user.email;
        console.log(req.session);
        res.redirect("/home");
      }
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  },
  accountVal: async (req, res) => {
    try {
      const data = await docClient
        .query({})
        .promise()
        .catch((e) => console.log(JSON.stringify(e)));
    } catch (err) {
      res.status(500).send(e);
    }
  },
};
