const express = require('express');

const { create, deleteUser, login } = require('../controllers/user.controller');

const router = express.Router();



module.exports = router;