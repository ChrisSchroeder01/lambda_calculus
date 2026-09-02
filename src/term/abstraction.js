export class Abstraction {
    constructor(parameter, body) {
        this.parameter = parameter;
        this.body = body;
    }

    toString() {
        return `(λ${this.parameter}.${this.body})`;
    }

    toCurryString() {
        let parameters = this.parameter;
        let body = this.body;

        while (body instanceof Abstraction) {
            parameters += body.parameter;
            body = body.body;
        }

        return `(λ${parameters}.${body.toCurryString ? body.toCurryString() : body})`;
    }
}