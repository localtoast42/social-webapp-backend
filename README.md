# Social Media Project - Backend

A basic social media webapp for writing and sharing text posts. Built for the final project in The Odin Project NodeJS course.

The website is comprised of a frontend application built with React & Vite, which interacts via REST API with a backend application built with Express. The frontend is hosted on Netlify, backed is hosted on Fly.io.

**Link to project demo:** https://epeaco-microblog.netlify.app

**Link to frontend repo:** https://github.com/localtoast42/social-webapp-frontend

## Built with

- Frontend:
  - React
  - Vite
  - React Router
  - TailwindCSS
  - TailwindUI
- Backend:
  - TypeScript
  - NodeJS
  - Express
  - Prisma ORM
  - PostgreSQL

## How to use

### Accounts

When accessing the site for the first time, you can choose to register a new account or login with a guest account. Guest accounts are intended as a way of allowing users to quickly preview the webapp's features without needing to register. Guest accounts can create and modify posts and comments, but these won't be visible to other users.

### Feeds

On the home page, the user is presented with a feed of posts. The "Recent" feed shows the 10 most recent posts from all users on the platform. The "Following" feed shows posts from accounts that you follow, in order of newest to oldest posts.

### Interaction

From the home page or the user's profile page, the user can create a new post by clicking the "Create a new post" button, entering the post contents and submitting. If the user is not a guest account, this post will then be visible site-wide on the "Recent" feed, visible to followers of the user on their "Following" feeds, and visible to anyone on the user's profile page.

The user can add a comment to a post by selecting the post, then clicking the "Add a comment" button in the post's comment section.

Users can like posts and comments by clicking the heart icon shown on the bottom of a post or comment. The number of likes and comments is displayed on a post next to their respective icons.
