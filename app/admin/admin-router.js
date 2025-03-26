const express = require('express')
const route = express.Router()

const adminController = require('./admin-controller');
const VerifyJwtToken = require('../../app/jwt/verifyAccessToken');

//Register new user
route.post('/addUser',adminController.addUser);


module.exports = route; 