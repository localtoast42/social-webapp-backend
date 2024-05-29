import express from 'express';
import passport from 'passport';
import usersRouter from './users.js';
import postsRouter from './posts.js';

const indexRouter = express.Router();

indexRouter.post('/login', passport.authenticate('local'));
indexRouter.post('/logout', (req, res) => {
  req.logOut();
  res.status(200).end();
});

indexRouter.use('/users', usersRouter)
indexRouter.use('/posts', postsRouter)

export default indexRouter;
