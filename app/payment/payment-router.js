const express = require('express');
const payment_route = express();

const bodyParser = require('body-parser');
payment_route.use(bodyParser.json());
payment_route.use(bodyParser.urlencoded({ extended:false }));

const path = require('path');

payment_route.set('view engine','ejs');
payment_route.set('views',path.join(__dirname, '../views'));

const paymentController = require('../payment/payment-controller');

payment_route.get('/page', paymentController.renderProductPage);
payment_route.post('/createOrder', paymentController.createOrder);
payment_route.post('/capturePayment', paymentController.capturePayment);
payment_route.get('/capture', paymentController.renderCapturePage);


module.exports = payment_route;