const axios = require('axios');
const { map, groupBy, pathOr } = require('ramda');

const db = require('../db');
const ErrorResponse = require('./errorResponse');
const asyncHandler = require('../middlewares/async');

exports.searchBook = query =>
  asyncHandler(
    asyncHandler(async (req, res, next) => {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query
      )}`;
      try {
        const result = await axios(url);
        const items = pathOr([], ['data', 'items', result]);
        const books = map(book => ({ id: book.id, ...book.volumeInfo }), items);
        return books;
      } catch (err) {
        console.log(err);
        throw err;
      }
    })
  );

exports.findBookByGoogleId = asyncHandler(async (req, res, next) => {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes/${googleBookId}`;
    const result = await axios(url);
    const book = pathOr({}, ['data', result]);
    return { ...book, ...book.volumeInfo };
  } catch (err) {
    console.log(err);
    throw err;
  }
});
