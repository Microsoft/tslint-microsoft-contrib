import * as ts from 'typescript';
import {SyntaxKind} from './SyntaxKind';

/**
 * General utility class.
 */
export module AstUtils {

    export function getLanguageVariant(node: ts.SourceFile): ts.LanguageVariant {
        if (/.*\.tsx/i.test(node.fileName)) {
            return ts.LanguageVariant.JSX;
        } else {
            return ts.LanguageVariant.Standard;
        }
    }

    export function getFunctionName(node : ts.CallExpression | ts.NewExpression) : string {
        const expression: ts.Expression = node.expression;
        let functionName : string = (<any>expression).text;
        if (functionName === undefined && (<any>expression).name) {
            functionName = (<any>expression).name.text;
        }
        return functionName;
    }

    export function getFunctionTarget(expression: ts.CallExpression) : string {
        if (expression.expression.kind === SyntaxKind.current().PropertyAccessExpression) {
            const propExp : ts.PropertyAccessExpression = <ts.PropertyAccessExpression>expression.expression;
            return propExp.expression.getText();
        }
        return null;
    }

    export function isJQuery(functionTarget: string): boolean {
        return functionTarget === '$' || /^(jquery)$/i.test(functionTarget);
    }

    export function hasModifier(modifiers : ts.ModifiersArray, modifierKind : number) : boolean {
        if (modifiers == null) {
            return false;
        }
        let result : boolean = false;
        modifiers.forEach((modifier : ts.Node) : void => {
            if (modifier.kind === modifierKind) {
                result = true;
            }
        });
        return result;
    }

    export function dumpTypeInfo(expression : ts.Expression, languageServices: ts.LanguageService, typeChecker : ts.TypeChecker) : void {
        /* tslint:disable:no-console */
        console.log(expression.getFullText());
        console.log('\tkind: ' + expression.kind);

        if (expression.kind === SyntaxKind.current().Identifier
            || expression.kind === SyntaxKind.current().PropertyAccessExpression) {
            const definitionInfo : ts.DefinitionInfo[] = languageServices.getDefinitionAtPosition('file.ts', expression.getStart());
            if (definitionInfo) {
                definitionInfo.forEach((definitionInfo : ts.DefinitionInfo, index : number) : void => {
                    console.log('\tdefinitionInfo-' + index);
                    console.log('\t\tkind: ' + definitionInfo.kind);
                    console.log('\t\tname: ' + definitionInfo.name);
                });
            }

            const typeInfo : ts.DefinitionInfo[] = languageServices.getTypeDefinitionAtPosition('file.ts', expression.getStart());
            if (typeInfo) {
                typeInfo.forEach((definitionInfo : ts.DefinitionInfo, index : number) : void => {
                    console.log('\ttypeDefinitionInfo-' + index);
                    console.log('\t\tkind: ' + definitionInfo.kind);
                    console.log('\t\tname: ' + definitionInfo.name);
                });
            }

            const quickInfo : ts.QuickInfo = languageServices.getQuickInfoAtPosition('file.ts', expression.getStart());
            console.log('\tquickInfo.kind         = ' + quickInfo.kind);
            console.log('\tquickInfo.kindModifiers= ' + quickInfo.kindModifiers);
            console.log('\tquickInfo.textSpan     = ' + quickInfo.textSpan.start);
            console.log('\tquickInfo.displayParts = ' + quickInfo.displayParts[0].text);
            console.log('\tquickInfo.displayParts = ' + quickInfo.displayParts[0].kind);

            const expressionType : ts.Type = typeChecker.getTypeAtLocation(expression);
            console.log('\ttypeChecker.typeToString : ' + typeChecker.typeToString(expressionType));
            console.log('\ttype.flags: ' + expressionType.flags);
            console.log('\ttype.symbol: ' + expressionType.symbol);

            const expressionSymbol : ts.Symbol = typeChecker.getSymbolAtLocation(expression);
            if (expressionSymbol == null) {
                console.log('\tsymbol: ' + expressionSymbol);
            } else {
                console.log('\tsymbol.flags: ' + expressionSymbol.flags);
                console.log('\tsymbol.name: ' + expressionSymbol.name);
                console.log('\tsymbol.declarations: ' + expressionSymbol.declarations);
            }

            const contextualType : ts.Type = typeChecker.getContextualType(expression);
            if (contextualType == null) {
                console.log('\tcontextualType: ' + contextualType);
            } else {
                console.log('\tcontextualType.flags: ' + contextualType.flags);
                console.log('\tcontextualType.symbol: ' + contextualType.symbol);
            }
        }
        /* tslint:enable:no-console */
    }

    export function isPrivate(node: ts.Node) : boolean {
        /* tslint:disable:no-bitwise */
        return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Private);
        /* tslint:disable:no-bitwise */
    }

    export function isProtected(node: ts.Node) : boolean {
        /* tslint:disable:no-bitwise */
        return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Protected);
        /* tslint:disable:no-bitwise */
    }

    export function isPublic(node: ts.Node) : boolean {
        /* tslint:disable:no-bitwise */
        return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Public);
        /* tslint:disable:no-bitwise */
    }

    export function isStatic(node: ts.Node) : boolean {
        /* tslint:disable:no-bitwise */
        return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static);
        /* tslint:disable:no-bitwise */
    }

    function isBindingPattern(node: ts.Node): node is ts.BindingPattern {
        return node != null && (node.kind === SyntaxKind.current().ArrayBindingPattern ||
            node.kind === SyntaxKind.current().ObjectBindingPattern);
    }

    function walkUpBindingElementsAndPatterns(node: ts.Node): ts.Node {
        while (node && (node.kind === SyntaxKind.current().BindingElement || isBindingPattern(node))) {
            node = node.parent;
        }

        return node;
    }

    function getCombinedNodeFlags(node: ts.Node): ts.NodeFlags {
        node = walkUpBindingElementsAndPatterns(node);

        let flags = node.flags;
        if (node.kind === SyntaxKind.current().VariableDeclaration) {
            node = node.parent;
        }

        if (node && node.kind === SyntaxKind.current().VariableDeclarationList) {
            /* tslint:disable:no-bitwise */
            flags |= node.flags;
            /* tslint:enable:no-bitwise */
            node = node.parent;
        }

        if (node && node.kind === SyntaxKind.current().VariableStatement) {
            /* tslint:disable:no-bitwise */
            flags |= node.flags;
            /* tslint:enable:no-bitwise */
        }

        return flags;
    }

    export function isLet(node: ts.Node): boolean {
        /* tslint:disable:no-bitwise */
        return !!(getCombinedNodeFlags(node) & ts.NodeFlags.Let);
        /* tslint:enable:no-bitwise */
    }

    export function isExported(node: ts.Node): boolean {
        /* tslint:disable:no-bitwise */
        return !!(getCombinedNodeFlags(node) & ts.ModifierFlags.Export);
        /* tslint:enable:no-bitwise */
    }

    export function isAssignmentOperator(token: ts.SyntaxKind): boolean {
        return token >= SyntaxKind.current().FirstAssignment && token <= SyntaxKind.current().LastAssignment;
    }

    export function isBindingLiteralExpression(node: ts.Node): node is (ts.ArrayLiteralExpression | ts.ObjectLiteralExpression) {
        return (!!node) &&
            (node.kind === SyntaxKind.current().ObjectLiteralExpression || node.kind === SyntaxKind.current().ArrayLiteralExpression);
    }

    export function findParentBlock(child: ts.Node) : ts.Node {
        let parent : ts.Node = child.parent;
        while (parent != null) {
            if (parent.kind === SyntaxKind.current().Block) {
                return parent;
            }
            parent = parent.parent;
        }
        throw new Error('Could not determine parent block of node: ' + child);
    }

    export function isSameIdentifer(source : ts.Node, target: ts.Node) : boolean {
        if (source == null || target == null) {
            return false;
        }
        if (source.kind === SyntaxKind.current().Identifier && target.kind === SyntaxKind.current().Identifier) {
            return source.getText() === target.getText();
        }
        return false;
    }

    export function getDeclaredMethodNames(node: ts.ClassDeclaration): string[] {
        const result: string[] = [];
        node.members.forEach((classElement: ts.ClassElement): void => {
            if (classElement.kind === SyntaxKind.current().MethodDeclaration) {
                const methodDeclaration: ts.MethodDeclaration = <ts.MethodDeclaration>classElement;
                if (methodDeclaration.name.kind === SyntaxKind.current().Identifier) {
                    result.push((<ts.Identifier>methodDeclaration.name).text);
                }
            }
        });
        return result;
    }

    export function isDeclarationFunctionType(node: ts.PropertyDeclaration | ts.VariableDeclaration | ts.ParameterDeclaration): boolean {
        if (node.type != null) {
            if (node.type.getText() === 'Function') {
                return true;
            }
            return node.type.kind === SyntaxKind.current().FunctionType;
        } else if (node.initializer != null) {
            return (node.initializer.kind === SyntaxKind.current().ArrowFunction
            || node.initializer.kind === SyntaxKind.current().FunctionExpression);
        }
        return false;
    }

    export function isUndefined(node: ts.Expression): boolean {
        if (node != null) {
            if (node.kind === SyntaxKind.current().Identifier) {
                return node.getText() === 'undefined';
            }
        }
        return false;
    }

    export function isConstant(node: ts.Expression): boolean {
        if (node == null) {
            return false;
        }
        return node.kind === SyntaxKind.current().NullKeyword
            || node.kind === SyntaxKind.current().StringLiteral
            || node.kind === SyntaxKind.current().FalseKeyword
            || node.kind === SyntaxKind.current().TrueKeyword
            || node.kind === SyntaxKind.current().NumericLiteral;
    }

    export function isConstantExpression(node: ts.Expression): boolean {

        if (node.kind === SyntaxKind.current().BinaryExpression) {
            const expression: ts.BinaryExpression = <ts.BinaryExpression>node;
            const kind: ts.SyntaxKind = expression.operatorToken.kind;
            if (kind >= SyntaxKind.current().FirstBinaryOperator && kind <= SyntaxKind.current().LastBinaryOperator) {
                return isConstantExpression(expression.left) && isConstantExpression(expression.right);
            }
        }
        if (node.kind === SyntaxKind.current().PrefixUnaryExpression || node.kind === SyntaxKind.current().PostfixUnaryExpression) {
            const expression: ts.PostfixUnaryExpression | ts.PrefixUnaryExpression =
                <ts.PostfixUnaryExpression | ts.PrefixUnaryExpression>node;
            const kind: ts.SyntaxKind = expression.operator;
            if (kind >= SyntaxKind.current().FirstBinaryOperator && kind <= SyntaxKind.current().LastBinaryOperator) {
                return isConstantExpression(expression.operand);
            }
        }
        return isConstant(node);
    }
}
