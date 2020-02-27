const moment = require('moment');
const uuidv4 = require('uuid/v4');
const db = require('../db');
const {
  isValidEmail,
  hashPassword,
  generateSignedJwtToken,
  comparePassword,
  isValidName,
  isStrongPassword
} = require('../helpers/authHelper');

const ErrorResponse = require('../helpers/errorResponse');
const asyncHandler = require('../middlewares/async');

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateSignedJwtToken(user.id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  user.password = undefined;

  res
    .status(statusCode)
    .cookie('auth_jwt', token, cookieOptions)
    .json({
      success: true,
      token,
      user
    });
};

// @desc      Register user
// @route     POST /api/v1/auth/register
// @access    Public
exports.register = async (req, res, next) => {
  if (!req.body.name || !req.body.email || !req.body.password) {
    return next(new ErrorResponse('Some values are missing', 400));
  }
  if (!isValidName(req.body.name.trim()))
    return next(new ErrorResponse('Please enter a valid name', 400));
  if (!isValidEmail(req.body.email.trim()))
    return next(new ErrorResponse('Please enter a valid email address', 400));

  if (!isStrongPassword(req.body.password))
    return next(
      new ErrorResponse('Please enter at least 8 characters of password', 400)
    );
  const hashedPassword = hashPassword(req.body.password);

  const createQuery = `INSERT INTO
      users(id, name, email, password, created_date, modified_date)
      VALUES($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      returning *`;
  const values = [
    uuidv4(),
    req.body.name.trim(),
    req.body.email.trim(),
    hashedPassword,
    moment(new Date()),
    moment(new Date())
  ];

  const { rows } = await db.query(createQuery, values);
  if (!rows[0]) {
    return next(new ErrorResponse('Cannot register with this email', 400));
  }

  const user = rows[0];

  sendTokenResponse(user, 201, res);
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
  if (!(await comparePassword(req.body.password, rows[0].password))) {
    return next(
      new ErrorResponse('The credentials you provided is incorrect', 400)
    );
  }

  const user = rows[0];

  sendTokenResponse(user, 200, res);
});

// @desc      Log user out / clear cookie
// @route     GET /api/v1/auth/logout
// @access    Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('auth_jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // expires in 10 seconds
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    user: {}
  });
});

// @desc      GET my profile
// @route     GET /api/v1/auth/me
// @access    Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const text = 'SELECT * FROM users WHERE id = $1';
  const { rows } = await db.query(text, [req.user.id]);
  if (!rows[0]) return next(new ErrorResponse('No user found', 401));
  const user = rows[0];
  user.password = undefined;
  res.status(200).json({
    success: true,
    user
  });
});

// @desc      Update user datails
// @route     PUT /api/v1/auth/updatedetails
// @access    Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const id = req.user.id;
  const name = req.body.name ? req.body.name : req.user.name;
  const email = req.body.email ? req.body.email : req.user.email;

  if (!isValidName(name.trim()))
    return next(new ErrorResponse('Invalid name', 403));
  if (!isValidEmail(email.trim()))
    return next(new ErrorResponse('Invalid email', 403));

  const updateQuery = `UPDATE users SET name = $1, email = $2 WHERE id = $3 returning *`;

  const { rows } = await db.query(updateQuery, [name.trim(), email.trim(), id]);

  if (!rows[0]) return next(new ErrorResponse('Error updating info', 401));
  const user = rows[0];
  user.password = undefined;

  res.status(200).json({
    success: true,
    user
  });
});

// @desc      Update password
// @route     PUT /api/v1/auth/updatedetails
// @access    Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const textQuery = `SELECT * FROM users WHERE id = $1`;
  const { rows } = await db.query(textQuery, [req.user.id]);
  if (!rows[0]) {
    return next(new ErrorResponse('Error updating password', 400));
  }
  if (!(await comparePassword(req.body.currentPassword, rows[0].password))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  if (!isStrongPassword(req.body.newPassword)) {
    return next(new ErrorResponse('Password is at least 8 characters', 403));
  }

  const newHashedPassword = hashPassword(req.body.newPassword);

  const updateQuery = `UPDATE users SET password = $1 WHERE id = $2 returning *`;

  const response = await db.query(updateQuery, [
    newHashedPassword,
    req.user.id
  ]);

  if (!response.rows[0])
    return next(new ErrorResponse('Error updating user', 400));

  const user = response.rows[0];
  sendTokenResponse(user, 200, res);
});
