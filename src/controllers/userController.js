const moment = require('moment');
const uuidv4 = require('uuid/v4');
const db = require('../db');
const {
  isValidEmail,
  hashPassword,
  generateToken,
  comparePassword
} = require('../helpers/authHelper');

// @desc      GET single user
// @route     GET /api/v1/users/:id
// @access    Private/Admin
exports.getUser = async (req, res, next) => {};

// @desc      CREATE user
// @route     POST /api/v1/users
// @access    Private/Admin
exports.createUser = async (req, res, next) => {};

// @desc      UPDATE single user
// @route     PUT /api/v1/users/:id
// @access    Private/Admin
exports.updateUser = async (req, res, next) => {};

// @desc      DELETE single user
// @route     PUT /api/v1/users/:id
// @access    Private/Admin
exports.deleteUser = async (req, res) => {
  const deleteQuery = 'DELETE FROM users WHERE id=$1 returning *';
  try {
    const { rows } = await db.query(deleteQuery, [req.user.id]);
    if (!rows[0]) {
      return res.status(404).send({ message: 'user not found' });
    }
    return res.status(204).send({ message: 'deleted' });
  } catch (error) {
    return res.status(400).send(error);
  }
};
