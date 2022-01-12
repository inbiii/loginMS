const e = require("express");

module.exports = {
  redirLogin: (req, res, next) => {
    if (!req.session.userID) {
      res.redirect("/login");
    } else {
      next();
    }
  },

  redirHome: (req, res, next) => {
    if (req.session.userID) {
      res.redirect("/home");
    } else {
      next();
    }
  },
};
