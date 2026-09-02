export class Application {
    constructor(fn, argument) {
        this.fn = fn;
        this.argument = argument;
    }

    toString() {
        return `(${this.fn}${this.argument})`;
    }

    toCurryString() {
        return `(${this.fn.toCurryString ? this.fn.toCurryString() : this.fn}${this.argument.toCurryString ? this.argument.toCurryString() : this.argument})`;
    }
}