import * as ts from 'typescript';
import * as Lint from 'tslint';
import {AstUtils} from './utils/AstUtils';
import {Utils} from './utils/Utils';
import {ExtendedMetadata} from './utils/ExtendedMetadata';
import {forEachTokenWithTrivia} from 'tsutils';
import { isObject } from './utils/TypeGuard';

export class Rule extends Lint.Rules.AbstractRule {

    public static metadata: ExtendedMetadata = {
        ruleName: 'max-func-body-length',
        type: 'maintainability',
        description: 'Avoid long functions.',
        options: null, // tslint:disable-line:no-null-keyword
        optionsDescription: '',
        typescriptOnly: true,
        issueClass: 'Non-SDL',
        issueType: 'Warning',
        severity: 'Moderate',
        level: 'Opportunity for Excellence',
        group: 'Clarity',
        recommendation: '[true, 100, {"ignore-parameters-to-function-regex": "^describe$"}],',
        commonWeaknessEnumeration: '398, 710'
    };

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new MaxFunctionBodyLengthRuleWalker(sourceFile, this.getOptions()));
    }
}

const FUNC_BODY_LENGTH = 'func-body-length';
const FUNC_EXPRESSION_BODY_LENGTH = 'func-express-body-length';
const ARROW_BODY_LENGTH = 'arrow-body-length';
const METHOD_BODY_LENGTH = 'method-body-length';
const CTOR_BODY_LENGTH = 'ctor-body-length';
const IGNORE_PARAMETERS_TO_FUNCTION = 'ignore-parameters-to-function-regex';
const IGNORE_COMMENTS = 'ignore-comments';

class MaxFunctionBodyLengthRuleWalker extends Lint.RuleWalker {
    private maxBodyLength!: number;
    private maxFuncBodyLength!: number;
    private maxFuncExpressionBodyLength!: number;
    private maxArrowBodyLength!: number;
    private maxMethodBodyLength!: number;
    private maxCtorBodyLength!: number;
    private ignoreComments!: boolean;
    private currentClassName: string | undefined;
    private ignoreParametersToFunctionRegex!: RegExp;
    private ignoreNodes: ts.Node[] = [];

    constructor(sourceFile: ts.SourceFile, options: Lint.IOptions) {
        super(sourceFile, options);
        this.parseOptions();
    }

    protected visitCallExpression(node: ts.CallExpression): void {
        const functionName = AstUtils.getFunctionName(node);
        if (this.ignoreParametersToFunctionRegex && this.ignoreParametersToFunctionRegex.test(functionName)) {
            // temporarily store a list of ignored references
            node.arguments.forEach((argument: ts.Expression): void => {
                this.ignoreNodes.push(argument);
            });
            super.visitCallExpression(node);
            // clear the list of ignored references
            this.ignoreNodes = Utils.removeAll(this.ignoreNodes, node.arguments);
        } else {
            super.visitCallExpression(node);
        }
    }

    protected visitArrowFunction(node: ts.ArrowFunction): void {
        this.validate(node);
        super.visitArrowFunction(node);
    }

    protected visitMethodDeclaration(node: ts.MethodDeclaration): void {
        this.validate(node);
        super.visitMethodDeclaration(node);
    }

    protected visitFunctionDeclaration(node: ts.FunctionDeclaration): void {
        this.validate(node);
        super.visitFunctionDeclaration(node);
    }

    protected visitFunctionExpression(node: ts.FunctionExpression): void {
        this.validate(node);
        super.visitFunctionExpression(node);
    }

    protected visitConstructorDeclaration(node: ts.ConstructorDeclaration): void {
        this.validate(node);
        super.visitConstructorDeclaration(node);
    }

    protected visitClassDeclaration(node: ts.ClassDeclaration): void {
        this.currentClassName = (node.name && node.name.text) || 'default';
        super.visitClassDeclaration(node);
        this.currentClassName = undefined;
    }

    private validate(node: ts.FunctionLikeDeclaration): void {
        if (!Utils.contains(this.ignoreNodes, node)) {
            let bodyLength = this.calcBodyLength(node);
            if (this.ignoreComments) {
                bodyLength -= this.calcBodyCommentLength(node);
            }
            if (this.isFunctionTooLong(node.kind, bodyLength)) {
                this.addFuncBodyTooLongFailure(node, bodyLength);
            }
        }
    }

    private calcBodyLength(node: ts.FunctionLikeDeclaration) {
        if (node.body === undefined) {
            return 0;
        }
        const sourceFile: ts.SourceFile = this.getSourceFile();
        const startLine: number = sourceFile.getLineAndCharacterOfPosition(node.body.pos).line;
        const endLine: number = sourceFile.getLineAndCharacterOfPosition(node.body.end).line;
        return endLine - startLine + 1;
    }

    private calcBodyCommentLength(node: ts.FunctionLikeDeclaration) {
        let commentLineCount = 0;

        commentLineCount += node.getFullText()
            .split(/\n/)
            .filter((line) => {
                return line.trim().match(/^\/\//) !== null;
            })
            .length;

        forEachTokenWithTrivia(node, (text, tokenSyntaxKind) => {
            if (tokenSyntaxKind === ts.SyntaxKind.MultiLineCommentTrivia) {
                commentLineCount += text.split(/\n/).length;
            }
        });

        return commentLineCount;
    }

    private isFunctionTooLong (nodeKind: ts.SyntaxKind, length: number): boolean {
        return length > this.getMaxLength(nodeKind);
    }

    private parseOptions () {
        this.getOptions().forEach((opt: unknown) => {
            if (typeof(opt) === 'number') {
                this.maxBodyLength = opt;
                return;
            }

            if (isObject(opt)) {
                this.maxFuncBodyLength = <number>opt[FUNC_BODY_LENGTH];
                this.maxFuncExpressionBodyLength = <number>opt[FUNC_EXPRESSION_BODY_LENGTH];
                this.maxArrowBodyLength = <number>opt[ARROW_BODY_LENGTH];
                this.maxMethodBodyLength = <number>opt[METHOD_BODY_LENGTH];
                this.maxCtorBodyLength = <number>opt[CTOR_BODY_LENGTH];
                this.ignoreComments = !!opt[IGNORE_COMMENTS];
                const regex: string = <string>opt[IGNORE_PARAMETERS_TO_FUNCTION];
                if (regex) {
                    this.ignoreParametersToFunctionRegex = new RegExp(regex);
                }
            }
        });
    }

    private addFuncBodyTooLongFailure(node: ts.FunctionLikeDeclaration, length: number) {
        this.addFailureAt(node.getStart(), node.getWidth(), this.formatFailureText(node, length));
    }

    private formatFailureText (node: ts.FunctionLikeDeclaration, length: number) {
        const funcTypeText: string = this.getFuncTypeText(node.kind);
        const maxLength: number = this.getMaxLength(node.kind);
        const placeText: string = this.formatPlaceText(node);
        return `Max ${ funcTypeText } body length exceeded${ placeText } - max: ${ maxLength }, actual: ${ length }`;
    }

    private formatPlaceText (node: ts.FunctionLikeDeclaration) {
        const funcTypeText = this.getFuncTypeText(node.kind);
        if (ts.isMethodDeclaration(node) ||
            ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node)) {
            return ` in ${ funcTypeText } ${ node.name ? node.name.getText() : '' }()`;
        } else if (node.kind === ts.SyntaxKind.Constructor) {
            return ` in class ${ this.currentClassName }`;
        }
        return '';
    }

    private getFuncTypeText (nodeKind: ts.SyntaxKind) {
        if (nodeKind === ts.SyntaxKind.FunctionDeclaration) {
            return 'function';
        } else if (nodeKind === ts.SyntaxKind.FunctionExpression) {
            return 'function expression';
        } else if (nodeKind === ts.SyntaxKind.MethodDeclaration) {
            return 'method';
        } else if (nodeKind === ts.SyntaxKind.ArrowFunction) {
            return 'arrow function';
        } else if (nodeKind === ts.SyntaxKind.Constructor) {
            return 'constructor';
        } else {
            throw new Error(`Unsupported node kind: ${ nodeKind }`);
        }
    }

    private getMaxLength (nodeKind: ts.SyntaxKind) {
        let result: number;

        if (nodeKind === ts.SyntaxKind.FunctionDeclaration) {
            result = this.maxFuncBodyLength;
        } else if (nodeKind === ts.SyntaxKind.FunctionExpression) {
            result = this.maxFuncExpressionBodyLength;
        } else if (nodeKind === ts.SyntaxKind.MethodDeclaration) {
            result = this.maxMethodBodyLength;
        } else if (nodeKind === ts.SyntaxKind.ArrowFunction) {
            result = this.maxArrowBodyLength;
        } else if (nodeKind === ts.SyntaxKind.Constructor) {
            result = this.maxCtorBodyLength;
        } else {
            throw new Error(`Unsupported node kind: ${ nodeKind }`);
        }

        return result || this.maxBodyLength;
    }
}
