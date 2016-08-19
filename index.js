/**
 * Module to track defined routing and their naming
 * This will build a route name table by traversing the routes hierarchy, starting from routes/index
 * The result will be stored as singleton object, routeTable
 *
 * This pattern is used in:
 * https://github.com/alexmingoia/koa-router
 * https://github.com/alubbe/named-routes
 *
 * Sadly, none of them can be used for our modular architecture in express.js
 * 1. var router = require('/path/to/this/router')(app);
 * 2. var router = require('/path/to/this/router');
 *
 * When mode 1 is used, router can register route (.get, .post, ...), buildRouteTable, and urlFor
 * When mode 2 is used, router can only do urlFor(...)
 * @author William Gozali <will.gozali@cermati.com>
 */

'use strict';

var querystring = require('querystring');
var util = require('util');

var helper = require('./helper');
var constants = require('./constants');

var pathToRegexp = require('path-to-regexp');

var baseUrl;
var routeTable;
var PUSH = constants.PUSH;
var POP = constants.POP;

// Basic functionality
var routerBase = {
  urlFor: urlFor,
  absoluteUrlFor: absoluteUrlFor,
  setBaseUrl: setBaseUrl,
  getRouteTable: getRouteTable
};

/**
 * Create a router object, provided the express app
 * It wraps `add` function defined above, so it can be easier to use
 *
 * It adapts express routing structure, can be called with this pattern:
 * router.METHOD([name], path, [middleware...], middleware)
 *
 * @author William Gozali <will.gozali@cermati.com>
 * Later, we can:
 *   In routes/index:
 *   var router = require('../router')(app);
 *   var article = require('../modules/article');
 *   router.all('/articles*', middleware.requireLogin); // Just middleware, no name necessary
 *   router.use('articles', '/articles', article.routes);
 *
 *   In module/article/index module:
 *   var express = keystone.express;
 *   var app = express();
 *   var router = require('../../router')(app);
 *   router.get('list', '/', require('./views/list'));
 *   router.get('detail', '/:title', require('./views/detail'));
 *   router.post('save', '/:title', middleware.requireAdmin, require('./views/save')); // Can add middleware
 *
 *   or we can just register name without middleware to route:
 *   router.addMapping('route.all', /route/*);
 */
var router = function (app) {
  // Inherit other method from app
  var router = Object.create(app);

  // Attach basic functionality
  for (var k in routerBase){
    if (routerBase.hasOwnProperty(k)) {
      router[k] = routerBase[k];
    }
  }

  // Extend with HTTP methods
  constants.METHODS.forEach(function (method) {
    router[method] = add.bind(null, method, app);
  });

  // Extend with additional functions
  router.use = add.bind(null, 'use', app);
  router.all = add.bind(null, 'all', app);
  router.addMapping = add.bind(null, null, app);
  router.buildRouteTable = buildRouteTable.bind(null, app);

  return router;
};

// If "required" without invoking `(app)`, simply attach basic functionality to returned constructor
for (var k in routerBase){
  if (routerBase.hasOwnProperty(k)) {
    router[k] = routerBase[k];
  }
}

module.exports = router;


/**
 * Generic method to register a route, for any method (get, post, all, ...)
 * It wraps around express' routing function, and jot down the routing hierarchy
 *
 * Takes arguments with pattern:
 * method, app, [name,] path, [middleware...,] routeController
 *
 * Where:
 *   method - Routing method, like 'get', 'post', or special 'use'
 *   app - A keystone.express instance
 *   name - Name of this particular route. Without name, this route and its children won't be registered to routeTable.
 *      You can skip this parameter when registering middleware (eg: middleware.requireLogin)
 *   path - Path for this particular route (eg: '/article', '/article/:slug')
 *   middleware - Sequences of middleware. This is optional
 *   routeController - The controller to handle this route, can also be middleware
 * @author William Gozali <will.gozali@cermati.com>
 */
function add() {
  var args = [];
  for (var k in arguments){
    if (arguments.hasOwnProperty(k)) {
      args.push(arguments[k]);
    }
  }

  var method = args[0];
  var app = args[1];
  var name;
  var path;
  var offset;
  var middlewares;

  if (typeof args[3] === 'string') {
    // Name is provided
    name = args[2];
    path = args[3];
    offset = 4;

    if (!helper.isValidName(name)) {
      throw new Error('Invalid route name: ' + name);
    }
  } else {
    // No name provided
    path = args[2];
    offset = 3;
  }
  middlewares = helper.flattenDeep(args.slice(offset));

  if (!app.routeTraversal) {
    // Singleton for each app
    app.routeTraversal = [];
  }

  // Prepare to get deeper
  if (typeof name == 'string') {
    app.routeTraversal.push({
      operation: PUSH,
      name: name,
      path: path
    });
  }

  // Method will be null if we use addMapping()
  if (method) {
    // Register this for express to do its stuff
    app[method](path, middlewares);

    var routeController = middlewares[middlewares.length - 1];
    if (Array.isArray(routeController.routeTraversal)) {
      /*
       As with our function signature, the last element of the middlewares is assumed to be
       the "handler" for the controller logic.
       Even if it is not (could be just a middleware for login guard), then routeController.routeTraversal
       is guaranteed to be undefined, it won't even enter this loop
       */
      for (var i = 0; i < routeController.routeTraversal.length; i++) {
        app.routeTraversal.push(routeController.routeTraversal[i]);
      }
    }
  }

  // Finished this stack, prepare to backtrack
  if (typeof name == 'string') {
    app.routeTraversal.push({
      operation: POP,
      name: name,
      path: path
    });
  }
}

/**
 * Generate the route names
 * After all routing hierarchies are known, call this to build the route names
 *
 * Generated route table maps a route name to 2 fields:
 * 1. pattern: the raw pattern as string (eg: /artikel/kategori/:category)
 * 2. tokens: tokenized pattern, used to optimize urlFor
 *
 * Example for the generated routeTable:
 *   routeTable['article.list'].pattern = '/artikel'
 *   routeTable['article.list'].tokens = [
 *     {text: ''},
 *     {text: 'artikel'}
 *   ]
 *
 *   routeTable['article.category'].pattern = '/artikel/kategori/:category'
 *   routeTable['article.category'].tokens = [
 *     {text: ''}
 *     {text: 'artikel'},
 *     {text: 'kategori'},
 *     {text: 'category', input: true}
 *   ]
 * @author William Gozali <will.gozali@cermati.com>
 * @param app - The express app
 */
function buildRouteTable(app) {
  if (routeTable !== undefined) {
    throw new Error('Route table has been built before!');
  }

  var stack = [];
  routeTable = {};

  if (!app.routeTraversal) {
    return;
  }

  // Simulate the routing traversal while generating route names
  var previousEvent;
  for (var i = 0; i < app.routeTraversal.length; i++) {
    var event = app.routeTraversal[i];
    if (event.operation === PUSH) {
      stack.push({
        name: event.name,
        path: event.path
      });
    } else {
      if (helper.isTerminalRoute(previousEvent, event)) {
        var nameHierarchy = stack.map(function (item) {
          return item.name;
        });
        var patternHierarchy = stack.map(function (item) {
          return item.path;
        });
        helper.register(routeTable, nameHierarchy, patternHierarchy);
      }

      if (stack.length === 0) {
        throw new Error('Stack in generating route names is not balanced, please report this issue');
      }

      stack.pop();
    }

    previousEvent = event;
  }

  if (stack.length !== 0) {
    throw new Error('Leftover element exists in the stack while generating route names, please report this issue');
  }
}

/**
 * Given a route name and its params, return the final URL
 * This function works only after buildRouteTable is executed
 * Throws error when the params is not sufficient to build URL
 *
 * Optimized using routeTable[NAME].tokens:
 * 1. Avoid matching using regex, and do replace in place (directly in the string)
 * 2. Avoid removing ':' at the front of input token, it was done when generating route table
 *
 * @author William Gozali <will.gozali@cermati.com>
 * @param {string} routeName - Name of the route
 * @param {Object} [params] - Params to be fed to url pattern
 * @param {Object} [queries] - Queries to be appended in the end of url
 * @returns {string}
 *
 * @example
 * Let's say after routing is done, we have:
 *   routeTable['creditCard.list'].pattern = '/kartu-kredit'
 *   routeTable['creditCard.detail'].pattern = '/kartu-kredit/:slug'
 *   routeTable['creditCard.apply'].pattern = '/kartu-kredit/:slug/ajukan'
 *
 * In controller:
 *   var router = require('../router'); // No need to pass app
 *   router.urlFor('creditCard.list') => '/kartu-kredit'
 *   router.urlFor('creditCard.list', {}, {issuer: 'abc'}) => '/kartu-kredit?issuer=abc'
 *   router.urlFor('creditCard.list', {}, {issuer: 'abc', bonus: 'dog'}) => '/kartu-kredit?issuer=abc&bonus=dog'
 *   router.urlFor('creditCard.detail', {slug: 'myCard'}) => '/kartu-kredit/myCard'
 *   router.urlFor('creditCard.detail', {slug: 'myCard'}, {'no-layout': true}) => '/kartu-kredit/myCard?no-layout=true'
 *   router.urlFor('creditCard.apply', {slug: 'myCard'}) => '/kartu-kredit/myCard/ajukan'
 *   router.urlFor('creditCard.apply', {title: 'myCard'}) throws error because :slug is not filled
 */
function urlFor(routeName, params, queries) {
  if (routeTable[routeName] === undefined) {
    throw new Error('Attempted to use undefined routeName: ' + routeName);
  }

  var toPath = pathToRegexp.compile(routeTable[routeName].pattern);
  var url= toPath(params);

  if (queries) {
    url = util.format('%s?%s', url, querystring.stringify(queries));
  }
  return url;
}

/**
 * Creates an absolute url for the given routeName, params, and queries.
 *
 * @example
 *   process.env.BASE_URL = 'https://cermati.com';
 *   route.absoluteUrlFor('me.applications') === `https://cermati.com/me/applications`;
 *
 * @author Sendy Halim <sendy@cermati.com>
 * @param {string} routeName - Name of the route.
 * @param {Object} [params] - Params to be fed to url pattern.
 * @param {Object} [queries] - Queries to be appended in the end of url.
 * @returns {string}
 */
function absoluteUrlFor(routeName, params, queries) {
  if (!baseUrl) {
    throw new Error('Please set baseUrl with .setBaseUrl before!');
  }

  return baseUrl.concat(urlFor(routeName, params, queries));
}

/**
 * Set base URL so later we can call `absoluteUrlFor`
 * @author William Gozali <will.gozali@cermati.com>
 * @param _baseUrl
 */
function setBaseUrl(_baseUrl) {
  baseUrl = _baseUrl;
}

/**
 * Return object with route name as keys and the pattern as values
 * @author William Gozali <will.gozali@cermati.com>
 * @returns {Object}
 */
function getRouteTable() {
  var table = {};

  for (var k in routeTable){
    if (routeTable.hasOwnProperty(k)) {
      table[k] = routeTable[k].pattern;
    }
  }

  return table;
}
