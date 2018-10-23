import * as ts from 'typescript';
import * as Lint from 'tslint';

import {ExtendedMetadata} from './utils/ExtendedMetadata';
import {BannedTermWalker} from './utils/BannedTermWalker';

export class Rule extends Lint.Rules.AbstractRule {

    public static metadata: ExtendedMetadata = {
        ruleName: 'no-banned-terms',
        type: 'maintainability',
        description: 'Do not use banned terms: caller, callee, eval, arguments.',
        options: null, // tslint:disable-line:no-null-keyword
        optionsDescription: '',
        typescriptOnly: true,
        issueClass: 'SDL',
        issueType: 'Error',
        severity: 'Critical',
        level: 'Mandatory',
        group: 'Security',
        commonWeaknessEnumeration: '676, 242, 116'
    };

    private static FAILURE_STRING: string = 'Forbidden reference to banned term: ';
    private static BANNED_TERMS : string[] = [ 'caller', 'callee', 'arguments', 'eval' ];

    public apply(sourceFile : ts.SourceFile): Lint.RuleFailure[] {
        const walker : Lint.RuleWalker = new BannedTermWalker(
            sourceFile,
            this.getOptions(),
            Rule.FAILURE_STRING,
            Rule.BANNED_TERMS
        );
        return this.applyWithWalker(walker);
    }
}