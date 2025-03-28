const mongoose = require('mongoose');
const moment = require('moment');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    sponsor_id:{
        type: String,
        default: " "
    },
    sponsor_name:{
        type: String,
        default: " "
    },   
    name: {
        type: String,
        default: " "
    },
    gender:{
        type: String,
        default: " "
    },
    email: {
        type: String,
        default: " "
    },
    phone_no:{
        type: String,
        default: " "
    },
    date_of_birth:{
        type: Date,
        default:null,
        validate: {
            validator: function (date) {
                return !date || moment(date).isValid();
            },
            message: 'Invalid date format for date of birth!',
        },
    },
    address:{
        type: String,
        default: " "
    },
    city:{
        type: String,
        default: " "
    },
    state:{
        type: String,
        default: " "
    },
    pincode:{
        type: Number,
        default: " "
    },
    pan_number:{
        type: String,
        default: " "
    },
    aadhar_number:{
        type: Number,
        default: " "
    },
    password: {
        type: String,
        default: " "
    },
    nominee_name:{
        type: String,
        default: " "
    },
    nominee_aadhar_number:{
        type: Number,
        default: " "
    },
    nominee_relationship:{
        type: String,
        default: " "
    },
    user_profile_id:{
        type: String,
        default: " "
    },
    // password:{
    //     type: String,
    //     default: " "
    // },
    bank_name:{
        type: String,
        default: " "
    },
    branch:{
        type: String,
        default: " "
    },
    ifsc:{
        type: String,
        default: " " 
    },
    ac_number:{
        type: Number,
        default: " " 
    },
    user_rank:{
        type: String,
        default: " " 
    },
    user_level:{
        type: String,
        default: " "
    },
    investment_info: [{
        invest_no: { type: String, required: true },
        invest_type: { type: String, required: true },
        invest_date: { type: Date, required: true },
        invest_amount: { type: Number, required: true },
        invest_apply_date: { type: Date },
        invest_confirm_date: { type: Date },
        invest_duration: { type: Number }, 
        roi_percentage: { type: Number },
        capital_amount: { type: Number, required: true },
        profit_amount: { type: Number, required: true },
        tds_deduction_percentage: { type: Number, default: 0 },
        service_charges_deduction_percentage: { type: Number, default: 0 },
        tds_deduction_amount: { type: Number, default: 0 },
        sc_deduction_amount: { type: Number, default: 0 },
        profit_amount_after_tds_sc_deduction: { type: Number },
        net_amount: { type: Number },
        remarks: { type: String }
    }],

    uploaded_pan_file:{
        type:String,
        default:" ",   
        set:(file)=>{
            if(file){
                return file  
            }
            return ;
        },
    },
    uploaded_bank_passbook_file:{
        type:String,
        default:" ",   
        set:(file)=>{
            if(file){
                return file  
            }
            return ;
        },
    },
    uploaded_aadher_file:{
        type:String,
        default:" ",   
        set:(file)=>{
            if(file){
                return file  
            }
            return ;
        },
    },
    tokens: [{
        type: mongoose.Schema.Types.ObjectId,
        default: " ",
        ref: 'Refresh'
    }],
}, { timestamps: true })

module.exports = mongoose.model('usermaster', userSchema, 'usermasters');