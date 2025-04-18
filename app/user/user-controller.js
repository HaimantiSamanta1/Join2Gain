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

        // // If a sponsor_id is provided, update the sponsor's level
        // if (user.user_profile_id) {
        //     let sponsor = await users.findOne({ user_profile_id: user.user_profile_id });
        //     if (sponsor) {
        //         // Increase the sponsor's level
        //         let currentLevel = sponsor.user_level;
        //         const nextLevel = getNextLevel(currentLevel); // Increment the user level (e.g., "level 1" -> "level 2")
                
        //         // Update sponsor level
        //         sponsor = await users.findByIdAndUpdate(sponsor._id, { user_level: nextLevel }, { new: true });

        //         // Also update the parent sponsor's level (if any)
        //         if (sponsor.sponsor_id) {
        //             await updateParentSponsorLevel(sponsor.sponsor_id); // Recursive update
        //         }
        //     }
        // }

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
        "level 0":"level 1",
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
      //  let { token } = req.userData;
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
// exports.getUser = async (req, res) => {
//     try {
//         let { user_id } = req.params;
//         let data = await userService.findAndGetUserAccount(user_id);

//         if (!data || !data.data) {
//             return res.status(404).json({ Status: false, message: 'User Account Not Found' });
//         }

//         console.log("User Data:", data);

//         let totalInvestmentAmount = 0;
//         let currentDate = moment();

//         if (Array.isArray(data.data.referrals) && data.data.referrals.length > 0) {
//             data.data.referrals.forEach(referral => {
//                 if (Array.isArray(referral.investment_info) && referral.investment_info.length > 0) {
//                     referral.investment_info.forEach(investment => {
//                         if (
//                             investment.investment_status &&
//                             investment.investment_status.toLowerCase() === "approved" &&
//                             investment.invest_confirm_date &&
//                             investment.invest_duration_in_month > 0
//                         ) {
//                             let investConfirmDate = moment(investment.invest_confirm_date);
//                             let durationInMonths = investment.invest_duration_in_month;

//                             let investStartDate;
//                             let day = investConfirmDate.date();

//                             if (day >= 1 && day <= 10) {
//                                 investStartDate = investConfirmDate.clone().add(1, 'months').date(10);
//                             } else if (day >= 11 && day <= 20) {
//                                 investStartDate = investConfirmDate.clone().add(1, 'months').date(10);
//                             } else {
//                                 investStartDate = investConfirmDate.clone().add(2, 'months').date(1);
//                             }

//                             let activeUntil = investStartDate.clone().add(durationInMonths, 'months');

//                             if (currentDate.isBefore(activeUntil)) {
//                                 totalInvestmentAmount += investment.invest_amount;
//                             }
//                         }
//                     });
//                 }
//             });
//         }

//         console.log("Total Active Investment Amount from Referrals:", totalInvestmentAmount);

//         let referralIncomePercentage = 0;
//         let userRank = "Unranked"; // Default rank

//         let no_of_direct_referrals = data.data.no_of_direct_referrals || 0;

//         if (no_of_direct_referrals >= 14 && totalInvestmentAmount >= 3000000) {
//             userRank = "Diamond";
//             referralIncomePercentage = 0.25;
//         } else if (no_of_direct_referrals >= 10 && totalInvestmentAmount >= 2000000) {
//             userRank = "Platinum";
//             referralIncomePercentage = 0.5;
//         } else if (no_of_direct_referrals >= 5 && totalInvestmentAmount >= 1000000) {
//             userRank = "Gold";
//             referralIncomePercentage = 1;
//         } else if (no_of_direct_referrals >= 2 && totalInvestmentAmount >= 500000) {
//             userRank = "Silver";
//             referralIncomePercentage = 2;
//         } else if (no_of_direct_referrals >= 1) {
//             userRank = "Default";
//             referralIncomePercentage = 3;
//         }

//         let referralIncome = (totalInvestmentAmount * referralIncomePercentage) / 100;
//         let rankUpdateDate = moment().format("YYYY-MM-DD");

//         let payoutDate;
//         let dayOfMonth = moment().date();

//         if (dayOfMonth >= 1 && dayOfMonth <= 10) {
//             payoutDate = moment().add(1, 'months').date(11).format("YYYY-MM-DD");
//         } else if (dayOfMonth >= 11 && dayOfMonth <= 20) {
//             payoutDate = moment().add(1, 'months').date(21).format("YYYY-MM-DD");
//         } else {
//             payoutDate = moment().add(2, 'months').date(2).format("YYYY-MM-DD");
//         }

//         console.log("New Rank:", userRank);
//         console.log("Referral Income:", referralIncome);
//         console.log("Rank Update Date:", rankUpdateDate);
//         console.log("Payout Date:", payoutDate);

//         // Update user rank and referral income
//         await users.updateOne({ _id: user_id }, {
//             $set: {
//                 user_rank_info: {
//                     rank_of_user: userRank,
//                     rank_update_date: rankUpdateDate,
//                     payout_date: payoutDate,
//                 },
//                 referral_payouts: {
//                     payout_date: payoutDate,
//                     amount: referralIncome,
//                    // investment_id: payout.investment_id 
//                 }
//             }
//         });

//         // Fetch updated user data
//         data = await userService.findAndGetUserAccount(user_id);

//         return res.status(200).json({
//             Status: true,
//             message: 'Get user account successful!',
//             // user_rank: userRank,
//             // total_referral_investment: totalInvestmentAmount,
//             // referral_income: referralIncome,
//             // rank_update_date: rankUpdateDate,
//             // payout_date: payoutDate,
//             data
//         });

//     } catch (error) {
//         console.error("Error in getUser:", error);
//         return res.status(500).json({ Status: false, message: 'Server Error', error: error.message });
//     }
// };

exports.getUser11 = async (req, res) => {
    try {
        let { user_id } = req.params;
        let data = await userService.findAndGetUserAccount(user_id);

        if (!data || !data.data) {
            return res.status(404).json({ Status: false, message: 'User Account Not Found' });
        }

        let totalInvestmentAmount = 0;
        let currentDate = moment();
        let rankOfUser = "Default Rank";
        let rankUpdateDate = moment();
        let referralIncomePercentage = 3;
        let userLevel = 1;
        let referrals = data.data.referrals || [];

        const rankLevelMap = {
            "Default Rank": "level 1",
            "Silver": "level 2",
            "Gold": "level 3",
            "Platinum": "level 4",
            "Diamond": "level 5"
        };


        let referralPayouts = [...(data.data.referral_payouts || [])];

        const getRankPercentage = (rank) => {
            switch (rank) {
                case "Diamond": return 0.25;
                case "Platinum": return 0.5;
                case "Gold": return 1;
                case "Silver": return 2;
                default: return 3;
            }
        };

        // Calculate totalInvestmentAmount & generate pending payouts
        if (Array.isArray(referrals)) {
            referrals.forEach(referral => {
                if (Array.isArray(referral.investment_info)) {
                    referral.investment_info.forEach(investment => {
                        if (
                            investment.investment_status?.toLowerCase() === "approved" &&
                            investment.invest_confirm_date &&
                            investment.invest_duration_in_month > 0
                        ) {
                            let investConfirmDate = moment(investment.invest_confirm_date);
                            let day = investConfirmDate.date();
                            let investStartDate;

                            if (day <= 10) investStartDate = investConfirmDate.clone().add(1, 'months').date(11);
                            else if (day <= 20) investStartDate = investConfirmDate.clone().add(1, 'months').date(21);
                            else investStartDate = investConfirmDate.clone().add(2, 'months').date(2);

                            let activeUntil = investStartDate.clone().add(investment.invest_duration_in_month, 'months');

                            if (currentDate.isBefore(activeUntil)) {
                                totalInvestmentAmount += investment.invest_amount;
                            }

                            let payoutDate = investStartDate.clone().format("YYYY-MM-DD");

                            const isDuplicate = referralPayouts.some(payout =>
                                payout.investment_id?.toString() === investment._id.toString() &&
                                moment(payout.payout_date).isSame(payoutDate, 'day')
                            );

                            if (!isDuplicate) {
                                referralPayouts.push({
                                    payout_date: payoutDate,
                                    //amount: investment.invest_amount * (referralIncomePercentage / 100),
                                    status: "Pending",
                                    investment_id: investment._id
                                });
                            }
                        }
                    });
                }
            });
        }

        let no_of_direct_referrals = data.data.no_of_direct_referrals || 0;

        console.log("total InvestmentAmount of referral",totalInvestmentAmount)

        if (no_of_direct_referrals >= 14 && totalInvestmentAmount >= 3000000) {
            rankOfUser = "Diamond";
            referralIncomePercentage = 0.25;
            userLevel = 5;
        } else if (no_of_direct_referrals >= 10 && totalInvestmentAmount >= 2000000) {
            rankOfUser = "Platinum";
            referralIncomePercentage = 0.5;
            userLevel = 4;
        } else if (no_of_direct_referrals >= 5 && totalInvestmentAmount >= 1000000) {
            rankOfUser = "Gold";
            referralIncomePercentage = 1;
            userLevel = 3;
        } else if (no_of_direct_referrals >= 2 && totalInvestmentAmount >= 500000) {
            rankOfUser = "Silver";
            referralIncomePercentage = 2;
            userLevel = 2;
        }

        userLevel = rankLevelMap[rankOfUser] || 1;
        const existingRankEntries = data.data.user_rank_info || [];
        const latestRankEntry = existingRankEntries[existingRankEntries.length - 1];
        const userRankInfo = [...existingRankEntries];
        const isNewRank = !latestRankEntry || latestRankEntry.rank_of_user !== rankOfUser;

        if (isNewRank) {
            rankUpdateDate = moment();

            userRankInfo.push({
                rank_of_user: rankOfUser,
                rank_update_date: rankUpdateDate.toDate(),
                investment_amount: totalInvestmentAmount,
                user_level: userLevel
            });

            const previousRankPercentage = latestRankEntry
                ? getRankPercentage(latestRankEntry.rank_of_user)
                : 3;

            referrals.forEach(referral => {
                referral.investment_info?.forEach(investment => {
                    if (
                        investment.investment_status?.toLowerCase() === "approved" &&
                        investment.invest_confirm_date &&
                        investment.invest_duration_in_month > 0
                    ) {
                        const investConfirmDate = moment(investment.invest_confirm_date);
                        const day = investConfirmDate.date();
                        let investStartDate;

                        if (day <= 10) investStartDate = investConfirmDate.clone().add(1, 'months').date(11);
                        else if (day <= 20) investStartDate = investConfirmDate.clone().add(1, 'months').date(21);
                        else investStartDate = investConfirmDate.clone().add(2, 'months').date(2);

                        let effectiveMonthStart = rankUpdateDate.clone();
                        if (rankUpdateDate.date() > 20) {
                            effectiveMonthStart.add(2, 'months').startOf('month');
                        } else {
                            effectiveMonthStart.add(1, 'months').startOf('month');
                        }

                        const applicablePercentage = investStartDate.isSameOrAfter(effectiveMonthStart, 'month')
                            ? referralIncomePercentage
                            : previousRankPercentage;

                        const adjustedPayoutDate = investStartDate.clone().format("YYYY-MM-DD");

                        const existingPayoutIndex = referralPayouts.findIndex(payout =>
                            payout.investment_id?.toString() === investment._id.toString() &&
                            moment(payout.payout_date).isSame(adjustedPayoutDate, 'day')
                        );

                        if (existingPayoutIndex !== -1) {
                            referralPayouts[existingPayoutIndex].amount =
                                investment.invest_amount * (applicablePercentage / 100);
                        } else {
                            referralPayouts.push({
                                payout_date: adjustedPayoutDate,
                               // amount: investment.invest_amount * (applicablePercentage / 100),
                                status: "Pending",
                                investment_id: investment._id
                            });
                        }
                    }
                });
            });
        }

        await users.updateOne(
            { _id: user_id },
            {
                $set: {
                    "user_rank_info": userRankInfo,
                    "referral_payouts": referralPayouts,
                    "user_level": userLevel
                }
            },
            { upsert: true }
        );

        data = await userService.findAndGetUserAccount(user_id);

        return res.status(200).json({
            Status: true,
            message: 'Get user account successful!',
            Direct_refferal_totalInvestmentAmount:totalInvestmentAmount,
            data,
        });

    } catch (error) {
        console.error("Error in getUser11:", error);
        return res.status(500).json({ Status: false, message: 'Server Error', error: error.message });
    }
};

// exports.getUser12 = async (req, res) => {
//     try {
//         let { user_id } = req.params;
//         let data = await userService.findAndGetUserAccount(user_id);

//         if (!data || !data.data) {
//             return res.status(404).json({ Status: false, message: 'User Account Not Found' });
//         }

//         let totalInvestmentAmount = 0;
//         let currentDate = moment();
//         let rankOfUser = "Default Rank";
//         let referralIncomePercentage = 3;
//         let userLevel = 1;
//         let referralPayouts = [...(data.data.referral_payouts || [])];

//         const rankLevelMap = {
//             "Default Rank": "level 1",
//             "Silver": "level 2",
//             "Gold": "level 3",
//             "Platinum": "level 4",
//             "Diamond": "level 5"
//         };

//         const generateReferralPayoutsForAllLevels = (referrals) => {
//             if (!Array.isArray(referrals)) return;

//             referrals.forEach(referral => {
//                 if (Array.isArray(referral.investment_info)) {
//                     referral.investment_info.forEach(investment => {
//                         if (
//                             investment.investment_status?.toLowerCase() === "approved" &&
//                             investment.invest_confirm_date &&
//                             investment.invest_duration_in_month > 0
//                         ) {
//                             let investConfirmDate = moment(investment.invest_confirm_date);
//                             let day = investConfirmDate.date();
//                             let investStartDate;

//                             if (day <= 10) investStartDate = investConfirmDate.clone().add(1, 'months').date(11);
//                             else if (day <= 20) investStartDate = investConfirmDate.clone().add(1, 'months').date(21);
//                             else investStartDate = investConfirmDate.clone().add(2, 'months').date(2);

//                             let activeUntil = investStartDate.clone().add(investment.invest_duration_in_month, 'months');

//                             if (currentDate.isBefore(activeUntil)) {
//                                 totalInvestmentAmount += investment.invest_amount;
//                             }

//                             let payoutDate = investStartDate.clone().format("YYYY-MM-DD");

//                             const isDuplicate = referralPayouts.some(payout =>
//                                 payout.investment_id?.toString() === investment._id.toString() &&
//                                 moment(payout.payout_date).isSame(payoutDate, 'day')
//                             );

//                             if (!isDuplicate) {
//                                 referralPayouts.push({
//                                     payout_date: payoutDate,
//                                     status: "Pending",
//                                     investment_id: investment._id
//                                 });
//                             }
//                         }
//                     });
//                 }

//                 // Recursively check sub-referrals
//                 if (Array.isArray(referral.referrals) && referral.referrals.length > 0) {
//                     generateReferralPayoutsForAllLevels(referral.referrals);
//                 }
//             });
//         };

//         // ✅ Run payout generation for all levels of referrals
//         generateReferralPayoutsForAllLevels(data.data.referrals);

//         // Determine user's rank based on totalInvestmentAmount and referral count
//         const no_of_direct_referrals = data.data.no_of_direct_referrals || 0;

//         if (no_of_direct_referrals >= 14 && totalInvestmentAmount >= 3000000) {
//             rankOfUser = "Diamond";
//             referralIncomePercentage = 0.25;
//             userLevel = 5;
//         } else if (no_of_direct_referrals >= 10 && totalInvestmentAmount >= 2000000) {
//             rankOfUser = "Platinum";
//             referralIncomePercentage = 0.5;
//             userLevel = 4;
//         } else if (no_of_direct_referrals >= 5 && totalInvestmentAmount >= 1000000) {
//             rankOfUser = "Gold";
//             referralIncomePercentage = 1;
//             userLevel = 3;
//         } else if (no_of_direct_referrals >= 2 && totalInvestmentAmount >= 500000) {
//             rankOfUser = "Silver";
//             referralIncomePercentage = 2;
//             userLevel = 2;
//         }

//         userLevel = rankLevelMap[rankOfUser] || 1;

//         // Step 3: Update user's rank info if new rank is found
//         const existingRankEntries = data.data.user_rank_info || [];
//         const latestRankEntry = existingRankEntries[existingRankEntries.length - 1];
//         const isNewRank = !latestRankEntry || latestRankEntry.rank_of_user !== rankOfUser;
//         const userRankInfo = [...existingRankEntries];

//         if (isNewRank) {
//             const rankUpdateDate = moment();
//             userRankInfo.push({
//                 rank_of_user: rankOfUser,
//                 rank_update_date: rankUpdateDate.toDate(),
//                 investment_amount: totalInvestmentAmount,
//                 user_level: userLevel
//             });
//         }

//         // Step 4: Update user document
//         await users.updateOne(
//             { _id: user_id },
//             {
//                 $set: {
//                     user_rank_info: userRankInfo,
//                     referral_payouts: referralPayouts,
//                     user_level: userLevel
//                 }
//             },
//             { upsert: true }
//         );

//         // Step 5: Return updated user data
//         data = await userService.findAndGetUserAccount(user_id);

//         return res.status(200).json({
//             Status: true,
//             message: 'Get user account successful!',
//             Direct_refferal_totalInvestmentAmount: totalInvestmentAmount,
//             data,
//         });

//     } catch (error) {
//         console.error("Error in getUser12:", error);
//         return res.status(500).json({ Status: false, message: 'Server Error', error: error.message });
//     }
// };

exports.getUser12 = async (req, res) => {
    try {
        let { user_id } = req.params;
        let data = await userService.findAndGetUserAccount(user_id);

        if (!data || !data.data) {
            return res.status(404).json({ Status: false, message: 'User Account Not Found' });
        }

        let totalInvestmentAmount = 0;
        let currentDate = moment();
        let rankOfUser = "Default Rank";
        let referralIncomePercentage = 3;
        let userLevel = 1;
        let referralPayouts = [...(data.data.referral_payouts || [])];

        const rankLevelMap = {
            "Default Rank": "level 1",
            "Silver": "level 2",
            "Gold": "level 3",
            "Platinum": "level 4",
            "Diamond": "level 5"
        };

        // ✅ Step 1: Calculate investment ONLY from direct referrals
        if (Array.isArray(data.data.referrals)) {
            data.data.referrals.forEach(referral => {
                if (Array.isArray(referral.investment_info)) {
                    referral.investment_info.forEach(investment => {
                        if (
                            investment.investment_status?.toLowerCase() === "approved" &&
                            investment.invest_confirm_date &&
                            investment.invest_duration_in_month > 0
                        ) {
                            let investConfirmDate = moment(investment.invest_confirm_date);
                            let day = investConfirmDate.date();
                            let investStartDate;

                            if (day <= 10) investStartDate = investConfirmDate.clone().add(1, 'months').date(11);
                            else if (day <= 20) investStartDate = investConfirmDate.clone().add(1, 'months').date(21);
                            else investStartDate = investConfirmDate.clone().add(2, 'months').date(2);

                            let activeUntil = investStartDate.clone().add(investment.invest_duration_in_month, 'months');

                            if (currentDate.isBefore(activeUntil)) {
                                totalInvestmentAmount += investment.invest_amount;
                            }
                        }
                    });
                }
            });
        }

        // ✅ Step 2: Generate referral payouts for ALL levels
        const generateReferralPayoutsForAllLevels = (referrals) => {
            if (!Array.isArray(referrals)) return;

            referrals.forEach(referral => {
                if (Array.isArray(referral.investment_info)) {
                    referral.investment_info.forEach(investment => {
                        if (
                            investment.investment_status?.toLowerCase() === "approved" &&
                            investment.invest_confirm_date &&
                            investment.invest_duration_in_month > 0
                        ) {
                            let investConfirmDate = moment(investment.invest_confirm_date);
                            let day = investConfirmDate.date();
                            let investStartDate;

                            if (day <= 10) investStartDate = investConfirmDate.clone().add(1, 'months').date(11);
                            else if (day <= 20) investStartDate = investConfirmDate.clone().add(1, 'months').date(21);
                            else investStartDate = investConfirmDate.clone().add(2, 'months').date(2);

                            let payoutDate = investStartDate.clone().format("YYYY-MM-DD");

                            const isDuplicate = referralPayouts.some(payout =>
                                payout.investment_id?.toString() === investment._id.toString() &&
                                moment(payout.payout_date).isSame(payoutDate, 'day')
                            );

                            if (!isDuplicate) {
                                referralPayouts.push({
                                    payout_date: payoutDate,
                                    status: "Pending",
                                    investment_id: investment._id
                                });
                            }
                        }
                    });
                }

                // Recursive call for sub-referrals
                if (Array.isArray(referral.referrals) && referral.referrals.length > 0) {
                    generateReferralPayoutsForAllLevels(referral.referrals);
                }
            });
        };

        generateReferralPayoutsForAllLevels(data.data.referrals);

        // ✅ Step 3: Determine rank based on totalInvestmentAmount and direct referral count
        const no_of_direct_referrals = data.data.no_of_direct_referrals || 0;

        if (no_of_direct_referrals >= 14 && totalInvestmentAmount >= 3000000) {
            rankOfUser = "Diamond";
            referralIncomePercentage = 0.25;
            userLevel = 5;
        } else if (no_of_direct_referrals >= 10 && totalInvestmentAmount >= 2000000) {
            rankOfUser = "Platinum";
            referralIncomePercentage = 0.5;
            userLevel = 4;
        } else if (no_of_direct_referrals >= 5 && totalInvestmentAmount >= 1000000) {
            rankOfUser = "Gold";
            referralIncomePercentage = 1;
            userLevel = 3;
        } else if (no_of_direct_referrals >= 2 && totalInvestmentAmount >= 500000) {
            rankOfUser = "Silver";
            referralIncomePercentage = 2;
            userLevel = 2;
        }

        userLevel = rankLevelMap[rankOfUser] || 1;

        // ✅ Step 4: Update user rank info if changed
        const existingRankEntries = data.data.user_rank_info || [];
        const latestRankEntry = existingRankEntries[existingRankEntries.length - 1];
        const isNewRank = !latestRankEntry || latestRankEntry.rank_of_user !== rankOfUser;
        const userRankInfo = [...existingRankEntries];

        if (isNewRank) {
            const rankUpdateDate = moment();
            userRankInfo.push({
                rank_of_user: rankOfUser,
                rank_update_date: rankUpdateDate.toDate(),
                investment_amount: totalInvestmentAmount,
                user_level: userLevel
            });
        }

        // ✅ Step 5: Update the user in DB
        await users.updateOne(
            { _id: user_id },
            {
                $set: {
                    user_rank_info: userRankInfo,
                    referral_payouts: referralPayouts,
                    user_level: userLevel
                }
            },
            { upsert: true }
        );

        // ✅ Step 6: Return updated user data
        data = await userService.findAndGetUserAccount(user_id);

        return res.status(200).json({
            Status: true,
            message: 'Get user account successful!',
            Direct_refferal_totalInvestmentAmount: totalInvestmentAmount,
            data,
        });

    } catch (error) {
        console.error("Error in getUser12:", error);
        return res.status(500).json({ Status: false, message: 'Server Error', error: error.message });
    }
};



//Get a user details END

//Refferal payout caluculation START 
exports.getReferralPayoutAmountOfInvestment = async (req, res) => {
  try {
    const { user_id, investment_id, referral_payout_id } = req.body;

    const user = await users.findById(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("user",user)

    const referralPayout = user.referral_payouts.find(
      (p) => String(p._id) === referral_payout_id && String(p.investment_id) === investment_id
    );

    if (!referralPayout) {
      return res.status(404).json({ message: "Matching referral payout not found" });
    }
    console.log("referralPayout",referralPayout)
    const payoutDate = moment(referralPayout.payout_date);
    console.log("payoutDate",payoutDate)

    let matchedInvestment = null;
    let referralUserId = null;

    // Loop through each referral of the main user
    for (let referralId of user.referrals) {
      const referralUser = await users.findById(referralId);
      if (!referralUser || !referralUser.investment_info) continue;

      const foundInvestment = referralUser.investment_info.find(
        (inv) => String(inv._id) === investment_id
      );

      console.log("foundInvestment",foundInvestment)

      if (foundInvestment) {
        matchedInvestment = foundInvestment;
        referralUserId = referralUser._id;
        break;
      }
    }

    if (!matchedInvestment) {
      return res.status(404).json({ message: "Investment not found in referrals' investment_info" });
    }

    const investAmount = matchedInvestment.invest_amount;

    console.log("foundInvestment",investAmount)

    // const ranksBeforePayout1 = user.user_rank_info
    // console.log("ranksBeforePayout1",ranksBeforePayout1)

    // const latestRank = "gold"
    // const applyRank ="gold"

     // Function to determine applicable rank
     const getApplicableRank = (rankInfoList, payoutDate) => {
        let applicableRank = "Default Rank";
        const payoutMonth = payoutDate.month(); // 0-indexed
        const payoutYear = payoutDate.year();
  
        for (let rank of rankInfoList) {
          const rankDate = moment(rank.rank_update_date);
          const rankMonth = rankDate.month();
          const rankYear = rankDate.year();
          const rankDay = rankDate.date();
  
          let effectiveMonth = rankDay <= 20 ? rankMonth + 1 : rankMonth + 2;
          let effectiveYear = rankYear;
  
          if (effectiveMonth > 11) {
            effectiveMonth -= 12;
            effectiveYear += 1;
          }
  
          if (effectiveMonth === payoutMonth && effectiveYear === payoutYear) {
            applicableRank = rank.rank_of_user;
          }
        }
  
        return applicableRank;
      };
  
      const ranksBeforePayout1 = user.user_rank_info;
      const applyRank = getApplicableRank(ranksBeforePayout1, payoutDate);
      console.log("Apply Rank for payout:", applyRank);
    

    let referralPercentage = 0;
    switch (applyRank.toLowerCase()) {
      case "silver":
        referralPercentage = 2;
        break;
      case "gold":
        referralPercentage = 1;
        break;
      case "platinum":
        referralPercentage = 0.5;
        break;
      case "diamond":
        referralPercentage = 0.25;
        break;
      case "default rank":
        referralPercentage = 3;
        break;
      default:
        referralPercentage = 3;
    }

    const referralAmount = (investAmount * referralPercentage) / 100;

    const payoutIndex = user.referral_payouts.findIndex(
        (p) => String(p._id) === referral_payout_id && String(p.investment_id) === investment_id
      );
  
      if (payoutIndex !== -1) {
        user.referral_payouts[payoutIndex].amount = referralAmount;
        await user.save(); 
      }

    return res.status(200).json({
      user_id,
      referral_user_id: referralUserId,
      investment_id,
      referral_payout_id,
      invest_amount: investAmount,
     // rank: latestRank.rank_of_user,
      referral_percentage: referralPercentage,
      referral_amount: referralAmount.toFixed(2),
    });
  } catch (error) {
    console.error("Error in getReferralPayoutAmountOfInvestment:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};


//3 ,2,1 like all

// Recursive function to search ALL nested referrals for investment
// const findInvestmentInAllNestedReferrals = async (referralIds, targetInvestmentId) => {
//   for (let referralId of referralIds) {
//     const referralUser = await users.findById(referralId);
//     if (!referralUser) continue;

//     const foundInvestment = referralUser.investment_info?.find(
//       (inv) => String(inv._id) === targetInvestmentId
//     );

//     if (foundInvestment) {
//       return {
//         matchedInvestment: foundInvestment,
//         referralUserId: referralUser._id
//       };
//     }

//     if (referralUser.referrals && referralUser.referrals.length > 0) {
//       const result = await findInvestmentInAllNestedReferrals(referralUser.referrals, targetInvestmentId);
//       if (result) return result;
//     }
//   }

//   return null;
// };

exports.getReferralPayoutAmountOfInvestment1 = async (req, res) => {
  try {
    const { user_id, investment_id, referral_payout_id } = req.body;

    const user = await users.findById(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const referralPayout = user.referral_payouts.find(
      (p) => String(p._id) === referral_payout_id && String(p.investment_id) === investment_id
    );

    if (!referralPayout) {
      return res.status(404).json({ message: "Matching referral payout not found" });
    }

    const payoutDate = moment(referralPayout.payout_date);

    // 🔍 Deep search in all nested referrals
    const result = await findInvestmentInAllNestedReferrals(user.referrals, investment_id);
    if (!result) {
      return res.status(404).json({ message: "Investment not found in referrals' investment_info" });
    }

    const { matchedInvestment, referralUserId } = result;
    const investAmount = matchedInvestment.invest_amount;

    // 🧠 Determine applicable rank
    const getApplicableRank = (rankInfoList, payoutDate) => {
      let applicableRank = "Default Rank";
      const payoutMonth = payoutDate.month(); // 0-indexed
      const payoutYear = payoutDate.year();

      for (let rank of rankInfoList) {
        const rankDate = moment(rank.rank_update_date);
        const rankMonth = rankDate.month();
        const rankYear = rankDate.year();
        const rankDay = rankDate.date();

        let effectiveMonth = rankDay <= 20 ? rankMonth + 1 : rankMonth + 2;
        let effectiveYear = rankYear;

        if (effectiveMonth > 11) {
          effectiveMonth -= 12;
          effectiveYear += 1;
        }

        if (effectiveMonth === payoutMonth && effectiveYear === payoutYear) {
          applicableRank = rank.rank_of_user;
        }
      }

      return applicableRank;
    };

    const ranksBeforePayout1 = user.user_rank_info;
    const applyRank = getApplicableRank(ranksBeforePayout1, payoutDate);

    let referralPercentage = 0;
    switch (applyRank.toLowerCase()) {
      case "silver":
        referralPercentage = 2;
        break;
      case "gold":
        referralPercentage = 1;
        break;
      case "platinum":
        referralPercentage = 0.5;
        break;
      case "diamond":
        referralPercentage = 0.25;
        break;
      case "default rank":
        referralPercentage = 3;
        break;
      default:
        referralPercentage = 3;
    }

    const referralAmount = (investAmount * referralPercentage) / 100;

    const payoutIndex = user.referral_payouts.findIndex(
      (p) => String(p._id) === referral_payout_id && String(p.investment_id) === investment_id
    );

    if (payoutIndex !== -1) {
      user.referral_payouts[payoutIndex].amount = referralAmount;
      await user.save();
    }

    return res.status(200).json({
      user_id,
      referral_user_id: referralUserId,
      investment_id,
      referral_payout_id,
      invest_amount: investAmount,
      referral_percentage: referralPercentage,
      referral_amount: referralAmount.toFixed(2),
      rank: applyRank
    });
  } catch (error) {
    console.error("Error in getReferralPayoutAmountOfInvestment:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

//................................................................................

const findInvestmentInAllNestedReferrals = async (referralIds, targetInvestmentId, level = 1) => {
  for (let referralId of referralIds) {
    const referralUser = await users.findById(referralId);
    if (!referralUser) continue;

    const foundInvestment = referralUser.investment_info?.find(
      (inv) => String(inv._id) === targetInvestmentId
    );

    if (foundInvestment) {
      return {
        matchedInvestment: foundInvestment,
        referralUserId: referralUser._id,
        level
      };
    }

    if (referralUser.referrals && referralUser.referrals.length > 0) {
      const result = await findInvestmentInAllNestedReferrals(referralUser.referrals, targetInvestmentId, level + 1);
      if (result) return result;
    }
  }

  return null;
};

const getReferralPercent = (rank) => {
    switch (rank.toLowerCase()) {
      case "silver":
        return 2;
      case "gold":
        return 1;
      case "platinum":
        return 0.5;
      case "diamond":
        return 0.25;
      default:
        return 3;
    }
  };
  
  const meetsRankCriteria = async (user, requiredRank) => {
    const directReferrals = user.referrals || [];
    const directReferralCount = directReferrals.length;
  
    const firstLevelUsers = await users.find({ _id: { $in: directReferrals } });
  
    const firstLevelBusiness = firstLevelUsers.reduce((sum, refUser) => {
      return sum + (refUser.investment_info?.reduce((invSum, inv) => invSum + inv.invest_amount, 0) || 0);
    }, 0);
  
    const businessInLakh = firstLevelBusiness / 100000;
  
    switch (requiredRank.toLowerCase()) {
      case "silver":
        return directReferralCount >= 2 && businessInLakh >= 5;
      case "gold":
        return directReferralCount >= 5 && businessInLakh >= 10;
      case "platinum":
        return directReferralCount >= 10 && businessInLakh >= 20;
      case "diamond":
        return directReferralCount >= 14 && businessInLakh >= 30;
      default:
        return false;
    }
  };
  
  exports.getReferralPayoutAmountOfInvestment2= async (req, res) => {
    try {
      const { user_id, investment_id, referral_payout_id } = req.body;
  
      const user = await users.findById(user_id);
      if (!user) return res.status(404).json({ message: "User not found" });
  
      const referralPayout = user.referral_payouts.find(
        (p) => String(p._id) === referral_payout_id && String(p.investment_id) === investment_id
      );
  
      if (!referralPayout) {
        return res.status(404).json({ message: "Matching referral payout not found" });
      }
  
      const payoutDate = moment(referralPayout.payout_date);
  
      const result = await findInvestmentInAllNestedReferrals(user.referrals, investment_id);
      if (!result) {
        return res.status(404).json({ message: "Investment not found in referrals' investment_info" });
      }
  
      const { matchedInvestment, referralUserId, level } = result;
      const investAmount = matchedInvestment.invest_amount;
  
      const getApplicableRank = (rankInfoList, payoutDate) => {
        let applicableRank = "Default Rank";
        const payoutMonth = payoutDate.month();
        const payoutYear = payoutDate.year();
  
        for (let rank of rankInfoList) {
          const rankDate = moment(rank.rank_update_date);
          const rankMonth = rankDate.month();
          const rankYear = rankDate.year();
          const rankDay = rankDate.date();
  
          let effectiveMonth = rankDay <= 20 ? rankMonth + 1 : rankMonth + 2;
          let effectiveYear = rankYear;
  
          if (effectiveMonth > 11) {
            effectiveMonth -= 12;
            effectiveYear += 1;
          }
  
          if (effectiveMonth === payoutMonth && effectiveYear === payoutYear) {
            applicableRank = rank.rank_of_user;
          }
        }
  
        return applicableRank;
      };
  
      const ranksBeforePayout1 = user.user_rank_info;
      const applyRank = getApplicableRank(ranksBeforePayout1, payoutDate);
  
      const meetsRankCondition = await meetsRankCriteria(user, applyRank);
  
      let referralPercentage = 3;
  
      if (level === 1) {
        referralPercentage = 3; // Always
      } else if (level === 2 || (level >= 3 && level <= 5)) {
        referralPercentage = meetsRankCondition ? getReferralPercent(applyRank) : 3;
      } else if (level >= 6) {
        referralPercentage = getReferralPercent("Diamond");
      }
  
      const referralAmount = (investAmount * referralPercentage) / 100;
  
      const payoutIndex = user.referral_payouts.findIndex(
        (p) => String(p._id) === referral_payout_id && String(p.investment_id) === investment_id
      );
  
      if (payoutIndex !== -1) {
        user.referral_payouts[payoutIndex].amount = referralAmount;
        await user.save();
      }
  
      return res.status(200).json({
        user_id,
        referral_user_id: referralUserId,
        investment_id,
        referral_payout_id,
        invest_amount: investAmount,
        referral_percentage: referralPercentage,
        referral_amount: referralAmount.toFixed(2),
        rank: applyRank,
        level,
      });
    } catch (error) {
      console.error("Error in getReferralPayoutAmountOfInvestment:", error);
      return res.status(500).json({ message: "Server Error" });
    }
  };
//...................................................................................
  
  

//Refferal payout caluculation END


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
       // let { token } = req.userData;
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
        //let { token } = req.userData;
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
       // let { token } = req.userData;
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

//Get All Users TopUp START
exports.getAllUsersTopUp = async (req, res) => {
    try {
        let data = await userService.findAndGetAllUsersTopUp();
        
        if (data.Status) {
            return res.status(200).json({
                Status: true,
                message: 'Get all users Top-Up details successful!',
                users: data.data,
            });
        } else {
            return res.status(404).json({ Status: false, message: 'No user data found' });
        }
  
    } catch (error) {
        console.error("Error getting all users' investment details:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};
//Get All Users TopUp END

//Get UserData of reward START
exports.getUserData = async (req, res) => {
    try {
        let { user_id } = req.params;
        let data = await userService.findAndGetUserAccount(user_id);

        if (!data || !data.data) {
            return res.status(404).json({ Status: false, message: 'User Account Not Found' });
        }

        const user = data.data;
        const no_of_direct_referrals=data.data.no_of_direct_referrals;

        let userTotalInvestment = 0;
        let referralTotalInvestment = 0;

   
        if (Array.isArray(user.investment_info)) {
            user.investment_info.forEach(investment => {
                if (
                    investment.investment_status?.toLowerCase() === 'approved' &&
                    investment.invest_amount
                ) {
                    userTotalInvestment += investment.invest_amount;
                }
            });
        }


        const referrals = await users.find({ sponsor_id: user.user_profile_id });

    
        referrals.forEach(ref => {
            if (Array.isArray(ref.investment_info)) {
                ref.investment_info.forEach(investment => {
                    if (
                        investment.investment_status?.toLowerCase() === 'approved' &&
                        investment.invest_amount
                    ) {
                        referralTotalInvestment += investment.invest_amount;
                    }
                });
            }
        });

        
        return res.status(200).json({
            Status: true,
            message: 'Get user info successful!',
            data: {
               // user_info: user,
                no_of_direct_referrals:no_of_direct_referrals,
                user_total_investment: userTotalInvestment,
                direct_referral_total_investment: referralTotalInvestment
            }
        });

    } catch (error) {
        console.error("Error in getUserData:", error);
        return res.status(500).json({ Status: false, message: 'Server Error', error: error.message });
    }
};

exports.getUserData11 = async (req, res) => {
    try {
        const { user_id } = req.params;
        const data = await userService.findAndGetUserAccount(user_id);

        if (!data || !data.data) {
            return res.status(404).json({ Status: false, message: 'User Account Not Found' });
        }

        const user = data.data;
      //  const rewards = data.data.rewards;
        const no_of_direct_referrals = user.no_of_direct_referrals || 0;

        let userTotalInvestment = 0;
        let referralTotalInvestment = 0;

        // User's own approved investment total
        if (Array.isArray(user.investment_info)) {
            user.investment_info.forEach(investment => {
                if (
                    investment.investment_status?.toLowerCase() === 'approved' &&
                    typeof investment.invest_amount === 'number'
                ) {
                    userTotalInvestment += investment.invest_amount;
                }
            });
        }

        // Referrals' total approved investment
        const referrals = await users.find({ sponsor_id: user.user_profile_id });

        referrals.forEach(ref => {
            if (Array.isArray(ref.investment_info)) {
                ref.investment_info.forEach(investment => {
                    if (
                        investment.investment_status?.toLowerCase() === 'approved' &&
                        typeof investment.invest_amount === 'number'
                    ) {
                        referralTotalInvestment += investment.invest_amount;
                    }
                });
            }
        });

        // Check for "Tablet" reward eligibility
        let rewards = user.rewards || [];
        
        const rewardList = [
            {
                name: "Tablet",
                condition: () =>
                    no_of_direct_referrals >= 4 &&
                    userTotalInvestment >= 2500000 &&
                    referralTotalInvestment >= 1000000
            },
            {
                name: "THAILAND OR MALAYSIA TRIP (2 PERSONS)",
                condition: () =>
                    no_of_direct_referrals >= 10 &&
                    userTotalInvestment >= 5000000 &&
                    referralTotalInvestment >= 2500000
            },
            {
                name: "2 LAKHS WORTH GOLD",
                condition: () =>
                    no_of_direct_referrals >= 17 &&
                    userTotalInvestment >= 10000000 &&
                    referralTotalInvestment >= 8000000
            },
            {
                name: "DUBAI TRIP - 2 PERSONS + 2 LAKHS WORTH GOLD",
                condition: () =>
                    no_of_direct_referrals >= 70 &&
                    userTotalInvestment >= 20000000 &&
                    referralTotalInvestment >= 14000000
            },
            {
                name: "CAR FUND - Rs. 10 LAKHS",
                condition: () =>
                    no_of_direct_referrals >= 95 &&
                    userTotalInvestment >= 30000000 &&
                    referralTotalInvestment >= 19000000
            },
            {
                name: "HOUSE FUND - Rs. 25 LAKHS",
                condition: () =>
                    no_of_direct_referrals >= 168 &&
                    userTotalInvestment >= 50000000 &&
                    referralTotalInvestment >= 35000000
            }
        ];

        let updated = false;

        for (const reward of rewardList) {
            const alreadyExists = rewards.some(r => r.reward_name === reward.name);
            if (reward.condition() && !alreadyExists) {
                rewards.push({
                    reward_name: reward.name,
                    reward_achieved_date: new Date()
                });
                updated = true;
            }
        }

        if (updated) {
            await users.updateOne({ _id: user._id }, { $set: { rewards } });
        }

        return res.status(200).json({
            Status: true,
            message: 'Get user info successful!',
            data: {
                no_of_direct_referrals,
                user_total_investment: userTotalInvestment,
                direct_referral_total_investment: referralTotalInvestment,
                rewards:rewards,
                data
            }
        });

    } catch (error) {
        console.error("Error in getUserData:", error);
        return res.status(500).json({ Status: false, message: 'Server Error', error: error.message });
    }
};
//Get UserData of reward START

//Top-up file download START 
exports.downloadTopupFile = async (req, res) => {
    try {
       // let { token } = req.userData;
        const dir = path.join(__dirname, '..', '..', 'JoinToGain', 'TopupProofFiles');

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
//Top-up file download END