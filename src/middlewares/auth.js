const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const db = require('../db');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../helpers/errorResponse');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 403));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.SECRET);
  const text = 'SELECT * FROM users WHERE id = $1';
  const { rows } = await db.query(text, [decoded.userId]);
  if (!rows[0]) {
    return next(new ErrorResponse('The token you provided is invalid', 400));
  }
  req.user = { id: decoded.userId };
  next();
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
