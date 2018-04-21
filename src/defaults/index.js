import resolver from './resolver';
import validateFunctionAssignment from '../utils/validateFunctionAssignment';

const createIdentity = () => value => value;

// private, do not expose
const _defaults = {
  resolver,
  method: 'GET',
  preparator: createIdentity(),
  processor: createIdentity(),
};

const defaults = {};
Object.defineProperties(defaults, {
  resolver: validateFunctionAssignment(_defaults, 'resolver'),
  preparator: validateFunctionAssignment(_defaults, 'preparator'),
  processor: validateFunctionAssignment(_defaults, 'processor'),
  method: {
    get() {
      return _defaults.method;
    },

    set(method) {
      if (!['GET', 'POST'].includes(method)) {
        throw new TypeError(
          `Invalid method ${method}. Only GET & POST are supported. Check your method assignment to Futch defaults.`
        );
      }
      _defaults.method = method;
    },
  },
});

export default defaults;
