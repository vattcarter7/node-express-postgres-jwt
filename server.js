// server.js
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');

const reflection = require('./src/controllers/reflection.controller');
const userController = require('./src/controllers/user.controller');
const { protect } = require('./src/middlewares/auth');

dotenv.config();

const app = express();

// Body parser
app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  return res
    .status(200)
    .send({ message: ' congrats - your first endpoint is working '});
});

app.post('/api/v1/reflections', protect, reflection.create);
app.get('/api/v1/reflections', protect, reflection.getAll);
app.get('/api/v1/reflections/:id', protect, reflection.getOne);
app.put('/api/v1/reflections/:id', protect, reflection.update);
app.delete('/api/v1/reflections/:id', protect, reflection.delete);
app.post('/api/v1/users', userController.create);
app.post('/api/v1/users/login', userController.login);
app.delete('/api/v1/users/me', protect, userController.deleteUser);

const PORT = process.env.PORT || 3000;

app.listen(PORT, err => {
  if (err) throw err;
  console.log(`App listening on port ${PORT}`);
});
