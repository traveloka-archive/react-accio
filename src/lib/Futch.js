// @flow
import * as React from 'react';

import to from '../utils/to';
import defaults from '../defaults/index';
import md5 from 'md5';

import { type FutchCache } from './FutchCacheContext';

export type Props = {
  // required props
  children: (FutchState: State) => React.Node,
  url: string,

  // optional props
  data: any,
  defer: boolean,
  ignoreCache: boolean,
  context: Object,
  method: 'GET' | 'POST',
  onComplete?: (response: any) => any,
  onError?: (error: Error) => any,
  onShowLoading?: () => any,
  onStartFetching?: () => any,
  prepare: (request: any) => any,
  process: (resoponse: any) => any,
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
  preparator: (request: any) => any,
  processor: (response: any) => any,
  resolver: Resolver,
};

export type FutchOptions = {
  data?: any,
  method: 'GET' | 'POST',
};

type Resolver = (
  url: string,
  FutchOptions: FutchOptions,
  context: Object
) => Promise<any>;

class Futch extends React.Component<Props, State> {
  static defaults: Defaults = defaults;

  static defaultProps = {
    defer: false,
    ignoreCache: false,
    context: {},
    method: Futch.defaults.method,
    prepare: Futch.defaults.preparator,
    process: Futch.defaults.processor,
  };

  state = {
    loading: false,
    response: null,
    error: null,
    trigger: this.doWork.bind(this),
  };

  timer: number;

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

    const [err, response] = await to(this.doFutch.call(this));

    if (err) {
      this.setError.call(this, err);
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.setLoading.call(this, false);
    this.setResponse.call(this, response);
  }

  doFutch(): Promise<*> {
    const {
      data,
      url,
      context,
      method,
      onStartFetching,
      ignoreCache,
      _cache,
    } = this.props;
    const { resolver } = Futch.defaults;
    if (typeof onStartFetching === 'function') {
      onStartFetching();
    }
    const FutchOptions: FutchOptions = {
      data: this.props.prepare(data),
      method,
    };

    // resolve from cache if applicable
    if (_cache && ignoreCache === false) {
      let cacheKey = url;
      if (data) {
        cacheKey = cacheKey + JSON.stringify(data);
      }
      const hash = md5(cacheKey);
      // check for existing cache entry
      if (_cache.has(hash)) {
        // cache hit
        return Promise.resolve(_cache.get(hash));
      } else {
        // cache miss
        const promise = resolver(url, FutchOptions, context);
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

    return resolver(url, FutchOptions, context);
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
    const processedResponse = this.props.process(response);
    if (typeof this.props.onComplete === 'function') {
      this.props.onComplete(processedResponse);
    }
    this.setState({
      response: processedResponse,
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
