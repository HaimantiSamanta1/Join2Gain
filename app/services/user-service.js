const users = require('../user/user-model');
const tokenService = require('./jwt-service');

class userServie {

//Find a particuler user account by email START
  async findAccount(user_profile_id) {
    try {
      const data = await users.findOne({ user_profile_id: user_profile_id })
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

// Create user account SRART
  async createAccount(data) {
    try {
      return await users.create(data);
    } catch (err) {
      console.log('create service ', err);
      throw err
    }
  }
//Create user account END


//Read all user information START
  async getUserDetails() {
    try {
      const result = await users.find().sort({ createdAt: -1 })
      return { Status: true, data: result }
    } catch (err) {
      console.log('getprofile service err', err);
      throw new Error()
    }
  }
//Read all user information END


//find and delete user account START
  async findAndDeleteUserAccount(id) {
    try {
      return await users.findByIdAndDelete(id, { $set: { active: false } }, { new: true })
    } catch (err) {
      throw err
    }
  }
//find and delete user account END

async finduserAccountdetails(token) {
  try {
    const decodedToken = tokenService.verifyAccessToken(token);

    if (!decodedToken || !decodedToken.user_id) {
      throw new Error('Invalid token');
    }

    const user = await users.findById(decodedToken.user_id)
      .populate({
        path: 'tokens',
        model: 'Refresh',
        select:'-createdAt -updatedAt -tokens -usermasters -password -__v'
      })
      .select('-createdAt -updatedAt -tokens -password -__v') 
      .exec();

    return user;
  } catch (err) {
    console.log('service error', err);
    throw err;
  }
}

//Read all user information START
async getAllUserDetails() {
  try {
  const result = await users.find().sort({ createdAt: -1 })
  return { Status: true, data: result }
  } catch (err) {
  console.log('Get task service err', err);
  throw new Error()
  }
}
//Read all user information END

//Read a user information END
async findAndGetUserAccount(user_id) {
  try {
  const result = await users.findById(user_id)
  return { Status: true, data: result }
  } catch (err) {
  console.log('Get task service err', err);
  throw new Error()
  }
}
//Read a user information END

//Update task SRART
async updateUserInfo(id,data) {
  try {
    let result = await users.findByIdAndUpdate(id,{$set:data},{new:true})
      return {Status:true,result}
    } catch (err) {
      console.log('Update service ', err);
      throw err
    }
}
//Update task END

}

module.exports = new userServie();