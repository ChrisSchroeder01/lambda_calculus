import { Variable } from "../term/variable.js";
import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";
import { NUMBER, ADD, SUB, MULT, EXP } from "../church/number.js";
import { TRUE, FALSE, IF, AND, OR, NOT, XOR, NAND, IMPLIES } from "../church/boolean.js";

export class LambdaExpressionAnalyzer {
    static analyze(expression) {
        return this.analyzeExpression(expression);
    }

    static analyzeExpression(expression) {
        if (this.same(expression, TRUE)) return "TRUE";
        if (this.same(expression, FALSE)) return "FALSE";

        const number = this.detectNumber(expression);

        if (number !== null) return String(number);

        if (this.same(expression, ADD)) return "+";
        if (this.same(expression, SUB)) return "-";
        if (this.same(expression, MULT)) return "*";
        if (this.same(expression, EXP)) return "^";

        if (this.same(expression, IF)) return "IF";
        if (this.same(expression, AND)) return "AND";
        if (this.same(expression, OR)) return "OR";
        if (this.same(expression, NOT)) return "NOT";
        if (this.same(expression, XOR)) return "XOR";
        if (this.same(expression, NAND)) return "NAND";
        if (this.same(expression, IMPLIES)) return "IMPLIES";

        if (expression instanceof Variable) {
            return expression.name;
        }

        if (expression instanceof Abstraction) {
            return `(λ${expression.parameter.name}.${this.analyzeExpression(expression.body)})`;
        }

        if (expression instanceof Application) {
            const arithmetic = this.detectArithmetic(expression);

            if (arithmetic) {
                return `${this.analyzeExpression(arithmetic.left)} ${arithmetic.operator}${this.analyzeExpression(arithmetic.right)}`;
            }

            return `(${this.analyzeExpression(expression.fn)} ${this.analyzeExpression(expression.argument)})`;
        }

        throw new Error("Unknown term");
    }

    static detectNumber(expression) {
        if (!(expression instanceof Abstraction)) return null;
        if (!(expression.body instanceof Abstraction)) return null;

        const f = expression.parameter.name;
        const x = expression.body.parameter.name;

        let body = expression.body.body;
        let count = 0;

        while (
            body instanceof Application &&
            body.fn instanceof Variable &&
            body.fn.name === f
        ) {
            count++;
            body = body.argument;
        }

        if (body instanceof Variable && body.name === x) {
            return count;
        }

        return null;
    }

    static detectArithmetic(expression) {
        if (!(expression instanceof Application)) return null;
        if (!(expression.fn instanceof Application)) return null;

        const operator = expression.fn.fn;

        if (this.same(operator, ADD)) {
            return {
                operator: "+",
                left: expression.fn.argument,
                right: expression.argument
            };
        }

        if (this.same(operator, SUB)) {
            return {
                operator: "-",
                left: expression.fn.argument,
                right: expression.argument
            };
        }

        if (this.same(operator, MULT)) {
            return {
                operator: "*",
                left: expression.fn.argument,
                right: expression.argument
            };
        }

        if (this.same(operator, EXP)) {
            return {
                operator: "^",
                left: expression.fn.argument,
                right: expression.argument
            };
        }

        return null;
    }

    static same(a, b) {
        if (a instanceof Variable && b instanceof Variable) {
            return a.name === b.name;
        }

        if (a instanceof Abstraction && b instanceof Abstraction) {
            return (
                a.parameter.name === b.parameter.name &&
                this.same(a.body, b.body)
            );
        }

        if (a instanceof Application && b instanceof Application) {
            return (
                this.same(a.fn, b.fn) &&
                this.same(a.argument, b.argument)
            );
        }

        return false;
    }
}