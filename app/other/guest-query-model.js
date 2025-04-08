const mongoose = require('mongoose');
const moment = require('moment');
const Schema = mongoose.Schema;

const querySchema = new Schema({
    guest_name:{
        type: String,
        default: " "
    },
    guest_mail:{
        type: String,
        default: " "
    },   
    guest_phone_no: {
        type: String,
        default: " "
    },
    guest_message: {
        type: String,
        default: " "
    },
}, { timestamps: true })

module.exports = mongoose.model('query', querySchema, 'queries');