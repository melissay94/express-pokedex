require('dotenv').config();
const express = require('express');
const axios = require('axios'); 
const ejsLayouts = require('express-ejs-layouts');
const methodOverride = require("method-override");

const db = require("./models");

const app = express();
const port = process.env.PORT || 3000;

app.use(require('morgan')('dev'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(ejsLayouts);
app.use(methodOverride("_method"));

let pokemonUrl = "http://pokeapi.co/api/v2/pokemon";
let pokemonCount = 0;
let pokemonOffset = 0;
let pageNumber = 1;

// GET / - main index of site
app.get('/', function(req, res) {
  let pokemonName = "";
  let appendedUrl = pokemonUrl;
  if (req.query.name) {
    pokemonName = `/${req.query.name}/`;
    pokemonName = pokemonName.toLowerCase().replace(/\s/g,'');
    appendedUrl += pokemonName;
  } else {
    pageNumber = req.query.pageNumber;
    if (!pageNumber) {
      pageNumber = 1;
    }

    if (pageNumber < 1) {
      pageNumber = 1;
    } else if (pageNumber > 49) {
      pageNumber = 49;
    }

    pokemonOffset = (pageNumber - 1) * 20;
    appendedUrl += `?offset=${pokemonOffset}&limit=20`;
  }

  // Use request to call the API
  axios.get(appendedUrl).then(apiResponse => {

    pokemonCount = apiResponse.data.count;

    var pokemon = apiResponse.data;

    if (pokemonName.length > 0) {
      pokemon = [pokemon];
    } else {
      pokemon = pokemon.results;
    }

    db.pokemon.findAll()
      .then(user_poke => {
        let mapped_pokemon = pokemon.map(api_poke => {
          return {
            ...api_poke,
            isFavorited: user_poke.find(poke => {
              return poke.name === api_poke.name;
            }) !== undefined,
          }
        });
        res.render('index', { 
          pokemon: mapped_pokemon, 
          pageNumber: pageNumber, 
          totalPages: Math.ceil(pokemonCount/20) });
      }).catch(err => {
        res.send("Could not access user's pokemon", err);
      })
  }).catch(err => {
    res.send("Could not get pokemon from API", err);
  });
});

app.get("/pokemon/:name", (req, res) => {
  if (req.params.name) {
    let appendedUrl = pokemonUrl + `/${req.params.name}`;
    axios.get(appendedUrl).then(response => {
      let result = response.data;
      res.render("favorites/show", { pokemon: result });
    }).catch(err => {
      res.send(`Could not get ${req.params.name} from API`, err);
    });
  }
});

// Imports all routes from the pokemon routes file
app.use('/favorites', require('./routes/pokemon'));

var server = app.listen(port, function() {
  console.log('...listening on', port );
});

module.exports = server;
