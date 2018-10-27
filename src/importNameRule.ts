import * as ts from 'typescript';
import * as Lint from 'tslint';

import {Utils} from './utils/Utils';
import {ExtendedMetadata} from './utils/ExtendedMetadata';
import { isObject } from './utils/TypeGuard';

export class Rule extends Lint.Rules.AbstractRule {

    public static metadata: ExtendedMetadata = {
        ruleName: 'import-name',
        type: 'maintainability',
        description: 'The name of the imported module must match the name of the thing being imported',
        hasFix: true,
        options: null, // tslint:disable-line:no-null-keyword
        optionsDescription: '',
        optionExamples: [
            [true],
            [true, { moduleName: 'importedName' }],
            [true, { moduleName: 'importedName' }, ['moduleName1', 'moduleName2']],
            [true, { moduleName: 'importedName' }, ['moduleName1', 'moduleName2'], { ignoreExternalModule: false }]
        ],
        typescriptOnly: true,
        issueClass: 'Ignored',
        issueType: 'Warning',
        severity: 'Low',
        level: 'Opportunity for Excellence',
        group: 'Clarity',
        commonWeaknessEnumeration: '710'
    };

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new ImportNameRuleWalker(sourceFile, this.getOptions()));
    }
}

type Replacement = { [index: string]: string; };
type IgnoredList = string[];
type ConfigKey = 'ignoreExternalModule';
type Config = { [index in ConfigKey]: unknown; };

// This is for temporarily reolving type errors. Actual runtime Node, SourceFile object
// has those properties.
interface RuntimeSourceFile extends ts.SourceFile {
    resolvedModules: Map<string, ts.ResolvedModuleFull>;
}
interface RuntimeNode extends ts.Node {
    parent: RuntimeSourceFile;
}

type Option = {
    replacements: Replacement
    ignoredList: IgnoredList
    config: Config
};

class ImportNameRuleWalker extends Lint.RuleWalker {

    private option: Option;

    constructor(sourceFile: ts.SourceFile, options: Lint.IOptions) {
        super(sourceFile, options);
        this.option = this.extractOptions();
    }

    private extractOptions(): Option {
        const result : Option = {
            replacements: {},
            ignoredList: [],
            config: {
                ignoreExternalModule: true
            }
        };

        this.getOptions().forEach((opt: unknown, index: number) => {
            if (index === 1 && isObject(opt)) {
                result.replacements = this.extractReplacements(opt);
            }

            if (index === 2 && Array.isArray(opt)) {
                result.ignoredList = this.extractIgnoredList(opt);
            }

            if (index === 3 && isObject(opt)) {
                result.config = this.extractConfig(opt);
            }
        });

        return result;
    }

    private extractReplacements(opt: Replacement | unknown): Replacement {
        const result: Replacement = {};
        if (isObject(opt)) {
            Object.keys(opt).forEach((key: string): void => {
                const value: unknown = opt[key];
                if (typeof value === 'string') {
                    result[key] = value;
                }
            });
        }
        return result;
    }

    private extractIgnoredList(opt: IgnoredList): IgnoredList {
        return opt.filter((moduleName: string) => typeof moduleName === 'string');
    }

    private extractConfig(opt: unknown): Config {
        const result: Config = { ignoreExternalModule: true };
        const configKeyLlist: ConfigKey[] = ['ignoreExternalModule'];
        if (isObject(opt)) {
            return Object.keys(opt).reduce((accum: Config, key: string) => {
                if (configKeyLlist.filter((configKey: string) => configKey === key).length >= 1) {
                    accum[<ConfigKey>key] = opt[key];
                    return accum;
                }
                return accum;
            }, { ignoreExternalModule: true });
        }
        return result;
    }

    protected visitImportEqualsDeclaration(node: ts.ImportEqualsDeclaration): void {
        const name: string = node.name.text;

        if (node.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference) {
            const moduleRef: ts.ExternalModuleReference = <ts.ExternalModuleReference>node.moduleReference;
            if (moduleRef.expression.kind === ts.SyntaxKind.StringLiteral) {
                const moduleName: string = (<ts.StringLiteral>moduleRef.expression).text;
                this.validateImport(node, name, moduleName);
            }
        } else if (node.moduleReference.kind === ts.SyntaxKind.QualifiedName) {
            let moduleName = node.moduleReference.getText();
            moduleName = moduleName.replace(/.*\./, ''); // chop off the qualified parts
            this.validateImport(node, name, moduleName);
        }
        super.visitImportEqualsDeclaration(node);
    }

    protected visitImportDeclaration(node: ts.ImportDeclaration): void {
        if (node.importClause!.name !== undefined) {
            const name: string = node.importClause!.name!.text;
            if (node.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral) {
                const moduleName: string = (<ts.StringLiteral>node.moduleSpecifier).text;
                this.validateImport(node, name, moduleName);
            }
        }
        super.visitImportDeclaration(node);
    }

    private validateImport(node: ts.ImportEqualsDeclaration | ts.ImportDeclaration, importedName: string, moduleName: string): void {
        let expectedImportedName = moduleName.replace(/.*\//, ''); // chop off the path
        if (expectedImportedName === '' || expectedImportedName === '.' || expectedImportedName === '..') {
            return;
        }
        expectedImportedName = this.makeCamelCase(expectedImportedName);
        if (this.isImportNameValid(importedName, expectedImportedName, moduleName, node) === false) {
            const message: string = `Misnamed import. Import should be named '${expectedImportedName}' but found '${importedName}'`;
            const nameNode = node.kind === ts.SyntaxKind.ImportEqualsDeclaration
                ? (<ts.ImportEqualsDeclaration>node).name
                : (<ts.ImportDeclaration>node).importClause!.name;
            const nameNodeStartPos = nameNode!.getStart();
            const fix = new Lint.Replacement(nameNodeStartPos, nameNode!.end - nameNodeStartPos, expectedImportedName);
            this.addFailureAt(node.getStart(), node.getWidth(), message, fix);
        }
    }

    private makeCamelCase(input: string): string {
        // tslint:disable-next-line:variable-name
        return input.replace(/[-|\.|_](.)/g, (_match: string, group1: string): string => {
            return group1.toUpperCase();
        });
    }

    private isImportNameValid(importedName: string, expectedImportedName: string, moduleName: string,
        node: ts.ImportEqualsDeclaration | ts.ImportDeclaration): boolean {
        if (expectedImportedName === importedName) {
            return true;
        }

        const isReplacementsExist = this.checkReplacementsExist(importedName, expectedImportedName, moduleName, this.option.replacements);
        if (isReplacementsExist) {
            return true;
        }

        const isIgnoredModuleExist = this.checkIgnoredListExists(moduleName, this.option.ignoredList);
        if (isIgnoredModuleExist) {
            return true;
        }

        const ignoreThisExternalModule = this.checkIgnoreExternalModule(moduleName, node, this.option.config);
        if (ignoreThisExternalModule) {
            return true;
        }

        return false;
    }

    private checkReplacementsExist(importedName: string, expectedImportedName: string, moduleName: string, replacements: Replacement)
        : boolean {
        // Allowed Replacement keys are specifiers that are allowed when overriding or adding exceptions
        // to import-name rule.
        // Example: for below import statement
        // `import cgi from 'fs-util/cgi-common'`
        // The Valid specifiers are: [cgiCommon, fs-util/cgi-common, cgi-common]
        const allowedReplacementKeys: string[] = [expectedImportedName, moduleName, moduleName.replace(/.*\//, '')];
        return Utils.exists(Object.keys(replacements), (replacementKey: string): boolean => {
            for (let index = 0; allowedReplacementKeys.length > index; index = index + 1) {
                if (replacementKey === allowedReplacementKeys[index]) {
                    return importedName === replacements[replacementKey];
                }
            }
            return false;
        });
    }

    // Ignore array of strings that comes from third argument.
    private checkIgnoredListExists(moduleName: string, ignoredList: IgnoredList): boolean {
        return ignoredList.filter((ignoredModule: string) => ignoredModule === moduleName).length >= 1;
    }

    // Ignore NPM installed modules by checking its module path at runtime
    private checkIgnoreExternalModule(moduleName: string, node: unknown, opt: Config): boolean {
        const runtimeNode: RuntimeNode = <RuntimeNode>node;
        if (opt.ignoreExternalModule === true && runtimeNode.parent !== undefined && runtimeNode.parent.resolvedModules !== undefined) {
            let ignoreThisExternalModule = false;
            runtimeNode.parent.resolvedModules.forEach((value: ts.ResolvedModuleFull, key: string) => {
                if (key === moduleName && value.isExternalLibraryImport === true) {
                    ignoreThisExternalModule = true;
                }
            });
            return ignoreThisExternalModule;
        }
        return false;
    }
}
