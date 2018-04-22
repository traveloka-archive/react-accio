// @flow
import * as React from 'react';

import to from '../utils/to';
import defaults from '../defaults/index';
import md5 from 'md5';

import { type FutchCache } from './FutchCacheContext';

type Dict<K, V> = { [key: K]: V };

export type Props = {
  // required props
  children: (FutchState: State) => React.Node,
  url: string,

  // fetch options
  body: any,
  headers: Dict<string, string>,
  method: string,

  // optional props
  context: Object,
  defer: boolean,
  ignoreCache: boolean,
  onComplete?: (response: any) => any,
  onError?: (error: Error) => any,
  onShowLoading?: () => any,
  onStartFetching?: () => any,
  timeout?: number,

  // private props
  _cache: ?FutchCache,
};

type State = {
  loading: boolean,
  response: ?any,
  error: ?Error,
  trigger: () => any,
};

type Defaults = {
  method: 'GET' | 'POST',
  resolver: Resolver,
};

type Resolver = (
  url: string,
  FetchOptions: Object,
  context: Object
) => Promise<any>;

const FutchPropKeys = new Set([
  'children',
  'url',
  'context',
  'defer',
  'ignoreCache',
  'onComplete',
  'onError',
  'onShowLoading',
  'onStartFetching',
  'timeout',
  '_cache',
]);

function getFetchOptions(props) {
  const fetchOptions = {};
  const propKeys = Object.keys(props);
  for (let i = 0; i < propKeys.length; i++) {
    const propKey = propKeys[i];
    if (!FutchPropKeys.has(propKey)) {
      fetchOptions[propKey] = props[propKey];
    }
  }
  return fetchOptions;
}

class Futch extends React.Component<Props, State> {
  static defaults: Defaults = defaults;

  static defaultProps = {
    defer: false,
    ignoreCache: false,
    context: {},
    method: Futch.defaults.method,
  };

  state = {
    loading: false,
    response: null,
    error: null,
    trigger: this.doWork.bind(this),
  };

  timer: TimeoutID;

  componentDidMount() {
    if (this.props.defer === true) {
      return;
    }
    this.doWork.call(this);
  }

  async doWork() {
    const { timeout } = this.props;

    if (typeof timeout === 'number') {
      this.timer = setTimeout(this.setLoading.bind(this, true), timeout);
    } else {
      this.setLoading.call(this, true);
    }

    const [err, response] = await to(this.doFetch.call(this));

    if (err) {
      this.setError.call(this, err);
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.setLoading.call(this, false);
    this.setResponse.call(this, response);
  }

  doFetch(): Promise<*> {
    const {
      url,
      context,
      onStartFetching,
      ignoreCache,
      _cache,
    } = this.props;
    const { resolver } = Futch.defaults;
    if (typeof onStartFetching === 'function') {
      onStartFetching();
    }
    const fetchOptions = getFetchOptions(this.props);

    // resolve from cache if applicable
    if (_cache && ignoreCache === false) {
      let cacheKey = url;
      if (fetchOptions.body) {
        cacheKey = cacheKey + JSON.stringify(fetchOptions.body);
      }
      const hash = md5(cacheKey);
      // check for existing cache entry
      if (_cache.has(hash)) {
        // cache hit
        return Promise.resolve(_cache.get(hash));
      } else {
        // cache miss
        const promise = resolver(url, fetchOptions, context);
        // store promise in cache
        _cache.set(hash, promise);
        return promise.then((response: any) => {
          // when resolved, store the real
          // response to the cache
          _cache.set(hash, response);
          return response;
        });
      }
    }

    return resolver(url, fetchOptions, context);
  }

  setLoading(loading: boolean) {
    if (typeof this.props.onShowLoading === 'function') {
      this.props.onShowLoading();
    }
    this.setState({
      loading,
    });
  }

  setResponse(response: ?any) {
    if (typeof this.props.onComplete === 'function') {
      this.props.onComplete(response);
    }
    this.setState({
      response,
    });
  }

  setError(error: Error) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error);
    }
    this.setState({
      error,
    });
  }

  render() {
    return this.props.children(this.state);
  }
}

export default Futch;
