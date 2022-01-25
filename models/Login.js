const mongoose = require("mongoose");

const loginSchema = new mongoose.Schema(
  {
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
  },
  { collection: "KiteMutual" }
);

module.exports = mongoose.model("User", loginSchema);
