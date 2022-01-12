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

const User = dynamoose.model("KiteMutual", userSchema);
module.exports = User;
