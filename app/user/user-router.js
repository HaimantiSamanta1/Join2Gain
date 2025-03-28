const express = require('express')
const route = express.Router()

const userController = require('./user-controller');
const VerifyJwtToken = require('../../app/jwt/verifyAccessToken');

const {uploadPanCardFile} =require('../middleware/pan-file');
const {uploadAadharFile} =require('../middleware/aadher-file');
const {uploadBankPassbookFile} =require('../middleware/bank-passbook-file');

//Add New user
route.post('/addNewMember',userController.addNewMember);
//Login user
route.post('/loginUser',userController.loginUser);
//Get all user
route.get('/getUsers',VerifyJwtToken,userController.getUsers);
//Get a particuler user
route.get('/getUser/:user_id',VerifyJwtToken,userController.getUser);
//Edit user password
route.patch('/editUserPassword/:user_id',VerifyJwtToken,userController.editUserPassword);
//Edit user profile
route.put('/updateUserProfile/:user_id',VerifyJwtToken,userController.updateUserProfile);

//Upload file of PAN
route.patch('/addPanCardFile/:_id',uploadPanCardFile.single('file'),userController.addPanCardFile);
route.get('/downloadPanFile/:filename',userController.downloadPanFile);


//Upload file of Aadhar
route.patch('/addAadharCardFile/:_id',uploadAadharFile.single('file'),userController.addAadharCardFile);
route.get('/downloadAadharFile/:filename',userController.downloadAadharFile);

//Upload file of Bank Passbook
route.patch('/addBankPassbookFile/:_id',uploadBankPassbookFile.single('file'),userController.addBankPassbookFile);
route.get('/downloadBankPassbookFile/:filename',userController.downloadBankPassbookFile);

module.exports = route; 
