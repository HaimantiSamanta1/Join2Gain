const admins = require('../admin/admin-model');
//const tokenService = require('./jwt-service');

class adminServie {

    //Find a particuler user account by email START
    async findAdminAccount(email_id) {
        try {
        const data = await admins.findOne({ email_id: email_id })
            if (data) {
                return data;
            }
            else {
                return false;
            }
        } catch (err) {
        console.log('service error', err);
        throw err
        }
    }
    //Find a particuler user account by email END  

    // // Create admin account SRART
    // async createAdminAccount(data) {
    //     try {
    //     return await admins.create(data);
    //     } catch (err) {
    //     console.log('create service ', err);
    //     throw err
    //     }
    // }
    // //Create admin account END

    

}

module.exports = new adminServie();