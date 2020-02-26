const jwt = require('jsonwebtoken');
const db = require('../db');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../helpers/errorResponse');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.auth_jwt && req.cookies.auth_jwt !== 'loggedout') {
    // Set token from cookie
    token = req.cookies.auth_jwt;
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 403));
  }

  try {
    // verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const queryText = 'SELECT * FROM users WHERE id = $1';
    const { rows } = await db.query(queryText, [decoded.userId]);
    if (!rows[0]) {
      return next(new ErrorResponse('Not authorized to access this route', 403));
    }

    // GRAND ACCESS TO PROTECTED ROUTE
    req.user = {
      id: decoded.userId,
      email: rows[0].email,
      user_role: rows[0].user_role
    };
    res.locals.user = req.user;
    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 403))
  }
});

// Grand access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.user_role)) {
      return next(
        new ErrorResponse(
          `User role ${req.params.user_role} is not authorized to this route`,
          403
        )
      );
    }
    next();
  };
};
