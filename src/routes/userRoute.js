const express = require('express');

const { getUser, createUser, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();



module.exports = router;