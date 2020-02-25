const moment = require('moment');
const uuidv4 = require('uuid/v4');
const db = require('../db');
const {
  isValidEmail,
  hashPassword,
  generateToken,
  comparePassword
} = require('../helpers/authHelper');

exports.create = async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ message: 'Some values are missing' });
  }
  if (!isValidEmail(req.body.email)) {
    return res
      .status(400)
      .send({ message: 'Please enter a valid email address' });
  }
  const hashedPassword = hashPassword(req.body.password);

  const createQuery = `INSERT INTO
      users(id, email, password, created_date, modified_date)
      VALUES($1, $2, $3, $4, $5)
      returning *`;
  const values = [
    uuidv4(),
    req.body.email,
    hashedPassword,
    moment(new Date()),
    moment(new Date())
  ];

  try {
    const { rows } = await db.query(createQuery, values);
    const token = generateToken(rows[0].id);
    return res.status(201).send({ token });
  } catch (error) {
    if (error.routine === '_bt_check_unique') {
      return res
        .status(400)
        .send({ message: 'User with that EMAIL already exists' });
    }
    return res.status(400).send(error);
  }
};

exports.login = async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ message: 'Some values are missing' });
  }
  if (!isValidEmail(req.body.email)) {
    return res
      .status(400)
      .send({ message: 'Please enter a valid email address' });
  }
  const text = 'SELECT * FROM users WHERE email = $1';
  try {
    const { rows } = await db.query(text, [req.body.email]);
    if (!rows[0]) {
      return res
        .status(400)
        .send({ message: 'The credentials you provided is incorrect' });
    }
    if (!comparePassword(req.body.password, rows[0].password)) {
      return res
        .status(400)
        .send({ message: 'The credentials you provided is incorrect' });
    }
    const token = generateToken(rows[0].id);
    return res.status(200).send({ token });
  } catch (error) {
    return res.status(400).send(error);
  }
};

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
