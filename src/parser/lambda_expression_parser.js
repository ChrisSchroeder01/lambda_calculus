import { Variable } from "../term/variable.js";
import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";
import { NUMBER, ADD, SUB, MULT, EXP } from "../church/number.js";
import { TRUE, FALSE, IF, AND, OR, NOT, XOR, NAND, IMPLIES } from "../church/boolean.js";

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

        while (!this.isEnd() && this.current() !== ")") {
            if (this.isOperator(this.current())) {
                const operator = this.parseOperator();

                if (!this.isEnd() && this.current() !== ")") {
                    const right = this.parseTerm();

                    expression = new Application(new Application(operator, expression), right);
                } else {
                    expression = new Application(expression, operator);
                }
            } else if (this.isBooleanBinaryOperator()) {
                const operator = this.parseName();
                this.skipWhitespace();

                if (this.isEnd() || this.current() === ")") {
                    throw new Error(`Expected right operand at position ${this.position}`);
                }

                const right = this.parseTerm();

                expression = new Application(new Application(operator, expression), right);
            } else if (this.canStartTerm(this.current())) {
                const right = this.parseTerm();

                expression = new Application(expression, right);
            } else {
                break;
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

        if (this.current() === "λ") {
            return this.parseAbstraction();
        }

        if (this.isNumberCharacter(this.current())) {
            return this.parseNumber();
        }

        if (this.isOperator(this.current())) {
            return this.parseOperator();
        }

        if (this.isNameStart(this.current())) {
            return this.parseName();
        }

        return this.parseVariable();
    }

    parseOperator() {
        const operator = this.current();

        this.position++;

        if (operator === "+") return ADD;
        if (operator === "-") return SUB;
        if (operator === "*") return MULT;
        if (operator === "^") return EXP;

        throw new Error(`Unknown operator "${operator}"`);
    }

    parseName() {
        this.skipWhitespace();

        const start = this.position;

        while (!this.isEnd() && this.isNameCharacter(this.current())) {
            this.position++;
        }

        const name = this.input.slice(start, this.position);

        if (name === "TRUE") return TRUE;
        if (name === "FALSE") return FALSE;
        if (name === "IF") return IF;
        if (name === "AND") return AND;
        if (name === "OR") return OR;
        if (name === "NOT") return NOT;
        if (name === "XOR") return XOR;
        if (name === "NAND") return NAND;
        if (name === "IMPLIES") return IMPLIES;

        throw new Error(`Unknown name "${name}" at position ${start}`);
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

        const expression = this.parseExpression();

        this.skipWhitespace();
        this.consume(")");

        return expression;
    }

    parseAbstraction() {
        this.consume("λ");
        this.skipWhitespace();

        const parameters = [];

        while (!this.isEnd() && this.isVariableCharacter(this.current())) {
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

    isBooleanBinaryOperator() {
        if (!this.isNameStart(this.current())) {
            return false;
        }

        const start = this.position;

        while (!this.isEnd() && this.isNameCharacter(this.current())) {
            this.position++;
        }

        const name = this.input.slice(start, this.position);

        this.position = start;

        return [
            "AND",
            "OR",
            "XOR",
            "NAND",
            "IMPLIES"
        ].includes(name);
    }

    isVariableCharacter(character) {
        return /^[a-z]$/.test(character);
    }

    isNameStart(character) {
        return /^[A-Z]$/.test(character);
    }

    isNameCharacter(character) {
        return /^[A-Z]$/.test(character);
    }

    isNumberCharacter(character) {
        return /^[0-9]$/.test(character);
    }

    canStartTerm(character) {
        return (
            character === "(" ||
            character === "λ" ||
            this.isNumberCharacter(character) ||
            this.isVariableCharacter(character) ||
            this.isNameStart(character) ||
            this.isOperator(character)
        );
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
