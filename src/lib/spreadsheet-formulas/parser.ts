/**
 * Recursive descent parser turning formula text into an expression tree, with
 * the operator precedence of Google Sheets and Excel, lowest first:
 *
 *   comparison (= <> < > <= >=), concatenation (&), + -, * /, ^, unary - +, postfix %
 *
 * so `=-2^2` is 4, `=1+2*3` is 7 and `="a"&1+1` is "a2".
 */

import type { ReferenceSpec } from "./references";
import { tokenizeFormula, type FormulaToken } from "./tokenizer";
import type { FormulaErrorCode } from "./values";

export type BinaryOperator = "+" | "-" | "*" | "/" | "^" | "&" | "=" | "<>" | "<" | ">" | "<=" | ">=";

export type FormulaNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "error"; code: FormulaErrorCode }
  | { type: "ref"; ref: ReferenceSpec }
  /** An identifier that is not a function call, evaluates to #NAME?. */
  | { type: "name"; name: string }
  | { type: "unary"; operator: "-" | "+"; operand: FormulaNode }
  | { type: "percent"; operand: FormulaNode }
  | { type: "binary"; operator: BinaryOperator; left: FormulaNode; right: FormulaNode }
  | { type: "call"; name: string; args: FormulaNode[] }
  | { type: "array"; rows: FormulaNode[][] }
  /** A skipped argument, as in IF(A1,,"no"). */
  | { type: "empty" };

export class FormulaParseError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, FormulaParseError.prototype);
    this.name = "FormulaParseError";
  }
}

const COMPARISON_OPERATORS = new Set(["=", "<>", "<", ">", "<=", ">="]);

class Parser {
  private readonly tokens: FormulaToken[];
  private position = 0;

  constructor(tokens: FormulaToken[]) {
    this.tokens = tokens.filter((token) => token.type !== "whitespace");
  }

  parse(): FormulaNode {
    if (this.tokens.length === 0) throw new FormulaParseError("The formula is empty.");
    const node = this.parseComparison();
    const leftover = this.peek();
    if (leftover) throw new FormulaParseError(`Unexpected "${leftover.text}".`);
    return node;
  }

  private peek(): FormulaToken | undefined {
    return this.tokens[this.position];
  }

  private next(): FormulaToken | undefined {
    const token = this.tokens[this.position];
    this.position += 1;
    return token;
  }

  private isOperator(...operators: string[]): boolean {
    const token = this.peek();
    return token?.type === "operator" && operators.includes(token.text);
  }

  private parseComparison(): FormulaNode {
    let node = this.parseConcat();
    while (this.peek()?.type === "operator" && COMPARISON_OPERATORS.has(this.peek()!.text)) {
      const operator = this.next()!.text as BinaryOperator;
      node = { type: "binary", operator, left: node, right: this.parseConcat() };
    }
    return node;
  }

  private parseConcat(): FormulaNode {
    let node = this.parseAdditive();
    while (this.isOperator("&")) {
      this.next();
      node = { type: "binary", operator: "&", left: node, right: this.parseAdditive() };
    }
    return node;
  }

  private parseAdditive(): FormulaNode {
    let node = this.parseMultiplicative();
    while (this.isOperator("+", "-")) {
      const operator = this.next()!.text as BinaryOperator;
      node = { type: "binary", operator, left: node, right: this.parseMultiplicative() };
    }
    return node;
  }

  private parseMultiplicative(): FormulaNode {
    let node = this.parsePower();
    while (this.isOperator("*", "/")) {
      const operator = this.next()!.text as BinaryOperator;
      node = { type: "binary", operator, left: node, right: this.parsePower() };
    }
    return node;
  }

  private parsePower(): FormulaNode {
    let node = this.parseUnary();
    while (this.isOperator("^")) {
      this.next();
      node = { type: "binary", operator: "^", left: node, right: this.parseUnary() };
    }
    return node;
  }

  private parseUnary(): FormulaNode {
    if (this.isOperator("-", "+")) {
      const operator = this.next()!.text as "-" | "+";
      return { type: "unary", operator, operand: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): FormulaNode {
    let node = this.parsePrimary();
    while (this.isOperator("%")) {
      this.next();
      node = { type: "percent", operand: node };
    }
    return node;
  }

  private parsePrimary(): FormulaNode {
    const token = this.next();
    if (!token) throw new FormulaParseError("The formula ends unexpectedly.");

    switch (token.type) {
      case "number":
        return { type: "number", value: token.value as number };
      case "string":
        return { type: "string", value: token.value as string };
      case "error":
        return { type: "error", code: token.value as FormulaErrorCode };
      case "ref":
        return { type: "ref", ref: token.ref! };
      case "lparen": {
        const inner = this.parseComparison();
        this.expect("rparen", 'Missing ")".');
        return inner;
      }
      case "lbrace":
        return this.parseArrayLiteral();
      case "ident":
        return this.parseIdentifier(token);
      case "invalid":
        throw new FormulaParseError(
          token.text.startsWith('"') ? "A text value is missing its closing quote." : `Unexpected "${token.text}".`
        );
      default:
        throw new FormulaParseError(`Unexpected "${token.text}".`);
    }
  }

  private parseIdentifier(token: FormulaToken): FormulaNode {
    if (this.peek()?.type === "lparen") {
      this.next();
      return { type: "call", name: token.text.toUpperCase(), args: this.parseArguments() };
    }
    const upper = token.text.toUpperCase();
    if (upper === "TRUE" || upper === "FALSE") return { type: "boolean", value: upper === "TRUE" };
    return { type: "name", name: token.text };
  }

  /** Arguments after the opening "(", separated by "," (or ";" as in some Sheets locales). */
  private parseArguments(): FormulaNode[] {
    const args: FormulaNode[] = [];
    if (this.peek()?.type === "rparen") {
      this.next();
      return args;
    }

    for (;;) {
      const token = this.peek();
      if (token?.type === "comma" || token?.type === "semicolon" || token?.type === "rparen") {
        args.push({ type: "empty" });
      } else {
        args.push(this.parseComparison());
      }

      const separator = this.next();
      if (!separator) throw new FormulaParseError('Missing ")".');
      if (separator.type === "rparen") return args;
      if (separator.type !== "comma" && separator.type !== "semicolon") {
        throw new FormulaParseError(`Unexpected "${separator.text}".`);
      }
    }
  }

  /** {1,2;3,4}: "," separates columns and ";" separates rows. */
  private parseArrayLiteral(): FormulaNode {
    const rows: FormulaNode[][] = [[]];
    for (;;) {
      rows[rows.length - 1].push(this.parseComparison());
      const separator = this.next();
      if (!separator) throw new FormulaParseError('Missing "}".');
      if (separator.type === "rbrace") break;
      if (separator.type === "comma") continue;
      if (separator.type === "semicolon") {
        rows.push([]);
        continue;
      }
      throw new FormulaParseError(`Unexpected "${separator.text}".`);
    }
    const width = rows[0].length;
    if (rows.some((row) => row.length !== width)) {
      throw new FormulaParseError("Every row of an array must have the same number of values.");
    }
    return { type: "array", rows };
  }

  private expect(type: FormulaToken["type"], message: string): void {
    if (this.next()?.type !== type) throw new FormulaParseError(message);
  }
}

/** True when the text is a formula (starts with "="), the same rule spreadsheets use. */
export function isFormulaText(text: string): boolean {
  return text.trimStart().startsWith("=") && text.trim().length > 1;
}

/** Parses a formula, with or without its leading "=". Throws FormulaParseError on invalid syntax. */
export function parseFormula(formula: string): FormulaNode {
  const body = formula.trimStart().startsWith("=") ? formula.trimStart().slice(1) : formula;
  return new Parser(tokenizeFormula(body)).parse();
}

/** Names of every function a formula calls, upper case. */
export function collectFunctionNames(node: FormulaNode, names: Set<string> = new Set()): Set<string> {
  switch (node.type) {
    case "call":
      names.add(node.name);
      node.args.forEach((arg) => collectFunctionNames(arg, names));
      break;
    case "unary":
    case "percent":
      collectFunctionNames(node.operand, names);
      break;
    case "binary":
      collectFunctionNames(node.left, names);
      collectFunctionNames(node.right, names);
      break;
    case "array":
      node.rows.forEach((row) => row.forEach((cell) => collectFunctionNames(cell, names)));
      break;
  }
  return names;
}

/** Every reference of a parsed formula. */
export function collectReferenceSpecs(node: FormulaNode, specs: ReferenceSpec[] = []): ReferenceSpec[] {
  switch (node.type) {
    case "ref":
      specs.push(node.ref);
      break;
    case "call":
      node.args.forEach((arg) => collectReferenceSpecs(arg, specs));
      break;
    case "unary":
    case "percent":
      collectReferenceSpecs(node.operand, specs);
      break;
    case "binary":
      collectReferenceSpecs(node.left, specs);
      collectReferenceSpecs(node.right, specs);
      break;
    case "array":
      node.rows.forEach((row) => row.forEach((cell) => collectReferenceSpecs(cell, specs)));
      break;
  }
  return specs;
}
