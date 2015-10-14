import SyntaxKind = require('./SyntaxKind');
import ErrorTolerantWalker = require('./ErrorTolerantWalker');

/**
 * Implementation of the no-multiline-string rule.
 */
export class Rule extends Lint.Rules.AbstractRule {
    public static FAILURE_STRING = 'Forbidden Multiline string: ';

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new NoMultilineStringWalker(sourceFile, this.getOptions()));
    }
}

class NoMultilineStringWalker extends ErrorTolerantWalker {


    protected visitNode(node: ts.Node): void {
        if (node.kind === SyntaxKind.current().NoSubstitutionTemplateLiteral) {
            let fullText : string = node.getFullText();
            let firstLine : string = fullText.substring(0, fullText.indexOf('\n'));
            let trimmed : string = firstLine.substring(0, 40);
            this.addFailure(this.createFailure(node.getStart(), node.getWidth(), Rule.FAILURE_STRING + trimmed + '...'));
        }
        super.visitNode(node);
    }
}
