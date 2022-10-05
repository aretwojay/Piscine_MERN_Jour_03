const mongoose = require('mongoose');
const config = require('../config');
const connection = mongoose.createConnection(config.db.url + "/" + config.db.name);
const Schema = mongoose.Schema;
let categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        maxLength: [100, "Le nom de la catégorie contient plus de 100 caractères."],
    },
}, {
    collection: 'categories'
})
const Category = connection.model('Product', categorySchema);
module.exports = Category;