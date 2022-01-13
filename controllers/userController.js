require("dotenv").config({ path: "../.env" });
////////////////////////////////////////////////////DEPENDENCIES
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

////////////////////////////////////////////////////////DB IMPORTS

const { User, Account } = require("../models/user");
const { docClient } = require("../config/database");

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
      let { email, password, confirm_password, name } = req.body;

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
          const url = `http://localhost:${process.env.PORT}/registration/${token}`;
          console.log(`Kite Mutal Email Sending`);
          transporter.sendMail({
            from: '"Kite Mutual Registration"<kitemutualregserver@gmail.com>',
            to: user.email,
            subject: "Confirm Registration",
            html: `Please <a href="${url}">click here</a> to confirm your email `,
          });
        }
      );

      res.status(201).send("Wait while we send a validation email");
    } catch (e) {
      console.error("email", e);
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
        res.redirect("/login");
      } else {
        req.session.userID = user.uniqueID;
        req.session.email = user.email;
        // res.send({
        //   status: "success",
        //   Data: {
        //     email: user.email,
        //     userID: user.uniqueID,
        //     name: user.name,
        //   },
        // });

        res.redirect("/home");
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
    const { email } = req.body;
    let rpu;
    docClient.get(
      {
        TableName,
        Key: {
          email,
        },
      },
      (err, data) => {
        if (err) {
          console.log("Reset Email GET Problem: ", JSON.stringify(err));
        } else {
          rpu = data.Item;
          if (rpu) {
            jwt.sign(
              { uniqueID: rpu.uniqueID, email: rpu.email },
              process.env.EMAIL_KEY,
              {
                expiresIn: "2hr",
              },
              (err, token) => {
                const url = `http://localhost:${process.env.PORT}/resetPassword/${token}`;
                console.log(`Kite Mutal Password Reset Email Sending`);
                transporter.sendMail({
                  from: '"Kite Mutual Registration"<kitemutualregserver@gmail.com>',
                  to: rpu.email,
                  subject: "Reset your password",
                  html: `Please <a href="${url}">click here</a> to reset your  password`,
                });
                res
                  .status(200)
                  .send("Check your email for password reset link");
              }
            );
          } else {
            res.status(200).send("No Email Found");
          }
        }
      }
    );
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

        let params = {
          TableName,
          Key: {
            email,
          },
          UpdateExpression: "set #name = :val",
          ExpressionAttributeNames: {
            "#name": "password",
          },
          ExpressionAttributeValues: { ":val": encryptedPassword },
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
      }
    } catch (e) {}
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
