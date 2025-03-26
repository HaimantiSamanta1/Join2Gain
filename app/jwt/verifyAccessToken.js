
const tokenService = require('../services/jwt-service')
const Refresh = require('./refresh-model') //RefreshModel for Token

const VerifyJwtToken = async(req,res,next)=>{
    try{

        const accessToken = req.headers['authorization'].split(' ')[1]
        console.log('Received token:', accessToken);
        if(!accessToken){
            console.log("accessToken",accessToken);
            throw new Error();
        }
        let account = await Refresh.findOne({token:accessToken})
        //console.log("account",account);
        if(!account){
            return res.status(401).json({Status:false,message:'You are Logout Please Login !'})
        }else{
            const userData = tokenService.verifyAccessToken(accessToken)
           // console.log(userData);   

            if(!userData){
                throw new Error();
            }else{
                if(userData.LoggedIn===true)
                {
                   
                    req.userData = userData
                    console.log('User data:', req.userData);
                    next()
                }else{
                    return res.status(401).json({Status:false,message:'You are Logout Please Login'})
                }
            }
        }
    }catch(err){
        if (err.message === 'jwt expired') {
	    console.log(err.message)
            return res.status(408).json({Status:false,message:'Token expired'})
        }
        return res.status(401).json({message:'Invalid token'})
    }
}

module.exports = VerifyJwtToken
