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
app.get('/', homePage);
// app.get('/show', renderDetails);
app.get('/aboutus', renderAboutUs);
app.get('/database', renderDatabase);
app.post('/searches', weatherHandler);
app.post('/saving', saveToDB);
app.use('*', notFound);
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
function calendarific(req, res) {
  const url = `https://calendarific.com/api/v2/holidays?&api_key=baa9dc110aa712sd3a9fa2a3dwb6c01d4c875950dc32vs&country=US&year=2019`;

  // const url = `https://calendarific.com/api/v2/holidays?api_key=${process.env.API_KEY}&country=${country code}&year=${year-xxxx}&month=${monthxx}&day=${dayxx}`;


  superagent.get(url)
    .then(data =>{
      let timmy = [];
      data.response.holidays.forEach((discription)=> {
        timmy.push(new Holiday(discription));
        console.log('timmy', timmy);
      });
      console.log('data.response.holidays', data.response.holidays);
      console.log('data', data);
      res.status(200).json(timmy);
    })
    .catch(error => errorHandler(error,req,res));
}
function Holiday( timmy) {
  this.name = response.holidays[0].name;
  this.discription = response.holidays[0].discription;
  this.date = response.holidays[0].date;
  this.type = response.holidays[0].type;
  this.locations = response.holidays[0].locations;
  this.states = response.holidays[0].states;


}

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
///////////////////////////////////////////////////////////////////////
//Random Number Generator {by length of an object/array}
function randomNumber(arrObj){
  return Math.floor(Math.random() * arrObj.length);
}

///////////////////////////////////////////////////////////////////////
//Wikipedia API call
function renderDetails(req, res){
  const day = req.body.search.slice(8) //day
  const month = req.body.search.slice(5,7) //month
  const year = req.body.search.slice(0,4) //year
  let url = `http://history.muffinlabs.com/date/${month}/${day}`;

  superagent.get(url)
    .then(results => {
      let temp = results.body.toString('utf8');
      let jsonData = JSON.parse(temp);

      let usersEventsTheirYear = jsonData.data.Events.filter(event => {
        if(event.year === year){
          return true;
        }else {return false;}
      });

      if(usersEventsTheirYear.length > 0){
        let article = new Wikipedia(usersEventsTheirYear[0]);
        console.log('match!!: ');
        console.log(article);
        res.status(200).render('pages/show', { event: article })
      } else {
        let randomEvent = randomNumber(jsonData.data.Events);
        let usersEventsTheirDay = jsonData.data.Events[randomEvent];
        let article = new Wikipedia(usersEventsTheirDay);
        console.log('no match: ')
        console.log(article);
        res.status(200).render('pages/show', { event: article })
      }
    }).catch(error => errorHandler(error, req, res));
}

///////////////////////////////////////////////////////////////////////
//Wikipedia Constructor
function Wikipedia(json){
  let lastIdx = (json.links.length-1);
  this.year = json.year;
  this.text = json.text;
  this.title = json.links[lastIdx].title;
  this.link = json.links[lastIdx].link;
  this.img = 'url goes here';
  // https://en.wikipedia.org/wiki/File:Wikipedia-logo-en-big.png
}

let locationArray = [];
function ipLookUp () {
  let url ='http://ip-api.com/json/'
  superagent.get(url)
    .then(results => {
      locationArray = [];
      locationArray.push(new Location(results.body))
    })
}
ipLookUp();

function Location(info) {
  this.lat = info.lat;
  this.lon =info.lon;
}



function weatherHandler(req, res) {
  const birthday = req.body.search[0];
  console.log(req.body.search[0])
  let epoch = new Date(`${birthday}`).getTime() / 1000
  let url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${locationArray[0].lat},${locationArray[0].lon},${epoch}`;

  superagent.get(url)
    .then(results => {
      console.log(results.body.daily.data[0])
      let weatherArray = new Weather(results.body.daily.data[0]);
      res.status(200).render('pages/show', {event: weatherArray});
    })
    .catch(error => errorHandler(error, req, res));
}

function Weather(weatherObj) {
  this.img = 'https://cdn2.iconfinder.com/data/icons/generic-06/100/Artboard_123-512.png'
  this.year = new Date(weatherObj.time * 1000).toISOString().split('T')[0];
  this.title = 'weather';
  this.text = `${weatherObj.summary} high: ${weatherObj.temperatureHigh}  low: ${weatherObj.temperatureLow}  sunrise: ${new Date(weatherObj.sunriseTime * 1000).toLocaleTimeString()}  sunset: ${new Date(weatherObj.sunsetTime * 1000).toLocaleTimeString()}`
  // this.summary = weatherObj.summary;
  // this.high = weatherObj.temperatureHigh;
  // this.low = weatherObj.temperatureLow;
  // this.sunrise = new Date(weatherObj.sunriseTime * 1000).toLocaleTimeString()
  // this.sunset = new Date(weatherObj.sunsetTime * 1000).toLocaleTimeString()
}

