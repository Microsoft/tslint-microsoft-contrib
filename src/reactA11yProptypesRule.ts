/**
 * Enforce ARIA state and property values are valid.
 */

import * as ts from 'typescript';
import * as Lint from 'tslint/lib/lint';

import { ExtendedMetadata } from './utils/ExtendedMetadata';
import { getPropName, getStringLiteral } from './utils/JsxAttribute';
import { IAria } from './utils/attributes/IAria';
import {
    isStringLiteral,
    isNumericLiteral,
    isJsxExpression,
    isFalseKeyword,
    isTrueKeyword,
    isNullKeyword
} from './utils/TypeGuard';

// tslint:disable-next-line:no-require-imports no-var-requires
const aria: { [attributeName: string]: IAria } = require('./utils/attributes/ariaSchema.json');

export function getFailureString(propName: string, expectedType: string, permittedValues: string[]): string {
    switch (expectedType) {
        case 'tristate':
            return `The value for ${propName} must be a boolean or the string 'mixed'.`;
        case 'token':
            return `The value for ${propName} must be a single token from the following: ${permittedValues}.`;
        case 'tokenlist':
            return `The value for ${propName} must be a list of one or more tokens from the following: ${permittedValues}.`;
        case 'boolean':
        case 'string':
        case 'integer':
        case 'number':
        default: // tslint:disable-line:no-switch-case-fall-through
            return `The value for ${propName} must be a ${expectedType}.`;
    }
}

export class Rule extends Lint.Rules.AbstractRule {
    public static metadata: ExtendedMetadata = {
        ruleName: 'react-a11y-proptypes',
        type: 'maintainability',
        description: 'Enforce ARIA state and property values are valid.',
        options: null,
        issueClass: 'Non-SDL',
        issueType: 'Warning',
        severity: 'Important',
        level: 'Opportunity for Excellence',
        group: 'Accessibility'
    };

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return sourceFile.languageVariant === ts.LanguageVariant.JSX
            ? this.applyWithWalker(new ReactA11yProptypesWalker(sourceFile, this.getOptions()))
            : [];
    }
}

class ReactA11yProptypesWalker extends Lint.RuleWalker {
    public visitJsxAttribute(node: ts.JsxAttribute): void {
        const propName: string = getPropName(node).toLowerCase();

        // if there is not a aria-* attribute, don't check it.
        if (!aria[propName]) {
            return;
        }

        const allowUndefined: boolean = aria[propName].allowUndefined || false;
        const expectedType: string = aria[propName].type;
        const permittedValues: string[] = aria[propName].values;
        const propValue: string = getStringLiteral(node);

        if (this.isUndefined(node.initializer)) {
            if (!allowUndefined) {
                this.addFailure(this.createFailure(
                    node.getStart(),
                    node.getWidth(),
                    getFailureString(propName, expectedType, permittedValues)
                ));
            }

            return;
        } else if (this.isComplexType(node.initializer)) {
            return;
        }

        if (!this.validityCheck(node.initializer, propValue, expectedType, permittedValues)) {
            this.addFailure(this.createFailure(
                node.getStart(),
                node.getWidth(),
                getFailureString(propName, expectedType, permittedValues)
            ));
        }
    }

    private validityCheck(
        propValueExpression: ts.Expression,
        propValue: string,
        expectedType: string,
        permittedValues: string[]
    ): boolean {
        switch (expectedType) {
            case 'boolean': return this.isBoolean(propValueExpression);
            case 'tristate': return this.isBoolean(propValueExpression) || this.isMixed(propValueExpression);
            case 'integer':
            case 'number': return this.isNumber(propValueExpression);
            case 'string': return this.isString(propValueExpression);
            case 'token':
                return this.isString(propValueExpression) && permittedValues.indexOf(propValue.toLowerCase()) > -1;
            case 'tokenlist':
                return this.isString(propValueExpression) &&
                    propValue.split(' ').every(token => permittedValues.indexOf(token.toLowerCase()) > -1);
            default:
                return false;
        }
    }

    private isUndefined(node: ts.Expression): boolean {
        if (!node) {
            return true;
        } else if (isJsxExpression(node)) {
            const expression: ts.Expression = node.expression;
            if (!expression) {
                return true;
            } else if (expression.kind === ts.SyntaxKind.Identifier) {
                return expression.getText() === 'undefined';
            } else if (isNullKeyword(expression)) {
                return true;
            }
        }

        return false;
    }

    /**
     * For this case <div prop={ x + 1 } />
     * we can't check the type of atrribute's expression until running time.
     */
    private isComplexType(node: ts.Expression): boolean {
        return !this.isUndefined(node) && isJsxExpression(node) &&
            !isStringLiteral(node.expression) && !isNumericLiteral(node.expression) &&
            !isTrueKeyword(node.expression) && !isFalseKeyword(node.expression);
    }

    private isBoolean(node: ts.Expression): boolean {
        if (isStringLiteral(node)) {
            const propValue: string = node.text.toLowerCase();

            return propValue === 'true' || propValue === 'false';
        } else if (isJsxExpression(node)) {
            const expression: ts.Expression = node.expression;

            if (isStringLiteral(expression)) {
                const propValue: string = expression.text.toLowerCase();

                return propValue === 'true' || propValue === 'false';
            } else {
                return isFalseKeyword(expression) || isTrueKeyword(expression);
            }
        }

        return false;
    }

    private isMixed(node: ts.Expression): boolean {
        if (isStringLiteral(node)) {
            return node.text.toLowerCase() === 'mixed';
        } else if (isJsxExpression(node)) {
            const expression: ts.Expression = node.expression;

            return isStringLiteral(expression) && expression.text.toLowerCase() === 'mixed';
        }

        return false;
    }

    private isNumber(node: ts.Expression): boolean {
        if (isStringLiteral(node)) {
            return !isNaN(Number(node.text));
        } else if (isJsxExpression(node)) {
            const expression: ts.Expression = node.expression;

            if (isStringLiteral(expression)) {
                return !isNaN(Number(expression.text));
            } else {
                return isNumericLiteral(expression);
            }
        }

        return false;
    }

    private isString(node: ts.Expression): boolean {
        return isStringLiteral(node) || (isJsxExpression(node) && isStringLiteral(node.expression));
    }
}
