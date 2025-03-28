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