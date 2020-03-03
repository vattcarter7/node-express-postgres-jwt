const express = require('express');

const {
  getAllBooks,
  getBook,
  createBookByGoogleId
} = require('../controllers/bookController');

const router = express.Router();

const { protect } = require('../middlewares/auth');

router
  .route('/')
  .get(getAllBooks)
  .put(createBookByGoogleId);

router.route('/:id').get(getBook);

module.exports = router;
