///////////////DEPENDENCIES
require("dotenv").config({ path: "./.env" });
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 8500;

////////APP USE
app.set("trust proxy", 1);
app.use(
  cors({
    // origin: "http://localhost:4200",
    // credentials: true,
    // optionsSuccessStatus: 200,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

///////Mongoose
const mongoose = require("mongoose");
mongoose.connect(`mongodb://${process.env.MONGOSTR}@${process.env.MDBSERVER}`);
mongoose.connection.on("connected", () => {
  console.log("db connected");
});
mongoose.connection.on("disconnect", () => {
  console.log("db disconnected");
});
mongoose.connection.on("error", (e) => {
  console.log("db errored", e);
});

const { router: userRouter, sess, locals } = require("./routes/userRoutes");
app.use(sess);
app.use(locals);

app.use("/", userRouter);

app.listen(port, () => {
  console.log(`I'm listening on port:${port}`);
});
