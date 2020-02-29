const moment = require('moment');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const db = require('../db');
const {
  isValidEmail,
  hashPassword,
  generateSignedJwtToken,
  comparePassword,
  isValidName,
  isStrongPassword
} = require('../helpers/authHelper');

const { covertJavascriptToPosgresTimestamp } = require('../helpers/timeUtil');

const ErrorResponse = require('../helpers/errorResponse');
const sendEmail = require('../helpers/email');
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
  user.password_reset_token = undefined;
  user.password_reset_expires = undefined;

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
      VALUES($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
      ON CONFLICT (email) DO NOTHING
      returning *`;
  const values = [
    uuidv4(),
    req.body.name.trim().toLowerCase(),
    req.body.email.trim().toLowerCase(),
    hashedPassword,
    covertJavascriptToPosgresTimestamp(Date.now()),
    covertJavascriptToPosgresTimestamp(Date.now())
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
  if (!isValidEmail(req.body.email.trim())) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }
  const text = 'SELECT * FROM users WHERE email = $1';
  const { rows } = await db.query(text, [req.body.email.trim().toLowerCase()]);
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
  console.log(Date.now());
  const text = 'SELECT * FROM users WHERE id = $1';
  const { rows } = await db.query(text, [req.user.id]);
  if (!rows[0]) return next(new ErrorResponse('No user found', 401));
  const user = rows[0];
  user.password = undefined;
  user.password_reset_token = undefined;
  user.password_reset_expires = undefined;
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
  sendTokenResponse(user, 200, res);
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

// @desc      Forgot password
// @route     POST /api/v1/auth/forgotpassword
// @access    Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  // get user based on POSTed email
  const textQuery = `SELECT * FROM users WHERE email = $1`;
  if (
    req.body.email.trim().length < 1 ||
    !isValidEmail(req.body.email.trim())
  ) {
    return next(new ErrorResponse('Please provide a valid email'));
  }
  const { rows } = await db.query(textQuery, [
    req.body.email.trim().toLowerCase()
  ]);
  if (!rows[0]) {
    return next(
      new ErrorResponse(
        `There is no user with this email address: ${req.body.email
          .trim()
          .toLowerCase()}`,
        404
      )
    );
  }

  // create password reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // set password reset expires in 10 minutes - javascript time
  const passwordResetExpires = Date.now() + 10 * 60 * 1000; // expires in 10 minutes

  let updateQuery = `UPDATE users SET password_reset_token = $1, password_reset_expires = to_timestamp($2) WHERE email = $3 returning *`;

  const response = await db.query(updateQuery, [
    passwordResetToken,
    passwordResetExpires / 1000,
    rows[0].email
  ]);

  if (!response.rows[0]) {
    return next(new ErrorResponse('Unable to insert passwordResetToken', 400));
  }

  // send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetpassword/${resetToken}`;

  const message = `Forgot your password? Submit a request with your new password and passwordConfirm to: ${resetURL} \nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: response.rows[0].email,
      subject: 'Password reset token',
      message
    });
    return res.status(200).json({
      success: true,
      email: response.rows[0].email,
      msg: 'Email sent'
    });
  } catch (err) {
    await db.query(updateQuery, [undefined, undefined, response.rows[0].email]);
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc      Reset password
// @route     PUT /api/v1/auth/resetpassword/:token
// @access    Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  // find user with a valid token
  const textQuery = `SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > to_timestamp($2)`;
  const { rows } = await db.query(textQuery, [
    resetPasswordToken,
    covertJavascriptToPosgresTimestamp(Date.now())
  ]);

  if (!rows[0]) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  // set a new password
  if (!isStrongPassword(req.body.newPassword)) {
    return next(
      new ErrorResponse(
        'provide a new password with at least 8 characters',
        400
      )
    );
  }

  const newHashedPassword = hashPassword(req.body.newPassword);

  // save the new password and set the password_reset_token
  // and set password_reset_expires to undefined
  const updateQuery = `UPDATE users SET password = $1, password_reset_token = $2, password_reset_expires = $3 WHERE id = $4 returning *`;
  try {
    const response = await db.query(updateQuery, [
      newHashedPassword,
      undefined,
      undefined,
      rows[0].id
    ]);
    if (!response.rows[0]) {
      return next(new ErrorResponse('Unable to reset new password', 400));
    }
    const user = response.rows[0];

    user.password = undefined;
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;

    sendTokenResponse(user, 200, res);
  } catch (err) {
    return next(new ErrorResponse('Unable to reset new password', 500));
  }
});
