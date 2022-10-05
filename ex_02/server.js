const express = require('express');
const session = require('express-session');
const app = express();
const config = require('./config');
const path = require('path');
const sha1 = require("sha1");
const MongoClient = require('mongodb').MongoClient;
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const User = require('./model/user');

function id_autoincrement(id) {
    //si il n'y a rien dans la collection, l'id est de 1
    if (id == undefined) {
        return 1;
    }
    return parseInt(id["id"] + 1);
}

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
process.env.NODE_ENV = "development";

app.get('/register', function (req, res) {
    res.render(path.join(__dirname, '/views', 'register.ejs'));
});

app.get('/login', function (req, res) {
    res.render(path.join(__dirname, '/views', 'login.ejs'));
});

app.get('/index', function (req, res) {
    if (req.session.loggedIn)
        return res.render(path.join(__dirname, '/views', 'index.ejs'), {login: req.session.login});
    else
        res.redirect("register");
});

app.post('/register', function (req, res) {
    MongoClient.connect(config.db.url, function (err, client) {
        if (err)
            return console.log("Connection failed")
        console.log("Connection successful");
        const db = client.db(config.db.name);

        //permet de recuperer le dernier user en date
        db.collection("users").find({}, {}).sort({ _id: -1 }).limit(1).toArray(function (err, content) {
            if (err) return res.send("Failed to save the collection");
            //si les mots ne sont pas identiques, on retoure l'erreur
            if (req.body.password !== req.body.confirm_password){
                return res.render(path.join(__dirname, '/views', 'register.ejs'),{errors: {error: "Les mots de passe ne correspondent pas."}});
            }
            User.create({
                id: id_autoincrement(content[0]),
                login: req.body.login,
                email: req.body.email,
                password: sha1(req.body.password),
                type: false
            }, (error, user) => {
                console.log(error);
                if (error && error.name === "ValidationError") {
                    let errors = {};
              
                    Object.keys(error.errors).forEach((key) => {
                      errors[key] = error.errors[key].message;
                    });
                    res.status(400);
                    console.log(errors);
                    return res.render(path.join(__dirname, '/views', 'register.ejs'),{errors: errors});
                }
                res.status(200);
                return res.render(path.join(__dirname, '/views', 'index.ejs'),{login: req.body.login});
            })
            client.close();
        });
    });
});

app.post('/login', function (req, res) {
    MongoClient.connect(config.db.url, function (err, client) {
        if (err)
            return console.log("Connection failed")
        console.log("Connection successful");
        const db = client.db(config.db.name);

        User.findOne({
            email: req.body.email
          }, function(err, user) {
            if (err) throw err;
            if (user.comparePassword(req.body.password)) {
                req.session.loggedIn = true;
				req.session.login = user.login;
                res.status(200);
                return res.redirect('index');
            }
            res.status(400);
            return res.render(path.join(__dirname, '/views', 'login.ejs'),
            { errors: {error: "Vos identifiants sont incorrects."}});
        });
        client.close();
    });
});
app.listen(config.app.port, config.app.ip, function (err) {
    if (err) console.log("Error in server setup")
    console.log("Server listening on Port", config.app.port);
});


