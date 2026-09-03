import { Variable } from "../term/variable.js";
import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";


export function betaReduce(expression) {
    const steps = [expression];

    let current = expression;

    while (true) {
        const result = reduceOne(current);

        if (result === null) {
            break;
        }

        current = result;
        steps.push(current);
    }

    return steps;
}


function reduceOne(term) {
    if (term instanceof Application) {

        if (term.fn instanceof Abstraction) {
            return substitute(
                term.fn.body,
                term.fn.parameter,
                term.argument
            );
        }

        const reducedFunction = reduceOne(term.fn);

        if (reducedFunction !== null) {
            return new Application(
                reducedFunction,
                term.argument
            );
        }

        const reducedArgument = reduceOne(term.argument);

        if (reducedArgument !== null) {
            return new Application(
                term.fn,
                reducedArgument
            );
        }

        return null;
    }

    if (term instanceof Abstraction) {
        const reducedBody = reduceOne(term.body);

        if (reducedBody !== null) {
            return new Abstraction(
                term.parameter,
                reducedBody
            );
        }

        return null;
    }

    return null;
}


let freshCounter = 0;

function freshVariable(base) {
    freshCounter++;
    return new Variable(`${base}$${freshCounter}`);
}


function freeVariables(term) {
    if (term instanceof Variable) {
        return new Set([term.name]);
    }

    if (term instanceof Application) {
        const names = freeVariables(term.fn);

        for (const name of freeVariables(term.argument)) {
            names.add(name);
        }

        return names;
    }

    if (term instanceof Abstraction) {
        const names = freeVariables(term.body);
        names.delete(term.parameter.name);
        return names;
    }

    throw new Error("Unknown term");
}


function substitute(term, variable, replacement) {
    if (term instanceof Variable) {
        if (term.name === variable.name) {
            return replacement;
        }

        return term;
    }

    if (term instanceof Application) {
        return new Application(
            substitute(term.fn, variable, replacement),
            substitute(term.argument, variable, replacement)
        );
    }

    if (term instanceof Abstraction) {
        if (term.parameter.name === variable.name) {
            return term;
        }

        if (freeVariables(replacement).has(term.parameter.name)) {
            const fresh = freshVariable(term.parameter.name);

            const renamedBody = substitute(
                term.body,
                term.parameter,
                fresh
            );

            return new Abstraction(
                fresh,
                substitute(renamedBody, variable, replacement)
            );
        }

        return new Abstraction(
            term.parameter,
            substitute(term.body, variable, replacement)
        );
    }

    throw new Error("Unknown term");
}