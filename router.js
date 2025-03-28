const router = require('express').Router();

const userRoutes = require('./app/user/user-router')
const adminRoutes = require('./app/admin/admin-router')
const paymentRoute = require('./app/payment/payment-router')

router.use('/user', userRoutes)
router.use('/admin',adminRoutes)
router.use('/payment',paymentRoute)

module.exports = router;
