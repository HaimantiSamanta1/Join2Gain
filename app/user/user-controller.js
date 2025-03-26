const users = require('./user-model');
var validator = require("email-validator");
const userService = require('../services/user-service');
const jwtTokenService = require('../services/jwt-service');
const bcrypt = require('bcrypt');
const refresh = require('../jwt/refresh-model');
const moment = require('moment');

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
exports.addNewMember = async (req, res) => {
    try {
        const accessToken = req.headers['authorization']?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Token not provided.',
            });
        }
        const user = await userService.finduserAccountdetails(accessToken);
        console.log("User",user);
        console.log("Login user name",user.name);
        console.log("Login user id",user.user_profile_id)
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found.',
                local: accessToken
            });
        }

        const { name,gender,email,phone_no,date_of_birth,address,city,state,pan_number,aadhar_number,nominee_name,nominee_aadhar_number,nominee_relationship } = req.body;

        if (!name || !gender || !phone_no || !address || !city || !state || !pan_number || !aadhar_number ||!nominee_name || !nominee_aadhar_number ||!nominee_relationship) {
            return res.status(406).json({ Status: false, message: 'Name ,gender,phone number,address,city,state,pan & aadhar number,nominee name,nominee aadhar number,nominee relationship are required fields!' });
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
            sponsor_name:user.name,
            sponsor_id:user.user_profile_id,
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

//login new user details START
exports.loginUser = async (req, res) => {
    try {
        const {user_profile_id,password} = req.body;

        if (!user_profile_id || !password) {
            return res.status(400).json({ status: false, message: 'User ID and password are required.' });
        }

        const user = await userService.findAccount(user_profile_id);
        
        console.log('User',user);
        if (!user || user.password !== password) {
            return res.status(401).json({ status: false, message: 'The email/password is invalid.' });
        }
        const newAccessToken = jwtTokenService.generateJwtToken({
            user_id: user._id,
            LoggedIn: true,
        });
        await jwtTokenService.updateRefreshToken(user._id, newAccessToken);
        return res.status(200).json({
            status: true,
            message: 'Login successful!',
            user_id:user._id,
            accessToken: newAccessToken,
            data:user
        });
    } catch (err) {
        console.log('err', err.message);
        return res.status(400).json({ Status: 'Error', message: 'somthing went wrong' })
    }
}
//login new user END

//Edit password START
exports.editUserPassword = async (req, res) => {
    try {
        let { token } = req.userData;
        let { user_id } = req.params;
        let { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Both old and new passwords are required' });
        }

        // Find user by ID
        const user = await users.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the old password matches the stored password
        if (user.password !== oldPassword) {
            return res.status(400).json({ message: 'Old password is incorrect' });
        }

        // Update the password directly
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Server Error' });
    }
}; 
//Edit password End

//Edit user profile START
exports.updateUserProfile = async (req, res) => {
    try {
        let { token } = req.userData;
        let { user_id } = req.params;
        const {gender,email,phone_no,date_of_birth,address,city,state,pincode,pan_number,aadhar_number,nominee_name,nominee_aadhar_number,nominee_relationship,bank_name,branch,ifsc,ac_number} = req.body;
          
        if (email && !validator.validate(email)) {
            return res.status(400).json({ Status: false, message: 'Email is not valid' });
        }

        const data1 = {
            gender: gender || undefined,
            email: email || undefined,
            phone_no: phone_no || undefined,
            date_of_birth: date_of_birth || undefined,
            address: address || undefined,
            city:city|| undefined,
            state:state|| undefined,
            pincode:pincode|| undefined,
            pan_number:pan_number|| undefined,
            aadhar_number:aadhar_number|| undefined,
            nominee_name:nominee_name|| undefined,
            nominee_aadhar_number:nominee_aadhar_number|| undefined,
            nominee_relationship:nominee_relationship|| undefined,
            bank_name:bank_name||undefined,
            branch:branch||undefined,
            ifsc:ifsc||undefined,
            ac_number:ac_number|| undefined
        };

        const result = await userService.updateUserInfo(user_id, data1);

        if (result.Status === true) {
            let updateData = result.result;
            return res.status(200).json({ Status: true, message: 'Updated successfully!', updateData });
        } else {
            return res.status(200).json(result);
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ Status: false, message: err.message });
    }
}
//Edit user profile END

//Get a user details START
exports.getUser = async (req, res) => {
    try {
        let { token } = req.userData;
        let { user_id } = req.params;
        let data = await userService.findAndGetUserAccount(user_id)
        if (data) {
            return res.status(200).json({ Status: true, message: 'Get user account successful!', data })
        } else {
            return res.status(404).send({ Status: false, message: 'Not Found User Account' })
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
//Get a user details END

//Get all user details START
exports.getUsers = async (req, res) => {
    try {
        let { token } = req.userData;
        const users = await userService.getAllUserDetails();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
//Get all user details END
