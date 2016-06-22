# Express.js Named Router + URL Generator

Either:
```
// In index.js
router.get('user.detail', '/users/:id', require('/path/to/controller/...'));
router.post('user.edit', '/users/:id/edit', require('/path/to/controller/...'));

router.get('article.list', '/articles', require('/path/to/controller/...'));
router.get('article.detail', '/articles/:title', require('/path/to/controller/...'));
```

or:
```
// In index.js
router.use('user', '/users', require('/path/to/module/user');
router.use('article', '/articles', require('/path/to/module/post');

// In path/to/module/user/index.js
router.get('detail', '/:id', require('/path/to/module/user/controller/...'));
router.post('edit', '/:id/edit', require('/path/to/module/user/controller/...'));

// In path/to/module/article/index.js
router.get('list', '/', require('/path/to/module/article/controller/...'));
router.post('detail', '/:title', require('/path/to/module/article/controller/...'));
```

You can:
```
router.urlFor('user.detail', {id: 0})                  -> /users/0
router.urlFor('user.edit', {id: 2})                    -> /users/2/edit
router.urlFor('article.list')                          -> /articles
router.urlFor('article.detail', {title: 'love-craft'}) -> /articles/love-craft
```

# Why

1. No need to remember the URL patterns, just the URL's name.
2. Easy to change URL patterns, just in the definition.

# How to use

## Registering Routes

### Basic

For every route definition file, wrap the app instance with this library:
```
var router = require('route-label')(app);
```

Then you can define any routing with this signature:
```
router.METHOD([name,] path, [middleware ...,] lastMiddleware);
```

`name` is optional. If provided, this route will be registered in the route table and you can generate its URL using `urlFor`.

`name` may contain alphanumeric, dot, dashes, and underscore.

At the end of your outermost route definitions, call:
```
router.buildRouteTable();
```

This will process all registered route above and store it for future URL generation (`urlFor`).

Example:
```
var router = require('route-label')(app);

router.all('/*', require('/path/to/middleware/...'));
router.get('user.detail', '/users/:id', require('/path/to/controller/...'));
router.post('user.edit', '/users/:id/edit', require('/path/to/controller/...'));

router.buildRouteTable();
```

### Mounting Submodule

If you mount another "submodule" with `use` keyword, the given name will become prefix for all routes inside that submodule.
Prefixes will be concatenated with dot ('.') character. It is also possible to have subsubmodule and subsubsubmodule.

Example, in your `/routes/index.js`:
```
router.use('article', '/articles', require('/path/to/module/article');
```

In `/path/to/module/article/index.js`:
```
router.get('list', '/', require('/path/to/module/article/controller/...'));
router.post('detail', '/:title', require('/path/to/module/article/controller/...'));
```

### Using Wildcard

You can't use wildcard for named router, because generating its URL sounds weird.
Consider:
```
router.get('sample', '/sample/*/text', require('/path/to/controller/...'));
```
It is not clear what `urlFor('sample')` should return. 

## Generate URL

### urlFor
To generate URL, it is **not necessary** for route-label to wrap app instance.
```
var router = require('route-label'); // No need to wrap `app` here
```

You can then call `urlFor` with this signature:
```
urlFor(routeName, [paramObj], [queryObj])
```

Where `paramObj` is object containing values to be plugged to the URL, and `queries` is object which will be serialized as query string.

Example:
```
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

### absoluteUrlFor
To generate absolute URL, set the `baseUrl` with:
```
router.setBaseUrl(baseUrl);
```
This works globally, so you only need to set it once. In the main routing file perhaps?

After that you can call `absoluteUrlFor` anywhere.

Example:
```
router.setBaseUrl('https://www.cermati.com');

// Returns https://www.cermati.com/articles/cool-guy
router.urlFor('article.detail', {title: 'cool-guy'});
```

### getRouteTable

After `buildRouteTable`, you can call this anywhere using route-label (with or without wrapping app).
```
/*
Consider this route definitions:
  'article.list' => '/articles'
  'article.detail' => '/articles/:title'
*/

router.getRouteTable();
```
Will return:
```
{
  'article.list': '/articles'
  'article.detail': '/articles/:title'
}
```

# Installation
```
npm install route-label
```

# FAQ

Is it optimized?
> Yes, we tried our best to optimize the route generation so it runs as fast as possible

How does it works internally?
> It wraps Express' routing, attaching name in the routes. When .buildRouteTable is called, the attached names are traversed in pre-order fashion. The result is stored in table. 

Can it be used as template helper?
> Yes. For example in Handlebars.js, you can define custom helper which calls `urlFor`.

# License
MIT
