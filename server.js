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
app.use(express.urlencoded({extended:true,}));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 3000;

// const client = new pg.Client(process.env.DATABASE_URL);
// client.connect().then(() => {
// // Make sure the server is listening for requests
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
// });
// client.on('error', err => console.error(err));

app.use(methodOverride((req, res) => {
  if(req.body && typeof req.body === 'object' && '_method' in req.body){
    let method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// Routes
app.get('/', calendarific);
app.get('/show', renderDetails);
app.get('/aboutus', renderAboutUs);
app.get('/database', renderDatabase);
app.post('/searches', renderDetails);
app.post('/saving', saveToDB);
app.use('*', notFound);
app.use(errorHandler);

///////////////////////////////////////////////////////////////////////
//HomePage
function homePage(req, res){
  res.render('pages/index');
}
///////////////////////////////////////////////////////////////////////
//Render User Details
function renderDetails(req, res){
  res.render('pages/show');
}
///////////////////////////////////////////////////////////////////////
//Render User Details
function renderAboutUs(req, res){
  res.render('pages/aboutus');
}
//////////////////////////////////
function calendarific(req, res) {
  const url = `https://calendarific.com/api/v2/holidays?api_key=${process.env.API_KEY}&country=us&year=1982&month=02&day=$24`;

  superagent.get(url)
    .then(data =>{
      console.log(response);
      // let timmy = [];
      // data.response.holiday.forEach((response.holiday.discription)=> {
      //   timmy.push(new Holiday(discription));
      //   // console.log('timmy', timmy);
      // });
      // // console.log('data', data);
      // res.status(200).json(timmy);
    })
    .catch(error => errorHandler(error,req,res));
}
function Holiday( timmy) {
  this.name = timmy.response.holidays[0].name;
  this.discription = timmy.response.holidays[0].discription;
  this.date = timmy.response.holidays[0].date;
  this.type = timmy.response.holidays[0].type;
  this.locations = timmy.response.holidays[0].locations;
  this.states = timmy.response.holidays[0].states;


}

///////////////////////////////////////////////////////////////////////
//Render User Details
function renderDatabase(req, res){
  res.render('pages/showdb');
}
///////////////////////////////////////////////////////////////////////
//Save Details to Database
function saveToDB(req, res){
  //make a SQL query
  //
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
