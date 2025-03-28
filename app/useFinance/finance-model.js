// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const financeSchema = new Schema({
//     user_id: {
//         type:mongoose.Schema.Types.ObjectId,
//         default: " ",
//         ref: 'usermaster' 
//     },  
//     investment_info:[{
//         invest_no:
//         invest_type:
//         invest_date:
//         invest_amount:
//         invest_apply_date:
//         invest_confirm_date:
//         invest_duration:
//         roi_percentage:
//     }],
//     roi_earning_info:{
//         capital_amount:
//         profit_amount:
//         tds_deduction_percentage:
//         service_charges_deduction_percentage:
//         tds_deduction_amount:
//         sc_deduction_amount:
//         profit_amount_after_tds_sc_deduction:
//         net_amount:
//         remarks:
//     }

// }, { timestamps: true })
// module.exports = mongoose.model('finance', userSchema, 'finances');