const users = require('./user-model');
var validator = require("email-validator");
const userService = require('../services/user-service');
const jwtTokenService = require('../services/jwt-service');
const bcrypt = require('bcrypt');
const refresh = require('../jwt/refresh-model');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

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
        //console.log("Login user name",user.name);
        // console.log("Login user profile id",user.user_profile_id)
        // console.log("Login user id",user._id);
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

        // If a sponsor_id is provided, update the sponsor's level
        if (user.user_profile_id) {
            let sponsor = await users.findOne({ user_profile_id: user.user_profile_id });
            if (sponsor) {
                // Increase the sponsor's level
                let currentLevel = sponsor.user_level;
                const nextLevel = getNextLevel(currentLevel); // Increment the user level (e.g., "level 1" -> "level 2")
                
                // Update sponsor level
                sponsor = await users.findByIdAndUpdate(sponsor._id, { user_level: nextLevel }, { new: true });

                // Also update the parent sponsor's level (if any)
                if (sponsor.sponsor_id) {
                    await updateParentSponsorLevel(sponsor.sponsor_id); // Recursive update
                }
            }
        }

        const referrals = await users.findByIdAndUpdate(
            user._id,
            { 
            $push: { referrals: response._id},
            $inc: { no_of_direct_referrals : 1 }
            },
            { new: true }
        );
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


// Helper function to get the next user level
const getNextLevel = (currentLevel) => {
    const levelMap = {
        "level 1": "level 2",
        "level 2": "level 3",
        "level 3": "level 4",
        "level 4": "level 5",
    };

    return levelMap[currentLevel] ; 
};

// Recursive function to update parent sponsor's level if applicable
const updateParentSponsorLevel = async (sponsor_id) => {
    let parentSponsor = await users.findOne({ user_profile_id: sponsor_id });
    if (parentSponsor) {
        let currentLevel = parentSponsor.user_level;
        const nextLevel = getNextLevel(currentLevel);
        
        await users.findByIdAndUpdate(parentSponsor._id, { user_level: nextLevel }, { new: true });
        
        if (parentSponsor.sponsor_id) {
            await updateParentSponsorLevel(parentSponsor.sponsor_id); // Recursively update the level of parent sponsors
        }
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
            user_profile_id:user.user_profile_id,
            user_name:user.name,
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
       // let { token } = req.userData;
        let { user_id } = req.params;
        let data = await userService.findAndGetUserAccount(user_id)
        // if (data) {
        //     return res.status(200).json({ Status: true, message: 'Get user account successful!', data })
        // } else {
        //     return res.status(404).send({ Status: false, message: 'Not Found User Account' })
        // }

        if (!data) {
            return res.status(404).json({ Status: false, message: 'Not Found User Account' });
        }

        console.log("data",data)

        data.data.referrals.forEach(referral => {
            console.log("Referral ID:", referral._id);
            console.log("Referral Investment Info:", referral.investment_info);
            
            // Check if investment_info exists and has data
            if (referral.investment_info && referral.investment_info.length > 0) {
                referral.investment_info.forEach(investment => {
                    console.log("Investment No:", investment.invest_no);
                    console.log("Investment Type:", investment.invest_type);
                    console.log("Investment Amount:", investment.invest_amount);
                    console.log("Investment kyc_status:", investment.kyc_status);
                });
            } else {
                console.log("No investment information available for this referral.");
            }
        });
        
        let totalInvestmentAmount = 0;

        data.data.referrals.forEach(referral => {
            if (referral.investment_info && referral.investment_info.length > 0) {
                referral.investment_info.forEach(investment => {
                   // totalInvestmentAmount += investment.invest_amount;
                   if (investment.kyc_status === "Approved" || investment.kyc_status === "approved") {
                    totalInvestmentAmount += investment.invest_amount;
                }
                });
            }
        });

        console.log("Total Investment Amount from Referrals:", totalInvestmentAmount);
        console.log("no_of_direct_referrals",data.data.no_of_direct_referrals)

        // // Check if conditions are met
        // if (data.data.no_of_direct_referrals >= 2 && totalInvestmentAmount >= 500000) {
        //     // Update user rank to "Silver"
        //     await users.updateOne({ _id: user_id }, { $set: { user_rank: "Silver" } });
        //     data.user_rank = "Silver"; 
        //     console.log("User rank updated to Silver.");
        // }

        let updated = false;

        if (data.data.no_of_direct_referrals >= 2 && totalInvestmentAmount >= 500000) {
            await users.updateOne({ _id: user_id }, { $set: { user_rank: "Silver" } });
            updated = true;
            console.log("User rank updated to Silver.");
        }

        // Fetch updated user data if update was performed
        if (updated) {
            data = await userService.findAndGetUserAccount(user_id);
        }

        return res.status(200).json({ Status: true, message: 'Get user account successful!', data });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
//Get a user details END

//Get all user details START
exports.getUsers = async (req, res) => {
    try {
       // let { token } = req.userData;
        const users = await userService.getAllUserDetails();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
//Get all user details END

//Add file of pan card START
exports.addPanCardFile = async (req, res) => {
    try {
        let { token } = req.userData;
        const { _id } = req.params;
        const user = await users.findById(_id);

        if (!user) {
            return res.status(400).json({ Status: false, message: 'User ID not found' });
        }

        if (!req.file) {
            return res.status(400).json({ Status: false, message: 'Pan card file is not uploaded' });
        }

        const filename = req.file.filename;

        const result = await users.findOneAndUpdate(
            { _id: _id },
            { $set: { uploaded_pan_file: filename } },
            { new: true }
        );

        return res.status(200).json({
            Status: true,
            message: "Pan card file uploaded successfully.",
            result
        });

    } catch (err) {
        console.error(err);
        return res.status(400).json({ Status: false, message: err.message });
    }
};
//Add file of pan card END

//Add file of Aadhar card START
exports.addAadharCardFile = async (req, res) => {
    try {
        let { token } = req.userData;
        const { _id } = req.params;
        const user = await users.findById(_id);

        if (!user) {
            return res.status(400).json({ Status: false, message: 'User ID not found' });
        }

        if (!req.file) {
            return res.status(400).json({ Status: false, message: 'Aadhar card file is not uploaded' });
        }

        const filename = req.file.filename;

        const result = await users.findOneAndUpdate(
            { _id: _id },
            { $set: { uploaded_aadher_file: filename } },
            { new: true }
        );

        return res.status(200).json({
            Status: true,
            message: "Aadhar card file uploaded successfully.",
            result
        });

    } catch (err) {
        console.error(err);
        return res.status(400).json({ Status: false, message: err.message });
    }
};
//Add file of Aadhar card END

//Add file of Bank Passbook START
exports.addBankPassbookFile = async (req, res) => {
    try {
        let { token } = req.userData;
        const { _id } = req.params;
        const user = await users.findById(_id);

        if (!user) {
            return res.status(400).json({ Status: false, message: 'User ID not found' });
        }

        if (!req.file) {
            return res.status(400).json({ Status: false, message: 'Bank passbook file is not uploaded' });
        }

        const filename = req.file.filename;

        const result = await users.findOneAndUpdate(
            { _id: _id },
            { $set: { uploaded_bank_passbook_file: filename } },
            { new: true }
        );

        return res.status(200).json({
            Status: true,
            message: "Bank passbook file uploaded successfully.",
            result
        });

    } catch (err) {
        console.error(err);
        return res.status(400).json({ Status: false, message: err.message });
    }
};
//Add file of Bank passbook END

//Aadhar file download START 
exports.downloadAadharFile = async (req, res) => {
    try {
        let { token } = req.userData;
        const dir = path.join(__dirname, '..', '..', 'JoinToGain', 'AadharCardFiles');

        // Ensure the directory exists
        await fs.promises.mkdir(dir, { recursive: true });

        console.log('Directory:', dir);

        const filename = req.params.filename;

        // Read the files in the directory using fs.promises.readdir
        const filesInFolder = await fs.promises.readdir(dir);
        console.log('Files in directory:', filesInFolder);

        const filePath = path.join(dir, filename);

        // Log the full file path
        console.log('Full File Path:', filePath);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Determine the file extension
            const fileExtension = path.extname(filePath).toLowerCase();

            // Set content type based on file extension
            let contentType = 'application/octet-stream'; // Default content type
            if (fileExtension === '.pdf') {
                contentType = 'application/pdf';
            } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
                contentType = 'image/jpeg';
            } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
                contentType = 'application/vnd.ms-excel';
            } // Add more conditions for other file types if needed

            // Stream the file to the client
            const fileStream = fs.createReadStream(filePath);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            fileStream.pipe(res);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error downloading major project file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
//Aadhar file download END

//Pan file download START 
exports.downloadPanFile = async (req, res) => {
    try {
        let { token } = req.userData;
        const dir = path.join(__dirname, '..', '..', 'JoinToGain', 'PanCardFiles');

        // Ensure the directory exists
        await fs.promises.mkdir(dir, { recursive: true });

        console.log('Directory:', dir);

        const filename = req.params.filename;

        // Read the files in the directory using fs.promises.readdir
        const filesInFolder = await fs.promises.readdir(dir);
        console.log('Files in directory:', filesInFolder);

        const filePath = path.join(dir, filename);

        // Log the full file path
        console.log('Full File Path:', filePath);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Determine the file extension
            const fileExtension = path.extname(filePath).toLowerCase();

            // Set content type based on file extension
            let contentType = 'application/octet-stream'; // Default content type
            if (fileExtension === '.pdf') {
                contentType = 'application/pdf';
            } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
                contentType = 'image/jpeg';
            } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
                contentType = 'application/vnd.ms-excel';
            } // Add more conditions for other file types if needed

            // Stream the file to the client
            const fileStream = fs.createReadStream(filePath);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            fileStream.pipe(res);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error downloading major project file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
//Pan file download END

//Bank passbook file download START 
exports.downloadBankPassbookFile = async (req, res) => {
    try {
        let { token } = req.userData;
        const dir = path.join(__dirname, '..', '..', 'JoinToGain', 'BankPassbookFiles');

        // Ensure the directory exists
        await fs.promises.mkdir(dir, { recursive: true });

        console.log('Directory:', dir);

        const filename = req.params.filename;

        // Read the files in the directory using fs.promises.readdir
        const filesInFolder = await fs.promises.readdir(dir);
        console.log('Files in directory:', filesInFolder);

        const filePath = path.join(dir, filename);

        // Log the full file path
        console.log('Full File Path:', filePath);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Determine the file extension
            const fileExtension = path.extname(filePath).toLowerCase();

            // Set content type based on file extension
            let contentType = 'application/octet-stream'; // Default content type
            if (fileExtension === '.pdf') {
                contentType = 'application/pdf';
            } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
                contentType = 'image/jpeg';
            } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
                contentType = 'application/vnd.ms-excel';
            } // Add more conditions for other file types if needed

            // Stream the file to the client
            const fileStream = fs.createReadStream(filePath);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            fileStream.pipe(res);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error downloading major project file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
//Bank passbook file download END

//Add top-up START
exports.addTopUp = async (req, res) => {
    try {
        let { token } = req.userData;
        const { userId } = req.params; 
        const { invest_type, utr_no, invest_amount, invest_duration_in_month } = req.body;
        const filename = req.file.filename;

        // Validate investment type
        if (!["Monthly", "monthly", "Long term", "long term"].includes(invest_type)) {
            return res.status(400).json({ error: "Invalid investment type. Use 'Monthly' or 'Long term'." });
        }

        // Validate investment amount (should be 1 lakh or a multiple of 1 lakh)
        if (invest_amount < 100000 || invest_amount % 100000 !== 0) {
            return res.status(400).json({ error: "Investment amount must be at least 1 lakh or a multiple of 1 lakh." });
        }

        // Set duration based on investment type
        let duration = invest_type.toLowerCase() === "monthly" ? 20 : invest_duration_in_month;

        // // Validate duration for long-term investment
        // if (invest_type.toLowerCase() === "long term" && (duration < 12 || duration % 12 !== 0)) {
        //     return res.status(400).json({ error: "For 'Long term' investment, duration must be at least 12 months or a multiple of 12 months." });
        // }
        
         // Ensure invest_duration_in_month is provided for "Long term" investments
         if (invest_type.toLowerCase() === "long term") {
            if (!invest_duration_in_month) {
                return res.status(400).json({ error: "For 'Long term' investment, invest_duration_in_month is required." });
            }
            if (invest_duration_in_month < 12 || invest_duration_in_month % 12 !== 0) {
                return res.status(400).json({ error: "For 'Long term' investment, duration must be at least 12 months or a multiple of 12 months." });
            }
        }

        // Find user by ID
        const user = await users.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // Create new investment entry
        const newInvestment = {
            _id: new mongoose.Types.ObjectId(),
            invest_no: user.investment_info.length + 1,
            invest_type,
            utr_no,
            invest_amount,
            invest_apply_date: moment().toISOString(),
            invest_duration_in_month: duration,
            uploaded_proof_file:filename
        };
    
        // Push investment to user's investment_info array
        user.investment_info.push(newInvestment);
        await user.save();

        res.status(200).json({ message: "Investment added successfully.", investment: newInvestment });

    } catch (error) {
        console.error("Error adding investment:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};
//Add top-up END

//Get top-up START
exports.getTopUp = async (req, res) => {
    try {
       // let { token } = req.userData;
        let { user_id } = req.params;
        let data = await userService.findAndGetUserAccount(user_id)
        if (data) {
            return res.status(200).json({ 
                Status: true, message: 'Get user TopUp details successful!', 
                investment_info:data.data.investment_info,               
            })
        } else {
            return res.status(404).send({ Status: false, message: 'Not Found User Account' })
        }
  
    } catch (error) {
        console.error("Error getting investment:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};
//Get top-up END

//Get Inactive user details START
exports.getInactiveUsers = async (req, res) => {
    try {
        let { token } = req.userData;
        // Fetch all users from userService
        const users = await userService.getiunactiveUserDetails();
        // Return only inactive users
        res.status(200).json(users);
    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
//Get Inactive user details END

