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
    user_status:{
        type: String,
        default: "Inactive"
    },
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
    // user_rank:{
    //     type: String,
    //     default: " " 
    // },
    referral_income: { 
        type: Number, 
        default: 0 
    },
    referral_payouts: [{
        payout_date: { type: Date, default: null },
        amount: { type: Number, default: 0 },
        status: { type: String, default: "Pending" },  // Pending, Approved, Rejected
        investment_id :{
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            ref: 'usermaster'
        },
    }],
    user_rank_info:[{
        rank_of_user:{
            type: String,
            default: " " 
        },
        rank_update_date:{
            type: Date,
            default:null,
            validate: {
                validator: function (date) {
                    return !date || moment(date).isValid();
                },
                message: 'Invalid date format for date of rank update date !',
            },
        },
        payout_date: { 
            type: Date,
            default:null,
            validate: {
                validator: function (date) {
                    return !date || moment(date).isValid();
                },
                message: 'Invalid date format for date of rank update date !',
            },
        }
    }],
    user_level:{
        type: String,
        default: "level 1"
    },
    investment_info: [{
        invest_no: { type: Number, default: 0},
        invest_type: { type: String,default: " "  },
        utr_no:{
            type: String,
            default: " " 
        },
        uploaded_proof_file:{
            type:String,
            default:" ",   
            set:(file)=>{
                if(file){
                    return file  
                }
                return ;
            },
        },
        invest_amount: { type: Number, default: 0},
        invest_apply_date: { 
            type: Date,
            default:null,
            validate: {
                validator: function (date) {
                    return !date || moment(date).isValid();
                },
                message: 'Invalid date format for date of invest apply date !',
            },
        },
        invest_confirm_date: { 
            type: Date,
            default:null,
            validate: {
                validator: function (date) {
                    return !date || moment(date).isValid();
                },
                message: 'Invalid date format for date of invest confirm date!',
            },
         },

        invest_duration_in_month: { type: Number,default: 0 }, 
        roi_percentage: { type: Number ,default:0},
        capital_amount: { type: Number,default: 0},
        profit_amount: { type: Number, default: 0},
        tds_deduction_percentage: { type: Number, default: 0 },
        service_charges_deduction_percentage: { type: Number, default: 0 },
        tds_deduction_amount: { type: Number, default: 0 },
        sc_deduction_amount: { type: Number, default: 0 },
        profit_amount_after_tds_sc_deduction: { type: Number,default: 0 },
        net_amount_per_month: { type: Number,default: 0 },
       // remarks: { type: String,default: " " },
        investment_status:{type: String,default: " "},
        roi_payout_status: [{
            payout_date: { type: Date, default: null },
            status: { type: String, default: "Pending" }  // Pending, Approved, Rejected
        }]
        
    }],
    referrals: [{
        type: mongoose.Schema.Types.ObjectId,
        default: " ",
        ref: 'usermaster'
    }],
    no_of_direct_referrals:{
        type: Number,
        default: 0
    },
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
    kyc_status:{
        type:String,
        default:" ",  
    },
    
    tokens: [{
        type: mongoose.Schema.Types.ObjectId,
        default: " ",
        ref: 'Refresh'
    }],
}, { timestamps: true })

module.exports = mongoose.model('usermaster', userSchema, 'usermasters');