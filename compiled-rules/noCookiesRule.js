var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './utils/ErrorTolerantWalker'], function (require, exports) {
    var ErrorTolerantWalker = require('./utils/ErrorTolerantWalker');
    var Rule = (function (_super) {
        __extends(Rule, _super);
        function Rule() {
            _super.apply(this, arguments);
        }
        Rule.prototype.apply = function (sourceFile) {
            var documentRegistry = ts.createDocumentRegistry();
            var languageServiceHost = Lint.createLanguageServiceHost('file.ts', sourceFile.getFullText());
            var languageService = ts.createLanguageService(languageServiceHost, documentRegistry);
            return this.applyWithWalker(new NoCookiesWalker(sourceFile, this.getOptions(), languageService));
        };
        Rule.FAILURE_STRING = 'Forbidden call to document.cookie';
        return Rule;
    })(Lint.Rules.AbstractRule);
    exports.Rule = Rule;
    var NoCookiesWalker = (function (_super) {
        __extends(NoCookiesWalker, _super);
        function NoCookiesWalker(sourceFile, options, languageService) {
            _super.call(this, sourceFile, options);
            this.languageService = languageService;
            this.typeChecker = languageService.getProgram().getTypeChecker();
        }
        NoCookiesWalker.prototype.visitPropertyAccessExpression = function (node) {
            var propertyName = node.name.text;
            if (propertyName === 'cookie') {
                var leftSide = node.expression;
                try {
                    var leftSideType = this.typeChecker.getTypeAtLocation(leftSide);
                    var typeAsString = this.typeChecker.typeToString(leftSideType);
                    if (leftSideType.flags === 1 || typeAsString === 'Document') {
                        this.addFailure(this.createFailure(leftSide.getStart(), leftSide.getWidth(), Rule.FAILURE_STRING));
                    }
                }
                catch (e) {
                    if (leftSide.getFullText().trim() === 'document') {
                        this.addFailure(this.createFailure(leftSide.getStart(), leftSide.getWidth(), Rule.FAILURE_STRING));
                    }
                }
            }
            _super.prototype.visitPropertyAccessExpression.call(this, node);
        };
        return NoCookiesWalker;
    })(ErrorTolerantWalker);
});
//# sourceMappingURL=noCookiesRule.js.map