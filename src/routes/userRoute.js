const express = require('express');

const { create, deleteUser, login } = require('../controllers/userController');

const router = express.Router();



module.exports = router;