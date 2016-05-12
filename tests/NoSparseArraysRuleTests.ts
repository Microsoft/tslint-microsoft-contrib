/// <reference path="../typings/mocha.d.ts" />
/// <reference path="../typings/chai.d.ts" />

/* tslint:disable:quotemark */
/* tslint:disable:no-multiline-string */

import TestHelper = require('./TestHelper');

/**
 * Unit tests.
 */
describe('noSparseArraysRule', () : void => {
    var ruleName : string = 'no-sparse-arrays';

    it('should pass on dense arrays', () : void => {
        var script : string = `
            var a = [];
            var b = [1];
            var c = ['1', '2'];
            var d = [true, false, true];
            var e = [1,2,3,]; // dangling comma is not an issue
        `;

        TestHelper.assertViolations(ruleName, script, [ ]);
    });

    it('should fail on comma with no elements', () : void => {
        var script : string = `
            var x = [,];
        `;

        TestHelper.assertViolations(ruleName, script, [
            {
                "failure": "Unexpected comma in middle of array",
                "name": "file.ts",
                "ruleName": "no-sparse-arrays",
                "startPosition": { "character": 21, "line": 2 }
            }
        ]);
    });

    it('should fail on array with many commas', () : void => {
        var script : string = `
            var x = [,,,];
        `;

        TestHelper.assertViolations(ruleName, script, [
            {
                "failure": "Unexpected comma in middle of array",
                "name": "file.ts",
                "ruleName": "no-sparse-arrays",
                "startPosition": { "character": 21, "line": 2 }
            }
        ]);
    });

    it('should fail on array with elements and commas', () : void => {
        var script : string = `
            var x = [,1,2,3];
            var z = [1,,2,3];
        `;

        TestHelper.assertViolations(ruleName, script, [
            {
                "failure": "Unexpected comma in middle of array",
                "name": "file.ts",
                "ruleName": "no-sparse-arrays",
                "startPosition": { "character": 21, "line": 2 }
            },
            {
                "failure": "Unexpected comma in middle of array",
                "name": "file.ts",
                "ruleName": "no-sparse-arrays",
                "startPosition": { "character": 21, "line": 3 }
            }
        ]);
    });

});
/* tslint:enable:quotemark */
/* tslint:enable:no-multiline-string */
