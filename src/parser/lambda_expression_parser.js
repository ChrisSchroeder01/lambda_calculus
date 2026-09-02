import { Variable } from "../term/variable.js";
import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";
import { NUMBER, ADD, SUB, MUL, EXP } from "../arithmetic/number.js";

export class LambdaExpressionParser {
    static parse(input) {
        const parser = new LambdaExpressionParser(input);
        const expression = parser.parseExpression();

        parser.skipWhitespace();

        if (!parser.isEnd()) {
            throw new Error(`Unexpected character at position ${parser.position}`);
        }

        return expression;
    }

    constructor(input) {
        this.input = input;
        this.position = 0;
    }


parseExpression() {
    let expression = this.parseTerm();

    this.skipWhitespace();

    while (this.isOperator(this.current())) {
        const operator = this.parseOperator();

        if (!this.isEnd() && this.current() !== ")") {
            const right = this.parseTerm();

            expression = new Application(
                new Application(operator, expression),
                right
            );
        } else {
            expression = new Application(expression, operator);
        }

        this.skipWhitespace();
    }

    return expression;
}


    parseTerm() {
        this.skipWhitespace();

        if (this.current() === "(") {
            return this.parseParenthesized();
        }

        if (this.isNumberCharacter(this.current())) {
            return this.parseNumber();
        }

        if (this.isOperator(this.current())) {
            return this.parseOperator();
        }

        return this.parseVariable();
    }

    parseOperator() {
        const operator = this.current();

        this.position++;

        if (operator === "+") return ADD;
        if (operator === "-") return SUB;
        if (operator === "*") return MUL;
        if (operator === "^") return EXP;

        throw new Error(`Unknown operator "${operator}"`);
    }

    parseParenthesized() {
        this.consume("(");
        this.skipWhitespace();

        if (this.current() === "λ") {
            const abstraction = this.parseAbstraction();
            this.skipWhitespace();
            this.consume(")");
            return abstraction;
        }

        const left = this.parseTerm();
        this.skipWhitespace();
        const right = this.parseTerm();
        this.skipWhitespace();

        this.consume(")");

        return new Application(left, right);
    }

    parseAbstraction() {
        this.consume("λ");
        this.skipWhitespace();

        const parameters = [];

        while (this.isVariableCharacter(this.current())) {
            parameters.push(this.parseVariable());
            this.skipWhitespace();
        }

        this.consume(".");
        this.skipWhitespace();

        let body = this.parseExpression();

        for (let i = parameters.length - 1; i >= 0; i--) {
            body = new Abstraction(parameters[i], body);
        }

        return body;
    }

    parseVariable() {
        this.skipWhitespace();

        const character = this.current();

        if (!this.isVariableCharacter(character)) {
            throw new Error(`Expected variable at position ${this.position}`);
        }

        this.position++;

        return new Variable(character);
    }

    parseNumber() {
        this.skipWhitespace();

        const start = this.position;

        while (this.isNumberCharacter(this.current())) {
            this.position++;
        }

        return NUMBER(Number(this.input.slice(start, this.position)));
    }

    isOperator(character) {
        return ["+", "-", "*", "^"].includes(character);
    }

    isVariableCharacter(character) {
        return /^[a-zA-Z]$/.test(character);
    }

    isNumberCharacter(character) {
        return /^[0-9]$/.test(character);
    }

    skipWhitespace() {
        while (!this.isEnd() && /\s/.test(this.current())) {
            this.position++;
        }
    }

    current() {
        return this.input[this.position];
    }

    consume(expected) {
        if (this.current() !== expected) {
            throw new Error(`Expected "${expected}" at position ${this.position}`);
        }

        this.position++;
    }

    isEnd() {
        return this.position >= this.input.length;
    }
}