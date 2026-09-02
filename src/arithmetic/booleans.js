import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";
import { Variable } from "../term/variable.js";

export const TRUE = new Abstraction(
    new Variable("a"),
    new Abstraction(
        new Variable("b"),
        new Variable("a")
    )
);

export const FALSE = new Abstraction(
    new Variable("a"),
    new Abstraction(
        new Variable("b"),
        new Variable("b")
    )
);

export const NOT = new Abstraction(
    new Variable("x"),
    new Application(
        new Application(
            new Variable("x"),
            FALSE
        ),
        TRUE
    )
);

export const AND = new Abstraction(
    new Variable("x"),
    new Abstraction(
        new Variable("y"),
        new Application(
            new Variable("x"),
            new Application(
                new Variable("y"),
                FALSE
            )
        )
    )
);

export const OR = new Abstraction(
    new Variable("x"),
    new Abstraction(
        new Variable("y"),
        new Application(
            new Application(
                new Variable("x"),
                TRUE
            ),
            new Variable("y")
        )
    )
);