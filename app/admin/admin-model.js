const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email_id: {
        type: String,
        default: " "
    },
    password: {
        type: String,
        default: " "
    },
    // tokens: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         default: " ",
    //         ref: 'Refresh'
    // },
 
}, { timestamps: true })

module.exports = mongoose.model('admin', userSchema, 'admins');