
import * as ts from 'typescript';
import * as Lint from 'tslint/lib/lint';

import ErrorTolerantWalker = require('./utils/ErrorTolerantWalker');
import Utils = require('./utils/Utils');
import SyntaxKind = require('./utils/SyntaxKind');
import AstUtils = require('./utils/AstUtils');

/**
 * Implementation of the export-name rule.
 */
export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = 'The exported module or identifier name must match the file name. Found: ';

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new ExportNameWalker(sourceFile, this.getOptions()));
    }

    public static getExceptions(options : Lint.IOptions) : string[] {
        if (options.ruleArguments instanceof Array) {
            return options.ruleArguments[0];
        }
        if (options instanceof Array) {
            return <string[]><any>options; // MSE version of tslint somehow requires this
        }
        return null;
    }
}

export class ExportNameWalker extends ErrorTolerantWalker {

    protected visitSourceFile(node: ts.SourceFile): void {

        var exportedTopLevelElements: any[] = [];

        node.statements.forEach((element: any): void => {
            if (element.kind === SyntaxKind.current().ExportAssignment) {
                let exportAssignment: ts.ExportAssignment = <ts.ExportAssignment>element;
                this.validateExport(exportAssignment.expression.getText(), exportAssignment.expression);
            } else if (AstUtils.hasModifier(element.modifiers, SyntaxKind.current().ExportKeyword)) {
                exportedTopLevelElements.push(element);
            }
        });
        this.validateExportedElements(exportedTopLevelElements);
    }

    private validateExportedElements(exportedElements: any[]): void {
        // only validate the exported elements when a single export statement is made
        if (exportedElements.length === 1) {
            if (exportedElements[0].kind === SyntaxKind.current().ModuleDeclaration ||
                exportedElements[0].kind === SyntaxKind.current().ClassDeclaration ||
                exportedElements[0].kind === SyntaxKind.current().FunctionDeclaration) {
                this.validateExport(exportedElements[0].name.text, exportedElements[0]);
            } else if (exportedElements[0].kind === SyntaxKind.current().VariableStatement) {
                let variableStatement: ts.VariableStatement = exportedElements[0];
                // ignore comma separated variable lists
                if (variableStatement.declarationList.declarations.length === 1) {
                    let variableDeclaration: ts.VariableDeclaration = variableStatement.declarationList.declarations[0];
                    this.validateExport((<any>variableDeclaration.name).text, variableDeclaration);
                }
            }
        }
    }

    private validateExport(exportedName: string, node: ts.Node): void {
        var regex : RegExp = new RegExp(exportedName + '\..*'); // filename must be exported name plus any extension
        if (!regex.test(this.getFilename())) {
            if (!this.isSuppressed(exportedName)) {
                var failureString = Rule.FAILURE_STRING + this.getSourceFile().fileName + ' and ' + exportedName;
                var failure = this.createFailure(node.getStart(), node.getWidth(), failureString);
                this.addFailure(failure);
            }
        }
    }

    private getFilename(): string {
        var filename = this.getSourceFile().fileName;
        var lastSlash = filename.lastIndexOf('/');
        if (lastSlash > -1) {
            return filename.substring(lastSlash + 1);
        }
        return filename;
    }

    private isSuppressed(exportedName: string) : boolean {
        var allExceptions : string[] = Rule.getExceptions(this.getOptions());

        return Utils.exists(allExceptions, (exception: string) : boolean => {
            return new RegExp(exception).test(exportedName);
        });
    }
}
