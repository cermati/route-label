'use strict';

var constants = require('./constants');
var self = exports;

/**
 * Check if a part of route name is valid or not
 * A valid name consists of alphanumerics, dots, dashes, and underscores
 * It may be empty
 * @author William Gozali <will.gozali@cermati.com>
 * @param name
 */
exports.isValidName = function (name) {
  if (typeof name !== 'string') {
    return false;
  }
  if (name == '') {
    return true;
  }
  return name.match(/^[-_.a-zA-Z0-9]+$/) !== null;
};

/**
 * Convert given "slice of pattern" to token which is easier to use
 * @author William Gozali <will.gozali@cermati.com>
 * @example
 * toToken('') => {text: ''}
 * toToken('artikel') => {text: 'artikel'}
 * toToken(':kategori') => {text: 'kategori', input: true}
 * toToken(':slug-id') => {text: 'slug-id', input: true}
 */
exports.toToken = function (item) {
  var token = {};
  if ((item.length > 0) && (item.charAt(0) === ':')) {
    token.text = item.substring(1);
    token.input = true;
  } else {
    token.text = item;
  }
  return token;
};

/**
 * Joins path hierarchy to a single path
 * @author William Gozali <will.gozali@cermati.com>
 * @example
 * buildPath(['/']) => '/'
 * buildPath(['/foo', '/:slug']) => '/foo/:slug'
 * buildPath(['/foo', '/bar/:slug', '/wow']) => '/foo/bar/:slug/wow'
 * buildPath(['/foo', '/', '/deep-foo']) => '/foo/deep-foo'
 */
exports.buildPath = function (pathHierarchy) {
  var slashIgnored = [];
  pathHierarchy.forEach(function (path) {
    if (path !== '/') {
      slashIgnored.push(path);
    }
  });

  var cleanPathHierarchy = slashIgnored;
  if (cleanPathHierarchy.length === 0) {
    cleanPathHierarchy = ['/'];
  }
  return cleanPathHierarchy.join('');
};

/**
 * Joins name hierarchy to a single name
 * @author William Gozali <will.gozali@cermati.com>
 * @example
 * buildName(['']) => ''
 * buildName(['', 'dog', 'cat']) => 'dog.cat'
 * buildName(['cat.dot', 'doge'']) => 'cat.dog.doge'
 * buildName(['cat', '', '', 'the', 'ring']) => 'cat.the.ring'
 */
exports.buildName = function (pathHierarchy) {
  var emptyIgnored = [];
  pathHierarchy.forEach(function (path) {
    if (path !== '') {
      emptyIgnored.push(path);
    }
  });

  var cleanNameHierarchy = emptyIgnored;
  if (cleanNameHierarchy.length === 0) {
    cleanNameHierarchy = [''];
  }
  return cleanNameHierarchy.join('.');
};
/**
 * Converts routeTable[NAME].tokens to human readable string, used for logging purpose
 * @author William Gozali <will.gozali@cermati.com>*
 * @example
 * tokensToString(routeTable['article.category'].tokens) => /article/categories/:category
 */
exports.tokensToString = function (tokens) {
  return tokens.map(function (token) {
    var str = token.text;
    if (token.input) {
      str = ':' + str;
    }
    return str;
  }).join('/');
};

/**
 * Method used to register a route
 * @author William Gozali <will.gozali@cermati.com>
 */
exports.register = function (routeTable, nameHierarchy, pathHierarchy) {
  var name = self.buildName(nameHierarchy);
  var pattern = self.buildPath(pathHierarchy);

  if (routeTable[name] && (pattern !== routeTable[name].pattern)) {
    throw new Error('There are duplicates in route name: ' + name);
  }

  routeTable[name] = {
    pattern: pattern,
    tokens: pattern.split('/').map(self.toToken)
  };
};

/**
 * Check whether given event and previousEvent defines a terminal route
 * @author William Gozali <will.gozali@cermati.com>
 */
exports.isTerminalRoute = function (previousEvent, event) {
  if (previousEvent === undefined) {
    return false;
  }

  if ((previousEvent.operation === constants.PUSH) && (event.operation === constants.POP)) {
    return (previousEvent.name === event.name);
  }
  return false;
};

/**
 * Flatten deep an array
 * @author William Gozali <will.gozali@cermati.com>
 */
exports.flattenDeep = function (nestedArrays) {
  var ret = [];
  nestedArrays.forEach(function (item) {
    if (!Array.isArray(item)) {
      ret.push(item);
    } else {
      var temp = self.flattenDeep(item);
      temp.forEach(function (x) {
        ret.push(x);
      });
    }
  });

  return ret;
};
