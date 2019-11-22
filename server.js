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
function historyHandler(array, renderArray) {
  const day = array[2]; //day
  const month = array[1]; //month
  let URL = `http://api.hiztory.org/aviation/${month}/${day}/1/15/api.xml`;
  superagent.get(URL).then(result => {
    let data = convert.xml2js(result.text, { compact: true, });
    // console.log(data.aviation.events.event[0]);
    let events = data.aviation.events.event[0];
    let thisPersonsEvent = new History(events);
    // console.log(events);
    renderArray.push(thisPersonsEvent);
    console.log('history render array: ' , renderArray);
  });
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
function wikiHandler(array, renderArray){
  const day = array[2]; //day
  const month = array[1]; //month
  const year = array[0]; //year
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
        renderArray.push(article);
        console.log('wiki render array: ' , renderArray);
      } else {
        let randomEvent = randomNumber(jsonData.data.Events);
        let usersEventsTheirDay = jsonData.data.Events[randomEvent];
        let article = new Wikipedia(usersEventsTheirDay);
        console.log('no match: ');
        console.log(article);
        renderArray.push(article);
        console.log('wiki render array: ' , renderArray);
      }
    }).catch(error => errorHandler(error, req, res));
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Wikipedia Constructor
///////////////////////////////////////////////////////////////////////
function Wikipedia(json, d, m){
  let lastIdx = (json.links.length - 1);
  this.year = `In ${json.year} on ${m}/${d}: `;
  this.text = json.text;
  this.title = json.links[lastIdx].title;
  this.link = json.links[lastIdx].link;
  this.img = 'https://upload.wikimedia.org/wikipedia/commons/5/53/Wikipedia-logo-en-big.png';
}
function ExactWiki(json, d, m){
  let lastIdx = (json.links.length - 1);
  this.year = `On ${m}/${d}/${json.year}`;
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
function weatherHandler(string, renderArray) {
  const birthday = string;
  // console.log('search: ' , string)
  let epoch = new Date(`${birthday}`).getTime() / 1000
  let url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${locationArray[0].lat},${locationArray[0].lon},${epoch}`;

  superagent.get(url)
    .then(results => {
      let weatherArray = new Weather(results.body.daily.data[0]);
      console.log('weather data: ' , weatherArray);
      renderArray.push(weatherArray);
      console.log('render array: ' , renderArray);
    })
    .catch(error => errorHandler(error, req, res));
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Weather Constructor
///////////////////////////////////////////////////////////////////////
function dayOfWeek(x) {
  var b = new Date(`${x}`).getTime();
  var d = new Date((b + 57600000)).getDay();
  var weekday = ['Sunday','Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return weekday[d]
}

function Weather(weatherObj, birthday) {
  this.img = 'https://www.freeiconspng.com/uploads/weather-icon-png-16.png'
  this.year = `${dayOfWeek(birthday)}, ${new Date((weatherObj.sunsetTime) * 1000).toISOString().split('T')[0]}`;
  this.title = 'weather';
  this.text = `${weatherObj.summary} high: ${weatherObj.temperatureHigh}  low: ${weatherObj.temperatureLow}  sunrise: ${new Date(weatherObj.sunriseTime * 1000).toLocaleTimeString()}  sunset: ${new Date(weatherObj.sunsetTime * 1000).toLocaleTimeString()}`;
}
function HourlyWeather(dailyObj, birthday) {
  this.img = 'https://www.freeiconspng.com/uploads/weather-icon-png-16.png';
  this.year =`${dayOfWeek(birthday)}, ${new Date((dailyObj.time) * 1000).toISOString().split('T')[0]}`;
  this.title='Weather';
  this.text = `Summary: ${dailyObj.summary}   Average Temperature: ${dailyObj.temperature}    Chance of Rain: ${dailyObj.precipProbability}    Wind Speed: ${dailyObj.windSpeed}`;
}
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
//Calendar API call
///////////////////////////////////////////////////////////////////////
function calendarHandler(array, renderArray) {
  const day = array[2]; //day
  const month = array[1]; //month
  const year = array[0]; //year
  const url = `https://calendarific.com/api/v2/holidays?api_key=${process.env.CALENDARIFIC_API}&country=US&year=${year}&day=${day}&month=${month}`;

  superagent.get(url)
    .then(data => {
      let temp = JSON.parse(data.text);
      let personsHoliday = new Holiday(temp.response.holidays[0]);
      renderArray.push(personsHoliday);
      console.log('calendar render array: ' , renderArray);
    }).catch(error => errorHandler(error, req, res));
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
  // const dateArr = [year, month, day];
  let renderArr = [];
  let wikiArr = [];

  let epoch = new Date(`${dateStr}`).getTime() / 1000
  let weatherUrl = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${locationArray[0].lat},${locationArray[0].lon},${epoch}`;

  superagent.get(weatherUrl)
    .then(results => {
      console.log(results.body.hourly.data[1])
      if(results.body.daily) {
        let weatherArray = new Weather(results.body.daily.data[0], dateStr);
        renderArr.push(weatherArray);
      }
      else {
        let weatherArray = new HourlyWeather(results.body.hourly.data[1], dateStr);
        renderArr.push(weatherArray);
      }
    }).then(results => {
      /////////////////wiki call
      let wikiUrl = `http://history.muffinlabs.com/date/${month}/${day}`;
      superagent.get(wikiUrl)
        .then(results => {
          let temp = results.body.toString('utf8');
          let jsonData = JSON.parse(temp);

          let usersEventsTheirYear = jsonData.data.Events.filter(event => {
            if(event.year === year){
              return true;
            }else {return false;}
          });
          if(usersEventsTheirYear.length > 0){
            let article = new ExactWiki(usersEventsTheirYear[0], day, month);
            renderArr.push(article);
            let tempArr =[]
            for(let i=0; i < 4; i++){
              let randomEvent = randomNumber(jsonData.data.Events);
              while(tempArr.includes(randomEvent)){
                randomEvent = randomNumber(jsonData.data.Events);
              }
              tempArr.push(randomEvent);
            }
            console.log('temp arr: ', tempArr);
            for(let j=0; j < tempArr.length; j++){
              let usersEventsTheirDay = jsonData.data.Events[tempArr[j]];
              let article = new Wikipedia(usersEventsTheirDay, day, month);
              wikiArr.push(article);
            }
          } else {
            let tempArr =[]
            for(let i=0; i < 4; i++){
              let randomEvent = randomNumber(jsonData.data.Events);
              while(tempArr.includes(randomEvent)){
                randomEvent = randomNumber(jsonData.data.Events);
              }
              tempArr.push(randomEvent);
            }
            console.log('temp arr: ', tempArr);
            for(let j=0; j < tempArr.length; j++){
              let usersEventsTheirDay = jsonData.data.Events[tempArr[j]];
              let article = new Wikipedia(usersEventsTheirDay, day, month);
              wikiArr.push(article);
            }
            renderArr.push(wikiArr[0]);
          }
        }).then(results => {
          const calendarUrl = `https://calendarific.com/api/v2/holidays?api_key=${process.env.CALENDARIFIC_API}&country=US&year=${year}&day=${day}&month=${month}`;
          superagent.get(calendarUrl)
            .then(data => {
              let temp = JSON.parse(data.text);
              if(temp.response.holidays.length > 0){
                let personsHoliday = new Holiday(temp.response.holidays[0]);
                renderArr.push(personsHoliday);
                if(wikiArr[1]){renderArr.push(wikiArr[1]);}
              }
              // console.log('calendar render array: ' , renderArr);
            }).then(results => {
              let hiztoryUrl = `http://api.hiztory.org/aviation/${month}/${day}/1/15/api.xml`;
              superagent.get(hiztoryUrl).then(result => {
                let data = convert.xml2js(result.text, { compact: true, });
                let events = data.aviation.events.event[0];
                let thisPersonsEvent = new History(events);
                renderArr.push(thisPersonsEvent);
                if(wikiArr[2]){renderArr.push(wikiArr[2]);}
                if(wikiArr[3]){renderArr.push(wikiArr[3]);}
                // console.log('history render array: ' , renderArr);
              }).then(results => {
                res.status(200).render('pages/show', { event: renderArr })
              }).catch(error => errorHandler(error, req, res));
            }).catch(error => errorHandler(error, req, res));// calendar results promise end
        }).catch(error => errorHandler(error, req, res)); //wiki results promise end

    }).catch(error => errorHandler(error, req, res)); //weather results promise end
}
