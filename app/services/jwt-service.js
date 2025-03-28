var jwt = require('jsonwebtoken');
const Refresh = require('../jwt/refresh-model')
const accessTokenSecret = process.env.JWT_ACCESS_TOKEN_SECRET;
//const refresTokenSecret = process.env.JWT_REFRESh_TOKEN_SECRET;


class JwtService{
    //Generate Token START
    generateJwtToken(payload){
        const Authorization  = jwt.sign(payload,accessTokenSecret)
        return Authorization
    }
    //Generate Token END

    //Store Refresh Token START
    async storeRefreshToken(refreshToken,user_id){
        try{
            await Refresh.create({
                token:refreshToken,
                user_id:user_id
            })
        }catch(err){
            console.log('storerefresherr',err);
            throw err
        }
    }

    // async storeRefreshToken1(refreshToken, identifier, isAdmin = false) {
    //     try {
    //         const data = isAdmin ? { token: refreshToken, admin_id: identifier } : { token: refreshToken, user_id: identifier };
    //         await Refresh.create(data);
    //     } catch (err) {
    //         console.log('storerefresherr', err);
    //         throw err;
    //     }
    // }
    
    
    //Store Refresh Token END

    //Verify AccessToken START
    verifyAccessToken(token){
        return jwt.verify(token,accessTokenSecret);   
    }
    //Verify AccessToken END 

    //Update Refresh Token START    
    async updateRefreshToken(user_id, newRefreshToken){
        try{
          //  await Refresh.findOneAndUpdate({user_id:user_id},{$set:{token:token}})
          await Refresh.findOneAndUpdate(
            { user_id: user_id },
            { $set: { token: newRefreshToken } }
        );
        
        }catch(err){
            console.log('updaterefreshtoken err',err);
            throw err
        }
    }
    //Update Refresh Token END

}

module.exports = new JwtService()
