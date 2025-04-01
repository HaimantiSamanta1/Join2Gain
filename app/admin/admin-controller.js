const users = require('../user/user-model');
var validator = require("email-validator");
const userService = require('../services/user-service');
const jwtTokenService = require('../services/jwt-service');
const refresh = require('../jwt/refresh-model');
const moment = require('moment');
const adminService = require('../services/admin-service');
const admins =require('../admin/admin-model')
const bcrypt = require('bcrypt');

const generateUserId = () => {
    return `USER${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

const generatePassword = (length = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

//Add New User Account START
exports.addUser = async (req, res) => {
    try {
        
        const { name,gender,email,phone_no,date_of_birth,address,city,state,pan_number,aadhar_number,nominee_name,nominee_aadhar_number,nominee_relationship } = req.body;

        if (!name) {
            return res.status(406).json({ Status: false, message: 'Name is required field!' });
        }

        if (validator.validate(email) !== true) {
            return res.status(400).json({ Status: false, message: 'Email is not valid' });
        }

        const existingUser = await userService.findAccount(email);
        if (existingUser) {
            return res.status(400).json({ Status: false, message: 'This email already exists' });
        }
        const userPhoneNo = await users.findOne({ phone_no: phone_no }).exec();
        if (userPhoneNo) {
            return res.status(400).json({ Status: false, message: 'This user phone number already exists' });
        }

        const capitalizeWords = str => str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        const capitalizedName = capitalizeWords(name);
        const capitalizedNomineeName = capitalizeWords(nominee_name);
        const capitalizedNomineeRelationship = capitalizeWords(nominee_relationship);
        let formattedDateOfBirth = null;
        if (date_of_birth) {
            const parsedDate = moment(date_of_birth, "YYYY-MM-DD", true);
            if (!parsedDate.isValid()) {
                return res.status(400).json({ Status: false, message: 'Invalid date format for date_of_birth! Use YYYY-MM-DD' });
            }
            formattedDateOfBirth = parsedDate.toDate();
        }

        // **Generate user_id and password**
        const user_profile_id = generateUserId();
        const password = generatePassword(8);

        let data = {};
        data = {
            name:capitalizedName,
            gender:gender,
            email:email,
            phone_no:phone_no,
            date_of_birth:formattedDateOfBirth,
            address:address,
            city:city,
            state:state,
            pan_number:pan_number,
            aadhar_number:aadhar_number,
            nominee_name:capitalizedNomineeName,
            nominee_aadhar_number:nominee_aadhar_number,
            nominee_relationship:capitalizedNomineeRelationship,
            user_profile_id: user_profile_id,
            password: password,           
        };
      
        const response = await userService.createAccount(data);
        const Authorization = jwtTokenService.generateJwtToken({ user_id: response._id, LoggedIn: true });
        await jwtTokenService.storeRefreshToken(Authorization, response._id);
        const findToken = await refresh.findOne({ user_id: response._id }).select('_id');
        await users.findByIdAndUpdate(
            response._id,
            { $push: { tokens: findToken._id } },
            { new: true }
        );
        const updatedUser = await users.findById(response._id)
        //.populate('tokens');
        return res.status(200).json({Status: true,message: 'User registered successfully!',data:updatedUser});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ Status: false, message: 'Internal Server Error' });
    }
};
//Add New User Account END

// //Add New admin Account START
// exports.adminRegistration = async (req, res) => {
//     try {
//         const { email_id, password } = req.body;

//         // Check if required fields are provided
//         if (!email_id || !password) {
//             return res.status(406).json({ Status: false, message: 'Email and password are required fields!' });
//         }

//         // Validate email format
//         if (!validator.validate(email_id)) {
//             return res.status(400).json({ Status: false, message: 'Email is not valid' });
//         }

//         // Check if the admin already exists
//         const existingAdmin = await adminService.findAdminAccount(email_id);
//         if (existingAdmin) {
//             return res.status(400).json({ Status: false, message: 'This email already exists' });
//         }

//         // Hash the password
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // Create admin data object
//         const adminData = {
//             email_id: email_id,
//             password: hashedPassword
//         };

//         // Create the admin account
//         const response = await adminService.createAdminAccount(adminData);

//         // Generate JWT token
//         const Authorization = jwtTokenService.generateJwtToken({ admin_id: response._id, LoggedIn: true });

//         // Store refresh token linked with `admin_id`
//         await jwtTokenService.storeRefreshToken1(Authorization, response._id, true);  // Pass `true` to indicate admin

//         // Find refresh token linked with `admin_id`
//         const findToken = await refresh.findOne({ admin_id: response._id }).select('_id');

//         // Update the admin's tokens field with the refresh token ID
//         await admins.findByIdAndUpdate(
//             response._id,
//             { $push: { tokens: findToken._id } },
//             { new: true }
//         );

//         return res.status(200).json({
//             Status: true,
//             message: 'Admin registered successfully'
//         });

//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ Status: false, message: 'Internal Server Error' });
//     }
// };
// //Add New admin Account END

//Admin login START
exports.loginAdmin = async (req, res) => {
    try {
        const { email_id, password} = req.body;

        // Check if email and password are provided
        if (!email_id || !password) {
            return res.status(400).json({ status: false, message: 'Email and password are required.' });
        }

        // Find admin by email
        const admin = await adminService.findAdminAccount(email_id);

        if (!admin || admin.password !== password) {
            return res.status(401).json({ status: false, message: 'The email/password is invalid.' });
        }

        return res.status(200).json({
            status: true,
            message: 'Login successful!'
        });
    } catch (err) {
        console.log('err', err.message);
        return res.status(400).json({ Status: 'Error', message: 'somthing went wrong' })
    }
}
//Admin login END

//Approved kyc START
exports.kycApprovedRejected = async (req, res) => {
    try {
        const { investmentId } = req.params;
        const { kyc_status } = req.body;

        if (!investmentId) {
            return res.status(400).json({ Status: 'Error', message: 'Investment ID is required' });
        }

        if (!kyc_status) {
            return res.status(400).json({ Status: 'Error', message: 'KYC Status is required' });
        }

        // Find the user who has this investment ID
        const user = await users.findOne({ 'investment_info._id': investmentId });

        if (!user) {
            return res.status(404).json({ Status: 'Error', message: 'User or Investment not found' });
        }

        // Find the specific investment record
        const investment = user.investment_info.id(investmentId);
        if (!investment) {
            return res.status(404).json({ Status: 'Error', message: 'Investment not found' });
        }

        // Update fields based on KYC status
        investment.kyc_status = kyc_status;

        if (kyc_status.toLowerCase() === 'approved') {
            user.user_status = 'Active';
            const currentDate = moment();
            investment.invest_confirm_date = moment().toDate();

            let firstPayoutDate;

            if (currentDate.date() >= 1 && currentDate.date() <= 10) {
                firstPayoutDate = moment().add(1, 'months').date(10);
            } else if (currentDate.date() >= 11 && currentDate.date() <= 20) {
                firstPayoutDate = moment().add(1, 'months').date(20);
            } else {
                firstPayoutDate = moment().add(2, 'months').date(1);
            }

            // Store the payout date
            investment.roi_payout_dates = [firstPayoutDate.toDate()];
             //roi_payout_status is updated correctly
            investment.roi_payout_status = [
                {
                    payout_date: firstPayoutDate.toDate(),
                    status: "Pending",
                }
            ];



            investment.roi_percentage = 10;

            if (investment.invest_type.toLowerCase() === 'monthly') {
                investment.capital_amount = investment.invest_amount / investment.invest_duration_in_month;
                investment.profit_amount = investment.invest_amount / investment.invest_duration_in_month;
                investment.tds_deduction_percentage = 10;
                investment.service_charges_deduction_percentage = 2;

                investment.tds_deduction_amount = (investment.tds_deduction_percentage / 100) * investment.profit_amount;
                investment.sc_deduction_amount = (investment.service_charges_deduction_percentage / 100) * investment.profit_amount;

                investment.net_amount_per_month = investment.capital_amount + (investment.profit_amount - (investment.tds_deduction_amount + investment.sc_deduction_amount));
            }
            if (investment.invest_type.toLowerCase() === 'long term') {
                if (investment.invest_amount >= 100000 && investment.invest_amount <= 400000) {
                    investment.roi_percentage = 4;
                } else if (investment.invest_amount >= 500000) {
                    investment.roi_percentage = 5;
                }

                investment.profit_amount = investment.invest_amount * (investment.roi_percentage / 100);
                investment.tds_deduction_percentage = 10;
                investment.service_charges_deduction_percentage = 2;
                investment.tds_deduction_amount = (investment.tds_deduction_percentage / 100) * investment.profit_amount;
                investment.sc_deduction_amount = (investment.service_charges_deduction_percentage / 100) * investment.profit_amount;

                investment.profit_amount_after_tds_sc_deduction = investment.profit_amount - (investment.tds_deduction_amount + investment.sc_deduction_amount);
                investment.net_amount_per_month = investment.profit_amount_after_tds_sc_deduction;
            }

        }

        await user.save();

        return res.status(200).json({ Status: 'Success', message: 'KYC status updated successfully', user });

    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ Status: 'Error', message: 'Something went wrong' });
    }
};
//Approved kyc END

//Withdrow Approved START
exports.withdrowApprovedRejected = async (req, res) => {
    try {
        const { userId, investmentId, status } = req.body;

        if (!userId || !investmentId || !status) {
            return res.status(400).json({ Status: 'Error', message: 'Missing required parameters' });
        }

        const user = await users.findById(userId);
        if (!user) {
            return res.status(404).json({ Status: 'Error', message: 'User not found' });
        }

        const investment = user.investment_info.id(investmentId);
        if (!investment) {
            return res.status(404).json({ Status: 'Error', message: 'Investment not found' });
        }

        // Find the first "Pending" payout
        const payoutIndex = investment.roi_payout_status.findIndex(p => p.status === "Pending");

        if (payoutIndex === -1) {
            return res.status(404).json({ Status: 'Error', message: 'No pending payout found' });
        }

        // Update status of the found payout
        investment.roi_payout_status[payoutIndex].status = status;

        if (status === "Approved") {
            const investDuration = investment.invest_duration_in_month;
            const lastPayoutDate = moment(investment.roi_payout_status[payoutIndex].payout_date);

            // Add future payout dates until the investment duration is reached
            let nextDate = lastPayoutDate.clone().add(1, 'month');

            if (investment.roi_payout_status.length < investDuration) {
                investment.roi_payout_status.push({ payout_date: nextDate.toDate(), status: "Pending" });
            }
        }

        await user.save();

        return res.status(200).json({ 
            Status: 'Success', 
            message: 'Payout status updated successfully', 
            updatedInvestment: investment 
        });

    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ Status: 'Error', message: 'Something went wrong' });
    }
};

//Withdrow Approved START