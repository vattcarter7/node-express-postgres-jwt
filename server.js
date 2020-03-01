const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const errorHandler = require('./src/helpers/error');

// load env variables
dotenv.config();

const app = express();

// Route files
const auth = require('./src/routes/authRoute');
const users = require('./src/routes/userRoute');

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  return res
    .status(200)
    .send({ message: ' congrats - your first endpoint is working ' });
});

// Mount routers
app.use('/api/v1/auth', auth);
app.use('/api/v1/user', users);

app.use(errorHandler);



const PORT = process.env.PORT || 3000;

app.listen(PORT, err => {
  if (err) throw err;
  console.log(`App listening on port ${PORT}`.yellow.bold);
});
