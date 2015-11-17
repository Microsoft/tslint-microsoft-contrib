/// <reference path="../typings/mocha.d.ts" />
/// <reference path="../typings/chai.d.ts" />

/* tslint:disable:quotemark */
/* tslint:disable:no-multiline-string */

import TestHelper = require('./utils/TestHelper');

/**
 * Unit tests.
 */
describe('noEmptyInterfacesRule', () : void => {

    var ruleName : string = 'no-empty-interfaces';

    it('should pass on interface with 1 attribute', () : void => {
        var script : string = `
            interface MyInterface {
                attribute: string;
            }
        `;

        TestHelper.assertViolations(ruleName, null, script, [ ]);
    });

    it('should fail on empty interface', () : void => {
        var script : string = `
            interface MyInterface {
                // adding comments will not help you.
            }
        `;

        TestHelper.assertViolations(ruleName, null, script, [
            {
                "failure": "Do not declare empty interfaces: 'MyInterface'",
                "name": "file.ts",
                "ruleName": "no-empty-interfaces",
                "startPosition": { "character": 13, "line": 2 }
            }
        ]);
    });

});
/* tslint:enable:quotemark */
/* tslint:enable:no-multiline-string */
