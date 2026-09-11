import {
    MIST_ENGINE_CODECS,
    type MistEngineDocumentTarget,
} from "schema-in-the-mist";

export function validateMistToml(
    target: MistEngineDocumentTarget,
    source: string,
): string {
    MIST_ENGINE_CODECS[target].parseToml(source);
    return source;
}

export function validatedMistSerializer<T>(
    target: MistEngineDocumentTarget,
    serialize: (data: T) => string,
): (data: T) => string {
    return (data) => validateMistToml(target, serialize(data));
}
