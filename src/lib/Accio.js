// @flow
import * as React from 'react';

import to from '../utils/to';
import defaults from '../defaults/index';
import getCacheKey from '../utils/getCacheKey';

import { type AccioCache } from './AccioCacheContext';

type Dict<K, V> = { [key: K]: V };

export type Props = {
  // required props
  children: (AccioState: State) => React.Node,
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
  _cache: ?AccioCache,
  forwardedRef: ?{ current: null | Accio },
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

const AccioPropKeys = new Set([
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
    if (!AccioPropKeys.has(propKey)) {
      fetchOptions[propKey] = props[propKey];
    }
  }
  return fetchOptions;
}

const PreloadStatus = {
  PRELOAD_ERROR: -1,
  IDLE: 0,
  PRELOADING: 1,
  PRELOADED: 2,
};

class Accio extends React.Component<Props, State> {
  static defaults: Defaults = defaults;

  static defaultProps = {
    defer: false,
    ignoreCache: false,
    context: {},
    method: Accio.defaults.method,
  };

  state = {
    loading: false,
    response: null,
    error: null,
    trigger: this.doWork.bind(this),
  };

  preloadStatus: number = PreloadStatus.IDLE;

  preloadError: ?Error = null;

  timer: TimeoutID;

  async preload() {
    const { _cache } = this.props;

    if (!_cache) {
      console.warn(
        'Preloading without cache is not supported. ' +
          'This can be fixed by wrapping your app with <AccioCacheProvider />.'
      );
      return;
    }

    if (this.preloadStatus < PreloadStatus.PRELOADING) {
      this.preloadStatus = PreloadStatus.PRELOADING;

      const [err, res] = await to(this.doFetch.call(this));
      if (err) {
        this.preloadStatus = PreloadStatus.PRELOAD_ERROR;
        this.preloadError = err;
        return;
      }

      this.preloadStatus = PreloadStatus.PRELOADED;
      return res;
    }
  }

  componentDidMount() {
    if (this.props.defer === true) {
      return;
    }
    this.doWork.call(this);
  }

  componentWillUnmount() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  componentDidUpdate(prevProps) {
    const { fetchKey } = this.props;
    if (fetchKey && fetchKey(this.props) !== fetchKey(prevProps)) {
      this.doWork.call(this);
    }
  }

  async doWork() {
    const { _cache, onStartFetching, timeout, url } = this.props;

    const cacheKey = getCacheKey(url, getFetchOptions(this.props));

    if (_cache && this.preloadStatus === PreloadStatus.PRELOADED) {
      const preloadedResponse = _cache.get(cacheKey);
      this.setResponse.call(this, preloadedResponse);
      return;
    }

    if (typeof timeout === 'number') {
      this.timer = setTimeout(this.setLoading.bind(this, true), timeout);
    } else {
      this.setLoading.call(this, true);
    }

    if (typeof onStartFetching === 'function') {
      onStartFetching();
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
    const { _cache, context, ignoreCache, url, onStartFetching } = this.props;
    const { resolver } = Accio.defaults;

    const fetchOptions = getFetchOptions(this.props);

    // try resolve from cache,
    // otherwise resolve from network

    const resolveNetwork = () => {
      return resolver(url, fetchOptions, context);
    };

    if (_cache && ignoreCache === false) {
      const cacheKey = getCacheKey(url, fetchOptions);
      // check for existing cache entry
      if (_cache.has(cacheKey)) {
        // cache hit --> return cached entry
        return Promise.resolve(_cache.get(cacheKey));
      } else {
        // cache miss --> resolve network
        const promise = resolveNetwork();
        // store promise in cache
        _cache.set(cacheKey, promise);
        return promise
          .then((response: any) => {
            // when resolved, store the real
            // response to the cache
            _cache.set(cacheKey, response);
            return response;
          })
          .catch(err => {
            _cache.delete(cacheKey);
            throw err;
          });
      }
    }

    return resolveNetwork();
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

export default Accio;
