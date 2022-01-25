const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  uniqueID: {
    type: String,
    required: true,
  },
  Account_Balance: {
    type: Number,
    required: true,
    default: 0,
  }
},
  { collection: process.env.ACCOUNT_TABLE });

module.exports = mongoose.model("account", accountSchema);
