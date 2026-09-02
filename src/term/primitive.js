export class Primitive {
    constructor(symbol, arity, definition) {
        this.symbol = symbol;
        this.arity = arity;
        this.definition = definition;
    }

    toString() {
        return this.symbol;
    }
}