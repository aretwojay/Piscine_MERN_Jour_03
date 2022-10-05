const mongoose = require('mongoose');
const config = require('../config');
const connection = mongoose.createConnection(config.db.url + "/" + config.db.name);
const Schema = mongoose.Schema;
let productSchema = new Schema({
    title: {
        type: String,
        required: true,
        maxLength: [100, "Le nom du produit contient plus de 100 caractères."],
    },
    price: {
        type: Number,
        required: true,
        min: [0, "Le prix doit être positif."]
    },
    description: {
        type: String,
        required: true,  
        maxLength: [200, "La description du produit contient plus de 200 caractères."],

    },
}, {
    collection: 'products'
})
const Product = connection.model('Product', productSchema);
module.exports = Product;