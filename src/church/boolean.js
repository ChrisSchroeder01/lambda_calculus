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

export const IF = new Abstraction(
    new Variable("p"),
    new Abstraction(
        new Variable("a"),
        new Abstraction(
            new Variable("b"),
            new Application(
                new Application(
                    new Variable("p"),
                    new Variable("a")
                ),
                new Variable("b")
            )
        )
    )
);

export const AND = new Abstraction(
    new Variable("p"),
    new Abstraction(
        new Variable("q"),
        new Application(
            new Application(
                new Variable("p"),
                new Variable("q")
            ),
            FALSE
        )
    )
);

export const OR = new Abstraction(
    new Variable("p"),
    new Abstraction(
        new Variable("q"),
        new Application(
            new Application(
                new Variable("p"),
                TRUE
            ),
            new Variable("q")
        )
    )
);

export const NOT = new Abstraction(
    new Variable("p"),
    new Application(
        new Application(
            new Variable("p"),
            FALSE
        ),
        TRUE
    )
);

export const XOR = new Abstraction(
    new Variable("p"),
    new Abstraction(
        new Variable("q"),
        new Application(
            new Application(
                new Variable("p"),
                new Application(
                    NOT,
                    new Variable("q")
                )
            ),
            new Variable("q")
        )
    )
);

export const NAND = new Abstraction(
    new Variable("p"),
    new Abstraction(
        new Variable("q"),
        new Application(
            NOT,
            new Application(
                new Application(
                    new Variable("p"),
                    new Variable("q")
                ),
                FALSE
            )
        )
    )
);

export const IMPLIES = new Abstraction(
    new Variable("p"),
    new Abstraction(
        new Variable("q"),
        new Application(
            new Application(
                OR,
                new Application(
                    NOT,
                    new Variable("p")
                )
            ),
            new Variable("q")
        )
    )
);