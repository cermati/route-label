'use strict';

var _ = require('lodash');
var chai = require('chai');
var rewire = require('rewire');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var expect = chai.expect;

describe('router/index.js', function () {
  describe('[METHOD]()', function () {
    var app = {
      get: function () {},
      post: function () {},
      all: function () {},
      use: function () {}
    };

    var router;
    var realFunctions;
    var sampleMiddleware;
    var sampleController;

    before('add spy to express\' routes registration function', function () {
      realFunctions = {};
      realFunctions.get = app.get;
      realFunctions.post = app.post;
      realFunctions.all = app.all;
      realFunctions.use = app.use;

      app.get = sinon.spy();
      app.post = sinon.spy();
      app.all = sinon.spy();
      app.use = sinon.spy();

      router = require('../index')(app);
    });

    before('register routing', function () {
      sampleMiddleware = function (req, res, next) {
        return next();
      };
      sampleController = {
        list: function (req, res) {
          res.send('test.list');
        },
        save: function (req, res) {
          res.send('test.save');
        }
      };

      router.use('/just-middleware', sampleMiddleware);
      router.use('middleware', '/named-middleware', sampleMiddleware);
      router.use('middlewares', '/named-middlewares', sampleMiddleware, sampleMiddleware);

      router.all('/forAll*', sampleMiddleware);
      router.get('list', '/', sampleController.list);
      router.post('save', '/:title/save', sampleController.save);
    });

    after('revert express\' routes registration function', function () {
      app.get = realFunctions.get;
      app.post = realFunctions.post;
      app.all = realFunctions.all;
      app.use = realFunctions.use;
    });

    context('when routes is registered with use method', function () {
      it('should have called app.use', function () {
        expect(app.use).to.have.been.calledWith('/just-middleware', [sampleMiddleware]);
        expect(app.use).to.have.been.calledWith('/named-middleware', [sampleMiddleware]);
        expect(app.use).to.have.been.calledWith('/named-middlewares', [sampleMiddleware, sampleMiddleware]);
      });
    });

    context('when routes is registered with all method', function () {
      it('should have called app.all', function () {
        expect(app.all).to.have.been.calledWith('/forAll*', [sampleMiddleware]);
      });
    });

    context('when routes is registered with get method', function () {
      it('should have called app.get', function () {
        expect(app.get).to.have.been.calledWith('/', [sampleController.list]);
      });
    });

    context('when routes is registered with post method', function () {
      it('should have called app.post', function () {
        expect(app.post).to.have.been.calledWith('/:title/save', [sampleController.save]);
      });
    });
  });

  describe('.buildRouteTable()', function () {
    var PUSH;
    var POP;

    before('get push and pop constant', function () {
      var constants = require('..//constants');
      PUSH = constants.PUSH;
      POP = constants.POP;
    });

    context('when given simple routing', function () {
      var app;
      var router;
      var routeTable;

      before('create fake simple routing traversal', function () {
        app = {};

        // We want to modify router's routeTable, which is private field
        // That's why we use rewire, instead of require
        var wiredRoute = rewire('../index');

        // Create router object
        router = wiredRoute(app);

        app.routeTraversal = [
          {operation: PUSH, name: 'foo', path: '/foo'},
          {operation: POP, name: 'foo', path: '/foo'},
          {operation: PUSH, name: 'bar', path: '/bar/bar'},
          {operation: POP, name: 'bar', path: '/bar/bar'},
          {operation: PUSH, name: 'baz', path: '/baz/:input'},
          {operation: POP, name: 'baz', path: '/baz/:input'}
        ];

        router.buildRouteTable();
        routeTable = wiredRoute.__get__('routeTable');
      });
      it('should build the route table successfully', function () {
        expect(routeTable['foo'].pattern).to.equal('/foo');
        expect(routeTable['bar'].pattern).to.equal('/bar/bar');
        expect(routeTable['baz'].pattern).to.equal('/baz/:input');
      });
    });


    context('when given nested routing', function () {
      var app;
      var router;
      var routeTable;

      before('create fake nested routing traversal', function () {
        app = {};
        var wiredRoute = rewire('../index');
        router = wiredRoute(app);

        app.routeTraversal = [
          {operation: PUSH, name: 'foo', path: '/foo'},
          {operation: PUSH, name: 'foo-deep', path: '/foo-deep'},
          {operation: PUSH, name: 'foo-deeper', path: '/foo-deeper'},
          {operation: POP, name: 'foo-deeper', path: '/foo-deeper'},
          {operation: POP, name: 'foo-deep', path: '/foo-deep'},
          {operation: PUSH, name: 'foo-deep-2', path: '/foo-deep-2'},
          {operation: POP, name: 'foo-deep-2', path: '/foo-deep-2'},
          {operation: POP, name: 'foo', path: '/foo'},
          {operation: PUSH, name: 'bar', path: '/bar'},
          {operation: PUSH, name: 'detail', path: '/detail/:input'},
          {operation: POP, name: 'detail', path: '/detail/:input'},
          {operation: POP, name: 'bar', path: '/bar'}
        ];

        router.buildRouteTable();
        routeTable = wiredRoute.__get__('routeTable');
      });
      it('Non terminal route should be undefined', function () {
        expect(routeTable['foo']).to.be.undefined;
        expect(routeTable['foo.foo-deep']).to.be.undefined;
        expect(routeTable['bar']).to.be.undefined;
      });

      it('Terminal route should be registered in routeTable', function () {
        expect(routeTable['foo.foo-deep.foo-deeper'].pattern).to.equal('/foo/foo-deep/foo-deeper');
        expect(routeTable['bar.detail'].pattern).to.equal('/bar/detail/:input');
      });
    });


    context('when given nested routing with root routes', function () {
      var app;
      var router;
      var routeTable;

      before('create fake nested routing traversal with root routes', function () {
        app = {};
        var wiredRoute = rewire('../index');
        router = wiredRoute(app);

        app.routeTraversal = [
          {operation: PUSH, name: 'foo', path: '/foo'},
          {operation: PUSH, name: 'list', path: '/'},
          {operation: POP, name: 'list', path: '/'},
          {operation: PUSH, name: 'detail', path: '/:input'},
          {operation: POP, name: 'detail', path: '/:input'},
          {operation: PUSH, name: 'list-category', path: '/category/:category'},
          {operation: POP, name: 'list-category', path: '/category/:category'},
          {operation: POP, name: 'foo', path: '/foo'},

          {operation: PUSH, name: '1', path: '/1'},
          {operation: PUSH, name: '1-end', path: '/end'},
          {operation: POP, name: '1-end', path: '/end'},
          {operation: PUSH, name: '1-bypass', path: '/'},
          {operation: PUSH, name: '3', path: '/3'},
          {operation: POP, name: '3', path: '/3'},
          {operation: POP, name: '1-bypass', path: '/'},
          {operation: PUSH, name: '2', path: '/2'},
          {operation: PUSH, name: '3', path: '/3'},
          {operation: POP, name: '3', path: '/3'},
          {operation: POP, name: '2', path: '/2'},
          {operation: POP, name: '1', path: '/1'}
        ];

        router.buildRouteTable();
        routeTable = wiredRoute.__get__('routeTable');
      });

      it('Non terminal route should be undefined', function () {
        expect(routeTable['foo']).to.be.undefined;
        expect(routeTable['1']).to.be.undefined;
        expect(routeTable['1.1-bypass']).to.be.undefined;
        expect(routeTable['1.2']).to.be.undefined;
      });

      it('Terminal route should be registered in routeTable', function () {
        expect(routeTable['foo.list'].pattern).to.equal('/foo');
        expect(routeTable['foo.detail'].pattern).to.equal('/foo/:input');
        expect(routeTable['foo.list-category'].pattern).to.equal('/foo/category/:category');

        expect(routeTable['1.1-end'].pattern).to.equal('/1/end');
        expect(routeTable['1.1-bypass.3'].pattern).to.equal('/1/3');
        expect(routeTable['1.2.3'].pattern).to.equal('/1/2/3');
      });
    });
  });

  describe('.urlFor()', function () {
    var urlFor;
    var routeTable;
    var router;
    var revert;

    before('initialize table and inject it to router', function () {
      router = rewire('../index');

      routeTable = {};
      routeTable['foo'] = {
        pattern: '/foo',
        tokens: [{text: ''}, {text: 'foo'}]
      };
      routeTable['foo.list'] = {
        pattern: '/foo',
        tokens: [{text: ''}, {text: 'foo'}]
      };
      routeTable['foo.detail'] = {
        pattern: '/foo/:input',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'input', input: true}]
      };
      routeTable['foo.list-category'] = {
        pattern: '/foo/category/:category',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'category'}, {text: 'category', input: true}]
      };
      routeTable['foo.list-category.detail'] = {
        pattern: '/foo/category/:category/:slug',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'category'}, {text: 'category', input: true}, {text: 'slug', input: true}]
      };
      routeTable['weird.doubled.input'] = {
        pattern: '/foo/:input/bun/:input',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'input', input: true}, {text: 'bun'}, {text: 'input', input: true}]
      };

      revert = router.__set__('routeTable', routeTable);
      urlFor = router.urlFor;
    });

    after('clean up rewire', function () {
      revert();
    });

    context('when route does not need any input', function () {
      it('should return the route normally', function () {
        expect(urlFor('foo')).to.equal('/foo');
        expect(urlFor('foo.list')).to.equal('/foo');
      });
    });

    context('when route does need some inputs', function () {
      it('should return the route normally', function () {
        expect(urlFor('foo.detail', {input: 'bar'})).to.equal('/foo/bar');
        expect(urlFor('foo.list-category', {category: 'troll'})).to.equal('/foo/category/troll');
        expect(urlFor('foo.list-category.detail', {category: 'orc', slug: 'blade-master'})).to.equal('/foo/category/orc/blade-master');
        expect(urlFor('weird.doubled.input', {input: 'twin'})).to.equal('/foo/twin/bun/twin');
      });

      it('should return throw error when input is incomplete', function () {
        expect(function () {
          urlFor('foo.list-category', {unknownInput: 'troll'});
        }).to.throw(Error);

        expect(function () {
          urlFor('foo.list-category.detail', {category: 'one-input-is-missing'});
        }).to.throw(Error);
      });
    });

    context('when given queries', function () {
      it('should return the url with queries appended in the end', function () {
        expect(urlFor('foo', {}, {})).to.equal('/foo?');
        expect(urlFor('foo', {}, {bar: 'baz'})).to.equal('/foo?bar=baz');
        expect(urlFor('foo', {}, {bar: 'baz', 'fuu-uu': 'rage'})).to.equal('/foo?bar=baz&fuu-uu=rage');

        expect(urlFor('foo.list-category', {category: 'ogre'}, {})).to.equal('/foo/category/ogre?');
        expect(urlFor('foo.list-category', {category: 'ogre'}, {class: 'magi'})).to.equal('/foo/category/ogre?class=magi');
        expect(urlFor('foo.list-category', {category: 'ogre'}, {class: 'magi', size: 'big'})).to.equal('/foo/category/ogre?class=magi&size=big');

        expect(urlFor('foo', {}, {list: [1, 2, 3]})).to.equal('/foo?list=1&list=2&list=3');
      });
    });

    context('when route name does not exist', function () {
      it('should throw error', function () {
        expect(function () {
          urlFor('fuu');
        }).to.throw(Error);
      });
    });

    context('when given falsy parameter', function () {
      it('should return the url with falsy parameter', function () {
        expect(urlFor('foo.list-category', {category: 0})).to.equal('/foo/category/0');
      });
    });
  });

  describe('.absoluteUrlFor()', function () {
    var absoluteUrlFor;
    var routeTable;
    var router;
    var revert;

    before('initialize table and inject it to router', function () {
      router = rewire('../index');

      routeTable = {};
      routeTable['foo'] = {
        pattern: '/foo',
        tokens: [{text: ''}, {text: 'foo'}]
      };
      routeTable['foo.list'] = {
        pattern: '/foo',
        tokens: [{text: ''}, {text: 'foo'}]
      };
      routeTable['foo.detail'] = {
        pattern: '/foo/:input',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'input', input: true}]
      };
      routeTable['foo.list-category'] = {
        pattern: '/foo/category/:category',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'category'}, {text: 'category', input: true}]
      };
      routeTable['foo.list-category.detail'] = {
        pattern: '/foo/category/:category/:slug',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'category'}, {text: 'category', input: true}, {text: 'slug', input: true}]
      };
      routeTable['weird.doubled.input'] = {
        pattern: '/foo/:input/bun/:input',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'input', input: true}, {text: 'bun'}, {text: 'input', input: true}]
      };

      revert = router.__set__('routeTable', routeTable);
      absoluteUrlFor = router.absoluteUrlFor;
    });

    after('clean up rewire', function () {
      revert();
    });

    context('when no baseUrl is set', function () {
      it('should throw error', function () {
        expect(function () {
          absoluteUrlFor('foo');
        }).to.throw(Error);

        expect(function () {
          absoluteUrlFor('nope');
        }).to.throw(Error);
      });
    });

    context('when baseUrl is set', function () {
      var baseUrl;

      before('set base URL', function () {
        baseUrl = 'http://www.cermati.com';
        router.setBaseUrl(baseUrl);
      });

      context('when route does not need any input', function () {
        it('should return the route normally', function () {
          expect(absoluteUrlFor('foo')).to.equal(baseUrl + '/foo');
          expect(absoluteUrlFor('foo.list')).to.equal(baseUrl + '/foo');
        });
      });

      context('when route does need some inputs', function () {
        it('should return the route normally', function () {
          expect(absoluteUrlFor('foo.detail', {input: 'bar'})).to.equal(baseUrl + '/foo/bar');
          expect(absoluteUrlFor('foo.list-category', {category: 'troll'})).to.equal(baseUrl + '/foo/category/troll');
          expect(absoluteUrlFor('foo.list-category.detail', {category: 'orc', slug: 'blade-master'})).to.equal(baseUrl + '/foo/category/orc/blade-master');
          expect(absoluteUrlFor('weird.doubled.input', {input: 'twin'})).to.equal(baseUrl + '/foo/twin/bun/twin');
        });

        it('should return throw error when input is incomplete', function () {
          expect(function () {
            absoluteUrlFor('foo.list-category', {unknownInput: 'troll'});
          }).to.throw(Error);

          expect(function () {
            absoluteUrlFor('foo.list-category.detail', {category: 'one-input-is-missing'});
          }).to.throw(Error);
        });
      });

      context('when given queries', function () {
        it('should return the url with queries appended in the end', function () {
          expect(absoluteUrlFor('foo', {}, {})).to.equal(baseUrl + '/foo?');
          expect(absoluteUrlFor('foo', {}, {bar: 'baz'})).to.equal(baseUrl + '/foo?bar=baz');
          expect(absoluteUrlFor('foo', {}, {bar: 'baz', 'fuu-uu': 'rage'})).to.equal(baseUrl + '/foo?bar=baz&fuu-uu=rage');

          expect(absoluteUrlFor('foo.list-category', {category: 'ogre'}, {})).to.equal(baseUrl + '/foo/category/ogre?');
          expect(absoluteUrlFor('foo.list-category', {category: 'ogre'}, {class: 'magi'})).to.equal(baseUrl + '/foo/category/ogre?class=magi');
          expect(absoluteUrlFor('foo.list-category', {category: 'ogre'}, {class: 'magi', size: 'big'})).to.equal(baseUrl + '/foo/category/ogre?class=magi&size=big');

          expect(absoluteUrlFor('foo', {}, {list: [1, 2, 3]})).to.equal(baseUrl + '/foo?list=1&list=2&list=3');
        });
      });

      context('when route name does not exist', function () {
        it('should throw error', function () {
          expect(function () {
            absoluteUrlFor('fuu');
          }).to.throw(Error);
        });
      });

      context('when given falsy parameter', function () {
        it('should return the url with falsy parameter', function () {
          expect(absoluteUrlFor('foo.list-category', {category: 0})).to.equal(baseUrl + '/foo/category/0');
        });
      });
    });
  });

  describe('.getRouteTable()', function () {
    var routeTable;
    var router;
    var revert;

    before('initialize table and inject it to router', function () {
      router = rewire('../index');

      routeTable = {};
      routeTable['foo'] = {
        pattern: '/foo',
        tokens: [{text: ''}, {text: 'foo'}]
      };
      routeTable['foo.list'] = {
        pattern: '/foo',
        tokens: [{text: ''}, {text: 'foo'}]
      };
      routeTable['foo.detail'] = {
        pattern: '/foo/:input',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'input', input: true}]
      };
      routeTable['foo.list-category'] = {
        pattern: '/foo/category/:category',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'category'}, {text: 'category', input: true}]
      };
      routeTable['foo.list-category.detail'] = {
        pattern: '/foo/category/:category/:slug',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'category'}, {text: 'category', input: true}, {text: 'slug', input: true}]
      };
      routeTable['weird.doubled.input'] = {
        pattern: '/foo/:input/bun/:input',
        tokens: [{text: ''}, {text: 'foo'}, {text: 'input', input: true}, {text: 'bun'}, {text: 'input', input: true}]
      };

      revert = router.__set__('routeTable', routeTable);
    });

    after('clean up rewire', function () {
      revert();
    });

    it('should return correct table', function () {
      var expectedRouteTable = {};
      _.each(routeTable, function (value, key) {
        expectedRouteTable[key] = value.pattern;
      });

      expect(router.getRouteTable()).to.deep.equal(expectedRouteTable);
    });
  });
});
