type ConstructorParameterKeys<T extends new (...args: any[]) => any> =
    T extends new (...args: infer P) => any
    ? P extends any[] // Check if it's a tuple or array
      ? { [K in keyof P]: string } extends { [K: number]: string } // Check if it's number-indexed and has string values (indicates a tuple/array)
        ? Extract<keyof P, string>  // Extract string keys (parameter names, if available)
        : never // Not a number-indexed tuple-like type, so no string keys
      : never // Not an array
    : never;


// Example Usage:

class MyClass {
    constructor(public id: number, public name: string, private readonly isAdmin: boolean) { }
}

type MyClassConstructorParamKeys = ConstructorParameterKeys<typeof MyClass>; // "id" | "name" | "isAdmin"