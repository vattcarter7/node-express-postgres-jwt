const db = require('../db');
const ErrorResponse = require('../helpers/errorResponse');
const asyncHandler = require('../middlewares/async');

// @desc      Find all books
// @route     GET /api/v1/books
// @access    Public
exports.getAllBooks = asyncHandler(async (req, res, next) => {
  const textQuery = 'SELECT * FROM hb.book';
  const { rows } = await db.query(textQuery);
  if (!rows) {
    return next(new ErrorResponse('No books found', 404));
  }
  const books = rows;
  res.status(200).json({
    success: true,
    books
  });
});

// @desc      Get single book by id
// @route     GET /api/v1/books/:id
// @access    Public
exports.getBook = asyncHandler(async (req, res, next) => {
  const textQuery = `SELECT * FROM hb.book WHERE id = $1`;
  const { rows } = await db.query(textQuery, [req.params.id]);
  if (!rows[0]) return next(new ErrorResponse('No book found', 404));
  const book = rows[0];
  res.status(200).json({
    success: true,
    book
  });
});

// @desc      Add OR UPDATE book
// @route     POST /api/v1/book/
// @access    Private / admin
//TODO implement admin route to create or update the book by google id
exports.createOrUpdateBookByGoogleId = asyncHandler(async (req, res, next) => {
  const sql = `SELECT * FROM hb.create_book($1, $2, $3, $4, $5, $6)`;
  const params = [
    req.body.googleBookId, // real google book id   POOJDQAAQBAJ
    req.body.title,
    req.body.subtitle,
    req.body.description,
    req.body.author,
    req.body.pageCount
  ];

  const result = await db.query(sql, params);

  if (!result.rows[0])
    return next(new ErrorResponse('unable to create or update a book', 400));
  res.status(201).json({
    success: true,
    book: result.rows[0]
  })
});
