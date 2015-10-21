import ScopedSymbolTrackingWalker = require('./ScopedSymbolTrackingWalker');

import AstUtils = require('./AstUtils');

/**
 * A walker that creates failures whenever it detects a string parameter is being passed to a certain constructor. .
 */
class NoStringParameterToFunctionCallWalker extends ScopedSymbolTrackingWalker {

    private failureString : string;
    private targetFunctionName : string;

    public constructor(sourceFile : ts.SourceFile,
                       targetFunctionName : string,
                       options : Lint.IOptions,
                       languageServices : ts.LanguageService) {
        super(sourceFile, options, languageServices);
        this.targetFunctionName = targetFunctionName;
        this.failureString = 'Forbidden ' + targetFunctionName + ' string parameter: ';
    }

    protected visitCallExpression(node: ts.CallExpression) {
        this.validateExpression(node);
        super.visitCallExpression(node);
    }

    private validateExpression(node : ts.CallExpression) : void {
        var functionName : string = AstUtils.getFunctionName(node);
        var firstArg : ts.Expression = node.arguments[0];
        if (functionName === this.targetFunctionName && firstArg != null) {

            if (!this.isExpressionEvaluatingToFunction(firstArg)) {
                var msg : string = this.failureString + firstArg.getFullText().trim().substring(0, 40);
                this.addFailure(this.createFailure(node.getStart(), node.getWidth(), msg));
            }
        }
    }
}

export = NoStringParameterToFunctionCallWalker;