const mongoose  = require('mongoose')

const Schema = mongoose.Schema

const RefreshSchema = new Schema({
    token:{type:String,required:true},
    user_id: {type:Schema.Types.ObjectId,ref:'usermaster'}
},{timestamps:true})


module.exports = mongoose.model('Refresh',RefreshSchema,'tokens');
