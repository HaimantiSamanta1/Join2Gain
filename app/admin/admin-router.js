const express = require('express')
const route = express.Router()

const adminController = require('./admin-controller');
const VerifyJwtToken = require('../../app/jwt/verifyAccessToken');

// //Register new admin
// route.post('/addAdmin',adminController.adminRegistration);

//Login user
route.post('/loginAdmin',adminController.loginAdmin);

//Register new user
route.post('/addUser',adminController.addUser);

//edit admin Password 
route.patch('/editAdminPassword/:admin_id',adminController.editAdminPassword);

//kyc Approved or Rejected
route.post('/kycApprovedRejected/:investmentId',adminController.kycApprovedRejected);

//withdrow Approved or Rejected
route.post('/withdrowApprovedRejected/',adminController.withdrowApprovedRejected);



module.exports = route; 