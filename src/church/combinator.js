import { Abstraction } from "../term/abstraction.js";
import { Application } from "../term/application.js";
import { Variable } from "../term/variable.js";

export const Y = new Abstraction(
    new Variable("f"),
    new Application(
        new Abstraction(
            new Variable("x"),
            new Application(
                new Variable("f"),
                new Application(
                    new Variable("x"),
                    new Variable("x")
                )
            )
        ),
        new Abstraction(
            new Variable("x"),
            new Application(
                new Variable("f"),
                new Application(
                    new Variable("x"),
                    new Variable("x")
                )
            )
        )
    )
);