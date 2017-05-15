// Core & utilities
require('dotenv').config(); // import environmental variables from .env file
const express = require('express');
const Promise = require('bluebird');
const _ = require('underscore');
const emoji = require('node-emoji');
const db = require('../database/models');
const Users = db.Users;
const Favorites = db.Favorites;

// Middleware
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cookieParser = require('cookie-parser');
const passport = require('passport');
const fbStrategy = require('passport-facebook').Strategy;
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

// APIs
const clarifai = require('./api/clarifai');
const openMenu = require('./api/openMenu');
const yelp = require('./api/yelp');
const googleMapsGeocode = require('./api/googleMapsGeocode');
const fiveHundredPX = require('./api/fiveHundredPX');
const yummly = require('./api/yummly');

// Initialize app
const app = express();

// Setup middleware
app.use(morgan('tiny'));
app.use(bodyParser.json())
  .use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({
    secret: 'lalaland',
    resave: true, 
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: db.connection })
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

// Set response headers for all requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

// Setup Facebook login / use creation
const callbackURL = process.env.NODE_ENV === 'production' ? `${process.env.ENV_URL}/login/facebook/callback` : `${process.env.ENV_URL || 'http://localhost'}:${process.env.PORT || 8080}/login/facebook/callback`;

passport.use(new fbStrategy({
  clientID: process.env.FACEBOOK_ID,
  clientSecret: process.env.FACEBOOK_KEY,
  callbackURL,
  profileFields: ['id', 'email', 'first_name', 'last_name'],
},
  (token, refreshToken, profile, done) => {
    process.nextTick(() => {
      // Search for existing user
      Users.findOne({ 'fbID': profile.id })
        .then((user, err) => {
          if (err) {
            return done(err);
          }
          if (user) {
            return done(null, user);
          } else {

            const newUser = new Users();
            newUser.fbID = profile.id;
            newUser.fbToken = token;
            newUser.fbFirstName = profile.name.givenName;
            newUser.fbLastName = profile.name.familyName;

            newUser.save(function (err) {
              if (err) {
                return done(err);
              }
              return done(null, newUser);
            });
          }
        });
    });
  }));

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (user, cb) {
  cb(null, user);
});

// Setup routes
app.use('/app', ensureLoggedIn('/login'));

app.use('/app', express.static(__dirname + '/../dist'));

app.get('/', ensureLoggedIn('/login'), function (req, res) {
  res.redirect('/app');
});

app.use('/login', express.static(__dirname + '/../static/login'));

app.get('/login/facebook',
  passport.authenticate('facebook'));

app.get('/login/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/');
  });

app.get('/api/photos', (req, res) => {
  const clientResponse = {};
  clientResponse.status = 'success';
  clientResponse.statusCode = 200;


  fiveHundredPX.searchPhotos('food meal')
  .then((photos)=>{
    clientResponse.photos = photos;
    res.send(clientResponse);
  })
  .catch((err)=>{
    console.log('*** Error while retrieving photos ***', err);
    clientResponse.status = 'fail: ' + err;
    clientResponse.statusCode = 404;
    res.status(404).send(clientResponse);
  });
});

app.post('/api/photos/photo-process', (req, res)=>{

  const clientResponse = {};
  clientResponse.photoURL = req.body.photoURL;
  clientResponse.status = 'success';
  clientResponse.statusCode = 200;

  let menuItemSearchArray;
  let recipeSearchString;
  
  Promise.resolve(clarifai.getFoodPrediction(req.body.photoURL))
  .then(({prediction})=>{
    menuItemSearchArray = prediction;
    return googleMapsGeocode.getPostalCode(req.body.location.lat || 37.773972, req.body.location.lng || -122.431297);
  })
  .then(({postalCode, countryCode})=>{
    return openMenu.getMenuItems(req.body.title.split(' ').slice(0,2).join(' '), postalCode, countryCode);
  })
  .then((menuItems)=>{
    recipeSearchString = req.body.title;
    return Promise.resolve(menuItems);
  })
  .mapSeries((menuItem)=>{
    return yelp.getRestaurant(`${menuItem.address_1}, ${menuItem.city_town}, ${menuItem.state_province}`, menuItem.restaurant_name);
  })
  .then((restaurants)=>{
    clientResponse.restaurants = restaurants.sort((a, b)=>{
      if(b.rating === a.rating){
        return b.review_count - a.review_count;
      }
      return b.rating - a.rating;
    }).slice(0,3);
  })
  .then(()=>{
    return yummly.getRecipes(recipeSearchString);
  })
  .then((recipes)=>{
    clientResponse.recipes = recipes;
    res.send(clientResponse);
  })
  .catch((err)=>{
    console.log('*** Error while processing photo ***', err);
    clientResponse.status = 'fail: ' + err;
    clientResponse.statusCode = 404;
    res.send(clientResponse);
  });
});

app.post('/api/user/favorite', (req, res)=>{

  const clientResponse = {};
  clientResponse.status = 'success';
  clientResponse.statusCode = 200;
  
  Promise.resolve(Users.findOne({ _id: req.session.passport.user._id }))
    .then((user) => {
      let newFavorite = new Favorites({
        photoURL: req.body.photoURL,
        savedItem: req.body.savedItem, // restaurant or recipe
        userID: user._id
      });
      return (newFavorite.save());
    })
    .then(() => {
      res.send(clientResponse);
    })
    .catch((err) => {
      console.log('*** Error while processing saved item ***', err);
      clientResponse.status = 'fail: ' + err;
      clientResponse.statusCode = 404;
      res.status(404).send(clientResponse);
    });
});

app.get('/api/user/profile', (req, res)=>{
  
  const clientResponse = {};
  clientResponse.status = 'success';
  clientResponse.statusCode = 200;
  
  Promise.resolve(Users.findOne({ _id: req.session.passport.user._id }))
    .then((user) => {
      clientResponse.user = {firstName: user.fbFirstName, lastName: user.fbLastName};
      return (Favorites.find({ userID: user._id}));
    })
    .then((favorites) => {
      clientResponse.favorites = favorites;
      res.send(clientResponse);
    })
    .catch((err) => {
      console.log('*** Error while retrieving user profile ***', err);
      clientResponse.status = 'fail: ' + err;
      clientResponse.statusCode = 404;
      res.status(404).send(clientResponse);
    });
});

app.get('/api/user', (req, res)=>{
  
  const clientResponse = {};
  clientResponse.status = 'success';
  clientResponse.statusCode = 200;
  
  Promise.resolve(Users.findOne({ _id: req.session.passport.user._id }))
    .then((result) => {
      clientResponse.user = {firstName: result.fbFirstName, lastName: result.fbLastName};
      res.send(clientResponse);
    })
    .catch((err) => {
      console.log('*** Error while retrieving user ***', err);
      clientResponse.statusCode = 404;
      clientResponse.status = 'fail: ' + err;
      res.status(404).send(clientResponse);
    });
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log('app listening on', port);
  console.log(emoji.emojify(':rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket: :rocket:'));
});
