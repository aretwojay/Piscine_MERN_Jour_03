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
const Product = require('./model/product');
const Category = require('./model/category');
var ObjectId = require('mongodb').ObjectID;

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

app.use(function(req, res, next) {
    res.locals.login = req.session.login;
    res.locals.user = req.session.user;
    next();
});

process.env.NODE_ENV = "development";

app.get('/register', function (req, res) {
    res.render(path.join(__dirname, '/views', 'register.ejs'));
});

app.get('/login', function (req, res) {
    res.render(path.join(__dirname, '/views', 'login.ejs'));
});

app.get('/shop', function (req, res) {
    if (req.session.loggedIn)
    {
        MongoClient.connect(config.db.url, function (err, client) {
            if (err)
                return console.log("Connection failed")
            console.log("Connection successful");
            const db = client.db(config.db.name);
            db.collection("products").find({}, {}).toArray(function (err, content) {
                if (err) return res.send("Failed to get the collection");
                return res.render(path.join(__dirname, '/views', 'shop.ejs'), { 
                    session: req.session, 
                    products: content
                });
            });

        });
    }
    else
        res.redirect("register");
});

app.get('/shop/:id', function(req, res) {

    if (req.session.loggedIn)
    {
        let id = req.params.id;
        MongoClient.connect(config.db.url, function (err, client) {
            if (err)
                return console.log("Connection failed")
            console.log("Connection successful");
    
            const db = client.db(config.db.name);
            db.collection("products").find({_id: ObjectId(id)}, {}).toArray(function (err, content) {
                if (err) return res.send("Failed to get the collection");

                Category.find({_id : ObjectId(content[0].category) }, function (err, category) {
                    if (err) 
                        return res.send("Failed to get the category");
                    return res.render(path.join(__dirname, '/views', 'product.ejs'), {session: req.session, product: content[0], category: category[0]});
                });
            });
        });
    }
    else
        res.redirect("/register");
})

app.get('/admin/add/:action?', function(req, res) {
    let action = req.params.action;
    if (action !== "category") {
        action = "product";
    }
    if (action != "" && req.session.loggedIn && req.session.user.type === true) {
        Category.find({}, function (err, foundItems) {
            if (err) return console.log("Connection failed")
            return res.render(path.join(__dirname, '/views/admin', "add_" + action + '.ejs'), {categories: foundItems});
        });
    }
    else if (req.session.loggedIn) {
        res.redirect("/shop");
    }
    else
        res.redirect("/register");
})

app.post('/register', function (req, res) {
    MongoClient.connect(config.db.url, function (err, client) {
        if (err)
            return console.log("Connection failed")
        console.log("Connection successful");
        const db = client.db(config.db.name);

        //permet de recuperer le dernier user en date
        db.collection("users").find({}, {}).sort({ _id: -1 }).limit(1).toArray(function (err, content) {
            if (err) return res.send("Failed to get the collection");
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
                req.session.loggedIn = true;
                req.session.user = user;
                res.status(200);
                return res.redirect('shop');
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
                console.log(user);
                req.session.loggedIn = true;
                req.session.user = user;
                res.status(200);
                return res.redirect('shop');
            }
            res.status(400);
            return res.render(path.join(__dirname, '/views', 'login.ejs'), { 
                errors: { error: "Vos identifiants sont incorrects." }
            });
        });
        client.close();
    });
});

app.post('/admin/add/:action?', function (req, res) {
    let action = req.params.action;
    MongoClient.connect(config.db.url, function (err, client) {
        if (err)
            return console.log("Connection failed")
        console.log("Connection successful");
        const db = client.db(config.db.name);
        if (action === undefined)
        {
           Product.create({
                title: req.body.title,
                price: req.body.price,
                description: req.body.description,
                category: ObjectId(req.body.category),
            }, (error, product) => {
                if (error && error.name === "ValidationError") {
                    let errors = {};
                
                    Object.keys(error.errors).forEach((key) => {
                        errors[key] = error.errors[key].message;
                    });
                    res.status(400);
                    console.log(errors);
                    Category.find({}, function(err, content) {
                        return res.render(path.join(__dirname, '/views/admin', 'add_product.ejs'),{
                            errors: errors,
                            categories: content
                        });
                    });
                }
                res.status(200);
                Category.find({}, function(err, content) {
                    return res.render(path.join(__dirname, '/views/admin', 'add_product.ejs'),{
                        success: "Votre produit a bien été créé !",
                        categories: content,
                    });
                });
            })
        }
        else if (action === "category") {
            Category.create({
                name: req.body.name,
            }, (error, category) => {
                if (error && error.name === "ValidationError") {
                    let errors = {};
                
                    Object.keys(error.errors).forEach((key) => {
                        errors[key] = error.errors[key].message;
                    });
                    res.status(400);
                    console.log(errors);
                    return res.render(path.join(__dirname, '/views/admin', 'add_category.ejs'),{errors: errors});
                }
                res.status(200);
                return res.render(path.join(__dirname, '/views/admin', 'add_category.ejs'),{success: "Votre catégorie a bien été créé !"});
            })
        }
        client.close();

    });
});

app.listen(config.app.port, config.app.ip, function (err) {
    if (err) console.log("Error in server setup")
    console.log("Server listening on Port", config.app.port);
});