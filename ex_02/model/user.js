const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const config = require('../config');
const sha1 = require("sha1");
const connection = mongoose.createConnection(config.db.url + "/" + config.db.name);
const Schema = mongoose.Schema;
let userSchema = new Schema({
    id: {
        type: Number,
        required: true,
    },
    login: {
        type: String,
        required: true,
        unique: true,
        minLength: [5, "Votre nom d'utilisateur contient moins de 5 caractères."],
        maxLength: [20, "Votre nom d'utilisateur contient plus de 20 caractères."],
    },
    email: {
        type: String,
        required: true,  
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    type: {
        type: Boolean,
        required: true,
    }
}, {
    collection: 'users'
})
userSchema.plugin(uniqueValidator);
userSchema.methods.comparePassword = function (password) {
    return sha1(password) === this.password;
};
const User = connection.model('User', userSchema);
module.exports = User;