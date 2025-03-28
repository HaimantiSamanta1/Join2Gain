// const Razorpay = require('razorpay'); 

// const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

// const razorpayInstance = new Razorpay({
//     key_id: RAZORPAY_ID_KEY,
//     key_secret: RAZORPAY_SECRET_KEY
// });

// const renderProductPage = async(req,res)=>{
//     try {        
//         res.render('product');
//     } catch (error) {
//         console.log(error.message);
//     }
// }

// const createOrder = async(req,res)=>{
//     try {
//         const amount = req.body.amount*100
//         const options = {
//             amount: amount,
//             currency: 'INR',
//             receipt: 'razorUser@gmail.com'
//         }

//         razorpayInstance.orders.create(options, 
//             (err, order)=>{
//                 if(!err){
//                     res.status(200).send({
//                         success:true,
//                         msg:'Order Created',
//                         order_id:order.id,
//                         amount:amount,
//                         key_id:RAZORPAY_ID_KEY,
//                         product_name:req.body.name,
//                         description:req.body.description,
//                         contact:"8567345632",
//                         name: "Sandeep Sharma",
//                         email: "sandeep@gmail.com"
//                     });
//                 }
//                 else{
//                     res.status(400).send({success:false,msg:'Something went wrong!'});
//                 }
//             }
//         );

//     } catch (error) {
//         console.log(error.message);
//     }
// }

// // Capture Payment
// const capturePayment = async (req, res) => {
//     try {
//         const { payment_id, amount } = req.body;
//         const captureAmount = amount * 100; // Convert to paise

//         const captureUrl = `https://api.razorpay.com/v1/payments/${payment_id}/capture`;
//         const auth = Buffer.from(`${process.env.RAZORPAY_ID_KEY}:${process.env.RAZORPAY_SECRET_KEY}`).toString('base64');

//         const response = await fetch(captureUrl, {
//             method: "POST",
//             headers: {
//                 "Authorization": `Basic ${auth}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 amount: captureAmount,
//                 currency: "INR"
//             })
//         });

//         const data = await response.json();
//         console.log("Razorpay Capture Response:", data);

//         if (data.status === "captured") {
//             res.status(200).json({ success: true, message: "Payment Captured Successfully", data });
//         } else {
//             res.status(400).json({ success: false, message: "Payment Capture Failed", data });
//         }

//     } catch (error) {
//         console.error("Payment Capture Error:", error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// };

// module.exports = {
//     renderProductPage,
//     createOrder,
//     capturePayment
// }


const Razorpay = require('razorpay');
const dotenv = require('dotenv');
dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

exports.renderProductPage = (req, res) => {
    res.render('product');
};

exports.createOrder = async (req, res) => {
    try {
        const amount = parseInt(req.body.amount) * 100; // Convert to paise
        const options = {
            amount: amount,
            currency: "INR",
            receipt: "order_rcptid_" + Date.now()
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            key_id: process.env.RAZORPAY_KEY_ID,
            amount: amount,
            currency: "INR",
            order_id: order.id,
            product_name: req.body.name,
            description: req.body.description,
            contact: "9876543210",
            email: "test@example.com"
        });

    } catch (error) {
        res.status(500).json({ success: false, msg: "Order creation failed", error: error.message });
    }
};

exports.capturePayment = async (req, res) => {
    try {
        const { payment_id, amount } = req.body;
        const payment_capture = 1;

        const options = {
            amount: amount,
            currency: "INR"
        };

        const response = await razorpay.payments.capture(payment_id, options.amount, options.currency);
        res.json({ success: true, msg: "Payment Captured Successfully", data: response });

    } catch (error) {
        res.status(500).json({ success: false, msg: "Payment Capture Failed", error: error.message });
    }
};

exports.renderCapturePage = (req, res) => {
    res.render("capture", {
        payment_id: req.query.payment_id,
        amount: req.query.amount / 100, // Convert back to rupees
    });
};
