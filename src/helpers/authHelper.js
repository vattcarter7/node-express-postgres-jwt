const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.hashPassword = password => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

exports.comparePassword = (password, hashPassword) => {
  return bcrypt.compareSync(password, hashPassword);
};

exports.isValidEmail = email => {
  return /\S+@\S+\.\S+/.test(email);
};

exports.generateSignedJwtToken = id => {
  const token = jwt.sign(
    {
      userId: id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
  return token;
};

