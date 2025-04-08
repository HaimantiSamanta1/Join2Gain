let queryService = require('../services/guest-query-service')

//Add query START
exports.addQueries = async (req, res) => {
    try {
        let {name,mail,phone,message} = req.body;
        let data ={
            guest_name:name,
            guest_mail:mail,
            guest_phone_no:phone,
            guest_message:message
        }
        let guest = await queryService.addQueriesData(data);
        res.status(200).json({message:'Message submitted successfully!',guest})
        
    } catch (error) {
        console.error('err',error.message);
        return res.status(500).json({Status: false,message: 'Internal Server Error',error: error.message});
    }    
}
//Add query END

//Get all query info START
exports.getAllQueries = async (req,res) => {
    try {
        let queries = await queryService.getAllQueriesDetails();
        res.status(200).json({Status:true,message:'Get all queries successful!',queries})
    } catch (error) {
        console.log('err',error.message);
        return res.status(500).json({Status: false,message:'Internal Server Error',error:error.message});
    }    
}
//Get all query info END