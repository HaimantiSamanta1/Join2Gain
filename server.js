const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const dbconnection = require('./config/db'); 

const cors = require('cors');
const corsOptions = {    
    origin: ['http://localhost:3000','http://192.168.195.250:3000', '*'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
  };

const app = express();
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({limit: '70mb', extended: true, parameterLimit: 1000000}));


//Config
dotenv.config();

//Connect Database
dbconnection()

const router = require('./router');
app.use( '/api', router );


app.get('/', (req, res) => {
    res.json({"message": "This is for testing"});
});

const PORT = process.env.PORT || 4006
const server = app.listen(PORT, () => {
    console.log(`Server Running on http://localhost:${PORT}`)
    //console.log(`Server Running on https://apps.cihsr.ac.in/pmbackend:${PORT}`)
});

process.on("unhandledRejection", (err) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting Down Server due to Unhandled Promise Rejection`);

    server.close(() => {
        process.exit(1);
    })
})