require("dotenv").config({ path: "../.env" });
const dynamoose = require("dynamoose");

const Schema = dynamoose.Schema;

const userSchema = new Schema({
  uniqueID: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    default: null,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  token: {
    type: String,
  },
});

const accountSchema = new Schema({
  uniqueID: {
    type: String,
    required: true,
  },
  Account_Balance: {
    type: Number,
    required: true,
    default: 0,
  },
});

const User = dynamoose.model(process.env.USER_TABLE, userSchema);
const Account = dynamoose.model(process.env.ACCOUNT_TABLE, accountSchema);

module.exports = { Account, User };
