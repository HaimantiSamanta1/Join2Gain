const express = require('express')
const route = express.Router()

const userController = require('./user-controller');
const VerifyJwtToken = require('../../app/jwt/verifyAccessToken');

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

module.exports = route; 
