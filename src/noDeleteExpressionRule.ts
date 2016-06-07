import * as ts from 'typescript';
import * as Lint from 'tslint/lib/lint';

import {SyntaxKind} from './utils/SyntaxKind';
import {ErrorTolerantWalker} from './utils/ErrorTolerantWalker';

/**
 * Implementation of the no-delete-expression rule.
 */
export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = 'Variables should not be deleted: ';

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const noDeleteExpression = new NoDeleteExpression(sourceFile, this.getOptions());
        return this.applyWithWalker(noDeleteExpression);
    }
}

class NoDeleteExpression extends ErrorTolerantWalker {

    public visitExpressionStatement(node: ts.ExpressionStatement) {
        super.visitExpressionStatement(node);
        if (node.expression.kind === SyntaxKind.current().DeleteExpression) {
            // first child is delete keyword, second one is what is being deleted.
            const deletedObject: ts.Node = node.expression.getChildren()[1];
            if (deletedObject != null && deletedObject.kind === SyntaxKind.current().Identifier) {
                this.addNoDeleteFailure(deletedObject);
            }
        }
    }

    public addNoDeleteFailure(deletedObject: ts.Node): void {
        const msg: string = Rule.FAILURE_STRING + deletedObject.getFullText().trim();
        this.addFailure(this.createFailure(deletedObject.getStart(), deletedObject.getWidth(), msg));
    }

}
