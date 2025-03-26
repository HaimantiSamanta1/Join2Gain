const router = require('express').Router();

const userRoutes = require('./app/user/user-router')
const adminRoutes = require('./app/admin/admin-router')

router.use('/user', userRoutes)
router.use('/admin',adminRoutes)


module.exports = router;
