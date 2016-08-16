'use strict';

/**
 * Test for our homemade named router helper
 * @author William Gozali <will.gozali@cermati.com>
 */

var expect = require('chai').expect;
var routeHelper = require('../helper');

describe('router/helper.js', function () {
  describe('.isValidName()', function () {
    context('when given valid name', function () {
      it('should return true for empty string', function () {
        expect(routeHelper.isValidName('')).to.be.true;
      });
      
      it('should return true for single word', function () {
        expect(routeHelper.isValidName('word')).to.be.true;
      });

      it('should return true for multiple words with delimiter', function () {
        expect(routeHelper.isValidName('wordCAPITAL')).to.be.true;
        expect(routeHelper.isValidName('number12')).to.be.true;
        expect(routeHelper.isValidName('contains.dot')).to.be.true;
        expect(routeHelper.isValidName('doge.much.dot.wow')).to.be.true;
        expect(routeHelper.isValidName('kebab-case')).to.be.true;
        expect(routeHelper.isValidName('snake_case')).to.be.true;
        expect(routeHelper.isValidName('foo_bar')).to.be.true;
      });
    });

    context('when given invalid name', function () {
      it('should return false for null/undefined name', function () {
        expect(routeHelper.isValidName(null)).to.be.false;
        expect(routeHelper.isValidName(undefined)).to.be.false;
      });

      it('should return false for name containing space', function () {
        expect(routeHelper.isValidName('contains space')).to.be.false;
      });
    });
  });

  describe('.toToken()', function () {
    context('when given non input field', function () {
      it('should return just text', function () {
        expect(routeHelper.toToken('item')).to.deep.equal({text: 'item'});
        expect(routeHelper.toToken('dashed-word')).to.deep.equal({text: 'dashed-word'});
      });
    });

    context('when given input field', function () {
      it('should return text (without colon as prefix) and input flag', function () {
        expect(routeHelper.toToken(':item')).to.deep.equal({text: 'item', input: true});
        expect(routeHelper.toToken(':dashed-word')).to.deep.equal({text: 'dashed-word', input: true});
      });
    });
  });

  describe('.buildPath()', function () {
    context('when given simple path', function () {
      it('should return valid path', function () {
        expect(routeHelper.buildPath(['/'])).to.equal('/');
        expect(routeHelper.buildPath(['/simple'])).to.equal('/simple');
        expect(routeHelper.buildPath(['/simple/path'])).to.equal('/simple/path');
        expect(routeHelper.buildPath(['/simple/:path'])).to.equal('/simple/:path');
      });
    });

    context('when given path from multilevel route', function () {
      it('should return valid path', function () {
        expect(routeHelper.buildPath(['/simple', '/:item'])).to.equal('/simple/:item');
        expect(routeHelper.buildPath(['/simple/path', '/:item'])).to.equal('/simple/path/:item');
        expect(routeHelper.buildPath(['/simple', '/path'])).to.equal('/simple/path');
        expect(routeHelper.buildPath(['/simple', '/coupled/token', '/wow'])).to.equal('/simple/coupled/token/wow');
      });
    });

    context('when given path which contains root', function () {
      it('should return valid path', function () {
        expect(routeHelper.buildPath(['/'])).to.equal('/');
        expect(routeHelper.buildPath(['/', '/'])).to.equal('/');
        expect(routeHelper.buildPath(['/', '/wow'])).to.equal('/wow');
        expect(routeHelper.buildPath(['/simple', '/'])).to.equal('/simple');
        expect(routeHelper.buildPath(['/deep', '/', '/', '/nested'])).to.equal('/deep/nested');
        expect(routeHelper.buildPath(['/ham', '/', '/bur', '/', '/ger'])).to.equal('/ham/bur/ger');
      });
    });
  });

  describe('.buildName()', function () {
    context('when given simple name', function () {
      it('should return valid name', function () {
        expect(routeHelper.buildName(['jon'])).to.equal('jon');
        expect(routeHelper.buildName(['cat.dog'])).to.equal('cat.dog');
        expect(routeHelper.buildName(['get.gold.dog'])).to.equal('get.gold.dog');
      });
    });

    context('when given name from multilevel route', function () {
      it('should return valid name', function () {
        expect(routeHelper.buildName(['simple', 'item'])).to.equal('simple.item');
        expect(routeHelper.buildName(['simple.name', 'item'])).to.equal('simple.name.item');
        expect(routeHelper.buildName(['simple', 'coupled.token', 'wow'])).to.equal('simple.coupled.token.wow');
      });
    });

    context('when given name which contains empty', function () {
      it('should return valid name', function () {
        expect(routeHelper.buildName([''])).to.equal('');
        expect(routeHelper.buildName(['', ''])).to.equal('');
        expect(routeHelper.buildName(['', 'wow'])).to.equal('wow');
        expect(routeHelper.buildName(['simple', ''])).to.equal('simple');
        expect(routeHelper.buildName(['deep', '', '', 'nested'])).to.equal('deep.nested');
        expect(routeHelper.buildName(['ham', '', 'bur', '', 'ger'])).to.equal('ham.bur.ger');
      });
    });
  });

  describe('.tokensToString()', function () {
    context('when given tokens', function () {
      it('should return readable pattern', function () {
        expect(routeHelper.tokensToString([
          {text: ''},
          {text: 'title'},
          {text: 'item', input: true}
        ])).to.equal('/title/:item');

        expect(routeHelper.tokensToString([
          {text: ''},
          {text: 'title'},
          {text: 'item', input: true},
          {text: 'op'},
          {text: 'slug', input: true}
        ])).to.equal('/title/:item/op/:slug');
      });
    });
  });

  describe('.flattenDeep()', function () {
    context('when given empty array', function () {
      it('should return empty array', function () {
        expect(routeHelper.flattenDeep([])).to.deep.equal([]);
      });
    });

    context('when given array with no nested elements', function () {
      it('should return empty array', function () {
        expect(routeHelper.flattenDeep([1])).to.deep.equal([1]);
        expect(routeHelper.flattenDeep(['a'])).to.deep.equal(['a']);
        expect(routeHelper.flattenDeep([{a: 1, b: 2}])).to.deep.equal([{a: 1, b: 2}]);
      });
    });

    context('when given array with deep nested elements', function () {
      it('should return empty array', function () {
        expect(routeHelper.flattenDeep([[1]])).to.deep.equal([1]);
        expect(routeHelper.flattenDeep([[[[1]]]])).to.deep.equal([1]);
        expect(routeHelper.flattenDeep(['a', [1, 2, 'b'], 1, [[1, []]]])).to.deep.equal(['a', 1, 2, 'b', 1, 1]);
      });
    });
  });
});
