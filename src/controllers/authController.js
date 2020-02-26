const moment = require('moment');
const uuidv4 = require('uuid/v4');
const db = require('../db');
const {
  isValidEmail,
  hashPassword,
  generateSignedJwtToken,
  comparePassword
} = require('../helpers/authHelper');

const ErrorResponse = require('../helpers/errorResponse');
const asyncHandler = require('../middlewares/async');

const sendTokenResponse = (rows, statusCode, res) => {
  const token = generateSignedJwtToken(rows[0].id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  rows[0].password = undefined;

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      data: {
        rows
      }
    });
};

// @desc      Register user
// @route     POST /api/v1/auth/register
// @access    Public
exports.register = async (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    return next(new ErrorResponse('Some values are missing', 400));
  }
  if (!isValidEmail(req.body.email)) {
    return next(new ErrorResponse('Please enter a valid email address', 400));
  }
  const hashedPassword = hashPassword(req.body.password);

  const createQuery = `INSERT INTO
      users(id, email, password, created_date, modified_date)
      VALUES($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
      returning *`;
  const values = [
    uuidv4(),
    req.body.email,
    hashedPassword,
    moment(new Date()),
    moment(new Date())
  ];

  const { rows } = await db.query(createQuery, values);
  if (!rows[0]) {
    return next(new ErrorResponse('Cannot register with this email', 400));
  }

  sendTokenResponse(rows, 201, res);
};

// @desc      Login user
// @route     POST /api/v1/auth/login
// @access    Public
exports.login = asyncHandler(async (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    return next(new ErrorResponse('Please provide email and password!', 400));
  }
  if (!isValidEmail(req.body.email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }
  const text = 'SELECT * FROM users WHERE email = $1';
  const { rows } = await db.query(text, [req.body.email]);
  if (!rows[0]) {
    return next(
      new ErrorResponse('The credentials you provided is incorrect', 400)
    );
  }
  if (!comparePassword(req.body.password, rows[0].password)) {
    return next(
      new ErrorResponse('The credentials you provided is incorrect', 400)
    );
  }

  sendTokenResponse(rows, 200, res);
});

// @desc      Log user out / clear cookie
// @route     GET /api/v1/auth/logout
// @access    Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  })
});