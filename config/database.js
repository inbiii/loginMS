require("dotenv").config({ path: "../.env" });
const { LexModelBuildingService } = require("aws-sdk");
const AWS = require("aws-sdk");

AWS.config.update({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_EP,
});

let docClient = new AWS.DynamoDB.DocumentClient();

module.exports = { docClient };
