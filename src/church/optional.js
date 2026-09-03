import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";
import { Variable } from "../term/variable.js";

export const NONE = new Abstraction(
    new Variable("f"),
    new Abstraction(
        new Variable("s"),
        new Variable("f")
    )
);

export const VAL = new Abstraction(
    new Variable("v"),
    new Abstraction(
        new Variable("f"),
        new Abstraction(
            new Variable("s"),
            new Application(
                new Variable("s"),
                new Variable("v")
            )
        )
    )
);