"use strict";

// Dependencies
const express = require("express");
const superagent = require("superagent");
const pg = require("pg");
const cors = require("cors");
const methodOverride = require("method-override");
const convert = require("xml-js");

// Environment variables
require("dotenv").config();

// Application Setup
const app = express();
app.use(cors());

//allows us to look inside request.body (usually we can not it returns undefined)
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./public"));
app.set("view engine", "ejs");
const PORT = process.env.PORT || 3000;

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect().then(() => {
  // Make sure the server is listening for requests
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
});
client.on("error", err => console.error(err));

app.use(
  methodOverride((req, res) => {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
      let method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);

// Routes
app.get("/", homePage);
app.get("/show", renderDetails);
app.get("/aboutus", renderAboutUs);
app.get("/database", renderDatabase);
app.post("/searches", renderDetails);
app.post("/saving", saveToDB);
app.use("*", notFound);
app.use(errorHandler);

///////////////////////////////////////////////////////////////////////
//HomePage
function homePage(req, res) {
  res.render("pages/index");
}

///////////////////////////////////////////////////////////////////////
//Render User Details
function renderDetails(req, res) {
  let getDateBody = req.body.search;
  let splitSearch = getDateBody.split("-");
  console.log(splitSearch);
  let URL = `http://api.hiztory.org/aviation/${splitSearch[1]}/${splitSearch[2]}/1/15/api.xml`;
  superagent.get(URL).then(result => {
    let data = convert.xml2js(result.text, { compact: true });
    // console.log(data.aviation.events.event[0]);
    let events = data.aviation.events.event[0];
    let thisPersonsEvent = new History(events);
    // console.log(events);
    res.render("pages/show", { event: thisPersonsEvent });
  });

  // Get the date from Body
  // Pass data into API
  // Retrieve Data from API
  // Use Data to render template
}

function History(data) {
  this.title = "";
  this.year = data._attributes.date;
  this.text = data._attributes.content;
  this.img = "https://via.placeholder.com/150";
  this.link = "";
}
///////////////////////////////////////////////////////////////////////
//Render User Details
function renderAboutUs(req, res) {
  res.render("pages/aboutus");
}
//////////////////////////////////
// function calendarific(req, res) {
//   const url = `https://calendarific.com/api/v2/holidays?api_key=${process.env.api_key}&country=${country code}&year=${year-xxxx}&month=${month}&day=${day}`;

//   superagent.get(url)
//     .then(data =>{
//       console.log(data)
//     })
//     .catch(error => errorHandler(error,req,res));
// }

///////////////////////////////////////////////////////////////////////
//Render User Details
function renderDatabase(req, res) {
  res.render("pages/showdb");
}
///////////////////////////////////////////////////////////////////////
//Save Details to Database
function saveToDB(req, res) {
  //make a SQL query
  //
}
///////////////////////////////////////////////////////////////////////
//Not Found
function notFound(req, res) {
  res.status(404).send("Not Found");
}
///////////////////////////////////////////////////////////////////////
//Error Handler
function errorHandler(error, req, res) {
  console.error(error);
  res.status(500).render("pages/error");
}
