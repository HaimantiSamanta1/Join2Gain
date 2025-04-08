const router = require('express').Router();

const userRoutes = require('./app/user/user-router')
const adminRoutes = require('./app/admin/admin-router')
//const paymentRoute = require('./app/payment/payment-router')

const queryRoute = require('./app/other/guest-query-router')

router.use('/user', userRoutes);
router.use('/admin',adminRoutes);
//router.use('/payment',paymentRoute)
router.use('/query',queryRoute);

module.exports = router;
