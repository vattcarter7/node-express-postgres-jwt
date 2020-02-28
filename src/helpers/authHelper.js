const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const crypto = require('crypto');

exports.hashPassword = password => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

exports.comparePassword = async (password, hashPassword) => {
  return await bcrypt.compare(password, hashPassword);
};

exports.isValidEmail = email => {
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)
};

exports.isValidName = name => {
  return name.length > 1;
}

exports.isStrongPassword = password => {
  return password.length > 7;
}

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


