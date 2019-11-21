'use strict';

// Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');
const methodOverride = require('method-override');
const convert = require('xml-js');

// Environment variables
require('dotenv').config();

// Application Setup
const app = express();
app.use(cors());

//allows us to look inside request.body (usually we can not it returns undefined)
app.use(express.urlencoded({ extended: true, }));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 3000;

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect().then(() => {
// Make sure the server is listening for requests
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
});
client.on('error', err => console.error(err));
//Method Override node module
app.use(
  methodOverride((req, res) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      let method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);

// Routes
app.get('/', homePage);
app.post('/searches', renderDetails);
app.get('/aboutus', renderAboutUs);
app.get('/database', renderDatabase);
app.post('/searches', weatherHandler);
app.put('/update/:id', updateBirthday);
app.delete('/delete/:id', deleteBirthday);
app.get('/saving', showForm)
app.post('/saving', saveToDB);
app.use('*', notFound);
app.use(errorHandler);

// Getting today's date
app.locals.today = new Date().toISOString().split('T')[0];


///////////////////////////////////////////////////////////////////////
//HomePage
function homePage(req, res) {
  res.render('pages/index');
}

///////////////////////////////////////////////////////////////////////
//Render User Details
function renderAboutUs(req, res) {
  res.render('pages/aboutus');
}

///////////////////////////////////////////////////////////////////////
//Render User Details
function renderDatabase(req, res) {
  let SQL = `SELECT * FROM birthdays`;

  client.query(SQL).then(result => {
    res.render('pages/showdb', { person: result.rows});
  })
}
///////////////////////////////////////////////////////////////////////
//Save Details to Database
function saveToDB(req, res) {
  let {first_name, birthday} = req.body;
  let SQL = 'INSERT INTO birthdays(first_name, birthday) VALUES ($1, $2);';
  let values = [first_name, birthday];

  client.query(SQL, values)
    .then(res.redirect('/database'))
    .catch( err => console.error(err));
}
//turns get to post
function showForm(req, res) {
  res.render('saving');
}
///////////////////////////////////////////////////////////////////////
//Update Database
function updateBirthday(req, res){
  let SQL = 'UPDATE birthdays SET first_name=$1, birthday=$2 WHERE id=$3;';
  let safeValues = [req.body.first_name, req.body.birthday, req.body.id];

  client.query(SQL, safeValues).then(result => {
    res.status(200).redirect('/database')
  }).catch(error => errorHandler(error, req, res));
}
///////////////////////////////////////////////////////////////////////
//Delete From Database
function deleteBirthday(req, res){
  let SQL = 'DELETE FROM birthdays WHERE id=$1;';
  let safeValue = [req.params.id];

  client.query(SQL, safeValue).then(result => {
    res.status(200).redirect('/database')
  }).catch(error => errorHandler(error, req, res));
}
///////////////////////////////////////////////////////////////////////
//Not Found
function notFound(req, res) {
  res.status(404).send('Not Found');
}
///////////////////////////////////////////////////////////////////////
//Error Handler
function errorHandler(error, req, res) {
  console.error(error);
  res.status(500).render('pages/error');
}
///////////////////////////////////////////////////////////////////////
//Random Number Generator {by length of an object/array}
function randomNumber(arrObj){
  return Math.floor(Math.random() * arrObj.length);
}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//History API Call
///////////////////////////////////////////////////////////////////////
function historyHandler(url, array) {
  const day = array[2]; //day
  const month = array[1]; //month
  //   let URL = `http://api.hiztory.org/aviation/${month}/${day}/1/15/api.xml`;
  superagent.get(url).then(result => {
    let data = convert.xml2js(result.text, { compact: true, });
    // console.log(data.aviation.events.event[0]);
    let events = data.aviation.events.event[0];
    console.log('no problem with history', events);
    return new History(events);
    // console.log(events);
  }).catch(err => console.error(err));
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//History Constructor
///////////////////////////////////////////////////////////////////////
function History(data) {
  this.title = '';
  this.year = data._attributes.date;
  this.text = data._attributes.content;
  this.img = 'https://files.slack.com/files-pri/T039KG69K-FQCGM7Y4S/airplane.png';
  this.link = '';
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Wikipedia API Call
///////////////////////////////////////////////////////////////////////
function wikiHandler(url, array){
  const day = array[2]; //day
  const month = array[1]; //month
  const year = array[0]; //year
  //   let url = `http://history.muffinlabs.com/date/${month}/${day}`;

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
        console.log('no problem with wiki', usersEventsTheirYear[0]);
        return new Wikipedia(usersEventsTheirYear[0]);
      } else {
        let randomEvent = randomNumber(jsonData.data.Events);
        let usersEventsTheirDay = jsonData.data.Events[randomEvent];
        console.log('no problem with wiki', usersEventsTheirDay);
        return new Wikipedia(usersEventsTheirDay);
      }
    }).catch(err => console.error(err));
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Wikipedia Constructor
///////////////////////////////////////////////////////////////////////
function Wikipedia(json){
  let lastIdx = (json.links.length - 1);
  this.year = json.year;
  this.text = json.text;
  this.title = json.links[lastIdx].title;
  this.link = json.links[lastIdx].link;

  this.img = 'https://upload.wikimedia.org/wikipedia/commons/5/53/Wikipedia-logo-en-big.png';
}

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Weather API Call
///////////////////////////////////////////////////////////////////////
let locationArray = [];

//Gets user's geo location
function ipLookUp () {
  let url ='http://ip-api.com/json/'
  superagent.get(url)
    .then(results => {
      locationArray = [];
      locationArray.push(new Location(results.body))
    })
}
ipLookUp();
//constructs persons location
function Location(info) {
  this.lat = info.lat;
  this.lon =info.lon;
}

// Gets info from the darksky weather api based on date / location
function weatherHandler(url, str) {
  let epoch = new Date(`${str}`).getTime() / 1000
  //   let url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${locationArray[0].lat},${locationArray[0].lon},${epoch}`;
  let thisurl = url+ ',' + epoch
  superagent.get(thisurl)
    .then(results => {
      console.log('no problem with weather',results.body.daily.data[0] )
      return new Weather(results.body.daily.data[0]);
    }).catch(err => console.error(err));
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Weather Constructor
///////////////////////////////////////////////////////////////////////
function Weather(weatherObj) {
  this.img = 'https://cdn2.iconfinder.com/data/icons/generic-06/100/Artboard_123-512.png'
  this.year = new Date((weatherObj.sunsetTime) * 1000).toISOString().split('T')[0];
  this.title = 'weather';
  this.text = `${weatherObj.summary} high: ${weatherObj.temperatureHigh}  low: ${weatherObj.temperatureLow}  sunrise: ${new Date(weatherObj.sunriseTime * 1000).toLocaleTimeString()}  sunset: ${new Date(weatherObj.sunsetTime * 1000).toLocaleTimeString()}`;
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Calendar API call
///////////////////////////////////////////////////////////////////////
function calendarHandler(url, array) {
  const day = array[2]; //day
  const month = array[1]; //month
  const year = array[0]; //year
  //   const url = `https://calendarific.com/api/v2/holidays?api_key=${process.env.CALENDARIFIC_API}&country=US&year=${year}&day=${day}&month=${month}`;

  superagent.get(url)
    .then(data => {
      let temp = JSON.parse(data.text);
      console.log('no problem with cali',temp.response.holidays[0] )
      return new Holiday(temp.response.holidays[0]);
    }).catch(err => console.error(err));
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
// Calendarrific Constructor
///////////////////////////////////////////////////////////////////////
function Holiday(data){
  this.year = data.date.iso;
  this.text = data.description;
  this.title = data.name;
  this.link = '';
  this.img = 'https://cdn.onlinewebfonts.com/svg/img_104943.png';

}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
// Calling all functions function
///////////////////////////////////////////////////////////////////////
function callingAllFunctions(weather, wiki, history, calendar, arrayOfDates, stringOfDates, renderArray){
  return new Promise(resolve => {
    resolve(weather(stringOfDates, renderArray));
    resolve(wiki(arrayOfDates, renderArray));
    resolve(calendar(arrayOfDates, renderArray));
    resolve(history(arrayOfDates, renderArray));
  });
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Render all api calls
///////////////////////////////////////////////////////////////////////
function renderDetails(req, res){
  const day = req.body.search.slice(8); //day
  const month = req.body.search.slice(5,7); //month
  const year = req.body.search.slice(0,4); //year (adjusted to catch errors in length)
  //Method on express app that allows anything on the server (for us ejs) to access this variable.
  app.locals.BD = req.body.search;
  const dateStr = req.body.search;
  const dateArr = [year, month, day];
  console.log(dateArr);

  let histURL = `http://api.hiztory.org/aviation/${month}/${day}/1/15/api.xml`;
  let wikiURL = `http://history.muffinlabs.com/date/${month}/${day}`;
  let weatherURL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${locationArray[0].lat},${locationArray[0].lon}`;
  let calandarURL = `https://calendarific.com/api/v2/holidays?api_key=${process.env.CALENDARIFIC_API}&country=US&year=${year}&day=${day}&month=${month}`;

  //   let promises = [weatherHandler(weatherURL, dateStr), calendarHandler(calandarURL, dateArr), wikiHandler(wikiURL, dateArr), historyHandler(histURL, dateArr)];
  //  console.log(promises);
  Promise.all([weatherHandler(weatherURL, dateStr), calendarHandler(calandarURL, dateArr), wikiHandler(wikiURL, dateArr), historyHandler(histURL, dateArr)]).then(results => {
    res.status(200).render('pages/show', {event: objects})
  })
}
