const queries = require('../other/guest-query-model');

class queryServie {

//Add guest message START
async addQueriesData(data) {
    try {
        return queries.create(data);
    } catch (error) {
        console.log('Create Querirs data info',error);
        throw error
    }    
}
//Add guest message END

//Get all guest message info START
async getAllQueriesDetails() {
    try {
        return await queries.find().sort({ createdAt: -1 });
      } catch (err) {
        console.log('Fetch users service', err);
        throw err;
      }
}
//Get all guest message info END

}
module.exports = new queryServie();