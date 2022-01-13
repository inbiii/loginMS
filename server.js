///////////////DEPENDENCIES
require("dotenv").config({ path: "./.env" });
const express = require("express");
const app = express();
const port = process.env.PORT || 8500;

////////APP USE

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const { router: userRouter, sess, locals } = require("./routes/userRoutes");
app.use(sess);
app.use(locals);

app.use("/", userRouter);

app.listen(port, () => {
  console.log(`I'm listening on port:${port}`);
});
