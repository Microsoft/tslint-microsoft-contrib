import {TestHelper} from './TestHelper';

/**
 * Unit tests.
 */
describe('importNameRule', () : void => {
    const ruleName : string = 'import-name';

    it('should pass on matching names of external module', () : void => {
        const script : string = `
            import App = require('App');
            import App = require('x/y/z/App');
        `;

        TestHelper.assertViolations(ruleName, script, [ ]);
    });

    it('should pass on matching names of ES6 import', () : void => {
        const script : string = `
            import App from 'App';
            import App from 'x/y/z/App';
        `;

        TestHelper.assertViolations(ruleName, script, [ ]);
    });

    it('should pass on matching names of simple import', () : void => {
        const script : string = `
            import DependencyManager = DM.DependencyManager;
        `;

        TestHelper.assertViolations(ruleName, script, [ ]);
    });

    it('should fail on misnamed external module', () : void => {
        const script : string = `
            import MyCoolApp = require('App');
            import MyCoolApp2 = require('x/y/z/App');
        `;

        TestHelper.assertViolations(ruleName, script, [
            {
                "failure": "Misnamed import. Import should be named 'App' but found 'MyCoolApp'",
                "name": "file.ts",
                "ruleName": "import-name",
                "startPosition": { "character": 13, "line": 2 },
                "fix": {
                    "innerStart": 20,
                    "innerLength": 9,
                    "innerText": "App"
                }
            },
            {
                "failure": "Misnamed import. Import should be named 'App' but found 'MyCoolApp2'",
                "name": "file.ts",
                "ruleName": "import-name",
                "startPosition": { "character": 13, "line": 3 },
                "fix": {
                    "innerStart": 67,
                    "innerLength": 10,
                    "innerText": "App"
                }
            }
        ]);
    });

    it('should fail on misnamed import', () : void => {
        const script : string = `
            import MyCoolApp from 'App';
            import MyCoolApp2 from 'x/y/z/App';
        `;

        TestHelper.assertViolations(ruleName, script, [
            {
                "failure": "Misnamed import. Import should be named 'App' but found 'MyCoolApp'",
                "name": "file.ts",
                "ruleName": "import-name",
                "startPosition": { "character": 13, "line": 2 },
                "fix": {
                    "innerStart": 20,
                    "innerLength": 9,
                    "innerText": "App"
                }
            },
            {
                "failure": "Misnamed import. Import should be named 'App' but found 'MyCoolApp2'",
                "name": "file.ts",
                "ruleName": "import-name",
                "startPosition": { "character": 13, "line": 3 },
                "fix": {
                    "innerStart": 61,
                    "innerLength": 10,
                    "innerText": "App"
                }
            }
        ]);
    });

    it('should fail on misnamed rename', () : void => {
        const script : string = `
            import Service = DM.DependencyManager;
        `;

        TestHelper.assertViolations(ruleName, script, [
            {
                "failure": "Misnamed import. Import should be named 'DependencyManager' but found 'Service'",
                "name": "file.ts",
                "ruleName": "import-name",
                "startPosition": { "character": 13, "line": 2 },
                "fix": {
                    "innerStart": 20,
                    "innerLength": 7,
                    "innerText": "DependencyManager"
                }
            }
        ]);
    });

    it('should fail import with punctuation', () : void => {
        const script : string = `
            import UserSettings from "./user-settings.page";
        `;

        TestHelper.assertViolations(ruleName, script, [
            {
                "failure": "Misnamed import. Import should be named 'userSettingsPage' but found 'UserSettings'",
                "name": "file.ts",
                "ruleName": "import-name",
                "startPosition": { "character": 13, "line": 2 },
                "fix": {
                    "innerStart": 20,
                    "innerLength": 12,
                    "innerText": "userSettingsPage"
                }
            }
        ]);
    });

    it('should pass on differing names when rule is configured with replacements', () : void => {
        const script : string = `
            import Backbone = require('backbone');
            import React = require('react');
            import isPlainObject from 'is-plain-object';
            import baseChartOptions = require('common/component/chart/options/BaseChartOptions');
        `;

        const options: any[] = [ true, {
            'backbone': 'Backbone',
            'react': 'React',
            'is-plain-object': 'isPlainObject',
            'BaseChartOptions': 'baseChartOptions'
        }];
        TestHelper.assertViolationsWithOptions(ruleName, options, script, []);
    });
});