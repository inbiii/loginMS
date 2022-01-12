require("dotenv").config({ path: "../.env" });
const { LexModelBuildingService } = require("aws-sdk");
// const dynamoose = require("dynamoose");
const AWS = require("aws-sdk");

const TableName = "KiteMutual";
const table2 = "kmutualUnique";

AWS.config.update({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_EP,
});

let docClient = new AWS.DynamoDB.DocumentClient();

// const getData = async () => {
//   return await docClient
//     .scan({ TableName })
//     .promise()
//     .catch((err) => {
//       console.log(err);
//     });
// };
// let userData;

// getData().then((data) => {
//   userData = data.Items;
//   // console.log(userData);
// });

module.exports = { docClient };
