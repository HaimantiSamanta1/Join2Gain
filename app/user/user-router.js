const express = require('express')
const route = express.Router()

const userController = require('./user-controller');
const VerifyJwtToken = require('../../app/jwt/verifyAccessToken');

const {uploadPanCardFile} =require('../middleware/pan-file');
const {uploadAadharFile} =require('../middleware/aadher-file');
const {uploadBankPassbookFile} =require('../middleware/bank-passbook-file');
const {uploadTopUpProofFile} =require('../middleware/topup_proof_file');

//Add New user
route.post('/addNewMember',userController.addNewMember);
//Login user
route.post('/loginUser',userController.loginUser);
//Get all user
route.get('/getUsers',userController.getUsers);
//Get Inactive members
route.get('/getInactiveUsers',VerifyJwtToken,userController.getInactiveUsers);
//Get a particuler user
route.get('/getUser/:user_id',userController.getUser11);
//calculate refferal amount
route.post('/getReferralPayoutAmountOfInvestment',userController.getReferralPayoutAmountOfInvestment);

route.get('/getUserData/:user_id',userController.getUserData11);

//Edit user password
route.patch('/editUserPassword/:user_id',VerifyJwtToken,userController.editUserPassword);
//Edit user profile
route.put('/updateUserProfile/:user_id',userController.updateUserProfile);

//Upload file of PAN
route.patch('/addPanCardFile/:_id',VerifyJwtToken,uploadPanCardFile.single('file'),userController.addPanCardFile);
route.get('/downloadPanFile/:filename',userController.downloadPanFile);


//Upload file of Aadhar
route.patch('/addAadharCardFile/:_id',VerifyJwtToken,uploadAadharFile.single('file'),userController.addAadharCardFile);
route.get('/downloadAadharFile/:filename',userController.downloadAadharFile);

//Upload file of Bank Passbook
route.patch('/addBankPassbookFile/:_id',VerifyJwtToken,uploadBankPassbookFile.single('file'),userController.addBankPassbookFile);
route.get('/downloadBankPassbookFile/:filename',userController.downloadBankPassbookFile);


//Add TopUp
route.post('/addTopUp/:userId',VerifyJwtToken,uploadTopUpProofFile.single('file'),userController.addTopUp);
//Get TopUp of a particuler user
route.get('/getTopUp/:user_id',userController.getTopUp);

//Get top up for all user
route.get('/getAllUsersTopUp',userController.getAllUsersTopUp);
//Top up file download
route.get('/downloadTopupFile/:filename',userController.downloadTopupFile);






module.exports = route; 
