declare module 'fast-formula-parser' {
  export default class FormulaParser {
    constructor(options?: any);
    parse(formula: string, context?: any): any;
  }
}
