export default function validateFunctionAssignment(target, name) {
  return {
    get() {
      return target[name];
    },
    set(value) {
      if (typeof value !== 'function') {
        throw new TypeError(
          `Expected ${name} to be a function. But instead got ${typeof value}. Check your ${name} assignment to Accio defaults.`
        );
      }
      target[name] = value;
    },
  };
}