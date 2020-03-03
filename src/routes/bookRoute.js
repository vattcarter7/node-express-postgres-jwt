const express = require('express');

const { getAllBooks, getBook,createOrUpdateBookByGoogleId } = require('../controllers/bookController');

const router = express.Router();

const { protect } = require('../middlewares/auth');

router.route('/').get(getAllBooks).put(createOrUpdateBookByGoogleId);

router.route('/:id').get(getBook);

module.exports = router;
