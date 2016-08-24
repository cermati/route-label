[![Build Status](https://travis-ci.org/cermati/route-label.svg)](https://travis-ci.org/cermati/route-label)
[![npm version](https://badge.fury.io/js/route-label.svg)](https://badge.fury.io/js/route-label)

# What

Register your route as natural as Express' way, PLUS adding name/label to it.
Then you can generate URL by calling `urlFor`.

# Example

Either:
```js
// In index.js
router.get('user.detail', '/users/:id', userDetailController);
router.post('user.edit', '/users/:id/edit', userEditController);

router.get('article.list', '/articles', articleListController);
router.get('article.detail', '/articles/:title', articleDetailController);
```

or:
```js
// In index.js
router.use('user', '/users', userRouter);
router.use('article', '/articles', articleRouter);

// In path/to/module/user/index.js
userRouter.get('detail', '/:id', detailController);
userRouter.post('edit', '/:id/edit', editController);

// In path/to/module/article/index.js
articleRouter.get('list', '/', listController);
articleRouter.get('detail', '/:title', detailController);
```

You can:
```js
router.urlFor('user.detail', {id: 0})                  -> '/users/0'
router.urlFor('user.edit', {id: 2})                    -> '/users/2/edit'
router.urlFor('article.list')                          -> '/articles'
router.urlFor('article.detail', {title: 'love-craft'}) -> '/articles/love-craft'
```

# Sample Project

See [route-label-sample](https://github.com/cermati/route-label-sample) for sample integration on express.js. 

# Why

Define route in a way you define constants (name => route), because:

1. No need to remember the route's URL patterns, just the name to generate URL. Useful for large application with many end points.
2. Easy to change URL patterns, just in the "constant" definition.

# Features

1. Define route as natural as Express' way.
2. Mount submodule routes using `use` method, and get the whole route names respect the module - submodule structure by namespaces.
3. You still can apply middlewares in multiple lines flexibly.
4. Get the route table and you can decide what to do with it: pass to front end, finding route name based on pattern, etc.

# How to use

## Installing

```
npm install --save route-label
```

## Registering Routes

### Basic

In the top level express app, wrap the express or express.Router instance with this library:
```js
var app = require('express')();
var router = require('route-label')(app);
```

Then you can define any routing with this signature:
```js
router.METHOD([name,] path, [middleware ...,] lastMiddleware);
```

`name` is optional. If provided, this route will be registered in the route table and you can generate its URL using `urlFor`.

It may contain alphanumeric, dot, dashes, and underscore.

`METHOD` is the router's method, such as `get`, `post`, `put`, `all`, or `use`.

At the end of your **outermost** route definitions, call:
```js
router.buildRouteTable();
```

This will process all registered route above and store it for future URL generation (`urlFor`).
You only need to call it once.

Example:
```js
var router = require('route-label')(app);

router.all('/*', middleware);
router.get('user.detail', '/users/:id', userDetailController);
router.post('user.edit', '/users/:id/edit', userEditController);

router.buildRouteTable();
```

### Mounting Submodule

If you mount another "submodule" with `use` keyword, the given name will become prefix for all routes inside that submodule.
Without giving name, the nested routes inside the submodule won't be registered as named route.
Prefixes will be concatenated with dot ('.') character. It is also possible to have subsubmodule and subsubsubmodule.

Example, in your `/routes/index.js`:
```js
var app = require('express')();
var router = require('route-label')(app);

router.use('article', '/articles', require('/path/to/module/article/index'));
```

In `/path/to/module/article/index.js`:
```js
var appRouter = require('express').Router(); // Use express.Router() instead of express()
var router = require('route-label')(appRouter);

router.get('list', '/', listController);
router.post('detail', '/:title', detailController);

module.exports = appRouter; // Return the express.Router() instance
```

Now you get 'article.list' and 'article.detail' routes defined.

If you provide empty string as names, they will be ignored in the prefix.
For example, if you did this:
```js
router.use('', '/articles', articleModule);
```

We get 'list' and 'detail' routes defined, instead of '.list' and '.detail'

## Generate URL

### .urlFor
To generate URL, it is **not necessary** for route-label to wrap app instance.
```js
var router = require('route-label'); // No need to wrap `app` here
```

Then you can call `urlFor` with this signature:
```js
urlFor(routeName, [paramObj], [queryObj])
```

Where `paramObj` is object containing values to be plugged to the URL, and `queryObj` is object which will be serialized as query string.

Example:
```js
/*
Consider this route definitions:
  'article.list' => '/articles'
  'article.detail' => '/articles/:title'
*/

// Returns /articles/cool-guy
router.urlFor('article.detail', {title: 'cool-guy'});

// Returns /articles/cool-guy?mode=show
router.urlFor('article.detail', {title: 'cool-guy'}, {mode: 'show'});

// Returns /articles/cool-guy?mode=show&tag=man&tag=people&tag=money
router.urlFor('article.detail', {title: 'cool-guy'}, {mode: 'show', tag: ['man', 'people', 'money']});

// Returns /articles?order=asc
router.urlFor('article.list', {}, {order: 'asc'});

// Throw error, missing `title`
router.urlFor('article.detail', {});
router.urlFor('article.detail', {caption: 'cool-guy'});
```

### .absoluteUrlFor
To generate absolute URL, set the `baseUrl` with:
```js
router.setBaseUrl(baseUrl);
```
This works globally, so you only need to set it once. In the main routing file perhaps?

After that you can call `absoluteUrlFor` anywhere.

Example:
```js
router.setBaseUrl('https://www.cermati.com');

// Returns https://www.cermati.com/articles/cool-guy
router.absoluteUrlFor('article.detail', {title: 'cool-guy'});
```

### .getRouteTable

After `buildRouteTable`, you can call this anywhere using route-label (with or without wrapping app).
```js
/*
Consider this route definitions:
  'article.list' => '/articles'
  'article.detail' => '/articles/:title'
*/

router.getRouteTable();
```
Will return:
```js
{
  'article.list': '/articles'
  'article.detail': '/articles/:title'
}
```

# FAQ

Has anyone used this on production server?
> Yes, the birthplace of this library, [Cermati](https://cermati.com/), and our other projects using Node.js. We have this on production server running since October 2015.

Why bother creating this library?
> We reviewed other libraries for named route, but none of them suites our needs, especially for submodule routing. So we decided to build our own solution. Battle tested in production, we proceed to release this as open source.

How does it work internally?
> It wraps Express' routing, attaching name in the routes before calling actual Express' routing function. When `.buildRouteTable` is called, the attached names are traversed in pre-order fashion. The result is stored in table and used for future URL generation.

Can it be used as template helper?
> You can, if the template engine allow creation of custom helper. For example in Handlebars.js, you can define custom helper which calls `urlFor`.

# License
MIT
